"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { UBDUnit, Course } from "@/lib/learning-hub-types";

export interface UBDPlannerProps {
  ubdUnits: UBDUnit[];
  courses: Course[];
}

interface ExpandedStages {
  [unitId: string]: Set<number>;
}

export default function UBDPlanner({ ubdUnits, courses }: UBDPlannerProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [expandedStages, setExpandedStages] = useState<ExpandedStages>({});
  const [showToast, setShowToast] = useState(false);

  // Filter units by course
  const filteredUnits = useMemo(() => {
    if (selectedCourseId === "all") return ubdUnits;
    return ubdUnits.filter((u) => u.courseId === selectedCourseId);
  }, [ubdUnits, selectedCourseId]);

  // Course lookup
  const courseMap = useMemo(() => {
    const m = new Map<string, Course>();
    for (const c of courses) m.set(c.id, c);
    return m;
  }, [courses]);

  const toggleStage = (unitId: string, stage: number) => {
    setExpandedStages((prev) => {
      const current = prev[unitId] ?? new Set<number>();
      const next = new Set(current);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return { ...prev, [unitId]: next };
    });
  };

  const isStageExpanded = (unitId: string, stage: number) =>
    expandedStages[unitId]?.has(stage) ?? false;

  const handleNewUnit = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
          UBD Planner ({filteredUnits.length} units)
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="rounded-md border border-dark-border bg-dark-elevated px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-[#00f0ff]/50 transition-colors"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <button
            onClick={handleNewUnit}
            className="shrink-0 rounded-md bg-[#00f0ff]/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#00f0ff] hover:bg-[#00f0ff]/20 transition-colors"
          >
            + New Unit
          </button>
        </div>
      </div>

      {/* Unit cards */}
      <div className="space-y-4">
        {filteredUnits.map((unit, i) => {
          const course = courseMap.get(unit.courseId);

          return (
            <motion.div
              key={unit.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="rounded-xl border border-dark-border bg-dark-surface overflow-hidden"
            >
              {/* Unit header */}
              <div className="p-5">
                <div className="mb-2 flex items-center gap-2">
                  {course && (
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: course.color }}
                    />
                  )}
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted">
                    {course?.title ?? "Unknown Course"}
                  </span>
                </div>

                <h4 className="mb-2 text-sm font-semibold text-text-primary">
                  Unit {unit.unitNumber}: {unit.title}
                </h4>

                {/* Completion bar */}
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-dark-elevated">
                    <div
                      className="h-full rounded-full bg-[#22c55e] transition-all"
                      style={{ width: `${unit.completionPercentage}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-text-muted">
                    {unit.completionPercentage}%
                  </span>
                </div>
              </div>

              {/* Three UBD stages */}
              <div className="border-t border-dark-border">
                {/* Stage 1: Desired Results */}
                <StageSection
                  unitId={unit.id}
                  stage={1}
                  title="Stage 1: Desired Results"
                  color="#3b82f6"
                  isExpanded={isStageExpanded(unit.id, 1)}
                  onToggle={() => toggleStage(unit.id, 1)}
                >
                  <div className="space-y-3">
                    <div>
                      <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1.5">
                        Enduring Understandings
                      </label>
                      <ul className="space-y-1">
                        {unit.stage1.understandings.map((u, idx) => (
                          <li
                            key={idx}
                            className="flex gap-2 text-xs text-text-secondary"
                          >
                            <span className="text-[#3b82f6] shrink-0">•</span>
                            {u}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1.5">
                        Essential Questions
                      </label>
                      <ul className="space-y-1">
                        {unit.stage1.essentialQuestions.map((q, idx) => (
                          <li
                            key={idx}
                            className="flex gap-2 text-xs text-text-secondary"
                          >
                            <span className="text-[#3b82f6] shrink-0">?</span>
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </StageSection>

                {/* Stage 2: Evidence */}
                <StageSection
                  unitId={unit.id}
                  stage={2}
                  title="Stage 2: Assessment Evidence"
                  color="#f59e0b"
                  isExpanded={isStageExpanded(unit.id, 2)}
                  onToggle={() => toggleStage(unit.id, 2)}
                >
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1.5">
                      Performance Tasks &amp; Assessments
                    </label>
                    <ul className="space-y-1">
                      {unit.stage2.assessments.map((a, idx) => (
                        <li
                          key={idx}
                          className="flex gap-2 text-xs text-text-secondary"
                        >
                          <span className="text-[#f59e0b] shrink-0">•</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </StageSection>

                {/* Stage 3: Learning Plan */}
                <StageSection
                  unitId={unit.id}
                  stage={3}
                  title="Stage 3: Learning Plan"
                  color="#22c55e"
                  isExpanded={isStageExpanded(unit.id, 3)}
                  onToggle={() => toggleStage(unit.id, 3)}
                >
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1.5">
                      Learning Activities
                    </label>
                    <ul className="space-y-1">
                      {unit.stage3.activities.map((a, idx) => (
                        <li
                          key={idx}
                          className="flex gap-2 text-xs text-text-secondary"
                        >
                          <span className="text-[#22c55e] shrink-0">•</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </StageSection>
              </div>
            </motion.div>
          );
        })}

        {filteredUnits.length === 0 && (
          <div className="rounded-xl border border-dashed border-dark-border p-8 text-center text-xs text-text-muted">
            No units for selected course
          </div>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-md bg-dark-surface border border-dark-border px-4 py-2 text-xs text-text-muted shadow-xl z-50"
          >
            Demo mode — unit creation disabled
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Collapsible stage section ---
function StageSection({
  unitId,
  stage,
  title,
  color,
  isExpanded,
  onToggle,
  children,
}: {
  unitId: string;
  stage: number;
  title: string;
  color: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-dark-border">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-dark-elevated/30"
      >
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-medium text-text-primary">
            {title}
          </span>
        </div>
        <span
          className={`text-[10px] text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-5 pb-4"
              style={{ borderLeft: `2px solid ${color}30`, marginLeft: 20 }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
