/* eslint-disable @typescript-eslint/no-explicit-any */
import { Point, Stroke, DrawableElement, CompressedStroke } from './types';

// Generate unique IDs
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Calculate bounding box for a stroke
export const calculateBounds = (points: Point[]) => {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
};

// Check if a point is inside a bounding box with padding
export const isPointInBounds = (
  point: Point,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  padding: number = 10
): boolean => {
  return (
    point.x >= bounds.minX - padding &&
    point.x <= bounds.maxX + padding &&
    point.y >= bounds.minY - padding &&
    point.y <= bounds.maxY + padding
  );
};

// Calculate distance from point to line segment
export const distanceToSegment = (
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number => {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    const dx2 = point.x - lineStart.x;
    const dy2 = point.y - lineStart.y;
    return Math.sqrt(dx2 * dx2 + dy2 * dy2);
  }

  let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;

  const distX = point.x - projX;
  const distY = point.y - projY;

  return Math.sqrt(distX * distX + distY * distY);
};

// Check if a point is near a stroke
export const isPointNearStroke = (
  point: Point,
  stroke: Stroke,
  threshold: number = 10
): boolean => {
  if (!stroke.bounds || !isPointInBounds(point, stroke.bounds, threshold)) {
    return false;
  }

  for (let i = 0; i < stroke.points.length - 1; i++) {
    const distance = distanceToSegment(point, stroke.points[i], stroke.points[i + 1]);
    if (distance <= threshold + stroke.width / 2) {
      return true;
    }
  }

  return false;
};

// Split a stroke at points where it intersects with eraser
export const splitStrokeByEraser = (
  stroke: Stroke,
  eraserPoints: Point[],
  eraserWidth: number
): Stroke[] => {
  if (stroke.points.length < 2 || eraserPoints.length < 2) {
    return [stroke];
  }

  const threshold = eraserWidth / 2 + stroke.width / 2;
  const newStrokes: Stroke[] = [];
  let currentSegment: Point[] = [];

  for (let i = 0; i < stroke.points.length; i++) {
    const point = stroke.points[i];
    let shouldErase = false;

    // Check if this point is near any eraser segment
    for (let j = 0; j < eraserPoints.length - 1; j++) {
      const distance = distanceToSegment(point, eraserPoints[j], eraserPoints[j + 1]);
      if (distance <= threshold) {
        shouldErase = true;
        break;
      }
    }

    if (!shouldErase) {
      currentSegment.push(point);
    } else {
      // End current segment if it has points
      if (currentSegment.length > 1) {
        newStrokes.push({
          ...stroke,
          id: `${stroke.id}_split_${newStrokes.length}`,
          points: [...currentSegment],
          bounds: calculateBounds(currentSegment),
          timestamp: Date.now(),
        });
      }
      currentSegment = [];
    }
  }

  // Add final segment if it exists
  if (currentSegment.length > 1) {
    newStrokes.push({
      ...stroke,
      id: `${stroke.id}_split_${newStrokes.length}`,
      points: [...currentSegment],
      bounds: calculateBounds(currentSegment),
      timestamp: Date.now(),
    });
  }

  return newStrokes.length > 0 ? newStrokes : [];
};

// Simplify stroke using Douglas-Peucker algorithm
export const simplifyStroke = (points: Point[], tolerance: number = 2): Point[] => {
  if (points.length <= 2) return points;

  const sqTolerance = tolerance * tolerance;

  const simplifyDouglasPeucker = (points: Point[], first: number, last: number, sqTolerance: number, simplified: Point[]) => {
    let maxSqDist = sqTolerance;
    let index = 0;

    for (let i = first + 1; i < last; i++) {
      const sqDist = getSquareSegmentDistance(points[i], points[first], points[last]);
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > sqTolerance) {
      if (index - first > 1) simplifyDouglasPeucker(points, first, index, sqTolerance, simplified);
      simplified.push(points[index]);
      if (last - index > 1) simplifyDouglasPeucker(points, index, last, sqTolerance, simplified);
    }
  };

  const getSquareSegmentDistance = (p: Point, p1: Point, p2: Point): number => {
    let x = p1.x;
    let y = p1.y;
    let dx = p2.x - x;
    let dy = p2.y - y;

    if (dx !== 0 || dy !== 0) {
      const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = p2.x;
        y = p2.y;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }

    dx = p.x - x;
    dy = p.y - y;
    return dx * dx + dy * dy;
  };

  const simplified = [points[0]];
  simplifyDouglasPeucker(points, 0, points.length - 1, sqTolerance, simplified);
  simplified.push(points[points.length - 1]);

  return simplified;
};

// Compress stroke for network transmission using delta encoding
export const compressStroke = (stroke: Stroke): CompressedStroke => {
  const deltas: number[] = [];
  
  if (stroke.points.length > 0) {
    // Store first point as absolute coordinates
    deltas.push(Math.round(stroke.points[0].x * 10) / 10);
    deltas.push(Math.round(stroke.points[0].y * 10) / 10);
    
    // Store subsequent points as deltas
    for (let i = 1; i < stroke.points.length; i++) {
      const dx = stroke.points[i].x - stroke.points[i - 1].x;
      const dy = stroke.points[i].y - stroke.points[i - 1].y;
      deltas.push(Math.round(dx * 10) / 10);
      deltas.push(Math.round(dy * 10) / 10);
    }
  }

  return {
    id: stroke.id,
    type: stroke.type,
    deltas,
    color: stroke.color,
    width: stroke.width,
    opacity: stroke.opacity,
    timestamp: stroke.timestamp,
  };
};

// Decompress stroke from delta encoding
export const decompressStroke = (compressed: CompressedStroke): Stroke => {
  const points: Point[] = [];
  
  if (compressed.deltas.length >= 2) {
    // First point is absolute
    points.push({
      x: compressed.deltas[0],
      y: compressed.deltas[1],
    });
    
    // Subsequent points are deltas
    for (let i = 2; i < compressed.deltas.length; i += 2) {
      const lastPoint = points[points.length - 1];
      points.push({
        x: lastPoint.x + compressed.deltas[i],
        y: lastPoint.y + compressed.deltas[i + 1],
      });
    }
  }

  return {
    id: compressed.id,
    type: compressed.type,
    points,
    color: compressed.color,
    width: compressed.width,
    opacity: compressed.opacity,
    timestamp: compressed.timestamp,
    bounds: calculateBounds(points),
  };
};

// Screen to canvas coordinate transformation
export const screenToCanvas = (
  screenX: number,
  screenY: number,
  viewport: { x: number; y: number; zoom: number }
): Point => {
  return {
    x: (screenX - viewport.x) / viewport.zoom,
    y: (screenY - viewport.y) / viewport.zoom,
  };
};

// Canvas to screen coordinate transformation
export const canvasToScreen = (
  canvasX: number,
  canvasY: number,
  viewport: { x: number; y: number; zoom: number }
): Point => {
  return {
    x: canvasX * viewport.zoom + viewport.x,
    y: canvasY * viewport.zoom + viewport.y,
  };
};

// Smooth a stroke using Catmull-Rom spline
export const smoothStroke = (points: Point[], tension: number = 0.5): Point[] => {
  if (points.length < 3) return points;

  const smoothed: Point[] = [points[0]];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const steps = 10;
    for (let t = 0; t < steps; t++) {
      const u = t / steps;
      const u2 = u * u;
      const u3 = u2 * u;

      const x =
        tension * (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3);
      const y =
        tension * (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3);

      smoothed.push({ x, y });
    }
  }

  smoothed.push(points[points.length - 1]);
  return smoothed;
};

// Debounce function for performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for performance
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};