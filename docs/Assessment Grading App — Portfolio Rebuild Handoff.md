# Assessment Grading App — Portfolio Rebuild Handoff

**Created:** 2026-03-05
**Purpose:** Document the Assessment Grading App built for Matthew's EdTech Portfolio, designed to be brought back into the IB Assessment Tracker project as a reference for UI patterns and component architecture.

---

## What Was Built

A React/Next.js rebuild of the IB Assessment Tracker's grading and analytics views as an interactive portfolio case study. The demo runs at `/projects/grading-app` and includes:

1. **Teacher Dashboard** — class-level analytics with IB band distributions, strand radar, topic mastery
2. **Grading Panel** — per-student paper grading with MCQ auto-scoring and rubric checklists
3. **Student Results** — personalized score card, AISC descriptors, topic analysis, exam review

---

## IB Assessment Tracker Reference Files Consulted

These files from `/Users/imatthew/Documents/Claude Code Projects/IB-Assessment-Tracker/` were read to inform the design:

| File | What was extracted |
|------|-------------------|
| `src/Scoring_IB.gs` | Three scoring modes (auto/checklist/manual), AND/OR rubric logic, band lookup, recompute flow |
| `src/Api_ib.gs` | Exam CRUD, question builder, response saving, rubric management, report data compilation |
| `src/ReportData_IB.gs` | AISC holistic language descriptors (1-8 per strand), topic analysis, student report data |
| `src/ReportGenerator_IB.gs` | Google Doc generation patterns, strand descriptors, topic breakdown formatting |
| `src/Db.gs` | Data layer patterns, sheet schema (12 tabs), upsert/read operations |
| `src/WebAppServer.gs` | Auth patterns, role-based access (teacher/student), SL/HL filtering |
| `src/WebAppUi.html` | SPA structure, hash-based routing, tab system (Dashboard/Grading/Student) |
| `IB Assessment Tracker Handoff.md` | Full system architecture, entity relationships, feature inventory |

---

## Entity Mapping: IB Tracker → Portfolio Rebuild

| IB Tracker Entity | Portfolio Type | Simplifications |
|-------------------|---------------|-----------------|
| Students sheet | `Student` interface | Kept id, name, email, classSection, level (SL/HL) |
| Exams sheet | `Exam` interface | Kept core fields; dropped status management, active_exam_id |
| Questions sheet | `Question` interface + `Paper1AQuestion` / `ChecklistQuestion` | Separated by paper type; kept strand, ibTopicCode, scoringMode |
| Rubrics sheet | `RubricItem[]` on questions | Embedded rubric items directly on questions; kept itemId, criteriaText, points |
| Responses sheet | `Response` interface | Kept pointsAwarded, mcqChoice, checkedItems; dropped response_text |
| Grade_Bands sheet | `GradeBand` interface | Kept level-aware lookup; simplified to even distribution |
| Scores_CurrentExam | `StudentScore` interface | Kept all fields: total, per-strand (KU/TT/C), per-paper (1A/1B/2), bands |
| TopicSkillBreakdown | `TopicBreakdown` / `StudentTopicAnalysis` | Kept per-topic aggregation; added strong/weak topic classification |
| Curriculum | `TopicGroup[]` + topic codes | Kept IB topic structure (S1-S3, R1-R3); 22 topics |
| AISC descriptors | `AISCDescriptor` interface | Kept 8-band descriptors per strand (KU/TT/C) |
| Permissions | Not included | Could add role-based filtering in future |
| Access_Log | Not included | Could add audit trail |
| Question_Content | Not included | Rich media (images, text blocks) for future |

---

## Component Architecture

