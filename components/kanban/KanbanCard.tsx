"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TeamCard, AdminCard, StaffMember } from "@/lib/kanban-types";

// ============================================
// Team Card (simple)
// ============================================

interface TeamCardProps {
  card: TeamCard;
  staff: StaffMember[];
  onClick?: () => void;
}

export function TeamKanbanCard({ card, staff, onClick }: TeamCardProps) {
  const assignee = staff.find((s) => s.id === card.assignee);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="group cursor-grab rounded-lg border border-dark-border bg-dark-surface p-3 transition-all hover:border-[#3b82f680] hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
    >
      {/* Priority dot + title */}
      <div className="mb-2 flex items-start gap-2">
        <PriorityDot priority={card.priority} />
        <h4 className="text-sm font-medium leading-snug text-text-primary">
          {card.title}
        </h4>
      </div>

      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {card.labels.slice(0, 2).map((label) => (
            <span
              key={label}
              className="rounded-full bg-dark-elevated px-2 py-0.5 text-[10px] text-text-muted"
            >
              {label}
            </span>
          ))}
          {card.labels.length > 2 && (
            <span className="text-[10px] text-text-muted">+{card.labels.length - 2}</span>
          )}
        </div>
      )}

      {/* Footer: assignee + due date */}
      <div className="flex items-center justify-between">
        {assignee && (
          <div className="flex items-center gap-1.5">
            <Avatar name={`${assignee.firstName} ${assignee.lastName}`} size="sm" />
            <span className="text-[11px] text-text-muted">{assignee.firstName}</span>
          </div>
        )}
        {card.dueDate && (
          <DueDateBadge dueDate={card.dueDate} />
        )}
      </div>
    </div>
  );
}

// ============================================
// Admin Card (full features)
// ============================================

interface AdminCardProps {
  card: AdminCard;
  staff: StaffMember[];
  onClick?: () => void;
}

export function AdminKanbanCard({ card, staff, onClick }: AdminCardProps) {
  const assignees = card.assignedTo
    .map((id) => staff.find((s) => s.id === id))
    .filter(Boolean) as StaffMember[];
  const checklistTotal = card.checklists.length;
  const checklistDone = card.checklists.filter((c) => c.isChecked).length;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group cursor-grab rounded-lg border bg-dark-surface p-3 transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${
        isOverdue
          ? "border-l-2 border-l-red-500 border-t-dark-border border-r-dark-border border-b-dark-border"
          : "border-dark-border hover:border-[#8b5cf680]"
      }`}
    >
      {/* Title + priority */}
      <div className="mb-2 flex items-start gap-2">
        <PriorityDot priority={card.priority} />
        <h4 className="text-sm font-medium leading-snug text-text-primary">
          {card.title}
        </h4>
      </div>

      {/* Key takeaway (truncated) */}
      {card.keyTakeaway && (
        <p className="mb-2 line-clamp-2 text-[11px] leading-relaxed text-text-muted italic">
          {card.keyTakeaway}
        </p>
      )}

      {/* Badges: PARA category + labels */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <ParaBadge category={card.category} />
        {card.labels.slice(0, 3).map((label) => (
          <span
            key={label}
            className="rounded-full bg-dark-elevated px-2 py-0.5 text-[10px] text-text-muted"
          >
            {label}
          </span>
        ))}
        {card.labels.length > 3 && (
          <span className="text-[10px] text-text-muted">+{card.labels.length - 3}</span>
        )}
      </div>

      {/* Checklist progress */}
      {checklistTotal > 0 && (
        <div className="mb-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-dark-elevated">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(checklistDone / checklistTotal) * 100}%`,
                backgroundColor: checklistDone === checklistTotal ? "#22c55e" : "#3b82f6",
              }}
            />
          </div>
          <span className="text-[10px] text-text-muted">
            {checklistDone}/{checklistTotal}
          </span>
        </div>
      )}

      {/* Footer: assignees + due date + comment count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Stacked avatars */}
          <div className="flex -space-x-1.5">
            {assignees.slice(0, 3).map((a) => (
              <Avatar
                key={a.id}
                name={`${a.firstName} ${a.lastName}`}
                size="sm"
              />
            ))}
            {assignees.length > 3 && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full border border-dark-void bg-dark-elevated text-[9px] text-text-muted">
                +{assignees.length - 3}
              </div>
            )}
          </div>

          {/* Comment count */}
          {card.comments.length > 0 && (
            <span className="ml-2 flex items-center gap-0.5 text-[10px] text-text-muted">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 3h12v8H5l-3 3V3z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
              {card.comments.length}
            </span>
          )}
        </div>

        {card.dueDate && <DueDateBadge dueDate={card.dueDate} />}
      </div>
    </div>
  );
}

// ============================================
// Shared sub-components
// ============================================

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: "#ef4444",
    high: "#f59e0b",
    medium: "#3b82f6",
    low: "#94a3b8",
  };
  return (
    <div
      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: colors[priority] ?? "#94a3b8" }}
      title={priority}
    />
  );
}

function ParaBadge({ category }: { category: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    project: { bg: "#1e40af20", text: "#60a5fa" },
    area: { bg: "#16653420", text: "#4ade80" },
    resource: { bg: "#92400e20", text: "#fbbf24" },
    archive: { bg: "#6b728020", text: "#9ca3af" },
  };
  const s = styles[category] ?? styles.archive;
  return (
    <span
      className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {category}
    </span>
  );
}

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const dim = size === "sm" ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-[11px]";
  return (
    <div
      className={`${dim} flex items-center justify-center rounded-full border border-dark-void bg-dark-elevated font-mono font-bold text-text-muted`}
      title={name}
    >
      {initials}
    </div>
  );
}

function DueDateBadge({ dueDate }: { dueDate: string }) {
  const due = new Date(dueDate);
  const now = new Date();
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  const isOverdue = daysLeft < 0;
  const isSoon = daysLeft >= 0 && daysLeft <= 3;

  const formatted = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
        isOverdue
          ? "bg-red-500/15 text-red-400"
          : isSoon
            ? "bg-amber-500/15 text-amber-400"
            : "bg-dark-elevated text-text-muted"
      }`}
    >
      {formatted}
    </span>
  );
}
