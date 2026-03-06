# Story: Integrate AISC Core (Mission, Vision, Values, Definition of Learning)

## Context

AISC has finalized its Core identity document containing the school's Mission, Vision, Definition of Learning, and five core Values. This content needs to be integrated into the Learning Map system so that it serves as a visible foundation for curriculum design and student-facing experiences.

The values framework uses a consistent structure: each value has three statements organized by perspective (Self, Act, Connect).

## AISC Core Content

### Mission
Together, we nurture learners who chart their unique paths, transforming curiosity into purpose, challenges into growth, and knowledge into action.

### Vision
A community where diverse paths meet, learners innovate, and we make meaningful change together.

### Definition of Learning
A transformative, reflective process of building understanding, empowering learners to think deeply, innovate, collaborate, and act with purpose.

### Values

Each value has three statements organized by lens:
- **[Self]** Who I am, who we are
- **[Act]** How we act, how I take action
- **[Connect]** How we think beyond ourselves, how we connect to the world

#### Discovery
- [Self] Embracing the unknown with wonder
- [Act] Finding our own way forward
- [Connect] Mapping new possibilities

#### Belonging
- [Self] Celebrating everyone's authentic self
- [Act] Creating spaces where everyone feels safe, included, and has a sense of belonging
- [Connect] Building bridges that connect different paths, ideas, and people

#### Wellbeing
- [Self] Nurturing mind, body, and self
- [Act] Seeking balance while embracing challenges
- [Connect] Supporting each other's wellbeing

#### Responsibility
- [Self] Committing to personal and organizational excellence
- [Act] Acting ethically and with integrity
- [Connect] Considering our impact and being stewards of our shared environment

#### Purpose
- [Self] Optimistically pursuing ambitious goals
- [Act] Leading and learning with intention and direction
- [Connect] Seeking global perspective to drive meaningful impact

---

## Current State

Matthew has noted that there is existing code in the Learning Map for vision, mission, and learning habits. The Claude Code session should:

1. **Audit first** — Check what already exists in the backend (.gs files) and frontend (Index-WithHexGrid.html) for mission/vision/values/learning habits content. Look for any existing data structures, sheet columns, or UI sections.
2. **Update rather than duplicate** — If structures exist, update them with the finalized AISC Core content above. If they don't exist yet, create them.

## Acceptance Criteria

### Data Layer
- [ ] AISC Core content is stored in a retrievable location (Config sheet, dedicated sheet, or hardcoded constants — match whatever pattern already exists)
- [ ] Data structure captures the values hierarchy: Value → Lens (Self/Act/Connect) → Statement
- [ ] Mission, Vision, and Definition of Learning are stored as distinct fields

### Teacher View
- [ ] AISC Core content is visible somewhere logical in the teacher interface (e.g., a collapsible panel, the UbD planner context, or a dedicated tab)
- [ ] Values can be referenced when designing hexes or units (e.g., tagging a hex with a value alignment)
- [ ] Content is read-only for teachers (this is institutional, not editable per-teacher)

### Student View
- [ ] Students can see the Mission, Vision, and Values in a student-appropriate way (not just raw text dump)
- [ ] Values could optionally display as context on hex activities (e.g., "This activity connects to: Discovery — Finding our own way forward")

### Integration with Existing Features
- [ ] If UbD planner already references mission/vision, update those references
- [ ] If learning habits or ATL skills map to values, document the relationship but don't force a merge — they serve different purposes
- [ ] Values tags on hexes should be additive (alongside SBAR, standards, ATL skills), not replacing anything

## Implementation Guidance

### Suggested Data Structure (if creating new)
```javascript
// Could live in Config sheet or as constants in a CoreValues.gs service file
const AISC_CORE = {
  mission: "Together, we nurture learners who chart their unique paths, transforming curiosity into purpose, challenges into growth, and knowledge into action.",
  vision: "A community where diverse paths meet, learners innovate, and we make meaningful change together.",
  definitionOfLearning: "A transformative, reflective process of building understanding, empowering learners to think deeply, innovate, collaborate, and act with purpose.",
  values: [
    {
      name: "Discovery",
      statements: {
        self: "Embracing the unknown with wonder",
        act: "Finding our own way forward",
        connect: "Mapping new possibilities"
      }
    },
    {
      name: "Belonging",
      statements: {
        self: "Celebrating everyone's authentic self",
        act: "Creating spaces where everyone feels safe, included, and has a sense of belonging",
        connect: "Building bridges that connect different paths, ideas, and people"
      }
    },
    {
      name: "Wellbeing",
      statements: {
        self: "Nurturing mind, body, and self",
        act: "Seeking balance while embracing challenges",
        connect: "Supporting each other's wellbeing"
      }
    },
    {
      name: "Responsibility",
      statements: {
        self: "Committing to personal and organizational excellence",
        act: "Acting ethically and with integrity",
        connect: "Considering our impact and being stewards of our shared environment"
      }
    },
    {
      name: "Purpose",
      statements: {
        self: "Optimistically pursuing ambitious goals",
        act: "Leading and learning with intention and direction",
        connect: "Seeking global perspective to drive meaningful impact"
      }
    }
  ]
};
```

### Hex Tagging (if adding values alignment to hexes)
```javascript
// Extend HexCurriculum to include optional values alignment
// This would add to the existing curriculum metadata, not replace it
curriculum: {
  sbarDomains: ['KU'],
  standards: ['NGSS-HS-PS1-1'],
  atlSkills: ['Critical Thinking'],
  competencies: [],
  valuesAlignment: ['Discovery']  // NEW: which AISC values this hex connects to
}
```

### UI Placement Options (discuss with Matthew)
- **Option A:** Add an "AISC Core" panel/tab alongside the existing UbD planner
- **Option B:** Display as a collapsible banner at the top of the Unit Overview
- **Option C:** Embed values context into the hex editor (teacher) and student panel as a lightweight tag
- **Option D:** Combination — Core overview in one place + values tags on individual hexes

## Questions for Matthew at Session Start

1. Where does the existing mission/vision code live? (Which .gs file and/or which section of Index-WithHexGrid.html?)
2. Is "learning habits" a separate concept from values, or is this the new version replacing it?
3. Should values be taggable on individual hexes (like SBAR and standards), or just visible at the unit/course level?
4. Is there a preference for where the Core content displays — its own tab, inside the UbD planner, or somewhere else?

## Files Likely Involved

- Config.gs or new CoreValues.gs — Data storage/retrieval
- Code.gs — Expose getCoreValues() or similar endpoint
- Index-WithHexGrid.html — UI for displaying core content
- UbDService.gs — If values integrate with unit planning
- MapService.gs — If adding valuesAlignment to hex curriculum metadata

## Definition of Done

- [ ] Implementation complete and tested
- [ ] AISC Core content accurately matches the source document
- [ ] Values structure preserves the Self/Act/Connect organization
- [ ] Error states handled
- [ ] LockService used for any writes (if applicable — this may be read-only)
- [ ] PROJECT_STATUS.md updates provided
- [ ] Commit message provided
