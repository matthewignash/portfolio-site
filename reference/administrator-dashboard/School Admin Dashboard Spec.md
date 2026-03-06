# School Admin Operations Dashboard — Project Specification

## Project Overview

A modular, tabbed web application built as a Google Apps Script web app with an HTML/CSS/JavaScript frontend and Google Sheets backend. Designed for a medium-sized international school (30–80 staff, 5–10 admins) to centralize strategic planning, staff observations, change management, accreditation preparation, and professional growth tracking.

**Deployment:** Google Apps Script Web App (deployed as "Execute as: User accessing the web app")
**Backend:** Google Sheets (structured as relational tables), architected with a Data Access Layer (DAL) for future migration to Firebase/Cloud SQL
**APIs:** Google Sheets API, Google Drive API, Google Docs API (for export)
**Auth:** Google OAuth via Apps Script session (`Session.getActiveUser()`)
**Target Users:** School administrators (5–10), with read-only or limited views for staff (~30–80)

---

## Architecture Principles

### Data Access Layer (DAL)
All data operations MUST go through a centralized `DataService` class. No module should directly call `SpreadsheetApp` or `Sheets API`. This enables future backend migration.

```javascript
// server/DataService.gs
class DataService {
  // All methods return/accept plain objects, never Sheets-specific types
  static getRecords(tableName, filters = {}) { ... }
  static getRecordById(tableName, id) { ... }
  static createRecord(tableName, data) { ... }
  static updateRecord(tableName, id, data) { ... }
  static deleteRecord(tableName, id) { ... }
  static query(tableName, { filters, sort, limit, offset }) { ... }
}
```

### Sheets Schema Convention
Each "table" is a separate sheet tab within a single Google Spreadsheet. Row 1 = headers. Column A = unique ID (UUID generated via `Utilities.getUuid()`). All dates stored as ISO 8601 strings. A `_meta` sheet tracks schema version for migrations.

### Frontend Architecture
- Single-page app with tab-based navigation
- Each module is a self-contained HTML template loaded via `HtmlService.createTemplateFromFile()`
- Shared component library for common UI elements (cards, modals, forms, tables)
- CSS framework: Tailwind CSS via CDN (or custom lightweight CSS if CDN not viable in Apps Script sandbox)
- Mobile-responsive design, especially for observation entry forms

### Caching Strategy
- Use `CacheService.getScriptCache()` for frequently read data (staff list, timetable)
- Cache TTL: 5 minutes for volatile data, 30 minutes for reference data
- Invalidate on write operations

### Error Handling
- All `google.script.run` calls wrapped in promise-based utility with `.withSuccessHandler()` and `.withFailureHandler()`
- User-facing error messages (not raw stack traces)
- Server-side logging to a `_logs` sheet for debugging

---

## Sheets Database Schema

### Reference Tables

#### `staff` — Staff Directory
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | string | Google account email (used for auth matching) |
| first_name | string | |
| last_name | string | |
| role | enum | teacher, admin, support, specialist |
| department | string | e.g., Science, Math, Elementary |
| employment_status | enum | full-time, part-time, contract |
| hire_date | date | |
| is_active | boolean | Soft delete flag |

#### `timetable` — Master Teaching Schedule
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| staff_id | UUID | FK → staff |
| day_of_week | enum | MON, TUE, WED, THU, FRI |
| period | integer | Period number (1–8 or school-specific) |
| period_start_time | time | e.g., 08:00 |
| period_end_time | time | e.g., 08:45 |
| course_name | string | e.g., AP Chemistry |
| room | string | Room number/name |
| is_prep | boolean | True if this is a prep/free period |

### Module 1: Strategic Kanban

#### `kanban_boards`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | string | e.g., "2025-26 School Improvement Plan" |
| description | text | |
| created_by | UUID | FK → staff |
| created_at | datetime | |
| is_archived | boolean | |

#### `kanban_columns`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| board_id | UUID | FK → kanban_boards |
| title | string | e.g., Backlog, In Progress, Review, Done |
| position | integer | Sort order |
| color | string | Hex color code |
| wip_limit | integer | Optional work-in-progress limit |

