# Learning Map System — EAL & Learning Support Features Overview

> **Purpose**: Reference document for researching further enhancements to EAL (English as an Additional Language) and LS (Learning Support / Special Education Needs) features.
>
> **Last updated**: February 26, 2026

---

## Table of Contents

1. [Student Support Profiles](#1-student-support-profiles)
2. [WIDA Integration Points](#2-wida-integration-points)
3. [Translation & Vocabulary System](#3-translation--vocabulary-system)
4. [UDL (Universal Design for Learning)](#4-udl-universal-design-for-learning)
5. [Cornell Notes — WIDA Sentence Frames](#5-cornell-notes--wida-sentence-frames)
6. [ATL (Approaches to Learning) Tools](#6-atl-approaches-to-learning-tools)
7. [Differentiated Learning Paths](#7-differentiated-learning-paths)
8. [Self-Assessment & Student Agency](#8-self-assessment--student-agency)
9. [Student Onboarding & UX](#9-student-onboarding--ux)
10. [Projector Mode — Classroom Display](#10-projector-mode--classroom-display)
11. [Accessibility (WCAG 2.1)](#11-accessibility-wcag-21)
12. [Celebrations & Motivation](#12-celebrations--motivation)
13. [Study Dashboard](#13-study-dashboard)
14. [Lab Report Scaffolding](#14-lab-report-scaffolding)
15. [Architecture Summary](#15-architecture-summary)
16. [Current Gaps & Research Directions](#16-current-gaps--research-directions)

---

## 1. Student Support Profiles

The system maintains per-student profiles that capture WIDA proficiency data, accommodations, and learning strategies. Profiles can be created in-app by teachers or bulk-imported from an external protected spreadsheet (e.g., school SEN/EAL database).

### Profile Data

| Field | Details |
|-------|---------|
| **Profile Type** | IEP, 504, WIDA, EAL, other |
| **WIDA Overall Level** | 0-6 scale (Entering → Bridging → Reaching) |
| **WIDA Domains** | Listening, Speaking, Reading, Writing (each 0-6) |
| **Accommodations** | 10 standard flags (see below) + custom free-text |
| **Strategies** | Array of {strategy, source, active} — auto-populated by WIDA level + teacher-editable |
| **Home Languages** | Array of language codes (14 supported) |
| **Notes** | Free-text teacher notes |

### 10 Standard Accommodations

1. Extended time
2. Word-to-word dictionary
3. Sentence starters
4. Reduced workload
5. Preferential seating
6. Read aloud
7. Scribe
8. Visual supports
9. Simplified language
10. Translation support

### WIDA Preset Strategies (auto-populated by level)

| WIDA Level | Bracket | Auto-Suggested Strategies |
|------------|---------|---------------------------|
| 1-2 | Entering/Emerging | TPR activities, picture dictionaries, labeled visuals, gestures, native language support |
| 3-4 | Developing/Expanding | Sentence frames, graphic organizers, word banks, simplified text, peer collaboration |
| 5-6 | Bridging/Reaching | Academic vocabulary focus, text complexity scaffolds, peer collaboration, self-monitoring |

### External Data Import

Teachers can connect a protected Google Sheets spreadsheet containing school-maintained SEN/WIDA records. The system imports on demand, matching students by ID or email, and preserves any teacher-edited strategies during import.

---

## 2. WIDA Integration Points

WIDA proficiency data flows into **6 system touchpoints**:

### 2.1 Lesson Planning — Accommodation Reminders
When a teacher opens the hex editor, an amber info bar shows: "X students with support profiles." Expanding reveals:
- Grouped accommodation chips (e.g., "3 students need extended time")
- WIDA student cards with 4-domain mini-bars (L/S/R/W proportional to level/6)
- Top 3 strategies per student

### 2.2 Differentiation — Auto-Suggest Groups
The "Suggest Groups" button in the group manager reads class WIDA data and creates 4 bracket groups:
- **WIDA 1-2** (red) — Entering/Emerging
- **WIDA 3-4** (amber) — Developing/Expanding
- **WIDA 5-6** (green) — Bridging/Reaching
- **No Profile** (cyan) — Students without WIDA data

### 2.3 Prompt Builder — UDL Strategy Selection
The prompt builder maps WIDA brackets to UDL strategy recommendations:
- **Low (1-2)**: Rich visual supports, scaffolded practice, collaborative learning
- **Mid (3-4)**: Vocabulary support, graphic organizers, self-assessment checklists
- **High (5-6)**: Highlighting critical features, minimal scaffolding, learner autonomy

Suggested strategies appear with an amber dashed border in the UDL selector; teacher-confirmed strategies get a solid teal border.

### 2.4 Cornell Notes — Sentence Frames by Level
When a student with a WIDA profile opens Cornell Notes, sentence frames appropriate to their level are auto-injected (see Section 5).

### 2.5 Group Analytics — WIDA Distribution
Group analytics cards include a mini-bar showing the WIDA level distribution within each group (4-segment colored bar: red/amber/green/cyan).

### 2.6 Teacher Support Dashboard
The Support Insights sub-tab in Progress shows per-student cards with WIDA badges, accommodation icons, and strategy usage tracking (assigned vs. actually used).

---

## 3. Translation & Vocabulary System

### 14 Supported Languages

| Code | Language | Flag |
|------|----------|------|
| ja | Japanese | 🇯🇵 |
| ko | Korean | 🇰🇷 |
| fr | French | 🇫🇷 |
| ta | Tamil | 🇮🇳 |
| zh | Chinese | 🇨🇳 |
| es | Spanish | 🇪🇸 |
| ar | Arabic | 🇸🇦 |
| hi | Hindi | 🇮🇳 |
| vi | Vietnamese | 🇻🇳 |
| tl | Filipino | 🇵🇭 |
| pt | Portuguese | 🇵🇹 |
| ru | Russian | 🇷🇺 |
| de | German | 🇩🇪 |
| it | Italian | 🇮🇹 |

### How Translation Works

- **Engine**: Google's built-in `LanguageApp.translate()` (Google Apps Script native — no API key needed)
- **Auto-Translation on Save**: When a teacher saves a vocabulary term, the system auto-translates the term and definition into all 14 languages and caches results
- **Teacher Overrides**: Teachers can manually correct auto-translations (stored separately, never overwritten by re-translation)
- **Phonetic/IPA**: Pronunciation data from dictionary API lookups is persisted and displayed

### Vocabulary Structure

Vocabulary exists at two levels:
- **Unit-level**: Shared across all hexes in a UBD unit
- **Hex-level**: Specific to individual activities

Each entry includes: term, definition, context sentence, category (10 types), display mode, phonetic pronunciation, translations object, and override history.

### Student Dictionary Panel

- Shows all vocabulary for the current map
- Smart language filtering: only shows the student's home languages + languages with existing translations (avoids a 14-button overload)
- Expandable translation rows per term
- Phonetic pronunciation displayed in italic below the term

### Projector Mode Translation

The projector sidebar "Translate" tab translates **all lesson content** (not just vocabulary):
- Learning Intentions + Success Criteria
- Essential Questions
- Vocabulary terms + definitions

Display format: original text (small, gray, italic) + translated text (large, white, bold) — optimized for classroom projection readability. Includes a custom text translator for ad-hoc phrases.

---

## 4. UDL (Universal Design for Learning)

### Framework

3 principles, each with teacher-selectable strategies:

| Principle | Focus | Color |
|-----------|-------|-------|
| **Representation** | How students perceive and understand information | Blue |
| **Action & Expression** | How students demonstrate what they know | Green |
| **Engagement** | How students stay motivated and self-regulate | Amber |

### Storage

UDL strategies are stored per hex in `hex.lessonPlan.udl` as arrays of strategy strings per principle. Bidirectional sync: saving in the lesson editor propagates to the hex, and vice versa.

### WIDA-Informed Pre-Selection

When a teacher opens the UDL selector for a hex, the system checks the assigned class's WIDA profile data and **pre-selects suggested strategies** based on the dominant WIDA bracket. These appear with a visual distinction (amber dashed border = suggested, solid teal = confirmed by teacher).

### Key Language Use

Per-hex dropdown: narrate / inform / explain / argue — saved to `hex.curriculum.keyLanguageUse`. Informs the prompt builder's language scaffolding recommendations.

### Display Points

- **Hex Grid**: "U{count}" badge shows how many UDL strategies are configured
- **Projector Sidebar**: UDL Strategies section with colored dots per principle + strategy pills
- **Prompt Builder Output**: UDL strategies woven into the generated teaching prompt

---

## 5. Cornell Notes — WIDA Sentence Frames

### How It Works

When a student with a WIDA profile opens the Cornell Notes tool on a hex, the system auto-injects **sentence frames appropriate to their WIDA level** alongside the standard SBAR-based question cues.

### Sentence Frames by Level

| WIDA Level | Bracket | Example Frames |
|------------|---------|----------------|
| 1-2 | Entering/Emerging | "I see that...", "The main idea is...", "This is about...", "I learned that...", "An important word is..." |
| 3-4 | Developing/Expanding | "I noticed that... because...", "The evidence shows that...", "This is similar to... because...", "One difference is...", "I can conclude that..." |
| 5-6 | Bridging/Reaching | "This challenges the assumption that...", "Drawing on the evidence, I would argue...", "The relationship between... and... suggests...", "A limitation of this approach is..." |

### Visual Distinction

- **Question cues**: Amber dashed chips
- **Sentence frames**: Teal dashed chips with "✏️ Sentence starters to help you write:" label
- Students without EAL profiles see question cues only (no sentence frames)

### SBAR-Based Question Cues

The system also generates subject-specific question cues based on the hex's SBAR domain tags:
- **KU** (Knowledge/Understanding): "What are the key facts?", "How would you define...?"
- **TT** (Thinking/Transfer): "How could you apply this?", "What steps are involved?"
- **C** (Communication): "How does this relate to...?", "What patterns do you notice?"

---

## 6. ATL (Approaches to Learning) Tools

### 5 ATL Categories

| Category | Sub-Skills | Icon |
|----------|-----------|------|
| **Thinking** | Critical thinking, Creative thinking, Transfer | 🧠 |
| **Communication** | Active listening, Presenting, Writing | 💬 |
| **Social** | Collaboration, Conflict resolution, Leadership | 🤝 |
| **Self-Management** | Organization, Time management, Reflection | 📋 |
| **Research** | Information literacy, Media literacy, Ethical research | 🔍 |

### Student ATL Toolkit

Students access the ATL Toolkit in their Planner tab. It includes:

1. **Contextual Tips**: Auto-generated based on task status (overdue tips, many-due-today strategies, no-progress encouragement)
2. **Deadline Timeline**: Visual timeline of upcoming due dates
3. **Weekly Check-In**: Rotating category focus for self-reflection
4. **ATL Self-Tracker**: 5 expandable cards — students rate themselves 1-4 on sub-skills, write reflections and goals
5. **Server-Sourced Tips**: Backend-generated tips based on task statistics and ATL tags on hexes

### Teacher Analytics

The Competency & ATL sub-tab in Progress shows:
- 5 ATL category bars on a 1-4 scale with respondent counts
- Color-coded thresholds (green ≥3.0, amber ≥2.0, red <2.0)
- Students needing support list (lowest ATL scores)
- Participation rate tracking

---

## 7. Differentiated Learning Paths

### Three Differentiation Modes

| Mode | Behavior |
|------|----------|
| **Off** | All students see all hexes (default) |
| **Hidden** | Non-assigned hexes are invisible to students |
| **Dimmed** | Non-assigned hexes are grayed out and non-clickable |

### Group-Based Assignment

Teachers create groups within classes, assign students to groups, and assign hexes to groups. Students only see hexes assigned to their group(s) based on the differentiation mode.

- Max 20 groups per class
- 8 preset group colors
- Per-student overrides possible (show/hide individual hexes)
- Groups can be auto-suggested from WIDA data (see Section 2.2)

### Lesson Map Cascade

When a parent map uses differentiation and a lesson hex links to a child lesson map, the visibility cascades: if the parent lesson hex is hidden from a student, the entire child lesson map is also hidden.

### Group Analytics

The Group Insights sub-tab shows:
- Per-group overview cards with WIDA distribution bars
- Group comparison bars (sorted by completion, with class average reference line)
- Hex assignment coverage (gaps warnings for groups with 0 assigned hexes)

---

## 8. Self-Assessment & Student Agency

### Confidence Rating

4-point scale matching the IB ATL framework:
1. **Beginning** — "I'm just starting to understand this"
2. **Developing** — "I understand some of this"
3. **Proficient** — "I understand this well"
4. **Extending** — "I could teach this to someone"

### Student Features

- **Confidence rating** on each hex they've started (4-bar visual selector)
- **Reflection note** (300 chars) — freeform text on their learning
- **Learning goal** (150 chars) — what they want to improve
- **Evidence links** (up to 3) — URL attachments to demonstrate learning
- **Strategy self-marking** — checkboxes to track which support strategies they actually used

### Teacher Analytics

- Self-assessment summary cards (count, average confidence, rated %)
- Confidence distribution histogram (4 bars, color-coded)
- **Confidence-score mismatches**: Flags students who are over-confident (high confidence, low score — red alert) or under-confident (low confidence, high score — blue alert)

---

## 9. Student Onboarding & UX

### First-Time Experience

1. **Skeleton Loading**: Animated placeholder cards while data loads
2. **Welcome Screen**: Personalized greeting with name, 3 bullet points explaining the system, "Take the Tour" + "I'll explore on my own" options
3. **Guided Tour**: Step-by-step walkthrough of the interface
4. **Onboarding Checklist**: Floating panel tracking 5 milestones (tour done, map opened, hex clicked, planner visited, badge earned)
5. **Hex Legend**: "?" button showing what each status color/symbol means
6. **Completion Celebration**: "You're Ready!" card when all milestones achieved

### Student-Friendly Error Messages

All backend errors are mapped through `friendlyError()` to plain-language messages:
- "Data couldn't be loaded. Try refreshing the page."
- "This is taking longer than usual. Please try again in a moment."
- "You don't have access to this content."
- "Please check your entries and try again."

### Progressive Disclosure

Content modal sections are collapsible:
- **Vocabulary**: Collapsed by default (shows term count)
- **My Supports**: EXPANDED by default for EAL students (critical — strategies visible before starting work)
- **Cornell Notes**: Collapsed (shows cue count)
- **Self-Assessment**: Collapsed (shows rating label)

Session memory preserves collapse states so students can customize their view.

### Unsaved Work Protection

`beforeunload` event + `hasUnsavedModalWork()` check prevents accidental data loss across lab editor, Cornell notes, and self-assessment.

---

## 10. Projector Mode — Classroom Display

### Overview

Full-screen dark-themed overlay (z-index 265) designed for projecting onto classroom screens. Optimized for readability at distance with large fonts and high-contrast colors.

### 6 View Modes

| View | Purpose |
|------|---------|
| **Map Overview** | Heatmap-colored hex grid showing class completion per hex |
| **Focus Hex** | Detailed view of one hex with student status list |
| **Activity Feed** | Reverse-chronological student event list |
| **Timer + Map** | Split view — countdown timer + compact hex grid |
| **Slides** | Google Slides iframe with lesson context sidebar |
| **Poll** | Quick poll results display |

### EAL-Relevant Features

- **Lesson Context Sidebar** (alongside slides): Learning Intentions with numbered badges, Essential Questions, Key Vocabulary, UDL Strategies, Resources, Teacher Notes
- **Live Translation Panel**: Translates all lesson content to 14 languages (original + translated displayed side-by-side for projector readability)
- **Custom Text Translator**: Ad-hoc translation of any text (300 chars)
- **Auto-Captions Note**: Guidance for enabling Google Slides' built-in speech-to-text CC
- **Large Font Sizes**: 16px translated text, 24px section titles, 120px timer display

---

## 11. Accessibility (WCAG 2.1)

### Keyboard Navigation

| Surface | Pattern |
|---------|---------|
| **Hex Grid** | Tab to hex, Arrow keys for spatial navigation (accounts for hex stagger), Enter/Space to activate, Escape to blur |
| **Tab System** | Roving tabindex — Arrow keys move focus without activating, Enter/Space activates (manual activation prevents triggering lazy-load RPCs) |
| **Content Modal** | Focus trap via `a11yTrapFocus()`, Tab/Shift+Tab wraps between first and last focusable element |
| **Collapsible Sections** | `role="button" tabindex="0"` + Enter/Space + `aria-expanded` sync |

### Visual Accessibility

| Feature | Implementation |
|---------|---------------|
| **12px Font Floor** | Enforced across all student-facing text (69+ replacements across 5 style files) |
| **44px Touch Targets** | Phone breakpoint ensures all buttons/inputs meet WCAG 2.5.8 |
| **Focus Rings** | `:focus-visible { outline: 3px solid #0d9488; outline-offset: 2px; }` on 50+ interactive elements |
| **Color + Text** | All status conveyed by both color AND text label (e.g., green dot + "Completed" text) |
| **Reduced Motion** | `prefers-reduced-motion` media query disables all animations universally |

### Semantic HTML & ARIA

- **Skip Link**: `<a href="#mainContent">` as first child of body
- **Landmarks**: `<header role="banner">`, `<main id="mainContent">`, `role="tablist"`
- **Live Region**: `aria-live="polite"` for dynamic announcements
- **Dialog**: `role="dialog" aria-modal="true"` with dynamic `aria-label`
- **22+ Close Buttons**: All have `aria-label="Close [context]"`
- **Screen Reader Announcements**: `a11yAnnounce()` for tab switches and toast messages

---

## 12. Celebrations & Motivation

### Badge System

| Badge | Trigger |
|-------|---------|
| 1/5/10/25/50/100 Hex | Completing that many hexes |
| 3/7/14/30 Day Streak | Consecutive days with completions |
| Perfect Score | 100% on any hex |
| Map Completion | All hexes in a map completed |
| Lesson Complete | All hexes in a lesson map completed |

### Display

- **Celebration Overlay**: CSS confetti animation, bounce icon, streak card (orange gradient)
- **Badge Gallery**: Auto-fit grid in Planner tab — earned badges colored, unearned grayed
- **Growth Messages**: Contextual encouragement in fixed bottom green banner (auto-dismiss 8s)
- **Streak Counter**: Fire emoji in Study Dashboard stats with color coding (red 7+, amber 3+, gray 0)

---

## 13. Study Dashboard

Student-only "Study" tab providing a study-focused hub. All data computed client-side from existing globals — no additional RPCs.

### Features

| Feature | Description |
|---------|-------------|
| **Stats Cards** | Hexes completed (fraction + %), streak, last study date, maps active, weekly goal ring |
| **Topic Navigator** | Map chip bar with auto-select first in-progress map; hexes grouped by status (Up Next / Pending / Ready to Start / Completed) |
| **Spaced Review** | Algorithms based on 1-3-7-14-30 day intervals; overdue items highlighted red, due-today amber |
| **Study Recommendations** | 3 types: Review (lowest-scored), Continue (stalled 7+ days), Start (first not-started) |
| **Weekly Study Goal** | Student-set goal with conic-gradient progress ring; celebration toast when met |
| **Strategy Cards** | Links to Cornell Notes, Pomodoro Timer, Self-Assessment, ATL Skills, Portfolio, Spaced Review |

---

## 14. Lab Report Scaffolding

### Scaffold Levels

| Level | Behavior |
|-------|----------|
| **High** | Help text auto-expanded; sentence starters + guide questions visible by default |
| **Medium** | Help text collapsed; "Show guidance" link available |
| **Low** | Help text collapsed; minimal scaffolding |
| **None** | No scaffolding displayed |

### Specialized Input Types

7 type-specific editors beyond standard rich text:
- Title Page (structured fields)
- Variables Table (IV/DV + controlled variables)
- Bullet Lists (add/remove items)
- Ordered Steps (add/remove/reorder)
- Checklists (checkable items)
- Data Tables (dynamic rows x columns grid)
- Bibliography (structured citations)

### Sentence Starters

Each scaffold level includes tailored sentence starters and guide questions. High-scaffold sections for EAL students show:
- Pre-written sentence frames for each section type
- Guide questions that break complex thinking into steps
- Visual cues distinguishing different scaffold elements

---

## 15. Architecture Summary

### File Map

| Feature Area | Backend (.gs) | Frontend (.html) | Styles (.html) | CSS Prefix |
|-------------|---------------|------------------|-----------------|------------|
| Support Profiles | StudentSupportService, SupportImportService | Scripts-StudentSupport | Styles-StudentSupport | ssp- |
| Vocabulary / Translation | VocabularyService | Scripts-Dictionary | Styles-Dictionary | dct- |
| UDL Framework | UbDService | Scripts-PromptBuilder | Styles-PromptBuilder | pb- |
| Cornell Notes | NoteService | Scripts-CornellNotes | Styles-CornellNotes | cn- |
| ATL Tools | ATLService | Scripts-ATLToolkit | Styles-ATLToolkit | atl- |
| Differentiation | DifferentiationService | Scripts-Differentiation | Styles-Differentiation | dif- |
| Group Analytics | DashboardService | Scripts-DifAnalytics | Styles-DifAnalytics | dfa- |
| Self-Assessment | ProgressService | Scripts-MapBuilder | Styles-SelfAssess | sa- |
| Onboarding | TourService | Scripts-Onboarding | Styles-Onboarding | onb- |
| Projector Mode | DashboardService | Scripts-ProjectorMode | Styles-ProjectorMode | pjm- |
| Celebrations | CelebrationService | Scripts-Celebrations | Styles-Celebrations | cel- |
| Study Dashboard | (client-side) | Scripts-StudyDashboard | Styles-StudyDashboard | ssd- |
| Lab Scaffolding | LabTemplateService, LabSubmissionService | Scripts-LabEditor, Scripts-LabRenderers | Styles-LabReport | lab- |
| Teacher Support Dashboard | StudentSupportService | Scripts-TeacherSupportDashboard | Styles-TeacherSupportDashboard | tsd- |

### Key Design Patterns

- **WIDA is the primary data layer** — all EAL features reference WIDA levels (1-6) and domains (L/S/R/W)
- **Layered scaffolding** — support adapts by WIDA level (low → mid → high), not one-size-fits-all
- **Student agency preserved** — supports visible but not mandatory; students choose strategies, set goals, self-rate
- **Teacher workflows integrated** — accommodation reminders at planning time, not a separate system to check
- **No external API dependencies** — translation uses Google's built-in LanguageApp; dictionary uses free public APIs
- **Accessibility first** — WCAG 2.1 AA compliance as a baseline, not an afterthought

---

## 16. Current Gaps & Research Directions

Potential areas for further enhancement (for research purposes):

### Language & Communication
- Audio/pronunciation support for vocabulary (text-to-speech)
- Native language content creation (students writing in L1 before translating to L2)
- Translanguaging scaffolds beyond Cornell Notes
- Real-time collaborative translation/glossary building

### Assessment & Progress
- WIDA-aligned rubric descriptors for self-assessment
- Language proficiency progress tracking over time (longitudinal WIDA data)
- Differentiated success criteria by language level
- Alternative assessment modes (oral, visual, multimodal)

### Scaffolding & Support
- Dynamic scaffold fading (auto-reduce as student demonstrates proficiency)
- Graphic organizer templates integrated into hex activities
- Visual thinking tools (concept maps, Venn diagrams, flow charts)
- Reading level analysis for hex content

### Teacher Tools
- IEP/504 goal tracking and progress monitoring
- Accommodation compliance reporting
- Professional development resources linked to student data patterns
- Parent communication templates in student's home language

### Technology & Integration
- Speech-to-text for student responses
- Integration with external SEN management systems
- AI-assisted accommodation suggestion engine
- Screen reader optimization for complex visualizations (hex grid, data tables)
