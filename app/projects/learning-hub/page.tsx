"use client";

import { useMode } from "@/lib/modeContext";
import Link from "next/link";
import dynamic from "next/dynamic";

import type { LearningHubData } from "@/lib/learning-hub-types";
import rawData from "@/data/mock/learning-hub.json";

const data = rawData as unknown as LearningHubData;

const LearningHubBoard = dynamic(
  () => import("@/components/learning-hub/LearningHubBoard"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-dark-border bg-dark-void">
        <div className="text-sm text-text-muted">Loading Unified Learning Map...</div>
      </div>
    ),
  }
);

export default function LearningHubPage() {
  const { mode } = useMode();

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center gap-2 font-mono text-[11px] text-text-muted">
        <Link href="/" className="transition-colors hover:text-text-secondary">
          Home
        </Link>
        <span>/</span>
        <Link href="/" className="transition-colors hover:text-text-secondary">
          Projects
        </Link>
        <span>/</span>
        <span className="text-cyan-primary">Unified Learning Map</span>
      </div>

      {/* Hero */}
      <div className="mb-12">
        <div className="mb-4 inline-block rounded-md border border-cyan-dim bg-cyan-glow px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-primary">
          {mode === "portfolio" ? "Case Study" : "Technical Breakdown"}
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
          Unified Learning Map
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-text-secondary">
          A full-featured learning management system centered on a visual
          hex-based map builder. Teachers create interactive learning pathways
          using hexagonal nodes connected by directional arrows, while students
          navigate their personalized maps with real-time progress tracking
          across 13 teacher tabs and 5 student views.
        </p>
      </div>

      {/* Portfolio Mode: Impact Metrics */}
      {mode === "portfolio" && (
        <div className="mb-12">
          <h2 className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
            Impact Metrics
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              value="13"
              label="Teacher tabs"
              color="#00f0ff"
            />
            <MetricCard
              value="53"
              label="Hex nodes across 3 maps"
              color="#22c55e"
            />
            <MetricCard
              value="5"
              label="Student views"
              color="#8b5cf6"
            />
            <MetricCard
              value="324"
              label="Progress records tracked"
              color="#f59e0b"
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">
                Map Builder Features
              </h3>
              <ul className="space-y-1.5 text-sm text-text-secondary">
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  SVG hex canvas with drag, select, and connect interactions
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  5 hex types (Lesson, Activity, Assessment, Resource, Checkpoint)
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  Hex editor with KU/TT/C strands, AISC competencies, UBD, and UDL
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  8 toolbar actions including Auto-Generate, Heatmap, and Calendar
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  Standards library with NGSS, CCSS, IB, and custom frameworks
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">
                Student &amp; Analytics Features
              </h3>
              <ul className="space-y-1.5 text-sm text-text-secondary">
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  Student map view with complete/active/locked progress states
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  8-tab progress dashboard with KU/TT/C strand analysis and engagement
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  UBD Planner with 3-stage unit design (Desired Results, Evidence, Learning Plan)
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  EAL strategies with WIDA framework and AI Prompt Builder
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  Flashcard study mode and weekly planner for students
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Learning Mode: Architecture */}
      {mode === "learning" && (
        <div className="mb-12">
          <h2 className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-orange-learning">
            System Architecture
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-cyan-primary">
                Hex Engine (SVG)
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Hand-rolled SVG hex grid with flat-top hexagons (40px radius)
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Quadratic bezier connection arrows with arrowhead markers
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Shared engine: editable (Map Builder) + read-only (Student View)
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Pan via mousedown/mousemove on SVG viewBox offset
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Progress states propagate along directed connection graph
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#f9731630] bg-dark-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-orange-learning">
                Data Architecture
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Maps → Hexes → Connections (directed graph with branching)
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  12 students with ability profiles (0.35-0.92) across 3 courses
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  272 progress records: student × hex with 4-state tracking
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Faker.js seed 77: deterministic data for reproducible demos
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Tab-based architecture: 18 views rendered in single container
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
            Curriculum was organized in linear spreadsheets with no visual
            representation of learning pathways. Teachers couldn&apos;t see how
            concepts connected, students had no sense of progression, and
            differentiation required maintaining separate documents for each
            learner profile. Progress tracking was manual and fragmented across
            multiple Google Sheets.
          </p>
        </div>

        <div className="rounded-xl border border-dark-border bg-dark-surface p-6">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-text-muted">
            The Solution
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            Built a visual hex-based map builder where teachers design learning
            pathways as connected hexagonal nodes. Students navigate these maps
            with progress tracking (complete/active/locked), while teachers get a
            13-tab management system covering courses, classes, standards,
            assessments, and differentiation — all unified in a single
            application with integrated EAL support and WIDA framework alignment.
          </p>
        </div>
      </div>

      {/* Live Demo */}
      <div>
        <h2 className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
          Interactive Demo
        </h2>
        <div className="rounded-2xl border border-dark-border bg-dark-void p-4 sm:p-6">
          <LearningHubBoard data={data} />
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
            "SVG (Hand-rolled Hex Engine)",
            "React 19",
            "Next.js 16",
            "TypeScript",
            "Recharts",
            "Framer Motion",
            "Faker.js",
            "Tailwind CSS v4",
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

function MetricCard({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
      <div className="text-3xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 text-xs text-text-muted">{label}</div>
    </div>
  );
}
