# Learning Hub Dashboard — Portfolio Rebuild Handoff

**Created:** 2026-03-05
**Purpose:** Document the Learning Hub dashboard built for Matthew's EdTech Portfolio, designed to be brought back into the Unified Learning Map (ULM) project as a reference for UI patterns and component architecture.

---

## What Was Built

A React/Next.js rebuild of the ULM's teacher and student dashboard views as an interactive portfolio case study. The demo runs at `/projects/learning-hub` and includes:

1. **Teacher Dashboard** — class-level analytics with student progress heatmap
2. **Student Dashboard** — personalized learning overview with progress rings and task management
3. **View Toggle** — animated switch between teacher/student perspectives

---

## ULM Reference Files Consulted

These files from `/Users/imatthew/Documents/Claude Code Projects/Unified Learning Map/` were read to inform the design:

| File | What was extracted |
|------|--------------------|
| `src/DashboardService.gs` | Dashboard widget structure, KPI calculations, class/map selectors |
| `src/ProgressService.gs` | Progress record schema (status, score, selfAssessRating, teacherApproved, feedback) |
| `src/CourseService.gs` | Course/class/map relationships, grading systems, strand definitions |
| `src/AssessmentService.gs` | Assessment response schema, scoring logic, attempt tracking |
| `Claude Project Handoff.md` | Full system architecture, entity relationships, feature inventory |

---

## Entity Mapping: ULM → Portfolio Rebuild

| ULM Entity | Portfolio Type | Simplifications |
|-----------|---------------|-----------------|
| Users sheet (email lookup) | `Student` interface | Added `id`, `avatarColor`; removed email-based lookup |
| ClassRoster (classId + studentEmail) | Flattened into student array per course | No separate roster table |
| StudentSupportProfiles | `SupportProfile` on Student | Kept profileType, widaLevel, accommodations; dropped widaDomains JSON, strategies |
| Courses | `Course` interface | Kept core fields; dropped gradingSystem, standardFramework |
| Maps + Hexes + Edges | `LearningMap`, `Hex`, `Edge` | Kept graph structure; simplified hex to 4 types; dropped assessmentJson, lessonPlan, inlineContent |
| Progress (email + mapId + hexId) | `ProgressRecord` | Kept status/score/selfAssess/teacherApproved/feedback; dropped selfAssessGoal, evidenceJson, strategiesUsedJson |
| Assessment Responses | `AssessmentScore` | Kept core scoring; dropped responsesJson (per-question detail) |
| Student Achievements | `Achievement` | Kept type/title/description/icon; dropped metadata JSON, acknowledged flag |
| StudentTaskOrder | `StudentTask` | Converted from hex ordering to prioritized task list with urgency |
| Teacher Reminders | Not included | Could add in future iteration |
| Notifications | Not included | Could add notification bell in future |
| ATL Progress | Not included | Would be good addition for student self-tracking |
| Formative Checks | Not included | Teacher observation tracking |
| Differentiation Groups | Not included | Group-based pathway management |

---

## Component Architecture

```
components/learning-hub/
├── LearningHubBoard.tsx     ← Orchestrator: view state, AnimatePresence toggle
├── ViewToggle.tsx            ← Teacher/Student pill toggle with framer-motion
├── TeacherDashboard.tsx      ← Class analytics (largest component)
│   ├── KpiCard               ← Inline: metric card with label/value/color
│   └── HeatmapRow            ← Inline: student row with hex status cells
└── StudentDashboard.tsx      ← Personal learning view
    ├── StatCard               ← Inline: emoji + value + suffix
    ├── MapProgressCard        ← Inline: SVG dual-ring + map info
    ├── TaskCard               ← Inline: urgency badge + type icon
    └── AchievementBadge       ← Inline: emoji + title grid item
```

### Teacher Dashboard Features

| Feature | Implementation | ULM Equivalent |
|---------|---------------|----------------|
| 6 KPI cards | Grid of `KpiCard` components | `renderDashboardOverviewCards()` |
| Score distribution | Recharts `BarChart` (5 bands: 0-20 through 81-100) | Score histogram in Knowledge Gap Analysis |
| Strand performance | Recharts `RadarChart` (4 strands: KU, ID, PE, R) | SBAR breakdown horizontal bars |
| Progress heatmap | Custom grid: student rows × hex columns, 4-state colors | `renderStudentProgressGrid()` |
| At-risk filtering | Toggle button + `isAtRisk` flag (score < 60 OR completion < 20%) | Teacher Support Dashboard at-risk indicators |
| Sort controls | Name / Completion / Score dropdown | Sortable columns in progress grid |
| Support badges | Inline `profileType` chips (WIDA, EAL, IEP, 504) | Accommodation reminders sidebar |
| Pending approvals | List with student/hex/score + Review button | `renderPendingApprovalsQueue()` |

### Student Dashboard Features

| Feature | Implementation | ULM Equivalent |
|---------|---------------|----------------|
| Welcome header | Avatar + name + grade + streak fire emoji | Student Progress Cards header |
| 4 stat cards | Completed nodes, avg score, confidence, streak | Student Analytics Summary cards |
| Progress rings | SVG circles with dual layer (student cyan + class gray) | Map Progress Cards completion ring |
| Ahead/behind badge | Calculated from `completionPct - classAverageCompletion` | Class average context positioning |
| Task list | 5 tasks with urgency color coding + type emojis | Student Planner task dashboard |
| Achievement grid | 6 badges: milestones, streaks, perfect score, lab expert | Progress Celebrations badge gallery |

