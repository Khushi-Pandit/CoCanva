/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: app/canvas/core/types.ts

export type Point = { x: number; y: number };

export type StrokeType = 'pen' | 'marker' | 'pencil' | 'brush' | 'eraser';

export type ShapeType =
  | 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow' | 'diamond'
  | 'pentagon' | 'hexagon';

// ── Flowchart shape types ─────────────────────────────────────────────────────
export type FlowchartShapeType =
  | 'rectangle'     // Process box
  | 'diamond'       // Decision / condition
  | 'rounded_rect'  // Start / End (terminal)
  | 'parallelogram' // Input / Output
  | 'cylinder'      // Database
  | 'connector'     // Arrow connector between shapes
  | 'hexagon'       // Preparation step
  | 'circle';       // Connector / junction

export type ToolMode = 'draw' | 'shape' | 'flowchart' | 'select' | 'pan' | 'text' | 'connector';

export interface Stroke {
  id: string;
  elementId?: string; // for DB sync
  kind?: 'stroke';
  type: StrokeType;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  timestamp: number;
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
  createdBy?: string; // userId — for per-user undo
}

export interface Shape {
  id: string;
  elementId?: string;
  kind?: 'shape';
  type: ShapeType;
  x: number; y: number;
  width: number; height: number;
  color: string;
  fillColor?: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  timestamp: number;
  createdBy?: string;
}

// ── Flowchart element ─────────────────────────────────────────────────────────
export interface FlowchartElement {
  id: string;
  elementId?: string;
  kind?: 'flowchart';
  shapeType: FlowchartShapeType;
  x: number; y: number;
  width: number; height: number;
  label: string;
  color: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  fontSize: number;
  fontFamily: string;
  timestamp: number;
  fromId?: string;
  toId?: string;
  points?: Point[];
  dashed?: boolean;
  arrowEnd?: boolean;
  createdBy?: string;
  isEditing?: boolean;
}

// ── Ghost suggestion (Task 3) ─────────────────────────────────────────────────
export interface GhostSuggestion {
  type: 'shape_complete' | 'next_shape' | 'connector';
  shapeType: FlowchartShapeType;
  x: number; y: number;
  width: number; height: number;
  label?: string;
  connectorFrom?: string;
  opacity: number;
  triggerSource?: 'drawing' | 'typing';
  promptText?: string; // what user typed to trigger this
}

export interface TextElement {
  id: string;
  elementId?: string;
  kind?: 'text';
  x: number; y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  timestamp: number;
  createdBy?: string;
}

export type DrawableElement = Stroke | Shape | FlowchartElement | TextElement;

// ── Type guards ───────────────────────────────────────────────────────────────
export const isStroke = (el: DrawableElement): el is Stroke =>
  'points' in el && Array.isArray((el as any).points) && !('shapeType' in el);

export const isShape = (el: DrawableElement): el is Shape =>
  'type' in el && 'x' in el && 'width' in el && !('points' in el) && !('text' in el) && !('shapeType' in el);

export const isFlowchart = (el: DrawableElement): el is FlowchartElement =>
  'shapeType' in el;

export const isTextElement = (el: DrawableElement): el is TextElement =>
  'text' in el && typeof (el as any).text === 'string' && !('shapeType' in el);

export interface Viewport { x: number; y: number; zoom: number }

export interface HistoryAction {
  type: 'add' | 'delete' | 'modify';
  elements: DrawableElement[];
  timestamp: number;
  userId?: string; // track who did this action
}

export type ExportFormat = 'png' | 'jpg' | 'svg' | 'pdf' | 'json';
export type SharePermission = 'view' | 'edit' | 'private';

export interface WSMessage {
  type: 'stroke_add' | 'stroke_delete' | 'stroke_modify' | 'cursor_move' | 'viewport_change';
  userId: string;
  data: any;
  timestamp: number;
}

export interface CompressedStroke {
  id: string; type: StrokeType; deltas: number[];
  color: string; width: number; opacity: number; timestamp: number;
}

export interface CanvasState {
  version: string;
  elements: DrawableElement[];
  viewport: Viewport;
  createdAt: number;
  updatedAt: number;
}

// ── Freehand shape recognition results ───────────────────────────────────────
export type RecognizedShapeType = 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow' | 'diamond' | null;
export interface RecognitionResult {
  shape: RecognizedShapeType;
  confidence: number;
  bounds: { x: number; y: number; width: number; height: number };
}

// ── AI Mode (per-user local state) ────────────────────────────────────────────
export interface AIState {
  enabled: boolean;         // user toggled AI ON/OFF
  ghostEnabled: boolean;    // ghost suggestions visible
  summaryLoading: boolean;
  summary: string | null;
}

// ── Flowchart ghost keyword map ────────────────────────────────────────────────
export const FLOWCHART_KEYWORDS: Record<string, FlowchartShapeType> = {
  // process / box
  'process': 'rectangle', 'box': 'rectangle', 'step': 'rectangle', 'task': 'rectangle',
  'action': 'rectangle', 'operation': 'rectangle',
  // decision / diamond
  'decision': 'diamond', 'if': 'diamond', 'condition': 'diamond', 'check': 'diamond',
  'branch': 'diamond', 'choice': 'diamond', 'yes': 'diamond', 'no': 'diamond',
  // start/end
  'start': 'rounded_rect', 'end': 'rounded_rect', 'begin': 'rounded_rect',
  'terminal': 'rounded_rect', 'stop': 'rounded_rect', 'finish': 'rounded_rect',
  // input/output
  'input': 'parallelogram', 'output': 'parallelogram', 'data': 'parallelogram',
  'io': 'parallelogram', 'read': 'parallelogram', 'write': 'parallelogram',
  // database
  'database': 'cylinder', 'db': 'cylinder', 'storage': 'cylinder', 'store': 'cylinder',
  // connector
  'arrow': 'connector', 'connect': 'connector', 'flow': 'connector', 'line': 'connector',
};

// Default sizes for each flowchart shape
export const FLOWCHART_DEFAULTS: Record<FlowchartShapeType, { width: number; height: number; fillColor: string; color: string }> = {
  rectangle:    { width: 160, height: 60,  fillColor: '#dbeafe', color: '#2563eb' },
  diamond:      { width: 140, height: 100, fillColor: '#fef3c7', color: '#d97706' },
  rounded_rect: { width: 160, height: 60,  fillColor: '#d1fae5', color: '#059669' },
  parallelogram:{ width: 160, height: 60,  fillColor: '#ede9fe', color: '#7c3aed' },
  cylinder:     { width: 120, height: 80,  fillColor: '#fee2e2', color: '#dc2626' },
  hexagon:      { width: 140, height: 80,  fillColor: '#fce7f3', color: '#db2777' },
  circle:       { width: 80,  height: 80,  fillColor: '#f0fdf4', color: '#16a34a' },
  connector:    { width: 120, height: 0,   fillColor: 'transparent', color: '#6b7280' },
};