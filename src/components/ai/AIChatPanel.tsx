'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Sparkles, Send, Loader2, Bot, ChevronDown, Check,
  Zap, Brain, MessageSquare, Wand2, LayoutGrid,
} from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { useCanvasStore } from '@/store/canvas.store';
import { aiApi } from '@/lib/api/ai.api';
import { fromAPI, toAPI } from '@/lib/element.transform';
import { cn } from '@/lib/utils';
import type { DrawableElement } from '@/types/element';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  actions?: ActionSummary[];
  isError?: boolean;
}

interface ActionSummary {
  type: string;
  count?: number;
  label?: string;
}

type ModelOption = 'auto' | 'claude' | 'gemini' | 'groq';

interface ModelMeta {
  label: string;
  color: string;
  icon: string;
  desc: string;
}

const MODEL_META: Record<ModelOption, ModelMeta> = {
  auto:   { label: 'Auto',   color: 'text-violet-600 bg-violet-50 border-violet-200', icon: '✦', desc: 'Best model per task' },
  claude: { label: 'Claude', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: '⬡', desc: 'Best for complex reasoning' },
  gemini: { label: 'Gemini', color: 'text-blue-600 bg-blue-50 border-blue-200',       icon: '◈', desc: 'Fast with large context' },
  groq:   { label: 'Groq',   color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: '⚡', desc: 'Ultra-fast responses' },
};

