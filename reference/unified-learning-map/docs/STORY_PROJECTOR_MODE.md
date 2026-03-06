# Story: Projector / Display Mode

> **Priority:** 3
> **Epic:** Classroom Display
> **Estimated Sessions:** 3–5
> **Dependencies:** Maps must be functional; Timer story is complementary but not blocking
> **Target Users:** Teachers (control), Students (audience via projector)

---

## Overview

A presentation-optimized display mode that lets teachers project learning map content to the class without exposing sensitive student data. The teacher maintains a full-information view on their laptop while the projector shows a clean, large-format display of the hex map, current activity focus, and contextual information. This is essentially a "dual screen" workflow: teacher screen = control panel, projector screen = student-safe display.

### Problem Statement

When a teacher projects their Learning Map screen, students see everything — individual student names in rosters, progress data, builder controls, and administrative UI. Teachers need a way to share the *content* (map structure, current activity, learning intentions) without the *data* (student records, grades, admin tools). Currently there's no way to do this without manually hiding things or using a separate simplified view.

---

## User Stories

### Core

```
AS A teacher
I WANT TO open a projector-safe view of my learning map
SO THAT I can display the map to the class without showing student data or admin controls
```

```
AS A teacher
I WANT TO control what's shown on the projector from my own screen
SO THAT I can navigate the map and highlight hexes while the projector follows
```

```
AS A teacher
I WANT TO highlight/focus on a specific hex on the projector
SO THAT students can see which activity we're discussing or working on
```

```
AS A teacher
I WANT TO display learning intentions and success criteria alongside the map
SO THAT students always see the learning context for what we're doing
```

```
AS A teacher
I WANT TO toggle between different projector layouts
SO THAT I can show the full map, a focused hex view, or just the UbD overview
```

### Extended

```
AS A teacher
I WANT TO display an active timer on the projector view
SO THAT the countdown is visible to all students (integrates with Timer story)
```

```
AS A teacher
I WANT TO show/hide specific elements on the projector
SO THAT I can customize what students see in the moment
```

```
AS A teacher
I WANT TO use keyboard shortcuts to control the projector view
SO THAT I can navigate quickly during class without clicking through menus
```

---

## Feature Breakdown

### 1. Dual-Screen Architecture

The core concept: two windows, one controller.

**Teacher Screen (laptop):**
- Full Learning Map interface as it exists today
- Additional "Projector Controls" panel/toolbar
- Indicator showing what the projector is currently displaying
- Controls to change projector view, highlight hexes, toggle elements

**Projector Screen (second window/tab):**
- Opened via button: "Open Projector View" → new browser window
- URL: `?view=projector&mapId=xxx` (or equivalent Apps Script parameter)
- Clean, large-format display
- No editable controls, no student data, no admin UI
- Auto-updates when teacher changes focus on their screen

**Communication between windows:**
- **Option A: BroadcastChannel API** — instant, same-origin, works if both tabs in same browser. This is the simplest and best option since teacher laptop runs both windows.
- **Option B: localStorage events** — `window.addEventListener('storage', ...)` — works cross-tab in same browser.
- **Option C: Backend polling** — for cases where projector is on a different device (Chromecast, separate computer).

**Recommended:** BroadcastChannel as primary (instant, no backend load), with backend polling as fallback for different-device scenarios.

### 2. Projector View Layouts

The projector window supports multiple layouts the teacher can switch between.

#### a) Full Map View
Shows the entire hex map, zoomed to fit the projector resolution.
- All hexes visible with icons and labels
- Progress indicators hidden (student data)
- Current/active hex highlighted with a glow or border
- Map title displayed prominently
- Clean background (no grid dots, no builder controls)

```
┌─────────────────────────────────────────────────┐
│  Atomic Structure Deep Dive                      │
│                                                   │
│     ⚛️           🧪                              │
│   Intro to      Protons &                        │
│    Atoms        Neutrons                         │
│        ⚡           📊                            │
│     Electrons    Periodic                        │
│                  Table 🔒                         │
│          📝                                       │
│        Quiz 1                                    │
│                                                   │
│  ▸ Current Focus: Electrons                      │
└─────────────────────────────────────────────────┘
```

