'use client';
import { create } from 'zustand';
import {
  DrawableElement, ToolMode, StrokeType, ShapeType, FlowchartShapeType,
} from '@/types/element';
import { CanvasRole } from '@/types/canvas';

interface Viewport { x: number; y: number; zoom: number; }

interface CanvasState {
  // Canvas metadata
  canvasId: string;
  canvasTitle: string;
  role: CanvasRole;
  shareToken?: string;

  // Elements
  elements: DrawableElement[];
  deletedIds: string[];
  setElements: (els: DrawableElement[]) => void;
  addElement: (el: DrawableElement) => void;
  updateElement: (id: string, update: Partial<DrawableElement>) => void;
  removeElement: (id: string) => void;
  replaceElements: (fn: (prev: DrawableElement[]) => DrawableElement[]) => void;
  clearElements: () => void;
  markDeleted: (id: string) => void;
  clearDeletedIds: () => void;

  // Viewport
  viewport: Viewport;
  setViewport: (vp: Viewport) => void;
  panViewport: (dx: number, dy: number) => void;
  zoomViewport: (delta: number, cx: number, cy: number) => void;
  resetViewport: () => void;

  // Tool state
  tool: ToolMode;
  strokeType: StrokeType;
  shapeType: ShapeType;
  fcShape: FlowchartShapeType;
  color: string;
  lineWidth: number;
  opacity: number;
  showGrid: boolean;
  snapToGrid: boolean;
  setTool: (t: ToolMode) => void;
  setStrokeType: (t: StrokeType) => void;
  setShapeType: (t: ShapeType) => void;
  setFcShape: (t: FlowchartShapeType) => void;
  setColor: (c: string) => void;
  setLineWidth: (w: number) => void;
  setOpacity: (o: number) => void;
  toggleGrid: () => void;
  setShowGrid: (v: boolean) => void;
  toggleSnap: () => void;

  // Selection
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  clearSelection: () => void;

  // History (for undo)
  history: DrawableElement[][];
  historyIndex: number;
  pushHistory: (snapshot: DrawableElement[]) => void;
  undo: () => DrawableElement[] | null;
  redo: () => DrawableElement[] | null;

  // Sync
  isSyncing: boolean;
  setIsSyncing: (v: boolean) => void;
  lastSaved: Date | null;
  setLastSaved: (d: Date) => void;

  // Init
  init: (opts: { canvasId: string; title: string; role: CanvasRole; shareToken?: string }) => void;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  canvasId: '',
  canvasTitle: 'Untitled',
  role: 'viewer',
  shareToken: undefined,

  elements: [],
  deletedIds: [],

  setElements: (elements) => set({ elements }),
  addElement: (el) => set((s) => ({ elements: s.elements.find((e) => e.id === el.id) ? s.elements : [...s.elements, el] })),
  updateElement: (id, update) => set((s) => ({
    elements: s.elements.map((e) => e.id === id ? { ...e, ...update } as DrawableElement : e),
  })),
  removeElement: (id) => set((s) => ({ elements: s.elements.filter((e) => e.id !== id) })),
  replaceElements: (fn) => set((s) => ({ elements: fn(s.elements) })),
  clearElements: () => set({ elements: [], deletedIds: [] }),
  markDeleted: (id) => set((s) => ({ deletedIds: [...s.deletedIds, id] })),
  clearDeletedIds: () => set({ deletedIds: [] }),

  viewport: { x: 0, y: 0, zoom: 1 },
  setViewport: (viewport) => set({ viewport }),
  panViewport: (dx, dy) => set((s) => ({ viewport: { ...s.viewport, x: s.viewport.x + dx, y: s.viewport.y + dy } })),
  zoomViewport: (delta, cx, cy) => set((s) => {
    const { x, y, zoom } = s.viewport;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta * zoom));
    const scale = newZoom / zoom;
    return { viewport: { x: cx - (cx - x) * scale, y: cy - (cy - y) * scale, zoom: newZoom } };
  }),
  resetViewport: () => set({ viewport: { x: 0, y: 0, zoom: 1 } }),

  tool: 'draw',
  strokeType: 'pen',
  shapeType: 'rectangle',
  fcShape: 'rectangle',
  color: '#111827',
  lineWidth: 2,
  opacity: 1,
  showGrid: true,
  snapToGrid: false,

  setTool: (tool) => set({ tool }),
  setStrokeType: (strokeType) => set({ strokeType }),
  setShapeType: (shapeType) => set({ shapeType }),
  setFcShape: (fcShape) => set({ fcShape }),
  setColor: (color) => set({ color }),
  setLineWidth: (lineWidth) => set({ lineWidth }),
  setOpacity: (opacity) => set({ opacity }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  setShowGrid: (showGrid) => set({ showGrid }),
  toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

  selectedIds: [],
  setSelectedIds: (selectedIds) => set((s) => {
    // Attempt to pull formatting from the first selected element if one exists so toolbar reflects it
    if (selectedIds.length > 0) {
      const el = s.elements.find((e) => e.id === selectedIds[0]);
      if (el) {
        let newColor = el.color;
        let newWidth = s.lineWidth;
        let newOpacity = el.opacity || s.opacity;

        if (el.kind === 'stroke') newWidth = el.width;
        else if (el.kind === 'shape' || el.kind === 'flowchart') newWidth = el.strokeWidth;
        else if (el.kind === 'text') newWidth = Math.max(1, Math.round((el.fontSize || 12) / 4));

        return { selectedIds, color: newColor, lineWidth: newWidth, opacity: newOpacity };
      }
    }
    return { selectedIds };
  }),
  clearSelection: () => set({ selectedIds: [] }),

  history: [],
  historyIndex: -1,
  pushHistory: (snapshot) => set((s) => {
    const sliced = s.history.slice(0, s.historyIndex + 1);
    const next = [...sliced, snapshot].slice(-50); // keep 50 states
    return { history: next, historyIndex: next.length - 1 };
  }),
  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex <= 0) return null;
    const newIndex = historyIndex - 1;
    set({ historyIndex: newIndex });
    return history[newIndex];
  },
  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return null;
    const newIndex = historyIndex + 1;
    set({ historyIndex: newIndex });
    return history[newIndex];
  },

  isSyncing: false,
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  lastSaved: null,
  setLastSaved: (lastSaved) => set({ lastSaved }),

  init: ({ canvasId, title, role, shareToken }) =>
    set({ canvasId, canvasTitle: title, role, shareToken, elements: [], deletedIds: [], selectedIds: [], history: [], historyIndex: -1 }),
}));
