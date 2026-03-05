"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useMode } from "@/lib/modeContext";
import ModeToggle from "./ModeToggle";

const navLinks = [
  { href: "/", label: "Home", icon: "H" },
  { href: "/projects", label: "Projects", icon: "P" },
  { href: "/learn", label: "Learn", icon: "L" },
  { href: "/case-studies", label: "Case Studies", icon: "C" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { mode } = useMode();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      {/* Logo / Name */}
      <div className="mb-10 px-2">
        <Link href="/" className="block">
          <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Portfolio</div>
          <div className="gradient-text text-xl font-bold tracking-tight">Matthew</div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navLinks.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`
                group relative flex items-center gap-3 rounded-lg px-3 py-2.5
                text-sm font-medium transition-all duration-300
                ${
                  active
                    ? "text-[var(--color-accent)]"
                    : "text-text-secondary hover:text-text-primary"
                }
              `}
            >
              {/* Active indicator bar */}
              {active && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    backgroundColor: "var(--color-accent-glow)",
                    borderLeft: "2px solid var(--color-accent)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              {/* Icon */}
              <span
                className={`
                  relative z-10 flex h-7 w-7 items-center justify-center rounded-md
                  font-mono text-xs font-bold
                  ${active ? "bg-[var(--color-accent-glow)]" : "bg-dark-surface"}
                `}
              >
                {link.icon}
              </span>

              {/* Label */}
              <span className="relative z-10">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mode Toggle at bottom */}
      <div className="mt-auto pt-6">
        <ModeToggle />

        {/* Mode description */}
        <motion.div
          key={mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 px-1 text-[11px] leading-relaxed text-text-muted"
        >
          {mode === "portfolio"
            ? "Viewing clean demos, metrics, and case studies."
            : "Exploring code, data flows, and walkthroughs."}
        </motion.div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="
          fixed left-0 top-0 z-40 hidden h-screen flex-col
          border-r bg-dark-void p-5
          transition-[border-color] duration-400
          lg:flex
        "
        style={{
          width: "var(--sidebar-width)",
          borderColor: "var(--color-accent-dim)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="
          fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center
          rounded-lg border border-dark-border bg-dark-surface
          lg:hidden
        "
        aria-label="Open navigation"
      >
        <div className="space-y-1.5">
          <div className="h-0.5 w-5 bg-text-secondary" />
          <div className="h-0.5 w-3.5 bg-text-secondary" />
          <div className="h-0.5 w-5 bg-text-secondary" />
        </div>
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-dark-border bg-dark-void p-5 lg:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Close button */}
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-4 top-4 text-text-muted hover:text-text-primary"
                aria-label="Close navigation"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
