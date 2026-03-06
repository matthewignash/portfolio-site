"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  ClassSection,
  Course,
  Student,
  LearningMap,
} from "@/lib/learning-hub-types";

export interface ClassesTabProps {
  classes: ClassSection[];
  courses: Course[];
  students: Student[];
  maps: LearningMap[];
}

export default function ClassesTab({
  classes,
  courses,
  students,
  maps,
}: ClassesTabProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Build lookup maps
  const courseMap = useMemo(() => {
    const m = new Map<string, Course>();
    for (const c of courses) m.set(c.id, c);
    return m;
  }, [courses]);

  const studentMap = useMemo(() => {
    const m = new Map<string, Student>();
    for (const s of students) m.set(s.id, s);
    return m;
  }, [students]);

  const mapLookup = useMemo(() => {
    const m = new Map<string, LearningMap>();
    for (const map of maps) m.set(map.id, map);
    return m;
  }, [maps]);

  // Filter classes by search
  const filtered = useMemo(() => {
    if (!search.trim()) return classes;
    const q = search.toLowerCase();
    return classes.filter((cls) => {
      const course = courseMap.get(cls.courseId);
      return (
        cls.name.toLowerCase().includes(q) ||
        course?.title.toLowerCase().includes(q) ||
        cls.period.toLowerCase().includes(q)
      );
    });
  }, [classes, search, courseMap]);

  const handleNewClass = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const labelStyle =
    "font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
          Classes ({classes.length})
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search classes..."
            className="w-48 rounded-md border border-dark-border bg-dark-elevated px-3 py-1.5 text-xs text-text-primary outline-none placeholder:text-text-muted/50 focus:border-[#00f0ff]/50 transition-colors"
          />
          <button
            onClick={handleNewClass}
            className="shrink-0 rounded-md bg-[#00f0ff]/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#00f0ff] hover:bg-[#00f0ff]/20 transition-colors"
          >
            + New Class
          </button>
        </div>
      </div>

      {/* Table header */}
      <div className="hidden sm:grid sm:grid-cols-5 gap-3 px-4 py-2">
        <span className={labelStyle}>Class Name</span>
        <span className={labelStyle}>Course</span>
        <span className={labelStyle}>Period</span>
        <span className={labelStyle}>Students</span>
        <span className={labelStyle}>Active Maps</span>
      </div>

      {/* Class rows */}
      <div className="space-y-2">
        {filtered.map((cls, i) => {
          const course = courseMap.get(cls.courseId);
          const isExpanded = expandedId === cls.id;
          const classStudents = cls.studentIds
            .map((id) => studentMap.get(id))
            .filter(Boolean) as Student[];
          const activeMaps = cls.activeMapIds
            .map((id) => mapLookup.get(id))
            .filter(Boolean) as LearningMap[];

          return (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: i * 0.03 }}
              className="rounded-lg border border-dark-border bg-dark-surface overflow-hidden"
            >
              {/* Row */}
              <button
                onClick={() =>
                  setExpandedId(isExpanded ? null : cls.id)
                }
                className="w-full grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-3 px-4 py-3 text-left transition-colors hover:bg-dark-elevated/50"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: course?.color ?? "#5a5a7a" }}
                  />
                  <span className="text-xs font-medium text-text-primary">
                    {cls.name}
                  </span>
                </div>
                <span className="text-xs text-text-secondary">
                  {course?.title ?? "—"}
                </span>
                <span className="text-xs text-text-muted">
                  Period {cls.period}
                </span>
                <span className="text-xs text-text-secondary">
                  {cls.studentIds.length} students
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">
                    {cls.activeMapIds.length} maps
                  </span>
                  <span
                    className={`text-[10px] text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    ▼
                  </span>
                </div>
              </button>

              {/* Expanded roster */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-dark-border px-4 py-3 space-y-3">
                      {/* Student roster */}
                      <div>
                        <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-2">
                          Student Roster
                        </label>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {classStudents.map((stu) => (
                            <div
                              key={stu.id}
                              className="flex items-center gap-2 rounded-md bg-dark-elevated px-3 py-1.5"
                            >
                              <div
                                className="h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                                style={{ backgroundColor: stu.avatarColor }}
                              >
                                {stu.firstName[0]}
                                {stu.lastName[0]}
                              </div>
                              <span className="text-xs text-text-secondary">
                                {stu.firstName} {stu.lastName}
                              </span>
                              {stu.supportProfile && (
                                <span className="ml-auto rounded-full bg-[#f59e0b]/15 px-1.5 py-0.5 text-[8px] font-mono text-[#f59e0b]">
                                  {stu.supportProfile.profileType}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Active maps */}
                      {activeMaps.length > 0 && (
                        <div>
                          <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-2">
                            Active Maps
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {activeMaps.map((m) => (
                              <span
                                key={m.id}
                                className="rounded-md bg-dark-elevated px-2.5 py-1 text-[10px] text-text-secondary"
                              >
                                {m.title} ({m.hexCount} hexes)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-dark-border p-8 text-center text-xs text-text-muted">
            No classes match your search
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
            Demo mode — class creation disabled
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
