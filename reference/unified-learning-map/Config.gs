/**
 * Learning Map - Configuration & Database Helpers
 *
 * Handles:
 * - Configuration management (key-value store)
 * - Sheet name constants
 * - Database helper functions
 *
 * @version 1.0.0
 */
// ============================================================================
// SHEET NAME CONSTANTS
// ============================================================================
const SHEETS_ = {
CONFIG: 'Config',
MAPS: 'Maps',
COURSES: 'Courses',
UNITS: 'Units',
USERS: 'Users',
PROGRESS: 'Progress',
EDGES: 'Edges',
STANDARDS: 'Standards',
HEX_STANDARDS: 'HexStandards',
LESSONS: 'Lessons',
CLASSES: 'Classes',
CLASS_ROSTER: 'ClassRoster',
NOTIFICATIONS: 'Notifications',
FORMATIVE_CHECKS: 'FormativeChecks',
ASSESSMENT_RESPONSES: 'AssessmentResponses',
MAP_ASSIGNMENTS: 'MapAssignments',
STUDENT_TASK_ORDER: 'StudentTaskOrder',
STUDENT_SUPPORT_PROFILES: 'StudentSupportProfiles',
STUDENT_ATL_PROGRESS: 'StudentATLProgress',
STUDENT_ACHIEVEMENTS: 'StudentAchievements',
ITERATION_HISTORY: 'IterationHistory',
PEER_FEEDBACK: 'PeerFeedback',
USER_PREFERENCES: 'UserPreferences',
STUDENT_PORTFOLIO: 'StudentPortfolio',
STUDENT_NOTES: 'StudentNotes',
STUDENT_TASKS: 'StudentTasks',
TEACHER_REMINDERS: 'TeacherReminders',
TEACHER_FEEDBACK_TEMPLATES: 'TeacherFeedbackTemplates',
DIFFERENTIATION_GROUPS: 'DifferentiationGroups',
GROUP_MEMBERSHIPS: 'GroupMemberships',
HEX_ASSIGNMENTS: 'HexAssignments',
STUDENT_CHOICES: 'StudentChoices',
TIMER_SESSIONS: 'TimerSessions',
NAME_SELECTOR_STATE: 'NameSelectorState',
NAME_SELECTOR_PICKS: 'NameSelectorPicks',
NAME_SELECTOR_GROUPS: 'NameSelectorGroups',
QUICK_POLLS: 'QuickPolls',
QUICK_POLL_RESPONSES: 'QuickPollResponses',
WHITEBOARD_DATA: 'WhiteboardData',
PROCESS_JOURNAL: 'ProcessJournal'
};

// ============================================================================
// GRID CONFIGURATION CONSTANTS
// ============================================================================
const GRID_CONFIG = {
  defaultRows: 12,
  defaultCols: 12,
  minRows: 4,
  maxRows: 50,
  minCols: 4,
  maxCols: 50,
  hexWidth: 80,
  hexHeight: 92,
  colSpacing: 88,
  rowSpacing: 75
};

// ============================================================================
// CONFIGURATION FUNCTIONS
// ============================================================================
/**
 * Get all configuration as key-value object
 *
 * @returns {Object} Configuration object
 */
function getConfig_() {
const sheet = getSheet_(SHEETS_.CONFIG);
const data = sheet.getDataRange().getValues();
const config = {};
// Skip header row
for (let i = 1; i < data.length; i++) {
const key = data[i][0];
const value = data[i][1];
if (key) {
config[key] = value;
    }
  }
return config;
}
/**
 * Save configuration (replaces all values)
 *
 * @param {Object} config - Configuration object
 */
