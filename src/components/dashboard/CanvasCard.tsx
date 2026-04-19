'use client';
import { Canvas } from '@/types/canvas';
import { timeAgo, getInitials } from '@/lib/utils';
import { MoreVertical, Lock, Globe, Pencil, Trash2, Copy, RotateCcw, AlertCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface CanvasCardProps {
  canvas: Canvas;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRestore?: (id: string) => void;
}

export function CanvasCard({ canvas, onRename, onDelete, onDuplicate, onRestore }: CanvasCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(canvas.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const AvatarGroup = () => {
    // Gather collaborators with valid populated user objects (not just IDs)
    const validCollabs = (canvas.collaborators || []).filter((c) => {
      if (typeof c.user === 'object' && c.user !== null) {
        const name = (c.user as any).fullName || (c.user as any).email;
        return !!name;
      }
      return false;
    });

    // Also include the canvas owner as an avatar if they're not already in collaborators
    const ownerName = canvas.owner?.fullName || canvas.owner?.email;
    const ownerId = canvas.owner?._id;
    const ownerInCollabs = validCollabs.some((c) => (c.user as any)?._id === ownerId);
    const showOwner = ownerName && !ownerInCollabs && validCollabs.length === 0;

    const avatarsToShow = validCollabs.slice(0, 3);

    return (
      <div className="flex -space-x-1.5">
        {showOwner && (
          <div
            className="w-5 h-5 rounded-full border border-white bg-emerald-500 flex items-center justify-center text-[8px] font-bold text-white"
            title={ownerName}
          >
            {getInitials(ownerName)}
          </div>
        )}
        {avatarsToShow.map((c) => {
          const user = c.user as any;
          const id = user?._id || String(c.user);
          const name = user?.fullName || user?.email || '';
          const initials = getInitials(name);
          return (
            <div key={String(id)}
              className="w-5 h-5 rounded-full border border-white bg-emerald-500 flex items-center justify-center text-[8px] font-bold text-white"
              title={name}
            >
              {initials}
            </div>
          );
        })}
        {validCollabs.length > 3 && (
          <div className="w-5 h-5 rounded-full border border-white bg-slate-200 flex items-center justify-center text-[8px] font-medium text-slate-500">
            +{validCollabs.length - 3}
          </div>
        )}
      </div>
    );
  };

  const handleRenameSubmit = () => {
    setIsEditingTitle(false);
    const newTitle = editTitleValue.trim();
    if (newTitle && newTitle !== canvas.title) {
      onRename(canvas._id, newTitle);
    } else {
      setEditTitleValue(canvas.title);
    }
  };

  return (
    <div
      className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5"
      style={{ aspectRatio: '4/3' }}
    >
      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-5 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-3">
            <Trash2 className="text-red-600" size={20} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">Delete Canvas?</h3>
          <p className="text-[11px] text-slate-500 mb-5 leading-tight">
            Are you sure you want to delete <span className="font-semibold text-slate-700">"{canvas.title}"</span>? This action cannot be undone.
          </p>
          <div className="flex gap-2 w-full max-w-[220px]">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
              className="flex-1 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); onDelete(canvas._id); }}
              className="flex-1 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm shadow-red-500/20"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Thumbnail */}
      <Link href={canvas.canvasType === 'notes' ? `/notes/${canvas._id}` : `/canvas/${canvas._id}`} className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
        {canvas.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={canvas.thumbnail} alt={canvas.title}
            className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-25">
            <div className="w-12 h-8 border-2 border-slate-400 rounded-lg" />
            <div className="w-8 h-1 bg-slate-400 rounded" />
            <div className="w-6 h-1 bg-slate-300 rounded" />
          </div>
        )}
      </Link>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-slate-100 flex items-center gap-2 relative bg-white">
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              autoFocus
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                } else if (e.key === 'Escape') {
                  setIsEditingTitle(false);
                  setEditTitleValue(canvas.title);
                }
              }}
              onBlur={handleRenameSubmit}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-[13px] font-semibold text-slate-800 bg-white border-b-2 border-amber-400 outline-none px-0.5 py-0 -ml-0.5 shadow-sm transition-all focus:border-amber-500"
            />
          ) : (
            <p 
              className="text-[13px] font-semibold text-slate-800 truncate leading-tight cursor-text group-hover:text-amber-700 transition-colors"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditTitleValue(canvas.title);
                setIsEditingTitle(true);
              }}
              title="Double-click to rename"
            >
              {canvas.title}
            </p>
          )}

          <div className="flex items-center gap-1.5 mt-0.5">
            {canvas.canvasType === 'notes' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                📄 Notes{canvas.pageCount ? ` · ${canvas.pageCount}p` : ''}
              </span>
            )}
            {canvas.canvasType === 'diagram' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                📊 Diagram
              </span>
            )}
            <p className="text-[10px] text-slate-400 truncate">{timeAgo(canvas.updatedAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Visibility icon */}
          {canvas.isPublic
            ? <Globe size={11} className="text-sky-400" />
            : <Lock size={11} className="text-slate-300" />}

          {/* Collaborators + owner avatar */}
          <AvatarGroup />

          {/* Menu */}
          <div className="relative">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v); }}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all opacity-100"
            >
              <MoreVertical size={13} />
            </button>

            {menuOpen && (
              <>
                {/* Invisible backdrop to catch clicks outside the menu */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); }} 
                />
                <div className="absolute bottom-full right-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[150px] z-50 animate-in slide-in-from-bottom-2 fade-in duration-150" onClick={(e) => e.stopPropagation()}>
                  {[
                    { 
                      label: 'Rename', 
                      icon: Pencil, 
                      action: () => { 
                        setMenuOpen(false); 
                        setEditTitleValue(canvas.title);
                        setIsEditingTitle(true); 
                      } 
                    },
                    { 
                      label: 'Duplicate', 
                      icon: Copy, 
                      action: () => { setMenuOpen(false); onDuplicate(canvas._id); } 
                    },
                    { 
                      label: 'Delete', 
                      icon: Trash2, 
                      action: () => { setMenuOpen(false); setShowDeleteConfirm(true); }, 
                      danger: true 
                    },
                  ].concat(
                    onRestore ? [{ label: 'Restore', icon: RotateCcw, action: () => { setMenuOpen(false); onRestore(canvas._id); }, danger: false }] : [],
                  ).map(({ label, icon: Icon, action, danger }) => (
                    <button key={label} onClick={(e) => { e.preventDefault(); e.stopPropagation(); action(); }}
                      className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-50 ${danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-600 hover:text-slate-900'}`}>
                      <Icon size={12} /> {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
