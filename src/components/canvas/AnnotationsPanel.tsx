'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, MessageSquare, Plus, Check, Loader2,
  Smile, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useCanvasStore } from '@/store/canvas.store';
import { annotationApi, Annotation } from '@/lib/api/annotation.api';
import { getInitials } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';

const EMOJIS = ['👍', '❤️', '🔥', '🎉', '😮', '🤔'];

export function AnnotationsPanel() {
  const { annotationsOpen, togglePanel, addToast } = useUIStore();
  const { canvasId, role } = useCanvasStore();

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);

  const canEdit = role === 'owner' || role === 'editor' || role === 'commenter';

  const load = useCallback(async () => {
    if (!canvasId) return;
    setLoading(true);
    try {
      const res = await annotationApi.list(canvasId);
      setAnnotations(res.annotations ?? []);
    } catch {
      addToast('Failed to load comments', 'error');
    } finally {
      setLoading(false);
    }
  }, [canvasId, addToast]);

  useEffect(() => {
    if (annotationsOpen) load();
  }, [annotationsOpen, load]);

  const handleCreate = async () => {
    if (!newComment.trim() || !canvasId) return;
    setSubmitting(true);
    try {
      const res = await annotationApi.create(canvasId, {
        text: newComment.trim(),  // ← 'text', not 'content'
      });
      setAnnotations((prev) => [res.annotation, ...prev]);
      setNewComment('');
      addToast('Comment added', 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Failed to add comment';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (a: Annotation) => {
    try {
      const res = await annotationApi.resolve(canvasId, a._id);
      setAnnotations((prev) => prev.map((x) => (x._id === a._id ? res.annotation : x)));
    } catch {
      addToast('Failed to resolve', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await annotationApi.remove(canvasId, id);
      setAnnotations((prev) => prev.filter((a) => a._id !== id));
    } catch {
      addToast('Failed to delete', 'error');
    }
  };

  const handleReact = async (aId: string, emoji: string) => {
    setEmojiPickerFor(null);
    try {
      // Backend returns { reactions } not the full annotation
      const res = await annotationApi.react(canvasId, aId, emoji);
      setAnnotations((prev) => prev.map((x) =>
        x._id === aId ? { ...x, reactions: res.reactions } : x
      ));
    } catch {
      addToast('Failed to react', 'error');
    }
  };

  if (!annotationsOpen) return null;

  const visible = annotations.filter((a) => showResolved ? true : !a.resolvedAt);
  const unresolvedCount = annotations.filter(a => !a.resolvedAt).length;

  return (
    <div
      className="absolute top-0 right-0 h-full w-[320px] z-30 flex flex-col shadow-2xl"
      style={{ background: 'rgba(255,255,255,0.97)', borderLeft: '1px solid rgba(226,232,240,0.8)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-violet-500" />
          <span className="font-semibold text-[14px] text-slate-800">Comments</span>
          {unresolvedCount > 0 && (
            <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-semibold">
              {unresolvedCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1"
          >
            {showResolved ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showResolved ? 'Hide' : 'Resolved'}
          </button>
          <button
            onClick={() => togglePanel('annotationsOpen')}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* New comment — visible to owners, editors, and commenters */}
      {canEdit && (
        <div className="px-4 py-3 border-b border-slate-100">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCreate();
            }}
            placeholder="Add a comment… (Ctrl+Enter to send)"
            rows={3}
            className="w-full text-[13px] text-slate-700 placeholder-slate-400 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-violet-300 resize-none transition-colors"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleCreate}
              disabled={!newComment.trim() || submitting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white bg-violet-500 hover:bg-violet-600 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Post
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-slate-300" />
          </div>
        )}
        {!loading && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-slate-400">
            <MessageSquare size={28} className="mb-2 opacity-30" />
            <p className="text-[13px]">No comments yet</p>
          </div>
        )}
        {visible.map((a) => {
          const isResolved = !!a.resolvedAt;
          // Backend populates 'author', not 'createdBy'
          const authorName = a.author?.fullName || 'User';

          return (
            <div
              key={a._id}
              className={`mx-3 mb-2 rounded-xl border transition-all ${
                isResolved ? 'opacity-60 border-slate-100 bg-slate-50' : 'border-slate-100 bg-white shadow-sm'
              }`}
            >
              <div className="px-3 pt-3">
                {/* Author row */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[9px] font-bold">
                      {getInitials(authorName)}
                    </div>
                    <span className="text-[12px] font-semibold text-slate-700">{authorName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{timeAgo(a.createdAt)}</span>
                </div>

                {/* Content — backend field is 'text' */}
                <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap mb-2">{a.text}</p>

                {/* Reactions */}
                {(a.reactions ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {a.reactions.map((r, i) => (
                      <span key={i} className="text-[12px] bg-slate-100 rounded-full px-1.5 py-0.5">
                        {r.emoji} {r.users.length > 1 ? r.users.length : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 px-3 pb-2 relative">
                <div className="relative">
                  <button
                    onClick={() => setEmojiPickerFor(emojiPickerFor === a._id ? null : a._id)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    title="React"
                  >
                    <Smile size={13} className="text-slate-400" />
                  </button>
                  {emojiPickerFor === a._id && (
                    <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => handleReact(a._id, e)}
                          className="text-[15px] hover:scale-125 transition-transform"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resolve/resolved */}
                {(role === 'owner' || role === 'editor') && !isResolved && (
                  <button
                    onClick={() => handleResolve(a)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-emerald-600 hover:bg-emerald-50 transition-colors font-medium"
                    title="Mark resolved"
                  >
                    <Check size={11} /> Resolve
                  </button>
                )}
                {isResolved && (
                  <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 px-2">
                    <Check size={10} /> Resolved
                  </span>
                )}

                <div className="flex-1" />

                {/* Delete — author or owner can delete */}
                {(role === 'owner' || role === 'editor') && (
                  <button
                    onClick={() => handleDelete(a._id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors group"
                    title="Delete comment"
                  >
                    <Trash2 size={13} className="text-slate-300 group-hover:text-red-400 transition-colors" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
