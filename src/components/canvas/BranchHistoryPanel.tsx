'use client';
import { useState, useEffect, useCallback } from 'react';
import { GitBranch, X, Plus, GitMerge, Clock, Loader2, ChevronRight, Activity } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useCanvasStore } from '@/store/canvas.store';
import { branchApi, Branch, BranchEvent } from '@/lib/api/branch.api';
import { timeAgo } from '@/lib/utils';

const EVENT_LABELS: Record<string, string> = {
  element_added:   'Added element',
  element_updated: 'Updated element',
  element_deleted: 'Deleted element',
  canvas_cleared:  'Cleared canvas',
  canvas_saved:    'Saved',
};

export function BranchHistoryPanel() {
  const { branchHistoryOpen, togglePanel, addToast } = useUIStore();
  const { canvasId, role } = useCanvasStore();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [events, setEvents] = useState<BranchEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [newName, setNewName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);

  const canEdit = role === 'owner' || role === 'editor';

  const load = useCallback(async () => {
    if (!canvasId) return;
    setLoading(true);
    try {
      const res = await branchApi.list(canvasId);
      setBranches(res.branches ?? []);
    } catch {
      addToast('Failed to load branches', 'error');
    } finally {
      setLoading(false);
    }
  }, [canvasId, addToast]);

  useEffect(() => {
    if (branchHistoryOpen) load();
  }, [branchHistoryOpen, load]);

  const loadEvents = async (bId: string) => {
    if (activeId === bId) { setActiveId(null); return; }
    setActiveId(bId);
    setEventsLoading(true);
    try {
      const res = await branchApi.getEvents(canvasId, bId, { limit: 50 });
      setEvents(res.events ?? []);
    } catch {
      addToast('Failed to load history', 'error');
    } finally {
      setEventsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreatingBranch(true);
    try {
      const res = await branchApi.create(canvasId, { name: newName.trim() });
      setBranches((prev) => [res.branch, ...prev]);
      setNewName('');
      setShowForm(false);
      addToast(`Branch "${res.branch.name}" created`, 'success');
    } catch {
      addToast('Failed to create branch', 'error');
    } finally {
      setCreatingBranch(false);
    }
  };

  const handleMerge = async (b: Branch) => {
    if (!confirm(`Merge branch "${b.name}" into main? This cannot be undone.`)) return;
    setMerging(b._id);
    try {
      await branchApi.merge(canvasId, b._id);
      setBranches((prev) => prev.map((x) => (x._id === b._id ? { ...x, merged: true } : x)));
      addToast(`Branch "${b.name}" merged`, 'success');
    } catch {
      addToast('Merge failed', 'error');
    } finally {
      setMerging(null);
    }
  };

  if (!branchHistoryOpen) return null;

  return (
    <div
      className="absolute top-0 right-0 h-full w-[320px] z-30 flex flex-col shadow-2xl"
      style={{ background: 'rgba(255,255,255,0.97)', borderLeft: '1px solid rgba(226,232,240,0.8)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-indigo-500" />
          <span className="font-semibold text-[14px] text-slate-800">Version History</span>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
              title="New branch"
            >
              <Plus size={14} className="text-slate-500" />
            </button>
          )}
          <button
            onClick={() => togglePanel('branchHistoryOpen')}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="px-4 py-3 border-b border-slate-100 bg-indigo-50/30">
          <p className="text-[11px] text-slate-500 font-medium mb-1.5">New Branch Name</p>
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. feature/new-layout"
              className="flex-1 text-[13px] px-3 py-1.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-300 bg-white"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || creatingBranch}
              className="px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-all disabled:opacity-40"
            >
              {creatingBranch ? <Loader2 size={12} className="animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Branches list */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-slate-300" />
          </div>
        )}
        {!loading && branches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-slate-400">
            <GitBranch size={28} className="mb-2 opacity-30" />
            <p className="text-[13px]">No branches yet</p>
            {canEdit && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-[12px] text-indigo-500 hover:text-indigo-700 font-medium"
              >
                + Create first branch
              </button>
            )}
          </div>
        )}

        {branches.map((b) => (
          <div key={b._id} className="mx-3 mb-2">
            <div
              className={`rounded-xl border transition-all ${b.merged ? 'border-slate-100 opacity-60' : 'border-slate-100 hover:border-indigo-200'} bg-white shadow-sm`}
            >
              <div className="px-3 py-2.5 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${b.merged ? 'bg-slate-300' : 'bg-indigo-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-700 truncate">{b.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400">by {b.createdBy?.fullName}</span>
                    <span className="text-[10px] text-slate-300">·</span>
                    <span className="text-[10px] text-slate-400">{timeAgo(b.createdAt)}</span>
                    <span className="text-[10px] text-slate-300">·</span>
                    <Activity size={9} className="text-slate-300" />
                    <span className="text-[10px] text-slate-400">{b.eventCount}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {b.merged ? (
                    <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-medium">Merged</span>
                  ) : canEdit ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMerge(b); }}
                      disabled={!!merging}
                      className="p-1 rounded-lg hover:bg-indigo-50 transition-colors"
                      title="Merge into main"
                    >
                      {merging === b._id
                        ? <Loader2 size={12} className="animate-spin text-indigo-400" />
                        : <GitMerge size={12} className="text-indigo-400" />}
                    </button>
                  ) : null}
                  <button
                    onClick={() => loadEvents(b._id)}
                    className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                    title="View events"
                  >
                    <ChevronRight
                      size={12}
                      className={`text-slate-400 transition-transform ${activeId === b._id ? 'rotate-90' : ''}`}
                    />
                  </button>
                </div>
              </div>

              {/* Events */}
              {activeId === b._id && (
                <div className="border-t border-slate-100 px-3 py-2 max-h-[240px] overflow-y-auto">
                  {eventsLoading && (
                    <div className="flex justify-center py-3">
                      <Loader2 size={14} className="animate-spin text-slate-300" />
                    </div>
                  )}
                  {!eventsLoading && events.length === 0 && (
                    <p className="text-[11px] text-slate-400 text-center py-2">No events recorded</p>
                  )}
                  {!eventsLoading && events.map((ev) => (
                    <div key={ev._id} className="flex items-center gap-2 py-1.5">
                      <Clock size={10} className="text-slate-300 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-slate-600">
                          {EVENT_LABELS[ev.type] || ev.type}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">#{ev.seqNo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
