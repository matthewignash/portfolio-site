"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { GroupData } from "@/lib/learning-hub-types";

const GROUP_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7"];

export interface GroupsTabProps {
  groups: GroupData[];
}

export default function GroupsTab({ groups }: GroupsTabProps) {
  const chartData = groups.map((g) => ({
    name: g.groupName,
    completion: g.averageCompletion,
    score: g.averageScore,
  }));

  return (
    <div className="space-y-5">
      {/* Group cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((g, i) => {
          const color = GROUP_COLORS[i % GROUP_COLORS.length];
          return (
            <div
              key={g.groupId}
              className="rounded-xl border border-dark-border bg-dark-surface p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-semibold text-text-primary">
                  {g.groupName}
                </span>
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between text-text-muted">
                  <span>Members</span>
                  <span className="text-text-secondary">
                    {g.studentIds.length}
                  </span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Avg Completion</span>
                  <span
                    style={{
                      color:
                        g.averageCompletion >= 70 ? "#22c55e" : "#f59e0b",
                    }}
                  >
                    {g.averageCompletion}%
                  </span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Avg Score</span>
                  <span className="text-text-secondary">
                    {g.averageScore}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison chart */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
        <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Group Comparison
        </h4>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="#1e1e40" strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#5a5a7a" }}
                tickLine={false}
                axisLine={{ stroke: "#1e1e40" }}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#5a5a7a" }}
                tickLine={false}
                axisLine={{ stroke: "#1e1e40" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#12122a",
                  border: "1px solid #1e1e40",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Bar
                dataKey="completion"
                fill="#00f0ff"
                fillOpacity={0.7}
                name="Completion %"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="score"
                fill="#a855f7"
                fillOpacity={0.7}
                name="Avg Score"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