#### b) Focused Hex View
Zooms into a single hex with its details.
- Large hex icon and label
- Description / inline content (from hex curriculum notes)
- Resource link displayed (students can type it or scan QR)
- SBAR tags and standards shown
- No progress data

```
┌─────────────────────────────────────────────────┐
│                                                   │
│              ⚡ Electrons                         │
│                                                   │
│  Learn about electron configuration and          │
│  how electrons determine chemical properties.    │
│                                                   │
│  📎 Resource: example.com/electrons              │
│  🏷️ SBAR: Communication                         │
│                                                   │
│  ─────────────────────────────                   │
│  🎯 Learning Intention:                          │
│  Describe electron arrangement in atoms          │
│                                                   │
│  ✅ Success Criteria:                             │
│  • Draw electron shell diagrams                  │
│  • Explain valence electrons                     │
│                                                   │
└─────────────────────────────────────────────────┘
```

#### c) Unit Overview / UbD View
Shows the UbD planner content — big idea, essential questions, stages.
- Formatted for large display
- Read-only (no edit controls)
- Useful at the start of a unit or for framing discussions

```
┌─────────────────────────────────────────────────┐
│  Unit: Atomic Structure                          │
│                                                   │
│  💡 Big Idea                                     │
│  Matter is made of atoms.                        │
│                                                   │
│  ❓ Essential Questions                           │
│  • What is the universe made of?                 │
│                                                   │
│  🎯 Stage 1: Goals        📋 Stage 2: Evidence   │
│  Understand atomic         Build an atom model    │
│  structure and periodic    Unit quiz              │
│  trends                                           │
│                                                   │
└─────────────────────────────────────────────────┘
```

#### d) Learning Context Bar (Overlay)
A persistent bar (top or bottom) showing learning intentions + success criteria.
Can be overlaid on any other layout.

```
┌─────────────────────────────────────────────────┐
│ 🎯 LI: Describe the structure of an atom        │
│ ✅ SC: Label protons, neutrons, electrons •       │
│        Draw Bohr models for first 20 elements    │
│ ⏱️ 12:34 remaining                               │
└─────────────────────────────────────────────────┘
```

### 3. Privacy Filtering

The projector view must strip sensitive information.

**Always Hidden on Projector:**
- Student names and emails
- Individual progress data (completed/in_progress per student)
- Class roster information
- Builder/editor controls
- Dev log
- Assignment controls
- Any admin-only UI

**Always Shown on Projector:**
- Map structure (hexes, positions, connections)
- Hex labels, icons, types
- Resource links
- SBAR tags, standards, curriculum metadata
- UbD content (big idea, essential questions, stages)
- Timer (if active)
- Learning intentions / success criteria

**Teacher-Toggleable:**
- Hex status indicators (locked/completed — not per-student, but per-map)
- Connection arrows between hexes
- SBAR/standard badges on hexes
- QR codes for resource links

### 4. Teacher Control Panel

An additional toolbar or panel on the teacher's screen for controlling the projector.

**Controls:**
- **Layout Selector:** Full Map | Focused Hex | Unit Overview | Timer Only
- **Hex Focus:** Click a hex on teacher screen → projector zooms to it
- **Learning Context Toggle:** Show/hide the LI+SC bar
- **Timer Integration:** Active timer displays on projector (if Timer story is built)
- **Theme:** Light / Dark background
- **Pointer/Highlight:** Teacher can "laser pointer" a hex — it pulses on projector
- **Annotation (stretch):** Teacher can type a temporary note that appears on projector

**Implementation:** The control panel could be:
- A floating toolbar at the bottom of the teacher's existing map view
- A sidebar panel toggled by a "Projector" button
- Or: the existing map view IS the controller, and the projector view simply mirrors it with privacy filtering

### 5. Keyboard Shortcuts

For smooth in-class operation without hunting for buttons.