---

## Mock Data Summary

**Generator:** `scripts/generate-learning-hub-data.mjs` (Faker.js seed: 77)
**Output:** `data/mock/learning-hub.json` (54.6KB)

| Data | Count |
|------|-------|
| Students | 28 (5 with support profiles) |
| Courses | 2 (Year 9 Biology, Year 10 Chemistry) |
| Learning Maps | 2 (12 hexes each) |
| Progress Records | 624 (28 students × 12 hexes × ~2 maps) |
| At-Risk Students | 12 (score < 60% or completion < 20%) |
| Pending Approvals | Up to 24 |
| Achievements | 6 (milestone, streak, badge, perfect_score types) |
| Tasks | 5 (overdue, due_today, due_this_week, upcoming) |

### Mock Data Realism

- Progress levels vary per student using `faker.number.float({ min: 0.1, max: 1.0 })` as a progress multiplier
- 15% of students are flagged as "struggling" (lower scores: 40-65 range vs 65-100)
- Hex types cycle through lesson/activity/quiz/discussion
- Quizzes and assessments have maxScore=100, labs have maxScore=50, lessons have maxScore=0
- Support profiles: 3 students with WIDA levels (2-4), 2 with IEP/504/EAL
- Teacher feedback is randomly applied to ~40% of approved submissions

---

## TypeScript Types Reference

All types are in `lib/learning-hub-types.ts`. Key top-level shapes:

```typescript
interface LearningHubData {
  teacherDashboard: TeacherDashboardData;
  studentDashboard: StudentDashboardData;
}

interface TeacherDashboardData {
  teacher: { id, firstName, lastName };
  courses: Course[];
  currentCourse: Course;
  maps: LearningMap[];
  currentMap: LearningMap;
  classOverview: ClassOverview;       // 6 KPI values
  studentRows: StudentProgressRow[];   // 28 rows with hexStatuses[]
  scoreDistribution: ScoreDistributionBand[];  // 5 bands
  strandPerformance: StrandPerformance[];      // 4 strands
  atRiskStudents: AtRiskStudent[];     // severity: warning | critical
  pendingApprovals: PendingApproval[]; // awaiting teacher review
}

interface StudentDashboardData {
  student: Student;
  mapProgress: StudentMapProgress[];   // per-map completion rings
  achievements: Achievement[];          // earned badges
  tasks: StudentTask[];                 // prioritized task list
  currentStreak: number;
  totalCompleted: number;
  overallAvgScore: number;
  overallConfidence: number;            // 1-4 scale
}
```

---

## Integration Notes for ULM

### What could be brought back into the ULM:

1. **Progress heatmap pattern** — the student × hex grid with 4-state color coding is a clean implementation that could replace the current `renderStudentProgressGrid()` approach
2. **SVG progress rings** — dual-layer ring (student + class average) is more informative than a single progress bar
3. **At-risk detection logic** — simple threshold-based: `avgScore < 60 || completionPct < 20%`
4. **Task urgency system** — categorizing tasks into overdue/due_today/due_this_week/upcoming with color coding
5. **Achievement UI pattern** — emoji-based badge grid with earned/unearned states
6. **KPI card pattern** — mono-spaced labels, large colored values, consistent sizing

### What the ULM has that the portfolio doesn't:

- Formative check analytics (strategy effectiveness)
- WIDA domain-level detail (listening/speaking/reading/writing scores)
- ATL toolkit self-assessment
- Branching pathway visualization (hex grid with edges)
- Notification system with real-time polling
- Teacher reminders and custom tasks
- Waterfall schedule integration
- CSV/PDF export
- Differentiation groups
- Assessment question-level analysis

### Recommended additions for future portfolio iterations:

1. **Hex map visualization** — render the actual hex grid with edges showing branching paths (would be the "wow" feature)
2. **Notification bell** — in-app notification dropdown
3. **Formative check view** — teacher logs observation → see strategy effectiveness
4. **ATL self-tracker** — 5-category rating with reflection notes

---

## Tech Stack

| Technology | Role |
|-----------|------|
| React 19 + Next.js 16 | Framework |
| TypeScript (strict) | Type safety |
| Recharts | Bar chart (score distribution) + radar chart (strand performance) |
| Framer Motion | View toggle animation, AnimatePresence for view switching |
| Tailwind CSS v4 | Styling with `@theme inline` token integration |
| @faker-js/faker | Deterministic mock data generation (seed: 77) |
| SVG | Custom progress ring components (no library) |

---

## File Locations

```
portfolio-site/
├── app/projects/learning-hub/page.tsx          ← Case study page (route)
├── components/learning-hub/
│   ├── LearningHubBoard.tsx                     ← Orchestrator
│   ├── ViewToggle.tsx                            ← Teacher/Student toggle
│   ├── TeacherDashboard.tsx                      ← Class analytics
│   └── StudentDashboard.tsx                      ← Student view
├── lib/learning-hub-types.ts                     ← TypeScript interfaces
├── scripts/generate-learning-hub-data.mjs        ← Faker.js generator
├── data/mock/learning-hub.json                   ← Generated mock data (54.6KB)
└── docs/Learning Hub Dashboard — Portfolio Rebuild Handoff.md  ← This file
```
