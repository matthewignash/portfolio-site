"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { StudentProgressDetail } from "@/lib/learning-hub-types";

export interface StudentProgressTabProps {
  studentProgress: StudentProgressDetail[];
}

export default function StudentProgressTab({
  studentProgress,
}: StudentProgressTabProps) {
  const [selectedId, setSelectedId] = useState<string>(
    studentProgress[0]?.studentId ?? ""
  );

  const selected = studentProgress.find((s) => s.studentId === selectedId);

  return (
    <div className="space-y-4">
      {/* Student selector */}
      <div className="flex items-center gap-3">
        <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Student
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-md border border-dark-border bg-dark-elevated px-3 py-1.5 text-xs text-text-primary outline-none focus:border-[#00f0ff]/50 transition-colors"
        >
          {studentProgress.map((sp) => (
            <option key={sp.studentId} value={sp.studentId}>
              {sp.studentName}
              {sp.isAtRisk ? " ⚠️" : ""}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="space-y-4">
          {/* Student header */}
          <div className="flex items-center gap-3 rounded-lg border border-dark-border bg-dark-surface p-4">
            <div
              className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: selected.avatarColor }}
            >
              {selected.studentName.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-text-primary">
                {selected.studentName}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {selected.isAtRisk && (
                  <span className="rounded-full bg-[#ef4444]/15 px-2 py-0.5 text-[9px] font-mono text-[#ef4444]">
                    At Risk: {selected.atRiskReason}
                  </span>
                )}
                {selected.supportProfile && (
                  <span className="rounded-full bg-[#f59e0b]/15 px-2 py-0.5 text-[9px] font-mono text-[#f59e0b]">
                    {selected.supportProfile.profileType}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-[#22c55e]">
                {selected.overallCompletion}%
              </div>
              <div className="text-[9px] font-mono text-text-muted">
                Avg Score: {selected.averageScore}
              </div>
            </div>
          </div>

          {/* Weekly activity chart */}
          <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
            <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
              Weekly Activity
            </h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selected.weeklyActivity}>
                  <CartesianGrid stroke="#1e1e40" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 9, fill: "#5a5a7a" }}
                    tickLine={false}
                    axisLine={{ stroke: "#1e1e40" }}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#5a5a7a" }}
                    tickLine={false}
                    axisLine={{ stroke: "#1e1e40" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#12122a",
                      border: "1px solid #1e1e40",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lessonsCompleted"
                    stroke="#00f0ff"
                    strokeWidth={2}
                    dot={{ fill: "#00f0ff", r: 3 }}
                    name="Lessons"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Map-by-map progress */}
          <div>
            <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
              Map Progress
            </h4>
            <div className="space-y-2">
              {selected.mapProgress.map((mp) => (
                <div
                  key={mp.mapId}
                  className="flex items-center gap-3 rounded-lg border border-dark-border bg-dark-surface px-4 py-3"
                >
                  <span className="text-xs font-medium text-text-primary min-w-[140px]">
                    {mp.mapTitle}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-dark-elevated">
                    <div
                      className="h-full rounded-full bg-[#22c55e] transition-all"
                      style={{ width: `${mp.completion}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-text-secondary w-10 text-right">
                    {mp.completion}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
