'use client';
import { useRef, useState, useEffect } from 'react';
import { FlowchartElement, FLOWCHART_DEFAULTS } from '@/types/element';
import { useCanvasStore } from '@/store/canvas.store';
import { generateId, toAPI } from '@/lib/element.transform';

interface FlowchartOverlayProps {
  elements: FlowchartElement[];
  viewport: { x: number; y: number; zoom: number };
  selectedIds: string[];
  onSelectId: (id: string, shiftKey: boolean) => void;
  onModify: (el: FlowchartElement) => void;
  canEdit: boolean;
}

export function FlowchartOverlay({ elements, viewport, selectedIds, onSelectId, onModify, canEdit }: FlowchartOverlayProps) {
  const { fcShape, addElement, pushHistory, elements: allEls } = useCanvasStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ id: string; startX: number; startY: number; elX: number; elY: number } | null>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const vp = viewport;

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus();
  }, [editingId]);

  const shapes = elements.filter((e) => e.shapeType !== 'connector');
  const connectors = elements.filter((e) => e.shapeType === 'connector');

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onSelectId(id, e.shiftKey);
  };

  const handleDblClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (canEdit) setEditingId(id);
  };

  const handleLabelChange = (id: string, label: string) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const updated = { ...el, label };
    useCanvasStore.getState().updateElement(id, { label } as any);
    onModify(updated);
  };

  const handleDragStart = (e: React.PointerEvent, el: FlowchartElement) => {
    if (!canEdit) return;
    // Don't intercept drag if user is actively clicking inside the textarea
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'textarea') return;
    
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({ id: el.id, startX: e.clientX, startY: e.clientY, elX: el.x, elY: el.y });
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragState) return;
    const dx = (e.clientX - dragState.startX) / vp.zoom;
    const dy = (e.clientY - dragState.startY) / vp.zoom;
    const el = elements.find((fr) => fr.id === dragState.id);
    if (!el) return;
    const updated = { ...el, x: dragState.elX + dx, y: dragState.elY + dy };
    // Synchronously update local store for perfect zero-latency dragging
    useCanvasStore.getState().updateElement(el.id, { x: updated.x, y: updated.y } as any);
    onModify(updated);
  };

  const handleDragEnd = () => setDragState(null);

  const renderFCShape = (el: FlowchartElement) => {
    const sx = el.x * vp.zoom + vp.x;
    const sy = el.y * vp.zoom + vp.y;
    const sw = el.width * vp.zoom;
    const sh = el.height * vp.zoom;
    const isSelected = selectedIds.includes(el.id);
    const editing = editingId === el.id;

    const shapeStyle: React.CSSProperties = {
      position: 'absolute',
      left: sx, top: sy, width: sw, height: sh,
      border: `${el.strokeWidth * vp.zoom}px solid ${el.isGhostSuggestion ? '#7c3aed' : el.color}`,
      background: el.fillColor,
      opacity: el.isGhostSuggestion ? 0.45 : el.opacity,
      cursor: canEdit ? (dragState?.id === el.id ? 'grabbing' : 'grab') : 'default',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: el.fontSize * vp.zoom,
      fontFamily: el.fontFamily,
      color: el.isGhostSuggestion ? '#7c3aed' : el.color,
      userSelect: 'none',
      boxSizing: 'border-box',
      boxShadow: el.isGhostSuggestion
        ? `0 0 0 ${1.5 * vp.zoom}px #7c3aed, 0 0 12px rgba(124,58,237,0.3)`
        : isSelected ? `0 0 0 ${2 * vp.zoom}px #10b981, 0 4px 16px rgba(16,185,129,0.25)` : undefined,
      borderStyle: el.isGhostSuggestion ? 'dashed' : 'solid',
      transition: 'opacity 0.3s',
      borderRadius: el.borderRadius ? `${el.borderRadius * vp.zoom}px` : undefined,
    };

    if (el.shapeType === 'diamond') {
      shapeStyle.transform = 'rotate(0deg)';
      shapeStyle.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    }
    if (el.shapeType === 'rounded_rect') shapeStyle.borderRadius = el.borderRadius ? `${el.borderRadius * vp.zoom}px` : `${8 * vp.zoom}px`;
    if (el.shapeType === 'parallelogram') shapeStyle.clipPath = 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)';
    if (el.shapeType === 'hexagon') shapeStyle.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
    if (el.shapeType === 'oval') shapeStyle.borderRadius = '50% / 50%';
    if (el.shapeType === 'cross') shapeStyle.clipPath = 'polygon(33% 0, 66% 0, 66% 33%, 100% 33%, 100% 66%, 66% 66%, 66% 100%, 33% 100%, 33% 66%, 0 66%, 0 33%, 33% 33%)';
    // Simplified CSS cloud clipPath
    if (el.shapeType === 'cloud') {
      shapeStyle.clipPath = 'polygon(10% 40%, 20% 20%, 40% 10%, 60% 10%, 80% 20%, 90% 40%, 100% 60%, 90% 80%, 70% 90%, 30% 90%, 10% 80%, 0% 60%)';
      shapeStyle.borderRadius = '40%';
    }

    return (
      <div
        key={el.id}
        style={{ ...shapeStyle, pointerEvents: 'auto' }}
        onClick={(e) => handleClick(e, el.id)}
        onDoubleClick={(e) => handleDblClick(e, el.id)}
        onPointerDown={(e) => handleDragStart(e, el)}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      >
        {editing ? (
          <textarea
            ref={editRef}
            defaultValue={el.label}
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => { handleLabelChange(el.id, e.target.value); setEditingId(null); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleLabelChange(el.id, e.currentTarget.value); setEditingId(null); }
              if (e.key === 'Escape') setEditingId(null);
            }}
            className="bg-transparent border-none outline-none resize-none absolute inset-3 block"
            style={{ 
              fontSize: el.fontSize * vp.zoom, 
              fontFamily: el.fontFamily, 
              color: el.color,
              lineHeight: 1.2,
              fontWeight: el.fontWeight || 'normal',
              fontStyle: el.fontStyle || 'normal',
              textAlign: el.textAlign || 'center'
            }}
          />
        ) : (
          <span 
             className="px-1 leading-tight break-words max-w-full"
             style={{
               fontWeight: el.fontWeight || 'normal',
               fontStyle: el.fontStyle || 'normal',
               textAlign: el.textAlign || 'center',
               width: '100%',
             }}
          >
            {el.label}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="absolute inset-0">
      {/* SVG connectors */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {connectors.map((conn) => {
          const from = shapes.find((s) => s.id === conn.fromId);
          const to   = shapes.find((s) => s.id === conn.toId);
          if (!from || !to) return null;
          const x1 = (from.x + from.width / 2) * vp.zoom + vp.x;
          const y1 = (from.y + from.height / 2) * vp.zoom + vp.y;
          const x2 = (to.x + to.width / 2) * vp.zoom + vp.x;
          const y2 = (to.y + to.height / 2) * vp.zoom + vp.y;
          return (
            <g key={conn.id}>
              <defs>
                <marker id={`arrow-${conn.id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill={conn.color} />
                </marker>
              </defs>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={conn.color} strokeWidth={conn.strokeWidth * vp.zoom}
                strokeDasharray={conn.dashed ? '8,4' : undefined}
                markerEnd={conn.arrowEnd !== false ? `url(#arrow-${conn.id})` : undefined}
                opacity={conn.opacity}
              />
            </g>
          );
        })}
      </svg>

      {/* Flowchart shapes */}
      {shapes.map(renderFCShape)}
    </div>
  );
}
