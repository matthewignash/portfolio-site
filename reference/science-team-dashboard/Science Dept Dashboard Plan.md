# AISC Science Department Dashboard — Project Plan

## Project Overview

The Science Department at the American International School of Chennai (AISC) needs a centralized hub that brings together custom-built internal tools, existing Apps Script applications, and external services into a single, access-controlled dashboard. The platform will serve 5–10 department members and reduce the friction of switching between disconnected tools throughout the day.

**Platform:** Google Sites (restricted to department members via Google Workspace sharing)
**Custom Tools Stack:** Google Apps Script web apps with Google Sheets backends
**External Integrations:** LabLogger, Google Classroom (embedded via iframe)

---

## Architecture

### Why Google Sites as the Shell

The department already uses external tools (LabLogger, Google Classroom) that need to be accessible alongside custom-built applications. Google Sites provides native Google Workspace access control, supports embedding external URLs and Apps Script web apps via iframe, requires no additional hosting or domain setup, and is familiar to the team for basic edits and page organization.

### Apps Script Web App Pattern (All Custom Tools)

Every custom widget follows the same three-layer architecture:

**Layer 1 — Google Sheet (Database):** Each tool gets its own dedicated Sheet. Tabs within each Sheet separate data types (e.g., Users, Submissions, Config, Logs). This keeps tools independent — a schema change in one tool never affects another.

**Layer 2 — Apps Script Backend (Code.gs + service files):** Server-side logic exposed via `doGet()` for the web app. Functions called from the frontend use `google.script.run`. All backend functions consolidated into as few `.gs` files as practical to avoid the random-file-loading conflict issue in Apps Script.

**Layer 3 — HTML/CSS/JavaScript Frontend:** Single-page app served by `HtmlService`. Bootstrap for layout and styling. ES5-compatible JavaScript to avoid browser issues in the Apps Script sandbox. All HTML, CSS, and JS in a single file or loaded via `HtmlService.createTemplateFromFile()` includes.

### Deployment Settings for Iframe Compatibility

All custom Apps Script web apps should be deployed with these settings to ensure they work inside Google Sites iframes:

- Execute as: **Me** (the deploying teacher/admin)
- Who has access: **Anyone within [AISC domain]**
- Each new deployment generates a versioned URL — use the `/exec` URL (not `/dev`) for embedding
- The frontend should detect if it's running inside an iframe and suppress any full-page redirects
- Include `target="_top"` on any links that need to open outside the iframe
- Set a reasonable fixed height for the iframe embed in Google Sites (Google Sites does not auto-resize iframes)

### Iframe Embed Considerations

Some things to keep in mind when embedding tools in Google Sites:

- Google Sites wraps all embeds in a sandboxed iframe with limited cross-origin access
- First-time authentication popups can break inside iframes — users may need to open each Apps Script app in a new tab once to authorize, then the iframe version works
- External tools (LabLogger, Google Classroom) work only if they don't send `X-Frame-Options: DENY` headers — test each one before committing to the site layout
- Google Sites does not support dynamic iframe height — pick a reasonable fixed height per widget (400px–600px typical)
- Consider a "full screen" link/button within each widget that opens it in a new tab for complex interactions

---

## Existing Applications to Integrate

### 1. Purchasing Application

**Status:** Built and functional
**Backend:** Dedicated Google Sheet
**Purpose:** Department purchasing workflow with ISS order form export capability
**Integration Task:** Deploy as web app (if not already), embed in Google Sites via iframe, test that order form generation and any print/export features work within the iframe context. If export triggers a download or new tab, ensure `target="_top"` is set appropriately.

**Claude Code Session Notes:**
- No new development needed unless there are bugs or feature requests
- Focus on verifying iframe compatibility
- If the app currently uses any `window.open()` calls for exports, these may need adjustment for iframe context

### 2. Waterfall Schedule Application

**Status:** Built and functional
**Backend:** Dedicated Google Sheet
**Purpose:** Visual schedule display for the department
**Integration Task:** Embed in Google Sites. This is likely a read-heavy display tool, which means it should be one of the smoothest iframe embeds. Verify that any scrolling or responsive layout works within the fixed iframe height.

**Claude Code Session Notes:**
- Test at various iframe sizes (Google Sites gives limited control over embed dimensions)
- If the schedule is wide, consider whether horizontal scroll works or if a mobile-friendly layout is needed
- This may be the best candidate for the Phase 1 iframe test

### 3. IA Moderation Tool

**Status:** Active development and maintenance (known data corruption issue with band key auto-formatting)
**Backend:** Multi-tab Google Sheet with strand-band-indicator rubric model
**Purpose:** Multi-reviewer assessment system for IB Science Internal Assessments
**Integration Task:** This is the most complex existing app. Consider whether it should be a full-page link rather than an inline iframe embed, given its complexity. The moderation workflow likely benefits from full-screen space.

**Claude Code Session Notes:**
- Ongoing: The "1-2" / "3-4" band key timestamp corruption issue needs a permanent fix (both frontend display and backend data cleaning)
- Recommendation: Link to this tool from the dashboard rather than embedding inline — its complexity warrants a full browser tab
- Any fixes should include the defensive data-cleaning helpers discussed in prior sessions

