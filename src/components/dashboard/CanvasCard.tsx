'use client';
import { Canvas } from '@/types/canvas';
import { timeAgo, getInitials } from '@/lib/utils';
import { MoreVertical, Lock, Globe, Pencil, Trash2, Copy, RotateCcw } from 'lucide-react';
import { useState } from 'react';
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

  return (
    <div
      className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5"
      style={{ aspectRatio: '4/3' }}
    >
      {/* Thumbnail */}
      <Link href={`/canvas/${canvas._id}`} className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
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
      <div className="px-3 py-2.5 border-t border-slate-100 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">{canvas.title}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(canvas.updatedAt)}</p>
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
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all opacity-100"
            >
              <MoreVertical size={13} />
            </button>
            {menuOpen && (
              <div className="absolute bottom-full right-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[150px] z-50 animate-slide-up" onClick={(e) => e.stopPropagation()}>
                {[
                  { label: 'Rename', icon: Pencil, action: () => { const t = prompt('New title:', canvas.title); if (t) onRename(canvas._id, t); } },
                  { label: 'Duplicate', icon: Copy, action: () => onDuplicate(canvas._id) },
                  { label: 'Delete', icon: Trash2, action: () => { if (confirm('Delete this canvas?')) onDelete(canvas._id); }, danger: true },
                ].concat(
                  onRestore ? [{ label: 'Restore', icon: RotateCcw, action: () => onRestore(canvas._id), danger: false }] : [],
                ).map(({ label, icon: Icon, action, danger }) => (
                  <button key={label} onClick={() => { action(); setMenuOpen(false); }}
                    className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-50 ${danger ? 'text-red-500' : 'text-slate-600'}`}>
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