#### `kanban_cards`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| board_id | UUID | FK → kanban_boards |
| column_id | UUID | FK → kanban_columns |
| title | string | Card title |
| description | text | Rich description / acceptance criteria |
| assigned_to | string | Comma-separated staff IDs |
| priority | enum | low, medium, high, critical |
| due_date | date | |
| labels | string | Comma-separated tags |
| position | integer | Sort order within column |
| created_by | UUID | FK → staff |
| created_at | datetime | |
| updated_at | datetime | |

#### `kanban_comments`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| card_id | UUID | FK → kanban_cards |
| author_id | UUID | FK → staff |
| content | text | |
| created_at | datetime | |

### Module 2: Learning Walks & Observations

#### `observations`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| observer_id | UUID | FK → staff (admin who observed) |
| teacher_id | UUID | FK → staff (teacher observed) |
| observation_date | datetime | Auto-captured timestamp |
| observation_type | enum | learning_walk, formal, informal, peer |
| duration_minutes | integer | |
| course_observed | string | |
| room | string | |
| tags | string | Comma-separated: e.g., differentiation, engagement, tech_use |
| student_engagement_rating | integer | 1–5 scale (optional quick rating) |
| instructional_strategy_rating | integer | 1–5 |
| environment_rating | integer | 1–5 |
| notes | text | Free-form observation notes |
| commendations | text | Strengths observed |
| recommendations | text | Growth areas |
| follow_up_needed | boolean | Flag for follow-up conversation |
| follow_up_date | date | Scheduled follow-up |
| follow_up_completed | boolean | |
| shared_with_teacher | boolean | Whether notes were shared |
| created_at | datetime | |

#### `observation_schedule` — Planned Observations
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| teacher_id | UUID | FK → staff |
| observer_id | UUID | FK → staff |
| planned_date | date | |
| planned_period | integer | |
| observation_type | enum | |
| status | enum | scheduled, completed, cancelled, rescheduled |
| linked_observation_id | UUID | FK → observations (after completion) |

### Module 3: Waterfall Project & Schedule Tracker

#### `projects`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | string | Project name |
| description | text | |
| owner_id | UUID | FK → staff |
| status | enum | planning, active, on_hold, completed |
| start_date | date | |
| target_end_date | date | |
| actual_end_date | date | |
| created_at | datetime | |

#### `project_phases`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | UUID | FK → projects |
| title | string | Phase name |
| description | text | |
| phase_order | integer | Sequential order (waterfall) |
| start_date | date | |
| end_date | date | |
| status | enum | not_started, in_progress, completed, blocked |
| depends_on_phase_id | UUID | FK → project_phases (dependency) |

#### `project_tasks`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| phase_id | UUID | FK → project_phases |
| project_id | UUID | FK → projects |
| title | string | |
| assigned_to | UUID | FK → staff |
| due_date | date | |
| status | enum | not_started, in_progress, completed, blocked |
| notes | text | |
| created_at | datetime | |
| updated_at | datetime | |

### Module 4: Change Management (Lippitt + Knoster)

#### `initiatives`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | string | Initiative name |
| description | text | |
| champion_id | UUID | FK → staff (initiative lead) |
| status | enum | proposed, active, stalled, completed, abandoned |
| start_date | date | |
| target_date | date | |
| created_at | datetime | |
| updated_at | datetime | |

#### `knoster_assessments` — Knoster Model Gap Analysis
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| initiative_id | UUID | FK → initiatives |
| assessed_by | UUID | FK → staff |
| assessed_at | datetime | |
| vision_score | integer | 1–5 rating |
| vision_notes | text | Evidence/commentary |
| skills_score | integer | 1–5 |
| skills_notes | text | |
| incentives_score | integer | 1–5 |
| incentives_notes | text | |
| resources_score | integer | 1–5 |
| resources_notes | text | |
| action_plan_score | integer | 1–5 |
| action_plan_notes | text | |
| consensus_score | integer | 1-5 (optional 6th element some models include) |
| consensus_notes | text | |
| predicted_risk | string | Auto-calculated: Confusion/Anxiety/Resistance/Frustration/False Starts |
| overall_readiness | integer | Calculated average |

