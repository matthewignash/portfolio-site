"use client";

import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import type { KanbanAnalytics as AnalyticsType } from "@/lib/kanban-types";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

interface KanbanAnalyticsProps {
  analytics: AnalyticsType;
}

export default function KanbanAnalytics({ analytics }: KanbanAnalyticsProps) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total Cards" value={analytics.totalCards} color="#3b82f6" />
        <KpiCard label="Completed" value={analytics.completedCards} color="#22c55e" />
        <KpiCard label="Overdue" value={analytics.overdueCount} color="#ef4444" />
        <KpiCard
          label="Avg Cycle Time"
          value={`${analytics.avgCycleTimeDays}d`}
          color="#f59e0b"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Cards by Column */}
        <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
          <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
            Cards by Column
          </h4>
          <div className="h-48">
            <Bar
              data={{
                labels: analytics.cardsByColumn.map((c) => c.columnTitle),
                datasets: [
                  {
                    data: analytics.cardsByColumn.map((c) => c.count),
                    backgroundColor: analytics.cardsByColumn.map(
                      (_, i) =>
                        ["#94a3b8", "#8b5cf6", "#3b82f6", "#f59e0b", "#22c55e"][i % 5]
                    ),
                    borderRadius: 4,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: {
                    ticks: { color: "#5a5a7a", font: { size: 10 } },
                    grid: { display: false },
                  },
                  y: {
                    ticks: { color: "#5a5a7a", font: { size: 10 }, stepSize: 1 },
                    grid: { color: "#1e1e4020" },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Cards by Priority */}
        <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
          <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
            Cards by Priority
          </h4>
          <div className="flex h-48 items-center justify-center">
            <Doughnut
              data={{
                labels: analytics.cardsByPriority.map((p) => p.priority),
                datasets: [
                  {
                    data: analytics.cardsByPriority.map((p) => p.count),
                    backgroundColor: ["#94a3b8", "#3b82f6", "#f59e0b", "#ef4444"],
                    borderWidth: 0,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: { color: "#9494b8", font: { size: 10 }, padding: 12 },
                  },
                },
                cutout: "60%",
              }}
            />
          </div>
        </div>

        {/* Cards by Category (PARA) */}
        <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
          <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
            Cards by Category (PARA)
          </h4>
          <div className="flex h-48 items-center justify-center">
            <Doughnut
              data={{
                labels: analytics.cardsByCategory.map((c) => c.category),
                datasets: [
                  {
                    data: analytics.cardsByCategory.map((c) => c.count),
                    backgroundColor: ["#60a5fa", "#4ade80", "#fbbf24", "#9ca3af"],
                    borderWidth: 0,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: { color: "#9494b8", font: { size: 10 }, padding: 12 },
                  },
                },
                cutout: "60%",
              }}
            />
          </div>
        </div>
      </div>

      {/* Aging Report Table */}
      {analytics.agingReport.length > 0 && (
        <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
          <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
            Aging Report
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dark-border text-[10px] uppercase tracking-wider text-text-muted">
                  <th className="pb-2 pr-4">Title</th>
                  <th className="pb-2 pr-4">Column</th>
                  <th className="pb-2 pr-4">Priority</th>
                  <th className="pb-2 pr-4">Age</th>
                  <th className="pb-2">Due</th>
                </tr>
              </thead>
              <tbody>
                {analytics.agingReport.slice(0, 8).map((row) => (
                  <tr
                    key={row.cardId}
                    className="border-b border-dark-border/50 last:border-0"
                  >
                    <td className="py-2 pr-4 text-text-primary">{row.title}</td>
                    <td className="py-2 pr-4 text-text-secondary">{row.column}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`text-xs font-medium ${
                          row.priority === "critical"
                            ? "text-red-400"
                            : row.priority === "high"
                              ? "text-amber-400"
                              : "text-text-muted"
                        }`}
                      >
                        {row.priority}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-text-muted">
                      {row.ageDays}d
                    </td>
                    <td className="py-2">
                      {row.dueDate ? (
                        <span className={row.isOverdue ? "text-red-400" : "text-text-muted"}>
                          {new Date(row.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
