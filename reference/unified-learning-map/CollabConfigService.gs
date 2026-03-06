/**
 * CollabSpace Config Service — External Collaboration Spreadsheet Connection & Management
 *
 * Handles connecting to the dedicated CollabSpace spreadsheet, testing the
 * connection, initializing sheets with proper headers, and providing
 * sheet access helpers.
 *
 * Follows LabConfigService.gs pattern for external spreadsheet management.
 *
 * Config keys:
 *   collabEnabled             - 'true'/'false'
 *   collabSpreadsheetUrl      - full Google Sheets URL or spreadsheet ID
 *   collabLastInitialized     - ISO datetime of last initialization
 *
 * External spreadsheet sheets (6):
 *   CollabBoards, CollabPosts, CollabComments, CollabReactions,
 *   CollabMembers, CollabActivity
 *
 * @version 1.0.0
 */

// ============================================================================
// SHEET HEADERS for the external CollabSpace spreadsheet
// ============================================================================

const COLLAB_SHEET_DEFS_ = {
  CollabBoards: {
    headers: [
      'boardId', 'title', 'description', 'boardType', 'layoutMode',
      'mapId', 'hexId', 'classId', 'courseId', 'createdBy',
      'isArchived', 'allowAnonymous', 'postApproval',
      'maxPostsPerStudent', 'defaultColumnsJson', 'createdAt', 'updatedAt'
    ]
  },
  CollabPosts: {
    headers: [
      'postId', 'boardId', 'authorEmail', 'authorName', 'contentText',
      'contentType', 'attachmentUrl', 'attachmentLabel', 'linkUrl',
      'linkLabel', 'columnLabel', 'sortOrder', 'colorTag',
      'isPinned', 'isApproved', 'isDeleted', 'createdAt', 'updatedAt'
    ]
  },
  CollabComments: {
    headers: [
      'commentId', 'postId', 'boardId', 'authorEmail', 'authorName',
      'contentText', 'isDeleted', 'createdAt', 'updatedAt',
      'replyToCommentId'
    ]
  },
  CollabReactions: {
    headers: [
      'reactionId', 'postId', 'boardId', 'authorEmail', 'reactionType',
      'createdAt', 'isRemoved'
    ]
  },
  CollabMembers: {
    headers: [
      'membershipId', 'boardId', 'memberEmail', 'memberRole',
      'addedBy', 'addedAt', 'isActive'
    ]
  },
  CollabActivity: {
    headers: [
      'activityId', 'boardId', 'actorEmail', 'actionType', 'targetId',
      'targetType', 'metadata', 'createdAt'
    ]
  }
};


// ============================================================================
// PUBLIC FUNCTIONS
// ============================================================================

/**
 * Get current collaboration configuration.
 * Teacher/admin only.
 *
 * @returns {Object} { enabled, spreadsheetUrl, lastInitialized }
 */
function getCollabConfig() {
  requireRole(['administrator', 'teacher']);
  // URL = enabled: no separate toggle, URL presence determines enabled state
  const url = getConfigValue_('collabSpreadsheetUrl') || '';
  return {
    enabled: !!url,
    spreadsheetUrl: url,
    lastInitialized: getConfigValue_('collabLastInitialized') || ''
  };
}


/**
 * Save collaboration configuration (enable/disable + URL).
 * Teacher/admin only.
 *
 * @param {Object} config - { enabled, spreadsheetUrl }
 * @returns {Object} { success: true }
 */
function saveCollabConfig(config) {
  requireRole(['administrator', 'teacher']);
  if (!config) throw new Error('Config is required.');

  // URL = enabled: only store URL, no separate enabled flag
  setConfigValues_({
    collabSpreadsheetUrl: config.spreadsheetUrl || ''
  });
  return { success: true };
}


/**
 * Test connection to the collaboration spreadsheet.
 * Teacher/admin only.
 *
 * @returns {Object} { success, message, sheetNames, initialized }
 */
