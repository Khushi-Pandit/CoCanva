'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useCanvasStore } from '@/store/canvas.store';
import { useUIStore } from '@/store/ui.store';
import { toAPI, generateId, calculateBounds } from '@/lib/element.transform';
import { isStroke } from '@/types/element';
import {
  Trash2, Copy, ArrowUpToLine, ArrowDownToLine,
  Sparkles, Layers, Send, X
} from 'lucide-react';

interface SelectionContextMenuProps {
  onDelete: (ids: string[]) => void;
  onElementAdd: (el: any, apiForm: unknown) => void;
  onElementModify: (el: any, apiForm: unknown) => void;
}

export function SelectionContextMenu({ onDelete, onElementAdd, onElementModify }: SelectionContextMenuProps) {
  const { selectedIds, elements, setSelectedIds, updateElement, pushHistory } = useCanvasStore();
  const { addToast, togglePanel } = useUIStore();
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [promptMode, setPromptMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  useEffect(() => {
    const handleContext = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#drawsync-canvas-container')) return;
      if (selectedIds.length > 0) {
        e.preventDefault();
        setMenuPos({ x: e.clientX, y: e.clientY });
        setPromptMode(false);
        setAiPrompt("");
      }
    };
    const handleWindowPointer = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.context-menu-container')) {
        setMenuPos(null);
        setPromptMode(false);
      }
    };
    const handleScroll = () => { setMenuPos(null); setPromptMode(false); };

    window.addEventListener('contextmenu', handleContext);
    window.addEventListener('pointerdown', handleWindowPointer);
    window.addEventListener('wheel', handleScroll);
    return () => {
      window.removeEventListener('contextmenu', handleContext);
      window.removeEventListener('pointerdown', handleWindowPointer);
      window.removeEventListener('wheel', handleScroll);
    };
  }, [selectedIds]);

  const handleDuplicate = useCallback(() => {
    const selected = elements.filter(e => selectedIds.includes(e.id));
    const newEls = selected.map(el => {
      const newId = generateId();
      if (isStroke(el)) {
        const shifted = el.points.map(p => ({ x: p.x + 20, y: p.y + 20 }));
        return { ...el, id: newId, elementId: newId, points: shifted, bounds: calculateBounds(shifted), timestamp: Date.now() };
      } else if ((el as any).kind === 'connector' && Array.isArray((el as any).points)) {
        const shifted = (el as any).points.map((p: any) => ({ x: p.x + 20, y: p.y + 20 }));
        return { ...el, id: newId, elementId: newId, points: shifted, timestamp: Date.now() };
      } else {
        return { ...el, id: newId, elementId: newId, x: (el as any).x + 20, y: (el as any).y + 20, timestamp: Date.now() };
      }
    });
    newEls.forEach(el => {
      useCanvasStore.getState().addElement(el as any);
      onElementAdd(el, toAPI(el as any));
    });
    setSelectedIds(newEls.map(e => e.id));
    pushHistory([...useCanvasStore.getState().elements]);
    setMenuPos(null);
    addToast(`Duplicated ${newEls.length} element${newEls.length !== 1 ? 's' : ''}`, 'success', 1500);
  }, [elements, selectedIds, setSelectedIds, pushHistory, onElementAdd, addToast]);

  const handleBringForward = useCallback(() => {
    const state = useCanvasStore.getState();
    const all = [...state.elements];
    const selectedSet = new Set(selectedIds);
    const rest = all.filter(e => !selectedSet.has(e.id));
    const sel = all.filter(e => selectedSet.has(e.id));
    // Move selected to end (top of z-stack)
    useCanvasStore.getState().replaceElements(() => [...rest, ...sel]);
    sel.forEach(el => onElementModify(el, toAPI(el)));
    setMenuPos(null);
    addToast('Brought to front', 'info', 1200);
  }, [selectedIds, onElementModify, addToast]);

  const handleSendBackward = useCallback(() => {
    const state = useCanvasStore.getState();
    const all = [...state.elements];
    const selectedSet = new Set(selectedIds);
    const rest = all.filter(e => !selectedSet.has(e.id));
    const sel = all.filter(e => selectedSet.has(e.id));
    // Move selected to beginning (bottom of z-stack)
    useCanvasStore.getState().replaceElements(() => [...sel, ...rest]);
    sel.forEach(el => onElementModify(el, toAPI(el)));
    setMenuPos(null);
    addToast('Sent to back', 'info', 1200);
  }, [selectedIds, onElementModify, addToast]);

  const handleAskAIInline = useCallback(() => {
    setPromptMode(true);
  }, []);

  const submitAIPrompt = useCallback(() => {
    if (!aiPrompt.trim()) return;
    useUIStore.getState().setPanel('aiChatOpen', true);
    setMenuPos(null);
    setPromptMode(false);
    
    // Prefix visually that it contains an attachment context for the user to see!
    const builtMessage = `[📎 Attached: ${selectedIds.length} element${selectedIds.length !== 1 ? 's' : ''}]\n\n${aiPrompt}`;

    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('ai:prompt', { detail: builtMessage })
      );
    }, 150);
  }, [aiPrompt, selectedIds]);

  if (!menuPos || selectedIds.length === 0) return null;

  const MenuItem = ({
    icon: Icon, label, onClick, danger = false, shortcut,
  }: {
    icon: React.ElementType; label: string; onClick: () => void; danger?: boolean; shortcut?: string;
  }) => (
    <button
      className={`w-full px-3 py-1.5 text-left flex items-center gap-2.5 rounded-lg text-xs font-medium transition-colors group ${
        danger
          ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
      }`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <Icon size={13} className="flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {shortcut && <kbd className="text-[9px] text-slate-400 bg-slate-100 rounded px-1 py-0.5 font-mono">{shortcut}</kbd>}
    </button>
  );

  const Divider = () => <div className="h-px bg-slate-100 my-1 mx-2" />;

  return (
    <div
      className="context-menu-container fixed z-50 bg-white border border-slate-200 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden animate-fade-in py-1.5 pointer-events-auto select-none"
      style={{ left: Math.min(menuPos.x, window.innerWidth - 250), top: Math.min(menuPos.y, window.innerHeight - 300), minWidth: promptMode ? 260 : 196 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {promptMode ? (
        <div className="px-3 py-1 flex flex-col gap-2">
          {/* Top Badge */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md">
              <Sparkles size={11} className="text-indigo-600" />
              {selectedIds.length} Elements Selected
            </span>
            <button onClick={() => setPromptMode(false)} className="text-slate-400 hover:text-slate-700">
              <X size={14} />
            </button>
          </div>
          
          <div className="relative">
            <input 
              autoFocus
              type="text"
              placeholder="Ask anything about these..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-8 pl-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitAIPrompt();
                }
              }}
            />
            <button 
              onClick={submitAIPrompt}
              className="absolute right-1.5 top-1.5 p-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
            >
              <Send size={11} />
            </button>
          </div>
          <div className="text-[9px] text-slate-400 px-1 pt-0.5">Press <kbd className="font-mono bg-slate-100 rounded px-1">Enter</kbd> to submit</div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Layers size={10} />
            {selectedIds.length} Object{selectedIds.length > 1 ? 's' : ''} Selected
          </div>
          <Divider />

          {/* AI section */}
          <div className="px-1.5">
            <MenuItem
              icon={Sparkles}
              label="Ask AI about this"
              onClick={handleAskAIInline}
            />
          </div>
          <Divider />

          {/* Edit actions */}
          <div className="px-1.5 space-y-0.5">
            <MenuItem icon={Copy} label="Duplicate" onClick={handleDuplicate} shortcut="Ctrl+D" />
            <MenuItem icon={ArrowUpToLine} label="Bring to Front" onClick={handleBringForward} />
            <MenuItem icon={ArrowDownToLine} label="Send to Back" onClick={handleSendBackward} />
          </div>
          <Divider />

          {/* Danger zone */}
          <div className="px-1.5">
            <MenuItem
              icon={Trash2}
              label="Delete"
              onClick={() => {
                 onDelete(selectedIds);
                 setMenuPos(null);
              }}
              danger
              shortcut="Del"
            />
          </div>
        </>
      )}
    </div>
  );
}
