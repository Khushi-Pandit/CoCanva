// ── Element serialization: API ↔ DrawableElement ───────────────────────────────
import {
  DrawableElement, Stroke, Shape, FlowchartElement, TextElement, Connector,
  StrokeType, FlowchartShapeType, ShapeType,
} from '@/types/element';

const FLOWCHART_SUBTYPES = new Set(['diamond', 'rounded_rect', 'parallelogram', 'cylinder', 'hexagon', 'connector']);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromAPI(raw: any): DrawableElement | null {
  try {
    if (!raw) return null;
    const id = raw.elementId || raw.id;
    if (!id) return null;

    if (raw.type === 'stroke' || raw.kind === 'stroke') {
      return {
        id, elementId: id, kind: 'stroke',
        type: (raw.subtype || raw.strokeType || raw.type || 'pen') as StrokeType,
        points: raw.points ?? [],
        color: raw.strokeColor ?? raw.color ?? '#111827',
        width: raw.strokeWidth ?? 2,
        opacity: raw.opacity ?? 1,
        timestamp: raw.timestamp ?? Date.now(),
        createdBy: raw.createdBy,
        bounds: raw.x !== undefined ? { minX: raw.x, minY: raw.y, maxX: raw.x + (raw.width ?? 0), maxY: raw.y + (raw.height ?? 0) } : undefined,
      } as Stroke;
    }

    if (raw.type === 'connector' || raw.kind === 'connector' || (raw.kind === 'flowchart' && raw.shapeType === 'connector')) {
      const points = Array.isArray(raw.points) && raw.points.length >= 2
        ? raw.points
        : [
            raw.fromPoint ?? { x: raw.x ?? 0, y: raw.y ?? 0 },
            raw.toPoint ?? { x: (raw.x ?? 0) + (raw.width ?? 0), y: (raw.y ?? 0) + (raw.height ?? 0) },
          ];

      return {
        id, elementId: id, kind: 'connector',
        points,
        color: raw.strokeColor ?? raw.color ?? '#6b7280',
        width: raw.strokeWidth ?? raw.width ?? 2,
        opacity: raw.opacity ?? 1,
        mode: (raw.subtype === 'straight' ? 'straight' : 'polyline'),
        borderRadius: raw.roundness ?? raw.borderRadius ?? 12,
        dashed: raw.dashed ?? false,
        arrowStart: raw.arrowStart ?? false,
        arrowEnd: raw.arrowEnd ?? true,
        arrowHeadStyle: raw.arrowHeadStyle ?? 'triangle',
        arrowTailStyle: raw.arrowTailStyle ?? (raw.arrowStart ? 'triangle' : 'none'),
        timestamp: raw.timestamp ?? Date.now(), createdBy: raw.createdBy,
        fromId: raw.fromElementId ?? raw.fromId,
        toId: raw.toElementId ?? raw.toId,
      } as Connector;
    }

    if (raw.type === 'shape' || raw.kind === 'shape') {
      const isFC = raw.isFlowchartEl || FLOWCHART_SUBTYPES.has(raw.subtype) || (raw.label !== undefined && raw.label !== null);
      if (isFC) {
        return {
          id, elementId: id, kind: 'flowchart', shapeType: (raw.subtype ?? raw.shapeType ?? 'rectangle') as FlowchartShapeType,
          x: raw.x ?? 0, y: raw.y ?? 0, width: raw.width ?? 100, height: raw.height ?? 60,
          label: raw.label ?? '', color: raw.strokeColor ?? raw.color ?? '#2563eb',
          fillColor: raw.fillColor ?? '#dbeafe', strokeWidth: raw.strokeWidth ?? 2,
          opacity: raw.opacity ?? 1, rotation: raw.rotation ?? 0,
          fontSize: raw.fontSize ?? 13, fontFamily: raw.fontFamily ?? 'Inter, sans-serif',
          timestamp: raw.timestamp ?? Date.now(), createdBy: raw.createdBy,
        } as FlowchartElement;
      }
      return {
        id, elementId: id, kind: 'shape',
        type: (raw.subtype ?? raw.shapeType ?? raw.type ?? 'rectangle') as ShapeType,
        x: raw.x ?? 0, y: raw.y ?? 0, width: raw.width ?? 100, height: raw.height ?? 100,
        color: raw.strokeColor ?? raw.color ?? '#2563eb',
        fillColor: raw.fillColor, strokeWidth: raw.strokeWidth ?? 2,
        opacity: raw.opacity ?? 1, rotation: raw.rotation ?? 0,
        timestamp: raw.timestamp ?? Date.now(), createdBy: raw.createdBy,
      } as Shape;
    }

    if (raw.type === 'text' || raw.kind === 'text') {
      return {
        id, elementId: id, kind: 'text',
        x: raw.x ?? 0, y: raw.y ?? 0,
        text: raw.text ?? '', fontSize: raw.fontSize ?? 16,
        fontFamily: raw.fontFamily ?? 'Inter, sans-serif',
        color: raw.textColor ?? raw.color ?? '#111827',
        fontWeight: (raw.fontWeight ?? 'normal') as 'normal' | 'bold',
        fontStyle: (raw.fontStyle ?? 'normal') as 'normal' | 'italic',
        textAlign: (raw.textAlign ?? 'left') as 'left' | 'center' | 'right',
        opacity: raw.opacity ?? 1,
        rotation: raw.rotation ?? 0,
        timestamp: raw.timestamp ?? Date.now(), createdBy: raw.createdBy,
      } as TextElement;
    }

    return null;
  } catch { return null; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toAPI(el: DrawableElement): any {
  const base = { elementId: el.id, createdBy: el.createdBy };

  if (el.kind === 'stroke') {
    const pts = el.points;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0; }
    return { ...base, type: 'stroke', subtype: el.type, points: el.points, strokeColor: el.color, strokeWidth: el.width, opacity: el.opacity, x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  if (el.kind === 'flowchart') {
    if (el.shapeType === 'connector') {
      return { ...base, type: 'connector', subtype: 'straight', x: el.x, y: el.y, width: el.width, height: el.height ?? 0, rotation: el.rotation ?? 0, strokeColor: el.color, fillColor: el.fillColor, strokeWidth: el.strokeWidth, opacity: el.opacity, fromElementId: el.fromId, toElementId: el.toId, points: el.points, dashed: el.dashed, arrowEnd: el.arrowEnd, label: el.label };
    }
    return { ...base, type: 'shape', subtype: el.shapeType, x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation ?? 0, label: el.label ?? '', strokeColor: el.color, fillColor: el.fillColor, strokeWidth: el.strokeWidth, opacity: el.opacity, fontSize: el.fontSize, fontFamily: el.fontFamily, isFlowchartEl: true };
  }

  if (el.kind === 'connector') {
    const pts = el.points;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0; }

    return {
      ...base,
      type: 'connector',
      subtype: el.mode ?? (el.points.length === 2 ? 'straight' : 'polyline'),
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      fromPoint: el.points[0],
      toPoint: el.points[el.points.length - 1],
      points: el.points,
      strokeColor: el.color,
      strokeWidth: el.width,
      opacity: el.opacity,
      dashed: el.dashed ?? false,
      fromElementId: el.fromId,
      toElementId: el.toId,
      arrowStart: el.arrowStart ?? false,
      arrowEnd: el.arrowEnd ?? true,
      arrowHeadStyle: el.arrowHeadStyle ?? 'triangle',
      arrowTailStyle: el.arrowTailStyle ?? ((el.arrowStart ?? false) ? 'triangle' : 'none'),
      roundness: el.borderRadius ?? 12,
    };
  }

  if (el.kind === 'shape') {
    return { ...base, type: 'shape', subtype: el.type, x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation ?? 0, strokeColor: el.color, fillColor: el.fillColor, strokeWidth: el.strokeWidth, opacity: el.opacity };
  }

  if (el.kind === 'text') {
    return {
      ...base, type: 'text',
      x: el.x, y: el.y,
      width: 200, height: el.fontSize * 2,
      text: el.text,
      fontSize: el.fontSize,
      fontFamily: el.fontFamily,
      textColor: el.color,
      fontWeight: el.fontWeight ?? 'normal',
      fontStyle: el.fontStyle ?? 'normal',
      textAlign: el.textAlign ?? 'left',
      opacity: el.opacity ?? 1,
      rotation: el.rotation ?? 0,
    };
  }

  return base;
}

export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export function screenToCanvas(sx: number, sy: number, vp: { x: number; y: number; zoom: number }) {
  return { x: (sx - vp.x) / vp.zoom, y: (sy - vp.y) / vp.zoom };
}

export function calculateBounds(points: Array<{ x: number; y: number }>) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

export function isNear(a: { x: number; y: number }, b: { x: number; y: number }, radius: number) {
  return Math.hypot(a.x - b.x, a.y - b.y) < radius;
}
