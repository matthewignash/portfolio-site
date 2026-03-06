# Classroom Tools Epic — Story Index

> **Created:** February 24, 2026
> **Total Stories:** 5
> **Total Estimated Sessions:** 20–30
> **Context:** These stories extend the Learning Map System with classroom-facing tools that go beyond curriculum management into daily instruction support.

---

## Priority Order

| # | Story | Sessions | Complexity | File |
|---|-------|----------|------------|------|
| 1 | **Student Study Dashboard** | 8–12 | High | `STORY_STUDY_DASHBOARD.md` |
| 2 | **Countdown Timer** | 3–4 | Medium | `STORY_COUNTDOWN_TIMER.md` |
| 3 | **Projector / Display Mode** | 3–5 | Medium | `STORY_PROJECTOR_MODE.md` |
| 4 | **Google Slides Sidebar** | 4–6 | Medium-High | `STORY_SLIDES_SIDEBAR.md` |
| 5 | **Random Name & Grouping** | 2–3 | Low-Medium | `STORY_NAME_SELECTOR_GROUPING.md` |

---

## Dependency Map

```
                    ┌──────────────────┐
                    │  Existing System  │
                    │  Maps, Progress,  │
                    │  Classes, Roster  │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌────────────┐  ┌──────────┐  ┌────────────────┐
     │ 1. Study   │  │ 2. Timer │  │ 5. Name/Group  │
     │ Dashboard  │  │          │  │    Selector     │
     └────────────┘  └────┬─────┘  └────────────────┘
                          │
                          │ Timer integrates into ▼
                          │
                    ┌─────┴──────┐
                    │ 3. Project │◄──── Shared "display mode"
                    │    Mode    │      architecture
                    └─────┬──────┘
                          │
                          │ Companion view extends ▼
                          │
                    ┌─────┴──────┐
                    │ 4. Slides  │
                    │  Sidebar   │
                    └────────────┘
```

**Key Dependencies:**
- Stories 1, 2, and 5 are **independent** — can be built in any order
- Story 3 (Projector) benefits from Story 2 (Timer) being built first, but doesn't require it
- Story 4 (Slides Sidebar) builds on Story 3 (Projector) — the "companion view" concept is shared
- Story 2 (Timer) has a projector display that naturally fits into Story 3's architecture

**Recommended Build Order:**
1. **Story 5** (Name/Grouping) — quickest win, immediately useful, 2–3 sessions
2. **Story 2** (Timer) — self-contained, high classroom value, 3–4 sessions
3. **Story 3** (Projector Mode) — incorporates timer display, enables Story 4
4. **Story 1** (Study Dashboard) — largest effort, can be phased over time
5. **Story 4** (Slides Sidebar) — builds on projector architecture

This order differs from the priority ranking because it front-loads quick wins and builds shared infrastructure before the larger features.

---

## Cross-Cutting Concerns

### Projector Safety (Privacy)
Stories 2, 3, 4, and 5 all have projector display modes. Every projector view must:
- **Never show** student emails, full names (use first name + last initial), individual progress, grades, WIDA levels, accommodation details, or admin controls
- **Always show** content-level information (map structure, hex labels, learning intentions, timer, group assignments by first name only)
- Apply privacy filtering at the **component level**, not as an afterthought

### BroadcastChannel Architecture
Stories 2, 3, and 4 all need cross-window communication (teacher screen ↔ projector/companion). Design a shared messaging layer:

```javascript
// Shared channel setup (used by Timer, Projector, Companion)
const CHANNEL_NAME = 'learning-map-display';

const MessageTypes = {
  // Timer
  TIMER_START: 'timer:start',
  TIMER_PAUSE: 'timer:pause',
  TIMER_RESET: 'timer:reset',
  TIMER_TICK: 'timer:tick',
  
  // Projector
  FOCUS_HEX: 'projector:focusHex',
  CHANGE_LAYOUT: 'projector:changeLayout',
  TOGGLE_CONTEXT: 'projector:toggleContext',
  CHANGE_THEME: 'projector:changeTheme',
  
  // Grouping (projector display)
  SHOW_NAME: 'grouping:showName',
  SHOW_GROUPS: 'grouping:showGroups',
};
```

Build this once and all three stories use it.

### Schema Additions Summary

| Story | New Fields | New Sheets |
|-------|-----------|------------|
| 1. Study Dashboard | None (reads existing) | `StudyTasks` (optional) |
| 2. Timer | `hex.curriculum.timerConfig` | `ActiveTimers` |
| 3. Projector | None (reads existing) | None |
| 4. Slides Sidebar | `hex.curriculum.learningIntention`, `hex.curriculum.successCriteria` | None |
| 5. Grouping | None (reads existing) | `SavedGroups` (optional) |

**LI/SC fields** (Story 4) are valuable beyond just the sidebar — they feed into the Projector's context bar and could appear in the Study Dashboard. Consider adding them early.

### Shared UI Patterns

These stories introduce UI patterns not yet in the system:

| Pattern | Used By | Description |
|---------|---------|-------------|
| Pop-out window | 2, 3, 5 | Open a display-only view in a new window |
| Full-screen mode | 2, 3 | Minimal chrome, optimized for projection |
| Dark/Light theme | 2, 3 | Toggle for different projection environments |
| Animation | 5 | Spinner/card flip for name selection |
| Floating widget | 2 | Timer banner on student screens |
| Narrow layout | 4 | 300px companion view for split-screen |

Design these as reusable components where possible.

---

## Architecture Decision: Claude Code Should Evaluate

When Claude Code receives these stories with the full codebase, it should evaluate:

1. **Frontend weight:** The main `Index-WithHexGrid.html` is already large. Should new features be:
   - Additional views within the same HTML file (simplest for shared state)
   - Separate HTML endpoints via `doGet()` page parameter (cleaner separation)
   - A hybrid (core features in main file, projector/companion as separate endpoints)

2. **Service layer:** Should new backend functions go in:
   - Existing services (extend `ProgressService`, `ClassRosterService`)
   - New dedicated services (`TimerService.gs`, `StudyService.gs`, `GroupingService.gs`)
   - A catch-all `ClassroomToolsService.gs`

3. **Polling vs. push:** For timer sync and projector updates, is the polling approach acceptable given Google Apps Script's execution quotas, or should we use a different pattern?

4. **Mobile responsiveness:** Are any of these features needed on phones/tablets, or are they strictly laptop/projector tools?

---

## Notes for Claude Code Sessions

- Each story has its own phased implementation plan — don't try to build an entire story in one session
- Phase 1 of each story is designed to be a usable MVP
- The Study Dashboard (Story 1) is intentionally large — treat each phase as a separate set of sessions
- Story 5 (Grouping) is the best "warm-up" story if the developer is new to the codebase
- All stories follow the existing Definition of Done pattern: LockService for writes, error handling, PROJECT_STATUS.md updates
