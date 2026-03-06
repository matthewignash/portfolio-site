"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import type { Hex, HexConnection as HexConnectionType } from "@/lib/learning-hub-types";
import HexNode from "./HexNode";
import HexConnection from "./HexConnection";

export interface HexCanvasProps {
  hexes: Hex[];
  connections: HexConnectionType[];
  selectedHexId: string | null;
  progressMap?: Record<string, "complete" | "active" | "locked">;
  showDifferentiation?: boolean;
  onHexClick: (hexId: string) => void;
  onHexDragStart?: (hexId: string, e: React.MouseEvent) => void;
  connectionPreview?: {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  } | null;
}

const PADDING = 80;
const MIN_WIDTH = 600;
const MIN_HEIGHT = 400;

export default function HexCanvas({
  hexes,
  connections,
  selectedHexId,
  progressMap,
  showDifferentiation = false,
  onHexClick,
  onHexDragStart,
  connectionPreview,
}: HexCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Calculate viewBox from hex positions
  const bounds = useMemo(() => {
    if (hexes.length === 0) return { minX: 0, minY: 0, width: MIN_WIDTH, height: MIN_HEIGHT };
    const xs = hexes.map((h) => h.x);
    const ys = hexes.map((h) => h.y);
    const minX = Math.min(...xs) - PADDING;
    const minY = Math.min(...ys) - PADDING;
    const maxX = Math.max(...xs) + PADDING;
    const maxY = Math.max(...ys) + PADDING;
    return {
      minX,
      minY,
      width: Math.max(maxX - minX, MIN_WIDTH),
      height: Math.max(maxY - minY, MIN_HEIGHT),
    };
  }, [hexes]);

  // Build hex lookup for connection rendering
  const hexMap = useMemo(() => {
    const m = new Map<string, Hex>();
    for (const h of hexes) m.set(h.id, h);
    return m;
  }, [hexes]);

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Only pan on empty space (not on hex nodes)
      if ((e.target as Element).tagName === "svg" || (e.target as Element).classList.contains("canvas-bg")) {
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      }
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const viewBox = `${bounds.minX - pan.x} ${bounds.minY - pan.y} ${bounds.width} ${bounds.height}`;

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className="w-full rounded-lg border border-dark-border"
      style={{
        minHeight: MIN_HEIGHT,
        maxHeight: 600,
        background: "#06060e",
        cursor: isPanning ? "grabbing" : "grab",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Arrowhead marker definitions */}
      <defs>
        {/* Default arrowhead */}
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#5a5a7a" />
        </marker>
        {/* Preview arrowhead */}
        <marker
          id="arrowhead-preview"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#00f0ff" />
        </marker>
        {/* Pathway arrowheads */}
        <marker
          id="arrowhead-scaffolded"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
        </marker>
        <marker
          id="arrowhead-standard"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
        </marker>
        <marker
          id="arrowhead-enrichment"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
        </marker>
      </defs>

      {/* Background rect for click targeting */}
      <rect
        className="canvas-bg"
        x={bounds.minX - pan.x - 1000}
        y={bounds.minY - pan.y - 1000}
        width={bounds.width + 2000}
        height={bounds.height + 2000}
        fill="transparent"
      />

      {/* Connections */}
      {connections.map((conn) => {
        const from = hexMap.get(conn.fromHexId);
        const to = hexMap.get(conn.toHexId);
        if (!from || !to) return null;
        return (
          <HexConnection
            key={conn.id}
            id={conn.id}
            fromX={from.x}
            fromY={from.y}
            toX={to.x}
            toY={to.y}
            showDifferentiation={showDifferentiation}
            pathway={conn.pathway}
          />
        );
      })}

      {/* Connection preview */}
      {connectionPreview && (
        <HexConnection
          id="preview"
          fromX={connectionPreview.fromX}
          fromY={connectionPreview.fromY}
          toX={connectionPreview.toX}
          toY={connectionPreview.toY}
          isPreview
        />
      )}

      {/* Hex nodes */}
      {hexes.map((hex) => (
        <HexNode
          key={hex.id}
          hex={hex}
          isSelected={selectedHexId === hex.id}
          progressState={progressMap?.[hex.id] ?? null}
          showDifferentiation={showDifferentiation}
          onClick={onHexClick}
          onDragStart={onHexDragStart}
        />
      ))}
    </svg>
  );
}
