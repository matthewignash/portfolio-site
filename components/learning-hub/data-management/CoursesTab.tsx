"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Course, LearningMap, UBDUnit } from "@/lib/learning-hub-types";

const GRADING_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  SBAR_8: { bg: "#3b82f6", text: "#93c5fd", label: "SBAR 1–8" },
  IB_DP_7: { bg: "#a855f7", text: "#d8b4fe", label: "IB DP 1–7" },
  Custom: { bg: "#6b7280", text: "#d1d5db", label: "Custom Scale" },
};

export interface CoursesTabProps {
  courses: Course[];
  maps: LearningMap[];
  ubdUnits: UBDUnit[];
}

export default function CoursesTab({
  courses,
  maps,
  ubdUnits,
}: CoursesTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleNewCourse = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
          Courses ({courses.length})
        </h3>
        <button
          onClick={handleNewCourse}
          className="rounded-md bg-[#00f0ff]/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#00f0ff] hover:bg-[#00f0ff]/20 transition-colors"
        >
          + New Course
        </button>
      </div>

      {/* Course grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course, i) => {
          const isExpanded = expandedId === course.id;
          const grading = GRADING_COLORS[course.gradingSystem] ?? GRADING_COLORS.Custom;
          const courseMaps = maps.filter((m) => course.mapIds.includes(m.id));
          const courseUnits = ubdUnits.filter((u) => u.courseId === course.id);

          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="rounded-xl border border-dark-border bg-dark-surface overflow-hidden"
            >
              {/* Card header */}
              <button
                onClick={() =>
                  setExpandedId(isExpanded ? null : course.id)
                }
                className="w-full p-5 text-left transition-colors hover:bg-dark-elevated/50"
              >
                {/* Color accent bar */}
                <div
                  className="mb-3 h-1 w-12 rounded-full"
                  style={{ backgroundColor: course.color }}
                />

                {/* Title */}
                <h4 className="mb-1 text-sm font-semibold text-text-primary">
                  {course.title}
                </h4>

                {/* Subject + Grade */}
                <p className="mb-3 text-xs text-text-muted">
                  {course.subject} · Grade {course.gradeLevel}
                </p>

                {/* Badges row */}
                <div className="flex flex-wrap gap-2">
                  {/* Grading system badge */}
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-wider"
                    style={{
                      backgroundColor: grading.bg + "20",
                      color: grading.text,
                    }}
                  >
                    {grading.label}
                  </span>

                  {/* Unit count */}
                  <span className="rounded-full bg-dark-elevated px-2.5 py-0.5 text-[9px] font-mono text-text-muted">
                    {course.unitCount} units
                  </span>

                  {/* Student count */}
                  <span className="rounded-full bg-dark-elevated px-2.5 py-0.5 text-[9px] font-mono text-text-muted">
                    {course.studentCount} students
                  </span>
                </div>

                {/* Expand chevron */}
                <div className="mt-3 flex justify-center">
                  <span
                    className={`text-[10px] text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    ▼
                  </span>
                </div>
              </button>

              {/* Expanded details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 border-t border-dark-border px-5 py-4">
                      {/* Linked Maps */}
                      <div>
                        <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1.5">
                          Linked Maps
                        </label>
                        {courseMaps.length > 0 ? (
                          <div className="space-y-1">
                            {courseMaps.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center justify-between rounded-md bg-dark-elevated px-3 py-1.5"
                              >
                                <span className="text-xs text-text-secondary">
                                  {m.title}
                                </span>
                                <span className="text-[9px] font-mono text-text-muted">
                                  {m.hexCount} hexes
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted">
                            No maps linked
                          </span>
                        )}
                      </div>

                      {/* UBD Units */}
                      <div>
                        <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1.5">
                          UBD Units
                        </label>
                        {courseUnits.length > 0 ? (
                          <div className="space-y-1">
                            {courseUnits.map((u) => (
                              <div
                                key={u.id}
                                className="flex items-center justify-between rounded-md bg-dark-elevated px-3 py-1.5"
                              >
                                <span className="text-xs text-text-secondary">
                                  Unit {u.unitNumber}: {u.title}
                                </span>
                                <span className="text-[9px] font-mono text-text-muted">
                                  {u.completionPercentage}%
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted">
                            No units planned
                          </span>
                        )}
                      </div>

                      {/* Grading scale */}
                      <div>
                        <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1.5">
                          Grading Scale
                        </label>
                        <p className="text-[10px] leading-relaxed text-text-secondary">
                          {course.gradingSystem === "SBAR_8"
                            ? "Standards-Based Assessment & Reporting (1–8 scale). Strands: Knowledge & Understanding, Thinking & Transferring, Communication."
                            : course.gradingSystem === "IB_DP_7"
                              ? "IB Diploma Programme (1–7 scale). Assessed through internal assessments and external examinations."
                              : "Custom grading scale defined by department. Supports flexible rubric-based grading."}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
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
            Demo mode — course creation disabled
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
