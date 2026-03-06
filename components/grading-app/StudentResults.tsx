"use client";

import { useState } from "react";
import type { StudentDashboardData, TopicBreakdown } from "@/lib/grading-types";

interface StudentResultsProps {
  data: StudentDashboardData;
}

export default function StudentResults({ data }: StudentResultsProps) {
  const { student, score, topicAnalysis, strandDescriptors, paper1aResults, checklistResults } = data;
  const [showDetails, setShowDetails] = useState(false);

  const totalPct = Math.round((score.totalPoints / score.maxPoints) * 100);

  return (
    <div className="space-y-6">
      {/* Student Header */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ backgroundColor: "#a855f7" }}
        >
          {student.name[0]}
        </div>
        <div>
          <h3 className="text-lg font-bold text-text-primary">{student.name}</h3>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className={`rounded px-1.5 py-0.5 font-bold ${
              student.level === "HL"
                ? "bg-purple-secondary/20 text-purple-secondary"
                : "bg-cyan-primary/20 text-cyan-primary"
            }`}>
              {student.level}
            </span>
            <span>{student.classSection}</span>
          </div>
        </div>
      </div>

      {/* Score Card */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
              IB Grade
            </div>
            <div className="mt-1">
              <IBGradeCircle grade={score.ibGrade} />
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
              Total Score
            </div>
            <div className="mt-1 text-2xl font-bold text-text-primary">
              {score.totalPoints}
              <span className="text-sm text-text-muted">/{score.maxPoints}</span>
            </div>
            <div className="text-xs text-text-muted">{totalPct}%</div>
          </div>
          <div className="col-span-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
              Strand Bands (AISC 1-8)
            </div>
            <div className="mt-2 flex gap-3">
              <StrandBadge label="KU" band={score.kuBand} points={score.kuPoints} max={score.kuMax} />
              <StrandBadge label="TT" band={score.ttBand} points={score.ttPoints} max={score.ttMax} />
              <StrandBadge label="C" band={score.cBand} points={score.cPoints} max={score.cMax} />
            </div>
          </div>
        </div>

        {/* Paper Breakdown */}
        <div className="mt-4 grid gap-2 border-t border-dark-border pt-4 sm:grid-cols-3">
          <PaperScore label="Paper 1A (MCQ)" earned={score.paper1aEarned} max={score.paper1aMax} />
          <PaperScore label="Paper 1B (Short)" earned={score.paper1bEarned} max={score.paper1bMax} />
          <PaperScore label="Paper 2 (Extended)" earned={score.paper2Earned} max={score.paper2Max} />
        </div>
      </div>

      {/* AISC Strand Descriptors */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
          Holistic Assessment Language
        </h3>
        <div className="space-y-3">
          {strandDescriptors.map((sd) => (
            <div key={sd.strand} className="rounded-lg border border-dark-border bg-dark-void p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">
                  {sd.strandName}
                </span>
                <span className="rounded bg-cyan-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-primary">
                  Band {sd.band}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                {sd.descriptor}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Topic Analysis */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
          Topic Analysis
        </h3>

        {/* Strong / Weak Summary */}
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase text-emerald-400">
              Strengths ({topicAnalysis.strongTopics.length})
            </div>
            <div className="space-y-1">
              {topicAnalysis.strongTopics.slice(0, 4).map((t) => (
                <TopicRow key={t.topicCode} topic={t} />
              ))}
              {topicAnalysis.strongTopics.length === 0 && (
                <span className="text-xs text-text-muted">No strong topics (&ge;70%)</span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase text-red-400">
              Areas for Growth ({topicAnalysis.weakTopics.length})
            </div>
            <div className="space-y-1">
              {topicAnalysis.weakTopics.slice(0, 4).map((t) => (
                <TopicRow key={t.topicCode} topic={t} />
              ))}
              {topicAnalysis.weakTopics.length === 0 && (
                <span className="text-xs text-text-muted">No weak topics (&lt;50%)</span>
              )}
            </div>
          </div>
        </div>

        {/* Full topic list */}
        <div className="space-y-1.5">
          {topicAnalysis.topics
            .sort((a, b) => a.percentage - b.percentage)
            .map((t) => (
              <div key={t.topicCode} className="flex items-center gap-2">
                <span className="w-8 font-mono text-[9px] text-text-muted">
                  {t.topicCode}
                </span>
                <span className="w-44 truncate text-xs text-text-secondary">
                  {t.topicName}
                </span>
                <div className="flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-dark-border">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${t.percentage}%`,
                        backgroundColor:
                          t.percentage >= 70 ? "#10b981" : t.percentage >= 50 ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                </div>
                <span className="w-14 text-right font-mono text-[10px] text-text-muted">
                  {t.pointsEarned}/{t.pointsPossible}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Exam Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full rounded-xl border border-dark-border bg-dark-surface p-3 text-center text-xs text-text-muted transition-colors hover:border-cyan-primary/30 hover:text-text-secondary"
      >
        {showDetails ? "Hide" : "Show"} Detailed Exam Results ({paper1aResults.length} MCQ + {checklistResults.length} questions)
      </button>

      {showDetails && (
        <div className="space-y-4">
          {/* Paper 1A Results */}
          <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
            <h4 className="mb-3 text-xs font-semibold text-text-primary">
              Paper 1A — MCQ Results
            </h4>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
              {paper1aResults.map((r) => (
                <div
                  key={r.qid}
                  className={`rounded p-1.5 text-center ${
                    r.isCorrect
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  <div className="font-mono text-[9px] text-text-muted">
                    {r.qid.replace("1A_", "Q")}
                  </div>
                  <div className="text-sm font-bold">{r.studentChoice}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist Results */}
          <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
            <h4 className="mb-3 text-xs font-semibold text-text-primary">
              Paper 1B & 2 — Detailed Scores
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {checklistResults.map((r) => {
                const pct = r.maxPoints > 0 ? Math.round((r.pointsAwarded / r.maxPoints) * 100) : 0;
                return (
                  <div
                    key={r.qid}
                    className="flex items-center gap-2 rounded-lg border border-dark-border bg-dark-void p-2"
                  >
                    <span className="font-mono text-[10px] text-text-muted">
                      {r.qid}
                    </span>
                    <div className="flex-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-dark-border">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor:
                              pct === 100 ? "#10b981" : pct > 0 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-text-secondary">
                      {r.pointsAwarded}/{r.maxPoints}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IBGradeCircle({ grade }: { grade: number }) {
  const color = grade >= 6 ? "#10b981" : grade >= 4 ? "#f59e0b" : "#ef4444";
  const size = 56;
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const progress = (grade / 7) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1a1a3a"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span
        className="absolute text-lg font-bold"
        style={{ color }}
      >
        {grade}
      </span>
    </div>
  );
}

function StrandBadge({
  label,
  band,
  points,
  max,
}: {
  label: string;
  band: number;
  points: number;
  max: number;
}) {
  const color = band >= 6 ? "#10b981" : band >= 4 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex-1 rounded-lg border border-dark-border bg-dark-void p-2 text-center">
      <div className="text-[10px] font-semibold text-text-muted">{label}</div>
      <div className="text-lg font-bold" style={{ color }}>
        {band}
      </div>
      <div className="font-mono text-[9px] text-text-muted">
        {points}/{max}
      </div>
    </div>
  );
}

function PaperScore({ label, earned, max }: { label: string; earned: number; max: number }) {
  const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="font-mono text-xs text-text-secondary">
        {earned}/{max}
      </span>
      <span className="text-[10px] text-text-muted">({pct}%)</span>
    </div>
  );
}

function TopicRow({ topic }: { topic: TopicBreakdown }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[9px] text-text-muted">{topic.topicCode}</span>
      <span className="flex-1 truncate text-[11px] text-text-secondary">{topic.topicName}</span>
      <span className="font-mono text-[10px] text-text-muted">{topic.percentage}%</span>
    </div>
  );
}
