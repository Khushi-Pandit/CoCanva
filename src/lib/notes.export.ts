/**
 * notes.export.ts — Export utilities for Notes/Writing mode.
 *
 * Strategy for HIGH-QUALITY PDF and Images:
 * - We do NOT capture the live DOM <canvas> anymore, because it is subject
 *   to screen resolution, zoom blur, and panning occlusion.
 * - Instead, we fetch all elements for the canvas, and for each page we
 *   generate a perfect SVG matching the exact physical page dimensions.
 * - We draw that SVG to a high-DPI offscreen canvas to get a crisp PNG.
 */
import type { PageMeta } from '@/lib/api/page.api';
import { elementApi } from '@/lib/api/element.api';
import { fromAPI } from '@/lib/element.transform';
import { DrawableElement } from '@/types/element';

export interface NotesExportOptions {
  canvasId: string;
  canvasTitle: string;
  shareToken?: string;
  pages: PageMeta[];
  pageW: number;
  pageH: number;
  /** Force save current unsaved strokes before exporting */
  saveCurrentPage: () => Promise<void>;
  /** Existing AI summaries by page index */
  pageSummaries?: Record<number, string>;
  /** Callback to generate AI summary for a page on the fly */
  generateSummary?: (pageIndex: number, pngData: string) => Promise<string>;
  /** Progress callback */
  onProgress?: (msg: string) => void;
}

