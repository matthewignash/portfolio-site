# Phase 3: Learning Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a split-pane Learning Mode experience where visitors explore case study demos alongside annotated source code, step-through walkthroughs, and architecture diagrams.

**Architecture:** Each `/learn/[slug]` route renders a `SplitPaneLayout` with the existing case study demo on the left (60%) and a 3-tab `CodePanel` on the right (40%). Content is stored as static TypeScript files in `data/learning/`. Shiki handles server-side syntax highlighting. All components use the existing mode system (`useMode()`) and design tokens.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Framer Motion, Shiki (new)

**Security Note:** `dangerouslySetInnerHTML` is used to render Shiki output. This is safe because all HTML is generated server-side by Shiki from our own source files — never from user input. This is the standard pattern for Shiki + React.

**Note:** This project has no test framework installed. "Verify" steps use `npm run build` to catch type errors and the preview tool for visual validation.

---

## Task 1: Install Shiki and Create Learning Content Types

**Files:**
- Modify: `package.json` (add shiki dependency)
- Create: `lib/learning-mode-types.ts`

**Step 1: Install Shiki**

```bash
cd /Users/imatthew/Documents/Claude\ Code\ Projects/Portfolio\ and\ Website/portfolio-site
npm install shiki
```

**Step 2: Create type definitions**

Create `lib/learning-mode-types.ts`:

```typescript
// Types for Phase 3: Learning Mode split-pane experience

export interface CodeFile {
  /** Relative path from project root, e.g. "components/grading-app/GradingAppBoard.tsx" */
  path: string;
  /** Display name in file selector, e.g. "Grading Board" */
  label: string;
  /** Source language for Shiki */
  language: "tsx" | "ts";
  /** Optional default highlighted line ranges */
  highlightRanges?: [number, number][];
}

export interface WalkthroughStep {
  id: number;
  /** Step title, e.g. "1. User selects a student" */
  title: string;
  /** Prose explanation of what the code does and why */
  description: string;
  /** Which CodeFile.path to display during this step */
  file: string;
  /** Line range to highlight [startLine, endLine] (1-indexed) */
  lineRange: [number, number];
  /** Optional instruction referencing the demo, e.g. "Click the student dropdown" */
  demoAction?: string;
}

export type ArchNodeType = "component" | "hook" | "context" | "api" | "data";

export interface ArchNode {
  id: string;
  label: string;
  type: ArchNodeType;
}

export interface ArchEdge {
  from: string;
  to: string;
  label?: string;
}

export interface ArchitectureDiagram {
  nodes: ArchNode[];
  edges: ArchEdge[];
}

export interface CaseStudyLearningContent {
  slug: "grading-app" | "kanban" | "learning-hub";
  /** Display title for the hub card */
  title: string;
  /** One-line description */
  description: string;
  /** Tech stack pills shown on hub card */
  techStack: string[];
  /** Source files to display in the Code tab */
  codeFiles: CodeFile[];
  /** Ordered walkthrough steps */
  walkthrough: WalkthroughStep[];
  /** Architecture diagram data */
  architecture: ArchitectureDiagram;
}
```

**Step 3: Verify build**

```bash
npm run build 2>&1
```

Expected: Clean build, no errors.

**Step 4: Commit**

```bash
git add package.json package-lock.json lib/learning-mode-types.ts
git commit -m "feat: install shiki and add learning mode types"
```

---

## Task 2: Create ShikiCodeBlock Server Component

**Files:**
- Create: `components/learning-mode/ShikiCodeBlock.tsx`

This is an RSC (React Server Component) that renders syntax-highlighted code using Shiki. It reads source files at build time.

**Step 1: Create the component**

Create `components/learning-mode/ShikiCodeBlock.tsx`:

```tsx
import { codeToHtml } from "shiki";

interface ShikiCodeBlockProps {
  /** Raw source code string */
  code: string;
  /** Language for syntax highlighting */
  language: "tsx" | "ts";
  /** Optional line range to highlight [start, end] (1-indexed) */
  highlightLines?: [number, number];
  /** Optional filename displayed above the code */
  filename?: string;
}

export default async function ShikiCodeBlock({
  code,
  language,
  highlightLines,
  filename,
}: ShikiCodeBlockProps) {
  // Build line highlight decorations if provided
  const decorations: { start: { line: number; character: number }; end: { line: number; character: number }; properties: { class: string } }[] = [];
  if (highlightLines) {
    const [startLine, endLine] = highlightLines;
    for (let i = startLine - 1; i < endLine; i++) {
      decorations.push({
        start: { line: i, character: 0 },
        end: { line: i, character: Infinity },
        properties: { class: "highlight-line" },
      });
    }
  }

  const html = await codeToHtml(code, {
    lang: language,
    theme: "github-dark-default",
    decorations: decorations.length > 0 ? decorations : undefined,
  });

  // Note: dangerouslySetInnerHTML is safe here — HTML is generated by Shiki
  // from our own source files at build time, never from user input.
  return (
    <div className="shiki-code-block relative overflow-hidden rounded-lg">
      {filename && (
        <div className="flex items-center gap-2 border-b border-dark-border bg-dark-void px-4 py-2">
          <span className="font-mono text-[11px] text-text-muted">{filename}</span>
        </div>
      )}
      <div
        className="overflow-auto text-sm [&_pre]:!bg-dark-void [&_pre]:p-4 [&_code]:font-[var(--font-jetbrains-mono)] [&_.highlight-line]:bg-[#f9731620] [&_.highlight-line]:border-l-2 [&_.highlight-line]:border-l-orange-learning [&_.line]:px-1"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
```

