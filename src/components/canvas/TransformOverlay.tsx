'use client';

import { useCanvasStore } from '@/store/canvas.store';
import { DrawableElement, isStroke, isShape, isFlowchart, isTextElement } from '@/types/element';
import { calculateBounds, toAPI } from '@/lib/element.transform';
import { useCallback, useEffect, useRef } from 'react';

interface TransformOverlayProps {
  elements: DrawableElement[];
  viewport: { x: number; y: number; zoom: number };
  onModify: (el: DrawableElement, apiForm: unknown) => void;
}

type HandlePos = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const HANDLES: HandlePos[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** Compute the axis-aligned bounding box encompassing a set of elements */
function computeUnionBounds(els: DrawableElement[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of els) {
    if (isStroke(el) && el.bounds) {
      minX = Math.min(minX, el.bounds.minX); minY = Math.min(minY, el.bounds.minY);
      maxX = Math.max(maxX, el.bounds.maxX); maxY = Math.max(maxY, el.bounds.maxY);
    } else if (isShape(el) || isFlowchart(el) || isTextElement(el)) {
      const ex = (el as any).x ?? 0;
      const ey = (el as any).y ?? 0;
      const ew = (el as any).width ?? 100;
      const eh = (el as any).height ?? 40;
      minX = Math.min(minX, ex); minY = Math.min(minY, ey);
      maxX = Math.max(maxX, ex + ew); maxY = Math.max(maxY, ey + eh);
    }
  }
  if (!isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

export function TransformOverlay({ elements, viewport: vp, onModify }: TransformOverlayProps) {
  const { selectedIds, updateElement, pushHistory, tool } = useCanvasStore();
  const resizingRef = useRef<{ handle: HandlePos; startX: number; startY: number; startEls: any[] } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!resizingRef.current) return;
      const { handle, startX, startY, startEls } = resizingRef.current;

      // Compute original union bounds from frozen start state
      const origBounds = computeUnionBounds(startEls);
      if (!origBounds) return;
      const origW = origBounds.maxX - origBounds.minX;
      const origH = origBounds.maxY - origBounds.minY;
      if (origW < 1 || origH < 1) return;

      const currentX = (e.clientX - vp.x) / vp.zoom;
      const currentY = (e.clientY - vp.y) / vp.zoom;
      let dx = currentX - startX;
      let dy = currentY - startY;

      if (!handle.includes('e') && !handle.includes('w')) dx = 0;
      if (!handle.includes('n') && !handle.includes('s')) dy = 0;

      let newMinX = origBounds.minX;
      let newMinY = origBounds.minY;
      let newMaxX = origBounds.maxX;
      let newMaxY = origBounds.maxY;

      if (handle.includes('w')) { newMinX += dx; }
      if (handle.includes('e')) { newMaxX += dx; }
      if (handle.includes('n')) { newMinY += dy; }
      if (handle.includes('s')) { newMaxY += dy; }

      const newW = Math.max(10, newMaxX - newMinX);
      const newH = Math.max(10, newMaxY - newMinY);
      const scaleX = newW / origW;
      const scaleY = newH / origH;

      for (const startEl of startEls) {
        if (isShape(startEl) || isFlowchart(startEl)) {
          const relX = startEl.x - origBounds.minX;
          const relY = startEl.y - origBounds.minY;
          const sx = newMinX + relX * scaleX;
          const sy = newMinY + relY * scaleY;
          const sw = Math.max(10, startEl.width * scaleX);
          const sh = Math.max(10, startEl.height * scaleY);
          updateElement(startEl.id, { x: sx, y: sy, width: sw, height: sh });
        } else if (isStroke(startEl) && startEl.bounds) {
          const newPoints = startEl.points.map((p: any) => ({
            x: newMinX + (p.x - origBounds.minX) * scaleX,
            y: newMinY + (p.y - origBounds.minY) * scaleY,
          }));
          updateElement(startEl.id, { points: newPoints, bounds: calculateBounds(newPoints) });
        } else if (isTextElement(startEl)) {
          const relX = startEl.x - origBounds.minX;
          const relY = startEl.y - origBounds.minY;
          updateElement(startEl.id, { x: newMinX + relX * scaleX, y: newMinY + relY * scaleY });
        }
      }
    };

    const onUp = () => {
      if (resizingRef.current) {
        const state = useCanvasStore.getState();
        resizingRef.current.startEls.forEach(startEl => {
          const el = state.elements.find(e => e.id === startEl.id);
          if (el) onModify(el, toAPI(el));
        });
        pushHistory([...useCanvasStore.getState().elements]);
        resizingRef.current = null;
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [vp, updateElement, pushHistory, onModify]);

  if (tool !== 'select' || selectedIds.length === 0) return null;

  const selected = elements.filter(e => selectedIds.includes(e.id));
  if (selected.length === 0) return null;

  // Do not show TransformOverlay if ONLY text elements are selected
  // Because text layer has its own bounds handling and the user requested one box only.
  if (selected.every(e => isTextElement(e))) return null;

  const bounds = computeUnionBounds(selected);
  if (!bounds) return null;

  const px = 6;
  const left   = (bounds.minX - px) * vp.zoom + vp.x;
  const top    = (bounds.minY - px) * vp.zoom + vp.y;
  const width  = (bounds.maxX - bounds.minX + px * 2) * vp.zoom;
  const height = (bounds.maxY - bounds.minY + px * 2) * vp.zoom;
  const isMulti = selected.length > 1;

  return (
    <div
      className="absolute pointer-events-none z-40"
      style={{
        left, top, width, height,
        border: `${isMulti ? 2 : 1.5}px dashed ${isMulti ? '#8b5cf6' : '#3b82f6'}`,
        borderRadius: 3,
      }}
    >
      {/* Multi-select label */}
      {isMulti && (
        <div
          className="absolute -top-5 left-0 text-[9px] font-semibold bg-violet-500 text-white px-1.5 py-0.5 rounded-md"
          style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
        >
          {selected.length} selected
        </div>
      )}

      {HANDLES.map(pos => {
        let hLeft = '50%', hTop = '50%';
        if (pos.includes('w')) hLeft = '0%';
        if (pos.includes('e')) hLeft = '100%';
        if (pos.includes('n')) hTop = '0%';
        if (pos.includes('s')) hTop = '100%';

        const handleColor = isMulti ? '#8b5cf6' : '#3b82f6';
        const borderColor = isMulti ? '#7c3aed' : '#1d4ed8';

        return (
          <div
            key={pos}
            className="absolute bg-white rounded-full w-3 h-3 pointer-events-auto shadow-sm"
            style={{
              left: hLeft, top: hTop,
              transform: 'translate(-50%, -50%)',
              cursor: `${pos}-resize`,
              border: `2px solid ${handleColor}`,
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              resizingRef.current = {
                handle: pos,
                startX: (e.clientX - vp.x) / vp.zoom,
                startY: (e.clientY - vp.y) / vp.zoom,
                startEls: selected.map(el => JSON.parse(JSON.stringify(el))),
              };
            }}
          />
        );
      })}
    </div>
  );
}
