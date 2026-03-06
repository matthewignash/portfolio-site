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
        "KanbanBoard accepts both teamData and adminData props, switching between them with a ScopeToggle. Team scope shows a simple task board with single assignees. Admin scope adds multi-board management, PARA categories, checklists, comments, activity logs, and an analytics tab. One component, two experiences.",
      file: "components/kanban/KanbanBoard.tsx",
      lineRange: [33, 50],
      demoAction: "Toggle between Team and Admin scope to see the board change.",
    },
    {
      id: 2,
      title: "2. Drag-and-drop with @dnd-kit",
      description:
        "DndContext from @dnd-kit wraps the entire board. The closestCorners collision strategy handles cross-column card drops. PointerSensor provides drag detection. DragOverlay renders a floating card preview during drag, and arrayMove from @dnd-kit/sortable reorders cards within columns.",
      file: "components/kanban/KanbanBoard.tsx",
      lineRange: [1, 32],
    },
    {
      id: 3,
      title: "3. Card type polymorphism",
      description:
        "TeamCard and AdminCard both extend KanbanCardBase with different fields. TeamCard has a single assignee and simple labels. AdminCard adds PARA method categories, multiple assignees, checklists, comments, and activity logs. The rendering layer uses the scope to decide which card variant to display.",
      file: "lib/kanban-types.ts",
      lineRange: [36, 67],
    },
    {
      id: 4,
      title: "4. Droppable columns with WIP limits",
      description:
        "Each KanbanColumn uses useDroppable from @dnd-kit to accept cards. SortableContext wraps the card list for reordering. When cards exceed the column's wipLimit, a visual warning appears in the header. This enforces lean workflow principles.",
      file: "components/kanban/KanbanColumn.tsx",
      lineRange: [1, 40],
    },
    {
      id: 5,
      title: "5. Admin analytics dashboard",
      description:
        "The admin scope includes an Analytics tab with KPI cards (total cards, completed, overdue, avg cycle time), plus Chart.js visualizations: cards-by-column bar chart, cards-by-priority doughnut, cards-by-category breakdown, and an aging report. All computed client-side from card data.",
      file: "components/kanban/KanbanAnalytics.tsx",
      lineRange: [1, 40],
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