function saveConfig_(config) {
const sheet = getSheet_(SHEETS_.CONFIG);
// Clear existing data (keep headers)
if (sheet.getLastRow() > 1) {
sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
// Write new data
const rows = [];
for (const key in config) {
if (config.hasOwnProperty(key)) {
rows.push([key, config[key], '']);
    }
  }
if (rows.length > 0) {
sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }
}
/**
 * Get single config value
 *
 * @param {string} key - Config key
 * @returns {string|null} Config value or null if not found
 */
function getConfigValue_(key) {
const config = getConfig_();
const val = config[key];
return (val !== undefined && val !== null) ? val : null;
}
/**
 * Get multiple config values in a single read.
 * Reads all config rows once and returns an object with requested key values.
 *
 * @param {string[]} keys - Array of config keys to retrieve
 * @returns {Object} Object with key-value pairs (empty string for missing keys)
 */
function getConfigValues_(keys) {
  const config = getConfig_();
  const result = {};
  for (let i = 0; i < keys.length; i++) {
    const val = config[keys[i]];
    result[keys[i]] = (val !== undefined && val !== null) ? val : '';
  }
  return result;
}
/**
 * Set single config value
 *
 * @param {string} key - Config key
 * @param {string} value - Config value
 */
function setConfigValue_(key, value) {
  // Delegate to safe cell-level writer (avoids clear+rewrite race condition)
  const updates = {};
  updates[key] = value;
  setConfigValues_(updates);
}


/**
 * Set multiple config values in a single read-modify-write.
 * Prevents data loss from sequential setConfigValue_ calls caused by
 * Google Apps Script write buffering (stale reads between writes).
 *
 * Uses individual cell updates (not clear+rewrite) so each key persists.
 *
 * @param {Object} updates - { key1: value1, key2: value2, ... }
 */
function setConfigValues_(updates) {
  const sheet = getSheet_(SHEETS_.CONFIG);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const keyCol = 0;
  const valCol = 1;
  const updatedAtCol = headers.indexOf('updatedAt');
  const updatedByCol = headers.indexOf('updatedBy');
  const now = new Date().toISOString();
  let user = '';
  try { user = Session.getActiveUser().getEmail(); } catch (e) { /* deployed exec */ }

  // Build map of existing key → sheet row number (1-based)
  const keyRowMap = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][keyCol]) {
      keyRowMap[String(data[i][keyCol])] = i + 1;
    }
  }

  const keys = Object.keys(updates);
  for (let k = 0; k < keys.length; k++) {
    const key = keys[k];
    const value = updates[key];
    const rowIdx = keyRowMap[key];

    if (rowIdx) {
      // Update existing row — individual cell writes, no rewrite
      sheet.getRange(rowIdx, valCol + 1).setValue(value);
      if (updatedAtCol >= 0) sheet.getRange(rowIdx, updatedAtCol + 1).setValue(now);
      if (updatedByCol >= 0) sheet.getRange(rowIdx, updatedByCol + 1).setValue(user);
    } else {
      // Append new key — atomic, no lock needed
      const newRow = [];
      for (let h = 0; h < headers.length; h++) newRow.push('');
      newRow[keyCol] = key;
      newRow[valCol] = value;
      if (updatedAtCol >= 0) newRow[updatedAtCol] = now;
      if (updatedByCol >= 0) newRow[updatedByCol] = user;
      sheet.appendRow(newRow);
    }
  }
}


// ============================================================================
// DATABASE HELPER FUNCTIONS
// ============================================================================
/**
 * Get sheet by name, create if doesn't exist
 *
 * @param {string} sheetName - Name of sheet
 * @returns {Sheet} Google Sheets object
 */
