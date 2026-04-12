import { get, post, put, del } from './client';

export const elementApi = {
  /** GET /canvases/:id/elements */
  getAll: (canvasId: string, shareToken?: string) =>
    get<{ elements: unknown[] }>(`/canvases/${canvasId}/elements`, shareToken ? { shareToken } : undefined),

  /** POST /canvases/:id/elements/save  — bulk upsert + delete */
  bulkSave: (canvasId: string, elements: unknown[], deletedIds: string[], viewport?: unknown) =>
    post<{ savedCount: number; deletedCount: number; savedAt: string }>(
      `/canvases/${canvasId}/elements/save`,
      { elements, deletedIds, viewport },
    ),

  /** POST /canvases/:id/elements/import — mermaid / plantuml */
  import: (canvasId: string, format: 'mermaid' | 'plantuml', data: string) =>
    post<{ elements: unknown[] }>(`/canvases/${canvasId}/elements/import`, { format, data }),

  /** GET /canvases/:id/elements/export */
  export: (canvasId: string, format: 'mermaid' | 'plantuml' | 'json' = 'json') =>
    get<unknown>(`/canvases/${canvasId}/elements/export?format=${format}`),

  /** POST /canvases/:id/thumbnail — multipart or base64 */
  uploadThumbnailBase64: (canvasId: string, dataUrl: string) =>
    post<{ url: string }>(`/canvases/${canvasId}/thumbnail`, { dataUrl }),

  /** POST /assets/upload — returns presigned URL */
  getPresignedUpload: (filename: string, contentType: string, canvasId: string) =>
    post<{ uploadUrl: string; publicUrl: string; key: string }>('/assets/upload', {
      filename, contentType, canvasId,
    }),

  /** DELETE /assets/:assetId */
  deleteAsset: (assetId: string) =>
    del<{ message: string }>(`/assets/${encodeURIComponent(assetId)}`),
};
