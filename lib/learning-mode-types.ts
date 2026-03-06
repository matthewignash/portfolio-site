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
