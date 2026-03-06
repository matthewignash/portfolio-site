"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { Standard } from "@/lib/learning-hub-types";

const FRAMEWORK_COLORS: Record<string, string> = {
  NGSS: "#3b82f6",
  CCSS: "#22c55e",
  IB: "#a855f7",
  Custom: "#f59e0b",
};

export interface StandardsLibraryProps {
  standards: Standard[];
}

export default function StandardsLibrary({
  standards,
}: StandardsLibraryProps) {
  const [search, setSearch] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  // Extract unique values for filter dropdowns
  const frameworks = useMemo(
    () => [...new Set(standards.map((s) => s.framework))],
    [standards]
  );
  const subjects = useMemo(
    () => [...new Set(standards.map((s) => s.subject))],
    [standards]
  );

  // Filter standards
  const filtered = useMemo(() => {
    return standards.filter((s) => {
      if (frameworkFilter !== "all" && s.framework !== frameworkFilter)
        return false;
      if (subjectFilter !== "all" && s.subject !== subjectFilter)
        return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.code.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [standards, frameworkFilter, subjectFilter, search]);

  const selectStyle =
    "rounded-md border border-dark-border bg-dark-elevated px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-[#00f0ff]/50 transition-colors";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
          Standards Library ({filtered.length}/{standards.length})
        </h3>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dark-border bg-dark-surface p-3">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search code or description..."
          className="min-w-[200px] flex-1 rounded-md border border-dark-border bg-dark-elevated px-3 py-1.5 text-xs text-text-primary outline-none placeholder:text-text-muted/50 focus:border-[#00f0ff]/50 transition-colors"
        />

        {/* Framework dropdown */}
        <select
          value={frameworkFilter}
          onChange={(e) => setFrameworkFilter(e.target.value)}
          className={selectStyle}
        >
          <option value="all">All Frameworks</option>
          {frameworks.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        {/* Subject dropdown */}
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className={selectStyle}
        >
          <option value="all">All Subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Standards list */}
      <div className="space-y-2">
        {filtered.map((std, i) => {
          const color = FRAMEWORK_COLORS[std.framework] ?? "#5a5a7a";
          return (
            <motion.div
              key={std.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.12, delay: i * 0.02 }}
              className="rounded-lg border border-dark-border bg-dark-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {/* Code + Framework */}
                  <div className="mb-1.5 flex items-center gap-2">
                    <code
                      className="rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold"
                      style={{
                        backgroundColor: color + "15",
                        color: color,
                      }}
                    >
                      {std.code}
                    </code>
                    <span
                      className="rounded-full px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider"
                      style={{
                        backgroundColor: color + "15",
                        color: color,
                      }}
                    >
                      {std.framework}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mb-2 text-xs leading-relaxed text-text-secondary">
                    {std.description}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-[10px] text-text-muted">
                    <span>{std.subject}</span>
                    <span>•</span>
                    <span>Grade {std.gradeLevel}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  {std.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-dark-elevated px-2 py-0.5 text-[9px] font-mono text-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-dark-border p-8 text-center text-xs text-text-muted">
            No standards match your filters
          </div>
        )}
      </div>
    </div>
  );
}