### 4. Other Existing Apps

**Status:** Unknown — Matthew to inventory
**Action Item:** List any other department tools that should appear on the dashboard. For each, note whether it's an embed candidate or a link-out.

---

## New Applications to Build

### 5. Department Announcements Feed

**Priority:** Build first (simpler, mostly read-only, proves the iframe widget pattern)

#### User Stories

**As a department member, I want to:**
- See a reverse-chronological feed of department announcements when I open the dashboard
- Post a new announcement with a short message and optional category tag
- See who posted each announcement and when
- Pin important announcements so they stay at the top
- Delete or edit my own posts

**As the department head, I want to:**
- Pin/unpin any announcement
- Delete any announcement
- See all activity at a glance

#### Data Schema — Google Sheet: "Science Dept Announcements"

**Tab: Posts**

| Column | Type | Description |
|--------|------|-------------|
| postId | String | Unique ID (UUID or timestamp-based) |
| author | String | Email of the poster (auto-captured via `Session.getActiveUser()`) |
| authorName | String | Display name |
| message | String | The announcement text (limit ~500 chars) |
| category | String | Optional tag: "General", "Deadline", "Event", "FYI", "Urgent" |
| timestamp | DateTime | When the post was created |
| pinned | Boolean | TRUE if pinned to top |
| edited | Boolean | TRUE if edited after posting |
| editedTimestamp | DateTime | When last edited (if applicable) |

**Tab: Config**

| Column | Type | Description |
|--------|------|-------------|
| key | String | Config parameter name |
| value | String | Config parameter value |

Example rows: `maxPostLength` / `500`, `categories` / `General,Deadline,Event,FYI,Urgent`, `adminEmails` / `matthew@aisc.edu.in,...`

#### Frontend Design Notes

- Card-based layout, not a Twitter clone — each post is a simple card with author avatar (initials), name, timestamp, category badge, and message
- Newest posts first, pinned posts always at top regardless of date
- "New Post" button opens a simple form (textarea + category dropdown)
- No infinite scroll needed for 5–10 users — load all posts, paginate if >50
- Include a subtle "posted 2 hours ago" relative timestamp with full timestamp on hover
- Mobile-friendly since teachers may check on phones

#### Backend Architecture

```
Code.gs
├── doGet()                    → Serves the HTML frontend
├── getPosts()                 → Returns all posts as JSON (sorted, pinned first)
├── createPost(message, cat)   → Adds new row, returns the new post
├── editPost(postId, message)  → Updates message, sets edited flag
├── deletePost(postId)         → Removes row (admin or own posts only)
├── togglePin(postId)          → Toggles pinned status (admin only)
└── getCurrentUser()           → Returns session user email + name
```

#### Claude Code Development Prompt

> Build a Google Apps Script web app for a department announcements feed. The backend uses a Google Sheet with a "Posts" tab and "Config" tab (schemas above). The frontend is a single HTML file using Bootstrap 5 (CDN), ES5 JavaScript, card-based layout. Posts display in reverse chronological order with pinned posts at top. Users can create, edit, and delete their own posts. Admins (listed in Config tab) can pin/unpin and delete any post. Use `google.script.run` with `.withSuccessHandler()` and `.withFailureHandler()` for all server calls. Include loading states and error messages. Target deployment: embedded in a Google Sites iframe at approximately 500px height.

---

### 6. Department Task List

**Priority:** Build second (more complex due to shared + personal task model)

#### User Stories

**Shared Tasks — As a department member, I want to:**
- See a list of shared department tasks (visible to everyone)
- Mark shared tasks as complete
- See who completed each task and when
- Filter tasks by status (open, completed, overdue)
- See tasks assigned to me highlighted

**Personal Tasks — As a department member, I want to:**
- Maintain my own private to-do list that only I can see
- Add, edit, complete, and delete my personal tasks
- Set due dates and priority levels
- See my personal and shared tasks in one view but clearly separated

**As the department head, I want to:**
- Create shared tasks and assign them to specific people or "everyone"
- Set due dates and priority for shared tasks
- See a dashboard of task completion across the department
- Archive completed tasks periodically

#### Data Schema — Google Sheet: "Science Dept Tasks"

**Tab: SharedTasks**

| Column | Type | Description |
|--------|------|-------------|
| taskId | String | Unique ID |
| title | String | Task description |
| assignee | String | Email or "ALL" for everyone |
| createdBy | String | Email of creator |
| createdDate | DateTime | When created |
| dueDate | Date | Optional due date |
| priority | String | "Low", "Normal", "High", "Urgent" |
| status | String | "Open", "Completed", "Archived" |
| completedBy | String | Email of who completed it |
| completedDate | DateTime | When completed |
| notes | String | Optional additional context |

**Tab: PersonalTasks**

| Column | Type | Description |
|--------|------|-------------|
| taskId | String | Unique ID |
| owner | String | Email of the task owner |
| title | String | Task description |
| dueDate | Date | Optional due date |
| priority | String | "Low", "Normal", "High", "Urgent" |
| status | String | "Open", "Completed" |
| completedDate | DateTime | When completed |
| sortOrder | Number | For manual drag-and-drop reordering |

