"use client";

import { useEffect, useRef, useState } from "react";

type Tool = "pencil" | "highlighter" | "eraser";

export default function CanvasScreen() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState<string>("#000000");

  // Preset colors shown in the palette
  const colors = ["#000000", "#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#a855f7"];

  /** Resize the canvas to full-viewport and account for devicePixelRatio for sharp lines */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = window.innerWidth;
      const cssHeight = window.innerHeight;

      // Set the canvas pixel size scaled by DPR
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);

      // Set the CSS (layout) size
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      // Normalize drawing coordinates
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      ctx.save();
      ctx.fillStyle = "#f9fafb";
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      ctx.restore();
    };

    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, []);

  /** Configure stroke based on selected tool */
  const applyStrokeSettings = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (tool) {
      case "pencil":
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        break;
      case "highlighter":
        ctx.globalAlpha = 0.3;
        ctx.globalCompositeOperation = "multiply"; // nice overlap effect
        ctx.strokeStyle = color;
        ctx.lineWidth = 16;
        break;
      case "eraser":
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "destination-out"; // actually erases
        ctx.lineWidth = 20;
        break;
    }
  };

  /** Helpers to get coordinates for mouse/touch */
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  /** Mouse handlers */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const { x, y } = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    applyStrokeSettings(ctx);
    const { x, y } = getMousePos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleMouseUpLeave = () => setIsDrawing(false);

  /** Touch handlers (mobile/tablet) */
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const { x, y } = getTouchPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    applyStrokeSettings(ctx);
    const { x, y } = getTouchPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  return (
    <div className="w-screen h-screen flex bg-gray-100">
      {/* Left Palette */}
      <aside className="w-24 bg-white border-r border-gray-200 shadow-lg p-3 flex flex-col items-center gap-3">
        {/* Colors */}
        <div className="grid grid-cols-2 gap-2">
          {colors.map((c) => {
            const isActive = c.toLowerCase() === color.toLowerCase() && tool !== "eraser";
            return (
              <button
                key={c}
                aria-label={`color-${c}`}
                className={`w-8 h-8 rounded-full border ${isActive ? "ring-2 ring-emerald-500" : "border-gray-300"}`}
                style={{ backgroundColor: c }}
                onClick={() => {
                  setColor(c);
                  if (tool === "eraser") setTool("pencil");
                }}
              />
            );
          })}
        </div>

        <div className="w-full border-t my-2" />

        {/* Tools */}
        <button
          className={`w-14 h-10 rounded-lg text-xl ${tool === "pencil" ? "bg-gray-200" : "bg-white"} border border-gray-300`}
          onClick={() => setTool("pencil")}
          title="Pencil"
        >
          ✏️
        </button>
        <button
          className={`w-14 h-10 rounded-lg text-xl ${tool === "highlighter" ? "bg-gray-200" : "bg-white"} border border-gray-300`}
          onClick={() => setTool("highlighter")}
          title="Highlighter"
        >
          🖍
        </button>
        <button
          className={`w-14 h-10 rounded-lg text-xl ${tool === "eraser" ? "bg-gray-200" : "bg-white"} border border-gray-300`}
          onClick={() => setTool("eraser")}
          title="Eraser"
        >
          🩹
        </button>
      </aside>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 block cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpLeave}
        onMouseLeave={handleMouseUpLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
}
