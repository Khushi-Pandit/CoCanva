'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { DrawableElement } from './types';

export interface RemoteUser {
  userId: string;
  userName: string;
  userColor: string;
  role?: string;
  socketId?: string;
  cursor?: { x: number; y: number };
}

export interface CollaborationOptions {
  canvasId: string;
  firebaseToken: string;
  userName: string;
  userRole: string;        // local role (for optimistic UI before server confirms)
  shareToken?: string;     // raw share token — backend verifies against DB for role
  onElementAdd: (element: DrawableElement) => void;
  onElementDelete: (elementId: string) => void;
  onElementModify: (element: DrawableElement) => void;
  onCanvasClear: () => void;
  onCanvasState: (elements: DrawableElement[]) => void;
  onRoleConfirmed?: (role: string) => void;  // called when server sends canvas:role
}

export const useCollaboration = (options: CollaborationOptions | null) => {
  const socketRef      = useRef<Socket | null>(null);
  const [isConnected,   setIsConnected]   = useState(false);
  const [isSyncing,     setIsSyncing]     = useState(false);
  const [activeUsers,   setActiveUsers]   = useState<RemoteUser[]>([]);
  const [confirmedRole, setConfirmedRole] = useState<string | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<
    Record<string, RemoteUser & { x: number; y: number }>
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
      console.log('✅ Socket connected:', socket.id);

      // Send shareToken to backend — backend verifies it against DB.
      // We do NOT send role from client; server resolves it from:
      //   owner check → collaborator check → shareToken DB lookup
      socket.emit('canvas:join', {
        canvasId,
        userName,
        shareToken: shareToken ?? '',
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
      setIsConnected(false);
    });

    // Server sends back the verified role — update UI to match
    socket.on('canvas:role', ({ role }: { role: string }) => {
      setConfirmedRole(role);
      options.onRoleConfirmed?.(role);
      console.log('🔑 Role confirmed by server:', role);
    });

    socket.on('canvas:state', ({ elements }: { elements: DrawableElement[] }) => {
      console.log('📦 Canvas state received, elements:', elements.length);
      options.onCanvasState(elements);
      setIsSyncing(false);
    });

    socket.on('users:active', (users: RemoteUser[]) => {
      setActiveUsers(users);
    });

    socket.on('user:joined', (user: RemoteUser) => {
      setActiveUsers(prev => {
        if (prev.find(u => u.userId === user.userId)) return prev;
        return [...prev, user];
      });
    });

    socket.on('user:left', ({ userId, socketId }: { userId: string; socketId: string }) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== userId));
      setRemoteCursors(prev => {
        const updated = { ...prev };
        delete updated[socketId];
        return updated;
      });
    });

    socket.on('element:add',    ({ element }: { element: DrawableElement })  => options.onElementAdd(element));
    socket.on('element:delete', ({ elementId }: { elementId: string })       => options.onElementDelete(elementId));
    socket.on('element:modify', ({ element }: { element: DrawableElement })  => options.onElementModify(element));
    socket.on('canvas:clear',   ()                                            => options.onCanvasClear());

    socket.on('cursor:move', ({ userId, socketId, x, y }: { userId: string; socketId: string; x: number; y: number }) => {
      setRemoteCursors(prev => ({
        ...prev,
        [socketId]: {
          ...(prev[socketId] || { userId, userName: '', userColor: '#3B82F6' }),
          x, y,
        },
      }));
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

  const emitElementAdd = useCallback((canvasId: string, element: DrawableElement) => {
    socketRef.current?.emit('element:add', { canvasId, element });
  }, []);

  const emitElementDelete = useCallback((canvasId: string, elementId: string) => {
    socketRef.current?.emit('element:delete', { canvasId, elementId });
  }, []);

  const emitElementModify = useCallback((canvasId: string, element: DrawableElement) => {
    socketRef.current?.emit('element:modify', { canvasId, element });
  }, []);

  const emitCanvasClear = useCallback((canvasId: string) => {
    socketRef.current?.emit('canvas:clear', { canvasId });
  }, []);

  const emitCursorMove = useCallback((canvasId: string, x: number, y: number) => {
    socketRef.current?.emit('cursor:move', { canvasId, x, y });
  }, []);

  const emitStrokeDrawing = useCallback((
    canvasId: string,
    points: { x: number; y: number }[],
    color: string, width: number, strokeType: string
  ) => {
    socketRef.current?.emit('stroke:drawing', { canvasId, points, color, width, strokeType });
  }, []);

  return {
    isConnected,
    isSyncing,
    activeUsers,
    remoteCursors,
    confirmedRole,
    emitElementAdd,
    emitElementDelete,
    emitElementModify,
    emitCanvasClear,
    emitCursorMove,
    emitStrokeDrawing,
  };
};