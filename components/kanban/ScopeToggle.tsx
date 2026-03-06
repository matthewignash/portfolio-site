"use client";

import { motion } from "framer-motion";

interface ScopeToggleProps {
  scope: "team" | "admin";
  onToggle: (scope: "team" | "admin") => void;
}

export default function ScopeToggle({ scope, onToggle }: ScopeToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
        Scope
      </span>
      <div className="relative flex rounded-lg border border-dark-border bg-dark-void p-1">
        {/* Sliding background */}
        <motion.div
          className="absolute inset-y-1 rounded-md"
          style={{
            backgroundColor: scope === "team" ? "#3b82f6" : "#8b5cf6",
            width: "calc(50% - 4px)",
          }}
          animate={{ x: scope === "team" ? 0 : "calc(100% + 4px)" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />

        <button
          onClick={() => onToggle("team")}
          className={`relative z-10 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
            scope === "team" ? "text-white" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Department
        </button>
        <button
          onClick={() => onToggle("admin")}
          className={`relative z-10 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
            scope === "admin" ? "text-white" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          School-wide
        </button>
      </div>

      {/* Scope label */}
      <motion.span
        key={scope}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs text-text-secondary"
      >
        {scope === "team" ? "Science Team Dashboard" : "Administrator Dashboard"}
      </motion.span>
    </div>
  );
}
