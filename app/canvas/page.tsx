// CanvasScreen - A React component for a drawing canvas with multiple tools, using react-konva and TypeScript.

"use client";

import { useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Line,
  Rect,
  Circle as KonvaCircle,
  Text as KonvaText,
} from "react-konva";
import {
  Pencil,
  Highlighter,
  Eraser,
  Square,
  Circle,
  Minus,
  Save,
  Download,
  Undo,
  Redo,
  Type,
} from "lucide-react";

// ---------- Types ----------
type Tool =
  | "pencil"
  | "highlighter"
  | "eraser"
  | "rectangle"
  | "circle"
  | "line"
  | "text";

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

interface TextShape extends BaseShape {
  tool: "text";
  x: number;
  y: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontStyle?: "normal" | "bold" | "italic";
}

type Shape =
  | DrawingShape
  | RectangleShape
  | CircleShape
  | LineShape
  | TextShape;

// ---------- Constants ----------
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

const FONT_FAMILIES = [
  "Arial",
  "Helvetica",
  "Roboto",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
];

// ---------- Component ----------
export default function CanvasPage() {
  // Tools & settings
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#000000");
  const [penSize, setPenSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(20);

  // Shapes and history
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [history, setHistory] = useState<Shape[]>([]); // redo stack

  // Canvas state
  const [isDrawing, setIsDrawing] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 700 });

  // Text settings
  const [fontFamily, setFontFamily] = useState<string>("Arial");
  const [fontSize, setFontSize] = useState<number>(18);

  // Refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ---------- Effects ----------
  // Resize canvas to container
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

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "Z"))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shapes, history]); // depend on shapes/history to get latest

  // ---------- Mouse / Touch handlers ----------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseDown = (e: any) => {
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    const id = `shape-${Date.now()}-${Math.random()}`;

    let newShape: Shape | null = null;

    if (tool === "pencil" || tool === "highlighter" || tool === "eraser") {
      newShape = {
        id,
        tool,
        color: tool === "eraser" ? "#000000" : color, // eraser will use composite operation
        strokeWidth: tool === "eraser" ? eraserSize : penSize,
        points: [pos.x, pos.y],
      } as DrawingShape;
    } else if (tool === "rectangle") {
      newShape = {
        id,
        tool: "rectangle",
        color,
        strokeWidth: penSize,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
      } as RectangleShape;
    } else if (tool === "circle") {
      newShape = {
        id,
        tool: "circle",
        color,
        strokeWidth: penSize,
        x: pos.x,
        y: pos.y,
        radius: 0,
      } as CircleShape;
    } else if (tool === "line") {
      newShape = {
        id,
        tool: "line",
        color,
        strokeWidth: penSize,
        points: [pos.x, pos.y, pos.x, pos.y],
      } as LineShape;
    } else if (tool === "text") {
      newShape = {
        id,
        tool: "text",
        color,
        strokeWidth: 0,
        x: pos.x,
        y: pos.y,
        text: "Double-click to edit",
        fontFamily,
        fontSize,
        fontStyle: "normal",
      } as TextShape;
    }

    if (newShape) {
      setShapes((prev) => [...prev, newShape]);
      setHistory([]); // clear redo stack whenever new action happens
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const point = stage.getPointerPosition();
    const lastShape = shapes[shapes.length - 1];
    if (!lastShape) return;

    let updatedShape: Shape = lastShape;

    if (
      lastShape.tool === "pencil" ||
      lastShape.tool === "highlighter" ||
      lastShape.tool === "eraser"
    ) {
      const drawing = lastShape as DrawingShape;
      updatedShape = {
        ...drawing,
        points: [...drawing.points, point.x, point.y],
      } as DrawingShape;
    } else if (lastShape.tool === "rectangle") {
      const rect = lastShape as RectangleShape;
      updatedShape = { ...rect, width: point.x - rect.x, height: point.y - rect.y };
    } else if (lastShape.tool === "circle") {
      const circ = lastShape as CircleShape;
      const radius = Math.sqrt(Math.pow(point.x - circ.x, 2) + Math.pow(point.y - circ.y, 2));
      updatedShape = { ...circ, radius };
    } else if (lastShape.tool === "line") {
      const line = lastShape as LineShape;
      updatedShape = { ...line, points: [line.points[0], line.points[1], point.x, point.y] };
    } else if (lastShape.tool === "text") {
      // no drag behavior for text while drawing; could be implemented if desired
    }

    // replace last shape
    setShapes((prev) => [...prev.slice(0, -1), updatedShape]);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // ---------- Undo / Redo ----------
  const handleUndo = () => {
    setShapes((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const popped = copy.pop()!;
      setHistory((h) => [...h, popped]);
      return copy;
    });
  };

  const handleRedo = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const last = copy.pop()!;
      setShapes((s) => [...s, last]);
      return copy;
    });
  };

  // ---------- Save / Export / Clear ----------
  const handleSave = () => {
    const dataStr = JSON.stringify(shapes, null, 2);
    console.log("Canvas Data:", dataStr);
    alert("Canvas data saved to console! You can send this JSON to your API.");
  };

  const handleExport = () => {
    if (stageRef.current) {
      const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = "canvas-export.png";
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const handleClear = () => {
  const confirmClear = window.confirm("Are you sure you want to clear all shapes?");
  
  if (confirmClear) {
    setShapes([]);
    setHistory([]);
  }
};


  // ---------- Text editing (double click) ----------
  const handleDoubleClick = (shape: Shape) => {
    if (shape.tool !== "text") return;
    const txt = window.prompt("Edit text:", (shape as TextShape).text);
    if (txt === null) return; // cancel
    const id = shape.id;
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...(s as TextShape), text: txt } : s)));
  };

  // ---------- Render single shape ----------
  const renderShape = (shape: Shape) => {
    if (shape.tool === "pencil" || shape.tool === "highlighter" || shape.tool === "eraser") {
      const d = shape as DrawingShape;
      return (
        <Line
          key={d.id}
          points={d.points}
          stroke={d.color}
          strokeWidth={d.strokeWidth}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          globalCompositeOperation={d.tool === "eraser" ? "destination-out" : "source-over"}
          opacity={d.tool === "highlighter" ? 0.35 : 1}
        />
      );
    }

    if (shape.tool === "rectangle") {
      const r = shape as RectangleShape;
      // Allow negative width/height (so drag in any direction)
      const x = r.width >= 0 ? r.x : r.x + r.width;
      const y = r.height >= 0 ? r.y : r.y + r.height;
      const width = Math.abs(r.width);
      const height = Math.abs(r.height);
      return <Rect key={r.id} x={x} y={y} width={width} height={height} stroke={r.color} strokeWidth={r.strokeWidth} />;
    }

    if (shape.tool === "circle") {
      const c = shape as CircleShape;
      return <KonvaCircle key={c.id} x={c.x} y={c.y} radius={Math.abs(c.radius)} stroke={c.color} strokeWidth={c.strokeWidth} />;
    }

    if (shape.tool === "line") {
      const l = shape as LineShape;
      return <Line key={l.id} points={l.points} stroke={l.color} strokeWidth={l.strokeWidth} lineCap="round" lineJoin="round" />;
    }

    if (shape.tool === "text") {
      const t = shape as TextShape;
      return (
        <KonvaText
          key={t.id}
          x={t.x}
          y={t.y}
          text={t.text}
          fontSize={t.fontSize}
          fontFamily={t.fontFamily}
          fontStyle={t.fontStyle || "normal"}
          fill={t.color}
          onDblClick={() => handleDoubleClick(t)}
        />
      );
    }

    return null;
  };

  // ---------- Tool button component ----------
  const ToolButton = ({ icon: Icon, label, toolType }: { icon: any; label: string; toolType: Tool }) => (
    <button
      onClick={() => setTool(toolType)}
      className={`flex items-center gap-3 w-full text-sm px-3 py-2 rounded-md transition-all ${
        tool === toolType ? "bg-cyan-600 text-white shadow-md" : "bg-white hover:bg-gray-50 text-gray-700"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  // ---------- JSX ----------
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* ---------- TOP NAV / TOOLBAR ---------- */}
      <div className="flex items-center justify-between px-4 py-3 bg-white shadow sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold">CV</div>
            <div>
              <div className="text-sm font-semibold">Canvas Editor</div>
              <div className="text-xs text-gray-500">Quick drawing & annotation</div>
            </div>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleUndo}
              disabled={shapes.length === 0}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
                shapes.length === 0 ? "bg-gray-100 text-gray-300" : "bg-white hover:bg-gray-50 text-gray-700 shadow-sm"
              }`}
            >
              <Undo className="w-4 h-4" />
              <span className="text-xs">Undo</span>
            </button>
            <button
              onClick={handleRedo}
              disabled={history.length === 0}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
                history.length === 0 ? "bg-gray-100 text-gray-300" : "bg-white hover:bg-gray-50 text-gray-700 shadow-sm"
              }`}
            >
              <Redo className="w-4 h-4" />
              <span className="text-xs">Redo</span>
            </button>
          </div>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-200 mx-3" />

          {/* Font controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Type className="w-4 h-4" />
              <span className="text-xs font-medium">Font</span>
            </div>

            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="text-sm px-2 py-1 rounded-md border bg-white"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={8}
              max={128}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-20 px-2 py-1 rounded-md border text-sm"
              aria-label="Font size"
            />

            <div className="text-xs text-gray-500"> (applies to new text)</div>
          </div>
        </div>

        {/* Right: Save / Export / Clear */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
          >
            <Save className="w-4 h-4" />
            <span className="text-xs">Save</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            <span className="text-xs">Export</span>
          </button>

          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-500 text-white hover:bg-red-600"
          >
            <span className="text-xs">Clear</span>
          </button>
        </div>
      </div>

      {/* ---------- MAIN AREA: Sidebar + Canvas ---------- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (simplified) */}
        <div className="w-64 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Tools</h3>

          <div className="space-y-2 mb-6">
            <ToolButton icon={Pencil} label="Pencil" toolType="pencil" />
            <ToolButton icon={Highlighter} label="Highlighter" toolType="highlighter" />
            <ToolButton icon={Eraser} label="Eraser" toolType="eraser" />
            <ToolButton icon={Square} label="Rectangle" toolType="rectangle" />
            <ToolButton icon={Circle} label="Circle" toolType="circle" />
            <ToolButton icon={Minus} label="Line" toolType="line" />
            <ToolButton icon={Type} label="Text" toolType="text" />
          </div>

          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Colors</h3>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-10 h-10 rounded-md transition ${color === c ? "ring-2 ring-cyan-500 scale-105" : "hover:scale-105"}`}
                aria-label={`Select ${c}`}
              />
            ))}
          </div>

          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Sizes</h3>
          <div className="mb-4">
            <div className="text-xs text-gray-600 mb-1">Pen</div>
            <input type="range" min={1} max={40} value={penSize} onChange={(e) => setPenSize(Number(e.target.value))} className="w-full" />
            <div className="text-xs text-gray-500 mt-1">{penSize}px</div>
          </div>

          <div>
            <div className="text-xs text-gray-600 mb-1">Eraser</div>
            <input type="range" min={8} max={80} value={eraserSize} onChange={(e) => setEraserSize(Number(e.target.value))} className="w-full" />
            <div className="text-xs text-gray-500 mt-1">{eraserSize}px</div>
          </div>
        </div>

        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 bg-white relative" style={{ cursor: isDrawing ? "crosshair" : "default" }}>
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
            <Layer>
              {shapes.map((s) => {
                return renderShape(s);
              })}
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}
