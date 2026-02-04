import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3x3,
  Download,
  Share2,
  Trash2,
  Save,
} from 'lucide-react';
import { ExportFormat } from '../core/types';

interface TopControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onExport: (format: ExportFormat) => void;
  onShare: () => void;
  onClearAll: () => void;
  onSave: () => void;
  lastSaved?: Date | null;
}

export const TopControls: React.FC<TopControlsProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  showGrid,
  onToggleGrid,
  onExport,
  onShare,
  onClearAll,
  onSave,
  lastSaved,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const exportFormats: { format: ExportFormat; label: string; description: string }[] = [
    { format: 'png', label: 'PNG', description: 'High quality image' },
    { format: 'jpg', label: 'JPG', description: 'Compressed image' },
    { format: 'svg', label: 'SVG', description: 'Vector graphics' },
    { format: 'pdf', label: 'PDF', description: 'Document format' },
    { format: 'json', label: 'JSON', description: 'Data export' },
  ];

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-2 border border-gray-300">
        <div className="flex items-center gap-1">
          {/* Undo/Redo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-black"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-black"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={18} />
          </button>

          <div className="w-px h-6 bg-gray-400 mx-1" />

          {/* Zoom Controls */}
          <button
            onClick={onZoomOut}
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            title="Zoom Out (Ctrl+-)"
          >
            <ZoomOut size={18} className='text-gray-700' />
          </button>
          
          <button
            onClick={onResetZoom}
            className="px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors min-w-[60px]"
            title="Reset Zoom (Ctrl+0)"
          >
            <span className="text-sm font-medium text-gray-700">{Math.round(zoom * 100)}%</span>
          </button>
          
          <button
            onClick={onZoomIn}
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            title="Zoom In (Ctrl++)"
          >
            <ZoomIn size={18} className='text-gray-700' />
          </button>

          <div className="w-px h-6 bg-gray-400 mx-1" />

          {/* Grid Toggle */}
          <button
            onClick={onToggleGrid}
            className={`p-2.5 rounded-xl transition-all ${
              showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
            }`}
            title="Toggle Grid (Ctrl+G)"
          >
            <Grid3x3 size={18} className='text-gray-700' />
          </button>

          {/* Fit to Screen */}
          <button
            onClick={onResetZoom}
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 size={18} className='text-gray-700'/>
          </button>

          <div className="w-px h-6 bg-gray-400 mx-1" />

          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
              title="Export"
            >
              <Download size={18} className='text-gray-700' />
            </button>

            {showExportMenu && (
              <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[200px]">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-200">
                  Export as...
                </div>
                {exportFormats.map(({ format, label, description }) => (
                  <button
                    key={format}
                    onClick={() => {
                      onExport(format);
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">{label}</div>
                      <div className="text-xs text-gray-500">{description}</div>
                    </div>
                    <Download size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Share */}
          <button
            onClick={onShare}
            className="p-2.5 rounded-xl hover:bg-blue-100 hover:text-blue-600 transition-colors"
            title="Share"
          >
            <Share2 size={18} className='text-gray-700' />
          </button>

          {/* Save */}
          <button
            onClick={onSave}
            className="p-2.5 rounded-xl hover:bg-green-100 hover:text-green-600 transition-colors"
            title="Save (Ctrl+S)"
          >
            <Save size={18} className='text-gray-700'/>
          </button>

          <div className="w-px h-6 bg-gray-400 mx-1" />

          {/* Clear All */}
          <button
            onClick={onClearAll}
            className="p-2.5 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors"
            title="Clear All"
          >
            <Trash2 size={18} className='text-gray-700'/>
          </button>
        </div>
      </div>

      {/* Last Saved Indicator */}
      {/* {lastSaved && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md border border-gray-200">
          <span className="text-xs text-gray-600">
            Saved {formatTimeAgo(lastSaved)}
          </span>
        </div>
      )} */}
    </div>
  );
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}