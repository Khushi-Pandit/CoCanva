'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: app/canvas/components/toolbar.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Pencil, Eraser, Hand, MousePointer2,
  Square, Circle, Triangle, ArrowRight,
  Diamond, Minus, Type, Sparkles, Workflow,
  Database, Play, GitBranch, Hexagon, Sliders,
} from 'lucide-react';
import { ToolMode, StrokeType, ShapeType, FlowchartShapeType, FLOWCHART_DEFAULTS } from '../core/types';
import { ColorPicker } from './colorPicker';

interface ToolbarProps {
  currentTool: ToolMode;
  currentStrokeType: StrokeType;
  currentShape: ShapeType;
  currentColor: string;
  strokeWidth: number;
  opacity: number;
  onToolChange: (tool: ToolMode) => void;
  onStrokeTypeChange: (type: StrokeType) => void;
  onShapeChange: (shape: ShapeType) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onOpacityChange: (opacity: number) => void;
  currentFlowchartShape: FlowchartShapeType;
  onFlowchartShapeChange: (shape: FlowchartShapeType) => void;
  aiEnabled: boolean;
  onAIToggle: () => void;
  canEdit: boolean;
}

const STROKE_SIZES = [2, 4, 8, 16];

const strokeTypes: { type: StrokeType; label: string }[] = [
  { type: 'pen',    label: 'Pen'    },
  { type: 'pencil', label: 'Pencil' },
  { type: 'marker', label: 'Marker' },
  { type: 'brush',  label: 'Brush'  },
];

const shapes: { type: ShapeType; Icon: any; label: string }[] = [
  { type: 'rectangle', Icon: Square,     label: 'Rectangle' },
  { type: 'circle',    Icon: Circle,     label: 'Circle'    },
  { type: 'triangle',  Icon: Triangle,   label: 'Triangle'  },
  { type: 'diamond',   Icon: Diamond,    label: 'Diamond'   },
  { type: 'line',      Icon: Minus,      label: 'Line'      },
  { type: 'arrow',     Icon: ArrowRight, label: 'Arrow'     },
];

const flowchartShapes: { type: FlowchartShapeType; Icon: any; label: string; hint: string }[] = [
  { type: 'rectangle',    Icon: Square,    label: 'Process',  hint: 'Process / Action box' },
  { type: 'diamond',      Icon: Diamond,   label: 'Decision', hint: 'Decision / Condition' },
  { type: 'rounded_rect', Icon: Play,      label: 'Terminal', hint: 'Start / End' },
  { type: 'parallelogram',Icon: GitBranch, label: 'I/O',      hint: 'Input / Output' },
  { type: 'cylinder',     Icon: Database,  label: 'Database', hint: 'Database / Storage' },
  { type: 'hexagon',      Icon: Hexagon,   label: 'Prep',     hint: 'Preparation step' },
  { type: 'circle',       Icon: Circle,    label: 'Junction', hint: 'Connector / Junction' },
  { type: 'connector',    Icon: ArrowRight,label: 'Arrow',    hint: 'Connector arrow' },
];

// Compact quick colors — 2 rows of 5
const QUICK_COLORS = [
  '#111827', '#6B7280', '#EF4444', '#F97316', '#EAB308',
  '#10B981', '#0EA5E9', '#6366F1', '#EC4899', '#FFFFFF',
];

