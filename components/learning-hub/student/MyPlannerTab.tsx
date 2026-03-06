"use client";

import { motion } from "framer-motion";
import type { PlannerTask } from "@/lib/learning-hub-types";

const URGENCY_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  overdue: { color: "#ef4444", bg: "#ef4444", label: "Overdue" },
  due_today: { color: "#f59e0b", bg: "#f59e0b", label: "Due Today" },
  due_this_week: { color: "#22c55e", bg: "#22c55e", label: "This Week" },
  upcoming: { color: "#5a5a7a", bg: "#5a5a7a", label: "Upcoming" },
};

const TYPE_ICONS: Record<string, string> = {
  lesson: "📖",
  activity: "🧪",
  assessment: "📝",
  resource: "📚",
  checkpoint: "🎯",
};

export interface MyPlannerTabProps {
  tasks: PlannerTask[];
}

export default function MyPlannerTab({ tasks }: MyPlannerTabProps) {
  // Sort by urgency priority
  const urgencyOrder = ["overdue", "due_today", "due_this_week", "upcoming"];
  const sorted = [...tasks].sort(
    (a, b) =>
      urgencyOrder.indexOf(a.urgency) - urgencyOrder.indexOf(b.urgency)
  );

  // Group by urgency
  const grouped = urgencyOrder
    .map((urgency) => ({
      urgency,
      tasks: sorted.filter((t) => t.urgency === urgency),
    }))
    .filter((g) => g.tasks.length > 0);

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {urgencyOrder.map((urgency) => {
          const count = tasks.filter((t) => t.urgency === urgency).length;
          const config = URGENCY_CONFIG[urgency];
          return (
            <div
              key={urgency}
              className="rounded-lg border border-dark-border bg-dark-surface p-3"
            >
              <div
                className="text-xl font-bold"
                style={{ color: config.color }}
              >
                {count}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted">
                {config.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task list by urgency group */}
      {grouped.map((group) => {
        const config = URGENCY_CONFIG[group.urgency];
        return (
          <div key={group.urgency}>
            <h4
              className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em]"
              style={{ color: config.color }}
            >
              {config.label} ({group.tasks.length})
            </h4>
            <div className="space-y-2">
              {group.tasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: i * 0.03 }}
                  className="flex items-center gap-3 rounded-lg border bg-dark-surface px-4 py-3"
                  style={{ borderColor: config.bg + "30" }}
                >
                  {/* Type icon */}
                  <span className="text-base shrink-0">
                    {TYPE_ICONS[task.hexType] ?? "📄"}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-text-primary truncate">
                      {task.hexLabel}
                    </div>
                    <div className="text-[10px] text-text-muted">
                      {task.mapTitle}
                    </div>
                  </div>

                  {/* Duration */}
                  <span className="shrink-0 text-[10px] font-mono text-text-muted">
                    {task.estimatedMinutes}m
                  </span>

                  {/* Due date */}
                  <span className="shrink-0 text-[10px] text-text-muted">
                    {new Date(task.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>

                  {/* Urgency badge */}
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider"
                    style={{
                      backgroundColor: config.bg + "15",
                      color: config.color,
                    }}
                  >
                    {config.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}

      {tasks.length === 0 && (
        <div className="rounded-xl border border-dashed border-dark-border p-8 text-center text-xs text-text-muted">
          No upcoming tasks — you are all caught up!
        </div>
      )}
    </div>
  );
}
