# EAL/WIDA Adaptive Hex Map — Story Plan

> **Epic**: EAL-Adaptive Learning Map
> **Priority**: High — Core differentiator for the Unified Learning Map system
> **Owner**: Matthew Ignash (imatthew@aischennai.org)
> **Last Updated**: February 26, 2026

---

## Epic Overview

The Unified Learning Map (ULM) currently presents the same hex grid experience to every student regardless of language proficiency. This epic transforms the student-facing hex experience into a WIDA-adaptive interface where scaffolding, vocabulary, sentence frames, and visual cues automatically adapt based on each student's WIDA proficiency profile.

### Design Philosophy

- **"Learning Supports" for everyone, silently adapted.** Every student sees a "Learning Supports" section in the hex panel. The *content* inside adapts based on WIDA profile data. No student is singled out as "the one who gets extra help." This aligns with Universal Design for Learning (UDL) principles.
- **Accommodations are explicit.** Unlike scaffolding (which is silent), formal accommodations (extended time, dictionary, etc.) are labeled clearly because students have a right to know what they're entitled to.
- **No profile = current experience.** Students without a WIDA profile see the existing hex panel with no scaffolding. The system never assumes a student needs support without data.
- **Vocabulary is tiered, not flat.** The system uses the three-tier vocabulary model (Tier 1: everyday, Tier 2: cross-curricular academic, Tier 3: domain-specific technical) and surfaces different tiers based on WIDA level.

### WIDA Brackets for Adaptation

| Bracket | WIDA Levels | Label | Scaffolding Approach |
|---------|-------------|-------|---------------------|
| Low | 1-2 | Entering / Emerging | Maximum scaffolding visible by default. Translations expanded. Simplified definitions. Tier 1+2+3 vocabulary. |
| Mid | 3-4 | Developing / Expanding | Moderate scaffolding available on demand. Translations on click. Standard definitions. Tier 2+3 vocabulary. |
| High | 5-6 | Bridging / Reaching | Minimal scaffolding, emphasis on academic vocabulary depth. Tier 3 focus. Self-monitoring strategies. |
| None | No profile | — | Current experience. Generic study tips in Learning Supports. No translations or sentence frames. |

### WIDA Four-Domain Awareness

The system stores all four WIDA domain scores per student: Listening (L), Speaking (S), Reading (R), Writing (W). While bracket-level adaptation uses the **overall composite** for most features, domain scores enable nuanced behavior:

- A student who is WIDA 4 in Reading but WIDA 2 in Writing should see Level 4 reading materials but Level 2 sentence frames for written responses.
- The hex panel can flag domain-specific support: "Your writing supports" vs "Your reading supports."
- Future: domain scores inform which Key Language Use (Narrate, Inform, Explain, Argue) scaffolds are prioritized.

---

## Story A: Vocabulary Data Model + Teacher Entry

### Goal

Build the vocabulary storage system with tier classification, unit/hex tagging, and a centralized vocabulary list accessible from the UbD planner. This is the data foundation that Stories B and C depend on.

### User Stories

- As a **teacher**, I can add vocabulary terms to a unit or specific hex, classify them by tier (1, 2, or 3), and provide definitions and context sentences.
- As a **teacher**, I can view all vocabulary for a unit in a centralized list, organized by tier, with annotations showing which hexes use each term.
- As a **teacher**, I can see vocabulary coverage analysis in the UbD planner: how many terms per tier, which terms are introduced in hex activities vs. only appearing in assessments.
- As a **teacher**, vocabulary I enter at the hex level automatically appears in the unit-level centralized list, tagged to that hex.

### Vocabulary Data Model

Each vocabulary entry contains:

