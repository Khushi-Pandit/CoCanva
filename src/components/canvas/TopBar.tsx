'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Undo2, Redo2, ZoomIn, ZoomOut, Grid3X3, Save, Download,
  Share2, GitBranch, MessageSquare, Users, Wifi, WifiOff,
  ChevronRight, Settings, Loader2, Home,
} from 'lucide-react';
import Link from 'next/link';
import { useCanvasStore } from '@/store/canvas.store';
import { useCollaborationStore } from '@/store/collaboration.store';
import { useUIStore } from '@/store/ui.store';
import { cn, getInitials, timeAgo } from '@/lib/utils';
import { canvasApi } from '@/lib/api/canvas.api';

interface TopBarProps {
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onExport: (fmt: 'png' | 'svg' | 'pdf' | 'json') => void;
  canUndo: boolean;
  canRedo: boolean;
  canEdit: boolean;
}

export function TopBar({ onUndo, onRedo, onSave, onExport, canUndo, canRedo, canEdit }: TopBarProps) {
  const { viewport, canvasTitle, showGrid, toggleGrid, zoomViewport, resetViewport, canvasId, lastSaved, isSyncing, role } = useCanvasStore();
  const { isConnected, peers } = useCollaborationStore();
  const { togglePanel, shareModalOpen, annotationsOpen, branchHistoryOpen, exportModalOpen, addToast } = useUIStore();

  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(canvasTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempTitle(canvasTitle);
  }, [canvasTitle]);

  const handleTitleSubmit = async () => {
    setEditingTitle(false);
    const trimmed = tempTitle.trim();
    if (!trimmed || trimmed === canvasTitle) {
      setTempTitle(canvasTitle);
      return;
    }
    // Optimistic UI
    useCanvasStore.setState({ canvasTitle: trimmed });
    try {
      await canvasApi.update(canvasId, { title: trimmed });
    } catch {
      addToast('Failed to save title', 'error');
      useCanvasStore.setState({ canvasTitle: canvasTitle });
      setTempTitle(canvasTitle);
    }
  };

  const startEditing = () => {
    if (!canEdit) return;
    setEditingTitle(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
  };

  const peerList = Object.values(peers);
  const zoom = Math.round(viewport.zoom * 100);

  const IconBtn = ({ icon: Icon, label, onClick, active = false, disabled = false, className = '' }: {
    icon: React.ElementType; label: string; onClick?: () => void;
    active?: boolean; disabled?: boolean; className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        'tool-btn',
        active && 'bg-slate-100 text-slate-800',
        disabled && 'opacity-40 pointer-events-none',
        className,
      )}
    >
      <Icon size={15} />
    </button>
  );

  return (
    <div
      className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1.5 rounded-2xl shadow-md max-w-[90vw]"
      style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(226,232,240,0.8)' }}
    >
      {/* Home */}
      <Link href="/dashboard" className="tool-btn mr-0.5" title="Dashboard">
        <Home size={15} />
      </Link>

      <span className="text-slate-300">|</span>

      {/* Title */}
      {editingTitle ? (
        <input
          ref={inputRef}
          type="text"
          value={tempTitle}
          onChange={(e) => setTempTitle(e.target.value)}
          onBlur={handleTitleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleTitleSubmit();
            if (e.key === 'Escape') { setTempTitle(canvasTitle); setEditingTitle(false); }
          }}
          className="text-[13px] font-semibold text-slate-800 bg-emerald-50 rounded px-2 py-0.5 max-w-[150px] outline-none border border-emerald-200"
        />
      ) : (
        <span 
          className={cn("text-[13px] font-semibold text-slate-700 max-w-[140px] truncate px-1 rounded", canEdit && "cursor-pointer hover:bg-slate-100")}
          onClick={startEditing}
          title={canEdit ? "Click to rename" : canvasTitle}
        >
          {canvasTitle}
        </span>
      )}

      <span className="text-slate-300">|</span>

      {/* Undo / Redo */}
      <IconBtn icon={Undo2} label="Undo (⌘Z)" onClick={onUndo} disabled={!canUndo || !canEdit} />
      <IconBtn icon={Redo2} label="Redo (⌘⇧Z)" onClick={onRedo} disabled={!canRedo || !canEdit} />

      <span className="text-slate-300">|</span>

      {/* Zoom */}
      <IconBtn icon={ZoomOut} label="Zoom out" onClick={() => { const c = { width: window.innerWidth, height: window.innerHeight }; zoomViewport(-0.15, c.width / 2, c.height / 2); }} />
      <button
        onClick={() => resetViewport()}
        className="text-[11px] font-mono font-semibold text-slate-500 hover:text-slate-800 px-1.5 py-1 rounded-lg hover:bg-slate-100 transition-all min-w-[44px] text-center"
        title="Reset zoom (⌘0)"
      >
        {zoom}%
      </button>
      <IconBtn icon={ZoomIn} label="Zoom in" onClick={() => { const c = { width: window.innerWidth, height: window.innerHeight }; zoomViewport(0.15, c.width / 2, c.height / 2); }} />

      <span className="text-slate-300">|</span>

      {/* Grid */}
      <IconBtn icon={Grid3X3} label="Toggle grid (⌘')" onClick={toggleGrid} active={showGrid} />

      <span className="text-slate-300">|</span>

      {/* Save */}
      {canEdit && (
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-200 active:scale-95"
          title="Save (⌘S)"
        >
          {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Save
        </button>
      )}

      {/* Export */}
      <div className="relative group">
        <IconBtn icon={Download} label="Export" />
        <div className="absolute top-full mt-1 right-0 hidden group-hover:flex flex-col gap-0.5 bg-white border border-slate-200 rounded-xl shadow-lg p-1 min-w-[120px] z-50 animate-slide-up">
          {(['png', 'svg', 'pdf', 'json'] as const).map((fmt) => (
            <button key={fmt} onClick={() => onExport(fmt)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg capitalize">
              <Download size={11} /> Export as {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <span className="text-slate-300">|</span>

      {/* Share */}
      <IconBtn icon={Share2} label="Share" onClick={() => togglePanel('shareModalOpen')} active={shareModalOpen} />

      {/* Branch history */}
      <IconBtn icon={GitBranch} label="Version history" onClick={() => togglePanel('branchHistoryOpen')} active={branchHistoryOpen} />

      {/* Annotations */}
      <IconBtn icon={MessageSquare} label="Comments" onClick={() => togglePanel('annotationsOpen')} active={annotationsOpen} />

      <span className="text-slate-300">|</span>

      {/* Active users */}
      {peerList.length > 0 && (
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1.5">
            {peerList.slice(0, 4).map((peer) => (
              <div key={peer.socketId}
                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white"
                style={{ background: peer.userColor }} title={peer.userName}
              >
                {getInitials(peer.userName)}
              </div>
            ))}
          </div>
          {peerList.length > 4 && (
            <span className="text-[10px] text-slate-400 font-medium">+{peerList.length - 4}</span>
          )}
        </div>
      )}

      {/* Connection status */}
      <span title={isConnected ? 'Connected' : 'Disconnected'}>
        {isConnected
          ? <Wifi size={13} className="text-emerald-500" />
          : <WifiOff size={13} className="text-red-400" />}
      </span>

      {/* Last saved */}
      {lastSaved && (
        <span className="text-[10px] text-slate-400 hidden lg:block">
          {timeAgo(lastSaved.toISOString())}
        </span>
      )}

      {/* Role badge */}
      {role !== 'owner' && role !== 'editor' && (
        <span className="badge bg-sky-50 border border-sky-200 text-sky-600">{role}</span>
      )}
    </div>
  );
}
