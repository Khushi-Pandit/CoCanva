'use client';
/**
 * NotesAIPanel — Collapsible right panel for AI features:
 *  - Page summary (auto-generated, cached)
 *  - Full notes summary
 *  - Q&A chat interface
 */
import { useState, useRef, useEffect } from 'react';
import { Sparkles, MessageSquare, FileText, Send, Loader2, X, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotesStore } from '@/store/notes.store';
import { pageApi } from '@/lib/api/page.api';

type Tab = 'summary' | 'ask' | 'full';

interface Message { role: 'user' | 'ai'; content: string; }

interface NotesAIPanelProps {
  canvasId: string;
  canvasTitle: string;
}

export function NotesAIPanel({ canvasId, canvasTitle }: NotesAIPanelProps) {
  const { isAIPanelOpen, setAIPanelOpen, currentPageIndex, pages, pageSummaries, setPageSummary } = useNotesStore();
  const [tab, setTab] = useState<Tab>('summary');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fullSummary, setFullSummary] = useState('');
  const [fullLoading, setFullLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentPage = pages.find(p => p.pageIndex === currentPageIndex);
  const currentSummary = pageSummaries[currentPageIndex];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAsk = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);
    try {
      const summaries = pages
        .sort((a, b) => a.pageIndex - b.pageIndex)
        .map(p => pageSummaries[p.pageIndex] || p.summary || '');
      const answer = await pageApi.ask(canvasId, question, summaries);
      setMessages(prev => [...prev, { role: 'ai', content: answer }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I could not answer that. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFullSummary = async () => {
    if (fullLoading) return;
    setFullLoading(true);
    try {
      const summaries = pages
        .sort((a, b) => a.pageIndex - b.pageIndex)
        .map(p => pageSummaries[p.pageIndex] || p.summary || '');
      const summary = await pageApi.fullSummary(canvasId, canvasTitle, summaries);
      setFullSummary(summary);
    } catch {
      setFullSummary('Could not generate summary.');
    } finally {
      setFullLoading(false);
    }
  };

  if (!isAIPanelOpen) {
    return (
      <button
        onClick={() => setAIPanelOpen(true)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 px-2 py-3 bg-white border border-slate-200 rounded-2xl shadow-md hover:shadow-lg transition-all group"
        title="Open AI Assistant"
      >
        <Sparkles size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
        <span className="text-[9px] font-bold text-slate-400 [writing-mode:vertical-rl]">AI</span>
      </button>
    );
  }

  return (
    <aside className="flex flex-col w-[280px] flex-shrink-0 bg-white border-l border-slate-200 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-amber-500" />
          <span className="text-[12px] font-bold text-slate-700">AI Assistant</span>
        </div>
        <button onClick={() => setAIPanelOpen(false)} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
          <X size={13} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        {([
          { id: 'summary' as Tab, label: 'Page', Icon: FileText },
          { id: 'ask'     as Tab, label: 'Ask',  Icon: MessageSquare },
          { id: 'full'    as Tab, label: 'Notes', Icon: BookOpen },
        ]).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-all border-b-2',
              tab === id ? 'border-amber-400 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            )}
          >
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Page Summary Tab */}
        {tab === 'summary' && (
          <div>
            <p className="text-[11px] font-bold text-slate-500 mb-2">
              {currentPage?.label || `Page ${currentPageIndex + 1}`} — Summary
            </p>
            {currentSummary ? (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-[12px] text-slate-700 leading-relaxed">{currentSummary}</p>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                <Sparkles size={20} className="text-slate-300 mx-auto mb-2" />
                <p className="text-[11px] text-slate-400">
                  Summary will appear after content is added to this page.
                </p>
              </div>
            )}

            {/* Other pages quick view */}
            {pages.length > 1 && (
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Other pages</p>
                <div className="space-y-2">
                  {pages
                    .filter(p => p.pageIndex !== currentPageIndex)
                    .sort((a, b) => a.pageIndex - b.pageIndex)
                    .map(p => (
                      <details key={p._id} className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                          <span className="text-[11px] font-medium text-slate-600">
                            {p.label || `Page ${p.pageIndex + 1}`}
                          </span>
                          <ChevronDown size={11} className="text-slate-400 group-open:hidden" />
                          <ChevronUp size={11} className="text-slate-400 hidden group-open:block" />
                        </summary>
                        <p className="text-[11px] text-slate-500 mt-1 px-2 leading-relaxed">
                          {pageSummaries[p.pageIndex] || p.summary || 'No summary yet.'}
                        </p>
                      </details>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ask Tab */}
        {tab === 'ask' && (
          <div className="flex flex-col h-full">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <MessageSquare size={24} className="text-slate-200 mx-auto mb-2" />
                <p className="text-[11px] text-slate-400">Ask anything about your notes.</p>
                <div className="mt-3 space-y-1">
                  {[
                    'Summarize the key points',
                    'What topics are covered?',
                    'Create a quiz from these notes',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="w-full text-[10px] text-left px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2 flex-1">
              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[90%] px-2.5 py-1.5 rounded-xl text-[11px] leading-relaxed',
                    m.role === 'user'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-700'
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 px-3 py-2 rounded-xl">
                    <Loader2 size={12} className="animate-spin text-slate-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Full Notes Summary Tab */}
        {tab === 'full' && (
          <div>
            <button
              onClick={handleFullSummary}
              disabled={fullLoading}
              className="w-full py-2 mb-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {fullLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Generate Full Summary
            </button>
            {fullSummary ? (
              <div className="p-3 bg-gradient-to-b from-amber-50 to-white border border-amber-100 rounded-xl">
                <p className="text-[12px] text-slate-700 leading-relaxed">{fullSummary}</p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 text-center mt-4">
                Click above to generate a summary of all {pages.length} pages.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Input for Ask tab */}
      {tab === 'ask' && (
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAsk()}
              placeholder="Ask about your notes..."
              className="flex-1 text-[12px] bg-transparent outline-none text-slate-700 placeholder-slate-400"
            />
            <button
              onClick={handleAsk}
              disabled={!input.trim() || loading}
              className="w-6 h-6 rounded-lg flex items-center justify-center bg-amber-500 text-white hover:bg-amber-600 transition-all disabled:opacity-40"
            >
              <Send size={11} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