```
VocabularyEntry {
  vocabId: string           // Unique ID, e.g. "vocab-{timestamp}"
  term: string              // The word/phrase
  tier: 1 | 2 | 3          // Vocabulary tier classification
  definition: string        // Standard academic definition
  simplifiedDefinition: string  // Plain language version (for WIDA 1-2)
  contextSentence: string   // Discipline-specific usage example
  unitId: string            // Parent unit this term belongs to
  hexIds: string[]          // Which hexes use this term (can be multiple)
  category: string          // One of 10 categories (see below)
  phonetic: string          // IPA or simplified pronunciation
  translations: {           // 14-language translation object
    [languageCode: string]: {
      term: string
      definition: string
      override: boolean     // Teacher manually corrected?
      overrideBy: string    // Email of teacher who corrected
    }
  }
  displayMode: string       // "term-only" | "full" | "context"
  createdBy: string
  createdAt: string
  updatedAt: string
}
```

### Vocabulary Categories (10 types)

1. Key Term — Core concept vocabulary (Tier 3)
2. Process Word — Action/procedure vocabulary (Tier 2-3)
3. Academic Language — Cross-curricular terms (Tier 2)
4. Everyday Bridge — Common words with academic meaning (Tier 1-2)
5. Lab Equipment — Physical tools/apparatus names (Tier 3)
6. Measurement — Units, scales, quantities (Tier 2-3)
7. Safety — Hazard and safety terminology (Tier 1-2)
8. Data/Math — Statistical and mathematical language (Tier 2)
9. Communication — Reporting and argumentation terms (Tier 2)
10. Connector — Transition and linking words (Tier 2)

### Tier Guidance for Teachers

Display in the vocabulary entry UI to help teachers classify correctly:

| Tier | Description | Examples (Chemistry) | Who needs it taught? |
|------|-------------|---------------------|---------------------|
| **Tier 1** | Basic everyday words that EAL beginners may not know | pour, mix, heat, table, measure, change | WIDA 1-2 only |
| **Tier 2** | High-frequency academic words crossing disciplines | analyze, significant, evaluate, evidence, contrast, hypothesis | All EAL students, especially WIDA 2-4 |
| **Tier 3** | Domain-specific technical vocabulary | isotope, covalent bond, stoichiometry, electronegativity | All students (new for everyone) |

### Storage — Google Sheets

New sheet: **Vocabulary**

| Column | Type | Notes |
|--------|------|-------|
| vocabId | string | Primary key |
| term | string | Required |
| tier | number | 1, 2, or 3 |
| definition | text | Standard definition |
| simplifiedDefinition | text | WIDA 1-2 version |
| contextSentence | text | |
| unitId | string | FK to Units sheet |
| hexIdsJson | JSON string | Array of hex IDs |
| category | string | One of 10 categories |
| phonetic | string | |
| translationsJson | JSON string | 14-language object |
| displayMode | string | |
| createdBy | string | |
| createdAt | string | ISO datetime |
| updatedAt | string | ISO datetime |

### Backend Service: VocabularyService.gs

```
Functions needed:

getVocabularyForUnit(unitId)
  → Returns all vocab entries for the unit, sorted by tier then alphabetically
  → Used by: UbD planner vocabulary panel, student dictionary

getVocabularyForHex(hexId)
  → Returns vocab entries where hexIdsJson includes this hexId
  → Used by: Hex modal vocabulary section

saveVocabularyEntry(entryData)
  → Upsert. Uses LockService for concurrency.
  → Auto-populates translations via LanguageApp.translate() for all 14 languages
  → Preserves teacher overrides (never overwrites override=true translations)

deleteVocabularyEntry(vocabId)
  → Soft delete or hard delete (TBD — discuss with Matthew)

getVocabularyCoverage(unitId)
  → Returns analytics:
    - Count by tier (Tier 1: X, Tier 2: Y, Tier 3: Z)
    - Terms with hex assignments vs. unassigned (appear in unit but no hex teaches them)
    - Terms used in assessment hexes vs. teaching hexes
  → Used by: UbD planner coverage analysis

bulkTranslateVocabulary(vocabIds)
  → Batch translation for multiple entries
  → Respects LanguageApp daily quotas (handle gracefully if quota exceeded)
```

