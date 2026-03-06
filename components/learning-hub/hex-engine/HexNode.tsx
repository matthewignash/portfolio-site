"use client";

import type { Hex, DiffPathway } from "@/lib/learning-hub-types";

// --- Hex type → fill color mapping ---
const TYPE_COLORS: Record<string, string> = {
  lesson: "#3b82f6",
  activity: "#22c55e",
  assessment: "#f59e0b",
  resource: "#8b5cf6",
  checkpoint: "#ef4444",
};

// --- Progress state → overlay color ---
const PROGRESS_COLORS: Record<string, string> = {
  complete: "#22c55e",
  active: "#00f0ff",
  locked: "#3a3a5a",
};

// --- Pathway → color ---
const PATHWAY_COLORS: Record<DiffPathway, string> = {
  scaffolded: "#22c55e",
  standard: "#3b82f6",
  enrichment: "#a855f7",
};

const PATHWAY_LABELS: Record<DiffPathway, string> = {
  scaffolded: "SCAFFOLD",
  standard: "STANDARD",
  enrichment: "ENRICH",
};

// --- Flat-top hexagon geometry ---
const HEX_RADIUS = 40; // half-width
const HEX_HEIGHT = HEX_RADIUS * Math.sqrt(3);

function hexPoints(): string {
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    points.push([
      HEX_RADIUS * Math.cos(angle),
      HEX_RADIUS * Math.sin(angle),
    ]);
  }
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

// Slightly larger hex for outer pathway ring
function hexPointsScaled(scale: number): string {
  const r = HEX_RADIUS * scale;
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    points.push([r * Math.cos(angle), r * Math.sin(angle)]);
  }
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

const HEX_POINTS = hexPoints();
const HEX_POINTS_OUTER = hexPointsScaled(1.12);

export interface HexNodeProps {
  hex: Hex;
  isSelected: boolean;
  progressState?: "complete" | "active" | "locked" | null;
  showDifferentiation?: boolean;
  onClick: (hexId: string) => void;
  onDragStart?: (hexId: string, e: React.MouseEvent) => void;
}

export default function HexNode({
  hex,
  isSelected,
  progressState = null,
  showDifferentiation = false,
  onClick,
  onDragStart,
}: HexNodeProps) {
  const baseColor = TYPE_COLORS[hex.type] ?? "#5a5a7a";
  const fillColor = progressState
    ? PROGRESS_COLORS[progressState] ?? baseColor
    : baseColor;
  const fillOpacity = hex.status === "archived" ? 0.3 : progressState === "locked" ? 0.25 : 0.85;
  const strokeColor = isSelected ? "#00f0ff" : "#1e1e40";
  const strokeWidth = isSelected ? 3 : 1.5;
  const strokeDash = hex.status === "draft" ? "4 3" : undefined;

  // Differentiation overlay values
  const pathway = hex.diffPathway;
  const pathwayColor = pathway ? PATHWAY_COLORS[pathway] : undefined;
  const hasDiffOverlay = showDifferentiation && pathway;
  const dimHex = showDifferentiation && !pathway;

  // Split label into up to 2 lines for readability
  const MAX_LINE_CHARS = 16;
  const labelLines: string[] = (() => {
    if (hex.label.length <= MAX_LINE_CHARS) return [hex.label];
    // Find a natural word break near the midpoint
    const mid = Math.floor(hex.label.length / 2);
    let splitIdx = hex.label.lastIndexOf(" ", mid + 4);
    if (splitIdx <= 3) splitIdx = hex.label.indexOf(" ", mid - 4);
    if (splitIdx <= 0 || splitIdx >= hex.label.length - 2) {
      // No good split point — truncate
      return [hex.label.slice(0, MAX_LINE_CHARS - 1) + "\u2026"];
    }
    const line1 = hex.label.slice(0, splitIdx);
    let line2 = hex.label.slice(splitIdx + 1);
    if (line2.length > MAX_LINE_CHARS) line2 = line2.slice(0, MAX_LINE_CHARS - 1) + "\u2026";
    return [line1, line2];
  })();

  return (
    <g
      transform={`translate(${hex.x}, ${hex.y})`}
      onClick={() => onClick(hex.id)}
      onMouseDown={(e) => onDragStart?.(hex.id, e)}
      style={{ cursor: "pointer" }}
      role="button"
      aria-label={hex.label}
      opacity={dimHex ? 0.4 : 1}
    >
      {/* Pathway outer ring (differentiation overlay) */}
      {hasDiffOverlay && pathwayColor && (
        <polygon
          points={HEX_POINTS_OUTER}
          fill="none"
          stroke={pathwayColor}
          strokeWidth={3}
          opacity={0.8}
        />
      )}

      {/* Selection glow */}
      {isSelected && (
        <polygon
          points={HEX_POINTS}
          fill="none"
          stroke="#00f0ff"
          strokeWidth={6}
          opacity={0.3}
          style={{ filter: "blur(4px)" }}
        />
      )}

      {/* Active pulse ring */}
      {progressState === "active" && (
        <polygon
          points={HEX_POINTS}
          fill="none"
          stroke="#00f0ff"
          strokeWidth={4}
          opacity={0.5}
        >
          <animate
            attributeName="opacity"
            values="0.5;0.15;0.5"
            dur="2s"
            repeatCount="indefinite"
          />
        </polygon>
      )}

      {/* Main hex fill */}
      <polygon
        points={HEX_POINTS}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
      />

      {/* Pathway badge label (above hex) */}
      {hasDiffOverlay && pathwayColor && pathway && (
        <text
          y={-HEX_RADIUS * 0.95}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={pathwayColor}
          fontSize={7}
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="0.08em"
          style={{ pointerEvents: "none", userSelect: "none", textTransform: "uppercase" }}
        >
          {PATHWAY_LABELS[pathway]}
        </text>
      )}

      {/* Icon */}
      <text
        y={-6}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={16}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {progressState === "locked" ? "🔒" : progressState === "complete" ? "✅" : hex.icon}
      </text>

      {/* Label — 1 or 2 lines */}
      {labelLines.length === 1 ? (
        <text
          y={18}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#e8e8f0"
          fontSize={9}
          fontFamily="monospace"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {labelLines[0]}
        </text>
      ) : (
        <text
          textAnchor="middle"
          fill="#e8e8f0"
          fontSize={8.5}
          fontFamily="monospace"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <tspan x={0} y={14}>{labelLines[0]}</tspan>
          <tspan x={0} y={25}>{labelLines[1]}</tspan>
        </text>
      )}

      {/* Type indicator dot */}
      <circle
        cx={0}
        cy={HEX_RADIUS * 0.75}
        r={3}
        fill={baseColor}
        opacity={0.8}
      />

      {/* MTSS Tier badge (bottom-right of hex) — only for Tier 2/3 */}
      {hasDiffOverlay && hex.mtssTier && hex.mtssTier >= 2 && (
        <g transform={`translate(${HEX_RADIUS * 0.6}, ${HEX_RADIUS * 0.55})`}>
          <circle
            r={8}
            fill={hex.mtssTier === 3 ? "#ef4444" : "#f59e0b"}
            opacity={0.9}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={8}
            fontFamily="monospace"
            fontWeight="bold"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {hex.mtssTier}
          </text>
        </g>
      )}
    </g>
  );
}
