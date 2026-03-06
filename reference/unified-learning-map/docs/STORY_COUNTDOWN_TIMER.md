# Story: Customizable Countdown Timer

> **Priority:** 2
> **Epic:** Classroom Tools
> **Estimated Sessions:** 3–4
> **Dependencies:** None (can be built independently)
> **Target Users:** Teachers (setup), Students (view), Projector (display)

---

## Overview

A flexible countdown timer that teachers can configure for different classroom contexts — station rotations, timed assignments, lab activities, or whole-class countdowns. The timer supports multiple display modes: teacher-only (on their screen), student-synced (visible on student devices), and projector-optimized (large display). It can be attached at the hex level (for a specific activity), assignment level, or learning map level.

### Problem Statement

Teachers constantly need timers — for stations, timed writes, lab procedures, transitions, quizzes. Currently this means opening a separate tab with an online timer, which is disconnected from the learning map context. A built-in timer that knows what activity students are working on and can sync across devices eliminates app-switching and keeps students oriented.

---

## User Stories

### Core

```
AS A teacher
I WANT TO set a countdown timer for a specific duration
SO THAT students know how much time remains for an activity
```

```
AS A teacher
I WANT TO attach a timer to a specific hex (activity)
SO THAT the timer appears automatically when that activity is active
```

```
AS A teacher
I WANT TO display the timer on a projector in a large, clean format
SO THAT all students can see the remaining time from anywhere in the room
```

```
AS A student
I WANT TO see the countdown timer on my own screen
SO THAT I can manage my time without looking up at the projector
```

```
AS A teacher
I WANT TO create preset timer configurations for common activities
SO THAT I can quickly start a timer without re-entering durations each time
```

### Extended

```
AS A teacher
I WANT TO run multiple sequential timers (station rotation)
SO THAT the timer automatically advances through station intervals
```

```
AS A teacher
I WANT TO pause, resume, and reset the timer
SO THAT I can adjust for real-time classroom needs
```

```
AS A teacher
I WANT TO set a timer with an optional warning threshold
SO THAT students get a visual/audio cue when time is running low
```

---

## Feature Breakdown

### 1. Timer Core

The fundamental timer engine.

**Capabilities:**
- Set duration (minutes:seconds or just minutes)
- Start, pause, resume, reset
- Count down to zero
- Optional: count UP mode (stopwatch for labs)
- End behavior: flash, optional chime/sound, optional auto-advance

**Timer State Model:**
```
{
  timerId: string,
  label: string,              // "Station 1" or "Lab Procedure Step 3"
  durationSeconds: number,    // Total duration
  remainingSeconds: number,   // Current remaining
  state: 'idle' | 'running' | 'paused' | 'finished',
  warningThresholdSeconds: number | null,  // e.g., 60 = flash at 1 min left
  endSound: boolean,
  linkedHexId: string | null, // Optional hex association
  linkedMapId: string | null, // Optional map association
  createdBy: string,          // Teacher email
  startedAt: string | null,   // ISO timestamp when started
}
```

### 2. Timer Presets

Saved timer configurations for quick access.

**Default Presets (shipped with system):**

| Preset | Duration | Warning | Use Case |
|--------|----------|---------|----------|
| Quick 5 | 5:00 | 1:00 | Warm-up, exit ticket |
| Station 10 | 10:00 | 2:00 | Station rotation |
| Station 15 | 15:00 | 3:00 | Longer stations |
| Lab Block 20 | 20:00 | 5:00 | Lab procedure step |
| Half Period | 25:00 | 5:00 | Extended work time |
| Full Period | 45:00 | 5:00 | Full class activity |
| Custom | configurable | configurable | Teacher sets manually |

**Custom Presets:**
- Teacher can save new presets with name + duration + warning
- Stored per-teacher (in Config or a teacher preferences mechanism)
- Edit and delete custom presets

### 3. Station Rotation Mode

A sequence of timers that auto-advance.

