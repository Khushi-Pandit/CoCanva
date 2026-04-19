import { post, get, del, put } from './client';

export const aiApi = {
  /** GET /canvases/:id/ai/providers — which models are available */
  providers: (canvasId: string) =>
    get<{ available: string[] }>(`/canvases/${canvasId}/ai/providers`),

  /**
   * POST /canvases/:id/ai/agent — AI Agent endpoint.
   * Sends the full canvas elements so the AI can generate/modify shapes.
   * Returns { message, actions, modelUsed } where actions drives canvas mutations.
   */
  agentChat: (
    canvasId: string,
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    elements: unknown[],
    selectedElementIds: string[],
    model = 'auto',
    contextType: 'canvas' | 'notes' = 'canvas',
    pageIndex = 0,
  ) =>
    post<{ message: string; actions: unknown[]; modelUsed: string }>(
      `/canvases/${canvasId}/ai/agent`,
      { message, history, elements, selectedElementIds, model, contextType, pageIndex },
    ),

  /** POST /canvases/:id/ai/explain — explain a single element */
  explain: (canvasId: string, elementId: string, elements: unknown[]) =>
    post<{ elementId: string; explanation: string }>(
      `/canvases/${canvasId}/ai/explain`,
      { elementId, elements },
    ),

  /** POST /canvases/:id/ai/suggest-next — Tab ghost suggestion */
  suggestNext: (canvasId: string, lastElementId: string, elements: unknown[]) =>
    post<{ suggestion: unknown | null }>(
      `/canvases/${canvasId}/ai/suggest-next`,
      { lastElementId, elements },
    ),

  /** POST /canvases/:id/ai/chat — legacy plain chat */
  chat: (canvasId: string, message: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = [], model = 'auto') =>
    post<{ message: string; requestId: string; modelUsed?: string }>(`/canvases/${canvasId}/ai/chat`, { message, history, model }),

  /** POST /canvases/:id/ai/suggest  — ghost element suggestions */
  ghostSuggest: (canvasId: string, message: string) =>
    post<{ suggestions: unknown[]; reasoning: string }>(`/canvases/${canvasId}/ai/suggest`, { message }),

  /** POST /canvases/:id/ai/summarize */
  summarize: (canvasId: string) =>
    post<{ summary: string }>(`/canvases/${canvasId}/ai/summarize`),

  /** POST /canvases/:id/ai/summarize-notes-page */
  summarizeNotesPage: (canvasId: string, imageData: string, pageIndex: number) =>
    post<{ summary: string }>(`/canvases/${canvasId}/ai/summarize-notes-page`, { imageData, pageIndex }),

  /** POST /canvases/:id/ai/layout */
  autoLayout: (canvasId: string, algorithm?: string, elementIds?: string[]) =>
    post<{ updates: unknown[]; count: number }>(`/canvases/${canvasId}/ai/layout`, { algorithm, elementIds }),

  /** POST /canvases/:id/ai/code-to-diagram */
  codeToDiagram: (canvasId: string, code: string, language: string, diagramType?: string) =>
    post<{ elements: unknown[]; mermaid?: string }>(`/canvases/${canvasId}/ai/code-to-diagram`, { code, language, diagramType }),

  /** POST /canvases/:id/ai/diagram-to-code */
  diagramToCode: (canvasId: string, language: string, elementIds?: string[]) =>
    post<{ code: string; language: string }>(`/canvases/${canvasId}/ai/diagram-to-code`, { language, elementIds }),

  /** POST /canvases/:id/ai/accept-ghost */
  acceptGhosts: (canvasId: string, elementIds: string[]) =>
    post<{ count: number; message: string }>(`/canvases/${canvasId}/ai/accept-ghost`, { elementIds }),

  /** DELETE /canvases/:id/ai/ghosts */
  dismissGhosts: (canvasId: string) =>
    del<{ message: string }>(`/canvases/${canvasId}/ai/ghosts`),
};

/** Thumbnail upload — separate from aiApi for clarity */
export const thumbnailApi = {
  upload: (canvasId: string, data: string) =>
    put<{ url: string }>(`/canvases/${canvasId}/thumbnail`, { data }),
};