### Frontend: Teacher Vocabulary Panel

Add a "Vocabulary" section to the hex editor (EditorPanel) with:
- Term input, tier selector (1/2/3 with color coding), definition, simplified definition
- Category dropdown
- Context sentence
- Display of which unit this hex belongs to (auto-inherited)
- Save creates/updates the VocabularyEntry with this hex's ID in hexIds

Add a "Unit Vocabulary" tab/section to the UbD Planner with:
- Full vocabulary list for the unit, grouped by tier
- Each entry shows: term, tier badge, definition, hex tags (clickable)
- Coverage summary: "12 Tier 3 terms, 8 taught in activities, 4 untaught"
- "Add Term" button for unit-level vocabulary not tied to a specific hex
- Sortable by tier, category, or alphabetical

### Definition of Done

- [ ] Vocabulary sheet created with correct schema
- [ ] VocabularyService.gs with all CRUD functions + coverage analytics
- [ ] LockService used for all write operations
- [ ] Auto-translation via LanguageApp with override protection
- [ ] Hex editor shows vocabulary entry UI
- [ ] UbD planner shows centralized vocabulary list with tier grouping and coverage analysis
- [ ] Vocabulary tagged to hex appears in both hex-level and unit-level views
- [ ] Error handling: try/catch, {success, error} pattern
- [ ] Test functions prefixed with test_

---

## Story B: WIDA-Adaptive Student Hex Panel

### Goal

When a student clicks a hex, the panel that opens adapts based on their WIDA profile. This is the core demo moment — same hex, different students, completely different scaffolding.

### Dependencies

- Story A (Vocabulary Data Model) — vocabulary entries exist to display
- Existing WIDA profile data in student support profiles (basic entry system exists)

### User Stories

- As a **WIDA 1-2 student**, when I click a hex, I see vocabulary with home-language translations expanded, simple sentence frames, simplified task descriptions, and my accommodations listed.
- As a **WIDA 3-4 student**, when I click a hex, I see vocabulary with translations available on click, intermediate sentence frames, SBAR-based question cues, and supports collapsed but accessible.
- As a **WIDA 5-6 student**, when I click a hex, I see academic vocabulary with full context, advanced argumentation frames, and minimal scaffolding with self-monitoring strategies.
- As a **student with no WIDA profile**, I see the current hex panel experience with generic study tips in the Learning Supports section.
- As a **teacher** viewing in student preview mode, I can toggle between WIDA brackets to see how each level experiences the hex.

### Hex Panel Structure (Student View)

The adapted StudentPanel has these sections in order:

```
┌─────────────────────────────────┐
│ Hex Title + Icon                │
│ Type • Status                   │
│ [Progress Buttons]              │
├─────────────────────────────────┤
│ 📖 KEY VOCABULARY               │  ← Tier-filtered, WIDA-adapted
│   [vocab cards with translations]│
├─────────────────────────────────┤
│ 💡 LEARNING SUPPORTS            │  ← Universal section, adapted content
│   ┌─ Sentence Frames ──────┐   │
│   │  (by WIDA bracket)     │   │
│   └────────────────────────┘   │
│   ┌─ Question Cues ────────┐   │
│   │  (by SBAR domain)      │   │
│   └────────────────────────┘   │
│   ┌─ My Accommodations ────┐   │  ← Only if accommodations exist
│   │  (explicit, from profile)│  │
│   └────────────────────────┘   │
├─────────────────────────────────┤
│ [Open Resource] [Email Teacher] │
└─────────────────────────────────┘
```

### Vocabulary Display by WIDA Level

**WIDA 1-2 (Entering/Emerging):**
- Show Tier 1 + Tier 2 + Tier 3 vocabulary
- Tier 3 terms display the `simplifiedDefinition` instead of `definition`
- Tier 2 terms marked with a visual badge: "📝 Academic Word"
- Tier 1 terms only shown if teacher has flagged "include basic vocabulary" for this student or if the student's WIDA composite ≤ 2
- Home language translations **expanded by default** — show the student's home language(s) automatically
- Phonetic pronunciation displayed
- Context sentence visible

