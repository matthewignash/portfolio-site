# Learning Hub Rebuild — Full System Design

**Created:** 2026-03-05
**Status:** Approved
**Scope:** Complete rebuild of the Learning Hub case study to faithfully represent the Unified Learning Map (ULM) application

---

## Background

The initial Learning Hub portfolio demo was a generic teacher/student dashboard that did not represent the actual ULM application. After navigating the live ULM at its deployed URL and reviewing all 179 source files, this design captures the real system: a 13-tab teacher LMS centered on a visual hex-based map builder, plus a 5-tab student view.

## Build Approach: Foundation-Up (Phased)

Build the hex map engine first (the core differentiator), then layer tabs on top.

| Phase | Scope | Why |
|-------|-------|-----|
| A | Hex Map Engine + Map Builder tab | Core visual — everything depends on it |
| B | Student Map View + My Maps tab | Completes the map story (create → navigate) |
| C | Data Management (Courses, Classes, Users) | Supports map context |
| D | Standards + UBD Planner | Curriculum integration |
| E | Progress Dashboard (8 sub-tabs) | Analytics layer |
| F | Support tabs (Settings, Integrations, Collab, Teaching Methods, EAL) | Breadth completion |

---

## Section 1: Map Builder (Phase A)

The centerpiece of the entire application. A visual canvas where teachers build learning pathways using hexagonal nodes connected by directional arrows.

### Hex Canvas

- **SVG-based hex grid** rendered in a scrollable/pannable container
- Each hex is a regular hexagon (~80px wide) with:
  - Icon (from a predefined set: beaker, book, microscope, pencil, etc.)
  - Label text (lesson/activity name)
  - Type indicator via color coding:
    - Lesson (blue)
    - Activity (green)
    - Assessment (orange)
    - Resource (purple)
    - Checkpoint (red)
  - Status ring: Draft (dashed border), Published (solid), Archived (dimmed)
- Hexes are positioned on a staggered grid layout (offset columns)
- Click a hex to select it (highlight ring appears)
- Drag hexes to reposition them on the canvas

### Connection Arrows

- SVG path arrows connecting hex centers
- Directional (one-way flow showing learning progression)
- Curved bezier paths that route around other hexes
- Arrow heads at the destination hex
- "Connect" mode: click source hex, then destination hex to create a connection
- Visual feedback during connection drawing (dashed preview line following cursor)

### Hex Editor Sidebar

- Slides in from the right when a hex is selected
- Fields:
  - **Label** (text input)
  - **Icon** (icon picker grid)
  - **Type** (dropdown: Lesson/Activity/Assessment/Resource/Checkpoint)
  - **Status** (toggle: Draft/Published/Archived)
  - **SBAR Focus** (dropdown: S/B/A/R strands)
  - **Google Slides URL** (text input with link preview)
  - **Description** (textarea)
- Save/Delete/Close buttons
- Changes reflect immediately on the canvas hex

### Toolbar

Row of action buttons above the canvas:

| Button | Behavior |
|--------|----------|
| Add Hex | Creates new hex at center of viewport |
| Connect | Enters connection-drawing mode |
| Auto-Generate Lessons | Shows modal with AI generation options (demo only) |
| Save Map | Toast notification confirming save |
| Differentiation | Overlay showing differentiation paths on the map |
| Groups | Student group assignment panel |
| Heatmap | Color hexes by class performance data |
| Calendar | Timeline view of lessons by scheduled date |

For the portfolio demo, toolbar buttons show their respective panels/modals with mock content. Full interactivity on Add Hex, Connect, and hex editing.

---

## Section 2: Student Map View (Phase B)

The same hex map rendered in a read-only student perspective with progress tracking.

### Progress States

Each hex shows one of three states:
- **Complete** (green fill + checkmark overlay) — student has finished this lesson
- **Active** (cyan glow + pulse animation) — currently available to work on
- **Locked** (gray/dimmed + lock icon) — prerequisites not met

Progress flows along connection arrows — completing a hex unlocks connected downstream hexes.

### Lesson Overview Sidebar

