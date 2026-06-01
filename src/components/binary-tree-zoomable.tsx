"use client";

import { useState, useRef, useEffect } from "react";
import { BinaryTreeGraph, type TreePerson } from "./binary-tree-graph";
import { Move } from "lucide-react";

type Props = {
  people: TreePerson[];
  allowNodeClick?: boolean;
  maxVisibleDepth?: number;
  drilldownHrefBuilder?: (id: string) => string;
};

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;

// A scroll-first tree viewer that works the same on phones and desktops:
//   • Pan        — swipe (touch) or click-drag / scrollbar / trackpad (desktop)
//   • Zoom       — pinch (touch) or Ctrl/Cmd + wheel (desktop)
// We deliberately drop the on-screen zoom/expand buttons: native gestures
// are what users expect on mobile, and the old buttons did nothing there.
// CSS `zoom` (not transform: scale) is used so the scroll area resizes with
// the content, keeping every node reachable at any zoom level.
export function BinaryTreeZoomable({
  people,
  allowNodeClick = true,
  maxVisibleDepth,
  drilldownHrefBuilder,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinch = useRef<{ startDist: number; startZoom: number } | null>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  function touchDist(touches: React.TouchList) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinch.current = { startDist: touchDist(e.touches), startZoom: zoom };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinch.current) {
      e.preventDefault(); // stop the whole page from pinch-zooming
      const ratio = touchDist(e.touches) / pinch.current.startDist;
      setZoom(clamp(pinch.current.startZoom * ratio));
    }
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinch.current = null;
  }

  // Desktop: Ctrl/Cmd + wheel (trackpad pinch emits this) zooms.
  function onWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) => clamp(z + (e.deltaY > 0 ? -0.1 : 0.1)));
  }

  // Desktop: click-drag the background to pan (ignored when starting on a node).
  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("a, button")) return;
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    setDragging(true);
    e.preventDefault();
  }
  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      const el = scrollRef.current;
      if (!el || !drag.current) return;
      el.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
      el.scrollTop = drag.current.top - (e.clientY - drag.current.y);
    }
    function onUp() { setDragging(false); drag.current = null; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  return (
    <div className="card overflow-hidden relative">
      <div
        ref={scrollRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        className="overflow-auto overscroll-contain"
        style={{
          height: "70vh",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x pan-y",
          cursor: dragging ? "grabbing" : "grab",
          background: "linear-gradient(180deg, rgba(220,252,231,0.25) 0%, rgba(255,255,255,1) 60%)",
        }}
      >
        <div style={{ zoom, width: "fit-content" }}>
          <BinaryTreeGraph
            people={people}
            allowNodeClick={allowNodeClick}
            embedded
            maxVisibleDepth={maxVisibleDepth}
            drilldownHrefBuilder={drilldownHrefBuilder}
          />
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1.5 bg-white/90 backdrop-blur rounded-md px-2.5 py-1 text-[10px] text-muted-foreground border border-slate-200 select-none pointer-events-none">
        <Move className="h-3 w-3" />
        Swipe to move · pinch to zoom
      </div>
    </div>
  );
}

function clamp(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}
