# Story: Random Name Selector & Grouping Tool

> **Priority:** 5
> **Epic:** Classroom Tools
> **Estimated Sessions:** 2–3
> **Dependencies:** ClassRoster and Classes must be functional
> **Target Users:** Teachers

---

## Overview

A classroom management tool for teachers to randomly select students and create groups — for cold calling, lab partnerships, discussion groups, jigsaw activities, and station assignments. The tool pulls from the class roster and supports multiple grouping modes: pure random, skill-based (using SBAR/progress data), need-based (using WIDA/accommodation data), and mixed (intentionally heterogeneous). Results can be displayed on the projector in a student-safe format.

### Problem Statement

Teachers need to form groups constantly — for labs, discussions, peer review, stations. Currently this means using external tools (random name pickers, manually creating groups on paper, or spreadsheet formulas). None of these know about student skill levels, support needs, or learning map progress. A tool integrated with the Learning Map can create groups that are not just random but *informed* — pairing struggling students with stronger peers, ensuring WIDA-supported students aren't all clustered together, or grouping by similar skill level for targeted instruction.

---

## User Stories

### Core

```
AS A teacher
I WANT TO randomly select a student from my class roster
SO THAT I can cold-call fairly and ensure all students participate
```

```
AS A teacher
I WANT TO generate random groups of a specified size
SO THAT I can quickly form lab groups, discussion circles, or station assignments
```

```
AS A teacher
I WANT TO display the selected name or groups on the projector
SO THAT the whole class can see the result
```

```
AS A teacher
I WANT TO exclude absent students from selection
SO THAT only present students are included
```

### Skill/Need-Based Grouping

```
AS A teacher
I WANT TO create groups based on student skill levels (from progress data)
SO THAT I can form homogeneous groups for targeted instruction or heterogeneous groups for peer support
```

```
AS A teacher
I WANT TO create groups that account for WIDA/EAL support needs
SO THAT language learners are distributed appropriately and not isolated
```

```
AS A teacher
I WANT TO create groups based on SBAR domain performance
SO THAT I can target specific skill gaps (e.g., group all students who need help with "Thinking")
```

### Extended

```
AS A teacher
I WANT TO save group configurations for reuse
SO THAT I don't regenerate groups every class if I want them consistent for a multi-day project
```

```
AS A teacher
I WANT TO manually adjust generated groups before displaying
SO THAT I can account for factors the system doesn't know about (social dynamics, behavior, etc.)
```

```
AS A teacher
I WANT TO see a history of recent selections
SO THAT I can ensure I'm not accidentally calling on the same students repeatedly
```

---

## Feature Breakdown

### 1. Random Name Selector (Spinner)

A fun, engaging way to select a single student.

**Modes:**
- **Quick Pick:** Instantly shows a random name (no animation)
- **Spinner:** Animated spinner/slot machine that cycles through names before landing on one
- **Card Flip:** Shows a face-down card that flips to reveal the name

**Features:**
- Select class from dropdown
- Mark students as absent (toggle, persists for the session)
- "No repeat" mode — tracks who has been called and avoids them until everyone has been selected
- Selection history visible to teacher (not projected)
- Re-spin button
- Projector display mode (large name, fun animation)

