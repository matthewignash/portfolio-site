"use client";

import type { AssessmentData } from "@/lib/learning-hub-types";

export interface AssessmentsTabProps {
  assessments: AssessmentData[];
}

export default function AssessmentsTab({ assessments }: AssessmentsTabProps) {
  return (
    <div className="space-y-4">
      {assessments.map((a) => (
        <div
          key={a.mapId}
          className="rounded-xl border border-dark-border bg-dark-surface p-5"
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-text-primary">
              {a.mapTitle}
            </h4>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-lg font-bold text-[#00f0ff]">
                  {a.averageScore}
                  <span className="text-xs font-normal text-text-muted">
                    /{a.maxScore}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-text-muted">
                  Class Average
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-lg font-bold"
                  style={{
                    color:
                      a.passRate >= 80
                        ? "#22c55e"
                        : a.passRate >= 60
                          ? "#f59e0b"
                          : "#ef4444",
                  }}
                >
                  {a.passRate}%
                </div>
                <div className="text-[9px] font-mono text-text-muted">
                  Pass Rate
                </div>
              </div>
            </div>
          </div>

          {/* Student score table */}
          <div>
            <div className="mb-2 grid grid-cols-4 gap-2 px-2 font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted">
              <span>Student</span>
              <span>Score</span>
              <span>Max</span>
              <span>Status</span>
            </div>
            <div className="space-y-1">
              {a.scores.map((s) => (
                <div
                  key={s.studentId}
                  className="grid grid-cols-4 gap-2 rounded-md bg-dark-elevated px-2 py-1.5"
                >
                  <span className="text-xs text-text-secondary truncate">
                    {s.studentName}
                  </span>
                  <span className="text-xs font-mono text-text-primary">
                    {s.score}
                  </span>
                  <span className="text-xs font-mono text-text-muted">
                    {s.maxScore}
                  </span>
                  <span
                    className={`inline-block w-fit rounded-full px-2 py-0.5 text-[9px] font-mono ${
                      s.passed
                        ? "bg-[#22c55e]/15 text-[#22c55e]"
                        : "bg-[#ef4444]/15 text-[#ef4444]"
                    }`}
                  >
                    {s.passed ? "Pass" : "Fail"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
