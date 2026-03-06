"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  Hex,
  HexType,
  HexStatus,
  DiffPathway,
  MTSSTier,
  SBARStrand,
  AISCCompetency,
  AISCValue,
  UBDStage,
} from "@/lib/learning-hub-types";

const ICON_OPTIONS = ["🔬", "📖", "🧪", "✏️", "🔍", "💡", "📊", "🎯", "🧬", "⚗️", "📐", "🌡️"];
const TYPE_OPTIONS: { value: HexType; label: string; color: string }[] = [
  { value: "lesson", label: "Lesson", color: "#3b82f6" },
  { value: "activity", label: "Activity", color: "#22c55e" },
  { value: "assessment", label: "Assessment", color: "#f59e0b" },
  { value: "resource", label: "Resource", color: "#8b5cf6" },
  { value: "checkpoint", label: "Checkpoint", color: "#ef4444" },
];
const STATUS_OPTIONS: HexStatus[] = ["draft", "published", "archived"];

// Grading strands (8-point SBAR scale)
const STRAND_OPTIONS: { value: SBARStrand; label: string; fullName: string; color: string }[] = [
  { value: "KU", label: "KU", fullName: "Knowledge & Understanding", color: "#3b82f6" },
  { value: "TT", label: "TT", fullName: "Thinking & Transferring", color: "#f59e0b" },
  { value: "C", label: "C", fullName: "Communication", color: "#a855f7" },
];

// AISC Institutional Competencies
const COMPETENCY_OPTIONS: { value: AISCCompetency; label: string; abbr: string; color: string }[] = [
  { value: "criticalThinkers", label: "Critical Thinkers", abbr: "CT", color: "#6366f1" },
  { value: "resilientLearners", label: "Resilient Learners", abbr: "RL", color: "#f59e0b" },
  { value: "skillfulCommunicators", label: "Skillful Communicators", abbr: "SC", color: "#06b6d4" },
  { value: "effectiveCollaborators", label: "Effective Collaborators", abbr: "EC", color: "#10b981" },
  { value: "digitalNavigators", label: "Digital Navigators", abbr: "DN", color: "#8b5cf6" },
  { value: "changeMakers", label: "Change Makers", abbr: "CM", color: "#ef4444" },
];

// AISC Institutional Values
const VALUE_OPTIONS: { value: AISCValue; label: string; color: string }[] = [
  { value: "discovery", label: "Discovery", color: "#3b82f6" },
  { value: "belonging", label: "Belonging", color: "#22c55e" },
  { value: "wellbeing", label: "Wellbeing", color: "#f59e0b" },
  { value: "responsibility", label: "Responsibility", color: "#8b5cf6" },
  { value: "purpose", label: "Purpose", color: "#06b6d4" },
];

// UBD Stages
const UBD_OPTIONS: { value: UBDStage; label: string; description: string }[] = [
  { value: "stage1", label: "Stage 1", description: "Desired Results" },
  { value: "stage2", label: "Stage 2", description: "Assessment Evidence" },
  { value: "stage3", label: "Stage 3", description: "Learning Plan" },
  { value: "unassigned", label: "None", description: "Unassigned" },
];

// Differentiation pathways
const PATHWAY_OPTIONS: { value: DiffPathway; label: string; color: string }[] = [
  { value: "scaffolded", label: "Scaffolded", color: "#22c55e" },
  { value: "standard", label: "Standard", color: "#3b82f6" },
  { value: "enrichment", label: "Enrichment", color: "#a855f7" },
];

const TIER_OPTIONS: { value: MTSSTier; label: string; color: string }[] = [
  { value: 1, label: "Tier 1", color: "#6b7280" },
  { value: 2, label: "Tier 2", color: "#f59e0b" },
  { value: 3, label: "Tier 3", color: "#ef4444" },
];

const INTENSITY_OPTIONS = ["minimal", "moderate", "intensive"] as const;

export interface HexEditorProps {
  hex: Hex;
  onUpdate: (hexId: string, updates: Partial<Hex>) => void;
  onDelete: (hexId: string) => void;
  onClose: () => void;
}

