'use client';
import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from './socket.client';
import { useCollaborationStore } from '@/store/collaboration.store';
import { useCanvasStore } from '@/store/canvas.store';
import { DrawableElement } from '@/types/element';
import { fromAPI } from '@/lib/element.transform';
import { PeerState } from '@/types/socket';

interface UseCollaborationOptions {
  canvasId: string;
  token: string;
  shareToken?: string;
  onCanvasJoined?: (data: { role: string; lastViewport?: { x: number; y: number; zoom: number } }) => void;
  /** Optional override for canvas:state event — lets consumers (e.g. Notes page) filter elements by pageIndex */
  onCanvasState?: (elements: DrawableElement[]) => void;
}

export function useCollaboration({ canvasId, token, shareToken, onCanvasJoined, onCanvasState: onCanvasStateOverride }: UseCollaborationOptions) {
  const socketRef  = useRef<Socket | null>(null);
  const mySocketId = useRef<string>('');

  const {
    setConnected, setPeer, removePeer,
    updateCursor, removeCursor, updateLiveStroke, setLock,
  } = useCollaborationStore();

  const {
    addElement, updateElement, removeElement,
    clearElements, setElements, setViewport, setSocketElementsLoaded,
  } = useCanvasStore();

  useEffect(() => {
    if (!token || !canvasId) return;

    const s = getSocket(token);
    socketRef.current = s;

    // ── Connect → join canvas room ──────────────────────────────────────────
    const onConnect = () => {
      setConnected(true);
      mySocketId.current = s.id ?? '';
      s.emit('canvas:join', { canvasId, shareToken });
    };

    const onDisconnect = () => setConnected(false);

    // ── canvas:joined — server confirms join ────────────────────────────────
    // payload: { canvasId, title, role, lastViewport, settings }
    const onJoined = (data: {
      canvasId: string; title: string; role: string;
      lastViewport?: { x: number; y: number; zoom: number };
    }) => {
      onCanvasJoined?.(data);
      if (data.lastViewport) setViewport(data.lastViewport);
    };

    // ── canvas:state — initial element snapshot ─────────────────────────────
    // payload: { elements, canvasId, snapshotSeq }
    const onCanvasState = (data: { elements: unknown[] }) => {
      const els = (data.elements ?? []).map(fromAPI).filter((e): e is DrawableElement => e !== null);
      setSocketElementsLoaded(true);
      if (onCanvasStateOverride) {
        // Notes page: consumer handles filtering by pageIndex
        onCanvasStateOverride(els);
      } else {
        // Drawing canvas: load all elements as-is
        setElements(els);
      }
    };

    // ── users:active — peer list at join time ───────────────────────────────
    // payload: PeerState[] (direct array, NOT { users: [...] })
    const onUsersActive = (peers: PeerState[]) => {
      (peers ?? []).forEach((p) => {
        if (p.socketId !== mySocketId.current) {
          setPeer(p.socketId, p);
        }
      });
    };

    // ── user:joined — someone new joined ───────────────────────────────────
    // payload: { userId, userName, userColor, role, socketId }
    const onUserJoined = (data: { socketId: string; userId: string; userName: string; userColor: string; role: string }) => {
      if (data.socketId !== mySocketId.current) {
        setPeer(data.socketId, {
          socketId:    data.socketId,
          userId:      data.userId,
          userName:    data.userName,
          userColor:   data.userColor,
          role:        data.role as PeerState['role'],
          cursor:      null,
          selectedIds: [],
          viewport:    null,
        });
      }
    };

    // ── user:left ────────────────────────────────────────────────────────────
    // payload: { userId, socketId, userName }
    const onUserLeft = (data: { socketId: string }) => {
      removePeer(data.socketId);
      removeCursor(data.socketId);
      updateLiveStroke(data.socketId, null);
    };

    // ── element:added ────────────────────────────────────────────────────────
    // payload: { element, userId, socketId }
    const onElementAdded = (data: { element: unknown; socketId: string }) => {
      if (data.socketId === mySocketId.current) return; // skip own echo
      const el = fromAPI(data.element);
      if (el) addElement(el);
    };

    // ── element:updated ──────────────────────────────────────────────────────
    // payload: { element, userId, socketId }
    const onElementUpdated = (data: { element: unknown; socketId: string }) => {
      if (data.socketId === mySocketId.current) return;
      const el = fromAPI(data.element);
      if (el) updateElement(el.id, el);
    };

    // ── element:deleted ──────────────────────────────────────────────────────
    // payload: { elementIds, userId }
    const onElementDeleted = (data: { elementIds: string[] }) => {
      data.elementIds?.forEach((id) => removeElement(id));
    };

    // ── elements:batch ───────────────────────────────────────────────────────
    // payload: { added, updated, deletedIds, userId }
    const onElementsBatch = (data: { added: unknown[]; updated: unknown[]; deletedIds: string[] }) => {
      (data.added ?? []).forEach((e) => { const el = fromAPI(e); if (el) addElement(el); });
      (data.updated ?? []).forEach((e) => { const el = fromAPI(e); if (el) updateElement(el.id, el); });
      (data.deletedIds ?? []).forEach((id) => removeElement(id));
    };

    // ── canvas:cleared ───────────────────────────────────────────────────────
    const onCanvasClear = () => clearElements();

    // ── cursor:moved ─────────────────────────────────────────────────────────
    // payload: { userId, socketId, userName, userColor, x, y }
    const onCursorMoved = (data: { socketId: string; userId: string; userName: string; userColor: string; x: number; y: number }) => {
      if (data.socketId === mySocketId.current) return;
      updateCursor(data.socketId, data);
    };

    // ── stroke:preview ───────────────────────────────────────────────────────
    // payload: { userId, socketId, points, style }
    const onStrokePreview = (data: { socketId: string; points: Array<{ x: number; y: number }>; style: Record<string, unknown> }) => {
      if (data.socketId === mySocketId.current) return;
      updateLiveStroke(data.socketId, { points: data.points, style: data.style });
    };

    // ── element:locked / element:unlocked ────────────────────────────────────
    const onElementLocked = (data: { elementId: string; userId: string; userName: string; socketId: string }) => {
      setLock(data.elementId, data);
    };
    const onElementUnlocked = (data: { elementId: string }) => {
      setLock(data.elementId, null);
    };

    // ── selection:updated ────────────────────────────────────────────────────
    const onSelectionUpdated = (data: { socketId: string; elementIds: string[] }) => {
      // Update peer's selection in store (already handled by collaboration store)
    };

    // ── canvas:saved ─────────────────────────────────────────────────────────
    const onCanvasSaved = (_data: { savedAt: string; elementCount: number; savedBy: string }) => {
      // Could show toast, but canvas page handles its own save feedback
    };

    // ── Register all listeners ────────────────────────────────────────────────
    s.on('connect',           onConnect);
    s.on('disconnect',        onDisconnect);
    s.on('canvas:joined',     onJoined);
    s.on('canvas:state',      onCanvasState);
    s.on('users:active',      onUsersActive);      // ✅ was 'presence:state'
    s.on('user:joined',       onUserJoined);
    s.on('user:left',         onUserLeft);
    s.on('element:added',     onElementAdded);
    s.on('element:updated',   onElementUpdated);
    s.on('element:deleted',   onElementDeleted);
    s.on('elements:batch',    onElementsBatch);    // ✅ new handler
    s.on('canvas:cleared',    onCanvasClear);
    s.on('cursor:moved',      onCursorMoved);
    s.on('stroke:preview',    onStrokePreview);
    s.on('element:locked',    onElementLocked);
    s.on('element:unlocked',  onElementUnlocked);
    s.on('selection:updated', onSelectionUpdated);
    s.on('canvas:saved',      onCanvasSaved);

    if (s.connected) onConnect();

    return () => {
      s.emit('canvas:leave', { canvasId });
      s.off('connect',           onConnect);
      s.off('disconnect',        onDisconnect);
      s.off('canvas:joined',     onJoined);
      s.off('canvas:state',      onCanvasState);
      s.off('users:active',      onUsersActive);
      s.off('user:joined',       onUserJoined);
      s.off('user:left',         onUserLeft);
      s.off('element:added',     onElementAdded);
      s.off('element:updated',   onElementUpdated);
      s.off('element:deleted',   onElementDeleted);
      s.off('elements:batch',    onElementsBatch);
      s.off('canvas:cleared',    onCanvasClear);
      s.off('cursor:moved',      onCursorMoved);
      s.off('stroke:preview',    onStrokePreview);
      s.off('element:locked',    onElementLocked);
      s.off('element:unlocked',  onElementUnlocked);
      s.off('selection:updated', onSelectionUpdated);
      s.off('canvas:saved',      onCanvasSaved);
    };
  }, [canvasId, token, shareToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Emitters (all match exact backend socket.on() event names) ─────────────

  const emitElementAdd = useCallback((element: unknown) => {
    socketRef.current?.emit('element:add', { canvasId, element });     // ✅
  }, [canvasId]);

  const emitElementUpdate = useCallback((element: unknown) => {
    socketRef.current?.emit('element:update', { canvasId, element });  // ✅
  }, [canvasId]);

  const emitElementDelete = useCallback((elementIds: string[]) => {
    socketRef.current?.emit('element:delete', { canvasId, elementIds }); // ✅
  }, [canvasId]);

  const emitElementsBatch = useCallback((
    added: unknown[], updated: unknown[], deletedIds: string[],
  ) => {
    socketRef.current?.emit('elements:batch', { canvasId, added, updated, deletedIds }); // ✅
  }, [canvasId]);

  const emitCursorMove = useCallback((x: number, y: number) => {
    socketRef.current?.emit('cursor:move', { canvasId, x, y });        // ✅
  }, [canvasId]);

  const emitStrokePreview = useCallback((
    points: Array<{ x: number; y: number }>,
    style: Record<string, unknown>,
  ) => {
    socketRef.current?.emit('stroke:preview', { canvasId, points, style }); // ✅
  }, [canvasId]);

  const emitSelectionUpdate = useCallback((elementIds: string[]) => {
    socketRef.current?.emit('selection:update', { canvasId, elementIds }); // ✅
  }, [canvasId]);

  const emitViewportUpdate = useCallback((viewport: { x: number; y: number; zoom: number }) => {
    socketRef.current?.emit('viewport:update', { canvasId, viewport }); // ✅
  }, [canvasId]);

  const emitCanvasClear = useCallback(() => {
    socketRef.current?.emit('canvas:clear', { canvasId });              // ✅
  }, [canvasId]);

  const emitCanvasSave = useCallback((
    elements: unknown[],
    deletedIds: string[] = [],
    viewport?: { x: number; y: number; zoom: number },
  ) => {
    socketRef.current?.emit('canvas:save', { canvasId, elements, deletedIds, viewport }); // ✅
  }, [canvasId]);

  const emitLockElement = useCallback((elementId: string) => {
    socketRef.current?.emit('element:lock', { canvasId, elementId });   // ✅
  }, [canvasId]);

  const emitUnlockElement = useCallback((elementId: string) => {
    socketRef.current?.emit('element:unlock', { canvasId, elementId }); // ✅
  }, [canvasId]);

  const emitAIRequest = useCallback((
    type: 'chat' | 'ghost_suggest' | 'summarize' | 'layout' | 'code_to_diagram' | 'diagram_to_code',
    message: string,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>,
    context?: string,
  ) => {
    const requestId = crypto.randomUUID();
    socketRef.current?.emit('ai:request', { canvasId, type, message, history, context, requestId }); // ✅
    return requestId;
  }, [canvasId]);

  const emitAIStop = useCallback((requestId: string) => {
    socketRef.current?.emit('ai:stop', { requestId });                  // ✅
  }, []);

  return {
    socket:             socketRef.current,
    mySocketId:         mySocketId.current,
    emitElementAdd,
    emitElementUpdate,
    emitElementDelete,
    emitElementsBatch,
    emitCursorMove,
    emitStrokePreview,
    emitSelectionUpdate,
    emitViewportUpdate,
    emitCanvasClear,
    emitCanvasSave,
    emitLockElement,
    emitUnlockElement,
    emitAIRequest,
    emitAIStop,
  };
}
