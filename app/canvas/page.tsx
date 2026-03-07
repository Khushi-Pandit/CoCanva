/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Toolbar } from './components/toolbar';
import { TopControls } from './components/topControls';
import { ConnectionStatus, ActiveUsers, RemoteCursor } from './components/UIComponents';
import {
  Point, Stroke, Shape, TextElement, DrawableElement,
  ToolMode, StrokeType, ShapeType, Viewport, CanvasState,
  isStroke, isShape, isTextElement,
} from './core/types';
import {
  generateId, calculateBounds, isPointNearStroke, simplifyStroke,
  screenToCanvas, throttle,
} from './core/utils';
import {
  useHistory, useViewport, useKeyboardShortcuts, useAutoSave, useSelection,
} from './core/hooks';
import { useCollaboration } from './core/useCollaboration';
import { handleExport } from './core/export';
import {
  Share2, X, Type, Copy, Check, Link2,
  Eye, Pencil, Mic, ChevronDown, LogOut,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const normalizeElement = (el: any): DrawableElement => {
  if (el.kind === 'stroke' || el.points) {
    return {
      id: el.elementId || el.id, type: el.strokeType || el.type || 'pen',
      points: el.points || [], color: el.color, width: el.strokeWidth || el.width,
      opacity: el.opacity ?? 1, timestamp: el.timestamp || Date.now(),
      bounds: calculateBounds(el.points || []),
    } as Stroke;
  }
  if (el.kind === 'text' || el.text !== undefined) {
    return {
      id: el.elementId || el.id, x: el.x, y: el.y, text: el.text,
      fontSize: el.fontSize, fontFamily: el.fontFamily || 'Arial, sans-serif',
      color: el.color, timestamp: el.timestamp || Date.now(),
    } as TextElement;
  }
  return {
    id: el.elementId || el.id, type: el.shapeType || el.type,
    x: el.x, y: el.y, width: el.width, height: el.height,
    color: el.color, fillColor: el.fillColor, strokeWidth: el.strokeWidth,
    opacity: el.opacity ?? 1, rotation: el.rotation ?? 0,
    timestamp: el.timestamp || Date.now(),
  } as Shape;
};

const serializeElement = (el: DrawableElement) => {
  if (isStroke(el)) return { elementId: el.id, kind: 'stroke', strokeType: el.type, points: el.points, color: el.color, strokeWidth: el.width, opacity: el.opacity, timestamp: el.timestamp };
  if (isTextElement(el)) return { elementId: el.id, kind: 'text', x: el.x, y: el.y, text: el.text, fontSize: el.fontSize, fontFamily: el.fontFamily, color: el.color, timestamp: el.timestamp };
  const s = el as Shape;
  return { elementId: s.id, kind: 'shape', shapeType: s.type, x: s.x, y: s.y, width: s.width, height: s.height, color: s.color, fillColor: s.fillColor, strokeWidth: s.strokeWidth, opacity: s.opacity, rotation: s.rotation, timestamp: s.timestamp };
};

// ── Types ─────────────────────────────────────────────────────────────────────
type UserRole = 'owner' | 'editor' | 'viewer' | 'voice';
interface ShareLinks { viewer?: string; editor?: string; voice?: string; }

// Get initials from name (max 2 chars)
const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

// Role config
const ROLE_COLOR: Record<UserRole, string> = {
  owner:  '#10b981',
  editor: '#3b82f6',
  viewer: '#f59e0b',
  voice:  '#8b5cf6',
};
const ROLE_LABEL: Record<UserRole, string> = {
  owner:  'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
  voice:  'Voice',
};

// ── User Avatar (top-right) ───────────────────────────────────────────────────
const UserAvatar: React.FC<{ userName: string; role: UserRole; onSignOut?: () => void }> = ({
  userName, role, onSignOut,
}) => {
  const [open, setOpen] = useState(false);
  const initials = getInitials(userName);
  const color    = ROLE_COLOR[role];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-xl
                   bg-white/95 backdrop-blur-md border border-slate-200/80
                   shadow-md hover:border-emerald-200 transition-all"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center
                     text-white text-[11px] font-bold flex-shrink-0"
          style={{ background: color }}
        >
          {initials}
        </div>
        <div className="flex flex-col items-start leading-none gap-0.5">
          <span className="text-[11px] font-semibold text-slate-700 max-w-[90px] truncate">{userName}</span>
          <span className="text-[9px] font-semibold" style={{ color }}>{ROLE_LABEL[role]}</span>
        </div>
        <ChevronDown size={11} className="text-slate-400 ml-0.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 w-44 z-50">
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: color }}
                >
                  {initials}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 truncate max-w-[90px]">{userName}</p>
                  <p className="text-[10px] font-medium mt-0.5" style={{ color }}>{ROLE_LABEL[role]}</p>
                </div>
              </div>
            </div>
            {onSignOut && (
              <button
                onClick={() => { setOpen(false); onSignOut(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={13} />
                <span className="font-medium">Sign out</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ── Share Modal ───────────────────────────────────────────────────────────────
const ShareModal: React.FC<{
  canvasId: string;
  firebaseToken: string;
  onClose: () => void;
}> = ({ canvasId, firebaseToken, onClose }) => {
  const [links,   setLinks]   = useState<ShareLinks>({});
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState<string | null>(null);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const generate = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/${canvasId}/share`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${firebaseToken}` },
            body: JSON.stringify({ roles: ['viewer', 'editor', 'voice'] }),
          }
        );
        const data = await res.json();
        if (!res.ok) { setError(data.message || 'Failed to generate links'); return; }
        setLinks(data.links);
      } catch {
        setError('Network error. Try again.');
      } finally {
        setLoading(false);
      }
    };
    generate();
  }, [canvasId, firebaseToken]);

  const copyLink = (role: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(role);
    setTimeout(() => setCopied(null), 2000);
  };

  const PERMISSIONS = [
    { role: 'viewer', label: 'View only',     icon: <Eye size={14} />,    color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', desc: 'Can see canvas, cannot draw' },
    { role: 'editor', label: 'Can edit',      icon: <Pencil size={14} />, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', desc: 'Can draw, erase, add shapes'  },
    { role: 'voice',  label: 'Voice + edit',  icon: <Mic size={14} />,    color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', desc: 'Edit + voice chat (soon)'     },
  ] as const;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Share2 size={16} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Share Canvas</h3>
              <p className="text-xs text-slate-400 mt-0.5">Recipients must be logged in to access</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-2.5">
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            PERMISSIONS.map(({ role, label, icon, color, bg, border, desc }) => {
              const url = links[role as keyof ShareLinks];
              const ok  = copied === role;
              return (
                <div key={role} className="rounded-xl border p-3" style={{ background: bg, borderColor: border }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-white" style={{ background: color }}>
                        {icon}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{label}</p>
                        <p className="text-[10px] text-slate-400">{desc}</p>
                      </div>
                    </div>
                    {url && (
                      <button
                        onClick={() => copyLink(role, url)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white transition-all"
                        style={{ background: ok ? '#10b981' : color }}
                      >
                        {ok ? <Check size={10} /> : <Copy size={10} />}
                        {ok ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>
                  {url && (
                    <div className="flex items-center gap-1.5 bg-white/80 rounded-lg px-2 py-1.5">
                      <Link2 size={10} className="text-slate-300 flex-shrink-0" />
                      <span className="text-[10px] font-mono text-slate-400 truncate">{url}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────────
export interface InfiniteWhiteboardProps {
  canvasId?: string;
  firebaseToken?: string;
  userName?: string;
  userRole?: 'viewer' | 'editor' | 'voice';
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function InfiniteWhiteboard({
  canvasId, firebaseToken, userName = 'Anonymous', userRole: initialRole = 'editor',
}: InfiniteWhiteboardProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [elements,          setElements]          = useState<DrawableElement[]>([]);
  const [currentTool,       setCurrentTool]       = useState<ToolMode>('draw');
  const [currentStrokeType, setCurrentStrokeType] = useState<StrokeType>('pen');
  const [currentShape,      setCurrentShape]      = useState<ShapeType>('rectangle');
  const [currentColor,      setCurrentColor]      = useState('#111827');
  const [strokeWidth,       setStrokeWidth]       = useState(3);
  const [opacity,           setOpacity]           = useState(1);
  const [showGrid,          setShowGrid]          = useState(false);
  const [isDrawing,         setIsDrawing]         = useState(false);
  const [isPanning,         setIsPanning]         = useState(false);
  const [showShareModal,    setShowShareModal]    = useState(false);
  const [isEditingText,     setIsEditingText]     = useState(false);
  const [fontSize,          setFontSize]          = useState(24);
  const [editingTextId,     setEditingTextId]     = useState<string | null>(null);
  const [remoteStrokes,     setRemoteStrokes]     = useState<Record<string, any>>({});
  const [effectiveRole,     setEffectiveRole]     = useState<UserRole>(initialRole as UserRole);

  const currentStroke = useRef<Point[]>([]);
  const shapeStart    = useRef<Point | null>(null);
  const panStart      = useRef<Point | null>(null);

  const { addToHistory, undo, redo, canUndo, canRedo } = useHistory();

  // ── FIX: Proper zoom with useViewport ─────────────────────────────────────
  // useViewport returns zoom fn that takes (delta, centerX, centerY)
  const { viewport, zoom: zoomFn, pan, reset: resetViewport } = useViewport();

  // Wrapper: zoom IN by fixed step centered on canvas midpoint
  const zoomIn = useCallback(() => {
    const canvas = canvasRef.current;
    const cx = canvas ? canvas.clientWidth / 2 : window.innerWidth / 2;
    const cy = canvas ? canvas.clientHeight / 2 : window.innerHeight / 2;
    zoomFn(0.15, cx, cy);
  }, [zoomFn]);

  // Wrapper: zoom OUT
  const zoomOut = useCallback(() => {
    const canvas = canvasRef.current;
    const cx = canvas ? canvas.clientWidth / 2 : window.innerWidth / 2;
    const cy = canvas ? canvas.clientHeight / 2 : window.innerHeight / 2;
    zoomFn(-0.15, cx, cy);
  }, [zoomFn]);

  const { selectedIds, toggleSelect, clearSelection } = useSelection();

  const canDraw = effectiveRole === 'owner' || effectiveRole === 'editor' || effectiveRole === 'voice';

  // ── Collaboration ───────────────────────────────────────────────────────────
  const collabOptions = canvasId && firebaseToken ? {
    canvasId, firebaseToken, userName,
    onElementAdd:    (el: DrawableElement) => setElements(p => p.find(e => e.id === el.id) ? p : [...p, normalizeElement(el as any)]),
    onElementDelete: (id: string)          => setElements(p => p.filter(e => e.id !== id)),
    onElementModify: (el: DrawableElement) => setElements(p => p.map(e => e.id === el.id ? normalizeElement(el as any) : e)),
    onCanvasClear:   ()                    => setElements([]),
    onCanvasState:   (raw: any[])          => setElements(raw.map(normalizeElement)),
  } : null;

  const {
    isConnected, isSyncing, activeUsers, remoteCursors,
    emitElementAdd, emitElementDelete, emitElementModify,
    emitCanvasClear, emitCursorMove, emitStrokeDrawing,
  } = useCollaboration(collabOptions);

  useEffect(() => { setEffectiveRole(initialRole as UserRole); }, [initialRole]);

  const getCanvasState = useCallback((): CanvasState => ({
    version: '1.0.0', elements, viewport, createdAt: Date.now(), updatedAt: Date.now(),
  }), [elements, viewport]);

  const { lastSaved, save: triggerSave } = useAutoSave(getCanvasState);

  // ── Rendering ───────────────────────────────────────────────────────────────
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, vp: Viewport) => {
    const base = 50; const z = vp.zoom;
    let major = base, minor = base / 5;
    if (z < 0.5) { major = base * 4; minor = base; }
    else if (z > 2) { major = base; minor = base / 10; }
    const sx = Math.floor((-vp.x / vp.zoom) / major) * major;
    const sy = Math.floor((-vp.y / vp.zoom) / major) * major;
    const ex = sx + (ctx.canvas.width / vp.zoom) + major * 2;
    const ey = sy + (ctx.canvas.height / vp.zoom) + major * 2;
    ctx.save();
    if (z >= 0.5) {
      ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = 0.5 / vp.zoom; ctx.beginPath();
      for (let x = sx; x <= ex; x += minor) { if (x % major !== 0) { ctx.moveTo(x, sy); ctx.lineTo(x, ey); } }
      for (let y = sy; y <= ey; y += minor) { if (y % major !== 0) { ctx.moveTo(sx, y); ctx.lineTo(ex, y); } }
      ctx.stroke();
    }
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.75 / vp.zoom; ctx.beginPath();
    for (let x = sx; x <= ex; x += major) { ctx.moveTo(x, sy); ctx.lineTo(x, ey); }
    for (let y = sy; y <= ey; y += major) { ctx.moveTo(sx, y); ctx.lineTo(ex, y); }
    ctx.stroke(); ctx.restore();
  }, []);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (!stroke.points.length) return;
    ctx.save();
    if (stroke.type === 'eraser') { ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = stroke.width; ctx.globalAlpha = 1; }
    else {
      ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.width; ctx.globalAlpha = stroke.opacity;
      if (stroke.type === 'pencil') { ctx.globalAlpha *= 0.65; ctx.lineWidth *= 0.75; }
      else if (stroke.type === 'marker') { ctx.globalAlpha *= 0.55; ctx.lineWidth *= 1.6; }
      else if (stroke.type === 'brush') { ctx.lineWidth *= 1.3; }
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    stroke.points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke(); ctx.restore();
  }, []);

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: Shape) => {
    ctx.save();
    ctx.strokeStyle = shape.color; ctx.lineWidth = shape.strokeWidth; ctx.globalAlpha = shape.opacity;
    if (shape.fillColor) ctx.fillStyle = shape.fillColor;
    ctx.beginPath();
    switch (shape.type) {
      case 'rectangle': ctx.rect(shape.x, shape.y, shape.width, shape.height); break;
      case 'circle': { const r = Math.min(Math.abs(shape.width), Math.abs(shape.height)) / 2; ctx.arc(shape.x + shape.width / 2, shape.y + shape.height / 2, r, 0, Math.PI * 2); break; }
      case 'triangle': ctx.moveTo(shape.x + shape.width / 2, shape.y); ctx.lineTo(shape.x + shape.width, shape.y + shape.height); ctx.lineTo(shape.x, shape.y + shape.height); ctx.closePath(); break;
      case 'diamond': ctx.moveTo(shape.x + shape.width / 2, shape.y); ctx.lineTo(shape.x + shape.width, shape.y + shape.height / 2); ctx.lineTo(shape.x + shape.width / 2, shape.y + shape.height); ctx.lineTo(shape.x, shape.y + shape.height / 2); ctx.closePath(); break;
      case 'line': ctx.moveTo(shape.x, shape.y); ctx.lineTo(shape.x + shape.width, shape.y + shape.height); break;
      case 'arrow': { const hl = 15; const a = Math.atan2(shape.height, shape.width); ctx.moveTo(shape.x, shape.y); ctx.lineTo(shape.x + shape.width, shape.y + shape.height); ctx.lineTo(shape.x + shape.width - hl * Math.cos(a - Math.PI / 6), shape.y + shape.height - hl * Math.sin(a - Math.PI / 6)); ctx.moveTo(shape.x + shape.width, shape.y + shape.height); ctx.lineTo(shape.x + shape.width - hl * Math.cos(a + Math.PI / 6), shape.y + shape.height - hl * Math.sin(a + Math.PI / 6)); break; }
    }
    if (shape.fillColor) ctx.fill(); ctx.stroke(); ctx.restore();
  }, []);

  const drawText = useCallback((ctx: CanvasRenderingContext2D, el: TextElement) => {
    ctx.save(); ctx.fillStyle = el.color;
    ctx.font = `${el.fontSize}px ${el.fontFamily}`; ctx.globalAlpha = 1; ctx.textBaseline = 'top';
    el.text.split('\n').forEach((line, i) => ctx.fillText(line, el.x, el.y + i * el.fontSize * 1.2));
    if (editingTextId === el.id) {
      const lines = el.text.split('\n'); const last = lines[lines.length - 1] || '';
      const m = ctx.measureText(last); const cx = el.x + m.width;
      const cy = el.y + (lines.length - 1) * el.fontSize * 1.2;
      if (Math.floor(Date.now() / 500) % 2) {
        ctx.strokeStyle = el.color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + el.fontSize); ctx.stroke();
      }
    }
    ctx.restore();
  }, [editingTextId]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(viewport.x, viewport.y); ctx.scale(viewport.zoom, viewport.zoom);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-viewport.x / viewport.zoom, -viewport.y / viewport.zoom, canvas.width / viewport.zoom, canvas.height / viewport.zoom);
    if (showGrid) drawGrid(ctx, viewport);
    elements.forEach(el => {
      if (isStroke(el)) drawStroke(ctx, el);
      else if (isShape(el)) drawShape(ctx, el);
      else if (isTextElement(el)) drawText(ctx, el);
    });
    Object.values(remoteStrokes).forEach(({ points, color, width }: any) => {
      if (points.length < 2) return;
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.65;
      ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
      points.forEach((p: Point) => ctx.lineTo(p.x, p.y)); ctx.stroke(); ctx.restore();
    });
    if (isDrawing && currentStroke.current.length > 0 && currentTool === 'draw') {
      drawStroke(ctx, { id: 'temp', type: currentStrokeType, points: currentStroke.current, color: currentStrokeType === 'eraser' ? '#f8fafc' : currentColor, width: strokeWidth, opacity: 1, timestamp: Date.now() });
    }
    if (isDrawing && shapeStart.current && currentTool === 'shape') {
      const last = currentStroke.current[currentStroke.current.length - 1];
      const cur  = screenToCanvas(last?.x || 0, last?.y || 0, viewport);
      drawShape(ctx, { id: 'temp', type: currentShape, x: Math.min(shapeStart.current.x, cur.x), y: Math.min(shapeStart.current.y, cur.y), width: Math.abs(cur.x - shapeStart.current.x), height: Math.abs(cur.y - shapeStart.current.y), color: currentColor, strokeWidth, opacity, rotation: 0, timestamp: Date.now() });
    }
    if (selectedIds.size > 0) {
      ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1.5 / viewport.zoom;
      ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);
      elements.forEach(el => {
        if (selectedIds.has(el.id) && 'bounds' in el && (el as any).bounds) {
          const { minX, minY, maxX, maxY } = (el as any).bounds;
          ctx.strokeRect(minX - 6, minY - 6, maxX - minX + 12, maxY - minY + 12);
        }
      });
      ctx.setLineDash([]);
    }
    ctx.restore();
  }, [elements, viewport, showGrid, isDrawing, currentStrokeType, currentColor, strokeWidth, opacity, selectedIds, currentTool, currentShape, remoteStrokes, drawGrid, drawStroke, drawShape, drawText]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current; const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = container.clientWidth  * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width  = `${container.clientWidth}px`;
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
  useEffect(() => { if (!editingTextId) return; const iv = setInterval(redrawCanvas, 500); return () => clearInterval(iv); }, [editingTextId, redrawCanvas]);

  // ── Mouse handlers ──────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canDraw && currentTool !== 'pan' && currentTool !== 'select') return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const cp = screenToCanvas(sx, sy, viewport);
    if (isEditingText && currentTool !== 'text') { setIsEditingText(false); setEditingTextId(null); setElements(p => p.filter(el => !(isTextElement(el) && el.text === ''))); }
    if (currentTool === 'pan' || e.button === 1 || (e.shiftKey && currentTool === 'draw')) { setIsPanning(true); panStart.current = { x: e.clientX, y: e.clientY }; return; }
    if (currentTool === 'text' && canDraw) {
      let clicked: TextElement | null = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (isTextElement(el)) {
          const tw = el.text.split('\n').reduce((m: number, l: string) => Math.max(m, l.length * el.fontSize * 0.6), 0);
          const th = el.text.split('\n').length * el.fontSize * 1.2;
          if (cp.x >= el.x && cp.x <= el.x + tw && cp.y >= el.y && cp.y <= el.y + th) { clicked = el; break; }
        }
      }
      if (clicked) { setFontSize(clicked.fontSize); setEditingTextId(clicked.id); setIsEditingText(true); }
      else {
        if (editingTextId) setElements(p => p.filter(el => !(isTextElement(el) && el.text === '')));
        const id = generateId();
        setElements(p => [...p, { id, x: cp.x, y: cp.y, text: '', fontSize, fontFamily: 'Georgia, serif', color: currentColor, timestamp: Date.now() } as TextElement]);
        setEditingTextId(id); setIsEditingText(true);
      }
      return;
    }
    if (currentTool === 'select') {
      let found = false;
      for (let i = elements.length - 1; i >= 0; i--) { const el = elements[i]; if (isStroke(el) && isPointNearStroke(cp, el, 10)) { toggleSelect(el.id); found = true; break; } }
      if (!found) clearSelection();
      return;
    }
    if (currentTool === 'shape' && canDraw) { setIsDrawing(true); shapeStart.current = cp; currentStroke.current = [{ x: sx, y: sy }]; return; }
    if (currentTool === 'draw' && canDraw)  { setIsDrawing(true); currentStroke.current = [cp]; }
  }, [currentTool, viewport, elements, toggleSelect, clearSelection, fontSize, currentColor, isEditingText, editingTextId, canDraw]);

  const handleMouseMove = useCallback(
    throttle((e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current; if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      if (canvasId) emitCursorMove(canvasId, sx, sy);
      if (isPanning && panStart.current) { pan(e.clientX - panStart.current.x, e.clientY - panStart.current.y); panStart.current = { x: e.clientX, y: e.clientY }; return; }
      if (!isDrawing) return;
      const cp = screenToCanvas(sx, sy, viewport);
      if (currentTool === 'shape') { currentStroke.current = [currentStroke.current[0], { x: sx, y: sy }]; redrawCanvas(); return; }
      if (currentTool === 'draw')  { currentStroke.current.push(cp); if (canvasId) emitStrokeDrawing(canvasId, currentStroke.current, currentColor, strokeWidth, currentStrokeType); redrawCanvas(); }
    }, 16),
    [isDrawing, isPanning, currentTool, viewport, pan, redrawCanvas, canvasId, emitCursorMove, emitStrokeDrawing, currentColor, strokeWidth, currentStrokeType]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) { setIsPanning(false); panStart.current = null; return; }
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentTool === 'shape' && shapeStart.current && currentStroke.current.length >= 2) {
      const end = screenToCanvas(currentStroke.current[1].x, currentStroke.current[1].y, viewport);
      const s: Shape = { id: generateId(), type: currentShape, x: Math.min(shapeStart.current.x, end.x), y: Math.min(shapeStart.current.y, end.y), width: Math.abs(end.x - shapeStart.current.x), height: Math.abs(end.y - shapeStart.current.y), color: currentColor, strokeWidth, opacity, rotation: 0, timestamp: Date.now() };
      setElements(p => [...p, s]); addToHistory({ type: 'add', elements: [s], timestamp: Date.now() });
      if (canvasId) emitElementAdd(canvasId, serializeElement(s) as any);
      shapeStart.current = null; currentStroke.current = []; return;
    }
    if (currentTool === 'draw' && currentStroke.current.length > 1) {
      const pts = simplifyStroke(currentStroke.current, 2);
      const s: Stroke = { id: generateId(), type: currentStrokeType, points: pts, color: currentStrokeType === 'eraser' ? '#f8fafc' : currentColor, width: strokeWidth, opacity: 1, timestamp: Date.now(), bounds: calculateBounds(pts) };
      setElements(p => [...p, s]); addToHistory({ type: 'add', elements: [s], timestamp: Date.now() });
      if (canvasId) emitElementAdd(canvasId, serializeElement(s) as any);
    }
    currentStroke.current = [];
  }, [isDrawing, isPanning, currentTool, currentStrokeType, currentColor, strokeWidth, opacity, viewport, addToHistory, currentShape, canvasId, emitElementAdd]);

  // ── FIX: Wheel zoom — properly centered on cursor ──────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    // Smaller increments for smoother zoom
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    zoomFn(delta, cx, cy);
  }, [zoomFn]);

  useKeyboardShortcuts({
    onUndo:           () => { const a = undo(); if (a?.type === 'add') setElements(p => p.slice(0, -a.elements.length)); },
    onRedo:           () => { const a = redo(); if (a?.type === 'add') setElements(p => [...p, ...a.elements]); },
    onDelete:         () => { if (selectedIds.size > 0) { selectedIds.forEach(id => { if (canvasId) emitElementDelete(canvasId, id); }); setElements(p => p.filter(e => !selectedIds.has(e.id))); clearSelection(); } },
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onResetZoom:      resetViewport,
    onSave:           triggerSave,
    onToggleGrid:     () => setShowGrid(p => !p),
    onSwitchToPen:    () => { if (canDraw) { setCurrentTool('draw'); setCurrentStrokeType('pen'); } },
    onSwitchToEraser: () => { if (canDraw) { setCurrentTool('draw'); setCurrentStrokeType('eraser'); } },
    onSwitchToSelect: () => setCurrentTool('select'),
    onSwitchToPan:    () => setCurrentTool('pan'),
  });

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (!isEditingText || !editingTextId) return;
      if (e.key === 'Escape') { e.preventDefault(); setIsEditingText(false); setEditingTextId(null); setElements(p => p.filter(el => !(isTextElement(el) && el.text === ''))); return; }
      if (e.key.length === 1 || ['Backspace', 'Enter', 'Delete'].includes(e.key)) {
        e.preventDefault();
        setElements(prev => prev.map(el => {
          if (el.id !== editingTextId || !isTextElement(el)) return el;
          let t = el.text;
          if (e.key === 'Backspace') t = t.slice(0, -1);
          else if (e.key === 'Enter') t += '\n';
          else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) t += e.key;
          const updated = { ...el, text: t };
          if (canvasId) emitElementModify(canvasId, serializeElement(updated) as any);
          return updated;
        }));
      }
    };
    if (isEditingText) { window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }
  }, [isEditingText, editingTextId, canvasId, emitElementModify]);

  const handleClearAll = () => {
    if (!canDraw) return;
    if (window.confirm('Clear the entire canvas?')) { setElements([]); clearSelection(); if (canvasId) emitCanvasClear(canvasId); }
  };

  const isOwner = effectiveRole === 'owner';

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden"
      style={{
        background: '#f8fafc',
        cursor: isPanning ? 'grabbing' : currentTool === 'pan' ? 'grab' : currentTool === 'draw' ? 'crosshair' : 'default',
      }}
    >
      {/* Viewer banner */}
      {effectiveRole === 'viewer' && (
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center gap-1.5 py-1 bg-amber-50 border-b border-amber-200">
          <Eye size={12} className="text-amber-500" />
          <span className="text-xs font-medium text-amber-700">View only — you cannot edit this canvas</span>
        </div>
      )}

      {/* Toolbar */}
      {canDraw && (
        <Toolbar
          currentTool={currentTool} currentStrokeType={currentStrokeType}
          currentShape={currentShape} currentColor={currentColor}
          strokeWidth={strokeWidth} opacity={opacity}
          onToolChange={setCurrentTool} onStrokeTypeChange={setCurrentStrokeType}
          onShapeChange={setCurrentShape} onColorChange={setCurrentColor}
          onStrokeWidthChange={setStrokeWidth} onOpacityChange={setOpacity}
        />
      )}

      <TopControls
        canUndo={canUndo} canRedo={canRedo}
        onUndo={() => { const a = undo(); if (a?.type === 'add') setElements(p => p.slice(0, -a.elements.length)); }}
        onRedo={() => { const a = redo(); if (a?.type === 'add') setElements(p => [...p, ...a.elements]); }}
        zoom={viewport.zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetViewport}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(p => !p)}
        onExport={f => { const c = canvasRef.current; if (c) handleExport(f, c, elements, viewport, getCanvasState()); }}
        onShare={isOwner ? () => setShowShareModal(true) : undefined}
        onClearAll={handleClearAll}
        onSave={triggerSave}
        lastSaved={lastSaved}
      />

      {/* ── Top-right: status + avatar ────────────────────────────────────── */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
        {canvasId && (
          <>
            <ConnectionStatus isConnected={isConnected} isSyncing={isSyncing} />
            {activeUsers.length > 0 && (
              <ActiveUsers
                count={activeUsers.length}
                users={activeUsers.map(u => ({ id: u.userId, name: u.userName, color: u.userColor }))}
              />
            )}
          </>
        )}
        <UserAvatar userName={userName} role={effectiveRole} />
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full"
        style={{ marginTop: effectiveRole === 'viewer' ? '28px' : 0 }}
      />

      {/* Remote cursors */}
      {Object.entries(remoteCursors).map(([sid, cursor]) => (
        <RemoteCursor
          key={sid} userId={cursor.userId}
          userName={cursor.userName || 'User'}
          x={cursor.x} y={cursor.y}
          color={cursor.userColor || '#10b981'}
        />
      ))}

      {/* Share modal — only owners can open it */}
      {showShareModal && canvasId && firebaseToken && (
        <ShareModal
          canvasId={canvasId}
          firebaseToken={firebaseToken}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Text editing bar */}
      {isEditingText && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Type size={14} strokeWidth={1.8} />
            <span className="text-xs font-medium">Text</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Size</span>
            <div className="flex items-center gap-1">
              {[14, 18, 24, 32, 48].map(s => (
                <button key={s}
                  onClick={() => { setFontSize(s); if (editingTextId) setElements(p => p.map(el => el.id === editingTextId && isTextElement(el) ? { ...el, fontSize: s } : el)); }}
                  className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-all ${fontSize === s ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <input type="range" min="10" max="96" value={fontSize}
              onChange={e => { const s = Number(e.target.value); setFontSize(s); if (editingTextId) setElements(p => p.map(el => el.id === editingTextId && isTextElement(el) ? { ...el, fontSize: s } : el)); }}
              className="w-20 h-1 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, #10b981 ${((fontSize - 10) / 86) * 100}%, #e2e8f0 ${((fontSize - 10) / 86) * 100}%)`, accentColor: '#10b981' }}
            />
            <span className="text-xs font-mono text-emerald-600 font-semibold w-7">{fontSize}</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <button
            onClick={() => { setIsEditingText(false); setEditingTextId(null); setElements(p => p.filter(el => !(isTextElement(el) && el.text === ''))); }}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}