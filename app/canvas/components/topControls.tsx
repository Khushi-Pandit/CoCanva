'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Undo2, Redo2, ZoomIn, ZoomOut,
  Grid3x3, Download, Share2, Trash2,
  ChevronDown, Check, Copy, CheckCheck,
  Eye, Pencil, Zap, Globe, Loader2,
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
  onClearAll: () => void;
  onSave: () => void;
  lastSaved?: Date | null;

  // ── Share props ──────────────────────────────────────────────────────────
  // OLD: onShare: () => void   ← removed, was a no-op that caused the error
  // NEW: pass canvasId + token so we can call POST /canvas/:id/share directly
  canvasId: string;
  firebaseToken: string;
  userRole: string;  // 'owner' | 'editor' | 'viewer' | 'voice'
}

const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200];

type AccessLevel = 'viewer' | 'editor' | 'voice';

const ACCESS_OPTIONS: {
  level: AccessLevel;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    level: 'viewer',
    label: 'View only',
    description: 'Can see the canvas, no edits',
    icon: <Eye size={14} strokeWidth={2} />,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
  },
  {
    level: 'editor',
    label: 'Can edit',
    description: 'Draw, erase, add shapes',
    icon: <Pencil size={14} strokeWidth={2} />,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  {
    level: 'voice',
    label: 'Full access',
    description: 'Edit + voice & presence sync',
    icon: <Zap size={14} strokeWidth={2} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
];

// ── Hook: fetch all 3 share links once per popover open ──────────────────────
function useShareLinks(canvasId: string, firebaseToken: string) {
  const [links,   setLinks]   = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const fetchedRef            = useRef(false);

  // Reset when canvas changes
  useEffect(() => {
    fetchedRef.current = false;
    setLinks({});
    setError(null);
  }, [canvasId]);

  const refetch = useCallback(async () => {
    if (loading) return;
    fetchedRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/${canvasId}/share`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseToken}`,
          },
          body: JSON.stringify({ roles: ['viewer', 'editor', 'voice'] }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Error ${res.status}`);
      }
      const data = await res.json();
      setLinks(data.links ?? {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not generate links';
      setError(msg);
      fetchedRef.current = false; // allow retry
    } finally {
      setLoading(false);
    }
  }, [canvasId, firebaseToken, loading]);

  return { links, loading, error, fetched: fetchedRef.current, refetch };
}

// ─────────────────────────────────────────────────────────────────────────────

export const TopControls: React.FC<TopControlsProps> = ({
  canUndo, canRedo, onUndo, onRedo,
  zoom, onZoomIn, onZoomOut, onResetZoom,
  showGrid, onToggleGrid,
  onExport, onClearAll, onSave, lastSaved,
  canvasId, firebaseToken, userRole,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showZoomMenu,   setShowZoomMenu]   = useState(false);
  const [showShareMenu,  setShowShareMenu]  = useState(false);
  const [accessLevel,    setAccessLevel]    = useState<AccessLevel>('viewer');
  const [copied,         setCopied]         = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);
  const zoomRef   = useRef<HTMLDivElement>(null);
  const shareRef  = useRef<HTMLDivElement>(null);

  const isOwner = userRole === 'owner';

  const { links, loading, error, fetched, refetch } = useShareLinks(canvasId, firebaseToken);

  // Trigger fetch when popover opens (owner only, only once per canvasId)
  useEffect(() => {
    if (showShareMenu && isOwner && !fetched && !loading) {
      refetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showShareMenu]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false);
      if (zoomRef.current   && !zoomRef.current.contains(e.target as Node))   setShowZoomMenu(false);
      if (shareRef.current  && !shareRef.current.contains(e.target as Node))  setShowShareMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeLink = links[accessLevel] ?? '';

  const handleCopyLink = async () => {
    if (!activeLink) return;
    try {
      await navigator.clipboard.writeText(activeLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const exportFormats: { format: ExportFormat; label: string; ext: string }[] = [
    { format: 'png',  label: 'PNG Image',    ext: '.png'  },
    { format: 'jpg',  label: 'JPEG Image',   ext: '.jpg'  },
    { format: 'svg',  label: 'SVG Vector',   ext: '.svg'  },
    { format: 'pdf',  label: 'PDF Document', ext: '.pdf'  },
    { format: 'json', label: 'JSON Data',    ext: '.json' },
  ];

  const iconBtn = (active = false, danger = false) =>
    `flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150
     ${danger  ? 'text-slate-400 hover:bg-red-50 hover:text-red-500'
     : active  ? 'bg-emerald-50 text-emerald-600'
     : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`;

  const sep = <div className="w-px h-5 bg-slate-200 mx-0.5" />;

  return (
    <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">

      {/* ── History ── */}
      <div className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-md shadow-slate-200/40">
        <button onClick={onUndo} disabled={!canUndo}
          className={`${iconBtn()} disabled:opacity-25 disabled:cursor-not-allowed`} title="Undo (Ctrl+Z)">
          <Undo2 size={16} strokeWidth={2} />
        </button>
        <button onClick={onRedo} disabled={!canRedo}
          className={`${iconBtn()} disabled:opacity-25 disabled:cursor-not-allowed`} title="Redo (Ctrl+Y)">
          <Redo2 size={16} strokeWidth={2} />
        </button>
      </div>

      {/* ── Zoom ── */}
      <div className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-md shadow-slate-200/40">
        <button onClick={onZoomOut} className={iconBtn()} title="Zoom out">
          <ZoomOut size={16} strokeWidth={2} />
        </button>
        <div className="relative" ref={zoomRef}>
          <button onClick={() => setShowZoomMenu(v => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
            <span className="text-xs font-semibold text-slate-700 tabular-nums w-8 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <ChevronDown size={11} className="text-slate-400" />
          </button>
          {showZoomMenu && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 min-w-[110px] z-50">
              {ZOOM_PRESETS.map(p => (
                <button key={p} onClick={() => { onResetZoom(); setShowZoomMenu(false); }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                  <span>{p}%</span>
                  {Math.round(zoom * 100) === p && <Check size={11} className="text-emerald-500" />}
                </button>
              ))}
              <div className="h-px bg-slate-100 my-1" />
              <button onClick={() => { onResetZoom(); setShowZoomMenu(false); }}
                className="w-full px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 text-left transition-colors">
                Reset to 100%
              </button>
            </div>
          )}
        </div>
        <button onClick={onZoomIn} className={iconBtn()} title="Zoom in">
          <ZoomIn size={16} strokeWidth={2} />
        </button>
      </div>

      {/* ── View ── */}
      <div className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-md shadow-slate-200/40">
        <button onClick={onToggleGrid} className={iconBtn(showGrid)} title="Grid (Ctrl+G)">
          <Grid3x3 size={16} strokeWidth={1.8} />
        </button>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-md shadow-slate-200/40">

        {/* Export */}
        <div className="relative" ref={exportRef}>
          <button onClick={() => setShowExportMenu(v => !v)} className={iconBtn(showExportMenu)} title="Export">
            <Download size={16} strokeWidth={2} />
          </button>
          {showExportMenu && (
            <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 min-w-[180px] z-50">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-4 pb-2">Export as</p>
              {exportFormats.map(({ format, label, ext }) => (
                <button key={format} onClick={() => { onExport(format); setShowExportMenu(false); }}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-slate-400 font-mono">{ext}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Share ── */}
        <div className="relative" ref={shareRef}>
          <button
            onClick={() => setShowShareMenu(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm
              ${showShareMenu
                ? 'bg-emerald-600 text-white shadow-emerald-300'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 shadow-emerald-200 hover:shadow-md hover:shadow-emerald-200'
              }`}
            title="Share"
          >
            <Share2 size={13} strokeWidth={2.2} />
            Share
          </button>

          {showShareMenu && (
            <div
              className="absolute top-full mt-2.5 right-0 bg-white rounded-2xl z-50
                         shadow-[0_8px_40px_-4px_rgba(0,0,0,0.15),0_2px_12px_-2px_rgba(0,0,0,0.08)]
                         border border-slate-100 overflow-hidden"
              style={{ width: 320 }}
            >
              {/* Header */}
              <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-0.5">
                  <Globe size={13} className="text-emerald-500" />
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Share canvas</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isOwner
                    ? 'Share a link with the access level you choose'
                    : 'Only the canvas owner can generate share links'}
                </p>
              </div>

              {/* Non-owner: locked state */}
              {!isOwner ? (
                <div className="px-4 py-6 text-center">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Share2 size={18} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">No share permission</p>
                  <p className="text-xs text-slate-400 mt-1">Ask the owner to share this canvas with others.</p>
                </div>
              ) : (
                <>
                  {/* Access level options */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Access level</p>
                    <div className="flex flex-col gap-2">
                      {ACCESS_OPTIONS.map((opt) => {
                        const isSelected = accessLevel === opt.level;
                        return (
                          <button
                            key={opt.level}
                            onClick={() => { setAccessLevel(opt.level); setCopied(false); }}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150 text-left
                              ${isSelected
                                ? `${opt.bg} ${opt.border} border`
                                : 'border-transparent hover:bg-slate-50 hover:border-slate-200 border'
                              }`}
                          >
                            <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                              ${isSelected ? `${opt.bg} ${opt.color}` : 'bg-slate-100 text-slate-400'}`}>
                              {opt.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold ${isSelected ? opt.color : 'text-slate-600'}`}>
                                {opt.label}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{opt.description}</p>
                            </div>
                            {isSelected && (
                              <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${opt.bg}`}>
                                <Check size={10} className={opt.color} strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Link area */}
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Share link</p>

                    {loading && (
                      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <Loader2 size={13} className="text-slate-400 animate-spin flex-shrink-0" />
                        <span className="text-xs text-slate-400">Generating links…</span>
                      </div>
                    )}

                    {!loading && error && (
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200">
                        <span className="text-xs text-red-500 truncate">{error}</span>
                        <button onClick={refetch}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 ml-2 flex-shrink-0">
                          Retry
                        </button>
                      </div>
                    )}

                    {!loading && !error && activeLink && (
                      <div className="flex items-center gap-2 p-1.5 pl-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500 font-mono truncate flex-1 select-all">
                          {activeLink}
                        </span>
                        <button
                          onClick={handleCopyLink}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                            ${copied
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                        >
                          {copied
                            ? <><CheckCheck size={12} strokeWidth={2.5} />Copied</>
                            : <><Copy size={12} strokeWidth={2} />Copy</>
                          }
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {sep}

        {/* Clear */}
        <button onClick={onClearAll} className={iconBtn(false, true)} title="Clear canvas">
          <Trash2 size={16} strokeWidth={1.8} />
        </button>
      </div>

      {/* Last saved pill */}
      {lastSaved && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm">
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