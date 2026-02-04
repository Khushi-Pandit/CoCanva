import React, { useState } from 'react';
import { Palette, Pipette } from 'lucide-react';

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string)=> void;
  onClose?: () => void;
}

const PRESET_COLORS = [
  // Primary Colors
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Gray', hex: '#6B7280' },
  { name: 'Light Gray', hex: '#D1D5DB' },
  
  // Reds
  { name: 'Red', hex: '#EF4444' },
  { name: 'Dark Red', hex: '#991B1B' },
  { name: 'Light Red', hex: '#FCA5A5' },
  { name: 'Pink', hex: '#EC4899' },
  
  // Oranges & Yellows
  { name: 'Orange', hex: '#F97316' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Light Yellow', hex: '#FDE047' },
  
  // Greens
  { name: 'Green', hex: '#22C55E' },
  { name: 'Dark Green', hex: '#15803D' },
  { name: 'Lime', hex: '#84CC16' },
  { name: 'Emerald', hex: '#10B981' },
  
  // Blues
  { name: 'Sky Blue', hex: '#06B6D4' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Dark Blue', hex: '#1E40AF' },
  { name: 'Light Blue', hex: '#93C5FD' },
  
  // Purples
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Fuchsia', hex: '#D946EF' },
  
  // Browns
  { name: 'Brown', hex: '#92400E' },
  { name: 'Tan', hex: '#D97706' },
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  currentColor,
  onColorChange,
  onClose,
}) => {
  const [customColor, setCustomColor] = useState(currentColor);
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-4 w-72">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Palette size={16} />
          Color Palette
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Preset Colors Grid */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.hex}
            onClick={() => onColorChange(color.hex)}
            className={`h-9 w-9 rounded-lg transition-all hover:scale-110 ${
              currentColor === color.hex
                ? 'ring-2 ring-blue-500 ring-offset-2'
                : 'hover:ring-2 ring-gray-300'
            }`}
            style={{
              background: color.hex,
              border: color.hex === '#FFFFFF' ? '1px solid #E5E7EB' : 'none',
            }}
            title={color.name}
          />
        ))}
      </div>

      {/* Custom Color Section */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="w-full flex items-center justify-between text-sm text-gray-700 hover:text-gray-900 mb-3"
        >
          <span className="flex items-center gap-2">
            <Pipette size={14} />
            Custom Color
          </span>
          <span className="text-xs text-gray-400">
            {showCustom ? '▼' : '▶'}
          </span>
        </button>

        {showCustom && (
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  onColorChange(e.target.value);
                }}
                className="h-10 w-full rounded-lg cursor-pointer"
              />
            </div>

            <input
              type="text"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                  onColorChange(e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#000000"
            />
          </div>
        )}
      </div>

      {/* Current Color Preview */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Current</span>
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-16 rounded-lg border border-gray-200"
              style={{ background: currentColor }}
            />
            <span className="text-xs font-mono text-gray-600">{currentColor}</span>
          </div>
        </div>
      </div>
    </div>
  );
};