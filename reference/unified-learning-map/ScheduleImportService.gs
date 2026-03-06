// ============================================================================
// SCHEDULE IMPORT SERVICE
// Imports data from the Waterfall Scheduler spreadsheet and stores as config.
// Teacher/admin only for import; students read cached data via PlannerService.
// ============================================================================

/**
 * Get current waterfall schedule configuration.
 * @returns {Object} { enabled: boolean, spreadsheetUrl: string, lastImported: string }
 */
function getWaterfallConfig() {
  requireRole(['administrator', 'teacher']);
  // URL = enabled: no separate toggle, URL presence determines enabled state
  var url = getConfigValue_('waterfallSpreadsheetUrl') || '';
  return {
    enabled: !!url,
    spreadsheetUrl: url,
    lastImported: getConfigValue_('waterfallLastImported') || ''
  };
}

/**
 * Save waterfall schedule configuration (enable/disable + URL).
 * @param {Object} config - { enabled: boolean, spreadsheetUrl: string }
 * @returns {Object} { success: true }
 */
function saveWaterfallConfig(config) {
  requireRole(['administrator', 'teacher']);
  if (!config) throw new Error('Config is required');

  // URL = enabled: only store URL, no separate enabled flag
  setConfigValues_({
    waterfallSpreadsheetUrl: config.spreadsheetUrl || ''
  });
  return { success: true };
}

/**
 * Test connection to the Waterfall Scheduler spreadsheet.
 * Opens by URL, verifies expected sheets exist.
 * @returns {Object} { success: boolean, message: string, sheetNames: Array }
 */
function testWaterfallConnection() {
  requireRole(['administrator', 'teacher']);
  const url = getConfigValue_('waterfallSpreadsheetUrl') || '';
  if (!url) throw new Error('Waterfall Scheduler URL not configured');

  const spreadsheetId = extractSpreadsheetId_(url);
  if (!spreadsheetId) throw new Error('Could not extract spreadsheet ID from URL');

  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheets = ss.getSheets().map(s => s.getName());
    const required = ['RotationSchedule', 'BellSchedules', 'TeacherSchedules', 'Teachers'];
    const missing = required.filter(r => sheets.indexOf(r) === -1);

    if (missing.length > 0) {
      return {
        success: false,
        message: 'Missing sheets: ' + missing.join(', '),
        sheetNames: sheets
      };
    }

    return {
      success: true,
      message: 'Connected! Found ' + sheets.length + ' sheets.',
      sheetNames: sheets
    };
  } catch (e) {
    return {
      success: false,
      message: 'Cannot open spreadsheet: ' + e.message,
      sheetNames: []
    };
  }
}

/**
 * Import schedule data from Waterfall Scheduler spreadsheet.
 * Reads 4 sheets, stores as JSON in Config.
 * @returns {Object} { success: true, importedAt: string, stats: Object }
 */
function importWaterfallSchedule() {
  requireRole(['administrator', 'teacher']);
  const url = getConfigValue_('waterfallSpreadsheetUrl') || '';
  if (!url) throw new Error('Waterfall Scheduler URL not configured');

  const spreadsheetId = extractSpreadsheetId_(url);
  if (!spreadsheetId) throw new Error('Could not extract spreadsheet ID from URL');

  const ss = SpreadsheetApp.openById(spreadsheetId);

  // Read RotationSchedule: Date, DayType, Block1, Block2, Block3, Block4, Notes
  const rotationData = readSheetAsObjects_(ss, 'RotationSchedule');

  // Read BellSchedules: ScheduleID, Name, School, Block1Start..Block4End
  const bellData = readSheetAsObjects_(ss, 'BellSchedules');

  // Read TeacherSchedules: TeacherID, Block, Course, Room
  const teacherScheduleData = readSheetAsObjects_(ss, 'TeacherSchedules');

  // Read Teachers: TeacherID, Name, Email, School, Active
  const teachersData = readSheetAsObjects_(ss, 'Teachers');

  // Read Holidays (optional — may not exist)
  let holidaysData = [];
  try {
    holidaysData = readSheetAsObjects_(ss, 'Holidays');
  } catch (e) {
    Logger.log('No Holidays sheet found (non-fatal)');
  }

  // Read NonRotationDays (optional)
  let nonRotationData = [];
  try {
    nonRotationData = readSheetAsObjects_(ss, 'NonRotationDays');
  } catch (e) {
    Logger.log('No NonRotationDays sheet found (non-fatal)');
  }

  // Read ScheduleOverrides (optional)
  let overridesData = [];
  try {
    overridesData = readSheetAsObjects_(ss, 'ScheduleOverrides');
  } catch (e) {
    Logger.log('No ScheduleOverrides sheet found (non-fatal)');
  }

  const importPayload = {
    rotation: rotationData,
    bellSchedules: bellData,
    teacherSchedules: teacherScheduleData,
    teachers: teachersData,
    holidays: holidaysData,
    nonRotationDays: nonRotationData,
    scheduleOverrides: overridesData
  };

  // Store as JSON in Config
  const jsonStr = JSON.stringify(importPayload);
  const importedAt = now_();
  setConfigValues_({
    waterfallScheduleJson: jsonStr,
    waterfallLastImported: importedAt
  });

  return {
    success: true,
    importedAt: now_(),
    stats: {
      rotationDays: rotationData.length,
      bellSchedules: bellData.length,
      teachers: teachersData.length,
      teacherSchedules: teacherScheduleData.length,
      holidays: holidaysData.length
    }
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract spreadsheet ID from a Google Sheets URL or raw ID.
 * @param {string} urlOrId
 * @returns {string|null}
 */
function extractSpreadsheetId_(urlOrId) {
  if (!urlOrId) return null;
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  // If it looks like a raw ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(urlOrId) && urlOrId.indexOf('/') === -1) return urlOrId;
  return null;
}

/**
 * Read a sheet from a Spreadsheet as an array of objects.
 * First row = headers, subsequent rows = data.
 * @param {Spreadsheet} ss
 * @param {string} sheetName
 * @returns {Array<Object>}
 */
function readSheetAsObjects_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet "' + sheetName + '" not found');

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => String(h).trim());
  const result = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    // Skip empty rows
    if (!row[0] && !row[1]) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      let val = row[c];
      // Convert Date objects to ISO strings
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      obj[headers[c]] = val !== undefined && val !== null ? String(val) : '';
    }
    result.push(obj);
  }

  return result;
}
