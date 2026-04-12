'use client';
import { useEffect } from 'react';
import { useUIStore } from '@/store/ui.store';

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: { id: string; message: string; variant: string; duration?: number }; onRemove: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), toast.duration ?? 3500);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, onRemove]);

  const colors: Record<string, string> = {
    info:    'bg-slate-800 text-white',
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-500 text-white',
    error:   'bg-red-600 text-white',
  };

  const icons: Record<string, string> = {
    info: 'ℹ', success: '✓', warning: '⚠', error: '✕',
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg animate-slide-up max-w-xs ${colors[toast.variant] ?? colors.info}`}
      role="alert"
    >
      <span className="text-base">{icons[toast.variant] ?? icons.info}</span>
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="ml-1 opacity-70 hover:opacity-100 text-lg leading-none">×</button>
    </div>
  );
}
