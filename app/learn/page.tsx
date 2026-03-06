"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { gradingAppContent } from "@/data/learning/grading-app";
import { kanbanContent } from "@/data/learning/kanban";
import { learningHubContent } from "@/data/learning/learning-hub";
import type { CaseStudyLearningContent } from "@/lib/learning-mode-types";

const caseStudies: CaseStudyLearningContent[] = [
  learningHubContent,
  gradingAppContent,
  kanbanContent,
];

export default function LearnPage() {
  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center gap-2 font-mono text-[11px] text-text-muted">
        <Link href="/" className="transition-colors hover:text-text-secondary">
          Home
        </Link>
        <span>/</span>
        <span className="text-[var(--color-accent)]">Learn</span>
      </div>

      {/* Hero */}
      <div className="mb-12">
        <div className="mb-4 inline-block rounded-md border border-[var(--color-accent-dim)] bg-[var(--color-accent-glow)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Learning Mode
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
          Explore the Code
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-text-secondary">
          Interactive walkthroughs of each case study. Read annotated source
          code, step through key patterns, and see architecture diagrams — all
          alongside the live demo.
        </p>
      </div>

      {/* Case study cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {caseStudies.map((cs, i) => (
          <motion.div
            key={cs.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <Link
              href={`/learn/${cs.slug}`}
              className="group block rounded-2xl border border-dark-border bg-dark-surface p-6 transition-all duration-300 hover:border-[var(--color-accent-dim)] hover:shadow-[0_0_30px_var(--color-accent-glow)]"
            >
              <h2 className="mb-2 text-lg font-semibold text-text-primary transition-colors group-hover:text-[var(--color-accent)]">
                {cs.title}
              </h2>
              <p className="mb-4 text-sm leading-relaxed text-text-secondary">
                {cs.description}
              </p>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {cs.techStack.slice(0, 4).map((tech) => (
                  <span
                    key={tech}
                    className="rounded-md bg-dark-elevated px-2 py-0.5 font-mono text-[10px] text-text-muted"
                  >
                    {tech}
                  </span>
                ))}
                {cs.techStack.length > 4 && (
                  <span className="rounded-md bg-dark-elevated px-2 py-0.5 font-mono text-[10px] text-text-muted">
                    +{cs.techStack.length - 4}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-accent)]">
                Start Learning
                <span className="transition-transform group-hover:translate-x-1">
                  &#8594;
                </span>
              </div>

              {/* Stats row */}
              <div className="mt-4 flex gap-4 border-t border-dark-border pt-4">
                <div>
                  <div className="font-mono text-lg font-bold text-text-primary">
                    {cs.codeFiles.length}
                  </div>
                  <div className="text-[10px] text-text-muted">files</div>
                </div>
                <div>
                  <div className="font-mono text-lg font-bold text-text-primary">
                    {cs.walkthrough.length}
                  </div>
                  <div className="text-[10px] text-text-muted">steps</div>
                </div>
                <div>
                  <div className="font-mono text-lg font-bold text-text-primary">
                    {cs.architecture.nodes.length}
                  </div>
                  <div className="text-[10px] text-text-muted">components</div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
