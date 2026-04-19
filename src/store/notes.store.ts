import { create } from 'zustand';
import { PageMeta } from '@/lib/api/page.api';
import { PageSize } from '@/types/canvas';

interface NotesState {
  pages: PageMeta[];
  currentPageIndex: number;
  pageSize: PageSize;
  pageOrientation: 'portrait' | 'landscape';
  pageSummaries: Record<number, string>;
  isAIPanelOpen: boolean;
  isFocusMode: boolean;
  zoom: number;

  // Actions
  setPages: (pages: PageMeta[]) => void;
  setCurrentPage: (index: number) => void;
  addPageMeta: (page: PageMeta) => void;
  removePageMeta: (pageIndex: number) => void;
  updatePageMeta: (pageIndex: number, updates: Partial<PageMeta>) => void;
  reorderPagesMeta: (ordered: PageMeta[]) => void;
  setPageSummary: (pageIndex: number, summary: string) => void;
  setPageSize: (size: PageSize) => void;
  setPageOrientation: (o: 'portrait' | 'landscape') => void;
  setAIPanelOpen: (open: boolean) => void;
  setFocusMode: (v: boolean) => void;
  setZoom: (z: number) => void;
  reset: () => void;
}

const initialState = {
  pages: [] as PageMeta[],
  currentPageIndex: 0,
  pageSize: 'a4' as PageSize,
  pageOrientation: 'portrait' as const,
  pageSummaries: {} as Record<number, string>,
  isAIPanelOpen: false,
  isFocusMode: false,
  zoom: 1,
};

export const useNotesStore = create<NotesState>((set) => ({
  ...initialState,

  setPages: (pages) => set({ pages }),
  setCurrentPage: (currentPageIndex) => set({ currentPageIndex }),
  addPageMeta: (page) => set((s) => ({ pages: [...s.pages, page] })),
  removePageMeta: (pageIndex) =>
    set((s) => ({
      pages: s.pages.filter((p) => p.pageIndex !== pageIndex),
      currentPageIndex: Math.max(0, s.currentPageIndex > pageIndex ? s.currentPageIndex - 1 : s.currentPageIndex),
    })),
  updatePageMeta: (pageIndex, updates) =>
    set((s) => ({
      pages: s.pages.map((p) => p.pageIndex === pageIndex ? { ...p, ...updates } : p),
    })),
  reorderPagesMeta: (ordered) => set({ pages: ordered }),
  setPageSummary: (pageIndex, summary) =>
    set((s) => ({ pageSummaries: { ...s.pageSummaries, [pageIndex]: summary } })),
  setPageSize: (pageSize) => set({ pageSize }),
  setPageOrientation: (pageOrientation) => set({ pageOrientation }),
  setAIPanelOpen: (isAIPanelOpen) => set({ isAIPanelOpen }),
  setFocusMode: (isFocusMode) => set({ isFocusMode }),
  setZoom: (zoom) => set({ zoom }),
  reset: () => set(initialState),
}));
