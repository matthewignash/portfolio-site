"use client";

import { useMode } from "@/lib/modeContext";
import Link from "next/link";
import dynamic from "next/dynamic";

import type { TeamKanbanData, AdminKanbanData } from "@/lib/kanban-types";
import rawTeamData from "@/data/mock/kanban-team.json";
import rawAdminData from "@/data/mock/kanban-admin.json";

const teamData = rawTeamData as unknown as TeamKanbanData;
const adminData = rawAdminData as unknown as AdminKanbanData;

// Dynamic import to avoid SSR issues with dnd-kit and chart.js
const KanbanBoard = dynamic(() => import("@/components/kanban/KanbanBoard"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-dark-border bg-dark-void">
      <div className="text-sm text-text-muted">Loading Kanban board...</div>
    </div>
  ),
});

export default function KanbanProjectPage() {
  const { mode } = useMode();

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center gap-2 font-mono text-[11px] text-text-muted">
        <Link href="/" className="transition-colors hover:text-text-secondary">Home</Link>
        <span>/</span>
        <Link href="/" className="transition-colors hover:text-text-secondary">Projects</Link>
        <span>/</span>
        <span className="text-purple-secondary">Admin Kanban Dashboard</span>
      </div>

      {/* Hero */}
      <div className="mb-12">
        <div className="mb-4 inline-block rounded-md bg-purple-glow px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-purple-secondary border border-purple-dim">
          {mode === "portfolio" ? "Case Study" : "Technical Breakdown"}
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
          EdTech Dashboards
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-text-secondary">
          From department team board to school-wide strategic platform — the same developer, same
          technology stack, dramatically different scope. Toggle between views to see how data
          collection and features scale with user roles.
        </p>
      </div>

      {/* Portfolio Mode: Scope Comparison Metrics */}
      {mode === "portfolio" && (
        <div className="mb-12">
          <h2 className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
            Scope Comparison
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Team scope card */}
            <div className="rounded-xl border border-dark-border bg-dark-surface p-6">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#3b82f6]" />
                <span className="text-sm font-semibold text-text-primary">
                  Science Team Dashboard
                </span>
              </div>
              <div className="mb-4 text-[10px] uppercase tracking-wider text-text-muted">
                Department Level
              </div>
              <div className="space-y-2.5">
                <MetricRow label="Users" value="10-15 teachers" />
                <MetricRow label="Modules" value="8 (team collaboration)" />
                <MetricRow label="Kanban Boards" value="1 shared board" />
                <MetricRow label="Card Fields" value="8 basic fields" />
                <MetricRow label="Auth Model" value="Admin / User" />
                <MetricRow label="Architecture" value="Iframe-routed pages" />
              </div>
            </div>

            {/* Admin scope card */}
            <div className="rounded-xl border border-[#8b5cf650] bg-dark-surface p-6">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#8b5cf6]" />
                <span className="text-sm font-semibold text-text-primary">
                  Administrator Dashboard
                </span>
              </div>
              <div className="mb-4 text-[10px] uppercase tracking-wider text-text-muted">
                School-wide Level
              </div>
              <div className="space-y-2.5">
                <MetricRow label="Users" value="50+ staff across roles" />
                <MetricRow label="Modules" value="11 (enterprise management)" />
                <MetricRow label="Kanban Boards" value="Multiple boards + analytics" />
                <MetricRow label="Card Fields" value="15+ with checklists, comments" />
                <MetricRow label="Auth Model" value="4-role RBAC" />
                <MetricRow label="Architecture" value="SPA with module registry" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Learning Mode: Architecture Comparison */}
      {mode === "learning" && (
        <div className="mb-12">
          <h2 className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-orange-learning">
            Architecture Comparison
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-[#3b82f6]">
                Team: Simple Patterns
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Shell + iframe routing — each module a standalone page
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Direct google.script.run calls, no API wrapper
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  SortableJS for drag-and-drop (CDN library)
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  3 data tables: columns, cards, history
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Single assignee per card, no checklists
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#8b5cf630] bg-dark-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-[#8b5cf6]">
                Admin: Enterprise Patterns
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  SPA module registry — lazy init, shared component library
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Structured API envelope: &#123;success, data, error, code&#125;
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Native HTML5 drag-and-drop with swimlane views
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  6 data tables: boards, columns, cards, checklists, comments, activity
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Multi-assignee, PARA categories, analytics, bulk ops
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Problem / Solution */}
      <div className="mb-12 grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-dark-border bg-dark-surface p-6">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-text-muted">
            The Problem
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            School staff at every level relied on shared spreadsheets for task tracking — from
            science department lab prep to school-wide accreditation initiatives. Tasks fell through
            the cracks, priorities were invisible, and there was no way to see workflow status at a
            glance. Different user roles needed fundamentally different levels of data and features.
          </p>
        </div>

        <div className="rounded-xl border border-dark-border bg-dark-surface p-6">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-text-muted">
            The Solution
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            Built two Kanban-based dashboards tailored to their users: a streamlined team board for
            department collaboration, and a full-featured strategic platform for administrators with
            multiple boards, analytics, RBAC, and cross-module integrations. Both run on Google Apps
            Script + Sheets, proving you can build production-quality tools with zero infrastructure
            cost.
          </p>
        </div>
      </div>

      {/* Live Demo */}
      <div>
        <h2 className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
          Interactive Demo
        </h2>
        <div className="rounded-2xl border border-dark-border bg-dark-void p-4 sm:p-6">
          <KanbanBoard teamData={teamData} adminData={adminData} />
        </div>
      </div>

      {/* Tech Stack */}
      <div className="mt-12">
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
          Tech Stack
        </h2>
        <div className="flex flex-wrap gap-3">
          {[
            "Google Apps Script",
            "Google Sheets",
            "Vanilla JavaScript",
            "HTML5 Drag & Drop",
            "SortableJS",
            "Chart.js",
            "Bootstrap 5",
            "React (Portfolio Rebuild)",
            "Next.js",
            "@dnd-kit",
            "TypeScript",
          ].map((tech) => (
            <span
              key={tech}
              className="rounded-lg border border-dark-border bg-dark-surface px-4 py-2 font-mono text-sm text-text-secondary"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-xs font-medium text-text-secondary">{value}</span>
    </div>
  );
}
