"use client";

import type {
  ProgressOverview,
  MapProgressData,
  StudentProgressDetail,
} from "@/lib/learning-hub-types";

export interface OverviewTabProps {
  overview: ProgressOverview;
  mapProgress: MapProgressData[];
  studentProgress: StudentProgressDetail[];
}

export default function OverviewTab({
  overview,
  mapProgress,
  studentProgress,
}: OverviewTabProps) {
  const atRiskCount = studentProgress.filter((s) => s.isAtRisk).length;

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Total Students"
          value={String(overview.totalStudents)}
          color="#00f0ff"
        />
        <KPICard
          label="Avg Completion"
          value={`${overview.averageCompletion}%`}
          color="#22c55e"
        />
        <KPICard
          label="Active Maps"
          value={String(overview.activeMaps)}
          color="#a855f7"
        />
        <KPICard
          label="Lessons Completed"
          value={String(overview.totalLessonsCompleted)}
          color="#f59e0b"
        />
      </div>

      {/* At-risk alert */}
      {atRiskCount > 0 && (
        <div className="rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3 flex items-center gap-3">
          <span className="text-sm">⚠️</span>
          <div>
            <span className="text-xs font-semibold text-[#ef4444]">
              {atRiskCount} at-risk student{atRiskCount !== 1 ? "s" : ""}
            </span>
            <p className="text-[10px] text-text-muted mt-0.5">
              Students below 40% completion or falling behind pace
            </p>
          </div>
        </div>
      )}

      {/* Map progress bars */}
      <div>
        <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Progress by Map
        </h4>
        <div className="space-y-3">
          {mapProgress.map((mp) => (
            <div key={mp.mapId} className="rounded-lg border border-dark-border bg-dark-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-text-primary">
                  {mp.mapTitle}
                </span>
                <span className="font-mono text-[11px] font-semibold text-[#22c55e]">
                  {mp.completionRate}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-dark-elevated">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${mp.completionRate}%`,
                    backgroundColor:
                      mp.completionRate >= 80
                        ? "#22c55e"
                        : mp.completionRate >= 50
                          ? "#f59e0b"
                          : "#ef4444",
                  }}
                />
              </div>
              {/* Hex breakdown mini grid */}
              <div className="mt-3 flex flex-wrap gap-1">
                {mp.hexBreakdown.map((hb) => {
                  const pct = hb.totalStudents > 0
                    ? Math.round((hb.completedCount / hb.totalStudents) * 100)
                    : 0;
                  const bg =
                    pct >= 80
                      ? "#22c55e"
                      : pct >= 50
                        ? "#f59e0b"
                        : "#ef4444";
                  return (
                    <div
                      key={hb.hexId}
                      className="group relative flex h-6 w-6 items-center justify-center rounded text-[8px] font-bold text-white"
                      style={{ backgroundColor: bg + "40" }}
                      title={`${hb.hexLabel}: ${hb.completedCount}/${hb.totalStudents}`}
                    >
                      {pct}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student summary */}
      <div>
        <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Student Summary
        </h4>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {studentProgress.map((sp) => (
            <div
              key={sp.studentId}
              className={`rounded-lg border p-3 ${
                sp.isAtRisk
                  ? "border-[#ef4444]/30 bg-[#ef4444]/5"
                  : "border-dark-border bg-dark-surface"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ backgroundColor: sp.avatarColor }}
                >
                  {sp.studentName.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-text-primary truncate block">
                    {sp.studentName}
                  </span>
                </div>
                {sp.isAtRisk && (
                  <span className="rounded-full bg-[#ef4444]/15 px-1.5 py-0.5 text-[8px] font-mono text-[#ef4444]">
                    At Risk
                  </span>
                )}
                {sp.supportProfile && (
                  <span className="rounded-full bg-[#f59e0b]/15 px-1.5 py-0.5 text-[8px] font-mono text-[#f59e0b]">
                    {sp.supportProfile.profileType}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-dark-elevated">
                  <div
                    className="h-full rounded-full bg-[#22c55e] transition-all"
                    style={{ width: `${sp.overallCompletion}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-text-muted">
                  {sp.overallCompletion}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
        {label}
      </div>
    </div>
  );
}
