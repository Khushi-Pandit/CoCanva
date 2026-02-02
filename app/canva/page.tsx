'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Undo2, Redo2, Pencil } from 'lucide-react';

type Point = { x: number; y: number };
type Line = {
  points: Point[];
  color: string;
  width: number;
};

const COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#22C55E' },
];

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser'>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  
  const [lines, setLines] = useState<Line[]>([]);
  const [historyStack, setHistoryStack] = useState<Line[][]>([]);
  
  const isDrawing = useRef(false);
  const currentStroke = useRef<Point[]>([]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    lines.forEach((line) => {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;
      
      ctx.beginPath();
      line.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redrawCanvas();
    };

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    return () => window.removeEventListener('resize', setCanvasSize);
  }, [lines]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawing.current = true;
    currentStroke.current = [];

    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    currentStroke.current.push({ x, y });

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : currentColor;
    ctx.lineWidth = currentTool === 'eraser' ? 20 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    setHistoryStack([]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    ctx.lineTo(x, y);
    ctx.stroke();

    currentStroke.current.push({ x, y });
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    if (currentStroke.current.length > 0) {
      const newLine: Line = {
        points: [...currentStroke.current],
        color: currentTool === 'eraser' ? '#ffffff' : currentColor,
        width: currentTool === 'eraser' ? 20 : 3,
      };

      setLines((prev) => [...prev, newLine]);
    }
  };


  const handleUndo = () => {
    if (lines.length === 0) return;
    setLines((prev) => {
      const newLines = [...prev];
      const removedLine = newLines.pop();
      if (removedLine) {
        setHistoryStack((prevStack) => [...prevStack, [removedLine]]);
      }
      return newLines;
    });
  };

  const handleRedo = () => {
    if (historyStack.length === 0) return;
    const lastRedoGroup = historyStack[historyStack.length - 1];
    
    setHistoryStack((prev) => prev.slice(0, -1));
    setLines((prev) => [...prev, ...lastRedoGroup]);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-50">
      
      <div className="absolute top-4 left-4">
        <div className="flex items-center rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
           <button
             onClick={() => setCurrentTool('pen')}
             className={`rounded p-2 transition-colors ${currentTool === 'pen' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
           >
             <Pencil size={20} />
           </button>
        </div>

          <div className="flex gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm animate-in fade-in slide-in-from-top-2">
            {COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => setCurrentColor(c.hex)}
                className={`h-6 w-6 rounded-full border border-gray-100 transition-transform hover:scale-110 ${
                  currentColor === c.hex ? 'ring-2 ring-gray-400 ring-offset-2' : ''
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
        <button onClick={handleUndo} disabled={lines.length === 0} className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 disabled:opacity-30">
          <Undo2 size={20} />
        </button>
        <div className="h-6 w-px bg-gray-200 mx-1"></div>
        <button onClick={handleRedo} disabled={historyStack.length === 0} className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 disabled:opacity-30">
          <Redo2 size={20} />
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="h-full w-full cursor-crosshair touch-none"
      />
    </div>
  );
}