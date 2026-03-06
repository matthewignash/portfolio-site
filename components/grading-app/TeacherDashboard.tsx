"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import type { TeacherDashboardData, StudentScore } from "@/lib/grading-types";

interface TeacherDashboardProps {
  data: TeacherDashboardData;
}

export default function TeacherDashboard({ data }: TeacherDashboardProps) {
  const [levelFilter, setLevelFilter] = useState<"ALL" | "SL" | "HL">("ALL");

  const filteredScores =
    levelFilter === "ALL"
      ? data.scores
      : data.scores.filter((s) => s.level === levelFilter);

  // Recalculate band distribution for filtered scores
  const filteredIBBands = Array.from({ length: 7 }, (_, i) => ({
    band: i + 1,
    label: `${i + 1}`,
    count: filteredScores.filter((s) => s.ibGrade === i + 1).length,
  }));

  // Strand radar data
  const radarData = data.strandSummary.map((s) => ({
    strand: s.strand,
    "Class Average (%)": s.averagePercentage,
    fullMark: 100,
  }));

  return (
    <div className="space-y-6">
      {/* Level Filter */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
          Level
        </span>
        {(["ALL", "SL", "HL"] as const).map((level) => (
          <button
            key={level}
            onClick={() => setLevelFilter(level)}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              levelFilter === level
                ? "bg-cyan-primary/20 text-cyan-primary border border-cyan-primary/40"
                : "text-text-muted border border-dark-border hover:text-text-secondary"
            }`}
          >
            {level}
          </button>
        ))}
        <span className="ml-2 text-xs text-text-muted">
          {filteredScores.length} student{filteredScores.length !== 1 && "s"}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Class Average"
          value={`${Math.round(filteredScores.reduce((s, sc) => s + sc.totalPoints, 0) / filteredScores.length)}/${data.scores[0]?.maxPoints || 0}`}
          color="#00f0ff"
        />
        <KPICard
          label="Avg IB Grade"
          value={`${(filteredScores.reduce((s, sc) => s + sc.ibGrade, 0) / filteredScores.length).toFixed(1)}`}
          color="#a855f7"
        />
        <KPICard
          label="Highest Score"
          value={`${Math.max(...filteredScores.map((s) => s.totalPoints))}/${data.scores[0]?.maxPoints || 0}`}
          color="#10b981"
        />
        <KPICard
          label="Lowest Score"
          value={`${Math.min(...filteredScores.map((s) => s.totalPoints))}/${data.scores[0]?.maxPoints || 0}`}
          color="#f97316"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* IB Band Distribution */}
        <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
            IB Grade Distribution (1-7)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={filteredIBBands}>
              <XAxis dataKey="label" stroke="#4a4a6a" fontSize={11} />
              <YAxis stroke="#4a4a6a" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#12122a",
                  border: "1px solid #1a1a3a",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#e0e0ff",
                }}
              />
              <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Strand Performance Radar */}
        <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
            Strand Performance
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1a1a3a" />
              <PolarAngleAxis dataKey="strand" stroke="#4a4a6a" fontSize={11} />
              <PolarRadiusAxis
                domain={[0, 100]}
                stroke="#1a1a3a"
                fontSize={10}
              />
              <Radar
                name="Class Average (%)"
                dataKey="Class Average (%)"
                stroke="#00f0ff"
                fill="#00f0ff"
                fillOpacity={0.2}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", color: "#a0a0c0" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Paper Breakdown */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
          Paper Breakdown
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {data.paperSummary.map((p) => (
            <div key={p.paper} className="rounded-lg border border-dark-border bg-dark-void p-3">
              <div className="text-xs font-semibold text-text-secondary">
                {p.paperName}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-cyan-primary">
                  {p.averagePercentage}%
                </span>
                <span className="text-xs text-text-muted">
                  avg ({p.classAverage}/{p.maxPossible})
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-dark-border">
                <div
                  className="h-full rounded-full bg-cyan-primary/60"
                  style={{ width: `${p.averagePercentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Scores Table */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
          Student Scores
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-dark-border text-text-muted">
                <th className="pb-2 pr-3 font-medium">Student</th>
                <th className="pb-2 pr-3 font-medium">Level</th>
                <th className="pb-2 pr-3 text-right font-medium">Total</th>
                <th className="pb-2 pr-3 text-right font-medium">IB</th>
                <th className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">KU</th>
                <th className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">TT</th>
                <th className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">C</th>
                <th className="hidden pb-2 pr-3 text-right font-medium md:table-cell">P1A</th>
                <th className="hidden pb-2 pr-3 text-right font-medium md:table-cell">P1B</th>
                <th className="hidden pb-2 text-right font-medium md:table-cell">P2</th>
              </tr>
            </thead>
            <tbody>
              {filteredScores
                .sort((a, b) => b.totalPoints - a.totalPoints)
                .map((score) => (
                  <StudentScoreRow key={score.studentId} score={score} />
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Topic Analysis */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
          Topic Performance (Class Average)
        </h3>
        <div className="space-y-2">
          {data.classTopicAnalysis
            .sort((a, b) => a.percentage - b.percentage)
            .map((topic) => (
              <div key={topic.topicCode} className="flex items-center gap-3">
                <span className="w-10 shrink-0 font-mono text-[10px] text-text-muted">
                  {topic.topicCode}
                </span>
                <span className="w-48 shrink-0 truncate text-xs text-text-secondary">
                  {topic.topicName}
                </span>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-dark-border">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${topic.percentage}%`,
                        backgroundColor:
                          topic.percentage >= 70
                            ? "#10b981"
                            : topic.percentage >= 50
                              ? "#f59e0b"
                              : "#ef4444",
                      }}
                    />
                  </div>
                </div>
                <span className="w-10 text-right font-mono text-xs text-text-secondary">
                  {topic.percentage}%
                </span>
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
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function StudentScoreRow({ score }: { score: StudentScore }) {
  const pct = Math.round((score.totalPoints / score.maxPoints) * 100);
  return (
    <tr className="border-b border-dark-border/50 last:border-0">
      <td className="py-2 pr-3 font-medium text-text-primary">
        {score.studentName}
      </td>
      <td className="py-2 pr-3">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
            score.level === "HL"
              ? "bg-purple-secondary/20 text-purple-secondary"
              : "bg-cyan-primary/20 text-cyan-primary"
          }`}
        >
          {score.level}
        </span>
      </td>
      <td className="py-2 pr-3 text-right font-mono text-text-secondary">
        {score.totalPoints}/{score.maxPoints}{" "}
        <span className="text-text-muted">({pct}%)</span>
      </td>
      <td className="py-2 pr-3 text-right">
        <IBGradeBadge grade={score.ibGrade} />
      </td>
      <td className="hidden py-2 pr-3 text-right font-mono text-text-secondary sm:table-cell">
        {score.kuPoints}/{score.kuMax}
      </td>
      <td className="hidden py-2 pr-3 text-right font-mono text-text-secondary sm:table-cell">
        {score.ttPoints}/{score.ttMax}
      </td>
      <td className="hidden py-2 pr-3 text-right font-mono text-text-secondary sm:table-cell">
        {score.cPoints}/{score.cMax}
      </td>
      <td className="hidden py-2 pr-3 text-right font-mono text-text-secondary md:table-cell">
        {score.paper1aEarned}/{score.paper1aMax}
      </td>
      <td className="hidden py-2 pr-3 text-right font-mono text-text-secondary md:table-cell">
        {score.paper1bEarned}/{score.paper1bMax}
      </td>
      <td className="hidden py-2 text-right font-mono text-text-secondary md:table-cell">
        {score.paper2Earned}/{score.paper2Max}
      </td>
    </tr>
  );
}

function IBGradeBadge({ grade }: { grade: number }) {
  const color =
    grade >= 6
      ? "#10b981"
      : grade >= 4
        ? "#f59e0b"
        : "#ef4444";
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {grade}
    </span>
  );
}