**Tab: Config**

Same pattern as the announcements tool — admin emails, priority options, archive-after-days setting.

#### Frontend Design Notes

- Two-panel layout: "Department Tasks" on the left/top, "My Tasks" on the right/bottom
- Each task is a compact row with checkbox, title, assignee badge, due date, and priority indicator
- Overdue tasks highlighted in red/orange
- Quick-add input at the top of each panel (type and press Enter)
- Collapsible "Completed" section at the bottom of each panel
- For shared tasks assigned to "ALL," show a completion count (e.g., "3/7 completed")
- Admin view: additional "Assign" and "Archive" controls

#### Backend Architecture

```
Code.gs
├── doGet()                          → Serves HTML frontend
├── getSharedTasks(filter)           → Returns shared tasks (with optional status filter)
├── getPersonalTasks()               → Returns current user's personal tasks only
├── createSharedTask(data)           → Admin: creates shared task
├── createPersonalTask(data)         → Creates personal task for current user
├── updateTaskStatus(taskId, type, status) → Marks task complete/open
├── editTask(taskId, type, data)     → Updates task details
├── deleteTask(taskId, type)         → Deletes task (own or admin)
├── archiveCompleted(type)           → Admin: archives old completed tasks
├── getCompletionSummary()           → Admin: completion stats across department
└── getCurrentUser()                 → Returns session user email + admin status
```

#### Decision Point: "ALL" Task Completion Tracking

When a shared task is assigned to "ALL," there's a design question: does one person completing it complete it for everyone, or does each person need to mark it individually?

**Option A — Single completion:** Any department member checks it off and it's done. Simpler. Good for tasks like "Submit grades by Friday" where one person doing it doesn't affect others, but you just need to know it's handled.

**Option B — Per-person completion:** Each person checks it off independently. Requires a separate tracking tab (SharedTaskCompletions) with one row per user per task. Better for tasks like "Complete lab safety training" where everyone must do it individually.

**Recommendation:** Start with Option A for simplicity. Add Option B as a v2 feature if there's demand, using an additional `SharedTaskCompletions` tab.

#### Claude Code Development Prompt

> Build a Google Apps Script web app for a department task manager with shared and personal tasks. Backend uses a Google Sheet with "SharedTasks", "PersonalTasks", and "Config" tabs (schemas above). Frontend is a single HTML file using Bootstrap 5, ES5 JavaScript, two-panel layout. Shared tasks panel shows department tasks with assignee badges and completion status. Personal tasks panel shows only the current user's tasks. Both panels support add/edit/complete/delete. Admin users (from Config) can create shared tasks, assign them, and archive completed tasks. Use `google.script.run` with success/failure handlers. Quick-add inputs at top of each panel. Overdue tasks highlighted. Target: iframe embed at ~550px height.

---

### 7. Department Kanban Board

**Priority:** Build after task list (leverages similar data patterns but adds visual workflow)

**Reference Implementation:** Matthew has an existing administration hub application stored locally that includes a Kanban-style board. Upload these files to the Claude Code session as reference for design patterns and feature expectations. Claude Code should review the existing implementation before building, adapting the design to fit the department's needs while following the Apps Script + Sheets architecture pattern used across this project.

#### User Stories

**As a department member, I want to:**
- See a visual board with columns representing workflow stages (e.g., "To Do", "In Progress", "Review", "Done")
- Drag and drop cards between columns to update their status
- Create new cards for projects, initiatives, or action items I'm responsible for
- See at a glance who owns each card and when it's due
- Filter the board to show only my cards or a specific category

**As the department head, I want to:**
- Create and manage board columns (customizable workflow stages)
- Create cards and assign them to specific teachers or mark as department-wide
- Track meeting action items by converting them into Kanban cards
- See workload distribution across the department (who has the most cards in progress)
- Archive completed cards periodically to keep the board clean

#### Card Types and Categories

Cards should support multiple contexts since the board tracks department projects, individual workload, and meeting action items:

- **Project** — Department initiatives (e.g., "Update lab safety protocols", "Plan Science Week")
- **Task** — Individual teacher workload items (e.g., "Submit IB sample moderation by March 15")
- **Action Item** — Generated from meeting minutes (links back to the meeting record)
- **Deadline** — Time-sensitive items with prominent due date display

#### Data Schema — Google Sheet: "Science Dept Kanban"

**Tab: Columns**

| Column | Type | Description |
|--------|------|-------------|
| columnId | String | Unique ID |
| title | String | Column name (e.g., "To Do", "In Progress") |
| sortOrder | Number | Display order left to right |
| wipLimit | Number | Optional work-in-progress limit (0 = unlimited) |
| color | String | Hex color for column header |

Default columns: "Backlog", "To Do", "In Progress", "Review", "Done"

**Tab: Cards**

