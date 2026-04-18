'use client';
import { useCanvasStore } from '@/store/canvas.store';
import { useUIStore } from '@/store/ui.store';
import {
  Pencil, PenLine, Highlighter, Paintbrush, Eraser,
  Square, Circle, Triangle, Diamond, Minus, ArrowRight,
  Type, MousePointer2, Hand, Workflow,
  Sparkles, ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ToolMode, StrokeType, ShapeType, FlowchartShapeType, DrawableElement } from '@/types/element';

const STROKE_TOOLS: { type: StrokeType; label: string; Icon: React.ElementType }[] = [
  { type: 'pen',     label: 'Pen',     Icon: PenLine },
  { type: 'pencil',  label: 'Pencil',  Icon: Pencil },
  { type: 'marker',  label: 'Marker',  Icon: Highlighter },
  { type: 'brush',   label: 'Brush',   Icon: Paintbrush },
  { type: 'eraser',  label: 'Eraser',  Icon: Eraser },
];

const SHAPE_TOOLS: { type: ShapeType; label: string; Icon: React.ElementType }[] = [
  { type: 'rectangle', label: 'Rectangle', Icon: Square },
  { type: 'circle',    label: 'Circle',    Icon: Circle },
  { type: 'triangle',  label: 'Triangle',  Icon: Triangle },
  { type: 'diamond',   label: 'Diamond',   Icon: Diamond },
  { type: 'line',      label: 'Line',      Icon: Minus },
  { type: 'arrow',     label: 'Arrow',     Icon: ArrowRight },
  { type: 'star',      label: 'Star',      Icon: Sparkles },
];

const FC_TOOLS: { type: FlowchartShapeType; label: string; preview: React.ReactNode }[] = [
  { type: 'rectangle',     label: 'Process',   preview: <Square size={13} strokeWidth={2.5}/> },
  { type: 'diamond',       label: 'Decision',  preview: <Diamond size={13} strokeWidth={2.5}/> },
  { type: 'rounded_rect',  label: 'Start/End', preview: <div className="w-[14px] h-[10px] border-[2px] border-current rounded-[4px]"/> },
  { type: 'parallelogram', label: 'I/O',       preview: <div className="w-[14px] h-[10px] border-[2px] border-current skew-x-[-15deg]"/> },
  { type: 'cylinder',      label: 'Database',  preview: '⬡' },
  { type: 'hexagon',       label: 'Prep',      preview: '⬡' },
  { type: 'oval',          label: 'Oval',      preview: <Circle size={13} strokeWidth={2.5}/> },
  { type: 'cloud',         label: 'Cloud',     preview: '☁' },
  { type: 'cross',         label: 'Cross',     preview: '✝' },
];

const COLORS = [
  '#111827', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff',
];

const CONNECTOR_MODES: Array<{ value: 'straight' | 'polyline'; label: string }> = [
  { value: 'straight', label: 'Straight' },
  { value: 'polyline', label: 'Flexible' },
];

const CONNECTOR_HEADS: Array<{ value: 'end' | 'both' | 'none'; label: string }> = [
  { value: 'end', label: 'Single head' },
  { value: 'both', label: 'Double head' },
  { value: 'none', label: 'No head' },
];

const CONNECTOR_HEAD_STYLES: Array<{ value: 'triangle' | 'open' | 'dot' | 'diamond'; label: string }> = [
  { value: 'triangle', label: 'Triangle' },
  { value: 'open', label: 'Open' },
  { value: 'dot', label: 'Dot' },
  { value: 'diamond', label: 'Diamond' },
];

interface ToolbarProps { 
  canEdit: boolean; 
  onStyleChange?: (updates: Partial<DrawableElement>) => void;
}

