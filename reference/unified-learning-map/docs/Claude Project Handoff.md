# Learning Map System — Claude Code Handoff

> **Date:** February 22, 2026
> **Author:** Matthew Ignash (imatthew@aischennai.org)
> **Purpose:** Complete project context for continuing development in Claude Code
> **School:** American International School Chennai
> **Version:** v8.1

---

## 1. What This Project Is

The **Learning Map System** is a Google Apps Script web application that unifies curriculum documentation, standards tracking, student progress monitoring, and administrative tasks into a single Google Workspace-based interface. Teachers create visual "learning maps" using interactive hexagonal grids where each hex represents a learning activity (lessons, labs, quizzes, discussions). Students navigate these maps, track their progress, and access linked resources.

### Core Problem Solved
Teachers experience cognitive burnout from constantly switching between apps and platforms. This system eliminates hundreds of micro-decisions per week by consolidating curriculum tools into one familiar interface. The school currently lacks systematic infrastructure for standards tracking or curriculum documentation.

### Key Design Principles
- **Teacher adoption over technical sophistication** — Google Sheets as database because teachers already know it
- **Portable deployment** — Any teacher can create their own instance (data privacy, institutional independence)
- **Friction reduction** — Eliminate cognitive load so teachers can engage with AI tools and data-driven instruction thoughtfully
- **Understanding by Design (UbD)** and **Universal Design for Learning (UDL)** frameworks are architecturally integrated

---

## 2. Architecture Overview

```
+-----------------------------------------------------------------+
|  Frontend: Modular HTML (Index.html + ~47 includes)              |
|  +-- Teacher Mode: Map builder, class management, UbD planning  |
|  +-- Student Mode: Map navigation, progress tracking, hex panel |
|  +-- Admin Mode: Setup wizard, user management, settings        |
|  Calls backend via: google.script.run.functionName()            |
|  Includes: <?!= include('Styles') ?>, <?!= include('Scripts-*')?>|
+-----------------------------------------------------------------+
                         |
+-----------------------------------------------------------------+
|  Backend: Google Apps Script (33 .gs files)                       |
|  +-- Code.gs              -> Entry point, doGet(), schema setup  |
|  +-- Config.gs            -> DB helpers, readAll_(), upsertRow_()|
|  +-- Utilities.gs         -> safeJsonParse_(), generateId_()     |
|  +-- UserService.gs       -> Auth, roles, permissions            |
|  +-- MapService.gs        -> Maps, hexes, edges CRUD             |
|  +-- CourseService.gs     -> Courses, units, grading systems     |
|  +-- ProgressService.gs   -> Student progress, approvals, assign |
|  +-- BranchService.gs     -> Adaptive pathways, conditions       |
|  +-- DashboardService.gs  -> Progress dashboard aggregation      |
|  +-- IntegrationService.gs-> External spreadsheet sync           |
|  +-- UbDService.gs        -> UbD planning templates              |
|  +-- LessonService.gs     -> Lesson planning per hex             |
|  +-- ClassRosterService.gs-> Student enrollment                  |
|  +-- StandardsService.gs  -> Standards CRUD, hex linking, bulk   |
|  +-- UnitPlannerService.gs-> Extended planning, checklists       |
|  +-- NotificationService.gs-> In-app notification system         |
|  +-- FormativeCheckService.gs-> Formative check logging          |
|  +-- AssessmentService.gs -> Embedded formative assessments      |
|  +-- PlannerService.gs    -> Student task dashboard + schedule   |
|  +-- ScheduleImportService.gs -> Waterfall schedule import       |
|  +-- SupportImportService.gs -> EAL/LS support profile import    |
|  +-- StudentSupportService.gs-> Support profile CRUD + reminders |
|  +-- ATLService.gs        -> IB ATL self-rating + suggestions    |
|  +-- CelebrationService.gs-> Milestones, streaks, badges         |
|  +-- TestHelpers.gs       -> Development test utilities          |
+-----------------------------------------------------------------+
                         |
+-----------------------------------------------------------------+
|  Database: Google Sheets (25+ tabs)                              |
|  Config, Maps, Courses, Units, Users, Progress, Edges,          |
|  Classes, ClassRoster, Standards, HexStandards, Lessons,         |
|  Notifications, FormativeChecks, AssessmentResponses,            |
|  MapAssignments, StudentTaskOrder, StudentSupportProfiles,       |
|  StudentATLProgress, StudentAchievements, StudentNotes,          |
|  StudentTasks, TeacherReminders, DifferentiationGroups,          |
|  GroupMemberships, HexAssignments                                |
+-----------------------------------------------------------------+
```

### Frontend File Structure (Modular)
| File | Lines | Purpose |
|------|-------|---------|
| `Index.html` | ~1940 | Main app shell: 11 tabs, all views, modals, style/script includes |
| `Styles.html` | ~505 | Core CSS: layout, cards, modals, hex grid, student states, grading, branches, UX overhaul collapsible sections (uxo-) |
| `Styles-UbdPlanner.html` | ~142 | UBD Planner CSS |
| `Styles-Progress.html` | ~157 | Progress Dashboard CSS (pgd- prefix) |
| `Styles-Settings.html` | ~146 | Admin Settings CSS (set- prefix) |
| `Styles-Lessons.html` | ~69 | Lesson Plan Editor CSS (lsn- prefix) |
| `Styles-Integrations.html` | ~274 | Integration Panel CSS (int- prefix) |
| `Styles-Standards.html` | ~384 | Standards Alignment CSS (sal- prefix) |
| `Styles-Analytics.html` | ~382 | Course Analytics CSS (cad- prefix) |
| `Styles-Notifications.html` | ~225 | Student Notifications & Guidance CSS (sng- prefix) + prereq dismiss button |
| `Styles-NotifCenter.html` | ~193 | Notification Bell/Dropdown CSS (ntf- prefix) |
| `Styles-SelfAssess.html` | ~505 | Self-Assessment CSS (sa- prefix) |
| `Styles-StudentAnalytics.html` | ~277 | Student Analytics + Preview CSS (spa-, tpv- prefix) |
| `Styles-Planner.html` | ~442 | Student planner styles (pln-) — task cards, urgency colors, schedule blocks, weekly grid |
| `Styles-PromptBuilder.html` | ~410 | Prompt Builder + Enhanced Support CSS (pb- prefix) — info bar chips, detail panel, UDL selector, prompt builder modal, hex badge |
| `Styles-StudentSupport.html` | ~700 | Student support profiles CSS (ssp-) — profile cards, editor, accommodation chips, WIDA badges, reminder panel, hex info bar + student support tab (sst-) — domain cards, strategy checkboxes, accommodations, translanguaging tip |
| `Styles-ATLToolkit.html` | ~300 | ATL Toolkit CSS (atl-) — timeline, tips, category cards, rating buttons, check-in |
| `Styles-Celebrations.html` | ~220 | Celebrations CSS (cel-) — overlay, confetti particles, card, streak card, badge gallery, growth banner, 6 keyframes |
| `Styles-StudentTasks.html` | ~150 | Student custom task list CSS (stl-) — collapsible section, add bar, task items, green checkbox, due date badges |
| `Styles-TeacherReminders.html` | ~170 | Teacher reminders CSS (trm-) — stats badges, filter chips, add bar, reminder items, meta badges |
| `Styles-AiscCore.html` | ~280 | AISC Core CSS (asc-) — competency/value toggle chips, hex context badges, planner panel, analytics coverage bars, hex badge |
| `Styles-Responsive.html` | ~283 | Responsive media queries for tablet (1024px) and phone (640px), planner + ATL + celebrations + student tasks + teacher reminders + AISC Core + lab renderers + rich editor + version history responsive, hex tap target fix (0.8 scale + 44px min) |
| `Styles-Search.html` | ~170 | Command Palette CSS (cmd- prefix) |
| `Styles-KnowledgeGaps.html` | ~280 | Knowledge Gap Analysis CSS (kga- prefix) |
| `Styles-FormativeChecks.html` | ~280 | Formative Check Logging CSS (fcl- prefix) |
| `Styles-LabReport.html` | ~1892 | Lab Report CSS (lab-) — hex badge, placeholder, builder overlay, editor sections, scaffold, word count, structured input renderers, status banners, teacher submission list, rich text editor toolbar/contenteditable, version history panels, scoring overlay + criterion cards + level buttons + summary bar, student results card + dimension bars, multi-scorer comparison |
| `Styles-Collab.html` | ~300 | Collaboration Board CSS |
| `Styles-CornellNotes.html` | ~590 | Cornell Notes CSS (cn-) — cornell grid, cue management, distillation, notebook browser, PARA nav |
| `Styles-NoteCoaching.html` | ~200 | Note Coaching Dashboard CSS (cnc-) — summary cards, student list, heatmap, cue cloud |
| `Styles-LessonMap.html` | ~353 | Lesson Map Drill-Down CSS (lsm-) — hex badge, editor section/card, back/autogen buttons, child map indent, filter toggle, student overview progress ring/sections/vocab chips, activity list items with status dots, hex progress fraction, analytics lesson bars, planner group headers/toggles/badges |
| `Styles-Differentiation.html` | ~500 | Differentiation CSS (dif-) — group overlay, hex assignment chips, override rows, dimmed/required states, hex dots, WIDA badges, suggestion preview |
| `Styles-DifAnalytics.html` | ~200 | Differentiation Analytics CSS (dfa-) — group cards, comparison bars, student list, hex coverage, WIDA mini-bar |
| `Scripts-Core.html` | ~760 | Globals (appConfig, plannerDataLoaded, saSelectedRating, stl*/trm* state vars, labEditorReadOnly, labEditorSubmitting, labVersionCache, uxoCollapsedSections, lessonMapCache/parentMapStack/lessonProgressSummary, etc.), init, tab switching, view mode, toast, escape, config loading, Ctrl/Cmd+K, fcl* state, planner tab visibility |
| `Scripts-MapBuilder.html` | ~3680 | Hex grid, drag-drop, connections, student interaction, self-assessment, UX overhaul collapsible sections, lesson map drill-down (lsm* functions: create/link/unlink/navigate/overview/auto-generate/progress-summaries/activity-list/auto-progress) |
| `Scripts-Courses.html` | ~2100 | Courses tab CRUD, units, lessons editor |
| `Scripts-Modals.html` | ~1005 | Maps list (with lesson map grouping + Create Map dialog), classes (with map assignment), roster, users |
| `Scripts-Standards.html` | ~1150 | Standards library, coverage report, bulk ops, hex picker |
| `Scripts-UbdPlanner.html` | ~1114 | UBD planner browser + editor + all 3 stages |
| `Scripts-Progress.html` | ~1151 | Progress dashboard teacher + student views, self-assessment summary |
| `Scripts-Settings.html` | ~216 | Admin Settings panel |
| `Scripts-Integrations.html` | ~662 | Integration Settings panel |
| `Scripts-Analytics.html` | ~490 | Course Analytics dashboard + Knowledge Gap + Formative Checks sub-nav toggle |
| `Scripts-NotifCenter.html` | ~240 | Notification bell + dropdown + fast polling first 10 min |
| `Scripts-Search.html` | ~230 | Command Palette search engine + navigation dispatch |
| `Scripts-KnowledgeGaps.html` | ~420 | Knowledge Gap Analysis — 5 compute + 6 render + 2 interaction functions |
| `Scripts-FormativeChecks.html` | ~380 | Formative Check Logging — modal lifecycle, log/history modes, student tagging, Progress tab view |
| `Scripts-StudentAnalytics.html` | ~410 | Student progress analytics + confidence distribution + lesson progress breakdown |
| `Scripts-PromptBuilder.html` | ~750 | Prompt Builder JS (ES5) — WIDA-UDL mapping, detail panel, UDL selector, prompt builder lifecycle, template merge, Strategic Teacher strategy recommendations (PB_STYLE_STRATEGY_MAP, PB_STRAT_RECOMMENDATIONS, pbBuildStrategyBlock), 22 functions |
| `Scripts-StudentSupport.html` | ~500 | Student support profiles — profile list, editor modal, WIDA, accommodation toggles, strategy CRUD |
| `Scripts-SupportImport.html` | ~150 | Support data import config card for Integrations tab |
| `Scripts-ATLToolkit.html` | ~550 | ATL Toolkit — deadline timeline, contextual tips, self-tracker (5 categories), weekly check-in |
| `Scripts-Celebrations.html` | ~320 | Celebrations — milestone overlay with confetti, streak counter, badge gallery (earned/unearned), growth banner, achievement acknowledgement |
| `Scripts-CornellNotes.html` | ~750 | Cornell Notes (ES5) — per-hex notes, PARA notebook browser, progressive summarization (4 layers), NotebookLM export, ~40 functions |
| `Scripts-NoteCoaching.html` | ~280 | Note Coaching Dashboard (ES5) — 8 functions: cncLoadDashboard, cncRenderDashboard/SummaryCards/CueCloud/HexHeatmap/StudentList, cncToggleStudentDetail, cncRenderNotePreview |
| `Scripts-StudentTasks.html` | ~280 | Student custom task list (ES5) — stlLoadTasks, stlRenderSection, stlRenderTaskList, stlAddTask, stlToggleComplete, stlDeleteTask, stlMoveUp/Down, stlDebounceSaveOrder, stlToggleSection, stlHandleKeydown |
| `Scripts-TeacherReminders.html` | ~350 | Teacher reminders (ES5) — trmLoadReminders, trmRenderContainer, trmRenderStats/FilterBar/AddBar/List, trmAddReminder, trmToggleComplete, trmDeleteReminder, trmMoveUp/Down, trmDebounceSaveOrder, trmSetFilter, trmNavigateToMap |
| `Scripts-AiscCore.html` | ~400 | AISC Core frontend (ES5) — ASC_COMPETENCIES/ASC_VALUES client fallbacks, toggle handlers (ascInitCompetencyToggles/ascInitValueToggles, toggleAscCompetency/toggleAscValue), ascRenderHexContext, ascRenderPlannerPanel/ascTogglePlannerPanel, ascComputeMapCompetencyCoverage/ascRenderCoverageSection/ascRenderStudentProfile |
| `Scripts-TeacherSupportDashboard.html` | ~500 | Teacher Support Dashboard (ES5) — tsdLoadDashboard, 5 compute functions (overview, student usage, effectiveness, heatmap, summary), 5 render functions, 2 interaction functions (expand/collapse, re-render) |
| `Scripts-LabBuilder.html` | ~947 | Lab assignment builder (ES5) — 3-step wizard (template picker, rubric picker, configure), save/delete/activate, teacher submission summary + return workflow, Score Submissions button + scored badge |
| `Scripts-LabEditor.html` | ~983 | Student lab editor (ES5) — section-by-section editing with inputType dispatch (7 structured + richtext + textarea fallback), auto-save drafts, word counts, scaffold hints, status banners, submit/read-only workflow, version history UI, scored status + student results view (score summary, criterion breakdown, dimension bars) |
| `Scripts-LabRenderers.html` | ~520 | Lab structured input renderers (ES5) — 7 type-specific renderers (title page, variables table, list, ordered list, checklist, data table, bibliography), structured input collection/extraction helpers, 14 add/remove/reorder action functions |
| `Scripts-LabRichEditor.html` | ~200 | Lab rich text editor (ES5) — contenteditable toolbar with document.execCommand, HTML sanitizer, paste handler, word count strip, toolbar button state tracking via selectionchange |
| `Scripts-LabScoring.html` | ~1014 | Lab scoring overlay (ES5) — teacher scoring UI with student list + criterion cards (level band buttons + sub-score circles or numeric input), feedback, summary bar, multi-scorer comparison, reconciliation, export. ~20 functions |
| `Scripts-CollabList.html` | ~400 | Collaboration board list and management |
| `Scripts-Differentiation.html` | ~600 | Differentiation (ES5) — group overlay CRUD, hex assignment chips, student visibility filtering, WIDA badges, auto-suggest groups, ~30 functions |
| `Scripts-DifAnalytics.html` | ~350 | Differentiation Analytics (ES5) — Group Insights sub-tab, 12 functions: dfaLoadDashboard, compute/render overview cards, comparison bars, student list, hex coverage |
| `Test.html` | ~85 | Test harness |
| `BuilderTest.html` | ~76 | Builder mode testing |
| `DataInspector.html` | ~244 | Debugging utility |
| `Diagnostic.html` | ~169 | Diagnostic tools |

