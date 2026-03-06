# Phase 3: Learning Mode Design

**Date:** 2026-03-06
**Status:** Approved
**Scope:** Split-pane code exploration experience for all 3 case studies

## Overview

Phase 3 adds a "Learning Mode" to the portfolio — a side-by-side experience where visitors can interact with each case study demo while reading annotated source code, stepping through walkthroughs, and viewing architecture diagrams. The goal is to serve both hiring managers (who want to see working software) and technical peers (who want to understand implementation decisions).

## Design Decisions

### Split-Pane Layout

- **60/40 split** — demo on the left (60%), code panel on the right (40%)
- **Draggable divider** — 4px handle, expands to 12px hover target, drag to resize between 30%-70%
- **Mobile** — stacks vertically (demo on top, code below), no divider
- **Breakpoint** — `md` (768px) switches between stacked and side-by-side
- **Animation** — Framer Motion `layout` transitions when switching between modes

**Component:** `<SplitPaneLayout demo={<Component />} codePanel={<CodePanel />} />`

### Code Panel (3 Tabs)

**Tab 1 — "Code"**
- Shiki server-rendered syntax highlighting (TypeScript/TSX)
- Line numbers, copy-to-clipboard button
- File selector dropdown when a case study has multiple relevant files
- Context-aware scrolling: interacting with a demo element scrolls to the relevant code

**Tab 2 — "Walkthrough"**
- Numbered step-through annotations with keyboard navigation (← →)
- Each step highlights a code range and shows a prose callout explaining what the code does and why
- Step counter ("Step 3 of 12") with progress indicator
- Steps can optionally reference demo interactions ("Click the grade input to see this in action")

**Tab 3 — "Architecture"**
- SVG data flow diagrams rendered from structured data (same pattern as hex engine)
- Shows component tree, data flow, and key abstractions per case study
- Node types: component (blue), hook (green), context (purple), API (orange), data (gray)
- Edges show data flow direction with optional labels

### Content Data Model

```typescript
interface CaseStudyLearningContent {
  slug: "grading-app" | "kanban" | "learning-hub";
  codeFiles: CodeFile[];
  walkthrough: WalkthroughStep[];
  architecture: ArchitectureDiagram;
}

interface CodeFile {
  path: string;           // e.g. "components/grading-app/GradeEntry.tsx"
  label: string;          // display name
  language: "tsx" | "ts";
  highlightRanges?: Range[];
}

interface WalkthroughStep {
  id: number;
  title: string;
  description: string;
  file: string;
  lineRange: [number, number];
  demoAction?: string;
}

interface ArchitectureDiagram {
  nodes: { id: string; label: string; type: "component" | "hook" | "context" | "api" | "data" }[];
  edges: { from: string; to: string; label?: string }[];
}
```

Content lives as **static TypeScript files** in `data/learning/` (one per case study) — type-safe, colocated, no MDX overhead.

### Route Structure

```
app/
  learn/
    page.tsx              ← 3-card hub page
    [slug]/page.tsx       ← split-pane view per case study
```

- `/learn` index: 3-card grid with case study name, description, tech stack pills, "Start Learning" links
- `/learn/[slug]`: split-pane with demo + code panel
- Sidebar gains a "Learn" section with 3 sub-links in learning mode

### Mode-Aware Behavior

- `SplitPaneLayout` reads `useMode()` for accent colors
- Demo panel renders the **exact same components** from Phase 2 — no duplication
- Code panel state (active tab, walkthrough step, selected file) is local component state
- Shiki runs server-side via Next.js RSC; walkthrough highlights are client-side overlays
- Mode toggle while on `/learn/*` stays on the page; switching from `/projects/*` navigates to corresponding `/learn/*` route

## Components Summary

| Component | Purpose |
|-----------|---------|
| `SplitPaneLayout` | 60/40 draggable split-pane, mobile stacking |
| `CodePanel` | 3-tab panel (Code, Walkthrough, Architecture) |
| `ShikiCodeBlock` | Server-rendered syntax highlighting |
| `WalkthroughPlayer` | Step-through annotations with keyboard nav |
| `ArchitectureView` | SVG data flow diagrams |
| `/learn/[slug]/page.tsx` | Dynamic route per case study |
| `/learn/page.tsx` | Hub page with 3 cards |
| `data/learning/*.ts` | Content files per case study |

## Out of Scope (YAGNI)

- Blog/article pages under `/learn/articles`
- Interactive code editing (read-only for now)
- Video walkthroughs
- Search across code content
- Bookmark/save progress
