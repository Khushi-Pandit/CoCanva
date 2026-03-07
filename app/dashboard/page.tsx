/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import {
  Plus, Clock, Trash2, FolderOpen, Grid2X2, List,
  LogOut, ChevronDown, Search, MoreHorizontal,
  ArrowUpDown, Pencil, Check, X
} from 'lucide-react';

interface Canvas {
  _id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

const Logo = () => (
  <div className="flex items-center gap-2 select-none">
    <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7">
      <path d="M16 3L29 10.5V21.5L16 29L3 21.5V10.5L16 3Z" fill="#0d9488" fillOpacity="0.12" stroke="#0d9488" strokeWidth="1.5"/>
      <path d="M16 3L16 29M3 10.5L29 10.5M3 21.5L29 21.5" stroke="#0d9488" strokeWidth="0.8" strokeOpacity="0.4"/>
      <path d="M16 3L29 10.5L16 18L3 10.5L16 3Z" fill="#10b981" fillOpacity="0.25" stroke="#10b981" strokeWidth="1.5"/>
    </svg>
    <span className="text-[17px] font-bold tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
      <span style={{ color: '#134e4a' }}>canvas</span>
      <span style={{ color: '#10b981' }}>ly</span>
    </span>
  </div>
);

const DropMenu = ({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) => (
  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-100 py-1 w-32 z-50">
    <button onClick={onRename} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
      <Pencil size={11}/> Rename
    </button>
    <div className="mx-2 h-px bg-slate-100"/>
    <button onClick={onDelete} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
      <Trash2 size={11}/> Delete
    </button>
  </div>
);

const CanvasCard = ({ canvas, view, onOpen, onDelete, onRename }: {
  canvas: Canvas; view: 'grid' | 'list';
  onOpen: (id: string) => void; onDelete: (id: string) => void; onRename: (id: string, t: string) => void;
}) => {
  const [hovered,  setHovered]  = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName,  setNewName]  = useState(canvas.title || 'untitled');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (renaming && inputRef.current) inputRef.current.focus(); }, [renaming]);

  const timeAgo = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m+'m ago';
    const h = Math.floor(m/60); if (h < 24) return h+'h ago';
    return Math.floor(h/24)+'d ago';
  };
  const submit = () => { if (newName.trim()) onRename(canvas._id, newName.trim()); setRenaming(false); };

  const icon = (
    <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 flex-shrink-0">
      <path d="M16 3L29 10.5V21.5L16 29L3 21.5V10.5L16 3Z" fill="#10b981" fillOpacity="0.12" stroke="#10b981" strokeWidth="1.8"/>
      <path d="M16 3L29 10.5L16 18L3 10.5L16 3Z" fill="#10b981" fillOpacity="0.28" stroke="#10b981" strokeWidth="1.8"/>
    </svg>
  );

  if (view === 'list') return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:bg-slate-50 border border-transparent hover:border-slate-200"
      onClick={() => !renaming && onOpen(canvas._id)}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}>
      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        {renaming
          ? <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              <input ref={inputRef} value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter') submit(); if (e.key==='Escape') setRenaming(false); }}
                className="text-sm font-medium text-slate-700 bg-white border border-emerald-300 rounded-lg px-2 py-0.5 focus:outline-none w-40"/>
              <button onClick={submit}><Check size={12} className="text-emerald-600"/></button>
              <button onClick={() => setRenaming(false)}><X size={12} className="text-slate-400"/></button>
            </div>
          : <p className="text-sm font-medium text-slate-700 truncate">{canvas.title || 'untitled'}</p>}
      </div>
      <span className="text-xs text-slate-400 mr-1 flex-shrink-0">{timeAgo(canvas.updatedAt)}</span>
      <div className="relative" onClick={e => e.stopPropagation()}>
        <button onClick={() => setMenuOpen(v => !v)}
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <MoreHorizontal size={14}/>
        </button>
        {menuOpen && <DropMenu onRename={() => { setRenaming(true); setMenuOpen(false); }} onDelete={() => { setMenuOpen(false); onDelete(canvas._id); }}/>}
      </div>
    </div>
  );

  return (
    <div className="group relative rounded-xl border bg-white overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
      style={{ borderColor: hovered ? '#6ee7b7' : '#e5e7eb', boxShadow: hovered ? '0 4px 14px rgba(16,185,129,0.12)' : '0 1px 3px rgba(0,0,0,0.06)' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      onClick={() => !renaming && onOpen(canvas._id)}>
      <div className="h-[130px] relative overflow-hidden flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#f0fdf4 100%)' }}>
        <svg className="absolute inset-0 w-full h-full opacity-50" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id={'g-'+canvas._id} width="18" height="18" patternUnits="userSpaceOnUse">
            <path d="M 18 0 L 0 0 0 18" fill="none" stroke="#d1fae5" strokeWidth="0.6"/>
          </pattern></defs>
          <rect width="100%" height="100%" fill={'url(#g-'+canvas._id+')'}/>
        </svg>
        <svg viewBox="0 0 32 32" fill="none" className="w-10 h-10 opacity-20">
          <path d="M16 3L29 10.5V21.5L16 29L3 21.5V10.5L16 3Z" fill="#10b981" stroke="#10b981" strokeWidth="1.5"/>
          <path d="M16 3L29 10.5L16 18L3 10.5L16 3Z" fill="#10b981" fillOpacity="0.6" stroke="#10b981" strokeWidth="1.5"/>
        </svg>
      </div>
      <div className="px-2.5 py-2 flex items-center justify-between border-t border-slate-100">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {icon}
          {renaming
            ? <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <input ref={inputRef} value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter') submit(); if (e.key==='Escape') setRenaming(false); }}
                  className="text-xs font-medium bg-white border border-emerald-300 rounded px-1.5 py-0.5 focus:outline-none w-24"/>
                <button onClick={submit}><Check size={10} className="text-emerald-600"/></button>
                <button onClick={() => setRenaming(false)}><X size={10} className="text-slate-400"/></button>
              </div>
            : <span className="text-xs font-medium text-slate-600 truncate">{canvas.title || 'untitled'}</span>}
        </div>
        <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => setMenuOpen(v => !v)}
            className={`w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all ${hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <MoreHorizontal size={12}/>
          </button>
          {menuOpen && <DropMenu onRename={() => { setRenaming(true); setMenuOpen(false); }} onDelete={() => { setMenuOpen(false); onDelete(canvas._id); }}/>}
        </div>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [user,      setUser]      = useState<any>(null);
  const [token,     setToken]     = useState('');
  const [canvases,  setCanvases]  = useState<Canvas[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [creating,  setCreating]  = useState(false);
  const [view,      setView]      = useState<'grid'|'list'>('grid');
  const [activeNav, setActiveNav] = useState('My applets');
  const [search,    setSearch]    = useState('');
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [sortDesc,  setSortDesc]  = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { router.replace('/login'); return; }
      const t = await u.getIdToken(); setUser(u); setToken(t); load(t);
    }); return () => unsub();
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', fn); return () => document.removeEventListener('mousedown', fn);
  }, []);

  const load = async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas`, { headers: { Authorization: `Bearer ${t}` } });
      const d = await res.json(); setCanvases(Array.isArray(d.canvases) ? d.canvases : []);
    } catch { setCanvases([]); } setLoading(false);
  };

  const createCanvas = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'untitled' }),
      });
      const d = await res.json(); if (d.canvas?._id) router.push(`/canvas/${d.canvas._id}`);
      router.push(`/canvas/${d.canvas._id}`);
    } catch {} setCreating(false);
  };

  const deleteCanvas = async (id: string) => {
    if (!confirm('Delete canvas? Cannot be undone.')) return;
    setCanvases(p => p.filter(c => c._id !== id));
    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  };

  const renameCanvas = async (id: string, title: string) => {
    setCanvases(p => p.map(c => c._id === id ? { ...c, title } : c));
    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title }),
    }).catch(() => {});
  };

  const handleSignOut = async () => { await signOut(auth); router.replace('/login'); };
  const getInitials = (n: string) => { const p = n.trim().split(/\s+/); return p.length>=2 ? (p[0][0]+p[1][0]).toUpperCase() : n.slice(0,2).toUpperCase(); };

  const userName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = getInitials(userName);

  const filtered = canvases.filter(c => (c.title||'untitled').toLowerCase().includes(search.toLowerCase()));
  const sorted   = [...filtered].sort((a,b) => { const d=new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime(); return sortDesc?d:-d; });

  const groupByDate = (list: Canvas[]) => {
    const today=new Date(); today.setHours(0,0,0,0);
    const yesterday=new Date(today); yesterday.setDate(today.getDate()-1);
    const map: Record<string,Canvas[]> = {};
    list.forEach(c => {
      const d=new Date(c.createdAt); d.setHours(0,0,0,0);
      const label = +d===+today?'Today' : +d===+yesterday?'Yesterday' : d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
      if (!map[label]) map[label]=[]; map[label].push(c);
    }); return map;
  };

  const groups = groupByDate(sorted);
  const NAV = [{ label:'My applets', Icon:Grid2X2 }, { label:'Projects', Icon:FolderOpen }, { label:'Recent', Icon:Clock }, { label:'Trash', Icon:Trash2 }];

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background:'#f3f4f6' }}>

      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-slate-200/80" style={{ background:'#f3f4f6' }}>
        <div ref={menuRef} className="relative px-2.5 pt-3 pb-1">
          <button onClick={() => setMenuOpen(v=>!v)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/70 transition-all">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
              style={{ background:'linear-gradient(135deg,#0d9488,#10b981)' }}>{initials}</div>
            <span className="text-[13px] font-semibold text-slate-700 truncate flex-1 text-left">
              {(userName.length>10?userName.slice(0,10)+'…':userName)}'s Workspace
            </span>
            <ChevronDown size={12} className="text-slate-400 flex-shrink-0"/>
          </button>
          {menuOpen && (
            <div className="absolute top-full left-2.5 right-2.5 mt-1 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 z-50">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-semibold text-slate-700 truncate">{userName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors">
                <LogOut size={12}/> Sign out
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2.5 py-2 space-y-0.5">
          {NAV.map(({ label, Icon }) => (
            <button key={label} onClick={() => setActiveNav(label)}
              className={`w-full flex items-center gap-2.5 px-3 py-[7px] rounded-xl text-[13px] font-medium transition-all ${activeNav===label ? 'bg-white shadow-sm text-slate-800 font-semibold' : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'}`}>
              <Icon size={14} className={activeNav===label ? 'text-emerald-600' : 'text-slate-400'}/>
              {label}
            </button>
          ))}
        </nav>

        <div className="px-4 pb-4 pt-2 border-t border-slate-200/70 mt-auto"><Logo /></div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col bg-white overflow-hidden">
        <header className="flex items-center px-6 py-3 border-b border-slate-100 gap-4 relative">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-52">
            <Search size={12} className="text-slate-400 flex-shrink-0"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="text-xs bg-transparent outline-none text-slate-600 placeholder-slate-400 w-full"/>
          </div>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold text-slate-700 pointer-events-none">{activeNav}</h1>
          <button onClick={createCanvas} disabled={creating}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
            style={{ background:'linear-gradient(135deg,#0d9488 0%,#10b981 100%)', boxShadow:'0 2px 10px rgba(16,185,129,0.35)' }}>
            {creating ? <div className="w-3.5 h-3.5 border-[1.5px] border-white border-t-transparent rounded-full animate-spin"/> : <Plus size={14} strokeWidth={2.5}/>}
            New canvas
          </button>
        </header>

        <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-100/80">
          <button onClick={() => setSortDesc(v=>!v)} className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowUpDown size={11}/> Date created <span className="text-[10px] opacity-60">{sortDesc ? '↓' : '↑'}</span>
          </button>
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setView('grid')} className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${view==='grid'?'bg-white shadow-sm text-slate-700':'text-slate-400 hover:text-slate-600'}`}><Grid2X2 size={12}/></button>
            <button onClick={() => setView('list')} className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${view==='list'?'bg-white shadow-sm text-slate-700':'text-slate-400 hover:text-slate-600'}`}><List size={12}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center h-40"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[55vh] gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#ecfdf5,#d1fae5)' }}>
                <svg viewBox="0 0 32 32" fill="none" className="w-9 h-9">
                  <path d="M16 3L29 10.5V21.5L16 29L3 21.5V10.5L16 3Z" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1.5"/>
                  <path d="M16 3L29 10.5L16 18L3 10.5L16 3Z" fill="#10b981" fillOpacity="0.4" stroke="#10b981" strokeWidth="1.5"/>
                  <path d="M16 11V21M11.5 16H20.5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700 mb-1">{search ? 'No results found' : 'No canvases yet'}</p>
                <p className="text-xs text-slate-400">{search ? 'Try different keywords' : 'Hit "New canvas" to create your first one'}</p>
              </div>
              {!search && (
                <button onClick={createCanvas} disabled={creating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 mt-1"
                  style={{ background:'linear-gradient(135deg,#0d9488,#10b981)', boxShadow:'0 2px 8px rgba(16,185,129,0.3)' }}>
                  <Plus size={14} strokeWidth={2.5}/> Create canvas
                </button>
              )}
            </div>
          ) : (
            Object.entries(groups).map(([label, items]) => (
              <div key={label} className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">{label}</p>
                {view === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {items.map(c => <CanvasCard key={c._id} canvas={c} view="grid" onOpen={id => router.push(`/canvas/${id}`)} onDelete={deleteCanvas} onRename={renameCanvas}/>)}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {items.map(c => <CanvasCard key={c._id} canvas={c} view="list" onOpen={id => router.push(`/canvas/${id}`)} onDelete={deleteCanvas} onRename={renameCanvas}/>)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}