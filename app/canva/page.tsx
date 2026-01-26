"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Line,
  Rect,
} from "react-konva";
import type Konva from "konva";
import {
  Pencil, Highlighter, Eraser,
} from "lucide-react";


type Tool = "pencil" | "highlighter" | "eraser";

interface BaseShape {
  id: string;
  tool: Tool;
  color: string;
  strokeWidth: number;
}

interface DrawingShape extends BaseShape {
  tool: "pencil" | "highlighter" | "eraser";
  points: number[];
}

type Shape = DrawingShape ;

const COLORS = ["#000000", "#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];

export default function CanvasPage() {
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isMounted, setIsMounted] = useState(false);

  const stageRef = useRef<Konva.Stage | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    setIsDrawing(true);
    const id = crypto.randomUUID();
    let newShape: Shape;

    if (tool === "pencil" || tool === "highlighter" || tool === "eraser") {
      newShape = { id, tool, color, strokeWidth, points: [pos.x, pos.y] } as DrawingShape;
    }

    setShapes((prev) => [...prev, newShape]);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || shapes.length === 0) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    const index = shapes.length - 1;
    const lastShape = { ...shapes[index] };

    if (lastShape.tool === "pencil" || lastShape.tool === "highlighter" || lastShape.tool === "eraser") {
      (lastShape as DrawingShape).points = (lastShape as DrawingShape).points.concat([pos.x, pos.y]);
    }

    const updatedShapes = [...shapes];
    updatedShapes[index] = lastShape as Shape;
    setShapes(updatedShapes);
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-screen bg-neutral-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm z-10">
        <div className="flex items-center gap-2">
          <ToolIcon active={tool === "pencil"} onClick={() => setTool("pencil")} icon={<Pencil size={18} />} />
          <ToolIcon active={tool === "highlighter"} onClick={() => setTool("highlighter")} icon={<Highlighter size={18} />} />
          <ToolIcon active={tool === "eraser"} onClick={() => setTool("eraser")} icon={<Eraser size={18} />} />
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full border-2 ${color === c ? "border-blue-500 scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 p-8 flex items-center justify-center overflow-hidden">
        <div className="bg-white shadow-2xl rounded-lg overflow-hidden border border-neutral-200">
          <Stage
            ref={stageRef}
            width={dimensions.width}
            height={dimensions.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDrawing(false)}
          >
            <Layer>
              <Rect width={dimensions.width} height={dimensions.height} fill="white" />
              {shapes.map((s) => {
                const common = { key: s.id, stroke: s.color, strokeWidth: s.strokeWidth };
                if (s.tool === "pencil" || s.tool === "highlighter" || s.tool === "eraser") {
                  return <Line {...common} points={s.points} tension={0.5} lineCap="round" lineJoin="round" opacity={s.tool === "highlighter" ? 0.4 : 1} globalCompositeOperation={s.tool === "eraser" ? "destination-out" : "source-over"} />;
                }
              })}
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}

function ToolIcon({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`p-2.5 rounded-lg transition-all ${active ? "bg-neutral-100 text-blue-600 shadow-inner" : "text-neutral-500 hover:bg-neutral-50"}`}>
      {icon}
    </button>
  );
}