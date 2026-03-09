/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: app/canvas/core/export.ts
// FIXED: added exportCanvas wrapper that page.tsx calls

import { CanvasState, ExportFormat, Stroke, Shape, DrawableElement } from './types';

// ── PNG ───────────────────────────────────────────────────────────────────────
export const exportToPNG = (canvas: HTMLCanvasElement, filename: string = 'whiteboard.png') => {
  canvas.toBlob((blob) => {
    if (blob) {
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
};

// ── JPG ───────────────────────────────────────────────────────────────────────
export const exportToJPG = (canvas: HTMLCanvasElement, filename: string = 'whiteboard.jpg') => {
  canvas.toBlob((blob) => {
    if (blob) {
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, 'image/jpeg', 0.95);
};

// ── PDF ───────────────────────────────────────────────────────────────────────
export const exportToPDF = async (canvas: HTMLCanvasElement, filename: string = 'whiteboard.pdf') => {
  try {
    // Dynamic import so jsPDF only loads when needed
    const { default: jsPDF } = await import('jspdf');
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(filename);
  } catch (err) {
    console.warn('[Export] jsPDF not available, falling back to PNG download:', err);
    exportToPNG(canvas, filename.replace('.pdf', '.png'));
  }
};

// ── SVG ───────────────────────────────────────────────────────────────────────
export const exportToSVG = (
  elements: DrawableElement[],
  viewport: { x: number; y: number; zoom: number },
  filename: string = 'whiteboard.svg'
) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  elements.forEach((el) => {
    if ('points' in el && Array.isArray((el as any).points)) {
      (el as any).points.forEach((p: { x: number; y: number }) => {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      });
    } else if ('x' in el && 'y' in el) {
      const e = el as any;
      minX = Math.min(minX, e.x);
      minY = Math.min(minY, e.y);
      maxX = Math.max(maxX, e.x + (e.width  || 200));
      maxY = Math.max(maxY, e.y + (e.height || (e.fontSize || 24)));
    }
  });

  // Fallback for empty canvas
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }

  const padding = 20;
  const w = maxX - minX + padding * 2;
  const h = maxY - minY + padding * 2;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="white"/>
`;

  elements.forEach((el) => {
    const e = el as any;

    // Stroke
    if (e.points && Array.isArray(e.points) && e.points.length > 0 && !e.shapeType) {
      const pts = e.points.map((p: any) => `${p.x - minX + padding},${p.y - minY + padding}`).join(' ');
      svg += `  <polyline points="${pts}" stroke="${e.color}" stroke-width="${e.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${e.opacity ?? 1}"/>\n`;
      return;
    }

    // Flowchart shapes
    if (e.shapeType) {
      const x = e.x - minX + padding, y = e.y - minY + padding;
      const fill   = e.fillColor || 'none';
      const stroke = e.color || '#2563eb';
      const sw     = e.strokeWidth || 2;
      const op     = e.opacity ?? 1;

      switch (e.shapeType) {
        case 'rectangle':
          svg += `  <rect x="${x}" y="${y}" width="${e.width}" height="${e.height}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" opacity="${op}"/>\n`;
          break;
        case 'rounded_rect': {
          const r = Math.min(e.height / 2, 20);
          svg += `  <rect x="${x}" y="${y}" width="${e.width}" height="${e.height}" rx="${r}" ry="${r}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" opacity="${op}"/>\n`;
          break;
        }
        case 'diamond': {
          const mx = x + e.width / 2, my = y + e.height / 2;
          svg += `  <polygon points="${mx},${y} ${x + e.width},${my} ${mx},${y + e.height} ${x},${my}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" opacity="${op}"/>\n`;
          break;
        }
        case 'circle':
          svg += `  <ellipse cx="${x + e.width / 2}" cy="${y + e.height / 2}" rx="${e.width / 2}" ry="${e.height / 2}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" opacity="${op}"/>\n`;
          break;
        case 'parallelogram': {
          const off = e.width * 0.15;
          svg += `  <polygon points="${x + off},${y} ${x + e.width},${y} ${x + e.width - off},${y + e.height} ${x},${y + e.height}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" opacity="${op}"/>\n`;
          break;
        }
        case 'hexagon': {
          const side = e.width * 0.2;
          const mx2  = x + e.width / 2;
          svg += `  <polygon points="${x + side},${y} ${x + e.width - side},${y} ${x + e.width},${y + e.height / 2} ${x + e.width - side},${y + e.height} ${x + side},${y + e.height} ${x},${y + e.height / 2}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" opacity="${op}"/>\n`;
          break;
        }
        default:
          svg += `  <rect x="${x}" y="${y}" width="${e.width}" height="${e.height}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" opacity="${op}"/>\n`;
      }

      // Label inside shape
      if (e.label) {
        svg += `  <text x="${x + e.width / 2}" y="${y + e.height / 2 + (e.fontSize || 13) / 3}" text-anchor="middle" font-family="${e.fontFamily || 'Inter, sans-serif'}" font-size="${e.fontSize || 13}" fill="${stroke}">${e.label}</text>\n`;
      }
      return;
    }

    // Basic shapes
    if ('type' in e && 'x' in e && 'width' in e && !('text' in e)) {
      const x  = e.x - minX + padding, y = e.y - minY + padding;
      const op = e.opacity ?? 1;
      const sw = e.strokeWidth || 2;

      switch (e.type) {
        case 'rectangle':
          svg += `  <rect x="${x}" y="${y}" width="${e.width}" height="${e.height}" stroke="${e.color}" stroke-width="${sw}" fill="${e.fillColor || 'none'}" opacity="${op}"/>\n`;
          break;
        case 'circle':
          svg += `  <ellipse cx="${x + e.width / 2}" cy="${y + e.height / 2}" rx="${e.width / 2}" ry="${e.height / 2}" stroke="${e.color}" stroke-width="${sw}" fill="${e.fillColor || 'none'}" opacity="${op}"/>\n`;
          break;
        case 'triangle': {
          const mx = x + e.width / 2;
          svg += `  <polygon points="${mx},${y} ${x + e.width},${y + e.height} ${x},${y + e.height}" stroke="${e.color}" stroke-width="${sw}" fill="${e.fillColor || 'none'}" opacity="${op}"/>\n`;
          break;
        }
        case 'diamond': {
          const mx = x + e.width / 2, my = y + e.height / 2;
          svg += `  <polygon points="${mx},${y} ${x + e.width},${my} ${mx},${y + e.height} ${x},${my}" stroke="${e.color}" stroke-width="${sw}" fill="${e.fillColor || 'none'}" opacity="${op}"/>\n`;
          break;
        }
        case 'line':
          svg += `  <line x1="${x}" y1="${y + e.height / 2}" x2="${x + e.width}" y2="${y + e.height / 2}" stroke="${e.color}" stroke-width="${sw}" opacity="${op}"/>\n`;
          break;
        case 'arrow': {
          const ay = y + e.height / 2;
          svg += `  <line x1="${x}" y1="${ay}" x2="${x + e.width}" y2="${ay}" stroke="${e.color}" stroke-width="${sw}" opacity="${op}" marker-end="url(#arrowhead)"/>\n`;
          break;
        }
      }
      return;
    }

    // Text element
    if ('text' in e && typeof e.text === 'string' && !e.shapeType) {
      const tx = e.x - minX + padding;
      const ty = e.y - minY + padding;
      const lines = e.text.split('\n');
      lines.forEach((line: string, idx: number) => {
        svg += `  <text x="${tx}" y="${ty + idx * (e.fontSize || 16) * 1.2 + (e.fontSize || 16)}" font-family="${e.fontFamily || 'Inter, sans-serif'}" font-size="${e.fontSize || 16}" fill="${e.color || '#111827'}">${line}</text>\n`;
      });
    }
  });

  svg += `  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280"/>
    </marker>
  </defs>
</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href  = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// ── JSON ──────────────────────────────────────────────────────────────────────
export const exportToJSON = (state: CanvasState, filename: string = 'whiteboard.json') => {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href  = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// ── Import ────────────────────────────────────────────────────────────────────
export const importFromJSON = (file: File): Promise<CanvasState> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try { resolve(JSON.parse(e.target?.result as string) as CanvasState); }
      catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// ── exportCanvas — called by canvas/page.tsx ──────────────────────────────────
// This is the single entry point used in the main canvas page
export const exportCanvas = (
  canvas: HTMLCanvasElement,
  elements: DrawableElement[],
  viewport: { x: number; y: number; zoom: number },
  format: ExportFormat,
  canvasId: string,
) => {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const name = `whiteboard-${ts}`;

  switch (format) {
    case 'png':  exportToPNG(canvas,  `${name}.png`); break;
    case 'jpg':  exportToJPG(canvas,  `${name}.jpg`); break;
    case 'pdf':  exportToPDF(canvas,  `${name}.pdf`); break;
    case 'svg':  exportToSVG(elements, viewport, `${name}.svg`); break;
    case 'json':
      exportToJSON(
        { version: '1.0', elements, viewport, createdAt: Date.now(), updatedAt: Date.now() },
        `${name}.json`
      );
      break;
  }
};

// ── handleExport — legacy alias (kept for backward compat) ────────────────────
export const handleExport = (
  format: ExportFormat,
  canvas: HTMLCanvasElement,
  elements: DrawableElement[],
  viewport: { x: number; y: number; zoom: number },
  state: CanvasState,
) => {
  exportCanvas(canvas, elements, viewport, format, 'canvas');
};