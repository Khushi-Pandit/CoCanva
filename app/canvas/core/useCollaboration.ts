'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: app/canvas/core/useCollaboration.ts
// UPDATED: Exposes `socket` (Socket | null) and `mySocketId` so the
//          useVoice hook can piggyback on the SAME connection — no second socket.

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface RemoteUser {
  userId:    string;
  userName:  string;
  userColor: string;
  role?:     string;
  socketId?: string;
  cursor?:   { x: number; y: number };
}

export interface RemoteStroke {
  userId:     string;
  socketId:   string;
  userName:   string;
  userColor:  string;
  points:     { x: number; y: number }[];
  color:      string;
  width:      number;
  strokeType: string;
}

export interface CollaborationOptions {
  canvasId:      string;
  firebaseToken: string;
  userName:      string;
  userRole:      string;
  shareToken?:   string;
  onElementAdd:    (element: any) => void;
  onElementDelete: (elementId: string) => void;
  onElementModify: (element: any) => void;
  onCanvasClear:   () => void;
  onCanvasState:   (elements: any[]) => void;
  onRoleConfirmed?:      (role: string) => void;
  onRemoteStrokeUpdate?: (socketId: string, stroke: RemoteStroke | null) => void;
}

export const useCollaboration = (options: CollaborationOptions | null) => {
  const socketRef     = useRef<Socket | null>(null);
  const [isConnected,   setIsConnected]   = useState(false);
  const [isSyncing,     setIsSyncing]     = useState(false);
  const [activeUsers,   setActiveUsers]   = useState<RemoteUser[]>([]);
  const [confirmedRole, setConfirmedRole] = useState<string | null>(null);
  const [mySocketId,    setMySocketId]    = useState<string>('');
  const [remoteCursors, setRemoteCursors] = useState<
    Record<string, { userId: string; userName: string; userColor: string; x: number; y: number }>
  >({});

  const cbRef = useRef(options);
  useEffect(() => { cbRef.current = options; });

  useEffect(() => {
    if (!options?.canvasId || !options?.firebaseToken) return;

    const { canvasId, firebaseToken, shareToken } = options;

    const socket = io(
      process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000',
      { auth: { token: firebaseToken }, transports: ['websocket'] }
    );
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setIsSyncing(true);
      setMySocketId(socket.id ?? '');
      socket.emit('canvas:join', { canvasId, shareToken: shareToken ?? undefined });
    });

    socket.on('disconnect',    () => { setIsConnected(false); setIsSyncing(false); setMySocketId(''); });
    socket.on('connect_error', () => { setIsConnected(false); setIsSyncing(false); });

    socket.on('canvas:joined', ({ lastViewport }: any) => { void lastViewport; });

    socket.on('canvas:role', ({ role }: { role: string; canvasId: string }) => {
      setConfirmedRole(role);
      cbRef.current?.onRoleConfirmed?.(role);
    });

    socket.on('canvas:state', ({ elements }: { elements: any[] }) => {
      cbRef.current?.onCanvasState(elements ?? []);
      setIsSyncing(false);
    });

    socket.on('canvas:saved', () => { /* acknowledged */ });

    socket.on('users:active', (users: RemoteUser[]) => setActiveUsers(users));

    socket.on('user:joined', (user: RemoteUser & { socketId: string }) => {
      setActiveUsers(prev => prev.find(u => u.userId === user.userId) ? prev : [...prev, user]);
    });

    socket.on('user:left', ({ userId, socketId }: { userId: string; socketId: string }) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== userId));
      setRemoteCursors(prev => { const n = { ...prev }; delete n[socketId]; return n; });
      cbRef.current?.onRemoteStrokeUpdate?.(socketId, null);
    });

    socket.on('element:added', ({ element }: { element: any }) => {
      cbRef.current?.onElementAdd(element);
    });

    socket.on('element:updated', ({ element }: { element: any }) => {
      cbRef.current?.onElementModify(element);
    });

    socket.on('element:deleted', ({ elementIds }: { elementIds: string[] }) => {
      (elementIds ?? []).forEach(id => cbRef.current?.onElementDelete(id));
    });

    socket.on('elements:batch', ({ added = [], updated = [], deletedIds = [] }: any) => {
      added.forEach((el: any)        => cbRef.current?.onElementAdd(el));
      updated.forEach((el: any)      => cbRef.current?.onElementModify(el));
      deletedIds.forEach((id: string) => cbRef.current?.onElementDelete(id));
    });

    socket.on('canvas:cleared', () => cbRef.current?.onCanvasClear());

    socket.on('canvas:undo', ({ restored = [], deletedIds = [] }: any) => {
      restored.forEach((el: any)      => cbRef.current?.onElementAdd(el));
      deletedIds.forEach((id: string) => cbRef.current?.onElementDelete(id));
    });
    socket.on('canvas:redo', ({ restored = [], deletedIds = [] }: any) => {
      restored.forEach((el: any)      => cbRef.current?.onElementAdd(el));
      deletedIds.forEach((id: string) => cbRef.current?.onElementDelete(id));
    });

    socket.on('cursor:moved', ({
      userId, socketId, userName: uName, userColor, x, y,
    }: { userId: string; socketId: string; userName: string; userColor: string; x: number; y: number }) => {
      setRemoteCursors(prev => ({
        ...prev,
        [socketId]: { userId, userName: uName, userColor, x, y },
      }));
    });

    socket.on('stroke:preview', ({
      userId, socketId, points, style,
    }: { userId: string; socketId: string; points: { x: number; y: number }[]; style: any }) => {
      const userColor = remoteCursors[socketId]?.userColor ?? '#3b82f6';
      const userName  = remoteCursors[socketId]?.userName  ?? '';
      cbRef.current?.onRemoteStrokeUpdate?.(socketId, {
        userId, socketId, userName, userColor,
        points:     points ?? [],
        color:      style?.color      ?? userColor,
        width:      style?.width      ?? 2,
        strokeType: style?.strokeType ?? 'pen',
      });
    });

    socket.on('element:lock_conflict', () => { /* show toast if needed */ });
    socket.on('element:persist_error', () => { /* show toast if needed */ });

    return () => {
      socket.emit('canvas:leave');
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsSyncing(false);
      setActiveUsers([]);
      setRemoteCursors({});
      setMySocketId('');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.canvasId, options?.firebaseToken]);

  // ── Emit helpers ──────────────────────────────────────────────────────────

  const emitElementAdd = useCallback((cid: string, element: any) =>
    socketRef.current?.emit('element:add', { canvasId: cid, element }), []);

  const emitElementDelete = useCallback((cid: string, elementId: string) =>
    socketRef.current?.emit('element:delete', { canvasId: cid, elementIds: [elementId] }), []);

  const emitElementModify = useCallback((cid: string, element: any) =>
    socketRef.current?.emit('element:update', { canvasId: cid, element }), []);

  const emitCanvasClear = useCallback((cid: string) =>
    socketRef.current?.emit('canvas:clear', { canvasId: cid }), []);

  const emitCursorMove = useCallback((cid: string, x: number, y: number) =>
    socketRef.current?.emit('cursor:move', { canvasId: cid, x, y }), []);

  const emitStrokeDrawing = useCallback((
    cid: string,
    points: { x: number; y: number }[],
    color: string,
    width: number,
    strokeType: string,
  ) => socketRef.current?.emit('stroke:preview', {
    canvasId: cid,
    points,
    style: { color, width, strokeType },
  }), []);

  const emitCanvasSave = useCallback((cid: string, elements: any[], viewport: any, deletedIds: string[] = []) =>
    socketRef.current?.emit('canvas:save', { canvasId: cid, elements, deletedIds, viewport }), []);

  const emitElementLock = useCallback((cid: string, elementId: string) =>
    socketRef.current?.emit('element:lock', { canvasId: cid, elementId }), []);

  const emitElementUnlock = useCallback((cid: string, elementId: string) =>
    socketRef.current?.emit('element:unlock', { canvasId: cid, elementId }), []);

  return {
    // ── existing ──
    isConnected, isSyncing, activeUsers, remoteCursors, confirmedRole,
    emitElementAdd, emitElementDelete, emitElementModify,
    emitCanvasClear, emitCursorMove, emitStrokeDrawing,
    emitCanvasSave, emitElementLock, emitElementUnlock,
    // ── NEW: expose socket + mySocketId for useVoice ──
    socket:     socketRef.current,
    mySocketId,
  };
};