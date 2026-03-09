'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: app/canvas/core/useCollaboration.ts

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { DrawableElement } from './types';

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
  onElementAdd:    (element: DrawableElement) => void;
  onElementDelete: (elementId: string) => void;
  onElementModify: (element: DrawableElement) => void;
  onCanvasClear:   () => void;
  onCanvasState:   (elements: DrawableElement[]) => void;
  onRoleConfirmed?:      (role: string) => void;
  onRemoteStrokeUpdate?: (socketId: string, stroke: RemoteStroke | null) => void;
}

export const useCollaboration = (options: CollaborationOptions | null) => {
  const socketRef     = useRef<Socket | null>(null);
  const [isConnected,   setIsConnected]   = useState(false);
  const [isSyncing,     setIsSyncing]     = useState(false);
  const [activeUsers,   setActiveUsers]   = useState<RemoteUser[]>([]);
  const [confirmedRole, setConfirmedRole] = useState<string | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<
    Record<string, { userId: string; userName: string; userColor: string; x: number; y: number }>
  >({});

  // ── FIX: Store all callbacks in a ref so the socket event handlers always
  // call the LATEST version without needing to reconnect the socket.
  // Previously the socket was created once but captured stale closures from
  // the first render — causing onCanvasState / onElementAdd etc. to silently
  // do nothing or overwrite state with stale data.
  const cbRef = useRef(options);
  useEffect(() => { cbRef.current = options; });

  useEffect(() => {
    if (!options?.canvasId || !options?.firebaseToken) return;

    const { canvasId, firebaseToken, userName, shareToken } = options;

    const socket = io(
      process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000',
      { auth: { token: firebaseToken }, transports: ['websocket'] }
    );
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setIsSyncing(true);
      socket.emit('canvas:join', { canvasId, userName, shareToken: shareToken ?? '' });
    });

    socket.on('disconnect',    () => { setIsConnected(false); setIsSyncing(false); });
    socket.on('connect_error', () => { setIsConnected(false); setIsSyncing(false); });

    socket.on('canvas:role', ({ role }: { role: string }) => {
      setConfirmedRole(role);
      cbRef.current?.onRoleConfirmed?.(role);
    });

    socket.on('canvas:state', ({ elements }: { elements: DrawableElement[] }) => {
      cbRef.current?.onCanvasState(elements ?? []);
      setIsSyncing(false);
    });

    socket.on('users:active', (users: RemoteUser[]) => setActiveUsers(users));

    socket.on('user:joined', (user: RemoteUser & { socketId: string }) => {
      setActiveUsers(prev => prev.find(u => u.userId === user.userId) ? prev : [...prev, user]);
    });

    socket.on('user:left', ({ userId, socketId }: { userId: string; socketId: string }) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== userId));
      setRemoteCursors(prev => { const n = { ...prev }; delete n[socketId]; return n; });
      cbRef.current?.onRemoteStrokeUpdate?.(socketId, null);
    });

    socket.on('element:add',    ({ element }: { element: DrawableElement }) =>
      cbRef.current?.onElementAdd(element));
    socket.on('element:delete', ({ elementId }: { elementId: string }) =>
      cbRef.current?.onElementDelete(elementId));
    socket.on('element:modify', ({ element }: { element: DrawableElement }) =>
      cbRef.current?.onElementModify(element));
    socket.on('canvas:clear', () =>
      cbRef.current?.onCanvasClear());

    socket.on('cursor:move', ({
      userId, socketId, userName: uName, userColor, x, y,
    }: { userId: string; socketId: string; userName: string; userColor: string; x: number; y: number }) => {
      setRemoteCursors(prev => ({
        ...prev,
        [socketId]: { userId, userName: uName, userColor, x, y },
      }));
    });

    socket.on('stroke:drawing', ({
      userId, socketId, userName: uName, userColor, points, color, width, strokeType,
    }: RemoteStroke) => {
      cbRef.current?.onRemoteStrokeUpdate?.(socketId, {
        userId, socketId, userName: uName, userColor, points, color, width, strokeType,
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsSyncing(false);
      setActiveUsers([]);
      setRemoteCursors({});
    };
  // Socket is created once per canvasId+token — callbacks stay fresh via cbRef
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.canvasId, options?.firebaseToken]);

  // ── Emit helpers — safe: optional chaining means no throw when disconnected
  const emitElementAdd    = useCallback((cid: string, element: any) =>
    socketRef.current?.emit('element:add',    { canvasId: cid, element }), []);
  const emitElementDelete = useCallback((cid: string, elementId: string) =>
    socketRef.current?.emit('element:delete', { canvasId: cid, elementId }), []);
  const emitElementModify = useCallback((cid: string, element: any) =>
    socketRef.current?.emit('element:modify', { canvasId: cid, element }), []);
  const emitCanvasClear   = useCallback((cid: string) =>
    socketRef.current?.emit('canvas:clear',   { canvasId: cid }), []);
  const emitCursorMove    = useCallback((cid: string, x: number, y: number) =>
    socketRef.current?.emit('cursor:move',    { canvasId: cid, x, y }), []);
  const emitStrokeDrawing = useCallback((
    cid: string, points: { x: number; y: number }[],
    color: string, width: number, strokeType: string,
  ) => socketRef.current?.emit('stroke:drawing', { canvasId: cid, points, color, width, strokeType }), []);
  const emitCanvasSave    = useCallback((cid: string, elements: any[], viewport: any) =>
    socketRef.current?.emit('canvas:save', { canvasId: cid, elements, viewport }), []);

  const onRemoteStrokeUpdate = useCallback((cid: string, stroke: RemoteStroke | null) => {
    if (!stroke)
      socketRef.current?.emit('stroke:drawing', { canvasId: cid, points: [], color: '', width: 0, strokeType: 'pen' });
  }, []);

  return {
    isConnected, isSyncing, activeUsers, remoteCursors, confirmedRole,
    emitElementAdd, emitElementDelete, emitElementModify,
    emitCanvasClear, emitCursorMove, emitStrokeDrawing,
    emitCanvasSave, onRemoteStrokeUpdate,
  };
};