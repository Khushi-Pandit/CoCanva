'use client';
import { create } from 'zustand';
import { PeerState, ElementLock } from '@/types/socket';

interface CollaborationState {
  isConnected: boolean;
  peers: Record<string, PeerState>;   // socketId → peer
  remoteCursors: Record<string, { userId: string; userName: string; userColor: string; x: number; y: number }>;
  remoteLiveStrokes: Record<string, { points: Array<{ x: number; y: number }>; style: Record<string, unknown> }>;
  locks: Record<string, ElementLock>; // elementId → lock

  setConnected: (v: boolean) => void;
  setPeer: (socketId: string, peer: PeerState) => void;
  removePeer: (socketId: string) => void;
  updateCursor: (socketId: string, data: { userId: string; userName: string; userColor: string; x: number; y: number }) => void;
  removeCursor: (socketId: string) => void;
  updateLiveStroke: (socketId: string, data: { points: Array<{ x: number; y: number }>; style: Record<string, unknown> } | null) => void;
  setLock: (elementId: string, lock: ElementLock | null) => void;
  clearAll: () => void;
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
  isConnected:       false,
  peers:             {},
  remoteCursors:     {},
  remoteLiveStrokes: {},
  locks:             {},

  setConnected: (isConnected) => set({ isConnected }),

  setPeer: (socketId, peer) => set((s) => ({ peers: { ...s.peers, [socketId]: peer } })),
  removePeer: (socketId) => set((s) => {
    const { [socketId]: _removed, ...peers } = s.peers;
    const { [socketId]: _removedCursor, ...remoteCursors } = s.remoteCursors;
    const { [socketId]: _removedStroke, ...remoteLiveStrokes } = s.remoteLiveStrokes;
    return { peers, remoteCursors, remoteLiveStrokes };
  }),

  updateCursor: (socketId, data) => set((s) => ({
    remoteCursors: { ...s.remoteCursors, [socketId]: data },
  })),
  removeCursor: (socketId) => set((s) => {
    const { [socketId]: _, ...remoteCursors } = s.remoteCursors;
    return { remoteCursors };
  }),

  updateLiveStroke: (socketId, data) => set((s) => {
    if (!data) {
      const { [socketId]: _, ...remoteLiveStrokes } = s.remoteLiveStrokes;
      return { remoteLiveStrokes };
    }
    return { remoteLiveStrokes: { ...s.remoteLiveStrokes, [socketId]: data } };
  }),

  setLock: (elementId, lock) => set((s) => {
    if (!lock) {
      const { [elementId]: _, ...locks } = s.locks;
      return { locks };
    }
    return { locks: { ...s.locks, [elementId]: lock } };
  }),

  clearAll: () => set({ isConnected: false, peers: {}, remoteCursors: {}, remoteLiveStrokes: {}, locks: {} }),
}));
