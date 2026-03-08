'use client';

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
  const socketRef       = useRef<Socket | null>(null);
  const [isConnected,   setIsConnected]   = useState(false);
  const [isSyncing,     setIsSyncing]     = useState(false);
  const [activeUsers,   setActiveUsers]   = useState<RemoteUser[]>([]);
  const [confirmedRole, setConfirmedRole] = useState<string | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<
    Record<string, { userId: string; userName: string; userColor: string; x: number; y: number }>
  >({});

  useEffect(() => {
    if (!options) return;
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

    socket.on('disconnect',    () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    socket.on('canvas:role', ({ role }: { role: string }) => {
      setConfirmedRole(role);
      options.onRoleConfirmed?.(role);
    });

    socket.on('canvas:state', ({ elements }: { elements: DrawableElement[] }) => {
      options.onCanvasState(elements);
      setIsSyncing(false);
    });

    socket.on('users:active', (users: RemoteUser[]) => {
      setActiveUsers(users);
    });

    socket.on('user:joined', (user: RemoteUser & { socketId: string }) => {
      setActiveUsers(prev => prev.find(u => u.userId === user.userId) ? prev : [...prev, user]);
    });

    socket.on('user:left', ({ userId, socketId }: { userId: string; socketId: string }) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== userId));
      setRemoteCursors(prev => { const n = { ...prev }; delete n[socketId]; return n; });
      options.onRemoteStrokeUpdate?.(socketId, null);
    });

    socket.on('element:add',    ({ element }: { element: DrawableElement }) => options.onElementAdd(element));
    socket.on('element:delete', ({ elementId }: { elementId: string })      => options.onElementDelete(elementId));
    socket.on('element:modify', ({ element }: { element: DrawableElement }) => options.onElementModify(element));
    socket.on('canvas:clear',   ()                                           => options.onCanvasClear());

    // Backend now sends userName + userColor directly — no enrichment needed
    socket.on('cursor:move', ({
      userId, socketId, userName: uName, userColor, x, y,
    }: { userId: string; socketId: string; userName: string; userColor: string; x: number; y: number }) => {
      setRemoteCursors(prev => ({
        ...prev,
        [socketId]: { userId, userName: uName, userColor, x, y },
      }));
    });

    // Backend sends socketId + userName + userColor directly in stroke:drawing
    socket.on('stroke:drawing', ({
      userId, socketId, userName: uName, userColor, points, color, width, strokeType,
    }: RemoteStroke) => {
      options.onRemoteStrokeUpdate?.(socketId, {
        userId, socketId, userName: uName, userColor, points, color, width, strokeType,
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setActiveUsers([]);
      setRemoteCursors({});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.canvasId, options?.firebaseToken]);

  const emitElementAdd    = useCallback((cid: string, element: DrawableElement) =>
    socketRef.current?.emit('element:add',    { canvasId: cid, element }), []);
  const emitElementDelete = useCallback((cid: string, elementId: string) =>
    socketRef.current?.emit('element:delete', { canvasId: cid, elementId }), []);
  const emitElementModify = useCallback((cid: string, element: DrawableElement) =>
    socketRef.current?.emit('element:modify', { canvasId: cid, element }), []);
  const emitCanvasClear   = useCallback((cid: string) =>
    socketRef.current?.emit('canvas:clear',   { canvasId: cid }), []);
  const emitCursorMove    = useCallback((cid: string, x: number, y: number) =>
    socketRef.current?.emit('cursor:move',    { canvasId: cid, x, y }), []);
  const emitStrokeDrawing = useCallback((
    cid: string, points: { x: number; y: number }[],
    color: string, width: number, strokeType: string,
  ) => socketRef.current?.emit('stroke:drawing', { canvasId: cid, points, color, width, strokeType }), []);

  return {
    isConnected, isSyncing, activeUsers, remoteCursors, confirmedRole,
    emitElementAdd, emitElementDelete, emitElementModify,
    emitCanvasClear, emitCursorMove, emitStrokeDrawing,
  };
};