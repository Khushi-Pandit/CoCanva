"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: app/canvas/page.tsx

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { Toolbar } from "./components/toolbar";
import { TopControls } from "./components/topControls";
import {
  FlowchartShape,
  FlowchartConnector,
  GhostOverlay,
  detectShapeFromStroke,
  detectShapeFromText,
  acceptGhost,
} from "./components/FlowchartTools";
import { useCollaboration, RemoteStroke, CollaborationOptions } from "./core/useCollaboration";
import {
  useHistory,
  useViewport,
  useAutoSave,
  useKeyboardShortcuts,
} from "./core/hooks";
import { exportCanvas } from "./core/export";
import {
  screenToCanvas,
  generateId,
  calculateBounds,
  isNear,
} from "./core/utils";
import {
  DrawableElement,
  Stroke,
  Shape,
  FlowchartElement,
  TextElement,
  ToolMode,
  StrokeType,
  ShapeType,
  FlowchartShapeType,
  GhostSuggestion,
  ExportFormat,
  Point,
  isStroke,
  isFlowchart,
  isTextElement,
  FLOWCHART_DEFAULTS,
} from "./core/types";

// ─────────────────────────────────────────────────────────────────────────────
// DB helpers
// ─────────────────────────────────────────────────────────────────────────────
function toDB(el: DrawableElement): any {
  if (isStroke(el))
    return {
      elementId: el.id,
      kind: "stroke",
      strokeType: el.type,
      points: el.points,
      color: el.color,
      strokeWidth: el.width,
      opacity: el.opacity,
      timestamp: el.timestamp,
      createdBy: (el as any).createdBy,
    };
  if (isFlowchart(el))
    return {
      elementId: el.id,
      kind: "flowchart",
      shapeType: el.shapeType,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      label: el.label,
      color: el.color,
      fillColor: el.fillColor,
      strokeWidth: el.strokeWidth,
      opacity: el.opacity,
      rotation: el.rotation || 0,
      fontSize: el.fontSize || 13,
      fontFamily: el.fontFamily,
      fromId: el.fromId,
      toId: el.toId,
      points: el.points,
      dashed: el.dashed,
      arrowEnd: el.arrowEnd,
      timestamp: el.timestamp,
      createdBy: (el as any).createdBy,
    };
  if (isTextElement(el))
    return {
      elementId: el.id,
      kind: "text",
      x: el.x,
      y: el.y,
      text: el.text,
      fontSize: el.fontSize,
      fontFamily: el.fontFamily,
      color: el.color,
      timestamp: el.timestamp,
      createdBy: (el as any).createdBy,
    };
  return {
    elementId: el.id,
    kind: "shape",
    shapeType: (el as any).type,
    x: (el as any).x,
    y: (el as any).y,
    width: (el as any).width,
    height: (el as any).height,
    color: (el as any).color,
    fillColor: (el as any).fillColor,
    strokeWidth: (el as any).strokeWidth,
    opacity: (el as any).opacity,
    rotation: (el as any).rotation || 0,
    timestamp: el.timestamp,
    createdBy: (el as any).createdBy,
  };
}

