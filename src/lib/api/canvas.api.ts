import { get, post, put, del } from './client';
import { Canvas, CanvasRole } from '@/types/canvas';

interface CanvasListResponse { canvases: Canvas[]; total: number; page: number; limit: number; }
interface CanvasResponse     { canvas: Canvas }

export const canvasApi = {
  // ── List variants ──────────────────────────────────────────────────────────

  /** GET /users/me/canvases — own canvases */
  list: (params?: { page?: number; limit?: number; q?: string; category?: string; sort?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page)     qs.set('page',     String(params.page));
    if (params?.limit)    qs.set('limit',    String(params.limit));
    if (params?.q)        qs.set('search',   params.q);         // backend uses 'search' not 'q'
    if (params?.category) qs.set('category', params.category);
    if (params?.sort)     qs.set('sort',     params.sort);
    return get<CanvasListResponse>(`/users/me/canvases?${qs}`);
  },

  /** GET /users/me/shared — canvases shared with me */
  listShared: (params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page)  qs.set('page',  String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return get<CanvasListResponse>(`/users/me/shared?${qs}`);
  },

  /** GET /users/me/canvases?sort=updatedAt — most recently edited */
  listRecent: (params?: { limit?: number }) => {
    const qs = new URLSearchParams({ sort: '-updatedAt', limit: String(params?.limit ?? 20) });
    return get<CanvasListResponse>(`/users/me/canvases?${qs}`);
  },

  /** GET /canvases/public — public explore feed */
  listPublic: (params?: { page?: number; limit?: number; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page)     qs.set('page',     String(params.page));
    if (params?.limit)    qs.set('limit',    String(params.limit));
    if (params?.category) qs.set('category', params.category);
    return get<CanvasListResponse>(`/canvases/public?${qs}`);
  },

  // ── CRUD ──────────────────────────────────────────────────────────────────

  /** POST /canvases */
  create: (body: {
    title?: string;
    description?: string;
    isPublic?: boolean;
    category?: 'flowchart' | 'architecture' | 'brainstorm' | 'wireframe' | 'erd' | 'other';
    templateId?: string;
    canvasType?: 'drawing' | 'notes' | 'diagram';
    pageSize?: 'a4' | 'letter' | 'a3' | 'a5' | 'custom';
    pageOrientation?: 'portrait' | 'landscape';
  }) => post<CanvasResponse>('/canvases', body),

  /** GET /canvases/:id */
  get: (id: string, shareToken?: string) => {
    const qs = shareToken ? `?shareToken=${encodeURIComponent(shareToken)}` : '';
    return get<CanvasResponse>(`/canvases/${id}${qs}`);
  },

  /** PUT /canvases/:id */
  update: (id: string, body: Partial<{
    title: string;
    description: string;
    isPublic: boolean;
    category: string;
    tags: string[];
    settings: Record<string, unknown>;
  }>) => put<CanvasResponse>(`/canvases/${id}`, body),

  /** DELETE /canvases/:id — soft delete (moves to trash) */
  delete: (id: string) => del<{ message: string }>(`/canvases/${id}`),

  /** POST /canvases/:id/restore — restore from trash */
  restore: (id: string) => post<CanvasResponse>(`/canvases/${id}/restore`),

  /** POST /canvases/:id/archive */
  archive: (id: string) => post<{ message: string }>(`/canvases/${id}/archive`),

  /** POST /canvases/:id/duplicate */
  duplicate: (id: string, title?: string) =>
    post<CanvasResponse>(`/canvases/${id}/duplicate`, { title }),

  // ── Share tokens ──────────────────────────────────────────────────────────

  /** POST /canvases/:id/share */
  createShareToken: (id: string, body: {
    role: CanvasRole;
    label?: string;
    maxUses?: number;
    expiresIn?: number;
  }) => post<{ token: string; shareUrl: string }>(`/canvases/${id}/share`, body),

  /** DELETE /canvases/:id/share/:token */
  revokeShareToken: (id: string, token: string) =>
    del<{ message: string }>(`/canvases/${id}/share/${token}`),

  /** GET /canvases/join/:token */
  resolveShareToken: (token: string) =>
    get<{ canvasId: string; title: string; role: CanvasRole; expiresAt: string | null }>(`/canvases/join/${token}`),

  // ── Collaborators ─────────────────────────────────────────────────────────

  /** GET /canvases/:id/collaborators */
  listCollaborators: (id: string) =>
    get<{ collaborators: Array<{
      user: { _id: string; fullName: string; email: string; avatarUrl?: string };
      role: CanvasRole;
      joinedAt: string;
    }> }>(`/canvases/${id}/collaborators`),

  /** POST /canvases/:id/collaborators */
  addCollaborator: (id: string, body: { email?: string; userId?: string; role: CanvasRole; message?: string }) =>
    post<{ message: string; userId: string }>(`/canvases/${id}/collaborators`, body),

  /** PUT /canvases/:id/collaborators/:uid */
  updateCollaboratorRole: (id: string, uid: string, role: CanvasRole) =>
    put<{ message: string }>(`/canvases/${id}/collaborators/${uid}`, { role }),

  /** DELETE /canvases/:id/collaborators/:uid */
  removeCollaborator: (id: string, uid: string) =>
    del<{ message: string }>(`/canvases/${id}/collaborators/${uid}`),

  /** POST /canvases/:id/leave — self-leave as collaborator */
  leave: (id: string) => post<{ message: string }>(`/canvases/${id}/leave`),  // ✅ POST not DELETE
};
