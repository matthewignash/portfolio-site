# Learning Hub Rebuild — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Completely rebuild the Learning Hub case study to faithfully represent the Unified Learning Map (ULM) — a 13-tab teacher LMS centered on a visual hex-based map builder, plus a 5-tab student view.

**Architecture:** SVG hex engine (shared between teacher and student views) + tab-based navigation rendering 18 total views within a single portfolio demo container. Mock data generated via Faker.js with deterministic seed. All state is client-side with useState/useReducer — no server components needed.

**Tech Stack:** React 19, Next.js 16, TypeScript strict, SVG (hand-rolled hex engine), Recharts, Framer Motion, Tailwind CSS v4, @faker-js/faker

**Design Doc:** `docs/plans/2026-03-05-learning-hub-rebuild-design.md`

---

## Existing Files to Replace

These files will be **deleted and rewritten** during this plan:

| File | Action |
|------|--------|
| `lib/learning-hub-types.ts` | Rewrite with expanded types |
| `scripts/generate-learning-hub-data.mjs` | Rewrite with hex maps, connections, all tabs |
| `data/mock/learning-hub.json` | Regenerate from new script |
| `components/learning-hub/LearningHubBoard.tsx` | Rewrite as tab orchestrator |
| `components/learning-hub/ViewToggle.tsx` | Replace with TabNavigation.tsx |
| `components/learning-hub/TeacherDashboard.tsx` | Delete (replaced by per-tab components) |
| `components/learning-hub/StudentDashboard.tsx` | Delete (replaced by per-tab components) |
| `app/projects/learning-hub/page.tsx` | Rewrite with updated hero, metrics, demo |

## Verification

This project has **no test framework**. Verification for every task:
1. `npm run build` passes (no TypeScript errors)
2. Preview at `http://localhost:3000/projects/learning-hub` renders correctly

Build command: `cd portfolio-site && npm run build`
Dev server: Use `preview_start` with name "dev" from `.claude/launch.json`

---

## Phase A: Types + Mock Data + Hex Engine + Map Builder

### Task 1: Rewrite TypeScript Types

**Files:**
- Rewrite: `portfolio-site/lib/learning-hub-types.ts`

**Context:** The current types define a simple teacher/student dashboard. The rebuild needs types for hex maps, connections, 13 teacher tabs, 5 student tabs, standards, UBD units, progress dashboard data, and all support tabs.

**Step 1:** Read the current file at `lib/learning-hub-types.ts` (213 lines) and the design doc at `docs/plans/2026-03-05-learning-hub-rebuild-design.md`.

**Step 2:** Rewrite `lib/learning-hub-types.ts` with these type groups:

```typescript
// === CORE ENTITIES ===

// Student — keep existing shape, add role field
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  gradeLevel: number;
  avatarColor: string;
  role: "student" | "teacher" | "admin";
  classIds: string[];
  supportProfile?: SupportProfile;
}

// SupportProfile — keep existing shape
interface SupportProfile {
  profileType: "IEP" | "504" | "WIDA" | "EAL";
  widaLevel?: number;
  accommodations: string[];
}

// Course — add grading system
interface Course {
  id: string;
  title: string;
  subject: string;
  gradeLevel: number;
  gradingSystem: "SBAR_8" | "IB_DP_7" | "Custom";
  teacherId: string;
  studentCount: number;
  unitCount: number;
  color: string;
  mapIds: string[];
}

// ClassSection — new
interface ClassSection {
  id: string;
  name: string;
  courseId: string;
  period: string;
  studentIds: string[];
  activeMapIds: string[];
}

// === HEX MAP ENTITIES ===

// HexType — the 5 hex types from the real app
type HexType = "lesson" | "activity" | "assessment" | "resource" | "checkpoint";
type HexStatus = "draft" | "published" | "archived";

// Hex — expanded from current shape
interface Hex {
  id: string;
  mapId: string;
  label: string;
  description: string;
  type: HexType;
  status: HexStatus;
  icon: string; // icon name from predefined set
  x: number; // pixel position on canvas
  y: number; // pixel position on canvas
  sbarFocus: "S" | "B" | "A" | "R";
  slidesUrl?: string;
  estimatedMinutes: number;
  maxScore: number;
  standardIds: string[];
}

// HexConnection — directional edge between hexes
interface HexConnection {
  id: string;
  mapId: string;
  fromHexId: string;
  toHexId: string;
}

// LearningMap — expanded
interface LearningMap {
  id: string;
  courseId: string;
  title: string;
  description: string;
  hexCount: number;
  connectionCount: number;
  createdAt: string;
  updatedAt: string;
}

// === PROGRESS ===

type ProgressStatus = "not_started" | "in_progress" | "completed" | "mastered";

interface ProgressRecord {
  studentId: string;
  mapId: string;
  hexId: string;
  status: ProgressStatus;
  score: number | null;
  maxScore: number;
  completedAt: string | null;
  teacherApproved: boolean;
}

// StudentMapProgress — summary per student per map
interface StudentMapProgress {
  studentId: string;
  mapId: string;
  mapTitle: string;
  courseTitle: string;
  totalHexes: number;
  completedHexes: number;
  inProgressHexes: number;
  averageScore: number;
  lastAccessedAt: string;
}

// === STANDARDS & CURRICULUM ===

interface Standard {
  id: string;
  framework: "NGSS" | "CCSS" | "IB" | "Custom";
  code: string;
  description: string;
  subject: string;
  gradeLevel: string;
  tags: string[];
}

interface UBDUnit {
  id: string;
  courseId: string;
  unitNumber: number;
  title: string;
  stage1: { understandings: string[]; essentialQuestions: string[] };
  stage2: { assessments: string[] };
  stage3: { activities: string[] };
  completionPercentage: number;
}

// === PROGRESS DASHBOARD ===

interface ProgressOverview {
  totalStudents: number;
  averageCompletion: number;
  activeMaps: number;
  totalLessonsCompleted: number;
}

interface MapProgressData {
  mapId: string;
  mapTitle: string;
  completionRate: number;
  hexBreakdown: { hexId: string; hexLabel: string; completedCount: number; totalStudents: number }[];
}

interface StudentProgressDetail {
  studentId: string;
  studentName: string;
  avatarColor: string;
  overallCompletion: number;
  averageScore: number;
  isAtRisk: boolean;
  atRiskReason?: string;
  supportProfile?: SupportProfile;
  mapProgress: { mapId: string; mapTitle: string; completion: number }[];
  weeklyActivity: { week: string; lessonsCompleted: number }[];
}

interface SBARData {
  strand: "S" | "B" | "A" | "R";
  strandName: string;
  classAverage: number;
  maxScore: number;
  studentScores: { studentId: string; studentName: string; score: number }[];
}

interface EngagementData {
  weeklyLogins: { week: string; count: number }[];
  avgTimeOnTask: number;
  lessonsPerWeek: { week: string; count: number }[];
}

interface AssessmentData {
  mapId: string;
  mapTitle: string;
  averageScore: number;
  maxScore: number;
  passRate: number;
  scores: { studentId: string; studentName: string; score: number; maxScore: number; passed: boolean }[];
}

interface GroupData {
  groupId: string;
  groupName: string;
  studentIds: string[];
  averageCompletion: number;
  averageScore: number;
}

// === SUPPORT TABS ===

interface Integration {
  id: string;
  name: string;
  icon: string;
  status: "connected" | "disconnected";
  description: string;
  lastSynced?: string;
}

interface SharedMap {
  mapId: string;
  mapTitle: string;
  sharedWith: { userId: string; name: string; permission: "view" | "edit" | "admin" }[];
  lastEditedBy: string;
  lastEditedAt: string;
}

interface ActivityFeedItem {
  id: string;
  userId: string;
  userName: string;
  action: string;
  mapTitle: string;
  timestamp: string;
}

interface TeachingMethodContent {
  id: string;
  title: string;
  category: "getting_started" | "key_concepts" | "demo" | "setup" | "templates";
  content: string;
  order: number;
}

interface EALStrategy {
  id: string;
  title: string;
  category: "vocabulary" | "scaffolding" | "visual" | "collaborative" | "assessment";
  widaLevels: number[];
  description: string;
  steps: string[];
}

// === STUDENT-SPECIFIC ===

interface PlannerTask {
  id: string;
  hexLabel: string;
  mapTitle: string;
  dueDate: string;
  urgency: "overdue" | "due_today" | "due_this_week" | "upcoming";
  estimatedMinutes: number;
  hexType: HexType;
}

interface Flashcard {
  id: string;
  hexLabel: string;
  question: string;
  answer: string;
  mastered: boolean;
}

// === TOP-LEVEL DATA SHAPES ===

interface LearningHubData {
  // Shared
  maps: LearningMap[];
  hexes: Hex[];
  connections: HexConnection[];
  students: Student[];
  courses: Course[];
  classes: ClassSection[];
  progress: ProgressRecord[];

  // Teacher tabs
  myMaps: LearningMap[];
  mapBuilder: { selectedMapId: string };
  standards: Standard[];
  ubdUnits: UBDUnit[];
  progressDashboard: {
    overview: ProgressOverview;
    mapProgress: MapProgressData[];
    studentProgress: StudentProgressDetail[];
    sbarData: SBARData[];
    engagement: EngagementData;
    assessments: AssessmentData[];
    groups: GroupData[];
  };
  integrations: Integration[];
  sharedMaps: SharedMap[];
  activityFeed: ActivityFeedItem[];
  teachingMethods: TeachingMethodContent[];
  ealStrategies: EALStrategy[];

  // Student tabs
  studentView: {
    studentId: string;
    mapProgress: StudentMapProgress[];
    plannerTasks: PlannerTask[];
    flashcards: Flashcard[];
  };
}
```

**Step 3:** Verify build passes: `npm run build`

**Step 4:** Commit: `git add lib/learning-hub-types.ts && git commit -m "feat(learning-hub): rewrite types for full ULM rebuild"`

---

### Task 2: Rewrite Mock Data Generator

**Files:**
- Rewrite: `portfolio-site/scripts/generate-learning-hub-data.mjs`
- Regenerate: `portfolio-site/data/mock/learning-hub.json`

**Context:** Reference the existing generator pattern at `scripts/generate-grading-data.mjs` (seed: 55). The new generator uses seed 77 and must produce data for all types defined in Task 1.

**Step 1:** Read the existing generator at `scripts/generate-learning-hub-data.mjs` to understand the current pattern (faker.seed, file output, helpers).

**Step 2:** Rewrite the generator to produce:

| Entity | Count | Key Details |
|--------|-------|-------------|
| Maps | 3 | "Atomic Structure" (8 hexes), "Chemical Reactions" (15 hexes), "Organic Chemistry" (22 hexes) |
| Hexes | 45 | Positioned on staggered grid, 5 types, icons, SBAR focuses |
| Connections | ~50 | Directed edges forming learning pathways |
| Courses | 3 | With SBAR_8, IB_DP_7, Custom grading systems |
| Classes | 4 | Linked to courses |
| Students | 12 | 3 with support profiles, varied ability levels |
| Standards | 20 | Mix of NGSS and CCSS |
| UBD Units | 6 | 2 per course with UBD stage content |
| Progress | ~540 | 12 students x 45 hexes with realistic completion flow |
| Integrations | 3 | Google Classroom, Slides, Canvas |
| Teaching Methods | 10 | Across 5 categories |
| EAL Strategies | 8 | Across 5 categories |
| Flashcards | 15 | From completed hexes |
| Planner Tasks | 8 | Upcoming lessons |

**Critical hex positioning logic:** Hexes must be placed on a staggered grid. For a hex with flat-top orientation:
- Hex width = 80px, height = 92px
- Column offset: every odd column shifts down by height/2
- Spacing: 100px horizontal, 100px vertical
- Positions stored as pixel `x`, `y` values

**Critical connection logic:** Connections follow learning pathways. Generate linear chains with occasional branches. Each hex (except the first) has at least one incoming connection.

**Step 3:** Run the generator:
```bash
cd portfolio-site && node scripts/generate-learning-hub-data.mjs
```
Expected: Creates `data/mock/learning-hub.json`

**Step 4:** Verify build passes: `npm run build`

**Step 5:** Commit: `git add scripts/generate-learning-hub-data.mjs data/mock/learning-hub.json && git commit -m "feat(learning-hub): rewrite mock data generator for full ULM"`

---

### Task 3: Hex Engine — HexNode Component

**Files:**
- Create: `portfolio-site/components/learning-hub/hex-engine/HexNode.tsx`

**Context:** This is the core visual primitive. A single SVG hexagon with icon, label, type coloring, status border, and selection state. Used by both Map Builder (editable) and Student Map View (progress states).

**Step 1:** Create the component:

Key requirements:
- Renders an SVG `<g>` element (group) positioned at `x, y`
- Flat-top hexagon path (~80px wide, ~92px tall) using 6 calculated points
- Fill color based on hex type: Lesson (#3b82f6), Activity (#22c55e), Assessment (#f59e0b), Resource (#8b5cf6), Checkpoint (#ef4444)
- Border stroke: solid 2px for "published", dashed for "draft", dimmed opacity for "archived"
- Icon rendered as text/emoji in center-top area
- Label text below icon, truncated to ~12 chars with ellipsis
- Selection ring: outer glow when `isSelected` prop is true
- Optional progress overlay for student view: green fill for complete, cyan pulse for active, gray + lock for locked
- `onClick` and `onMouseDown` (for drag) event handlers passed as props

Props interface:
```typescript
interface HexNodeProps {
  hex: Hex;
  isSelected: boolean;
  progressState?: "complete" | "active" | "locked" | null; // null = teacher/no progress
  onClick: (hexId: string) => void;
  onDragStart?: (hexId: string, e: React.MouseEvent) => void;
}
```

**Step 2:** Verify build passes.

**Step 3:** Commit: `git add components/learning-hub/hex-engine/HexNode.tsx && git commit -m "feat(learning-hub): add HexNode SVG component"`

---

### Task 4: Hex Engine — HexConnection Component

**Files:**
- Create: `portfolio-site/components/learning-hub/hex-engine/HexConnection.tsx`

**Context:** SVG arrow connecting two hex centers. Must render as a curved bezier path with an arrowhead marker.

**Step 1:** Create the component:

Key requirements:
- Receives `fromX, fromY, toX, toY` coordinates (hex centers)
- Renders an SVG `<path>` with a quadratic bezier curve
- The curve should offset slightly to avoid overlapping the hex shapes (start/end at hex edges, not centers)
- Arrow marker defined via SVG `<defs>` + `<marker>` for reuse
- Color: `#5a5a7a` (text-muted) with 2px stroke
- Optional `isPreview` prop for dashed style during connection drawing
- Optional `isHighlighted` prop for hover/selection emphasis (brighter color)

Props interface:
```typescript
interface HexConnectionProps {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isPreview?: boolean;
  isHighlighted?: boolean;
}
```

**Step 2:** Verify build passes.

**Step 3:** Commit.

---

### Task 5: Hex Engine — HexCanvas Component

**Files:**
- Create: `portfolio-site/components/learning-hub/hex-engine/HexCanvas.tsx`

**Context:** The main SVG container that renders all hexes and connections. Handles pan/zoom via mouse drag on empty space. This is the shared canvas used by Map Builder and Student Map View.

**Step 1:** Create the component:

Key requirements:
- SVG element with `viewBox` calculated from hex positions + padding
- Renders `<defs>` with arrow marker definition (shared by all connections)
- Maps over `connections` array → `<HexConnection>` for each
- Maps over `hexes` array → `<HexNode>` for each
- Pan: mousedown on empty SVG space + mousemove translates the viewBox offset
- Zoom: not needed for v1 (keep simple — the viewBox auto-fits content)
- Minimum dimensions: 600x400, scales with content
- Dark background fill matching `--dark-void` (#06060e)
- Optional `connectionPreview` prop for drawing new connections (dashed line from source hex to mouse position)

Props interface:
```typescript
interface HexCanvasProps {
  hexes: Hex[];
  connections: HexConnection[];
  selectedHexId: string | null;
  progressMap?: Record<string, "complete" | "active" | "locked">; // student view
  onHexClick: (hexId: string) => void;
  onHexDragStart?: (hexId: string, e: React.MouseEvent) => void;
  connectionPreview?: { fromX: number; fromY: number; toX: number; toY: number } | null;
}
```

**Step 2:** Verify build passes.

**Step 3:** Commit.

---

### Task 6: Hex Editor Sidebar

**Files:**
- Create: `portfolio-site/components/learning-hub/hex-engine/HexEditor.tsx`

**Context:** Slides in from the right when a hex is selected in Map Builder. Contains form fields that update the hex properties. Changes are reflected immediately on the canvas.

**Step 1:** Create the component:

Key requirements:
- Framer Motion `AnimatePresence` + `motion.div` for slide-in from right
- Fixed width ~320px, full height of canvas area
- Dark surface background with border-left accent
- Form fields:
  - Label: text input
  - Icon: grid of 12 icon options (emoji/text) — clickable grid
  - Type: select dropdown (Lesson/Activity/Assessment/Resource/Checkpoint)
  - Status: 3-button toggle (Draft/Published/Archived)
  - SBAR Focus: select dropdown (S/B/A/R)
  - Slides URL: text input
  - Description: textarea
- Save button (shows toast), Delete button (removes hex), Close button (deselects)
- All changes call `onUpdate(hexId, updates)` prop immediately (optimistic)

Props interface:
```typescript
interface HexEditorProps {
  hex: Hex;
  onUpdate: (hexId: string, updates: Partial<Hex>) => void;
  onDelete: (hexId: string) => void;
  onClose: () => void;
}
```

**Step 2:** Verify build passes.

**Step 3:** Commit.

---

### Task 7: Hex Toolbar

**Files:**
- Create: `portfolio-site/components/learning-hub/hex-engine/HexToolbar.tsx`

**Context:** Row of action buttons above the canvas in Map Builder mode. Some buttons toggle modes, others show modals.

**Step 1:** Create the component:

8 toolbar buttons:
1. **Add Hex** — calls `onAddHex()`, creates hex at viewport center
2. **Connect** — toggles connection-drawing mode (`isConnecting` state)
3. **Auto-Generate** — shows a modal overlay with "AI Generation" placeholder
4. **Save Map** — calls `onSave()`, shows a brief "Saved!" toast
5. **Differentiation** — toggles overlay showing differentiation paths (colored routes)
6. **Groups** — shows a panel with student group names
7. **Heatmap** — toggles heatmap coloring on hexes (by performance data)
8. **Calendar** — shows a timeline overlay

For the portfolio demo, buttons 3-8 toggle small overlay panels with mock content. Buttons 1-2 have full interactivity.

Props interface:
```typescript
interface HexToolbarProps {
  isConnecting: boolean;
  onAddHex: () => void;
  onToggleConnect: () => void;
  onSave: () => void;
  activeOverlay: string | null;
  onToggleOverlay: (overlay: string) => void;
}
```

**Step 2:** Verify build passes.

**Step 3:** Commit.

---

### Task 8: Map Builder View (Assembler)

**Files:**
- Create: `portfolio-site/components/learning-hub/map-builder/MapBuilderView.tsx`

**Context:** Combines HexCanvas + HexToolbar + HexEditor into the full Map Builder tab. Manages hex state (add, edit, delete, reposition, connect).

**Step 1:** Create the component:

Key requirements:
- `useState` for: `selectedHexId`, `isConnecting`, `connectSource`, `activeOverlay`, `hexes` (mutable copy), `connections` (mutable copy)
- Layout: Toolbar on top, Canvas in center, Editor sidebar on right (when hex selected)
- **Add Hex:** Creates new hex at center of visible area with default values, adds to state
- **Connect Mode:** First click sets source hex, second click creates connection, exits mode
- **Drag Hex:** mousedown on hex → mousemove updates hex x/y in state → mouseup stops
- **Edit Hex:** HexEditor changes update hex in state array
- **Delete Hex:** Removes hex and all its connections from state
- Flex layout: canvas takes remaining width, editor sidebar is 320px fixed

Props interface:
```typescript
interface MapBuilderViewProps {
  map: LearningMap;
  hexes: Hex[];
  connections: HexConnection[];
}
```

**Step 2:** Verify build passes.

**Step 3:** Commit: `git commit -m "feat(learning-hub): add Map Builder with full hex editing"`

---

### Task 9: Tab Navigation Component

**Files:**
- Create: `portfolio-site/components/learning-hub/TabNavigation.tsx`

**Context:** Replaces the old ViewToggle. Shows either 13 teacher tabs or 5 student tabs based on the current role. Uses horizontal scrolling on mobile.

**Step 1:** Create the component:

Teacher tabs (13):
```
My Maps | Map Builder | Courses | Classes | Users | Standards | UBD Planner | Progress | Settings | Integrations | Collab | Teaching Methods | EAL Strategies
```

Student tabs (5):
```
My Maps | Map View | Progress | My Planner | Study
```

Key requirements:
- Horizontal scrollable container (`overflow-x-auto`) with hidden scrollbar
- Each tab is a button with monospace text
- Active tab: accent color bottom border (2px), brighter text
- Framer Motion `layoutId` for animated active indicator
- Role toggle button at the end: "Switch to Student View" / "Switch to Teacher View"
- `view` and `onViewChange` props

**Step 2:** Verify build passes.

**Step 3:** Commit.

---

### Task 10: Rewrite LearningHubBoard (Orchestrator)

**Files:**
- Rewrite: `portfolio-site/components/learning-hub/LearningHubBoard.tsx`

**Context:** The main orchestrator. Manages which tab is active, whether we're in teacher or student mode, and renders the correct component. Replaces the old 2-view toggle with a multi-tab system.

**Step 1:** Rewrite the component:

Key requirements:
- `useState<"teacher" | "student">` for role
- `useState<string>` for active tab (defaults to "my-maps")
- Top: `<TabNavigation>` component
- Body: `<AnimatePresence mode="wait">` with conditional rendering for each tab
- Each tab renders its respective component (placeholder `<div>` for tabs not yet built)
- Data prop: `LearningHubData`

For Phase A, only Map Builder renders a real component. All other tabs render a placeholder card:
```tsx
<div className="rounded-xl border border-dark-border bg-dark-surface p-8 text-center">
  <div className="text-sm text-text-muted">Tab Name — Coming Soon</div>
</div>
```

**Step 2:** Verify build passes.

**Step 3:** Delete old files: `ViewToggle.tsx`, `TeacherDashboard.tsx`, `StudentDashboard.tsx`

**Step 4:** Commit: `git commit -m "feat(learning-hub): rewrite board as multi-tab orchestrator"`

---

### Task 11: Rewrite Case Study Page

**Files:**
- Rewrite: `portfolio-site/app/projects/learning-hub/page.tsx`

**Context:** Update the hero, metrics, problem/solution, and tech stack to reflect the full ULM system. Keep the same page structure pattern as the grading app page.

**Step 1:** Rewrite with:
- Updated title: "Unified Learning Map" (not "Learning Hub Dashboard")
- Updated description mentioning hex-based map builder, 13 teacher tabs, student progress tracking
- Portfolio mode metrics: "13 Teacher Tabs", "45 Hex Nodes", "5 Student Views", "~540 Progress Records"
- Portfolio mode feature lists: Map Builder features + Student features
- Learning mode: Hex engine architecture, data flow patterns
- Updated problem/solution text about visual learning pathways vs spreadsheet tracking
- Updated tech stack badges

**Step 2:** Verify build passes and page renders at `/projects/learning-hub`.

**Step 3:** Commit.

---

### Task 12: Phase A Verification

**Step 1:** Run `npm run build` — must pass with zero errors.

**Step 2:** Start dev server, navigate to `/projects/learning-hub`.

**Step 3:** Verify:
- [ ] Page loads with updated hero ("Unified Learning Map")
- [ ] Tab navigation shows 13 teacher tabs
- [ ] Map Builder tab shows hex canvas with hexes and connections
- [ ] Clicking a hex opens the editor sidebar
- [ ] Add Hex button creates a new hex on the canvas
- [ ] Connect mode allows drawing connections between hexes
- [ ] Toolbar buttons show overlay panels
- [ ] "Switch to Student View" changes to 5 student tabs
- [ ] Non-builder tabs show placeholder cards

**Step 4:** Commit any fixes.

---

## Phase B: Student Map View + My Maps

### Task 13: Student Map View

**Files:**
- Create: `portfolio-site/components/learning-hub/student-map/StudentMapView.tsx`

**Context:** Read-only hex map with progress states. Reuses HexCanvas but passes `progressMap` prop instead of edit handlers.

**Step 1:** Create the component:

Key requirements:
- Computes `progressMap` from `ProgressRecord[]`: for each hex, determine if complete/active/locked
- "Locked" = not all prerequisite hexes (via connections) are completed
- "Active" = all prerequisites complete but this hex is not
- "Complete" = status is "completed" or "mastered"
- Passes `progressMap` to `<HexCanvas>`
- No toolbar, no editor sidebar
- Click on active/complete hex opens `<LessonOverview>` sidebar

**Step 2:** Verify build passes.

**Step 3:** Commit.

---

### Task 14: Lesson Overview Sidebar

**Files:**
- Create: `portfolio-site/components/learning-hub/student-map/LessonOverview.tsx`

**Context:** When a student clicks a hex, this sidebar slides in showing lesson details.

**Step 1:** Create the component:

Fields to display:
- Lesson title (hex label)
- Description
- Type badge (colored pill)
- SBAR Focus badge
- Estimated duration
- Google Slides link (or "No slides attached")
- For active hex: "Mark Complete" button (updates local state)
- For complete hex: completion timestamp, score badge
- Progress indicator: "Hex 5 of 15"

Uses `AnimatePresence` for slide-in animation (same pattern as HexEditor).

**Step 2:** Verify build passes.

**Step 3:** Commit.

---

### Task 15: My Maps Grid

**Files:**
- Create: `portfolio-site/components/learning-hub/my-maps/MyMapsGrid.tsx`

**Context:** Grid of map cards. Used by both teacher ("My Maps" tab with edit actions) and student ("My Maps" tab with progress + continue).

**Step 1:** Create the component:

Each map card shows:
- Map title
- Course name badge
- Hex count and connection count
- For teacher: "Open in Builder" button, "Edit" button, created/updated dates
- For student: progress bar (X/Y hexes complete), "Continue" button, last accessed date
- Card hover animation (Framer Motion `whileHover` slight lift)

Props:
```typescript
interface MyMapsGridProps {
  maps: LearningMap[];
  role: "teacher" | "student";
  studentProgress?: StudentMapProgress[];
  onOpenMap: (mapId: string) => void;
}
```

**Step 2:** Verify build passes.

**Step 3:** Commit.

---

### Task 16: Wire Phase B into Board

**Files:**
- Modify: `portfolio-site/components/learning-hub/LearningHubBoard.tsx`

**Step 1:** Replace placeholder cards for:
- "My Maps" tab (teacher) → `<MyMapsGrid role="teacher">`
- "My Maps" tab (student) → `<MyMapsGrid role="student">`
- "Map View" tab (student) → `<StudentMapView>`

Wire "Open in Builder" from MyMapsGrid to switch to Map Builder tab with the selected map.
Wire "Continue" from student MyMapsGrid to switch to Map View tab with the selected map.

**Step 2:** Verify all navigation flows work.

**Step 3:** Commit: `git commit -m "feat(learning-hub): add Student Map View and My Maps grid"`

---

## Phase C: Data Management (Courses, Classes, Users)

### Task 17: Courses Tab

**Files:**
- Create: `portfolio-site/components/learning-hub/data-management/CoursesTab.tsx`

**Context:** Card grid showing courses with grading system badges, unit counts, and expandable details.

**Step 1:** Create the component:

Course card layout:
- Course title (bold)
- Subject + grade level
- Grading system badge: colored pill (SBAR_8 = blue, IB_DP_7 = purple, Custom = gray)
- Unit count and student enrollment count
- Click to expand: unit list, linked maps list, grade scale description
- "New Course" button (shows a toast "Demo mode — course creation disabled")

Grid: 3 columns on desktop, 2 on tablet, 1 on mobile.

**Step 2:** Verify build passes.

**Step 3:** Commit.

---

### Task 18: Classes Tab

**Files:**
- Create: `portfolio-site/components/learning-hub/data-management/ClassesTab.tsx`

**Context:** Table/list view of class sections with expandable student rosters.

**Step 1:** Create the component:

Table columns: Class Name, Course, Period, Students, Active Maps
- Row click expands to show student roster with name + progress summary
- "New Class" button (toast)
- Search/filter input at top

**Step 2:** Verify build passes.

**Step 3:** Commit.

---

### Task 19: Users Tab

**Files:**
- Create: `portfolio-site/components/learning-hub/data-management/UsersTab.tsx`

**Context:** Student roster with search, role badges, and class enrollment info.

**Step 1:** Create the component:

Table columns: Name, Email, Role, Classes, Maps in Progress
- Role badges: Student (cyan), Teacher (purple), Admin (orange)
- Support profile indicator icon for students with IEP/504/WIDA/EAL
- Search input filters by name/email
- Click row to see detail card with all enrollments

**Step 2:** Verify build passes.

**Step 3:** Wire all three tabs into LearningHubBoard.tsx replacing their placeholders.

**Step 4:** Commit: `git commit -m "feat(learning-hub): add Courses, Classes, Users tabs"`

---

## Phase D: Curriculum & Planning

### Task 20: Standards Library Tab

**Files:**
- Create: `portfolio-site/components/learning-hub/curriculum/StandardsLibrary.tsx`

**Context:** Searchable standards database with framework, subject, and grade filters.

**Step 1:** Create the component:

Layout:
- Filter bar: Framework dropdown (NGSS/CCSS/IB/Custom), Subject dropdown, Grade Level dropdown
- Search input for text search across code + description
- Standards list: each standard shows code (monospace), description, tags as pills
- Filtered in real-time via `useMemo` on the standards array

**Step 2:** Verify build passes.

**Step 3:** Commit.

---

### Task 21: UBD Planner Tab

**Files:**
- Create: `portfolio-site/components/learning-hub/curriculum/UBDPlanner.tsx`

**Context:** Understanding by Design unit planning cards organized by course.

**Step 1:** Create the component:

Layout:
- Course selector dropdown at top
- Unit cards for the selected course, each showing:
  - Unit number + title
  - 3 collapsible sections (Stage 1: Desired Results, Stage 2: Evidence, Stage 3: Learning Plan)
  - Each stage has bulleted lists of content
  - Completion percentage progress bar
- "New Unit" button (toast)

Use `useState` for selected course and expanded unit sections.

**Step 2:** Verify build passes.

**Step 3:** Wire both tabs into LearningHubBoard.tsx.

**Step 4:** Commit: `git commit -m "feat(learning-hub): add Standards Library and UBD Planner"`

---

## Phase E: Progress Dashboard

### Task 22: Progress Dashboard Container + Overview Tab

**Files:**
- Create: `portfolio-site/components/learning-hub/progress/ProgressDashboard.tsx`
- Create: `portfolio-site/components/learning-hub/progress/OverviewTab.tsx`

**Context:** Container with 8 sub-tabs. Overview shows KPI cards and class-level progress bars.

**Step 1:** Create `ProgressDashboard.tsx`:
- Sub-tab navigation (horizontal pills, similar to ViewToggle pattern)
- 8 tabs: Overview, Map Progress, Student Progress, SBAR Performance, Engagement, Assessments, Groups, Reports
- AnimatePresence for tab switching
- Renders the active sub-tab component

**Step 2:** Create `OverviewTab.tsx`:
- 4 KPI cards: Total Students, Avg Completion %, Active Maps, Total Lessons Completed
- Class-level progress bars per map (map title + colored bar + percentage)
- At-risk students count highlight

**Step 3:** Verify build passes.

**Step 4:** Commit.

---

### Task 23: Map Progress + Student Progress Tabs

**Files:**
- Create: `portfolio-site/components/learning-hub/progress/MapProgressTab.tsx`
- Create: `portfolio-site/components/learning-hub/progress/StudentProgressTab.tsx`

**Step 1:** Create `MapProgressTab.tsx`:
- Per-map cards showing completion rate as a large percentage
- Hex-by-hex heatmap: grid of colored cells (green/amber/red) per hex showing how many students completed it

**Step 2:** Create `StudentProgressTab.tsx`:
- Student selector dropdown
- For selected student: completion timeline (Recharts line chart of weekly progress), map-by-map progress bars, at-risk indicators
- Support profile badge if applicable

**Step 3:** Verify build passes.

**Step 4:** Commit.

---

### Task 24: SBAR Performance + Engagement Tabs

**Files:**
- Create: `portfolio-site/components/learning-hub/progress/SBARPerformanceTab.tsx`
- Create: `portfolio-site/components/learning-hub/progress/EngagementTab.tsx`

**Step 1:** Create `SBARPerformanceTab.tsx`:
- Recharts `RadarChart` showing class average across S/B/A/R strands
- Recharts `BarChart` showing per-student scores per strand
- Summary cards per strand with class average and top/bottom performers

**Step 2:** Create `EngagementTab.tsx`:
- Recharts `BarChart` for weekly logins
- Recharts `LineChart` for lessons completed per week
- Average time on task metric card
- "Most active" and "least active" student highlights

**Step 3:** Verify build passes.

**Step 4:** Commit.

---

### Task 25: Assessments + Groups + Reports Tabs

**Files:**
- Create: `portfolio-site/components/learning-hub/progress/AssessmentsTab.tsx`
- Create: `portfolio-site/components/learning-hub/progress/GroupsTab.tsx`
- Create: `portfolio-site/components/learning-hub/progress/ReportsTab.tsx`

**Step 1:** Create `AssessmentsTab.tsx`:
- Per-map assessment summaries: average score, pass rate, score distribution
- Student score table with pass/fail badges

**Step 2:** Create `GroupsTab.tsx`:
- Group cards showing group name, member count, avg completion, avg score
- Recharts `BarChart` comparing group performance side by side

**Step 3:** Create `ReportsTab.tsx`:
- Summary report cards: "Class Progress Report", "Individual Student Reports", "Assessment Analysis"
- Each card shows description + "Export PDF" and "Export CSV" buttons (both show toast: "Demo mode — export disabled")

**Step 4:** Wire all 8 sub-tabs into ProgressDashboard.tsx, then wire ProgressDashboard into LearningHubBoard.

**Step 5:** Verify build passes.

**Step 6:** Commit: `git commit -m "feat(learning-hub): add Progress Dashboard with 8 sub-tabs"`

---

## Phase F: Support & Strategy Tabs

### Task 26: Settings + Integrations Tabs

**Files:**
- Create: `portfolio-site/components/learning-hub/support/SettingsTab.tsx`
- Create: `portfolio-site/components/learning-hub/support/IntegrationsTab.tsx`

**Step 1:** Create `SettingsTab.tsx`:
- Profile section: name, email, school (read-only display)
- Preferences: default view dropdown, theme toggle, notification checkboxes
- All static — changes show brief "Saved" toast

**Step 2:** Create `IntegrationsTab.tsx`:
- 3 integration cards (Google Classroom, Google Slides, Canvas LMS)
- Each card: icon, name, description, status badge (Connected/Disconnected), "Configure" button
- Configure button shows toast: "Demo mode"
- Last synced timestamp for connected integrations

**Step 3:** Verify build passes.

**Step 4:** Commit.

---

### Task 27: Collab + Teaching Methods + EAL Tabs

**Files:**
- Create: `portfolio-site/components/learning-hub/support/CollabTab.tsx`
- Create: `portfolio-site/components/learning-hub/support/TeachingMethodsTab.tsx`
- Create: `portfolio-site/components/learning-hub/support/EALStrategiesTab.tsx`

**Step 1:** Create `CollabTab.tsx`:
- Shared maps list: map title, shared-with avatars, permission badges (View/Edit/Admin)
- Activity feed: timestamped list of recent edits ("Alice edited Atomic Structure map, 2 hours ago")

**Step 2:** Create `TeachingMethodsTab.tsx`:
- 5 sub-tabs: Getting Started, Key Concepts, Interactive Demo, Setup Guide, Templates
- Each sub-tab renders content cards from `teachingMethods` data
- Content is descriptive text about hex-based learning methodology

**Step 3:** Create `EALStrategiesTab.tsx`:
- Sub-tabs: Getting Started, Key Concepts, How It Works, Setup Guide, Strategy Gallery
- Strategy Gallery: card grid with category filter dropdown
- Each strategy card: title, WIDA levels badge, description, steps list
- AI Prompt Builder: form with WIDA level selector + skill focus dropdown + "Generate Prompt" button (shows sample prompt in output area)

**Step 4:** Wire all 5 tabs into LearningHubBoard.tsx.

**Step 5:** Verify build passes.

**Step 6:** Commit: `git commit -m "feat(learning-hub): add Settings, Integrations, Collab, Teaching Methods, EAL tabs"`

---

### Task 28: Student-Specific Tabs

**Files:**
- Create: `portfolio-site/components/learning-hub/student/MyPlannerTab.tsx`
- Create: `portfolio-site/components/learning-hub/student/StudyTab.tsx`
- Create: `portfolio-site/components/learning-hub/student/StudentCollabTab.tsx`

**Step 1:** Create `MyPlannerTab.tsx`:
- Calendar-style weekly view showing upcoming lessons
- Task list sorted by urgency (overdue → due today → this week → upcoming)
- Each task: hex label, map title, due date, estimated time, urgency badge (red/amber/green/gray)

**Step 2:** Create `StudyTab.tsx`:
- Flashcard interface: card with question on front, answer on back
- Click to flip animation (Framer Motion rotateY)
- "Mastered" toggle button per card
- Progress: "5/15 mastered"

**Step 3:** Create `StudentCollabTab.tsx`:
- Simple placeholder with group assignment cards
- Each card: group name, members, shared map, last activity

**Step 4:** Wire all student tabs into LearningHubBoard.tsx.

**Step 5:** Verify build passes.

**Step 6:** Commit: `git commit -m "feat(learning-hub): add student Planner, Study, and Collab tabs"`

---

## Final: Polish & Documentation

### Task 29: Update Page Content

**Files:**
- Modify: `portfolio-site/app/projects/learning-hub/page.tsx`

**Step 1:** Update metric cards and feature lists to reflect the final implemented feature set. Ensure all numbers match the actual generated mock data.

**Step 2:** Update problem/solution text if needed.

**Step 3:** Verify the page renders correctly in both portfolio and learning modes.

**Step 4:** Commit.

---

### Task 30: Write Handoff Document

**Files:**
- Rewrite: `portfolio-site/docs/Learning Hub Dashboard — Portfolio Rebuild Handoff.md`

**Step 1:** Rewrite as "Unified Learning Map — Portfolio Rebuild Handoff.md" following the same format as `docs/Assessment Grading App — Portfolio Rebuild Handoff.md`:
- What Was Built (full tab inventory)
- ULM Reference Files Consulted
- Entity Mapping (ULM → Portfolio Rebuild)
- Component Architecture
- Mock Data Summary
- Integration Notes for ULM (what could be brought back, what ULM has that portfolio doesn't)
- Tech Stack
- File Locations

**Step 2:** Commit.

---

### Task 31: Update PROGRESS.md

**Files:**
- Modify: `portfolio-site/PROGRESS.md`

**Step 1:** Mark the Learning Hub rebuild as complete. Update hex counts, tab counts, component counts.

**Step 2:** Commit.

---

### Task 32: Final Verification

**Step 1:** Run `npm run build` — zero errors.

**Step 2:** Start dev server, navigate to `/projects/learning-hub`.

**Step 3:** Full verification checklist:
- [ ] Page hero shows "Unified Learning Map" with correct description
- [ ] Portfolio mode shows updated metrics and feature lists
- [ ] Learning mode shows hex engine architecture details
- [ ] **Teacher View:**
  - [ ] My Maps tab shows 3 map cards with "Open in Builder"
  - [ ] Map Builder tab shows hex canvas with nodes and connections
  - [ ] Clicking hex opens editor sidebar
  - [ ] Add Hex and Connect mode work
  - [ ] Toolbar buttons show overlay panels
  - [ ] Courses tab shows 3 course cards with grading system badges
  - [ ] Classes tab shows class table with expandable rosters
  - [ ] Users tab shows searchable student roster
  - [ ] Standards tab shows filterable standards library
  - [ ] UBD Planner tab shows unit cards with expandable stages
  - [ ] Progress tab shows 8 working sub-tabs with charts
  - [ ] Settings tab shows form layout
  - [ ] Integrations tab shows 3 integration cards
  - [ ] Collab tab shows shared maps and activity feed
  - [ ] Teaching Methods tab shows 5 content sub-tabs
  - [ ] EAL Strategies tab shows strategy gallery and AI prompt builder
- [ ] **Student View:**
  - [ ] My Maps tab shows progress bars and "Continue" button
  - [ ] Map View shows hex map with complete/active/locked states
  - [ ] Clicking active hex shows lesson overview sidebar
  - [ ] Progress tab shows student-specific progress data
  - [ ] My Planner shows upcoming tasks sorted by urgency
  - [ ] Study tab shows flashcard flip interface
- [ ] Zero console errors
- [ ] Responsive at mobile (375px), tablet (768px), desktop (1280px)

**Step 4:** Commit any final fixes.

---

## Summary

| Phase | Tasks | Components Created | Est. Files |
|-------|-------|--------------------|------------|
| A | 1-12 | Types, Generator, HexNode, HexConnection, HexCanvas, HexEditor, HexToolbar, MapBuilderView, TabNavigation, Board, Page | 11 |
| B | 13-16 | StudentMapView, LessonOverview, MyMapsGrid | 3 |
| C | 17-19 | CoursesTab, ClassesTab, UsersTab | 3 |
| D | 20-21 | StandardsLibrary, UBDPlanner | 2 |
| E | 22-25 | ProgressDashboard + 8 sub-tabs | 9 |
| F | 26-28 | Settings, Integrations, Collab, TeachingMethods, EAL, Planner, Study, StudentCollab | 8 |
| Final | 29-32 | Page update, Handoff doc, PROGRESS.md | 3 |
| **Total** | **32** | | **~39 files** |
