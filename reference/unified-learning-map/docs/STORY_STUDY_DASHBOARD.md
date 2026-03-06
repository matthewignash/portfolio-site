# Story: Student Study Dashboard

> **Priority:** 1 (Highest)
> **Epic:** Student Tools
> **Estimated Sessions:** 8–12 (phased)
> **Dependencies:** Maps, Progress, Courses/Units must be functional
> **Target User:** Students

---

## Overview

A dedicated study hub accessible from the student view that consolidates study strategies, timers, task management, and topic navigation into one place. The goal is to teach students *how* to study — not just *what* to study — by embedding strategy templates and tutorials directly into the learning environment.

### Problem Statement

Students often don't know how to study effectively. They open their materials and stare at them, or they re-read notes passively. Meanwhile, their learning maps contain structured topic paths with linked resources, but there's no bridge between "here's the content" and "here's how to engage with it." This dashboard bridges that gap.

---

## User Stories

### Core

```
AS A student
I WANT TO access a study dashboard from my learning map
SO THAT I have a structured place to plan and execute study sessions
```

```
AS A student
I WANT TO choose from study strategy templates (Cornell Notes, Pomodoro, Retrieval Practice, etc.)
SO THAT I learn effective study techniques and can apply them immediately
```

```
AS A student
I WANT TO see my topics organized by learning map with links to resources
SO THAT I can quickly navigate to what I need to study
```

```
AS A student
I WANT TO create and manage a study task list
SO THAT I can track what I've reviewed and what still needs attention
```

```
AS A student
I WANT TO read short tutorials on each study strategy
SO THAT I understand WHY and HOW to use each technique before trying it
```

### Extended

```
AS A student
I WANT TO use a built-in focus timer (Pomodoro-style)
SO THAT I can time my study sessions without switching to another app
```

```
AS A student
I WANT TO see my progress across maps in the study dashboard
SO THAT I know which areas need the most attention
```

```
AS A teacher
I WANT TO see which study strategies my students are using
SO THAT I can coach them on effective study habits
```

---

## Feature Breakdown

### 1. Dashboard Home View

The landing page when a student opens the study dashboard.

**Sections:**
- **Quick Stats** — Hexes completed vs. total across assigned maps, streak/last study date
- **My Study Tasks** — Active task list with checkboxes, add/remove
- **Recent Maps** — Cards for each assigned learning map with completion percentage
- **Strategy Picker** — Grid of study strategy cards (see section 3)

**Layout:** Full-width panel or dedicated tab/view (not a sidebar — needs space)

### 2. Topic Navigator

Pulls from the student's assigned learning maps to create a study-friendly topic index.

**For each map:**
- Map title + unit context (Course → Unit breadcrumb)
- List of hexes grouped by type (Core first, then Ext, then Scaffolds)
- Each hex shows: icon, label, progress status, resource link (if any)
- Click hex → opens resource in new tab (same as current behavior)
- Filter/search within topics

**Data Source:** Same as `getStudentMaps()` — uses existing assignment and map data

### 3. Study Strategy Templates

Pre-built templates that guide students through specific study techniques. Each template has:

- **Name & Icon**
- **Quick Description** (1–2 sentences)
- **Tutorial Section** (expandable, explains the WHY and HOW)
- **Interactive Template** (the actual tool/worksheet)

**Included Strategies:**

| Strategy | Template Type | Description |
|----------|--------------|-------------|
| **Cornell Notes** | Structured note form | Cue column, notes column, summary row. Student fills in per-topic. |
| **Retrieval Practice** | Self-quiz generator | Student writes questions from memory, then checks against resources. |
| **Pomodoro Focus** | Timer + task list | 25-min focus / 5-min break cycles with task tracking. |
| **Spaced Repetition Planner** | Calendar/schedule view | Suggests review dates based on when topics were first studied. |
| **Feynman Technique** | Text area with prompts | "Explain [topic] as if teaching a younger student." Structured reflection. |
| **Mind Map / Concept Map** | Simple node-link canvas | Drag-and-drop concept mapping (simple version). |
| **SQ3R Reading** | Guided reading form | Survey → Question → Read → Recite → Review steps for a linked resource. |
| **Practice Problems** | Problem set template | Teacher can pre-load problems; student works through them. |

### 4. Study Task Manager

A simple, persistent task list for study planning.

**Features:**
- Add task (free text + optional link to a hex/map)
- Mark complete / uncomplete
- Delete task
- Tasks persist across sessions (stored in Progress sheet or dedicated StudyTasks sheet)
- Optional: due date field
- Optional: link task to a specific hex → clicking goes to that resource

