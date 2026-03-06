"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { EALStrategy } from "@/lib/learning-hub-types";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "vocabulary", label: "Vocabulary" },
  { value: "scaffolding", label: "Scaffolding" },
  { value: "visual", label: "Visual" },
  { value: "collaborative", label: "Collaborative" },
  { value: "assessment", label: "Assessment" },
];

const WIDA_LEVELS = [1, 2, 3, 4, 5, 6];

export interface EALStrategiesTabProps {
  strategies: EALStrategy[];
}

export default function EALStrategiesTab({
  strategies,
}: EALStrategiesTabProps) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showPromptBuilder, setShowPromptBuilder] = useState(false);
  const [promptLevel, setPromptLevel] = useState(2);
  const [promptSkill, setPromptSkill] = useState("reading");
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return strategies;
    return strategies.filter((s) => s.category === categoryFilter);
  }, [strategies, categoryFilter]);

  const handleGeneratePrompt = () => {
    const prompts: Record<string, string> = {
      reading: `Create a scaffolded reading activity for a WIDA Level ${promptLevel} EAL student. Include:\n- Pre-reading vocabulary preview with visual supports\n- Sentence frames for comprehension responses\n- Graphic organizer for main ideas\n- Home language connections where possible`,
      writing: `Design a writing task for a WIDA Level ${promptLevel} EAL student. Include:\n- Model text with highlighted language features\n- Word bank with academic vocabulary\n- Sentence starters appropriate for WIDA Level ${promptLevel}\n- Peer review checklist with simple language`,
      speaking: `Plan a speaking activity for a WIDA Level ${promptLevel} EAL student. Include:\n- Discussion prompts with visual cues\n- Sentence frames for academic discussions\n- Partner work structure with defined roles\n- Self-assessment checklist for oral language`,
      listening: `Create a listening comprehension task for a WIDA Level ${promptLevel} EAL student. Include:\n- Pre-listening vocabulary with images\n- Graphic organizer to complete while listening\n- Multiple-choice and short-answer questions\n- Option to listen multiple times with note-taking support`,
    };
    setGeneratedPrompt(prompts[promptSkill] ?? prompts.reading);
  };

  return (
    <div className="space-y-5">
      {/* Filter + Prompt Builder toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-dark-border bg-dark-elevated px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-[#00f0ff]/50 transition-colors"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="font-mono text-[10px] text-text-muted">
            {filtered.length} strategies
          </span>
        </div>
        <button
          onClick={() => setShowPromptBuilder(!showPromptBuilder)}
          className={`rounded-md px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
            showPromptBuilder
              ? "bg-[#a855f7]/15 text-[#a855f7]"
              : "bg-dark-elevated text-text-muted hover:text-text-secondary"
          }`}
        >
          🤖 AI Prompt Builder
        </button>
      </div>

      {/* AI Prompt Builder panel */}
      <AnimatePresence>
        {showPromptBuilder && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/5 p-5 space-y-3">
              <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#a855f7]">
                AI Prompt Builder
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1">
                    WIDA Level
                  </label>
                  <div className="flex gap-1">
                    {WIDA_LEVELS.map((level) => (
                      <button
                        key={level}
                        onClick={() => setPromptLevel(level)}
                        className={`flex-1 rounded-md py-1.5 text-[10px] font-mono transition-colors ${
                          promptLevel === level
                            ? "bg-[#a855f7]/20 text-[#a855f7] ring-1 ring-[#a855f7]/50"
                            : "bg-dark-elevated text-text-muted hover:text-text-secondary"
                        }`}
                      >
                        L{level}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1">
                    Skill Focus
                  </label>
                  <select
                    value={promptSkill}
                    onChange={(e) => setPromptSkill(e.target.value)}
                    className="w-full rounded-md border border-dark-border bg-dark-elevated px-3 py-1.5 text-xs text-text-primary outline-none"
                  >
                    <option value="reading">Reading</option>
                    <option value="writing">Writing</option>
                    <option value="speaking">Speaking</option>
                    <option value="listening">Listening</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleGeneratePrompt}
                className="rounded-md bg-[#a855f7]/15 px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#a855f7] hover:bg-[#a855f7]/25 transition-colors"
              >
                Generate Prompt
              </button>
              {generatedPrompt && (
                <div className="rounded-md bg-dark-elevated p-3 text-xs leading-relaxed text-text-secondary whitespace-pre-line font-mono">
                  {generatedPrompt}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strategy cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((strategy, i) => (
          <motion.div
            key={strategy.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: i * 0.03 }}
            className="rounded-xl border border-dark-border bg-dark-surface p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <h5 className="text-xs font-semibold text-text-primary">
                {strategy.title}
              </h5>
              <span className="rounded-full bg-dark-elevated px-2 py-0.5 text-[8px] font-mono uppercase text-text-muted">
                {strategy.category}
              </span>
            </div>

            {/* WIDA levels */}
            <div className="mb-2 flex gap-1">
              {strategy.widaLevels.map((level) => (
                <span
                  key={level}
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-[8px] font-bold bg-[#a855f7]/15 text-[#a855f7]"
                >
                  {level}
                </span>
              ))}
            </div>

            <p className="mb-2 text-[10px] leading-relaxed text-text-secondary">
              {strategy.description}
            </p>

            {/* Steps */}
            {strategy.steps.length > 0 && (
              <ol className="space-y-0.5">
                {strategy.steps.map((step, idx) => (
                  <li
                    key={idx}
                    className="flex gap-1.5 text-[10px] text-text-muted"
                  >
                    <span className="text-[#a855f7] shrink-0">
                      {idx + 1}.
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            )}
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-dark-border p-8 text-center text-xs text-text-muted">
          No strategies match the selected category
        </div>
      )}
    </div>
  );
}
