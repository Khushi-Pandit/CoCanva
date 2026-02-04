'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Toolbar } from './components/toolbar';
import { TopControls } from './components/topControls';
import {
  Point,
  Stroke,
  Shape,
  DrawableElement,
  ToolMode,
  StrokeType,
  ShapeType,
  Viewport,
  CanvasState,
  ExportFormat,
} from './core/types';
import {
  generateId,
  calculateBounds,
  isPointNearStroke,
  simplifyStroke,
  screenToCanvas,
  throttle,
} from './core/utils';
import {
  useHistory,
  useViewport,
  useKeyboardShortcuts,
  useAutoSave,
  useSelection,
} from './core/hooks';
import { handleExport } from './core/export';
import { Share2, X } from 'lucide-react';

export default function InfiniteWhiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [elements, setElements] = useState<DrawableElement[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolMode>('draw');
  const [currentStrokeType, setCurrentStrokeType] = useState<StrokeType>('pen');
  const [currentShape, setCurrentShape] = useState<ShapeType>('rectangle');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [opacity, setOpacity] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Drawing state
  const currentStroke = useRef<Point[]>([]);
  const shapeStart = useRef<Point | null>(null);
  const panStart = useRef<Point | null>(null);

  // Custom hooks
  const { addToHistory, undo, redo, canUndo, canRedo } = useHistory();
  const { viewport, zoom, pan, reset: resetViewport, setZoom } = useViewport();
  const { selectedIds, select, clearSelection, toggleSelect } = useSelection();

  // Auto-save
  const getCanvasState = useCallback((): CanvasState => ({
    version: '1.0.0',
    elements,
    viewport,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }), [elements, viewport]);

  const { lastSaved, save: triggerSave } = useAutoSave(getCanvasState);

  // Canvas drawing functions
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, vp: Viewport) => {
    const gridSize = 50;
    const startX = Math.floor((-vp.x / vp.zoom) / gridSize) * gridSize;
    const startY = Math.floor((-vp.y / vp.zoom) / gridSize) * gridSize;
    const endX = startX + (ctx.canvas.width / vp.zoom) + gridSize;
    const endY = startY + (ctx.canvas.height / vp.zoom) + gridSize;

    ctx.save();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1 / vp.zoom;
    ctx.beginPath();

    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }

    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }

    ctx.stroke();
    ctx.restore();
  }, []);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;

    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = stroke.opacity;

    // Apply different stroke styles based on type
    if (stroke.type === 'pencil') {
      ctx.globalAlpha *= 0.7;
      ctx.lineWidth *= 0.8;
    } else if (stroke.type === 'marker') {
      ctx.globalAlpha *= 0.6;
      ctx.lineWidth *= 1.5;
    } else if (stroke.type === 'brush') {
      ctx.lineWidth *= 1.2;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }

    ctx.stroke();
    ctx.restore();
  }, []);

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: Shape) => {
    ctx.save();
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.strokeWidth;
    ctx.globalAlpha = shape.opacity;

    if (shape.fillColor) {
      ctx.fillStyle = shape.fillColor;
    }

    ctx.beginPath();

    switch (shape.type) {
      case 'rectangle':
        ctx.rect(shape.x, shape.y, shape.width, shape.height);
        break;
      case 'circle':
        const radius = Math.min(Math.abs(shape.width), Math.abs(shape.height)) / 2;
        ctx.arc(
          shape.x + shape.width / 2,
          shape.y + shape.height / 2,
          radius,
          0,
          Math.PI * 2
        );
        break;
      case 'triangle':
        ctx.moveTo(shape.x + shape.width / 2, shape.y);
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
        ctx.lineTo(shape.x, shape.y + shape.height);
        ctx.closePath();
        break;
      case 'diamond':
        ctx.moveTo(shape.x + shape.width / 2, shape.y);
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height / 2);
        ctx.lineTo(shape.x + shape.width / 2, shape.y + shape.height);
        ctx.lineTo(shape.x, shape.y + shape.height / 2);
        ctx.closePath();
        break;
      case 'line':
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
        break;
      case 'arrow':
        const headLength = 15;
        const angle = Math.atan2(shape.height, shape.width);
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
        ctx.lineTo(
          shape.x + shape.width - headLength * Math.cos(angle - Math.PI / 6),
          shape.y + shape.height - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(shape.x + shape.width, shape.y + shape.height);
        ctx.lineTo(
          shape.x + shape.width - headLength * Math.cos(angle + Math.PI / 6),
          shape.y + shape.height - headLength * Math.sin(angle + Math.PI / 6)
        );
        break;
    }

    if (shape.fillColor) {
      ctx.fill();
    }
    ctx.stroke();
    ctx.restore();
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply viewport transformation
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx, viewport);
    }

    // Draw all elements
    elements.forEach((element) => {
      if ('points' in element) {
        drawStroke(ctx, element as Stroke);
      } else if ('type' in element && 'x' in element) {
        drawShape(ctx, element as Shape);
      }
    });

    // Draw current stroke while drawing
    if (isDrawing && currentStroke.current.length > 0) {
      const tempStroke: Stroke = {
        id: 'temp',
        type: currentStrokeType,
        points: currentStroke.current,
        color: currentColor,
        width: strokeWidth,
        opacity,
        timestamp: Date.now(),
      };
      drawStroke(ctx, tempStroke);
    }

    // Draw current shape while drawing
    if (isDrawing && shapeStart.current && currentTool === 'shape') {
      const current = screenToCanvas(
        currentStroke.current[currentStroke.current.length - 1]?.x || 0,
        currentStroke.current[currentStroke.current.length - 1]?.y || 0,
        viewport
      );
      const tempShape: Shape = {
        id: 'temp',
        type: currentShape,
        x: Math.min(shapeStart.current.x, current.x),
        y: Math.min(shapeStart.current.y, current.y),
        width: Math.abs(current.x - shapeStart.current.x),
        height: Math.abs(current.y - shapeStart.current.y),
        color: currentColor,
        strokeWidth,
        opacity,
        rotation: 0,
        timestamp: Date.now(),
      };
      drawShape(ctx, tempShape);
    }

    // Draw selection boxes
    if (selectedIds.size > 0) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2 / viewport.zoom;
      ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
      
      elements.forEach((element) => {
        if (selectedIds.has(element.id)) {
          if ('bounds' in element && element.bounds) {
            const { minX, minY, maxX, maxY } = element.bounds;
            const padding = 5;
            ctx.strokeRect(
              minX - padding,
              minY - padding,
              maxX - minX + padding * 2,
              maxY - minY + padding * 2
            );
          }
        }
      });
      
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [
    elements,
    viewport,
    showGrid,
    isDrawing,
    currentStroke,
    currentStrokeType,
    currentColor,
    strokeWidth,
    opacity,
    selectedIds,
    currentTool,
    currentShape,
    shapeStart,
    drawGrid,
    drawStroke,
    drawShape,
  ]);

  // Resize handler
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      
      redrawCanvas();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redrawCanvas]);

  // Redraw on changes
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = screenToCanvas(screenX, screenY, viewport);

    if (currentTool === 'pan' || (e.button === 1) || (e.shiftKey && currentTool === 'draw')) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (currentTool === 'select') {
      // Check if clicking on an existing element
      let foundElement = false;
      for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        if ('points' in element && isPointNearStroke(canvasPoint, element as Stroke, 10)) {
          toggleSelect(element.id);
          foundElement = true;
          break;
        }
      }
      if (!foundElement) {
        clearSelection();
      }
      return;
    }

    if (currentTool === 'shape') {
      setIsDrawing(true);
      shapeStart.current = canvasPoint;
      currentStroke.current = [{ x: screenX, y: screenY }];
      return;
    }

    if (currentTool === 'draw') {
      setIsDrawing(true);
      currentStroke.current = [canvasPoint];
    }
  }, [currentTool, viewport, elements, toggleSelect, clearSelection, currentShape]);

  const handleMouseMove = useCallback(
    throttle((e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      if (isPanning && panStart.current) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        pan(dx, dy);
        panStart.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (!isDrawing) return;

      const canvasPoint = screenToCanvas(screenX, screenY, viewport);

      if (currentTool === 'shape') {
        currentStroke.current = [currentStroke.current[0], { x: screenX, y: screenY }];
        redrawCanvas();
        return;
      }

      if (currentTool === 'draw') {
        currentStroke.current.push(canvasPoint);
        redrawCanvas();
      }
    }, 16),
    [isDrawing, isPanning, currentTool, viewport, pan, redrawCanvas]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      panStart.current = null;
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentTool === 'shape' && shapeStart.current && currentStroke.current.length >= 2) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const end = screenToCanvas(
        currentStroke.current[1].x,
        currentStroke.current[1].y,
        viewport
      );
      
      const newShape: Shape = {
        id: generateId(),
        type: currentShape,
        x: Math.min(shapeStart.current.x, end.x),
        y: Math.min(shapeStart.current.y, end.y),
        width: Math.abs(end.x - shapeStart.current.x),
        height: Math.abs(end.y - shapeStart.current.y),
        color: currentColor,
        strokeWidth,
        opacity,
        rotation: 0,
        timestamp: Date.now(),
      };

      setElements((prev) => [...prev, newShape]);
      addToHistory({
        type: 'add',
        elements: [newShape],
        timestamp: Date.now(),
      });
      
      shapeStart.current = null;
      currentStroke.current = [];
      return;
    }

    if (currentTool === 'draw' && currentStroke.current.length > 1) {
      const simplified = simplifyStroke(currentStroke.current, 2);
      const newStroke: Stroke = {
        id: generateId(),
        type: currentStrokeType,
        points: simplified,
        color: currentColor,
        width: strokeWidth,
        opacity,
        timestamp: Date.now(),
        bounds: calculateBounds(simplified),
      };

      // Handle eraser
      if (currentStrokeType === 'eraser') {
        const remainingElements = elements.filter((element) => {
          if ('points' in element) {
            return !newStroke.points.some((point) =>
              isPointNearStroke(point, element as Stroke, strokeWidth / 2)
            );
          }
          return true;
        });
        setElements(remainingElements);
      } else {
        setElements((prev) => [...prev, newStroke]);
        addToHistory({
          type: 'add',
          elements: [newStroke],
          timestamp: Date.now(),
        });
      }
    }

    currentStroke.current = [];
  }, [
    isDrawing,
    isPanning,
    currentTool,
    currentStrokeType,
    currentColor,
    strokeWidth,
    opacity,
    elements,
    viewport,
    addToHistory,
    currentShape,
  ]);

  // Wheel handler for zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = e.clientX - rect.left;
    const centerY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoom(delta, centerX, centerY);
  }, [zoom]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onUndo: () => {
      const action = undo();
      if (action && action.type === 'add') {
        setElements((prev) => prev.slice(0, -action.elements.length));
      }
    },
    onRedo: () => {
      const action = redo();
      if (action && action.type === 'add') {
        setElements((prev) => [...prev, ...action.elements]);
      }
    },
    onDelete: () => {
      if (selectedIds.size > 0) {
        setElements((prev) => prev.filter((el) => !selectedIds.has(el.id)));
        clearSelection();
      }
    },
    onZoomIn: () => zoom(0.1, window.innerWidth / 2, window.innerHeight / 2),
    onZoomOut: () => zoom(-0.1, window.innerWidth / 2, window.innerHeight / 2),
    onResetZoom: resetViewport,
    onSave: triggerSave,
    onToggleGrid: () => setShowGrid((prev) => !prev),
    onSwitchToPen: () => {
      setCurrentTool('draw');
      setCurrentStrokeType('pen');
    },
    onSwitchToEraser: () => {
      setCurrentTool('draw');
      setCurrentStrokeType('eraser');
    },
    onSwitchToSelect: () => setCurrentTool('select'),
    onSwitchToPan: () => setCurrentTool('pan'),
  });

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear the entire canvas?')) {
      setElements([]);
      clearSelection();
    }
  };

  const handleExportWrapper = (format: ExportFormat) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    handleExport(format, canvas, elements, viewport, getCanvasState());
  };

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden"
      style={{
        cursor:
          currentTool === 'pan' || isPanning
            ? 'grab'
            : currentTool === 'draw'
            ? 'crosshair'
            : currentTool === 'select'
            ? 'default'
            : 'crosshair',
      }}
    >
      {/* Toolbar */}
      <Toolbar
        currentTool={currentTool}
        currentStrokeType={currentStrokeType}
        currentShape={currentShape}
        currentColor={currentColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
        onToolChange={setCurrentTool}
        onStrokeTypeChange={setCurrentStrokeType}
        onShapeChange={setCurrentShape}
        onColorChange={setCurrentColor}
        onStrokeWidthChange={setStrokeWidth}
        onOpacityChange={setOpacity}
      />

      {/* Top Controls */}
      <TopControls
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => {
          const action = undo();
          if (action && action.type === 'add') {
            setElements((prev) => prev.slice(0, -action.elements.length));
          }
        }}
        onRedo={() => {
          const action = redo();
          if (action && action.type === 'add') {
            setElements((prev) => [...prev, ...action.elements]);
          }
        }}
        zoom={viewport.zoom}
        onZoomIn={() => zoom(0.1, window.innerWidth / 2, window.innerHeight / 2)}
        onZoomOut={() => zoom(-0.1, window.innerWidth / 2, window.innerHeight / 2)}
        onResetZoom={resetViewport}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((prev) => !prev)}
        onExport={handleExportWrapper}
        onShare={() => setShowShareDialog(true)}
        onClearAll={handleClearAll}
        onSave={triggerSave}
        lastSaved={lastSaved}
      />

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full"
      />

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Share2 size={20} />
                Share Canvas
              </h3>
              <button
                onClick={() => setShowShareDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Share functionality will be implemented with backend integration. Features will
              include:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 mb-4">
              <li>• View-only links</li>
              <li>• Edit access sharing</li>
              <li>• Private/Password protected</li>
              <li>• Real-time collaboration</li>
            </ul>
            <button
              onClick={() => setShowShareDialog(false)}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      {/* <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 text-xs text-gray-600 max-w-xs">
        <div className="font-semibold mb-2">Shortcuts</div>
        <div className="space-y-1">
          <div>P - Pen | E - Eraser | V - Select | H - Pan</div>
          <div>Ctrl+Z - Undo | Ctrl+Y - Redo</div>
          <div>Ctrl+/- - Zoom | Ctrl+0 - Reset</div>
          <div>Ctrl+G - Grid | Ctrl+S - Save</div>
        </div>
      </div> */}
    </div>
  );
}