function testCollabConnection() {
  requireRole(['administrator', 'teacher']);
  const url = getConfigValue_('collabSpreadsheetUrl') || '';
  if (!url) throw new Error('Collaboration spreadsheet URL not configured.');

  const spreadsheetId = extractSpreadsheetId_(url);
  if (!spreadsheetId) throw new Error('Could not extract spreadsheet ID from URL.');

  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheets = ss.getSheets().map(function(s) { return s.getName(); });

    // Check if already initialized
    const requiredSheets = Object.keys(COLLAB_SHEET_DEFS_);
    let allPresent = true;
    for (let i = 0; i < requiredSheets.length; i++) {
      if (sheets.indexOf(requiredSheets[i]) === -1) {
        allPresent = false;
        break;
      }
    }

    return {
      success: true,
      message: 'Connected! Found ' + sheets.length + ' sheet(s).',
      sheetNames: sheets,
      initialized: allPresent
    };
  } catch (e) {
    return {
      success: false,
      message: 'Cannot open spreadsheet: ' + e.message,
      sheetNames: [],
      initialized: false
    };
  }
}


/**
 * Initialize the external collaboration spreadsheet with all 6 sheets + headers.
 * Creates sheets that don't exist; skips those that do.
 * Teacher/admin only.
 *
 * @returns {Object} { success, message, created }
 */
function initializeCollabSpreadsheet() {
  requireRole(['administrator', 'teacher']);
  const url = getConfigValue_('collabSpreadsheetUrl') || '';
  if (!url) throw new Error('Collaboration spreadsheet URL not configured.');

  const spreadsheetId = extractSpreadsheetId_(url);
  if (!spreadsheetId) throw new Error('Could not extract spreadsheet ID from URL.');

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const created = [];
  const sheetNames = Object.keys(COLLAB_SHEET_DEFS_);

  for (let i = 0; i < sheetNames.length; i++) {
    const name = sheetNames[i];
    const def = COLLAB_SHEET_DEFS_[name];
    let sheet = ss.getSheetByName(name);

    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
      sheet.getRange(1, 1, 1, def.headers.length)
        .setFontWeight('bold')
        .setBackground('#1e3a5f')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      created.push(name);
    }
  }

  // Update last initialized timestamp
  setConfigValues_({ collabLastInitialized: now_() });

  return {
    success: true,
    message: created.length > 0
      ? 'Created ' + created.length + ' sheet(s): ' + created.join(', ')
      : 'All 6 sheets already exist. Ready for collaboration.',
    created: created
  };
}


// ============================================================================
// INTERNAL HELPERS — Sheet Access
// ============================================================================

/**
 * Get a sheet from the external CollabSpace spreadsheet by name.
 * Throws if collaboration not enabled or spreadsheet not accessible.
 *
 * @param {string} sheetName - Sheet name (e.g. 'CollabBoards')
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 * @private
 */
function getCollabSheet_(sheetName) {
  // URL = enabled: if URL exists, Collaboration is active
  const url = getConfigValue_('collabSpreadsheetUrl') || '';
  if (!url) throw new Error('Collaboration spreadsheet URL not configured. Add a URL in Integrations settings.');

  const spreadsheetId = extractSpreadsheetId_(url);
  if (!spreadsheetId) throw new Error('Could not extract spreadsheet ID from URL.');

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" not found in Collaboration spreadsheet. Run Initialize first.');
  }

  return sheet;
}


/**
 * Read all rows from a collab sheet as an array of objects (header-keyed).
 * Follows the same pattern as readAll_ in Config.gs but for external sheets.
 *
 * @param {string} sheetName - Sheet name
 * @returns {Array<Object>} Array of row objects
 * @private
 */