#### `lippitt_phases` — Lippitt Phase Tracking
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| initiative_id | UUID | FK → initiatives |
| phase_number | integer | 1–7 |
| phase_name | string | Pre-populated: Diagnose, Assess Motivation, Assess Resources, Select Objectives, Choose Role, Maintain, Terminate |
| status | enum | not_started, in_progress, completed |
| entry_date | date | When phase was entered |
| completion_date | date | |
| key_actions | text | What was done in this phase |
| evidence | text | Supporting documentation notes |
| blockers | text | What's preventing phase completion |
| updated_by | UUID | FK → staff |
| updated_at | datetime | |

#### `initiative_stakeholders`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| initiative_id | UUID | FK → initiatives |
| staff_id | UUID | FK → staff |
| role | enum | champion, contributor, informed, affected |
| engagement_level | enum | supportive, neutral, resistant |
| notes | text | |

### Module 5: Accreditation Prep

#### `accreditation_frameworks`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | string | e.g., "CIS 2024", "WASC 2025" |
| description | text | |
| visit_date | date | Scheduled accreditation visit |
| status | enum | preparing, self_study, visit_scheduled, completed |
| created_at | datetime | |

#### `accreditation_standards`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| framework_id | UUID | FK → accreditation_frameworks |
| domain | string | Top-level category (e.g., "Governance", "Teaching & Learning") |
| standard_code | string | e.g., "A.1", "B.3.2" |
| standard_text | text | Full text of the standard |
| position | integer | Sort order |

#### `accreditation_evidence`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| standard_id | UUID | FK → accreditation_standards |
| title | string | Evidence document title |
| description | text | How this evidence supports the standard |
| drive_file_id | string | Google Drive file ID |
| drive_file_url | string | Direct link to file |
| file_type | string | doc, pdf, sheet, image, video, link |
| uploaded_by | UUID | FK → staff |
| uploaded_at | datetime | |
| status | enum | draft, under_review, approved, insufficient |
| reviewer_id | UUID | FK → staff |
| review_notes | text | |

#### `accreditation_narratives`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| standard_id | UUID | FK → accreditation_standards |
| narrative_text | text | Self-study narrative |
| author_id | UUID | FK → staff |
| version | integer | Version tracking |
| status | enum | draft, review, final |
| created_at | datetime | |
| updated_at | datetime | |

### Module 6: Staff Growth Plans

#### `growth_plans`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| staff_id | UUID | FK → staff |
| academic_year | string | e.g., "2025-26" |
| supervisor_id | UUID | FK → staff |
| status | enum | draft, active, mid_year_review, final_review, completed |
| created_at | datetime | |
| updated_at | datetime | |

#### `growth_goals`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| plan_id | UUID | FK → growth_plans |
| goal_text | text | SMART goal description |
| goal_category | string | e.g., instruction, assessment, leadership, professional |
| target_date | date | |
| status | enum | not_started, in_progress, achieved, modified, deferred |
| evidence_summary | text | |
| created_at | datetime | |
| updated_at | datetime | |

#### `growth_meetings`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| plan_id | UUID | FK → growth_plans |
| meeting_date | date | |
| meeting_type | enum | initial, check_in, mid_year, final, informal |
| attendees | string | Comma-separated staff IDs |
| notes | text | Discussion summary |
| action_items | text | |
| next_meeting_date | date | |
| created_by | UUID | FK → staff |
| created_at | datetime | |

#### `growth_evidence`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| goal_id | UUID | FK → growth_goals |
| title | string | |
| description | text | |
| drive_file_id | string | Google Drive file ID |
| drive_file_url | string | |
| uploaded_by | UUID | FK → staff |
| uploaded_at | datetime | |

---

## Module Specifications

### Module 1: Strategic Kanban Board

**Tab Label:** Strategic Plan
**Access:** Admin (full CRUD), Staff (read-only view)

#### Features
1. **Board selector** — Dropdown to switch between boards (e.g., by year or goal area)
2. **Column layout** — Drag-and-drop columns: Backlog → Planning → In Progress → Review → Done (customizable)
3. **Card creation** — Modal form: title, description, assignees (multi-select from staff), priority, due date, labels
4. **Card detail view** — Click to expand: full description, comment thread, activity log, linked Lippitt/Knoster initiative (optional)
5. **Card drag-and-drop** — Move between columns; updates `column_id` and `position` in Sheets
6. **Filters** — By assignee, priority, label, due date range
7. **Board analytics** — Cycle time, cards per status, overdue count, burndown chart (optional)
8. **WIP limits** — Visual warning when column exceeds its `wip_limit`

