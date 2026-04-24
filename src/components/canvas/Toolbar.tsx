'use client';
import { useCanvasStore } from '@/store/canvas.store';
import { useUIStore } from '@/store/ui.store';
import {
  Pencil, PenLine, Highlighter, Paintbrush, Eraser,
  Square, Circle, Triangle, Diamond, Minus, ArrowRight,
  Type, MousePointer2, Hand, Workflow,
  Sparkles, Minus as LineIcon, Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ToolMode, StrokeType, ShapeType, FlowchartShapeType, DrawableElement } from '@/types/element';

// Star SVG icon (not in lucide set at this size)
const StarIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

// Arrow icon (more descriptive for shapes)
const ArrowShapeIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M13 5L21 12L13 19V15H3V9H13V5Z"/>
  </svg>
);

// Straight connector icon
const StraightLineIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="3" y1="12" x2="21" y2="12"/>
    <polyline points="16 7 21 12 16 17"/>
  </svg>
);

// Flexible/polyline connector icon
const FlexLineIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18 Q6 6 12 12 Q18 18 21 6"/>
    <polyline points="17 2 21 6 17 10"/>
  </svg>
);

const STROKE_TOOLS: { type: StrokeType; label: string; Icon: React.ElementType }[] = [
  { type: 'pen',     label: 'Pen',     Icon: PenLine },
  { type: 'pencil',  label: 'Pencil',  Icon: Pencil },
  { type: 'marker',  label: 'Marker',  Icon: Highlighter },
  { type: 'brush',   label: 'Brush',   Icon: Paintbrush },
  { type: 'eraser',  label: 'Eraser',  Icon: Eraser },
];

// Shape tools — icon only, no text in picker
const SHAPE_TOOLS: { type: ShapeType; label: string; Icon: React.ElementType }[] = [
  { type: 'rectangle', label: 'Rectangle', Icon: Square },
  { type: 'circle',    label: 'Circle',    Icon: Circle },
  { type: 'triangle',  label: 'Triangle',  Icon: Triangle },
  { type: 'diamond',   label: 'Diamond',   Icon: Diamond },
  { type: 'line',      label: 'Line',      Icon: Minus },
  { type: 'arrow',     label: 'Arrow',     Icon: ArrowShapeIcon },
  { type: 'star',      label: 'Star',      Icon: StarIcon },
];

// Flowchart shape previews - keep labels since they need context
const FC_TOOLS: { type: FlowchartShapeType; label: string; Preview: React.ReactNode }[] = [
  { type: 'rectangle',     label: 'Process',   Preview: <div className="w-8 h-5 border-[2px] border-current rounded-sm" /> },
  { type: 'diamond',       label: 'Decision',  Preview: <div className="w-5 h-5 border-[2px] border-current rotate-45" /> },
  { type: 'rounded_rect',  label: 'Terminal',  Preview: <div className="w-8 h-5 border-[2px] border-current rounded-[10px]" /> },
  { type: 'parallelogram', label: 'I/O',       Preview: <div className="w-8 h-5 border-[2px] border-current skew-x-[-12deg]" /> },
  { type: 'cylinder',      label: 'Database',  Preview: <div className="w-6 h-6 border-[2px] border-current rounded-full" /> },
  { type: 'hexagon',       label: 'Prep',      Preview: <div className="w-7 h-5 border-[2px] border-current" style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} /> },
  { type: 'oval',          label: 'Oval',      Preview: <div className="w-8 h-5 border-[2px] border-current rounded-full" /> },
  { type: 'cloud',         label: 'Cloud',     Preview: <div className="w-8 h-5 border-[2px] border-current rounded-[50%]" style={{ clipPath: 'polygon(10% 40%, 20% 20%, 40% 10%, 60% 10%, 80% 20%, 90% 40%, 100% 60%, 90% 80%, 70% 90%, 30% 90%, 10% 80%, 0% 60%)' }} /> },
  { type: 'cross',         label: 'Cross',     Preview: <div className="w-5 h-5 border-[2px] border-current" style={{ clipPath: 'polygon(33% 0, 66% 0, 66% 33%, 100% 33%, 100% 66%, 66% 66%, 66% 100%, 33% 100%, 33% 66%, 0 66%, 0 33%, 33% 33%)' }} /> },
];

const COLORS = [
  '#111827', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff',
];

