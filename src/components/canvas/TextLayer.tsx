'use client';
import { useCallback, useState, useEffect, useRef } from 'react';
import { TextElement } from '@/types/element';
import { useCanvasStore } from '@/store/canvas.store';

interface TextLayerProps {
  elements: TextElement[];
  viewport: { x: number; y: number; zoom: number };
  onModify?: (el: TextElement) => void;
  onDelete?: (id: string) => void;
  onDragStart?: (e: React.PointerEvent<HTMLDivElement>, id: string) => void;
}

const EditableTextNode = ({
  el, vp, onInput, onBlur
}: {
  el: TextElement; vp: { zoom: number };
  onInput: (text: string) => void; onBlur: (text: string) => void;
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (nodeRef.current && document.activeElement !== nodeRef.current) {
      nodeRef.current.innerText = el.text;
      nodeRef.current.focus();

      if (typeof window !== 'undefined' && el.text.length > 0) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(nodeRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run exclusively once on mount to detach DOM updates from React render cycles

  return (
    <div
      ref={nodeRef}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onBlur(e.currentTarget.innerText)}
      onInput={(e) => onInput(e.currentTarget.innerText)}
      style={{
        background: 'rgba(255,255,255,0.9)',
        outline: `2px solid #3b82f6`,
        minWidth: 40 * vp.zoom,
        padding: `${4 * vp.zoom}px`,
        whiteSpace: 'pre-wrap',
        borderRadius: 4,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    />
  );
};

export function TextLayer({ elements, viewport: vp, onModify, onDelete, onDragStart }: TextLayerProps) {
  const { selectedIds, updateElement, removeElement, setSelectedIds, pushHistory, tool } = useCanvasStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Auto-focus empty newly created text nodes
  useEffect(() => {
    if (selectedIds.length === 1) {
      const el = elements.find(e => e.id === selectedIds[0]);
      if (el && el.text === '') {
        setEditingId(el.id);
      }
    } else if (selectedIds.length === 0) {
      setEditingId(null);
    }
  }, [selectedIds, elements]);

  const handleInput = useCallback((id: string, text: string) => {
    updateElement(id, { text });
    // Look up the full element to emit to other clients
    const el = useCanvasStore.getState().elements.find(e => e.id === id);
    if (el && onModify) onModify(el as TextElement);
  }, [updateElement, onModify]);

  const handleBlur = useCallback((id: string, text: string) => {
    if (!text.trim()) {
      if (onDelete) onDelete(id);
      else removeElement(id);
    } else {
      pushHistory([...useCanvasStore.getState().elements]);
    }
    // Prevent unmounting glitch if still clicking around
  }, [removeElement, pushHistory]);

  return (
    <>
      {elements.map((el) => {
        const isSelected = selectedIds.includes(el.id);
        const isEditing = editingId === el.id;
        const canInteract = tool === 'select' || tool === 'text';

        return (
          <div
            key={el.id}
            className={`absolute ${canInteract ? (isEditing ? 'cursor-text' : 'cursor-move') : 'pointer-events-none'}`}
            style={{
              left: el.x * vp.zoom + vp.x,
              top:  el.y * vp.zoom + vp.y,
              fontSize: el.fontSize * vp.zoom,
              fontFamily: el.fontFamily,
              fontWeight: el.fontWeight || 'normal',
              fontStyle: el.fontStyle || 'normal',
              textAlign: el.textAlign || 'left',
              color: el.color,
              lineHeight: 1.4,
              opacity: el.opacity ?? 1,
              zIndex: isSelected ? 50 : 10,
              pointerEvents: canInteract ? 'auto' : 'none',
            }}
            onPointerDown={(e) => {
              if (canInteract) {
                e.stopPropagation();
                setSelectedIds([el.id]);
                // If we are NOT actively typing inside it, allow dragging
                if (!isEditing && onDragStart) {
                  onDragStart(e, el.id);
                }
              }
            }}
            onDoubleClick={(e) => {
              if (canInteract) {
                e.stopPropagation();
                setEditingId(el.id);
              }
            }}
          >
            {isEditing ? (
              <EditableTextNode
                el={el}
                vp={vp}
                onBlur={(text) => {
                  setEditingId(null);
                  handleBlur(el.id, text);
                }}
                onInput={(text) => handleInput(el.id, text)}
              />
            ) : (
              <div 
                style={{ 
                  whiteSpace: 'pre-wrap', 
                  padding: `${4 * vp.zoom}px`, 
                  border: isSelected ? `1px dashed #3b82f6` : '1px solid transparent',
                  background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                  borderRadius: 4,
                }}
              >
                {el.text || 'Double click to edit'}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