**Data Storage Options:**
- New `StudyTasks` sheet tab: `taskId | studentEmail | mapId | hexId | text | completed | dueDate | createdAt`
- Or: JSON blob in a student preferences column (simpler, less queryable)

### 5. Tutorials / How-To Section

Each study strategy card has an expandable tutorial that teaches the student the technique.

**Tutorial Structure:**
1. **What is it?** (1 paragraph)
2. **Why does it work?** (2–3 sentences, cite cognitive science simply)
3. **How to do it** (step-by-step, 4–6 steps)
4. **Tips for Chemistry/Science** (subject-specific advice)
5. **Common mistakes** (what NOT to do)

**Content Source:** Can be hardcoded initially. Later, teacher could customize per course.

**Reference:** The Cornell Notes + NotebookLM guide we previously created can be adapted for the Cornell Notes tutorial.

---

## Phased Implementation Plan

### Phase 1: Dashboard Shell + Topic Navigator (2–3 sessions)
- New view/tab accessible from student mode
- Dashboard home layout with stats cards
- Topic navigator pulling from assigned maps
- Basic navigation and resource linking

### Phase 2: Study Task Manager (1–2 sessions)
- Task CRUD (add, complete, delete)
- Persistence (backend storage)
- Link tasks to hexes (optional)

### Phase 3: Strategy Templates — Static (2–3 sessions)
- Strategy picker grid
- Cornell Notes template (interactive form)
- Retrieval Practice template
- Pomodoro timer integration (see Timer story)
- Feynman Technique template

### Phase 4: Tutorials + Remaining Strategies (2–3 sessions)
- Tutorial content for each strategy
- SQ3R, Spaced Repetition, Mind Map templates
- Teacher analytics on strategy usage (stretch)

---

## Technical Considerations

### Backend
- **New service:** `StudyService.gs` or extend `ProgressService.gs`
- **New sheet tab (optional):** `StudyTasks` for persistent task storage
- **Read-only for maps:** Dashboard reads from existing Maps/Progress data, no new writes to maps
- **Student-scoped:** All queries filtered by `Session.getActiveUser().getEmail()`

### Frontend
- **New view mode:** Add `'study'` to the view mode options in the main app
- **Component structure:**
  - `StudyDashboard` (container)
  - `StudyTopicNav` (map/hex browser)
  - `StudyTaskManager` (task list)
  - `StudyStrategyPicker` (strategy grid)
  - `StudyTemplate_Cornell`, `StudyTemplate_Retrieval`, etc. (individual templates)
  - `StudyTutorial` (expandable tutorial component)
- **Responsive:** Should work on student laptops (1366x768 minimum)

### Data Flow
```
Student opens Study Dashboard
  → Fetches assigned maps (existing getStudentMaps)
  → Fetches progress (existing getProgressForUserAndMap per map)
  → Fetches study tasks (new getStudyTasks)
  → Renders dashboard with all data
```

---

## Acceptance Criteria

- [ ] Student can access study dashboard from student view
- [ ] Dashboard shows quick stats (completion across maps)
- [ ] Topic navigator lists all assigned maps and their hexes
- [ ] Clicking a hex resource link opens it in a new tab
- [ ] Study task list supports add, complete, and delete
- [ ] Tasks persist across browser sessions (backend storage)
- [ ] At least 3 study strategy templates are functional
- [ ] Each strategy has a tutorial section explaining the technique
- [ ] Pomodoro/focus timer is integrated (can reference Timer story)
- [ ] Dashboard is student-only (not visible in teacher/builder mode)
- [ ] No PII leakage — student sees only their own data
- [ ] LockService used for any write operations

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Error states handled (no maps assigned, no progress yet, empty tasks)
- [ ] Loading states shown during data fetch
- [ ] Works on 1366x768 screen resolution
- [ ] PROJECT_STATUS.md updated
- [ ] Commit message provided

---

## Open Questions for Implementation

1. **Architecture decision:** New HTML endpoint (`doGet` with `?page=study`) or new tab within existing `Index-WithHexGrid.html`? Claude Code should evaluate based on current frontend size and complexity.
2. **Strategy content:** Should tutorials be hardcoded in the frontend or stored in a Config/Content sheet for teacher customization?
3. **Mind Map template:** Is a simple canvas-based concept mapper worth the complexity, or should we link out to a tool like Google Drawings?
4. **Teacher visibility:** Should teachers see a read-only version of student study dashboards, or is this purely student-facing initially?
