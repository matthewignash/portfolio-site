"use client";

import type { DiffPathway } from "@/lib/learning-hub-types";

// --- Pathway → color ---
const PATHWAY_COLORS: Record<DiffPathway, string> = {
  scaffolded: "#22c55e",
  standard: "#3b82f6",
  enrichment: "#a855f7",
};

export interface HexConnectionProps {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isPreview?: boolean;
  isHighlighted?: boolean;
  showDifferentiation?: boolean;
  pathway?: DiffPathway;
}

// Offset start/end points to hex edge (~40px radius)
function offsetPoint(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  offset: number
): [number, number] {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return [fromX, fromY];
  return [fromX + (dx / dist) * offset, fromY + (dy / dist) * offset];
}

export default function HexConnection({
  id,
  fromX,
  fromY,
  toX,
  toY,
  isPreview = false,
  isHighlighted = false,
  showDifferentiation = false,
  pathway,
}: HexConnectionProps) {
  const HEX_EDGE_OFFSET = 42;

  const [sx, sy] = offsetPoint(fromX, fromY, toX, toY, HEX_EDGE_OFFSET);
  const [ex, ey] = offsetPoint(toX, toY, fromX, fromY, HEX_EDGE_OFFSET);

  // Quadratic bezier control point: perpendicular offset for slight curve
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const dx = ex - sx;
  const dy = ey - sy;
  const perpX = -dy * 0.1;
  const perpY = dx * 0.1;
  const cx = mx + perpX;
  const cy = my + perpY;

  const pathD = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;

  // Determine color based on differentiation overlay state
  let strokeColor: string;
  let strokeWidth: number;
  let opacity: number;
  let markerEnd: string;

  if (isPreview) {
    strokeColor = "#00f0ff";
    strokeWidth = 2;
    opacity = 0.6;
    markerEnd = "url(#arrowhead-preview)";
  } else if (showDifferentiation && pathway) {
    strokeColor = PATHWAY_COLORS[pathway];
    strokeWidth = 2.5;
    opacity = 0.85;
    markerEnd = `url(#arrowhead-${pathway})`;
  } else if (showDifferentiation && !pathway) {
    // Dim connections without pathway when overlay is active
    strokeColor = "#5a5a7a";
    strokeWidth = 1.5;
    opacity = 0.2;
    markerEnd = "url(#arrowhead)";
  } else if (isHighlighted) {
    strokeColor = "#a855f7";
    strokeWidth = 2.5;
    opacity = 0.8;
    markerEnd = "url(#arrowhead)";
  } else {
    strokeColor = "#5a5a7a";
    strokeWidth = 2;
    opacity = 0.8;
    markerEnd = "url(#arrowhead)";
  }

  const strokeDash = isPreview ? "6 4" : undefined;

  return (
    <path
      id={`conn-${id}`}
      d={pathD}
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDash}
      opacity={opacity}
      markerEnd={markerEnd}
      style={{ pointerEvents: "none" }}
    />
  );
}
