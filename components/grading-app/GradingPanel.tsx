"use client";

import { useState } from "react";
import type { GradingPanelData } from "@/lib/grading-types";

interface GradingPanelProps {
  data: GradingPanelData;
}

type PaperTab = "1A" | "1B" | "2";

export default function GradingPanel({ data }: GradingPanelProps) {
  const [selectedStudent, setSelectedStudent] = useState(data.students[0]?.id || "");
  const [paperTab, setPaperTab] = useState<PaperTab>("1A");

  const student = data.students.find((s) => s.id === selectedStudent);

  return (
    <div className="space-y-5">
      {/* Student Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
          Student
        </span>
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="rounded-lg border border-dark-border bg-dark-void px-3 py-1.5 text-xs text-text-primary outline-none focus:border-cyan-primary/50"
        >
          {data.students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.level})
            </option>
          ))}
        </select>
        {student && (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
            student.level === "HL"
              ? "bg-purple-secondary/20 text-purple-secondary"
              : "bg-cyan-primary/20 text-cyan-primary"
          }`}>
            {student.level} — {student.classSection}
          </span>
        )}
      </div>

      {/* Paper Tabs */}
      <div className="flex gap-1 rounded-lg border border-dark-border bg-dark-void p-1">
        {(["1A", "1B", "2"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setPaperTab(tab)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              paperTab === tab
                ? "bg-cyan-primary/20 text-cyan-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Paper {tab}
            <span className="ml-1 text-text-muted">
              {tab === "1A" ? "(MCQ)" : tab === "1B" ? "(Short)" : "(Extended)"}
            </span>
          </button>
        ))}
      </div>

      {/* Paper Content */}
      {paperTab === "1A" && (
        <Paper1AView
          questions={data.paper1aQuestions}
          responses={data.responses}
          studentId={selectedStudent}
        />
      )}
      {(paperTab === "1B" || paperTab === "2") && (
        <ChecklistView
          questions={data.checklistQuestions.filter((q) => q.paper === paperTab)}
          responses={data.responses}
          studentId={selectedStudent}
        />
      )}
    </div>
  );
}

function Paper1AView({
  questions,
  responses,
  studentId,
}: {
  questions: GradingPanelData["paper1aQuestions"];
  responses: GradingPanelData["responses"];
  studentId: string;
}) {
  const total = questions.length;
  let correct = 0;

  for (const q of questions) {
    const key = `${studentId}||${q.qid}`;
    const r = responses[key];
    if (r && r.pointsAwarded > 0) correct++;
  }

  return (
    <div className="space-y-4">
      {/* Score Summary */}
      <div className="flex items-center gap-4 rounded-lg border border-dark-border bg-dark-surface p-3">
        <div>
          <span className="text-2xl font-bold text-cyan-primary">{correct}</span>
          <span className="text-lg text-text-muted">/{total}</span>
        </div>
        <div className="text-xs text-text-muted">
          {Math.round((correct / total) * 100)}% correct
        </div>
        <div className="ml-auto flex gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Correct
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            Incorrect
          </span>
        </div>
      </div>

      {/* MCQ Grid */}
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-10">
        {questions.map((q) => {
          const key = `${studentId}||${q.qid}`;
          const r = responses[key];
          const isCorrect = r && r.pointsAwarded > 0;
          const studentChoice = r?.mcqChoice || "—";

          return (
            <div
              key={q.qid}
              className={`relative rounded-lg border p-2 text-center ${
                isCorrect
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-red-500/30 bg-red-500/10"
              }`}
            >
              <div className="font-mono text-[9px] text-text-muted">
                Q{q.questionNumber}
              </div>
              <div className={`text-sm font-bold ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                {studentChoice}
              </div>
              {!isCorrect && (
                <div className="font-mono text-[9px] text-text-muted">
                  ({q.correctAnswer})
                </div>
              )}
              <div className="mt-0.5 font-mono text-[8px] text-text-muted">
                {q.strand}
              </div>
            </div>
          );
        })}
      </div>

      {/* Strand Breakdown */}
      <div className="grid gap-2 sm:grid-cols-3">
        {(["KU", "TT", "C"] as const).map((strand) => {
          const strandQs = questions.filter((q) => q.strand === strand);
          const strandCorrect = strandQs.filter((q) => {
            const r = responses[`${studentId}||${q.qid}`];
            return r && r.pointsAwarded > 0;
          }).length;
          const pct = strandQs.length > 0 ? Math.round((strandCorrect / strandQs.length) * 100) : 0;

          return (
            <div key={strand} className="rounded-lg border border-dark-border bg-dark-surface p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-text-secondary">{strand}</span>
                <span className="font-mono text-xs text-text-muted">
                  {strandCorrect}/{strandQs.length}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-dark-border">
                <div
                  className="h-full rounded-full bg-cyan-primary/60"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChecklistView({
  questions,
  responses,
  studentId,
}: {
  questions: GradingPanelData["checklistQuestions"];
  responses: GradingPanelData["responses"];
  studentId: string;
}) {
  return (
    <div className="space-y-3">
      {questions.map((q) => {
        const key = `${studentId}||${q.qid}`;
        const r = responses[key];
        const pointsAwarded = r?.pointsAwarded || 0;
        const checkedItems = r?.checkedItems || [];

        return (
          <div key={q.qid} className="rounded-xl border border-dark-border bg-dark-surface p-4">
            {/* Question Header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-text-primary">
                  Q{q.questionNumber}
                </span>
                <span className="rounded bg-dark-void px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
                  {q.strand}
                </span>
                <span className="rounded bg-dark-void px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
                  {q.ibTopicCode}
                </span>
                <span className="rounded bg-dark-void px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
                  {q.checklistMode}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-lg font-bold ${
                    pointsAwarded === q.maxPoints
                      ? "text-emerald-400"
                      : pointsAwarded > 0
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  {pointsAwarded}
                </span>
                <span className="text-xs text-text-muted">/{q.maxPoints}</span>
              </div>
            </div>

            {/* Rubric Items */}
            {q.rubricItems.length > 0 && (
              <div className="space-y-1.5">
                {q.rubricItems.map((item) => {
                  const isChecked = checkedItems.includes(item.itemId);
                  return (
                    <div
                      key={item.itemId}
                      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs ${
                        isChecked
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-dark-void text-text-muted"
                      }`}
                    >
                      <span className="text-sm">
                        {isChecked ? "\u2713" : "\u2717"}
                      </span>
                      <span className="flex-1">{item.criteriaText}</span>
                      <span className="font-mono text-[10px]">
                        [{item.points}pt]
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Score bar */}
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-dark-border">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(pointsAwarded / q.maxPoints) * 100}%`,
                  backgroundColor:
                    pointsAwarded === q.maxPoints
                      ? "#10b981"
                      : pointsAwarded > 0
                        ? "#f59e0b"
                        : "#ef4444",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
