# UDL / EAL / LS Architecture Handoff
**Last updated:** February 16, 2026
**Purpose:** Reference document for enhancing UDL, EAL/LS student support, and IB ATL features

---

## Table of Contents
1. [Feature Overview](#1-feature-overview)
2. [Data Model — Sheets & Schemas](#2-data-model)
3. [Backend Services](#3-backend-services)
4. [Frontend Components](#4-frontend-components)
5. [Data Flow & Integration Map](#5-data-flow)
6. [WIDA Framework Details](#6-wida-framework)
7. [ATL Framework Details](#7-atl-framework)
8. [UDL Strategy Library](#8-udl-strategy-library)
9. [Current Gaps & Enhancement Opportunities](#9-gaps)
10. [File Index](#10-file-index)

---

## 1. Feature Overview <a name="1-feature-overview"></a>

Three interconnected feature areas support differentiation and student learning needs:

### UDL (Universal Design for Learning)
- **Where it lives:** Lesson editor (4th accordion section) and UbD planner
- **What it does:** Teachers select differentiation strategies across 3 principles (Representation, Action & Expression, Engagement) when planning lessons. 24 preset strategies (8 per principle) plus custom text fields.
- **Data storage:** Strategies saved as arrays in `lessonDataJson.udl` on the Lessons sheet

### EAL/LS Student Support Profiles
- **Where it lives:** Roster modal (profile list + editor), hex editor (info bar), lesson editor (8th accordion section), Integrations tab (import card)
- **What it does:** Teachers create/import student profiles tracking IEP/504/WIDA/EAL accommodations, WIDA proficiency levels (0-6 scale with 4 domains), 10 standard accommodation flags, custom accommodations, and support strategies. Profiles surface as reminders when teachers plan lessons.
- **Data storage:** `StudentSupportProfiles` sheet (14 columns)

### IB ATL (Approaches to Learning) Student Tools
- **Where it lives:** Planner tab (ATL Toolkit panel, student-only)
- **What it does:** Students self-rate across 5 ATL categories (14 sub-skills total) on a 1-4 scale, write reflections, and set goals. Contextual tips appear based on task urgency and ATL tags on hexes. Teachers can view class ATL summaries.
- **Data storage:** `StudentATLProgress` sheet (9 columns)

---

## 2. Data Model <a name="2-data-model"></a>

### StudentSupportProfiles (14 columns)
| Column | Type | Description |
|--------|------|-------------|
| profileId | string | Auto-generated `ssp_xxxxx` |
| studentEmail | string | Student's email |
| studentId | string | External student ID (from ClassRoster) |
| profileType | enum | `IEP`, `504`, `WIDA`, `EAL`, `other` |
| widaOverallLevel | int | 0-6 (0 = not applicable) |
| widaDomainsJson | JSON | `{ listening, speaking, reading, writing }` each 0-6 |
| accommodationsJson | JSON | 10 boolean flags + custom array (see below) |
| supportStrategiesJson | JSON | `[{ strategy, source, active }]` |
| notes | string | Free text, max 1000 chars |
| isActive | boolean | Soft delete flag |
| createdBy | string | Teacher email |
| updatedBy | string | Teacher email |
| createdAt | ISO date | |
| updatedAt | ISO date | |

#### accommodationsJson structure
```json
{
  "extendedTime": true,
  "wordToWordDictionary": false,
  "sentenceStarters": true,
  "reducedWorkload": false,
  "preferentialSeating": true,
  "readAloud": false,
  "scribe": false,
  "visualSupports": true,
  "simplifiedLanguage": true,
  "translationSupport": false,
  "custom": ["Bilingual glossary", "Extra processing time"]
}
```

#### supportStrategiesJson structure
```json
[
  { "strategy": "Visual supports for all instructions", "source": "wida", "active": true },
  { "strategy": "Chunked reading passages", "source": "teacher", "active": true },
  { "strategy": "Pre-taught vocabulary", "source": "wida", "active": false }
]
```
- `source: "wida"` = auto-generated from WIDA level presets
- `source: "teacher"` = manually added by teacher
- Import preserves teacher strategies while replacing WIDA-sourced ones

### StudentATLProgress (9 columns)
| Column | Type | Description |
|--------|------|-------------|
| atlProgressId | string | Auto-generated |
| studentEmail | string | |
| atlCategory | string | `thinking`, `communication`, `social`, `selfManagement`, `research` |
| atlSubSkill | string | e.g., `criticalThinking`, `reading`, `collaboration` |
| rating | int | 1-4 (Beginning/Developing/Proficient/Extending) |
| reflectionNote | string | Max 300 chars |
| goalNote | string | Max 150 chars |
| updatedAt | ISO date | |
| term | string | e.g., `2026-T1` (Aug-Dec) or `2026-T2` (Jan-Jun) |

**Upsert key:** studentEmail + atlCategory + atlSubSkill + term

### External Import Spreadsheet: "Student Profiles" tab (20 columns)
```
studentId, studentEmail, profileType,
widaOverallLevel, widaListening, widaSpeaking, widaReading, widaWriting,
extendedTime, wordToWordDictionary, sentenceStarters,
reducedWorkload, preferentialSeating, readAloud,
scribe, visualSupports, simplifiedLanguage, translationSupport,
customAccommodations, notes
```
- Boolean fields accept: TRUE, true, yes, 1, x
- `customAccommodations`: comma-separated string

---

## 3. Backend Services <a name="3-backend-services"></a>

### UbDService.gs — UDL Strategies & UbD Planning

**UDL-specific functions:**
| Function | Purpose |
|----------|---------|
| `getUdlTemplate()` | Returns empty UDL structure: `{ representation: [], actionExpression: [], engagement: [] }` |
| `getUdlStrategies(principle)` | Returns 8 strategy strings for a given principle |
| `addUdlStrategyToHex(mapId, hexId, principle, strategy)` | Adds UDL strategy to a specific hex |

**UbD planning functions (unit-level):**
| Function | Purpose |
|----------|---------|
| `getUbdTemplate()` | Full UbD structure including `udl` field |
| `getUbdPlannerData()` | All courses/units with UbD completion % |
| `getUbdDataForUnit(unitId)` | Full UbD data for one unit |
| `saveUbdPlannerData(unitId, ubdData)` | Saves UbD data to map's `ubdDataJson` |
| `validateUbdData(ubdData)` | Returns `{ valid, errors, warnings }` |
| `generateUbdReport(mapId)` | Full UbD report with hex-stage mapping |
| `exportUbdToDoc(mapId)` | Exports to Google Doc |

**Essential Questions & Stages:**
| Function | Purpose |
|----------|---------|
| `addEssentialQuestion(mapId, question)` | Add EQ (string or `{ question, type }`) |
| `removeEssentialQuestion(mapId, index)` | Remove EQ by index |
| `getSuggestedEssentialQuestions(subject, topic)` | Template-based suggestions (science/math/language/history) |
| `assignHexToStage(mapId, hexId, stage)` | Assign hex to UbD stage (stage1/stage2/stage3) |
| `getHexesByStage(mapId, stage)` | Get hexes in a stage |

### LessonService.gs — Lesson Plans with UDL

| Function | Purpose |
|----------|---------|
| `getLessonTemplate()` | Includes `udl: { representation: [], actionExpression: [], engagement: [] }` |
| `getLessonPlan(hexId)` | Returns stored lesson or empty template |
| `saveLessonPlan(mapId, hexId, lessonPlan)` | Saves to hex |
| `getActivityTemplates(type)` | Opening (4), main (5), closing (4) activity templates |
| `getFormativeAssessmentStrategies()` | 7 strategies with name, description, timing |

### StudentSupportService.gs — Support Profiles & Accommodations

| Function | Access | Purpose |
|----------|--------|---------|
| `getClassSupportProfiles(classId)` | Teacher (owns class) or admin | Returns all active profiles for a class |
| `getStudentSupportProfile(studentEmail)` | Teacher (has student) or admin | Returns single profile or null |
| `saveStudentSupportProfile(profileData)` | Teacher or admin | Create/update (upserts on profileId) |
| `updateStudentStrategies(profileId, strategies)` | Teacher or admin | Update strategy list only |
| `deactivateProfile(profileId)` | Teacher or admin | Soft delete (isActive=false) |
| `getAccommodationReminders(mapId)` | Teacher or admin | Traces map->classes->profiles, groups by accommodation type |

**getAccommodationReminders return shape:**
```javascript
{
  reminders: [
    { type: 'extendedTime', label: 'Extended Time', students: ['Name'], count: 1 }
  ],
  widaStudents: [
    { name: 'Student A', level: 3, strategies: ['Sentence starters...'] }
  ],
  totalStudentsWithProfiles: 5,
  classNames: ['Period 1 Chemistry', 'Period 3 Biology']
}
```

**Accommodation labels (10 standard types):**
```
Extended Time, Word-to-Word Dictionaries, Sentence Starters,
Reduced Workload, Preferential Seating, Read Aloud,
Scribe, Visual Supports, Simplified Language, Translation Support
```

### SupportImportService.gs — External Spreadsheet Import

| Function | Purpose |
|----------|---------|
| `getSupportDataConfig()` | Returns `{ enabled, spreadsheetUrl, lastImported }` |
| `saveSupportDataConfig(config)` | Save enable/disable + URL |
| `testSupportDataConnection()` | Test connection, check for "Student Profiles" tab |
| `initializeSupportSpreadsheet()` | Create required tabs in external sheet |
| `importSupportProfiles()` | Batch import with upsert (matches on studentId or email) |

**Import behavior:**
- Upserts on `studentId` OR `studentEmail`
- Auto-generates WIDA preset strategies from level
- Preserves teacher-edited strategies (source='teacher'), replaces WIDA-sourced ones
- Writes import log to external spreadsheet
- Returns: `{ imported, updated, skipped, errors }` counts

### ATLService.gs — IB Approaches to Learning

| Function | Access | Purpose |
|----------|--------|---------|
| `getATLProgress([studentEmail])` | Student (own) or teacher/admin | Returns `{ categories, progress, email }` |
| `saveATLRating(category, subSkill, rating, reflectionNote, goalNote, term)` | Student | Upsert per student+category+subSkill+term |
| `getATLSuggestions(atlTags)` | Any | Contextual tips matching ATL skill tags |
| `getContextualTaskTips(taskStats)` | Any | Situational tips based on overdue/due counts |
| `getClassATLSummary(classId)` | Teacher/admin | Per-category averages, students needing support |
| `getATLFramework()` | Any | Returns ATL_FRAMEWORK constant |

---

## 4. Frontend Components <a name="4-frontend-components"></a>

### Lesson Editor — UDL Section (4th accordion)
- **File:** Scripts-Courses.html
- **Section ID:** `lsnSec-udl`
- **CSS prefix:** `lsn-`
- **Key functions:**
  - `loadLessonReferenceData(callback)` — loads strategies from backend (cached in `lessonUdlStrategiesCache`)
  - `renderUdlChips(principle, selected)` — renders clickable chips in `#lsnChips-{principle}`
  - `toggleUdlChip(el)` — toggles `.selected` class
  - `updateUdlBadge()` — updates count badge `#lsnUdlBadge`
  - `getSelectedUdlStrategies(principle)` — returns array of selected strategy strings
- **3 principle containers:** `#lsnChips-representation`, `#lsnChips-actionExpression`, `#lsnChips-engagement`
- **Custom text fields:** `#lsnUdlCustom-representation`, `#lsnUdlCustom-actionExpression`, `#lsnUdlCustom-engagement`

### Lesson Editor — Accommodation Reminders (8th accordion)
- **File:** Scripts-Courses.html
- **Section ID:** `lsnSec-accommodations`
- **CSS prefix:** `ssp-`
- **Badge:** `#lsnAccommodationCount`
- **Content:** `#lsnAccommodationsContent`
- **Key functions:**
  - `loadLessonAccommodationReminders()` — traces unit->map->classes->profiles
  - `renderAccommodationReminders(data)` — summary bar, grouped chips, WIDA cards

### Hex Editor — Support Profile Info Bar
- **File:** Scripts-MapBuilder.html
- **Element ID:** `#sspHexInfoBar`
- **CSS class:** `.ssp-hex-info-bar`
- **Behavior:** Amber bar showing "X students with support profiles" — teacher-only, cached per map in `hexSupportProfileCache`

### Support Profile List Overlay
- **File:** Scripts-StudentSupport.html
- **Overlay ID:** `#sspProfileListOverlay`
- **Entry point:** Roster modal button
- **Key functions:**
  - `loadSupportProfiles(classId)` — RPC to `getClassSupportProfiles`
  - `renderSupportProfileList()` — builds profile cards
  - `buildSspProfileCard(profile, idx)` — individual card with type badge, WIDA badge, accommodation chips

### Support Profile Editor Modal
- **File:** Scripts-StudentSupport.html
- **Overlay class:** `.ssp-editor-overlay` (injected via JS, z-index 1100)
- **6 editor sections:**
  1. Student Information (email, studentId, profile type dropdown)
  2. WIDA Proficiency (overall level 0-6, 4-domain grid: listening/speaking/reading/writing)
  3. Accommodations (10 toggle chips + custom text input)
  4. Support Strategies (list with source badges, toggle active, add/remove)
  5. Notes (1000 char textarea)
  6. Footer (deactivate, cancel, save buttons)
- **Key functions:**
  - `openSspEditor(profileIndex)` — null=new, index=edit
  - `onSspWidaLevelChange()` — fetches preset strategies for new level
  - `toggleSspAccom(key)` — toggles accommodation flag
  - `renderSspStrategyList()` — renders strategy rows with source badges
  - `addSspStrategy()` / `removeSspStrategy(idx)` — CRUD
  - `saveSspProfile()` — validates + RPC to `saveStudentSupportProfile`

### ATL Toolkit Panel (Planner tab, student-only)
- **File:** Scripts-ATLToolkit.html
- **Panel ID:** `#atlToolkitPanel`
- **Container:** `#atlToolkitContainer`
- **CSS prefix:** `atl-`
- **CSS file:** Styles-ATLToolkit.html

**4 sections rendered top-to-bottom:**

**1. Contextual Tips** (`renderATLTips()`)
- Sources tips from overdue tasks (red card), many-due tasks (amber), ATL-tagged hexes (green)
- Keyword matching: thinking, communication, social, selfManagement, research
- Dismissable per session

**2. Deadline Timeline** (`renderATLTimeline()`)
- 10 nearest tasks with due dates, horizontal scroll
- Color-coded: red (overdue), amber (today), blue (this week), gray (later)

**3. Weekly Check-In** (`renderATLWeeklyCheckin()`)
- Shows on Fridays or if student has zero ratings
- Rotates through 5 categories on a weekly cycle

**4. ATL Self-Tracker** (`renderATLTracker()`)
- Term selector dropdown
- 5 expandable category cards (thinking, communication, social, selfManagement, research)
- Each card shows summary dots (colored by rating 1-4) and last reflection preview
- Expanded: sub-skill rows with 4-button rating bar, reflection textarea (300 char), goal textarea (150 char)
- Per-category save button — loops RPC calls for each rated sub-skill

**Key state variables:**
- `atlProgressData` — student's ratings from backend
- `atlFramework` — 5 categories with sub-skills
- `atlCurrentTerm` — computed: Aug-Dec=T1, Jan-Jun=T2
- `atlExpandedCategory` — currently open card
- `atlSelectedRatings` — `{ 'category.subSkill': { rating, reflectionNote, goalNote } }`

### Integrations Tab — Support Import Card
- **File:** Scripts-SupportImport.html
- **Container:** `#supportImportCardContainer`
- **Key functions:**
  - `loadSupportImportCard()` — loads config from backend
  - `renderSupportImportCard(config)` — enable toggle, URL input, 4 action buttons
  - `testSupportConnection()` — tests external spreadsheet access
  - `initSupportSpreadsheet()` — creates tabs in external sheet
  - `importSupportData()` — batch import with result summary

---

## 5. Data Flow & Integration Map <a name="5-data-flow"></a>

### How support profiles reach the teacher during lesson planning:
```
External Spreadsheet  ──import──>  StudentSupportProfiles sheet
       OR
Teacher in-app editor  ──save──>  StudentSupportProfiles sheet
                                          |
                                          v
Teacher opens hex editor ──> getAccommodationReminders(mapId)
                                          |
                       ┌──────────────────┼──────────────────┐
                       v                  v                  v
              MapAssignments       ClassRoster        StudentSupportProfiles
              (mapId -> classIds)  (classId -> emails)  (email -> profile)
                       |                  |                  |
                       └──────────────────┼──────────────────┘
                                          v
                              Grouped by accommodation type
                              WIDA students with strategies
                                          |
                       ┌──────────────────┼──────────────────┐
                       v                                     v
              Hex Editor Info Bar                  Lesson Editor 8th Section
              "5 students with profiles"           Grouped chips + WIDA cards
```

### How ATL connects to the planner:
```
Hex Curriculum (atlSkills field)
         |
         v
PlannerService.gs  ──>  task.atlSkills (comma-separated)
         |
         v
ATL Toolkit Panel (student view)
  - Reads plannerTasks for contextual tips
  - Matches atlSkills keywords to ATL categories
  - Shows category-specific advice
  - Self-tracker writes to StudentATLProgress sheet
```

### What does NOT connect (by design):
- Support profiles do NOT affect progress tracking, scoring, or branching
- ATL ratings are separate from hex progress
- Accommodations are informational — teachers manually incorporate them
- No dashboard integration for support profiles or ATL data
- No feature flags to enable/disable support or ATL features

---

## 6. WIDA Framework Details <a name="6-wida-framework"></a>

### Levels (0-6)
| Level | Label | Descriptor |
|-------|-------|------------|
| 0 | N/A | Not applicable |
| 1 | Entering | Lowest proficiency |
| 2 | Emerging | |
| 3 | Developing | |
| 4 | Expanding | |
| 5 | Bridging | |
| 6 | Reaching | Highest proficiency |

### Domains
Four language domains, each rated 0-6 independently:
- **Listening**
- **Speaking**
- **Reading**
- **Writing**

### Auto-Generated Preset Strategies by Level

**Level 1 (Entering):** 6 strategies
- Native language support when possible
- Picture dictionaries and visual glossaries
- Total Physical Response (TPR) activities
- Gestures and body language for comprehension
- Labeled visuals and diagrams
- Pre-taught vocabulary with images

**Level 2 (Emerging):** 6 strategies
- Bilingual dictionaries available
- Sentence frames for academic language
- Visual supports for all instructions
- Word banks for writing tasks
- Simplified instructions with fewer steps
- Extended wait time for responses

**Level 3 (Developing):** 6 strategies
- Sentence starters for academic writing
- Graphic organizers for content processing
- Pre-teach key vocabulary before lessons
- Adapted reading texts at appropriate level
- Bilingual glossary for content terms
- Note-taking templates

**Level 4 (Expanding):** 6 strategies
- Academic language glossary
- Annotation tools for complex texts
- Discussion scaffolds for academic discourse
- Content-specific vocabulary lists
- Sentence models for complex structures
- Peer partnerships for academic tasks

**Level 5 (Bridging):** 5 strategies
- Nuanced vocabulary support
- Text complexity scaffolds
- Peer collaboration opportunities
- Writing checklists for self-editing
- Self-monitoring comprehension strategies

**Level 6 (Reaching):** 4 strategies
- Independent learning strategies
- Peer mentoring opportunities
- Advanced vocabulary extension
- Self-directed research skills

---

## 7. ATL Framework Details <a name="7-atl-framework"></a>

### Categories & Sub-Skills (5 categories, 14 sub-skills total)

| Category | Sub-Skills |
|----------|-----------|
| **Thinking** | Critical Thinking, Creative Thinking, Transfer |
| **Communication** | Reading, Writing, Speaking, Listening |
| **Social** | Collaboration |
| **Self-management** | Organization, Affective/Mindfulness, Reflection |
| **Research** | Information Literacy, Media Literacy |

### Rating Scale
| Rating | Label |
|--------|-------|
| 1 | Beginning |
| 2 | Developing |
| 3 | Proficient |
| 4 | Extending |

### ATL Tips Library (backend ATL_TIPS constant)

**Thinking (3 tips):**
- Try looking at this from a different perspective
- Use a thinking routine (e.g., See-Think-Wonder)
- Pause and identify what you already know vs. what you need to learn

**Communication (3 tips):**
- Start by outlining your main points before writing
- Try annotating as you read to track your thinking
- Practice active listening by summarizing what others say

**Social (3 tips):**
- Assign clear roles when working in groups
- Use "I" statements to share your perspective respectfully
- Check in with your team regularly on progress

**Self-management (4 tips):**
- Try the Pomodoro technique: 25 min focus + 5 min break
- Set a specific goal for this work session
- Break the task into the smallest possible next step
- Use the 2-minute rule: if it takes <2 min, do it now

**Research (3 tips):**
- Start by listing what you need to find out
- Use the CRAAP test to evaluate sources (Currency, Relevance, Authority, Accuracy, Purpose)
- Keep a research log to track your sources and findings

**Overdue tasks (2 tips):**
- Use the 2-minute rule: start with the smallest task
- Prioritize: which task has the biggest impact if done first?

**Many due today (2 tips):**
- Prioritize by urgency and importance
- Focus on completing one task fully before starting the next

**No progress (2 tips):**
- Start with the easiest task to build momentum
- Set a 10-minute timer and just begin — momentum will follow

---

## 8. UDL Strategy Library <a name="8-udl-strategy-library"></a>

### Representation (The "What") — 8 strategies
1. Visual aids and diagrams
2. Audio recordings and read-aloud
3. Text-to-speech tools
4. Multiple examples and non-examples
5. Highlighting key information
6. Vocabulary pre-teaching
7. Video and multimedia
8. Graphic organizers

### Action & Expression (The "How") — 8 strategies
1. Choice in format of expression
2. Scaffolding and templates
3. Speech-to-text tools
4. Progress monitoring tools
5. Multiple submission methods
6. Assistive technology options
7. Collaboration opportunities
8. Self-assessment checklists

### Engagement (The "Why") — 8 strategies
1. Student choice and autonomy
2. Real-world connections
3. Collaborative learning structures
4. Immediate and specific feedback
5. Goal-setting support
6. Varied difficulty levels
7. Cultural relevance
8. Gamification elements

### Storage
Selected strategies saved as string arrays per principle in `lessonDataJson.udl`:
```json
{
  "representation": ["Visual aids and diagrams", "Vocabulary pre-teaching"],
  "actionExpression": ["Choice in format of expression"],
  "engagement": ["Student choice and autonomy", "Real-world connections"],
  "customRepresentation": "Additional custom notes...",
  "customActionExpression": "",
  "customEngagement": ""
}
```

---

## 9. Current Gaps & Enhancement Opportunities <a name="9-gaps"></a>

### No Dashboard Integration
- Support profile data and ATL ratings do not surface in Progress tab, Course Analytics, or Knowledge Gap dashboards
- Teachers can only see support info in hex editor and lesson editor contexts

### No Automated Differentiation
- Accommodations are informational only — they remind teachers but don't modify content, scoring, or branching
- No accommodation-based branch conditions exist

### No Feature Flags
- Support profiles and ATL are always-on (no admin toggle in Settings)

### Limited ATL-Task Integration
- Planner tasks carry `atlSkills` from hex curriculum but the planner doesn't filter or group by ATL category
- No analytics correlating ATL self-ratings with hex performance

### Formative Assessment Strategies (LessonService.gs)
Currently 7 strategies: Observation, Questioning, Think-Aloud, Whiteboard Responses, Four Corners, Misconception Check, Self-Assessment. Could be expanded.

### Activity Templates (LessonService.gs)
- Opening: 4 templates (Think-Pair-Share, Quick Write, KWL Chart, Review Quiz)
- Main: 5 templates (Direct Instruction, Guided Practice, Lab Activity, Collaborative Groups, Jigsaw)
- Closing: 4 templates (Exit Ticket, 3-2-1, Thumbs Up/Down, One-Minute Paper)

---

## 10. File Index <a name="10-file-index"></a>

### Backend (.gs files)
| File | Role |
|------|------|
| `UbDService.gs` | UbD planning, UDL strategies, essential questions, stage assignment, export |
| `LessonService.gs` | Lesson plan CRUD, activity templates, formative strategies |
| `StudentSupportService.gs` | Profile CRUD, accommodation reminders, WIDA presets |
| `SupportImportService.gs` | External spreadsheet import/export |
| `ATLService.gs` | ATL framework, progress tracking, tips, class summary |
| `CourseService.gs` | Lesson CRUD with standardIds, lessonDataJson storage |
| `PlannerService.gs` | Attaches atlSkills to task objects |
| `Config.gs` | Sheet names (STUDENT_SUPPORT_PROFILES, STUDENT_ATL_PROGRESS) |
| `Code.gs` | Schema definitions for both sheets |

### Frontend (.html files)
| File | Role | CSS Prefix |
|------|------|-----------|
| `Scripts-Courses.html` | Lesson editor UDL chips + accommodation reminders | `lsn-` |
| `Scripts-StudentSupport.html` | Profile list overlay + editor modal | `ssp-` |
| `Scripts-ATLToolkit.html` | ATL self-tracker + tips + timeline | `atl-` |
| `Scripts-SupportImport.html` | Integrations tab import card | `int-` |
| `Scripts-MapBuilder.html` | Hex editor support info bar | `ssp-` |
| `Scripts-Planner.html` | Planner with ATL panel container | `pln-` |
| `Scripts-Core.html` | State vars, ATL panel visibility | — |
| `Styles-Lessons.html` | Lesson editor accordion + chip styles | `lsn-` |
| `Styles-StudentSupport.html` | Profile cards, editor, info bar, reminders | `ssp-` |
| `Styles-ATLToolkit.html` | ATL cards, tips, timeline, rating bars | `atl-` |
| `Styles-Responsive.html` | ATL responsive rules (phone breakpoint) | — |
| `Index.html` | All containers, modals, includes | — |

### Sheets
| Sheet | Purpose |
|-------|---------|
| `StudentSupportProfiles` | IEP/504/WIDA/EAL profile data |
| `StudentATLProgress` | Student ATL self-ratings per term |
| `Lessons` | Lesson plans with UDL data in lessonDataJson |
| `ClassRoster` | studentId field (added for support profiles) |
| `MapAssignments` | Links maps to classes (enables accommodation tracing) |

---

*This document is a snapshot. The main project handoff is at `Claude Project Handoff.md` in the same folder.*
