'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Undo2, Redo2, ZoomIn, ZoomOut,
  Grid3x3, Download, Share2, Trash2,
  ChevronDown, Check, Copy, CheckCheck,
  Eye, Pencil, Zap, Globe, Loader2,
  MessageSquare,
} from 'lucide-react';
import { ExportFormat } from '../core/types';
import { Socket } from 'socket.io-client';

interface TopControlsProps {
  canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void;
  zoom: number; onZoomIn: () => void; onZoomOut: () => void; onResetZoom: () => void;
  showGrid: boolean; onToggleGrid: () => void; onExport: (format: ExportFormat) => void;
  onClearAll: () => void; onSave: () => void; lastSaved?: Date | null;
  canvasId: string; firebaseToken: string; userRole: string;
  socket: Socket | null; mySocketId: string;
  aiChatOpen: boolean; onToggleAIChat: () => void;
}

const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200];
type AccessLevel = 'viewer' | 'editor' | 'voice';

const ACCESS_OPTIONS: { level: AccessLevel; label: string; description: string; icon: React.ReactNode; color: string; bg: string; border: string; }[] = [
  { level: 'viewer', label: 'View only',   description: 'Can see the canvas, no edits',  icon: <Eye    size={14} strokeWidth={2} />, color: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-200'     },
  { level: 'editor', label: 'Can edit',    description: 'Draw, erase, add shapes',       icon: <Pencil size={14} strokeWidth={2} />, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  { level: 'voice',  label: 'Full access', description: 'Edit + voice & presence sync', icon: <Zap   size={14} strokeWidth={2} />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
];

function useShareLinks(canvasId: string, firebaseToken: string) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => { fetchedRef.current = false; setLinks({}); setError(null); }, [canvasId]);

  const refetch = useCallback(async () => {
    if (loading) return;
    fetchedRef.current = true; setLoading(true); setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/${canvasId}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${firebaseToken}` }, body: JSON.stringify({ roles: ['viewer', 'editor', 'voice'] }) });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || `Error ${res.status}`); }
      setLinks((await res.json()).links ?? {});
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Could not generate links'); fetchedRef.current = false; }
    finally { setLoading(false); }
  }, [canvasId, firebaseToken, loading]);

  return { links, loading, error, fetched: fetchedRef.current, refetch };
}

export const TopControls: React.FC<TopControlsProps> = ({
  canUndo, canRedo, onUndo, onRedo, zoom, onZoomIn, onZoomOut, onResetZoom,
  showGrid, onToggleGrid, onExport, onClearAll, onSave, lastSaved,
  canvasId, firebaseToken, userRole, aiChatOpen, onToggleAIChat,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showZoomMenu,   setShowZoomMenu]   = useState(false);
  const [showShareMenu,  setShowShareMenu]  = useState(false);
  const [accessLevel,    setAccessLevel]    = useState<AccessLevel>('viewer');
  const [copied,         setCopied]         = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);
  const zoomRef   = useRef<HTMLDivElement>(null);
  const shareRef  = useRef<HTMLDivElement>(null);
  const isOwner   = userRole === 'owner';
  const { links, loading, error, fetched, refetch } = useShareLinks(canvasId, firebaseToken);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false);
      if (zoomRef.current   && !zoomRef.current.contains(e.target as Node))   setShowZoomMenu(false);
      if (shareRef.current  && !shareRef.current.contains(e.target as Node))  setShowShareMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (showShareMenu && isOwner && !fetched && !loading) refetch(); }, [showShareMenu]);

  const activeLink = links[accessLevel] ?? '';
  const handleCopy = async () => { if (!activeLink) return; try { await navigator.clipboard.writeText(activeLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };

  const exportFormats = [
    { format: 'png' as ExportFormat, label: 'PNG Image',    ext: '.png'  },
    { format: 'jpg' as ExportFormat, label: 'JPEG Image',   ext: '.jpg'  },
    { format: 'svg' as ExportFormat, label: 'SVG Vector',   ext: '.svg'  },
    { format: 'pdf' as ExportFormat, label: 'PDF Document', ext: '.pdf'  },
    { format: 'json'as ExportFormat, label: 'JSON Data',    ext: '.json' },
  ];

  const ib = (active = false, danger = false) =>
    `flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 ${danger ? 'text-slate-400 hover:bg-red-50 hover:text-red-500' : active ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`;
  const sep = <div className="w-px h-5 bg-slate-200 mx-0.5" />;
  const card = "flex items-center gap-0.5 px-1.5 py-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-md shadow-slate-200/40";

  return (
    <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">

      {/* History */}
      <div className={card}>
        <button onClick={onUndo} disabled={!canUndo} className={`${ib()} disabled:opacity-25 disabled:cursor-not-allowed`} title="Undo"><Undo2 size={16} strokeWidth={2} /></button>
        <button onClick={onRedo} disabled={!canRedo} className={`${ib()} disabled:opacity-25 disabled:cursor-not-allowed`} title="Redo"><Redo2 size={16} strokeWidth={2} /></button>
      </div>

      {/* Zoom */}
      <div className={card}>
        <button onClick={onZoomOut} className={ib()} title="Zoom out"><ZoomOut size={16} strokeWidth={2} /></button>
        <div className="relative" ref={zoomRef}>
          <button onClick={() => setShowZoomMenu(v => !v)} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
            <span className="text-xs font-semibold text-slate-700 tabular-nums w-8 text-center">{Math.round(zoom * 100)}%</span>
            <ChevronDown size={11} className="text-slate-400" />
          </button>
          {showZoomMenu && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 min-w-[110px] z-50">
              {ZOOM_PRESETS.map(p => (
                <button key={p} onClick={() => { onResetZoom(); setShowZoomMenu(false); }} className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                  <span>{p}%</span>{Math.round(zoom * 100) === p && <Check size={11} className="text-emerald-500" />}
                </button>
              ))}
              <div className="h-px bg-slate-100 my-1" />
              <button onClick={() => { onResetZoom(); setShowZoomMenu(false); }} className="w-full px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 text-left transition-colors">Reset to 100%</button>
            </div>
          )}
        </div>
        <button onClick={onZoomIn} className={ib()} title="Zoom in"><ZoomIn size={16} strokeWidth={2} /></button>
      </div>

      {/* Grid */}
      <div className={card}>
        <button onClick={onToggleGrid} className={ib(showGrid)} title="Grid"><Grid3x3 size={16} strokeWidth={1.8} /></button>
      </div>

      {/* Actions */}
      <div className={card}>
        {/* Export */}
        <div className="relative" ref={exportRef}>
          <button onClick={() => setShowExportMenu(v => !v)} className={ib(showExportMenu)} title="Export"><Download size={16} strokeWidth={2} /></button>
          {showExportMenu && (
            <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 min-w-[180px] z-50">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-4 pb-2">Export as</p>
              {exportFormats.map(({ format, label, ext }) => (
                <button key={format} onClick={() => { onExport(format); setShowExportMenu(false); }} className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                  <span className="font-medium">{label}</span><span className="text-xs text-slate-400 font-mono">{ext}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Share */}
        <div className="relative" ref={shareRef}>
          <button onClick={() => setShowShareMenu(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${showShareMenu ? 'bg-emerald-600 text-white shadow-emerald-300' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200'}`} title="Share">
            <Share2 size={13} strokeWidth={2.2} />Share
          </button>
          {showShareMenu && (
            <div className="absolute top-full mt-2.5 right-0 bg-white rounded-2xl z-50 shadow-[0_8px_40px_-4px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden" style={{ width: 320 }}>
              <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-0.5"><Globe size={13} className="text-emerald-500" /><span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Share canvas</span></div>
                <p className="text-[11px] text-slate-400 mt-0.5">{isOwner ? 'Share a link with the access level you choose' : 'Only the owner can generate share links'}</p>
              </div>
              {!isOwner ? (
                <div className="px-4 py-6 text-center">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3"><Share2 size={18} className="text-slate-400" /></div>
                  <p className="text-sm font-medium text-slate-600">No share permission</p>
                </div>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Access level</p>
                    <div className="flex flex-col gap-2">
                      {ACCESS_OPTIONS.map((opt) => {
                        const sel = accessLevel === opt.level;
                        return (
                          <button key={opt.level} onClick={() => { setAccessLevel(opt.level); setCopied(false); }}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${sel ? `${opt.bg} ${opt.border} border` : 'border-transparent hover:bg-slate-50 border'}`}>
                            <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${sel ? `${opt.bg} ${opt.color}` : 'bg-slate-100 text-slate-400'}`}>{opt.icon}</div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold ${sel ? opt.color : 'text-slate-600'}`}>{opt.label}</p>
                              <p className="text-[11px] text-slate-400">{opt.description}</p>
                            </div>
                            {sel && <div className={`w-4 h-4 rounded-full flex items-center justify-center ${opt.bg}`}><Check size={10} className={opt.color} strokeWidth={3} /></div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Share link</p>
                    {loading && <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200"><Loader2 size={13} className="text-slate-400 animate-spin" /><span className="text-xs text-slate-400">Generating…</span></div>}
                    {!loading && error && <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200"><span className="text-xs text-red-500">{error}</span><button onClick={refetch} className="text-xs font-semibold text-red-600 ml-2">Retry</button></div>}
                    {!loading && !error && activeLink && (
                      <div className="flex items-center gap-2 p-1.5 pl-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500 font-mono truncate flex-1 select-all">{activeLink}</span>
                        <button onClick={handleCopy} className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600'}`}>
                          {copied ? <><CheckCheck size={12} strokeWidth={2.5} />Copied</> : <><Copy size={12} strokeWidth={2} />Copy</>}
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

        {/* AI Chat button */}
        <button onClick={onToggleAIChat}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
            ${aiChatOpen ? 'bg-teal-500 text-white shadow-sm shadow-teal-200' : 'text-slate-500 hover:bg-teal-50 hover:text-teal-600'}`}
          title="AI Chat">
          <MessageSquare size={14} strokeWidth={2} />
          <span>Ask AI</span>
        </button>

        {sep}

        {/* Clear */}
        <button onClick={onClearAll} className={ib(false, true)} title="Clear canvas"><Trash2 size={16} strokeWidth={1.8} /></button>
      </div>

      {lastSaved && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-slate-500 font-medium">{fmt(lastSaved)}</span>
        </div>
      )}
    </div>
  );
};

function fmt(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 5)    return 'Saved';
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}