| Column | Type | Description |
|--------|------|-------------|
| cardId | String | Unique ID |
| title | String | Card title |
| description | String | Optional longer description |
| cardType | String | "Project", "Task", "Action Item", "Deadline" |
| columnId | String | Which column the card is in |
| assignee | String | Email of assigned person, or "ALL" |
| createdBy | String | Email of creator |
| createdDate | DateTime | When created |
| dueDate | Date | Optional due date |
| priority | String | "Low", "Normal", "High", "Urgent" |
| sortOrder | Number | Position within the column (for ordering) |
| labels | String | Comma-separated tags (e.g., "IB,Urgent,Lab") |
| linkedMeetingId | String | Optional — links to a meeting record if this card was an action item |
| archivedDate | DateTime | Null if active, timestamp if archived |

**Tab: CardHistory**

| Column | Type | Description |
|--------|------|-------------|
| historyId | String | Unique ID |
| cardId | String | Which card |
| action | String | "created", "moved", "edited", "assigned", "archived" |
| fromColumn | String | Previous column (for moves) |
| toColumn | String | New column (for moves) |
| actor | String | Email of who made the change |
| timestamp | DateTime | When the change happened |

**Tab: Config**

Standard config tab with admin emails, default columns, label options, archive-after-days.

#### Frontend Design Notes

- Classic Kanban layout: horizontal columns, cards stacked vertically within each column
- Drag-and-drop using HTML5 Drag and Drop API (ES5 compatible — no external libraries required, though SortableJS via CDN is an option if vanilla drag-and-drop proves too finicky in the Apps Script sandbox)
- Cards show: colored type badge, title, assignee avatar (initials), due date (red if overdue), priority dot
- Click a card to open a detail modal for editing description, assignee, labels, due date
- Column headers show card count and optional WIP limit indicator
- "Add Card" button at the bottom of each column (or a floating action button)
- Filter bar at top: by assignee, card type, label, due date range
- "Archive Done" button to bulk-archive all cards in the "Done" column
- Compact mode toggle for when the board gets dense (show titles only, no metadata)
- **Important for iframe context:** Horizontal scrolling is tricky in iframes — consider limiting to 4–5 visible columns, or making this a full-page tool with a link from the dashboard rather than an inline embed

#### Backend Architecture

```
Code.gs
├── doGet()                              → Serves HTML frontend
├── getBoard()                           → Returns all columns + active cards as JSON
├── getArchivedCards(filter)             → Returns archived cards with optional date filter
├── createCard(data)                     → Creates new card in specified column
├── updateCard(cardId, data)             → Updates card details
├── moveCard(cardId, toColumnId, sortOrder) → Moves card between columns, logs history
├── archiveCard(cardId)                  → Archives a card
├── bulkArchiveDone()                    → Archives all cards in "Done" column
├── createColumn(title, color)           → Admin: adds a new column
├── updateColumn(columnId, data)         → Admin: edits column title/color/WIP limit
├── deleteColumn(columnId)               → Admin: removes column (must be empty)
├── reorderColumns(columnIds)            → Admin: updates column sort order
├── getCardHistory(cardId)               → Returns history log for a card
├── createCardFromActionItem(meetingId, actionData) → Creates card linked to meeting minutes
└── getCurrentUser()                     → Returns session user + admin status
```

#### Design Decision: Drag-and-Drop in Apps Script

Drag-and-drop is the core UX expectation for a Kanban board, but it has some friction in the Apps Script environment. Two approaches:

**Option A — HTML5 native drag-and-drop:** No dependencies. Works in modern browsers. Can be finicky on touch devices (mobile). The `dragstart`, `dragover`, `drop` events are ES5 compatible. This is the leaner option and avoids CDN dependencies.

**Option B — SortableJS via CDN:** `<script src="https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js">`. More reliable drag-and-drop with better touch support and animation. Adds ~10KB. Works well with the shared-list pattern (dragging between columns).

**Recommendation:** Start with Option B (SortableJS). The library is small, well-tested, and the touch support matters since some teachers may use tablets. Fall back to Option A only if CDN loading is unreliable inside the Apps Script iframe.

#### Claude Code Development Prompt

> Build a Google Apps Script web app for a department Kanban board. Backend uses a Google Sheet with "Columns", "Cards", "CardHistory", and "Config" tabs (schemas in the planning doc). Frontend is a single HTML file using Bootstrap 5 and SortableJS (CDN) for drag-and-drop, ES5 JavaScript. Board displays columns horizontally with cards stacked vertically. Cards show type badge, title, assignee initials, due date, and priority. Click to open detail modal. Drag between columns logs history. Filter bar for assignee/type/label. Admin users can manage columns and bulk-archive. Use `google.script.run` with success/failure handlers. Include `createCardFromActionItem()` backend function for integration with a separate Meeting Minutes tool. Deploy with `.setXFrameOptionsMode(ALLOWALL)`.
>
> **IMPORTANT:** Reference the uploaded administration hub files for design patterns and UI expectations. Adapt the existing Kanban design to work within Apps Script + Google Sheets constraints.

---

### 8. Meeting Minutes

**Priority:** Build alongside or after Kanban (the two tools integrate — action items from meetings become Kanban cards)

**Reference Implementation:** Matthew has an existing administration hub application stored locally that includes meeting minutes functionality. Upload these files to the Claude Code session as reference. Claude Code should review the existing implementation before building, adapting it to the department's specific needs.

#### User Stories

