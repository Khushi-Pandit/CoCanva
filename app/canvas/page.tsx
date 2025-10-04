"use client";

import { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line, Rect, Circle as KonvaCircle } from "react-konva";
import {
  Pencil,
  Highlighter,
  Eraser,
  Square,
  Circle,
  Minus,
  Save,
  Download,
} from "lucide-react";

// Types
type Tool = "pencil" | "highlighter" | "eraser" | "rectangle" | "circle" | "line";

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

interface RectangleShape extends BaseShape {
  tool: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CircleShape extends BaseShape {
  tool: "circle";
  x: number;
  y: number;
  radius: number;
}

interface LineShape extends BaseShape {
  tool: "line";
  points: number[];
}

type Shape = DrawingShape | RectangleShape | CircleShape | LineShape;

const COLORS = [
  "#000000",
  "#EF4444",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#6B7280",
];

export default function CanvasPage() {
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#000000");
  const [penSize, setPenSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(20);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle canvas resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseDown = (e: any) => {
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    const id = `shape-${Date.now()}-${Math.random()}`;

    if (tool === "pencil" || tool === "highlighter" || tool === "eraser") {
      const newShape: DrawingShape = {
        id,
        tool,
        color: tool === "eraser" ? "#FFFFFF" : color,
        strokeWidth: tool === "eraser" ? eraserSize : penSize,
        points: [pos.x, pos.y],
      };
      setShapes([...shapes, newShape]);
    } else if (tool === "rectangle") {
      const newShape: RectangleShape = {
        id,
        tool: "rectangle",
        color,
        strokeWidth: penSize,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
      };
      setShapes([...shapes, newShape]);
    } else if (tool === "circle") {
      const newShape: CircleShape = {
        id,
        tool: "circle",
        color,
        strokeWidth: penSize,
        x: pos.x,
        y: pos.y,
        radius: 0,
      };
      setShapes([...shapes, newShape]);
    } else if (tool === "line") {
      const newShape: LineShape = {
        id,
        tool: "line",
        color,
        strokeWidth: penSize,
        points: [pos.x, pos.y, pos.x, pos.y],
      };
      setShapes([...shapes, newShape]);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const lastShape = shapes[shapes.length - 1];

    if (!lastShape) return;

    if (lastShape.tool === "pencil" || lastShape.tool === "highlighter" || lastShape.tool === "eraser") {
      const updatedShape = {
        ...lastShape,
        points: [...(lastShape as DrawingShape).points, point.x, point.y],
      };
      setShapes([...shapes.slice(0, -1), updatedShape]);
    } else if (lastShape.tool === "rectangle") {
      const rect = lastShape as RectangleShape;
      const updatedShape: RectangleShape = {
        ...rect,
        width: point.x - rect.x,
        height: point.y - rect.y,
      };
      setShapes([...shapes.slice(0, -1), updatedShape]);
    } else if (lastShape.tool === "circle") {
      const circ = lastShape as CircleShape;
      const radius = Math.sqrt(
        Math.pow(point.x - circ.x, 2) + Math.pow(point.y - circ.y, 2)
      );
      const updatedShape: CircleShape = {
        ...circ,
        radius,
      };
      setShapes([...shapes.slice(0, -1), updatedShape]);
    } else if (lastShape.tool === "line") {
      const line = lastShape as LineShape;
      const updatedShape: LineShape = {
        ...line,
        points: [line.points[0], line.points[1], point.x, point.y],
      };
      setShapes([...shapes.slice(0, -1), updatedShape]);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleSave = () => {
    const dataStr = JSON.stringify(shapes, null, 2);
    console.log("Canvas Data:", dataStr);
    alert("Canvas data saved to console! Ready for API integration.");
    // In production, send to API:
    // await fetch('/api/canvas/save', {
    //   method: 'POST',
    //   body: JSON.stringify({ shapes }),
    //   headers: { 'Content-Type': 'application/json' }
    // });
  };

  const handleExport = () => {
    if (stageRef.current) {
      const uri = stageRef.current.toDataURL();
      const link = document.createElement("a");
      link.download = "canvas-export.png";
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderShape = (shape: Shape) => {
    if (shape.tool === "pencil" || shape.tool === "highlighter" || shape.tool === "eraser") {
      const drawShape = shape as DrawingShape;
      return (
        <Line
          key={shape.id}
          points={drawShape.points}
          stroke={drawShape.color}
          strokeWidth={drawShape.strokeWidth}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          globalCompositeOperation={
            shape.tool === "eraser" ? "destination-out" : "source-over"
          }
          opacity={shape.tool === "highlighter" ? 0.4 : 1}
        />
      );
    } else if (shape.tool === "rectangle") {
      const rect = shape as RectangleShape;
      return (
        <Rect
          key={shape.id}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          stroke={rect.color}
          strokeWidth={rect.strokeWidth}
        />
      );
    } else if (shape.tool === "circle") {
      const circ = shape as CircleShape;
      return (
        <KonvaCircle
          key={shape.id}
          x={circ.x}
          y={circ.y}
          radius={circ.radius}
          stroke={circ.color}
          strokeWidth={circ.strokeWidth}
        />
      );
    } else if (shape.tool === "line") {
      const line = shape as LineShape;
      return (
        <Line
          key={shape.id}
          points={line.points}
          stroke={line.color}
          strokeWidth={line.strokeWidth}
          lineCap="round"
          lineJoin="round"
        />
      );
    }
    return null;
  };

  const ToolButton = ({
    icon: Icon,
    label,
    toolType,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    label: string;
    toolType: Tool;
  }) => (
    <button
      onClick={() => setTool(toolType)}
      className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-all ${
        tool === toolType
          ? "bg-cyan-500 text-white shadow-md"
          : "bg-white hover:bg-gray-100 text-gray-700"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 p-4 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Canvas Editor</h2>
          <p className="text-xs text-gray-500">Create beautiful designs</p>
        </div>

        {/* Tools */}
        <div className="space-y-2 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Drawing Tools
          </h3>
          <ToolButton icon={Pencil} label="Pencil" toolType="pencil" />
          <ToolButton icon={Highlighter} label="Highlighter" toolType="highlighter" />
          <ToolButton icon={Eraser} label="Eraser" toolType="eraser" />
        </div>

        <div className="space-y-2 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Shapes
          </h3>
          <ToolButton icon={Square} label="Rectangle" toolType="rectangle" />
          <ToolButton icon={Circle} label="Circle" toolType="circle" />
          <ToolButton icon={Minus} label="Line" toolType="line" />
        </div>

        {/* Color Palette */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Colors
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-12 h-12 rounded-lg transition-all ${
                  color === c
                    ? "ring-2 ring-cyan-500 ring-offset-2 scale-110"
                    : "hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Size Controls */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Pen Size
          </h3>
          <input
            type="range"
            min="1"
            max="20"
            value={penSize}
            onChange={(e) => setPenSize(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-center text-sm text-gray-600 mt-1">{penSize}px</div>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Eraser Size
          </h3>
          <input
            type="range"
            min="5"
            max="50"
            value={eraserSize}
            onChange={(e) => setEraserSize(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-center text-sm text-gray-600 mt-1">{eraserSize}px</div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleSave}
            className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md"
          >
            <Save className="w-5 h-5" />
            <span className="font-medium">Save</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md"
          >
            <Download className="w-5 h-5" />
            <span className="font-medium">Export PNG</span>
          </button>
          <button
            onClick={() => setShapes([])}
            className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md font-medium"
          >
            Clear Canvas
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 bg-white relative"
        style={{ cursor: isDrawing ? "crosshair" : "default" }}
      >
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          <Layer>{shapes.map(renderShape)}</Layer>
        </Stage>
      </div>
    </div>
  );
}