'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: app/canvas/components/FlowchartTools.tsx

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  FlowchartElement, FlowchartShapeType, GhostSuggestion,
  Point, FLOWCHART_DEFAULTS, Viewport
} from '../core/types';
import { generateId } from '../core/utils';

export function buildFlowchartPath(shapeType: FlowchartShapeType, x: number, y: number, w: number, h: number): string {
  switch (shapeType) {
    case 'rectangle':
      return `M${x},${y} h${w} v${h} h${-w} Z`;
    case 'rounded_rect': {
      const r = Math.min(h / 2, 20);
      return `M${x + r},${y} h${w - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(w - 2 * r)} a${r},${r} 0 0 1 ${-r},${-r} v${-(h - 2 * r)} a${r},${r} 0 0 1 ${r},${-r} Z`;
    }
    case 'diamond': {
      const mx = x + w / 2, my = y + h / 2;
      return `M${mx},${y} L${x + w},${my} L${mx},${y + h} L${x},${my} Z`;
    }
    case 'parallelogram': {
      const offset = w * 0.15;
      return `M${x + offset},${y} h${w - offset} L${x + w - offset},${y + h} h${-(w - offset)} Z`;
    }
    case 'hexagon': {
      const mx = x + w / 2;
      const side = w * 0.2;
      return `M${x + side},${y} h${w - 2 * side} L${x + w},${y + h / 2} L${x + w - side},${y + h} h${-(w - 2 * side)} L${x},${y + h / 2} Z`;
    }
    case 'circle': {
      const rx = w / 2, ry = h / 2, cx = x + rx, cy = y + ry;
      return `M${cx - rx},${cy} a${rx},${ry} 0 1 0 ${2 * rx},0 a${rx},${ry} 0 1 0 ${-2 * rx},0`;
    }
    case 'cylinder': {
      const rx = w / 2, ry = Math.min(h * 0.2, 16);
      return [
        `M${x},${y + ry}`,
        `a${rx},${ry} 0 0 0 ${w},0`,
        `v${h - 2 * ry}`,
        `a${rx},${ry} 0 0 1 ${-w},0`,
        `Z`,
        `M${x},${y + ry} a${rx},${ry} 0 0 1 ${w},0`,
      ].join(' ');
    }
    default:
      return `M${x},${y} h${w} v${h} h${-w} Z`;
  }
}

interface FlowchartShapeProps {
  element: FlowchartElement;
  viewport: Viewport;
  isSelected?: boolean;
  isEditing?: boolean;
  onSelect?: (id: string) => void;
  onDoubleClick?: (id: string) => void;
  onLabelChange?: (id: string, label: string) => void;
  onDragEnd?: (id: string, dx: number, dy: number) => void;
  canEdit: boolean;
}

