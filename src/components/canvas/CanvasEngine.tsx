'use client';
import {
  useEffect, useRef, useCallback, useState,
} from 'react';
import { useCanvasStore } from '@/store/canvas.store';
import { useCollaborationStore } from '@/store/collaboration.store';
import {
  DrawableElement, Stroke, Shape, FlowchartElement, TextElement, Connector,
  isStroke, isShape, isFlowchart, isTextElement, isConnector,
  ToolMode, StrokeType, ShapeType, Point, FLOWCHART_DEFAULTS
} from '@/types/element';
import { screenToCanvas, calculateBounds, isNear, generateId, toAPI } from '@/lib/element.transform';
import { FlowchartOverlay } from './FlowchartOverlay';
import { TextLayer } from './TextLayer';
import { FloatingTextToolbar } from './FloatingTextToolbar';
import { TransformOverlay } from './TransformOverlay';
import { SelectionContextMenu } from './SelectionContextMenu';
import { RemoteCursors } from './RemoteCursors';

// ── Renderers ────────────────────────────────────────────────────────────────
type VP = { x: number; y: number; zoom: number };

function renderGrid(ctx: CanvasRenderingContext2D, vp: VP, w: number, h: number) {
  const size = 20 * vp.zoom;
  const ox = ((vp.x % size) + size) % size;
  const oy = ((vp.y % size) + size) % size;
  ctx.save();
  ctx.strokeStyle = 'rgba(148,163,184,0.18)';
  ctx.lineWidth = 0.5;
  for (let x = ox; x < w; x += size) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = oy; y < h; y += size) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.restore();
}

