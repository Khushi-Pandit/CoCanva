/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: app/canvas/core/utils.ts

import { Point } from './types';

// Screen → canvas coordinates
export function screenToCanvas(
  sx: number, sy: number,
  vp: { x: number; y: number; zoom: number },
): Point {
  return {
    x: (sx - vp.x) / vp.zoom,
    y: (sy - vp.y) / vp.zoom,
  };
}

// Canvas → screen coordinates
export function canvasToScreen(
  cx: number, cy: number,
  vp: { x: number; y: number; zoom: number },
): Point {
  return {
    x: cx * vp.zoom + vp.x,
    y: cy * vp.zoom + vp.y,
  };
}

// Bounding box for a list of points
export function calculateBounds(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

// Unique ID generator
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Throttle — returns a function that calls fn at most once per `ms`
export function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  }) as T;
}

// Clamp a value between min and max
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

// Distance between two points
export function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Check if a point is within radius of another
export function isNear(a: Point, b: Point, radius: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= radius;
}

// Midpoint of two points
export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Simplify a stroke path (reduce points while keeping shape)
export function simplifyPoints(points: Point[], tolerance = 1.5): Point[] {
  if (points.length <= 2) return points;
  const result: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    if (dist(prev, points[i]) >= tolerance) result.push(points[i]);
  }
  result.push(points[points.length - 1]);
  return result;
}

// Format a timestamp as "Saved 2 min ago" etc.
export function formatSavedTime(ts: number | null): string {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5)  return 'Saved just now';
  if (diff < 60) return `Saved ${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `Saved ${m}m ago`;
  return `Saved ${Math.floor(m / 60)}h ago`;
}