'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: app/canvas/[canvasId]/core/useVoice.ts
//
// WebRTC voice chat hook — plugs into the SAME socket instance used by
// useCollaboration. We accept the socket ref so we never open a second
// connection.
//
// Architecture (many-to-many mesh, no media server):
//   • On voice:join  → server broadcasts voice:user_joined to the whole room.
//   • The NEW joiner sends offers to every EXISTING participant.
//   • Existing participants only respond with answers (they never initiate).
//   • ICE candidates are trickled directly to the target peer via the server.
//   • On voice:leave / disconnect → RTCPeerConnections are closed cleanly.

import { useEffect, useRef, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VoiceParticipant {
  socketId:  string;
  userId:    string;
  userName:  string;
  userColor: string;
  muted:     boolean;
}

export interface UseVoiceOptions {
  /** The Socket.IO socket from useCollaboration — reuse, never create a new one. */
  socket:    Socket | null;
  canvasId:  string;
  /** Our own socket.id — needed so we skip creating a PC to ourselves. */
  mySocketId: string;
}

export interface UseVoiceReturn {
  /** Whether we have joined the voice channel */
  inVoice:       boolean;
  /** Whether our mic is currently muted */
  muted:         boolean;
  /** List of all participants currently in voice (including ourselves) */
  participants:  VoiceParticipant[];
  /** Join the voice channel (requests mic permission, then signals server) */
  joinVoice:     () => Promise<void>;
  /** Leave the voice channel */
  leaveVoice:    () => void;
  /** Toggle our mic mute state */
  toggleMute:    () => void;
  /** Whether mic permission was denied by the browser */
  permissionDenied: boolean;
}

// ── ICE servers ───────────────────────────────────────────────────────────────
// Google's free STUN servers are enough for most connections.
// For production add TURN servers for users behind symmetric NAT.
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useVoice = ({
  socket,
  canvasId,
  mySocketId,
}: UseVoiceOptions): UseVoiceReturn => {

  const [inVoice,           setInVoice]           = useState(false);
  const [muted,             setMuted]             = useState(false);
  const [participants,      setParticipants]      = useState<VoiceParticipant[]>([]);
  const [permissionDenied,  setPermissionDenied]  = useState(false);

  // Our local mic stream
  const localStreamRef = useRef<MediaStream | null>(null);
  // Map of remote socketId → RTCPeerConnection
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  // Guard against double-registration of socket listeners
  const listenersAttached = useRef(false);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Create and store a new RTCPeerConnection for a remote peer. */
  const createPC = useCallback((remoteSocketId: string): RTCPeerConnection => {
    // Close any stale connection first
    pcsRef.current.get(remoteSocketId)?.close();

    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcsRef.current.set(remoteSocketId, pc);

    // Add our local audio tracks
    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Trickle ICE → relay through server
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) {
        socket.emit('voice:ice', { canvasId, targetSocketId: remoteSocketId, candidate });
      }
    };

    // Remote audio → attach to a hidden <audio> element
    pc.ontrack = ({ streams }) => {
      if (!streams[0]) return;
      const audioId = `voice-audio-${remoteSocketId}`;
      let el = document.getElementById(audioId) as HTMLAudioElement | null;
      if (!el) {
        el = document.createElement('audio');
        el.id        = audioId;
        el.autoplay  = true;
        el.setAttribute('playsinline', '');
        document.body.appendChild(el);
      }
      el.srcObject = streams[0];
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupPeer(remoteSocketId);
      }
    };

    return pc;
  }, [canvasId, socket]);

  /** Remove the RTCPeerConnection and hidden audio element for a peer. */
  const cleanupPeer = useCallback((remoteSocketId: string) => {
    pcsRef.current.get(remoteSocketId)?.close();
    pcsRef.current.delete(remoteSocketId);
    document.getElementById(`voice-audio-${remoteSocketId}`)?.remove();
  }, []);

  /** Tear down everything — used on leaveVoice / unmount. */
  const teardown = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    pcsRef.current.forEach((pc, sid) => {
      pc.close();
      document.getElementById(`voice-audio-${sid}`)?.remove();
    });
    pcsRef.current.clear();

    setInVoice(false);
    setMuted(false);
    setParticipants([]);
  }, []);

  // ── Socket event listeners ────────────────────────────────────────────────
  // Attached once when the hook mounts (socket ref is stable after connect).

  useEffect(() => {
    if (!socket || listenersAttached.current) return;
    listenersAttached.current = true;

    // ── voice:participants ─────────────────────────────────────────────────
    // Server sends this on canvas:join so we know who is already in voice.
    socket.on('voice:participants', ({ participants: list }: { participants: VoiceParticipant[]; canvasId: string }) => {
      setParticipants(list);
    });

    // ── voice:user_joined ──────────────────────────────────────────────────
    // Someone joined the voice channel (could be us).
    socket.on('voice:user_joined', async ({
      participant, participants: list,
    }: { participant: VoiceParticipant; participants: VoiceParticipant[]; canvasId: string }) => {
      setParticipants(list);

      // If WE are the new joiner, send offers to all EXISTING peers.
      if (participant.socketId === socket.id) {
        for (const p of list) {
          if (p.socketId === socket.id) continue; // skip ourselves
          try {
            const pc    = createPC(p.socketId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('voice:offer', {
              canvasId,
              targetSocketId: p.socketId,
              sdp:            offer,
            });
          } catch (err) {
            console.warn('[voice] offer failed to', p.socketId, err);
          }
        }
      }
      // Existing peers do nothing here — they wait for the offer.
    });

    // ── voice:offer ────────────────────────────────────────────────────────
    // An incoming WebRTC offer from a new joiner.
    socket.on('voice:offer', async ({
      fromSocketId, sdp,
    }: { canvasId: string; fromSocketId: string; fromUserId: string; fromUserName: string; sdp: RTCSessionDescriptionInit }) => {
      // Only respond if we are in voice
      if (!localStreamRef.current) return;

      try {
        const pc = createPC(fromSocketId);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice:answer', {
          canvasId,
          targetSocketId: fromSocketId,
          sdp:            answer,
        });
      } catch (err) {
        console.warn('[voice] answer failed to', fromSocketId, err);
      }
    });

    // ── voice:answer ───────────────────────────────────────────────────────
    socket.on('voice:answer', async ({
      fromSocketId, sdp,
    }: { canvasId: string; fromSocketId: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = pcsRef.current.get(fromSocketId);
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch (err) {
          console.warn('[voice] setRemoteDescription answer failed', err);
        }
      }
    });

    // ── voice:ice ─────────────────────────────────────────────────────────
    socket.on('voice:ice', async ({
      fromSocketId, candidate,
    }: { canvasId: string; fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      const pc = pcsRef.current.get(fromSocketId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch { /* ignore benign ICE errors */ }
      }
    });

    // ── voice:user_left ────────────────────────────────────────────────────
    socket.on('voice:user_left', ({
      socketId, participants: list,
    }: { socketId: string; userId: string; userName: string; participants: VoiceParticipant[]; canvasId: string }) => {
      cleanupPeer(socketId);
      setParticipants(list);
    });

    // ── voice:mute_changed ─────────────────────────────────────────────────
    socket.on('voice:mute_changed', ({
      participants: list,
    }: { socketId: string; userId: string; muted: boolean; participants: VoiceParticipant[]; canvasId: string }) => {
      setParticipants(list);
    });

    return () => {
      socket.off('voice:participants');
      socket.off('voice:user_joined');
      socket.off('voice:offer');
      socket.off('voice:answer');
      socket.off('voice:ice');
      socket.off('voice:user_left');
      socket.off('voice:mute_changed');
      listenersAttached.current = false;
    };
  }, [socket, canvasId, createPC, cleanupPeer]);

  // Cleanup on unmount
  useEffect(() => () => { teardown(); }, [teardown]);

  // ── Public API ─────────────────────────────────────────────────────────────

  const joinVoice = useCallback(async () => {
    if (inVoice || !socket) return;
    setPermissionDenied(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setInVoice(true);
      socket.emit('voice:join', { canvasId });
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
      }
      console.warn('[voice] getUserMedia failed:', err);
    }
  }, [inVoice, socket, canvasId]);

  const leaveVoice = useCallback(() => {
    if (!socket) return;
    socket.emit('voice:leave', { canvasId });
    teardown();
  }, [socket, canvasId, teardown]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track || !socket) return;

    const newMuted = !muted;
    track.enabled  = !newMuted;
    setMuted(newMuted);
    socket.emit('voice:mute_toggle', { canvasId, muted: newMuted });
  }, [muted, socket, canvasId]);

  return {
    inVoice,
    muted,
    participants,
    joinVoice,
    leaveVoice,
    toggleMute,
    permissionDenied,
  };
};