type OpenMenu = 'draw' | 'shape' | 'fc' | 'connector' | 'color' | 'width' | 'clear' | null;

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

  // Single menu state — only one popup open at a time
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const toggleMenu = (menu: OpenMenu) => {
    setOpenMenu((prev) => prev === menu ? null : menu);
  };

  // Close all menus when clicking outside the toolbar
  useEffect(() => {
    const handleOutsideClick = (e: PointerEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('pointerdown', handleOutsideClick);
    return () => window.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  // Also close menus when tool changes to select/pan (user started working)
  useEffect(() => {
    if (tool === 'select' || tool === 'pan') {
      setOpenMenu(null);
    }
  }, [tool]);

  const activeStrokeIcon = STROKE_TOOLS.find(s => s.type === strokeType)?.Icon ?? PenLine;
  const ActiveStrokeIcon = activeStrokeIcon;

  return (
    <div
      ref={toolbarRef}
      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1 p-2 rounded-2xl shadow-lg"
      style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(226,232,240,0.8)' }}
    >
      {/* Select / Pan */}
      <button onClick={() => { setTool('select'); }} title="Select (V)"
        className={cn('tool-btn', tool === 'select' && 'active')}>
        <MousePointer2 size={16} />
      </button>
      <button onClick={() => { setTool('pan'); }} title="Pan (H)"
        className={cn('tool-btn', tool === 'pan' && 'active')}>
        <Hand size={16} />
      </button>

      <div className="w-full h-px bg-slate-200 my-0.5" />

      {/* Draw tool */}
      <div className="relative">
        <button
          onClick={() => { setTool('draw'); toggleMenu('draw'); }}
          title="Draw"
          className={cn('tool-btn relative', tool === 'draw' && 'active')}
        >
          <ActiveStrokeIcon size={16} />
          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-current opacity-50" />
        </button>
        {openMenu === 'draw' && (
          <div className="absolute left-full ml-2 top-0 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5 min-w-[140px] animate-slide-up z-50">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Drawing Style</p>
            {STROKE_TOOLS.map(({ type, label, Icon }) => (
              <button key={type}
                onClick={() => { setStrokeType(type); setTool('draw'); setOpenMenu(null); }}
                className={cn('flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  strokeType === type && tool === 'draw' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50')}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Shape tool — icon-only grid */}
      <div className="relative">
        <button
          onClick={() => { setTool('shape'); toggleMenu('shape'); }}
          title="Shapes"
          className={cn('tool-btn relative', tool === 'shape' && 'active')}
        >
          <Square size={16} />
          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-current opacity-50" />
        </button>
        {openMenu === 'shape' && (
          <div className="absolute left-full ml-2 top-0 bg-white border border-slate-200 rounded-xl shadow-xl p-2 animate-slide-up z-50" style={{ width: 164 }}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1 pb-1.5">Shapes</p>
            {/* Icon-only grid — no text labels */}
            <div className="grid grid-cols-4 gap-1">
              {SHAPE_TOOLS.map(({ type, label, Icon }) => (
                <button key={type}
                  onClick={() => { setShapeType(type); setTool('shape'); setOpenMenu(null); }}
                  title={label}
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                    shapeType === type && tool === 'shape'
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  )}
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Flowchart tool */}
      <div className="relative">
        <button
          onClick={() => { setTool('flowchart'); toggleMenu('fc'); }}
          title="Flowchart"
          className={cn('tool-btn relative', tool === 'flowchart' && 'active')}
        >
          <Workflow size={16} />
          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-current opacity-50" />
        </button>
        {openMenu === 'fc' && (
          <div className="absolute left-full ml-2 top-0 bg-white border border-slate-200 rounded-xl shadow-xl p-2 animate-slide-up z-50" style={{ minWidth: 200 }}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1 pb-1.5">Flowchart Shapes</p>
            <div className="grid grid-cols-2 gap-1">
              {FC_TOOLS.map(({ type, label, Preview }) => (
                <button key={type}
                  onClick={() => { setFcShape(type); setTool('flowchart'); setOpenMenu(null); }}
                  title={label}
                  className={cn(
                    'flex flex-col items-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-medium transition-all',
                    fcShape === type && tool === 'flowchart'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  )}
                >
                  <div className="flex items-center justify-center w-8 h-8 text-current">
                    {Preview}
                  </div>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Text */}
      <button onClick={() => { setTool('text'); setOpenMenu(null); }} title="Text (T)"
        className={cn('tool-btn', tool === 'text' && 'active')}>
        <Type size={16} />
      </button>

      {/* Connector — straight only, no sub-menu */}
      <button
        onClick={() => { setConnectorMode('straight'); setTool('connector'); }}
        title="Connector"
        className={cn('tool-btn', tool === 'connector' && 'active')}
      >
        <StraightLineIcon size={16} />
      </button>

      <div className="w-full h-px bg-slate-200 my-0.5" />

      {/* Color picker */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('color')}
          className="w-9 h-9 rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all shadow-sm flex-shrink-0"
          style={{ background: color }} title="Color"
        />
        {openMenu === 'color' && (
          <div className="absolute left-full top-0 ml-2 animate-fade-in z-50">
            <div className="flex flex-wrap gap-1 p-2 bg-white border border-slate-200 rounded-xl shadow-xl w-[96px]">
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
        )}
      </div>

      {/* Line width */}
      <div className="relative">
        <button onClick={() => toggleMenu('width')} className="tool-btn" title="Stroke width">
          <div className="rounded-full bg-current m-auto" style={{ width: Math.min(lineWidth * 2 + 4, 14), height: Math.min(lineWidth * 2 + 4, 14), background: color }} />
        </button>
        {openMenu === 'width' && (
          <div className="absolute left-full top-0 ml-2 animate-fade-in z-50">
            <div className="flex flex-col gap-1 p-3 bg-white border border-slate-200 rounded-xl shadow-xl">
              <p className="text-[10px] text-slate-400 font-medium mb-1">Width: {lineWidth}px</p>
              <input type="range" min={1} max={20} value={lineWidth}
                onChange={(e) => { const w = Number(e.target.value); setLineWidth(w); onStyleChange?.({ width: w, strokeWidth: w, fontSize: Math.max(12, w * 4) }); }}
                className="w-28 accent-emerald-500" />
              <p className="text-[10px] text-slate-400 font-medium mt-1">Opacity: {Math.round(opacity * 100)}%</p>
              <input type="range" min={0} max={100} value={opacity * 100}
                onChange={(e) => { const o = Number(e.target.value) / 100; setOpacity(o); onStyleChange?.({ opacity: o }); }}
                className="w-28 accent-emerald-500" />
            </div>
          </div>
        )}
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
