/**
 * Lab Config Service — External LabReports Spreadsheet Connection & Management
 *
 * Handles connecting to the dedicated LabReports spreadsheet, testing the
 * connection, initializing sheets with proper headers, and providing
 * sheet access helpers.
 *
 * Follows SupportImportService.gs pattern for external spreadsheet management.
 *
 * Config keys:
 *   labReportsEnabled       - 'true'/'false'
 *   labReportsSpreadsheetUrl - full Google Sheets URL or spreadsheet ID
 *   labReportsLastInitialized - ISO datetime of last initialization
 *
 * External spreadsheet sheets (7):
 *   LabTemplates, LabRubrics, LabRubricCriteria, LabAssignments,
 *   LabSubmissions, LabSectionData, LabScores
 *
 * @version 1.0.0
 */

// ============================================================================
// SHEET HEADERS for the external LabReports spreadsheet
// ============================================================================

const LAB_SHEET_DEFS_ = {
  LabTemplates: {
    headers: [
      'templateId', 'title', 'gradeband', 'framework', 'sectionsJson',
      'createdBy', 'status', 'createdAt', 'updatedAt'
    ]
  },
  LabRubrics: {
    headers: [
      'rubricId', 'title', 'createdBy', 'scaleType', 'scaleMax',
      'scaleLabelJson', 'frameworkId', 'multiScorer', 'status',
      'createdAt', 'updatedAt'
    ]
  },
  LabRubricCriteria: {
    headers: [
      'criterionId', 'rubricId', 'title', 'internalDimensions',
      'frameworkCriterionId', 'sequence', 'weight',
      'level0Desc', 'level1Desc', 'level2Desc', 'level3Desc', 'level4Desc'
    ]
  },
  LabAssignments: {
    headers: [
      'assignmentId', 'templateId', 'rubricId', 'mapId', 'hexId',
      'courseId', 'unitId', 'classId', 'title', 'instructions',
      'dueDate', 'sectionOverridesJson', 'scaffoldLevel', 'status',
      'createdBy', 'createdAt', 'updatedAt'
    ]
  },
  LabSubmissions: {
    headers: [
      'submissionId', 'assignmentId', 'studentEmail', 'status',
      'embeddedSheetsJson', 'revisionNumber', 'submittedAt',
      'returnedAt', 'exportDocId', 'exportDocUrl', 'createdAt', 'updatedAt'
    ]
  },
  LabSectionData: {
    headers: [
      'sectionDataId', 'submissionId', 'sectionKey', 'contentMarkup',
      'structuredDataJson', 'wordCount', 'updatedAt'
    ]
  },
  LabScores: {
    headers: [
      'scoreId', 'submissionId', 'criterionId', 'scorerEmail',
      'scorerRole', 'score', 'feedback', 'scoredAt'
    ]
  },
  LabSectionVersions: {
    headers: [
      'versionId', 'submissionId', 'sectionKey', 'revisionNumber',
      'contentMarkup', 'structuredDataJson', 'wordCount', 'createdAt'
    ]
  }
};


// ============================================================================
// PUBLIC FUNCTIONS
// ============================================================================

/**
 * Get current lab reports configuration.
 * Teacher/admin only.
 *
 * @returns {Object} { enabled, spreadsheetUrl, lastInitialized }
 */
function getLabConfig() {
  requireRole(['administrator', 'teacher']);
  // URL = enabled: no separate toggle, URL presence determines enabled state
  const url = getConfigValue_('labReportsSpreadsheetUrl') || '';
  return {
    enabled: !!url,
    spreadsheetUrl: url,
    lastInitialized: getConfigValue_('labReportsLastInitialized') || ''
  };
}


/**
 * Save lab reports configuration (enable/disable + URL).
 * Teacher/admin only.
 *
 * @param {Object} config - { enabled, spreadsheetUrl }
 * @returns {Object} { success: true }
 */
function saveLabConfig(config) {
  requireRole(['administrator', 'teacher']);
  if (!config) throw new Error('Config is required.');

  // URL = enabled: only store URL, no separate enabled flag
  setConfigValues_({
    labReportsSpreadsheetUrl: config.spreadsheetUrl || ''
  });
  return { success: true };
}


/**
 * Test connection to the lab reports spreadsheet.
 * Teacher/admin only.
 *
 * @returns {Object} { success, message, sheetNames, initialized }
 */
