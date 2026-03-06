"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Hex, ProgressRecord } from "@/lib/learning-hub-types";

const TYPE_COLORS: Record<string, string> = {
  lesson: "#3b82f6",
  activity: "#22c55e",
  assessment: "#f59e0b",
  resource: "#8b5cf6",
  checkpoint: "#ef4444",
};

const SBAR_LABELS: Record<string, string> = {
  KU: "Knowledge & Understanding",
  TT: "Thinking & Transferring",
  C: "Communication",
};

const STRAND_COLORS: Record<string, string> = {
  KU: "#3b82f6",
  TT: "#f59e0b",
  C: "#a855f7",
};

export interface LessonOverviewProps {
  hex: Hex;
  progressState: "complete" | "active" | "locked";
  progressRecord: ProgressRecord | null;
  hexIndex: number;
  totalHexes: number;
  onMarkComplete: () => void;
  onClose: () => void;
}

export default function LessonOverview({
  hex,
  progressState,
  progressRecord,
  hexIndex,
  totalHexes,
  onMarkComplete,
  onClose,
}: LessonOverviewProps) {
  const [showToast, setShowToast] = useState(false);
  const typeColor = TYPE_COLORS[hex.type] ?? "#5a5a7a";

  const handleMarkComplete = () => {
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      onMarkComplete();
    }, 1500);
  };

  const labelStyle =
    "block font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary mb-1";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="flex h-full w-[320px] shrink-0 flex-col border-l border-dark-border bg-dark-surface"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-border px-4 py-3">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-text-primary">
            Lesson Details
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:bg-dark-elevated hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Progress indicator */}
          <div className="rounded-md bg-dark-elevated px-3 py-2 text-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
              Hex {hexIndex} of {totalHexes}
            </span>
          </div>

          {/* Icon + Title */}
          <div className="text-center">
            <div className="mb-2 text-3xl">{hex.icon}</div>
            <h3 className="text-sm font-semibold text-text-primary">
              {hex.label}
            </h3>
          </div>

          {/* Type badge */}
          <div>
            <label className={labelStyle}>Type</label>
            <span
              className="inline-block rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-white"
              style={{ backgroundColor: typeColor + "40" }}
            >
              {hex.type}
            </span>
          </div>

          {/* Grading Strands */}
          <div>
            <label className={labelStyle}>Grading Strands</label>
            <div className="flex flex-wrap gap-1.5">
              {hex.sbarDomains.map((strand) => (
                <span
                  key={strand}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono font-bold uppercase"
                  style={{
                    backgroundColor: (STRAND_COLORS[strand] ?? "#5a5a7a") + "20",
                    color: STRAND_COLORS[strand] ?? "#5a5a7a",
                  }}
                >
                  {strand}
                  <span className="font-normal text-text-muted">
                    {SBAR_LABELS[strand] ?? strand}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className={labelStyle}>Estimated Duration</label>
            <span className="text-sm text-text-secondary">
              {hex.estimatedMinutes} minutes
            </span>
          </div>

          {/* Description */}
          <div>
            <label className={labelStyle}>Description</label>
            <p className="text-xs leading-relaxed text-text-secondary">
              {hex.description}
            </p>
          </div>

          {/* Google Slides */}
          <div>
            <label className={labelStyle}>Google Slides</label>
            {hex.slidesUrl ? (
              <a
                href={hex.slidesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#00f0ff] hover:underline"
              >
                Open Slides →
              </a>
            ) : (
              <span className="text-xs text-text-muted">
                No slides attached
              </span>
            )}
          </div>

          {/* Progress-specific content */}
          {progressState === "complete" && progressRecord && (
            <div className="space-y-2 rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/5 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">✅</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#22c55e]">
                  Completed
                </span>
              </div>
              {progressRecord.completedAt && (
                <div className="text-[10px] text-text-muted">
                  {new Date(progressRecord.completedAt).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </div>
              )}
              {progressRecord.score !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">Score:</span>
                  <span className="rounded-full bg-[#22c55e]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#22c55e]">
                    {progressRecord.score}/{progressRecord.maxScore}
                  </span>
                </div>
              )}
              {progressRecord.teacherApproved && (
                <div className="text-[10px] text-text-muted">
                  ✓ Teacher approved
                </div>
              )}
            </div>
          )}

          {progressState === "active" && (
            <div className="space-y-2 rounded-lg border border-[#00f0ff]/30 bg-[#00f0ff]/5 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">📖</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#00f0ff]">
                  In Progress
                </span>
              </div>
              <p className="text-[10px] leading-relaxed text-text-muted">
                Complete this lesson to unlock the next step in your pathway.
              </p>
            </div>
          )}
        </div>

        {/* Action button */}
        {progressState === "active" && (
          <div className="border-t border-dark-border p-4">
            <button
              onClick={handleMarkComplete}
              className="w-full rounded-md bg-[#22c55e]/15 px-3 py-2.5 text-xs font-mono uppercase tracking-wider text-[#22c55e] hover:bg-[#22c55e]/25 transition-colors"
            >
              Mark Complete
            </button>
          </div>
        )}

        {/* Toast */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-md bg-[#22c55e]/20 px-4 py-2 text-xs text-[#22c55e]"
            >
              Marked complete!
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
