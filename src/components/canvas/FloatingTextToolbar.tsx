'use client';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Type, Minus, Plus, Palette, Square } from 'lucide-react';
import { DrawableElement } from '@/types/element';
import { cn } from '@/lib/utils';
import { isTextElement, isFlowchart, isShape } from '@/types/element';

// Brand UI Colors
const PRESET_STYLES = [
  { name: 'Blue',   color: '#2563eb', fillColor: '#dbeafe' },
  { name: 'Green',  color: '#059669', fillColor: '#d1fae5' },
  { name: 'Yellow', color: '#d97706', fillColor: '#fef3c7' },
  { name: 'Red',    color: '#dc2626', fillColor: '#fee2e2' },
  { name: 'Purple', color: '#7c3aed', fillColor: '#ede9fe' },
  { name: 'Gray',   color: '#4b5563', fillColor: '#f3f4f6' },
  { name: 'Clear',  color: '#000000', fillColor: 'transparent' },
];

const EDGE_RADII = [
  { label: 'Sharp', radius: 0 },
  { label: 'Small', radius: 4 },
  { label: 'Medium', radius: 12 },
  { label: 'Large', radius: 24 },
];

interface FloatingTextToolbarProps {
  element: Partial<DrawableElement> & { 
    x?: number; y?: number; 
    fontSize?: number; fontWeight?: string; fontStyle?: string; textAlign?: string;
    color?: string; fillColor?: string; borderRadius?: number;
  };
  viewport: { x: number; y: number; zoom: number };
  onModify: (updates: Partial<any>) => void;
}

export function FloatingTextToolbar({ element, viewport: vp, onModify }: FloatingTextToolbarProps) {
  const isTxt = isTextElement(element as any);
  const isFlow = isFlowchart(element as any);
  const isShp = isShape(element as any);
  const hasText = isTxt || isFlow;
  
  // Exclude connector line from borders/fill styling
  const hasShapeProps = (isFlow && (element as any).shapeType !== 'connector') || isShp;

  const handleToggleBold = () => onModify({ fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' });
  const handleToggleItalic = () => onModify({ fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' });
  const handleAlign = (align: 'left' | 'center' | 'right') => onModify({ textAlign: align });
  const adjustSize = (delta: number) => {
    const newSize = Math.max(12, Math.min(120, (element.fontSize || 16) + delta));
    onModify({ fontSize: newSize });
  };

  const applyPreset = (preset: typeof PRESET_STYLES[0]) => {
    onModify({ color: preset.color, fillColor: preset.fillColor });
  };
  
  const applyRadius = (r: number) => {
    onModify({ borderRadius: r });
  };

  // Position precisely above the element
  const top = (element.y ?? 0) * vp.zoom + vp.y - (hasShapeProps && hasText ? 86 : 48); // Taller if both menus show
  const left = (element.x ?? 0) * vp.zoom + vp.x;

  return (
    <div
      className="absolute z-50 flex flex-col gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-xl animate-fade-in pointer-events-auto select-none"
      style={{ left, top, minWidth: hasShapeProps ? 220 : 160 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* SHAPE CONTROLS */}
      {hasShapeProps && (
        <div className="flex items-center gap-1.5 p-0.5">
          <Palette size={13} className="text-slate-400 ml-1" />
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <div className="flex items-center gap-1">
            {PRESET_STYLES.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={cn(
                  "w-5 h-5 rounded-full border transition-all hover:scale-110",
                  element.color === preset.color && element.fillColor === preset.fillColor
                    ? "ring-2 ring-emerald-400 ring-offset-1 border-transparent"
                    : "border-slate-300"
                )}
                style={{ backgroundColor: preset.fillColor === 'transparent' ? '#fff' : preset.fillColor, borderColor: preset.color }}
                title={`${preset.name} Style`}
              />
            ))}
          </div>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <div className="flex items-center gap-0.5">
            {EDGE_RADII.map(edge => (
               <button
                 key={edge.label}
                 onClick={() => applyRadius(edge.radius)}
                 className={cn(
                   "p-1 rounded transition-colors text-[10px] font-semibold w-6 h-6 flex items-center justify-center",
                   (element.borderRadius || (edge.radius === 8 ? 8 : 0)) === edge.radius ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"
                 )}
                 title={`${edge.label} Edges`}
               >
                 <Square size={13} rx={edge.radius / 4} strokeWidth={element.borderRadius === edge.radius ? 2.5 : 1.5} />
               </button>
            ))}
          </div>
        </div>
      )}

      {/* TEXT CONTROLS */}
      {hasText && (
        <div className={cn("flex items-center gap-1 p-0.5", hasShapeProps && "pt-1 border-t border-slate-100")}>
          <Type size={13} className="text-slate-400 ml-1" />
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <div className="flex items-center gap-0.5 bg-slate-50 rounded-lg p-0.5">
            <button onClick={() => adjustSize(-2)} className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors"><Minus size={13}/></button>
            <span className="text-[11px] font-semibold text-slate-600 w-5 text-center tabular-nums">{Math.round(element.fontSize || 16)}</span>
            <button onClick={() => adjustSize(2)} className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors"><Plus size={13}/></button>
          </div>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleToggleBold}
              className={cn("p-1.5 rounded transition-colors", element.fontWeight === 'bold' ? "bg-emerald-100 text-emerald-700" : "text-slate-600 hover:bg-slate-100")}
            ><Bold size={13} /></button>
            <button
              onClick={handleToggleItalic}
              className={cn("p-1.5 rounded transition-colors", element.fontStyle === 'italic' ? "bg-emerald-100 text-emerald-700" : "text-slate-600 hover:bg-slate-100")}
            ><Italic size={13} /></button>
          </div>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => handleAlign('left')}
              className={cn("p-1.5 rounded transition-colors", (!element.textAlign || element.textAlign === 'left') ? "bg-slate-200 text-slate-800" : "text-slate-600 hover:bg-slate-100")}
            ><AlignLeft size={13} /></button>
            <button
              onClick={() => handleAlign('center')}
              className={cn("p-1.5 rounded transition-colors", element.textAlign === 'center' ? "bg-slate-200 text-slate-800" : "text-slate-600 hover:bg-slate-100")}
            ><AlignCenter size={13} /></button>
            <button
              onClick={() => handleAlign('right')}
              className={cn("p-1.5 rounded transition-colors", element.textAlign === 'right' ? "bg-slate-200 text-slate-800" : "text-slate-600 hover:bg-slate-100")}
            ><AlignRight size={13} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
