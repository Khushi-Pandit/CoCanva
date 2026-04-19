'use client';
/**
 * PageNavigator — Left sidebar showing page thumbnails for Notes mode.
 * Supports: navigate, add, delete, rename, drag-reorder.
 */
import { useState, useRef } from 'react';
import { Plus, Trash2, GripVertical, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotesStore } from '@/store/notes.store';
import { PageMeta } from '@/lib/api/page.api';

interface PageNavigatorProps {
  canEdit: boolean;
  onAddPage: () => void;
  onDeletePage: (pageIndex: number) => void;
  onRenamePage: (pageIndex: number, label: string) => void;
  onReorder: (orderedIndexes: number[]) => void;
  onSwitchPage?: (pageIndex: number) => void;
}

export function PageNavigator({ canEdit, onAddPage, onDeletePage, onRenamePage, onReorder, onSwitchPage }: PageNavigatorProps) {
  const { pages, currentPageIndex, setCurrentPage, pageSummaries } = useNotesStore();
  // If parent provides onSwitchPage (which saves before switching), use it; else fall back to direct store update
  const handlePageClick = (pageIndex: number) => {
    if (onSwitchPage) onSwitchPage(pageIndex);
    else setCurrentPage(pageIndex);
  };
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (page: PageMeta) => {
    setEditingIdx(page.pageIndex);
    setEditLabel(page.label || `Page ${page.pageIndex + 1}`);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const commitEdit = (pageIndex: number) => {
    if (editLabel.trim()) onRenamePage(pageIndex, editLabel.trim());
    setEditingIdx(null);
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDropIdx(idx);
  };
  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); setDropIdx(null); return; }
    const sorted = [...pages].sort((a, b) => a.pageIndex - b.pageIndex);
    const dragged = sorted.splice(sorted.findIndex(p => p.pageIndex === dragIdx), 1)[0];
    sorted.splice(sorted.findIndex(p => p.pageIndex === targetIdx), 0, dragged);
    onReorder(sorted.map(p => p.pageIndex));
    setDragIdx(null); setDropIdx(null);
  };

  return (
    <aside className="flex flex-col w-[160px] flex-shrink-0 bg-[#f7f5f2] border-r border-slate-200 h-full select-none">
      {/* Header */}
      <div className="px-3 py-3 border-b border-slate-200 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pages</span>
        {canEdit && (
          <button
            onClick={onAddPage}
            className="w-6 h-6 rounded-lg flex items-center justify-center bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            title="Add page"
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* Page list */}
      <div className="flex-1 overflow-y-auto py-2 space-y-1.5 px-2">
        {pages
          .slice()
          .sort((a, b) => a.pageIndex - b.pageIndex)
          .map((page) => {
            const isActive = page.pageIndex === currentPageIndex;
            const isDraggingOver = dropIdx === page.pageIndex && dragIdx !== page.pageIndex;
            const summary = pageSummaries[page.pageIndex];

            return (
              <div
                key={page._id}
                draggable={canEdit}
                onDragStart={(e) => handleDragStart(e, page.pageIndex)}
                onDragOver={(e) => handleDragOver(e, page.pageIndex)}
                onDrop={(e) => handleDrop(e, page.pageIndex)}
                onDragEnd={() => { setDragIdx(null); setDropIdx(null); }}
                className={cn(
                  'group relative rounded-xl overflow-hidden cursor-pointer transition-all',
                  isActive ? 'ring-2 ring-amber-400 shadow-md' : 'hover:ring-1 ring-slate-200',
                  isDraggingOver && 'ring-2 ring-blue-400',
                )}
                onClick={() => handlePageClick(page.pageIndex)}
                title={summary || page.label || `Page ${page.pageIndex + 1}`}
              >
                {/* Page thumbnail */}
                <div className="w-full aspect-[3/4] bg-white border border-slate-200 rounded-xl flex flex-col p-2 gap-1">
                  {page.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={page.thumbnail} alt="" className="w-full h-full object-cover rounded" />
                  ) : (
                    <>
                      {[70, 90, 60, 80, 55].map((w, i) => (
                        <div key={i} className="h-1 rounded-full bg-slate-100" style={{ width: `${w}%` }} />
                      ))}
                    </>
                  )}
                </div>

                {/* Label */}
                <div className={cn(
                  'absolute bottom-0 left-0 right-0 px-2 py-1',
                  'bg-gradient-to-t from-white/95 to-transparent',
                )}>
                  {editingIdx === page.pageIndex ? (
                    <input
                      ref={inputRef}
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onBlur={() => commitEdit(page.pageIndex)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(page.pageIndex); if (e.key === 'Escape') setEditingIdx(null); }}
                      className="w-full text-[10px] font-semibold bg-white border border-amber-300 rounded px-1 py-0.5 outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p
                      className="text-[10px] font-semibold text-slate-600 truncate"
                      onDoubleClick={(e) => { e.stopPropagation(); if (canEdit) startEdit(page); }}
                    >
                      {page.label || `Page ${page.pageIndex + 1}`}
                    </p>
                  )}
                </div>

                {/* Actions (on hover) */}
                {canEdit && (
                  <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); if (pages.length > 1) onDeletePage(page.pageIndex); }}
                      className="w-5 h-5 rounded bg-red-50 border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                      title="Delete page"
                    >
                      <Trash2 size={9} />
                    </button>
                  </div>
                )}

                {/* Drag handle */}
                {canEdit && (
                  <div className="absolute top-1 left-1 hidden group-hover:flex">
                    <GripVertical size={11} className="text-slate-300" />
                  </div>
                )}

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                )}
              </div>
            );
          })}
      </div>

      {/* Page count */}
      <div className="px-3 py-2 border-t border-slate-200">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <FileText size={10} />
          <span>{pages.length} page{pages.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </aside>
  );
}
