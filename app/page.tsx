"use client";

import { motion } from "framer-motion";
import ProjectCard from "@/components/ProjectCard";
import projects from "@/data/projects.json";
import { useMode } from "@/lib/modeContext";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function Home() {
  const { mode, toggleMode } = useMode();

  return (
    <div>
      {/* Hero */}
      <motion.section
        className="pb-16 pt-8"
        initial="initial"
        animate="animate"
        transition={{ staggerChildren: 0.1 }}
      >
        <motion.div
          className="mb-2 font-mono text-[11px] uppercase tracking-[0.25em] text-text-muted"
          variants={fadeUp}
        >
          EdTech Portfolio
        </motion.div>

        <motion.h1
          className="gradient-text mb-5 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
          variants={fadeUp}
        >
          Matthew
        </motion.h1>

        <motion.p
          className="mb-8 max-w-xl text-lg leading-relaxed text-text-secondary"
          variants={fadeUp}
        >
          Building tools that make education better. Three flagship EdTech applications,
          rebuilt in React — explore them as{" "}
          <button
            onClick={() => toggleMode()}
            className="font-semibold underline decoration-[var(--color-accent)] decoration-2 underline-offset-4 transition-colors duration-300 hover:text-[var(--color-accent)]"
            style={{ color: "var(--color-accent)" }}
          >
            {mode === "portfolio" ? "polished case studies" : "technical deep-dives"}
          </button>
          .
        </motion.p>

        {/* Mode hint */}
        <motion.div
          className="flex items-center gap-3 rounded-lg border border-dark-border bg-dark-surface/50 px-4 py-3"
          variants={fadeUp}
        >
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--color-accent)" }}
          />
          <span className="text-sm text-text-muted">
            {mode === "portfolio" ? (
              <>
                Viewing in <span className="font-semibold text-purple-secondary">Portfolio Mode</span> — clean demos and impact metrics
              </>
            ) : (
              <>
                Viewing in <span className="font-semibold text-orange-learning">Learning Mode</span> — code annotations and data flows
              </>
            )}
          </span>
          <span className="text-text-muted">·</span>
          <button
            onClick={toggleMode}
            className="text-sm font-medium transition-colors duration-300 hover:text-[var(--color-accent)]"
            style={{ color: "var(--color-accent-dim)" }}
          >
            Switch
          </button>
        </motion.div>
      </motion.section>

      {/* Projects Grid */}
      <motion.section
        initial="initial"
        animate="animate"
        transition={{ staggerChildren: 0.08, delayChildren: 0.3 }}
      >
        <motion.div
          className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted"
          variants={fadeUp}
        >
          Flagship Projects
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <motion.div key={project.slug} variants={fadeUp}>
              <ProjectCard
                slug={project.slug}
                title={project.title}
                description={project.description}
                techStack={project.techStack}
                accentColor={project.accentColor}
              />
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
