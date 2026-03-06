"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const REPORTS = [
  {
    id: "class-progress",
    title: "Class Progress Report",
    description:
      "Overview of all students' progress across all maps. Includes completion rates, average scores, and at-risk student identification.",
    icon: "📊",
  },
  {
    id: "individual-student",
    title: "Individual Student Reports",
    description:
      "Detailed per-student reports with weekly activity, map-by-map progress, and KU/TT/C strand performance breakdown.",
    icon: "👤",
  },
  {
    id: "assessment-analysis",
    title: "Assessment Analysis",
    description:
      "Deep dive into assessment results. Score distributions, pass/fail rates, and item-level analysis per map.",
    icon: "📝",
  },
  {
    id: "engagement-summary",
    title: "Engagement Summary",
    description:
      "Login patterns, time-on-task metrics, and lesson completion trends over the past 8 weeks.",
    icon: "📈",
  },
  {
    id: "sbar-overview",
    title: "KU/TT/C Strand Overview",
    description:
      "Performance across Knowledge & Understanding, Thinking & Transferring, and Communication strands with class and individual breakdowns.",
    icon: "🎯",
  },
];

export default function ReportsTab() {
  const [showToast, setShowToast] = useState(false);

  const handleExport = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report, i) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className="rounded-xl border border-dark-border bg-dark-surface p-5"
          >
            <div className="mb-3 text-2xl">{report.icon}</div>
            <h4 className="mb-2 text-sm font-semibold text-text-primary">
              {report.title}
            </h4>
            <p className="mb-4 text-xs leading-relaxed text-text-secondary">
              {report.description}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex-1 rounded-md bg-[#00f0ff]/10 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#00f0ff] hover:bg-[#00f0ff]/20 transition-colors"
              >
                Export PDF
              </button>
              <button
                onClick={handleExport}
                className="flex-1 rounded-md bg-dark-elevated py-1.5 text-[10px] font-mono uppercase tracking-wider text-text-muted hover:text-text-secondary transition-colors"
              >
                Export CSV
              </button>
            </div>
          </motion.div>
        ))}
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
            Demo mode — export disabled
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