function escapeXML(str: string): string {
  if (!str) return '';
  return str.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function parseMarkdownToHTML(md: string): string {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size:18px; margin: 12px 0 6px; color:#0f172a;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size:22px; margin: 16px 0 8px; color:#0f172a; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-size:26px; margin: 20px 0 10px; color:#0f172a;">$1</h1>');

  // Lists
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li style="margin-left:24px; margin-bottom:6px; display:list-item;">$1</li>');
  html = html.replace(/(<li[^>]*>.*?<\/li>\n*)+/g, '<ul style="margin:12px 0; padding-left:0; list-style-type:disc;">$&</ul>');

  // Paragraphs
  html = html.split(/\n\n+/).map(p => {
    if (p.trim().startsWith('<h') || p.trim().startsWith('<ul')) return p;
    return `<p style="margin: 0 0 12px 0; line-height: 1.6;">${p.replace(/\n/g, '<br/>')}</p>`;
  }).join('\n');

  return html;
}

// ── SVG Generation (Fixed Page Bounds) ───────────────────────────────────────

function markerShape(style: string, color: string) {
  switch (style) {
    case 'open':
      return `<path d="M1,1 L8,4 L1,7" fill="none" stroke="${color}" stroke-width="1.6" />`;
    case 'dot':
      return `<circle cx="4" cy="4" r="2.4" fill="${color}" />`;
    case 'diamond':
      return `<path d="M0,4 L4,1 L8,4 L4,7 Z" fill="${color}" />`;
    default:
      return `<path d="M0,0 L8,4 L0,8 Z" fill="${color}" />`;
  }
}

export function generateNotesSVG(elements: DrawableElement[], pageW: number, pageH: number): string {
  const paths = elements.map((el) => {
    if (el.kind === 'stroke') {
      const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
      return `<path d="${d}" stroke="${el.color}" stroke-width="${el.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${el.opacity}" />`;
    }
    if (el.kind === 'connector') {
      if (!el.points || el.points.length < 2) return '';
      const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
      const markerEndId = `arrow-end-${el.id}`;
      const markerStartId = `arrow-start-${el.id}`;
      const endStyle = el.arrowEnd === false ? 'none' : (el.arrowHeadStyle ?? 'triangle');
      const startStyle = el.arrowStart ? (el.arrowTailStyle ?? el.arrowHeadStyle ?? 'triangle') : 'none';
      const defs: string[] = [];

      if (endStyle !== 'none') {
        defs.push(`<marker id="${markerEndId}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse">${markerShape(endStyle, el.color)}</marker>`);
      }
      if (startStyle !== 'none') {
        defs.push(`<marker id="${markerStartId}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse">${markerShape(startStyle, el.color)}</marker>`);
      }

      return `${defs.length ? `<defs>${defs.join('')}</defs>` : ''}<path d="${d}" stroke="${el.color}" stroke-width="${el.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${el.opacity}" ${el.dashed ? 'stroke-dasharray="8 5"' : ''} ${startStyle !== 'none' ? `marker-start="url(#${markerStartId})"` : ''} ${endStyle !== 'none' ? `marker-end="url(#${markerEndId})"` : ''} />`;
    }
    if (el.kind === 'shape') {
      const x = el.x, y = el.y, w = el.width, h = el.height;
      switch (el.type) {
        case 'rectangle': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="${el.color}" stroke-width="${el.strokeWidth}" fill="${el.fillColor ?? 'none'}" opacity="${el.opacity}" />`;
        case 'circle':    return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" stroke="${el.color}" stroke-width="${el.strokeWidth}" fill="${el.fillColor ?? 'none'}" opacity="${el.opacity}" />`;
        default: return '';
      }
    }
    if (el.kind === 'text') {
      return `<text x="${el.x}" y="${el.y}" font-size="${el.fontSize}" font-family="${el.fontFamily}" fill="${el.color}">${escapeXML(el.text || '')}</text>`;
    }
    if (el.kind === 'flowchart') {
      const x = el.x, y = el.y, w = el.width, h = el.height;
      const bg = el.fillColor || '#ffffff';
      let shapeStr = `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="${el.color}" stroke-width="${el.strokeWidth}" fill="${bg}" opacity="${el.opacity}" rx="8" />`;
      if (el.shapeType === 'cylinder') {
        shapeStr = `<ellipse cx="${x + w/2}" cy="${y + h/2}" rx="${w/2}" ry="${h/2}" stroke="${el.color}" stroke-width="${el.strokeWidth}" fill="${bg}" opacity="${el.opacity}" />`;
      } else if (el.shapeType === 'diamond') {
        shapeStr = `<polygon points="${x + w/2},${y} ${x + w},${y + h/2} ${x + w/2},${y + h} ${x},${y + h/2}" stroke="${el.color}" stroke-width="${el.strokeWidth}" fill="${bg}" opacity="${el.opacity}" />`;
      }
      const txt = `<text x="${x + w/2}" y="${y + h/2}" font-size="${el.fontSize}" font-family="${el.fontFamily}" fill="${el.color}" text-anchor="middle" dominant-baseline="central">${escapeXML(el.label || '')}</text>`;
      return `${shapeStr}\n${txt}`;
    }
    return '';
  }).filter(Boolean).join('\n  ');

  // We explicitly draw a white background rectangle, and apply all SVG elements.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${pageW}" height="${pageH}" viewBox="0 0 ${pageW} ${pageH}">
  <rect width="${pageW}" height="${pageH}" fill="#ffffff" />
  ${paths}
</svg>`;
}

// ── SVG to PNG Conversion (High DPI) ─────────────────────────────────────────

export async function renderSVGToPNG(svgStr: string, pageW: number, pageH: number, dpr = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      const out = document.createElement('canvas');
      out.width = pageW * dpr;
      out.height = pageH * dpr;
      const ctx = out.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return resolve('');
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(img, 0, 0, out.width, out.height);
      
      const pngData = out.toDataURL('image/png');
      URL.revokeObjectURL(url);
      resolve(pngData);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to render SVG to Image'));
    };
    img.src = url;
  });
}

// ── Export Orchestrator ──────────────────────────────────────────────────────

async function prepareExport(opts: NotesExportOptions) {
  // 1. Force save current page so we fetch the absolute latest
  await opts.saveCurrentPage();

  // 2. Fetch ALL elements for this canvas
  const { elements: apiEls } = await elementApi.getAll(opts.canvasId, opts.shareToken);
  const allEls = (apiEls ?? []).map(fromAPI).filter((e): e is DrawableElement => e !== null);

  return { allEls };
}

// ── PDF Export ────────────────────────────────────────────────────────────────
export async function exportNotesPDF(opts: NotesExportOptions): Promise<void> {
  const { canvasTitle, pages, pageW, pageH } = opts;
  const { allEls } = await prepareExport(opts);

  const { jsPDF } = await import('jspdf');

  // A4/Letter dimensions in mm (1px @ 96dpi ≈ 0.2646mm)
  const pxToMm = 0.2646;
  const wMm = pageW * pxToMm;
  const hMm = pageH * pxToMm;

  const pdf = new jsPDF({
    orientation: pageW > pageH ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [wMm, hMm],
  });

  const sorted = [...pages].sort((a, b) => a.pageIndex - b.pageIndex);

  for (let i = 0; i < sorted.length; i++) {
    const page = sorted[i];
    if (i > 0) pdf.addPage([wMm, hMm]);
    
    opts.onProgress?.(`Exporting Drawing (Page ${i + 1}/${sorted.length})...`);

    const pageElements = allEls.filter((e: any) => (e.pageIndex ?? 0) === page.pageIndex);
    const svgStr = generateNotesSVG(pageElements, pageW, pageH);
    
    // Scale up for high-res print quality
    const dataUrl = await renderSVGToPNG(svgStr, pageW, pageH, 2.5);
    
    if (dataUrl) {
      pdf.addImage(dataUrl, 'PNG', 0, 0, wMm, hMm, undefined, 'FAST');
    }
    
    // ── INNOVATION: AI Summary Companion Page ──
    let summary = opts.pageSummaries?.[page.pageIndex];
    if (!summary && opts.generateSummary && dataUrl && pageElements.length > 0) {
      opts.onProgress?.(`Generating AI Notes (Page ${i + 1}/${sorted.length})...`);
      try {
        summary = await opts.generateSummary(page.pageIndex, dataUrl);
      } catch (e) {
        console.error('Failed to generate summary for export', e);
      }
    }

    if (summary || pageElements.length === 0) {
      pdf.addPage([wMm, hMm]);
      
      const finalSummary = summary || (pageElements.length === 0 ? "This page is intentionally left blank." : "No summary could be generated for this page.");
      const htmlContent = parseMarkdownToHTML(finalSummary);
      const label = page.label || `Page ${page.pageIndex + 1}`;
      
      const summarySvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${pageW}" height="${pageH}" viewBox="0 0 ${pageW} ${pageH}">
  <rect width="${pageW}" height="${pageH}" fill="#f8fafc" />
  <rect width="${pageW}" height="8" fill="#10b981" />
  <foreignObject x="40" y="40" width="${pageW - 80}" height="${pageH - 80}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 14px; color: #475569;">
      <div style="font-size: 26px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">AI Notes: ${escapeXML(label)}</div>
      <div style="height: 1px; background: #cbd5e1; margin-bottom: 24px;"></div>
      ${htmlContent}
    </div>
  </foreignObject>
  <text x="40" y="${pageH - 20}" font-family="sans-serif" font-size="10" fill="#94a3b8">DrawSync AI Companion • Notes for ${escapeXML(label)}</text>
</svg>`;

      const summaryDataUrl = await renderSVGToPNG(summarySvg, pageW, pageH, 2.5);
      if (summaryDataUrl) {
        pdf.addImage(summaryDataUrl, 'PNG', 0, 0, wMm, hMm, undefined, 'FAST');
      }
    }
  }

  pdf.save(`${canvasTitle}.pdf`);
}

