'use client';
import { useState } from 'react';
import { X, Sparkles, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  isGenerating: boolean;
  pageTitle: string;
}

export function NotesSummaryModal({ isOpen, onClose, summary, isGenerating, pageTitle }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "absolute right-4 top-24 z-40 bg-white/95 backdrop-blur-md border border-amber-200 shadow-2xl rounded-2xl flex flex-col transition-all duration-300",
        expanded ? "w-[500px] h-[75vh]" : "w-[340px] h-[450px]"
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-100/80 text-amber-600 flex items-center justify-center shadow-sm">
            <Sparkles size={14} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900 leading-none">AI Summary</h3>
            <p className="text-[10px] text-amber-600/80 font-medium mt-0.5">{pageTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-amber-600/70 hover:bg-amber-100/50 rounded-lg transition-colors">
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={onClose} className="p-1.5 text-amber-600/70 hover:bg-amber-100/50 hover:text-red-500 rounded-lg transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 text-sm text-slate-700 leading-relaxed prose prose-sm prose-amber max-w-none">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-amber-600">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center animate-bounce shadow-inner">
              <Sparkles size={20} className="animate-spin-slow" />
            </div>
            <p className="text-xs font-semibold animate-pulse text-center px-4">
              Analyzing handwritten notes and audio transcript...
            </p>
          </div>
        ) : summary ? (
          <ReactMarkdown>{summary}</ReactMarkdown>
        ) : (
          <p className="text-slate-400 italic text-center mt-10">No summary generated yet.</p>
        )}
      </div>
    </div>
  );
}
