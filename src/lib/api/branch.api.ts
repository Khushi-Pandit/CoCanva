import { get, post } from './client';

export interface Branch {
  _id: string;
  canvasId: string;
  name: string;
  description?: string;
  createdBy: { _id: string; fullName: string };
  createdAt: string;
  eventCount: number;
  merged: boolean;
}

export interface BranchEvent {
  _id: string;
  type: string;
  payload: unknown;
  userId: string;
  seqNo: number;
  createdAt: string;
}

export const branchApi = {
  /** GET /canvases/:id/branches */
  list: (canvasId: string) =>
    get<{ branches: Branch[] }>(`/canvases/${canvasId}/branches`),

  /** POST /canvases/:id/branches */
  create: (canvasId: string, body: { name: string; description?: string }) =>
    post<{ branch: Branch }>(`/canvases/${canvasId}/branches`, body),

  /** GET /canvases/:id/branches/:bId/events */
  getEvents: (canvasId: string, bId: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page)  qs.set('page',  String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return get<{ events: BranchEvent[]; total: number }>(`/canvases/${canvasId}/branches/${bId}/events?${qs}`);
  },

  /** GET /canvases/:id/branches/:bId/snapshot/:seqNo */
  getSnapshot: (canvasId: string, bId: string, seqNo: number) =>
    get<{ elements: unknown[]; seqNo: number }>(`/canvases/${canvasId}/branches/${bId}/snapshot/${seqNo}`),

  /** POST /canvases/:id/branches/:bId/merge */
  merge: (canvasId: string, bId: string) =>
    post<{ message: string; merged: Branch }>(`/canvases/${canvasId}/branches/${bId}/merge`),
};
