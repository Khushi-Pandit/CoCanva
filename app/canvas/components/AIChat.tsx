'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: app/canvas/[canvasId]/components/AIChat.tsx
//
// Floating AI chat panel — slides in from the right.
// When the user asks a question, we serialize visible canvas elements
// and send them as context so the AI can explain what's drawn.
// No API key = graceful fallback to a static "no AI configured" message.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Send, Sparkles, Bot, User,
  Loader2, AlertCircle, ChevronDown,
  //CanvasIcon,
  Minimize2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  timestamp: Date;
  error?:    boolean;
}

interface AIChatProps {
  isOpen:        boolean;
  onClose:       () => void;
  canvasId:      string;
  firebaseToken: string;
  /** Serialized canvas elements to provide as context */
  canvasContext: CanvasContextData;
}

export interface CanvasContextData {
  elementCount:  number;
  strokeCount:   number;
  shapeCount:    number;
  textCount:     number;
  textContents:  string[];
  shapeTypes:    string[];
  hasContent:    boolean;
}

// ── Helper ────────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 10);

function buildCanvasDescription(ctx: CanvasContextData): string {
  if (!ctx.hasContent) return 'The canvas is currently empty.';
  const parts = [`Canvas has ${ctx.elementCount} element(s) total:`];
  if (ctx.strokeCount > 0) parts.push(`• ${ctx.strokeCount} freehand drawing stroke(s)`);
  if (ctx.shapeCount  > 0) parts.push(`• ${ctx.shapeCount} shape(s): ${[...new Set(ctx.shapeTypes)].join(', ')}`);
  if (ctx.textCount   > 0) parts.push(`• ${ctx.textCount} text element(s)`);
  if (ctx.textContents.length > 0) parts.push(`Text on canvas: "${ctx.textContents.join('" | "')}"`);
  return parts.join('\n');
}

const WELCOME = `Hey! 👋 I'm your canvas AI assistant.

I can see what's drawn on the whiteboard and help you:
• **Explain** diagrams or flowcharts
• **Suggest** next steps for your design
• **Answer** questions about canvas content

Try: *"What's on the canvas?"* or *"Explain this flowchart"*`;

// ── Component ─────────────────────────────────────────────────────────────────

