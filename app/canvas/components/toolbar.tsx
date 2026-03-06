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

const strokeTypes: { type: StrokeType; label: string; preview: string }[] = [
  { type: 'pen',    label: 'Pen',    preview: 'thin solid' },
  { type: 'pencil', label: 'Pencil', preview: 'thin dashed' },
  { type: 'marker', label: 'Marker', preview: 'thick solid' },
  { type: 'brush',  label: 'Brush',  preview: 'thick tapered' },
];

const shapes: { type: ShapeType; Icon: any; label: string }[] = [
  { type: 'rectangle', Icon: Square,    label: 'Rectangle' },
  { type: 'circle',    Icon: Circle,    label: 'Circle' },
  { type: 'triangle',  Icon: Triangle,  label: 'Triangle' },
  { type: 'diamond',   Icon: Diamond,   label: 'Diamond' },
  { type: 'line',      Icon: Minus,     label: 'Line' },
  { type: 'arrow',     Icon: ArrowRight, label: 'Arrow' },
];

// Quick color swatches - hand-picked, not a rainbow
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
  const [showColorPicker, setShowColorPicker]   = useState(false);
  const [showStrokePanel, setShowStrokePanel]   = useState(false);
  const [showShapePanel, setShowShapePanel]     = useState(false);
  const [showBrushPanel, setShowBrushPanel]     = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Close color picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColorPicker]);

  const isEraser = currentTool === 'draw' && currentStrokeType === 'eraser';

  const toolBtnClass = (active: boolean) =>
    `relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 group
     ${active
       ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
       : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`;

  return (
    <div className="absolute top-1/2 left-5 -translate-y-1/2 z-20 flex flex-col gap-2">

      {/* ── Main tool strip ─────────────────────────── */}
      <div
        className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border border-slate-200/80
                   bg-white/90 backdrop-blur-md shadow-xl shadow-slate-200/60"
        style={{ boxShadow: '0 4px 24px 0 rgba(16,185,129,0.07), 0 1px 4px rgba(0,0,0,0.06)' }}
      >
        {/* Draw */}
        <div className="relative">
          <button
            className={toolBtnClass(currentTool === 'draw' && !isEraser)}
            title="Draw (P)"
            onClick={() => {
              onToolChange('draw');
              if (currentStrokeType === 'eraser') onStrokeTypeChange('pen');
              setShowStrokePanel(v => !v);
              setShowShapePanel(false);
              setShowBrushPanel(false);
            }}
          >
            <Pencil size={18} strokeWidth={1.8} />
            {currentTool === 'draw' && !isEraser && (
              <span className="absolute -right-0.5 -top-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white" />
            )}
          </button>

          {showStrokePanel && currentTool === 'draw' && !isEraser && (
            <div
              className="absolute left-full ml-3 top-0 bg-white rounded-2xl shadow-2xl border border-slate-100
                         p-3 w-48 animate-in slide-in-from-left-2 duration-150"
            >
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Brush type</p>
              <div className="flex flex-col gap-1">
                {strokeTypes.map(({ type, label }) => (
                  <button
                    key={type}
                    onClick={() => { onStrokeTypeChange(type); setShowStrokePanel(false); }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all
                      ${currentStrokeType === type
                        ? 'bg-emerald-50 text-emerald-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span className="w-8 flex items-center">
                      <span
                        className="block rounded-full bg-current"
                        style={{
                          height: type === 'pen' || type === 'pencil' ? 1.5 : type === 'marker' ? 4 : 3,
                          width: '100%',
                          opacity: type === 'pencil' ? 0.5 : 1,
                        }}
                      />
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Shape */}
        <div className="relative">
          <button
            className={toolBtnClass(currentTool === 'shape')}
            title="Shapes"
            onClick={() => {
              onToolChange('shape');
              setShowShapePanel(v => !v);
              setShowBrushPanel(false);
            }}
          >
            {(() => { const s = shapes.find(s => s.type === currentShape); const I = s?.Icon ?? Square; return <I size={18} strokeWidth={1.8} />; })()}
            {currentTool === 'shape' && (
              <span className="absolute -right-0.5 -top-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white" />
            )}
          </button>

          {/* Shape picker panel — 2-col grid, properly spaced */}
          {showShapePanel && currentTool === 'shape' && (
            <div className="absolute left-full ml-3 top-0 bg-white rounded-2xl shadow-2xl
                            border border-slate-100 p-3 z-30 w-[148px]">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Shape
              </p>
              {/* 3 per row, 2 rows = all 6 shapes, never overflow */}
              <div className="grid grid-cols-3 gap-1.5">
                {shapes.map(({ type, Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => { onShapeChange(type); setShowShapePanel(false); }}
                    title={label}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                      ${currentShape === type
                        ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-300'
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}
                  >
                    <Icon size={17} strokeWidth={1.6} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Thin divider */}
        <div className="w-6 h-px bg-slate-200 my-0.5" />

        {/* Eraser */}
        <button
          className={toolBtnClass(isEraser)}
          title="Eraser (E)"
          onClick={() => { onToolChange('draw'); onStrokeTypeChange('eraser'); setShowStrokePanel(false); }}
        >
          <Eraser size={18} strokeWidth={1.8} />
        </button>

        {/* Select */}
        <button
          className={toolBtnClass(currentTool === 'select')}
          title="Select (V)"
          onClick={() => { onToolChange('select'); setShowStrokePanel(false); setShowShapePanel(false); }}
        >
          <MousePointer2 size={18} strokeWidth={1.8} />
        </button>

        {/* Pan */}
        <button
          className={toolBtnClass(currentTool === 'pan')}
          title="Pan (H)"
          onClick={() => { onToolChange('pan'); setShowStrokePanel(false); setShowShapePanel(false); }}
        >
          <Hand size={18} strokeWidth={1.8} />
        </button>

        {/* Text */}
        <button
          className={toolBtnClass(currentTool === 'text')}
          title="Text (T)"
          onClick={() => { onToolChange('text'); setShowStrokePanel(false); setShowShapePanel(false); }}
        >
          <Type size={18} strokeWidth={1.8} />
        </button>

        {/* Thin divider */}
        <div className="w-6 h-px bg-slate-200 my-0.5" />

        {/* Color swatch button */}
        <div className="relative" ref={colorPickerRef}>
          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all group"
            title="Color"
          >
            <div className="relative">
              <div
                className="w-6 h-6 rounded-lg border-2 border-white shadow-md transition-transform group-hover:scale-110"
                style={{ background: currentColor }}
              />
              {/* Ring */}
              <div
                className="absolute inset-0 rounded-lg ring-1 ring-slate-300/60"
              />
            </div>
          </button>

          {showColorPicker && (
            <div className="absolute left-full ml-3 top-0 z-30">
              <ColorPicker
                currentColor={currentColor}
                onColorChange={onColorChange}
                onClose={() => setShowColorPicker(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Brush settings pill ─────────────────────── */}
      <div
        className="flex flex-col gap-3 py-3 px-3 rounded-2xl border border-slate-200/80
                   bg-white/90 backdrop-blur-md shadow-lg shadow-slate-200/60"
        style={{ boxShadow: '0 4px 24px 0 rgba(16,185,129,0.07), 0 1px 4px rgba(0,0,0,0.06)' }}
      >
        {/* Quick color row */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest px-0.5">Color</span>
          <div className="grid grid-cols-3 gap-1.5">
            {QUICK_COLORS.map(c => (
              <button
                key={c}
                onClick={() => onColorChange(c)}
                className="w-7 h-7 rounded-lg transition-all hover:scale-110 active:scale-95"
                style={{
                  background: c,
                  boxShadow: currentColor === c
                    ? `0 0 0 2px white, 0 0 0 3.5px ${c}`
                    : '0 1px 3px rgba(0,0,0,0.15)',
                  border: c === '#ffffff' ? '1px solid #e2e8f0' : 'none',
                }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Size dots */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest px-0.5">Size</span>
          <div className="flex items-center justify-between px-0.5">
            {STROKE_SIZES.map(size => (
              <button
                key={size}
                onClick={() => onStrokeWidthChange(size)}
                title={`${size}px`}
                className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 transition-all"
              >
                <div
                  className="rounded-full bg-slate-700 transition-all"
                  style={{
                    width: Math.min(size + 4, 22),
                    height: Math.min(size + 4, 22),
                    opacity: strokeWidth === size ? 1 : 0.3,
                    background: strokeWidth === size ? '#10b981' : '#334155',
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Opacity slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Opacity</span>
            <span className="text-[10px] font-mono text-emerald-600 font-semibold">{Math.round(opacity * 100)}%</span>
          </div>
          <div className="relative px-0.5">
            <input
              type="range" min="0" max="100"
              value={Math.round(opacity * 100)}
              onChange={e => onOpacityChange(Number(e.target.value) / 100)}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #10b981 ${Math.round(opacity * 100)}%, #e2e8f0 ${Math.round(opacity * 100)}%)`,
                accentColor: '#10b981',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};