### Key Technical Patterns
- **Concurrency:** All writes use `LockService.getScriptLock()`
- **Column Lookup:** Dynamic by header name, not position (handles any column order)
- **JSON Columns:** `hexesJson`, `edgesJson`, `ubdDataJson`, `metaJson`, `gradingSystemJson`, `lessonDataJson`, `selfAssessEvidenceJson`, `alignmentNotes`
- **Roles:** administrator > teacher > student
- **Auth:** `Session.getActiveUser().getEmail()` -> lookup in Users sheet
- **Frontend Calls:** `google.script.run.withSuccessHandler().functionName()`
- **Includes:** `<?!= include('Styles') ?>` server-side GAS scriptlet templating
- **Error Pattern:** `try/catch`, return `{success: false, error: message}`
- **Migration-safe writes:** All `writeAll_()` blocks include `hasOwnProperty` checks for new columns

### CRITICAL: Frontend ES5 Constraint
The GAS HTML Service frontend does NOT support ES6. All frontend code must use:
- `var` (not `const` or `let`)
- `function(){}` (not arrow functions `=>`)
- String concatenation with `+` (not template literals with backticks)
- `indexOf() !== -1` (not `Array.includes()`)

Backend `.gs` files CAN use ES6 (const, let, arrow functions, etc.)

### CRITICAL: Type Coercion Bug Pattern
`rowToObject()` returns raw spreadsheet cell values. IDs stored as numbers in the sheet will be `Number` type, but IDs from other sources will be `String`. Always use `String(id)` when comparing IDs.

### CRITICAL: CSS Specificity Rule
View switching uses `.view { display: none; }` (specificity 10) / `.view.active { display: flex; }` (specificity 20). Never use bare `#id { display: flex; }` (specificity 100) which overrides the hide rule and causes "view bleeding." Instead use:
```css
.view.active#myView { flex-direction: column; }  /* SAFE */
```

---

## 3. Story Progress — All Completed Work

### Epic 0: Initial Build & Deployment (Dec 2024 - Jan 2025)
| Story | Status | Description |
|-------|--------|-------------|
| Backend Bootstrap | Done | Apps Script with doGet/doPost, schema v1, deployment |
| Schema Setup | Done | Config, Maps, Progress, Users tabs with headers |
| User Auth | Done | `getCurrentUser()`, role-based access, `normalizeRole()` |
| Map CRUD | Done | `getMaps()`, `saveMap()`, `getMapById()` with JSON columns |
| Hex Grid Frontend | Done | Hexagonal visualization, drag-drop in builder mode |
| Connection Editor | Done | Visual arrows between hexes, 4 condition types |
| Student Messages | Done | Locked/unlocked messages on branches |
| Class Management UI | Done | Classes tab, create/edit classes, roster management |
| Add Students Modal | Done | Queue-based student addition with email lookup |
| Hex Editor Panel | Done | Full curriculum metadata editing (SBAR, standards, ATL, UbD) |
| Student View Mode | Done | Read-only view with progress tracking |
| Role Switching | Done | Teacher/student/admin mode toggle, student preview |

### Epic 1: Stabilization (Jan 2025)
| Story | Status | Description |
|-------|--------|-------------|
| 1.1 Missing Utilities | Done | Added `rowToObject()` and `objectToRow()` to Utilities.gs |
| 1.2 Duplicate Functions | Done | Consolidated duplicate `getMapById()` across 3 files |
| 1.3 Progress Schema | Done | Standardized `email` vs `studentEmail` column naming |
| 1.4 Schema Audit | Done | Audited all sheets for naming inconsistencies |
| 1.5 Setup Wizard | Done | Idempotent `setupDatabase()` with migration |

### Epic 2: UI Completion — Courses & Standards (Jan-Feb 2025)
| Story | Status | Description |
|-------|--------|-------------|
| 2.1 Courses Tab | Done | Full CRUD for courses (list, create, edit, archive, search, filter) |
| 2.1b Units Sub-View | Done | Side panel for units, CRUD, sequence ordering |
| 2.2 Lessons Tab | Done | Lessons within units, hex linking |
| 2.3 Standards Library | Done | Standards CRUD, coverage report, hex picker |

### Epic 3: Modularization (Feb 2025)
| Story | Status | Description |
|-------|--------|-------------|
| Index.html Split | Done | Split monolithic file into modular includes |

### Epic 4: UBD Planner (Feb 2025)
| Story | Status | Description |
|-------|--------|-------------|
| UBD Planner Tab | Done | Full 7th tab with browser panel + editor panel |
| UBD Planner All 6 Phases | Done | Overview, Stage 1/2/3 forms, validation, export |

### Epic 5: Progress & Student Interaction (Feb 2025)
| Story | Status | Description |
|-------|--------|-------------|
| Progress Dashboard | Done | 8th tab: teacher view (class/map selectors, overview cards, student grid, pending approvals, SBAR breakdown, score distribution, CSV export) + student view (map cards with progress bars) |
| Student Map Interaction | Done | Color-coded hex overlays, student hex panel, submission flow, lock detection |
| Map Assignment to Classes | Done | Assign Maps button, checkbox modal, diff-based save, backend wrappers |

### Epic 6: Admin & Settings (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| Admin Settings Dashboard | Done | 9th tab (admin-only), 4 section cards (System Info, App Settings, Map Config, Feature Flags). Files: Styles-Settings.html, Scripts-Settings.html, Code.gs (getAdminSettings, saveAdminSettings) |
| Grading System Selector | Done | Preset dropdown in course modal, preview, badge on cards. Superseded by Dual Grading Scales |
| Dual Grading Scales + Customization | Done | Primary + optional secondary grading scale per course with full inline editing (passing level, labels, ranges, add/remove levels). Data model: `{primary: {...}, secondary: null\|{...}}`. Translation layer in DashboardService.gs |
| Map Duplication | Done | "Duplicate" button on map cards in teacher view. Uses `prompt()` for title, calls existing backend `duplicateMap()` |

### Epic 7: Teaching Tools (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| Integration Settings Panel | Done | 10th tab (admin/teacher only), full UI for IntegrationService.gs. 3 sections: Configuration Cards, Data Browser, Bulk Import. Pure frontend |
| Lesson Plan Editor | Done | Rich 7-section accordion editor (Basic Info, Learning Objectives, Lesson Sequence, UDL Differentiation, Assessment, Materials, Teacher Notes). Content stored as JSON in `lessonDataJson` column |
| Branch Editor UI Enhancement | Done | Quick-apply presets (7 condition templates), visual labels on arrows (SVG text badges), connection summary on hex editor panel |
| Standards Alignment Interface | Done | 6 features: strength indicators, alignment notes, standard count badges, enhanced coverage report with drilldown, bulk link/unlink operations, lesson-to-standard linking |

