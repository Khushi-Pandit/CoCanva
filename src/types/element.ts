// ── Element Types ─────────────────────────────────────────────────────────────

export type ElementKind = 'stroke' | 'shape' | 'flowchart' | 'text' | 'connector' | 'image';
export type StrokeType = 'pen' | 'pencil' | 'marker' | 'brush' | 'eraser';
export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'line' | 'arrow' | 'star';
export type FlowchartShapeType = 'rectangle' | 'diamond' | 'rounded_rect' | 'parallelogram' | 'cylinder' | 'hexagon' | 'oval' | 'cloud' | 'cross' | 'connector';
export type ConnectorMode = 'straight' | 'polyline';
export type ArrowHeadStyle = 'triangle' | 'open' | 'dot' | 'diamond' | 'none';

export interface Point {
  x: number;
  y: number;
}

export interface ElementBase {
  id: string;
  elementId: string;
  kind: ElementKind;
  createdBy?: string;
  timestamp: number;
  isGhostSuggestion?: boolean;
  aiConfidence?: number;
  borderRadius?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
}

export interface Stroke extends ElementBase {
  kind: 'stroke';
  type: StrokeType;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface Shape extends ElementBase {
  kind: 'shape';
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
}

export interface Connector extends ElementBase {
  kind: 'connector';
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  mode?: ConnectorMode;
  borderRadius?: number;
  dashed?: boolean;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  arrowHeadStyle?: ArrowHeadStyle;
  arrowTailStyle?: ArrowHeadStyle;
  fromId?: string;
  toId?: string;
}

export interface FlowchartElement extends ElementBase {
  kind: 'flowchart';
  shapeType: FlowchartShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  fontSize: number;
  fontFamily: string;
  // For connectors (backward compatibility / multi-purpose)
  fromId?: string;
  toId?: string;
  points?: Point[];
  dashed?: boolean;
  arrowEnd?: boolean;
}

export interface TextElement extends ElementBase {
  kind: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  opacity?: number;
  rotation?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
}

export type DrawableElement = Stroke | Shape | FlowchartElement | TextElement | Connector;

export type ToolMode = 'select' | 'draw' | 'shape' | 'flowchart' | 'text' | 'pan' | 'eraser' | 'connector';

export const FLOWCHART_DEFAULTS: Record<FlowchartShapeType, { width: number; height: number; color: string; fillColor: string }> = {
  rectangle:    { width: 160, height: 56, color: '#2563eb', fillColor: '#dbeafe' },
  diamond:      { width: 120, height: 80, color: '#d97706', fillColor: '#fef3c7' },
  rounded_rect: { width: 160, height: 56, color: '#059669', fillColor: '#d1fae5' },
  parallelogram:{ width: 160, height: 56, color: '#7c3aed', fillColor: '#ede9fe' },
  cylinder:     { width: 120, height: 80, color: '#0891b2', fillColor: '#cffafe' },
  hexagon:      { width: 120, height: 80, color: '#be185d', fillColor: '#fce7f3' },
  oval:         { width: 120, height: 80, color: '#16a34a', fillColor: '#dcfce7' },
  cloud:        { width: 160, height: 100, color: '#4f46e5', fillColor: '#e0e7ff' },
  cross:        { width: 100, height: 100, color: '#dc2626', fillColor: '#fee2e2' },
  connector:    { width: 0,   height: 0,  color: '#6b7280', fillColor: 'transparent' },
};

// Type guards
export const isStroke        = (el: DrawableElement): el is Stroke          => el.kind === 'stroke';
export const isShape         = (el: DrawableElement): el is Shape           => el.kind === 'shape';
export const isFlowchart     = (el: DrawableElement): el is FlowchartElement=> el.kind === 'flowchart';
export const isTextElement   = (el: DrawableElement): el is TextElement     => el.kind === 'text';
export const isConnector     = (el: DrawableElement): el is Connector       => el.kind === 'connector';

// ── API element format (what backend returns) ──────────────────────────────────
export type APIElementType = 'stroke' | 'shape' | 'connector' | 'text' | 'image';
