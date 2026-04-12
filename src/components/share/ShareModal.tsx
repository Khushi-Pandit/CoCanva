'use client';
import { useState } from 'react';
import { X, Copy, Check, Link2, UserPlus, Crown, Pencil, Eye } from 'lucide-react';
import { canvasApi } from '@/lib/api/canvas.api';
import { useCanvasStore } from '@/store/canvas.store';
import { useUIStore } from '@/store/ui.store';
import { CanvasRole } from '@/types/canvas';
import { cn } from '@/lib/utils';
import { userApi } from '@/lib/api/user.api';

const ROLES: { role: CanvasRole; label: string; desc: string; Icon: React.ElementType }[] = [
  { role: 'editor',  label: 'Editor',  desc: 'Can edit and draw', Icon: Pencil },
  { role: 'commenter', label: 'Commenter', desc: 'Can comment only', Icon: Eye },
  { role: 'viewer',  label: 'Viewer',  desc: 'Read-only access', Icon: Eye },
];

export function ShareModal() {
  const { shareModalOpen, setPanel, addToast } = useUIStore();
  const { canvasId } = useCanvasStore();

  const [shareLink, setShareLink]     = useState('');
  const [shareRole, setShareRole]     = useState<CanvasRole>('editor');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied]           = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState<CanvasRole>('editor');
  const [inviting, setInviting]       = useState(false);

  if (!shareModalOpen) return null;

  const generateLink = async () => {
    setGeneratingLink(true);
    try {
      const { token } = await canvasApi.createShareToken(canvasId, { role: shareRole });
      const url = `${window.location.origin}/canvas/join/${token}`;
      setShareLink(url);
    } catch {
      addToast('Failed to generate share link', 'error');
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Link copied!', 'success', 2000);
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await canvasApi.addCollaborator(canvasId, { email: inviteEmail.trim().toLowerCase(), role: inviteRole });
      setInviteEmail('');
      addToast('Invitation sent!', 'success');
    } catch {
      addToast('Failed to invite user', 'error');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setPanel('shareModalOpen', false)}>
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Link2 size={15} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Share Canvas</p>
              <p className="text-[11px] text-slate-400">Invite collaborators or share a link</p>
            </div>
          </div>
          <button onClick={() => setPanel('shareModalOpen', false)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Invite by email */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <UserPlus size={12} /> Invite by email
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
                className="input flex-1 text-xs"
              />
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as CanvasRole)}
                className="input w-28 text-xs">
                {ROLES.map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
              </select>
            </div>
            <button onClick={sendInvite} disabled={!inviteEmail.trim() || inviting}
              className="mt-2 w-full px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 transition-all active:scale-95 shadow-sm">
              {inviting ? 'Sending…' : 'Send invitation'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[10px] text-slate-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Share link */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <Link2 size={12} /> Share link
            </p>
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {ROLES.map((r) => (
                <button key={r.role} onClick={() => setShareRole(r.role)}
                  className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border',
                    shareRole === r.role ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                  <r.Icon size={10} /> {r.label}
                </button>
              ))}
            </div>

            {!shareLink ? (
              <button onClick={generateLink} disabled={generatingLink}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-medium border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 transition-all disabled:opacity-50">
                {generatingLink ? 'Generating…' : 'Generate share link →'}
              </button>
            ) : (
              <div className="flex gap-2">
                <input readOnly value={shareLink}
                  className="input flex-1 text-xs font-mono bg-slate-50" />
                <button onClick={copyLink}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all',
                    copied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