**Important notes for the implementer:**
- This is a **server component** — no `"use client"` directive
- `codeToHtml` is async, so the component is an async function
- The `github-dark-default` theme matches the dark portfolio aesthetic
- Highlight lines get an orange left border + translucent orange background (learning mode accent)
- Line numbers are handled by Shiki's output (CSS line numbering)
- The `[&_pre]:!bg-dark-void` forces Shiki's pre tag to use our dark background

**Step 2: Verify build**

```bash
npm run build 2>&1
```

Expected: Clean build. (Component won't render anywhere yet, but TypeScript should compile.)

**Step 3: Commit**

```bash
git add components/learning-mode/ShikiCodeBlock.tsx
git commit -m "feat: add ShikiCodeBlock server component with Shiki syntax highlighting"
```

---

## Task 3: Create SplitPaneLayout Component

**Files:**
- Create: `components/learning-mode/SplitPaneLayout.tsx`

This is a client component that renders a draggable 60/40 split pane. On mobile (<768px) it stacks vertically.

**Step 1: Create the component**

Create `components/learning-mode/SplitPaneLayout.tsx`:

```tsx
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";

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

const MIN_SPLIT = 30; // minimum 30% for either side
const MAX_SPLIT = 70;
const DEFAULT_SPLIT = 60; // 60% demo, 40% code

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
```

**Key implementation notes:**
- Mouse events for drag: `mousedown` on divider, `mousemove`/`mouseup` on `window` (handles fast dragging)
- The divider has an invisible wider hit target (`-left-1.5 -right-1.5` = 12px total)
- Three accent-colored dots appear on hover/drag as a visual handle
- Keyboard accessible: `ArrowLeft`/`ArrowRight` on the separator moves it 2% per press
- Mobile stacking happens at `md:` breakpoint (768px)
- Demo and code pane heights use `calc(100vh - 200px)` with min/max bounds

**Step 2: Verify build**

```bash
npm run build 2>&1
```

Expected: Clean build.

**Step 3: Commit**

```bash
git add components/learning-mode/SplitPaneLayout.tsx
git commit -m "feat: add SplitPaneLayout with draggable divider and mobile stacking"
```

---

## Task 4: Create CodePanel with Tab Switching

**Files:**
- Create: `components/learning-mode/CodePanel.tsx`

This is a client component that renders the 3-tab code panel (Code, Walkthrough, Architecture). It orchestrates which sub-component to show.

**Step 1: Create the component**

Create `components/learning-mode/CodePanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  CodeFile,
  WalkthroughStep,
  ArchitectureDiagram,
} from "@/lib/learning-mode-types";

interface CodePanelProps {
  /** Pre-rendered Shiki HTML keyed by file path */
  renderedCode: Record<string, string>;
  /** Available source files */
  codeFiles: CodeFile[];
  /** Walkthrough steps */
  walkthrough: WalkthroughStep[];
  /** Architecture diagram data */
  architecture: ArchitectureDiagram;
}

type Tab = "code" | "walkthrough" | "architecture";

const TABS: { id: Tab; label: string }[] = [
  { id: "code", label: "Code" },
  { id: "walkthrough", label: "Walkthrough" },
  { id: "architecture", label: "Architecture" },
];

export default function CodePanel({
  renderedCode,
  codeFiles,
  walkthrough,
  architecture,
}: CodePanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("code");
  const [selectedFile, setSelectedFile] = useState(codeFiles[0]?.path ?? "");
  const [walkthroughStep, setWalkthroughStep] = useState(0);

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-dark-border bg-dark-void">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              relative px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em]
              transition-colors
              ${activeTab === tab.id
                ? "text-[var(--color-accent)]"
                : "text-text-muted hover:text-text-secondary"
              }
            `}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="codePanelTab"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-accent)]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {activeTab === "code" && (
            <motion.div
              key="code"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              {/* File selector */}
              {codeFiles.length > 1 && (
                <div className="border-b border-dark-border px-4 py-2">
                  <select
                    value={selectedFile}
                    onChange={(e) => setSelectedFile(e.target.value)}
                    className="w-full rounded-md border border-dark-border bg-dark-surface px-3 py-1.5 font-mono text-xs text-text-secondary focus:border-[var(--color-accent)] focus:outline-none"
                  >
                    {codeFiles.map((f) => (
                      <option key={f.path} value={f.path}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {/* Rendered code — Shiki HTML from our source files (trusted) */}
              <div
                className="text-sm [&_pre]:!bg-dark-void [&_pre]:p-4 [&_code]:font-[var(--font-jetbrains-mono)] [&_.highlight-line]:bg-[#f9731620] [&_.highlight-line]:border-l-2 [&_.highlight-line]:border-l-orange-learning [&_.line]:px-1"
                dangerouslySetInnerHTML={{ __html: renderedCode[selectedFile] ?? "" }}
              />
              {/* Copy button */}
              <CopyButton filePath={selectedFile} />
            </motion.div>
          )}

          {activeTab === "walkthrough" && (
            <motion.div
              key="walkthrough"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex h-full flex-col"
            >
              <WalkthroughView
                steps={walkthrough}
                currentStep={walkthroughStep}
                onStepChange={setWalkthroughStep}
                renderedCode={renderedCode}
              />
            </motion.div>
          )}

          {activeTab === "architecture" && (
            <motion.div
              key="architecture"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ArchitectureView diagram={architecture} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* --- Copy Button --- */

function CopyButton({ filePath }: { filePath: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(filePath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in non-secure contexts
    }
  };

  if (!filePath) return null;

  return (
    <button
      onClick={handleCopy}
      className="absolute right-3 top-3 rounded-md border border-dark-border bg-dark-surface px-2 py-1 font-mono text-[10px] text-text-muted transition-colors hover:text-text-secondary"
    >
      {copied ? "Copied!" : "Copy path"}
    </button>
  );
}

/* --- Walkthrough View --- */

interface WalkthroughViewProps {
  steps: WalkthroughStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  renderedCode: Record<string, string>;
}

function WalkthroughView({
  steps,
  currentStep,
  onStepChange,
  renderedCode,
}: WalkthroughViewProps) {
  const step = steps[currentStep];
  if (!step) return <div className="p-4 text-text-muted">No walkthrough steps.</div>;

  // Use step-specific highlighted code if available, else fall back to plain file
  const stepCodeKey = `${step.file}:${step.id}`;
  const stepHtml = renderedCode[stepCodeKey] ?? renderedCode[step.file] ?? "";

  return (
    <div className="flex h-full flex-col">
      {/* Step navigation */}
      <div className="flex items-center justify-between border-b border-dark-border px-4 py-2">
        <button
          onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:text-text-primary disabled:opacity-30"
        >
          &#8592; Prev
        </button>
        <span className="font-mono text-[10px] text-text-muted">
          Step {currentStep + 1} of {steps.length}
        </span>
        <button
          onClick={() => onStepChange(Math.min(steps.length - 1, currentStep + 1))}
          disabled={currentStep === steps.length - 1}
          className="rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:text-text-primary disabled:opacity-30"
        >
          Next &#8594;
        </button>
      </div>

      {/* Step callout */}
      <div className="border-b border-dark-border bg-dark-surface px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">{step.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          {step.description}
        </p>
        {step.demoAction && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--color-accent)]">
            <span>&#9654;</span> {step.demoAction}
          </p>
        )}
      </div>

      {/* Step progress bar */}
      <div className="h-0.5 bg-dark-border">
        <div
          className="h-full bg-[var(--color-accent)] transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Code with highlights for this step — Shiki HTML (trusted) */}
      <div className="flex-1 overflow-auto">
        <div
          className="text-sm [&_pre]:!bg-dark-void [&_pre]:p-4 [&_code]:font-[var(--font-jetbrains-mono)] [&_.highlight-line]:bg-[#f9731620] [&_.highlight-line]:border-l-2 [&_.highlight-line]:border-l-orange-learning [&_.line]:px-1"
          dangerouslySetInnerHTML={{ __html: stepHtml }}
        />
      </div>
    </div>
  );
}

/* --- Architecture View --- */

interface ArchitectureViewProps {
  diagram: ArchitectureDiagram;
}

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  component: { bg: "#3b82f620", border: "#3b82f6", text: "#93c5fd" },
  hook: { bg: "#22c55e20", border: "#22c55e", text: "#86efac" },
  context: { bg: "#a855f720", border: "#a855f7", text: "#d8b4fe" },
  api: { bg: "#f9731620", border: "#f97316", text: "#fdba74" },
  data: { bg: "#6b728020", border: "#6b7280", text: "#d1d5db" },
};

function ArchitectureView({ diagram }: ArchitectureViewProps) {
  const { nodes, edges } = diagram;

  // Simple layout: arrange nodes in layers based on incoming edges
  // Nodes with no incoming edges go on top
  const incomingCount = new Map<string, number>();
  nodes.forEach((n) => incomingCount.set(n.id, 0));
  edges.forEach((e) => incomingCount.set(e.to, (incomingCount.get(e.to) ?? 0) + 1));

  // Sort by incoming count (topological-ish)
  const sorted = [...nodes].sort(
    (a, b) => (incomingCount.get(a.id) ?? 0) - (incomingCount.get(b.id) ?? 0)
  );

  // Arrange in rows of 3
  const COLS = 3;
  const COL_WIDTH = 180;
  const ROW_HEIGHT = 80;
  const PADDING_X = 40;
  const PADDING_Y = 30;

  const nodePositions = new Map<string, { x: number; y: number }>();
  sorted.forEach((node, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    nodePositions.set(node.id, {
      x: PADDING_X + col * COL_WIDTH + COL_WIDTH / 2,
      y: PADDING_Y + row * ROW_HEIGHT + 25,
    });
  });

  const totalRows = Math.ceil(nodes.length / COLS);
  const svgWidth = PADDING_X * 2 + COLS * COL_WIDTH;
  const svgHeight = PADDING_Y * 2 + totalRows * ROW_HEIGHT;

  return (
    <div className="overflow-auto p-4">
      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-3">
        {Object.entries(NODE_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: colors.border }}
            />
            <span className="font-mono text-[10px] capitalize text-text-muted">
              {type}
            </span>
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        style={{ maxHeight: "500px" }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              fill="var(--text-muted, #5a5a7a)"
            />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodePositions.get(edge.from);
          const to = nodePositions.get(edge.to);
          if (!from || !to) return null;
          return (
            <g key={i}>
              <line
                x1={from.x}
                y1={from.y + 15}
                x2={to.x}
                y2={to.y - 15}
                stroke="var(--text-muted, #5a5a7a)"
                strokeWidth="1"
                markerEnd="url(#arrowhead)"
                opacity={0.5}
              />
              {edge.label && (
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2}
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--text-muted, #5a5a7a)"
                  dy="-4"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;
          const colors = NODE_COLORS[node.type] ?? NODE_COLORS.data;
          const nodeWidth = 140;
          return (
            <g key={node.id}>
              <rect
                x={pos.x - nodeWidth / 2}
                y={pos.y - 15}
                width={nodeWidth}
                height={30}
                rx={6}
                fill={colors.bg}
                stroke={colors.border}
                strokeWidth={1}
              />
              <text
                x={pos.x}
                y={pos.y + 4}
                textAnchor="middle"
                fontSize="11"
                fontFamily="var(--font-jetbrains-mono), monospace"
                fill={colors.text}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
```

**Key implementation notes:**
- `renderedCode` is a `Record<string, string>` of pre-rendered Shiki HTML. This is computed server-side in the page component and passed as a prop, so the CodePanel itself can be a client component.
- Walkthrough steps use `step.file + ":" + step.id` as a key for step-specific highlighted code.
- Architecture view uses a simple topological sort to layer nodes. No external graph library needed.
- The CopyButton is positioned absolute relative to the code container.

**Step 2: Verify build**

```bash
npm run build 2>&1
```

Expected: Clean build.

**Step 3: Commit**

```bash
git add components/learning-mode/CodePanel.tsx
git commit -m "feat: add CodePanel with Code, Walkthrough, and Architecture tabs"
```

---

## Task 5: Create Learning Content for Grading App

**Files:**
- Create: `data/learning/grading-app.ts`

This is the first content file. It references real source files in the project and creates meaningful walkthrough steps and architecture data.

**Step 1: Read the actual source files to get accurate line numbers**

Before writing the content file, read these files to determine correct line ranges:
- `components/grading-app/GradingAppBoard.tsx`
- `components/grading-app/TeacherDashboard.tsx`
- `components/grading-app/GradingPanel.tsx`
- `components/grading-app/StudentResults.tsx`
- `lib/grading-types.ts`

**Step 2: Create the content file**

Create `data/learning/grading-app.ts`:

```typescript
import type { CaseStudyLearningContent } from "@/lib/learning-mode-types";

export const gradingAppContent: CaseStudyLearningContent = {
  slug: "grading-app",
  title: "Assessment Grading App",
  description:
    "IB Chemistry exam grading with auto-scored MCQs, rubric checklists, and strand reporting.",
  techStack: [
    "React",
    "TypeScript",
    "Recharts",
    "Chart.js",
    "Tailwind CSS",
    "Faker.js",
  ],
  codeFiles: [
    {
      path: "components/grading-app/GradingAppBoard.tsx",
      label: "Board Orchestrator",
      language: "tsx",
    },
    {
      path: "components/grading-app/TeacherDashboard.tsx",
      label: "Teacher Dashboard",
      language: "tsx",
    },
    {
      path: "components/grading-app/GradingPanel.tsx",
      label: "Grading Panel",
      language: "tsx",
    },
    {
      path: "components/grading-app/StudentResults.tsx",
      label: "Student Results",
      language: "tsx",
    },
    {
      path: "lib/grading-types.ts",
      label: "Type Definitions",
      language: "ts",
    },
  ],
  walkthrough: [
    {
      id: 1,
      title: "1. View orchestration pattern",
      description:
        "GradingAppBoard manages which view is active (dashboard, grading, or student) using a simple useState. The GradingViewToggle component lets users switch between views. This pattern keeps routing logic out of the URL and inside the component tree.",
      file: "components/grading-app/GradingAppBoard.tsx",
      lineRange: [15, 34],
      demoAction: "Click the view toggle buttons above the demo to switch views.",
    },
    {
      id: 2,
      title: "2. Teacher dashboard analytics",
      description:
        "TeacherDashboard receives pre-computed analytics data and renders four chart sections: band distribution (bar chart), strand performance (radar), paper breakdown (grouped bars), and a student scores table. Each section uses Recharts with custom dark-theme styling.",
      file: "components/grading-app/TeacherDashboard.tsx",
      lineRange: [1, 30],
    },
    {
      id: 3,
      title: "3. Three scoring modes",
      description:
        "The grading system supports three distinct scoring modes: Auto (MCQ answer matching), Checklist AND (sum of checked rubric items), and Checklist OR (any correct item = full marks). The scoring mode is defined per question in the type system.",
      file: "lib/grading-types.ts",
      lineRange: [30, 50],
      demoAction: "Switch to the Grading view to see MCQ and checklist scoring in action.",
    },
    {
      id: 4,
      title: "4. KU/TT/C strand tracking",
      description:
        "Every question is tagged with a grading strand: Knowledge & Understanding (KU), Thinking & Transferring (TT), or Communication (C). Scores are aggregated per strand to produce separate band ratings on the AISC 1-8 scale alongside the overall IB 1-7 grade.",
      file: "lib/grading-types.ts",
      lineRange: [60, 85],
    },
    {
      id: 5,
      title: "5. Student score card with descriptors",
      description:
        "StudentResults renders a comprehensive report card showing the student's IB grade, strand bands, and holistic AISC descriptors. Topic analysis breaks down performance by IB syllabus topic code, highlighting strengths (>70%) and growth areas (<50%).",
      file: "components/grading-app/StudentResults.tsx",
      lineRange: [1, 30],
      demoAction: "Switch to Student view and select a student to see their score card.",
    },
  ],
  architecture: {
    nodes: [
      { id: "page", label: "GradingAppPage", type: "component" },
      { id: "board", label: "GradingAppBoard", type: "component" },
      { id: "toggle", label: "ViewToggle", type: "component" },
      { id: "dashboard", label: "TeacherDashboard", type: "component" },
      { id: "grading", label: "GradingPanel", type: "component" },
      { id: "student", label: "StudentResults", type: "component" },
      { id: "data", label: "grading-app.json", type: "data" },
      { id: "types", label: "grading-types.ts", type: "data" },
      { id: "recharts", label: "Recharts", type: "api" },
    ],
    edges: [
      { from: "page", to: "board", label: "data prop" },
      { from: "board", to: "toggle", label: "view state" },
      { from: "board", to: "dashboard" },
      { from: "board", to: "grading" },
      { from: "board", to: "student" },
      { from: "data", to: "page", label: "JSON import" },
      { from: "types", to: "board", label: "TypeScript" },
      { from: "dashboard", to: "recharts" },
    ],
  },
};
```

**Note for the implementer:** After reading the actual source files, adjust the `lineRange` values to match the real line numbers. The ranges above are approximate. Use the Read tool to check exact line positions.

**Step 3: Verify build**

```bash
npm run build 2>&1
```

Expected: Clean build.

**Step 4: Commit**

```bash
git add data/learning/grading-app.ts
git commit -m "feat: add learning content data for grading app case study"
```

---

## Task 6: Create Learning Content for Kanban and Learning Hub

**Files:**
- Create: `data/learning/kanban.ts`
- Create: `data/learning/learning-hub.ts`
- Create: `data/learning/index.ts` (barrel export)

Follow the same pattern as Task 5. Read the actual source files first to get accurate line ranges.

**Step 1: Read source files for both case studies**

For Kanban, check:
- `components/kanban/KanbanBoard.tsx`
- `components/kanban/KanbanColumn.tsx`
- `components/kanban/KanbanCard.tsx`
- `lib/kanban-types.ts`

For Learning Hub, check:
- `components/learning-hub/LearningHubBoard.tsx`
- `components/learning-hub/hex-engine/HexCanvas.tsx`
- `components/learning-hub/map-builder/MapBuilderView.tsx`
- `lib/learning-hub-types.ts`

**Step 2: Create `data/learning/kanban.ts`**

```typescript
import type { CaseStudyLearningContent } from "@/lib/learning-mode-types";

export const kanbanContent: CaseStudyLearningContent = {
  slug: "kanban",
  title: "EdTech Dashboards",
  description:
    "Dual-scope Kanban boards: team task management vs admin project oversight with analytics.",
  techStack: [
    "React",
    "TypeScript",
    "@dnd-kit",
    "Framer Motion",
    "Tailwind CSS",
    "Faker.js",
  ],
  codeFiles: [
    {
      path: "components/kanban/KanbanBoard.tsx",
      label: "Board Orchestrator",
      language: "tsx",
    },
    {
      path: "components/kanban/KanbanColumn.tsx",
      label: "Sortable Column",
      language: "tsx",
    },
    {
      path: "components/kanban/KanbanCard.tsx",
      label: "Card Components",
      language: "tsx",
    },
    {
      path: "components/kanban/KanbanAnalytics.tsx",
      label: "Analytics Dashboard",
      language: "tsx",
    },
    {
      path: "lib/kanban-types.ts",
      label: "Type Definitions",
      language: "ts",
    },
  ],
  walkthrough: [
    {
      id: 1,
      title: "1. Dual-scope architecture",
      description:
        "KanbanBoard accepts both teamData and adminData, switching between them with a ScopeToggle. Team scope shows a simple task board. Admin scope adds multi-board management, PARA categories, checklists, comments, and analytics. One component, two experiences.",
      file: "components/kanban/KanbanBoard.tsx",
      lineRange: [33, 40],
      demoAction: "Toggle between Team and Admin scope to see the board change.",
    },
    {
      id: 2,
      title: "2. Drag-and-drop with @dnd-kit",
      description:
        "DndContext from @dnd-kit wraps the board. Cards are draggable (useSortable), columns are droppable. The closestCorners collision strategy handles cross-column drops. DragOverlay renders a floating card preview during drag.",
      file: "components/kanban/KanbanBoard.tsx",
      lineRange: [1, 32],
    },
    {
      id: 3,
      title: "3. Card type polymorphism",
      description:
        "TeamCard and AdminCard extend KanbanCardBase with different fields. TeamCard has a single assignee and simple labels. AdminCard adds PARA categories, checklists, comments, and activity logs. The KanbanCard component renders the right variant based on scope.",
      file: "lib/kanban-types.ts",
      lineRange: [30, 70],
    },
    {
      id: 4,
      title: "4. Column WIP limits",
      description:
        "Each column has an optional WIP (Work In Progress) limit. When the card count exceeds the limit, the column header shows a warning indicator. This enforces lean workflow principles in the admin scope.",
      file: "components/kanban/KanbanColumn.tsx",
      lineRange: [1, 30],
    },
    {
      id: 5,
      title: "5. Admin analytics",
      description:
        "The admin scope includes an Analytics tab with aging reports, cycle time metrics, WIP tracking, and card distribution charts. All computed client-side from the card data — no separate analytics API needed.",
      file: "components/kanban/KanbanAnalytics.tsx",
      lineRange: [1, 30],
      demoAction: "Switch to Admin scope and click the Analytics tab.",
    },
  ],
  architecture: {
    nodes: [
      { id: "page", label: "KanbanPage", type: "component" },
      { id: "board", label: "KanbanBoard", type: "component" },
      { id: "scope", label: "ScopeToggle", type: "component" },
      { id: "dnd", label: "DndContext", type: "context" },
      { id: "column", label: "KanbanColumn", type: "component" },
      { id: "card", label: "KanbanCard", type: "component" },
      { id: "modal", label: "CardModal", type: "component" },
      { id: "analytics", label: "Analytics", type: "component" },
      { id: "teamData", label: "kanban-team.json", type: "data" },
      { id: "adminData", label: "kanban-admin.json", type: "data" },
    ],
    edges: [
      { from: "page", to: "board", label: "team+admin data" },
      { from: "board", to: "scope" },
      { from: "board", to: "dnd", label: "wraps columns" },
      { from: "dnd", to: "column" },
      { from: "column", to: "card" },
      { from: "card", to: "modal", label: "on click" },
      { from: "board", to: "analytics", label: "admin only" },
      { from: "teamData", to: "page" },
      { from: "adminData", to: "page" },
    ],
  },
};
```

**Step 3: Create `data/learning/learning-hub.ts`**

```typescript
import type { CaseStudyLearningContent } from "@/lib/learning-mode-types";

export const learningHubContent: CaseStudyLearningContent = {
  slug: "learning-hub",
  title: "Unified Learning Map",
  description:
    "Hex-based visual LMS with differentiated pathways, 13 teacher tabs, and 5 student views.",
  techStack: [
    "React",
    "TypeScript",
    "SVG",
    "Recharts",
    "Framer Motion",
    "Faker.js",
    "Tailwind CSS",
  ],
  codeFiles: [
    {
      path: "components/learning-hub/LearningHubBoard.tsx",
      label: "Board Orchestrator",
      language: "tsx",
    },
    {
      path: "components/learning-hub/hex-engine/HexCanvas.tsx",
      label: "SVG Hex Engine",
      language: "tsx",
    },
    {
      path: "components/learning-hub/map-builder/MapBuilderView.tsx",
      label: "Map Builder",
      language: "tsx",
    },
    {
      path: "components/learning-hub/hex-engine/HexEditor.tsx",
      label: "Hex Editor",
      language: "tsx",
    },
    {
      path: "lib/learning-hub-types.ts",
      label: "Type Definitions",
      language: "ts",
    },
  ],
  walkthrough: [
    {
      id: 1,
      title: "1. 18-tab orchestration",
      description:
        "LearningHubBoard manages 13 teacher tabs and 5 student tabs through a role toggle and tab navigation. Teacher tabs cover map building, data management, curriculum, progress analytics, and support. Student tabs show their map progress, planner, and study tools.",
      file: "components/learning-hub/LearningHubBoard.tsx",
      lineRange: [1, 40],
      demoAction:
        "Toggle between Teacher and Student roles, then explore different tabs.",
    },
    {
      id: 2,
      title: "2. Hand-rolled SVG hex engine",
      description:
        "HexCanvas renders flat-top hexagons as SVG polygons with 40px radius. Each hex is positioned with x/y coordinates and connected by bezier curve arrows. The engine supports pan (mouse drag on canvas) and click selection — no external diagram library needed.",
      file: "components/learning-hub/hex-engine/HexCanvas.tsx",
      lineRange: [1, 40],
    },
    {
      id: 3,
      title: "3. Hex editor with curriculum metadata",
      description:
        "When a hex is selected, the editor sidebar shows its properties: KU/TT/C grading strands (multi-select), AISC competencies and values, UBD stage, UDL strategies, differentiation pathway, MTSS tier, and WIDA EAL support. All based on the real ULM application.",
      file: "components/learning-hub/hex-engine/HexEditor.tsx",
      lineRange: [1, 40],
      demoAction:
        "Click any hex on the map to open its editor in the right panel.",
    },
    {
      id: 4,
      title: "4. Differentiation pathways",
      description:
        "Each hex can be assigned to scaffolded (green), standard (blue), or enrichment (purple) pathways. Connections between hexes carry pathway information. The student map view filters hexes by the student's assigned pathway, showing a personalized learning path.",
      file: "components/learning-hub/map-builder/MapBuilderView.tsx",
      lineRange: [1, 40],
    },
    {
      id: 5,
      title: "5. Type-safe data model",
      description:
        "learning-hub-types.ts defines 30+ TypeScript interfaces covering hexes, connections, students, courses, progress records, SBAR performance, curriculum standards, UBD units, and the full dashboard data shape. The deterministic Faker.js seed (77) generates consistent demo data across all 53 hexes.",
      file: "lib/learning-hub-types.ts",
      lineRange: [1, 40],
    },
  ],
  architecture: {
    nodes: [
      { id: "page", label: "LearningHubPage", type: "component" },
      { id: "board", label: "LearningHubBoard", type: "component" },
      { id: "tabs", label: "TabNavigation", type: "component" },
      { id: "mapBuilder", label: "MapBuilderView", type: "component" },
      { id: "hexCanvas", label: "HexCanvas", type: "component" },
      { id: "hexEditor", label: "HexEditor", type: "component" },
      { id: "studentMap", label: "StudentMapView", type: "component" },
      { id: "progress", label: "ProgressDashboard", type: "component" },
      { id: "data", label: "learning-hub.json", type: "data" },
      { id: "types", label: "learning-hub-types", type: "data" },
    ],
    edges: [
      { from: "page", to: "board", label: "data prop" },
      { from: "board", to: "tabs", label: "role + tab state" },
      { from: "board", to: "mapBuilder" },
      { from: "board", to: "studentMap" },
      { from: "board", to: "progress" },
      { from: "mapBuilder", to: "hexCanvas", label: "hexes + connections" },
      { from: "mapBuilder", to: "hexEditor", label: "selected hex" },
      { from: "data", to: "page", label: "JSON import" },
      { from: "types", to: "board", label: "TypeScript" },
    ],
  },
};
```

**Step 4: Create barrel export `data/learning/index.ts`**

```typescript
export { gradingAppContent } from "./grading-app";
export { kanbanContent } from "./kanban";
export { learningHubContent } from "./learning-hub";

import type { CaseStudyLearningContent } from "@/lib/learning-mode-types";
import { gradingAppContent } from "./grading-app";
import { kanbanContent } from "./kanban";
import { learningHubContent } from "./learning-hub";

export const allLearningContent: Record<string, CaseStudyLearningContent> = {
  "grading-app": gradingAppContent,
  kanban: kanbanContent,
  "learning-hub": learningHubContent,
};
```

**Step 5: Verify build**

```bash
npm run build 2>&1
```

Expected: Clean build.

**Step 6: Commit**

```bash
git add data/learning/
git commit -m "feat: add learning content data for all three case studies"
```

---

## Task 7: Create `/learn` Hub Page

**Files:**
- Create: `app/learn/page.tsx`

This is the learning mode hub — a 3-card grid linking to each case study's split-pane view.

**Step 1: Create the page**

Create `app/learn/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMode } from "@/lib/modeContext";
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
  const { mode } = useMode();

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
```

**Step 2: Verify build**

```bash
npm run build 2>&1
```

Expected: Clean build. Page accessible at `/learn`.

**Step 3: Commit**

```bash
git add app/learn/page.tsx
git commit -m "feat: add /learn hub page with 3 case study cards"
```

---

## Task 8: Create `/learn/[slug]` Split-Pane Page

**Files:**
- Create: `app/learn/[slug]/page.tsx`
- Create: `app/learn/[slug]/LearnSlugClient.tsx`

This is the main learning experience page. The **page** is a server component that reads source files and renders them with Shiki. The **client wrapper** handles dynamic demo imports and layout composition.

**Step 1: Create the server page**

Create `app/learn/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import { join } from "path";
import { codeToHtml } from "shiki";
import Link from "next/link";
import { allLearningContent } from "@/data/learning";
import LearnSlugClient from "./LearnSlugClient";

// Generate static params for all 3 case studies
export function generateStaticParams() {
  return [
    { slug: "grading-app" },
    { slug: "kanban" },
    { slug: "learning-hub" },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = allLearningContent[slug];
  if (!content) return { title: "Not Found" };
  return {
    title: `Learn: ${content.title} | Matthew's EdTech Portfolio`,
    description: content.description,
  };
}

export default async function LearnSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = allLearningContent[slug];
  if (!content) notFound();

  // Read and render all source files with Shiki
  const renderedCode: Record<string, string> = {};
  const rawCode: Record<string, string> = {};

  for (const file of content.codeFiles) {
    try {
      const filePath = join(process.cwd(), file.path);
      const source = await readFile(filePath, "utf-8");
      rawCode[file.path] = source;

      // dangerouslySetInnerHTML usage note: HTML is generated by Shiki
      // from our own source files, not user input. This is the standard
      // pattern for Shiki + React.
      const html = await codeToHtml(source, {
        lang: file.language,
        theme: "github-dark-default",
      });
      renderedCode[file.path] = html;
    } catch {
      // File not found — render placeholder
      renderedCode[file.path] = `<pre class="p-4 text-text-muted">Source file not available: ${file.path}</pre>`;
      rawCode[file.path] = `// Source file not available: ${file.path}`;
    }
  }

  // Pre-render walkthrough step highlights
  // Each walkthrough step needs its own highlighted version of its file
  for (const step of content.walkthrough) {
    const source = rawCode[step.file];
    if (!source) continue;

    const [startLine, endLine] = step.lineRange;
    const decorations = [];
    const lineCount = source.split("\n").length;
    for (let i = startLine - 1; i < endLine && i < lineCount; i++) {
      decorations.push({
        start: { line: i, character: 0 },
        end: { line: i, character: Infinity },
        properties: { class: "highlight-line" },
      });
    }

    try {
      const html = await codeToHtml(source, {
        lang: content.codeFiles.find((f) => f.path === step.file)?.language ?? "tsx",
        theme: "github-dark-default",
        decorations,
      });
      renderedCode[step.file + ":" + step.id] = html;
    } catch {
      // Fallback to unhighlighted version
      renderedCode[step.file + ":" + step.id] = renderedCode[step.file] ?? "";
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 font-mono text-[11px] text-text-muted">
        <Link href="/" className="transition-colors hover:text-text-secondary">
          Home
        </Link>
        <span>/</span>
        <Link href="/learn" className="transition-colors hover:text-text-secondary">
          Learn
        </Link>
        <span>/</span>
        <span className="text-[var(--color-accent)]">{content.title}</span>
      </div>

      {/* Client-side split pane */}
      <LearnSlugClient
        content={content}
        renderedCode={renderedCode}
      />
    </div>
  );
}
```

**Step 2: Create the client wrapper**

Create `app/learn/[slug]/LearnSlugClient.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";
import SplitPaneLayout from "@/components/learning-mode/SplitPaneLayout";
import CodePanel from "@/components/learning-mode/CodePanel";
import type { CaseStudyLearningContent } from "@/lib/learning-mode-types";

// Dynamic imports for case study demos (same as project pages)
import type { GradingAppData } from "@/lib/grading-types";
import type { TeamKanbanData, AdminKanbanData } from "@/lib/kanban-types";
import type { LearningHubData } from "@/lib/learning-hub-types";

import rawGradingData from "@/data/mock/grading-app.json";
import rawKanbanTeam from "@/data/mock/kanban-team.json";
import rawKanbanAdmin from "@/data/mock/kanban-admin.json";
import rawLearningHub from "@/data/mock/learning-hub.json";

const gradingData = rawGradingData as unknown as GradingAppData;
const kanbanTeam = rawKanbanTeam as unknown as TeamKanbanData;
const kanbanAdmin = rawKanbanAdmin as unknown as AdminKanbanData;
const learningHubData = rawLearningHub as unknown as LearningHubData;

const GradingAppBoard = dynamic(
  () => import("@/components/grading-app/GradingAppBoard"),
  { ssr: false, loading: () => <DemoLoading /> }
);
const KanbanBoard = dynamic(
  () => import("@/components/kanban/KanbanBoard"),
  { ssr: false, loading: () => <DemoLoading /> }
);
const LearningHubBoard = dynamic(
  () => import("@/components/learning-hub/LearningHubBoard"),
  { ssr: false, loading: () => <DemoLoading /> }
);

function DemoLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-sm text-text-muted">Loading demo...</div>
    </div>
  );
}

interface LearnSlugClientProps {
  content: CaseStudyLearningContent;
  renderedCode: Record<string, string>;
}

export default function LearnSlugClient({
  content,
  renderedCode,
}: LearnSlugClientProps) {
  // Select the right demo component
  const demoComponent = (() => {
    switch (content.slug) {
      case "grading-app":
        return <GradingAppBoard data={gradingData} />;
      case "kanban":
        return <KanbanBoard teamData={kanbanTeam} adminData={kanbanAdmin} />;
      case "learning-hub":
        return <LearningHubBoard data={learningHubData} />;
      default:
        return <div>Unknown case study</div>;
    }
  })();

  return (
    <SplitPaneLayout
      demo={demoComponent}
      codePanel={
        <CodePanel
          renderedCode={renderedCode}
          codeFiles={content.codeFiles}
          walkthrough={content.walkthrough}
          architecture={content.architecture}
        />
      }
      demoLabel={content.title}
      codePanelLabel="Source Code"
    />
  );
}
```

**Key implementation notes:**
- The **page** is a server component — it reads files and calls Shiki's async `codeToHtml`
- The **client wrapper** handles dynamic demo imports and layout composition
- Walkthrough steps get their own pre-rendered HTML with line highlights (keyed as `"file:stepId"`)
- All three demos use the exact same data imports as the existing `/projects/*` pages
- `generateStaticParams` enables static generation at build time
- Next.js 16 uses `params: Promise<{ slug: string }>` — must `await params`

**Step 3: Verify build**

```bash
npm run build 2>&1
```

Expected: Clean build. Pages generated for `/learn/grading-app`, `/learn/kanban`, `/learn/learning-hub`.

**Step 4: Visual verification**

Start the dev server and check:
1. `/learn` shows 3 cards
2. `/learn/grading-app` shows split pane with demo on left and code on right
3. Tab switching works (Code / Walkthrough / Architecture)
4. Dragging the divider resizes the panes
5. Mobile view stacks vertically

**Step 5: Commit**

```bash
git add app/learn/
git commit -m "feat: add /learn/[slug] split-pane pages with Shiki code rendering"
```

---

## Task 9: Update Sidebar for Learn Sub-Links (Optional Enhancement)

**Files:**
- Modify: `components/Sidebar.tsx` (optionally)

The sidebar already has a "Learn" link at `/learn`. This task optionally adds sub-links for each case study when on `/learn/*` paths.

**Step 1: Evaluate need**

Check if the current single "Learn" link is sufficient. The `/learn` hub page already provides navigation to each case study. Sub-links may add clutter.

**Recommendation:** Skip this task for now. The hub page handles navigation. Revisit in Phase 4 if needed.

**Step 2: If implementing, add conditional sub-links**

Only if the user requests it: expand the "Learn" nav item to show 3 sub-links when on `/learn/*` paths:

```tsx
// After the Learn nav link, conditionally render sub-links:
{pathname.startsWith("/learn") && link.href === "/learn" && (
  <div className="ml-10 mt-1 space-y-0.5">
    {[
      { href: "/learn/learning-hub", label: "Learning Hub" },
      { href: "/learn/grading-app", label: "Grading App" },
      { href: "/learn/kanban", label: "Kanban" },
    ].map((sub) => (
      <Link
        key={sub.href}
        href={sub.href}
        className={`block rounded-md px-3 py-1.5 text-xs ${
          pathname === sub.href
            ? "text-[var(--color-accent)]"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        {sub.label}
      </Link>
    ))}
  </div>
)}
```

**Step 3: Commit (if changed)**

```bash
git add components/Sidebar.tsx
git commit -m "feat: add learn sub-links to sidebar navigation"
```

---

## Task 10: Final Build Verification and Polish

**Files:**
- Potentially modify any of the above files for build fixes

**Step 1: Full build**

```bash
npm run build 2>&1
```

Expected: Zero errors, all pages generated.

**Step 2: Visual test checklist**

Start dev server and verify:

- [ ] `/learn` — 3 cards render, links work, stagger animation plays
- [ ] `/learn/grading-app` — split pane loads, demo interactive, code highlighted
- [ ] `/learn/kanban` — split pane loads, DnD works in demo pane
- [ ] `/learn/learning-hub` — split pane loads, hex map renders
- [ ] Code tab — file selector switches files, syntax highlighting correct
- [ ] Walkthrough tab — steps navigate with buttons, highlights change per step
- [ ] Architecture tab — SVG diagram renders, nodes colored by type, edges connect
- [ ] Divider drag — resizes panes between 30-70%, handle dots appear on hover
- [ ] Mobile (< 768px) — panes stack vertically
- [ ] Mode toggle — accent colors shift (purple / orange) on all learning pages

**Step 3: Fix any issues found**

Address build errors or visual issues.

**Step 4: Commit**

```bash
git add -A
git commit -m "fix: polish learning mode pages and fix build issues"
```

---

## Task 11: Final Commit and Push

**Step 1: Verify git status is clean**

```bash
git status
git log --oneline -5
```

**Step 2: Push to remote**

```bash
git push origin main
```

---

## Summary of Files Created/Modified

**New files (12):**
- `lib/learning-mode-types.ts` — TypeScript interfaces
- `components/learning-mode/ShikiCodeBlock.tsx` — Server component (may be unused directly if CodePanel handles rendering)
- `components/learning-mode/SplitPaneLayout.tsx` — Draggable split pane
- `components/learning-mode/CodePanel.tsx` — 3-tab code panel with walkthrough + architecture
- `data/learning/grading-app.ts` — Grading app content
- `data/learning/kanban.ts` — Kanban content
- `data/learning/learning-hub.ts` — Learning Hub content
- `data/learning/index.ts` — Barrel export
- `app/learn/page.tsx` — Hub page
- `app/learn/[slug]/page.tsx` — Server-side Shiki rendering
- `app/learn/[slug]/LearnSlugClient.tsx` — Client wrapper with demos

**Modified files (1-2):**
- `package.json` / `package-lock.json` — Shiki dependency
- `components/Sidebar.tsx` — Optional sub-links

**Dependencies added:**
- `shiki` — syntax highlighting
