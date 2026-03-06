'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Undo2, Redo2, ZoomIn, ZoomOut,
  Grid3x3, Download, Share2, Trash2,
  ChevronDown, Check,
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

const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200];

export const TopControls: React.FC<TopControlsProps> = ({
  canUndo, canRedo, onUndo, onRedo,
  zoom, onZoomIn, onZoomOut, onResetZoom,
  showGrid, onToggleGrid,
  onExport, onShare, onClearAll, onSave, lastSaved,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showZoomMenu, setShowZoomMenu]     = useState(false);
  const [copiedShare, setCopiedShare]       = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const zoomRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false);
      if (zoomRef.current   && !zoomRef.current.contains(e.target as Node))   setShowZoomMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const exportFormats: { format: ExportFormat; label: string; ext: string }[] = [
    { format: 'png',  label: 'PNG Image',       ext: '.png' },
    { format: 'jpg',  label: 'JPEG Image',       ext: '.jpg' },
    { format: 'svg',  label: 'SVG Vector',       ext: '.svg' },
    { format: 'pdf',  label: 'PDF Document',     ext: '.pdf' },
    { format: 'json', label: 'JSON Data',        ext: '.json' },
  ];

  // Shared button style
  const iconBtn = (active = false, danger = false) =>
    `flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150
     ${danger  ? 'text-slate-400 hover:bg-red-50 hover:text-red-500'
     : active  ? 'bg-emerald-50 text-emerald-600'
     : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`;

  const sep = <div className="w-px h-5 bg-slate-200 mx-0.5" />;

  return (
    <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">

      {/* ── History ──────────────────────────────────── */}
      <div
        className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-xl bg-white/90 backdrop-blur-md
                   border border-slate-200/80 shadow-md shadow-slate-200/40"
      >
        <button
          onClick={onUndo} disabled={!canUndo}
          className={`${iconBtn()} disabled:opacity-25 disabled:cursor-not-allowed`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} strokeWidth={2} />
        </button>
        <button
          onClick={onRedo} disabled={!canRedo}
          className={`${iconBtn()} disabled:opacity-25 disabled:cursor-not-allowed`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={16} strokeWidth={2} />
        </button>
      </div>

      {/* ── Zoom ─────────────────────────────────────── */}
      <div
        className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-xl bg-white/90 backdrop-blur-md
                   border border-slate-200/80 shadow-md shadow-slate-200/40"
      >
        <button onClick={onZoomOut} className={iconBtn()} title="Zoom out">
          <ZoomOut size={16} strokeWidth={2} />
        </button>

        {/* Zoom % with dropdown */}
        <div className="relative" ref={zoomRef}>
          <button
            onClick={() => setShowZoomMenu(v => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <span className="text-xs font-semibold text-slate-700 tabular-nums w-8 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <ChevronDown size={11} className="text-slate-400" />
          </button>

          {showZoomMenu && (
            <div
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-xl
                         shadow-2xl border border-slate-100 py-1.5 min-w-[110px] z-50
                         animate-in slide-in-from-top-1 duration-150"
            >
              {ZOOM_PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => { onResetZoom(); setShowZoomMenu(false); }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs
                             text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                >
                  <span>{p}%</span>
                  {Math.round(zoom * 100) === p && <Check size={11} className="text-emerald-500" />}
                </button>
              ))}
              <div className="h-px bg-slate-100 my-1" />
              <button
                onClick={() => { onResetZoom(); setShowZoomMenu(false); }}
                className="w-full px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 text-left transition-colors"
              >
                Reset to 100%
              </button>
            </div>
          )}
        </div>

        <button onClick={onZoomIn} className={iconBtn()} title="Zoom in">
          <ZoomIn size={16} strokeWidth={2} />
        </button>
      </div>

      {/* ── View ─────────────────────────────────────── */}
      <div
        className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-xl bg-white/90 backdrop-blur-md
                   border border-slate-200/80 shadow-md shadow-slate-200/40"
      >
        <button
          onClick={onToggleGrid}
          className={iconBtn(showGrid)}
          title="Grid (Ctrl+G)"
        >
          <Grid3x3 size={16} strokeWidth={1.8} />
        </button>
      </div>

      {/* ── Actions ──────────────────────────────────── */}
      <div
        className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-xl bg-white/90 backdrop-blur-md
                   border border-slate-200/80 shadow-md shadow-slate-200/40"
      >
        {/* Export */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setShowExportMenu(v => !v)}
            className={iconBtn(showExportMenu)}
            title="Export"
          >
            <Download size={16} strokeWidth={2} />
          </button>

          {showExportMenu && (
            <div
              className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-2xl
                         border border-slate-100 py-2 min-w-[180px] z-50
                         animate-in slide-in-from-top-1 duration-150"
            >
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-4 pb-2">
                Export as
              </p>
              {exportFormats.map(({ format, label, ext }) => (
                <button
                  key={format}
                  onClick={() => { onExport(format); setShowExportMenu(false); }}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm
                             text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                >
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-slate-400 font-mono">{ext}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Share */}
        <button
          onClick={onShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                     bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700
                     transition-all shadow-sm shadow-emerald-200 hover:shadow-md hover:shadow-emerald-200"
          title="Share"
        >
          <Share2 size={13} strokeWidth={2.2} />
          Share
        </button>

        {sep}

        {/* Clear */}
        <button
          onClick={onClearAll}
          className={iconBtn(false, true)}
          title="Clear canvas"
        >
          <Trash2 size={16} strokeWidth={1.8} />
        </button>
      </div>

      {/* Last saved pill — subtle, only when saved */}
      {lastSaved && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/80 backdrop-blur-md
                     border border-slate-200/60 shadow-sm"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-slate-500 font-medium">{formatTimeAgo(lastSaved)}</span>
        </div>
      )}
    </div>
  );
};

function formatTimeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 5)    return 'Saved';
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}