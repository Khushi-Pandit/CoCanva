'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  onClose?: () => void;
}

// Carefully curated palette — not a rainbow, feels hand-picked
const PALETTE = [
  // Neutrals
  { name: 'Ink',        hex: '#111827' },
  { name: 'Charcoal',   hex: '#374151' },
  { name: 'Slate',      hex: '#64748B' },
  { name: 'Mist',       hex: '#CBD5E1' },
  { name: 'White',      hex: '#FFFFFF' },

  // Warm
  { name: 'Crimson',    hex: '#DC2626' },
  { name: 'Coral',      hex: '#F87171' },
  { name: 'Tangerine',  hex: '#F97316' },
  { name: 'Amber',      hex: '#F59E0B' },
  { name: 'Lemon',      hex: '#FDE047' },

  // Cool
  { name: 'Emerald',    hex: '#10B981' },
  { name: 'Mint',       hex: '#6EE7B7' },
  { name: 'Sky',        hex: '#0EA5E9' },
  { name: 'Ocean',      hex: '#0284C7' },
  { name: 'Indigo',     hex: '#4F46E5' },
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  currentColor, onColorChange, onClose,
}) => {
  const [hex, setHex]           = useState(currentColor);
  const [hexInput, setHexInput] = useState(currentColor);
  const [showCustom, setShowCustom] = useState(false);

  const handleHexInput = (val: string) => {
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setHex(val);
      onColorChange(val);
    }
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 w-64
                 animate-in zoom-in-95 slide-in-from-left-2 duration-150"
      style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Color</span>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg
                       text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Current color preview */}
      <div
        className="w-full h-10 rounded-xl mb-3 border border-slate-100 shadow-inner"
        style={{ background: currentColor }}
      />

      {/* Swatch grid */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        {PALETTE.map(({ hex: c, name }) => (
          <button
            key={c}
            onClick={() => { onColorChange(c); setHexInput(c); setHex(c); }}
            title={name}
            className="w-9 h-9 rounded-xl transition-all hover:scale-110 active:scale-95"
            style={{
              background: c,
              boxShadow: currentColor === c
                ? `0 0 0 2px white, 0 0 0 3.5px #10b981`
                : '0 1px 3px rgba(0,0,0,0.12)',
              border: c === '#FFFFFF' ? '1.5px solid #E2E8F0' : 'none',
            }}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 mb-3" />

      {/* Custom color toggle */}
      <button
        onClick={() => setShowCustom(v => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold
                   text-slate-500 hover:text-slate-700 transition-colors mb-1"
      >
        <span>Custom color</span>
        <span className="text-slate-300 text-base leading-none">{showCustom ? '−' : '+'}</span>
      </button>

      {showCustom && (
        <div className="space-y-2 pt-1">
          <input
            type="color"
            value={hex}
            onChange={e => { setHex(e.target.value); setHexInput(e.target.value); onColorChange(e.target.value); }}
            className="w-full h-9 rounded-xl cursor-pointer border-0"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">#</span>
            <input
              type="text"
              value={hexInput.replace('#', '')}
              maxLength={6}
              onChange={e => handleHexInput('#' + e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200
                         text-xs font-mono text-slate-700 focus:outline-none
                         focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              placeholder="10b981"
            />
          </div>
        </div>
      )}
    </div>
  );
};