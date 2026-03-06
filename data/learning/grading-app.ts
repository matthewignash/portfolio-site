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
        "GradingAppBoard manages which view is active (dashboard, grading, or student) using a simple useState. The GradingViewToggle component lets users switch between views. AnimatePresence wraps each view with fade+slide transitions. This pattern keeps routing logic out of the URL and inside the component tree.",
      file: "components/grading-app/GradingAppBoard.tsx",
      lineRange: [15, 48],
      demoAction: "Click the view toggle buttons above the demo to switch views.",
    },
    {
      id: 2,
      title: "2. Teacher dashboard analytics",
      description:
        "TeacherDashboard receives pre-computed analytics data and renders four chart sections: IB band distribution (bar chart), strand performance (radar chart), paper breakdown (grouped bars), and a student scores table. A level filter (ALL/SL/HL) recalculates distributions dynamically. Each section uses Recharts with custom dark-theme styling.",
      file: "components/grading-app/TeacherDashboard.tsx",
      lineRange: [1, 40],
    },
    {
      id: 3,
      title: "3. Three scoring modes in the type system",
      description:
        "Every Question has a scoringMode: 'auto' for MCQ answer matching, 'checklist' for rubric-based scoring (AND/OR modes), or 'manual' for teacher-entered points. Each question is tagged with a strand (KU/TT/C) and an IB topic code. RubricItems define individual criteria for checklist questions.",
      file: "lib/grading-types.ts",
      lineRange: [25, 41],
      demoAction: "Switch to the Grading view to see MCQ and checklist scoring in action.",
    },
    {
      id: 4,
      title: "4. Dual grading scales and strand tracking",
      description:
        "GradeBand maps point ranges to grades on two scales: IB 1-7 (overall) and AISC 1-8 (per strand). The strand field specifies OVERALL, KU, TT, or C. StudentScore computes points earned per strand (kuPoints/ttPoints/cPoints) and per paper (1A/1B/2), then derives both IB grade and per-strand AISC bands.",
      file: "lib/grading-types.ts",
      lineRange: [55, 91],
    },
    {
      id: 5,
      title: "5. Student score card with descriptors",
      description:
        "StudentResults renders a comprehensive report: avatar with level badge, overall score percentage, IB grade, and per-strand AISC band descriptors. Topic analysis breaks down performance by IB syllabus code, highlighting strengths (>70%) and growth areas (<50%). A detail toggle reveals individual MCQ answers and checklist criteria.",
      file: "components/grading-app/StudentResults.tsx",
      lineRange: [1, 40],
      demoAction: "Switch to Student view to see the score card and topic analysis.",
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
