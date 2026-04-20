'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// Extend window for Webkit Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface UseTranscriptionOptions {
  /** Called every time the browser finalizes a spoken phrase */
  onChunk?: (text: string) => void;
}

/**
 * Robust speech-to-text hook using the Web Speech API.
 *
 * Key design decisions to avoid the bugs in the previous version:
 * - The SpeechRecognition instance is created ONCE on mount (no dependency array issues).
 * - ALL mutable flags live in refs so callbacks never have stale closures.
 * - A watchdog timer detects when recognition silently dies and force-restarts it.
 * - The `onChunk` callback is stored in a ref so it's always fresh.
 */
export function useTranscription({ onChunk }: UseTranscriptionOptions = {}) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Refs (never stale, never cause re-renders) ──────────────────────────
  const recognitionRef   = useRef<any>(null);
  const onChunkRef       = useRef(onChunk);
  const activeRef        = useRef(false);       // true while we WANT to be transcribing
  const restartTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastResultRef    = useRef<number>(0);    // timestamp of last result
  const supportedRef     = useRef(true);

  // Keep the onChunk ref always fresh
  useEffect(() => { onChunkRef.current = onChunk; }, [onChunk]);

  // ── Create recognition instance ONCE on mount ──────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      supportedRef.current = false;
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript.trim()) {
        lastResultRef.current = Date.now();
        onChunkRef.current?.(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[Transcription] Error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access denied.');
        activeRef.current = false;
        setIsTranscribing(false);
        return;
      }
      // For 'network', 'no-speech', 'aborted' errors — auto-restart will handle it via onend
    };

    recognition.onend = () => {
      console.log('[Transcription] Recognition ended. Active:', activeRef.current);
      // Only auto-restart if we still WANT to be transcribing
      if (activeRef.current) {
        // Small delay to avoid hammering the API
        restartTimerRef.current = setTimeout(() => {
          if (activeRef.current && recognitionRef.current) {
            try {
              console.log('[Transcription] Auto-restarting...');
              recognitionRef.current.start();
            } catch (e) {
              console.error('[Transcription] Failed to restart:', e);
              // Try again after longer delay
              restartTimerRef.current = setTimeout(() => {
                if (activeRef.current && recognitionRef.current) {
                  try { recognitionRef.current.start(); } catch {}
                }
              }, 2000);
            }
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      activeRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (watchdogRef.current) clearInterval(watchdogRef.current);
      try { recognition.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, []); // ← Empty deps: created ONCE, never destroyed/recreated

  // ── Start ──────────────────────────────────────────────────────────────
  const startTranscription = useCallback(() => {
    if (!supportedRef.current) return;
    if (activeRef.current) return; // already running

    activeRef.current = true;
    lastResultRef.current = Date.now();
    setError(null);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log('[Transcription] Started successfully');
      } catch (e: any) {
        // "already started" error — that's fine
        if (!e?.message?.includes('already started')) {
          console.error('[Transcription] Start error:', e);
        }
      }
    }

    setIsTranscribing(true);

    // Watchdog: if no results for 15s while active, force restart
    if (watchdogRef.current) clearInterval(watchdogRef.current);
    watchdogRef.current = setInterval(() => {
      if (!activeRef.current) {
        clearInterval(watchdogRef.current!);
        watchdogRef.current = null;
        return;
      }
      const silenceDuration = Date.now() - lastResultRef.current;
      if (silenceDuration > 15000 && recognitionRef.current) {
        console.log('[Transcription] Watchdog: restarting after', Math.round(silenceDuration / 1000), 's silence');
        try { recognitionRef.current.stop(); } catch {}
        // onend handler will auto-restart
      }
    }, 5000);
  }, []);

  // ── Stop ───────────────────────────────────────────────────────────────
  const stopTranscription = useCallback(() => {
    activeRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsTranscribing(false);
    console.log('[Transcription] Stopped');
  }, []);

  return {
    isTranscribing,
    error,
    startTranscription,
    stopTranscription,
  };
}
