import { useState, useCallback, useRef, useEffect } from 'react';
import { DrawableElement, HistoryAction, Viewport } from './types';

// ── useHistory ────────────────────────────────────────────────────────────────
export const useHistory = (maxHistory: number = 100) => {
  const [history,      setHistory]      = useState<HistoryAction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const addToHistory = useCallback((action: HistoryAction) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(action);
      if (newHistory.length > maxHistory) { newHistory.shift(); return newHistory; }
      return newHistory;
    });
    setCurrentIndex((prev) => Math.min(prev + 1, maxHistory - 1));
  }, [currentIndex, maxHistory]);

  const undo = useCallback(() => {
    if (currentIndex > 0) { setCurrentIndex((prev) => prev - 1); return history[currentIndex - 1]; }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) { setCurrentIndex((prev) => prev + 1); return history[currentIndex + 1]; }
    return null;
  }, [currentIndex, history]);

  const clear = useCallback(() => { setHistory([]); setCurrentIndex(-1); }, []);

  return { addToHistory, undo, redo, canUndo: currentIndex > 0, canRedo: currentIndex < history.length - 1, clear };
};

// ── useViewport ───────────────────────────────────────────────────────────────
export const useViewport = (initialZoom: number = 1) => {
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: initialZoom });
  const minZoom = 0.1, maxZoom = 5;

  const zoom = useCallback((delta: number, centerX: number, centerY: number) => {
    setViewport((prev) => {
      const newZoom   = Math.max(minZoom, Math.min(maxZoom, prev.zoom + delta));
      const zoomRatio = newZoom / prev.zoom;
      return { x: centerX - (centerX - prev.x) * zoomRatio, y: centerY - (centerY - prev.y) * zoomRatio, zoom: newZoom };
    });
  }, []);

  const pan   = useCallback((dx: number, dy: number) => setViewport((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy })), []);
  const reset = useCallback(() => setViewport({ x: 0, y: 0, zoom: initialZoom }), [initialZoom]);

  const setZoom = useCallback((newZoom: number, centerX?: number, centerY?: number) => {
    setViewport((prev) => {
      const clamped = Math.max(minZoom, Math.min(maxZoom, newZoom));
      if (centerX !== undefined && centerY !== undefined) {
        const ratio = clamped / prev.zoom;
        return { x: centerX - (centerX - prev.x) * ratio, y: centerY - (centerY - prev.y) * ratio, zoom: clamped };
      }
      return { ...prev, zoom: clamped };
    });
  }, []);

  return { viewport, zoom, pan, reset, setZoom, minZoom, maxZoom };
};