**As a department member, I want to:**
- See upcoming and past department meetings in a searchable list
- View the agenda before a meeting so I can prepare
- See meeting minutes after a meeting with clear action items, decisions, and notes
- Know which action items are assigned to me across all meetings
- Search past meetings by topic, date, or keyword to find previous decisions

**As the meeting organizer (department head or designee), I want to:**
- Create a new meeting from a template so I don't start from scratch each time
- Set the agenda before the meeting and share it with attendees
- Record minutes during the meeting (attendees, discussion points, decisions, action items)
- Assign action items to specific people with due dates
- Convert action items into Kanban board cards with one click
- Lock/finalize minutes after the meeting so they become a permanent record
- See a running list of all open action items across all meetings

**As the department head, I want to:**
- See a dashboard of overdue action items from past meetings
- Export meeting minutes as a PDF or Google Doc for administration
- Have a complete searchable archive of all department meetings

#### Meeting Templates

Meetings should be auto-generated from configurable templates to reduce setup friction. Example templates:

- **Weekly Department Meeting** — Standard agenda: announcements, curriculum updates, action item review, new business
- **IB Moderation Session** — Agenda: samples to review, standardization discussion, moderation decisions
- **Lab Safety Review** — Agenda: incident reports, equipment status, safety training updates
- **Ad Hoc Meeting** — Blank template with just date/time/attendees

Templates are stored in the Config tab and can be edited by admins.

#### Data Schema — Google Sheet: "Science Dept Meetings"

**Tab: Meetings**

| Column | Type | Description |
|--------|------|-------------|
| meetingId | String | Unique ID |
| title | String | Meeting title (auto-filled from template, editable) |
| templateType | String | Which template was used |
| date | Date | Meeting date |
| startTime | String | Start time (e.g., "14:00") |
| endTime | String | End time |
| location | String | Room or "Virtual" |
| organizer | String | Email of meeting creator |
| status | String | "Draft", "Scheduled", "In Progress", "Finalized" |
| createdDate | DateTime | When the meeting record was created |
| finalizedDate | DateTime | When minutes were locked |
| finalizedBy | String | Email of who finalized |

**Tab: Attendees**

| Column | Type | Description |
|--------|------|-------------|
| attendeeId | String | Unique ID |
| meetingId | String | Which meeting |
| email | String | Attendee email |
| name | String | Display name |
| role | String | "Organizer", "Note Taker", "Attendee" |
| attended | Boolean | TRUE if they actually attended |

**Tab: AgendaItems**

| Column | Type | Description |
|--------|------|-------------|
| agendaId | String | Unique ID |
| meetingId | String | Which meeting |
| sortOrder | Number | Display order |
| title | String | Agenda topic |
| description | String | Optional context or pre-reading notes |
| presenter | String | Email of who leads this item |
| timeAllocation | Number | Minutes allocated (optional) |
| notes | String | Discussion notes recorded during meeting |

**Tab: Decisions**

| Column | Type | Description |
|--------|------|-------------|
| decisionId | String | Unique ID |
| meetingId | String | Which meeting |
| agendaId | String | Optional — linked to specific agenda item |
| decision | String | What was decided |
| context | String | Brief reasoning or discussion summary |
| timestamp | DateTime | When recorded |

**Tab: ActionItems**

| Column | Type | Description |
|--------|------|-------------|
| actionId | String | Unique ID |
| meetingId | String | Which meeting |
| agendaId | String | Optional — linked to specific agenda item |
| description | String | What needs to be done |
| assignee | String | Email of responsible person |
| dueDate | Date | When it's due |
| status | String | "Open", "In Progress", "Completed", "Cancelled" |
| completedDate | DateTime | When marked complete |
| kanbanCardId | String | Optional — ID of linked Kanban card if converted |
| notes | String | Optional follow-up notes |

**Tab: Templates**

| Column | Type | Description |
|--------|------|-------------|
| templateId | String | Unique ID |
| name | String | Template name |
| defaultTitle | String | Auto-filled meeting title (supports date tokens like `{DATE}`) |
| defaultAgendaItems | String | JSON array of default agenda item titles |
| defaultDuration | Number | Default meeting length in minutes |
| defaultAttendees | String | "ALL" or comma-separated emails |
| isActive | Boolean | Whether this template is available for use |

**Tab: Config**

Standard config tab: admin emails, default location, notification preferences.

#### Frontend Design Notes

- **Meeting List View:** Reverse chronological list of meetings. Each row shows date, title, status badge (Draft/Scheduled/Finalized), attendee count, and action item count. Search bar and date range filter at top.
- **Meeting Detail View:** Single meeting view with tabbed or accordion sections:
  - **Agenda** — Ordered list of topics with time allocations. Editable before finalization.
  - **Attendees** — List with attendance checkboxes. Role badges (Organizer, Note Taker).
  - **Minutes** — Each agenda item expands to show discussion notes. Inline editing during the meeting.
  - **Decisions** — List of decisions made, linked to agenda items.
  - **Action Items** — Table with assignee, due date, status. "Send to Kanban" button on each item.