function readCollabSheet_(sheetName) {
  const sheet = getCollabSheet_(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // only header row

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
 * Find rows in a collab sheet matching a field value.
 *
 * @param {string} sheetName - Sheet name
 * @param {string} field - Column name to match
 * @param {string} value - Value to match
 * @returns {Array<Object>} Matching row objects
 * @private
 */
function findCollabRows_(sheetName, field, value) {
  const all = readCollabSheet_(sheetName);
  const results = [];
  for (let i = 0; i < all.length; i++) {
    if (String(all[i][field]) === String(value)) {
      results.push(all[i]);
    }
  }
  return results;
}


/**
 * Append a row to a collab sheet (atomic, no lock needed).
 *
 * @param {string} sheetName - Sheet name
 * @param {Object} rowObj - Row data as object (keys match headers)
 * @private
 */
function appendCollabRow_(sheetName, rowObj) {
  const sheet = getCollabSheet_(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = [];
  for (let i = 0; i < headers.length; i++) {
    row.push(rowObj[headers[i]] !== undefined ? rowObj[headers[i]] : '');
  }
  sheet.appendRow(row);
}


/**
 * Update a row in a collab sheet by primary key field match.
 * Reads all data, finds matching row, updates in place.
 * Uses lock for concurrency safety.
 *
 * @param {string} sheetName - Sheet name
 * @param {string} pkField - Primary key field name
 * @param {string} pkValue - Primary key value to match
 * @param {Object} updates - Fields to update
 * @returns {boolean} true if row found and updated, false if not found
 * @private
 */
function updateCollabRow_(sheetName, pkField, pkValue, updates) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getCollabSheet_(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return false;

    const headers = data[0];
    const pkCol = headers.indexOf(pkField);
    if (pkCol === -1) return false;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][pkCol]) === String(pkValue)) {
        // Found the row — apply updates
        const updateKeys = Object.keys(updates);
        for (let u = 0; u < updateKeys.length; u++) {
          const col = headers.indexOf(updateKeys[u]);
          if (col !== -1) {
            data[i][col] = updates[updateKeys[u]];
          }
        }
        // Write back just this row
        sheet.getRange(i + 1, 1, 1, headers.length).setValues([data[i]]);
        return true;
      }
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}


/**
 * Delete a row from a collab sheet by primary key field match.
 * Uses lock for concurrency safety.
 *
 * @param {string} sheetName - Sheet name
 * @param {string} pkField - Primary key field name
 * @param {string} pkValue - Primary key value to match
 * @returns {boolean} true if row found and deleted
 * @private
 */
function deleteCollabRow_(sheetName, pkField, pkValue) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getCollabSheet_(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return false;

    const headers = data[0];
    const pkCol = headers.indexOf(pkField);
    if (pkCol === -1) return false;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][pkCol]) === String(pkValue)) {
        sheet.deleteRow(i + 1);
        return true;
      }
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}


/**
 * Delete all rows matching a field value from a collab sheet.
 * Deletes from bottom to top to preserve row indices.
 * Uses lock for concurrency safety.
 *
 * @param {string} sheetName - Sheet name
 * @param {string} field - Column name to match
 * @param {string} value - Value to match
 * @returns {number} Number of rows deleted
 * @private
 */
function deleteCollabRows_(sheetName, field, value) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getCollabSheet_(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return 0;

    const headers = data[0];
    const col = headers.indexOf(field);
    if (col === -1) return 0;

    // Collect matching row indices (1-based, bottom to top for safe deletion)
    const toDelete = [];
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][col]) === String(value)) {
        toDelete.push(i + 1); // sheet row number (1-based)
      }
    }

    for (let d = 0; d < toDelete.length; d++) {
      sheet.deleteRow(toDelete[d]);
    }

    return toDelete.length;
  } finally {
    lock.releaseLock();
  }
}


/**
 * Safe JSON parse with default fallback.
 *
 * @param {string} jsonStr - JSON string to parse
 * @param {*} defaultVal - Default value if parse fails
 * @returns {*} Parsed value or default
 * @private
 */
function parseCollabJson_(jsonStr, defaultVal) {
  if (!jsonStr || typeof jsonStr !== 'string' || jsonStr.trim() === '') {
    return defaultVal !== undefined ? defaultVal : null;
  }
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return defaultVal !== undefined ? defaultVal : null;
  }
}
