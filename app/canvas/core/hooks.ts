/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: app/canvas/core/hooks.ts
// CHANGE: useAutoSave — skip save when token is null (viewer role), 
//         and never throw on non-ok response (just log silently)

import { useRef, useCallback, useEffect, useState } from 'react';

// ─── useHistory ───────────────────────────────────────────────────────────────
export interface HistoryAction {
  type:      'add' | 'delete' | 'modify';
  elements:  any[];
  timestamp: number;
}

export const useHistory = (maxSize = 50) => {
  const past   = useRef<HistoryAction[]>([]);
  const future = useRef<HistoryAction[]>([]);

  const addToHistory = useCallback((action: HistoryAction) => {
    past.current = [...past.current.slice(-maxSize + 1), action];
    future.current = [];
  }, [maxSize]);

  const undo = useCallback((): HistoryAction | null => {
    if (!past.current.length) return null;
    const action = past.current[past.current.length - 1];
    past.current = past.current.slice(0, -1);
    future.current = [action, ...future.current];
    return action;
  }, []);

  const redo = useCallback((): HistoryAction | null => {
    if (!future.current.length) return null;
    const action = future.current[0];
    future.current = future.current.slice(1);
    past.current = [...past.current, action];
    return action;
  }, []);

  return {
    addToHistory,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
};

// ─── useViewport ──────────────────────────────────────────────────────────────
export interface Viewport {
  x:    number;
  y:    number;
  zoom: number;
}

export const useViewport = (initialZoom = 1) => {
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: initialZoom });

  const pan = useCallback((dx: number, dy: number) => {
    setViewport(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }, []);

  const zoom = useCallback((delta: number, cx: number, cy: number) => {
    setViewport(v => {
      const newZoom  = Math.max(0.1, Math.min(5, v.zoom + delta));
      const scale    = newZoom / v.zoom;
      return {
        zoom: newZoom,
        x:    cx - scale * (cx - v.x),
        y:    cy - scale * (cy - v.y),
      };
    });
  }, []);

  const reset = useCallback(() => setViewport({ x: 0, y: 0, zoom: 1 }), []);

  const setFromSaved = useCallback((saved: Viewport) => {
    if (saved && typeof saved.x === 'number') setViewport(saved);
  }, []);

  return { viewport, pan, zoom, reset, setFromSaved };
};

// ─── useAutoSave ──────────────────────────────────────────────────────────────
// FIXED:
//   1. If token is null → skip save entirely (viewer role)
//   2. On non-ok response → log warning, never throw (prevents console errors)
export const useAutoSave = (
  getData:      () => any,
  intervalMs:   number,
  canvasId:     string | null,
  token:        string | null          // null = viewer, skip save
) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const getDataRef = useRef(getData);

  useEffect(() => { getDataRef.current = getData; }, [getData]);

  const save = useCallback(async () => {
    // Skip silently if no canvasId or no token (viewer / not logged in)
    if (!canvasId || !token) return;

    try {
      const data = getDataRef.current();
      // Backend uses POST /canvas/:id/save with { elements[], deletedIds[], viewport? }
      const payload = {
        elements:   Array.isArray(data.elements)   ? data.elements   : [],
        deletedIds: Array.isArray(data.deletedIds) ? data.deletedIds : [],
        viewport:   data.viewport,
      };
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/${canvasId}/save`,
        {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        // Silently log — never throw so it doesn't appear in console as an error
        console.warn(`[AutoSave] skipped — server returned ${res.status}`);
        return;
      }

      setLastSaved(new Date());
    } catch (err) {
      console.warn('[AutoSave] network error:', err);
    }
  }, [canvasId, token]);

  // Auto-save on interval
  useEffect(() => {
    if (!canvasId || !token) return;          // viewers: don't even set interval
    const id = setInterval(save, intervalMs);
    return () => clearInterval(id);
  }, [save, intervalMs, canvasId, token]);

  return { lastSaved, save };
};

// ─── useKeyboardShortcuts ─────────────────────────────────────────────────────
interface KeyboardShortcutsOptions {
  onUndo?:        () => void;
  onRedo?:        () => void;
  onDelete?:      () => void;
  onSave?:        () => void;
  onToggleGrid?:  () => void;
  onZoomIn?:      () => void;
  onZoomOut?:     () => void;
  onResetZoom?:   () => void;
  onEscape?:      () => void;
  onTabKey?:      () => void;
}

export const useKeyboardShortcuts = (opts: KeyboardShortcutsOptions) => {
  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; }, [opts]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const o = optsRef.current;

      // Don't fire when typing in input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); o.onUndo?.(); }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); o.onRedo?.(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !ctrl) { o.onDelete?.(); }
      if (ctrl && e.key === 's') { e.preventDefault(); o.onSave?.(); }
      if (ctrl && e.key === 'g') { e.preventDefault(); o.onToggleGrid?.(); }
      if (ctrl && e.key === '=') { e.preventDefault(); o.onZoomIn?.(); }
      if (ctrl && e.key === '-') { e.preventDefault(); o.onZoomOut?.(); }
      if (ctrl && e.key === '0') { e.preventDefault(); o.onResetZoom?.(); }
      if (e.key === 'Escape')    { o.onEscape?.(); }
      if (e.key === 'Tab')       { e.preventDefault(); o.onTabKey?.(); }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
};