**Configuration:**
- Number of stations (2–8)
- Duration per station (same for all, or custom per station)
- Transition time between stations (optional, e.g., 1 minute)
- Station labels (auto-numbered or custom names)
- Warning before rotation

**Display:**
```
┌─────────────────────────────┐
│  STATION 3 of 5             │
│                              │
│      07:42                   │
│                              │
│  ● ● ◉ ○ ○                  │
│  Next: Station 4 — Modeling  │
└─────────────────────────────┘
```

**Behavior:**
- Timer counts down for Station 1
- At zero: transition alert (sound + visual flash)
- Optional transition countdown (e.g., "1:00 to move")
- Auto-starts Station 2
- Repeat until all stations complete

### 4. Display Modes

The timer renders differently depending on context.

#### a) Inline Mode (within Learning Map)
- Small timer badge on the active hex or in a toolbar strip
- Shows `MM:SS` with play/pause controls
- Minimal footprint — doesn't obscure the map

#### b) Panel Mode (sidebar or overlay)
- Medium-sized timer panel within the app
- Shows label, time, controls, preset selector
- Teacher uses this for setup and monitoring

#### c) Projector Mode (full-screen)
- Opened via "Pop Out" or dedicated URL parameter (`?view=timer`)
- Large, high-contrast display optimized for projection
- Minimal UI — just the time, station info, and a progress indicator
- Dark background option (for projectors in bright rooms)
- Light background option (for screens)
- Auto-hides cursor after 3 seconds

**Projector Display Layout:**
```
┌──────────────────────────────────────┐
│                                      │
│           Station 2                  │
│        Lab Procedure                 │
│                                      │
│          12:34                        │
│                                      │
│    ━━━━━━━━━━━━━░░░░░               │
│                                      │
│    ● ◉ ○ ○ ○                         │
│                                      │
└──────────────────────────────────────┘
```

#### d) Student Mode (on student devices)
- Read-only view of the active teacher timer
- Shows in a non-intrusive banner or floating widget
- Student cannot pause or modify
- Can be dismissed/minimized by student

### 5. Sync Mechanism (Teacher → Student)

For the timer to appear on student screens, there needs to be a communication channel.

**Options (for Claude Code to evaluate against architecture):**

| Approach | Pros | Cons |
|----------|------|------|
| **Polling** — Student device polls backend every 5s for active timer state | Simple, works with Apps Script | 5s lag, many reads |
| **Sheet-based** — Teacher writes timer state to a row, students read it | Fits existing architecture | Polling still needed, slight lag |
| **Client-side broadcast** — Use `BroadcastChannel` API (same-origin tabs only) | Instant, no backend | Only works if teacher + student share same browser (not typical) |
| **URL parameter** — Teacher shares a timer URL, students open it | No sync needed, self-contained | Timer state not linked to learning map |

**Recommended approach:** Sheet-based polling with a dedicated `ActiveTimers` sheet row or a lightweight timer state stored in a Config-like structure. Polling interval of 5 seconds is acceptable for classroom use. The timer display itself runs client-side (JavaScript `setInterval`) — the sync only communicates start/pause/reset events, not every tick.

**ActiveTimers Sheet Schema:**
```
timerId | teacherEmail | mapId | hexId | label | durationSeconds | startedAtEpoch | state | presetConfig
```

Student client: polls `getActiveTimer(teacherEmail)` every 5 seconds. On receiving a running timer, calculates remaining time locally from `startedAtEpoch + durationSeconds - now`.

### 6. Hex-Level Timer Attachment

Teachers can configure a default timer for specific hexes.

**In Hex Editor Panel:**
- New field group: "Timer Settings"
- Duration (minutes) — or select a preset
- Auto-start when student opens this hex? (yes/no)
- Station rotation config (if hex is a station activity)