### Epic 8: Student Experience (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| Student Notifications & Guidance | Done | 4 sub-features: prerequisite guidance on locked hex click, teacher feedback storage & display, next recommended hex indicator (pulsing glow), enhanced unlock notifications |
| Student Progress Analytics | Done | 3 overview summary cards, click-to-drill-down map detail with completion ring, class average context, SBAR strand bars, hex-by-hex score list |
| Student Preview Picker | Done | Teacher preview mode: amber-tinted Class->Student selector to view any student's exact progress |
| Real-Time Notifications System | Done | In-app notification bell + dropdown, polling-based (45s interval). 5 notification types. Backend: NotificationService.gs |

### Epic 9: Self-Assessment & Analytics (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| Student Self-Assessment v1 | Done | Students self-rate confidence (1-4 scale) and write reflection (300 char max) on each hex. Teachers see confidence badge + reflection in pending approvals and analytics |
| Self-Assessment v2: Evidence, Goals & Summary | Done | Evidence links (up to 3 URL links per hex), goal setting (150 char max), teacher summary (stat cards, confidence distribution, gap alerts), enhanced student analytics (4th overview card, per-map distribution) |
| Course Analytics Dashboard | Done | Sub-view in Progress tab (teacher/admin). Course selector, 6 overview stat cards, per-map standards coverage, student-map completion heatmap, completion distribution histogram, at-risk student list |

### Epic 10: Polish & Enforcement (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| Content Modal Fix + Config Enforcement | Done | (1) Content modal flexbox layout fix (header fixed, footer fixed, body scrolls, close x button). (2) Wired 3 config keys: `requireTeacherApproval` (auto-approve + notification fork + hide approval queue), `enableBranching` (block addEdge + hide UI), `maxHexesPerMap` (enforce in addHex + addHexToMap). New `getPublicConfig()` function exposes enforcement keys to all roles |
| Mobile Responsive | Done | Viewport meta tag, responsive breakpoints (1024px tablet, 640px phone), horizontal scrolling tabs, stacking side panels, full-screen modals on phone, hex grid CSS scale (0.65x), touch device handling (no hover, tap feedback), fluid form inputs, compact header/cards/buttons. Pure CSS — 1 new file (Styles-Responsive.html), 1 modified file (Index.html). No JS or backend changes |
| Advanced Search/Filter — Command Palette | Done | Ctrl/Cmd+K command palette for cross-entity search. Searches hexes (label/description across all maps), maps (title), courses (title/programTrack), standards (code/description/framework). Results grouped by type with color-coded icons, keyboard navigable, prefix-match scoring. Navigation dispatch: hex opens parent map + selects hex, course opens units panel, standard populates filter. Student view hides courses/standards. 2 new files (Styles-Search.html, Scripts-Search.html), 2 modified files (Index.html, Scripts-Core.html). No backend changes |
| Knowledge Gap Analysis Dashboard | Done | 3rd sub-tab in Progress tab. 5 insight sections: Gap Summary Cards (hardest hex, bottleneck, weakest strand, mismatches), sortable Per-Hex Performance Table (status distribution bars, red/amber row highlighting), SBAR Strand Breakdown (class-level avg bars, weakest highlighted), Student Struggle Patterns (top 10 by composite score, expandable detail), Confidence-Score Mismatch Alerts (over/under-confident in 2-col grid). All computed client-side from existing progressDashboardData. 2 new files (Styles-KnowledgeGaps.html, Scripts-KnowledgeGaps.html), 3 modified files (Index.html, Scripts-Analytics.html, Scripts-Core.html). No backend changes |
| Formative Check Logging | Done | Teachers log formative checks per hex with strategy type (7 presets), topic, notes, and optional student-level results (got-it/not-yet/unobserved). Two entry points: hex editor panel button opens modal, Progress tab 4th sub-tab shows map-wide view. New FormativeChecks sheet with studentResultsJson. Modal has log mode + history mode toggle. Class roster loaded for student tagging. Bug fix included: class dropdown race condition. 3 new files (FormativeCheckService.gs, Styles-FormativeChecks.html, Scripts-FormativeChecks.html), 8 modified files. 1 new backend .gs file |
| Embedded Formative Assessments | Done | Teachers build assessments (MC, short answer, matching, ordering) on hexes via builder modal. Students take assessments in content modal — auto-graded with configurable retry limits. Scores write to Progress, and new `assessment` branch condition type enables branching on total score, specific question results, or question-type performance. Assessment definitions stored as `assessmentJson` on hex (follows inlineContent pattern). New AssessmentResponses sheet (11 columns). Grading engine: MC exact match, SA case-insensitive + keyword partial credit, matching proportional, ordering adjacent-pair scoring. 3 new files (AssessmentService.gs, Styles-Assessment.html, Scripts-Assessment.html), 7 modified files (Code.gs, Config.gs, Utilities.gs, BranchService.gs, Index.html, Scripts-Core.html, Scripts-MapBuilder.html) |
| Formative Check Analytics Integration | Done | Feeds formative check data into Knowledge Gap Analysis and enhances Formative Checks sub-tab with deeper analytics. Hybrid approach: lightweight per-hex metrics (checkCount, gotItRate) in Knowledge Gaps (5th summary card, 2 sortable hex table columns, not-yet badges on struggle cards), richer student-level analytics in Formative Checks (Students Needing Support section, Strategy Effectiveness bars). All formative data optional — graceful degradation. No new files. 5 modified files (DashboardService.gs, Scripts-KnowledgeGaps.html, Scripts-FormativeChecks.html, Styles-KnowledgeGaps.html, Styles-FormativeChecks.html) |

### Epic 11: Student Planner (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| Student Planner — Task Dashboard + Schedule View | Done | New "My Planner" tab (11th tab, student-only) combining a task dashboard with waterfall schedule integration. 3 sub-stories: (1) **Task Data Model** — 2 new sheets (MapAssignments tracks map-to-class assignments with due dates, StudentTaskOrder persists student's personal task ordering), dueDate on map assignments via modified assignMapToClass(), estimatedMinutes + dueDate on hex JSON. Hex editor fields + assign modal date input. (2) **Student Task Dashboard** — PlannerService.gs aggregates tasks from Progress+Maps+MapAssignments, computes urgency flags (overdue/dueToday/dueThisWeek), applies personal sort order. Frontend: 4 stat cards, 6 filter chips, urgency-colored task cards with reorder buttons, click-to-navigate (switches to map + opens hex). (3) **Waterfall Schedule Integration** — ScheduleImportService.gs imports 7 data tables from external Waterfall Scheduler spreadsheet (RotationSchedule, BellSchedules, TeacherSchedules, Teachers, Holidays, NonRotationDays, ScheduleOverrides), stores as JSON in Config. buildStudentSchedule_() matches student classes to teacher block assignments via 8-block waterfall rotation (A1-A4, B5-B8), overlays tasks on matching class blocks. Schedule panel shows What's Next card (current/upcoming period), block cards with times/rooms/task chips, weekly overview grid. 5 new files (PlannerService.gs, ScheduleImportService.gs, Styles-Planner.html, Scripts-Planner.html, Scripts-ScheduleImport.html), 10 modified files |

### Epic 12: EAL/LS Student Support Integration (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| Student Support Profiles — Data Model + Import + In-App Editing | Done | IEP/WIDA accommodation tracking for EAL and LS students. 3 layers: (1) **Data model** — new StudentSupportProfiles sheet (14 columns: profileId, studentEmail, studentId, profileType [IEP/504/WIDA/EAL/other], widaOverallLevel 1-6, widaDomainsJson, accommodationsJson with 10 standard flags + custom array, supportStrategiesJson with source-tagged strategies, notes, isActive, audit fields). Added studentId column to ClassRoster schema. (2) **External protected spreadsheet import** — SupportImportService.gs follows ScheduleImportService.gs pattern: getSupportDataConfig/saveSupportDataConfig/testSupportDataConnection for Config-based URL storage, initializeSupportSpreadsheet auto-creates "Student Profiles" + "Import Log" tabs with proper headers, importSupportProfiles does upsert matching on studentId OR studentEmail preserving teacher-edited strategies. WIDA preset strategy mapping for levels 1-6 (e.g., Level 2: word-to-word dictionaries, sentence frames, visual supports). (3) **In-app profile editor** — StudentSupportService.gs with class-ownership access control (canAccessStudentProfile_ checks teacher's classes contain student), getClassSupportProfiles/getStudentSupportProfile/saveStudentSupportProfile/updateStudentStrategies/deactivateProfile. Frontend: profile list overlay triggered from roster modal, editor modal with profile type selector, WIDA level + domain grid (auto-loads WIDA presets on level change), 10 accommodation toggle chips, strategy CRUD (add/remove/toggle with source tags), notes. Integrations tab config card for import setup. 5 new files (SupportImportService.gs, StudentSupportService.gs, Styles-StudentSupport.html, Scripts-StudentSupport.html, Scripts-SupportImport.html), 8 modified files |
| Lesson Planning Accommodation Reminders | Done | When teacher opens lesson editor, system traces unit -> course -> map -> MapAssignments to find assigned classes, loads support profiles for those classes, groups reminders by accommodation type. New getAccommodationReminders(mapId) in StudentSupportService.gs returns {reminders grouped by type with student names/counts, widaStudents with level + strategies, totalStudentsWithProfiles, classNames}. Frontend: 8th accordion section "Student Accommodations" in lesson modal with summary bar, grouped accommodation chips (expandable student names), WIDA student cards with level badge + strategy tags. Hex editor info bar — amber bar at top of hex editor panel showing "X students with support profiles in Class 7A, Class 7B" (teacher-only, cached per map). 0 new files, 5 modified files (StudentSupportService.gs, Scripts-Courses.html, Index.html, Styles-StudentSupport.html, Scripts-MapBuilder.html) |
| Enhanced EAL/UDL Support System (E1+E2) | Done | Teacher-facing prompt builder for differentiated instruction. E1-S1: Enhanced hex editor info bar with accommodation chips, WIDA count, and View Details button. E1-S2: Support detail panel with per-student WIDA cards (domain mini-bars, strategies). E2-S1: Contextual UDL strategy selector in hex editor with WIDA-informed pre-selections (suggested amber dashed vs confirmed blue solid). Key Language Use dropdown per hex. WIDA-to-UDL mapping table (3 brackets: low 1-2, mid 3-4, high 5-6). E2-S2: AI Prompt Builder modal with 3 depth levels (quick/standard/detailed), incorporating ILC Fundamentals, Translanguaging Pedagogy, IB Language Support, and UDL frameworks. Asset-based framing. E2-S3: UDL badge on hex grid, planning notes textarea, bidirectional UDL sync between hex editor and lesson editor. 2 new files (Styles-PromptBuilder.html ~410 lines pb- CSS, Scripts-PromptBuilder.html ~630 lines ES5 with 21 functions), 7 modified files (StudentSupportService.gs, Index.html, Scripts-MapBuilder.html, Scripts-Courses.html, Scripts-Core.html, Styles-Responsive.html, Styles-StudentSupport.html) |
| IB ATL Student Tools — Planner Enhancement | Done | IB Approaches to Learning (ATL) self-rating + contextual tools integrated into student Planner. New StudentATLProgress sheet (9 columns: atlProgressId, studentEmail, atlCategory, atlSubSkill, rating 1-4, reflectionNote 300 char, goalNote 150 char, updatedAt, term). ATLService.gs with 5 ATL categories (thinking/communication/social/selfManagement/research) each with sub-skills, getATLProgress (student access control via class ownership), saveATLRating (upsert per student+category+subSkill+term), getATLSuggestions (keyword matching to contextual tips), getClassATLSummary (teacher view: category averages, students needing support), getContextualTaskTips (situational tips based on task state). Frontend ATL Toolkit panel below planner: (1) **Contextual Tips** — overdue/manyDue/ATL-tagged task tips with dismiss, (2) **Deadline Timeline** — horizontal scroll of up to 10 nearest due tasks color-coded by urgency, (3) **Weekly Check-In** — rotating ATL category prompt on Fridays or first use, (4) **ATL Self-Tracker** — 5 expandable category cards with rating dots summary, click to expand sub-skill rating buttons (1-4 Beginning/Developing/Proficient/Extending), reflection + goal textareas with char counters, per-category save with parallel RPC calls, term selector. PlannerService.gs modified to include atlSkills on task objects. 3 new files (ATLService.gs, Styles-ATLToolkit.html, Scripts-ATLToolkit.html), 8 modified files |

