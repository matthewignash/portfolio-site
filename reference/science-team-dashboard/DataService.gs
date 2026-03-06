/**
 * DataService.gs
 * Google Sheets CRUD operations for the Science Department Dashboard.
 * Manages one spreadsheet with 19 tabs shared across all dashboard apps.
 *
 * Pattern replicated from School-Waterfall-Scheduler/DataService.gs
 */

const DataService = (function() {

  // Sheet (tab) names
  const SHEETS = {
    CONFIG:           'Config',
    POSTS:            'Posts',
    SHARED_TASKS:     'SharedTasks',
    PERSONAL_TASKS:   'PersonalTasks',
    KANBAN_COLUMNS:   'KanbanColumns',
    KANBAN_CARDS:     'KanbanCards',
    CARD_HISTORY:     'CardHistory',
    MEETINGS:         'Meetings',
    ATTENDEES:        'Attendees',
    AGENDA_ITEMS:     'AgendaItems',
    DECISIONS:        'Decisions',
    ACTION_ITEMS:     'ActionItems',
    MEETING_TEMPLATES:'MeetingTemplates',
    NEWSLETTERS:      'Newsletters',
    SECTIONS:         'Sections',
    ITEMS:            'Items',
    CURRICULUM_COURSES: 'CurriculumCourses',
    CURRICULUM_UNITS:   'CurriculumUnits',
    STAFF:              'Staff'
  };

  // Cache the spreadsheet reference (per-execution)
  let cachedSpreadsheet = null;

  // ==================== Spreadsheet Access ====================

  /**
   * Get the spreadsheet. Works both when bound to a sheet and as standalone web app.
   * @returns {Spreadsheet}
   */
  function getSpreadsheet() {
    if (cachedSpreadsheet) return cachedSpreadsheet;

    // Try bound spreadsheet first
    let ss = SpreadsheetApp.getActiveSpreadsheet();

    if (!ss) {
      // Standalone web app mode — use script properties
      const props = PropertiesService.getScriptProperties();
      const ssId = props.getProperty('SPREADSHEET_ID');

      if (ssId) {
        ss = SpreadsheetApp.openById(ssId);
      } else {
        // Create new spreadsheet
        ss = SpreadsheetApp.create('Science Dept Dashboard');
        props.setProperty('SPREADSHEET_ID', ss.getId());
        Logger.log('Created new spreadsheet: ' + ss.getUrl());
      }
    }

    cachedSpreadsheet = ss;
    return ss;
  }

  /**
   * Get a specific sheet by name. Creates it with headers if missing.
   * @param {string} sheetName
   * @returns {Sheet}
   */
  function getSheet(sheetName) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      initializeSheet(sheet, sheetName);
    }

    return sheet;
  }

  /**
   * Initialize a new sheet with the correct headers
   * @param {Sheet} sheet
   * @param {string} sheetName
   */
  function initializeSheet(sheet, sheetName) {
    const headers = {
      [SHEETS.CONFIG]:           [['Field', 'Value']],
      [SHEETS.POSTS]:            [['PostId', 'Author', 'AuthorName', 'Message', 'Category', 'Timestamp', 'Pinned', 'Edited', 'EditedTimestamp', 'EventDate', 'EventTime']],
      [SHEETS.SHARED_TASKS]:     [['TaskId', 'Title', 'Assignee', 'CreatedBy', 'CreatedDate', 'DueDate', 'Priority', 'Status', 'CompletedBy', 'CompletedDate', 'Notes']],
      [SHEETS.PERSONAL_TASKS]:   [['TaskId', 'Owner', 'Title', 'DueDate', 'Priority', 'Status', 'CompletedDate', 'SortOrder']],
      [SHEETS.KANBAN_COLUMNS]:   [['ColumnId', 'Title', 'SortOrder', 'WipLimit', 'Color']],
      [SHEETS.KANBAN_CARDS]:     [['CardId', 'Title', 'Description', 'CardType', 'ColumnId', 'Assignee', 'CreatedBy', 'CreatedDate', 'DueDate', 'Priority', 'SortOrder', 'Labels', 'LinkedMeetingId', 'ArchivedDate']],
      [SHEETS.CARD_HISTORY]:     [['HistoryId', 'CardId', 'Action', 'FromColumn', 'ToColumn', 'Actor', 'Timestamp']],
      [SHEETS.MEETINGS]:         [['MeetingId', 'Title', 'TemplateType', 'Date', 'StartTime', 'EndTime', 'Location', 'Organizer', 'Status', 'CreatedDate', 'FinalizedDate', 'FinalizedBy']],
      [SHEETS.ATTENDEES]:        [['AttendeeId', 'MeetingId', 'Email', 'Name', 'Role', 'Attended']],
      [SHEETS.AGENDA_ITEMS]:     [['AgendaId', 'MeetingId', 'SortOrder', 'Title', 'Description', 'Presenter', 'TimeAllocation', 'Notes']],
      [SHEETS.DECISIONS]:        [['DecisionId', 'MeetingId', 'AgendaId', 'Decision', 'Context', 'Timestamp']],
      [SHEETS.ACTION_ITEMS]:     [['ActionId', 'MeetingId', 'AgendaId', 'Description', 'Assignee', 'DueDate', 'Status', 'CompletedDate', 'KanbanCardId', 'Notes']],
      [SHEETS.MEETING_TEMPLATES]:[['TemplateId', 'Name', 'DefaultTitle', 'DefaultAgendaItems', 'DefaultDuration', 'DefaultAttendees', 'IsActive']],
      [SHEETS.NEWSLETTERS]:      [['NewsletterId', 'Title', 'WeekOf', 'Status', 'CreatedBy', 'CreatedDate', 'SentDate', 'SentBy']],
      [SHEETS.SECTIONS]:         [['SectionId', 'NewsletterId', 'Title', 'Icon', 'SortOrder']],
      [SHEETS.ITEMS]:            [['ItemId', 'NewsletterId', 'SectionId', 'Content', 'SubmittedBy', 'SubmittedDate', 'Status', 'AddedBy', 'AddedDate', 'SortOrder']],
      [SHEETS.CURRICULUM_COURSES]:[['CourseId', 'Name', 'GradeLevel', 'School', 'SortOrder', 'Color', 'Description', 'IsActive', 'CreatedBy', 'CreatedDate']],
      [SHEETS.CURRICULUM_UNITS]:  [['UnitId', 'CourseId', 'Title', 'Duration', 'Description', 'TopicArea', 'TopicColor', 'SortOrder', 'Standards', 'EssentialQuestions', 'Resources', 'Assessments', 'CrossCurricular', 'Prerequisites', 'TeacherNotes', 'Status', 'CreatedBy', 'CreatedDate', 'LastEditedBy', 'LastEditedDate', 'OriginalUnitId']],
      [SHEETS.STAFF]:             [['StaffId', 'Email', 'DisplayName', 'Role', 'IsActive', 'CreatedDate']]
    };

    if (headers[sheetName]) {
      const h = headers[sheetName][0];
      sheet.getRange(1, 1, 1, h.length).setValues([h]);
      sheet.getRange(1, 1, 1, h.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }

  // ==================== Generic CRUD ====================

  /**
   * Get all data from a sheet as array of objects.
   * CRITICAL: Converts Date objects to ISO strings for serialization.
   * @param {string} sheetName
   * @returns {Array<Object>}
   */
  function getSheetData(sheetName) {
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return []; // headers only or empty

    const headers = data[0];
    const rows = [];

    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((header, index) => {
        let value = data[i][index];
        // Convert Date objects to string — google.script.run cannot serialize Dates
        if (value instanceof Date) {
          value = formatDateString(value);
        }
        row[header] = value;
      });
      rows.push(row);
    }

    return rows;
  }

  /**
   * Append a single row to a sheet
   * @param {string} sheetName
   * @param {Object} rowData - key-value pairs matching header names
   */
  function appendRow(sheetName, rowData) {
    const sheet = getSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map(header => rowData[header] !== undefined ? rowData[header] : '');
    sheet.appendRow(row);
  }

  /**
   * Update a specific row by index (0-based, excluding header)
   * @param {string} sheetName
   * @param {number} rowIndex
   * @param {Object} rowData
   */
  function updateRow(sheetName, rowIndex, rowData) {
    const sheet = getSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map(header => rowData[header] !== undefined ? rowData[header] : '');
    sheet.getRange(rowIndex + 2, 1, 1, row.length).setValues([row]); // +2 = header + 1-based
  }

  /**
   * Delete a row by index (0-based, excluding header)
   * @param {string} sheetName
   * @param {number} rowIndex
   */
  function deleteRow(sheetName, rowIndex) {
    const sheet = getSheet(sheetName);
    sheet.deleteRow(rowIndex + 2); // +2 = header + 1-based
  }

  /**
   * Find the index (0-based, excluding header) of the first row where field === value.
   * Returns -1 if not found.
   * @param {string} sheetName
   * @param {string} field - header/column name to match
   * @param {*} value - value to match
   * @returns {number}
   */
  function findRowIndex(sheetName, field, value) {
    const data = getSheetData(sheetName);
    for (let i = 0; i < data.length; i++) {
      if (data[i][field] === value) return i;
    }
    return -1;
  }

  /**
   * Find a single row object where field === value.
   * Returns null if not found.
   * @param {string} sheetName
   * @param {string} field
   * @param {*} value
   * @returns {Object|null}
   */
  function findRow(sheetName, field, value) {
    const data = getSheetData(sheetName);
    return data.find(row => row[field] === value) || null;
  }

  /**
   * Delete all rows where field === value.
   * Deletes from bottom to top to preserve indices.
   * @param {string} sheetName
   * @param {string} field
   * @param {*} value
   * @returns {number} - count of deleted rows
   */
  function deleteRowsWhere(sheetName, field, value) {
    const data = getSheetData(sheetName);
    let count = 0;
    // Iterate backwards to keep indices stable
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i][field] === value) {
        deleteRow(sheetName, i);
        count++;
      }
    }
    return count;
  }

  /**
   * Replace all data in a sheet (header preserved, rows replaced)
   * @param {string} sheetName
   * @param {Array<Object>} data
   */
  function setSheetData(sheetName, data) {
    const sheet = getSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Clear existing data rows
    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }

    if (data.length === 0) return;

    const rows = data.map(row => headers.map(header => row[header] !== undefined ? row[header] : ''));
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  // ==================== Config Helpers ====================

  /**
   * Get a single config value by field name
   * @param {string} field
   * @returns {*}
   */
  function getConfigValue(field) {
    const data = getSheetData(SHEETS.CONFIG);
    const row = data.find(r => r.Field === field);
    return row ? row.Value : null;
  }

  /**
   * Get all config as { field: value } object
   * @returns {Object}
   */
  function getAllConfig() {
    const data = getSheetData(SHEETS.CONFIG);
    const config = {};
    data.forEach(row => { config[row.Field] = row.Value; });
    return config;
  }

  /**
   * Set a config value (upsert)
   * @param {string} field
   * @param {*} value
   */
  function setConfigValue(field, value) {
    const sheet = getSheet(SHEETS.CONFIG);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === field) {
        sheet.getRange(i + 1, 2).setValue(value);
        return;
      }
    }
    // Not found — append
    sheet.appendRow([field, value]);
  }

  // ==================== Public API ====================

  return {
    SHEETS,
    getSpreadsheet,
    getSheet,
    getSheetData,
    appendRow,
    updateRow,
    deleteRow,
    findRowIndex,
    findRow,
    deleteRowsWhere,
    setSheetData,
    getConfigValue,
    getAllConfig,
    setConfigValue
  };

})();
