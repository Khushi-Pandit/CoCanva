import { CanvasRole } from './canvas';
import { DrawableElement } from './element';

// ── Peer presence ──────────────────────────────────────────────────────────────
export interface PeerState {
  socketId: string;
  userId: string;
  userName: string;
  userColor: string;
  role: CanvasRole;
  cursor: { x: number; y: number } | null;
  selectedIds: string[];
  viewport: { x: number; y: number; zoom: number } | null;
}

export interface VoicePeer extends PeerState {
  isMuted: boolean;
  viewportCenter: { x: number; y: number } | null;
}

// ── Element lock ───────────────────────────────────────────────────────────────
export interface ElementLock {
  elementId: string;
  userId: string;
  userName: string;
  socketId: string;
}

// ── Socket event payloads ──────────────────────────────────────────────────────
export interface CanvasJoinPayload {
  canvasId: string;
  shareToken?: string;
}

export interface CanvasJoinedPayload {
  canvasId: string;
  title: string;
  role: CanvasRole;
  lastViewport?: { x: number; y: number; zoom: number };
  settings?: Record<string, boolean>;
}

export interface CanvasStatePayload {
  elements: DrawableElement[];
  canvasId: string;
  snapshotSeq: number;
}

export interface ElementAddedPayload {
  element: unknown;
  userId: string;
  socketId: string;
}

export interface ElementUpdatedPayload {
  element: unknown;
  userId: string;
  socketId: string;
}

export interface ElementDeletedPayload {
  elementIds: string[];
  userId: string;
}

export interface CursorMovedPayload {
  userId: string;
  socketId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
}

export interface StrokePreviewPayload {
  userId: string;
  socketId: string;
  points: Array<{ x: number; y: number }>;
  style: Record<string, unknown>;
}

export interface AIStreamPayload {
  requestId: string;
  canvasId: string;
  chunk: string;
  done: boolean;
  elements?: unknown[];
}

export interface GhostAddedPayload {
  elements: unknown[];
  confidence: number;
  reasoning: string;
  requestId: string;
}

export interface AIRequestPayload {
  requestId: string;
  canvasId: string;
  type: 'chat' | 'ghost_suggest' | 'summarize' | 'layout' | 'code_to_diagram' | 'diagram_to_code';
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: string;
}