export const FlowchartShape: React.FC<FlowchartShapeProps> = ({
  element, viewport, isSelected, isEditing,
  onSelect, onDoubleClick, onLabelChange, onDragEnd, canEdit,
}) => {
  const [editText, setEditText] = useState(element.label || '');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragStart = useRef<{ mx: number; my: number; ex: number; ey: number } | null>(null);

  const sx = element.x * viewport.zoom + viewport.x;
  const sy = element.y * viewport.zoom + viewport.y;
  const sw = element.width  * viewport.zoom;
  const sh = element.height * viewport.zoom;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      setEditText(element.label || '');
    }
  }, [isEditing, element.label]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canEdit) return;
    e.stopPropagation();
    onSelect?.(element.id);
    dragStart.current = { mx: e.clientX, my: e.clientY, ex: element.x, ey: element.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current || !canEdit) return;
    const dx = (e.clientX - dragStart.current.mx) / viewport.zoom;
    const dy = (e.clientY - dragStart.current.my) / viewport.zoom;
    (e.currentTarget as HTMLElement).style.transform = `translate(${dx * viewport.zoom}px, ${dy * viewport.zoom}px)`;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStart.current || !canEdit) return;
    const dx = (e.clientX - dragStart.current.mx) / viewport.zoom;
    const dy = (e.clientY - dragStart.current.my) / viewport.zoom;
    (e.currentTarget as HTMLElement).style.transform = '';
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      onDragEnd?.(element.id, dx, dy);
    }
    dragStart.current = null;
  };

  const path = buildFlowchartPath(element.shapeType, 0, 0, sw, sh);

  return (
    <div
      className="absolute"
      style={{
        left: sx, top: sy, width: sw, height: sh,
        cursor: canEdit ? 'move' : 'default',
        userSelect: 'none',
        // FIX: pointer-events must be 'auto' on each shape individually.
        // The parent wrapper is pointer-events-none so clicks pass through
        // to the canvas. Only the shape elements themselves capture events.
        pointerEvents: canEdit ? 'auto' : 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={() => canEdit && onDoubleClick?.(element.id)}
    >
      <svg width={sw} height={sh} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        {element.shapeType === 'cylinder' && (() => {
          const rx = sw / 2, ry = Math.min(sh * 0.2, 16);
          return (
            <>
              <ellipse cx={rx} cy={sh - ry} rx={rx} ry={ry}
                fill={element.fillColor} stroke={element.color} strokeWidth={element.strokeWidth} />
              <rect x={0} y={ry} width={sw} height={sh - 2 * ry}
                fill={element.fillColor} stroke="none" />
              <ellipse cx={rx} cy={ry} rx={rx} ry={ry}
                fill={element.fillColor} stroke={element.color} strokeWidth={element.strokeWidth} />
              <line x1={0} y1={ry} x2={0} y2={sh - ry} stroke={element.color} strokeWidth={element.strokeWidth} />
              <line x1={sw} y1={ry} x2={sw} y2={sh - ry} stroke={element.color} strokeWidth={element.strokeWidth} />
            </>
          );
        })()}
        {element.shapeType !== 'cylinder' && (
          <path
            d={path}
            fill={element.fillColor || '#dbeafe'}
            stroke={isSelected ? '#10b981' : element.color}
            strokeWidth={isSelected ? element.strokeWidth + 1 : element.strokeWidth}
            strokeDasharray={element.dashed ? '6 4' : undefined}
            opacity={element.opacity}
          />
        )}
        {isSelected && (
          <path d={path} fill="none" stroke="#10b981" strokeWidth={2}
            strokeDasharray="5 3" opacity={0.8} />
        )}
      </svg>

      {isEditing ? (
        <textarea
          ref={inputRef}
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onBlur={() => { onLabelChange?.(element.id, editText); }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onLabelChange?.(element.id, editText); }
            if (e.key === 'Escape') { onLabelChange?.(element.id, element.label || ''); }
          }}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'transparent', border: 'none', outline: 'none', resize: 'none',
            textAlign: 'center', display: 'flex', alignItems: 'center',
            fontSize: (element.fontSize || 13) * viewport.zoom,
            fontFamily: element.fontFamily || 'Inter, sans-serif',
            color: element.color, padding: '4px 8px', lineHeight: '1.3',
            cursor: 'text', boxSizing: 'border-box',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center',
          fontSize: (element.fontSize || 13) * viewport.zoom,
          fontFamily: element.fontFamily || 'Inter, sans-serif',
          color: element.color, fontWeight: 500,
          pointerEvents: 'none',
          padding: '4px 8px', wordBreak: 'break-word', lineHeight: '1.3',
        }}>
          {element.label || (isSelected ? 'Double-click to edit' : '')}
        </div>
      )}
    </div>
  );
};

interface ConnectorProps {
  element: FlowchartElement;
  elements: FlowchartElement[];
  viewport: Viewport;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  canEdit: boolean;
}