**Projector Display:**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│           🎯                        │
│                                     │
│        Aisha M.                     │
│                                     │
│     (first name + last initial      │
│      for privacy if needed)         │
│                                     │
│                                     │
│   12 remaining · 6 selected         │
└─────────────────────────────────────┘
```

### 2. Random Grouping

Divide the class into groups of a specified size.

**Configuration:**
- Number of groups OR group size (system calculates the other)
- Handle remainders: distribute evenly or create one smaller/larger group
- Absent students excluded automatically

**Display:**
```
┌────────────────────────────────────────────────┐
│  Lab Groups — Period 1 Chemistry               │
│                                                 │
│  Group 1        Group 2        Group 3          │
│  ─────────      ─────────      ─────────        │
│  Aisha M.       Ben K.         Carlos R.        │
│  Diana P.       Elena S.       Fatima A.        │
│  George L.      Hannah W.      Ivan T.          │
│  James C.       Kenji M.                        │
│                                                 │
│  [Shuffle]  [Save]  [Display on Projector]      │
└────────────────────────────────────────────────┘
```

### 3. Skill-Based Grouping

Uses Learning Map progress data to inform group composition.

**Modes:**

#### a) Homogeneous (Similar Skill)
- Groups students with similar progress/mastery levels together
- Use case: Targeted instruction — teacher works with struggling group while advanced group extends

**Algorithm:**
1. For the selected map, calculate each student's completion percentage
2. Sort students by completion %
3. Divide sorted list into N groups (top performers together, etc.)
4. Optional: weight by specific SBAR domain performance

#### b) Heterogeneous (Mixed Skill)
- Ensures each group has a mix of skill levels
- Use case: Peer tutoring, collaborative labs, jigsaw activities

**Algorithm:**
1. Sort students by completion percentage
2. Deal students round-robin across groups (like dealing cards)
3. Result: each group has high, medium, and low performers

#### c) SBAR-Focused
- Group students who share the same SBAR weakness
- Use case: Targeted skill workshops ("All students weak in Communication do activity X")

**Algorithm:**
1. For each student, identify their weakest SBAR domain based on hex progress
2. Group students by shared weakness
3. Teacher selects which SBAR domain to target

### 4. Need-Based Grouping

Uses WIDA/EAL and accommodation data to ensure appropriate distribution.

**Rules (configurable):**
- Maximum N WIDA-supported students per group (default: spread evenly)
- Pair EAL students with a bilingual peer if possible
- Ensure students with specific accommodations (extended time, visual supports) aren't clustered
- Flag if a group composition might be problematic

**Data Source:** WIDA data from the UDL/EAL integration (if implemented), or from a simple student profile sheet.

**Fallback if WIDA data not available:** Skip need-based features gracefully — tool still works for random and skill-based grouping.

### 5. Manual Adjustment

After generating groups, the teacher can manually swap students between groups.

**Interface:**
- Drag-and-drop students between group columns
- Click student → click destination group
- System highlights if a swap would violate a need-based rule
- "Reset" button to regenerate

### 6. Group Persistence

Save and recall group configurations.

**Storage:**
- Save current groups with a label ("Lab Groups Week 3")
- Load saved groups for reuse
- Groups stored per class per map

**Schema:**
```
SavedGroups sheet:
groupSetId | classId | mapId | label | groupsJson | createdAt | createdBy
```

Where `groupsJson`:
```json
{
  "groups": [
    { "name": "Group 1", "studentIds": ["s1", "s2", "s3"] },
    { "name": "Group 2", "studentIds": ["s4", "s5", "s6"] }
  ],
  "mode": "heterogeneous",
  "absentStudentIds": ["s7"]
}
```

### 7. Selection History (No-Repeat Tracker)

Tracks which students have been cold-called to ensure equity.

**Features:**
- Running count of selections per student for the session
- "Least called" students get higher priority in random selection
- Visual indicator: students who haven't been called shown in green, frequently called in amber
- Reset option (per class, per session, or per day)
- Teacher-only view (not projected)

**Storage:** Session-level (localStorage or in-memory) for quick tracking. Optional: persist to backend for multi-day tracking.

---

## Phased Implementation Plan

### Phase 1: Random Name Picker + Basic Grouping (1–2 sessions)
- Class selector from roster
- Random name selection with animation
- Mark absent students
- Random group generation (by group count or group size)
- Projector display for name and groups
- No-repeat tracking (session-level)

### Phase 2: Skill-Based & Need-Based Grouping (1–2 sessions)
- Fetch progress data per student per map
- Homogeneous and heterogeneous grouping algorithms
- SBAR-focused grouping
- WIDA/need-based distribution rules (if data available)
- Manual adjustment (drag/swap)

### Phase 3: Persistence & Polish (1 session)
- Save/load group configurations
- Selection history across sessions
- Group naming and labeling
- Export groups (print-friendly or CSV)

---

## Technical Considerations

### Backend
- **Read-heavy:** Mostly reads from ClassRoster, Progress, and optionally WIDA data
- **New service or extension:** `GroupingService.gs` or add methods to `ClassRosterService.gs`
- **Methods needed:**
  - `getStudentsForClass(classId)` — already exists
  - `getProgressForClassAndMap(classId, mapId)` — may need to aggregate per-student
  - `saveGroupSet(classId, mapId, groupsJson)` — for persistence
  - `getSavedGroups(classId)` — load saved groups
- **New sheet (optional):** `SavedGroups` for persistent group storage

### Frontend
- **Components:**
  - `NameSelector` (spinner/random picker)
  - `GroupGenerator` (configuration + display)
  - `GroupDisplay` (projector-optimized view)
  - `GroupEditor` (drag-to-swap adjustment UI)
  - `AbsentMarker` (toggle absent students)
- **Animation:** CSS animations for spinner effect (no heavy library needed)
- **Drag and drop:** HTML5 drag and drop or simple click-to-swap for group adjustment

### Grouping Algorithms

```
// Heterogeneous (round-robin deal)
function createHeterogeneousGroups(students, numGroups) {
  const sorted = students.sort((a, b) => b.completionPct - a.completionPct);
  const groups = Array.from({ length: numGroups }, () => []);
  sorted.forEach((student, i) => {
    groups[i % numGroups].push(student);
  });
  return groups;
}