- **New Meeting Flow:** Select template → auto-populates title, agenda, attendees → edit as needed → save as Draft → change to Scheduled when ready
- **Finalize button:** Locks all fields, sets status to "Finalized", records timestamp. Only organizer/admin can finalize.
- **Action Items Dashboard:** Cross-meeting view of all open action items, filterable by assignee and status. Accessible from the main meeting list view.
- **Search:** Full-text search across meeting titles, agenda items, decisions, and action item descriptions.
- **This tool benefits from full-screen space** — recommend a dedicated Google Sites page rather than an inline dashboard embed. Link from the dashboard with a "View Meeting Minutes" card.

#### Backend Architecture

```
Code.gs
├── doGet()                              → Serves HTML frontend
├── getMeetings(filter)                  → Returns meetings list with optional status/date filter
├── getMeetingDetail(meetingId)          → Returns full meeting with attendees, agenda, decisions, action items
├── createMeetingFromTemplate(templateId, date, time) → Creates new meeting from template
├── createMeetingBlank(data)             → Creates meeting without template
├── updateMeeting(meetingId, data)       → Updates meeting metadata
├── finalizeMeeting(meetingId)           → Locks meeting, sets finalized status
├── addAttendee(meetingId, email, role)  → Adds attendee
├── updateAttendance(meetingId, attendeeUpdates) → Batch updates attendance checkboxes
├── addAgendaItem(meetingId, data)       → Adds agenda item
├── updateAgendaItem(agendaId, data)     → Updates agenda item (including notes during meeting)
├── reorderAgendaItems(meetingId, agendaIds) → Updates sort order
├── addDecision(meetingId, data)         → Records a decision
├── addActionItem(meetingId, data)       → Creates an action item
├── updateActionItem(actionId, data)     → Updates action item status/details
├── sendActionItemToKanban(actionId)     → Creates Kanban card linked to this action item
├── getOpenActionItems(filter)           → Cross-meeting view of all open action items
├── getTemplates()                       → Returns available meeting templates
├── updateTemplate(templateId, data)     → Admin: edits a template
├── searchMeetings(query)                → Full-text search across meeting content
├── exportMeetingAsDoc(meetingId)        → Generates Google Doc with formatted minutes
└── getCurrentUser()                     → Returns session user + admin status
```

#### Integration with Kanban Board

The `sendActionItemToKanban()` function calls the Kanban board's Sheet directly (since both Sheets are accessible from any Apps Script in the domain). It:

1. Reads the action item details
2. Creates a new row in the Kanban "Cards" tab with `cardType = "Action Item"` and `linkedMeetingId` set
3. Updates the action item's `kanbanCardId` field
4. Returns the new card ID for the frontend to show confirmation

This cross-Sheet write is the simplest integration pattern. An alternative would be using Apps Script's `UrlFetchApp` to call the Kanban app's web API, but direct Sheet access is more reliable and avoids auth complexity.

**Important consideration:** If the Kanban and Meeting Minutes tools share action item status, you need to decide which is the source of truth. Recommendation: the Kanban card status is authoritative once an action item is converted. The meeting minutes tool shows a "View on Kanban Board" link for converted items rather than maintaining duplicate status.

#### Claude Code Development Prompt

> Build a Google Apps Script web app for department meeting minutes. Backend uses a Google Sheet with "Meetings", "Attendees", "AgendaItems", "Decisions", "ActionItems", "Templates", and "Config" tabs (schemas in planning doc). Frontend is a single HTML file using Bootstrap 5, ES5 JavaScript. Two main views: Meeting List (searchable, filterable) and Meeting Detail (tabbed sections for agenda, attendees, minutes/notes, decisions, action items). Meetings are created from templates that auto-populate agenda and attendees. Organizer can finalize meetings to lock them. Action items can be sent to a separate Kanban board Google Sheet via direct Sheet write. Include cross-meeting action item dashboard. Search across all meeting content. Use `google.script.run` with success/failure handlers. Deploy with `.setXFrameOptionsMode(ALLOWALL)`.
>
> **IMPORTANT:** Reference the uploaded administration hub files for design patterns and UI expectations. Adapt the existing meeting minutes design to work within Apps Script + Google Sheets constraints.

---

## External Tool Embeds

### 9. LabLogger

**Type:** External web application
**Integration:** Iframe embed on Google Sites
**Pre-flight Test:** Navigate to the LabLogger URL in a browser, open DevTools → Network tab, check the response headers for `X-Frame-Options` or `Content-Security-Policy: frame-ancestors`. If either blocks framing, the embed won't work and you'll need to link out instead.
**Fallback:** If iframe is blocked, create a prominent "Open LabLogger" button/link card on the dashboard page.

### 10. Google Classroom

**Type:** Google first-party tool
**Integration:** Google Sites has a native Google Classroom embed option (Insert → Google Classroom). This is likely more reliable than a raw iframe. Test whether it shows the class stream, assignments, or just a link.
**Notes:** Google Classroom's embed behavior inside Sites can be limited — it may only show a summary card rather than the full interactive interface. If that's insufficient, a link-out card is the pragmatic choice.

---

## Google Sites Layout Plan

### Suggested Page Structure