export default function HexEditor({
  hex,
  onUpdate,
  onDelete,
  onClose,
}: HexEditorProps) {
  const [showToast, setShowToast] = useState(false);
  const [curriculumExpanded, setCurriculumExpanded] = useState(true);
  const [diffExpanded, setDiffExpanded] = useState(false);
  const [widaExpanded, setWidaExpanded] = useState(true);
  const [udlExpanded, setUdlExpanded] = useState(false);

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const labelStyle =
    "block font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary mb-1";
  const inputStyle =
    "w-full rounded-md border border-dark-border bg-dark-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-[#00f0ff] transition-colors";
  const sectionHeaderStyle =
    "flex items-center justify-between w-full py-2 px-3 rounded-md bg-dark-elevated hover:bg-dark-border transition-colors cursor-pointer";

  const currentPathway = hex.diffPathway ?? undefined;
  const isScaffolded = currentPathway === "scaffolded";

  // Toggle helpers for multi-select arrays
  const toggleStrand = (strand: SBARStrand) => {
    const current = hex.sbarDomains ?? [];
    const next = current.includes(strand)
      ? current.filter((s) => s !== strand)
      : [...current, strand];
    onUpdate(hex.id, { sbarDomains: next.length > 0 ? next : [strand] });
  };

  const toggleCompetency = (comp: AISCCompetency) => {
    const current = hex.competencies ?? [];
    const next = current.includes(comp)
      ? current.filter((c) => c !== comp)
      : [...current, comp];
    onUpdate(hex.id, { competencies: next });
  };

  const toggleValue = (val: AISCValue) => {
    const current = hex.valuesAlignment ?? [];
    const next = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    onUpdate(hex.id, { valuesAlignment: next });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="flex h-full w-[320px] shrink-0 flex-col border-l border-dark-border bg-dark-surface"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-border px-4 py-3">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-text-primary">
            Hex Editor
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:bg-dark-elevated hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form fields */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Label */}
          <div>
            <label className={labelStyle}>Label</label>
            <input
              type="text"
              value={hex.label}
              onChange={(e) => onUpdate(hex.id, { label: e.target.value })}
              className={inputStyle}
            />
          </div>

          {/* Icon picker */}
          <div>
            <label className={labelStyle}>Icon</label>
            <div className="grid grid-cols-6 gap-1">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => onUpdate(hex.id, { icon })}
                  className={`flex h-8 w-8 items-center justify-center rounded text-base transition-colors ${
                    hex.icon === icon
                      ? "bg-[#00f0ff]/20 ring-1 ring-[#00f0ff]"
                      : "bg-dark-elevated hover:bg-dark-border"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Type + Status row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelStyle}>Type</label>
              <div className="flex flex-wrap gap-1">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onUpdate(hex.id, { type: opt.value })}
                    className={`rounded-full px-2 py-1 text-[9px] font-mono uppercase tracking-wider transition-all ${
                      hex.type === opt.value
                        ? "text-white ring-1"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                    style={{
                      backgroundColor:
                        hex.type === opt.value ? opt.color + "30" : "transparent",
                      borderColor: hex.type === opt.value ? opt.color : "transparent",
                      ...(hex.type === opt.value && { ringColor: opt.color }),
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className={labelStyle}>Status</label>
            <div className="flex gap-1">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  onClick={() => onUpdate(hex.id, { status })}
                  className={`flex-1 rounded-md py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                    hex.status === status
                      ? "bg-[#00f0ff]/15 text-[#00f0ff] ring-1 ring-[#00f0ff]/50"
                      : "bg-dark-elevated text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* ═══ GRADING STRANDS (KU / TT / C) ═══ */}
          <div className="border-t border-dark-border pt-3">
            <label className={labelStyle}>Grading Strands (SBAR)</label>
            <div className="flex gap-1.5">
              {STRAND_OPTIONS.map((opt) => {
                const active = hex.sbarDomains?.includes(opt.value) ?? false;
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleStrand(opt.value)}
                    className={`flex-1 flex flex-col items-center gap-0.5 rounded-md py-2 transition-all ${
                      active
                        ? "text-white ring-1"
                        : "bg-dark-elevated text-text-muted hover:text-text-secondary"
                    }`}
                    style={{
                      backgroundColor: active ? opt.color + "25" : undefined,
                      ...(active && { ringColor: opt.color + "60", borderColor: opt.color }),
                    }}
                  >
                    <span className="text-xs font-bold" style={active ? { color: opt.color } : undefined}>
                      {opt.label}
                    </span>
                    <span className="text-[8px] font-mono text-text-muted leading-tight text-center">
                      {opt.fullName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══ CURRICULUM METADATA SECTION ═══ */}
          <div className="border-t border-dark-border pt-3">
            <button
              onClick={() => setCurriculumExpanded(!curriculumExpanded)}
              className={sectionHeaderStyle}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary">
                  Curriculum Alignment
                </span>
                {(hex.competencies?.length || hex.ubdStage) && (
                  <span className="rounded-full bg-[#06b6d4]/20 px-2 py-0.5 text-[9px] font-mono text-[#06b6d4]">
                    {(hex.competencies?.length ?? 0) + (hex.valuesAlignment?.length ?? 0)} tags
                  </span>
                )}
              </div>
              <span className="text-text-muted text-xs">
                {curriculumExpanded ? "▾" : "▸"}
              </span>
            </button>

            <AnimatePresence>
              {curriculumExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-3">
                    {/* AISC Competencies */}
                    <div>
                      <label className={labelStyle}>AISC Competencies</label>
                      <div className="grid grid-cols-3 gap-1">
                        {COMPETENCY_OPTIONS.map((opt) => {
                          const active = hex.competencies?.includes(opt.value) ?? false;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => toggleCompetency(opt.value)}
                              className={`flex flex-col items-center gap-0.5 rounded-md py-1.5 transition-all ${
                                active
                                  ? "ring-1"
                                  : "bg-dark-elevated text-text-muted hover:text-text-secondary"
                              }`}
                              style={{
                                backgroundColor: active ? opt.color + "20" : undefined,
                                ...(active && { ringColor: opt.color + "50" }),
                              }}
                            >
                              <span
                                className="text-[10px] font-bold"
                                style={active ? { color: opt.color } : undefined}
                              >
                                {opt.abbr}
                              </span>
                              <span className="text-[7px] font-mono text-text-muted leading-tight text-center px-0.5">
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* AISC Values */}
                    <div>
                      <label className={labelStyle}>AISC Values</label>
                      <div className="flex flex-wrap gap-1">
                        {VALUE_OPTIONS.map((opt) => {
                          const active = hex.valuesAlignment?.includes(opt.value) ?? false;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => toggleValue(opt.value)}
                              className={`rounded-full px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider transition-all ${
                                active
                                  ? "text-white ring-1"
                                  : "text-text-muted hover:text-text-secondary"
                              }`}
                              style={{
                                backgroundColor: active ? opt.color + "25" : "transparent",
                                ...(active && { ringColor: opt.color + "50" }),
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* UBD Stage */}
                    <div>
                      <label className={labelStyle}>UbD Stage</label>
                      <div className="flex gap-1">
                        {UBD_OPTIONS.map((opt) => {
                          const active = hex.ubdStage === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => onUpdate(hex.id, { ubdStage: opt.value })}
                              className={`flex-1 flex flex-col items-center gap-0.5 rounded-md py-1.5 transition-colors ${
                                active
                                  ? "bg-[#00f0ff]/15 text-[#00f0ff] ring-1 ring-[#00f0ff]/50"
                                  : "bg-dark-elevated text-text-muted hover:text-text-secondary"
                              }`}
                            >
                              <span className="text-[10px] font-bold">{opt.label}</span>
                              <span className="text-[7px] font-mono leading-tight text-center">
                                {opt.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ATL Skills */}
                    <div>
                      <label className={labelStyle}>IB ATL Skills</label>
                      <input
                        type="text"
                        value={hex.atlSkills ?? ""}
                        onChange={(e) =>
                          onUpdate(hex.id, { atlSkills: e.target.value || undefined })
                        }
                        placeholder="e.g. Research, Communication, Thinking"
                        className={`${inputStyle} text-xs`}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══ UDL SECTION ═══ */}
          <div className="border-t border-dark-border pt-3">
            <button
              onClick={() => setUdlExpanded(!udlExpanded)}
              className={sectionHeaderStyle}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary">
                  UDL Strategies
                </span>
                {hex.udl && (
                  <span className="rounded-full bg-[#10b981]/20 px-2 py-0.5 text-[9px] font-mono text-[#10b981]">
                    {(hex.udl.representation?.length ?? 0) +
                      (hex.udl.actionExpression?.length ?? 0) +
                      (hex.udl.engagement?.length ?? 0)}{" "}
                    active
                  </span>
                )}
              </div>
              <span className="text-text-muted text-xs">
                {udlExpanded ? "▾" : "▸"}
              </span>
            </button>

            <AnimatePresence>
              {udlExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-3">
                    {/* Representation */}
                    <div>
                      <label className={labelStyle}>
                        <span className="inline-block h-2 w-2 rounded-full bg-[#3b82f6] mr-1.5" />
                        Representation
                      </label>
                      {hex.udl?.representation && hex.udl.representation.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {hex.udl.representation.map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-[#3b82f6]/10 px-2 py-0.5 text-[9px] font-mono text-[#3b82f6] ring-1 ring-[#3b82f6]/20"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-text-muted italic">
                          No strategies selected
                        </span>
                      )}
                    </div>

                    {/* Action & Expression */}
                    <div>
                      <label className={labelStyle}>
                        <span className="inline-block h-2 w-2 rounded-full bg-[#f59e0b] mr-1.5" />
                        Action & Expression
                      </label>
                      {hex.udl?.actionExpression && hex.udl.actionExpression.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {hex.udl.actionExpression.map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-[#f59e0b]/10 px-2 py-0.5 text-[9px] font-mono text-[#f59e0b] ring-1 ring-[#f59e0b]/20"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-text-muted italic">
                          No strategies selected
                        </span>
                      )}
                    </div>

                    {/* Engagement */}
                    <div>
                      <label className={labelStyle}>
                        <span className="inline-block h-2 w-2 rounded-full bg-[#22c55e] mr-1.5" />
                        Engagement
                      </label>
                      {hex.udl?.engagement && hex.udl.engagement.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {hex.udl.engagement.map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-[9px] font-mono text-[#22c55e] ring-1 ring-[#22c55e]/20"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-text-muted italic">
                          No strategies selected
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══ DIFFERENTIATION SECTION ═══ */}
          <div className="border-t border-dark-border pt-3">
            <button
              onClick={() => setDiffExpanded(!diffExpanded)}
              className={sectionHeaderStyle}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary">
                  Differentiation
                </span>
                {currentPathway && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-white"
                    style={{
                      backgroundColor:
                        PATHWAY_OPTIONS.find((p) => p.value === currentPathway)?.color + "40",
                    }}
                  >
                    {currentPathway}
                  </span>
                )}
              </div>
              <span className="text-text-muted text-xs">
                {diffExpanded ? "▾" : "▸"}
              </span>
            </button>

            <AnimatePresence>
              {diffExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-3">
                    {/* Pathway pills */}
                    <div>
                      <label className={labelStyle}>Pathway</label>
                      <div className="flex gap-1.5">
                        {PATHWAY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() =>
                              onUpdate(hex.id, {
                                diffPathway:
                                  hex.diffPathway === opt.value ? undefined : opt.value,
                                ...(opt.value !== "scaffolded" && hex.diffPathway === "scaffolded"
                                  ? { mtssTier: undefined, wida: undefined }
                                  : {}),
                              })
                            }
                            className={`flex-1 rounded-full py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all ${
                              hex.diffPathway === opt.value
                                ? "text-white ring-1"
                                : "text-text-muted hover:text-text-secondary"
                            }`}
                            style={{
                              backgroundColor:
                                hex.diffPathway === opt.value
                                  ? opt.color + "30"
                                  : "transparent",
                              borderColor:
                                hex.diffPathway === opt.value ? opt.color : "transparent",
                              ...(hex.diffPathway === opt.value && {
                                ringColor: opt.color,
                              }),
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* MTSS Tier */}
                    {isScaffolded && (
                      <div>
                        <label className={labelStyle}>MTSS Tier</label>
                        <div className="flex gap-1">
                          {TIER_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() =>
                                onUpdate(hex.id, { mtssTier: opt.value })
                              }
                              className={`flex-1 rounded-md py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                                hex.mtssTier === opt.value
                                  ? "text-white ring-1"
                                  : "bg-dark-elevated text-text-muted hover:text-text-secondary"
                              }`}
                              style={{
                                backgroundColor:
                                  hex.mtssTier === opt.value
                                    ? opt.color + "25"
                                    : undefined,
                                ...(hex.mtssTier === opt.value && {
                                  ringColor: opt.color + "60",
                                  borderColor: opt.color,
                                }),
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══ WIDA SUPPORT SECTION ═══ (only for scaffolded) */}
          {isScaffolded && (
            <div className="border-t border-dark-border pt-3">
              <button
                onClick={() => setWidaExpanded(!widaExpanded)}
                className={sectionHeaderStyle}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary">
                    WIDA Support
                  </span>
                  {hex.wida && (
                    <span className="rounded-full bg-[#22c55e]/20 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-[#22c55e]">
                      L{hex.wida.supportedLevels.join(",")}
                    </span>
                  )}
                </div>
                <span className="text-text-muted text-xs">
                  {widaExpanded ? "▾" : "▸"}
                </span>
              </button>

              <AnimatePresence>
                {widaExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pt-3">
                      {/* Target WIDA Levels */}
                      <div>
                        <label className={labelStyle}>Target WIDA Levels</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5, 6].map((level) => {
                            const active =
                              hex.wida?.supportedLevels?.includes(level) ?? false;
                            return (
                              <button
                                key={level}
                                className={`flex-1 rounded-md py-1.5 text-[10px] font-mono font-bold transition-colors ${
                                  active
                                    ? "bg-[#22c55e]/20 text-[#22c55e] ring-1 ring-[#22c55e]/50"
                                    : "bg-dark-elevated text-text-muted hover:text-text-secondary"
                                }`}
                              >
                                L{level}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Scaffolding Intensity */}
                      <div>
                        <label className={labelStyle}>Scaffolding Intensity</label>
                        <div className="flex gap-1">
                          {INTENSITY_OPTIONS.map((intensity) => {
                            const active =
                              hex.wida?.scaffoldingIntensity === intensity;
                            const intensityColors = {
                              minimal: "#3b82f6",
                              moderate: "#f59e0b",
                              intensive: "#ef4444",
                            };
                            const color = intensityColors[intensity];
                            return (
                              <button
                                key={intensity}
                                className={`flex-1 rounded-md py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                                  active
                                    ? "text-white ring-1"
                                    : "bg-dark-elevated text-text-muted hover:text-text-secondary"
                                }`}
                                style={{
                                  backgroundColor: active
                                    ? color + "25"
                                    : undefined,
                                  ...(active && { ringColor: color + "60" }),
                                }}
                              >
                                {intensity}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Simplified Description */}
                      {hex.wida?.simplifiedDescription && (
                        <div>
                          <label className={labelStyle}>
                            Simplified Description
                          </label>
                          <div className="rounded-md border border-dark-border bg-dark-elevated p-3 text-xs leading-relaxed text-text-secondary">
                            {hex.wida.simplifiedDescription}
                          </div>
                        </div>
                      )}

                      {/* Key Vocabulary */}
                      {hex.wida?.keyVocabulary &&
                        hex.wida.keyVocabulary.length > 0 && (
                          <div>
                            <label className={labelStyle}>Key Vocabulary</label>
                            <div className="flex flex-wrap gap-1.5">
                              {hex.wida.keyVocabulary.map((term) => (
                                <span
                                  key={term}
                                  className="rounded-full bg-[#22c55e]/10 px-2.5 py-1 text-[10px] font-mono text-[#22c55e] ring-1 ring-[#22c55e]/20"
                                >
                                  {term}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Sentence Frames */}
                      {hex.wida?.sentenceFrames &&
                        hex.wida.sentenceFrames.length > 0 && (
                          <div>
                            <label className={labelStyle}>Sentence Frames</label>
                            <div className="space-y-1.5">
                              {hex.wida.sentenceFrames.map((frame, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 rounded-md border border-dark-border bg-dark-elevated px-3 py-2"
                                >
                                  <span className="mt-0.5 text-[9px] font-mono text-text-muted">
                                    {i + 1}.
                                  </span>
                                  <span className="text-xs leading-relaxed text-text-secondary italic">
                                    {frame}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Empty state */}
                      {!hex.wida && (
                        <div className="rounded-md border border-dashed border-dark-border p-4 text-center">
                          <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                            No WIDA adaptations configured
                          </p>
                          <p className="mt-1 text-[10px] text-text-muted">
                            WIDA data is generated when creating scaffolded hexes
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Slides URL */}
          <div className="border-t border-dark-border pt-3">
            <label className={labelStyle}>Google Slides URL</label>
            <input
              type="text"
              value={hex.slidesUrl ?? ""}
              onChange={(e) =>
                onUpdate(hex.id, { slidesUrl: e.target.value || undefined })
              }
              placeholder="https://docs.google.com/..."
              className={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelStyle}>Description</label>
            <textarea
              value={hex.description}
              onChange={(e) => onUpdate(hex.id, { description: e.target.value })}
              rows={3}
              className={`${inputStyle} resize-none`}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 border-t border-dark-border p-4">
          <button
            onClick={handleSave}
            className="flex-1 rounded-md bg-[#00f0ff]/15 px-3 py-2 text-xs font-mono uppercase tracking-wider text-[#00f0ff] hover:bg-[#00f0ff]/25 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => onDelete(hex.id)}
            className="rounded-md bg-red-500/15 px-3 py-2 text-xs font-mono uppercase tracking-wider text-red-400 hover:bg-red-500/25 transition-colors"
          >
            Delete
          </button>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-md bg-[#22c55e]/20 px-4 py-2 text-xs text-[#22c55e]"
            >
              Saved!
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
