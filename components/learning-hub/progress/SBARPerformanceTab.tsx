"use client";

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { SBARData } from "@/lib/learning-hub-types";

export interface SBARPerformanceTabProps {
  sbarData: SBARData[];
}

export default function SBARPerformanceTab({
  sbarData,
}: SBARPerformanceTabProps) {
  // Prepare radar data
  const radarData = sbarData.map((s) => ({
    strand: s.strandName,
    average: s.classAverage,
    max: s.maxScore,
  }));

  // Prepare bar chart data (per-student scores across all strands)
  const studentNames = new Set<string>();
  for (const s of sbarData) {
    for (const sc of s.studentScores) {
      studentNames.add(sc.studentName);
    }
  }

  const barData = [...studentNames].map((name) => {
    const entry: Record<string, string | number> = { name };
    for (const s of sbarData) {
      const score = s.studentScores.find((sc) => sc.studentName === name);
      entry[s.strand] = score?.score ?? 0;
    }
    return entry;
  });

  const STRAND_COLORS: Record<string, string> = {
    KU: "#3b82f6",
    TT: "#f59e0b",
    C: "#a855f7",
  };

  return (
    <div className="space-y-5">
      {/* Radar chart */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
        <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Class Average by Strand
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e1e40" />
              <PolarAngleAxis
                dataKey="strand"
                tick={{ fontSize: 10, fill: "#8a8aaa" }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 8]}
                tick={{ fontSize: 8, fill: "#5a5a7a" }}
              />
              <Radar
                name="Class Average"
                dataKey="average"
                stroke="#00f0ff"
                fill="#00f0ff"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strand summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sbarData.map((s) => {
          const color = STRAND_COLORS[s.strand] ?? "#5a5a7a";
          const topStudent = [...s.studentScores].sort(
            (a, b) => b.score - a.score
          )[0];
          const bottomStudent = [...s.studentScores].sort(
            (a, b) => a.score - b.score
          )[0];

          return (
            <div
              key={s.strand}
              className="rounded-xl border border-dark-border bg-dark-surface p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white"
                  style={{ backgroundColor: color + "30", color }}
                >
                  {s.strand}
                </span>
                <span className="text-xs font-medium text-text-primary">
                  {s.strandName}
                </span>
              </div>
              <div className="mb-2 text-lg font-bold" style={{ color }}>
                {s.classAverage}
                <span className="text-xs font-normal text-text-muted">
                  /{s.maxScore}
                </span>
              </div>
              <div className="space-y-1 text-[10px] text-text-muted">
                {topStudent && (
                  <div className="flex justify-between">
                    <span>Top: {topStudent.studentName.split(" ")[0]}</span>
                    <span className="text-[#22c55e]">{topStudent.score}</span>
                  </div>
                )}
                {bottomStudent && (
                  <div className="flex justify-between">
                    <span>
                      Low: {bottomStudent.studentName.split(" ")[0]}
                    </span>
                    <span className="text-[#ef4444]">
                      {bottomStudent.score}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-student bar chart */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
        <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Student Scores by Strand
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid stroke="#1e1e40" strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 8, fill: "#5a5a7a" }}
                tickLine={false}
                axisLine={{ stroke: "#1e1e40" }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#5a5a7a" }}
                tickLine={false}
                axisLine={{ stroke: "#1e1e40" }}
                domain={[0, 8]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#12122a",
                  border: "1px solid #1e1e40",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              {sbarData.map((s) => (
                <Bar
                  key={s.strand}
                  dataKey={s.strand}
                  fill={STRAND_COLORS[s.strand] ?? "#5a5a7a"}
                  fillOpacity={0.7}
                  name={s.strandName}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
