"use client";

import { useState, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import type {
  Hex,
  HexConnection as HexConnectionType,
  LearningMap,
  HexType,
} from "@/lib/learning-hub-types";
import HexCanvas from "../hex-engine/HexCanvas";
import HexEditor from "../hex-engine/HexEditor";
import HexToolbar from "../hex-engine/HexToolbar";

export interface MapBuilderViewProps {
  map: LearningMap;
  hexes: Hex[];
  connections: HexConnectionType[];
}

const DEFAULT_HEX_TYPES: HexType[] = [
  "lesson",
  "activity",
  "assessment",
  "resource",
  "checkpoint",
];
const ICONS = ["🔬", "📖", "🧪", "✏️", "🔍", "💡", "📊", "🎯"];
const SBAR_STRANDS = ["KU", "TT", "C"] as const;

export default function MapBuilderView({
  map,
  hexes: initialHexes,
  connections: initialConnections,
}: MapBuilderViewProps) {
  const [hexes, setHexes] = useState<Hex[]>(initialHexes);
  const [connections, setConnections] =
    useState<HexConnectionType[]>(initialConnections);
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const showDifferentiation = activeOverlay === "differentiation";

  // Drag state
  const isDragging = useRef(false);
  const dragHexId = useRef<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0, hexX: 0, hexY: 0 });

  const nextHexId = useRef(initialHexes.length + 1);

  const selectedHex = hexes.find((h) => h.id === selectedHexId) ?? null;

  // --- Hex click ---
  const handleHexClick = useCallback(
    (hexId: string) => {
      if (isDragging.current) return;

      if (isConnecting) {
        if (!connectSource) {
          setConnectSource(hexId);
        } else if (connectSource !== hexId) {
          // Create connection
          const newConn: HexConnectionType = {
            id: `${map.id}_user_conn_${Date.now()}`,
            mapId: map.id,
            fromHexId: connectSource,
            toHexId: hexId,
          };
          setConnections((prev) => [...prev, newConn]);
          setConnectSource(null);
          setIsConnecting(false);
        }
      } else {
        setSelectedHexId(hexId === selectedHexId ? null : hexId);
      }
    },
    [isConnecting, connectSource, selectedHexId, map.id]
  );

  // --- Add hex ---
  const handleAddHex = useCallback(() => {
    const id = `${map.id}_hex_new_${nextHexId.current++}`;
    // Place at center-ish of existing hexes
    const avgX =
      hexes.length > 0
        ? hexes.reduce((s, h) => s + h.x, 0) / hexes.length
        : 300;
    const avgY =
      hexes.length > 0
        ? hexes.reduce((s, h) => s + h.y, 0) / hexes.length
        : 250;

    const newHex: Hex = {
      id,
      mapId: map.id,
      label: "New Hex",
      description: "Edit this hex to add content.",
      type: DEFAULT_HEX_TYPES[hexes.length % DEFAULT_HEX_TYPES.length],
      status: "draft",
      icon: ICONS[hexes.length % ICONS.length],
      x: avgX + (Math.random() - 0.5) * 120,
      y: avgY + (Math.random() - 0.5) * 120,
      sbarDomains: [SBAR_STRANDS[hexes.length % SBAR_STRANDS.length]],
      estimatedMinutes: 20,
      maxScore: 0,
      standardIds: [],
    };
    setHexes((prev) => [...prev, newHex]);
    setSelectedHexId(id);
  }, [hexes, map.id]);

  // --- Update hex ---
  const handleUpdateHex = useCallback(
    (hexId: string, updates: Partial<Hex>) => {
      setHexes((prev) =>
        prev.map((h) => (h.id === hexId ? { ...h, ...updates } : h))
      );
    },
    []
  );

  // --- Delete hex ---
  const handleDeleteHex = useCallback(
    (hexId: string) => {
      setHexes((prev) => prev.filter((h) => h.id !== hexId));
      setConnections((prev) =>
        prev.filter((c) => c.fromHexId !== hexId && c.toHexId !== hexId)
      );
      if (selectedHexId === hexId) setSelectedHexId(null);
    },
    [selectedHexId]
  );

  // --- Drag hex ---
  const handleDragStart = useCallback(
    (hexId: string, e: React.MouseEvent) => {
      if (isConnecting) return;
      isDragging.current = false;
      dragHexId.current = hexId;
      const hex = hexes.find((h) => h.id === hexId);
      if (!hex) return;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        hexX: hex.x,
        hexY: hex.y,
      };

      const handleMove = (me: MouseEvent) => {
        const dx = me.clientX - dragStart.current.x;
        const dy = me.clientY - dragStart.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          isDragging.current = true;
        }
        if (isDragging.current) {
          setHexes((prev) =>
            prev.map((h) =>
              h.id === hexId
                ? {
                    ...h,
                    x: dragStart.current.hexX + dx,
                    y: dragStart.current.hexY + dy,
                  }
                : h
            )
          );
        }
      };

      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
        setTimeout(() => {
          isDragging.current = false;
        }, 50);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [hexes, isConnecting]
  );

  // --- Save ---
  const handleSave = useCallback(() => {
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2000);
  }, []);

  // --- Toggle overlay ---
  const handleToggleOverlay = useCallback(
    (overlay: string) => {
      setActiveOverlay((prev) => (prev === overlay ? null : overlay));
    },
    []
  );

  return (
    <div className="space-y-3">
      {/* Map title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            {map.title}
          </h3>
          <p className="text-[10px] font-mono text-text-muted">
            {hexes.length} hexes \u2022 {connections.length} connections
          </p>
        </div>
        <AnimatePresence>
          {showSaveToast && (
            <span className="rounded-full bg-[#22c55e]/20 px-3 py-1 text-[10px] font-mono text-[#22c55e]">
              Map saved!
            </span>
          )}
        </AnimatePresence>
      </div>

      {/* Toolbar */}
      <HexToolbar
        isConnecting={isConnecting}
        onAddHex={handleAddHex}
        onToggleConnect={() => {
          setIsConnecting((prev) => !prev);
          setConnectSource(null);
        }}
        onSave={handleSave}
        activeOverlay={activeOverlay}
        onToggleOverlay={handleToggleOverlay}
        hexes={hexes}
        showDifferentiation={showDifferentiation}
      />

      {/* Canvas + Editor layout */}
      <div className="flex gap-0 overflow-hidden rounded-lg border border-dark-border h-[600px]">
        {/* Canvas */}
        <div className="flex-1">
          <HexCanvas
            hexes={hexes}
            connections={connections}
            selectedHexId={selectedHexId}
            showDifferentiation={showDifferentiation}
            onHexClick={handleHexClick}
            onHexDragStart={handleDragStart}
          />
        </div>

        {/* Editor sidebar */}
        <AnimatePresence>
          {selectedHex && (
            <HexEditor
              key={selectedHex.id}
              hex={selectedHex}
              onUpdate={handleUpdateHex}
              onDelete={handleDeleteHex}
              onClose={() => setSelectedHexId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