// ── useKeyboardShortcuts ──────────────────────────────────────────────────────
export const useKeyboardShortcuts = (callbacks: {
  onUndo?: () => void; onRedo?: () => void; onDelete?: () => void;
  onSelectAll?: () => void; onCopy?: () => void; onPaste?: () => void;
  onZoomIn?: () => void; onZoomOut?: () => void; onResetZoom?: () => void;
  onSave?: () => void; onToggleGrid?: () => void;
  onSwitchToPen?: () => void; onSwitchToEraser?: () => void;
  onSwitchToSelect?: () => void; onSwitchToPan?: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac    = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier && e.key === 'z' && !e.shiftKey)                        { e.preventDefault(); callbacks.onUndo?.(); }
      else if (modifier && (e.key === 'y' || (e.key === 'z' && e.shiftKey))){ e.preventDefault(); callbacks.onRedo?.(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && !modifier)  { e.preventDefault(); callbacks.onDelete?.(); }
      else if (modifier && e.key === 'a')                                   { e.preventDefault(); callbacks.onSelectAll?.(); }
      else if (modifier && e.key === 'c')                                   { e.preventDefault(); callbacks.onCopy?.(); }
      else if (modifier && e.key === 'v')                                   { e.preventDefault(); callbacks.onPaste?.(); }
      else if (modifier && (e.key === '=' || e.key === '+'))                { e.preventDefault(); callbacks.onZoomIn?.(); }
      else if (modifier && e.key === '-')                                   { e.preventDefault(); callbacks.onZoomOut?.(); }
      else if (modifier && e.key === '0')                                   { e.preventDefault(); callbacks.onResetZoom?.(); }
      else if (modifier && e.key === 's')                                   { e.preventDefault(); callbacks.onSave?.(); }
      else if (modifier && e.key === 'g')                                   { e.preventDefault(); callbacks.onToggleGrid?.(); }
      else if (e.key === 'p' && !modifier)                                  { e.preventDefault(); callbacks.onSwitchToPen?.(); }
      else if (e.key === 'e' && !modifier)                                  { e.preventDefault(); callbacks.onSwitchToEraser?.(); }
      else if (e.key === 'v' && !modifier)                                  { e.preventDefault(); callbacks.onSwitchToSelect?.(); }
      else if (e.key === 'h' && !modifier)                                  { e.preventDefault(); callbacks.onSwitchToPan?.(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callbacks]);
};

// ── useAutoSave ───────────────────────────────────────────────────────────────
// Saves to backend every `interval` ms + on explicit triggerSave() call.
// Falls back to localStorage if canvasId/firebaseToken not provided.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useAutoSave = (
  getData:        () => any,
  interval:       number  = 30000,   // 30 seconds
  canvasId?:      string,
  firebaseToken?: string,
) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving,  setIsSaving]  = useState(false);
  const isSavingRef = useRef(false); // prevent overlapping saves

  const save = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const data = getData(); // { version, elements, viewport, ... }

      if (canvasId && firebaseToken) {
        // ── Save to backend ──────────────────────────────────────────────────
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/${canvasId}/save`,
          {
            method:  'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization:  `Bearer ${firebaseToken}`,
            },
            body: JSON.stringify({
              elements: data.elements,
              viewport: data.viewport,
            }),
          }
        );
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      } else {
        // ── Fallback: localStorage (standalone / no auth mode) ───────────────
        localStorage.setItem('whiteboard_autosave', JSON.stringify(data));
      }

      setLastSaved(new Date());
    } catch (err) {
      console.error('Auto-save failed:', err);
      // Fallback to localStorage on network error so data is never fully lost
      try {
        const data = getData();
        localStorage.setItem('whiteboard_autosave', JSON.stringify(data));
      } catch { /* ignore */ }
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [getData, canvasId, firebaseToken]);

  // Periodic auto-save
  useEffect(() => {
    if (!canvasId || !firebaseToken) return; // don't auto-save if no canvas
    const timer = setInterval(save, interval);
    return () => clearInterval(timer);
  }, [save, interval, canvasId, firebaseToken]);

  // Save on page unload so data isn't lost when user closes tab
  useEffect(() => {
    if (!canvasId || !firebaseToken) return;
    const handleUnload = () => {
      // Use sendBeacon for reliable unload saves
      const data = getData();
      const body = JSON.stringify({ elements: data.elements, viewport: data.viewport });
      navigator.sendBeacon(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/${canvasId}/save`,
        new Blob([body], { type: 'application/json' })
      );
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [getData, canvasId, firebaseToken]);

  return { lastSaved, isSaving, save };
};

// ── useSelection ──────────────────────────────────────────────────────────────
export const useSelection = () => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const select        = useCallback((id: string)      => setSelectedIds((prev) => new Set(prev).add(id)), []);
  const deselect      = useCallback((id: string)      => setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; }), []);
  const toggleSelect  = useCallback((id: string)      => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);
  const selectMultiple= useCallback((ids: string[])   => setSelectedIds(new Set(ids)), []);
  const clearSelection= useCallback(()                => setSelectedIds(new Set()), []);
  const selectAll     = useCallback((allIds: string[])=> setSelectedIds(new Set(allIds)), []);

  return { selectedIds, select, deselect, toggleSelect, selectMultiple, clearSelection, selectAll, hasSelection: selectedIds.size > 0 };
};