const BADGE_MAP: Record<string, ModelMeta> = {
  claude: MODEL_META.claude,
  gemini: MODEL_META.gemini,
  groq:   MODEL_META.groq,
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface AIChatPanelProps {
  canvasId: string;
  onGhostElementsGenerated?: (elements: DrawableElement[]) => void;
}

// ── Quick prompts ─────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: '🔐', text: 'Draw a user authentication flow' },
  { icon: '🏗️', text: 'Create a microservices architecture diagram' },
  { icon: '📋', text: 'Generate a 5-step onboarding process' },
  { icon: '🗄️', text: 'Design a database schema for a blog' },
  { icon: '🔄', text: 'Add a CI/CD pipeline diagram' },
  { icon: '📝', text: 'Explain the selected element' },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export function AIChatPanel({ canvasId, onGhostElementsGenerated }: AIChatPanelProps) {
  const { aiChatOpen, setPanel } = useUIStore();
  const { getToken } = useAuthStore();
  const { elements, selectedIds } = useCanvasStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>('auto');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!aiChatOpen || !canvasId) return;
    aiApi.providers(canvasId).then(r => setAvailableModels(r.available)).catch(() => {});
  }, [aiChatOpen, canvasId]);

  useEffect(() => {
    const handlePromptEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && !loading) {
        sendMessage(customEvent.detail);
      }
    };
    window.addEventListener('ai:prompt', handlePromptEvent);
    return () => window.removeEventListener('ai:prompt', handlePromptEvent);
  }, [loading]);

  // ── Send Message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (overrideText?: string) => {
    const content = (overrideText ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      await getToken();

      // Serialize current canvas elements for the AI to see
      const serializedElements = elements.map(toAPI);
      const history = messages.slice(-8).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const result = await aiApi.agentChat(
        canvasId,
        content,
        history,
        serializedElements,
        selectedIds,
        selectedModel,
      );

      // Process actions
      const actionSummaries: ActionSummary[] = [];
      const ghostElements: DrawableElement[] = [];

      for (const action of result.actions as any[]) {
        if (action.type === 'add_elements' && Array.isArray(action.elements)) {
          for (const rawEl of action.elements) {
            // Convert AI element → DrawableElement using fromAPI adapter
            // AI generates in a similar format to our API elements
            const apiFormatted = {
              elementId: rawEl.elementId,
              type: rawEl.kind === 'text' ? 'text' : 'shape',
              subtype: rawEl.shapeType || rawEl.type || 'rectangle',
              x: rawEl.x ?? 0,
              y: rawEl.y ?? 0,
              width: rawEl.width ?? 160,
              height: rawEl.height ?? 56,
              label: rawEl.label ?? '',
              text: rawEl.text ?? '',
              strokeColor: rawEl.color ?? '#2563eb',
              fillColor: rawEl.fillColor ?? '#dbeafe',
              strokeWidth: rawEl.strokeWidth ?? 2,
              opacity: rawEl.opacity ?? 1,
              rotation: rawEl.rotation ?? 0,
              fontSize: rawEl.fontSize ?? 13,
              fontFamily: rawEl.fontFamily ?? 'Inter, sans-serif',
              fromElementId: rawEl.fromId ?? null,
              toElementId: rawEl.toId ?? null,
              dashed: rawEl.dashed ?? false,
              arrowEnd: rawEl.arrowEnd ?? true,
              isGhostSuggestion: true,
              aiConfidence: rawEl.aiConfidence ?? 0.9,
              // Connector hint
              isFlowchartEl: rawEl.kind === 'flowchart',
            };

            const el = fromAPI(apiFormatted);
            if (el) {
              (el as any).isGhostSuggestion = true;
              ghostElements.push(el);
            }
          }
          actionSummaries.push({ type: 'add_elements', count: action.elements.length, label: `Added ${action.elements.length} element${action.elements.length !== 1 ? 's' : ''} to canvas` });
        }

        if (action.type === 'modify_elements') {
          actionSummaries.push({ type: 'modify_elements', count: action.updates?.length, label: `Modified ${action.updates?.length} element${action.updates?.length !== 1 ? 's' : ''}` });
        }

        if (action.type === 'delete_elements') {
          actionSummaries.push({ type: 'delete_elements', count: action.elementIds?.length, label: `Removed ${action.elementIds?.length} element${action.elementIds?.length !== 1 ? 's' : ''}` });
        }
      }

      // Pass ghost elements to canvas page
      if (ghostElements.length > 0 && onGhostElementsGenerated) {
        onGhostElementsGenerated(ghostElements);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.message,
        modelUsed: result.modelUsed,
        actions: actionSummaries,
      }]);

    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Failed to get response. Please check that at least one AI provider is configured.',
        isError: true,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages, selectedModel, canvasId, elements, selectedIds, getToken, onGhostElementsGenerated]);

  if (!aiChatOpen) return null;

  return (
    <div
      className="absolute bottom-4 right-4 z-30 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
      style={{
        width: 400,
        height: 580,
        background: 'rgba(255,255,255,0.99)',
        border: '1px solid rgba(226,232,240,0.8)',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f0fdf4 100%)' }}
      >
        <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
          <Wand2 size={14} className="text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-none">DrawSync AI Agent</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {availableModels.length > 0
              ? `${availableModels.length} model${availableModels.length > 1 ? 's' : ''} • Can generate & modify canvas`
              : 'Connecting...'}
          </p>
        </div>

        {/* Model selector */}
        <div className="relative">
          <button
            onClick={() => setModelMenuOpen(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all',
              MODEL_META[selectedModel].color,
            )}
          >
            <span>{MODEL_META[selectedModel].icon}</span>
            <span>{MODEL_META[selectedModel].label}</span>
            <ChevronDown size={11} className={cn('transition-transform', modelMenuOpen && 'rotate-180')} />
          </button>

          {modelMenuOpen && (
            <div className="absolute top-full right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 min-w-[200px]">
              {(Object.keys(MODEL_META) as ModelOption[]).map(key => {
                const meta = MODEL_META[key];
                const isAvailable = key === 'auto' || availableModels.includes(key);
                return (
                  <button
                    key={key}
                    disabled={!isAvailable}
                    onClick={() => { setSelectedModel(key); setModelMenuOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                      isAvailable ? 'hover:bg-slate-50' : 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    <span className="text-base w-5 text-center">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{meta.label}</p>
                      <p className="text-[10px] text-slate-400 truncate">{meta.desc}</p>
                    </div>
                    {selectedModel === key && <Check size={13} className="text-emerald-500 flex-shrink-0" />}
                    {!isAvailable && <span className="text-[9px] text-slate-400 flex-shrink-0">no key</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => setPanel('aiChatOpen', false)}
          className="w-6 h-6 rounded-lg hover:bg-slate-200/70 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all"
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3" onClick={() => setModelMenuOpen(false)}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-emerald-100 flex items-center justify-center">
              <Brain size={22} className="text-violet-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700 mb-1">AI Canvas Agent</p>
              <p className="text-xs text-slate-400 max-w-[260px] leading-relaxed">
                I can <strong>generate diagrams, draw flowcharts, and modify elements</strong> directly on your canvas. Just tell me what to build.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 w-full px-1 mt-1">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p.text}
                  onClick={() => sendMessage(p.text)}
                  className="text-left px-3 py-2 text-xs text-slate-700 bg-slate-50 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition-all border border-slate-100 hover:border-violet-200 font-medium flex items-center gap-2"
                >
                  <span className="text-sm">{p.icon}</span>
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const badge = msg.modelUsed ? BADGE_MAP[msg.modelUsed] : null;
          return (
            <div key={i} className={cn('flex gap-2.5', msg.role === 'user' && 'flex-row-reverse')}>
              <div className={cn(
                'w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5',
                msg.role === 'assistant' ? 'bg-violet-100 text-violet-600' : 'bg-emerald-500 text-white',
              )}>
                {msg.role === 'assistant' ? '✦' : 'U'}
              </div>
              <div className="flex flex-col gap-1.5 max-w-[85%]">
                <div className={cn(
                  'px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap',
                  msg.role === 'assistant'
                    ? msg.isError
                      ? 'bg-red-50 border border-red-100 text-red-700 rounded-tl-sm'
                      : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-sm'
                    : 'bg-emerald-500 text-white rounded-tr-sm',
                )}>
                  {msg.content}
                </div>

                {/* Action summaries */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {msg.actions.map((action, ai) => (
                      <div key={ai} className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 border border-violet-100 rounded-lg">
                        <Wand2 size={10} className="text-violet-500 flex-shrink-0" />
                        <span className="text-[10px] font-medium text-violet-700">{action.label}</span>
                        <span className="text-[9px] text-violet-400 ml-auto">— Tab to accept</span>
                      </div>
                    ))}
                  </div>
                )}

                {badge && (
                  <div className={cn('self-start flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-semibold', badge.color)}>
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-violet-100 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-violet-600">✦</div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="p-3 border-t border-slate-100 flex gap-2 flex-shrink-0">
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
          }}
          placeholder="Ask AI to draw, generate, or explain anything…"
          className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 placeholder-slate-400 text-slate-700 resize-none"
          style={{ maxHeight: 80, overflowY: 'auto' }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-xl bg-violet-500 hover:bg-violet-600 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none shadow-sm shadow-violet-200 flex-shrink-0 self-end"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}