#### UI Notes
- Cards show: title, assignee avatar/initials, priority badge, due date (red if overdue)
- Drag-and-drop via HTML5 Drag and Drop API (no external library needed)
- Comment thread loads on card detail modal with auto-scroll to newest

#### Data Flow
- On load: `DataService.query('kanban_cards', { filters: { board_id }, sort: { column_id, position } })`
- On drag: `DataService.updateRecord('kanban_cards', cardId, { column_id: newCol, position: newPos })`
- Batch update positions for reordering

---

### Module 2: Learning Walks & Observation Tracker

**Tab Label:** Observations
**Access:** Admin (full CRUD + dashboards), Teachers (view own observations only)

#### Features
1. **Quick observation entry form** (mobile-optimized)
   - Teacher selector (dropdown with search)
   - Auto-populated: current date/time, observer (from session)
   - Quick rating scales (tap 1–5 for each dimension)
   - Tags (tap to select from predefined list)
   - Free-text notes (expandable textarea)
   - "Follow-up needed" toggle
   - Submit button with confirmation

2. **Observation dashboard** (desktop)
   - **Heat map grid**: Staff names (rows) × Weeks or Months (columns), color-coded by visit frequency
     - Green = visited recently (within policy window)
     - Yellow = approaching overdue
     - Red = overdue (not visited in X weeks — configurable threshold)
   - **Who needs a visit?** — Priority list sorted by days since last observation
   - **Visit frequency stats** — Total observations this term, average per teacher, distribution chart
   - **Filter by**: department, observation type, observer, date range

3. **Drop-in planner** (real-time timetable integration)
   - Select current day and period (or "right now" button that auto-detects)
   - Shows grid: all teachers currently teaching, their room, their course
   - Cross-references `observations` table to show days since last visit
   - Highlights recommended visits (longest gap, follow-up due, new teachers)
   - One-click "Start observation" pre-fills the quick entry form with teacher/course/room

4. **Individual teacher observation history**
   - Timeline view of all observations for a given teacher
   - Aggregate ratings over time (trend lines)
   - Tags word cloud or frequency chart
   - Linked to growth plan goals (Module 6)

5. **Scheduling**
   - Create planned observation calendar
   - Assign observers to teachers for formal observations
   - Email notification via MailApp when observation is scheduled
   - Status tracking: scheduled → completed → shared

#### Configurable Settings
- `observation_frequency_target`: Default 1 visit per 3 weeks per teacher
- `alert_threshold_days`: Days before a teacher is flagged as overdue
- `rating_dimensions`: Customizable labels for the 1–5 scales
- `predefined_tags`: List of observation focus tags

---

### Module 3: Waterfall Project & Schedule Tracker

**Tab Label:** Projects
**Access:** Admin (full CRUD), Assigned staff (view + update own tasks)

#### Features
1. **Project list view** — All active projects with status badges, owner, progress bar
2. **Gantt-style timeline** (simplified)
   - Horizontal bar chart: phases as bars on a time axis
   - Color-coded by status (not started = gray, in progress = blue, completed = green, blocked = red)
   - Dependencies shown as arrows between phase bars
   - Today line (vertical marker)
3. **Phase detail** — Click phase to see tasks, assigned staff, status
4. **Task management** — Within each phase: task list with assignee, due date, status, notes
5. **Staff availability overlay**
   - When assigning tasks or planning phase timelines, show staff teaching load from `timetable`
   - Highlight: "This person teaches 6/8 periods on Mondays — consider lighter assignment"
   - Useful for realistic workload distribution
6. **Project dashboard** — % complete per project, phases at risk (overdue/blocked), upcoming milestones
7. **Link to Kanban** — Option to push project milestones as Kanban cards for strategic visibility

#### Gantt Implementation Notes
- Build with HTML5 Canvas or CSS grid (no external charting library required)
- Horizontal scroll for long timelines
- Phase bars are clickable, not just decorative
- Keep it simple — this is not MS Project, it's a visibility tool

---

### Module 4: Change Management — Lippitt + Knoster Combined Tool

**Tab Label:** Change Management
**Access:** Admin only

