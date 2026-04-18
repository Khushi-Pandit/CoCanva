'use client';
import { useCanvasStore } from '@/store/canvas.store';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const ARROW_STYLES = [
  { value: 'triangle' as const, label: 'Filled', preview: '▶' },
  { value: 'open'     as const, label: 'Open',   preview: '>' },
  { value: 'dot'      as const, label: 'Dot',    preview: '•' },
  { value: 'diamond'  as const, label: 'Diamond',preview: '◆' },
];

const COLORS = [
  '#111827', '#6b7280', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
];

const HEAD_OPTIONS = [
  { value: 'end'  as const, label: '→',  title: 'Arrow end',      desc: 'One arrow' },
  { value: 'both' as const, label: '↔',  title: 'Bidirectional',  desc: 'Both ends' },
  { value: 'none' as const, label: '—',  title: 'No arrow',       desc: 'Plain line' },
];

export function ConnectorStylePanel() {
  const {
    tool, connectorMode, connectorHead, connectorHeadStyle, connectorRounded,
    color, lineWidth,
    setConnectorMode, setConnectorHead, setConnectorHeadStyle, setConnectorRounded,
    setColor, setLineWidth, setTool,
  } = useCanvasStore();

  if (tool !== 'connector') return null;

  return (
    <div
      className="absolute left-16 bottom-6 z-30 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 animate-slide-up"
      style={{ minWidth: 260, maxWidth: 300 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Connector Style</p>
        <button
          onClick={() => setTool('select')}
          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
        >
          <X size={12} />
        </button>
      </div>

      {/* Line type: Straight vs Flexible */}
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Path</p>
      <div className="grid grid-cols-2 gap-1 mb-3">
        {[
          { v: 'straight' as const, label: 'Straight', icon: '⟶' },
          { v: 'polyline' as const, label: 'Flexible', icon: '⤻' },
        ].map(({ v, label, icon }) => (
          <button key={v} onClick={() => setConnectorMode(v)}
            className={cn(
              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all',
              connectorMode === v
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            )}>
            <span className="text-base leading-none">{icon}</span> {label}
          </button>
        ))}
      </div>

      {/* Arrowhead direction */}
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Direction</p>
      <div className="grid grid-cols-3 gap-1 mb-3">
        {HEAD_OPTIONS.map(({ value, label, title }) => (
          <button key={value} onClick={() => setConnectorHead(value)} title={title}
            className={cn(
              'py-1.5 rounded-lg text-sm font-bold border transition-all',
              connectorHead === value
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* Arrowhead style */}
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Arrowhead Style</p>
      <div className="flex gap-1 flex-wrap mb-3">
        {ARROW_STYLES.map(({ value, label, preview }) => (
          <button key={value} onClick={() => setConnectorHeadStyle(value)} title={label}
            className={cn(
              'flex-1 py-1.5 px-1 rounded-lg text-center border transition-all',
              connectorHeadStyle === value
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            )}>
            <span className="text-sm block leading-none">{preview}</span>
            <span className="text-[9px] block mt-0.5 leading-none">{label}</span>
          </button>
        ))}
      </div>

      {/* Rounded corners toggle */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Rounded corners</p>
        <button
          onClick={() => setConnectorRounded(!connectorRounded)}
          className={cn(
            'w-9 h-5 rounded-full border-2 transition-all relative',
            connectorRounded
              ? 'bg-emerald-500 border-emerald-500'
              : 'bg-slate-200 border-slate-300'
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-all',
            connectorRounded ? 'left-4' : 'left-0.5'
          )} />
        </button>
      </div>

      {/* Color */}
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">Color</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)}
            className="w-6 h-6 rounded-lg border-2 transition-all hover:scale-110"
            style={{
              background: c,
              borderColor: color === c ? '#10b981' : 'transparent',
              boxShadow: color === c ? '0 0 0 2px #10b981' : undefined,
            }}
          />
        ))}
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border border-slate-200 p-0" title="Custom color" />
      </div>

      {/* Width */}
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Thickness: {lineWidth}px</p>
      <input type="range" min={1} max={12} value={lineWidth}
        onChange={(e) => setLineWidth(Number(e.target.value))}
        className="w-full accent-emerald-500 mb-1" />

      {/* Usage hint */}
      <p className="text-[9px] text-slate-400 mt-2 text-center">
        Click to place start → move → click to place end
        <br />
        <kbd className="text-[8px] bg-slate-100 px-1 py-0.5 rounded">Esc</kbd> cancel &nbsp;
        <kbd className="text-[8px] bg-slate-100 px-1 py-0.5 rounded">Enter</kbd> finish &nbsp;
        <kbd className="text-[8px] bg-slate-100 px-1 py-0.5 rounded">⌫</kbd> undo last point
      </p>
    </div>
  );
}