function getSheet_(sheetName) {
const ss = SpreadsheetApp.getActiveSpreadsheet();
let sheet = ss.getSheetByName(sheetName);
if (!sheet) {
sheet = ss.insertSheet(sheetName);
  // Auto-write headers from SCHEMA_TABS if available
  if (typeof SCHEMA_TABS !== 'undefined' && SCHEMA_TABS[sheetName]) {
    const headers = SCHEMA_TABS[sheetName];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4a5568')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  }
return sheet;
}
/**
 * Read all rows from a sheet as array of objects
 * Assumes first row is headers
 *
 * @param {string} sheetName - Name of sheet
 * @returns {Array<Object>} Array of row objects
 */
function readAll_(sheetName) {
const sheet = getSheet_(sheetName);
const data = sheet.getDataRange().getValues();
if (data.length <= 1) return [];
const headers = data[0];
const rows = [];
for (let i = 1; i < data.length; i++) {
const row = {};
for (let j = 0; j < headers.length; j++) {
row[headers[j]] = data[i][j];
    }
rows.push(row);
  }
return rows;
}
/**
 * Read all rows from a sheet (raw array format)
 *
 * @param {Sheet} sheet - Sheet object
 * @returns {Array<Object>} Array of row objects with headers as keys
 */
function readAllFromSheet_(sheet) {
const data = sheet.getDataRange().getValues();
if (data.length <= 1) return [];
const headers = data[0];
const rows = [];
for (let i = 1; i < data.length; i++) {
const row = {};
for (let j = 0; j < headers.length; j++) {
row[headers[j]] = data[i][j];
    }
rows.push(row);
  }
return rows;
}
/**
 * Write all rows to a sheet (replaces existing data)
 *
 * @param {string} sheetName - Name of sheet
 * @param {Array<Object>} rows - Array of row objects
 */
function writeAll_(sheetName, rows) {
const sheet = getSheet_(sheetName);
if (rows.length === 0) return;
// Get headers from first row
const headers = Object.keys(rows[0]);
// Clear sheet
sheet.clearContents();
// Write headers
sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
// Write data
const data = rows.map(row => headers.map(h => row[h] || ''));
sheet.getRange(2, 1, data.length, headers.length).setValues(data);
// Format headers
sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#4a5568')
    .setFontColor('#ffffff');
sheet.setFrozenRows(1);
}
/**
 * Append a single row to a sheet (insert-only, no lock needed).
 * Uses sheet.appendRow() which is atomic in Apps Script.
 * Much faster than readAll→push→writeAll for insert-only operations.
 *
 * @param {string} sheetName - Name of sheet
 * @param {Object} rowObj - Row object with field:value pairs
 */
function appendRow_(sheetName, rowObj) {
  const sheet = getSheet_(sheetName);
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) throw new Error('Sheet ' + sheetName + ' has no headers');
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const rowArr = headers.map(h => rowObj[h] !== undefined ? rowObj[h] : '');
  sheet.appendRow(rowArr);
}
/**
 * Update a single row in-place by matching a field value.
 * Only writes the changed cells, avoiding full-sheet rewrite.
 * Uses script lock internally for atomicity.
 *
 * @param {string} sheetName - Name of sheet
 * @param {string} matchField - Field name to match on (e.g., 'notificationId')
 * @param {string} matchValue - Value to find
 * @param {Object} updates - Object of {fieldName: newValue} to set
 * @returns {boolean} True if row was found and updated
 */
function updateRow_(sheetName, matchField, matchValue, updates) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return false;
    const headers = data[0];
    const matchCol = headers.indexOf(matchField);
    if (matchCol === -1) throw new Error('Field not found: ' + matchField);
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][matchCol]) === String(matchValue)) {
        const updateKeys = Object.keys(updates);
        for (let k = 0; k < updateKeys.length; k++) {
          const col = headers.indexOf(updateKeys[k]);
          if (col >= 0) {
            sheet.getRange(i + 1, col + 1).setValue(updates[updateKeys[k]]);
          }
        }
        return true;
      }
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}
/**
 * Update multiple rows matching a field value.
 * Only writes the changed cells, avoiding full-sheet rewrite.
 * Uses script lock internally for atomicity.
 *
 * @param {string} sheetName - Name of sheet
 * @param {string} matchField - Field name to match on (e.g., 'recipientEmail')
 * @param {string} matchValue - Value to find
 * @param {Object} updates - Object of {fieldName: newValue} to set on each match
 * @param {Object} [extraMatch] - Optional additional field match {field: string, emptyOnly: boolean}
 * @returns {number} Number of rows updated
 */
