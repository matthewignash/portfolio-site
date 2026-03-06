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
        "LearningHubBoard manages 13 teacher tabs and 5 student tabs through a role toggle and TabNavigation component. Teacher tabs span map building, data management (courses/classes/users), curriculum (standards/UBD), progress analytics (8 sub-tabs), and support (settings/integrations/collaboration/teaching methods/EAL). Student tabs show map progress, planner, and study tools.",
      file: "components/learning-hub/LearningHubBoard.tsx",
      lineRange: [1, 37],
      demoAction:
        "Toggle between Teacher and Student roles, then explore different tabs.",
    },
    {
      id: 2,
      title: "2. Hand-rolled SVG hex engine",
      description:
        "HexCanvas renders flat-top hexagons as SVG polygons with 40px radius. Each hex is positioned with x/y coordinates. HexConnection draws bezier curve arrows between hex centers. The engine supports pan (mouse drag on canvas background), click selection, and an optional drag mode for repositioning hexes. ViewBox is auto-calculated from hex positions with padding.",
      file: "components/learning-hub/hex-engine/HexCanvas.tsx",
      lineRange: [1, 50],
    },
    {
      id: 3,
      title: "3. Hex editor with curriculum metadata",
      description:
        "When a hex is selected, HexEditor shows its full properties: label, icon (emoji picker), type, status, KU/TT/C grading strands (multi-select toggles), AISC competencies (6 institutional competencies with color-coded grid), AISC values (5 institutional values), UBD stage, UDL strategies, differentiation pathway, MTSS tier, and WIDA EAL support. All aligned to the real Unified Learning Map application.",
      file: "components/learning-hub/hex-engine/HexEditor.tsx",
      lineRange: [1, 50],
      demoAction:
        "Click any hex on the map to open its editor in the right panel.",
    },
    {
      id: 4,
      title: "4. Map builder with differentiation overlay",
      description:
        "MapBuilderView manages the full map editing experience: hex creation via toolbar, drag-to-reposition, connection drawing mode, and an overlay toggle for differentiation pathways. Each hex can be scaffolded (green), standard (blue), or enrichment (purple). The overlay renders pathway-colored haloes around hexes and tints connections to match.",
      file: "components/learning-hub/map-builder/MapBuilderView.tsx",
      lineRange: [1, 50],
    },
    {
      id: 5,
      title: "5. Comprehensive type system",
      description:
        "learning-hub-types.ts defines 30+ TypeScript interfaces covering the entire data model: Hex (with sbarDomains, competencies, valuesAlignment, ubdStage, udl, wida), HexConnection, LearningMap, Student (with SupportProfile for IEP/504/WIDA/EAL), Course (with gradingSystem), ClassSection, ProgressRecord, and the full ProgressDashboard with 7 analytics sub-objects. Deterministic Faker.js seed (77) generates consistent demo data.",
      file: "lib/learning-hub-types.ts",
      lineRange: [1, 50],
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