function renderStroke(ctx: CanvasRenderingContext2D, s: { type: string; points: Point[]; color: string; width: number; opacity: number }, vp: VP) {
  if (s.points.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  switch (s.type) {
    case 'pen':    ctx.globalAlpha = s.opacity; ctx.strokeStyle = s.color; ctx.lineWidth = s.width * vp.zoom; break;
    case 'pencil': ctx.globalAlpha = s.opacity * 0.55; ctx.strokeStyle = s.color; ctx.lineWidth = s.width * vp.zoom * 0.75; break;
    case 'marker': ctx.globalAlpha = s.opacity * 0.4; ctx.strokeStyle = s.color; ctx.lineWidth = s.width * vp.zoom * 3; ctx.lineCap = 'square'; break;
    case 'brush':  ctx.globalAlpha = s.opacity * 0.85; ctx.strokeStyle = s.color; ctx.lineWidth = s.width * vp.zoom * 2; break;
    default:       ctx.globalAlpha = s.opacity; ctx.strokeStyle = s.color; ctx.lineWidth = s.width * vp.zoom;
  }
  ctx.beginPath();
  ctx.moveTo(s.points[0].x * vp.zoom + vp.x, s.points[0].y * vp.zoom + vp.y);
  for (let i = 1; i < s.points.length; i++) {
    if (i < s.points.length - 1) {
      const mx = (s.points[i].x + s.points[i + 1].x) / 2;
      const my = (s.points[i].y + s.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(s.points[i].x * vp.zoom + vp.x, s.points[i].y * vp.zoom + vp.y, mx * vp.zoom + vp.x, my * vp.zoom + vp.y);
    } else {
      ctx.lineTo(s.points[i].x * vp.zoom + vp.x, s.points[i].y * vp.zoom + vp.y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function normalizeConnectorPoints(points: Point[], mode: 'straight' | 'polyline') {
  if (mode === 'straight' && points.length >= 2) {
    return [points[0], points[points.length - 1]];
  }
  return points;
}

function renderArrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  color: string,
  style: Connector['arrowHeadStyle'],
) {
  const type = style ?? 'triangle';
  if (type === 'none') return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.setLineDash([]);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  if (type === 'open') {
    ctx.beginPath();
    ctx.moveTo(-size, -size * 0.55);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size, size * 0.55);
    ctx.lineWidth = Math.max(1, size * 0.16);
    ctx.stroke();
  } else if (type === 'dot') {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size * 0.55, -size * 0.38);
    ctx.lineTo(-size, 0);
    ctx.lineTo(-size * 0.55, size * 0.38);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.5);
    ctx.lineTo(-size, size * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function renderConnector(ctx: CanvasRenderingContext2D, c: Connector, vp: VP) {
  if (c.points.length < 2) return;
  const points = normalizeConnectorPoints(c.points, c.mode ?? 'polyline');
  const radius = (c.borderRadius ?? 12) * vp.zoom;
  ctx.save();
  ctx.globalAlpha = c.opacity;
  ctx.strokeStyle = c.color;
  ctx.lineWidth = c.width * vp.zoom;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (c.dashed) ctx.setLineDash([5 * vp.zoom, 5 * vp.zoom]);

  ctx.beginPath();
  const p0 = { x: points[0].x * vp.zoom + vp.x, y: points[0].y * vp.zoom + vp.y };
  ctx.moveTo(p0.x, p0.y);

  if ((c.mode ?? 'polyline') === 'straight' || points.length <= 2 || radius <= 0) {
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * vp.zoom + vp.x, points[i].y * vp.zoom + vp.y);
    }
  } else {
    for (let i = 1; i < points.length - 1; i++) {
      const p1 = { x: points[i].x * vp.zoom + vp.x, y: points[i].y * vp.zoom + vp.y };
      const p2 = { x: points[i + 1].x * vp.zoom + vp.x, y: points[i + 1].y * vp.zoom + vp.y };
      ctx.arcTo(p1.x, p1.y, p2.x, p2.y, radius);
    }
  }

  const last = { x: points[points.length - 1].x * vp.zoom + vp.x, y: points[points.length - 1].y * vp.zoom + vp.y };
  ctx.lineTo(last.x, last.y);
  ctx.stroke();

  const pStart = points[0];
  const pNext = points[1];
  const pPrev = points[points.length - 2];
  const pLast = points[points.length - 1];
  const size = 12 * vp.zoom;

  if (c.arrowStart) {
    const angle = Math.atan2(pStart.y - pNext.y, pStart.x - pNext.x);
    renderArrowHead(
      ctx,
      pStart.x * vp.zoom + vp.x,
      pStart.y * vp.zoom + vp.y,
      angle,
      size,
      c.color,
      c.arrowTailStyle ?? c.arrowHeadStyle ?? 'triangle',
    );
  }

  if (c.arrowEnd !== false) {
    const angle = Math.atan2(pLast.y - pPrev.y, pLast.x - pPrev.x);
    renderArrowHead(
      ctx,
      pLast.x * vp.zoom + vp.x,
      pLast.y * vp.zoom + vp.y,
      angle,
      size,
      c.color,
      c.arrowHeadStyle ?? 'triangle',
    );
  }

  ctx.restore();
}

function renderShape(ctx: CanvasRenderingContext2D, shape: Shape, vp: VP) {
  const sx = shape.x * vp.zoom + vp.x, sy = shape.y * vp.zoom + vp.y;
  const sw = shape.width * vp.zoom, sh = shape.height * vp.zoom;
  ctx.save();
  ctx.globalAlpha = shape.opacity;
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.strokeWidth * vp.zoom;
  if (shape.fillColor && shape.fillColor !== 'transparent') ctx.fillStyle = shape.fillColor;
  ctx.beginPath();
  switch (shape.type) {
    case 'rectangle': 
      if (shape.borderRadius && ctx.roundRect) {
        ctx.roundRect(sx, sy, sw, sh, shape.borderRadius * vp.zoom);
      } else {
        ctx.rect(sx, sy, sw, sh);
      }
      break;
    case 'circle':    ctx.ellipse(sx + sw / 2, sy + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2); break;
    case 'triangle':  ctx.moveTo(sx + sw / 2, sy); ctx.lineTo(sx + sw, sy + sh); ctx.lineTo(sx, sy + sh); ctx.closePath(); break;
    case 'diamond':   ctx.moveTo(sx + sw / 2, sy); ctx.lineTo(sx + sw, sy + sh / 2); ctx.lineTo(sx + sw / 2, sy + sh); ctx.lineTo(sx, sy + sh / 2); ctx.closePath(); break;
    case 'line':      ctx.moveTo(sx, sy + sh / 2); ctx.lineTo(sx + sw, sy + sh / 2); break;
    case 'star': {
      const cx = sx + sw / 2;
      const cy = sy + sh / 2;
      const outerRadius = Math.min(sw, sh) / 2;
      const innerRadius = outerRadius / 2.5;
      const spikes = 5;
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      break;
    }
    case 'arrow': {
      const ah = sh * 0.35;
      ctx.moveTo(sx, sy + sh / 2); ctx.lineTo(sx + sw * 0.75, sy + sh / 2);
      ctx.moveTo(sx + sw, sy + sh / 2); ctx.lineTo(sx + sw * 0.7, sy + sh / 2 - ah); ctx.lineTo(sx + sw * 0.7, sy + sh / 2 + ah); ctx.closePath();
      break;
    }
    default: ctx.rect(sx, sy, sw, sh);
  }
  if (shape.fillColor && shape.fillColor !== 'transparent') ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function erasePoint(elements: DrawableElement[], pt: Point, radius: number) {
  const deleted: string[] = [], added: DrawableElement[] = [], kept: DrawableElement[] = [];
  for (const el of elements) {
    if (!isStroke(el)) { kept.push(el); continue; }
    if (el.bounds) {
      const { minX, minY, maxX, maxY } = el.bounds;
      if (pt.x < minX - radius || pt.x > maxX + radius || pt.y < minY - radius || pt.y > maxY + radius) { kept.push(el); continue; }
    }
    const hit = el.points.some((p) => isNear(p, pt, radius));
    if (!hit) { kept.push(el); continue; }
    deleted.push(el.id);
    let seg: Point[] = [];
    const flush = () => {
      if (seg.length >= 2) {
        const newId = generateId();
        added.push({ ...el, id: newId, elementId: newId, points: [...seg], timestamp: Date.now(), bounds: calculateBounds(seg) } as Stroke);
      }
      seg = [];
    };
    for (const sp of el.points) { if (!isNear(sp, pt, radius)) seg.push(sp); else flush(); }
    flush();
  }
  return { elements: [...kept, ...added], deleted, added };
}

function connectorBounds(points: Point[]) {
  return calculateBounds(points);
}

function segmentDistance(pt: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(pt.x - a.x, pt.y - a.y);
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / (dx * dx + dy * dy)));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(pt.x - projX, pt.y - projY);
}

function isPointNearConnector(pt: Point, c: Connector, tolerance = 10) {
  for (let i = 0; i < c.points.length - 1; i++) {
    if (segmentDistance(pt, c.points[i], c.points[i + 1]) <= tolerance) return true;
  }
  return false;
}

function connectorMidpoints(points: Point[]) {
  const mids: Array<{ x: number; y: number; index: number }> = [];
  for (let i = 0; i < points.length - 1; i++) {
    mids.push({
      x: (points[i].x + points[i + 1].x) / 2,
      y: (points[i].y + points[i + 1].y) / 2,
      index: i + 1,
    });
  }
  return mids;
}

// ── Main Canvas Engine ────────────────────────────────────────────────────────
interface CanvasEngineProps {
  canEdit: boolean;
  onElementAdd: (el: DrawableElement, apiForm: unknown) => void;
  onElementDelete: (ids: string[]) => void;
  onElementModify: (el: DrawableElement, apiForm: unknown) => void;
  onCursorMove: (x: number, y: number) => void;
  onStrokePreview: (points: Point[], style: Record<string, unknown>) => void;
  onCanvasClear: () => void;
  onCanvasSave: () => void;
  onThumbnailCapture?: (dataUrl: string) => void;
}

export function CanvasEngine({
  canEdit,
  onElementAdd,
  onElementDelete,
  onElementModify,
  onCursorMove,
  onStrokePreview,
  onCanvasClear: _onCanvasClear,
  onCanvasSave: _onCanvasSave,
  onThumbnailCapture,
}: CanvasEngineProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { 
    elements, viewport, tool, strokeType, shapeType, fcShape, color, lineWidth, opacity, showGrid, snapToGrid,
    connectorMode, connectorHead, connectorHeadStyle, connectorRounded,
    addElement, removeElement, replaceElements, markDeleted, setViewport, pushHistory,
    panViewport, zoomViewport, selectedIds, setSelectedIds, clearSelection, updateElement,
    setTool,
  } = useCanvasStore();

  const { remoteLiveStrokes } = useCollaborationStore();

  // Mutable refs for render loop (avoid stale closures)
  const elementsR    = useRef<DrawableElement[]>([]);
  const vpR          = useRef(viewport);
  const toolR        = useRef<ToolMode>(tool);
  const strokeTypeR  = useRef<StrokeType>(strokeType);
  const shapeTypeR   = useRef<ShapeType>(shapeType);
  const colorR       = useRef(color);
  const lineWidthR   = useRef(lineWidth);
  const opacityR     = useRef(opacity);
  const showGridR    = useRef(showGrid);
  const snapToGridR  = useRef(snapToGrid);
  const fcShapeR     = useRef(fcShape);
  const connectorModeR = useRef(connectorMode);
  const connectorHeadR = useRef(connectorHead);
  const connectorHeadStyleR = useRef(connectorHeadStyle);
  const connectorRoundedR = useRef(connectorRounded);
  const remoteStR    = useRef(remoteLiveStrokes);
  const canEditR     = useRef(canEdit);
  
  const snap = useCallback((p: Point) => {
    if (!snapToGridR.current) return p;
    const size = 20;
    return {
      x: Math.round(p.x / size) * size,
      y: Math.round(p.y / size) * size
    };
  }, []);

  const getPointForTool = useCallback((rawPoint: Point, activeTool: ToolMode): Point => {
    if (activeTool === 'draw' || activeTool === 'text' || activeTool === 'select' || activeTool === 'pan') {
      return rawPoint;
    }
    return snap(rawPoint);
  }, [snap]);

  const [activeConnectorPoints, setActiveConnectorPoints] = useState<Point[]>([]);
  const [cursorCanvasPt, setCursorCanvasPt] = useState<Point>({ x: 0, y: 0 });

  const selectedIdsR = useRef(selectedIds);

  elementsR.current    = elements;
  vpR.current          = viewport;
  toolR.current        = tool;
  strokeTypeR.current  = strokeType;
  shapeTypeR.current   = shapeType;
  fcShapeR.current     = fcShape;
  colorR.current       = color;
  lineWidthR.current   = lineWidth;
  opacityR.current     = opacity;
  showGridR.current    = showGrid;
  snapToGridR.current  = snapToGrid;
  connectorModeR.current = connectorMode;
  connectorHeadR.current = connectorHead;
  connectorHeadStyleR.current = connectorHeadStyle;
  connectorRoundedR.current = connectorRounded;
  remoteStR.current    = remoteLiveStrokes;
  canEditR.current     = canEdit;
  selectedIdsR.current = selectedIds;

  // Drawing state
  const drawing      = useRef(false);
  const livePoints   = useRef<Point[]>([]);
  const shapeStart   = useRef<Point | null>(null);
  const strokeId     = useRef('');
  const eraserPos    = useRef<Point | null>(null);
  const isPanning    = useRef(false);
  const spaceDown    = useRef(false);
  
  // Selection translation state
  const isDraggingSelection = useRef(false);
  const dragLastPos = useRef<Point | null>(null);
  const selectionHasMoved = useRef(false);
  const thumbnailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connector node editing
  const [connectorEditing, setConnectorEditing] = useState<{ id: string; nodeIndex: number } | null>(null);
  const connectorEditingR = useRef<{ id: string; nodeIndex: number } | null>(null);

  // Marquee selection state
  const isMarqueeSelecting = useRef(false);
  const marqueeStart = useRef<Point | null>(null);
  const marqueeEnd   = useRef<Point | null>(null);

  connectorEditingR.current = connectorEditing;

  // Debounced thumbnail capture — fires 3s after last drawing event
  const scheduleThumbnail = useCallback(() => {
    if (!onThumbnailCapture) return;
    if (thumbnailTimer.current) clearTimeout(thumbnailTimer.current);
    thumbnailTimer.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Render at JPEG 0.65 quality — small file, fast upload
      const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
      onThumbnailCapture(dataUrl);
    }, 3000);
  }, [onThumbnailCapture]);

  // ── RAF render loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    let raf: number;
    const loop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const vp = vpR.current;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, w, h);

        if (showGridR.current) renderGrid(ctx, vp, w, h);

        for (const el of elementsR.current) {
          if ((el as any).isGhostSuggestion) continue;
          if (isStroke(el)) renderStroke(ctx, el, vp);
          else if (isShape(el)) renderShape(ctx, el, vp);
          else if (isConnector(el)) renderConnector(ctx, el, vp);
        }

        // Live connector preview
        if (activeConnectorPoints.length > 0) {
          const previewConnector: Connector = {
            id: 'preview', elementId: 'preview', kind: 'connector',
            points: normalizeConnectorPoints([...activeConnectorPoints, cursorCanvasPt], connectorModeR.current),
            color: colorR.current, width: lineWidthR.current, opacity: 0.6,
            timestamp: Date.now(),
            mode: connectorModeR.current,
            borderRadius: connectorRoundedR.current ? 12 : 0,
            arrowStart: connectorHeadR.current === 'both',
            arrowEnd: connectorHeadR.current !== 'none',
            arrowHeadStyle: connectorHeadStyleR.current,
            arrowTailStyle: connectorHeadR.current === 'both' ? connectorHeadStyleR.current : 'none',
          };
          renderConnector(ctx, previewConnector, vp);
        }

        // Ghost shape preview (Stamp mode)
        if (toolR.current === 'shape' && !drawing.current && !activeConnectorPoints.length) {
          const ghost: Shape = {
            id: 'ghost', elementId: 'ghost', kind: 'shape',
            type: shapeTypeR.current, x: cursorCanvasPt.x - 80, y: cursorCanvasPt.y - 40, width: 160, height: 80,
            color: colorR.current, fillColor: 'transparent', opacity: 0.3, strokeWidth: 2, rotation: 0, timestamp: 0
          };
          renderShape(ctx, ghost, vp);
        }

        // Ghost elements (AI-generated, pending acceptance)
        const ghosts = elementsR.current.filter((el) => (el as any).isGhostSuggestion);
        if (ghosts.length > 0) {
          const pulse = 0.35 + 0.15 * Math.sin(Date.now() / 400);
          for (const el of ghosts) {
            if (isStroke(el)) {
              renderStroke(ctx, { ...el, opacity: pulse }, vp);
            } else if (isShape(el)) {
              ctx.save();
              ctx.globalAlpha = pulse;
              renderShape(ctx, el as Shape, vp);
              ctx.restore();
              const sx = el.x * vp.zoom + vp.x;
              const sy = el.y * vp.zoom + vp.y;
              const sw = el.width * vp.zoom;
              const sh = el.height * vp.zoom;
              ctx.save();
              ctx.globalAlpha = 0.8;
              ctx.strokeStyle = '#7c3aed';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([5, 3]);
              ctx.strokeRect(sx - 2, sy - 2, sw + 4, sh + 4);
              ctx.restore();
            }
          }
        }

        // Marquee selection rectangle
        if (isMarqueeSelecting.current && marqueeStart.current && marqueeEnd.current) {
          const ms = marqueeStart.current;
          const me = marqueeEnd.current;
          const rx = Math.min(ms.x, me.x) * vp.zoom + vp.x;
          const ry = Math.min(ms.y, me.y) * vp.zoom + vp.y;
          const rw = Math.abs(me.x - ms.x) * vp.zoom;
          const rh = Math.abs(me.y - ms.y) * vp.zoom;
          ctx.save();
          ctx.fillStyle = 'rgba(59,130,246,0.06)';
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 3]);
          ctx.strokeRect(rx, ry, rw, rh);
          ctx.restore();
        }

        // Bounds are now drawn entirely via TransformOverlay in the HTML layer!

        // Remote live strokes
        for (const rs of Object.values(remoteStR.current)) {
          if (rs.points?.length >= 2) {
            renderStroke(ctx, {
              type: String(rs.style.strokeType ?? 'pen'),
              points: rs.points,
              color:  String(rs.style.color ?? '#10b981'),
              width:  Number(rs.style.width ?? 2),
              opacity: 0.7,
            }, vp);
          }
        }

        // Live local stroke
        if (drawing.current && livePoints.current.length >= 2 && toolR.current === 'draw' && strokeTypeR.current !== 'eraser') {
          renderStroke(ctx, { type: strokeTypeR.current, points: livePoints.current, color: colorR.current, width: lineWidthR.current, opacity: opacityR.current }, vp);
        }

        // Live shape preview
        if (drawing.current && toolR.current === 'shape' && shapeStart.current && livePoints.current.length > 0) {
          const last = livePoints.current[livePoints.current.length - 1];
          renderShape(ctx, {
            kind: 'shape', id: '__preview__', elementId: '__preview__', timestamp: 0,
            type: shapeTypeR.current,
            x: Math.min(shapeStart.current.x, last.x), y: Math.min(shapeStart.current.y, last.y),
            width: Math.abs(last.x - shapeStart.current.x), height: Math.abs(last.y - shapeStart.current.y),
            color: colorR.current, fillColor: 'transparent',
            strokeWidth: lineWidthR.current, opacity: opacityR.current, rotation: 0,
          }, vp);
        }

        // Eraser cursor
        if (toolR.current === 'draw' && strokeTypeR.current === 'eraser' && eraserPos.current) {
          const ep = eraserPos.current;
          const r = lineWidthR.current * 6 * vp.zoom;
          ctx.save();
          ctx.beginPath(); ctx.arc(ep.x * vp.zoom + vp.x, ep.y * vp.zoom + vp.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(100,100,100,0.6)'; ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]); ctx.stroke();
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Resize handler ───────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current, ctr = containerRef.current;
      if (c && ctr) { c.width = ctr.clientWidth; c.height = ctr.clientHeight; }
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Wheel handler ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = canvasRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        zoomViewport(-e.deltaY * 0.001, e.clientX - r.left, e.clientY - r.top);
      } else {
        panViewport(-e.deltaX, -e.deltaY);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomViewport, panViewport]);

  // ── Space‑bar panning ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spaceDown.current) {
        const target = e.target as HTMLElement;
        if (target?.closest('input, textarea, [contenteditable="true"]')) return;
        e.preventDefault();
        spaceDown.current = true;
      }

      if (e.key === 'Backspace' && activeConnectorPoints.length > 0) {
        e.preventDefault();
        setActiveConnectorPoints((prev) => prev.slice(0, -1));
        return;
      }

      if (e.key === 'Enter' || e.key === 'Escape') {
        if (activeConnectorPoints.length >= 2 && canEditR.current) {
          const id = generateId();
          const conn: Connector = {
            id, elementId: id, kind: 'connector',
            points: normalizeConnectorPoints([...activeConnectorPoints], connectorModeR.current),
            color: colorR.current, width: lineWidthR.current, opacity: opacityR.current,
            timestamp: Date.now(),
            mode: connectorModeR.current,
            borderRadius: connectorRoundedR.current ? 12 : 0,
            dashed: false,
            arrowStart: connectorHeadR.current === 'both',
            arrowEnd: connectorHeadR.current !== 'none',
            arrowHeadStyle: connectorHeadStyleR.current,
            arrowTailStyle: connectorHeadR.current === 'both' ? connectorHeadStyleR.current : 'none',
          };
          addElement(conn);
          onElementAdd(conn, toAPI(conn));
          pushHistory([...elementsR.current, conn]);
          scheduleThumbnail();
        }
        setActiveConnectorPoints([]);
        setConnectorEditing(null);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') spaceDown.current = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [activeConnectorPoints, addElement, onElementAdd, pushHistory, scheduleThumbnail]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const editing = connectorEditingR.current;
      if (!editing || !canEditR.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      const raw = screenToCanvas(e.clientX - r.left, e.clientY - r.top, vpR.current);
      const pt = getPointForTool(raw, 'connector');

      const current = elementsR.current.find((el) => isConnector(el) && el.id === editing.id) as Connector | undefined;
      if (!current || !current.points[editing.nodeIndex]) return;

      const points = [...current.points];
      points[editing.nodeIndex] = pt;
      const next = normalizeConnectorPoints(points, current.mode ?? 'polyline');
      updateElement(current.id, { points: next } as any);
    };

    const onPointerUp = () => {
      const editing = connectorEditingR.current;
      if (!editing) return;
      connectorEditingR.current = null;
      setConnectorEditing(null);
      const after = useCanvasStore.getState().elements.find((el) => el.id === editing.id);
      if (after) onElementModify(after, toAPI(after));
      pushHistory([...useCanvasStore.getState().elements]);
      scheduleThumbnail();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [getPointForTool, onElementModify, pushHistory, scheduleThumbnail, updateElement]);

  // ── Pointer handlers ─────────────────────────────────────────────────────────
  const toPt = useCallback((clientX: number, clientY: number): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const r = canvasRef.current.getBoundingClientRect();
    return screenToCanvas(clientX - r.left, clientY - r.top, vpR.current);
  }, []);

  const onDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    canvasRef.current!.setPointerCapture(e.pointerId);
    const rawPt = toPt(e.clientX, e.clientY);
    const effectiveTool = spaceDown.current ? 'pan' : toolR.current;
    const pt = getPointForTool(rawPt, effectiveTool);

    if (effectiveTool === 'connector') {
      if (!canEditR.current) return;

      if (connectorModeR.current === 'straight') {
        if (activeConnectorPoints.length === 0) {
          setActiveConnectorPoints([pt]);
        } else {
          const points = normalizeConnectorPoints([activeConnectorPoints[0], pt], 'straight');
          const id = generateId();
          const conn: Connector = {
            id, elementId: id, kind: 'connector',
            points,
            color: colorR.current,
            width: lineWidthR.current,
            opacity: opacityR.current,
            timestamp: Date.now(),
            mode: 'straight',
            borderRadius: 0,
            dashed: false,
            arrowStart: connectorHeadR.current === 'both',
            arrowEnd: connectorHeadR.current !== 'none',
            arrowHeadStyle: connectorHeadStyleR.current,
            arrowTailStyle: connectorHeadR.current === 'both' ? connectorHeadStyleR.current : 'none',
          };
          addElement(conn);
          onElementAdd(conn, toAPI(conn));
          pushHistory([...elementsR.current, conn]);
          scheduleThumbnail();
          setActiveConnectorPoints([]);
        }
      } else {
        const next = [...activeConnectorPoints, pt];
        if (e.detail >= 2 && next.length >= 2) {
          const id = generateId();
          const conn: Connector = {
            id, elementId: id, kind: 'connector',
            points: normalizeConnectorPoints(next, 'polyline'),
            color: colorR.current,
            width: lineWidthR.current,
            opacity: opacityR.current,
            timestamp: Date.now(),
            mode: 'polyline',
            borderRadius: connectorRoundedR.current ? 12 : 0,
            dashed: false,
            arrowStart: connectorHeadR.current === 'both',
            arrowEnd: connectorHeadR.current !== 'none',
            arrowHeadStyle: connectorHeadStyleR.current,
            arrowTailStyle: connectorHeadR.current === 'both' ? connectorHeadStyleR.current : 'none',
          };
          addElement(conn);
          onElementAdd(conn, toAPI(conn));
          pushHistory([...elementsR.current, conn]);
          scheduleThumbnail();
          setActiveConnectorPoints([]);
        } else {
          setActiveConnectorPoints(next);
        }
      }

      return;
    }

    setActiveConnectorPoints([]);

    if (effectiveTool === 'pan') { isPanning.current = true; return; }

    if (effectiveTool === 'select') {
      // Hit-test backwards (top z-index first) for canvas-rendered elements
      for (let i = elementsR.current.length - 1; i >= 0; i--) {
        const el = elementsR.current[i];
        if (isFlowchart(el) || isTextElement(el)) continue;

        let isHit = false;
        if (isStroke(el) && el.bounds) {
          const { minX, minY, maxX, maxY } = el.bounds;
          if (pt.x >= minX - 10 && pt.x <= maxX + 10 && pt.y >= minY - 10 && pt.y <= maxY + 10) {
            isHit = el.points.some(p => isNear(p, pt, 15));
          }
        } else if (isConnector(el)) {
          const b = connectorBounds(el.points);
          if (pt.x >= b.minX - 12 && pt.x <= b.maxX + 12 && pt.y >= b.minY - 12 && pt.y <= b.maxY + 12) {
            isHit = isPointNearConnector(pt, el, 12);
          }
        } else if (isShape(el)) {
          const minX = Math.min(el.x, el.x + el.width);
          const maxX = Math.max(el.x, el.x + el.width);
          const minY = Math.min(el.y, el.y + el.height);
          const maxY = Math.max(el.y, el.y + el.height);
          const rx = Math.max(20, el.strokeWidth * 3);
          isHit = pt.x >= minX - rx && pt.x <= maxX + rx && pt.y >= minY - rx && pt.y <= maxY + rx;
        }

        if (isHit) {
          if (e.shiftKey) {
            // Shift+click: toggle this element in/out of selection
            const already = selectedIdsR.current.includes(el.id);
            setSelectedIds(already
              ? selectedIdsR.current.filter(id => id !== el.id)
              : [...selectedIdsR.current, el.id]
            );
          } else {
            if (!selectedIdsR.current.includes(el.id)) setSelectedIds([el.id]);
          }

          setConnectorEditing(null);

          isDraggingSelection.current = true;
          dragLastPos.current = pt;
          selectionHasMoved.current = false;
          return;
        }
      }

      // Nothing hit — start marquee or clear selection
      if (!e.shiftKey) clearSelection();
      setConnectorEditing(null);
      isMarqueeSelecting.current = true;
      marqueeStart.current = pt;
      marqueeEnd.current = pt;
      return;
    }

    clearSelection();
    setConnectorEditing(null);
    if (!canEditR.current) return;

    drawing.current = true;
    const startPoint = effectiveTool === 'draw' ? rawPt : pt;
    livePoints.current = [startPoint];
    shapeStart.current = startPoint;
    strokeId.current = generateId();
    eraserPos.current = rawPt;
  }, [
    toPt,
    clearSelection,
    setSelectedIds,
    getPointForTool,
    activeConnectorPoints,
    addElement,
    onElementAdd,
    pushHistory,
    scheduleThumbnail,
  ]);

  const onMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rawPt = toPt(e.clientX, e.clientY);
    const effectiveTool = spaceDown.current ? 'pan' : toolR.current;
    const pt = getPointForTool(rawPt, effectiveTool);
    setCursorCanvasPt(pt);

    if (effectiveTool === 'draw' && strokeTypeR.current === 'eraser') eraserPos.current = rawPt;
    onCursorMove(rawPt.x, rawPt.y);

    if (isPanning.current) { panViewport(e.movementX, e.movementY); return; }

    // Marquee update
    if (isMarqueeSelecting.current && marqueeStart.current) {
      marqueeEnd.current = pt;
      return;
    }

    if (effectiveTool === 'select' && isDraggingSelection.current && dragLastPos.current && canEditR.current) {
      const dx = pt.x - dragLastPos.current.x;
      const dy = pt.y - dragLastPos.current.y;
      dragLastPos.current = pt;
      selectionHasMoved.current = true;
      const currentEls = useCanvasStore.getState().elements;
      const newEls = currentEls.map(el => {
        if (!selectedIdsR.current.includes(el.id)) return el;
        if (isStroke(el)) {
          const shifted = el.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
          return { ...el, points: shifted, bounds: calculateBounds(shifted) };
        } else if (isConnector(el)) {
          const shifted = el.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
          return { ...el, points: shifted };
        } else if (isShape(el) || isTextElement(el) || isFlowchart(el)) {
          return { ...el, x: el.x + dx, y: el.y + dy };
        }
        return el;
      });
      replaceElements(() => newEls);
      selectedIdsR.current.forEach(id => {
        const after = newEls.find(e => e.id === id);
        if (after) onElementModify(after as any, toAPI(after as any));
      });
      return;
    }

    if (!drawing.current || !canEditR.current) return;

    if (effectiveTool === 'draw') {
      if (strokeTypeR.current === 'eraser') {
        eraserPos.current = rawPt;
        const radius = lineWidthR.current * 6;
        const { elements: next, deleted, added } = erasePoint(elementsR.current, rawPt, radius);
        if (deleted.length > 0) {
          replaceElements(() => next);
          deleted.forEach((id) => markDeleted(id));
          onElementDelete(deleted);
          added.forEach((el) => onElementAdd(el, toAPI(el)));
        }
      } else {
        livePoints.current = [...livePoints.current, rawPt];
        onStrokePreview(livePoints.current, { strokeType: strokeTypeR.current, color: colorR.current, width: lineWidthR.current });
      }
    }

    if (effectiveTool === 'shape' || effectiveTool === 'flowchart') {
      livePoints.current = [shapeStart.current!, pt];
    }
  }, [toPt, panViewport, replaceElements, markDeleted, onElementAdd, onElementDelete, onCursorMove, onStrokePreview, getPointForTool]);

  // Handle global up (catches drops outside canvas)
  useEffect(() => {
    const handleGlobalUp = () => {
      // Commit marquee selection
      if (isMarqueeSelecting.current && marqueeStart.current && marqueeEnd.current) {
        const ms = marqueeStart.current;
        const me = marqueeEnd.current;
        const minX = Math.min(ms.x, me.x);
        const maxX = Math.max(ms.x, me.x);
        const minY = Math.min(ms.y, me.y);
        const maxY = Math.max(ms.y, me.y);
        // Only commit if marquee has real area (>5px in canvas space)
        if (maxX - minX > 5 || maxY - minY > 5) {
          const hits = elementsR.current
            .filter(el => {
              if (isStroke(el) && el.bounds) {
                return el.bounds.minX >= minX && el.bounds.maxX <= maxX &&
                       el.bounds.minY >= minY && el.bounds.maxY <= maxY;
              } else if (isConnector(el)) {
                const b = connectorBounds(el.points);
                return b.minX >= minX && b.maxX <= maxX && b.minY >= minY && b.maxY <= maxY;
              } else if (isShape(el)) {
                return el.x >= minX && el.x + el.width <= maxX &&
                       el.y >= minY && el.y + el.height <= maxY;
              } else if (isFlowchart(el) || isTextElement(el)) {
                return (el as any).x >= minX && (el as any).x + (el as any).width <= maxX &&
                       (el as any).y >= minY && (el as any).y + (el as any).height <= maxY;
              }
              return false;
            })
            .map(el => el.id);
          if (hits.length > 0) setSelectedIds(hits);
        }
        isMarqueeSelecting.current = false;
        marqueeStart.current = null;
        marqueeEnd.current = null;
      }

      if (isDraggingSelection.current) {
        isDraggingSelection.current = false;
        dragLastPos.current = null;
        if (canEditR.current && selectionHasMoved.current) pushHistory([...elementsR.current]);
      }
    };
    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, [pushHistory, setSelectedIds]);

  const onUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    isPanning.current = false;
    
    // We still keep local fallback clear
    if (isDraggingSelection.current) {
      isDraggingSelection.current = false;
      dragLastPos.current = null;
      if (canEditR.current && selectionHasMoved.current) {
         pushHistory([...elementsR.current]);
      }
    }
    
    if (!drawing.current) return;
    drawing.current = false;

    const rawPt = toPt(e.clientX, e.clientY);
    const effectiveTool = spaceDown.current ? 'pan' : toolR.current;
    const pt = getPointForTool(rawPt, effectiveTool);

    if (effectiveTool === 'draw' && canEditR.current && strokeTypeR.current !== 'eraser' && livePoints.current.length >= 2) {
      const id = strokeId.current;
      const newStroke: Stroke = {
        id, elementId: id, kind: 'stroke',
        type: strokeTypeR.current, points: [...livePoints.current],
        color: colorR.current, width: lineWidthR.current, opacity: opacityR.current,
        timestamp: Date.now(), bounds: calculateBounds(livePoints.current),
      } as Stroke;
      addElement(newStroke);
      pushHistory([...elementsR.current, newStroke]);
      onElementAdd(newStroke, toAPI(newStroke));
      scheduleThumbnail();
    }

    if (effectiveTool === 'shape' && canEditR.current && shapeStart.current) {
      const sw = Math.abs(pt.x - shapeStart.current.x), sh = Math.abs(pt.y - shapeStart.current.y);
      // Stamp mode: if very little drag occurred, place default size box
      if (sw < 5 && sh < 5) {
        const id = generateId(); const sw = 160; const sh = 80;
        const sx = pt.x - 80, sy = pt.y - 40;
        const newShape: Shape = {
          id, elementId: id, kind: 'shape', type: shapeTypeR.current,
          x: sx, y: sy, width: sw, height: sh,
          color: colorR.current, fillColor: 'transparent',
          strokeWidth: lineWidthR.current, opacity: opacityR.current, rotation: 0,
          timestamp: Date.now(),
        } as Shape;
        addElement(newShape);
        pushHistory([...elementsR.current, newShape]);
        onElementAdd(newShape, toAPI(newShape));
        setSelectedIds([id]);
        setTool('select');
        return;
      }
      const sx = Math.min(shapeStart.current.x, pt.x), sy = Math.min(shapeStart.current.y, pt.y);
      if (sw > 4 && sh > 4) {
        const id = generateId();
        const newShape: Shape = {
          id, elementId: id, kind: 'shape', type: shapeTypeR.current,
          x: sx, y: sy, width: sw, height: sh,
          color: colorR.current, fillColor: 'transparent',
          strokeWidth: lineWidthR.current, opacity: opacityR.current, rotation: 0,
          timestamp: Date.now(),
        } as Shape;
        addElement(newShape);
        pushHistory([...elementsR.current, newShape]);
        onElementAdd(newShape, toAPI(newShape));
        scheduleThumbnail();
      }
    }

    if (effectiveTool === 'flowchart' && canEditR.current && shapeStart.current) {
      const sw_drag = Math.abs(pt.x - shapeStart.current.x), sh_drag = Math.abs(pt.y - shapeStart.current.y);
      const defaults = FLOWCHART_DEFAULTS[fcShapeR.current];
      let sw = defaults.width, sh = defaults.height, sx = pt.x - sw/2, sy = pt.y - sh/2;

      // If dragged, use drag bounds instead of defaults
      if (sw_drag > 10 || sh_drag > 10) {
        sx = Math.min(shapeStart.current.x, pt.x); sy = Math.min(shapeStart.current.y, pt.y);
        sw = sw_drag; sh = sh_drag;
      }

      const id = generateId();
      const newFC: FlowchartElement = {
        id, elementId: id, kind: 'flowchart', shapeType: fcShapeR.current,
        x: sx, y: sy, width: sw, height: sh, label: '',
        color: defaults.color, fillColor: defaults.fillColor,
        strokeWidth: lineWidthR.current, opacity: opacityR.current, rotation: 0,
        fontSize: 14, fontFamily: 'Inter', timestamp: Date.now(),
      } as FlowchartElement;
      
      addElement(newFC);
      pushHistory([...elementsR.current, newFC]);
      onElementAdd(newFC, toAPI(newFC));
      setSelectedIds([id]);
      setTool('select');
      scheduleThumbnail();
    }

    if (effectiveTool === 'text' && canEditR.current) {
      const id = generateId();
      const newText: TextElement = {
        id, elementId: id, kind: 'text',
        x: pt.x, y: pt.y, text: '',
        color: colorR.current,
        fontSize: Math.max(12, lineWidthR.current * 4),
        fontFamily: 'Inter, sans-serif',
        opacity: opacityR.current, rotation: 0,
        timestamp: Date.now(),
      } as TextElement;
      
      addElement(newText);
      const { setSelectedIds, setTool } = useCanvasStore.getState();
      setSelectedIds([id]);
      setTool('select');
      
      onElementAdd(newText, toAPI(newText));
    }

    livePoints.current = [];
    shapeStart.current = null;
  }, [toPt, addElement, pushHistory, onElementAdd, getPointForTool, scheduleThumbnail, setSelectedIds, setTool]);

  // Cursor style
  const cursorStyle = (() => {
    const t = spaceDown.current ? 'pan' : tool;
    if (t === 'pan') return 'grab';
    if (t === 'draw' && strokeType === 'eraser') return 'none';
    if (t === 'draw') return 'crosshair';
    if (t === 'text') return 'text';
    return 'default';
  })();

  const fcElements = elements.filter(isFlowchart) as FlowchartElement[];
  const connectorElements = elements.filter(isConnector) as Connector[];
  const textElements = elements.filter(isTextElement) as TextElement[];
  const selectedConnector = selectedIds.length === 1
    ? connectorElements.find((c) => c.id === selectedIds[0]) ?? null
    : null;

  const beginConnectorNodeDrag = (id: string, nodeIndex: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canEdit || tool !== 'select') return;
    e.preventDefault();
    e.stopPropagation();
    setConnectorEditing({ id, nodeIndex });
  };

  const insertConnectorNode = (id: string, index: number, point: Point) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canEdit || tool !== 'select') return;
    e.preventDefault();
    e.stopPropagation();

    const connector = elementsR.current.find((el) => isConnector(el) && el.id === id) as Connector | undefined;
    if (!connector) return;

    const points = [...connector.points];
    points.splice(index, 0, point);
    updateElement(id, { points, mode: 'polyline' } as any);
    const after = useCanvasStore.getState().elements.find((el) => el.id === id);
    if (after) onElementModify(after, toAPI(after));
    setConnectorEditing({ id, nodeIndex: index });
  };

  return (
    <div ref={containerRef} id="drawsync-canvas-container" className="relative w-full h-full overflow-hidden">
      {/* Canvas 2D layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: cursorStyle, touchAction: 'none' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => { eraserPos.current = null; }}
      />

      {/* HTML layer: flowchart + text */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
        <FlowchartOverlay
          elements={fcElements}
          viewport={viewport}
          selectedIds={selectedIds}
          onSelectId={(id, shiftKey) => {
            if (shiftKey) {
              const already = selectedIds.includes(id);
              setSelectedIds(already ? selectedIds.filter(s => s !== id) : [...selectedIds, id]);
            } else {
              setSelectedIds([id]);
            }
          }}
          onModify={(el) => { onElementModify(el, toAPI(el)); }}
          canEdit={canEdit}
        />
        <TextLayer
          elements={textElements}
          viewport={viewport}
          onModify={(el) => { onElementModify(el, toAPI(el)); }}
          onDelete={(id) => { 
             useCanvasStore.getState().markDeleted(id); 
             useCanvasStore.getState().removeElement(id); 
             onElementDelete([id]); 
          }}
          onDragStart={(e, id) => {
            if (tool === 'select') {
               setSelectedIds([id]);
               isDraggingSelection.current = true;
               dragLastPos.current = toPt(e.clientX, e.clientY);
               selectionHasMoved.current = false;
            }
          }}
        />
        <TransformOverlay elements={elements} viewport={viewport} onModify={(el) => onElementModify(el, toAPI(el))} />
        {selectedConnector && tool === 'select' && canEdit && (
          <>
            {selectedConnector.points.map((p, idx) => {
              const size = Math.max(8, 10 * viewport.zoom);
              const active = connectorEditing?.id === selectedConnector.id && connectorEditing.nodeIndex === idx;
              return (
                <div
                  key={`${selectedConnector.id}-node-${idx}`}
                  className="absolute pointer-events-auto rounded-full border-2 border-emerald-500 bg-white shadow-sm"
                  style={{
                    left: p.x * viewport.zoom + viewport.x - size / 2,
                    top: p.y * viewport.zoom + viewport.y - size / 2,
                    width: size,
                    height: size,
                    cursor: 'move',
                    boxShadow: active ? '0 0 0 3px rgba(16,185,129,0.25)' : undefined,
                  }}
                  onPointerDown={beginConnectorNodeDrag(selectedConnector.id, idx)}
                />
              );
            })}
            {connectorMidpoints(selectedConnector.points).map((mid) => {
              const size = Math.max(6, 8 * viewport.zoom);
              return (
                <div
                  key={`${selectedConnector.id}-mid-${mid.index}`}
                  className="absolute pointer-events-auto rounded-full border border-emerald-300 bg-emerald-100"
                  style={{
                    left: mid.x * viewport.zoom + viewport.x - size / 2,
                    top: mid.y * viewport.zoom + viewport.y - size / 2,
                    width: size,
                    height: size,
                    cursor: 'copy',
                  }}
                  onPointerDown={insertConnectorNode(selectedConnector.id, mid.index, { x: mid.x, y: mid.y })}
                />
              );
            })}
          </>
        )}
        {selectedIds.length === 1 && (textElements.find(e => e.id === selectedIds[0]) || fcElements.find(e => e.id === selectedIds[0]) || elements.find(e => e.kind === 'shape' && e.id === selectedIds[0])) && canEdit && (
          <FloatingTextToolbar
            element={(textElements.find(e => e.id === selectedIds[0]) || fcElements.find(e => e.id === selectedIds[0]) || elements.find(e => e.id === selectedIds[0]))! as any}
            viewport={viewport}
            onModify={(updates) => {
              const id = selectedIds[0];
              updateElement(id, updates as any);
              const after = useCanvasStore.getState().elements.find(e => e.id === id);
              if (after) onElementModify(after as any, toAPI(after as any));
            }}
          />
        )}
        <SelectionContextMenu 
          onDelete={(ids) => {
             ids.forEach(id => {
               useCanvasStore.getState().markDeleted(id);
               useCanvasStore.getState().removeElement(id);
             });
             onElementDelete(ids);
          }}
          onElementAdd={onElementAdd}
          onElementModify={(el, api) => onElementModify(el, api)}
        />
      </div>

      {/* Remote cursors */}
      <RemoteCursors viewport={viewport} />
    </div>
  );
}