| Shortcut | Action |
|----------|--------|
| `P` | Toggle projector controls panel |
| `1` / `2` / `3` / `4` | Switch projector layout (map/hex/unit/timer) |
| `F` | Focus projector on selected hex |
| `L` | Toggle Learning Context bar |
| `T` | Toggle theme (light/dark) |
| `Esc` | Unfocus / return to full map view |
| `←` / `→` | Navigate through hexes sequentially |

---

## Phased Implementation Plan

### Phase 1: Basic Projector Window (1–2 sessions)
- "Open Projector View" button in teacher toolbar
- New window with Full Map layout (privacy-filtered)
- BroadcastChannel sync for hex focus
- Teacher clicks hex → projector highlights it
- Dark/light theme

### Phase 2: Multiple Layouts + Controls (1–2 sessions)
- Focused Hex View layout
- Unit Overview layout
- Layout switcher on teacher screen
- Learning Context bar (LI + SC)
- Keyboard shortcuts

### Phase 3: Polish + Integration (1 session)
- Timer integration on projector view
- QR code generation for resource links
- Pointer/highlight pulse animation
- Handle projector window close/reopen gracefully

---

## Technical Considerations

### Cross-Window Communication
```javascript
// Teacher screen (sender)
const projectorChannel = new BroadcastChannel('learning-map-projector');
projectorChannel.postMessage({
  type: 'FOCUS_HEX',
  hexId: 'h3',
  layout: 'focused'
});

// Projector screen (receiver)
const channel = new BroadcastChannel('learning-map-projector');
channel.onmessage = (event) => {
  const { type, hexId, layout } = event.data;
  // Update projector display accordingly
};
```

**Message Types:**
- `FOCUS_HEX` — highlight/zoom to a hex
- `CHANGE_LAYOUT` — switch between full map, focused, unit, timer
- `TOGGLE_CONTEXT_BAR` — show/hide LI+SC
- `CHANGE_THEME` — light/dark
- `UPDATE_TIMER` — sync timer state
- `SET_ANNOTATION` — temporary teacher note

### Frontend
- **Projector view:** Can be a stripped-down version of the existing map renderer, or a purpose-built component
- **Privacy filter:** Apply at render time — the projector view simply doesn't render student-specific components
- **Responsive:** Must look good at 1920x1080 and 1280x720 (common projector resolutions)
- **Font scaling:** Text should be readable from the back of a classroom (~30 feet). Minimum body text ~24px, hex labels ~20px, timer ~72px+

### Performance
- Projector view should be lightweight — it's display-only, no editing
- Minimize re-renders — only update when a message is received
- SVG hex rendering should be smooth at projector resolution

---

## Acceptance Criteria

- [ ] Teacher can open a projector view in a new window/tab
- [ ] Projector view shows hex map without student data or admin controls
- [ ] Teacher can focus on a specific hex and projector zooms/highlights it
- [ ] At least 3 layout modes work (full map, focused hex, unit overview)
- [ ] Learning Context bar shows LI + SC and can be toggled
- [ ] Dark and light themes available for projector
- [ ] Keyboard shortcuts work for core navigation
- [ ] BroadcastChannel sync works between teacher and projector windows
- [ ] No student PII visible on projector view at any time
- [ ] Text is legible at projector scale (minimum sizing enforced)
- [ ] Projector view recovers gracefully if teacher window is refreshed

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Error states handled (projector window closed, sync lost, no map loaded)
- [ ] Tested at 1920x1080 and 1280x720 resolutions
- [ ] No student data leakage in projector view
- [ ] PROJECT_STATUS.md updated
- [ ] Commit message provided

---

## Open Questions for Implementation

1. **Projector on different device:** If teacher wants to cast to a Chromecast or different computer, BroadcastChannel won't work. Is backend polling needed as a fallback, or is "same browser, different window" sufficient for V1?
2. **Learning Intentions storage:** Where are LI and SC stored? Currently `ubdData` has `stage1_understandings` but not a clean LI/SC field. Should we add `learningIntention` and `successCriteria` fields to the map or hex level?
3. **QR codes:** Generating QR codes for resource links on the projector would let students scan to go directly to the resource. Worth including in V1 or defer?
4. **Annotation persistence:** If teacher types a temporary note on the projector, should it persist across page loads or be truly ephemeral?
