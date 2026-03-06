"use client";

import { useState, useMemo, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import type {
  Hex,
  HexConnection as HexConnectionType,
  LearningMap,
  ProgressRecord,
} from "@/lib/learning-hub-types";
import HexCanvas from "../hex-engine/HexCanvas";
import LessonOverview from "./LessonOverview";

export interface StudentMapViewProps {
  map: LearningMap;
  hexes: Hex[];
  connections: HexConnectionType[];
  progress: ProgressRecord[];
  studentId: string;
}

/**
 * Student Map View — read-only hex map with progress states.
 * Reuses HexCanvas with progressMap prop instead of edit handlers.
 * Clicking active/complete hexes opens LessonOverview sidebar.
 */
export default function StudentMapView({
  map,
  hexes,
  connections,
  progress,
  studentId,
}: StudentMapViewProps) {
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null);

  // Build a set of hex IDs that are completed by this student on this map
  const completedHexIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of progress) {
      if (
        p.studentId === studentId &&
        p.mapId === map.id &&
        (p.status === "completed" || p.status === "mastered")
      ) {
        set.add(p.hexId);
      }
    }
    return set;
  }, [progress, studentId, map.id]);

  // Build a set of in-progress hex IDs
  const inProgressHexIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of progress) {
      if (
        p.studentId === studentId &&
        p.mapId === map.id &&
        p.status === "in_progress"
      ) {
        set.add(p.hexId);
      }
    }
    return set;
  }, [progress, studentId, map.id]);

  // Build prerequisite map: hexId → set of prerequisite hex IDs (via connections)
  const prerequisiteMap = useMemo(() => {
    const prereqs = new Map<string, Set<string>>();
    for (const hex of hexes) {
      prereqs.set(hex.id, new Set());
    }
    for (const conn of connections) {
      if (conn.mapId === map.id) {
        const existing = prereqs.get(conn.toHexId);
        if (existing) {
          existing.add(conn.fromHexId);
        }
      }
    }
    return prereqs;
  }, [hexes, connections, map.id]);

  // Compute progress state for each hex
  const progressMap = useMemo(() => {
    const result: Record<string, "complete" | "active" | "locked"> = {};

    for (const hex of hexes) {
      if (completedHexIds.has(hex.id)) {
        result[hex.id] = "complete";
      } else if (inProgressHexIds.has(hex.id)) {
        result[hex.id] = "active";
      } else {
        // Check if all prerequisites are completed
        const prereqs = prerequisiteMap.get(hex.id) ?? new Set();
        if (prereqs.size === 0) {
          // No prerequisites — active (first node or standalone)
          result[hex.id] = "active";
        } else {
          const allPrereqsComplete = [...prereqs].every((pid) =>
            completedHexIds.has(pid)
          );
          result[hex.id] = allPrereqsComplete ? "active" : "locked";
        }
      }
    }
    return result;
  }, [hexes, completedHexIds, inProgressHexIds, prerequisiteMap]);

  // Get progress record for selected hex
  const selectedHex = hexes.find((h) => h.id === selectedHexId) ?? null;
  const selectedProgress = useMemo(() => {
    if (!selectedHexId) return null;
    return (
      progress.find(
        (p) =>
          p.studentId === studentId &&
          p.mapId === map.id &&
          p.hexId === selectedHexId
      ) ?? null
    );
  }, [progress, studentId, map.id, selectedHexId]);

  // Count completed hexes
  const completedCount = hexes.filter((h) => completedHexIds.has(h.id)).length;
  const currentHexIndex = selectedHex
    ? hexes.findIndex((h) => h.id === selectedHex.id) + 1
    : 0;

  const handleHexClick = useCallback(
    (hexId: string) => {
      const state = progressMap[hexId];
      // Only allow clicking active or complete hexes
      if (state === "active" || state === "complete") {
        setSelectedHexId(hexId === selectedHexId ? null : hexId);
      }
    },
    [progressMap, selectedHexId]
  );

  const handleMarkComplete = useCallback(() => {
    // In demo mode, just deselect (data is read-only)
    setSelectedHexId(null);
  }, []);

  return (
    <div className="space-y-3">
      {/* Map header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            {map.title}
          </h3>
          <p className="text-[10px] font-mono text-text-muted">
            {completedCount}/{hexes.length} hexes complete
          </p>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-dark-elevated">
            <div
              className="h-full rounded-full bg-[#22c55e] transition-all"
              style={{
                width: `${hexes.length > 0 ? (completedCount / hexes.length) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="font-mono text-[10px] text-text-muted">
            {hexes.length > 0
              ? Math.round((completedCount / hexes.length) * 100)
              : 0}
            %
          </span>
        </div>
      </div>

      {/* Canvas + Lesson Overview layout */}
      <div className="flex gap-0 overflow-hidden rounded-lg border border-dark-border">
        {/* Canvas */}
        <div className="flex-1">
          <HexCanvas
            hexes={hexes}
            connections={connections}
            selectedHexId={selectedHexId}
            progressMap={progressMap}
            onHexClick={handleHexClick}
          />
        </div>

        {/* Lesson overview sidebar */}
        <AnimatePresence>
          {selectedHex && (
            <LessonOverview
              key={selectedHex.id}
              hex={selectedHex}
              progressState={progressMap[selectedHex.id]}
              progressRecord={selectedProgress}
              hexIndex={currentHexIndex}
              totalHexes={hexes.length}
              onMarkComplete={handleMarkComplete}
              onClose={() => setSelectedHexId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
