"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface SplitPaneLayoutProps {
  /** The interactive demo (left side) */
  demo: React.ReactNode;
  /** The code panel (right side) */
  codePanel: React.ReactNode;
  /** Label shown above the demo panel */
  demoLabel?: string;
  /** Label shown above the code panel */
  codePanelLabel?: string;
}

const MIN_SPLIT = 30;
const MAX_SPLIT = 70;
const DEFAULT_SPLIT = 60;

export default function SplitPaneLayout({
  demo,
  codePanel,
  demoLabel = "Interactive Demo",
  codePanelLabel = "Source Code",
}: SplitPaneLayoutProps) {
  const [splitPercent, setSplitPercent] = useState(DEFAULT_SPLIT);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      setSplitPercent(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, percent)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="space-y-0">
      {/* Desktop: side-by-side */}
      <div
        ref={containerRef}
        className="hidden md:flex relative overflow-hidden rounded-2xl border border-dark-border bg-dark-void"
        style={{ height: "calc(100vh - 200px)", minHeight: "500px", maxHeight: "800px" }}
      >
        {/* Demo pane */}
        <div
          className="overflow-auto"
          style={{ width: `${splitPercent}%` }}
        >
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-dark-border bg-dark-void/90 px-4 py-2 backdrop-blur-sm">
            <div className="h-2 w-2 rounded-full bg-green-infra" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
              {demoLabel}
            </span>
          </div>
          <div className="p-4">
            {demo}
          </div>
        </div>

        {/* Draggable divider */}
        <div
          className={`
            group relative z-20 flex w-1 cursor-col-resize items-center justify-center
            bg-dark-border transition-colors
            ${isDragging ? "bg-[var(--color-accent)]" : "hover:bg-[var(--color-accent-dim)]"}
          `}
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={splitPercent}
          aria-valuemin={MIN_SPLIT}
          aria-valuemax={MAX_SPLIT}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setSplitPercent((p) => Math.max(MIN_SPLIT, p - 2));
            if (e.key === "ArrowRight") setSplitPercent((p) => Math.min(MAX_SPLIT, p + 2));
          }}
        >
          {/* Drag handle dots */}
          <div
            className={`
              absolute flex flex-col gap-1 rounded-full px-1 py-3
              transition-opacity
              ${isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
            `}
          >
            <div className="h-1 w-1 rounded-full bg-[var(--color-accent)]" />
            <div className="h-1 w-1 rounded-full bg-[var(--color-accent)]" />
            <div className="h-1 w-1 rounded-full bg-[var(--color-accent)]" />
          </div>
          {/* Wider invisible hit target */}
          <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
        </div>

        {/* Code pane */}
        <div
          className="overflow-auto"
          style={{ width: `${100 - splitPercent}%` }}
        >
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-dark-border bg-dark-void/90 px-4 py-2 backdrop-blur-sm">
            <div className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
              {codePanelLabel}
            </span>
          </div>
          <div className="h-full">
            {codePanel}
          </div>
        </div>
      </div>

      {/* Mobile: stacked */}
      <div className="flex flex-col gap-4 md:hidden">
        <div className="rounded-2xl border border-dark-border bg-dark-void">
          <div className="flex items-center gap-2 border-b border-dark-border px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-green-infra" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
              {demoLabel}
            </span>
          </div>
          <div className="p-4">{demo}</div>
        </div>
        <div className="rounded-2xl border border-dark-border bg-dark-void">
          <div className="flex items-center gap-2 border-b border-dark-border px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
              {codePanelLabel}
            </span>
          </div>
          <div className="max-h-[60vh] overflow-auto">{codePanel}</div>
        </div>
      </div>
    </div>
  );
}
