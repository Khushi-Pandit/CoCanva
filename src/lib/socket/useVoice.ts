'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';

interface VoicePeer {
  socketId: string;
  userId: string;
  userName: string;
  userColor: string;
  isMuted: boolean;
}

interface UseVoiceOptions {
  socket: Socket | null;
  canvasId: string;
  mySocketId: string;
}

export function useVoice({ socket, canvasId, mySocketId }: UseVoiceOptions) {
  const [inVoice, setInVoice]               = useState(false);
  const [muted, setMuted]                   = useState(false);
  const [participants, setParticipants]     = useState<VoicePeer[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef       = useRef<Record<string, RTCPeerConnection>>({});

  // ── WebRTC peer factory ────────────────────────────────────────────────────
  const createPeerConnection = useCallback((remoteSocketId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // ICE → relay to signaling server using exact backend field names
    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('voice:ice', {
          canvasId,
          targetSocketId: remoteSocketId,    // backend expects targetSocketId
          candidate: e.candidate.toJSON(),
        });
      }
    };

    // Remote audio track
    pc.ontrack = (e) => {
      const existing = document.getElementById(`audio-${remoteSocketId}`);
      if (existing) return; // avoid duplicates
      const audio = document.createElement('audio') as HTMLAudioElement;
      audio.srcObject = e.streams[0];
      audio.autoplay  = true;
      audio.id        = `audio-${remoteSocketId}`;
      audio.style.display = 'none';
      document.body.appendChild(audio);
    };

    // Add local tracks
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    return pc;
  }, [socket, canvasId]);

  const cleanupPeer = useCallback((socketId: string) => {
    peersRef.current[socketId]?.close();
    delete peersRef.current[socketId];
    document.getElementById(`audio-${socketId}`)?.remove();
  }, []);

  // ── Join voice ─────────────────────────────────────────────────────────────
  const joinVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setInVoice(true);
      setPermissionDenied(false);
      socket?.emit('voice:join', { canvasId });        // ✅ exact backend event
    } catch {
      setPermissionDenied(true);
    }
  }, [socket, canvasId]);

  // ── Leave voice ────────────────────────────────────────────────────────────
  const leaveVoice = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    Object.keys(peersRef.current).forEach(cleanupPeer);
    socket?.emit('voice:leave', { canvasId });          // ✅ exact backend event
    setInVoice(false);
    setParticipants([]);
  }, [socket, canvasId, cleanupPeer]);

  // ── Toggle mute ────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    const nowMuted = !track.enabled;
    setMuted(nowMuted);
    socket?.emit('voice:mute_toggle', { canvasId, muted: nowMuted }); // ✅ exact backend event
  }, [socket, canvasId]);

  // ── Socket event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Backend emits voice:participants when we first join
    // payload: { canvasId, participants: VoicePeer[] }
    const onParticipants = (data: { participants: VoicePeer[] }) => {
      setParticipants((data.participants ?? []).filter((p) => p.socketId !== mySocketId));
    };

    // Backend emits voice:user_joined to room when someone new joins
    // payload: { participant, participants, canvasId }
    const onUserJoined = (data: { participant: VoicePeer; participants: VoicePeer[] }) => {
      setParticipants((data.participants ?? []).filter((p) => p.socketId !== mySocketId));

      // Initiate WebRTC offer to new peer
      if (inVoice && localStreamRef.current) {
        const pc = createPeerConnection(data.participant.socketId);
        peersRef.current[data.participant.socketId] = pc;
        pc.createOffer().then((offer) => {
          pc.setLocalDescription(offer);
          socket.emit('voice:offer', {
            canvasId,
            targetSocketId: data.participant.socketId, // ✅ exact field name
            sdp: offer,                                 // ✅ exact field name
          });
        });
      }
    };

    // Backend emits voice:user_left when someone leaves
    // payload: { socketId, userId, participants, canvasId }
    const onUserLeft = (data: { socketId: string; participants: VoicePeer[] }) => {
      setParticipants((data.participants ?? []).filter((p) => p.socketId !== mySocketId));
      cleanupPeer(data.socketId);
    };

    // Backend emits voice:mute_changed when someone toggles mute
    // payload: { socketId, muted, participants }
    const onMuteChanged = (data: { socketId: string; muted: boolean; participants: VoicePeer[] }) => {
      setParticipants((data.participants ?? []).filter((p) => p.socketId !== mySocketId));
    };

    // Backend relays voice:offer to target
    // payload: { canvasId, fromSocketId, fromUserId, sdp }
    const onOffer = async (data: { fromSocketId: string; sdp: RTCSessionDescriptionInit }) => {
      if (!localStreamRef.current) return;
      const pc = createPeerConnection(data.fromSocketId);
      peersRef.current[data.fromSocketId] = pc;
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('voice:answer', {
        canvasId,
        targetSocketId: data.fromSocketId, // ✅ exact field name
        sdp: answer,                        // ✅ exact field name
      });
    };

    // Backend relays voice:answer to target
    // payload: { canvasId, fromSocketId, sdp }
    const onAnswer = async (data: { fromSocketId: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current[data.fromSocketId];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    };

    // Backend relays voice:ice to target
    // payload: { canvasId, fromSocketId, candidate }
    const onIce = async (data: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current[data.fromSocketId];
      if (pc) {
        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch { /* ignore */ }
      }
    };

    socket.on('voice:participants',  onParticipants);  // ✅
    socket.on('voice:user_joined',   onUserJoined);    // ✅
    socket.on('voice:user_left',     onUserLeft);      // ✅
    socket.on('voice:mute_changed',  onMuteChanged);   // ✅
    socket.on('voice:offer',         onOffer);         // ✅
    socket.on('voice:answer',        onAnswer);        // ✅
    socket.on('voice:ice',           onIce);           // ✅

    return () => {
      socket.off('voice:participants',  onParticipants);
      socket.off('voice:user_joined',   onUserJoined);
      socket.off('voice:user_left',     onUserLeft);
      socket.off('voice:mute_changed',  onMuteChanged);
      socket.off('voice:offer',         onOffer);
      socket.off('voice:answer',        onAnswer);
      socket.off('voice:ice',           onIce);
    };
  }, [socket, mySocketId, inVoice, canvasId, createPeerConnection, cleanupPeer]);

  return { inVoice, muted, participants, permissionDenied, joinVoice, leaveVoice, toggleMute };
}
