# IB Chemistry Assessment Tracker — Web App Migration Handoff

## HOW TO USE THIS DOCUMENT

This is the **master planning & implementation reference** for migrating the IB Chemistry sidebar grading tool to a full HTML web app served by Google Apps Script. Paste this into Claude Code with the source files and say:

**"Here is the project handoff. Start with Phase 0 reconnaissance, then implement Story 1."**

---

## PROJECT IDENTITY

- **Project:** IB Chemistry Assessment Tracker — Sidebar → Web App Migration
- **Owner:** Matthew, IB Chemistry teacher at AIS Chennai
- **School domain:** @aischennai.org (Google Workspace)
- **Students:** 8 students (4 SL, 4 HL) across 2 sections
- **Current state:** Working sidebar grading tool (6 .gs files + 1 .html sidebar)
- **Target state:** Full web app (doGet + single-page HTML) with student & teacher views
- **Companion project:** AP Chemistry Assessment Tracker (Stories 1-11 complete, same architecture target)

---

## VIBE CODING TRIAD — WORKING METHODOLOGY

You have 3 roles. Switch based on Matthew's command:

1. **SCRUM MASTER:** Turn ideas into ONE small shippable story + acceptance criteria + test plan.
2. **STORY IMPLEMENTER:** Implement ONLY the story (small PR) with minimal diffs.
3. **QA VALIDATOR:** Try to break it; approve or request changes with repro steps.

**Hard rules (non-negotiable):**

- One story per PR. Keep PRs small (<200 LOC changed unless story requires more).
- No "bonus refactors" unless story explicitly says so.
- Privacy-first: never store or log student PII (names/emails). No hidden telemetry.
- Never put secrets or backend Sheet IDs in frontend code.
- All setup/admin actions must be blocked from students (403/blocked).
- Concurrency: use LockService for all writes to Sheets.
- Every data interaction must have loading/empty/error states.
- Ask questions to clarify prompts, and push back on methodology if you see a better way.

---

## CURRENT SYSTEM INVENTORY

### Files (6 backend + 1 frontend)

| File | LOC (approx) | Purpose |
|------|-------------|---------|
| `Code.gs` | ~300 | onOpen menu, ui_openSidebar, admin tools (recompute, dedup, reset headers), diagnostics (scoring, FRQ, rubric structure, MCQ flow, answer key) |
| `Db.gs` | ~350 | Data layer: readAll_, upsertByKey_, writeAll_, config, sheet management |
| `Api_ib.gs` | ~550 | API endpoints: exams, roster, questions, responses, rubrics, grade bands |
| `Scoring_IB.gs` | ~300 | Scoring engine: computeExamTotals_, recomputeExam_, band lookup |
| `ReportData_IB.gs` | ~450 | Report data compilation, AISC holistic language, curriculum alignment |
| `ReportGenerator_IB.gs` | ~500 | Google Doc report generation (individual + batch) |
| `Sidebar.html` | ~900 | Current UI: Setup, Builder, Bands, Mark, Reports, Overview tabs |
| **TOTAL** | **~3,350** | |

### What EXISTS and works

- Full grading workflow (sidebar-based)
- Paper 1A auto-scoring (MCQ with correct_answer matching)
- Paper 1B + Paper 2 checklist/manual scoring with OR/AND rubric detection
- SL/HL level support (separate grade boundaries per level)
- Grade bands: IB_1_7 (overall, 1-7) + AISC_1_8 (strands, 1-8)
- Default band templates for both SL and HL (hardcoded in sidebar JS)
- Report generation to Google Docs with AISC holistic language
- Band distribution overview
- Rubric editor (checklist items with add/remove)
- Exam builder (Paper 1A count + answer key, Paper 1B/2 question tree with sub-parts)
- MCQ paste entry (letters string → grid cells)
- Response caching (CacheService, 120s TTL)
- Diagnostic tools (scoring alignment, FRQ analysis, rubric structure, MCQ flow, answer key)
- Level badges throughout sidebar UI (HL purple, SL cyan)

### What DOES NOT exist yet

- `WebAppServer.gs` — no doGet(), no web app endpoints, no auth
- `WebAppUi.html` — no web app frontend
- Student-facing dashboard (students can only see reports as Google Docs)
- Teacher class overview web view
- MCQ bulk load (flexible input formats)
- Role-based authentication & routing
- Hash-based client-side navigation