When a student clicks an active or completed hex:
- Lesson title and description
- Type badge and SBAR focus
- Estimated duration
- Google Slides embed link (or placeholder)
- "Mark Complete" button (for active hexes)
- Completion timestamp (for completed hexes)
- Progress bar showing position in the overall map

### My Maps Tab

Grid of map cards the student is enrolled in:
- Map name, course, teacher name
- Progress bar (X/Y hexes complete)
- Last accessed timestamp
- "Continue" button that opens the Student Map View

---

## Section 3: Data Management (Phase C)

Three tabs for managing the organizational structure behind maps.

### Courses Tab

- **Card grid** of courses with:
  - Course name, subject, level
  - Grading system badge (8-Point SBAR, IB DP 7-Point, Custom)
  - Unit count
  - Student enrollment count
- Click card to expand: unit list, linked maps, grade scale configuration
- "New Course" button with creation form

### Classes Tab

- **Table/list view** of class sections
- Columns: class name, course, period, student count, active maps
- Row expansion: student roster with names and progress summaries
- "New Class" button

### Users Tab

- **Student roster** with search/filter
- Columns: name, email, classes enrolled, maps in progress
- Role badges (Student / Teacher / Admin)
- Bulk actions: assign to class, reset progress

---

## Section 4: Curriculum & Planning (Phase D)

### Standards Tab (Standards Library)

- **Framework selector**: NGSS, CCSS, IB, Custom
- **Subject filter** dropdown
- **Grade level** filter
- **Searchable list** of standards with:
  - Standard code (e.g., NGSS MS-PS1-1)
  - Description text
  - Linked topic tags
- Standards can be tagged to hexes in the Map Builder (shown in hex editor)

### UBD Planner Tab

- **Course selector** dropdown at top
- **Unit cards** for the selected course:
  - Unit name and number
  - Stage 1: Desired Results (enduring understandings, essential questions)
  - Stage 2: Evidence (assessment descriptions)
  - Stage 3: Learning Plan (activity sequence)
  - Completion percentage with progress bar
- Expandable sections within each unit card
- "New Unit" button with UBD template form

---

## Section 5: Progress Dashboard (Phase E)

Teacher analytics view with 8 sub-tabs showing student performance data.

### Sub-tabs

| Tab | Content |
|-----|---------|
| Overview | KPI cards (total students, avg completion, active maps), class-level progress bars |
| Map Progress | Per-map completion rates, hex-by-hex heatmap |
| Student Progress | Individual student drill-down, completion timeline |
| SBAR Performance | Strand breakdown (S/B/A/R) with bar charts per student |
| Engagement | Activity metrics (logins, time on task, lessons completed per week) |
| Assessments | Assessment scores aggregated by map/unit |
| Groups | Group-level analytics comparing group performance |
| Reports | Summary cards with export buttons (PDF/CSV — demo only) |

Each sub-tab uses Recharts for visualizations (bar charts, line charts, radar charts, progress bars) consistent with the existing portfolio design system.

---

## Section 6: Support & Strategy Tabs (Phase F)

### Settings Tab

- Account settings panel with profile info
- App configuration (default views, theme preferences)
- Notification preferences
- Static form layout (no persistence for demo)

### Integrations Tab

- Integration cards for connected services:
  - Google Classroom, Google Slides, Canvas LMS
- Status badges (Connected / Disconnected)
- Configuration panels per integration
- Buttons show toast notifications instead of real auth

### Collab Tab (Teacher)

- Shared maps list with permission levels (View / Edit / Admin)
- Activity feed showing recent collaborator edits
- Comment threads on shared maps

### Teaching Methods Tab

- 5 sub-tabs: Getting Started, Key Concepts, Interactive Demo, Setup Guide, Templates
- Step-by-step onboarding content
- "5-step guide" to hex-based learning
- Template gallery for common map patterns
- Research-backed strategy descriptions

### EAL Strategies Tab

- Sub-tabs: Getting Started, Key Concepts, How It Works, Setup Guide, Strategy Gallery
- WIDA framework integration display
- AI Prompt Builder (form-based prompt generator for differentiation — demo)
- Strategy Gallery (card grid with category filters)
- Dictionary/glossary tool

