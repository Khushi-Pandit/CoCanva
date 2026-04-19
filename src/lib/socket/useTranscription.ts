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
  onChunk?: (text: string) => void;
}

export function useTranscription({ onChunk }: UseTranscriptionOptions = {}) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onChunkRef = useRef(onChunk);
  
  useEffect(() => {
    onChunkRef.current = onChunk;
  }, [onChunk]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        }
      }
      
      if (finalTranscript && onChunkRef.current) {
        onChunkRef.current(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setError('Microphone access denied.');
        setIsTranscribing(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we are supposed to be transcribing
      if (isTranscribing) {
        try {
          recognition.start();
        } catch (e) {
          setIsTranscribing(false);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [isTranscribing]);

  const startTranscription = useCallback(() => {
    if (recognitionRef.current && !isTranscribing) {
      setError(null);
      try {
        recognitionRef.current.start();
        setIsTranscribing(true);
      } catch (e) {
        console.error(e);
      }
    }
  }, [isTranscribing]);

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current && isTranscribing) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsTranscribing(false);
    }
  }, [isTranscribing]);

  return {
    isTranscribing,
    error,
    startTranscription,
    stopTranscription,
  };
}
