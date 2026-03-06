"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { AdminCard, StaffMember } from "@/lib/kanban-types";

interface KanbanCardModalProps {
  card: AdminCard | null;
  staff: StaffMember[];
  columnTitle: string;
  onClose: () => void;
}

export default function KanbanCardModal({
  card,
  staff,
  columnTitle,
  onClose,
}: KanbanCardModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!card || !mounted) return null;

  const assignees = card.assignedTo
    .map((id) => staff.find((s) => s.id === id))
    .filter(Boolean) as StaffMember[];
  const creator = staff.find((s) => s.id === card.createdBy);
  const checklistDone = card.checklists.filter((c) => c.isChecked).length;

  const priorityColors: Record<string, { bg: string; text: string }> = {
    critical: { bg: "#ef444420", text: "#ef4444" },
    high: { bg: "#f59e0b20", text: "#f59e0b" },
    medium: { bg: "#3b82f620", text: "#3b82f6" },
    low: { bg: "#94a3b820", text: "#94a3b8" },
  };
  const pColor = priorityColors[card.priority] ?? priorityColors.low;

  const categoryColors: Record<string, { bg: string; text: string }> = {
    project: { bg: "#1e40af20", text: "#60a5fa" },
    area: { bg: "#16653420", text: "#4ade80" },
    resource: { bg: "#92400e20", text: "#fbbf24" },
    archive: { bg: "#6b728020", text: "#9ca3af" },
  };
  const cColor = categoryColors[card.category] ?? categoryColors.archive;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <motion.div
          className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-dark-border bg-dark-bg p-6"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-text-muted hover:text-text-primary"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Title */}
          <h2 className="mb-4 pr-8 text-xl font-bold text-text-primary">{card.title}</h2>

          {/* Meta grid */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetaField label="Column" value={columnTitle} />
            <MetaField label="Priority">
              <span
                className="rounded-md px-2 py-0.5 text-xs font-semibold uppercase"
                style={{ backgroundColor: pColor.bg, color: pColor.text }}
              >
                {card.priority}
              </span>
            </MetaField>
            <MetaField label="Category">
              <span
                className="rounded-md px-2 py-0.5 text-xs font-semibold uppercase"
                style={{ backgroundColor: cColor.bg, color: cColor.text }}
              >
                {card.category}
              </span>
            </MetaField>
            <MetaField
              label="Due Date"
              value={card.dueDate ? new Date(card.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "None"}
            />
            <MetaField label="Created By" value={creator ? `${creator.firstName} ${creator.lastName}` : "Unknown"} />
            <MetaField
              label="Created"
              value={new Date(card.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            />
          </div>

          {/* Assignees */}
          {assignees.length > 0 && (
            <div className="mb-5">
              <SectionLabel>Assigned To</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {assignees.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg bg-dark-surface px-3 py-1.5"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-dark-elevated font-mono text-[10px] font-bold text-text-muted">
                      {a.firstName[0]}{a.lastName[0]}
                    </div>
                    <span className="text-sm text-text-secondary">
                      {a.firstName} {a.lastName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Takeaway */}
          {card.keyTakeaway && (
            <div className="mb-5">
              <SectionLabel>Key Takeaway</SectionLabel>
              <div className="rounded-lg border border-[#8b5cf630] bg-[#8b5cf610] px-4 py-3 text-sm text-text-secondary italic">
                {card.keyTakeaway}
              </div>
            </div>
          )}

          {/* Description */}
          {card.description && (
            <div className="mb-5">
              <SectionLabel>Description</SectionLabel>
              <p className="text-sm leading-relaxed text-text-secondary">{card.description}</p>
            </div>
          )}

          {/* Labels */}
          {card.labels.length > 0 && (
            <div className="mb-5">
              <SectionLabel>Labels</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {card.labels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-dark-surface px-3 py-1 text-xs text-text-muted"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Checklist */}
          {card.checklists.length > 0 && (
            <div className="mb-5">
              <SectionLabel>
                Checklist ({checklistDone}/{card.checklists.length})
              </SectionLabel>
              <div className="mb-2 h-1.5 rounded-full bg-dark-surface">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(checklistDone / card.checklists.length) * 100}%`,
                    backgroundColor: checklistDone === card.checklists.length ? "#22c55e" : "#3b82f6",
                  }}
                />
              </div>
              <ul className="space-y-1.5">
                {card.checklists.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        item.isChecked
                          ? "border-green-500 bg-green-500/20"
                          : "border-dark-border bg-dark-surface"
                      }`}
                    >
                      {item.isChecked && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        item.isChecked ? "text-text-muted line-through" : "text-text-secondary"
                      }`}
                    >
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Comments */}
          {card.comments.length > 0 && (
            <div className="mb-5">
              <SectionLabel>Comments ({card.comments.length})</SectionLabel>
              <div className="space-y-3">
                {card.comments.map((comment) => {
                  const author = staff.find((s) => s.id === comment.authorId);
                  return (
                    <div key={comment.id} className="rounded-lg bg-dark-surface p-3">
                      <div className="mb-1.5 flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-dark-elevated font-mono text-[9px] font-bold text-text-muted">
                          {author ? `${author.firstName[0]}${author.lastName[0]}` : "??"}
                        </div>
                        <span className="text-xs font-semibold text-text-primary">
                          {author ? `${author.firstName} ${author.lastName}` : "Unknown"}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {timeAgo(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-text-secondary">{comment.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activity log */}
          {card.activity.length > 0 && (
            <div>
              <SectionLabel>Activity</SectionLabel>
              <div className="space-y-2">
                {card.activity
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((entry) => {
                    const user = staff.find((s) => s.id === entry.userId);
                    return (
                      <div key={entry.id} className="flex items-start gap-2 text-xs">
                        <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-muted" />
                        <span className="text-text-secondary">
                          <span className="font-medium text-text-primary">
                            {user ? user.firstName : "System"}
                          </span>{" "}
                          {formatActivity(entry)}
                        </span>
                        <span className="ml-auto shrink-0 text-text-muted">
                          {timeAgo(entry.createdAt)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// --- Helpers ---

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
      {children}
    </h3>
  );
}

function MetaField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-0.5 text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      {children ?? <div className="text-sm text-text-secondary">{value}</div>}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatActivity(entry: { actionType: string; oldValue?: string; newValue?: string; fieldName?: string }): string {
  switch (entry.actionType) {
    case "card_created":
      return "created this card";
    case "card_moved":
      return `moved card from ${entry.oldValue} to ${entry.newValue}`;
    case "card_updated":
      return `updated ${entry.fieldName ?? "card"}`;
    case "comment_added":
      return "added a comment";
    case "checklist_added":
      return "added a checklist item";
    case "checklist_toggled":
      return "toggled a checklist item";
    default:
      return entry.actionType;
  }
}
