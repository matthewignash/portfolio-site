/**
 * LogService.gs — Structured logging to a _logs sheet
 *
 * Severity levels: DEBUG, INFO, WARN, ERROR
 * Each log entry records: timestamp, severity, function name, message, stack trace, user email.
 * Older entries are auto-trimmed to keep the sheet under MAX_ROWS.
 */

var LogService = (function() {

  var SHEET_NAME = '_logs';
  var MAX_ROWS = 5000;
  var HEADERS = ['id', 'timestamp', 'severity', 'function_name', 'message', 'stack', 'user_email'];

  /**
   * Internal: gets or creates the _logs sheet.
   */
  function getSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.setFrozenRows(1);
    }
    return sheet;
  }

  /**
   * Writes a log entry.
   * @param {string} severity - DEBUG | INFO | WARN | ERROR
   * @param {string} functionName - The server function that generated the log
   * @param {string} message - Human-readable description
   * @param {string} [stack] - Error stack trace (optional)
   */
  function log(severity, functionName, message, stack) {
    try {
      var sheet = getSheet_();
      var userEmail = '';
      try {
        userEmail = Session.getActiveUser().getEmail();
      } catch (e) {
        // May not be available in all contexts
      }

      var row = [
        generateId(),
        nowISO(),
        severity,
        functionName || '',
        String(message).substring(0, 5000),
        stack ? String(stack).substring(0, 5000) : '',
        userEmail
      ];

      sheet.appendRow(row);

      // Trim old rows if over limit
      var lastRow = sheet.getLastRow();
      if (lastRow > MAX_ROWS + 100) {
        // Delete oldest rows beyond MAX_ROWS (keep header + MAX_ROWS data rows)
        var rowsToDelete = lastRow - MAX_ROWS;
        sheet.deleteRows(2, rowsToDelete);
      }
    } catch (e) {
      // Fallback to built-in Logger if sheet logging fails
      Logger.log('[' + severity + '] ' + functionName + ': ' + message);
    }
  }

  function debug(functionName, message) {
    log('DEBUG', functionName, message);
  }

  function info(functionName, message) {
    log('INFO', functionName, message);
  }

  function warn(functionName, message) {
    log('WARN', functionName, message);
  }

  function error(functionName, message, stack) {
    log('ERROR', functionName, message, stack);
  }

  return {
    log: log,
    debug: debug,
    info: info,
    warn: warn,
    error: error
  };

})();
