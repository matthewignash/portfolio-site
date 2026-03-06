"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TeachingMethodContent } from "@/lib/learning-hub-types";

const CATEGORY_TABS = [
  { id: "getting_started", label: "Getting Started" },
  { id: "key_concepts", label: "Key Concepts" },
  { id: "demo", label: "Interactive Demo" },
  { id: "setup", label: "Setup Guide" },
  { id: "templates", label: "Templates" },
];

export interface TeachingMethodsTabProps {
  methods: TeachingMethodContent[];
}

export default function TeachingMethodsTab({
  methods,
}: TeachingMethodsTabProps) {
  const [activeCategory, setActiveCategory] = useState("getting_started");

  const filtered = useMemo(
    () =>
      methods
        .filter((m) => m.category === activeCategory)
        .sort((a, b) => a.order - b.order),
    [methods, activeCategory]
  );

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-dark-border bg-dark-surface p-1.5">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`rounded-md px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.1em] transition-colors ${
              activeCategory === tab.id
                ? "bg-[#00f0ff]/15 text-[#00f0ff]"
                : "text-text-muted hover:text-text-secondary hover:bg-dark-elevated"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="space-y-3"
        >
          {filtered.map((method, i) => (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: i * 0.05 }}
              className="rounded-xl border border-dark-border bg-dark-surface p-5"
            >
              <h4 className="mb-2 text-sm font-semibold text-text-primary">
                {method.title}
              </h4>
              <p className="text-xs leading-relaxed text-text-secondary whitespace-pre-line">
                {method.content}
              </p>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-dark-border p-8 text-center text-xs text-text-muted">
              No content for this category yet
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
