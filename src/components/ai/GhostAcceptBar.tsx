'use client';
import { useEffect } from 'react';
import { Check, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GhostAcceptBarProps {
  count: number;
  onAccept: () => void;
  onDismiss: () => void;
}

export function GhostAcceptBar({ count, onAccept, onDismiss }: GhostAcceptBarProps) {
  // Tab to accept, Esc to dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === 'Tab') { e.preventDefault(); onAccept(); }
      if (e.key === 'Escape') { onDismiss(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onAccept, onDismiss]);

  return (
    <div
      className="absolute bottom-6 left-1/2 z-50 animate-slide-up"
      style={{ transform: 'translateX(-50%)' }}
    >
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(30,27,75,0.96) 0%, rgba(17,24,39,0.97) 100%)',
          border: '1px solid rgba(139,92,246,0.4)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-600/30 flex items-center justify-center">
            <Sparkles size={12} className="text-violet-300" />
          </div>
          <span className="text-sm font-medium text-white/90">
            AI generated <span className="text-violet-300 font-semibold">{count} element{count !== 1 ? 's' : ''}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 ml-1">
          <button
            onClick={onAccept}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition-all shadow-lg shadow-emerald-500/30"
          >
            <Check size={12} />
            Accept
            <kbd className="ml-1 text-[9px] bg-emerald-400/40 rounded px-1 py-0.5 font-mono">Tab</kbd>
          </button>
          <button
            onClick={onDismiss}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-xs font-semibold transition-all"
          >
            <X size={12} />
            Dismiss
            <kbd className="ml-1 text-[9px] bg-white/10 rounded px-1 py-0.5 font-mono">Esc</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
