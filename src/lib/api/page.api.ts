import { get, post, put, del } from './client';

export interface PageMeta {
  _id: string;
  canvasId: string;
  pageIndex: number;
  label: string;
  summary: string;
  summaryUpdatedAt: string | null;
  elementCount: number;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

export const pageApi = {
  getAll: async (canvasId: string): Promise<PageMeta[]> => {
    const { pages } = await get<{ pages: PageMeta[] }>(`/canvases/${canvasId}/pages`);
    return pages;
  },

  add: async (canvasId: string): Promise<PageMeta> => {
    const { page } = await post<{ page: PageMeta }>(`/canvases/${canvasId}/pages`);
    return page;
  },

  /** Atomically create page 0 if it doesn't exist, or return the existing one.
   *  Safe to call concurrently — uses MongoDB upsert under the hood. */
  ensureFirst: async (canvasId: string): Promise<PageMeta> => {
    const { page } = await post<{ page: PageMeta }>(`/canvases/${canvasId}/pages/ensure-first`);
    return page;
  },

  rename: async (canvasId: string, pageIndex: number, label: string): Promise<PageMeta> => {
    const { page } = await put<{ page: PageMeta }>(
      `/canvases/${canvasId}/pages/${pageIndex}/label`,
      { label },
    );
    return page;
  },

  delete: async (canvasId: string, pageIndex: number): Promise<void> => {
    await del(`/canvases/${canvasId}/pages/${pageIndex}`);
  },

  reorder: async (canvasId: string, order: number[]): Promise<void> => {
    await put(`/canvases/${canvasId}/pages/reorder`, { order });
  },

  summarize: async (
    canvasId: string,
    pageIndex: number,
    textContent: string,
    pageLabel: string,
  ): Promise<string> => {
    const { summary } = await post<{ summary: string }>(
      `/canvases/${canvasId}/pages/${pageIndex}/summarize`,
      { textContent, pageLabel },
    );
    return summary;
  },

  ask: async (canvasId: string, question: string, pageSummaries: string[]): Promise<string> => {
    const { answer } = await post<{ answer: string }>(
      `/canvases/${canvasId}/pages/ask`,
      { question, pageSummaries },
    );
    return answer;
  },

  fullSummary: async (canvasId: string, title: string, pageSummaries: string[]): Promise<string> => {
    const { summary } = await post<{ summary: string }>(
      `/canvases/${canvasId}/pages/full-summary`,
      { title, pageSummaries },
    );
    return summary;
  },
};