**Storage:** New fields in hex `curriculum` or a dedicated `timerConfig` field:
```json
{
  "timerConfig": {
    "presetId": "station-10",
    "durationMinutes": 10,
    "warningMinutes": 2,
    "autoStart": false
  }
}
```

---

## Phased Implementation Plan

### Phase 1: Core Timer + Presets (1–2 sessions)
- Timer engine (start, pause, resume, reset, countdown)
- Preset selector with defaults
- Panel mode display in teacher view
- Custom duration input

### Phase 2: Projector Mode + Student Sync (1–2 sessions)
- Full-screen projector display (pop-out or URL parameter)
- Dark/light theme toggle
- Backend timer state storage
- Student polling + read-only display
- Sound/visual alert at zero and warning threshold

### Phase 3: Station Rotation + Hex Attachment (1–2 sessions)
- Multi-timer sequential mode
- Station progress indicator
- Hex editor integration for timer config
- Auto-advance between stations

---

## Technical Considerations

### Backend
- **New service or extension:** `TimerService.gs` or add to existing Utilities
- **New sheet tab:** `ActiveTimers` (lightweight — only active timers, cleaned up when finished)
- **Polling endpoint:** `getActiveTimerForClass(classId)` or `getActiveTimerByTeacher(email)`
- **Writes:** Only teacher writes timer state. Students only read.
- **Cleanup:** Timer rows deleted or archived when state = 'finished' (avoid sheet bloat)

### Frontend
- **Timer engine:** Pure JavaScript `setInterval` with drift correction
- **Sound:** HTML5 `Audio` API — short chime, optional
- **Component structure:**
  - `TimerEngine` (logic — start/pause/tick/finish)
  - `TimerPanel` (teacher setup UI)
  - `TimerProjector` (full-screen display)
  - `TimerStudentBanner` (read-only floating widget)
  - `TimerPresetPicker` (grid of presets)
  - `StationRotationConfig` (multi-timer setup)

### Drift Correction
JavaScript `setInterval` drifts over long periods. Use this pattern:
```javascript
// Instead of relying on interval count:
const endTime = Date.now() + durationMs;
// Each tick: remaining = endTime - Date.now()
```

---

## Acceptance Criteria

- [ ] Teacher can set a custom countdown duration and start the timer
- [ ] Timer supports start, pause, resume, and reset
- [ ] Default presets available (5, 10, 15, 20, 25, 45 min)
- [ ] Teacher can save custom presets
- [ ] Projector mode displays time in large, clean format
- [ ] Projector mode has dark/light theme options
- [ ] Student devices can see the active timer (synced via backend polling)
- [ ] Student view is read-only (no pause/modify)
- [ ] Warning visual (color change / flash) at configurable threshold
- [ ] Optional audio alert at timer end
- [ ] Station rotation mode runs sequential timers with auto-advance
- [ ] Timer can be linked to a specific hex
- [ ] Timer state persists if teacher refreshes page (backend state)
- [ ] Timer cleanup — no stale rows left in sheet after timer completes

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Error states handled (no active timer, sync failure, invalid duration)
- [ ] Timer accuracy within ±1 second over a 45-minute period
- [ ] Works on projector resolution (1920x1080 and 1280x720)
- [ ] Sound plays correctly (with browser autoplay restrictions handled)
- [ ] PROJECT_STATUS.md updated
- [ ] Commit message provided

---

## Open Questions for Implementation

1. **Sound:** Browser autoplay policies require a user gesture before playing audio. The teacher clicking "Start" satisfies this, but student devices may need a "tap to enable sound" prompt. Worth implementing sound on student side at all, or projector-only?
2. **Multiple timers:** Should a teacher be able to run different timers for different classes simultaneously? (Adds complexity but useful if teaching back-to-back periods.)
3. **Timer history:** Worth logging timer usage (for analytics on how class time is spent), or keep it ephemeral?
4. **Offline resilience:** If a student's connection drops mid-timer, they lose sync. The client-side timer should keep ticking based on last known state and re-sync when connection returns.
