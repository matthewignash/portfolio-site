# Story: Google Slides Sidebar with Learning Map Context

> **Priority:** 4
> **Epic:** Classroom Display
> **Estimated Sessions:** 4–6
> **Dependencies:** Maps and UbD data must be functional; Projector Mode story is complementary
> **Target Users:** Teachers

---

## Overview

A companion sidebar that runs alongside a Google Slides presentation, showing Learning Map context — learning intentions, success criteria, current position in the learning map, and UbD overview. The teacher presents their normal slides while the sidebar provides a persistent "where are we and why" reference. This can be displayed on the teacher's screen only, or if using a multi-monitor setup, shown to students alongside the slides.

### Problem Statement

Teachers use Google Slides daily for direct instruction but lose the connection to the learning map's structure and intentions. Students see slides but don't know where they sit in the bigger picture. There's no way to say "we're on hex 3 of 8, working toward this essential question" without manually adding that context to every slide deck. This feature bridges Google Slides with the Learning Map's curriculum metadata automatically.

### Architecture Note

This feature has two possible implementation paths, each with significant tradeoffs. Claude Code should evaluate both against the current codebase before choosing.

---

## User Stories

### Core

```
AS A teacher
I WANT TO see my Learning Map context while presenting Google Slides
SO THAT I can reference learning intentions and our position in the unit without switching apps
```

```
AS A teacher
I WANT TO link a slide deck to a specific hex or unit in my learning map
SO THAT the sidebar automatically shows the relevant context
```

```
AS A teacher
I WANT TO display the current learning intention and success criteria alongside my slides
SO THAT students always see what we're working toward
```

```
AS A teacher
I WANT TO see a mini map showing where we are in the unit
SO THAT I can show students the bigger picture at any point
```

### Extended

```
AS A teacher
I WANT TO navigate between hexes from the sidebar
SO THAT I can update which hex is "active" as I move through my lesson
```

```
AS A teacher
I WANT TO embed the sidebar view on the projector as an overlay
SO THAT students see both the slides and the learning context
```

---

## Implementation Paths

### Path A: Google Slides Add-on (Sidebar API)

