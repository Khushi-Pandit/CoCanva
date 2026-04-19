'use client';
/**
 * ConnectorStylePanel — Ultra-compact floating toolbar
 * Appears directly above a selected connector element.
 * Same layout pattern as FloatingTextToolbar.
 */
import { useCanvasStore } from '@/store/canvas.store';
import { cn } from '@/lib/utils';
import { toAPI, calculateBounds } from '@/lib/element.transform';
import { isConnector, Connector, ArrowHeadStyle } from '@/types/element';

// SVG icon helpers (lucide doesn't have all of these at icon-size well)
const IconStraight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="2" y1="8" x2="14" y2="8" />
    <polyline points="10 5 14 8 10 11" />
  </svg>
);
const IconFlex = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12 Q5 4 8 8 Q11 12 14 4" />
    <polyline points="11 1 14 4 11 7" />
  </svg>
);
const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="2" y1="8" x2="14" y2="8" />
    <polyline points="10 5 14 8 10 11" />
  </svg>
);
const IconArrowBoth = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="2" y1="8" x2="14" y2="8" />
    <polyline points="5 5 2 8 5 11" />
    <polyline points="11 5 14 8 11 11" />
  </svg>
);
const IconLine = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="2" y1="8" x2="14" y2="8" />
  </svg>
);
const IconRounded = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12 Q2 4 8 4 Q14 4 14 12" />
  </svg>
);

interface ConnectorStylePanelProps {
  onModify: (el: any, apiForm: unknown) => void;
}

export function ConnectorStylePanel({ onModify }: ConnectorStylePanelProps) {
  const {
    selectedIds, elements, viewport,
    connectorMode, connectorHead, connectorHeadStyle, connectorRounded,
    setConnectorMode, setConnectorHead, setConnectorHeadStyle, setConnectorRounded,
    updateElement,
  } = useCanvasStore();

  // Get selected connectors
  const selectedConnectors = selectedIds
    .map(id => elements.find(e => e.id === id))
    .filter((e): e is Connector => !!e && isConnector(e));

  if (selectedConnectors.length === 0) return null;

  // Use first selected connector's values for display
  const conn = selectedConnectors[0];
  const curMode  = conn.mode ?? connectorMode;
  const curHead  = conn.arrowStart && conn.arrowEnd ? 'both' : conn.arrowEnd ? 'end' : 'none';
  const curStyle = (conn.arrowHeadStyle as Exclude<ArrowHeadStyle, 'none'>) ?? connectorHeadStyle;
  const curRound = conn.borderRadius !== undefined ? conn.borderRadius > 0 : connectorRounded;

  // Apply patch to all selected connectors
  const apply = (patch: Partial<Connector>) => {
    for (const c of selectedConnectors) {
      const updated = { ...c, ...patch } as Connector;
      updateElement(c.id, patch as any);
      onModify(updated, toAPI(updated));
    }
  };

  // Position above the connector bounding box (canvas → screen coords)
  const bounds = (() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity;
    for (const c of selectedConnectors) {
      if (!c.points.length) continue;
      const b = calculateBounds(c.points);
      if (b.minX < minX) minX = b.minX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxX > maxX) maxX = b.maxX;
    }
    return { minX, minY, maxX };
  })();

  const screenCx = ((bounds.minX + bounds.maxX) / 2) * viewport.zoom + viewport.x;
  const screenTop = bounds.minY * viewport.zoom + viewport.y - 68; // 68px above for room to grab handles
  const PANEL_W = 182; // estimated pill width without path buttons
  const left = Math.max(8, screenCx - PANEL_W / 2);
  const top = Math.max(8, screenTop);

  return (
    <div
      className="absolute z-50 flex items-center gap-0.5 px-1.5 py-1 bg-white border border-slate-200 rounded-xl shadow-xl animate-fade-in pointer-events-auto select-none"
      style={{ left, top }}
      onPointerDown={e => e.stopPropagation()}
    >
      {/* DIRECTION: → ↔ — */}
      <button
        title="One-way →"
        onClick={() => { setConnectorHead('end'); apply({ arrowEnd: true, arrowStart: false }); }}
        className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-all',
          curHead === 'end' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100')}
      >
        <IconArrowRight />
      </button>
      <button
        title="Bidirectional ↔"
        onClick={() => { setConnectorHead('both'); apply({ arrowEnd: true, arrowStart: true }); }}
        className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-all',
          curHead === 'both' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100')}
      >
        <IconArrowBoth />
      </button>
      <button
        title="No arrow"
        onClick={() => { setConnectorHead('none'); apply({ arrowEnd: false, arrowStart: false }); }}
        className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-all',
          curHead === 'none' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100')}
      >
        <IconLine />
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      {/* ARROWHEAD STYLE — compact text glyphs */}
      {(['triangle', 'open', 'dot', 'diamond'] as Exclude<ArrowHeadStyle, 'none'>[]).map((s) => {
        const g = { triangle: '▶', open: '›', dot: '●', diamond: '◆' }[s];
        return (
          <button
            key={s}
            title={s}
            onClick={() => { setConnectorHeadStyle(s); apply({ arrowHeadStyle: s, arrowTailStyle: s }); }}
            className={cn('w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-all',
              curStyle === s ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100')}
          >
            {g}
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      {/* ROUNDED CORNERS toggle */}
      <button
        title={curRound ? 'Sharp corners' : 'Rounded corners'}
        onClick={() => { setConnectorRounded(!curRound); apply({ borderRadius: curRound ? 0 : 16 }); }}
        className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-all',
          curRound ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100')}
      >
        <IconRounded />
      </button>
    </div>
  );
}