// ── Images ZIP Export ─────────────────────────────────────────────────────────
export async function exportNotesImages(opts: NotesExportOptions): Promise<void> {
  const { canvasTitle, pages, pageW, pageH } = opts;
  const { allEls } = await prepareExport(opts);

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const folder = zip.folder(canvasTitle) ?? zip;

  const sorted = [...pages].sort((a, b) => a.pageIndex - b.pageIndex);

  for (const page of sorted) {
    const pageElements = allEls.filter((e: any) => (e.pageIndex ?? 0) === page.pageIndex);
    const svgStr = generateNotesSVG(pageElements, pageW, pageH);
    
    // 2x scale for beautiful PNGs
    const dataUrl = await renderSVGToPNG(svgStr, pageW, pageH, 2);

    if (dataUrl) {
      const base64 = dataUrl.split(',')[1];
      if (base64) {
        const label = page.label || `page-${page.pageIndex + 1}`;
        const safe  = label.replace(/[^a-z0-9_\-]/gi, '_');
        folder.file(`${safe}.png`, base64, { base64: true });
      }
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${canvasTitle}-images.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Markdown Export ───────────────────────────────────────────────────────────
export function exportNotesMarkdown(
  title: string,
  pages: PageMeta[],
  pageSummaries: Record<number, string>,
): void {
  const sorted = [...pages].sort((a, b) => a.pageIndex - b.pageIndex);

  const lines: string[] = [`# ${title}`, ''];
  for (const page of sorted) {
    const label   = page.label || `Page ${page.pageIndex + 1}`;
    const summary = pageSummaries[page.pageIndex] ?? '';
    lines.push(`## ${label}`);
    if (summary) lines.push(summary);
    else lines.push('_No content summary available._');
    lines.push('');
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${title}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
