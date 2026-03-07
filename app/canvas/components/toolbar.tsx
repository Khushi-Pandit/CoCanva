/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Pencil, Eraser, Hand, MousePointer2,
  Square, Circle, Triangle, ArrowRight,
  Diamond, Minus, Type,
} from 'lucide-react';
import { ToolMode, StrokeType, ShapeType } from '../core/types';
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

const QUICK_COLORS = [
  '#111827', '#6B7280', '#EF4444',
  '#F97316', '#EAB308', '#10B981',
  '#0EA5E9', '#6366F1', '#EC4899',
];

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool, currentStrokeType, currentShape,
  currentColor, strokeWidth, opacity,
  onToolChange, onStrokeTypeChange, onShapeChange,
  onColorChange, onStrokeWidthChange, onOpacityChange,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStrokePanel, setShowStrokePanel] = useState(false);
  const [showShapePanel,  setShowShapePanel]  = useState(false);
  const [showSizePanel,   setShowSizePanel]   = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);

  const isEraser = currentTool === 'draw' && currentStrokeType === 'eraser';

  // Close color picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColorPicker]);

  const btn = (active: boolean) =>
    `relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150
     ${active
       ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
       : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`;

  const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div
      className={`absolute left-full ml-2.5 top-0 bg-white rounded-xl shadow-2xl border
                  border-slate-100 p-2.5 z-30 animate-in slide-in-from-left-1 duration-150 ${className}`}
    >
      {children}
    </div>
  );

  return (
    // Compact vertical strip — narrower, centered vertically
    <div className="absolute top-1/2 left-3 -translate-y-1/2 z-20 flex flex-col gap-1.5">

      {/* ── Tool strip ── */}
      <div
        className="flex flex-col items-center gap-0.5 py-2 px-1.5 rounded-xl border border-slate-200/80
                   bg-white/95 backdrop-blur-md"
        style={{ boxShadow: '0 2px 16px rgba(16,185,129,0.08), 0 1px 4px rgba(0,0,0,0.06)' }}
      >
        {/* Draw */}
        <div className="relative">
          <button
            className={btn(currentTool === 'draw' && !isEraser)}
            title="Draw (P)"
            onClick={() => {
              onToolChange('draw');
              if (currentStrokeType === 'eraser') onStrokeTypeChange('pen');
              setShowStrokePanel(v => !v);
              setShowShapePanel(false);
              setShowSizePanel(false);
            }}
          >
            <Pencil size={15} strokeWidth={1.8} />
            {currentTool === 'draw' && !isEraser && (
              <span className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-white" />
            )}
          </button>

          {showStrokePanel && currentTool === 'draw' && !isEraser && (
            <Panel className="w-36">
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Brush</p>
              {strokeTypes.map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => { onStrokeTypeChange(type); setShowStrokePanel(false); }}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs transition-all
                    ${currentStrokeType === type
                      ? 'bg-emerald-50 text-emerald-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span
                    className="block rounded-full bg-current flex-shrink-0"
                    style={{
                      height: type === 'pen' || type === 'pencil' ? 1.5 : type === 'marker' ? 4 : 3,
                      width: 20,
                      opacity: type === 'pencil' ? 0.5 : 1,
                    }}
                  />
                  {label}
                </button>
              ))}
            </Panel>
          )}
        </div>

        {/* Shape */}
        <div className="relative">
          <button
            className={btn(currentTool === 'shape')}
            title="Shapes"
            onClick={() => {
              onToolChange('shape');
              setShowShapePanel(v => !v);
              setShowStrokePanel(false);
              setShowSizePanel(false);
            }}
          >
            {(() => { const s = shapes.find(s => s.type === currentShape); const I = s?.Icon ?? Square; return <I size={15} strokeWidth={1.8} />; })()}
            {currentTool === 'shape' && (
              <span className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-white" />
            )}
          </button>

          {showShapePanel && currentTool === 'shape' && (
            <Panel className="w-[124px]">
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Shape</p>
              <div className="grid grid-cols-3 gap-1">
                {shapes.map(({ type, Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => { onShapeChange(type); setShowShapePanel(false); }}
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

        {/* Divider */}
        <div className="w-5 h-px bg-slate-200 my-0.5" />

        {/* Eraser */}
        <button
          className={btn(isEraser)}
          title="Eraser (E)"
          onClick={() => { onToolChange('draw'); onStrokeTypeChange('eraser'); setShowStrokePanel(false); }}
        >
          <Eraser size={15} strokeWidth={1.8} />
        </button>

        {/* Select */}
        <button
          className={btn(currentTool === 'select')}
          title="Select (V)"
          onClick={() => { onToolChange('select'); setShowStrokePanel(false); setShowShapePanel(false); }}
        >
          <MousePointer2 size={15} strokeWidth={1.8} />
        </button>

        {/* Pan */}
        <button
          className={btn(currentTool === 'pan')}
          title="Pan (H)"
          onClick={() => { onToolChange('pan'); setShowStrokePanel(false); setShowShapePanel(false); }}
        >
          <Hand size={15} strokeWidth={1.8} />
        </button>

        {/* Text */}
        <button
          className={btn(currentTool === 'text')}
          title="Text (T)"
          onClick={() => { onToolChange('text'); setShowStrokePanel(false); setShowShapePanel(false); }}
        >
          <Type size={15} strokeWidth={1.8} />
        </button>

        {/* Divider */}
        <div className="w-5 h-px bg-slate-200 my-0.5" />

        {/* Color swatch — opens picker on click */}
        <div className="relative" ref={colorRef}>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-all"
            title="Color"
            onClick={() => setShowColorPicker(v => !v)}
          >
            <div
              className="w-5 h-5 rounded-md border-2 border-white shadow-sm ring-1 ring-slate-200/80"
              style={{ background: currentColor }}
            />
          </button>

          {showColorPicker && (
            <div className="absolute left-full ml-2.5 top-0 z-30">
              <ColorPicker
                currentColor={currentColor}
                onColorChange={onColorChange}
                onClose={() => setShowColorPicker(false)}
              />
            </div>
          )}
        </div>

        {/* Size dot — opens size panel on click */}
        <div className="relative">
          <button
            className={btn(showSizePanel)}
            title="Brush size"
            onClick={() => { setShowSizePanel(v => !v); setShowStrokePanel(false); setShowShapePanel(false); }}
          >
            <div
              className="rounded-full bg-current"
              style={{ width: Math.min(strokeWidth + 4, 14), height: Math.min(strokeWidth + 4, 14) }}
            />
          </button>

          {showSizePanel && (
            <Panel className="w-44">
              {/* Size */}
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-0.5">Size</p>
              <div className="flex items-center justify-between px-0.5 mb-3">
                {STROKE_SIZES.map(size => (
                  <button
                    key={size}
                    onClick={() => onStrokeWidthChange(size)}
                    title={`${size}px`}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    <div
                      className="rounded-full transition-all"
                      style={{
                        width:  Math.min(size + 4, 20),
                        height: Math.min(size + 4, 20),
                        background: strokeWidth === size ? '#10b981' : '#94a3b8',
                        opacity: strokeWidth === size ? 1 : 0.4,
                      }}
                    />
                  </button>
                ))}
              </div>

              {/* Quick colors */}
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-0.5">Color</p>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {QUICK_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => onColorChange(c)}
                    className="w-8 h-8 rounded-lg transition-all hover:scale-110 active:scale-95"
                    style={{
                      background: c,
                      boxShadow: currentColor === c
                        ? `0 0 0 2px white, 0 0 0 3px ${c}`
                        : '0 1px 3px rgba(0,0,0,0.15)',
                    }}
                    title={c}
                  />
                ))}
              </div>

              {/* Opacity */}
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">Opacity</p>
              <div className="flex items-center gap-2 px-0.5">
                <input
                  type="range" min="0" max="100"
                  value={Math.round(opacity * 100)}
                  onChange={e => onOpacityChange(Number(e.target.value) / 100)}
                  className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #10b981 ${Math.round(opacity * 100)}%, #e2e8f0 ${Math.round(opacity * 100)}%)`,
                    accentColor: '#10b981',
                  }}
                />
                <span className="text-[10px] font-mono text-emerald-600 font-semibold w-7 text-right">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
};