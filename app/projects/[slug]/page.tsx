"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useMode } from "@/lib/modeContext";
import projects from "@/data/projects.json";
import Link from "next/link";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function ProjectPage() {
  const params = useParams();
  const { mode } = useMode();
  const project = projects.find((p) => p.slug === params.slug);

  if (!project) {
    return (
      <div className="py-20 text-center">
        <h1 className="mb-4 text-2xl font-bold text-text-primary">Project not found</h1>
        <Link href="/" className="text-sm text-text-muted hover:text-cyan-primary">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial="initial" animate="animate" transition={{ staggerChildren: 0.08 }}>
      {/* Breadcrumb */}
      <motion.div
        className="mb-8 flex items-center gap-2 font-mono text-[11px] text-text-muted"
        variants={fadeUp}
      >
        <Link href="/" className="transition-colors hover:text-text-secondary">
          Home
        </Link>
        <span>/</span>
        <Link href="/" className="transition-colors hover:text-text-secondary">
          Projects
        </Link>
        <span>/</span>
        <span style={{ color: project.accentColor }}>{project.title}</span>
      </motion.div>

      {/* Hero */}
      <motion.div className="mb-12" variants={fadeUp}>
        <div
          className="mb-4 inline-block rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em]"
          style={{
            backgroundColor: `${project.accentColor}15`,
            color: project.accentColor,
            border: `1px solid ${project.accentColor}30`,
          }}
        >
          {mode === "portfolio" ? "Case Study" : "Technical Breakdown"}
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
          {project.title}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-text-secondary">
          {project.description}
        </p>
      </motion.div>

      {/* Metrics banner (Portfolio mode) */}
      {mode === "portfolio" && (
        <motion.div
          className="mb-12 rounded-xl border border-dark-border bg-dark-surface p-6"
          variants={fadeUp}
        >
          <div className="mb-4 text-2xl font-bold" style={{ color: project.accentColor }}>
            {project.metrics.headline}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {project.metrics.items.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project.accentColor }}
                />
                <span className="text-sm text-text-secondary">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Learning mode banner */}
      {mode === "learning" && (
        <motion.div
          className="mb-12 rounded-xl border border-orange-dim bg-orange-glow p-6"
          variants={fadeUp}
        >
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.15em] text-orange-learning">
            Learning Mode Active
          </div>
          <p className="text-sm leading-relaxed text-text-secondary">
            Code panels, data flow diagrams, and step-through walkthroughs for this project will be
            available in Phase 3. For now, explore the architecture and technical decisions below.
          </p>
        </motion.div>
      )}

      {/* Problem / Solution */}
      <div className="mb-12 grid gap-8 lg:grid-cols-2">
        <motion.div
          className="rounded-xl border border-dark-border bg-dark-surface p-6"
          variants={fadeUp}
        >
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-text-muted">
            The Problem
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">{project.problem}</p>
        </motion.div>

        <motion.div
          className="rounded-xl border border-dark-border bg-dark-surface p-6"
          variants={fadeUp}
        >
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-text-muted">
            The Solution
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">{project.solution}</p>
        </motion.div>
      </div>

      {/* Tech Stack */}
      <motion.div variants={fadeUp}>
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
          Tech Stack
        </h2>
        <div className="flex flex-wrap gap-3">
          {project.techStack.map((tech) => (
            <span
              key={tech}
              className="rounded-lg border border-dark-border bg-dark-surface px-4 py-2 font-mono text-sm text-text-secondary"
            >
              {tech}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Placeholder for demo embed */}
      <motion.div
        className="mt-12 flex h-64 items-center justify-center rounded-xl border border-dashed border-dark-border bg-dark-void"
        variants={fadeUp}
      >
        <div className="text-center">
          <div className="mb-2 font-mono text-sm text-text-muted">Live Demo</div>
          <div className="text-xs text-text-muted">Coming in Phase 2</div>
        </div>
      </motion.div>
    </motion.div>
  );
}
