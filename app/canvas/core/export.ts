/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from 'jspdf';
import { CanvasState, ExportFormat, Stroke, Shape, DrawableElement } from './types';

// Export canvas to PNG
export const exportToPNG = (canvas: HTMLCanvasElement, filename: string = 'whiteboard.png') => {
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
};

// Export canvas to JPG
export const exportToJPG = (canvas: HTMLCanvasElement, filename: string = 'whiteboard.jpg') => {
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, 'image/jpeg', 0.95);
};

// Export canvas to PDF
export const exportToPDF = (canvas: HTMLCanvasElement, filename: string = 'whiteboard.pdf') => {
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
};

// Export canvas to SVG
export const exportToSVG = (
  elements: DrawableElement[],
  viewport: { x: number; y: number; zoom: number },
  filename: string = 'whiteboard.svg'
) => {
  // Calculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  elements.forEach((element) => {
    if ('points' in element) {
      element.points.forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    } else if ('x' in element && 'y' in element) {
      if ('width' in element && 'height' in element) {
        minX = Math.min(minX, element.x);
        minY = Math.min(minY, element.y);
        maxX = Math.max(maxX, element.x + element.width);
        maxY = Math.max(maxY, element.y + element.height);
      } else {
        // Text element
        minX = Math.min(minX, element.x);
        minY = Math.min(minY, element.y);
        maxX = Math.max(maxX, element.x + 200); // Approximate text width
        maxY = Math.max(maxY, element.y + (element as any).fontSize || 24);
      }
    }
  });

  const padding = 20;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="white"/>
`;

  elements.forEach((element) => {
    if ('points' in element && element.points.length > 0) {
      // Stroke
      const points = element.points
        .map((p) => `${p.x - minX + padding},${p.y - minY + padding}`)
        .join(' ');
      svg += `  <polyline points="${points}" stroke="${element.color}" stroke-width="${element.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${element.opacity}"/>\n`;
    } else if ('type' in element && 'x' in element && 'width' in element) {
      // Shape
      const shape = element as Shape;
      const x = shape.x - minX + padding;
      const y = shape.y - minY + padding;
      
      switch (shape.type) {
        case 'rectangle':
          svg += `  <rect x="${x}" y="${y}" width="${shape.width}" height="${shape.height}" stroke="${shape.color}" stroke-width="${shape.strokeWidth}" fill="${shape.fillColor || 'none'}" opacity="${shape.opacity}"/>\n`;
          break;
        case 'circle':
          const radius = Math.min(shape.width, shape.height) / 2;
          svg += `  <circle cx="${x + shape.width / 2}" cy="${y + shape.height / 2}" r="${radius}" stroke="${shape.color}" stroke-width="${shape.strokeWidth}" fill="${shape.fillColor || 'none'}" opacity="${shape.opacity}"/>\n`;
          break;
        case 'line':
          svg += `  <line x1="${x}" y1="${y}" x2="${x + shape.width}" y2="${y + shape.height}" stroke="${shape.color}" stroke-width="${shape.strokeWidth}" opacity="${shape.opacity}"/>\n`;
          break;
      }
    } else if ('text' in element && typeof (element as any).text === 'string') {
      // Text element
      const textEl = element as any;
      const x = textEl.x - minX + padding;
      const y = textEl.y - minY + padding;
      const lines = textEl.text.split('\n');
      lines.forEach((line: string, idx: number) => {
        svg += `  <text x="${x}" y="${y + (idx * textEl.fontSize * 1.2) + textEl.fontSize}" font-family="${textEl.fontFamily}" font-size="${textEl.fontSize}" fill="${textEl.color}">${line}</text>\n`;
      });
    }
  });

  svg += '</svg>';

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// Export canvas state to JSON
export const exportToJSON = (state: CanvasState, filename: string = 'whiteboard.json') => {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// Import canvas state from JSON
export const importFromJSON = (file: File): Promise<CanvasState> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const state = JSON.parse(e.target?.result as string) as CanvasState;
        resolve(state);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// Export handler
export const handleExport = (
  format: ExportFormat,
  canvas: HTMLCanvasElement,
  elements: DrawableElement[],
  viewport: { x: number; y: number; zoom: number },
  state: CanvasState
) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  
  switch (format) {
    case 'png':
      exportToPNG(canvas, `whiteboard-${timestamp}.png`);
      break;
    case 'jpg':
      exportToJPG(canvas, `whiteboard-${timestamp}.jpg`);
      break;
    case 'pdf':
      exportToPDF(canvas, `whiteboard-${timestamp}.pdf`);
      break;
    case 'svg':
      exportToSVG(elements, viewport, `whiteboard-${timestamp}.svg`);
      break;
    case 'json':
      exportToJSON(state, `whiteboard-${timestamp}.json`);
      break;
  }
};