type PanelKey = 'stroke' | 'shape' | 'flowchart' | 'options' | 'color' | null;

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool, currentStrokeType, currentShape,
  currentColor, strokeWidth, opacity,
  onToolChange, onStrokeTypeChange, onShapeChange,
  onColorChange, onStrokeWidthChange, onOpacityChange,
  currentFlowchartShape, onFlowchartShapeChange,
  aiEnabled, onAIToggle, canEdit,
}) => {
  const [openPanel, setOpenPanel] = useState<PanelKey>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const isEraser = currentTool === 'draw' && currentStrokeType === 'eraser';

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const togglePanel = useCallback((panel: PanelKey) => {
    setOpenPanel(prev => prev === panel ? null : panel);
  }, []);

  const closePanel = useCallback(() => setOpenPanel(null), []);

  const btn = (active: boolean, disabled = false) =>
    `relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150
     ${disabled ? 'opacity-30 cursor-not-allowed'
     : active
       ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
       : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`;

  const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div
      className={`absolute left-full ml-3 top-0 bg-white rounded-2xl shadow-2xl border
                  border-slate-100/80 p-3 z-30 ${className}`}
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)' }}
    >
      {children}
    </div>
  );

  const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{children}</p>
  );

  // ── Draw button handler ──
  // FIX: Always activate draw+pen on first click, then toggle panel on subsequent clicks.
  // Previously the nested `if` block was swallowing the togglePanel call when
  // the tool was already 'draw', causing the panel (and sometimes the tool state)
  // to silently do nothing.
  const handleDrawClick = useCallback(() => {
    if (currentTool !== 'draw' || currentStrokeType === 'eraser') {
      // Switch to draw tool with pen — always fire both calls unconditionally
      onToolChange('draw');
      onStrokeTypeChange('pen');
      // Open the stroke panel so the user can see they're in draw mode
      setOpenPanel('stroke');
    } else {
      // Already on draw (non-eraser) — just toggle the panel
      togglePanel('stroke');
    }
  }, [currentTool, currentStrokeType, onToolChange, onStrokeTypeChange, togglePanel]);

  // ── Shape button handler ──
  // FIX: Call onToolChange unconditionally BEFORE toggling the panel.
  // Previously both were called together but the panel condition depended on
  // currentTool which hadn't updated yet (React batches state), so the panel
  // would never render on the first click.
  const handleShapeClick = useCallback(() => {
    onToolChange('shape');
    setOpenPanel(prev => prev === 'shape' ? null : 'shape');
  }, [onToolChange]);

  // ── Flowchart button handler ── (same fix as shape)
  const handleFlowchartClick = useCallback(() => {
    onToolChange('flowchart');
    setOpenPanel(prev => prev === 'flowchart' ? null : 'flowchart');
  }, [onToolChange]);

  return (
    <div
      ref={toolbarRef}
      className="absolute top-1/2 left-3 -translate-y-1/2 z-20 flex flex-col gap-1.5"
    >
      <div
        className="relative flex flex-col items-center gap-0.5 py-2 px-1.5 rounded-2xl border border-slate-200/70
                   bg-white/95 backdrop-blur-md"
        style={{ boxShadow: '0 4px 24px rgba(16,185,129,0.08), 0 1px 6px rgba(0,0,0,0.06)' }}
      >

        {/* ── Draw ── */}
        {canEdit && (
          <div className="relative">
            <button
              className={btn(currentTool === 'draw' && !isEraser)}
              title="Draw (P)"
              onClick={handleDrawClick}
            >
              <Pencil size={15} strokeWidth={1.8} />
              {currentTool === 'draw' && !isEraser && (
                <span className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-white" />
              )}
            </button>

            {/* FIX: Panel visibility no longer depends on currentTool matching —
                it only depends on openPanel state. This prevents the race condition
                where React batches the tool change and the panel check sees the old value. */}
            {openPanel === 'stroke' && !isEraser && (
              <Panel className="w-40">
                <Label>Brush Type</Label>
                <div className="space-y-0.5">
                  {strokeTypes.map(({ type, label }) => (
                    <button
                      key={type}
                      onClick={() => { onStrokeTypeChange(type); closePanel(); }}
                      className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs transition-all
                        ${currentStrokeType === type
                          ? 'bg-emerald-50 text-emerald-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span
                        className="block rounded-full bg-current flex-shrink-0"
                        style={{
                          height: type === 'pen' || type === 'pencil' ? 2 : type === 'marker' ? 5 : 3.5,
                          width: 22,
                          opacity: type === 'pencil' ? 0.5 : 1,
                        }}
                      />
                      {label}
                    </button>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* ── Basic Shapes ── */}
        {canEdit && (
          <div className="relative">
            <button
              className={btn(currentTool === 'shape')}
              title="Shapes"
              onClick={handleShapeClick}
            >
              {(() => { const s = shapes.find(s => s.type === currentShape); const I = s?.Icon ?? Square; return <I size={15} strokeWidth={1.8} />; })()}
              {currentTool === 'shape' && (
                <span className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-white" />
              )}
            </button>

            {/* FIX: Panel only depends on openPanel state, not currentTool */}
            {openPanel === 'shape' && (
              <Panel className="w-[124px]">
                <Label>Shape</Label>
                <div className="grid grid-cols-3 gap-1">
                  {shapes.map(({ type, Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => { onShapeChange(type); closePanel(); }}
                      title={label}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all
                        ${currentShape === type
                          ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-300'
                          : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}
                    >
                      <Icon size={15} strokeWidth={1.6} />
                    </button>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* ── Flowchart Tool ── */}
        {canEdit && (
          <div className="relative">
            <button
              className={btn(currentTool === 'flowchart')}
              title="Flowchart shapes (F)"
              onClick={handleFlowchartClick}
            >
              <Workflow size={15} strokeWidth={1.8} />
              {currentTool === 'flowchart' && (
                <span className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 rounded-full bg-blue-400 border border-white" />
              )}
            </button>

            {/* FIX: Panel only depends on openPanel state, not currentTool */}
            {openPanel === 'flowchart' && (
              <Panel className="w-52">
                <Label>Flowchart</Label>
                <div className="space-y-0.5">
                  {flowchartShapes.map(({ type, Icon, label, hint }) => {
                    const defs = FLOWCHART_DEFAULTS[type];
                    return (
                      <button
                        key={type}
                        onClick={() => { onFlowchartShapeChange(type); closePanel(); }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all
                          ${currentFlowchartShape === type
                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                            : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ background: defs.fillColor, border: `1.5px solid ${defs.color}` }}
                        >
                          <Icon size={13} style={{ color: defs.color }} strokeWidth={1.8} />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold leading-tight">{label}</p>
                          <p className="text-[9px] text-slate-400 leading-tight">{hint}</p>
                        </div>
                        {currentFlowchartShape === type && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 px-2 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-[9px] text-amber-700 font-medium">
                    💡 Enable AI to get ghost suggestions while drawing
                  </p>
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="w-5 h-px bg-slate-200 my-0.5" />

        {/* ── Eraser ── */}
        {canEdit && (
          <button
            className={btn(isEraser)}
            title="Eraser (E) — splits strokes, preserves grid"
            onClick={() => { onToolChange('draw'); onStrokeTypeChange('eraser'); closePanel(); }}
          >
            <Eraser size={15} strokeWidth={1.8} />
          </button>
        )}

        {/* ── Select ── */}
        <button
          className={btn(currentTool === 'select')}
          title="Select (V)"
          onClick={() => { onToolChange('select'); closePanel(); }}
        >
          <MousePointer2 size={15} strokeWidth={1.8} />
        </button>

        {/* ── Pan ── */}
        <button
          className={btn(currentTool === 'pan')}
          title="Pan (H) — or hold Space"
          onClick={() => { onToolChange('pan'); closePanel(); }}
        >
          <Hand size={15} strokeWidth={1.8} />
        </button>

        {/* ── Text ── */}
        {canEdit && (
          <button
            className={btn(currentTool === 'text')}
            title="Text (T)"
            onClick={() => { onToolChange('text'); closePanel(); }}
          >
            <Type size={15} strokeWidth={1.8} />
          </button>
        )}

        {/* Divider */}
        <div className="w-5 h-px bg-slate-200 my-0.5" />

        {/* ── Color swatch (quick) ── */}
        {canEdit && (
          <div className="relative">
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-all group"
              title="Color picker"
              onClick={() => togglePanel('color')}
            >
              <div
                className="w-5 h-5 rounded-md border-2 border-white shadow-sm ring-1 ring-slate-200/80 transition-transform group-hover:scale-110"
                style={{ background: currentColor }}
              />
            </button>

            {openPanel === 'color' && (
              <div className="absolute left-full ml-3 top-0 z-30">
                <ColorPicker
                  currentColor={currentColor}
                  onColorChange={onColorChange}
                  onClose={closePanel}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Options (size + color swatches + opacity) — merged panel ── */}
        {canEdit && (
          <div className="relative">
            <button
              className={btn(openPanel === 'options')}
              title="Size & options"
              onClick={() => togglePanel('options')}
            >
              <Sliders size={14} strokeWidth={1.8} />
            </button>

            {openPanel === 'options' && (
              <Panel className="w-48">
                {/* Size */}
                <Label>Stroke Size</Label>
                <div className="flex items-center justify-between mb-3">
                  {STROKE_SIZES.map(size => (
                    <button
                      key={size}
                      onClick={() => onStrokeWidthChange(size)}
                      title={`${size}px`}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all
                        ${strokeWidth === size ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'hover:bg-slate-50'}`}
                    >
                      <div
                        className="rounded-full transition-all"
                        style={{
                          width:  Math.min(size * 1.8 + 2, 20),
                          height: Math.min(size * 1.8 + 2, 20),
                          background: strokeWidth === size ? '#10b981' : '#94a3b8',
                        }}
                      />
                    </button>
                  ))}
                </div>

                {/* Color swatches — compact 2-row grid */}
                <Label>Quick Colors</Label>
                <div className="grid grid-cols-5 gap-1 mb-3">
                  {QUICK_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => onColorChange(c)}
                      className="w-7 h-7 rounded-md transition-all hover:scale-110 active:scale-95"
                      style={{
                        background: c,
                        boxShadow: currentColor === c
                          ? `0 0 0 2px white, 0 0 0 3.5px ${c === '#FFFFFF' ? '#94a3b8' : c}`
                          : c === '#FFFFFF'
                            ? '0 0 0 1px #e2e8f0'
                            : '0 1px 3px rgba(0,0,0,0.15)',
                      }}
                    />
                  ))}
                </div>

                {/* Opacity */}
                <Label>Opacity</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="0" max="100"
                    value={Math.round(opacity * 100)}
                    onChange={e => onOpacityChange(Number(e.target.value) / 100)}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #10b981 ${Math.round(opacity * 100)}%, #e2e8f0 ${Math.round(opacity * 100)}%)`,
                      accentColor: '#10b981',
                    }}
                  />
                  <span className="text-[10px] font-mono text-emerald-600 font-bold w-8 text-right tabular-nums">
                    {Math.round(opacity * 100)}%
                  </span>
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="w-5 h-px bg-slate-200 my-0.5" />

        {/* ── AI Toggle ── */}
        <button
          className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200
            ${aiEnabled
              ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-purple-200'
              : 'text-slate-400 hover:bg-slate-100 hover:text-purple-500'}`}
          title={aiEnabled ? 'AI mode ON — click to disable' : 'Enable AI mode'}
          onClick={onAIToggle}
        >
          <Sparkles size={14} strokeWidth={1.8} />
          {aiEnabled && (
            <span className="absolute -right-0.5 -top-0.5 w-2 h-2 rounded-full bg-green-400 border border-white animate-pulse" />
          )}
        </button>
      </div>

      {/* AI mode label */}
      {aiEnabled && (
        <div className="flex items-center justify-center gap-1 px-2 py-1 bg-violet-500 rounded-lg">
          <Sparkles size={8} className="text-white" />
          <span className="text-[8px] font-bold text-white uppercase tracking-wider">AI ON</span>
        </div>
      )}
    </div>
  );
};