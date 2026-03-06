"use client";

import type { MapProgressData } from "@/lib/learning-hub-types";

export interface MapProgressTabProps {
  mapProgress: MapProgressData[];
}

export default function MapProgressTab({ mapProgress }: MapProgressTabProps) {
  return (
    <div className="space-y-4">
      {mapProgress.map((mp) => (
        <div
          key={mp.mapId}
          className="rounded-xl border border-dark-border bg-dark-surface p-5"
        >
          {/* Map header */}
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-text-primary">
              {mp.mapTitle}
            </h4>
            <div className="flex items-center gap-2">
              <span
                className="text-xl font-bold"
                style={{
                  color:
                    mp.completionRate >= 80
                      ? "#22c55e"
                      : mp.completionRate >= 50
                        ? "#f59e0b"
                        : "#ef4444",
                }}
              >
                {mp.completionRate}%
              </span>
            </div>
          </div>

          {/* Hex heatmap grid */}
          <div>
            <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-2">
              Hex Completion Heatmap
            </label>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(90px, 1fr))` }}>
              {mp.hexBreakdown.map((hb) => {
                const pct =
                  hb.totalStudents > 0
                    ? Math.round(
                        (hb.completedCount / hb.totalStudents) * 100
                      )
                    : 0;
                const color =
                  pct >= 80
                    ? "#22c55e"
                    : pct >= 50
                      ? "#f59e0b"
                      : "#ef4444";

                return (
                  <div
                    key={hb.hexId}
                    className="rounded-md p-2"
                    style={{ backgroundColor: color + "15", borderLeft: `3px solid ${color}` }}
                  >
                    <div className="text-[10px] font-medium text-text-primary truncate">
                      {hb.hexLabel}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[9px] font-mono text-text-muted">
                        {hb.completedCount}/{hb.totalStudents}
                      </span>
                      <span
                        className="text-[10px] font-bold"
                        style={{ color }}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