### Epic 13: Progress Celebrations (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| Progress Celebrations & Streaks | Done | Milestone celebrations, streak tracking, growth messaging, and badge system to motivate students. New StudentAchievements sheet (8 columns: achievementId, studentEmail, achievementType, achievementKey, earnedAt, metadata, mapId, acknowledged). **Backend:** CelebrationService.gs (NEW, ~300 lines) — `getStudentCelebrationData()` batch-reads Progress+StudentAchievements, computes streak from completedAt timestamps, returns badges/pending/growthMessage; `checkAndAwardAchievements(mapId, hexId, newStatus)` checks hex milestones (1/5/10/25/50/100), streak milestones (3/7/14/30), perfect score, map completion, inserts achievement records; `acknowledgeAchievements(achievementIds)` marks as seen. Private helpers: countCompletedHexes_, computeStreak_, computeNearMilestone_, computeGrowthMessage_, createAchievement_, checkMapCompletion_. **Frontend CSS:** Styles-Celebrations.html (NEW, ~220 lines, cel- prefix) — celebration overlay (z-index 1100, backdrop blur), card with CSS confetti (12 spans using custom properties --cel-dx/--cel-dy), bounce icon, streak card (orange gradient), badge gallery (auto-fill grid, earned/unearned), growth banner (fixed bottom, green, auto-dismiss 8s). **Frontend JS:** Scripts-Celebrations.html (NEW, ~320 lines ES5) — CEL_BADGE_DEFS client-side mirror (12 badges), loadCelebrationData/checkCelebrations (defers if unlock notification visible), buildCelebrationOverlay with confetti particles, dismissCelebration with acknowledge RPC + chain, renderStreakCounter/renderBadgeGallery/renderGrowthBanner/updateCelDisplays. **Integration:** Scripts-MapBuilder.html (checkCelebrations hook in submitHexProgress), Scripts-Core.html (3 state vars + loadCelebrationData for students), Scripts-Planner.html (streak counter in stats bar), Scripts-StudentAnalytics.html (Badges Earned 5th card), Index.html (CSS + script includes, badge gallery div), Styles-Planner.html + Styles-StudentAnalytics.html (auto-fit grid for flexible 5th card), Styles-Responsive.html (phone rules). 3 new files (CelebrationService.gs, Styles-Celebrations.html, Scripts-Celebrations.html), 8 modified files (Config.gs, Code.gs, Utilities.gs, Scripts-MapBuilder.html, Scripts-Core.html, Scripts-Planner.html, Scripts-StudentAnalytics.html, Index.html, Styles-Planner.html, Styles-StudentAnalytics.html, Styles-Responsive.html) |

### Epic 14: Student Support View (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| E3-S1: Student Support View | Done | "My Supports" section in student hex content modal. When student opens hex (any status except not_started), section appears after content, before self-assessment. If student has WIDA profile: 4 domain cards (Listening/Speaking/Reading/Writing) in 2x2 grid with WIDA level badges, strategies grouped by domain keywords with checkboxes for self-marking, accommodations card with asset-based framing, translanguaging tip. If no profile: fallback shows teacher UDL selections from hex.lessonPlan.udl. Strategy self-marking saves to new strategiesUsedJson column on Progress sheet. Backend: getMyStudentProfile() in StudentSupportService.gs (student-only, uses Session email), saveStrategiesUsed() in ProgressService.gs. 0 new files, 6 modified files (Code.gs, StudentSupportService.gs, ProgressService.gs, DashboardService.gs, Styles-StudentSupport.html, Scripts-MapBuilder.html, Scripts-Core.html, Styles-Responsive.html) |
| E3-S2: Teacher Support Dashboard | Done | 5th sub-tab "Support Insights" in Progress tab. Shows teachers strategy usage analytics computed client-side from progressDashboardData + support profiles (via getClassSupportProfiles RPC). 4 sections: (1) Summary cards — unique strategies count, profile adoption rate (green/amber/red), avg strategies per student, most popular. (2) Student usage list — all students with strategy usage + all profile students; profile students show assigned-vs-used comparison with colored stat + blue (used) / gray dashed (assigned) chips, expandable per-hex breakdown; non-profile students show "(No profile)" note. Sorted: profile students by usage rate ascending, then non-profile alphabetical. (3) Strategy effectiveness — horizontal bars per strategy showing avg score vs class average, colored green (>+5%), amber (±5%), red (<-5%). (4) Strategy-hex heatmap — table with blue intensity cells (count-based: none/low/mid/high), hidden on phone, skipped if >200 cells. Cache invalidation on class change. 3 empty states: no class selected, no profiles/usage, profiles but no usage. 2 new files (Styles-TeacherSupportDashboard.html ~280 lines tsd- CSS, Scripts-TeacherSupportDashboard.html ~500 lines ES5 13 functions), 4 modified files (Index.html, Scripts-Analytics.html, Scripts-Core.html, Scripts-Progress.html, Styles-Responsive.html) |

### Epic 15: Cornell Notes + Second Brain (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| Cornell Notes + Second Brain System | Done | 5-story feature integrating per-hex Cornell Notes, PARA-organized notebook browser, teacher note coaching dashboard, progressive summarization (4-layer Forte distillation), and NotebookLM Google Doc export. New StudentNotes sheet (16 cols). Backend: NoteService.gs (NEW, ~500 lines, 11 public functions). Frontend: Styles-CornellNotes.html (NEW, ~590 lines cn- CSS), Scripts-CornellNotes.html (NEW, ~750 lines ES5 ~40 functions), Styles-NoteCoaching.html (NEW, ~200 lines cnc- CSS), Scripts-NoteCoaching.html (NEW, ~280 lines ES5 8 functions). 4 new files, 10 modified files |

### Epic 16: Student Tasks + Teacher Reminders (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| Student Custom Task List + Teacher Reminders | Done | Two lightweight personal checklist features. (1) **Student Custom Task List** — collapsible "My To-Do List" section above hex-derived tasks in Student Planner. Students add tasks (title + optional due date), check off, reorder (↑↓), delete. Completed items pushed to bottom, strikethrough + dimmed. 50-task limit. New StudentTasks sheet (8 cols). (2) **Teacher Reminder List** — 8th sub-tab "My Reminders" in Progress tab (lazy-loaded). Teachers add reminders with optional due date + linked map. 4 filter chips (All/Active/Completed/Overdue), 3 stat badges, reorder, linked map navigation. 100-reminder limit. New TeacherReminders sheet (10 cols). Both features: optimistic UI for toggle-complete, 500ms debounced reorder saves, confirm dialogs for deletes. Backend: TaskService.gs (NEW, ~280 lines, 11 public functions + validateDueDate_ helper). Frontend: Styles-StudentTasks.html (NEW, ~150 lines stl- CSS), Scripts-StudentTasks.html (NEW, ~280 lines ES5 12 functions), Styles-TeacherReminders.html (NEW, ~170 lines trm- CSS), Scripts-TeacherReminders.html (NEW, ~350 lines ES5 17 functions). 5 new files, 8 modified files |

### Epic 17: AISC Core Integration (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| AISC Core Integration | Done | Integrates AISC institutional identity (Mission, Vision, Definition of Learning, 5 Values, 6 Competencies) across the system. **Data Layer**: AiscCore.gs (NEW, ~280 lines) — AISC_CORE constant + 4 public functions (getAiscCore, getCompetencyCoverage, getStudentCompetencyProfile, getClassCompetencyBreakdown). 6 competencies (CT/RL/SC/EC/DN/CM) with key/label/short/color/description. 5 values (Discovery/Belonging/Wellbeing/Responsibility/Purpose) with Self/Act/Connect statements. **Teacher Hex Editor**: Replaced freeform competencies with 6 toggle chips + added 5 value toggle chips. New valuesAlignment field on hex.curriculum. Competency count badge on hex cards. **Student View**: Collapsible "Our School" panel in Planner (mission/vision/definition/competency cards/value cards). Competency/value context badges in student hex modal. **Teacher Analytics**: Competency Coverage in Knowledge Gaps (6 bars + gap warnings). **Student Analytics**: Competency Profile bars in map detail (lazy-loaded). **Cornell Notes**: Competency-based cue suggestions. Frontend: Styles-AiscCore.html (NEW, ~280 lines asc- CSS), Scripts-AiscCore.html (NEW, ~400 lines ES5 ~20 functions). 3 new files, 9 modified files |

### Epic 22: Student & EAL Learner UX Overhaul (Feb 2026 — In Progress)
| Story | Status | Description |
|-------|--------|-------------|
| Session 1: Quick Wins + Safety Net | Done | 6 tasks: (1.1) `lang="en"` on HTML tag for browser auto-translate, (1.2) Student supports shown before hex started (removed `not_started` guard), (1.3) Unsaved work confirmation via `hasUnsavedModalWork()` + `confirm()` on modal close + `beforeunload` listener, (1.4) Minimum 12px font floor across 5 student-facing CSS files (~69 property changes), (1.5) Text labels alongside color indicators — word count "Under/On/Over target", hex status text labels in student mode, (1.6) `friendlyError()` wrapper mapping 6 backend error patterns to plain language, updated ~13 error handlers. 0 new files, 11 modified files |
| Session 2: Progressive Disclosure + Mobile UX | Done | 5 tasks: (2.1) Collapsible sections in content modal — uxo- CSS system with `uxoWrapCollapsible()`/`uxoToggleSection()`/`uxoUpdateSummary()` utility functions, 4 sections wrapped (Vocabulary collapsed, My Supports expanded, Cornell Notes collapsed with async cue count summary, Self-Assessment collapsed with rating label), inner section titles hidden. (2.2) Mobile hex tap targets — grid scale 0.65→0.8 at 640px breakpoint, overflow:auto, 44px min hex targets, focus-visible ring prep. (2.3) Lab editor help auto-expanded for high scaffold assignments. (2.4) Persistent prereq popup — removed 6s auto-dismiss, added "Got it" button. (2.5) Faster notification polling — 45s for first 10 minutes then normal 90s+backoff. 0 new files, 7 modified files |
| Session 3: Keyboard Navigation + ARIA | Pending | Hex grid keyboard nav (arrows/Enter/Home/End), ARIA labels for all student interactive elements, focus management for modals, skip navigation link |
| Session 4: Student Onboarding + First-Time Experience | Pending | First-login detection, 5-step onboarding checklist overlay, hex color legend panel, skeleton UI during page load |
| Session 5: i18n Foundation + Translation Readiness | Pending | String catalog system (ULM_STRINGS + str() helper), extract strings from high-traffic files (~70 replacements), language selector framework, date/number locale awareness |