---

## GOOGLE SHEETS SCHEMA (12 tabs)

### Tab: Config
```
setting_key | setting_value | course_name | school_year | schema_version | key | value
```
- Dual-column config: supports both `key/value` AND `setting_key/setting_value`
- Current active key: `active_exam_id`

### Tab: Exams
```
exam_id | exam_name | course | term | date | status | papers_included | topics_covered | level | class_section | response_mode | wide_response_sheet | notes | created_at
```
- `level`: "SL" or "HL" — critical dimension (AP doesn't have this)
- `papers_included`: comma-separated, e.g. "1A,1B,2"
- 5 exams currently exist (2 SL, 3 HL)

### Tab: Questions
```
qid | exam_id | paper | scoring_mode | strand | points_possible | ib_topic_code | label | correct_answer | question_text | section | number | parent_qid | token | ap_topics_csv | ap_skill_code | active
```
- `paper`: "1A", "1B", or "2" (IB-specific; AP uses "MCQ"/"FRQ")
- `scoring_mode`: "auto" (Paper 1A MCQ), "checklist" (rubric-based), "manual" (teacher enters points), "container" (parent question, 0 pts)
- `ib_topic_code`: e.g. "S1.3.4", "R2.1" (IB curriculum codes)
- `active`: "True"/"False" — soft delete
- 180 questions across 5 exams

### Tab: Rubrics
```
qid | exam_id | item_id | criteria_text | points
```
- Each checklist question has multiple rubric items
- OR rubric: sum of item points > max_points → any checked = full marks
- AND rubric: sum of item points = max_points → sum checked items
- 108 rubric items

### Tab: Students
```
student_key | first_name | last_name | class_section | email
```
- 8 students total (4 SL, 4 HL)
- `student_key`: numeric (1-8)

### Tab: Roster
```
class_section | last_name | first_name | student_key
```
- Mirrors Students tab with different column order
- Used by Api_ib.gs for class-based filtering

### Tab: Responses
```
response_id | student_key | exam_id | qid | response_text | points_awarded | detail_json | graded_by | graded_at | timestamp | class_section | last_name | first_name | section | mcq_choice | comment
```
- `detail_json`: JSON array of checked rubric item_ids, e.g. `["1B_29_a_1","1B_29_a_2"]`
- `mcq_choice`: single letter A-E for Paper 1A
- 551 responses

### Tab: Grade_Bands
```
exam_id | level | band_type | band | min_pct | max_pct | scale | strand | min_points | max_points
```
- `scale`: "IB_1_7" (overall grade) or "AISC_1_8" (strand bands)
- `strand`: "OVERALL", "KU", "TT", or "C"
- `level`: "SL" or "HL" — bands differ per level per exam
- Point-based thresholds (not percentage-based)
- 124 band rows across 4 exams

### Tab: Scores_CurrentExam
```
exam_id | class_section | student_key | last_name | first_name | total_points | ku_points | tt_points | c_points | paper_1a_earned | paper_1b_earned | paper_2_earned | ib_grade | overall_band | ku_band | tt_band | c_band | last_updated | ap_band
```
- Computed by `recomputeExam_()` — not manually edited
- `ib_grade` and `overall_band` are aliases (same value)

### Tab: Scores_AllExams
```
student_key | last_name | first_name | class_section | exam_id | total_points | ku_points | tt_points | c_points | ap_band | ku_band | tt_band | c_band | last_updated
```
- Historical scores across all exams per student

### Tab: TopicSkillBreakdown
```
exam_id | class_section | student_key | last_name | first_name | section | qid | strand | ap_topic | ap_skill | points_possible | points_earned | is_correct_mcq
```
- Granular per-question-per-student breakdown
- `ap_topic` column actually stores IB topic codes (S1.1, R2.3, etc.) — legacy naming
- 689 rows

### Tab: Curriculum
```
ib_topic_code | description | group | groupDescription | hl_only
```
- 1000 rows covering full IB Chemistry syllabus
- `group`: "S1.1", "S1.2", "R2.3", etc.
- `hl_only`: "True"/"False"
- 72 SL topics, 31 HL-only topics
- 17 topic groups across Structure (S1-S3) and Reactivity (R1-R2)

### Tab: Scores_ExamID / Breakdown_ExamID / Sheet11 / Sheet12
- Template tabs with headers only — not actively used in current code

---

## SCORING ENGINE DETAILS

### Band Lookup Logic (`findBand_()`)
1. Filter Grade_Bands by `scale`, `strand`, AND `level`
2. If no level-specific bands found, fall back to bands without level
3. Match: `min_points <= points <= max_points`
4. Return band number as string

### Recompute Flow (`recomputeExam_()`)
1. Get exam level (SL/HL) from Exams tab
2. Load grade bands, questions (by paper), rubrics, roster, responses
3. For each student:
   - Score Paper 1A (auto: compare mcq_choice to correct_answer)
   - Score Paper 1B (checklist/manual)
   - Score Paper 2 (checklist/manual)
   - Accumulate totals by strand (KU/TT/C) and paper (1A/1B/2)
   - Look up bands: IB_1_7 for overall, AISC_1_8 for each strand
4. Upsert to Scores_CurrentExam and Scores_AllExams
5. Replace TopicSkillBreakdown rows for this exam

### Checklist Scoring (`scoreChecklistOrManual_()`)
- Reads `detail_json` (array of checked item_ids)
- Supports explicit `checklist_mode` column on questions: "AND", "OR", or blank (auto-detect)
- Auto-detect logic: if rubric point sum > max_points → OR rubric
- OR: any checked item with valid item_id = full marks
- AND: sum checked items, cap at max_points
- Manual fallback: use `points_awarded` directly

---

## KEY DIFFERENCES FROM AP SYSTEM

| Dimension | AP Chemistry | IB Chemistry |
|-----------|--------------|--------------|
| Question types | MCQ, FRQ | Paper 1A, Paper 1B, Paper 2 |
| Overall scale | 1-5 (AP Band) | 1-7 (IB Grade) |
| Strand scale | AISC 1-8 | AISC 1-8 (same) |
| Level dimension | None (all students same) | SL vs HL (different questions, different bands) |
| Topic codes | 1.1.A.2, 2.3.A.1 | S1.1, S2.3, R1.2, R2.3 |
| Topic structure | 9 units, 79 topics | 2 categories (Structure/Reactivity), 17 groups, 103 topics |
| Scoring | MCQ auto + FRQ checklist/manual | 1A auto + 1B checklist/manual + P2 checklist/manual |
| Band lookup | Points-based, no level | Points-based, level-specific (SL/HL) |
| Students | 44 across 3 sections | 8 across 2 sections (SL/HL) |

---

## WEB APP MIGRATION PLAN

### Architecture Target

```
┌──────────────────────────────────────────────────┐
│ WebAppServer.gs (NEW)                            │
│ - doGet() → serves WebAppUi.html                 │
│ - Server-side role detection (teacher vs student) │
│ - Template injection (userData JSON)              │
│ - webapp_* endpoints (teacher-only gated)         │
│ - Reuses existing Api_ib.gs + Scoring_IB.gs      │
├──────────────────────────────────────────────────┤
│ WebAppUi.html (NEW)                              │
│ - Single-page app with hash-based routing        │
│ - Role-based tabs (teacher sees all, student sees │
│   Dashboard + Exams only)                        │
│ - CSS prefix per module (gr-, db-, co-, eb-, ev-)│
│ - IIFE modules per panel                         │
├──────────────────────────────────────────────────┤
│ Existing .gs files (KEEP, minimal changes)       │
│ - Db.gs (data layer — no changes needed)         │
│ - Api_ib.gs (add webapp_ wrappers with auth)     │
│ - Scoring_IB.gs (no changes needed)              │
│ - ReportData_IB.gs (no changes needed)           │
│ - ReportGenerator_IB.gs (no changes needed)      │
│ - Code.gs (keep sidebar, add doGet)              │
├──────────────────────────────────────────────────┤
│ Google Sheets (DATABASE — no schema changes)     │
│ - Config: add teacher_email, admin settings      │
│ - All other tabs: unchanged                      │
└──────────────────────────────────────────────────┘
```

### Authentication Pattern (from AP, proven)

```javascript
// In WebAppServer.gs
function doGet(e) {
  var email = Session.getActiveUser().getEmail().toLowerCase();
  var teacherEmail = getConfig_("teacher_email", "").toLowerCase();
  var userData;

  if (email === teacherEmail) {
    userData = { role: "teacher", email: email, displayName: "Teacher" };
  } else {
    // Check roster for student
    var roster = readAll_(SHEETS_.ROSTER);
    var student = roster.find(function(r) {
      return String(r.email || "").toLowerCase() === email;
    });
    if (student) {
      userData = {
        role: "student",
        student_key: String(student.student_key),
        class_section: student.class_section,
        displayName: student.first_name
      };
    } else {
      userData = { role: "none", email: email };
    }
  }

  var template = HtmlService.createTemplateFromFile("WebAppUi");
  template.userData = JSON.stringify(userData);
  return template.evaluate()
    .setTitle("IB Chemistry Assessment Tracker")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}
```

### Teacher View Tabs

1. **Grading** — Mark student work (Paper 1A grid, Paper 1B/2 checklist/manual)
2. **Exam Viewer** — Browse exam questions with chemistry notation
3. **Dashboard** — Student progress charts (Chart.js)
4. **Overview** — Class-level analytics with SL/HL filter
5. **Builder** — Create/edit exams, questions, rubrics
6. **Reports** — Generate Google Doc reports (batch)

### Student View Tabs

1. **Dashboard** — Personal scores, band charts, topic mastery
2. **Exams** — View past exam results (read-only)

### SL/HL in Teacher View

- **Combined default** with filter toggle to isolate SL or HL
- Filter applies to: Overview, Grading roster, Reports student list
- Level badge displayed next to exam selectors

---

## MCQ BULK LOAD FEATURE (NEW — not in AP)

### Requirements

The teacher needs to bulk-load Paper 1A questions for new exams. Three input formats:

#### Format 1: Paste Grid
```
ABDCEBADCB...
```
One letter per question in order. Auto-maps to 1A_01, 1A_02, etc.

#### Format 2: CSV Upload
```csv
number,answer,strand,topic
1,A,KU,S1.3.4
2,B,KU,S1.3.2
3,D,TT,R2.1
```

#### Format 3: Table Paste
```
1 | A | KU | S1.3.4
2 | B | KU | S1.3.2
3 | D | TT | R2.1
```
Pipe or tab-separated.

### Additional MCQ Bulk Load Fields (beyond answer key)

- `question_text`: Full question stem
- `option_a` through `option_e`: Answer choices
- `image_file_id`: Google Drive file ID for question image
- These are OPTIONAL — answer key + strand + topic are the minimum

### Implementation Approach

1. Backend endpoint: `webapp_bulkLoadPaper1A(examId, questionsArray)`
2. Frontend: Modal/panel in Builder tab with format detection
3. Parse input → preview table → confirm → save
4. Upsert to Questions tab with LockService
5. Auto-detect format from input content

---

## SPRINT BACKLOG

### Story 1: Web App Shell + Auth + Role Routing
Create `WebAppServer.gs` and `WebAppUi.html` with:
- `doGet()` with role detection
- Template injection of userData
- Hash-based routing
- Teacher tabs (6) and student tabs (2)
- Header with user info and role badge
- Empty panel placeholders for each tab
- Config: `teacher_email` in Config tab

### Story 2: Student Dashboard
Student-facing dashboard showing:
- Current exam scores (total, per-strand, per-paper)
- Band display (IB grade + AISC strand bands)
- Topic mastery by IB topic group (Structure/Reactivity hierarchy)
- Chart.js visualizations (band radar chart, topic bar chart)
- Multi-exam trend view from Scores_AllExams

### Story 3: Student Exam Viewer
Read-only exam results for students:
- Paper 1A: MCQ results table (your answer vs correct, ✓/✗)
- Paper 1B + Paper 2: Question-by-question with earned/possible
- Rubric criteria with checked/unchecked indicators
- Topic tags with curriculum descriptions

### Story 4: Teacher Class Overview
Teacher-facing analytics:
- Band distribution tables (IB grade + strand bands)
- SL/HL filter toggle (combined default)
- Per-student score table (sortable)
- Click student → detail modal (future story)
- Export-ready data

### Story 5: Teacher Grading Panel
Migrate sidebar marking to web app:
- Paper 1A batch entry grid (paste or click)
- Paper 1B/2 checklist marking with rubric display
- Student selector with class filter
- Save + recompute workflow
- Existing response pre-population

### Story 6: Exam Builder Panel
Migrate sidebar builder to web app:
- Create new exam form (with level SL/HL)
- Paper 1A count + answer key table
- Paper 1B/2 question tree builder
- Rubric editor for checklist questions
- Grade band configuration per exam

### Story 7: MCQ Bulk Load
New feature (not in AP):
- Multi-format input (paste letters, CSV, table)
- Format auto-detection
- Preview table before save
- Support for question_text + options + images (optional)
- Validation: correct_answer required, strand required, topic recommended

### Story 8: Reports Integration
Migrate report generation:
- Generate Google Doc reports from web app
- Folder creation
- Batch generation with progress
- Preview single student data

### Story 9: Exam Visibility Manager
Control which exams students can see:
- Teacher toggle per exam per student/class
- Students only see visible exams
- Bulk visibility controls

### Story 10: Polish + Error Handling
- Loading spinners for all data operations
- Empty states for all panels
- Error boundaries with retry
- Mobile-responsive layout
- KaTeX chemistry notation rendering

---

## STORY 1 DETAIL: Web App Shell + Auth + Role Routing

### User Story
As a teacher, I want to access the IB Chemistry grading tool via a web app URL so that students can also see their own results without needing sidebar access.

### Acceptance Criteria

1. `doGet()` serves WebAppUi.html with userData injected server-side
2. Teacher identified by `teacher_email` in Config tab → role: "teacher"
3. Students identified by email match in Roster/Students tab → role: "student"
4. Unknown users see "Access Denied" message with instructions
5. Teacher sees 6 tabs: Grading, Exam Viewer, Dashboard, Overview, Builder, Reports
6. Student sees 2 tabs: Dashboard, Exams
7. Hash-based routing works (#grading, #dashboard, etc.)
8. Header shows: app title, user display name, role badge, level indicator
9. No loading spinner needed (userData injected at template render)
10. All teacher-only `webapp_*` endpoints check role server-side (403 if student)

### Out of Scope
- Actual panel content (just empty placeholder panels)
- Any data fetching beyond auth
- Sidebar changes (keep existing sidebar working)
- Portability features (Create/Attach backend)

### Files Created/Modified

| File | Action | Notes |
|------|--------|-------|
| `WebAppServer.gs` | CREATE | doGet(), auth, webapp_ endpoint wrappers |
| `WebAppUi.html` | CREATE | SPA shell, routing, empty panels |
| `Code.gs` | MODIFY | Add doGet() reference (or keep in WebAppServer.gs) |
| `Config tab` | MODIFY | Add teacher_email row |

### Auth Endpoint Pattern
```javascript
// Every teacher-only endpoint follows this pattern:
function webapp_someTeacherAction(payload) {
  var email = Session.getActiveUser().getEmail().toLowerCase();
  var teacherEmail = getConfig_("teacher_email", "").toLowerCase();
  if (email !== teacherEmail) {
    throw new Error("Access denied: teacher only");
  }
  // ... actual logic
}
```

### Test Plan

| # | Test | Expected |
|---|------|----------|
| 1 | Open web app as teacher | See 6 tabs, role badge "Teacher" |
| 2 | Open web app as student (in roster) | See 2 tabs, role badge "Student", display name |
| 3 | Open web app as unknown user | See "Access Denied" |
| 4 | Navigate via hash (#dashboard) | Correct panel shows |
| 5 | Student tries teacher endpoint | 403 error |
| 6 | Browser refresh preserves hash | Same panel loads |

### Definition of Done
- [ ] doGet() serves HTML with injected userData
- [ ] Role detection works for teacher, student, unknown
- [ ] 6 teacher tabs and 2 student tabs render correctly
- [ ] Hash routing navigates between panels
- [ ] Teacher endpoint gating returns 403 for students
- [ ] No secrets/IDs in frontend code
- [ ] Existing sidebar still works (no breaking changes)

---

## IMPORTANT: STUDENT EMAIL SETUP

The current Roster tab does NOT have email addresses filled in (email column is blank for all students). Before student login works, Matthew needs to:

1. Add student emails to the Students/Roster tab
2. Set `teacher_email` in Config tab

This is a data entry task, not a code task. The web app should handle missing emails gracefully (show "Contact your teacher" message).

---

## DEPLOYMENT NOTES

### Google Apps Script Constraints
- No local emulator — must deploy to test
- ES5 JavaScript only (no const/let in older runtimes, but V8 runtime supports modern JS)
- `google.script.run` for client→server calls (async, no Promises)
- `HtmlService.createTemplateFromFile()` for server-side template injection
- Single HTML file per web app (inline CSS + JS, or `include()` pattern)
- 6-minute execution timeout for server functions
- CacheService: 100KB per key, 25MB total, string values only

### Build/Deploy Workflow
1. Edit in Apps Script web IDE (or clasp push from local)
2. Deploy → New deployment → Web app
3. Execute as: "User accessing the web app" (for Session.getActiveUser())
4. Who has access: "Anyone within [school domain]"
5. Test via deployment URL
6. Report results back for iteration

### File Size Management
- WebAppUi.html will be large (all CSS + JS inline)
- Use IIFE modules with CSS prefix per panel to avoid conflicts
- Minimize redundant code — share utility functions

---

## EXISTING API ENDPOINTS (from Api_ib.gs)

These are the current server-side functions called by the sidebar. The web app will call the same functions, wrapped with auth checks where needed.

### Read-only (safe for students)
```
api_bootstrap()                         → {exams, active_exam_id, classes}
api_getExams()                          → [{exam_id, exam_name, ...}]
api_getActiveExam()                     → {active_exam_id}
api_getClasses()                        → ["SL", "HL"]
api_getExamLevel(examId)                → {level: "SL"|"HL"}
api_getQuestions(examId)                → [{qid, paper, strand, ...}]
api_getGradeBands(examId)               → [{scale, strand, band, min/max_points}]
api_getExamTotals(examId)               → {overall_possible, ku_possible, ...}
api_getStudentReportData(examId, sk)    → {exam, student, scores, paper details, topics}
```

### Teacher-only (must gate in web app)
```
api_createExam(exam)                    → creates exam row
api_setActiveExam(examId)               → updates Config
api_setPaper1ACount(payload)            → creates/resizes Paper 1A questions
api_savePaper1ATable(payload)           → saves answer keys + strand/topic tags
api_addPaperRoot(payload)               → adds Paper 1B/2 root question
api_addPaperPart(payload)               → adds sub-part to Paper 1B/2
api_savePaperParts(payload)             → saves strand/topic edits
api_replaceRubricItems(payload)         → replaces rubric for a question
api_saveGradeBands(payload)             → saves grade boundaries + recomputes
api_savePaper1ABatch(payload)           → saves MCQ responses for a student
api_saveResponse(payload)               → saves single response
api_recomputeExam(examId, class)        → recomputes all scores
api_generateStudentReport(...)          → generates Google Doc
api_generateBatchReports(...)           → batch report generation
api_createExamReportFolder(examId, name)→ creates Drive folder for reports
api_listPaperRoots(examId, paper)       → lists root questions for paper
api_getPaperParts(examId, paper)        → lists parts for paper
api_getChecklistQids(examId)            → lists checklist-type question IDs
api_getRubricItems(examId, qid)         → gets rubric items for a question
api_getPaper1ATable(examId)             → gets Paper 1A questions for builder
api_getRosterByClass(cls)               → gets students filtered by class
api_getPaperQuestionRenderModel(examId, paper) → gets questions + rubrics for marking UI
api_getBandDistributions(examId, cls)   → gets band distribution counts for overview
api_getStudentsForReports(examId, cls)  → gets student list for report generation
```

### Per-student (gate: student can only see own data)
```
api_getStudentPaper1AChoices(examId, sk) → {qid: "A", ...}
api_getExistingResponse(examId, sk, qid) → {points_awarded, detail_json, ...}
api_getResponses(examId, class)          → all responses for exam/class
```

---

## CSS NAMING CONVENTIONS (from AP, proven pattern)

Each panel/module uses a unique prefix to avoid CSS conflicts in the single-file app:

| Module | Prefix | Panel ID |
|--------|--------|----------|
| Grading | `gr-` | `panel-grading` |
| Exam Viewer | `ev-` | `panel-exam-viewer` |
| Dashboard | `db-` | `panel-dashboard` |
| Overview | `co-` | `panel-overview` |
| Builder | `eb-` | `panel-builder` |
| Reports | `rp-` | `panel-reports` |
| Student Dashboard | `sd-` | `panel-student-dashboard` |
| Student Exams | `se-` | `panel-student-exams` |

---

## AGENT INSTRUCTIONS FOR CLAUDE CODE

### Before writing ANY code:
1. Read ALL existing .gs files to understand data flow
2. Identify which existing functions to reuse vs wrap
3. Plan the doGet() auth flow
4. Plan the WebAppUi.html structure (panels, routing, CSS)

### Implementation order:
1. Create WebAppServer.gs (doGet + auth + endpoint wrappers)
2. Create WebAppUi.html (shell + routing + empty panels)
3. Test auth flow manually
4. Fill in panels one story at a time

### Key reminders:
- `google.script.run.withSuccessHandler(fn).withFailureHandler(fn).functionName(args)` — this is the ONLY way to call server from client in Apps Script
- `createTemplateFromFile` injects server data ONCE at page load — use this for userData, never for dynamic data
- Hash routing: `window.location.hash` + `hashchange` event
- No npm, no build tools, no modules — everything is inline in one HTML file
- Test every change by deploying and opening the URL

### What NOT to change:
- Db.gs — works perfectly, do not touch
- Scoring_IB.gs — works perfectly, do not touch
- ReportData_IB.gs — works perfectly, do not touch
- ReportGenerator_IB.gs — works perfectly, do not touch
- Sidebar.html — keep working as-is (teacher still uses it)

### What to change minimally:
- Code.gs — may need `doGet()` if not in WebAppServer.gs
- Api_ib.gs — add `webapp_` wrappers with auth, do not modify original functions

---

## SCHOOL POLICY: NO PERCENTAGES AS GRADES

Percentages must NOT appear as grades anywhere in the student-facing UI. Points format: "X/Y pts". Status indicators (✓, ⚠, ✗) calculated internally from thresholds but percentage values are never displayed. Percentages are ONLY acceptable in trend charts with explanatory framing about topic mastery progress.

---

## DATA INTEGRITY NOTES

- Some exams may have impossible strand totals (earned > possible) due to data entry errors — handle gracefully
- `student_key` is numeric (1-8) stored as numbers in sheets but compared as strings in code — always use `String()`
- `ap_topic` column in TopicSkillBreakdown actually stores IB topic codes — legacy naming from AP fork
- `ap_band` column in Scores_CurrentExam is vestigial from AP — always empty for IB
- Grade_Bands uses point-based thresholds, NOT percentage-based
- Config tab has dual-column format (key/value + setting_key/setting_value) — both work

---

## APPENDIX: IB CHEMISTRY CURRICULUM STRUCTURE

```
Structure (S):
  S1: Models of the particulate nature of matter
    S1.1 - S1.5 (subtopics with individual understandings)
  S2: Models of bonding and structure
    S2.1 - S2.4
  S3: Classification of matter
    S3.1 - S3.2

Reactivity (R):
  R1: What drives chemical reactions?
    R1.1 - R1.4
  R2: How much, how fast, and how far?
    R2.1 - R2.3
  R3: What are the mechanisms of chemical change?
    (not yet in exam data)

Total: 17 topic groups, 103 topics (72 SL + 31 HL-only)
```

---

## APPENDIX: AISC HOLISTIC BAND LANGUAGE

The system uses AISC (AIS Chennai) holistic descriptors for strand bands 1-8. These are stored in `ReportData_IB.gs` as `AISC_LANGUAGE` constant. Key pattern:

- Bands 7-8: "exemplary" / "highly effective"
- Bands 5-6: "proficient" / "mainly effective"
- Bands 3-4: "underdeveloped" / "generally effective"
- Bands 1-2: "superficial" / "inaccurate"

Each strand (KU, TT, C) has its own descriptor set. These appear in student reports and should appear in the student dashboard.
