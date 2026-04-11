'use client';
import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';
export interface Toast { id: string; message: string; variant: ToastVariant; duration?: number; }

interface UIState {
  // Panels
  aiChatOpen: boolean;
  voiceOpen: boolean;
  annotationsOpen: boolean;
  branchHistoryOpen: boolean;
  shareModalOpen: boolean;
  inviteModalOpen: boolean;
  commandPaletteOpen: boolean;
  exportModalOpen: boolean;
  settingsOpen: boolean;

  togglePanel: (panel: keyof Pick<UIState, 'aiChatOpen' | 'voiceOpen' | 'annotationsOpen' | 'branchHistoryOpen' | 'shareModalOpen' | 'inviteModalOpen' | 'commandPaletteOpen' | 'exportModalOpen' | 'settingsOpen'>) => void;
  setPanel: (panel: keyof Pick<UIState, 'aiChatOpen' | 'voiceOpen' | 'annotationsOpen' | 'branchHistoryOpen' | 'shareModalOpen' | 'inviteModalOpen' | 'commandPaletteOpen' | 'exportModalOpen' | 'settingsOpen'>, v: boolean) => void;

  // Toasts
  toasts: Toast[];
  addToast: (msg: string, variant?: ToastVariant, duration?: number) => void;
  removeToast: (id: string) => void;
}

let toastId = 0;

export const useUIStore = create<UIState>((set) => ({
  aiChatOpen:          false,
  voiceOpen:           false,
  annotationsOpen:     false,
  branchHistoryOpen:   false,
  shareModalOpen:      false,
  inviteModalOpen:     false,
  commandPaletteOpen:  false,
  exportModalOpen:     false,
  settingsOpen:        false,

  togglePanel: (panel) => set((s) => ({ [panel]: !s[panel] })),
  setPanel: (panel, v) => set({ [panel]: v }),

  toasts: [],
  addToast: (message, variant = 'info', duration = 3500) => {
    const id = String(++toastId);
    set((s) => ({ toasts: [...s.toasts, { id, message, variant, duration }] }));
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