#### Features
1. **Initiative registry** — List of all change initiatives with status, champion, dates
2. **Knoster Matrix Dashboard** (per initiative)
   - Visual grid: 5 (or 6) elements as columns
   - Each element shows its score (1–5) with color coding (1–2 = red, 3 = yellow, 4–5 = green)
   - Below each score: key notes/evidence
   - **Risk predictor row**: Based on lowest-scoring elements, display the predicted outcome
     - Missing Vision → Confusion
     - Missing Skills → Anxiety
     - Missing Incentives → Resistance
     - Missing Resources → Frustration
     - Missing Action Plan → False Starts
     - Missing Consensus → Sabotage (if using 6-element model)
   - Historical assessments viewable (track improvement over time)
   - "Re-assess" button to create a new assessment snapshot

3. **Lippitt Phase Tracker** (per initiative)
   - Visual pipeline/stepper: 7 phases displayed as horizontal steps
   - Current phase highlighted, completed phases checked off
   - Click into each phase to see: key actions taken, evidence, blockers, dates
   - Phase transition requires notes on what was accomplished
   - Warning if phase is entered without resolving Knoster gaps relevant to that phase

4. **Combined view** — Side-by-side or stacked: Knoster matrix above, Lippitt pipeline below, for a single initiative. This is the power view — you can see "we're in Phase 4 but Resources scored a 2, which explains why we're stalled."

5. **Stakeholder map** (per initiative)
   - List of stakeholders with role and engagement level
   - Visual: supportive (green), neutral (yellow), resistant (red)
   - Notes on each stakeholder's concerns or contributions
   - Track engagement level changes over time

6. **Initiative comparison** — Table view comparing multiple initiatives across Knoster scores, Lippitt phases, and status. Useful for leadership team meetings to prioritize.

#### Logic: Knoster Risk Calculation
```javascript
function calculateKnosterRisk(assessment) {
  const elements = [
    { name: 'Vision', score: assessment.vision_score, risk: 'Confusion' },
    { name: 'Skills', score: assessment.skills_score, risk: 'Anxiety' },
    { name: 'Incentives', score: assessment.incentives_score, risk: 'Resistance' },
    { name: 'Resources', score: assessment.resources_score, risk: 'Frustration' },
    { name: 'Action Plan', score: assessment.action_plan_score, risk: 'False Starts' },
  ];
  // If consensus is tracked:
  if (assessment.consensus_score) {
    elements.push({ name: 'Consensus', score: assessment.consensus_score, risk: 'Sabotage' });
  }
  const gaps = elements.filter(e => e.score <= 2);
  const warnings = elements.filter(e => e.score === 3);
  return { gaps, warnings, overallReadiness: average(elements.map(e => e.score)) };
}
```

---

### Module 5: Accreditation Preparation

**Tab Label:** Accreditation
**Access:** Admin (full CRUD), Staff (contribute evidence to assigned standards)

#### Features
1. **Framework setup** — Admin creates a framework, defines domains and standards (or imports from a pre-formatted Sheet)
2. **Standards tracker dashboard**
   - Accordion or tree view: Domain → Standards
   - Each standard shows: evidence count, narrative status, overall readiness (traffic light)
   - Filter by: domain, readiness status, assigned reviewer
   - Progress bar: % of standards with approved evidence + final narrative

3. **Evidence management** (per standard)
   - List of linked evidence documents
   - Upload button → Google Drive file picker integration (or paste Drive URL)
   - Each evidence item: title, description of relevance, status (draft/review/approved/insufficient)
   - Reviewer assignment and review notes
   - One-click to open file in Drive

4. **Narrative editor** (per standard)
   - Rich text area for self-study narrative
   - Version history (each save creates a new version)
   - Status workflow: Draft → Under Review → Final
   - Word count display (accreditation bodies often have limits)
   - Reviewer comments inline or as separate notes

5. **Document export**
   - **Export single standard**: Generates a Google Doc with standard text, narrative, and linked evidence list (with Drive links)
   - **Export full domain**: All standards in a domain compiled into one Doc
   - **Export complete self-study**: Full document with table of contents, all domains, standards, narratives, evidence appendix
   - **PDF conversion**: Convert any exported Doc to PDF via Drive API
   - **Evidence binder**: Creates a Google Drive folder structure mirroring the framework hierarchy, copies/links all evidence files into appropriate folders

6. **Visit preparation checklist**
   - Configurable checklist of tasks to complete before the visit
   - Assignable to staff members
   - Due dates and status tracking
   - Auto-generated from framework gaps (standards without sufficient evidence)

