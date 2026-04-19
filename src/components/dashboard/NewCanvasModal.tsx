'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, ChevronRight, Pencil, FileText, Workflow, Check } from 'lucide-react';
import { CanvasType, PageSize } from '@/types/canvas';

const PAGE_SIZES: { id: PageSize; label: string; dims: string; desc: string }[] = [
  { id: 'a4',     label: 'A4',     dims: '210 × 297 mm', desc: 'Standard international' },
  { id: 'letter', label: 'Letter', dims: '8.5 × 11 in',  desc: 'Standard US' },
  { id: 'a3',     label: 'A3',     dims: '297 × 420 mm', desc: 'Large format' },
  { id: 'a5',     label: 'A5',     dims: '148 × 210 mm', desc: 'Notebook size' },
];

const CANVAS_TYPES: {
  id: CanvasType;
  label: string;
  subtitle: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
  Icon: React.ElementType;
  preview: React.ReactNode;
}[] = [
  {
    id: 'drawing',
    label: 'Drawing',
    subtitle: 'Infinite Canvas',
    desc: 'Freeform sketching, shapes, connectors and diagrams on an infinite canvas.',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    Icon: Pencil,
    preview: (
      <div className="w-full h-24 relative overflow-hidden rounded-lg bg-slate-50">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }} />
        <div className="absolute top-4 left-6 w-16 h-10 rounded-lg border-2 border-violet-400 bg-violet-50" />
        <div className="absolute top-8 left-24 w-20 h-8 rounded border-2 border-emerald-400 bg-emerald-50" />
        <svg className="absolute top-6 left-20 w-10 h-10" viewBox="0 0 40 40">
          <line x1="0" y1="20" x2="40" y2="12" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowV)" />
        </svg>
        <div className="absolute bottom-3 right-6 w-12 h-12 border-2 border-rose-400 bg-rose-50 rotate-45" />
      </div>
    ),
  },
  {
    id: 'notes',
    label: 'Notes',
    subtitle: 'Writing & Pages',
    desc: 'Multi-page writing workspace — perfect for notes, teaching, studying, and documents.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    Icon: FileText,
    preview: (
      <div className="w-full h-24 relative overflow-hidden rounded-lg bg-[#f0ede8] flex items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn('rounded shadow-md bg-white border border-slate-200 flex-shrink-0', i === 1 ? 'w-16 h-20 z-10' : 'w-12 h-16 opacity-70')} style={{ transform: i === 0 ? 'rotate(-4deg)' : i === 2 ? 'rotate(4deg)' : undefined }}>
            {i === 1 && (
              <div className="p-1.5 space-y-1">
                {[6, 10, 8, 7].map((w, j) => (
                  <div key={j} className="h-1 rounded-full bg-slate-200" style={{ width: `${w * 8}%` }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'diagram',
    label: 'Diagram',
    subtitle: 'Flowcharts & Schemas',
    desc: 'Professional flowcharts, system diagrams, ERDs and more with smart connectors.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    Icon: Workflow,
    preview: (
      <div className="w-full h-24 relative overflow-hidden rounded-lg bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-14 h-8 rounded border-2 border-blue-400 bg-blue-50 text-[8px] flex items-center justify-center text-blue-600 font-semibold">Start</div>
          <div className="w-6 h-px bg-slate-400 relative"><div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-slate-400 border-y-2 border-y-transparent" /></div>
          <div className="w-14 h-8 rounded border-2 border-emerald-400 bg-emerald-50 text-[8px] flex items-center justify-center text-emerald-700 font-semibold">Process</div>
          <div className="w-6 h-px bg-slate-400 relative"><div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-slate-400 border-y-2 border-y-transparent" /></div>
          <div className="w-10 h-10 border-2 border-amber-400 bg-amber-50 rotate-45 text-[7px] flex items-center justify-center" style={{ borderRadius: 2 }}><span className="-rotate-45 text-amber-700 font-semibold">Dec.</span></div>
        </div>
      </div>
    ),
  },
];

interface NewCanvasModalProps {
  onClose: () => void;
  onCreate: (params: { title: string; canvasType: CanvasType; pageSize?: PageSize; pageOrientation?: 'portrait' | 'landscape' }) => void;
}

export function NewCanvasModal({ onClose, onCreate }: NewCanvasModalProps) {
  const [step, setStep] = useState<'type' | 'configure'>('type');
  const [type, setType] = useState<CanvasType | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [title, setTitle] = useState('');

  const selectType = (t: CanvasType) => {
    setType(t);
    if (t === 'notes') {
      setStep('configure');
    } else {
      handleCreate(t);
    }
  };

  const handleCreate = (overrideType?: CanvasType) => {
    const finalType = overrideType ?? type!;
    const finalTitle = title.trim() || (
      finalType === 'notes' ? 'Untitled Notes' :
      finalType === 'diagram' ? 'Untitled Diagram' : 'Untitled Canvas'
    );
    onCreate({
      title: finalTitle,
      canvasType: finalType,
      ...(finalType === 'notes' ? { pageSize, pageOrientation: orientation } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all z-10">
          <X size={16} />
        </button>

        {/* Step: Type picker */}
        {step === 'type' && (
          <div className="p-8">
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">New workspace</p>
              <h2 className="text-2xl font-bold text-slate-900">What are you creating?</h2>
              <p className="text-sm text-slate-500 mt-1">Choose the type of workspace to open.</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {CANVAS_TYPES.map((ct) => (
                <button
                  key={ct.id}
                  onClick={() => selectType(ct.id)}
                  className={cn(
                    'group relative flex flex-col rounded-2xl border-2 p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg',
                    ct.border, ct.bg,
                  )}
                >
                  <div className="mb-3">{ct.preview}</div>
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-2', ct.bg, 'border', ct.border)}>
                    <ct.Icon size={16} className={ct.color} />
                  </div>
                  <p className="font-bold text-slate-800 text-sm">{ct.label}</p>
                  <p className={cn('text-[11px] font-semibold mb-1', ct.color)}>{ct.subtitle}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{ct.desc}</p>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
                    <ChevronRight size={16} className={ct.color} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Configure (Notes only) */}
        {step === 'configure' && (
          <div className="p-8">
            <button onClick={() => setStep('type')} className="text-[12px] text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-4 transition-colors">
              ← Back
            </button>
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-500 mb-1">Notes workspace</p>
              <h2 className="text-xl font-bold text-slate-900">Configure your notebook</h2>
            </div>

            {/* Title */}
            <div className="mb-5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Title</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="My Notes"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              />
            </div>

            {/* Page size */}
            <div className="mb-5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Page Size</label>
              <div className="grid grid-cols-4 gap-2">
                {PAGE_SIZES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setPageSize(s.id)}
                    className={cn(
                      'relative flex flex-col items-center p-2 rounded-xl border-2 transition-all text-center',
                      pageSize === s.id
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    {pageSize === s.id && <Check size={10} className="absolute top-1.5 right-1.5 text-amber-500" />}
                    {/* Paper icon */}
                    <div className={cn('rounded border mb-1.5', s.id === 'a3' ? 'w-8 h-10' : s.id === 'a5' ? 'w-5 h-7' : s.id === 'letter' ? 'w-6 h-7' : 'w-5 h-7', pageSize === s.id ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-white')} />
                    <p className="text-[11px] font-bold text-slate-700">{s.label}</p>
                    <p className="text-[9px] text-slate-400">{s.dims}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div className="mb-6">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Orientation</label>
              <div className="flex gap-2">
                {(['portrait', 'landscape'] as const).map((o) => (
                  <button
                    key={o}
                    onClick={() => setOrientation(o)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border-2 text-sm font-semibold transition-all',
                      orientation === o ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    )}
                  >
                    <div className={cn('border-2 rounded', o === 'portrait' ? 'w-5 h-7 border-current' : 'w-7 h-5 border-current')} />
                    {o.charAt(0).toUpperCase() + o.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleCreate()}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all shadow-lg shadow-amber-200 hover:shadow-amber-300"
            >
              Create Notebook →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
