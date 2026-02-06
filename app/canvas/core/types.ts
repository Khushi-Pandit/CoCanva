/* eslint-disable @typescript-eslint/no-explicit-any */
// Core data structures for the whiteboard system

export type Point = {
  x: number;
  y: number;
};

export type StrokeType = 'pen' | 'marker' | 'pencil' | 'brush' | 'eraser';

export type ShapeType = 
  | 'rectangle' 
  | 'circle' 
  | 'triangle' 
  | 'line' 
  | 'arrow'
  | 'diamond'
  | 'pentagon'
  | 'hexagon';

export type ToolMode = 'draw' | 'shape' | 'select' | 'pan' | 'text';

// Stroke data structure optimized for storage and transmission
export interface Stroke {
  id: string;
  type: StrokeType;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  timestamp: number;
  // Bounding box for efficient selection/collision detection
  bounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

// Shape data structure
export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fillColor?: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  timestamp: number;
}

// Text element
export interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  timestamp: number;
}

// Union type for all drawable elements
export type DrawableElement = Stroke | Shape | TextElement;

// Helper type guards
export const isStroke = (element: DrawableElement): element is Stroke => {
  return 'points' in element && Array.isArray((element as any).points);
};

export const isShape = (element: DrawableElement): element is Shape => {
  return 'type' in element && 'x' in element && 'width' in element && !('points' in element) && !('text' in element);
};

export const isTextElement = (element: DrawableElement): element is TextElement => {
  return 'text' in element && typeof (element as any).text === 'string';
};

// Viewport state for infinite canvas
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// History action for undo/redo
export interface HistoryAction {
  type: 'add' | 'delete' | 'modify';
  elements: DrawableElement[];
  timestamp: number;
}

// Export formats
export type ExportFormat = 'png' | 'jpg' | 'svg' | 'pdf' | 'json';

// Share permissions
export type SharePermission = 'view' | 'edit' | 'private';

// WebSocket message types for real-time collaboration
export interface WSMessage {
  type: 'stroke_add' | 'stroke_delete' | 'stroke_modify' | 'cursor_move' | 'viewport_change';
  userId: string;
  data: any;
  timestamp: number;
}

// Compressed stroke format for network transmission
export interface CompressedStroke {
  id: string;
  type: StrokeType;
  // Delta-encoded points for smaller payload
  deltas: number[];
  color: string;
  width: number;
  opacity: number;
  timestamp: number;
}

// Canvas state for persistence
export interface CanvasState {
  version: string;
  elements: DrawableElement[];
  viewport: Viewport;
  createdAt: number;
  updatedAt: number;
}