#### Google Drive Integration
```javascript
// Create folder structure for accreditation evidence
function createAccreditationFolders(frameworkId) {
  const parentFolder = DriveApp.createFolder('Accreditation - ' + frameworkName);
  domains.forEach(domain => {
    const domainFolder = parentFolder.createFolder(domain.name);
    standards.forEach(standard => {
      domainFolder.createFolder(standard.standard_code + ' - ' + standard.standard_text.substring(0, 50));
    });
  });
  return parentFolder.getId();
}

// Export self-study narrative to Google Doc
function exportStandardToDoc(standardId) {
  const doc = DocumentApp.create('Standard ' + standard.standard_code + ' Self-Study');
  const body = doc.getBody();
  body.appendParagraph(standard.standard_code + ': ' + standard.standard_text)
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(narrative.narrative_text);
  body.appendParagraph('Evidence').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  evidenceItems.forEach(item => {
    body.appendListItem(item.title + ' — ' + item.description)
        .setLinkUrl(item.drive_file_url);
  });
  return doc.getUrl();
}
```

---

### Module 6: Staff Growth Plans

**Tab Label:** Growth Plans
**Access:** Admin (view/edit all), Teachers (view/edit own plan)

#### Features
1. **Plan overview** (admin view)
   - Table: all staff with current plan status, supervisor, goal count, next meeting date
   - Filter by: department, status, supervisor
   - Highlight: plans overdue for check-in, plans without goals, plans in draft

2. **Individual plan view**
   - Header: staff name, academic year, supervisor, plan status
   - **Goals section**: List of SMART goals with category, target date, status, evidence summary
   - Add/edit/archive goals
   - Progress indicator per goal (status-based)
   - **Meetings log**: Chronological list of meetings with type, notes, action items
   - Add meeting notes (admin or teacher can contribute)
   - **Evidence portfolio**: Files linked from Drive per goal
   - Upload or link Drive files, describe relevance

3. **Meeting scheduler**
   - Quick-schedule next check-in with date and type
   - Optional: send calendar invite via CalendarApp
   - Reminder: flag plans that haven't had a check-in in X weeks

4. **Link to observations**
   - Pull in observation data (Module 2) for this teacher
   - Show how observation feedback connects to growth goals
   - Admin can tag specific observations as evidence for specific goals

5. **Export**
   - **Export individual plan**: Google Doc with:
     - Staff info header
     - Goals table (goal text, category, status, target date)
     - Evidence list per goal (with Drive links)
     - Meeting notes (chronological)
     - Supervisor signature line
   - **Export as PDF**: Convert Doc to PDF for HR filing
   - **Batch export**: Export all plans for a department or the whole school (creates folder in Drive with individual Docs/PDFs)

#### Export Template Structure
```
[School Name] Professional Growth Plan — [Academic Year]

Staff Member: [First Last]
Department: [Department]
Supervisor: [Supervisor Name]
Plan Status: [Status]

PROFESSIONAL GOALS
━━━━━━━━━━━━━━━━━
Goal 1: [Goal Text]
  Category: [Category]  |  Target: [Date]  |  Status: [Status]
  Evidence: [List of linked files]

Goal 2: ...

MEETING RECORD
━━━━━━━━━━━━━━
[Date] — [Type]
  Notes: [Text]
  Action Items: [Text]

OBSERVATION CONNECTIONS
━━━━━━━━━━━━━━━━━━━━━
[Date] — Observer: [Name]
  Relevant feedback: [Text]
  Linked to Goal: [Goal #]

________________________          ________________________
Staff Signature / Date            Supervisor Signature / Date
```

---

## Shared Components

### Navigation
- Top bar: App title, user info (name + role), notification bell
- Tab bar: Strategic Plan | Observations | Projects | Change Mgmt | Accreditation | Growth Plans
- Tabs visible based on user role (admin sees all; teacher sees Observations + Growth Plans)