// Homogeneous (chunk sorted list)
function createHomogeneousGroups(students, numGroups) {
  const sorted = students.sort((a, b) => b.completionPct - a.completionPct);
  const groupSize = Math.ceil(sorted.length / numGroups);
  const groups = [];
  for (let i = 0; i < sorted.length; i += groupSize) {
    groups.push(sorted.slice(i, i + groupSize));
  }
  return groups;
}
```

### Privacy Considerations
- Projector display should use first name + last initial (configurable)
- Skill levels should NOT be visible on the projector — only group assignments
- Teacher screen shows full details; projector shows names only
- Saved groups store studentIds, not emails (anonymized)

---

## Acceptance Criteria

### Phase 1
- [ ] Teacher can select a class and randomly pick a student
- [ ] Name selection has animation (spinner or card flip)
- [ ] Teacher can mark students as absent
- [ ] No-repeat mode tracks who has been selected and avoids them
- [ ] Teacher can generate random groups by count or size
- [ ] Groups handle remainders cleanly
- [ ] Groups display on projector in large format (names only, no data)
- [ ] Selection history visible to teacher

### Phase 2
- [ ] Skill-based grouping works using map progress data
- [ ] Homogeneous and heterogeneous modes produce correct distributions
- [ ] SBAR-focused grouping targets specific domains
- [ ] Need-based rules distribute WIDA students appropriately (if data available)
- [ ] Teacher can manually swap students between groups after generation

### Phase 3
- [ ] Groups can be saved with a label
- [ ] Saved groups can be loaded and reused
- [ ] Selection history persists across sessions (optional)

---

## Definition of Done

- [ ] Phase 1 acceptance criteria met
- [ ] Error states handled (no class selected, empty roster, no progress data)
- [ ] Projector display shows names only (no student data leakage)
- [ ] Grouping algorithms produce balanced groups
- [ ] Works with class sizes of 8–30 students
- [ ] PROJECT_STATUS.md updated
- [ ] Commit message provided

---

## Open Questions for Implementation

1. **Student display format:** First name only? First name + last initial? Full name? Should this be a teacher setting? In some cultures, family name comes first — how to handle?
2. **Progress data availability:** If no student has any progress on the selected map, skill-based grouping can't work. Should the system fall back to random, or allow grouping by a different metric (e.g., overall progress across all maps)?
3. **Class size edge cases:** What happens with a class of 3 students? Groups of 1? The UI should handle tiny classes gracefully.
4. **Fun factor:** Should the spinner have sound effects? Confetti for the selected student? This is low priority but high engagement for students. Easy to add later.
5. **Integration with Projector Mode:** Should the name selector / groups be a "sub-view" within the projector, or a standalone tool that can optionally pop out to projector? The latter is more flexible.
