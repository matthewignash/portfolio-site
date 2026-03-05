"use client";

import { motion } from "framer-motion";
import { useMode } from "@/lib/modeContext";

export default function ModeToggle() {
  const { mode, toggleMode } = useMode();
  const isLearning = mode === "learning";

  return (
    <button
      onClick={toggleMode}
      className="group relative flex w-full items-center gap-3 rounded-lg border border-dark-border bg-dark-surface p-3 transition-all duration-400 hover:border-accent-dim"
      aria-label={`Switch to ${isLearning ? "Portfolio" : "Learning"} mode`}
    >
      {/* Track */}
      <div className="relative h-6 w-11 shrink-0 rounded-full bg-dark-void">
        {/* Sliding indicator */}
        <motion.div
          className="absolute top-1 h-4 w-4 rounded-full"
          style={{ backgroundColor: "var(--color-accent)" }}
          animate={{ left: isLearning ? 22 : 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>

      {/* Label */}
      <div className="flex flex-col items-start">
        <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted">
          Current Mode
        </span>
        <motion.span
          key={mode}
          className="text-sm font-semibold"
          style={{ color: "var(--color-accent)" }}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isLearning ? "Learning" : "Portfolio"}
        </motion.span>
      </div>
    </button>
  );
}