### Common UI Components (build once, reuse across modules)
1. **StaffSelector** — Searchable dropdown of active staff
2. **DatePicker** — Inline date selector (native HTML5 `input[type=date]` is fine)
3. **Modal** — Reusable modal component with title, body slot, action buttons
4. **DataTable** — Sortable, filterable table with pagination
5. **StatusBadge** — Color-coded pill for status values
6. **RatingScale** — Tap/click 1–5 rating with visual stars or circles
7. **DriveFilePicker** — Google Picker API integration for selecting Drive files
8. **ExportButton** — Triggers server-side Doc/PDF generation, returns download link
9. **Toast/Notification** — Brief success/error messages
10. **LoadingSpinner** — For async operations

### Role-Based Access Control (RBAC)
```javascript
// server/AuthService.gs
class AuthService {
  static getCurrentUser() {
    const email = Session.getActiveUser().getEmail();
    return DataService.query('staff', { filters: { email, is_active: true } })[0];
  }
  
  static isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === 'admin';
  }
  
  static canViewModule(moduleName) {
    const adminOnly = ['change_management'];
    const staffModules = ['observations_own', 'growth_plans_own'];
    if (this.isAdmin()) return true;
    return staffModules.includes(moduleName + '_own');
  }
}
```

---

## Build Order (Modular Phases)

Each module should be independently buildable and testable. Dependencies noted.

### Phase 0: Foundation (MUST BUILD FIRST)
- [ ] Google Sheet creation with all table schemas (headers, validation, formatting)
- [ ] `DataService.gs` — Full CRUD data access layer
- [ ] `AuthService.gs` — User identification and role checking
- [ ] `CacheService.gs` — Caching wrapper
- [ ] `Utils.gs` — UUID generation, date formatting, email utilities
- [ ] Main `Code.gs` — `doGet()` entry point, HTML template routing
- [ ] Base HTML template: navigation shell, tab switching, shared CSS, shared JS utilities
- [ ] Shared UI components library
- [ ] Error handling and logging infrastructure
- [ ] Staff directory import utility (bulk import from existing spreadsheet)
- [ ] Timetable import utility (bulk import)

**Deliverable:** Working app shell that loads, authenticates user, shows tabs (even if empty), and can read/write to Sheets.

### Phase 1: Module 2 — Observations (highest standalone value)
- Depends on: Phase 0 (staff + timetable data)
- [ ] Quick observation entry form (mobile-responsive)
- [ ] Observation history view
- [ ] Heat map dashboard
- [ ] Drop-in planner (timetable integration)
- [ ] Observation scheduling
- [ ] Teacher's own observation view

### Phase 2: Module 1 — Strategic Kanban
- Depends on: Phase 0
- [ ] Board CRUD
- [ ] Column management
- [ ] Card CRUD with drag-and-drop
- [ ] Comments
- [ ] Filters and search
- [ ] Board analytics (optional)

### Phase 3: Module 6 — Growth Plans
- Depends on: Phase 0, Phase 1 (optional link to observations)
- [ ] Plan CRUD
- [ ] Goals management
- [ ] Meeting log
- [ ] Evidence linking (Drive integration)
- [ ] Export to Google Doc
- [ ] Export to PDF
- [ ] Batch export

### Phase 4: Module 3 — Waterfall Projects
- Depends on: Phase 0
- [ ] Project CRUD
- [ ] Phase and task management
- [ ] Gantt timeline visualization
- [ ] Staff workload overlay
- [ ] Optional: link milestones to Kanban

### Phase 5: Module 4 — Change Management
- Depends on: Phase 0
- [ ] Initiative registry
- [ ] Knoster assessment form and matrix visualization
- [ ] Lippitt phase tracker and stepper UI
- [ ] Combined view
- [ ] Stakeholder mapping
- [ ] Initiative comparison table

### Phase 6: Module 5 — Accreditation
- Depends on: Phase 0, Phase 3 (Drive integration patterns from Growth Plans export)
- [ ] Framework and standards setup
- [ ] Standards tracker dashboard
- [ ] Evidence management with Drive picker
- [ ] Narrative editor with versioning
- [ ] Document export (single standard, domain, full self-study)
- [ ] Drive folder structure generation
- [ ] Visit preparation checklist

---

## Non-Functional Requirements

### Performance
- Initial page load: < 3 seconds on school network
- Tab switch: < 1 second (cached data)
- Sheets API batch reads (use `getRange().getValues()` not cell-by-cell)
- Batch writes (collect changes, write once)
- Client-side rendering after initial data load

