/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Toolbar } from './components/toolbar';
import { TopControls } from './components/topControls';
import { ConnectionStatus, ActiveUsers, RemoteCursor } from './components/UIComponents';
import {
  Point, Stroke, Shape, TextElement, DrawableElement,
  ToolMode, StrokeType, ShapeType, Viewport, CanvasState, ExportFormat,
  isStroke, isShape, isTextElement,
} from './core/types';
import {
  generateId, calculateBounds, isPointNearStroke, simplifyStroke,
  screenToCanvas, canvasToScreen, throttle, splitStrokeByEraser,
} from './core/utils';
import {
  useHistory, useViewport, useKeyboardShortcuts,
  useAutoSave, useSelection,
} from './core/hooks';
import { useCollaboration } from './core/useCollaboration';
import { handleExport } from './core/export';
import { Share2, X, Type } from 'lucide-react';

// ─── Helper: map stored element format → DrawableElement ───────────────────
// (Backend stores elements with 'elementId' & 'kind' fields)
const normalizeElement = (el: any): DrawableElement => {
  if (el.kind === 'stroke' || el.points) {
    return {
      id: el.elementId || el.id,
      type: el.strokeType || el.type || 'pen',
      points: el.points || [],
      color: el.color,
      width: el.strokeWidth || el.width,
      opacity: el.opacity ?? 1,
      timestamp: el.timestamp || Date.now(),
      bounds: calculateBounds(el.points || []),
    } as Stroke;
  }
  if (el.kind === 'text' || el.text !== undefined) {
    return {
      id: el.elementId || el.id,
      x: el.x, y: el.y,
      text: el.text,
      fontSize: el.fontSize,
      fontFamily: el.fontFamily || 'Arial, sans-serif',
      color: el.color,
      timestamp: el.timestamp || Date.now(),
    } as TextElement;
  }
  return {
    id: el.elementId || el.id,
    type: el.shapeType || el.type,
    x: el.x, y: el.y,
    width: el.width, height: el.height,
    color: el.color,
    fillColor: el.fillColor,
    strokeWidth: el.strokeWidth,
    opacity: el.opacity ?? 1,
    rotation: el.rotation ?? 0,
    timestamp: el.timestamp || Date.now(),
  } as Shape;
};

// ─── Helper: map DrawableElement → backend element format ──────────────────
const serializeElement = (el: DrawableElement) => {
  if (isStroke(el)) {
    return {
      elementId: el.id,
      kind: 'stroke',
      strokeType: el.type,
      points: el.points,
      color: el.color,
      strokeWidth: el.width,
      opacity: el.opacity,
      timestamp: el.timestamp,
    };
  }
  if (isTextElement(el)) {
    return {
      elementId: el.id,
      kind: 'text',
      x: el.x, y: el.y,
      text: el.text,
      fontSize: el.fontSize,
      fontFamily: el.fontFamily,
      color: el.color,
      timestamp: el.timestamp,
    };
  }
  const shape = el as Shape;
  return {
    elementId: shape.id,
    kind: 'shape',
    shapeType: shape.type,
    x: shape.x, y: shape.y,
    width: shape.width, height: shape.height,
    color: shape.color,
    fillColor: shape.fillColor,
    strokeWidth: shape.strokeWidth,
    opacity: shape.opacity,
    rotation: shape.rotation,
    timestamp: shape.timestamp,
  };
};

interface InfiniteWhiteboardProps {
  // Pass these from your auth context / parent page
  canvasId?: string;
  firebaseToken?: string;
  userName?: string;
}