```
components/grading-app/
├── GradingAppBoard.tsx        ← Orchestrator: view state, AnimatePresence toggle
├── GradingViewToggle.tsx      ← 3-tab toggle (Dashboard/Grading/Student)
├── TeacherDashboard.tsx       ← Class analytics (largest component)
│   ├── KPICard                ← Inline: metric card with label/value/color
│   ├── StudentScoreRow        ← Inline: table row with all score columns
│   └── IBGradeBadge           ← Inline: colored grade circle
├── GradingPanel.tsx           ← Per-student paper grading
│   ├── Paper1AView            ← Inline: MCQ grid with correct/incorrect
│   └── ChecklistView          ← Inline: rubric items with check/miss
└── StudentResults.tsx         ← Student exam results
    ├── IBGradeCircle          ← Inline: SVG ring with grade
    ├── StrandBadge            ← Inline: band + points display
    ├── PaperScore             ← Inline: earned/max with percentage
    └── TopicRow               ← Inline: topic code + name + percentage
```

### Teacher Dashboard Features

| Feature | Implementation | IB Tracker Equivalent |
|---------|---------------|----------------------|
| 4 KPI cards | Grid of `KPICard` components | Class overview stats |
| Level filter | SL/HL/ALL toggle buttons | SL/HL filter in WebAppUi |
| IB band distribution | Recharts `BarChart` (bands 1-7) | Band distribution chart |
| Strand performance | Recharts `RadarChart` (KU, TT, C) | Strand comparison |
| Paper breakdown | 3 progress cards (1A/1B/2) with percentages | Paper-by-paper analysis |
| Student scores table | Sortable table with all score columns | Student scores tab |
| Topic analysis | Horizontal bar chart per IB topic code | Topic mastery view |

### Grading Panel Features

| Feature | Implementation | IB Tracker Equivalent |
|---------|---------------|----------------------|
| Student selector | Dropdown with level badges | Student picker in grading tab |
| Paper tabs | 3-tab selector (1A/1B/2) | Paper selector in grading panel |
| MCQ grid | 10-column grid showing answer/correct/strand | Paper 1A batch grading |
| Strand breakdown | 3 progress bars per strand | Strand summary after grading |
| Checklist marking | Rubric items with check/miss icons | Checklist scoring with rubric |
| Score bars | Per-question progress bars | Points display |

### Student Results Features

| Feature | Implementation | IB Tracker Equivalent |
|---------|---------------|----------------------|
| Score card | IB grade circle + total + strand bands | Student score card |
| AISC descriptors | Band-specific text per strand | Holistic assessment report |
| Topic analysis | Strong/weak classification with bars | Topic drill-down |
| Exam review | MCQ answers + checklist results | Student exam results tab |

---

## Mock Data Summary

**Generator:** `scripts/generate-grading-data.mjs` (Faker.js seed: 55)
**Output:** `data/mock/grading-app.json` (79.2KB)

| Data | Count |
|------|-------|
| Students | 8 (4 SL, 4 HL) |
| Exam | 1 (Term 2 — Reactivity & Structure) |
| Questions | 44 (30 MCQ + 6 Paper 1B + 8 Paper 2) |
| Responses | 352 (8 students x 44 questions) |
| Grade Bands | 62 (IB 1-7 + AISC 1-8, per level/strand) |
| Topic Groups | 6 (S1-S3, R1-R3) |
| Topics | 22 IB Chemistry topics |

### Student Ability Profiles

| Student | Level | Ability | Profile |
|---------|-------|---------|---------|
| Aarav Patel | SL | 0.55 | Average |
| Priya Sharma | SL | 0.78 | Strong |
| Liam O'Brien | SL | 0.35 | Struggling |
| Sakura Tanaka | SL | 0.65 | Above average |
| Emeka Okafor | HL | 0.82 | Strong (demo student) |
| Clara Bauer | HL | 0.92 | Top performer |
| Jin Chen | HL | 0.48 | Below average |
| Anika Johansson | HL | 0.70 | Solid |

### Scoring Realism

- Ability modifiers per strand: KU +8%, TT -8%, C neutral (TT is hardest)
- Random noise: +/- 15% per question for natural variance
- AND checklists: each rubric item independently rolled against effective ability
- OR checklists: single roll for full marks or zero
- IB grades via even-distribution band lookup (simplified from real boundaries)

---

## TypeScript Types Reference

