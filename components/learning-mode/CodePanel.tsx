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