function updateRows_(sheetName, matchField, matchValue, updates, extraMatch) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return 0;
    const headers = data[0];
    const matchCol = headers.indexOf(matchField);
    if (matchCol === -1) throw new Error('Field not found: ' + matchField);
    const extraCol = extraMatch ? headers.indexOf(extraMatch.field) : -1;
    let count = 0;
    const updateKeys = Object.keys(updates);
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][matchCol]).toLowerCase() === String(matchValue).toLowerCase()) {
        // Optional extra filter (e.g., only update rows where readAt is empty)
        if (extraMatch && extraMatch.emptyOnly && extraCol >= 0 && data[i][extraCol]) {
          continue;
        }
        for (let k = 0; k < updateKeys.length; k++) {
          const col = headers.indexOf(updateKeys[k]);
          if (col >= 0) {
            sheet.getRange(i + 1, col + 1).setValue(updates[updateKeys[k]]);
          }
        }
        count++;
      }
    }
    return count;
  } finally {
    lock.releaseLock();
  }
}
/**
 * Update a single row by matching multiple fields (compound key).
 * Only writes the changed cells, avoiding full-sheet rewrite.
 * Uses script lock internally for atomicity.
 *
 * @param {string} sheetName - Name of sheet
 * @param {Object} matchFields - Fields to match, e.g. { email: 'x@y.com', mapId: 'map-1', hexId: 'hex-1' }
 *                                Values are compared case-insensitively for string fields.
 * @param {Object} updates - Object of {fieldName: newValue} to set
 * @returns {boolean} True if row was found and updated
 */
function updateRowByCompoundMatch_(sheetName, matchFields, updates) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return false;
    const headers = data[0];

    // Pre-compute match column indices
    const matchKeys = Object.keys(matchFields);
    const matchCols = [];
    for (let m = 0; m < matchKeys.length; m++) {
      const col = headers.indexOf(matchKeys[m]);
      if (col === -1) throw new Error('Match field not found: ' + matchKeys[m]);
      matchCols.push({ col: col, value: String(matchFields[matchKeys[m]]).toLowerCase() });
    }

    // Find matching row
    for (let i = 1; i < data.length; i++) {
      let allMatch = true;
      for (let m = 0; m < matchCols.length; m++) {
        if (String(data[i][matchCols[m].col]).toLowerCase() !== matchCols[m].value) {
          allMatch = false;
          break;
        }
      }
      if (allMatch) {
        // Update only the changed cells
        const updateKeys = Object.keys(updates);
        for (let k = 0; k < updateKeys.length; k++) {
          const col = headers.indexOf(updateKeys[k]);
          if (col >= 0) {
            sheet.getRange(i + 1, col + 1).setValue(updates[updateKeys[k]]);
          }
        }
        return true;
      }
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}
/**
 * Find rows matching multiple field filters.
 * Optimized: only constructs row objects for matching rows (skips non-matches).
 * ~30-50% faster than readAll_() + filter for large sheets where <5% of rows match.
 *
 * @param {string} sheetName - Name of sheet
 * @param {Object} filters - Fields to match, e.g. { email: 'x@y.com', mapId: 'map-1' }
 *                           Values compared case-insensitively for strings.
 * @returns {Array<Object>} Array of matching row objects
 */
function findRowsFiltered_(sheetName, filters) {
  const sheet = getSheet_(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];

  // Pre-compute filter column indices
  const filterKeys = Object.keys(filters);
  const filterCols = [];
  for (let f = 0; f < filterKeys.length; f++) {
    const col = headers.indexOf(filterKeys[f]);
    if (col === -1) return []; // Filter field doesn't exist — no matches
    filterCols.push({ col: col, value: String(filters[filterKeys[f]]).toLowerCase() });
  }

  const results = [];
  for (let i = 1; i < data.length; i++) {
    let match = true;
    for (let f = 0; f < filterCols.length; f++) {
      if (String(data[i][filterCols[f].col]).toLowerCase() !== filterCols[f].value) {
        match = false;
        break;
      }
    }
    if (match) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      results.push(row);
    }
  }
  return results;
}
/**
 * Batch delete rows matching a field value from multiple sheets in a single lock.
 * Much faster than calling deleteRows_() per sheet (avoids N separate locks + reads).
 *
 * @param {Array<Object>} operations - Array of { sheetName: string, field: string, value: any }
 * @returns {Object} Map of sheetName → number of rows deleted
 */