export function Toolbar({ canEdit, onStyleChange }: ToolbarProps) {
  const { tool, strokeType, shapeType, fcShape, color, lineWidth, opacity,
    connectorMode, connectorHead, connectorHeadStyle, connectorRounded,
    setTool, setStrokeType, setShapeType, setFcShape, setColor, setLineWidth, setOpacity,
    setConnectorMode, setConnectorHead, setConnectorHeadStyle, setConnectorRounded,
  } = useCanvasStore();
  const { togglePanel, aiChatOpen } = useUIStore();

  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [fcMenuOpen, setFcMenuOpen] = useState(false);
  const [drawMenuOpen, setDrawMenuOpen] = useState(false);
  const [connectorMenuOpen, setConnectorMenuOpen] = useState(false);

  const ToolBtn = ({ t, icon: Icon, label, active, onClick = () => setTool(t as ToolMode) }:
    { t?: string; icon: React.ElementType; label: string; active: boolean; onClick?: () => void }) => (
    <button
      onClick={onClick}
      title={label}
      className={cn('tool-btn', active && 'active')}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div
      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1 p-2 rounded-2xl shadow-lg glass"
      style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(226,232,240,0.8)' }}
    >
      {/* Select / Pan */}
      <ToolBtn t="select" icon={MousePointer2} label="Select (V)" active={tool === 'select'} />
      <ToolBtn t="pan"    icon={Hand}           label="Pan (H)"    active={tool === 'pan'} />

      <div className="w-full h-px bg-slate-200 my-0.5" />

      {/* Draw */}
      <div className="relative">
        <button
          onClick={() => { setTool('draw'); setDrawMenuOpen(!drawMenuOpen); }}
          className={cn('tool-btn', tool === 'draw' && 'active')}
          title="Draw"
        >
          {(() => {
            const ActiveIcon = STROKE_TOOLS.find((s) => s.type === strokeType)?.Icon ?? PenLine;
            return <ActiveIcon size={16} />;
          })()}
          <ChevronDown size={10} className="absolute bottom-0.5 right-0.5 opacity-60" />
        </button>
        {drawMenuOpen && (
          <div className="absolute left-full ml-2 top-0 bg-white border border-slate-200 rounded-xl shadow-lg p-1 flex flex-col gap-1 min-w-[120px] animate-slide-up">
            {STROKE_TOOLS.map(({ type, label, Icon }) => (
              <button key={type} onClick={() => { setStrokeType(type); setTool('draw'); setDrawMenuOpen(false); }}
                className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-slate-50',
                  strokeType === type && tool === 'draw' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600')}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Shape */}
      <div className="relative">
        <button
          onClick={() => { setTool('shape'); setShapeMenuOpen(!shapeMenuOpen); }}
          className={cn('tool-btn', tool === 'shape' && 'active')}
          title="Shapes"
        >
          <Square size={16} />
          <ChevronDown size={10} className="absolute bottom-0.5 right-0.5 opacity-60" />
        </button>
        {shapeMenuOpen && (
          <div className="absolute left-full ml-2 top-0 bg-white border border-slate-200 rounded-xl shadow-lg p-1 grid grid-cols-2 gap-0.5 w-[160px] animate-slide-up">
            {SHAPE_TOOLS.map(({ type, label, Icon }) => (
              <button key={type}
                onClick={() => { setShapeType(type); setTool('shape'); setShapeMenuOpen(false); }}
                className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-slate-50',
                  shapeType === type && tool === 'shape' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600')}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Flowchart */}
      <div className="relative">
        <button
          onClick={() => { setTool('flowchart'); setFcMenuOpen(!fcMenuOpen); }}
          className={cn('tool-btn', tool === 'flowchart' && 'active')}
          title="Flowchart"
        >
          <Workflow size={16} />
        </button>
        {fcMenuOpen && (
          <div className="absolute left-full ml-2 top-0 bg-white border border-slate-200 rounded-xl shadow-lg p-2 grid grid-cols-2 gap-0.5 w-[220px] animate-slide-up">
            <div className="col-span-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">Flowchart & Diagram</div>
            {FC_TOOLS.map(({ type, label, preview }) => (
              <button key={type}
                onClick={() => { setFcShape(type); setTool('flowchart'); setFcMenuOpen(false); }}
                className={cn('flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-slate-50',
                  fcShape === type && tool === 'flowchart' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600')}
              >
                <div className="w-[14px] flex justify-center text-current">{preview}</div>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Text */}
      <ToolBtn t="text" icon={Type} label="Text (T)" active={tool === 'text'} />

      {/* Connector (Multi-node) */}
      <div className="relative">
        <button
          onClick={() => { setTool('connector'); setConnectorMenuOpen(!connectorMenuOpen); }}
          className={cn('tool-btn', tool === 'connector' && 'active')}
          title="Arrow"
        >
          <ArrowRight size={16} />
          <ChevronDown size={10} className="absolute bottom-0.5 right-0.5 opacity-60" />
        </button>
        {connectorMenuOpen && (
          <div className="absolute left-full ml-2 top-0 bg-white border border-slate-200 rounded-xl shadow-lg p-2 flex flex-col gap-2 min-w-[210px] animate-slide-up">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Arrow Type</p>
              <div className="grid grid-cols-2 gap-1">
                {CONNECTOR_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => { setTool('connector'); setConnectorMode(mode.value); }}
                    className={cn(
                      'px-2 py-1 rounded-lg text-[11px] font-medium transition-all',
                      connectorMode === mode.value ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Heads</p>
              <div className="grid grid-cols-1 gap-1">
                {CONNECTOR_HEADS.map((head) => (
                  <button
                    key={head.value}
                    onClick={() => { setTool('connector'); setConnectorHead(head.value); }}
                    className={cn(
                      'px-2 py-1 rounded-lg text-[11px] font-medium text-left transition-all',
                      connectorHead === head.value ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {head.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Head Style</p>
              <div className="grid grid-cols-2 gap-1">
                {CONNECTOR_HEAD_STYLES.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => { setTool('connector'); setConnectorHeadStyle(style.value); }}
                    className={cn(
                      'px-2 py-1 rounded-lg text-[11px] font-medium transition-all',
                      connectorHeadStyle === style.value ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Corners</p>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => { setTool('connector'); setConnectorRounded(true); }}
                  className={cn(
                    'px-2 py-1 rounded-lg text-[11px] font-medium transition-all',
                    connectorRounded ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Rounded
                </button>
                <button
                  onClick={() => { setTool('connector'); setConnectorRounded(false); }}
                  className={cn(
                    'px-2 py-1 rounded-lg text-[11px] font-medium transition-all',
                    !connectorRounded ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Sharp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-full h-px bg-slate-200 my-0.5" />

      {/* Color picker */}
      <div className="relative group">
        <button className="w-9 h-9 rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all shadow-sm flex-shrink-0"
          style={{ background: color }} title="Color" />
        {/* Invisible padding wrapper bridges the hover gap */}
        <div className="absolute left-full top-0 pl-2 hidden group-hover:flex animate-fade-in z-50">
          <div className="flex flex-wrap gap-1 p-2 bg-white border border-slate-200 rounded-xl shadow-lg w-[90px]">
            {COLORS.map((c) => (
              <button key={c} onClick={() => { setColor(c); onStyleChange?.({ color: c }); }}
                className="w-6 h-6 rounded-lg border transition-all hover:scale-110"
                style={{ background: c, borderColor: color === c ? '#10b981' : (c === '#ffffff' ? '#e2e8f0' : 'transparent'), boxShadow: color === c ? '0 0 0 2px #10b981' : undefined }}
              />
            ))}
            <input type="color" value={color} onChange={(e) => { setColor(e.target.value); onStyleChange?.({ color: e.target.value }); }}
              className="w-6 h-6 rounded cursor-pointer border border-slate-200 p-0" title="Custom color" />
          </div>
        </div>
      </div>

      {/* Line width */}
      <div className="relative group">
        <button className="tool-btn" title="Stroke width flex items-center justify-center">
          <div className="rounded-full bg-current m-auto" style={{ width: Math.min(lineWidth * 2 + 4, 14), height: Math.min(lineWidth * 2 + 4, 14), background: color }} />
        </button>
        <div className="absolute left-full top-0 pl-2 hidden group-hover:flex animate-fade-in z-50">
          <div className="flex flex-col gap-1 p-3 bg-white border border-slate-200 rounded-xl shadow-lg">
            <p className="text-[10px] text-slate-400 font-medium mb-1">Width: {lineWidth}px</p>
            <input type="range" min={1} max={20} value={lineWidth} onChange={(e) => { const w = Number(e.target.value); setLineWidth(w); onStyleChange?.({ width: w, strokeWidth: w, fontSize: Math.max(12, w * 4) }); }}
              className="w-28 accent-emerald-500" />
            <p className="text-[10px] text-slate-400 font-medium mt-1">Opacity: {Math.round(opacity * 100)}%</p>
            <input type="range" min={0} max={100} value={opacity * 100} onChange={(e) => { const o = Number(e.target.value) / 100; setOpacity(o); onStyleChange?.({ opacity: o }); }}
              className="w-28 accent-emerald-500" />
          </div>
        </div>
      </div>

      <div className="w-full h-px bg-slate-200 my-0.5" />

      {/* AI Toggle */}
      <button
        onClick={() => togglePanel('aiChatOpen')}
        className={cn('tool-btn', aiChatOpen && 'ai-active')}
        title="AI Assistant (⌘J)"
      >
        <Sparkles size={16} />
      </button>
    </div>
  );
}
