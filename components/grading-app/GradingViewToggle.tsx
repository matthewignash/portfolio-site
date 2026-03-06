"use client";

import { motion } from "framer-motion";

export type GradingView = "dashboard" | "grading" | "student";

interface GradingViewToggleProps {
  view: GradingView;
  onToggle: (view: GradingView) => void;
}

const TABS: { id: GradingView; label: string; subtitle: string }[] = [
  { id: "dashboard", label: "Dashboard", subtitle: "Class Analytics" },
  { id: "grading", label: "Grading", subtitle: "Mark Papers" },
  { id: "student", label: "Student", subtitle: "Exam Results" },
];

export default function GradingViewToggle({
  view,
  onToggle,
}: GradingViewToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
        View
      </span>
      <div className="relative flex rounded-full border border-dark-border bg-dark-void p-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onToggle(tab.id)}
            className={`relative z-10 rounded-full px-3 py-1 text-xs font-semibold transition-colors sm:px-4 ${
              view === tab.id ? "text-cyan-primary" : "text-text-muted"
            }`}
          >
            {tab.label}
            {view === tab.id && (
              <motion.div
                layoutId="grading-tab-bg"
                className="absolute inset-0 rounded-full border border-cyan-primary/40 bg-cyan-primary/20"
                style={{ zIndex: -1 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>
      <span className="hidden text-xs text-text-secondary sm:inline">
        {TABS.find((t) => t.id === view)?.subtitle}
      </span>
    </div>
  );
}
