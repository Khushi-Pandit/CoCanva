/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import {
  Pencil,
  Eraser,
  Hand,
  MousePointer2,
  Square,
  Circle,
  Triangle,
  ArrowRight,
  Diamond,
  Minus,
  Type,
  Palette,
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

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  currentStrokeType,
  currentShape,
  currentColor,
  strokeWidth,
  opacity,
  onToolChange,
  onStrokeTypeChange,
  onShapeChange,
  onColorChange,
  onStrokeWidthChange,
  onOpacityChange,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStrokeTypes, setShowStrokeTypes] = useState(false);
  const [showShapes, setShowShapes] = useState(false);

  const strokeTypes: { type: StrokeType; label: string; icon: string }[] = [
    { type: 'pen', label: 'Pen', icon: '🖊️' },
    { type: 'pencil', label: 'Pencil', icon: '✏️' },
    { type: 'marker', label: 'Marker', icon: '🖍️' },
    { type: 'brush', label: 'Brush', icon: '🖌️' },
  ];

  const shapes: { type: ShapeType; Icon: any; label: string }[] = [
    { type: 'rectangle', Icon: Square, label: 'Rectangle' },
    { type: 'circle', Icon: Circle, label: 'Circle' },
    { type: 'triangle', Icon: Triangle, label: 'Triangle' },
    { type: 'diamond', Icon: Diamond, label: 'Diamond' },
    { type: 'line', Icon: Minus, label: 'Line' },
    { type: 'arrow', Icon: ArrowRight, label: 'Arrow' },
  ];

  return (
    <div className="absolute top-6 left-6 flex flex-col gap-3 z-10">
      {/* Main Tools */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-2 border border-gray-300 w-16">
        <div className="flex flex-col gap-1">
          {/* Draw Tools */}
          <div className="relative">
            <button
              onClick={() => {
                onToolChange('draw');
                setShowStrokeTypes(!showStrokeTypes);
              }}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                currentTool === 'draw'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              title="Draw (P)"
            >
              <Pencil size={20} />
            </button>

            {/* Stroke Type Submenu */}
            {showStrokeTypes && currentTool === 'draw' && (
              <div className="absolute left-full ml-2 top-0 bg-white rounded-xl shadow-xl p-2 border border-gray-200">
                <div className="flex flex-col gap-1">
                  {strokeTypes.map(({ type, label, icon }) => (
                    <button
                      key={type}
                      onClick={() => {
                        onStrokeTypeChange(type);
                        setShowStrokeTypes(false);
                      }}
                      className={`px-4 py-2 rounded-lg text-left hover:bg-gray-100 transition-colors flex items-center gap-2 whitespace-nowrap ${
                        currentStrokeType === type ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                      title={label}
                    >
                      <span className="text-lg">{icon}</span>
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Shape Tool */}
          <div className="relative">
            <button
              onClick={() => {
                onToolChange('shape');
                setShowShapes(!showShapes);
              }}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                currentTool === 'shape'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              title="Shapes (S)"
            >
              <Square size={20} />
            </button>

            {/* Shapes Submenu */}
            {showShapes && currentTool === 'shape' && (
              <div className="absolute left-full ml-2 top-0 bg-white rounded-xl shadow-xl p-2 border border-gray-200">
                <div className="grid grid-cols-2 gap-1">
                  {shapes.map(({ type, Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => {
                        onShapeChange(type);
                        setShowShapes(false);
                      }}
                      className={`w-12 h-12 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors ${
                        currentShape === type ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                      title={label}
                    >
                      <Icon size={18} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-gray-200 my-1" />

          {/* Eraser */}
          <button
            onClick={() => onToolChange('draw')}
            onDoubleClick={() => onStrokeTypeChange('eraser')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              currentStrokeType === 'eraser'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            title="Eraser (E)"
          >
            <Eraser size={20} />
          </button>

          {/* Select */}
          <button
            onClick={() => onToolChange('select')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              currentTool === 'select'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            title="Select (V)"
          >
            <MousePointer2 size={20} />
          </button>

          {/* Pan */}
          <button
            onClick={() => onToolChange('pan')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              currentTool === 'pan'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            title="Pan (H)"
          >
            <Hand size={20} />
          </button>

          {/* Text */}
          <button
            onClick={() => onToolChange('text')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              currentTool === 'text'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            title="Text (T)"
          >
            <Type size={20} />
          </button>
        </div>
      </div>

      {/* Color Picker Button */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-14 h-14 rounded-2xl bg-white/95 backdrop-blur-sm shadow-xl border-2 border-gray-200 hover:scale-105 transition-transform flex items-center justify-center"
          title="Color Picker"
        >
          <div className="relative">
            <Palette size={20} className="text-gray-600" />
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow-sm"
              style={{ background: currentColor }}
            />
          </div>
        </button>

        {showColorPicker && (
          <div className="absolute left-full ml-2 top-0">
            <ColorPicker
              currentColor={currentColor}
              onColorChange={onColorChange}
              onClose={() => setShowColorPicker(false)}
            />
          </div>
        )}
      </div>

      {/* Stroke Width & Opacity */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-4 border border-gray-200">
        <div className="space-y-4 w-48">
          {/* Stroke Width */}
          <div>
            <label className="flex items-center justify-between text-xs font-medium text-gray-600 mb-2">
              <span>Stroke Width</span>
              <span className="font-mono text-blue-600">{strokeWidth}px</span>
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={strokeWidth}
              onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1</span>
              <span>50</span>
            </div>
          </div>

          {/* Opacity */}
          <div>
            <label className="flex items-center justify-between text-xs font-medium text-gray-600 mb-2">
              <span>Opacity</span>
              <span className="font-mono text-blue-600">{Math.round(opacity * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={opacity * 100}
              onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};