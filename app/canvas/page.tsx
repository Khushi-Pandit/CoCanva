"use client";

import { useEffect, useRef, useState } from "react";
import { 
  Pencil, 
  Highlighter, 
  Eraser, 
  Trash2, 
  Download, 
  Undo2, 
  Redo2,
  Circle,
  Square,
  Minus,
  Type,
  Palette,
  Settings,
  Save,
  Folder,
  Share2,
  Zap,
  Eye,
  Grid3X3,
  Ruler,
  MousePointer2,
  PaintBucket,
  Sparkles
} from "lucide-react";

type Tool = "select" | "pencil" | "highlighter" | "eraser" | "line" | "circle" | "rectangle" | "text" | "fill";

export default function EnhancedCanvasUI() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState<string>("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [opacity, setOpacity] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [showRuler, setShowRuler] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);

  // Enhanced color palette
  const colors = [
    // Basic colors
    "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff",
    // Grays
    "#808080", "#c0c0c0", "#404040", "#a0a0a0",
    // Popular colors
    "#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899", 
    "#06b6d4", "#84cc16", "#f97316", "#6366f1"
  ];

  const tools = [
    { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
    { id: "pencil", icon: Pencil, label: "Pencil", shortcut: "P" },
    { id: "highlighter", icon: Highlighter, label: "Highlighter", shortcut: "H" },
    { id: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" },
    { id: "line", icon: Minus, label: "Line", shortcut: "L" },
    { id: "circle", icon: Circle, label: "Circle", shortcut: "O" },
    { id: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
    { id: "text", icon: Type, label: "Text", shortcut: "T" },
    { id: "fill", icon: PaintBucket, label: "Fill", shortcut: "F" },
  ];

  const brushSizes = [1, 2, 3, 5, 8, 12, 16, 20, 25, 30];

  /** Save state to history */
  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  /** Undo action */
  const undo = () => {
    if (historyIndex <= 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setHistoryIndex(historyIndex - 1);
    ctx.putImageData(history[historyIndex - 1], 0, 0);
  };

  /** Redo action */
  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setHistoryIndex(historyIndex + 1);
    ctx.putImageData(history[historyIndex + 1], 0, 0);
  };

  /** Draw grid */
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!showGrid) return;
    
    ctx.save();
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.5;
    
    const gridSize = 20;
    
    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    ctx.restore();
  };

  /** Setup canvas */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = window.innerWidth;
      const cssHeight = window.innerHeight;

      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // White background
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      ctx.restore();

      // Draw grid if enabled
      drawGrid(ctx, cssWidth, cssHeight);

      // Save initial state
      if (history.length === 0) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([imageData]);
        setHistoryIndex(0);
      }
    };

    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, [showGrid]);

  /** Apply drawing settings */
  const applyStrokeSettings = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = opacity;

    switch (tool) {
      case "pencil":
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        break;
      case "highlighter":
        ctx.globalCompositeOperation = "multiply";
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize * 3;
        ctx.globalAlpha = 0.3;
        break;
      case "eraser":
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = brushSize * 2;
        break;
      case "line":
      case "circle":
      case "rectangle":
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        break;
    }
  };

  /** Get mouse/touch position */
  const getEventPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return { 
      x: clientX - rect.left, 
      y: clientY - rect.top 
    };
  };

  /** Drawing handlers */
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault();
    
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const { x, y } = getEventPos(e);
    
    if (tool === "pencil" || tool === "highlighter" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault();
    
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    applyStrokeSettings(ctx);
    const { x, y } = getEventPos(e);
    
    if (tool === "pencil" || tool === "highlighter" || tool === "eraser") {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'touches' in e) e.preventDefault();
    
    if (isDrawing) {
      saveToHistory();
    }
    setIsDrawing(false);
  };

  /** Actions */
  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    if (showGrid) {
      drawGrid(ctx, canvasRef.current.width, canvasRef.current.height);
    }
    
    saveToHistory();
  };

  const saveImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `canvasly-drawing-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  /** Keyboard shortcuts */
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case "s":
            e.preventDefault();
            saveImage();
            break;
        }
      } else {
        switch (e.key.toLowerCase()) {
          case "v": setTool("select"); break;
          case "p": setTool("pencil"); break;
          case "h": setTool("highlighter"); break;
          case "e": setTool("eraser"); break;
          case "l": setTool("line"); break;
          case "o": setTool("circle"); break;
          case "r": setTool("rectangle"); break;
          case "t": setTool("text"); break;
          case "f": setTool("fill"); break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [historyIndex, history]);

  return (
    <div className="w-screen h-screen bg-gray-50 relative overflow-hidden">
      {/* Top Menu Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-30 flex items-center justify-between px-6">
        {/* Logo & File Menu */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Palette className="w-8 h-8 text-cyan-500" />
            <span className="text-xl font-bold text-gray-900">Canvasly</span>
          </div>
          
          <div className="h-6 w-px bg-gray-300" />
          
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Folder size={16} />
              <span>File</span>
            </button>
            <button className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings size={16} />
              <span>Edit</span>
            </button>
            <button className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Eye size={16} />
              <span>View</span>
            </button>
          </div>
        </div>

        {/* Center Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={18} />
          </button>
          
          <div className="h-6 w-px bg-gray-300 mx-2" />
          
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-colors ${showGrid ? 'bg-cyan-100 text-cyan-600' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Toggle Grid"
          >
            <Grid3X3 size={18} />
          </button>
          <button
            onClick={() => setShowRuler(!showRuler)}
            className={`p-2 rounded-lg transition-colors ${showRuler ? 'bg-cyan-100 text-cyan-600' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Toggle Ruler"
          >
            <Ruler size={18} />
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={clearCanvas}
            className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            <span>Clear</span>
          </button>
          <button className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Share2 size={16} />
            <span>Share</span>
          </button>
          <button 
            onClick={saveImage}
            className="flex items-center space-x-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            <Save size={16} />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Left Toolbar */}
      <div className={`absolute left-0 top-16 bottom-0 bg-white border-r border-gray-200 shadow-sm z-20 transition-all duration-300 ${isToolbarCollapsed ? 'w-16' : 'w-80'}`}>
        {/* Collapse Button */}
        <button
          onClick={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
          className="absolute -right-3 top-4 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 shadow-sm"
        >
          <span className="text-xs">{isToolbarCollapsed ? '→' : '←'}</span>
        </button>

        <div className="p-4 h-full overflow-y-auto">
          {!isToolbarCollapsed ? (
            <>
              {/* Tools Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Tools</h3>
                <div className="grid grid-cols-3 gap-2">
                  {tools.map(({ id, icon: Icon, label, shortcut }) => (
                    <button
                      key={id}
                      onClick={() => setTool(id as Tool)}
                      className={`group relative p-3 rounded-xl border-2 transition-all ${
                        tool === id 
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-600' 
                          : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                      title={`${label} (${shortcut})`}
                    >
                      <Icon size={20} className="mx-auto" />
                      <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {shortcut}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Palette */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Colors</h3>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        color === c ? 'border-cyan-500 scale-110' : 'border-gray-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
              </div>

              {/* Brush Settings */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Brush</h3>
                
                {/* Size */}
                <div className="mb-4">
                  <label className="text-xs text-gray-600 mb-2 block">Size: {brushSize}px</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="flex-1"
                    />
                    <div 
                      className="w-6 h-6 bg-gray-800 rounded-full"
                      style={{ 
                        width: Math.max(4, Math.min(24, brushSize)), 
                        height: Math.max(4, Math.min(24, brushSize)) 
                      }}
                    />
                  </div>
                </div>

                {/* Opacity */}
                <div className="mb-4">
                  <label className="text-xs text-gray-600 mb-2 block">Opacity: {Math.round(opacity * 100)}%</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Quick Sizes */}
                <div>
                  <label className="text-xs text-gray-600 mb-2 block">Quick Sizes</label>
                  <div className="flex flex-wrap gap-2">
                    {[3, 8, 16, 25].map(size => (
                      <button
                        key={size}
                        onClick={() => setBrushSize(size)}
                        className={`px-2 py-1 text-xs rounded ${
                          brushSize === size ? 'bg-cyan-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {size}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Layers Panel */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Layers</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Background</span>
                    <Eye size={14} className="text-gray-400" />
                  </div>
                </div>
              </div>

              {/* AI Tools */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Sparkles size={16} className="mr-1 text-cyan-500" />
                  AI Tools
                </h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <Zap size={16} />
                    <span>Auto Enhance</span>
                  </button>
                  <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <Sparkles size={16} />
                    <span>Magic Fill</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Collapsed toolbar
            <div className="space-y-4">
              {tools.slice(0, 6).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setTool(id as Tool)}
                  className={`w-full p-2 rounded-lg transition-all ${
                    tool === id 
                      ? 'bg-cyan-500 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={label}
                >
                  <Icon size={18} className="mx-auto" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className={`absolute top-16 right-0 bottom-0 ${isToolbarCollapsed ? 'left-16' : 'left-80'}`}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gray-100 border-t border-gray-200 flex items-center justify-between px-4 text-xs text-gray-600">
        <div className="flex items-center space-x-4">
          <span>Tool: {tool}</span>
          <span>Size: {brushSize}px</span>
          <span>Color: {color}</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Canvas: 1920×1080</span>
          <span>Zoom: 100%</span>
        </div>
      </div>
    </div>
  );
}