### Scalability Limits (Sheets Backend)
- Max ~50,000 rows per sheet before performance degrades
- Observation table grows fastest: ~80 teachers × 12 visits/year = ~960 rows/year (well within limits)
- Archive old academic years to separate sheets/spreadsheets annually

### Security
- All server functions check `AuthService` before returning data
- Teachers cannot access other teachers' growth plans or observations
- Admin functions wrapped in `AuthService.isAdmin()` guard
- No client-side data filtering for security — filter on server

### Browser Support
- Chrome (primary — school likely standardized on Chrome with Google Workspace)
- Safari (for mobile observations on iOS)
- Edge (secondary)

### Accessibility
- Keyboard navigable (tab order, enter to activate)
- ARIA labels on interactive elements
- Color is not the only indicator (use icons + color for status)
- Minimum touch target 44×44px for mobile observation forms

---

## Configuration Sheet (`_config`)

A settings sheet for admin-configurable values:

| Key | Default | Description |
|-----|---------|-------------|
| school_name | "International School" | Used in exports |
| academic_year | "2025-26" | Current year |
| observation_frequency_weeks | 3 | Target weeks between visits |
| observation_overdue_weeks | 5 | Weeks before red flag |
| growth_plan_checkin_weeks | 6 | Weeks between expected check-ins |
| periods_per_day | 8 | Number of teaching periods |
| period_times | "8:00,8:45,..." | Comma-separated start times |
| knoster_use_consensus | true | Include 6th element |
| admin_emails | "" | Comma-separated admin emails (backup role check) |
| drive_root_folder_id | "" | Root folder for exports |

---

## Future Migration Notes

When migrating from Sheets to Firebase/Cloud SQL:

1. Replace `DataService` internals only — all other code stays the same
2. `getRecords()` → Firestore `collection().get()` or SQL `SELECT`
3. `createRecord()` → Firestore `collection().add()` or SQL `INSERT`
4. Add real-time listeners for collaborative features (Kanban especially)
5. Add proper user auth via Firebase Auth (replace `Session.getActiveUser()`)
6. Move export functions to Cloud Functions if Apps Script execution time limits are hit
7. Consider Firestore for observations + kanban (high write frequency), keep Sheets for config + reference data during transition

---

## File Structure for Claude Code

```
/project-root
├── Code.gs                    # Main entry point, doGet(), routing
├── server/
│   ├── DataService.gs         # Data Access Layer
│   ├── AuthService.gs         # Authentication & RBAC
│   ├── CacheManager.gs        # Caching wrapper
│   ├── Utils.gs               # Shared utilities
│   ├── ExportService.gs       # Google Doc/PDF generation
│   ├── DriveService.gs        # Google Drive operations
│   ├── KanbanService.gs       # Module 1 business logic
│   ├── ObservationService.gs  # Module 2 business logic
│   ├── ProjectService.gs      # Module 3 business logic
│   ├── ChangeService.gs       # Module 4 business logic
│   ├── AccreditationService.gs # Module 5 business logic
│   └── GrowthPlanService.gs   # Module 6 business logic
├── client/
│   ├── index.html             # Main app shell
│   ├── css/
│   │   └── styles.html        # Wrapped in <style> for Apps Script include
│   ├── js/
│   │   ├── app.html           # Main app logic, routing, tab switching
│   │   ├── components.html    # Shared UI components
│   │   ├── api.html           # google.script.run wrapper / promise utility
│   │   └── utils.html         # Client-side utilities
│   └── modules/
│       ├── kanban.html        # Module 1 UI
│       ├── observations.html  # Module 2 UI
│       ├── projects.html      # Module 3 UI
│       ├── change-mgmt.html   # Module 4 UI
│       ├── accreditation.html # Module 5 UI
│       └── growth-plans.html  # Module 6 UI
└── setup/
    ├── SetupSheets.gs         # Creates/validates all sheet schemas
    └── SeedData.gs            # Optional demo data for testing
```

**Note for Claude Code:** In Google Apps Script, all `.gs` files are server-side and all `.html` files can contain HTML, CSS (in `<style>` tags), or JavaScript (in `<script>` tags). Use `HtmlService.createHtmlOutputFromFile()` or `createTemplateFromFile()` with `<?!= include('filename') ?>` for modular includes. There is no native module system — everything is global scope on the server side, and files are concatenated. Plan accordingly to avoid naming collisions (use service class patterns).