**Page: Dashboard (Home)**
This is the daily-use landing page. Layout as a grid of embedded widgets:

```
┌─────────────────────────────────────────────────────┐
│  AISC Science Department Hub              [Nav Bar] │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│  Announcements Feed  │  Task List                   │
│  (Apps Script embed) │  (Apps Script embed)         │
│  ~500px height       │  ~550px height               │
│                      │                              │
├──────────────────────┴──────────────────────────────┤
│                                                     │
│  Waterfall Schedule (Apps Script embed, full width)  │
│  ~400px height                                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Page: Kanban Board**
Full-page dedicated to the Kanban board (needs horizontal space for columns):

```
┌─────────────────────────────────────────────────────┐
│  Department Kanban Board          [Filter] [Archive] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Kanban Board (Apps Script embed, full width)        │
│  ~700px height (or link to full-screen app)          │
│                                                      │
│  Backlog | To Do | In Progress | Review | Done       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Page: Meeting Minutes**
Full-page dedicated to meeting records and action items:

```
┌─────────────────────────────────────────────────────┐
│  Department Meetings                    [New Meeting] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Meeting Minutes (Apps Script embed, full width)     │
│  ~700px height (or link to full-screen app)          │
│                                                      │
│  Meeting list / detail view with action items        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Page: Tools**
Links and embeds for external services and complex internal tools:

```
┌─────────────────────────────────────────────────────┐
│  Department Tools                                    │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│  LabLogger           │  Google Classroom            │
│  (embed or link)     │  (native embed or link)      │
│                      │                              │
├──────────────────────┼──────────────────────────────┤
│                      │                              │
│  Purchasing App      │  IA Moderation Tool          │
│  (Apps Script embed) │  (link — opens new tab)      │
│                      │                              │
└──────────────────────┴──────────────────────────────┘
```

**Page: Resources (optional)**
Department documents, shared Drive folders, curriculum links, lab manuals, etc.

---

## Development Roadmap

### Phase 1 — Validate the Iframe Pattern (1 session)

**Goal:** Confirm that existing Apps Script web apps embed correctly in Google Sites.

Tasks:
1. Take the Waterfall Schedule app (likely the simplest/most read-heavy)
2. Ensure it's deployed with the correct settings (execute as me, domain access)
3. Create a test Google Sites page, embed the app URL
4. Verify: Does it load? Does auth work? Does scrolling behave? Does layout hold at a fixed height?
5. Test on both desktop and mobile
6. Document any issues and fixes

**Outcome:** A known-good pattern for embedding Apps Script web apps.

### Phase 2 — Build the Announcements Feed (1–2 sessions)

**Goal:** First new widget, fully functional and embedded.

Session 1:
1. Create the Google Sheet with Posts and Config tabs
2. Build the backend (Code.gs with all functions)
3. Build the frontend HTML
4. Test as a standalone web app

Session 2:
1. Fix any bugs from standalone testing
2. Deploy and embed in Google Sites
3. Adjust layout/height for iframe context
4. Have 1–2 department members test posting and reading

### Phase 3 — Build the Task List (2–3 sessions)

**Goal:** Second widget with shared + personal task support.

Session 1:
1. Create the Google Sheet with SharedTasks, PersonalTasks, and Config tabs
2. Build the backend functions
3. Build the two-panel frontend

Session 2:
1. Test shared task workflows (create, assign, complete)
2. Test personal task workflows
3. Test admin-specific features
4. Fix bugs

Session 3:
1. Deploy and embed in Google Sites
2. Adjust for iframe context
3. Test with the department

### Phase 4 — Build the Kanban Board (2–3 sessions)

**Goal:** Visual project/task tracking board with drag-and-drop.

**Pre-session setup:** Upload the administration hub files from your local machine to the Claude Code session. These serve as the design reference.

Session 1:
1. Claude Code reviews the uploaded administration hub Kanban implementation
2. Create the Google Sheet with Columns, Cards, CardHistory, and Config tabs
3. Build the backend functions
4. Build the frontend with SortableJS drag-and-drop

Session 2:
1. Test drag-and-drop column moves and history logging
2. Test card CRUD (create, edit, archive)
3. Test filter bar and admin column management
4. Build the `createCardFromActionItem()` integration endpoint (for future Meeting Minutes connection)

Session 3:
1. Deploy and embed in Google Sites (dedicated Kanban page)
2. Adjust for iframe context — test horizontal scrolling behavior
3. If iframe is too constrained, switch to a "full screen" link-out pattern
4. Seed the board with a few sample columns and cards for department testing

### Phase 5 — Build Meeting Minutes (2–3 sessions)

**Goal:** Meeting management with templates, minutes recording, and action item tracking.

**Pre-session setup:** Upload the administration hub files from your local machine (same files as Kanban if they're part of the same app). These serve as the design reference.

Session 1:
1. Claude Code reviews the uploaded administration hub meeting minutes implementation
2. Create the Google Sheet with all 7 tabs (Meetings, Attendees, AgendaItems, Decisions, ActionItems, Templates, Config)
3. Build backend functions for meeting CRUD and template system
4. Build the Meeting List view

Session 2:
1. Build the Meeting Detail view (agenda, attendees, notes, decisions, action items)
2. Build the template-based meeting creation flow
3. Test finalize/lock workflow
4. Build the cross-meeting action items dashboard

Session 3:
1. Wire up `sendActionItemToKanban()` integration with the Kanban board's Sheet
2. Build search functionality
3. Build `exportMeetingAsDoc()` for administration exports
4. Deploy and add to Google Sites (dedicated Meeting Minutes page)

### Phase 6 — Integrate Everything (1 session)

**Goal:** Complete Google Sites dashboard with all tools.

Tasks:
1. Embed all Apps Script widgets on the Dashboard page
2. Set up dedicated Kanban Board page with full-width embed
3. Set up dedicated Meeting Minutes page with full-width embed
4. Test LabLogger iframe embed (or set up link-out fallback)
5. Add Google Classroom embed/link
6. Embed or link the Purchasing app and IA Moderation Tool
7. Set up the nav structure and page organization
8. Verify Kanban ↔ Meeting Minutes integration works (action item to card flow)
9. Restrict site access to department members
10. Share the site URL with the department

### Phase 7 — Polish and Iterate (ongoing)

Based on department feedback:
- Adjust widget layouts and heights
- Add features (e.g., per-person "ALL" task tracking)
- Add email notifications for urgent announcements, overdue tasks, or upcoming meetings
- Consider a "quick links" widget for frequently accessed resources
- Mobile optimization based on actual usage patterns
- Kanban: add card comments/discussion threads if requested
- Meeting Minutes: add email notification to attendees when agenda is published or minutes are finalized
- Meeting Minutes: add Google Calendar integration to auto-create calendar events from meetings
- Cross-tool: action item status sync between Meeting Minutes and Kanban (if bidirectional sync is needed)

---

## Technical Reference: Common Patterns

### Standard Apps Script Web App Boilerplate

```javascript
// Code.gs — Standard doGet for iframe-compatible web app
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Tool Name')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// CRITICAL: .setXFrameOptionsMode(ALLOWALL) is required
// for the app to load inside a Google Sites iframe.

