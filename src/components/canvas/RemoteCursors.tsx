'use client';
import { useCollaborationStore } from '@/store/collaboration.store';

interface RemoteCursorsProps {
  viewport: { x: number; y: number; zoom: number };
}

export function RemoteCursors({ viewport }: RemoteCursorsProps) {
  const { remoteCursors } = useCollaborationStore();

  return (
    <>
      {Object.entries(remoteCursors).map(([sid, c]) => (
        <div
          key={sid}
          className="absolute pointer-events-none transition-all duration-75"
          style={{
            left: c.x * viewport.zoom + viewport.x,
            top:  c.y * viewport.zoom + viewport.y,
            zIndex: 50,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20">
            <path d="M0,0 L0,14 L4,11 L7,17 L9,16 L6,10 L11,10 Z" fill={c.userColor} stroke="white" strokeWidth="1" />
          </svg>
          <div
            className="absolute top-4 left-1 px-1.5 py-0.5 rounded-full text-white text-[9px] font-semibold whitespace-nowrap"
            style={{ background: c.userColor }}
          >
            {c.userName}
          </div>
        </div>
      ))}
    </>
  );
}
