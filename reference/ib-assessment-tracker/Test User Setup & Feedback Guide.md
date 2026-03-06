# IB Assessment Tracker — Test User Setup & Feedback Guide

## 1. Adding Test Users

### STUDENTS Sheet

Open the Google Sheet backend and navigate to the **Students** tab. Add a row for each tester:

| Column | Description | Example |
|--------|-------------|---------|
| `student_key` | Unique ID (number or string) | `9` |
| `first_name` | Tester's first name | `Sarah` |
| `last_name` | Tester's last name | `Chen` |
| `class_section` | Class/section code | `SL` or `HL` |
| `email` | Google account email (must match exactly) | `sarah.chen@aischennai.org` |
| `level` | IB level — must be `SL` or `HL` | `SL` |

**Important:**
- The `email` must exactly match the Google account the tester will sign in with (case-insensitive)
- The `level` must match the level of the exam(s) they need to view (SL students only see SL exams, HL students only see HL exams)
- The `student_key` must be unique across all students

### ROSTER Sheet

Also add a matching row to the **Roster** tab:

| Column | Value |
|--------|-------|
| `class_section` | Same as Students tab |
| `last_name` | Same as Students tab |
| `first_name` | Same as Students tab |
| `student_key` | Same as Students tab |

### Quick Checklist

- [ ] Row added to **Students** tab with all 6 fields
- [ ] Email matches the tester's Google account
- [ ] Level is either `SL` or `HL` (not blank)
- [ ] Matching row added to **Roster** tab
- [ ] Student has response data (graded by teacher) for at least one exam

---

## 2. Exam Visibility

Students can only see exams that are:

1. **Visible** — Exam status must be set to `visible` in the Builder
2. **Level-matched** — Exam level must match the student's level
3. **Permission-allowed** — If the PERMISSIONS sheet has entries, the student must have an `allow` rule (if PERMISSIONS is empty, all visible exams are accessible by default)

### How to Set Visibility

1. Open the web app as teacher
2. Go to **Builder** tab
3. Select the exam
4. In the Setup section, set **Status** to `visible`

Or directly in the Google Sheet: find the exam row in the **Exams** tab and set the `status` column to `visible`.

---

## 3. Deploying the Web App

### First-Time Deployment

1. Open the Apps Script editor (Extensions > Apps Script from the Google Sheet)
2. Click **Deploy** > **New deployment**
3. Settings:
   - **Type:** Web app
   - **Execute as:** User accessing the web app
   - **Who has access:** Anyone within your organization (e.g., `aischennai.org`)
4. Click **Deploy**
5. Copy the deployment URL

### Updating an Existing Deployment

1. Click **Deploy** > **Manage deployments**
2. Select the active deployment
3. Click the pencil icon to edit
4. Set version to **New version**
5. Click **Deploy**

### Domain Configuration

In the Google Sheet's **Config** tab, check these values:

| Key | Value | Notes |
|-----|-------|-------|
| `teacher_email` | `your.email@domain.org` | Comma-separated for multiple teachers |
| `allowed_domain` | `@aischennai.org` | Leave blank to allow any domain |

If `allowed_domain` is set, only Google accounts from that domain can access the app.

---

## 4. Student Testing Instructions

Share these instructions with your testers:

### Getting Started

1. Open the app URL in your browser (Chrome recommended)
2. Sign in with your school Google account when prompted
3. You should see your name in the top-right corner

### Dashboard Tab

- **Score Card**: Shows your IB grade (1-7), total points, and strand breakdown (KU, TT, C)
- **Topic Analysis**: Expandable tree showing your performance by topic
- **Trend View**: Click "Trend" to see your scores across multiple exams (if available)
- Click any **topic badge** (e.g., `1.1`, `2.3`) to open a drill-down showing which questions you got right/wrong in that topic

### Exams Tab

- Select an exam from the dropdown (if multiple are available)
- **Paper 1A (MCQ)**: Table showing your answer, the correct answer, and whether you got it right
- **Paper 1B / Paper 2**: Question cards showing points earned, rubric criteria (checkmarks for earned, X for missed)
- **Question Content**: If enabled by your teacher, you'll see the actual question text and images alongside your results
- Click the paper header to collapse/expand each section

### What to Try

- Switch between exams in the selector
- Collapse and expand paper sections
- Click topic badges to see the drill-down modal
- Check that your scores and answers look correct
- Try on both desktop and mobile

---

## 5. Feedback Questionnaire

Please answer the following questions after testing. Rate items on a 1-5 scale (1=Poor, 5=Excellent) where applicable.

### Access & Login

1. Were you able to access the app URL without issues?
   - [ ] Yes, loaded immediately
   - [ ] Yes, but it was slow
   - [ ] No, I got an error (describe below)

2. Did you see your correct name and class section in the header?
   - [ ] Yes
   - [ ] No (what did you see?)

### Dashboard Tab

3. Did the dashboard load within a few seconds?
   - [ ] Yes (under 3 seconds)
   - [ ] Somewhat slow (3-10 seconds)
   - [ ] Very slow (over 10 seconds)
   - [ ] It failed to load

4. Were the correct exams shown (matching your level)?
   - [ ] Yes
   - [ ] No (describe what was missing or extra)

5. Rate the clarity of the score card information: ___/5

6. Rate the usefulness of the topic analysis breakdown: ___/5

### Exam Results Tab

7. For Paper 1A (MCQ): Were your answers and correct answers displayed accurately?
   - [ ] Yes
   - [ ] No (describe issues)
   - [ ] N/A (no MCQ paper)

8. For Papers 1B/2: Were the rubric criteria and point breakdowns clear?
   - [ ] Yes, very clear
   - [ ] Somewhat clear
   - [ ] Confusing
   - [ ] N/A

9. If question content (text/images) was shown, did it display correctly?
   - [ ] Yes
   - [ ] Images were broken/missing
   - [ ] Text formatting looked wrong
   - [ ] N/A (not enabled)

### Topic Drill-Down

10. Did clicking a topic badge open the drill-down modal?
    - [ ] Yes
    - [ ] No
    - [ ] Didn't try

11. Was the per-question breakdown in the drill-down useful?
    - [ ] Very useful
    - [ ] Somewhat useful
    - [ ] Not useful

### Overall Experience

12. Rate the overall clarity of information: ___/5

13. Rate the visual design: ___/5

14. Rate the loading speed: ___/5

15. What was the most confusing or unclear part?

    _____________________________________________

16. What would you change or add?

    _____________________________________________

17. Did you encounter any bugs or errors? If so, describe:

    _____________________________________________

18. What device and browser did you use?

    Device: _____________ Browser: _____________

---

*Thank you for testing! Your feedback helps improve the assessment tracker for all students.*