export const AIChat: React.FC<AIChatProps> = ({
  isOpen,
  onClose,
  canvasId,
  firebaseToken,
  canvasContext,
}) => {
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [minimized, setMinimized] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const historyRef  = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!minimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, minimized]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, minimized]);

  // Show welcome message once
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id:        genId(),
        role:      'assistant',
        content:   WELCOME,
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id:        genId(),
      role:      'user',
      content:   text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    historyRef.current.push({ role: 'user', content: text });

    try {
      const canvasDesc = buildCanvasDescription(canvasContext);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/${canvasId}/ai-chat`,
        {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseToken}`,
          },
          body: JSON.stringify({
            message:       text,
            canvasContext: canvasDesc,
            history:       historyRef.current.slice(-8), // last 4 turns
          }),
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.reply || 'Sorry, I could not generate a response.';

      historyRef.current.push({ role: 'assistant', content: reply });

      setMessages(prev => [...prev, {
        id:        genId(),
        role:      'assistant',
        content:   reply,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id:        genId(),
        role:      'assistant',
        content:   'Something went wrong. Please check your connection and try again.',
        timestamp: new Date(),
        error:     true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, canvasId, firebaseToken, canvasContext]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    historyRef.current = [];
  };

  if (!isOpen) return null;

  return (
    <div
      className={`absolute right-4 z-30 flex flex-col transition-all duration-300 ease-out
                  ${minimized ? 'bottom-4 w-72 h-12' : 'bottom-4 w-80 h-[520px]'}`}
      style={{
        background:   'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        border:       '1px solid rgba(226,232,240,0.8)',
        borderRadius: '20px',
        boxShadow:    '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(16,185,129,0.08)',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-100/80 flex-shrink-0"
        style={{ borderRadius: minimized ? '20px' : '20px 20px 0 0' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500
                          flex items-center justify-center shadow-sm">
            <Sparkles size={13} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[13px] font-bold text-slate-800 leading-none">Canvas AI</p>
            {!minimized && (
              <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                {canvasContext.hasContent
                  ? `${canvasContext.elementCount} element${canvasContext.elementCount !== 1 ? 's' : ''} on canvas`
                  : 'Empty canvas'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="w-6 h-6 rounded-lg flex items-center justify-center
                       text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all text-[10px] font-bold"
            title="Clear chat"
          >
            ✕
          </button>
          <button
            onClick={() => setMinimized(v => !v)}
            className="w-6 h-6 rounded-lg flex items-center justify-center
                       text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            <Minimize2 size={12} strokeWidth={2} />
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-lg flex items-center justify-center
                       text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
            title="Close"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* ── Canvas context badge ── */}
          {canvasContext.hasContent && (
            <div className="mx-3 mt-2.5 flex items-center gap-2 px-2.5 py-1.5 rounded-xl
                            bg-emerald-50 border border-emerald-100 flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <p className="text-[10px] text-emerald-700 font-medium">
                AI can see your canvas — ask me to explain it!
              </p>
            </div>
          )}

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-0"
               style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {loading && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500
                                flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={11} className="text-white" />
                </div>
                <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div className="px-3 pb-3 pt-2 border-t border-slate-100/80 flex-shrink-0">
            {/* Quick prompts */}
            <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1"
                 style={{ scrollbarWidth: 'none' }}>
              {['What\'s on canvas?', 'Explain this', 'Suggest next step'].map(q => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-medium
                             bg-slate-100 text-slate-600 hover:bg-emerald-50
                             hover:text-emerald-700 transition-all whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about the canvas…"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2
                           text-[13px] text-slate-700 placeholder-slate-400
                           focus:outline-none focus:border-emerald-400 focus:ring-2
                           focus:ring-emerald-100 transition-all leading-relaxed"
                style={{ minHeight: 36, maxHeight: 100 }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = `${Math.min(t.scrollHeight, 100)}px`;
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className={`w-9 h-9 rounded-xl flex items-center justify-center
                            transition-all duration-150 flex-shrink-0
                            ${input.trim() && !loading
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-200 active:scale-95'
                              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
              >
                {loading
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Send size={15} strokeWidth={2} />
                }
              </button>
            </div>
            <p className="text-[9px] text-slate-400 text-center mt-1.5">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </>
      )}
    </div>
  );
};

// ── Message Bubble ─────────────────────────────────────────────────────────────

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';

  // Simple markdown: **bold**, *italic*, bullet lists
  const formatContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Bold
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italic
      line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Bullet
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <div key={i} className="flex items-start gap-1.5 my-0.5">
            <span className="text-emerald-400 mt-1 flex-shrink-0">•</span>
            <span dangerouslySetInnerHTML={{ __html: line.slice(2) }} />
          </div>
        );
      }
      return line ? <p key={i} className="my-0.5 leading-relaxed"
                       dangerouslySetInnerHTML={{ __html: line }} /> : <div key={i} className="h-1" />;
    });
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm
                        bg-emerald-500 text-white text-[12px] leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className={`w-6 h-6 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
                       ${message.error
                         ? 'bg-red-100'
                         : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
        {message.error
          ? <AlertCircle size={11} className="text-red-500" />
          : <Bot size={11} className="text-white" />
        }
      </div>
      <div className={`max-w-[85%] px-3 py-2 rounded-2xl rounded-tl-sm text-[12px]
                       ${message.error
                         ? 'bg-red-50 border border-red-100 text-red-700'
                         : 'bg-slate-50 border border-slate-100 text-slate-700'}`}>
        {formatContent(message.content)}
      </div>
    </div>
  );
};