All types are in `lib/grading-types.ts`. Key top-level shapes:

```typescript
interface GradingAppData {
  teacherDashboard: TeacherDashboardData;
  gradingPanel: GradingPanelData;
  studentView: StudentDashboardData;
}

interface TeacherDashboardData {
  exam: Exam;
  students: Student[];
  scores: StudentScore[];
  ibBandDistribution: BandDistribution[];
  aiscBandDistribution: { KU, TT, C: BandDistribution[] };
  strandSummary: StrandSummary[];
  paperSummary: PaperSummary[];
  topicGroups: TopicGroup[];
  classTopicAnalysis: TopicBreakdown[];
}

interface GradingPanelData {
  exam: Exam;
  students: Student[];
  paper1aQuestions: Paper1AQuestion[];
  checklistQuestions: ChecklistQuestion[];
  responses: Record<string, Response>; // keyed by `${studentId}||${qid}`
}

interface StudentDashboardData {
  student: Student;
  exam: Exam;
  score: StudentScore;
  topicAnalysis: StudentTopicAnalysis;
  paper1aResults: Paper1AResponse[];
  checklistResults: ChecklistResponse[];
  strandDescriptors: AISCDescriptor[];
}
```

---

## Integration Notes for IB Assessment Tracker

### What could be brought back:

1. **Strand radar chart** — Recharts radar with KU/TT/C is cleaner than the current bar chart approach
2. **Topic mastery bars** — horizontal bars sorted by performance with color coding (green/amber/red) give immediate visual feedback
3. **MCQ grid pattern** — compact grid view with correct/incorrect coloring is more scannable than a table
4. **AISC descriptor cards** — styled cards with band numbers and full descriptor text
5. **Strong/weak topic classification** — simple threshold (70%/50%) with dedicated UI sections
6. **Student score card layout** — SVG grade circle + strand badges + paper breakdown in one card

### What the IB Tracker has that the portfolio doesn't:

- Exam builder (create exams, set paper 1A count, add rubric items)
- Multi-exam trend tracking (Scores_AllExams)
- Google Doc report generation (individual + batch)
- Role-based access control (teacher vs student permissions)
- Response caching (CacheService 120s TTL)
- Concurrent write safety (LockService wrappers)
- Question content display (rich text + images)
- Exam visibility controls (hide/show for students)
- CSV/PDF export
- Access logging (audit trail)

### Recommended additions for future portfolio iterations:

1. **Exam builder** — question CRUD with rubric editor (would showcase form handling)
2. **Multi-exam trend** — line chart showing score progression over terms
3. **Report preview** — styled document-like view mimicking the Google Doc output
4. **Question content** — show actual question text/images alongside grading

---

## Tech Stack

| Technology | Role |
|-----------|------|
| React 19 + Next.js 16 | Framework |
| TypeScript (strict) | Type safety |
| Recharts | Bar chart (band distribution) + radar chart (strand performance) |
| Framer Motion | View toggle animation, AnimatePresence for view switching |
| Tailwind CSS v4 | Styling with `@theme inline` token integration |
| @faker-js/faker | Deterministic mock data generation (seed: 55) |
| SVG | Custom IB grade circle component (no library) |

---

## File Locations

```
portfolio-site/
├── app/projects/grading-app/page.tsx              ← Case study page (route)
├── components/grading-app/
│   ├── GradingAppBoard.tsx                         ← Orchestrator
│   ├── GradingViewToggle.tsx                       ← Dashboard/Grading/Student toggle
│   ├── TeacherDashboard.tsx                        ← Class analytics
│   ├── GradingPanel.tsx                            ← Per-student grading
│   └── StudentResults.tsx                          ← Student exam results
├── lib/grading-types.ts                            ← TypeScript interfaces
├── scripts/generate-grading-data.mjs               ← Faker.js generator
├── data/mock/grading-app.json                      ← Generated mock data (79.2KB)
└── docs/Assessment Grading App — Portfolio Rebuild Handoff.md  ← This file
```
