import { get } from './client';
import { Canvas } from '@/types/canvas';

export interface SearchElementResult {
  elementId: string;
  canvasId: string;
  canvasTitle: string;
  type: string;
  text?: string;
  snippet?: string;
}

export const searchApi = {
  /** GET /search/canvases?q=&category=&page=&limit= */
  canvases: (params: { q: string; category?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams({ q: params.q });
    if (params.category) qs.set('category', params.category);
    if (params.page)     qs.set('page',     String(params.page));
    if (params.limit)    qs.set('limit',    String(params.limit));
    return get<{ canvases: Canvas[]; total: number }>(`/search/canvases?${qs}`);
  },

  /** GET /search/elements?q=&canvasId=&page=&limit= */
  elements: (params: { q: string; canvasId?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams({ q: params.q });
    if (params.canvasId) qs.set('canvasId', params.canvasId);
    if (params.page)     qs.set('page',     String(params.page));
    if (params.limit)    qs.set('limit',    String(params.limit));
    return get<{ results: SearchElementResult[]; total: number }>(`/search/elements?${qs}`);
  },
};