export const FlowchartConnector: React.FC<ConnectorProps> = ({
  element, elements, viewport, isSelected, onSelect, canEdit,
}) => {
  const from = elements.find(e => e.id === element.fromId);
  const to   = elements.find(e => e.id === element.toId);

  let x1: number, y1: number, x2: number, y2: number;

  if (from && to) {
    x1 = (from.x + from.width / 2)  * viewport.zoom + viewport.x;
    y1 = (from.y + from.height / 2) * viewport.zoom + viewport.y;
    x2 = (to.x   + to.width / 2)    * viewport.zoom + viewport.x;
    y2 = (to.y   + to.height / 2)   * viewport.zoom + viewport.y;
  } else if (element.points && element.points.length >= 2) {
    const p0 = element.points[0];
    const p1 = element.points[element.points.length - 1];
    x1 = p0.x * viewport.zoom + viewport.x;
    y1 = p0.y * viewport.zoom + viewport.y;
    x2 = p1.x * viewport.zoom + viewport.x;
    y2 = p1.y * viewport.zoom + viewport.y;
  } else return null;

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const aw = 10;
  const ax1 = x2 - aw * Math.cos(angle - Math.PI / 8);
  const ay1 = y2 - aw * Math.sin(angle - Math.PI / 8);
  const ax2 = x2 - aw * Math.cos(angle + Math.PI / 8);
  const ay2 = y2 - aw * Math.sin(angle + Math.PI / 8);

  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const perp = { x: -(y2 - y1) * 0.15, y: (x2 - x1) * 0.15 };

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 5 }}
    >
      <path
        d={`M${x1},${y1} Q${mx + perp.x},${my + perp.y} ${x2},${y2}`}
        stroke={isSelected ? '#10b981' : element.color || '#6b7280'}
        strokeWidth={(element.strokeWidth || 2) * viewport.zoom}
        fill="none"
        strokeDasharray={element.dashed ? '6 4' : undefined}
        style={{ cursor: canEdit ? 'pointer' : 'default', pointerEvents: 'stroke' }}
        onClick={() => onSelect?.(element.id)}
      />
      {element.arrowEnd !== false && (
        <polygon points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`}
          fill={element.color || '#6b7280'} />
      )}
      <path
        d={`M${x1},${y1} Q${mx + perp.x},${my + perp.y} ${x2},${y2}`}
        stroke="transparent" strokeWidth={16} fill="none"
        style={{ cursor: canEdit ? 'pointer' : 'default', pointerEvents: 'stroke' }}
        onClick={() => onSelect?.(element.id)}
      />
    </svg>
  );
};

interface GhostOverlayProps {
  ghost: GhostSuggestion | null;
  viewport: Viewport;
  onAccept: () => void;
  aiEnabled: boolean;
}

export const GhostOverlay: React.FC<GhostOverlayProps> = ({ ghost, viewport, onAccept, aiEnabled }) => {
  useEffect(() => {
    if (!ghost || !aiEnabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab') { e.preventDefault(); onAccept(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ghost, aiEnabled, onAccept]);

  if (!ghost || !aiEnabled) return null;

  const sx = ghost.x * viewport.zoom + viewport.x;
  const sy = ghost.y * viewport.zoom + viewport.y;
  const sw = ghost.width  * viewport.zoom;
  const sh = ghost.height * viewport.zoom;
  const path = buildFlowchartPath(ghost.shapeType, 0, 0, sw, sh);
  const defaults = FLOWCHART_DEFAULTS[ghost.shapeType];

  return (
    <div className="absolute pointer-events-none"
      style={{ left: sx, top: sy, width: sw, height: Math.max(sh, 1), zIndex: 15 }}>
      <svg width={sw} height={Math.max(sh, 2)} style={{ overflow: 'visible', opacity: 0.35 }}>
        <path d={path} fill={defaults.fillColor} stroke={defaults.color}
          strokeWidth={2} strokeDasharray="6 4" />
      </svg>
      {ghost.label && sh > 20 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12 * viewport.zoom, color: defaults.color,
          opacity: 0.5, fontStyle: 'italic', pointerEvents: 'none',
        }}>
          {ghost.label}
        </div>
      )}
      <div style={{
        position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
        background: '#1e293b', color: '#f8fafc',
        borderRadius: 6, padding: '2px 8px',
        fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', opacity: 0.8, pointerEvents: 'none',
      }}>
        Press Tab to accept
      </div>
    </div>
  );
};

export function detectShapeFromStroke(points: Point[]): GhostSuggestion | null {
  if (points.length < 5) return null;
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX, h = maxY - minY;
  if (w < 20 && h < 20) return null;

  const first = points[0], last = points[points.length - 1];
  const closeDist = Math.hypot(last.x - first.x, last.y - first.y);
  const isClosed = closeDist < Math.max(w, h) * 0.3;
  const aspectRatio = w / Math.max(h, 1);

  let shapeType: FlowchartShapeType | null = null;

  if (isClosed) {
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const avgR = points.reduce((sum, p) => sum + Math.hypot(p.x - cx, p.y - cy), 0) / points.length;
    const variance = points.reduce((sum, p) => sum + Math.abs(Math.hypot(p.x - cx, p.y - cy) - avgR), 0) / points.length;
    if (variance / avgR < 0.25 && Math.abs(aspectRatio - 1) < 0.4) {
      shapeType = 'circle';
    } else if (aspectRatio > 0.5 && aspectRatio < 2.0) {
      const topPoints = points.filter(p => p.y < minY + h * 0.2);
      const topSpread = topPoints.length > 0
        ? Math.max(...topPoints.map(p => p.x)) - Math.min(...topPoints.map(p => p.x))
        : w;
      shapeType = topSpread < w * 0.4 ? 'diamond' : 'rectangle';
    }
  } else {
    if (w > 40 || h > 40) shapeType = 'connector';
  }

  if (!shapeType) return null;
  const padding = 10;
  return {
    type: 'shape_complete', shapeType,
    x: minX - padding, y: minY - padding,
    width:  shapeType === 'circle' ? Math.max(w, h) + padding * 2 : w + padding * 2,
    height: shapeType === 'circle' ? Math.max(w, h) + padding * 2 : h + padding * 2,
    opacity: 0.35, triggerSource: 'drawing',
  };
}

import { FLOWCHART_KEYWORDS } from '../core/types';

export function detectShapeFromText(
  text: string, cursorX: number, cursorY: number,
): GhostSuggestion | null {
  const lower = text.toLowerCase().trim();
  if (!lower) return null;
  let matched: FlowchartShapeType | null = null;
  for (const [kw, shape] of Object.entries(FLOWCHART_KEYWORDS)) {
    if (lower.includes(kw)) { matched = shape; break; }
  }
  if (!matched) return null;
  const defaults = FLOWCHART_DEFAULTS[matched];
  return {
    type: 'next_shape', shapeType: matched,
    x: cursorX, y: cursorY,
    width: defaults.width, height: defaults.height,
    label: text.trim(), opacity: 0.35,
    triggerSource: 'typing', promptText: text,
  };
}

export function acceptGhost(
  ghost: GhostSuggestion, userId: string, existingElements: FlowchartElement[],
): FlowchartElement {
  const defaults = FLOWCHART_DEFAULTS[ghost.shapeType];
  const id = generateId();
  return {
    id, elementId: id, kind: 'flowchart',
    shapeType: ghost.shapeType,
    x: ghost.x, y: ghost.y,
    width:  ghost.width  || defaults.width,
    height: ghost.height || defaults.height,
    label: ghost.label || '',
    color: defaults.color, fillColor: defaults.fillColor,
    strokeWidth: 2, opacity: 1, rotation: 0,
    fontSize: 13, fontFamily: 'Inter, sans-serif',
    timestamp: Date.now(), createdBy: userId,
  };
}