function testLabConnection() {
  requireRole(['administrator', 'teacher']);
  const url = getConfigValue_('labReportsSpreadsheetUrl') || '';
  if (!url) throw new Error('Lab Reports spreadsheet URL not configured.');

  const spreadsheetId = extractSpreadsheetId_(url);
  if (!spreadsheetId) throw new Error('Could not extract spreadsheet ID from URL.');

  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheets = ss.getSheets().map(s => s.getName());

    // Check if already initialized
    const requiredSheets = Object.keys(LAB_SHEET_DEFS_);
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
 * Initialize the external lab reports spreadsheet with all 8 sheets + headers.
 * Creates sheets that don't exist; skips those that do.
 * Teacher/admin only.
 *
 * @returns {Object} { success, message, created }
 */
function initializeLabSpreadsheet() {
  requireRole(['administrator', 'teacher']);
  const url = getConfigValue_('labReportsSpreadsheetUrl') || '';
  if (!url) throw new Error('Lab Reports spreadsheet URL not configured.');

  const spreadsheetId = extractSpreadsheetId_(url);
  if (!spreadsheetId) throw new Error('Could not extract spreadsheet ID from URL.');

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const created = [];
  const sheetNames = Object.keys(LAB_SHEET_DEFS_);

  for (let i = 0; i < sheetNames.length; i++) {
    const name = sheetNames[i];
    const def = LAB_SHEET_DEFS_[name];
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
  setConfigValues_({ labReportsLastInitialized: now_() });

  return {
    success: true,
    message: created.length > 0
      ? 'Created ' + created.length + ' sheet(s): ' + created.join(', ')
      : 'All 8 sheets already exist. Ready for lab reports.',
    created: created
  };
}


// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Get a sheet from the external LabReports spreadsheet by name.
 * Throws if lab reports not enabled or spreadsheet not accessible.
 *
 * @param {string} sheetName - Sheet name (e.g. 'LabTemplates')
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 * @private
 */
function getLabSheet_(sheetName) {
  // URL = enabled: if URL exists, Lab Reports is active
  const url = getConfigValue_('labReportsSpreadsheetUrl') || '';
  if (!url) throw new Error('Lab Reports spreadsheet URL not configured. Add a URL in Integrations settings.');

  const spreadsheetId = extractSpreadsheetId_(url);
  if (!spreadsheetId) throw new Error('Could not extract spreadsheet ID from URL.');

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" not found in Lab Reports spreadsheet. Run Initialize first.');
  }

  return sheet;
}


/**
 * Read all rows from a lab sheet as an array of objects (header-keyed).
 * Follows the same pattern as readAll_ in Config.gs but for external sheets.
 *
 * @param {string} sheetName - Sheet name
 * @returns {Array<Object>} Array of row objects
 * @private
 */
function readLabSheet_(sheetName) {
  const sheet = getLabSheet_(sheetName);
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
 * Find rows in a lab sheet matching a field value.
 *
 * @param {string} sheetName - Sheet name
 * @param {string} field - Column name to match
 * @param {string} value - Value to match
 * @returns {Array<Object>} Matching row objects
 * @private
 */
function findLabRows_(sheetName, field, value) {
  const all = readLabSheet_(sheetName);
  const results = [];
  for (let i = 0; i < all.length; i++) {
    if (String(all[i][field]) === String(value)) {
      results.push(all[i]);
    }
  }
  return results;
}


/**
 * Append a row to a lab sheet.
 *
 * @param {string} sheetName - Sheet name
 * @param {Object} rowObj - Row data as object (keys match headers)
 * @private
 */
function appendLabRow_(sheetName, rowObj) {
  const sheet = getLabSheet_(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = [];
  for (let i = 0; i < headers.length; i++) {
    row.push(rowObj[headers[i]] !== undefined ? rowObj[headers[i]] : '');
  }
  sheet.appendRow(row);
}


/**
 * Update a row in a lab sheet by primary key field match.
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
function updateLabRow_(sheetName, pkField, pkValue, updates) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getLabSheet_(sheetName);
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
 * Delete a row from a lab sheet by primary key field match.
 * Uses lock for concurrency safety.
 *
 * @param {string} sheetName - Sheet name
 * @param {string} pkField - Primary key field name
 * @param {string} pkValue - Primary key value to match
 * @returns {boolean} true if row found and deleted
 * @private
 */
function deleteLabRow_(sheetName, pkField, pkValue) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getLabSheet_(sheetName);
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