### Student-Specific Tabs

- **My Planner**: Calendar/task view of upcoming lessons from active maps
- **Study**: Flashcard or review mode for completed hexes
- **Collab (Student)**: Peer collaboration on group assignments

---

## Mock Data Requirements

A new Faker.js generator (`scripts/generate-learning-hub-data.mjs`) producing:

| Entity | Count | Notes |
|--------|-------|-------|
| Maps | 3 | Varying sizes (8, 15, 22 hexes) |
| Hexes | ~45 total | With connections, types, statuses |
| Connections | ~50 | Directional links between hexes |
| Courses | 3 | With grading system badges |
| Classes | 4 | Linked to courses |
| Students | 12 | With progress on maps |
| Standards | 20 | NGSS + CCSS samples |
| UBD Units | 6 | Across courses |
| Progress records | ~540 | 12 students x ~45 hexes |

Deterministic seed for reproducible output.

---

## Component Architecture

```
components/learning-hub/
├── LearningHubBoard.tsx          <- Orchestrator: teacher/student mode, tab state
├── TabNavigation.tsx             <- Tab bar (13 teacher tabs / 5 student tabs)
├── hex-engine/
│   ├── HexCanvas.tsx             <- SVG container, pan/zoom, hex rendering
│   ├── HexNode.tsx               <- Individual hex component
│   ├── HexConnection.tsx         <- Arrow/path between hexes
│   ├── HexEditor.tsx             <- Sidebar editor for selected hex
│   └── HexToolbar.tsx            <- Action buttons above canvas
├── map-builder/
│   └── MapBuilderView.tsx        <- Combines hex engine + toolbar + editor
├── student-map/
│   ├── StudentMapView.tsx        <- Read-only hex map with progress
│   └── LessonOverview.tsx        <- Sidebar for selected lesson
├── my-maps/
│   └── MyMapsGrid.tsx            <- Map cards grid (teacher + student)
├── data-management/
│   ├── CoursesTab.tsx            <- Course cards
│   ├── ClassesTab.tsx            <- Class table
│   └── UsersTab.tsx              <- User roster
├── curriculum/
│   ├── StandardsLibrary.tsx      <- Standards search + filter
│   └── UBDPlanner.tsx            <- Unit planning cards
├── progress/
│   ├── ProgressDashboard.tsx     <- 8 sub-tab container
│   ├── OverviewTab.tsx
│   ├── MapProgressTab.tsx
│   ├── StudentProgressTab.tsx
│   ├── SBARPerformanceTab.tsx
│   ├── EngagementTab.tsx
│   ├── AssessmentsTab.tsx
│   ├── GroupsTab.tsx
│   └── ReportsTab.tsx
├── support/
│   ├── SettingsTab.tsx
│   ├── IntegrationsTab.tsx
│   ├── CollabTab.tsx
│   ├── TeachingMethodsTab.tsx
│   └── EALStrategiesTab.tsx
└── student/
    ├── MyPlannerTab.tsx
    ├── StudyTab.tsx
    └── StudentCollabTab.tsx
```

---

## Tech Stack

| Technology | Role |
|-----------|------|
| React 19 + Next.js 16 | Framework |
| TypeScript (strict) | Type safety |
| SVG (hand-rolled) | Hex canvas, nodes, connections |
| Recharts | Progress dashboard charts |
| Framer Motion | Tab transitions, hex interactions, sidebar animations |
| Tailwind CSS v4 | Styling with design tokens |
| @faker-js/faker | Deterministic mock data |

---

## Key Design Decisions

1. **SVG over Canvas** — hexes need to be individually interactive (click, drag, hover states). SVG gives us DOM elements with event handlers.
2. **Hex engine as separate module** — reused by both Map Builder (editable) and Student Map View (read-only with progress).
3. **Tab navigation, not routing** — all tabs render within the portfolio demo container, matching the existing Grading App pattern.
4. **Progress via connection flow** — student progress propagates along directed edges, creating a natural dependency graph.
5. **Phased build** — hex engine first ensures the visual centerpiece works before building supporting tabs.