// Standard user identification
function getCurrentUser() {
  var email = Session.getActiveUser().getEmail();
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var config = ss.getSheetByName('Config');
  // Check if user is admin
  var adminRow = config.getDataRange().getValues()
    .find(function(row) { return row[0] === 'adminEmails'; });
  var isAdmin = adminRow && adminRow[1].split(',')
    .map(function(e) { return e.trim(); })
    .indexOf(email) > -1;
  return { email: email, isAdmin: isAdmin };
}
```

### Standard Frontend Error Handling Pattern

```javascript
// ES5 compatible — use in all frontend code
function callServer(fnName, args, onSuccess) {
  var runner = google.script.run
    .withSuccessHandler(onSuccess)
    .withFailureHandler(function(error) {
      console.error('Server error in ' + fnName + ':', error);
      showError('Something went wrong. Please try again.');
    });
  runner[fnName].apply(runner, args || []);
}

function showError(message) {
  var el = document.getElementById('error-banner');
  el.textContent = message;
  el.style.display = 'block';
  setTimeout(function() { el.style.display = 'none'; }, 5000);
}
```

### Google Sheet ID Management

Each tool's Sheet ID should be stored as a script property (File → Project Properties → Script Properties) rather than hardcoded in the source, making it easier to switch between test and production sheets.

```javascript
function getSheetId() {
  return PropertiesService.getScriptProperties().getProperty('SHEET_ID');
}
```

---

## Open Questions and Decisions

1. **LabLogger iframe compatibility** — Needs testing. If it blocks framing, fall back to a link card.
2. **Google Classroom embed depth** — Test whether the native embed shows useful content or just a summary.
3. **"ALL" task completion model** — Start with single-completion (Option A). Revisit if the department needs per-person tracking.
4. **Notification system** — Should announcements, overdue tasks, or meeting agendas trigger email notifications? Defer to Phase 7 unless there's strong demand.
5. **Other existing apps** — Matthew to inventory any additional tools that should appear on the dashboard.
6. **Mobile usage patterns** — How often do teachers access these tools from phones vs. laptops? Affects layout priorities.
7. **Data retention** — How long should completed tasks, archived Kanban cards, and old announcements be kept? Consider an auto-archive policy.
8. **Kanban ↔ Meeting Minutes source of truth** — Recommendation: once an action item is sent to Kanban, the Kanban card status is authoritative. Meeting Minutes shows a "View on Kanban" link. Revisit if bidirectional sync is needed.
9. **Kanban drag-and-drop library** — Start with SortableJS (CDN). Fall back to native HTML5 drag-and-drop if CDN loading is unreliable in the Apps Script iframe.
10. **Meeting Minutes export format** — Google Doc is recommended for shareability within the school. PDF export could be added later if administration requires it.
11. **Administration hub reference files** — Matthew to upload local files to Claude Code sessions for Kanban and Meeting Minutes builds. Both Claude Code prompts reference these files.
12. **Cross-tool Sheet access** — The Meeting Minutes → Kanban integration requires the Kanban Sheet ID to be stored as a script property in the Meeting Minutes project. Document this during Phase 5 setup.