function batchDeleteRows_(operations) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const results = {};
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const rows = readAll_(op.sheetName);
      const filtered = rows.filter(row => String(row[op.field]) !== String(op.value));
      const deletedCount = rows.length - filtered.length;
      if (deletedCount > 0) {
        writeAll_(op.sheetName, filtered);
      }
      results[op.sheetName] = deletedCount;
    }
    return results;
  } finally {
    lock.releaseLock();
  }
}
/**
 * Find row by field value
 *
 * @param {string} sheetName - Name of sheet
 * @param {string} field - Field name to search
 * @param {any} value - Value to match
 * @returns {Object|null} Row object or null if not found
 */
function findRow_(sheetName, field, value) {
const rows = readAll_(sheetName);
return rows.find(row => row[field] === value) || null;
}
/**
 * Find multiple rows by field value
 *
 * @param {string} sheetName - Name of sheet
 * @param {string} field - Field name to search
 * @param {any} value - Value to match
 * @returns {Array<Object>} Array of matching row objects
 */
function findRows_(sheetName, field, value) {
const rows = readAll_(sheetName);
return rows.filter(row => row[field] === value);
}
/**
 * Upsert a row (update if exists, insert if not).
 * Uses cell-level updates for existing rows (avoids full-sheet rewrite).
 * Uses atomic appendRow for inserts.
 *
 * @param {string} sheetName - Name of sheet
 * @param {string} idField - Field name for unique identifier
 * @param {Object} row - Row object
 */
function upsertRow_(sheetName, idField, row) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 1) throw new Error('Sheet ' + sheetName + ' has no headers');
    const headers = data[0];
    const idCol = headers.indexOf(idField);
    if (idCol === -1) throw new Error('ID field not found: ' + idField);
    const idValue = String(row[idField]);

    // Search for existing row
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === idValue) {
        // Update existing — cell-level writes only
        for (let j = 0; j < headers.length; j++) {
          const newVal = row[headers[j]] !== undefined ? row[headers[j]] : '';
          if (String(data[i][j]) !== String(newVal)) {
            sheet.getRange(i + 1, j + 1).setValue(newVal);
          }
        }
        return;
      }
    }
    // Insert new — atomic append
    const rowArr = headers.map(h => row[h] !== undefined ? row[h] : '');
    sheet.appendRow(rowArr);
  } finally {
    lock.releaseLock();
  }
}
/**
 * Delete row by field value
 *
 * @param {string} sheetName - Name of sheet
 * @param {string} field - Field name
 * @param {any} value - Value to match
 * @returns {boolean} True if row was deleted
 */
function deleteRow_(sheetName, field, value) {
const lock = LockService.getScriptLock();
lock.waitLock(10000);
try {
const rows = readAll_(sheetName);
const filtered = rows.filter(row => row[field] !== value);
if (filtered.length < rows.length) {
writeAll_(sheetName, filtered);
return true;
    }
return false;
  } finally {
lock.releaseLock();
  }
}
/**
 * Delete multiple rows by field value
 *
 * @param {string} sheetName - Name of sheet
 * @param {string} field - Field name
 * @param {any} value - Value to match
 * @returns {number} Number of rows deleted
 */
function deleteRows_(sheetName, field, value) {
const lock = LockService.getScriptLock();
lock.waitLock(10000);
try {
const rows = readAll_(sheetName);
const filtered = rows.filter(row => row[field] !== value);
const deletedCount = rows.length - filtered.length;
if (deletedCount > 0) {
writeAll_(sheetName, filtered);
    }
return deletedCount;
  } finally {
lock.releaseLock();
  }
}
// ============================================================================
// GRADING SYSTEM CONFIGURATION
// ============================================================================
/**
 * Get grading system configuration
 *
 * @returns {Object} Grading system config
 */
