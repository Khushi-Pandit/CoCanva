import { DrawableElement } from '@/types/element';

export function exportCanvas(
  canvas: HTMLCanvasElement | null,
  elements: DrawableElement[],
  viewport: { x: number; y: number; zoom: number },
  format: 'png' | 'svg' | 'pdf' | 'json',
  canvasId: string,
): void {
  if (format === 'json') {
    const blob = new Blob([JSON.stringify({ elements, viewport, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `drawsync-${canvasId}.json`);
    return;
  }


  if (format === 'png') {
    const svgStr = generateSVG(elements, viewport);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width = img.width;
      offscreen.height = img.height;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
        ctx.drawImage(img, 0, 0);
        offscreen.toBlob((pngBlob) => {
          if (pngBlob) downloadBlob(pngBlob, `drawsync-${canvasId}.png`);
          URL.revokeObjectURL(url);
        }, 'image/png');
      }
    };
    img.src = url;
    return;
  }

  if (format === 'svg') {
    const svgContent = generateSVG(elements, viewport);
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    downloadBlob(blob, `drawsync-${canvasId}.svg`);
    return;
  }

  if (format === 'pdf') {
    const svgContent = generateSVG(elements, viewport);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Export PDF - DrawSync</title>
            <style>
              @media print {
                @page { margin: 0; }
                body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              }
              body { background: #fafafa; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            </style>
          </head>
          <body>
            ${svgContent}
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
    return;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function generateSVG(elements: DrawableElement[], viewport: { x: number; y: number; zoom: number }): string {
  // Determine bounding box
  let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
  for (const el of elements) {
    if ('points' in el && Array.isArray(el.points)) {
      for (const p of el.points) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      }
    } else if ('x' in el && 'y' in el) {
      const w = 'width' in el ? (el as any).width : 0;
      const h = 'height' in el ? (el as any).height : 0;
      minX = Math.min(minX, el.x); minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + w); maxY = Math.max(maxY, el.y + h);
    }
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }
  const W = maxX - minX + 80, H = maxY - minY + 80;

  const paths = elements.map((el) => {
    if (el.kind === 'stroke') {
      const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x - minX + 40},${p.y - minY + 40}`).join(' ');
      return `<path d="${d}" stroke="${el.color}" stroke-width="${el.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${el.opacity}" />`;
    }
    if (el.kind === 'shape') {
      const x = el.x - minX + 40, y = el.y - minY + 40, w = el.width, h = el.height;
      switch (el.type) {
        case 'rectangle': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="${el.color}" stroke-width="${el.strokeWidth}" fill="${el.fillColor ?? 'none'}" opacity="${el.opacity}" />`;
        case 'circle':    return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" stroke="${el.color}" stroke-width="${el.strokeWidth}" fill="${el.fillColor ?? 'none'}" opacity="${el.opacity}" />`;
        default: return '';
      }
    }
    if (el.kind === 'text') {
      return `<text x="${el.x - minX + 40}" y="${el.y - minY + 40}" font-size="${el.fontSize}" font-family="${el.fontFamily}" fill="${el.color}">${el.text}</text>`;
    }
    if (el.kind === 'flowchart') {
      const x = el.x - minX + 40, y = el.y - minY + 40, w = el.width, h = el.height;
      const bg = el.fillColor || '#ffffff';
      let shapeStr = `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="${el.color}" stroke-width="${el.strokeWidth}" fill="${bg}" opacity="${el.opacity}" rx="8" />`;
      if (el.shapeType === 'cylinder') {
        shapeStr = `<ellipse cx="${x + w/2}" cy="${y + h/2}" rx="${w/2}" ry="${h/2}" stroke="${el.color}" stroke-width="${el.strokeWidth}" fill="${bg}" opacity="${el.opacity}" />`;
      } else if (el.shapeType === 'diamond') {
        shapeStr = `<polygon points="${x + w/2},${y} ${x + w},${y + h/2} ${x + w/2},${y + h} ${x},${y + h/2}" stroke="${el.color}" stroke-width="${el.strokeWidth}" fill="${bg}" opacity="${el.opacity}" />`;
      }
      const txt = `<text x="${x + w/2}" y="${y + h/2}" font-size="${el.fontSize}" font-family="${el.fontFamily}" fill="${el.color}" text-anchor="middle" dominant-baseline="central">${el.label || ''}</text>`;
      return `${shapeStr}\n${txt}`;
    }
    return '';
  }).filter(Boolean).join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#fafafa" />
  ${paths}
</svg>`;
}