### Epic 23: Unit Map → Lesson Map Drill-Down (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| Phase 1: Data Model + Teacher Linking | Done | Two-tier map architecture: unit maps (5-8 hexes) → lesson maps (3-8 activity hexes). New `lesson` hex type (purple theme fill:#faf5ff, stroke:#7c3aed) with 📖 badge. `linkedMapId` field on hex template. Lesson maps store `meta.parentMapId`/`meta.parentHexId`/`meta.isLessonMap` in metaJson. State vars: lessonMapCache, parentMapStack, lessonProgressSummary. Teacher hex editor: `lessonHexInfoSection` with lsmRenderLinkInfo showing linked map card (Open/Unlink) or create/link options. lsmCreateLinkedMap creates child map via saveMap RPC, lsmLinkExistingMap links existing map, lsmUnlinkMap clears references. Navigation: lsmOpenLinkedMap pushes parentMapStack, lsmGoBack pops and returns. "← Back to Unit" button in toolbar. Student overview: lsmRenderStudentOverview shows progress fraction ring, objectives, vocabulary preview, "Enter Lesson →" button. Lazy loading via getMapById RPC with lessonMapCache. Auto-generate: lsmAutoGenerateFromUnit reads unit lessons, creates lesson hexes + linked maps sequentially. "📖 Auto-Generate Lessons" toolbar button. Map list: showMaps separates unit/lesson maps, groups children under parents with ↳ prefix + purple indent, toggle checkbox. Cascade delete/duplicate/assign in MapService.gs + ProgressService.gs. Styles-LessonMap.html (NEW, ~170 lines lsm- CSS). 1 new file, 7 modified files (~280 lines added) |
| Phase 2+3: Progress Roll-Up + Student Experience | Done | 5-story completion of the student-facing lesson map experience. **Story 2.1 — Bug Fixes + Backend Aggregation**: Fixed 2 critical bugs in `lsmLoadAndRenderLessonMap` (passed map object instead of mapId to `openMapInBuilder`, passed mapId as callback to `loadStudentMapProgress`). Added `getLessonProgressSummaries(unitMapId, studentEmail)` to ProgressService.gs — batch-reads maps+progress once, computes per-lesson-hex {total, completed, completionPct, status}. Added `lsmLoadProgressSummaries()` frontend with stale-response guard, called from `loadStudentMapProgress` success handler. **Story 2.2 — Student Overview + Hex Grid**: Enhanced `lsmRenderStudentOverview` with conic-gradient progress ring + `lsmRenderActivityList` showing each linked hex with status dot (green/blue/gray). Hex grid shows "3/5" completion fraction on lesson hexes via `.lsm-hex-progress`. **Story 2.3 — Auto-Progress Parent Hex**: `checkAndCompleteParentLessonHex(lessonMapId)` in ProgressService.gs — when all lesson map hexes completed/mastered, auto-completes parent lesson hex (respects requireTeacherApproval). Hook in `submitHexProgress` success handler. **Story 2.4 — Dashboard + Analytics**: `getStudentDashboardData()` filters `meta.isLessonMap` maps from top-level, computes `lessonHexSummaries` reusing `allProgressByMap` batch data. `lsmRenderAnalyticsLessonBreakdown` renders per-lesson horizontal bars in student map detail. **Story 2.5 — Planner Integration**: PlannerService.gs adds lesson context fields (isLessonMapTask, parentMapId, parentHexId, parentHexLabel, lessonMapTitle) to tasks from lesson maps. Frontend groups lesson tasks under collapsible headers (📖 label + "2/5" badge) in planner. `lsmOnPlannerLessonTaskClick` navigates parent map → lesson map → hex. New state var: `lsmPlannerGroupCollapsed`. Styles-LessonMap.html expanded to ~350 lines. 0 new files, 7 modified files |
| Phase 4: Polish + Analytics + Migration | Pending | Teacher analytics, cross-level branching, differentiation cascade, flat-to-unit migration tool, celebration milestones |

### Epic 24: Bug Fixes + Create Map Button + Integration Refactor (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| Create Map Button | Done | Added "+ New Map" button to mapsView header matching card-header pattern from Courses/Classes/Users views. `openCreateMapDialog()` prompts for title, calls saveMap RPC, auto-opens in builder. Hidden in student mode. |
| UDL Cache Race Fix | Done | Fixed `ensurePbUdlStrategiesLoaded()` race condition: placeholder cache `{representation:[], ...}` was truthy, causing second calls to return empty arrays. Changed check to validate `representation.length > 0`. |
| Differentiation Error Handling | Done | Enhanced difLoadData failure handler: console.error logging, graceful toolbar hiding (mode select, manage button, divider), friendly sheet-not-found messages. |
| IntegrationService Granular Config | Done | Replaced JSON blob pattern with 9 individual Config keys (learningTrackerEnabled/Url/SpreadsheetId × 3 systems). `getIntegrationConfig()` reads granular keys with backward migration from legacy JSON blob. `saveIntegrationConfig()` writes individual keys via `setConfigValues_()`. Auto-derives spreadsheetId from URL. Fixed 6 type coercion bugs (String() wrapping on filter/find comparisons). |
| getConfigValues_ Batch Reader | Done | Added `getConfigValues_(keys)` to Config.gs — batch reads all config rows once via `getConfig_()`, returns requested key values as object. Avoids N reads for N keys. |

