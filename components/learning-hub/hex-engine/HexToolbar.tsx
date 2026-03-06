"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Hex } from "@/lib/learning-hub-types";

export interface HexToolbarProps {
  isConnecting: boolean;
  onAddHex: () => void;
  onToggleConnect: () => void;
  onSave: () => void;
  activeOverlay: string | null;
  onToggleOverlay: (overlay: string) => void;
  hexes?: Hex[];
  showDifferentiation?: boolean;
}

interface ToolbarButton {
  id: string;
  label: string;
  icon: string;
  action: "add" | "connect" | "save" | "overlay";
}

const BUTTONS: ToolbarButton[] = [
  { id: "add", label: "Add Hex", icon: "➕", action: "add" },
  { id: "connect", label: "Connect", icon: "🔗", action: "connect" },
  { id: "auto-generate", label: "Auto-Generate", icon: "🤖", action: "overlay" },
  { id: "save", label: "Save Map", icon: "💾", action: "save" },
  { id: "differentiation", label: "Differentiation", icon: "🔀", action: "overlay" },
  { id: "groups", label: "Groups", icon: "👥", action: "overlay" },
  { id: "heatmap", label: "Heatmap", icon: "🌡️", action: "overlay" },
  { id: "calendar", label: "Calendar", icon: "📅", action: "overlay" },
];

const OVERLAY_CONTENT: Record<string, { title: string; body: string }> = {
  "auto-generate": {
    title: "AI Lesson Generator",
    body: "Automatically generate hex nodes from learning objectives using AI. Upload your unit plan or paste objectives to create a map structure.",
  },
  groups: {
    title: "Student Groups",
    body: "Alpha Team (3 students) \u2022 Beta Team (3 students) \u2022 Gamma Team (3 students) \u2022 Delta Team (3 students)",
  },
  heatmap: {
    title: "Performance Heatmap",
    body: "Color hexes by class performance: Green (>80% pass), Amber (50-80%), Red (<50%). Identifies struggling points in the learning pathway.",
  },
  calendar: {
    title: "Timeline View",
    body: "Schedule lessons across the term calendar. Drag hexes to assign dates and see the pacing of your learning map over time.",
  },
};

export default function HexToolbar({
  isConnecting,
  onAddHex,
  onToggleConnect,
  onSave,
  activeOverlay,
  onToggleOverlay,
  hexes = [],
  showDifferentiation = false,
}: HexToolbarProps) {
  const handleClick = (btn: ToolbarButton) => {
    switch (btn.action) {
      case "add":
        onAddHex();
        break;
      case "connect":
        onToggleConnect();
        break;
      case "save":
        onSave();
        break;
      case "overlay":
        onToggleOverlay(btn.id);
        break;
    }
  };

  // Compute differentiation counts from actual hex data
  const scaffoldedCount = hexes.filter((h) => h.diffPathway === "scaffolded").length;
  const standardCount = hexes.filter((h) => h.diffPathway === "standard").length;
  const enrichmentCount = hexes.filter((h) => h.diffPathway === "enrichment").length;
  const tier2Count = hexes.filter((h) => h.mtssTier === 2).length;
  const tier3Count = hexes.filter((h) => h.mtssTier === 3).length;

  return (
    <div className="relative">
      {/* Button row */}
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-dark-border bg-dark-surface p-2">
        {BUTTONS.map((btn) => {
          const isActive =
            (btn.id === "connect" && isConnecting) ||
            (btn.action === "overlay" && activeOverlay === btn.id);

          return (
            <button
              key={btn.id}
              onClick={() => handleClick(btn)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all ${
                isActive
                  ? "bg-[#00f0ff]/15 text-[#00f0ff] ring-1 ring-[#00f0ff]/40"
                  : "text-text-muted hover:bg-dark-elevated hover:text-text-secondary"
              }`}
            >
              <span className="text-sm">{btn.icon}</span>
              <span className="hidden sm:inline">{btn.label}</span>
            </button>
          );
        })}
      </div>

      {/* Differentiation Legend Panel */}
      <AnimatePresence>
        {activeOverlay === "differentiation" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-10 mt-2 rounded-lg border border-dark-border bg-dark-surface p-4 shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-text-primary">
                Differentiation Paths
              </span>
              <button
                onClick={() => onToggleOverlay("differentiation")}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>

            {/* Pathway legend */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: "#22c55e" }}
                />
                <span className="text-xs text-text-secondary flex-1">Scaffolded</span>
                <span className="text-[10px] font-mono text-text-muted">
                  {scaffoldedCount} hex{scaffoldedCount !== 1 ? "es" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: "#3b82f6" }}
                />
                <span className="text-xs text-text-secondary flex-1">Standard</span>
                <span className="text-[10px] font-mono text-text-muted">
                  {standardCount} hex{standardCount !== 1 ? "es" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: "#a855f7" }}
                />
                <span className="text-xs text-text-secondary flex-1">Enrichment</span>
                <span className="text-[10px] font-mono text-text-muted">
                  {enrichmentCount} hex{enrichmentCount !== 1 ? "es" : ""}
                </span>
              </div>
            </div>

            {/* MTSS Tier summary */}
            {(tier2Count > 0 || tier3Count > 0) && (
              <div className="border-t border-dark-border pt-2 mb-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted block mb-1.5">
                  MTSS Tiers
                </span>
                <div className="flex gap-3">
                  {tier2Count > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
                        style={{ backgroundColor: "#f59e0b" }}
                      >
                        2
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {tier2Count} hex{tier2Count !== 1 ? "es" : ""}
                      </span>
                    </div>
                  )}
                  {tier3Count > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
                        style={{ backgroundColor: "#ef4444" }}
                      >
                        3
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {tier3Count} hex{tier3Count !== 1 ? "es" : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Toggle state & hint */}
            <div className="flex items-center justify-between rounded-md bg-dark-elevated px-3 py-2">
              <span className="text-[10px] font-mono text-text-muted">
                {showDifferentiation ? "✓ Showing on canvas" : "Overlay active"}
              </span>
              <span className="text-[10px] text-text-muted">
                Click a hex to edit pathway
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generic overlay panel (for non-differentiation overlays) */}
      <AnimatePresence>
        {activeOverlay && activeOverlay !== "differentiation" && OVERLAY_CONTENT[activeOverlay] && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-10 mt-2 rounded-lg border border-dark-border bg-dark-surface p-4 shadow-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-text-primary">
                {OVERLAY_CONTENT[activeOverlay].title}
              </span>
              <button
                onClick={() => onToggleOverlay(activeOverlay)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs leading-relaxed text-text-secondary">
              {OVERLAY_CONTENT[activeOverlay].body}
            </p>
            <div className="mt-3 rounded-md bg-dark-elevated p-2 text-[10px] font-mono text-text-muted">
              Demo mode — feature preview only
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection mode indicator */}
      <AnimatePresence>
        {isConnecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -bottom-8 left-0 right-0 text-center text-[10px] font-mono uppercase tracking-wider text-[#00f0ff]"
          >
            Click a hex to set connection source, then click destination
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
