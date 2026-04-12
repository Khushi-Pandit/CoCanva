import { get, post, put, del } from './client';

// Backend model uses 'text' and 'author' (populated), NOT 'content'/'createdBy'
export interface Annotation {
  _id: string;
  canvasId: string;
  attachedToElementId?: string | null;
  region?: { x: number; y: number; width: number; height: number } | null;
  parentId?: string | null;
  text: string;                             // backend field name
  resolved: boolean;                        // derived: resolvedAt !== null
  resolvedAt?: string | null;
  author: { _id: string; fullName: string; avatarUrl?: string };  // backend populates 'author'
  reactions: Array<{ emoji: string; users: string[] }>;
  attachments: Array<{ url: string; type: string; name: string }>;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export const annotationApi = {
  /** GET /canvases/:id/annotations */
  list: (canvasId: string) =>
    get<{ annotations: Annotation[] }>(`/canvases/${canvasId}/annotations`),

  /** POST /canvases/:id/annotations — backend expects 'text', not 'content' */
  create: (canvasId: string, body: {
    text: string;
    region?: { x: number; y: number; width: number; height: number } | null;
    attachedToElementId?: string;
    parentId?: string;
  }) => post<{ annotation: Annotation }>(`/canvases/${canvasId}/annotations`, body),

  /** PUT /canvases/:id/annotations/:aId */
  update: (canvasId: string, aId: string, body: { text?: string }) =>
    put<{ annotation: Annotation }>(`/canvases/${canvasId}/annotations/${aId}`, body),

  /** DELETE /canvases/:id/annotations/:aId */
  remove: (canvasId: string, aId: string) =>
    del<{ message: string }>(`/canvases/${canvasId}/annotations/${aId}`),

  /** POST /canvases/:id/annotations/:aId/resolve */
  resolve: (canvasId: string, aId: string) =>
    post<{ annotation: Annotation }>(`/canvases/${canvasId}/annotations/${aId}/resolve`),

  /** POST /canvases/:id/annotations/:aId/react — backend toggles per-user */
  react: (canvasId: string, aId: string, emoji: string) =>
    post<{ reactions: Annotation['reactions'] }>(`/canvases/${canvasId}/annotations/${aId}/react`, { emoji }),
};
