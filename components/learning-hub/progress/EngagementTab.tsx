"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { EngagementData } from "@/lib/learning-hub-types";

export interface EngagementTabProps {
  engagement: EngagementData;
}

export default function EngagementTab({ engagement }: EngagementTabProps) {
  return (
    <div className="space-y-5">
      {/* Time on task KPI */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
          <div className="text-2xl font-bold text-[#00f0ff]">
            {engagement.avgTimeOnTask}
            <span className="text-xs font-normal text-text-muted"> min</span>
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
            Avg Time on Task
          </div>
        </div>
        <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
          <div className="text-2xl font-bold text-[#a855f7]">
            {engagement.weeklyLogins.reduce((s, w) => s + w.count, 0)}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
            Total Logins (8 weeks)
          </div>
        </div>
        <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
          <div className="text-2xl font-bold text-[#22c55e]">
            {engagement.lessonsPerWeek.reduce((s, w) => s + w.count, 0)}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
            Total Lessons (8 weeks)
          </div>
        </div>
      </div>

      {/* Weekly logins bar chart */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
        <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Weekly Logins
        </h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={engagement.weeklyLogins}>
              <CartesianGrid stroke="#1e1e40" strokeDasharray="3 3" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 9, fill: "#5a5a7a" }}
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
                dataKey="count"
                fill="#a855f7"
                fillOpacity={0.7}
                name="Logins"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lessons per week line chart */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
        <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Lessons Completed per Week
        </h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={engagement.lessonsPerWeek}>
              <CartesianGrid stroke="#1e1e40" strokeDasharray="3 3" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 9, fill: "#5a5a7a" }}
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
              <Line
                type="monotone"
                dataKey="count"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: "#22c55e", r: 3 }}
                name="Lessons"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
