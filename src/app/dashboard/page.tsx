'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { canvasApi } from '@/lib/api/canvas.api';
import { Canvas, CanvasType } from '@/types/canvas';
import { CanvasCard } from '@/components/dashboard/CanvasCard';
import { NewCanvasModal } from '@/components/dashboard/NewCanvasModal';
import { ToastContainer } from '@/components/ui/Toast';
import {
  Plus, Search, LayoutGrid, List, Bell, Settings, LogOut,
  Star, Users, Clock, Trash2, Sparkles, ChevronRight, Loader2,
  MoreVertical, Pencil, Copy, Lock, Globe, FileText, Workflow,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getInitials, timeAgo } from '@/lib/utils';

type Section = 'my' | 'shared' | 'recent';

// ── List Row Component ─────────────────────────────────────────────────────
function ListRow({ canvas, onRename, onDelete, onDuplicate }: {
  canvas: Canvas;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(canvas.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canvasHref = (c: Canvas) => c.canvasType === 'notes' ? `/notes/${c._id}` : `/canvas/${c._id}`;
  const canvasTypeBadge = (c: Canvas) => {
    if (c.canvasType === 'notes') return { label: 'Notes', color: 'bg-amber-50 text-amber-600 border-amber-200' };
    if (c.canvasType === 'diagram') return { label: 'Diagram', color: 'bg-blue-50 text-blue-600 border-blue-200' };
    return { label: 'Drawing', color: 'bg-violet-50 text-violet-600 border-violet-200' };
  };
  const badge = canvasTypeBadge(canvas);

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
    <div className="relative group flex items-center gap-3 px-3 py-2.5 bg-white border border-slate-200 rounded-xl hover:shadow-sm hover:border-slate-300 transition-all">
      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-between px-6 animate-in slide-in-from-right-8 fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="text-red-600" size={16} />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-slate-800">Delete "{canvas.title}"?</h3>
              <p className="text-[11px] text-slate-500">This action cannot be undone.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteConfirm(false); }}
              className="px-4 py-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteConfirm(false); onDelete(canvas._id); }}
              className="px-4 py-1.5 text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm shadow-red-500/20"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Thumbnail */}
      <Link href={canvasHref(canvas)} className="flex-shrink-0 w-12 h-9 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
        {canvas.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={canvas.thumbnail} alt={canvas.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-0.5 opacity-25">
            <div className="w-6 h-4 border border-slate-400 rounded" />
            <div className="w-4 h-0.5 bg-slate-400 rounded" />
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {isEditingTitle ? (
          <input
            autoFocus
            value={editTitleValue}
            onChange={(e) => setEditTitleValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              else if (e.key === 'Escape') { setIsEditingTitle(false); setEditTitleValue(canvas.title); }
            }}
            onBlur={handleRenameSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-[13px] font-semibold text-slate-800 bg-white border-b-2 border-amber-400 outline-none px-0.5 py-0 shadow-sm transition-all focus:border-amber-500"
          />
        ) : (
          <Link href={canvasHref(canvas)} className="block">
            <p 
              className="text-[13px] font-semibold text-slate-800 truncate group-hover:text-amber-700 transition-colors cursor-text"
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditTitleValue(canvas.title);
                setIsEditingTitle(true);
              }}
              title="Double-click to rename"
            >
              {canvas.title}
            </p>
          </Link>
        )}
        <Link href={canvasHref(canvas)} className="flex items-center gap-2 mt-0.5">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
          <p className="text-[11px] text-slate-400">{timeAgo(canvas.updatedAt)}</p>
        </Link>
      </div>

      {/* Role + visibility */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {canvas.isPublic
          ? <Globe size={11} className="text-sky-400" />
          : <Lock size={11} className="text-slate-300" />}
        <span className="text-[10px] badge bg-slate-50 border border-slate-200 text-slate-500 hidden sm:inline-flex">{canvas.myRole ?? 'owner'}</span>
      </div>

      {/* Three-dot menu */}
      <div className="relative flex-shrink-0">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
        >
          <MoreVertical size={14} />
        </button>
        {menuOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); }} 
            />
            <div
              className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[150px] z-50 animate-in slide-in-from-top-2 fade-in duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {[
                { label: 'Open', icon: ChevronRight, action: () => { window.location.href = canvasHref(canvas); } },
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
              ].map(({ label, icon: Icon, action, danger }) => (
                <button key={label} onClick={(e) => { e.preventDefault(); e.stopPropagation(); action(); }}
                  className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-50 ${
                    danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-600 hover:text-slate-900'
                  }`}>
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { firebaseUser, profile, loading: authLoading, clear } = useAuthStore();
  const { addToast } = useUIStore();

  const [section, setSection]     = useState<Section>('my');
  const [canvases, setCanvases]   = useState<Canvas[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [viewMode, setViewMode]   = useState<'grid' | 'list'>('grid');
  const [creating, setCreating]   = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  // ── Guard ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !firebaseUser) router.replace('/login');
  }, [authLoading, firebaseUser, router]);

  // ── Load canvases ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      let result: any;
      if (section === 'my')     result = await canvasApi.list({ q: search || undefined });
      else if (section === 'shared') result = await canvasApi.listShared();
      else if (section === 'recent') result = await canvasApi.listRecent();
      else {
        // Trash: backend soft-deletes but has no dedicated list endpoint.
        // Show empty for now; restore is via canvasApi.restore(id).
        result = { items: [] };
        addToast('Trash view requires direct restore links', 'info', 3000);
      }
      setCanvases(result.items ?? result.canvases ?? []);
    } catch {
      addToast('Failed to load canvases', 'error');
    } finally {
      setLoading(false);
    }
  }, [section, search, addToast]);

  useEffect(() => { if (firebaseUser) load(); }, [firebaseUser, load]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const createCanvas = async (params: { title: string; canvasType: CanvasType; pageSize?: any; pageOrientation?: any }) => {
    setCreating(true);
    setShowNewModal(false);
    try {
      const { canvas } = await canvasApi.create({
        title: params.title,
        canvasType: params.canvasType,
        pageSize: params.pageSize,
        pageOrientation: params.pageOrientation,
      });
      if (params.canvasType === 'notes') {
        router.push(`/notes/${canvas._id}`);
      } else {
        router.push(`/canvas/${canvas._id}`);
      }
    } catch {
      addToast('Failed to create canvas', 'error');
      setCreating(false);
    }
  };

  const renameCanvas = async (id: string, title: string) => {
    try {
      await canvasApi.update(id, { title });
      setCanvases((prev) => prev.map((c) => c._id === id ? { ...c, title } : c));
      addToast('Renamed', 'success', 2000);
    } catch { addToast('Failed to rename', 'error'); }
  };

  const deleteCanvas = async (id: string) => {
    try {
      await canvasApi.delete(id);
      setCanvases((prev) => prev.filter((c) => c._id !== id));
      addToast('Moved to trash', 'success', 2000);
    } catch { addToast('Failed to delete', 'error'); }
  };

  const duplicateCanvas = async (id: string) => {
    try {
      await canvasApi.duplicate(id);
      addToast('Duplicated!', 'success', 2000);
      load();
    } catch { addToast('Failed to duplicate', 'error'); }
  };

  const restoreCanvas = async (id: string) => {
    try {
      await canvasApi.restore(id);
      setCanvases((prev) => prev.filter((c) => c._id !== id));
      addToast('Canvas restored', 'success', 2000);
    } catch { addToast('Failed to restore', 'error'); }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    clear();
    router.replace('/login');
  };

  const NAV = [
    { id: 'my' as Section,     label: 'My Canvases', Icon: Star },
    { id: 'shared' as Section, label: 'Shared',       Icon: Users },
    { id: 'recent' as Section, label: 'Recent',       Icon: Clock },
  ];

  let filteredCanvases = search && section === 'my'
    ? canvases.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : canvases;
  if(filteredCanvases == undefined){
    filteredCanvases = [];
  }

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 size={28} className="text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 flex flex-col h-full bg-white border-r border-slate-200">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-[11px]">DS</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 leading-none">DrawSync</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Collaborative Canvas</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setSection(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                section === id
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon size={14} className={section === id ? 'text-emerald-500' : 'text-slate-400'} />
              {label}
            </button>
          ))}
        </nav>

        {/* User */}
        {firebaseUser && (
          <div className="px-3 py-4 border-t border-slate-100">
            <div className="flex items-center gap-2.5">
              {firebaseUser.photoURL ? (
                <img src={firebaseUser.photoURL} alt="" className="w-7 h-7 rounded-full" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">
                  {getInitials(firebaseUser.displayName ?? firebaseUser.email ?? 'U')}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-700 truncate">{firebaseUser.displayName ?? 'User'}</p>
                <p className="text-[10px] text-slate-400 truncate">{firebaseUser.email}</p>
              </div>
            </div>
            <button onClick={handleSignOut}
              className="mt-2 w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
              <LogOut size={11} /> Sign out
            </button>
          </div>
        )}
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search canvases…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 text-slate-700 placeholder-slate-400 max-w-sm"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl mr-3">
            {([['grid', LayoutGrid], ['list', List]] as const).map(([mode, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${viewMode === mode ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                <Icon size={13} />
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-200 active:scale-[0.97]"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            New workspace
          </button>
        </div>

        {/* Section title & content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-lg font-bold text-slate-800">
                {NAV.find((n) => n.id === section)?.label}
              </h1>
              {!loading && (
                <p className="text-xs text-slate-400 mt-0.5">{filteredCanvases.length} canvas{filteredCanvases.length !== 1 ? 'es' : ''}</p>
              )}
            </div>
          </div>

          {loading ? (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ aspectRatio: '4/3', borderRadius: 16 }} />
              ))}
            </div>
          ) : filteredCanvases.length === 0 ? (
            search ? (
              <div className="flex flex-col items-center justify-center py-32 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200/50 shadow-sm">
                  <Search size={20} className="text-slate-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-[15px] font-semibold text-slate-800">No results found</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-xs leading-relaxed">
                    We couldn't find any canvases matching "{search}". Try checking for typos or using different keywords.
                  </p>
                </div>
                <button onClick={() => setSearch('')}
                  className="mt-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
                  Clear search
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                  {section === 'shared' ? <Users size={22} className="text-slate-300" />
                    : <Plus size={22} className="text-slate-300" />}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-600">
                    {section === 'my' ? 'No canvases yet' : `No ${section} canvases`}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {section === 'my' ? 'Create your first canvas to get started' : ''}
                  </p>
                </div>
              </div>
            )
          ) : viewMode === 'grid' ? (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredCanvases.map((c) => (
                <CanvasCard key={c._id} canvas={c}
                  onRename={renameCanvas} onDelete={deleteCanvas}
                  onDuplicate={duplicateCanvas} />
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredCanvases.map((c) => (
                <ListRow
                  key={c._id}
                  canvas={c}
                  onRename={renameCanvas}
                  onDelete={deleteCanvas}
                  onDuplicate={duplicateCanvas}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <ToastContainer />
      {showNewModal && (
        <NewCanvasModal
          onClose={() => setShowNewModal(false)}
          onCreate={createCanvas}
        />
      )}
    </div>
  );
}