export default function InfiniteWhiteboard({
  canvasId,
  firebaseToken,
  userName = 'Anonymous',
}: InfiniteWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [elements, setElements] = useState<DrawableElement[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolMode>('draw');
  const [currentStrokeType, setCurrentStrokeType] = useState<StrokeType>('pen');
  const [currentShape, setCurrentShape] = useState<ShapeType>('rectangle');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [opacity, setOpacity] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isEditingText, setIsEditingText] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const currentStroke = useRef<Point[]>([]);
  const shapeStart = useRef<Point | null>(null);
  const panStart = useRef<Point | null>(null);

  const { addToHistory, undo, redo, canUndo, canRedo } = useHistory();
  const { viewport, zoom, pan, reset: resetViewport } = useViewport();
  const { selectedIds, toggleSelect, clearSelection } = useSelection();

  // ── Remote live strokes (in-progress from other users) ──
  const [remoteStrokes, setRemoteStrokes] = useState<Record<string, {
    points: Point[]; color: string; width: number; strokeType: string;
  }>>({});

  // ── Collaboration hook ──────────────────────────────────
  const collabOptions = canvasId && firebaseToken
    ? {
        canvasId,
        firebaseToken,
        userName,
        onElementAdd: (el: DrawableElement) => {
          setElements((prev) => {
            if (prev.find((e) => e.id === el.id)) return prev;
            return [...prev, normalizeElement(el as any)];
          });
        },
        onElementDelete: (elementId: string) => {
          setElements((prev) => prev.filter((e) => e.id !== elementId));
        },
        onElementModify: (el: DrawableElement) => {
          setElements((prev) => prev.map((e) => e.id === el.id ? normalizeElement(el as any) : e));
        },
        onCanvasClear: () => setElements([]),
        onCanvasState: (rawElements: any[]) => {
          setElements(rawElements.map(normalizeElement));
        },
      }
    : null;

  const {
    isConnected, isSyncing, activeUsers, remoteCursors,
    emitElementAdd, emitElementDelete, emitElementModify,
    emitCanvasClear, emitCursorMove, emitStrokeDrawing,
  } = useCollaboration(collabOptions);

  // ── Auto-save ───────────────────────────────────────────
  const getCanvasState = useCallback((): CanvasState => ({
    version: '1.0.0',
    elements,
    viewport,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }), [elements, viewport]);

  const { lastSaved, save: triggerSave } = useAutoSave(getCanvasState);

  // ── Canvas drawing ──────────────────────────────────────
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, vp: Viewport) => {
    const baseGridSize = 50;
    const z = vp.zoom;
    let major = baseGridSize, minor = baseGridSize / 5;
    if (z < 0.5) { major = baseGridSize * 4; minor = baseGridSize; }
    else if (z > 2) { major = baseGridSize; minor = baseGridSize / 10; }
    const startX = Math.floor((-vp.x / vp.zoom) / major) * major;
    const startY = Math.floor((-vp.y / vp.zoom) / major) * major;
    const endX = startX + (ctx.canvas.width / vp.zoom) + major * 2;
    const endY = startY + (ctx.canvas.height / vp.zoom) + major * 2;
    ctx.save();
    if (z >= 0.5) {
      ctx.strokeStyle = '#f3f4f6'; ctx.lineWidth = 0.5 / vp.zoom; ctx.beginPath();
      for (let x = startX; x <= endX; x += minor) { if (x % major !== 0) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); } }
      for (let y = startY; y <= endY; y += minor) { if (y % major !== 0) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); } }
      ctx.stroke();
    }
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1 / vp.zoom; ctx.beginPath();
    for (let x = startX; x <= endX; x += major) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
    for (let y = startY; y <= endY; y += major) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
    ctx.stroke(); ctx.restore();
  }, []);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (!stroke.points.length) return;
    ctx.save();
    if (stroke.type === 'eraser') {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = stroke.width; ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.width; ctx.globalAlpha = stroke.opacity;
      if (stroke.type === 'pencil') { ctx.globalAlpha *= 0.7; ctx.lineWidth *= 0.8; }
      else if (stroke.type === 'marker') { ctx.globalAlpha *= 0.6; ctx.lineWidth *= 1.5; }
      else if (stroke.type === 'brush') { ctx.lineWidth *= 1.2; }
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    ctx.stroke(); ctx.restore();
  }, []);

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: Shape) => {
    ctx.save();
    ctx.strokeStyle = shape.color; ctx.lineWidth = shape.strokeWidth; ctx.globalAlpha = shape.opacity;
    if (shape.fillColor) ctx.fillStyle = shape.fillColor;
    ctx.beginPath();
    switch (shape.type) {
      case 'rectangle': ctx.rect(shape.x, shape.y, shape.width, shape.height); break;
      case 'circle': {
        const r = Math.min(Math.abs(shape.width), Math.abs(shape.height)) / 2;
        ctx.arc(shape.x + shape.width / 2, shape.y + shape.height / 2, r, 0, Math.PI * 2); break;
      }
      case 'triangle':
        ctx.moveTo(shape.x + shape.width / 2, shape.y);
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
        ctx.lineTo(shape.x, shape.y + shape.height); ctx.closePath(); break;
      case 'diamond':
        ctx.moveTo(shape.x + shape.width / 2, shape.y);
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height / 2);
        ctx.lineTo(shape.x + shape.width / 2, shape.y + shape.height);
        ctx.lineTo(shape.x, shape.y + shape.height / 2); ctx.closePath(); break;
      case 'line': ctx.moveTo(shape.x, shape.y); ctx.lineTo(shape.x + shape.width, shape.y + shape.height); break;
      case 'arrow': {
        const hl = 15; const ang = Math.atan2(shape.height, shape.width);
        ctx.moveTo(shape.x, shape.y); ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
        ctx.lineTo(shape.x + shape.width - hl * Math.cos(ang - Math.PI / 6), shape.y + shape.height - hl * Math.sin(ang - Math.PI / 6));
        ctx.moveTo(shape.x + shape.width, shape.y + shape.height);
        ctx.lineTo(shape.x + shape.width - hl * Math.cos(ang + Math.PI / 6), shape.y + shape.height - hl * Math.sin(ang + Math.PI / 6)); break;
      }
    }
    if (shape.fillColor) ctx.fill(); ctx.stroke(); ctx.restore();
  }, []);

  const drawText = useCallback((ctx: CanvasRenderingContext2D, textElement: TextElement) => {
    ctx.save(); ctx.fillStyle = textElement.color;
    ctx.font = `${textElement.fontSize}px ${textElement.fontFamily}`;
    ctx.globalAlpha = 1; ctx.textBaseline = 'top';
    const lines = textElement.text.split('\n');
    lines.forEach((line, i) => ctx.fillText(line, textElement.x, textElement.y + i * textElement.fontSize * 1.2));
    if (editingTextId === textElement.id) {
      const last = lines[lines.length - 1] || '';
      const m = ctx.measureText(last);
      const cx = textElement.x + m.width;
      const cy = textElement.y + (lines.length - 1) * textElement.fontSize * 1.2;
      if (Math.floor(Date.now() / 500) % 2) {
        ctx.strokeStyle = textElement.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + textElement.fontSize); ctx.stroke();
      }
    }
    ctx.restore();
  }, [editingTextId]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    if (showGrid) drawGrid(ctx, viewport);

    elements.forEach((el) => {
      if (isStroke(el)) drawStroke(ctx, el);
      else if (isShape(el)) drawShape(ctx, el);
      else if (isTextElement(el)) drawText(ctx, el);
    });

    // Draw remote live strokes (other users currently drawing)
    Object.values(remoteStrokes).forEach(({ points, color, width, strokeType }) => {
      if (points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
      points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke(); ctx.restore();
    });

    // Current user's in-progress stroke
    if (isDrawing && currentStroke.current.length > 0 && currentTool === 'draw') {
      const temp: Stroke = {
        id: 'temp', type: currentStrokeType,
        points: currentStroke.current,
        color: currentStrokeType === 'eraser' ? '#ffffff' : currentColor,
        width: strokeWidth, opacity: 1, timestamp: Date.now(),
      };
      drawStroke(ctx, temp);
    }

    if (isDrawing && shapeStart.current && currentTool === 'shape') {
      const last = currentStroke.current[currentStroke.current.length - 1];
      const cur = screenToCanvas(last?.x || 0, last?.y || 0, viewport);
      const temp: Shape = {
        id: 'temp', type: currentShape,
        x: Math.min(shapeStart.current.x, cur.x),
        y: Math.min(shapeStart.current.y, cur.y),
        width: Math.abs(cur.x - shapeStart.current.x),
        height: Math.abs(cur.y - shapeStart.current.y),
        color: currentColor, strokeWidth, opacity, rotation: 0, timestamp: Date.now(),
      };
      drawShape(ctx, temp);
    }

    if (selectedIds.size > 0) {
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2 / viewport.zoom;
      ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
      elements.forEach((el) => {
        if (selectedIds.has(el.id) && 'bounds' in el && (el as any).bounds) {
          const { minX, minY, maxX, maxY } = (el as any).bounds;
          const p = 5;
          ctx.strokeRect(minX - p, minY - p, maxX - minX + p * 2, maxY - minY + p * 2);
        }
      });
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [
    elements, viewport, showGrid, isDrawing, currentStroke, currentStrokeType,
    currentColor, strokeWidth, opacity, selectedIds, currentTool, currentShape,
    shapeStart, remoteStrokes, drawGrid, drawStroke, drawShape, drawText,
  ]);

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      redrawCanvas();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redrawCanvas]);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  useEffect(() => {
    if (editingTextId) {
      const iv = setInterval(() => redrawCanvas(), 500);
      return () => clearInterval(iv);
    }
  }, [editingTextId, redrawCanvas]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const cp = screenToCanvas(sx, sy, viewport);

    if (isEditingText && currentTool !== 'text') {
      setIsEditingText(false); setEditingTextId(null);
      setElements((prev) => prev.filter((el) => !(isTextElement(el) && el.text === '')));
    }
    if (currentTool === 'pan' || e.button === 1 || (e.shiftKey && currentTool === 'draw')) {
      setIsPanning(true); panStart.current = { x: e.clientX, y: e.clientY }; return;
    }
    if (currentTool === 'text') {
      let clicked: TextElement | null = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (isTextElement(el)) {
          const tw = el.text.split('\n').reduce((m, l) => Math.max(m, l.length * el.fontSize * 0.6), 0);
          const th = el.text.split('\n').length * el.fontSize * 1.2;
          if (cp.x >= el.x && cp.x <= el.x + tw && cp.y >= el.y && cp.y <= el.y + th) { clicked = el; break; }
        }
      }
      if (clicked) {
        setFontSize(clicked.fontSize);
        setEditingTextId(clicked.id); setIsEditingText(true);
      } else {
        if (editingTextId) setElements((prev) => prev.filter((el) => !(isTextElement(el) && el.text === '')));
        const newId = generateId();
        const newText: TextElement = { id: newId, x: cp.x, y: cp.y, text: '', fontSize, fontFamily: 'Arial, sans-serif', color: currentColor, timestamp: Date.now() };
        setElements((prev) => [...prev, newText]);
        setEditingTextId(newId); setIsEditingText(true);
      }
      return;
    }
    if (currentTool === 'select') {
      let found = false;
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (isStroke(el) && isPointNearStroke(cp, el, 10)) { toggleSelect(el.id); found = true; break; }
      }
      if (!found) clearSelection();
      return;
    }
    if (currentTool === 'shape') { setIsDrawing(true); shapeStart.current = cp; currentStroke.current = [{ x: sx, y: sy }]; return; }
    if (currentTool === 'draw') { setIsDrawing(true); currentStroke.current = [cp]; }
  }, [currentTool, viewport, elements, toggleSelect, clearSelection, currentShape, fontSize, currentColor, isEditingText, editingTextId]);

  const handleMouseMove = useCallback(
    throttle((e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current; if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

      // Emit cursor for collaboration
      if (canvasId) emitCursorMove(canvasId, sx, sy);

      if (isPanning && panStart.current) {
        pan(e.clientX - panStart.current.x, e.clientY - panStart.current.y);
        panStart.current = { x: e.clientX, y: e.clientY }; return;
      }
      if (!isDrawing) return;
      const cp = screenToCanvas(sx, sy, viewport);
      if (currentTool === 'shape') {
        currentStroke.current = [currentStroke.current[0], { x: sx, y: sy }];
        redrawCanvas(); return;
      }
      if (currentTool === 'draw') {
        currentStroke.current.push(cp);
        // Emit live stroke preview
        if (canvasId) emitStrokeDrawing(canvasId, currentStroke.current, currentColor, strokeWidth, currentStrokeType);
        redrawCanvas();
      }
    }, 16),
    [isDrawing, isPanning, currentTool, viewport, pan, redrawCanvas, canvasId, emitCursorMove, emitStrokeDrawing, currentColor, strokeWidth, currentStrokeType]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) { setIsPanning(false); panStart.current = null; return; }
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentTool === 'shape' && shapeStart.current && currentStroke.current.length >= 2) {
      const end = screenToCanvas(currentStroke.current[1].x, currentStroke.current[1].y, viewport);
      const newShape: Shape = {
        id: generateId(), type: currentShape,
        x: Math.min(shapeStart.current.x, end.x), y: Math.min(shapeStart.current.y, end.y),
        width: Math.abs(end.x - shapeStart.current.x), height: Math.abs(end.y - shapeStart.current.y),
        color: currentColor, strokeWidth, opacity, rotation: 0, timestamp: Date.now(),
      };
      setElements((prev) => [...prev, newShape]);
      addToHistory({ type: 'add', elements: [newShape], timestamp: Date.now() });
      // Emit to collaborators
      if (canvasId) emitElementAdd(canvasId, serializeElement(newShape) as any);
      shapeStart.current = null; currentStroke.current = []; return;
    }

    if (currentTool === 'draw' && currentStroke.current.length > 1) {
      const simplified = simplifyStroke(currentStroke.current, 2);
      const newStroke: Stroke = {
        id: generateId(), type: currentStrokeType,
        points: simplified,
        color: currentStrokeType === 'eraser' ? '#ffffff' : currentColor,
        width: strokeWidth, opacity: 1, timestamp: Date.now(),
        bounds: calculateBounds(simplified),
      };
      setElements((prev) => [...prev, newStroke]);
      addToHistory({ type: 'add', elements: [newStroke], timestamp: Date.now() });
      // Emit to collaborators
      if (canvasId) emitElementAdd(canvasId, serializeElement(newStroke) as any);
    }
    currentStroke.current = [];
  }, [isDrawing, isPanning, currentTool, currentStrokeType, currentColor, strokeWidth, opacity, viewport, addToHistory, currentShape, canvasId, emitElementAdd]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    zoom(e.deltaY > 0 ? -0.1 : 0.1, e.clientX - rect.left, e.clientY - rect.top);
  }, [zoom]);

  useKeyboardShortcuts({
    onUndo: () => { const a = undo(); if (a?.type === 'add') setElements((p) => p.slice(0, -a.elements.length)); },
    onRedo: () => { const a = redo(); if (a?.type === 'add') setElements((p) => [...p, ...a.elements]); },
    onDelete: () => {
      if (selectedIds.size > 0) {
        selectedIds.forEach((id) => { if (canvasId) emitElementDelete(canvasId, id); });
        setElements((p) => p.filter((e) => !selectedIds.has(e.id)));
        clearSelection();
      }
    },
    onZoomIn: () => zoom(0.1, window.innerWidth / 2, window.innerHeight / 2),
    onZoomOut: () => zoom(-0.1, window.innerWidth / 2, window.innerHeight / 2),
    onResetZoom: resetViewport,
    onSave: triggerSave,
    onToggleGrid: () => setShowGrid((p) => !p),
    onSwitchToPen: () => { setCurrentTool('draw'); setCurrentStrokeType('pen'); },
    onSwitchToEraser: () => { setCurrentTool('draw'); setCurrentStrokeType('eraser'); },
    onSwitchToSelect: () => setCurrentTool('select'),
    onSwitchToPan: () => setCurrentTool('pan'),
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditingText || !editingTextId) return;
      if (e.key === 'Escape') {
        e.preventDefault(); setIsEditingText(false); setEditingTextId(null);
        setElements((p) => p.filter((el) => !(isTextElement(el) && el.text === ''))); return;
      }
      if (e.key.length === 1 || ['Backspace', 'Enter', 'Delete'].includes(e.key)) {
        e.preventDefault();
        setElements((prev) => prev.map((el) => {
          if (el.id === editingTextId && isTextElement(el)) {
            let t = el.text;
            if (e.key === 'Backspace') t = t.slice(0, -1);
            else if (e.key === 'Enter') t += '\n';
            else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) t += e.key;
            const updated = { ...el, text: t };
            // Emit text update to collaborators
            if (canvasId) emitElementModify(canvasId, serializeElement(updated) as any);
            return updated;
          }
          return el;
        }));
      }
    };
    if (isEditingText) { window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }
  }, [isEditingText, editingTextId, canvasId, emitElementModify]);

  const handleClearAll = () => {
    if (window.confirm('Clear the entire canvas?')) {
      setElements([]); clearSelection();
      if (canvasId) emitCanvasClear(canvasId);
    }
  };

  const handleShare = async () => {
    if (!canvasId || !firebaseToken) { setShowShareDialog(true); return; }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/${canvasId}/share`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${firebaseToken}` },
      });
      const data = await res.json();
      setShareUrl(data.shareUrl || '');
      setShowShareDialog(true);
    } catch { setShowShareDialog(true); }
  };

  const handleExportWrapper = (format: ExportFormat) => {
    const canvas = canvasRef.current; if (!canvas) return;
    handleExport(format, canvas, elements, viewport, getCanvasState());
  };

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden"
      style={{ cursor: currentTool === 'pan' || isPanning ? 'grab' : currentTool === 'draw' ? 'crosshair' : currentTool === 'select' ? 'default' : 'crosshair' }}
    >
      <Toolbar
        currentTool={currentTool} currentStrokeType={currentStrokeType}
        currentShape={currentShape} currentColor={currentColor}
        strokeWidth={strokeWidth} opacity={opacity}
        onToolChange={setCurrentTool} onStrokeTypeChange={setCurrentStrokeType}
        onShapeChange={setCurrentShape} onColorChange={setCurrentColor}
        onStrokeWidthChange={setStrokeWidth} onOpacityChange={setOpacity}
      />

      <TopControls
        canUndo={canUndo} canRedo={canRedo}
        onUndo={() => { const a = undo(); if (a?.type === 'add') setElements((p) => p.slice(0, -a.elements.length)); }}
        onRedo={() => { const a = redo(); if (a?.type === 'add') setElements((p) => [...p, ...a.elements]); }}
        zoom={viewport.zoom}
        onZoomIn={() => zoom(0.1, window.innerWidth / 2, window.innerHeight / 2)}
        onZoomOut={() => zoom(-0.1, window.innerWidth / 2, window.innerHeight / 2)}
        onResetZoom={resetViewport} showGrid={showGrid}
        onToggleGrid={() => setShowGrid((p) => !p)}
        onExport={handleExportWrapper} onShare={handleShare}
        onClearAll={handleClearAll} onSave={triggerSave} lastSaved={lastSaved}
      />

      {/* Collaboration status bar (top-right) */}
      {canvasId && (
        <div className="absolute top-6 right-6 flex flex-col gap-2 z-10">
          <ConnectionStatus isConnected={isConnected} isSyncing={isSyncing} />
          {activeUsers.length > 0 && (
            <ActiveUsers
              count={activeUsers.length}
              users={activeUsers.map((u) => ({ id: u.userId, name: u.userName, color: u.userColor }))}
            />
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full"
      />

      {/* Remote cursors overlay */}
      {Object.entries(remoteCursors).map(([socketId, cursor]) => (
        <RemoteCursor
          key={socketId}
          userId={cursor.userId}
          userName={cursor.userName || 'User'}
          x={cursor.x}
          y={cursor.y}
          color={cursor.userColor || '#3B82F6'}
        />
      ))}

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Share2 size={20} /> Share Canvas
              </h3>
              <button onClick={() => setShowShareDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            {shareUrl ? (
              <div>
                <p className="text-sm text-gray-600 mb-3">Share this link with collaborators:</p>
                <div className="flex gap-2">
                  <input value={shareUrl} readOnly className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono bg-gray-50" />
                  <button
                    onClick={() => navigator.clipboard.writeText(shareUrl)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                  >Copy</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Connect your canvas to enable sharing.</p>
            )}
            <button onClick={() => setShowShareDialog(false)} className="w-full mt-4 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200">Close</button>
          </div>
        </div>
      )}

      {/* Text editing overlay */}
      {isEditingText && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 px-6 py-4 min-w-[500px]">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Type size={20} className="text-blue-500" />
              <button onClick={() => { setIsEditingText(false); setEditingTextId(null); setElements((p) => p.filter((el) => !(isTextElement(el) && el.text === ''))); }} className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">Done</button>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
              <span className="text-xs font-medium text-gray-600 min-w-[70px]">Font Size:</span>
              <input type="range" min="12" max="72" value={fontSize} onChange={(e) => {
                const s = Number(e.target.value); setFontSize(s);
                if (editingTextId) setElements((p) => p.map((el) => el.id === editingTextId && isTextElement(el) ? { ...el, fontSize: s } : el));
              }} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              <span className="text-sm font-mono font-medium text-blue-600 min-w-[45px]">{fontSize}px</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}