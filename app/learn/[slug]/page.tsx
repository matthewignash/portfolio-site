import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import { join } from "path";
import { codeToHtml } from "shiki";
import Link from "next/link";
import { allLearningContent } from "@/data/learning";
import LearnSlugClient from "./LearnSlugClient";

// Project root is exposed via next.config.ts env so it resolves correctly
// before bundling (Turbopack replaces __dirname with /ROOT at build time).
const PROJECT_ROOT = process.env.PROJECT_ROOT!;

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

  // Read and render all source files with Shiki at build time.
  // The resulting HTML strings are passed to the client CodePanel component.
  // This is safe because content comes from our own source files, not user input.
  const renderedCode: Record<string, string> = {};
  const rawCode: Record<string, string> = {};

  for (const file of content.codeFiles) {
    try {
      const filePath = join(PROJECT_ROOT, file.path);
      const source = await readFile(filePath, "utf-8");
      rawCode[file.path] = source;

      const html = await codeToHtml(source, {
        lang: file.language,
        theme: "github-dark-default",
      });
      renderedCode[file.path] = html;
    } catch {
      renderedCode[file.path] = `<pre class="p-4 text-text-muted">Source file not available: ${file.path}</pre>`;
      rawCode[file.path] = `// Source file not available: ${file.path}`;
    }
  }

  // Pre-render walkthrough step highlights.
  // Each step gets its own Shiki-rendered version with highlighted line decorations.
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
