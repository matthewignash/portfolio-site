/**
 * ProcessJournalService.gs
 * Process Journal for Learning Map — Research Alignment Phase 2
 *
 * Aggregates student reflections, thinking routines, and freeform entries
 * into a unified timeline that makes thinking visible.
 *
 * Sheet: ProcessJournal
 * Schema: journalId, studentEmail, mapId, hexId, entryType, content,
 *         promptId, metadataJson, createdAt, updatedAt
 *
 * Entry types: reflection (hex completion), checkpoint (iteration),
 *   phase_transition (design thinking), freeform (manual), goal_update, emotion_checkin
 *
 * Dual-write hooks in ProgressService.gs and IterationService.gs
 * automatically create journal entries when students reflect.
 */

const PJ_VALID_ENTRY_TYPES_ = [
  'reflection', 'checkpoint', 'phase_transition',
  'freeform', 'goal_update', 'emotion_checkin'
];

const PJ_MAX_CONTENT_ = 1000;
const PJ_MAX_PROMPT_ID_ = 50;
const PJ_MAX_METADATA_ = 2000;
const PJ_MAX_ENTRIES_RETURNED_ = 100;

// ============================================================================
// CORE CRUD
// ============================================================================

/**
 * Save a new journal entry. Append-only (no upsert).
 * Student-only — uses current user's email.
 *
 * @param {Object} entryData - { mapId?, hexId?, entryType, content, promptId?, metadataJson? }
 * @returns {Object} Created journal entry record
 */
function saveJournalEntry(entryData) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!entryData) throw new Error('Entry data is required.');

  // Validate entryType
  const entryType = String(entryData.entryType || '');
  if (PJ_VALID_ENTRY_TYPES_.indexOf(entryType) === -1) {
    throw new Error('Invalid entry type. Must be one of: ' + PJ_VALID_ENTRY_TYPES_.join(', '));
  }

  // Validate content — required, max 1000 chars
  const content = String(entryData.content || '').trim();
  if (!content) throw new Error('Content is required.');
  const safeContent = content.substring(0, PJ_MAX_CONTENT_);

  // Validate promptId — optional, max 50 chars
  const promptId = String(entryData.promptId || '').substring(0, PJ_MAX_PROMPT_ID_);

  // Validate mapId/hexId — optional strings
  const mapId = entryData.mapId ? String(entryData.mapId) : '';
  const hexId = entryData.hexId ? String(entryData.hexId) : '';

  // Validate metadataJson — optional, must be valid JSON, max 2000 chars
  let metadataJson = '';
  if (entryData.metadataJson) {
    try {
      const parsed = JSON.parse(String(entryData.metadataJson));
      metadataJson = JSON.stringify(parsed).substring(0, PJ_MAX_METADATA_);
    } catch (e) {
      // Invalid JSON — skip metadata rather than failing
      metadataJson = '';
    }
  } else if (entryData.metadata && typeof entryData.metadata === 'object') {
    // Accept raw object too (convenience for frontend)
    try {
      metadataJson = JSON.stringify(entryData.metadata).substring(0, PJ_MAX_METADATA_);
    } catch (e) {
      metadataJson = '';
    }
  }

  const now = now_();

  const row = {
    journalId: generateJournalId_(),
    studentEmail: email,
    mapId: mapId,
    hexId: hexId,
    entryType: entryType,
    content: safeContent,
    promptId: promptId,
    metadataJson: metadataJson,
    createdAt: now,
    updatedAt: now
  };

  appendRow_(SHEETS_.PROCESS_JOURNAL, row);

  return row;
}

/**
 * Get journal entries for a student on a specific map.
 * Sorted by createdAt descending (newest first).
 *
 * @param {string} mapId - Map ID to filter by
 * @returns {Array} Journal entry objects
 */
function getStudentJournal(mapId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!mapId) throw new Error('Map ID is required.');

  const rows = findRowsFiltered_(SHEETS_.PROCESS_JOURNAL, {
    studentEmail: email,
    mapId: String(mapId)
  });

  return rows.map(r => parseJournalRow_(r))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/**
 * Get all journal entries for a student across all maps.
 * Sorted by createdAt descending, capped at 100 entries.
 *
 * @returns {Array} Journal entry objects
 */
function getStudentJournalAll() {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  const rows = findRowsFiltered_(SHEETS_.PROCESS_JOURNAL, {
    studentEmail: email
  });

  return rows.map(r => parseJournalRow_(r))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, PJ_MAX_ENTRIES_RETURNED_);
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Parse a raw journal row into a clean object.
 * @param {Object} row - Raw row from readAll_/findRowsFiltered_
 * @returns {Object} Parsed journal entry
 */
function parseJournalRow_(row) {
  let metadata = {};
  if (row.metadataJson) {
    try {
      metadata = JSON.parse(row.metadataJson);
    } catch (e) {
      metadata = {};
    }
  }

  return {
    journalId: row.journalId || '',
    studentEmail: row.studentEmail || '',
    mapId: row.mapId || '',
    hexId: row.hexId || '',
    entryType: row.entryType || '',
    content: row.content || '',
    promptId: row.promptId || '',
    metadata: metadata,
    createdAt: row.createdAt || '',
    updatedAt: row.updatedAt || ''
  };
}