**WIDA 3-4 (Developing/Expanding):**
- Show Tier 2 + Tier 3 vocabulary
- Standard `definition` used for all terms
- Tier 2 terms marked with subtle badge to distinguish from domain terms
- Translations available via click/tap (collapsed by default)
- Only show translations for student's home languages (not all 14)
- Context sentence collapsed, available on expand

**WIDA 5-6 (Bridging/Reaching):**
- Show Tier 3 only by default
- Tier 2 available via "Show academic vocabulary" toggle
- Full academic definitions with emphasis on precise usage
- Translations available but not prominent
- Context sentences focused on discipline-specific usage

**No WIDA Profile:**
- Show Tier 3 terms only as a standard vocabulary list
- No translations, no tiering visible, no badges
- Simple definition + context sentence

### Sentence Frames by WIDA Bracket

Stored as configuration data, not per-hex. The system selects frames based on the student's WIDA writing domain score (not composite, since frames are for written/spoken output).

**WIDA Writing 1-2 (Entering/Emerging):**
```
- "I see that..."
- "The main idea is..."
- "This is about..."
- "I learned that..."
- "An important word is..."
- "I notice..."
- "This shows..."
```

**WIDA Writing 3-4 (Developing/Expanding):**
```
- "I noticed that... because..."
- "The evidence shows that..."
- "This is similar to... because..."
- "One difference is..."
- "I can conclude that..."
- "The data suggests that..."
- "Compared to..., this..."
```

**WIDA Writing 5-6 (Bridging/Reaching):**
```
- "This challenges the assumption that..."
- "Drawing on the evidence, I would argue..."
- "The relationship between... and... suggests..."
- "A limitation of this approach is..."
- "While... is true, it is also important to consider..."
- "The significance of this finding is..."
```

**No WIDA Profile:**
```
- Generic study prompts: "What are the key ideas?", "How does this connect to what you already know?"
```

### SBAR-Based Question Cues

Generated from the hex's `curriculum.sbarDomains` tags. These appear for ALL students (not WIDA-specific) but complement the sentence frames.

| SBAR Tag | Question Cues |
|----------|--------------|
| KU (Knowledge/Understanding) | "What are the key facts?", "How would you define...?", "What examples can you give?" |
| TT (Thinking/Transfer) | "How could you apply this?", "What steps are involved?", "What would happen if...?" |
| C (Communication) | "How does this relate to...?", "What patterns do you notice?", "How would you explain this to someone else?" |

### Accommodation Display

If the student's support profile has accommodations flagged, show them in a clearly labeled section:

```
🛡️ Your Accommodations
  ✓ Extended time
  ✓ Word-to-word dictionary
  ✓ Sentence starters (see above)
```

The 10 standard accommodations (from the EAL-LS doc):
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

### Backend Requirements

```
Functions needed:

getStudentWIDAProfile(studentEmail)
  → Returns: {
      overall: number (1-6),
      listening: number,
      speaking: number,
      reading: number,
      writing: number,
      homeLanguages: string[],
      accommodations: string[],
      strategies: string[],
      profileType: string
    }
  → Used by: Frontend to determine adaptation bracket

getHexStudentView(hexId, studentEmail)
  → Returns hex data enriched with:
    - Vocabulary filtered by tier (based on student WIDA level)
    - Translations filtered to student's home languages only
    - Sentence frames for student's WIDA writing level
    - SBAR question cues from hex curriculum tags
    - Student's accommodations
  → This is the main API call when a student clicks a hex

getSentenceFrames(widaWritingLevel)
  → Returns the appropriate sentence frame array
  → Could be a simple config lookup, not necessarily a DB call

getSBARQuestionCues(sbarDomains)
  → Returns question cues matching the hex's SBAR tags
```

