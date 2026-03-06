"use client";

import dynamic from "next/dynamic";
import SplitPaneLayout from "@/components/learning-mode/SplitPaneLayout";
import CodePanel from "@/components/learning-mode/CodePanel";
import type { CaseStudyLearningContent } from "@/lib/learning-mode-types";

// Dynamic imports for case study demos (same pattern as /projects/* pages)
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
  // Select the right demo component based on case study slug
  const demoComponent = (() => {
    switch (content.slug) {
      case "grading-app":
        return <GradingAppBoard data={gradingData} />;
      case "kanban":
        return <KanbanBoard teamData={kanbanTeam} adminData={kanbanAdmin} />;
      case "learning-hub":
        return <LearningHubBoard data={learningHubData} />;
      default:
        return <div className="p-4 text-text-muted">Unknown case study</div>;
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