Google Slides supports [editor add-ons](https://developers.google.com/apps-script/add-ons/editors/slides) that can display a sidebar panel within the Slides editor.

**How it works:**
- Apps Script add-on with `onOpen()` trigger
- Menu item: "Learning Map → Open Sidebar"
- Sidebar renders HTML panel (300px wide) next to the slide editor
- Sidebar makes `google.script.run` calls to fetch map data

**Pros:**
- Native Google Workspace integration
- Sidebar appears directly in Google Slides
- No separate windows or tabs
- Can read the current slide (slide title, speaker notes) for smart context

**Cons:**
- **Only visible in the Slides editor, NOT in presentation mode** — this is a critical limitation. When you enter "Present" mode in Google Slides, the sidebar disappears.
- Requires publishing as a Google Workspace add-on (or at minimum an editor add-on for the teacher's domain)
- Separate codebase from the main Learning Map (though it can share the same Apps Script project)
- Limited to 300px sidebar width
- Add-on review/publishing process if distributing beyond personal use

**Presentation Mode Workaround:**
- Teacher uses "Presenter View" (which shows on their laptop) while projecting slides
- Sidebar is visible on the teacher's screen in the editor, not on the projected presentation
- OR: Teacher opens slides in a smaller window + Learning Map projector view in another window

### Path B: Side-by-Side Browser Layout (No Add-on)

Instead of a Google Slides add-on, the Learning Map app itself provides a "Presentation Companion" view that the teacher opens alongside Google Slides.

**How it works:**
- New view mode in Learning Map: `?view=companion` or a dedicated tab
- Teacher opens Google Slides in one half of their screen, Learning Map companion in the other
- Teacher manually selects which hex is active (or pre-maps slide numbers to hexes)
- The companion view shows: LI, SC, mini map, UbD context, timer

**Pros:**
- No add-on infrastructure needed
- Works immediately within the existing app
- Visible in any context (not limited by Google Slides presentation mode)
- Can also be projected (dedicated monitor showing the companion)
- Simpler to build and maintain

**Cons:**
- Requires manual window management (split screen)
- No awareness of which slide is showing (can't auto-advance context)
- Less "integrated" feeling — two separate apps side by side

### Path C: Hybrid Approach

Build the companion view (Path B) first, then optionally create a lightweight add-on (Path A) that simply opens the companion view in a sidebar/dialog.

**Recommended:** Start with Path B (companion view), which can ship faster and integrates naturally with the Projector Mode story. The Google Slides add-on can be a future enhancement once the companion view is proven.

---

## Feature Breakdown (Path B — Companion View)

### 1. Companion View Layout

A purpose-built view optimized for side-by-side use with Google Slides.

**Layout (narrow, vertical):**

```
┌──────────────────────┐
│ 📍 Atomic Structure  │  ← Map title
│    Unit 1 of 4       │  ← Unit context
├──────────────────────┤
│                      │
│  🎯 Learning         │
│  Intention           │
│                      │
│  Describe electron   │
│  configuration in    │
│  atoms               │
│                      │
├──────────────────────┤
│  ✅ Success Criteria  │
│                      │
│  □ Draw electron     │
│    shell diagrams    │
│  □ Explain valence   │
│    electrons         │
│  □ Predict bonding   │
│    behavior          │
│                      │
├──────────────────────┤
│  🗺️ Where We Are     │
│                      │
│  ⚛️ → 🧪 → [⚡] → 📊│  ← Mini hex path
│  2/5 complete        │
│                      │
├──────────────────────┤
│  💡 Big Idea         │
│  Matter is made of   │
│  atoms.              │
│                      │
│  ❓ Essential Q       │
│  What is the         │
│  universe made of?   │
│                      │
├──────────────────────┤
│  ⏱️ Timer: 12:34     │  ← If timer active
├──────────────────────┤
│  ◀ Prev  [3/5]  ▶   │  ← Hex navigator
│  Next ▸             │
└──────────────────────┘
```

**Width:** Designed for 300–400px (fits in a split-screen alongside slides)

### 2. Hex Navigator

Controls for the teacher to indicate which hex is currently active.

**Features:**
- Previous / Next buttons (follows hex sequence by row/col order)
- Current hex indicator (3 of 5)
- Dropdown to jump to any hex
- Active hex is highlighted in the mini map
- Changing the active hex updates LI/SC if they're hex-specific

### 3. Learning Intention & Success Criteria

These need a clear data source. Currently, the system has UbD data at the map level but not per-hex LI/SC.

**Data Options:**

| Level | Source | Notes |
|-------|--------|-------|
| Map-level | `ubdData.stage1_understandings` | Broad — same for entire unit |
| Hex-level (new) | `hex.curriculum.learningIntention` + `hex.curriculum.successCriteria` | Specific per activity |
| Teacher-entered (runtime) | Not stored — teacher types it in the companion | Flexible but not reusable |

**Recommendation:** Add `learningIntention` and `successCriteria` fields to the hex `curriculum` object. These are optional — if not set for a hex, fall back to the map-level UbD data. This way, teachers who want per-hex LI/SC can set them, and those who don't get the unit-level defaults.

**Schema Addition:**
```json
{
  "curriculum": {
    "learningIntention": "Describe electron configuration in atoms",
    "successCriteria": [
      "Draw electron shell diagrams for first 20 elements",
      "Explain what valence electrons are",
      "Predict bonding behavior from electron configuration"
    ],
    // ... existing fields
  }
}
```

### 4. Mini Map

A simplified, linear representation of the hex path showing progress.

**Display Options:**
- **Linear:** `⚛️ → 🧪 → [⚡] → 📊 → 📝` (icons in sequence, current highlighted)
- **Grid:** Tiny hex grid matching the actual map layout (probably too small at 300px width)
- **Progress bar:** `━━━━━◉━━━━` with hex labels below

**Recommended:** Linear sequence ordered by (row, col), with the current hex highlighted. Shows icon + abbreviated label. Clickable to jump to a hex.

### 5. Slide-to-Hex Mapping (Optional / Stretch)

For teachers who want automatic context switching as they advance slides.

**How it works:**
- Teacher pre-maps: "Slides 1-5 = Hex 1, Slides 6-10 = Hex 2, etc."
- Configuration stored on the map or in a separate mapping
- When teacher advances slides (detected via add-on or manual input), companion view updates

**Implementation:** This is complex and best deferred to Phase 2. For V1, the teacher manually navigates hexes with the Previous/Next buttons.

---

## Phased Implementation Plan

### Phase 1: Companion View Core (2–3 sessions)
- New view mode: `?view=companion` or companion tab
- Layout with LI, SC, mini map, UbD context
- Hex navigator (prev/next/jump)
- Responsive at 300–400px width
- Works alongside Google Slides in split screen

### Phase 2: Schema Updates + Hex-Level LI/SC (1 session)
- Add `learningIntention` and `successCriteria` fields to hex curriculum
- Update hex editor panel to include these fields
- Companion view shows hex-level data when available, falls back to map-level

### Phase 3: Projector + Timer Integration (1 session)
- Companion view can be projected (same privacy filtering as Projector Mode)
- Active timer displays in companion
- BroadcastChannel sync with teacher's main map view

### Phase 4: Google Slides Add-on (2 sessions, optional)
- Create add-on project
- Sidebar HTML that embeds/links to companion view
- onOpen menu item
- Basic slide number → hex mapping

---

## Technical Considerations

### Frontend
- **Narrow layout:** All components must work at 300–400px width
- **Font sizing:** Smaller than projector mode but still readable (16–18px body)
- **Component reuse:** Mini map could reuse HexNode at a tiny scale, or be a simplified SVG
- **State sync:** If companion is in a separate window, use BroadcastChannel to sync with teacher's main view

### Backend
- **Schema migration:** Add `learningIntention` (string) and `successCriteria` (string[]) to hex curriculum
- **No new sheets needed** — data lives in existing hex/map JSON
- **Read-only for companion:** No writes from the companion view

### Google Slides Add-on (Phase 4)
- **Trigger:** `onOpen(e)` installs menu
- **Sidebar:** `SpreadsheetApp.getUi().showSidebar(html)` equivalent for Slides: `SlidesApp.getUi().showSidebar(html)`
- **Data access:** Add-on can call the same backend functions via `google.script.run`
- **Deployment:** Install as an editor add-on for personal/domain use (no marketplace needed for internal use)

---

## Acceptance Criteria

### Phase 1
- [ ] Companion view accessible via URL parameter or dedicated button
- [ ] Displays learning intention and success criteria
- [ ] Shows mini map with current hex highlighted
- [ ] Shows UbD context (big idea, essential questions)
- [ ] Hex navigator (prev/next) works
- [ ] Layout works at 300–400px width
- [ ] Can be used side-by-side with Google Slides
- [ ] No student data shown

### Phase 2
- [ ] Hex-level LI and SC can be entered in the editor
- [ ] Companion view shows hex-level LI/SC when available
- [ ] Falls back to map-level UbD data when hex-level not set

---

## Definition of Done

- [ ] Phase 1 acceptance criteria met
- [ ] Error states handled (no map loaded, no UbD data, no hexes)
- [ ] Works at 300px minimum width
- [ ] No student data leakage
- [ ] PROJECT_STATUS.md updated
- [ ] Commit message provided

---

## Open Questions for Implementation

1. **Companion vs. Projector overlap:** The companion view and projector mode share a lot of DNA. Should they be the same component with different layout configs, or separate components? The companion is narrow + vertical; the projector is wide + horizontal. But the data layer is identical.
2. **LI/SC granularity:** Is per-hex LI/SC actually useful, or do most teachers set LI/SC at the lesson/day level (which might span multiple hexes)? If per-day, we might need a "lesson session" concept that groups hexes.
3. **Google Slides integration value:** How often do you actually present slides during class vs. using other formats? If slides are central to your instruction, the add-on is worth building. If slides are occasional, the companion view alone may suffice.
4. **Student visibility:** Should students be able to see the companion view on their own devices (like a persistent "where are we" widget)? This would be useful for students who join late or lose track.
