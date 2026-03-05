"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface ProjectCardProps {
  slug: string;
  title: string;
  description: string;
  techStack: string[];
  accentColor: string;
}

export default function ProjectCard({
  slug,
  title,
  description,
  techStack,
  accentColor,
}: ProjectCardProps) {
  return (
    <Link href={`/projects/${slug}`}>
      <motion.article
        className="group relative overflow-hidden rounded-xl border border-dark-border bg-dark-surface p-6 transition-[border-color] duration-300 hover:border-accent-dim"
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* Top accent line */}
        <div
          className="absolute left-0 top-0 h-[2px] w-full transition-opacity duration-300 group-hover:opacity-100 opacity-60"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          }}
        />

        {/* Project number indicator */}
        <div
          className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold"
          style={{
            backgroundColor: `${accentColor}15`,
            color: accentColor,
            border: `1px solid ${accentColor}30`,
          }}
        >
          {slug === "learning-hub" ? "01" : slug === "kanban" ? "02" : "03"}
        </div>

        {/* Title */}
        <h3 className="mb-2 text-lg font-bold text-text-primary transition-colors duration-300 group-hover:text-[var(--color-accent)]">
          {title}
        </h3>

        {/* Description */}
        <p className="mb-5 text-sm leading-relaxed text-text-secondary">{description}</p>

        {/* Tech badges */}
        <div className="flex flex-wrap gap-2">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="rounded-md bg-dark-elevated px-2.5 py-1 font-mono text-[11px] text-text-muted"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Arrow indicator */}
        <div className="absolute bottom-6 right-6 text-text-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--color-accent)]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </motion.article>
    </Link>
  );
}