### Epic 18: Lab Report System (Feb 2026 — In Progress)
| Story | Status | Description |
|-------|--------|-------------|
| Phase 1 Stories 1.1+1.2: Foundation & Frameworks | Done | Data architecture foundation for the Lab Report System (~22 stories total across 4 phases). **LabFrameworks.gs** (NEW, ~480 lines): 8 scientific thinking dimensions (QD/HP/DI/CD/PA/EC/CM/RC), 4 framework constants (IB MYP Sciences 4 criteria A-D × 8-point, IB DP IA 4 criteria RD/DA/CO/EV × 6-mark, AP Science Practices SP1-SP7, NGSS SEPs 1-8), cross-framework alignment matrix (40+ mappings), 16 lab section type definitions, translateToFramework_ for dimension→criterion score conversion. **LabConfigService.gs** (NEW, ~280 lines): External LabReports spreadsheet connection following SupportImportService pattern. 7 sheet schemas (LabTemplates, LabRubrics, LabRubricCriteria, LabAssignments, LabSubmissions, LabSectionData, LabScores). Config/test/init/getLabSheet_/readLabSheet_/findLabRows_/appendLabRow_/updateLabRow_/deleteLabRow_. Key decision: LabSectionData stores one row per section per submission (avoids 50K cell limit). Scripts-Integrations.html (+170 lines: Lab Reports config card with Test/Initialize/Save). Scripts-Settings.html (+12 lines: Lab Reports info section). Utilities.gs (+7 ID generators: ltpl/lrub/lcrt/lasg/lsub/lsec/lscr). 2 new .gs files, 3 modified files |
| Phase 1 Stories 1.3+1.4: Template & Rubric Services | Done | **LabTemplateService.gs** (NEW, ~500 lines): Template CRUD (get/save/delete/duplicate) + 5 preloaded read-only templates (IB MYP Full Investigation/11 sections, IB DP IA/13 sections, AP Lab Report/10 sections, Quick Lab/4 sections, Guided Inquiry/7 sections with heavy scaffolding). Sections have sectionId/sectionType/title/sequence/required/promptText/helpText/inputType/wordGuidance/internalDimensions/linkedCriteria/scaffoldLevels. Validation: type enum, sequence uniqueness, max 20 sections, dimension codes. **LabRubricService.gs** (NEW, ~540 lines): Rubric + criteria CRUD (get/save/delete/duplicate + getRubricCriteria/saveRubricCriteria batch replace + linkCriterionToFramework auto-dimensions). 5 preloaded rubrics paired with templates (MYP B+C Y4-5, DP IA 2025 multiScorer, AP 4-point, Quick Lab 3-criteria, MYP B+C Y1-3). Criteria have 5 level descriptors, framework linking, dimension codes, weight. Cascade delete criteria on rubric delete. Max 12 criteria per rubric. 2 new .gs files, 0 modified files |
| Phase 1 Stories 1.5+1.6: Lab Hex Type & Assignment Service | Done | **Story 1.5 — Lab Hex Type**: `lab` as 6th hex type with teal/cyan theme (fill:#f0fdfa, stroke:#0d9488). HEX_THEMES updated, hexType dropdown extended, type labels extended. Student click intercept shows placeholder with 🧪 icon. Lab badge on hex cards. Lab info section in hex editor (teacher, lab type only). **Styles-LabReport.html** (NEW, ~90 lines lab- CSS). **Story 1.6**: **LabAssignmentService.gs** (NEW, ~440 lines): 9 public functions (getLabAssignments with filters, getLabAssignment, getLabAssignmentsForHex, createLabAssignment, updateLabAssignment, deleteLabAssignment, assignLabToClass, activateLabAssignment, getLabAssignmentSummaryForMap). Validates template+rubric exist, enforces one assignment per hex, blocks delete if submissions exist. 2 new files (1 .gs, 1 .html), 5 modified files |
| Phase 2 Story 2.1: Teacher Assignment Builder UI | Done | **Scripts-LabBuilder.html** (NEW, ~460 lines ES5): 3-step wizard overlay (z-index 265) — Step 1 template picker card grid, Step 2 rubric picker card grid, Step 3 configure (scaffold chips, section toggles, instructions, due date, class). Opens from hex editor panel when lab type. Loads existing assignment if present (jumps to Step 3). Save/delete/activate via LabAssignmentService RPCs. labRenderAssignmentInfo shows assignment summary card in hex editor panel. Styles-LabReport.html (+220 lines builder CSS). 1 new file, 5 modified files |
| Phase 2 Story 2.2: Student Lab Editor Core | Done | **LabSubmissionService.gs** (NEW, ~270 lines): 3 student-accessible RPCs (getStudentLabContext batch endpoint, saveLabSectionDraft with auto-create submission + upsert section data, getStudentSubmission). **Scripts-LabEditor.html** (NEW, ~350 lines ES5): Section-by-section editor in content modal with scaffold hints, 300ms per-section auto-save, word count with color coding. **Template fix**: getLabTemplates/getLabRubrics wrapped in try/catch for graceful degradation. 2 new files, 7 modified |
| Phase 2 Stories 2.3-2.4: Specialized Inputs & Submission | Done | **Story 2.3 — Specialized Input Renderers**: Scripts-LabRenderers.html (NEW, ~520 lines ES5) — 7 type-specific renderers dispatched by inputType: title_page (structured fields), variables (IV/DV/CV table), materials (bullet list), procedure (numbered steps + reorder), safety (checklist), raw_data (dynamic grid), bibliography (citation cards). Each serializes to structuredDataJson. Helpers: labStructuredInput, labCollectStructuredData, labExtractTextFromStructured, labReRenderStructured_ + 14 action functions. Scripts-LabEditor.html modified: dispatch block in labEditorRenderSection, data-inputtype attribute, try/catch fallback, labEditorUpdateWordCount handles structured types. **Story 2.4 — Submission Workflow**: LabSubmissionService.gs +3 functions (submitLabReport, returnLabReport, getLabSubmissionsForAssignment). Frontend: status banners (draft/submitted/returned), read-only mode, Submit button in footer, labEditorSubmit/labEditorCheckRequired. Teacher: labRenderSubmissionSummary/labReturnSubmission in Scripts-LabBuilder.html. 1 new file, 8 modified |
| Phase 2 Stories 2.5-2.6: Rich Formatting & Version History | Done | **Story 2.5 — Rich Formatting Toolbar**: Scripts-LabRichEditor.html (NEW, ~200 lines ES5) — custom contenteditable-based editor replacing plain textarea for all richtext/richtext_embed section types (9 types). Toolbar: Bold/Italic/Underline, H3 toggle, Bullet/Numbered lists, Indent/Outdent, Blockquote, Link (URL validated), Remove Formatting, Undo/Redo. Paste strips formatting. HTML sanitizer (labRichSanitize). Word count strips HTML tags. Button active states via queryCommandState on selectionchange. **Story 2.6 — Version History**: Snapshot-on-submit — LabSectionVersions sheet (8 cols) captures all section data per revision. 2 new backend functions (getLabRevisionHistory, getLabSectionVersion). Frontend: revision badge in status banners, "View History" per-section, revision list panel with read-only snapshot viewer. 1 new file, 9 modified |
| Phase 3: Scoring & Export (Stories 3.1-3.5) | Done | **LabScoringService.gs** (NEW, ~860 lines): 7 public functions (saveLabScores, getLabScoresForSubmission, getLabScoreSummary with weighted averages + dimension derivation + scaleLabel resolution, finalizeLabScore writes to Progress sheet, exportLabSubmissionToDoc creates Google Doc, exportLabAssignmentDocs batch export, saveReconciledScores per-criterion reconciliation) + 2 private helpers. **Scripts-LabScoring.html** (NEW, ~1014 lines ES5 ~20 functions): Teacher scoring overlay with student list + criterion scoring form (level band buttons with sub-score circles OR numeric input), feedback textareas, sticky summary bar, multi-scorer comparison view with reconciliation. New `scored` terminal status (draft→submitted→scored). Modified: Scripts-LabEditor.html (+65 lines: scored status banner + student results view with score summary/criterion breakdown/dimension bars), Scripts-LabBuilder.html (+10 lines: Score Submissions button + scored badge), LabSubmissionService.gs (+3 lines: scored guard), Styles-LabReport.html (+250 lines: scoring overlay + results + comparison CSS), Index.html (+15 lines: overlay container + include), Scripts-Core.html (+7 lines: 5 state vars + Escape handler), Scripts-MapBuilder.html (+6 lines: state reset), Styles-Responsive.html (+13 lines: phone rules). 2 new files, 8 modified files |
| Phase 4: Analytics & Alignment (5 stories) | Pending | Per-student dimension analytics, class dashboard, vertical alignment, moderation analytics, Progress integration |

### Epic 19: Integration Fix + Differentiated Learning Paths (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| Integration Bug Fix | Done | Fixed `setConfigValue_()` race condition: replaced with `setConfigValues_()` (cell-level writes) in IntegrationService.gs, LabConfigService.gs, CollabConfigService.gs, SupportImportService.gs. Hardened `setConfigValue_` to delegate internally. Changed `saveIntegrationConfig` role to admin+teacher. |
| Differentiation Phase 1: Data Model + Backend | Done | 3 new sheets (DifferentiationGroups/10 cols, GroupMemberships/5 cols, HexAssignments/8 cols). DifferentiationService.gs (NEW, ~500 lines): 15 public functions for group CRUD, membership management, hex assignment, visibility computation. Map-level `differentiationMode` in map.meta ('none'/'hidden'/'dimmed'). |
| Differentiation Phase 1: Teacher Group UI | Done | Group manager overlay (z-index 265): left panel with group list, right panel with member checkboxes + WIDA badges + color picker. Toolbar mode dropdown + Groups button. Hex editor group assignment chips with required/optional toggle. Individual student override section. |
| Differentiation Phase 1: Student Visibility | Done | `getStudentVisibleHexIds()` computes per-student hex visibility. Student hex grid: hidden hexes skipped, dimmed hexes get dif-dimmed class. Required badge on required hexes. Group dot badges on teacher hex cards. PlannerService.gs filters hidden hexes from task list. |
| Differentiation Phase 2: WIDA Badges in Groups | Done | When teacher views group member list in overlay, each student shows WIDA level badge (W1-W6), accommodation icons (max 3 emoji), strategy chips (max 3). Profile data loaded via parallel `getClassSupportProfiles` RPC, cached in `difProfilesCache`. Graceful degradation if no profiles. |
| Differentiation Phase 2: Auto-Suggest Groups | Done | "Suggest Groups" button in overlay left panel. Backend `suggestGroupsFromWida(classId)` buckets students into 4 WIDA brackets (1-2/3-4/5-6/none). Frontend shows preview cards with Create/Create All buttons. Uses existing `createGroup()` + `setGroupMembers()` RPCs. |
| Differentiation Phase 2: Group Insights Analytics | Done | 9th sub-tab "Group Insights" in Progress tab. Client-side analytics from `progressDashboardData` + `getMapDifferentiationData` RPC. 3 sections: Group Overview Cards (with WIDA mini-bar, expandable student list), Group Comparison bars (with class avg reference line), Hex Assignment Coverage (gap warnings). 2 new files (Styles-DifAnalytics.html, Scripts-DifAnalytics.html), 8 modified files. |

### Epic 20: Strategic Teacher Integration (Feb 2026)
| Story | Status | Description |
|-------|--------|-------------|
| Story 1: Backend Constants + Expanded Templates | Done | LessonService.gs: STRATEGIC_TEACHER_STRATEGIES constant (5 styles × 4 strategies = 20 strategies), getStrategicTeacherStrategies() function, +19 activity templates (5 opening, 10 main, 4 closing) strategy-informed |
| Story 2: Research Strategies Guide Sub-Tab | Done | 6th sub-tab "Research Strategies" in Teaching Methods Guide. Client-side TMG_STYLE_META + TMG_STRAT_DATA constants. 3 sections: Style Overview (5 accordion cards), Strategy Browser (20 expandable cards), Strategy Picker (4 questions → recommendations). 8 new functions in Scripts-TeachingMethods.html, ~120 lines CSS in Styles-TeachingMethods.html |
| Story 3: Prompt Builder Strategy Recommendations | Done | PB_STYLE_STRATEGY_MAP maps SBAR domains to learning styles. PB_STRAT_RECOMMENDATIONS provides 3 strategies per style with tips. pbBuildStrategyBlock(hex) inserted as section 5 in buildPromptText(). Falls back to fourStyle if no SBAR domains |
| Story 4: Formative Check Strategy Expansion | Done | Expanded strategy chips from 8 to 14 in fclRenderStrategyChips(): +6 new (Compare & Contrast Check, Reading for Meaning Check, Reciprocal Learning Check, Jigsaw Check, Graduated Difficulty Check, Teams Tournament Check) |

---

## 4. Story Backlog — What's Left

### Remaining Features
| Story | Priority | Description |
|-------|----------|-------------|
| ~~E3-S2: Teacher Support Dashboard~~ | Done | ~~Analytics showing which students are using which strategies per hex, effectiveness signals, strategy usage heatmap~~ |
| Accessibility Toolbar | Medium | Font size, line spacing, high contrast, simplified view, saved per-student preferences (EAL/LS data model now exists via Student Support Profiles) |
| Focus Mode & Cognitive Load | Medium | Full-screen focus mode, "show only unlocked" filter, reduced motion, "I'm stuck" button |
| ~~Progress Celebrations & Streaks~~ | Done | ~~Milestone celebrations, streak counter, growth messaging, badge system~~ |
| Bulk Import/Export | Medium | CSV upload for students, standards, maps |
| Print/Export Views | Medium | Printable progress reports, map exports for curriculum documentation |
| Search v2: Units/Lessons | Low | Extend command palette with backend search for units and lessons (not globally cached) |

### Config Keys Still Unenforced
| Config Key | Status | Note |
|-----------|--------|------|
| `allowSelfRegistration` | Not enforced | No registration feature exists yet |
| `debugMode` | Not enforced | Could gate logging output |

---

## 5. Files Reference — Complete

### Backend (.gs files) — 42 files
| File | Lines | Key Functions |
|------|-------|---------------|
| `Code.gs` | ~952 | `doGet()`, `include()`, `setupDatabase()`, `getConfigValue()`, `setConfigValue()`, `getAdminSettings()`, `saveAdminSettings()`, `getPublicConfig()`, `getClasses()`, `createClass()` |
| `Config.gs` | ~431 | `readAll_()`, `writeAll_()`, `upsertRow_()`, `findRow_()`, `findRows_()`, `getConfigValue_()`, `setConfigValue_()` |
| `Utilities.gs` | ~719 | `safeJsonParse_()`, `generateId_()`, `now_()`, `rowToObject()`, `objectToRow()` |
| `UserService.gs` | ~723 | `getCurrentUser()`, `requireRole()`, `canEdit()`, `isAdmin()`, `changeUserRole()` |
| `MapService.gs` | ~809 | `getMaps()`, `saveMap()`, `getMapById()`, `canViewMap()`, `duplicateMap()`, `addHex()`, `addEdge()` (with config guards) |
| `CourseService.gs` | ~866 | `getCourses()`, `createCourse()`, `saveCourse()`, `getUnits()`, `createUnit()`, `getGradingSystemPresets()`, `getLessonsForUnit()`, `saveLesson()`, `deleteLesson()` |
| `ProgressService.gs` | ~860 | `getStudentProgress()`, `updateStudentProgress()`, `assignMapToStudents()`, `assignMapToClass()` (with dueDate + MapAssignment records), `approveSubmission()`, `requestRevision()`, `getPendingApprovals()`, `saveSelfAssessment()` (with config enforcement) |
| `BranchService.gs` | ~620 | `evaluateBranches()` (with config guard), `evaluateBranchCondition_()`, `evaluateAssessmentCondition_()`, `getUnlockedHexes()`, `autoProgressStudent()` |
| `DashboardService.gs` | ~1303 | `getTeacherDashboardData()`, `getStudentDashboardData()`, `getSbarBreakdown()`, `exportProgressCsv()`, `getCourseAnalyticsDashboard()`, `getCourseStandardsDetail()` (includes selfAssessmentSummary, per-map selfAssessStats, formativeCheckSummary) |
| `ClassRosterService.gs` | ~471 | `getClassRoster()`, `getClassById()`, `addStudentToClass()`, `addStudentsToClass()`, `removeStudentFromClass()` |
| `StandardsService.gs` | ~538 | `getStandards()`, `saveStandard()`, `linkStandardToHex()`, `getStandardsCoverage()`, `updateHexStandardAlignment()`, `getHexStandardsCounts()`, `bulkLinkStandardsToHex()`, `bulkLinkStandardToHexes()`, `getUncoveredHexes()` |
| `LessonService.gs` | ~791 | Lesson CRUD per hex, lesson sequence templates, STRATEGIC_TEACHER_STRATEGIES constant (20 strategies × 5 styles), getStrategicTeacherStrategies() |
| `UbDService.gs` | ~980 | UbD planning templates, Stage 1-3 forms, validation, export |
| `UnitPlannerService.gs` | ~524 | Extended planning, student checklists |
| `IntegrationService.gs` | ~432 | Learning Tracker, Assessment Tracker, Curriculum Map sync |
| `NotificationService.gs` | ~190 | `createNotification_()`, `getNotifications()`, `markNotificationRead()`, `markAllNotificationsRead()`, `getUnreadNotificationCount()` |
| `FormativeCheckService.gs` | ~210 | `saveFormativeCheck()`, `getFormativeChecksForHex()`, `getFormativeChecksForMap()`, `deleteFormativeCheck()` |
| `AssessmentService.gs` | ~350 | `submitAssessment()`, `getAssessmentResponses()`, `getAssessmentResultsForHex()`, `getAssessmentResultsForMap()`, `deleteAssessmentResponses()`, `gradeAssessment_()` |
| `PlannerService.gs` | ~420 | `getStudentPlannerData()`, `saveStudentTaskOrder()`, `buildStudentSchedule_()` (student task aggregation, urgency flags, waterfall schedule matching) |
| `ScheduleImportService.gs` | ~175 | `getWaterfallConfig()`, `saveWaterfallConfig()`, `testWaterfallConnection()`, `importWaterfallSchedule()`, `readSheetAsObjects_()` |
| `CelebrationService.gs` | ~300 | `getStudentCelebrationData()`, `checkAndAwardAchievements()`, `acknowledgeAchievements()`, streak computation, milestone checking, badge definitions |
| `NoteService.gs` | ~500 | `saveStudentNote()`, `getStudentNote()`, `getAllStudentNotes()`, `toggleNoteStarred()`, `updateNoteTags()`, `getClassNoteStats()`, `getStudentNotesForMap()`, `saveNoteLayers()`, `exportNotesToDoc()`, `exportStarredNotesToDoc()`, `exportAllNotesToDoc()` |
| `TaskService.gs` | ~280 | `getStudentTasks()`, `createStudentTask()`, `updateStudentTask()`, `deleteStudentTask()`, `saveStudentTaskOrder_Custom()`, `getTeacherReminders()`, `createTeacherReminder()`, `updateTeacherReminder()`, `deleteTeacherReminder()`, `saveTeacherReminderOrder()` |
| `AiscCore.gs` | ~280 | `getAiscCore()`, `getCompetencyCoverage()`, `getStudentCompetencyProfile()`, `getClassCompetencyBreakdown()` + AISC_CORE constant (mission, vision, definition of learning, 6 competencies, 5 values) |
| `StudentSupportService.gs` | ~250 | `getClassSupportProfiles()`, `getMyStudentProfile()`, `getAccommodationReminders()`, `saveStudentProfile()`, `updateStudentProfile()`, `deactivateStudentProfile()` |
| `SupportImportService.gs` | ~300 | External support data spreadsheet import (upsert on studentId/email, preserves teacher-edited strategies) |
| `ATLService.gs` | ~350 | IB ATL categories/sub-skills, `getATLProgress()`, `saveATLRating()`, `getATLSuggestions()`, `getClassATLSummary()`, `getContextualTaskTips()` |
| `LabFrameworks.gs` | ~480 | LAB_DIMENSIONS (8 dimensions), 4 framework definitions (IB MYP/DP, AP, NGSS), cross-framework alignment, section types |
| `LabConfigService.gs` | ~290 | External LabReports spreadsheet connection: `getLabConfig()`, `saveLabConfig()`, `testLabConnection()`, `initializeLabSpreadsheet()` + sheet access helpers. 8 sheet schemas (LabTemplates, LabRubrics, LabRubricCriteria, LabAssignments, LabSubmissions, LabSectionData, LabScores, LabSectionVersions) |
| `LabTemplateService.gs` | ~500 | Lab template CRUD + 5 preloaded templates (IB MYP, IB DP, AP, Quick Lab, Guided Inquiry) |
| `LabRubricService.gs` | ~540 | Lab rubric/criteria CRUD + 5 preloaded rubrics, framework linking |
| `LabAssignmentService.gs` | ~440 | Lab assignment CRUD, template+rubric linking to hexes, activation workflow |
| `LabSubmissionService.gs` | ~698 | Student lab submissions: `getStudentLabContext()`, `saveLabSectionDraft()`, `getStudentSubmission()`, `submitLabReport()` (with version snapshot), `returnLabReport()` (with scored guard), `getLabSubmissionsForAssignment()`, `getLabRevisionHistory()`, `getLabSectionVersion()` |
| `LabScoringService.gs` | ~860 | Lab scoring: `saveLabScores()`, `getLabScoresForSubmission()`, `getLabScoreSummary()` (weighted averages + dimensions + scaleLabel), `finalizeLabScore()` (→scored + Progress write), `exportLabSubmissionToDoc()`, `exportLabAssignmentDocs()`, `saveReconciledScores()` |
| `CollabConfigService.gs` | ~446 | External CollabSpace spreadsheet connection (6 sheets: Boards, Posts, Comments, Reactions, Members, Activity) |
| `CollabBoardService.gs` | ~400 | Collaboration board CRUD, post management, comments, reactions |
| `DifferentiationService.gs` | ~500 | Group CRUD, membership management, hex assignment CRUD, `getStudentVisibleHexIds()`, `getMapDifferentiationData()` |
| `TourService.gs` | ~200 | Guided tour system |
| `VocabularyService.gs` | ~200 | Vocabulary/dictionary features |
| `PortfolioService.gs` | ~300 | Student portfolio management |
| `IterationService.gs` | ~250 | Design thinking iteration tracking |
| `PeerFeedbackService.gs` | ~250 | Peer feedback/review system |
| `TestHelpers.gs` | ~114 | Test utilities |

### Frontend (.html files) — 85 files
| File | Lines | Purpose |
|------|-------|---------|
| `Index.html` | ~1920 | Main app shell: 10 tabs, all views, modals, style/script includes |
| `Styles.html` | ~489 | Core CSS: layout, cards, modals, hex grid, student states, content modal (flexbox), grading (grd-), branches (bch-), hex-status-text labels |
| `Styles-UbdPlanner.html` | ~142 | UBD planner styles |
| `Styles-Progress.html` | ~157 | Progress dashboard styles (pgd-) |
| `Styles-Settings.html` | ~146 | Admin settings styles (set-) |
| `Styles-Lessons.html` | ~69 | Lesson plan editor styles (lsn-) |
| `Styles-Integrations.html` | ~274 | Integration settings styles (int-) |
| `Styles-Standards.html` | ~384 | Standards alignment styles (sal-) |
| `Styles-Analytics.html` | ~382 | Course analytics styles (cad-) |
| `Styles-Notifications.html` | ~207 | Student notifications & guidance styles (sng-) |
| `Styles-NotifCenter.html` | ~193 | Notification bell/dropdown styles (ntf-) |
| `Styles-SelfAssess.html` | ~505 | Self-assessment styles (sa-) |
| `Styles-StudentAnalytics.html` | ~277 | Student analytics + teacher preview styles (spa-, tpv-) |
| `Styles-Responsive.html` | ~527 | Responsive media queries — tablet (1024px) and phone (640px) breakpoints, touch device handling, planner + ATL + celebrations + student tasks + teacher reminders + AISC Core + lab + scoring + differentiation + strategy browser responsive |
| `Styles-Search.html` | ~170 | Command palette search styles (cmd-) |
| `Styles-KnowledgeGaps.html` | ~305 | Knowledge gap analysis styles (kga-) — summary cards, sortable table, status bars, SBAR bars, struggle list, mismatch grid, got-it badges, struggle formative badges |
| `Styles-FormativeChecks.html` | ~400 | Formative check logging styles (fcl-) — modal, strategy chips, student tagging, history timeline, results bars, Progress tab view, not-yet student cards, strategy effectiveness bars |
| `Styles-Assessment.html` | ~380 | Embedded formative assessment styles (efa-) — builder modal, question cards, MC/SA/matching/ordering editors, student taking view, results, teacher analytics, hex badge |
| `Styles-CornellNotes.html` | ~590 | Cornell Notes CSS (cn-) — cornell grid layout, cue management, distillation panel, notebook browser, PARA nav, export buttons |
| `Styles-NoteCoaching.html` | ~200 | Note Coaching Dashboard CSS (cnc-) — summary cards, student list, progress bars, heatmap, cue cloud |
| `Styles-TeacherSupportDashboard.html` | ~280 | Teacher Support Dashboard CSS (tsd-) — summary cards, student usage cards with profile badges, strategy chips (used/assigned), effectiveness bars, heatmap table |
| `Scripts-Core.html` | ~752 | Globals (appConfig, saSelectedRating, saEvidenceCount, cmdOpen, kga*, fcl*, tsd*, labScoring* vars, etc.), init, tab switching, view mode, toast, escape handler (includes labScoring check), config loading, Ctrl/Cmd+K binding, friendlyError() wrapper, beforeunload unsaved work warning |
| `Scripts-MapBuilder.html` | ~2980 | Hex grid, drag-drop, connections, student interaction, self-assessment UI, config enforcement (branching, max hexes, approval status), lab scoring state reset, hasUnsavedModalWork() + unsaved confirm on close, hex status text labels, friendlyError on student error handlers |
| `Scripts-Courses.html` | ~2100 | Courses tab CRUD, units panel, lesson editor (7-section accordion), grading scale editor |
| `Scripts-Modals.html` | ~891 | Maps list (with duplicate), classes (with map assignment), roster, users |
| `Scripts-Standards.html` | ~1150 | Standards library, coverage report, bulk link/unlink, hex picker, strength indicators |
| `Scripts-UbdPlanner.html` | ~1114 | UBD planner browser + editor + all 3 stages |
| `Scripts-Progress.html` | ~1151 | Progress dashboard teacher + student views, pending approvals (config-gated), self-assessment summary, teacher preview selector |
| `Scripts-Settings.html` | ~216 | Admin settings panel (4 sections) |
| `Scripts-Integrations.html` | ~670 | Integration settings (config cards, data browser, bulk import, waterfall card container) |
| `Scripts-Analytics.html` | ~510 | Course analytics (stat cards, heatmap, distribution, at-risk list) + knowledge gap + formative checks + teacher reminders sub-nav toggle (8 sub-tabs) |
| `Scripts-NotifCenter.html` | ~233 | Notification bell + dropdown (polling, mark read) |
| `Scripts-Search.html` | ~230 | Command palette search — cross-entity search engine (hexes, maps, courses, standards), keyboard navigation, navigation dispatch |
| `Scripts-KnowledgeGaps.html` | ~470 | Knowledge gap analysis — 13 functions: 5 compute (perHexStats, sbarBreakdown, studentStruggles, confidenceMismatches, summaryCards + formativeInsight), 6 render (main, summaryCards + 5th card, hexTable + Checks/Got-It Rate columns, sbarBreakdown, studentStruggles + not-yet badge, confidenceMismatches), 2 interaction (sortHexTable, toggleStudentDetail) |
| `Scripts-FormativeChecks.html` | ~440 | Formative check logging — 18 functions: modal lifecycle (open, close, switchMode), log mode (strategy chips, student tagging, save), history mode (load, render, delete), Progress tab (loadMapChecks, renderMapChecksView + Students Needing Support + Strategy Effectiveness sections) |
| `Scripts-Assessment.html` | ~650 | Embedded formative assessments — builder (openAssessmentBuilder, question CRUD, type-specific editors for MC/SA/matching/ordering, validation, save), student taking (render, submit, auto-grade, results, retry), teacher results (stats, per-question analytics), utility (shuffle) |
| `Scripts-Planner.html` | ~550 | Student planner — task dashboard (lifecycle, stats, filters, task list, urgency classes, reordering, click-to-navigate) + schedule rendering (What's Next card, block cards with task chips, weekly overview grid) |
| `Scripts-ScheduleImport.html` | ~175 | Waterfall scheduler config card for Integrations tab — toggle, URL input, test connection, import schedule, save settings |
| `Scripts-StudentAnalytics.html` | ~331 | Student progress analytics (overview cards, drill-down, SBAR, confidence distribution) |
| `Test.html` | ~85 | Test harness |
| `BuilderTest.html` | ~76 | Builder mode testing |
| `DataInspector.html` | ~244 | Debugging utility |
| `Diagnostic.html` | ~169 | Diagnostic tools |

---

## 6. Database Schema

### Sheets and Key Columns
| Sheet | Key Columns |
|-------|-------------|
| **Config** | `key`, `value`, `description`, `updatedAt`, `updatedBy` |
| **Maps** | `mapId`, `title`, `courseId`, `unitId`, `teacherEmail`, `hexesJson`, `edgesJson`, `ubdDataJson`, `metaJson`, `createdAt`, `updatedAt`, `status` |
| **Courses** | `courseId`, `title`, `programTrack`, `gradeLevel`, `ownerTeacherEmail`, `year`, `status`, `gradingSystemJson` (dual scale: `{primary: {...}, secondary: null\|{...}}`), `active` |
| **Units** | `unitId`, `courseId`, `title`, `sequence`, `mapId`, `status` |
| **Users** | `email`, `name`, `role`, `createdAt` |
| **Progress** | `email`, `mapId`, `hexId`, `status`, `score`, `maxScore`, `teacherApproved`, `completedAt`, `progressId`, `updatedAt`, `selfAssessRating`, `selfAssessNote`, `selfAssessGoal`, `selfAssessEvidenceJson`, `feedback`, `feedbackAt` |
| **Edges** | Edge/connection data between hexes |
| **Classes** | `classId`, `className`, `teacherEmail`, `subject`, `year`, `status`, `createdAt`, `updatedAt`, `courseName`, `sectionId` (NO courseId FK) |
| **ClassRoster** | `classId`, `studentEmail`, `studentName`, `addedAt`, `status` |
| **Standards** | Standards definitions by framework |
| **HexStandards** | Junction table linking standards to hexes, `alignmentNotes` (JSON: strength + notes per link) |
| **Lessons** | Lesson content linked to hexes, `lessonDataJson` (7-section accordion data) |
| **Notifications** | `notificationId`, `recipientEmail`, `type`, `title`, `message`, `data`, `read`, `createdAt` |
| **FormativeChecks** | `checkId`, `mapId`, `hexId`, `classId`, `teacherEmail`, `checkDate`, `strategyType`, `topic`, `notes`, `studentResultsJson`, `createdAt`, `updatedAt` |
| **AssessmentResponses** | `responseId`, `mapId`, `hexId`, `studentEmail`, `attemptNumber`, `totalScore`, `maxScore`, `scorePct`, `passed`, `responsesJson`, `submittedAt` |
| **MapAssignments** | `assignmentId`, `mapId`, `classId`, `dueDate`, `assignedBy`, `assignedAt` |
| **StudentTaskOrder** | `email`, `mapId`, `hexId`, `sortOrder`, `updatedAt` |
| **StudentAchievements** | `achievementId`, `studentEmail`, `achievementType`, `achievementKey`, `earnedAt`, `metadata`, `mapId`, `acknowledged` |
| **StudentNotes** | `noteId`, `studentEmail`, `mapId`, `hexId`, `cuesJson`, `notesContent`, `summaryContent`, `distilledContent`, `boldIndicesJson`, `highlightIndicesJson`, `tagsJson`, `isStarred`, `lastLayerApplied`, `wordCount`, `createdAt`, `updatedAt` |
| **StudentTasks** | `taskId`, `studentEmail`, `title`, `isCompleted`, `sortOrder`, `dueDate`, `createdAt`, `updatedAt` |
| **TeacherReminders** | `reminderId`, `teacherEmail`, `title`, `isCompleted`, `sortOrder`, `relatedMapId`, `relatedStudentEmail`, `dueDate`, `createdAt`, `updatedAt` |
| **DifferentiationGroups** | `groupId`, `classId`, `mapId`, `groupName`, `groupColor`, `groupDescription`, `isDefault`, `createdBy`, `createdAt`, `updatedAt` |
| **GroupMemberships** | `membershipId`, `groupId`, `studentEmail`, `addedBy`, `addedAt` |
| **HexAssignments** | `assignmentId`, `mapId`, `hexId`, `groupId`, `studentEmail`, `isRequired`, `addedBy`, `addedAt` |

### Grading Systems
- Dual scale model: primary (required) + optional secondary per course
- 5 presets: SBAR 8-point (strands KU/TT/C), AP 5-point, IB 7-point, Percentage, Letter Grades
- Full inline editing: passing level, labels, ranges, add/remove levels

### Progress Status Model
`not_started` -> `in_progress` -> `completed` -> `mastered`

Progress record existence = hex unlocked (no extra table needed).
`assignMapToStudents()` creates `not_started` for first hex.
`unlockHexes()` creates `not_started` for branch targets.
When `requireTeacherApproval` config is `false`, submissions are auto-approved (`teacherApproved: true`).

---

## 7. Key Patterns to Follow

### CSS Namespacing
Each feature uses a unique CSS prefix to avoid conflicts:
- `pgd-` = Progress Dashboard
- `ubd-` = UBD Planner
- `asgn-` = Map Assignment
- `set-` = Admin Settings
- `grd-` = Grading Scales
- `bch-` = Branch Editor
- `lsn-` = Lesson Plan Editor
- `int-` = Integration Settings
- `sal-` = Standards Alignment
- `cad-` = Course Analytics
- `sng-` = Student Notifications & Guidance
- `spa-` = Student Progress Analytics
- `tpv-` = Teacher Preview
- `ntf-` = Notification Center
- `sa-` = Self-Assessment
- `mob-` = Mobile Responsive
- `cmd-` = Command Palette Search
- `kga-` = Knowledge Gap Analysis
- `fcl-` = Formative Check Logging
- `efa-` = Embedded Formative Assessments
- `pln-` = Student Planner
- `ssp-` = Student Support Profiles
- `atl-` = ATL Toolkit
- `cel-` = Progress Celebrations
- `pb-` = Prompt Builder + Enhanced Support
- `sst-` = Student Support Tab (student hex modal)
- `tsd-` = Teacher Support Dashboard (strategy usage analytics)
- `cn-` = Cornell Notes + Second Brain
- `cnc-` = Note Coaching Dashboard
- `stl-` = Student Custom Task List
- `trm-` = Teacher Reminders
- `asc-` = AISC Core (mission, vision, values, competencies)
- `lab-` = Lab Report System (editor, scoring, analytics)
- `hex-status-badge`, `hex-lock-badge` = Student hex interaction

### Tab System
11 tabs: My Maps, Courses, Classes, Users, Map Builder, Standards, UBD Planner, Progress, My Planner, Settings, Integrations
- `.view { display: none; }` / `.view.active { display: flex; }`
- `switchTab(button)` reads `data-view` attribute
- Tabs hidden based on role: students see Maps + Progress + My Planner; Settings is admin-only; Integrations is teacher/admin; My Planner is student-only (also shown in teacher's student preview mode)

### Modal Pattern
```html
<div class="modal-overlay" id="myModal">
  <div class="modal">
    <div class="modal-header"><h3>Title</h3><button class="modal-close" onclick="closeMyModal()">&times;</button></div>
    <div class="modal-body">...</div>
    <div class="modal-footer"><button onclick="closeMyModal()">Cancel</button><button onclick="save()">Save</button></div>
  </div>
</div>
```
Open: `document.getElementById('myModal').classList.add('active');`
Close: `document.getElementById('myModal').classList.remove('active');`
Always add close function to Escape handler in Scripts-Core.html.

### Content Modal (Flexbox)
The student hex content modal uses flex column layout:
- `.content-modal` = `display: flex; flex-direction: column; max-height: 85vh;`
- `.content-modal-header` = `flex-shrink: 0;` with close x button
- `.content-modal-body` = `flex: 1; min-height: 0; overflow-y: auto;`
- `.content-modal-footer` = `flex-shrink: 0;`

### RPC Pattern (Frontend -> Backend)
```javascript
google.script.run
  .withSuccessHandler(function(result) { /* handle success */ })
  .withFailureHandler(function(err) { showToast('Error: ' + err.message, 'error'); })
  .backendFunctionName(arg1, arg2);
```

### Config Enforcement Pattern
Frontend loads config at startup via `getPublicConfig()` into `appConfig` global (ES5).
Backend reads config via `getConfigValue('key')`. Three keys enforced:
- `requireTeacherApproval`: gates approval flow, notifications, status labels
- `enableBranching`: gates addEdge, evaluateBranches, UI visibility
- `maxHexesPerMap`: gates addHex backend + addHexToMap frontend

### Two-Panel Layout Pattern
Used by Courses, UBD Planner, Progress Dashboard:
- Left panel = browser/list
- Right panel = editor/detail (slides in with `.active` class)

---

## 8. Known Technical Debt

| Issue | Severity | Status |
|-------|----------|--------|
| No automated testing | Medium | Open |
| `console.log` debug statements in frontend | Low | Open |
| ~~No viewport meta tag in Index.html~~ | ~~Low~~ | FIXED (Mobile Responsive, Feb 2026) |
| Empty `openConnectionEditorPanel()` function | Low | Open (dead code) |
| Class has no courseId FK | Info | By design (class->map via progress) |
| `allowSelfRegistration` config not enforced | Info | No registration feature exists |
| `debugMode` config not enforced | Info | Low priority |
| ~~`requireTeacherApproval` not enforced~~ | ~~Medium~~ | FIXED (Config Enforcement, Feb 2026) |
| ~~`enableBranching` not checked~~ | ~~Medium~~ | FIXED (Config Enforcement, Feb 2026) |
| ~~Content modal clipping close button~~ | ~~Medium~~ | FIXED (Flexbox rewrite, Feb 2026) |

---

## 9. Development Workflow

### How Matthew Works
- **30-60 minute "stories"** during prep periods and before/after school
- Uses Claude Code as coding partner through structured conversations
- **Handoff documents** preserve context across sessions
- Follows: plan -> implement -> test -> handoff

### For Claude Code — When Starting a New Session
1. Read this handoff document first
2. The `src/` folder contains ALL production code (all .gs and .html files)
3. Follow existing patterns (ES5 frontend, ES6 backend, LockService for writes, escapeHtml for rendering)
4. Use plan mode for non-trivial features
5. Always check for ES5 compliance (no const/let/arrows/includes/backticks in .html files)
6. Check MEMORY.md at `~/.claude/projects/.../memory/MEMORY.md` for the latest completed stories

### What NOT to Do
- Don't use ES6 in frontend .html files (const, let, =>, \`\`, .includes())
- Don't use bare `#id { display: flex }` CSS (causes view bleeding)
- Don't compare IDs without `String()` coercion
- Don't refactor files not related to the current story
- Don't change the database schema without explicit approval

---

## 10. Immediate Next Steps

The recommended next stories (in priority order):

1. **Accessibility Toolbar** — Font size, line spacing, high contrast, simplified view, saved per-student preferences
2. **Focus Mode & Cognitive Load** — Full-screen focus mode, "show only unlocked" filter, reduced motion, "I'm stuck" button
3. **Bulk Import/Export** — CSV upload for students, standards, maps to reduce manual data entry
4. **Print/Export Views** — Printable progress reports, map exports for curriculum documentation
5. **Search v2: Units/Lessons** — Extend command palette with backend search for units and lessons

---

*Last updated: February 22, 2026 — v7.5 (Lab Report Phase 2 Complete — Stories 2.1-2.6)*
