'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { DrawableElement } from './types';

export interface RemoteUser {
  userId: string;
  userName: string;
  userColor: string;
  socketId?: string;
  cursor?: { x: number; y: number };
}

export interface CollaborationOptions {
  canvasId: string;
  firebaseToken: string;
  userName: string;
  onElementAdd: (element: DrawableElement) => void;
  onElementDelete: (elementId: string) => void;
  onElementModify: (element: DrawableElement) => void;
  onCanvasClear: () => void;
  onCanvasState: (elements: DrawableElement[]) => void;
}

export const useCollaboration = (options: CollaborationOptions | null) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeUsers, setActiveUsers] = useState<RemoteUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteUser & { x: number; y: number }>>({});

  useEffect(() => {
    if (!options) return;

    const { canvasId, firebaseToken, userName } = options;

    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
      auth: { token: firebaseToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setIsSyncing(true);
      // Join the canvas room
      console.log('✅ Socket connected! ID:', socket.id);
      socket.emit('canvas:join', { canvasId, userName });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setIsConnected(false);
    });

    // Receive full canvas state on join
    socket.on('canvas:state', ({ elements }) => {
      console.log('📦 Canvas state received, elements:', elements.length);
      options.onCanvasState(elements);
      setIsSyncing(false);
    });

    // Existing active users list
    socket.on('users:active', (users: RemoteUser[]) => {
      setActiveUsers(users);
    });

    // Someone joined
    socket.on('user:joined', (user: RemoteUser) => {
      setActiveUsers((prev) => {
        const exists = prev.find((u) => u.userId === user.userId);
        if (exists) return prev;
        return [...prev, user];
      });
    });

    // Someone left
    socket.on('user:left', ({ userId, socketId }: { userId: string; socketId: string }) => {
      setActiveUsers((prev) => prev.filter((u) => u.userId !== userId));
      setRemoteCursors((prev) => {
        const updated = { ...prev };
        delete updated[socketId];
        return updated;
      });
    });

    // Incoming element events from other users
    socket.on('element:add', ({ element }: { element: DrawableElement }) => {
      options.onElementAdd(element);
    });

    socket.on('element:delete', ({ elementId }: { elementId: string }) => {
      options.onElementDelete(elementId);
    });

    socket.on('element:modify', ({ element }: { element: DrawableElement }) => {
      options.onElementModify(element);
    });

    socket.on('canvas:clear', () => {
      options.onCanvasClear();
    });

    // Remote cursor updates
    socket.on('cursor:move', ({ userId, socketId, x, y }: { userId: string; socketId: string; x: number; y: number }) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [socketId]: {
          ...(prev[socketId] || { userId, userName: '', userColor: '#3B82F6' }),
          x,
          y,
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
  }, [options?.canvasId, options?.firebaseToken]);

  // Emit: element added
  const emitElementAdd = useCallback((canvasId: string, element: DrawableElement) => {
    socketRef.current?.emit('element:add', { canvasId, element });
  }, []);

  // Emit: element deleted
  const emitElementDelete = useCallback((canvasId: string, elementId: string) => {
    socketRef.current?.emit('element:delete', { canvasId, elementId });
  }, []);

  // Emit: element modified
  const emitElementModify = useCallback((canvasId: string, element: DrawableElement) => {
    socketRef.current?.emit('element:modify', { canvasId, element });
  }, []);

  // Emit: canvas cleared
  const emitCanvasClear = useCallback((canvasId: string) => {
    socketRef.current?.emit('canvas:clear', { canvasId });
  }, []);

  // Emit: cursor position (call this on mouse move, throttled)
  const emitCursorMove = useCallback((canvasId: string, x: number, y: number) => {
    socketRef.current?.emit('cursor:move', { canvasId, x, y });
  }, []);

  // Emit: stroke in progress (live preview while drawing)
  const emitStrokeDrawing = useCallback((
    canvasId: string,
    points: { x: number; y: number }[],
    color: string,
    width: number,
    strokeType: string
  ) => {
    socketRef.current?.emit('stroke:drawing', { canvasId, points, color, width, strokeType });
  }, []);

  return {
    isConnected,
    isSyncing,
    activeUsers,
    remoteCursors,
    emitElementAdd,
    emitElementDelete,
    emitElementModify,
    emitCanvasClear,
    emitCursorMove,
    emitStrokeDrawing,
  };
};