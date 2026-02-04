import { useState, useCallback, useRef, useEffect } from 'react';
import { DrawableElement, HistoryAction, Viewport } from './types';

// History management hook for undo/redo
export const useHistory = (maxHistory: number = 100) => {
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const addToHistory = useCallback((action: HistoryAction) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(action);
      if (newHistory.length > maxHistory) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setCurrentIndex((prev) => Math.min(prev + 1, maxHistory - 1));
  }, [currentIndex, maxHistory]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const clear = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  return { addToHistory, undo, redo, canUndo, canRedo, clear };
};

// Viewport management for infinite canvas
export const useViewport = (initialZoom: number = 1) => {
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    zoom: initialZoom,
  });

  const minZoom = 0.1;
  const maxZoom = 5;

  const zoom = useCallback((delta: number, centerX: number, centerY: number) => {
    setViewport((prev) => {
      const newZoom = Math.max(minZoom, Math.min(maxZoom, prev.zoom + delta));
      const zoomRatio = newZoom / prev.zoom;

      return {
        x: centerX - (centerX - prev.x) * zoomRatio,
        y: centerY - (centerY - prev.y) * zoomRatio,
        zoom: newZoom,
      };
    });
  }, []);

  const pan = useCallback((dx: number, dy: number) => {
    setViewport((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  }, []);

  const reset = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: initialZoom });
  }, [initialZoom]);

  const setZoom = useCallback((newZoom: number, centerX?: number, centerY?: number) => {
    setViewport((prev) => {
      const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
      
      if (centerX !== undefined && centerY !== undefined) {
        const zoomRatio = clampedZoom / prev.zoom;
        return {
          x: centerX - (centerX - prev.x) * zoomRatio,
          y: centerY - (centerY - prev.y) * zoomRatio,
          zoom: clampedZoom,
        };
      }
      
      return { ...prev, zoom: clampedZoom };
    });
  }, []);

  return { viewport, zoom, pan, reset, setZoom, minZoom, maxZoom };
};

// Keyboard shortcuts hook
export const useKeyboardShortcuts = (callbacks: {
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onSave?: () => void;
  onToggleGrid?: () => void;
  onSwitchToPen?: () => void;
  onSwitchToEraser?: () => void;
  onSwitchToSelect?: () => void;
  onSwitchToPan?: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Undo
      if (modifier && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        callbacks.onUndo?.();
      }
      // Redo
      else if (modifier && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        callbacks.onRedo?.();
      }
      // Delete
      else if ((e.key === 'Delete' || e.key === 'Backspace') && !modifier) {
        e.preventDefault();
        callbacks.onDelete?.();
      }
      // Select All
      else if (modifier && e.key === 'a') {
        e.preventDefault();
        callbacks.onSelectAll?.();
      }
      // Copy
      else if (modifier && e.key === 'c') {
        e.preventDefault();
        callbacks.onCopy?.();
      }
      // Paste
      else if (modifier && e.key === 'v') {
        e.preventDefault();
        callbacks.onPaste?.();
      }
      // Zoom In
      else if (modifier && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        callbacks.onZoomIn?.();
      }
      // Zoom Out
      else if (modifier && e.key === '-') {
        e.preventDefault();
        callbacks.onZoomOut?.();
      }
      // Reset Zoom
      else if (modifier && e.key === '0') {
        e.preventDefault();
        callbacks.onResetZoom?.();
      }
      // Save
      else if (modifier && e.key === 's') {
        e.preventDefault();
        callbacks.onSave?.();
      }
      // Toggle Grid
      else if (modifier && e.key === 'g') {
        e.preventDefault();
        callbacks.onToggleGrid?.();
      }
      // Tool shortcuts
      else if (e.key === 'p' && !modifier) {
        e.preventDefault();
        callbacks.onSwitchToPen?.();
      }
      else if (e.key === 'e' && !modifier) {
        e.preventDefault();
        callbacks.onSwitchToEraser?.();
      }
      else if (e.key === 'v' && !modifier) {
        e.preventDefault();
        callbacks.onSwitchToSelect?.();
      }
      else if (e.key === 'h' && !modifier) {
        e.preventDefault();
        callbacks.onSwitchToPan?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callbacks]);
};

// Auto-save hook
export const useAutoSave = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getData: () => any,
  interval: number = 30000 // 30 seconds
) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      const data = getData();
      // Save to localStorage as fallback
      localStorage.setItem('whiteboard_autosave', JSON.stringify(data));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [getData]);

  useEffect(() => {
    const timer = setInterval(save, interval);
    return () => clearInterval(timer);
  }, [save, interval]);

  return { lastSaved, isSaving, save };
};

// Selection management
export const useSelection = () => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const select = useCallback((id: string) => {
    setSelectedIds((prev) => new Set(prev).add(id));
  }, []);

  const deselect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback((allIds: string[]) => {
    setSelectedIds(new Set(allIds));
  }, []);

  return {
    selectedIds,
    select,
    deselect,
    toggleSelect,
    selectMultiple,
    clearSelection,
    selectAll,
    hasSelection: selectedIds.size > 0,
  };
};