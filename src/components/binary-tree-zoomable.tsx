"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { BinaryTreeGraph, type TreePerson } from "./binary-tree-graph";
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw, Move } from "lucide-react";

type Props = {
  people: TreePerson[];
  allowNodeClick?: boolean;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;

export function BinaryTreeZoomable({ people, allowNodeClick = true }: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP)), []);
  const reset = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  // Wheel zoom
  function handleWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return; // require ctrl/cmd + wheel
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
  }

  // Pan via drag
  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    // Only pan when clicking on background area, not on tree nodes
    const target = e.target as HTMLElement;
    if (target.closest("a, button")) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.preventDefault();
  }
  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
    }
    function onUp() { setDragging(false); dragStart.current = null; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  // Escape exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsFullscreen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isFullscreen]);

  const controls = (
    <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur rounded-lg shadow-md border border-slate-200 p-1">
      <button
        onClick={zoomIn}
        className="h-8 w-8 rounded-md hover:bg-muted grid place-items-center text-slate-700 transition-colors"
        title="Zoom in"
        type="button"
      >
        <ZoomIn className="h-4 w-4" />
      </button>
      <div className="px-2 text-xs font-mono tabular-nums text-muted-foreground select-none w-12 text-center">
        {Math.round(zoom * 100)}%
      </div>
      <button
        onClick={zoomOut}
        className="h-8 w-8 rounded-md hover:bg-muted grid place-items-center text-slate-700 transition-colors"
        title="Zoom out"
        type="button"
      >
        <ZoomOut className="h-4 w-4" />
      </button>
      <div className="w-px h-5 bg-slate-200 mx-1" />
      <button
        onClick={reset}
        className="h-8 w-8 rounded-md hover:bg-muted grid place-items-center text-slate-700 transition-colors"
        title="Reset view"
        type="button"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <button
        onClick={() => setIsFullscreen((v) => !v)}
        className="h-8 w-8 rounded-md hover:bg-muted grid place-items-center text-brand-700 transition-colors"
        title={isFullscreen ? "Exit fullscreen" : "Expand"}
        type="button"
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );

  const hint = (
    <div className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1.5 bg-white/90 backdrop-blur rounded-md px-2.5 py-1 text-[10px] text-muted-foreground border border-slate-200 select-none">
      <Move className="h-3 w-3" />
      Drag to pan · Ctrl/Cmd + scroll to zoom
    </div>
  );

  const tree = (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      className="relative overflow-hidden"
      style={{
        cursor: dragging ? "grabbing" : "grab",
        height: isFullscreen ? "calc(100vh - 0px)" : "70vh",
        background: "linear-gradient(180deg, rgba(220,252,231,0.25) 0%, rgba(255,255,255,1) 60%)",
      }}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: "fit-content",
          willChange: "transform",
          transition: dragging ? "none" : "transform 0.15s ease-out",
        }}
      >
        <BinaryTreeGraph people={people} allowNodeClick={allowNodeClick} />
      </div>
      {controls}
      {hint}
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        {tree}
      </div>
    );
  }
  return <div className="card overflow-hidden">{tree}</div>;
}