function getGradingSystem_() {
const gradingJson = getConfigValue_('grading_system');
if (!gradingJson) {
// Default to 8-point SBAR
return {
type: 'sbar_8point',
name: '8-Point SBAR',
scale: 8,
strands: ['KU', 'TT', 'C'],
levels: [
        {value: 8, label: 'Excellent', range: '91-100%', color: '#10b981'},
        {value: 7, label: 'Excellent', range: '81-90%', color: '#10b981'},
        {value: 6, label: 'Substantial', range: '71-80%', color: '#3b82f6'},
        {value: 5, label: 'Substantial', range: '61-70%', color: '#3b82f6'},
        {value: 4, label: 'Adequate', range: '51-60%', color: '#f59e0b'},
        {value: 3, label: 'Adequate', range: '41-50%', color: '#f59e0b'},
        {value: 2, label: 'Limited', range: '21-40%', color: '#ef4444'},
        {value: 1, label: 'Very Limited', range: '0-20%', color: '#ef4444'}
      ],
passingLevel: 4
    };
  }
return JSON.parse(gradingJson);
}
/**
 * Get grid configuration
 *
 * @returns {Object} Grid config {rows, cols, hexWidth, hexHeight, colSpacing, rowSpacing}
 */
function getGridConfig_() {
const rows = parseInt(getConfigValue_('grid_rows')) || GRID_CONFIG.defaultRows;
const cols = parseInt(getConfigValue_('grid_cols')) || GRID_CONFIG.defaultCols;
return {
rows: rows,
cols: cols,
hexWidth: GRID_CONFIG.hexWidth,
hexHeight: GRID_CONFIG.hexHeight,
colSpacing: GRID_CONFIG.colSpacing,
rowSpacing: GRID_CONFIG.rowSpacing
  };
}
/**
 * Set grid size
 *
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 */
function setGridSize_(rows, cols) {
// Validate bounds
if (rows < GRID_CONFIG.minRows || rows > GRID_CONFIG.maxRows) {
throw new Error(`Rows must be between ${GRID_CONFIG.minRows} and ${GRID_CONFIG.maxRows}`);
  }
if (cols < GRID_CONFIG.minCols || cols > GRID_CONFIG.maxCols) {
throw new Error(`Columns must be between ${GRID_CONFIG.minCols} and ${GRID_CONFIG.maxCols}`);
  }
setConfigValues_({ grid_rows: rows.toString(), grid_cols: cols.toString() });
}
// ============================================================================
// LINKED SYSTEMS CONFIGURATION
// ============================================================================
/**
 * Get Learning Tracker sheet ID
 *
 * @returns {string|null} Sheet ID or null
 */
function getLearningTrackerSheetId_() {
return getConfigValue_('learning_tracker_sheet_id');
}
/**
 * Get Assessment Tracker sheet ID
 *
 * @returns {string|null} Sheet ID or null
 */
function getAssessmentTrackerSheetId_() {
return getConfigValue_('assessment_tracker_sheet_id');
}
/**
 * Get Curriculum Map sheet ID
 *
 * @returns {string|null} Sheet ID or null
 */
function getCurriculumMapSheetId_() {
return getConfigValue_('curriculum_map_sheet_id');
}
/**
 * Validate sheet access
 *
 * @param {string} sheetId - Spreadsheet ID
 * @returns {boolean} True if accessible
 */
function validateSheetAccess_(sheetId) {
try {
const ss = SpreadsheetApp.openById(sheetId);
return ss !== null;
  } catch (err) {
Logger.log('Sheet access validation failed: ' + err.toString());
return false;
  }
}
// ============================================================================
// TEST FUNCTIONS
// ============================================================================
/**
 * Test configuration functions
 */
function test_config() {
Logger.log('=== Testing Config Functions ===');
// Test getConfig
const config = getConfig_();
Logger.log('Config:', config);
// Test getConfigValue
const owner = getConfigValue_('owner_email');
Logger.log('Owner:', owner);
// Test grading system
const grading = getGradingSystem_();
Logger.log('Grading System:', grading);
// Test grid config
const grid = getGridConfig_();
Logger.log('Grid Config:', grid);
}
/**
 * Test database functions
 */
function test_database() {
Logger.log('=== Testing Database Functions ===');
// Test readAll
const courses = readAll_(SHEETS_.COURSES);
Logger.log('Courses:', courses);
// Test findRow
if (courses.length > 0) {
const course = findRow_(SHEETS_.COURSES, 'courseId', courses[0].courseId);
Logger.log('Found course:', course);
  }
}