### Frontend: Adapted StudentPanel

Modify the existing StudentPanel component to:

1. On hex click, fetch student's WIDA profile (cache after first load — profile doesn't change mid-session)
2. Determine WIDA bracket from composite score for vocabulary filtering
3. Determine WIDA writing domain score for sentence frame selection
4. Render the adapted panel structure (see panel diagram above)
5. Collapsible sections with WIDA-aware defaults:
   - WIDA 1-2: Vocabulary expanded, Learning Supports expanded, Accommodations expanded
   - WIDA 3-4: Vocabulary collapsed (show count), Learning Supports collapsed, Accommodations expanded if present
   - WIDA 5-6: Everything collapsed, Accommodations expanded if present
   - No profile: Only generic Learning Supports shown, collapsed

### Teacher Preview Mode

Add a "Preview as..." dropdown in builder mode that lets the teacher select a WIDA bracket (1-2 / 3-4 / 5-6 / No Profile) to see how the hex panel renders for each group. This is critical for:
- Teacher understanding of what their students see
- Conference demos (toggle between brackets on the same hex)
- Quality checking vocabulary and sentence frame appropriateness

### Definition of Done

- [ ] StudentPanel reads WIDA profile on hex click
- [ ] Vocabulary section filters by tier based on WIDA bracket
- [ ] Translations display filtered to student's home languages
- [ ] Simplified definitions used for WIDA 1-2 on Tier 3 terms
- [ ] Sentence frames rendered by WIDA writing domain level
- [ ] SBAR question cues generated from hex curriculum tags
- [ ] Accommodations section displays when profile has flags
- [ ] Collapse/expand defaults follow WIDA bracket rules
- [ ] Students with no profile see current experience + generic Learning Supports
- [ ] Teacher preview mode with bracket selector
- [ ] No student PII logged or exposed beyond what's in the existing profile schema
- [ ] Error handling: graceful fallback if profile fetch fails (show default view)

---

## Story C: Grid Surface Indicators

### Goal

Add subtle visual cues to the hex grid so students have orientation before clicking. A student should be able to look at the map and know which hexes have vocabulary support, translations, or scaffolding available.

### Dependencies

- Story A (Vocabulary exists to indicate)
- Story B (WIDA profile loaded to personalize indicators)

### User Stories

- As a **student**, I can see at a glance which hexes have vocabulary terms attached (helps me plan my study order).
- As a **WIDA 1-2 student**, I see a small home-language translation of the hex label below the English label, so I understand what each activity is before clicking.
- As any **student with a WIDA profile**, I see a small indicator showing that learning supports are available on a hex.

### Indicator Design

Indicators should be minimal — the hex grid is already visually dense. Proposed indicators:

**1. Vocabulary Count Badge**
- Small badge on hex: "V3" meaning 3 vocabulary terms
- Position: bottom-left of hex, small text
- Only shown if hex has vocabulary entries tagged to it
- Color-coded by tier presence: blue if Tier 3 present, amber if only Tier 2, gray if only Tier 1

**2. Translated Label (WIDA 1-2 only)**
- Below the English hex label, show a smaller line in the student's strongest home language
- Only for students with WIDA composite ≤ 2
- Uses the hex label translation (auto-generated, teacher-overridable)
- Styled: smaller font, slightly different color, italic
- If translation would make the hex too cluttered, show flag icon + tooltip instead

**3. Support Available Indicator**
- Small icon (e.g., a subtle lifeline/support icon) on hexes that have Learning Supports content configured
- Helps students know "if I click this, there's help available"
- Only shown for students with WIDA profiles (no profile = no indicator since they see generic supports)

### Implementation Notes

- All indicators read from data already loaded (vocabulary entries, WIDA profile) — no additional API calls
- Indicators should not interfere with existing hex badges (SBAR domain tags, link icon)
- In builder mode, indicators are hidden (teacher sees the builder view, not student view)
- Indicators respect the existing filter system (dimmed hexes dim their indicators too)

