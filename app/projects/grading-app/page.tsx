"use client";

import { useMode } from "@/lib/modeContext";
import Link from "next/link";
import dynamic from "next/dynamic";

import type { GradingAppData } from "@/lib/grading-types";
import rawData from "@/data/mock/grading-app.json";

const data = rawData as unknown as GradingAppData;

const GradingAppBoard = dynamic(
  () => import("@/components/grading-app/GradingAppBoard"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-dark-border bg-dark-void">
        <div className="text-sm text-text-muted">Loading grading app...</div>
      </div>
    ),
  }
);

export default function GradingAppPage() {
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
        <span className="text-cyan-primary">Assessment Grading App</span>
      </div>

      {/* Hero */}
      <div className="mb-12">
        <div className="mb-4 inline-block rounded-md border border-cyan-dim bg-cyan-glow px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-primary">
          {mode === "portfolio" ? "Case Study" : "Technical Breakdown"}
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
          Assessment Grading App
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-text-secondary">
          An IB Chemistry exam grading and analytics platform that handles
          multi-paper assessments with auto-scoring MCQs, rubric-based
          checklists, and holistic strand reporting across Knowledge &amp;
          Understanding, Thinking &amp; Transfer, and Communication.
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
              value="3"
              label="Paper types scored (1A, 1B, 2)"
              color="#00f0ff"
            />
            <MetricCard
              value="44"
              label="Questions per exam"
              color="#22c55e"
            />
            <MetricCard
              value="352"
              label="Student responses tracked"
              color="#8b5cf6"
            />
            <MetricCard
              value="75%"
              label="Reduction in grading time"
              color="#f59e0b"
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">
                Teacher Features
              </h3>
              <ul className="space-y-1.5 text-sm text-text-secondary">
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  Auto-scored MCQ with instant feedback
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  Rubric-based checklist grading (AND/OR modes)
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  IB 1-7 and AISC 1-8 band distributions
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  Strand performance analytics (KU, TT, C)
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  Topic-level mastery tracking by IB syllabus code
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">
                Student Features
              </h3>
              <ul className="space-y-1.5 text-sm text-text-secondary">
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  Score card with IB grade and strand bands
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  AISC holistic assessment language descriptors
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  Topic analysis with strengths and growth areas
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  Detailed exam review (MCQ answers, rubric criteria)
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-primary">&#10003;</span>
                  SL/HL level-aware grade boundaries
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Learning Mode: Scoring Architecture */}
      {mode === "learning" && (
        <div className="mb-12">
          <h2 className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-orange-learning">
            Scoring Architecture
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-cyan-primary">
                Three Scoring Modes
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Auto: MCQ choice vs correct answer (case-insensitive match)
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Checklist AND: sum checked rubric items (capped at max)
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Checklist OR: any one correct item = full marks
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Manual: teacher enters points directly
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Auto-detect: sum(rubric) &gt; max = OR, else AND
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#f9731630] bg-dark-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-orange-learning">
                Key Technical Patterns
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Dual grading scales: IB 1-7 (overall) + AISC 1-8 (per-strand)
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Level-aware band lookup: SL/HL have different thresholds
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  TopicSkillBreakdown: per-question analysis by IB topic code
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Response caching (120s TTL) for sidebar performance
                </li>
                <li className="flex gap-2">
                  <span className="text-text-muted">&#8250;</span>
                  Deterministic Faker.js seed for reproducible demo data
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
            IB Chemistry exams have three paper types with different scoring
            methods: multiple choice, short answer with rubric checklists, and
            extended response. Teachers manually scored each paper type
            separately, tracked strand performance (KU/TT/C) in spreadsheets,
            and calculated IB and school-specific grade bands by hand. Students
            received only a final grade with no visibility into topic-level
            strengths or weaknesses.
          </p>
        </div>

        <div className="rounded-xl border border-dark-border bg-dark-surface p-6">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-text-muted">
            The Solution
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            Built a unified grading platform that auto-scores MCQs, provides
            rubric checklists for structured questions, and computes IB 1-7
            grades and AISC 1-8 strand bands automatically. Teachers get class
            analytics with band distributions, strand radar charts, and
            topic-level mastery tracking. Students see personalized score cards
            with holistic assessment language descriptors and can drill into
            individual question results.
          </p>
        </div>
      </div>

      {/* Live Demo */}
      <div>
        <h2 className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
          Interactive Demo
        </h2>
        <div className="rounded-2xl border border-dark-border bg-dark-void p-4 sm:p-6">
          <GradingAppBoard data={data} />
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
            "JavaScript",
            "React (Portfolio Rebuild)",
            "Next.js",
            "TypeScript",
            "Recharts",
            "Framer Motion",
            "Faker.js",
            "Tailwind CSS",
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