function fromDB(raw: any): DrawableElement | null {
  try {
    if (!raw?.elementId) return null;
    const id = raw.elementId;
    if (raw.kind === "stroke")
      return {
        id, elementId: id, kind: "stroke",
        type: raw.strokeType || "pen",
        points: raw.points || [],
        color: raw.color || "#111827",
        width: raw.strokeWidth || 2,
        opacity: raw.opacity ?? 1,
        timestamp: raw.timestamp || Date.now(),
        createdBy: raw.createdBy,
      } as any;
    if (raw.kind === "flowchart")
      return {
        id, elementId: id, kind: "flowchart",
        shapeType: raw.shapeType,
        x: raw.x, y: raw.y,
        width: raw.width, height: raw.height,
        label: raw.label || "",
        color: raw.color || "#2563eb",
        fillColor: raw.fillColor || "#dbeafe",
        strokeWidth: raw.strokeWidth || 2,
        opacity: raw.opacity ?? 1,
        rotation: raw.rotation || 0,
        fontSize: raw.fontSize || 13,
        fontFamily: raw.fontFamily || "Inter, sans-serif",
        timestamp: raw.timestamp || Date.now(),
        fromId: raw.fromId, toId: raw.toId,
        points: raw.points, dashed: raw.dashed, arrowEnd: raw.arrowEnd,
        createdBy: raw.createdBy,
      } as any;
    if (raw.kind === "text")
      return {
        id, elementId: id, kind: "text",
        x: raw.x, y: raw.y,
        text: raw.text || "",
        fontSize: raw.fontSize || 16,
        fontFamily: raw.fontFamily || "Inter, sans-serif",
        color: raw.color || "#111827",
        timestamp: raw.timestamp || Date.now(),
        createdBy: raw.createdBy,
      } as any;
    if (raw.kind === "shape")
      return {
        id, elementId: id, kind: "shape",
        type: raw.shapeType || "rectangle",
        x: raw.x, y: raw.y,
        width: raw.width, height: raw.height,
        color: raw.color || "#2563eb",
        fillColor: raw.fillColor,
        strokeWidth: raw.strokeWidth || 2,
        opacity: raw.opacity ?? 1,
        rotation: raw.rotation || 0,
        timestamp: raw.timestamp || Date.now(),
        createdBy: raw.createdBy,
      } as any;
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Eraser — splits strokes into independent sub-segments, never paints white
// ─────────────────────────────────────────────────────────────────────────────
function erasePoint(
  elements: DrawableElement[],
  pt: Point,
  radius: number,
): { elements: DrawableElement[]; deleted: string[]; added: DrawableElement[] } {
  const deleted: string[] = [];
  const added: DrawableElement[] = [];
  const kept: DrawableElement[] = [];

  for (const el of elements) {
    if (!isStroke(el)) { kept.push(el); continue; }

    if (el.bounds) {
      const { minX, minY, maxX, maxY } = el.bounds;
      if (
        pt.x < minX - radius || pt.x > maxX + radius ||
        pt.y < minY - radius || pt.y > maxY + radius
      ) { kept.push(el); continue; }
    }

    const hit = el.points.some((p) => isNear(p, pt, radius));
    if (!hit) { kept.push(el); continue; }

    deleted.push(el.id);

    let seg: Point[] = [];

    const flush = () => {
      if (seg.length >= 2) {
        const newId = generateId();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of seg) {
          if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
        }
        added.push({
          ...el,
          id: newId, elementId: newId,
          points: [...seg],
          timestamp: Date.now(),
          bounds: { minX, minY, maxX, maxY },
        } as Stroke);
      }
      seg = [];
    };

    for (const sp of el.points) {
      if (!isNear(sp, pt, radius)) { seg.push(sp); } else { flush(); }
    }
    flush();
  }

  return { elements: [...kept, ...added], deleted, added };
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas 2D drawing helpers
// ─────────────────────────────────────────────────────────────────────────────
function renderStroke(
  ctx: CanvasRenderingContext2D,
  s: Stroke,
  vp: { x: number; y: number; zoom: number },
) {
  if (s.points.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (s.type) {
    case "pen":
      ctx.globalAlpha = s.opacity ?? 1;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = (s.width || 2) * vp.zoom;
      break;
    case "pencil":
      ctx.globalAlpha = (s.opacity ?? 1) * 0.55;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = (s.width || 2) * vp.zoom * 0.75;
      break;
    case "marker":
      ctx.globalAlpha = (s.opacity ?? 1) * 0.4;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = (s.width || 2) * vp.zoom * 3;
      ctx.lineCap = "square";
      break;
    case "brush":
      ctx.globalAlpha = (s.opacity ?? 1) * 0.85;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = (s.width || 2) * vp.zoom * 2;
      break;
    default:
      ctx.globalAlpha = s.opacity ?? 1;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = (s.width || 2) * vp.zoom;
  }

  ctx.beginPath();
  const p0 = s.points[0];
  ctx.moveTo(p0.x * vp.zoom + vp.x, p0.y * vp.zoom + vp.y);
  for (let i = 1; i < s.points.length; i++) {
    if (i < s.points.length - 1) {
      const mx = (s.points[i].x + s.points[i + 1].x) / 2;
      const my = (s.points[i].y + s.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(
        s.points[i].x * vp.zoom + vp.x,
        s.points[i].y * vp.zoom + vp.y,
        mx * vp.zoom + vp.x,
        my * vp.zoom + vp.y,
      );
    } else {
      ctx.lineTo(s.points[i].x * vp.zoom + vp.x, s.points[i].y * vp.zoom + vp.y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function renderShape(
  ctx: CanvasRenderingContext2D,
  shape: any,
  vp: { x: number; y: number; zoom: number },
) {
  const sx = shape.x * vp.zoom + vp.x, sy = shape.y * vp.zoom + vp.y;
  const sw = shape.width * vp.zoom, sh = shape.height * vp.zoom;
  ctx.save();
  ctx.globalAlpha = shape.opacity ?? 1;
  ctx.strokeStyle = shape.color || "#2563eb";
  ctx.lineWidth = (shape.strokeWidth || 2) * vp.zoom;
  if (shape.fillColor && shape.fillColor !== "transparent")
    ctx.fillStyle = shape.fillColor;

  ctx.beginPath();
  switch (shape.type) {
    case "rectangle": ctx.rect(sx, sy, sw, sh); break;
    case "circle":    ctx.ellipse(sx + sw / 2, sy + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2); break;
    case "triangle":  ctx.moveTo(sx + sw / 2, sy); ctx.lineTo(sx + sw, sy + sh); ctx.lineTo(sx, sy + sh); ctx.closePath(); break;
    case "diamond":   ctx.moveTo(sx + sw / 2, sy); ctx.lineTo(sx + sw, sy + sh / 2); ctx.lineTo(sx + sw / 2, sy + sh); ctx.lineTo(sx, sy + sh / 2); ctx.closePath(); break;
    case "line":      ctx.moveTo(sx, sy + sh / 2); ctx.lineTo(sx + sw, sy + sh / 2); break;
    case "arrow": {
      const ah = sh * 0.35;
      ctx.moveTo(sx, sy + sh / 2); ctx.lineTo(sx + sw * 0.75, sy + sh / 2);
      ctx.moveTo(sx + sw, sy + sh / 2); ctx.lineTo(sx + sw * 0.7, sy + sh / 2 - ah); ctx.lineTo(sx + sw * 0.7, sy + sh / 2 + ah); ctx.closePath();
      break;
    }
    default: ctx.rect(sx, sy, sw, sh);
  }
  if (shape.fillColor && shape.fillColor !== "transparent") ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function renderGrid(
  ctx: CanvasRenderingContext2D,
  vp: { x: number; y: number; zoom: number },
  w: number,
  h: number,
) {
  const size = 20 * vp.zoom;
  const ox = ((vp.x % size) + size) % size;
  const oy = ((vp.y % size) + size) % size;
  ctx.save();
  ctx.strokeStyle = "rgba(148,163,184,0.2)";
  ctx.lineWidth = 0.5;
  for (let x = ox; x < w; x += size) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = oy; y < h; y += size) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.restore();
}

function renderEraserCursor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(100,100,100,0.6)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(100,100,100,0.5)";
  ctx.setLineDash([]);
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Small UI components
// ─────────────────────────────────────────────────────────────────────────────
const RemoteCursors: React.FC<{
  cursors: Record<string, { userId: string; userName: string; userColor: string; x: number; y: number }>;
  vp: { x: number; y: number; zoom: number };
  myId: string;
}> = ({ cursors, vp, myId }) => (
  <>
    {Object.entries(cursors).map(([sid, c]) => {
      if (c.userId === myId) return null;
      return (
        <div
          key={sid}
          className="absolute pointer-events-none transition-all duration-75"
          style={{ left: c.x * vp.zoom + vp.x, top: c.y * vp.zoom + vp.y, zIndex: 50 }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20">
            <path d="M0,0 L0,14 L4,11 L7,17 L9,16 L6,10 L11,10 Z" fill={c.userColor} stroke="white" strokeWidth="1" />
          </svg>
          <div
            className="absolute top-4 left-1 px-1.5 py-0.5 rounded-full text-white text-[9px] font-semibold whitespace-nowrap"
            style={{ background: c.userColor }}
          >
            {c.userName}
          </div>
        </div>
      );
    })}
  </>
);

const ActiveUsersPill: React.FC<{ users: any[]; myId: string }> = ({ users, myId }) => {
  const others = users.filter((u) => u.userId !== myId);
  if (!others.length) return null;
  return (
    <div className="absolute top-5 right-5 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-full px-2.5 py-1.5 shadow-sm">
      <div className="flex -space-x-1.5">
        {others.slice(0, 5).map((u) => (
          <div
            key={u.socketId || u.userId}
            className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold"
            style={{ background: u.userColor }}
            title={u.userName}
          >
            {(u.userName || "U")[0].toUpperCase()}
          </div>
        ))}
      </div>
      <span className="text-[11px] font-medium text-slate-500">{others.length} online</span>
    </div>
  );
};

const SyncBadge: React.FC<{ syncing: boolean; connected: boolean }> = ({ syncing, connected }) => {
  if (!syncing && connected) return null;
  return (
    <div className={`absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow ${connected ? "bg-amber-50 border border-amber-200 text-amber-700" : "bg-red-50 border border-red-200 text-red-600"}`}>
      <div className={`w-2 h-2 rounded-full ${connected ? "bg-amber-400 animate-pulse" : "bg-red-400"}`} />
      {syncing ? "Syncing…" : "Disconnected"}
    </div>
  );
};

const TextInput: React.FC<{
  pos: { sx: number; sy: number; cx: number; cy: number } | null;
  color: string;
  onSubmit: (text: string, cx: number, cy: number) => void;
  onCancel: () => void;
  aiEnabled: boolean;
  onGhost: (text: string, cx: number, cy: number) => void;
}> = ({ pos, color, onSubmit, onCancel, aiEnabled, onGhost }) => {
  const [val, setVal] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (pos) { setVal(""); setTimeout(() => ref.current?.focus(), 20); }
  }, [pos]);
  if (!pos) return null;
  return (
    <div className="absolute" style={{ left: pos.sx, top: pos.sy, zIndex: 30 }}>
      <textarea
        ref={ref}
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          if (aiEnabled && e.target.value.length > 2)
            onGhost(e.target.value, pos.cx, pos.cy + 80);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            val.trim() ? onSubmit(val.trim(), pos.cx, pos.cy) : onCancel();
          }
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Type here… (Enter to place)"
        rows={2}
        style={{
          minWidth: 180, background: "white",
          border: `2px solid ${color}`, borderRadius: 8,
          padding: "6px 10px", fontSize: 14, color,
          fontFamily: "Inter, sans-serif",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          outline: "none", resize: "both",
        }}
      />
      <div className="mt-1 text-[10px] text-slate-400 text-center">
        Enter to place · Esc to cancel
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export interface InfiniteWhiteboardProps {
  canvasId: string;
  firebaseToken: string;
  userName: string;
  userRole: "owner" | "editor" | "viewer" | "voice";
  shareToken?: string;
}

export default function InfiniteWhiteboard({
  canvasId,
  firebaseToken,
  userName,
  userRole,
  shareToken,
}: InfiniteWhiteboardProps) {
  const canEdit = userRole === "owner" || userRole === "editor" || userRole === "voice";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [elements, setElements] = useState<DrawableElement[]>([]);
  const [tool, setTool] = useState<ToolMode>(canEdit ? "draw" : "pan");
  const [strokeType, setStrokeType] = useState<StrokeType>("pen");
  const [shapeType, setShapeType] = useState<ShapeType>("rectangle");
  const [fcShape, setFcShape] = useState<FlowchartShapeType>("rectangle");
  const [color, setColor] = useState("#111827");
  const [lineWidth, setLineWidth] = useState(2);
  const [opacity, setOpacity] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [textPos, setTextPos] = useState<{ sx: number; sy: number; cx: number; cy: number } | null>(null);
  const [remoteStrokes, setRemoteStrokes] = useState<Record<string, RemoteStroke>>({});
  const [aiEnabled, setAiEnabled] = useState(false);
  const [ghost, setGhost] = useState<GhostSuggestion | null>(null);

  // Space-to-pan
  const [spacePanning, setSpacePanning] = useState(false);
  const spacePanRef = useRef(false);

  // ── FIX: Refs updated synchronously at render time (not via useEffect).
  // useEffect fires AFTER paint, causing a one-frame window where pointer
  // handlers read a stale canEditR.current = false even though canEdit is true.
  // Direct assignment during render guarantees refs are always current.
  const toolR         = useRef(tool);
  const strokeTypeR   = useRef(strokeType);
  const colorR        = useRef(color);
  const lineWidthR    = useRef(lineWidth);
  const opacityR      = useRef(opacity);
  const shapeTypeR    = useRef(shapeType);
  const fcShapeR      = useRef(fcShape);
  const aiR           = useRef(aiEnabled);
  const canEditR      = useRef(canEdit);
  const elementsR     = useRef<DrawableElement[]>([]);
  const vpR           = useRef({ x: 0, y: 0, zoom: 1 });
  const showGridR     = useRef(showGrid);
  const remoteStR     = useRef<Record<string, RemoteStroke>>({});

  // Synchronous ref updates — no useEffect lag
  toolR.current       = tool;
  strokeTypeR.current = strokeType;
  colorR.current      = color;
  lineWidthR.current  = lineWidth;
  opacityR.current    = opacity;
  shapeTypeR.current  = shapeType;
  fcShapeR.current    = fcShape;
  aiR.current         = aiEnabled;
  canEditR.current    = canEdit;        // ← THE core fix: was always stale=false via useEffect
  elementsR.current   = elements;
  showGridR.current   = showGrid;
  remoteStR.current   = remoteStrokes;

  // FIX: userId initialized once with a real ID, not "" (empty string caused
  // all elements to have createdBy:"", breaking per-user undo tracking)
  const userId = useRef(generateId());

  const myHistory = useRef<{ action: "add" | "delete"; elementId: string; element: DrawableElement }[]>([]);

  const drawing     = useRef(false);
  const livePoints  = useRef<Point[]>([]);
  const shapeStart  = useRef<Point | null>(null);
  const strokeId    = useRef("");
  const eraserPos   = useRef<Point | null>(null);

  const { viewport, pan, zoom, reset: resetZoom } = useViewport();
  vpR.current = viewport; // sync synchronously

  const { addToHistory, redo, canRedo } = useHistory();
  const { lastSaved, save } = useAutoSave(
    () => ({ elements: elementsR.current.map(toDB), viewport }),
    30000, canvasId, canEdit ? firebaseToken : null,
  );

  // Switch to draw tool if canEdit becomes true after initial render
  useEffect(() => {
    if (canEdit && tool === "pan") {
      setTool("draw");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  // ── Space-to-pan ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spacePanRef.current) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        spacePanRef.current = true;
        setSpacePanning(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") { spacePanRef.current = false; setSpacePanning(false); }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, []);

  // ── Collaboration ─────────────────────────────────────────────────────────
  // hasLoadedRef: onCanvasState should only replace local elements on the FIRST
  // server broadcast. After that, incremental events keep sync. Without this,
  // a delayed state broadcast arriving mid-stroke wipes the user's drawing.
  const hasLoadedRef = useRef(false);

  // NOTE: collabOpts is NOT memoized — we need fresh callbacks every render.
  // useCollaboration stores them in a cbRef internally so the socket handlers
  // always call the latest version. useMemo here would cause stale closures.
  const collabOpts: CollaborationOptions = {
    canvasId, firebaseToken, userName, userRole, shareToken,
    onElementAdd: (el: DrawableElement) =>
      setElements((prev) => prev.find((e) => e.id === el.id) ? prev : [...prev, el]),
    onElementDelete: (eid: string) =>
      setElements((prev) => prev.filter((e) => e.id !== eid && (e as any).elementId !== eid)),
    onElementModify: (el: DrawableElement) =>
      setElements((prev) => prev.map((e) => (e.id === el.id ? el : e))),
    onCanvasClear: () => { hasLoadedRef.current = false; setElements([]); },
    onCanvasState: (els: DrawableElement[]) => {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        setElements((els ?? []).map(fromDB).filter(Boolean) as DrawableElement[]);
      }
    },
    onRoleConfirmed: (_r: string) => {},
    onRemoteStrokeUpdate: (sid: string, stroke: RemoteStroke | null) =>
      setRemoteStrokes((prev) => {
        if (!stroke) { const n = { ...prev }; delete n[sid]; return n; }
        return { ...prev, [sid]: stroke };
      }),
  };

  const {
    isConnected, isSyncing, activeUsers, remoteCursors,
    emitElementAdd: _emitElementAdd,
    emitElementDelete: _emitElementDelete,
    emitElementModify: _emitElementModify,
    emitCanvasClear: _emitCanvasClear,
    emitCursorMove: _emitCursorMove,
    emitStrokeDrawing: _emitStrokeDrawing,
    emitCanvasSave: _emitCanvasSave,
  } = useCollaboration(collabOpts);

  // Wrap every emit in try/catch — if the socket is disconnected or throws,
  // it must NEVER abort the local drawing logic that follows the emit call.
  const emitElementAdd    = useCallback((...a: Parameters<typeof _emitElementAdd>)    => { try { _emitElementAdd(...a);    } catch {} }, [_emitElementAdd]);
  const emitElementDelete = useCallback((...a: Parameters<typeof _emitElementDelete>) => { try { _emitElementDelete(...a); } catch {} }, [_emitElementDelete]);
  const emitElementModify = useCallback((...a: Parameters<typeof _emitElementModify>) => { try { _emitElementModify(...a); } catch {} }, [_emitElementModify]);
  const emitCanvasClear   = useCallback((...a: Parameters<typeof _emitCanvasClear>)   => { try { _emitCanvasClear(...a);   } catch {} }, [_emitCanvasClear]);
  const emitCursorMove    = useCallback((...a: Parameters<typeof _emitCursorMove>)    => { try { _emitCursorMove(...a);    } catch {} }, [_emitCursorMove]);
  const emitStrokeDrawing = useCallback((...a: Parameters<typeof _emitStrokeDrawing>) => { try { _emitStrokeDrawing(...a); } catch {} }, [_emitStrokeDrawing]);
  const emitCanvasSave    = useCallback((...a: Parameters<typeof _emitCanvasSave>)    => { try { _emitCanvasSave(...a);    } catch {} }, [_emitCanvasSave]);

  // ── RAF render loop ───────────────────────────────────────────────────────
  useEffect(() => {
    let raf: number;
    const loop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const vp = vpR.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (showGridR.current) renderGrid(ctx, vp, canvas.width, canvas.height);

        for (const el of elementsR.current) {
          if (isStroke(el)) renderStroke(ctx, el, vp);
          else if (!isFlowchart(el) && !isTextElement(el) && "type" in el) renderShape(ctx, el, vp);
        }

        for (const rs of Object.values(remoteStR.current)) {
          if (rs.points?.length >= 2)
            renderStroke(ctx, { id: rs.socketId, type: rs.strokeType as StrokeType, points: rs.points, color: rs.userColor, width: rs.width, opacity: 0.75, timestamp: 0 }, vp);
        }

        if (drawing.current && livePoints.current.length >= 2 && toolR.current === "draw" && strokeTypeR.current !== "eraser") {
          renderStroke(ctx, { id: "__live__", type: strokeTypeR.current, points: livePoints.current, color: colorR.current, width: lineWidthR.current, opacity: opacityR.current, timestamp: 0 }, vp);
        }

        if (drawing.current && toolR.current === "shape" && shapeStart.current && livePoints.current.length > 0) {
          const last = livePoints.current[livePoints.current.length - 1];
          renderShape(ctx, { type: shapeTypeR.current, x: Math.min(shapeStart.current.x, last.x), y: Math.min(shapeStart.current.y, last.y), width: Math.abs(last.x - shapeStart.current.x), height: Math.abs(last.y - shapeStart.current.y), color: colorR.current, fillColor: "transparent", strokeWidth: lineWidthR.current, opacity: opacityR.current }, vp);
        }

        if (toolR.current === "draw" && strokeTypeR.current === "eraser" && eraserPos.current) {
          const ep = eraserPos.current;
          renderEraserCursor(ctx, ep.x * vp.zoom + vp.x, ep.y * vp.zoom + vp.y, lineWidthR.current * 6 * vp.zoom);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current, ctr = containerRef.current;
      if (c && ctr) { c.width = ctr.clientWidth; c.height = ctr.clientHeight; }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Wheel zoom / pan ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = canvasRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoom(-e.deltaY * 0.001, e.clientX - r.left, e.clientY - r.top);
      else pan(-e.deltaX, -e.deltaY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, pan]);

  const toPt = (clientX: number, clientY: number): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const r = canvasRef.current.getBoundingClientRect();
    return screenToCanvas(clientX - r.left, clientY - r.top, vpR.current);
  };

  // ── Pointer Down ──────────────────────────────────────────────────────────
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    canvasRef.current!.setPointerCapture(e.pointerId);

    const pt = toPt(e.clientX, e.clientY);
    const t = spacePanRef.current ? "pan" : toolR.current;
    const cEdit = canEditR.current;

    setSelectedId(null);
    setEditingId(null);

    if (t === "text") {
      const r = canvasRef.current!.getBoundingClientRect();
      setTextPos({ sx: e.clientX - r.left, sy: e.clientY - r.top, cx: pt.x, cy: pt.y });
      return;
    }

    if (t === "flowchart" && cEdit) {
      const defs = FLOWCHART_DEFAULTS[fcShapeR.current];
      const newId = generateId();
      const newEl: FlowchartElement = {
        id: newId, elementId: newId, kind: "flowchart",
        shapeType: fcShapeR.current,
        x: pt.x - defs.width / 2, y: pt.y - defs.height / 2,
        width: defs.width, height: defs.height,
        label: "", color: defs.color, fillColor: defs.fillColor,
        strokeWidth: 2, opacity: 1, rotation: 0,
        fontSize: 13, fontFamily: "Inter, sans-serif",
        timestamp: Date.now(), createdBy: userId.current,
      };
      setElements((prev) => [...prev, newEl]);
      emitElementAdd(canvasId, toDB(newEl));
      addToHistory({ type: "add", elements: [newEl], timestamp: Date.now() });
      myHistory.current.push({ action: "add", elementId: newId, element: newEl });
      setGhost(null);
      return;
    }

    // pan: set drawing so onMove can pan
    if (t === "pan") {
      drawing.current = true;
      return;
    }

    // select tool has no drawing action — exit cleanly
    if (t === "select") return;

    if (!cEdit) {
      console.warn("[Canvas] drawing blocked — canEdit is false. userRole:", userRole);
      return;
    }

    drawing.current = true;
    livePoints.current = [pt];
    shapeStart.current = pt;
    strokeId.current = generateId();
    eraserPos.current = pt;
  };

  // ── Pointer Move ──────────────────────────────────────────────────────────
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toPt(e.clientX, e.clientY);
    const t = spacePanRef.current ? "pan" : toolR.current;
    const sType = strokeTypeR.current;

    if (t === "draw" && sType === "eraser") eraserPos.current = pt;

    emitCursorMove(canvasId, pt.x, pt.y);

    if (!drawing.current) return;

    if (t === "pan") { pan(e.movementX, e.movementY); return; }

    if (t === "draw" && canEditR.current) {
      if (sType === "eraser") {
        eraserPos.current = pt;
        const radius = lineWidthR.current * 6;
        const { elements: next, deleted, added } = erasePoint(elementsR.current, pt, radius);
        if (deleted.length > 0) {
          setElements(next);
          deleted.forEach((id) => emitElementDelete(canvasId, id));
          added.forEach((el) => emitElementAdd(canvasId, toDB(el)));
        }
      } else {
        livePoints.current = [...livePoints.current, pt];
        emitStrokeDrawing(canvasId, livePoints.current, colorR.current, lineWidthR.current, sType);
        if (aiR.current && livePoints.current.length % 15 === 0) {
          setGhost(detectShapeFromStroke(livePoints.current));
        }
      }
    }

    if (t === "shape" && canEditR.current) {
      livePoints.current = [shapeStart.current!, pt];
    }
  };

  // ── Pointer Up ────────────────────────────────────────────────────────────
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;

    const pt = toPt(e.clientX, e.clientY);
    const t = spacePanRef.current ? "pan" : toolR.current;
    const sType = strokeTypeR.current;

    if (t === "draw" && canEditR.current && sType !== "eraser" && livePoints.current.length >= 2) {
      const id = strokeId.current;
      const pts = [...livePoints.current];
      const newStroke: Stroke = {
        id, elementId: id, kind: "stroke",
        type: sType, points: pts,
        color: colorR.current, width: lineWidthR.current, opacity: opacityR.current,
        timestamp: Date.now(), bounds: calculateBounds(pts),
        createdBy: userId.current,
      } as any;
      setElements((prev) => [...prev, newStroke]);
      emitElementAdd(canvasId, toDB(newStroke));
      addToHistory({ type: "add", elements: [newStroke], timestamp: Date.now() });
      myHistory.current.push({ action: "add", elementId: id, element: newStroke });
    }

    if (t === "shape" && canEditR.current && shapeStart.current) {
      const sx = Math.min(shapeStart.current.x, pt.x), sy = Math.min(shapeStart.current.y, pt.y);
      const sw = Math.abs(pt.x - shapeStart.current.x), sh = Math.abs(pt.y - shapeStart.current.y);
      if (sw > 4 && sh > 4) {
        const id = generateId();
        const newShape: Shape = {
          id, elementId: id, kind: "shape",
          type: shapeTypeR.current,
          x: sx, y: sy, width: sw, height: sh,
          color: colorR.current, fillColor: "transparent",
          strokeWidth: lineWidthR.current, opacity: opacityR.current,
          rotation: 0, timestamp: Date.now(), createdBy: userId.current,
        } as any;
        setElements((prev) => [...prev, newShape]);
        emitElementAdd(canvasId, toDB(newShape));
        addToHistory({ type: "add", elements: [newShape], timestamp: Date.now() });
        myHistory.current.push({ action: "add", elementId: id, element: newShape });
      }
    }

    livePoints.current = [];
    shapeStart.current = null;
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (!canEdit) return;
    const last = myHistory.current.pop();
    if (!last) return;
    if (last.action === "add") {
      setElements((prev) => prev.filter((e) => e.id !== last.elementId));
      emitElementDelete(canvasId, last.elementId);
    } else {
      setElements((prev) => [...prev, last.element]);
      emitElementAdd(canvasId, toDB(last.element));
    }
  }, [canEdit, canvasId]);

  const handleRedo = useCallback(() => {
    if (!canEdit) return;
    const a = redo();
    if (!a || a.type !== "add") return;
    a.elements.forEach((el) => {
      setElements((prev) => prev.find((e) => e.id === el.id) ? prev : [...prev, el]);
      emitElementAdd(canvasId, toDB(el));
    });
  }, [canEdit, redo, canvasId]);

  const handleClearAll = useCallback(() => {
    if (!canEdit || !confirm("Clear entire canvas?")) return;
    setElements([]); setGhost(null); emitCanvasClear(canvasId);
  }, [canEdit, canvasId]);

  const handleSave = useCallback(() => {
    if (!canEdit) return;
    emitCanvasSave(canvasId, elementsR.current.map(toDB), viewport);
    save();
  }, [canEdit, canvasId, viewport, save]);

  const handleTextSubmit = useCallback((text: string, cx: number, cy: number) => {
    const id = generateId();
    const el: TextElement = {
      id, elementId: id, kind: "text",
      x: cx, y: cy, text,
      fontSize: 16, fontFamily: "Inter, sans-serif",
      color: colorR.current, timestamp: Date.now(),
      createdBy: userId.current,
    } as any;
    setElements((prev) => [...prev, el]);
    emitElementAdd(canvasId, toDB(el));
    myHistory.current.push({ action: "add", elementId: id, element: el });
    setTextPos(null); setGhost(null);
  }, [canvasId]);

  const handleAcceptGhost = useCallback(() => {
    if (!ghost || !aiEnabled || !canEdit) return;
    const newEl = acceptGhost(ghost, userId.current, elements.filter(isFlowchart) as FlowchartElement[]);
    setElements((prev) => [...prev, newEl]);
    emitElementAdd(canvasId, toDB(newEl));
    myHistory.current.push({ action: "add", elementId: newEl.id, element: newEl });
    addToHistory({ type: "add", elements: [newEl], timestamp: Date.now() });
    setGhost(null);
    setTimeout(() => setGhost({
      type: "next_shape", shapeType: "rectangle",
      x: newEl.x, y: newEl.y + newEl.height + 60,
      width: FLOWCHART_DEFAULTS.rectangle.width,
      height: FLOWCHART_DEFAULTS.rectangle.height,
      opacity: 0.3, triggerSource: "drawing",
    }), 300);
  }, [ghost, aiEnabled, canEdit, canvasId, elements]);

  const handleFCSelect = useCallback((id: string) => { setSelectedId(id); setEditingId(null); }, []);
  const handleFCDoubleClick = useCallback((id: string) => { setEditingId(id); setSelectedId(id); }, []);
  const handleFCLabel = useCallback((id: string, label: string) => {
    setElements((prev) => prev.map((el) => {
      if (el.id !== id || !isFlowchart(el)) return el;
      const u = { ...el, label };
      emitElementModify(canvasId, toDB(u));
      return u;
    }));
    setEditingId(null);
  }, [canvasId]);
  const handleFCDrag = useCallback((id: string, dx: number, dy: number) => {
    setElements((prev) => prev.map((el) => {
      if (el.id !== id || !isFlowchart(el)) return el;
      const u = { ...el, x: el.x + dx, y: el.y + dy };
      emitElementModify(canvasId, toDB(u));
      return u;
    }));
  }, [canvasId]);

  useKeyboardShortcuts({
    onUndo: handleUndo, onRedo: handleRedo, onSave: handleSave,
    onToggleGrid: () => setShowGrid((v) => !v),
    onZoomIn: () => { const c = canvasRef.current; if (c) zoom(0.1, c.width / 2, c.height / 2); },
    onZoomOut: () => { const c = canvasRef.current; if (c) zoom(-0.1, c.width / 2, c.height / 2); },
    onResetZoom: resetZoom,
    onEscape: () => { setSelectedId(null); setEditingId(null); setTextPos(null); setGhost(null); },
    onTabKey: handleAcceptGhost,
    onDelete: () => {
      if (!selectedId || !canEdit) return;
      const el = elementsR.current.find((e) => e.id === selectedId);
      if (el) {
        myHistory.current.push({ action: "delete", elementId: selectedId, element: el });
        setElements((prev) => prev.filter((e) => e.id !== selectedId));
        emitElementDelete(canvasId, selectedId);
        setSelectedId(null);
      }
    },
  });

  const handleExport = useCallback((fmt: ExportFormat) => {
    exportCanvas(canvasRef.current!, elements, viewport, fmt, canvasId);
  }, [elements, viewport, canvasId]);

  const fcAll    = elements.filter(isFlowchart) as FlowchartElement[];
  const textEls  = elements.filter(isTextElement) as TextElement[];
  const conns    = fcAll.filter((el) => el.shapeType === "connector");
  const fcShapes = fcAll.filter((el) => el.shapeType !== "connector");

  const effectiveTool = spacePanning ? "pan" : tool;
  const cursorStyle =
    effectiveTool === "pan"                          ? "grab"
    : tool === "draw" && strokeType === "eraser"     ? "none"
    : tool === "draw"                                ? "crosshair"
    : tool === "text"                                ? "text"
    : "default";

  return (
    <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-slate-50 select-none">

      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: cursorStyle, touchAction: "none" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => { eraserPos.current = null; }}
      />

      {/* HTML layer: flowchart shapes + text */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
        {conns.map((el) => (
          <FlowchartConnector key={el.id} element={el} elements={fcShapes} viewport={viewport} isSelected={selectedId === el.id} onSelect={handleFCSelect} canEdit={canEdit} />
        ))}
        {/* pointer-events-none on wrapper — each FlowchartShape handles its own pointer events */}
        <div className="absolute inset-0 pointer-events-none">
          {fcShapes.map((el) => (
            <FlowchartShape key={el.id} element={el} viewport={viewport} isSelected={selectedId === el.id} isEditing={editingId === el.id} onSelect={handleFCSelect} onDoubleClick={handleFCDoubleClick} onLabelChange={handleFCLabel} onDragEnd={handleFCDrag} canEdit={canEdit} />
          ))}
        </div>
        {textEls.map((el) => (
          <div key={el.id} className="absolute pointer-events-none" style={{ left: el.x * viewport.zoom + viewport.x, top: el.y * viewport.zoom + viewport.y, fontSize: el.fontSize * viewport.zoom, fontFamily: el.fontFamily, color: el.color, whiteSpace: "pre-wrap", maxWidth: 300 * viewport.zoom }}>
            {el.text}
          </div>
        ))}
      </div>

      <GhostOverlay ghost={ghost} viewport={viewport} onAccept={handleAcceptGhost} aiEnabled={aiEnabled} />

      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 40 }}>
        <RemoteCursors cursors={remoteCursors} vp={viewport} myId={userId.current} />
      </div>

      <TextInput pos={textPos} color={color} onSubmit={handleTextSubmit} onCancel={() => setTextPos(null)} aiEnabled={aiEnabled} onGhost={(t, x, y) => setGhost(detectShapeFromText(t, x, y))} />

      <Toolbar
        currentTool={tool} currentStrokeType={strokeType}
        currentShape={shapeType} currentColor={color}
        strokeWidth={lineWidth} opacity={opacity}
        onToolChange={setTool} onStrokeTypeChange={setStrokeType}
        onShapeChange={setShapeType} onColorChange={setColor}
        onStrokeWidthChange={setLineWidth} onOpacityChange={setOpacity}
        currentFlowchartShape={fcShape} onFlowchartShapeChange={setFcShape}
        aiEnabled={aiEnabled}
        onAIToggle={() => { setAiEnabled((v) => !v); if (aiEnabled) setGhost(null); }}
        canEdit={canEdit}
      />

      <TopControls
        canUndo={canEdit && myHistory.current.length > 0} canRedo={canEdit && canRedo}
        onUndo={handleUndo} onRedo={handleRedo}
        zoom={viewport.zoom}
        onZoomIn={() => { const c = canvasRef.current; if (c) zoom(0.15, c.width / 2, c.height / 2); }}
        onZoomOut={() => { const c = canvasRef.current; if (c) zoom(-0.15, c.width / 2, c.height / 2); }}
        onResetZoom={resetZoom} showGrid={showGrid} onToggleGrid={() => setShowGrid((v) => !v)}
        onExport={handleExport} onClearAll={handleClearAll} onSave={handleSave}
        lastSaved={lastSaved} canvasId={canvasId} firebaseToken={firebaseToken} userRole={userRole}
      />

      <ActiveUsersPill users={activeUsers} myId={userId.current} />
      <SyncBadge syncing={isSyncing} connected={isConnected} />

      {!canEdit && (
        <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 backdrop-blur-sm rounded-full">
          <div className="w-2 h-2 rounded-full bg-sky-400" />
          <span className="text-xs font-medium text-white">Viewing</span>
        </div>
      )}

      {spacePanning && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
          <div className="px-3 py-1.5 bg-slate-800/70 backdrop-blur-sm rounded-full">
            <span className="text-xs font-medium text-white/80">Hold Space · Pan mode</span>
          </div>
        </div>
      )}

      {aiEnabled && tool === "flowchart" && !ghost && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-full">
          <span className="text-xs text-violet-600 font-medium">✨ Draw or type keywords — AI suggests shapes</span>
        </div>
      )}
    </div>
  );
}