### Backend Requirements

Minimal — this is primarily a frontend story. The only new data needed:

```
getHexLabelTranslations(mapId, languageCode)
  → Returns: { [hexId]: translatedLabel }
  → Batch translates all hex labels in a map to one language
  → Cached after first call per map/language combo
```

### Definition of Done

- [ ] Vocabulary count badge displays on hexes with tagged vocabulary
- [ ] Translated labels appear for WIDA 1-2 students in their home language
- [ ] Support available indicator shown for students with WIDA profiles
- [ ] Indicators hidden in builder mode
- [ ] Indicators respect filter/dim states
- [ ] No additional API calls per hex (use batch-loaded data)
- [ ] Performance: indicators don't slow down hex grid rendering

---

## Future Roadmap (Post Stories A-C)

These features build on the EAL-adaptive foundation. Listed in recommended priority order:

### Feature 4: Projector Mode with Live Translation
- Full-screen dark-themed classroom display
- Timer + Map split view
- Live translation of Learning Intentions, Essential Questions, and vocabulary to 14 languages
- Best conference demo feature and lowest-friction adoption tool for colleagues

### Feature 5: Self-Assessment and Confidence Tracking
- 4-point confidence rating per hex (Beginning/Developing/Proficient/Extending)
- Reflection notes, learning goals, evidence links
- Generates student voice data for research and conference talks
- Confidence-score mismatch detection (over/under-confident students)

### Feature 6: Differentiated Learning Paths
- Group-based hex visibility (hidden/dimmed for non-assigned hexes)
- WIDA-informed auto-grouping ("Suggest Groups" button)
- Cascading visibility to child lesson maps
- Group analytics with WIDA distribution bars

### Feature 7: Study Dashboard
- Student-facing hub with stats, spaced review, streak tracking
- Strategy cards linking to Cornell Notes, Pomodoro, Self-Assessment
- Weekly study goal with progress ring
- All computed client-side from existing data

### Feature 8: Lab Report Scaffolding System
- Multi-level scaffolding (High/Medium/Low/None)
- 7 specialized input types (Variables Table, Data Tables, Bibliography, etc.)
- WIDA-aware sentence starters per scaffold level
- Standalone tool potential — could serve as entry point for non-ULM users

---

## Technical Context

### Architecture
- **Backend**: Google Apps Script (.gs files)
- **Frontend**: Single HTML file with embedded CSS/JS (Index-WithHexGrid.html)
- **Database**: Google Sheets (12+ tabs)
- **Schema Version**: v3D

### Key Patterns
- All writes use `LockService.getScriptLock()`
- Dynamic column lookup by header name (not position)
- JSON columns for complex data (translationsJson, hexIdsJson)
- Frontend calls: `google.script.run.withSuccessHandler().functionName()`
- Error handling: try/catch, return `{success: false, error: message}`
- Test functions: prefix with `test_`

### Supported Languages (14)
| Code | Language | Code | Language |
|------|----------|------|----------|
| ja | Japanese | hi | Hindi |
| ko | Korean | vi | Vietnamese |
| fr | French | tl | Filipino |
| ta | Tamil | pt | Portuguese |
| zh | Chinese | ru | Russian |
| es | Spanish | de | German |
| ar | Arabic | it | Italian |

### Translation Engine
- `LanguageApp.translate(text, sourceLanguage, targetLanguage)` — native GAS, no API key needed
- Has daily quotas — implement graceful handling when quota exceeded
- Cache translations aggressively (translate once on save, not on every read)
- Teacher overrides stored separately, never overwritten by re-translation

### Privacy Requirements
- No student PII logged beyond what's in the existing schema
- WIDA profiles are sensitive data — same access controls as other student support records
- Translation requests should not include student identifiers
- Profile data cached client-side for session only, not persisted in browser storage
