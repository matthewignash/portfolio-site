/**
 * DataService.gs — Data Access Layer (DAL)
 *
 * ALL data operations in the application flow through this class.
 * No other code should call SpreadsheetApp directly.
 *
 * Data is read from Google Sheets, cached via CacheManager, and
 * filtered/sorted in-memory (Sheets has no query engine).
 *
 * Designed for future migration: replace internal methods with
 * Firestore/SQL calls and the rest of the app stays untouched.
 */

var DataService = (function() {

  // ───────────────────────────────────────────────
  // Private helpers
  // ───────────────────────────────────────────────

  /**
   * Returns the active spreadsheet (bound to the script).
   * Falls back to opening by ID stored in script properties.
   */
  function getSpreadsheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
    var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (id) return SpreadsheetApp.openById(id);
    throw new Error('DataService: No spreadsheet bound or configured.');
  }

  /**
   * Returns the sheet (tab) for a given table name.
   * @param {string} tableName
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  function getSheet_(tableName) {
    var sheet = getSpreadsheet_().getSheetByName(tableName);
    if (!sheet) throw new Error('Table "' + tableName + '" not found.');
    return sheet;
  }

  /**
   * Reads all rows from a sheet, converts to array of objects.
   * Uses CacheManager to avoid repeated Sheets API calls.
   * @param {string} tableName
   * @returns {Object[]}
   */
  function readAll_(tableName) {
    var cacheKey = 'table_' + tableName;
    var cached = CacheManager.get(cacheKey);
    if (cached) return cached;

    var sheet = getSheet_(tableName);
    var data = sheet.getDataRange().getValues();
    if (data.length < 1) return [];

    var headers = data[0];
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Skip completely empty rows (no id)
      if (!row[0] && !row[1]) continue;

      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        var val = row[j];
        // Convert Date objects to ISO strings for consistency
        if (val instanceof Date) {
          val = val.toISOString();
        }
        obj[headers[j]] = val;
      }
      rows.push(obj);
    }

    CacheManager.put(cacheKey, rows);
    return rows;
  }

  /**
   * Returns the header row for a table.
   * @param {string} tableName
   * @returns {string[]}
   */
  function getHeaders_(tableName) {
    var cacheKey = 'headers_' + tableName;
    var cached = CacheManager.get(cacheKey);
    if (cached) return cached;

    var sheet = getSheet_(tableName);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    CacheManager.put(cacheKey, headers, 1800);
    return headers;
  }

  /**
   * Finds the 1-based row index for a record by its ID (column A).
   * @param {string} tableName
   * @param {string} id
   * @returns {number} Row number (1-based), or -1 if not found
   */
  function findRowById_(tableName, id) {
    var sheet = getSheet_(tableName);
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        return i + 1; // 1-based sheet row
      }
    }
    return -1;
  }

  /**
   * Applies filter conditions to an array of records.
   *
   * Filter formats:
   *   { field: value }                          — exact match
   *   { field: { op: '>=', value: x } }         — comparison
   *   { field: { op: 'contains', value: x } }   — string contains
   *   { field: { op: 'in', value: [a, b] } }    — value in array
   *   { field: { op: '!=', value: x } }         — not equal
   *
   * @param {Object[]} records
   * @param {Object} filters
   * @returns {Object[]}
   */
  function applyFilters_(records, filters) {
    if (!filters || Object.keys(filters).length === 0) return records;

    return records.filter(function(record) {
      return Object.keys(filters).every(function(key) {
        var condition = filters[key];
        var val = record[key];

        // Operator-based filter
        if (condition && typeof condition === 'object' && condition.op) {
          switch (condition.op) {
            case '>=':       return val >= condition.value;
            case '<=':       return val <= condition.value;
            case '>':        return val > condition.value;
            case '<':        return val < condition.value;
            case '!=':       return val !== condition.value;
            case 'contains': return String(val).toLowerCase().indexOf(String(condition.value).toLowerCase()) !== -1;
            case 'in':       return Array.isArray(condition.value) && condition.value.indexOf(val) !== -1;
            case 'not_in':   return Array.isArray(condition.value) && condition.value.indexOf(val) === -1;
            default:         return true;
          }
        }

        // Exact match (coerce to string for boolean/number comparisons from Sheets)
        if (typeof condition === 'boolean') {
          return val === condition || val === String(condition) || val === (condition ? 'TRUE' : 'FALSE');
        }
        return String(val) === String(condition);
      });
    });
  }

  /**
   * Sorts an array of records.
   * @param {Object[]} records
   * @param {Object} sort - { field: string, direction: 'asc' | 'desc' }
   * @returns {Object[]}
   */
  function applySort_(records, sort) {
    if (!sort || !sort.field) return records;
    var dir = (sort.direction === 'desc') ? -1 : 1;
    return records.slice().sort(function(a, b) {
      var valA = a[sort.field];
      var valB = b[sort.field];
      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });
  }

  // ───────────────────────────────────────────────
  // Public CRUD API
  // ───────────────────────────────────────────────

  /**
   * Retrieves all records from a table, optionally filtered.
   * @param {string} tableName
   * @param {Object} [filters]
   * @returns {Object[]}
   */
  function getRecords(tableName, filters) {
    var records = readAll_(tableName);
    if (filters && Object.keys(filters).length > 0) {
      records = applyFilters_(records, filters);
    }
    return records;
  }

  /**
   * Retrieves a single record by its ID.
   * @param {string} tableName
   * @param {string} id
   * @returns {Object|null}
   */
  function getRecordById(tableName, id) {
    var records = readAll_(tableName);
    for (var i = 0; i < records.length; i++) {
      if (String(records[i].id) === String(id)) return records[i];
    }
    return null;
  }

  /**
   * Creates a new record. Auto-generates id and timestamps.
   * @param {string} tableName
   * @param {Object} data - Field values (without id, created_at)
   * @returns {Object} The created record
   */
  function createRecord(tableName, data) {
    var headers = getHeaders_(tableName);
    var now = nowISO();

    var record = {};
    record.id = generateId();
    record.created_at = now;
    record.updated_at = now;

    // Merge provided data
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        record[key] = data[key];
      }
    }

    // Build row array in header order
    var rowValues = headers.map(function(h) {
      return record[h] !== undefined ? record[h] : '';
    });

    var sheet = getSheet_(tableName);
    sheet.appendRow(rowValues);

    // Invalidate cache so next read picks up the new row
    CacheManager.invalidateTable(tableName);

    return record;
  }

  /**
   * Updates an existing record by ID.
   * @param {string} tableName
   * @param {string} id
   * @param {Object} updates - Fields to update
   * @returns {Object} The updated record
   */
  function updateRecord(tableName, id, updates) {
    var sheet = getSheet_(tableName);
    var rowNum = findRowById_(tableName, id);
    if (rowNum === -1) throw new Error('Record not found: ' + tableName + '/' + id);

    var headers = getHeaders_(tableName);
    var rowData = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];

    // Apply updates
    updates.updated_at = nowISO();
    var record = {};
    for (var j = 0; j < headers.length; j++) {
      var h = headers[j];
      if (updates.hasOwnProperty(h)) {
        rowData[j] = updates[h];
      }
      record[h] = rowData[j];
    }

    sheet.getRange(rowNum, 1, 1, headers.length).setValues([rowData]);
    CacheManager.invalidateTable(tableName);

    return record;
  }

  /**
   * Soft-deletes a record by setting is_active = false or status = 'deleted'.
   * Pass { hard: true } to permanently remove the row.
   * @param {string} tableName
   * @param {string} id
   * @param {Object} [opts] - { hard: boolean }
   * @returns {boolean}
   */
  function deleteRecord(tableName, id, opts) {
    opts = opts || {};

    if (opts.hard) {
      var sheet = getSheet_(tableName);
      var rowNum = findRowById_(tableName, id);
      if (rowNum === -1) return false;
      sheet.deleteRow(rowNum);
      CacheManager.invalidateTable(tableName);
      return true;
    }

    // Soft delete: try is_active first, then status
    var headers = getHeaders_(tableName);
    var updates = { updated_at: nowISO() };
    if (headers.indexOf('is_active') !== -1) {
      updates.is_active = false;
    } else if (headers.indexOf('status') !== -1) {
      updates.status = 'deleted';
    }
    updateRecord(tableName, id, updates);
    return true;
  }

  /**
   * Advanced query with filters, sorting, and pagination.
   * @param {string} tableName
   * @param {Object} options
   * @param {Object} [options.filters] - Filter conditions
   * @param {Object} [options.sort] - { field, direction }
   * @param {number} [options.limit] - Max records to return
   * @param {number} [options.offset] - Records to skip
   * @param {string[]} [options.fields] - Project specific columns
   * @returns {{ data: Object[], total: number, hasMore: boolean }}
   */
  function query(tableName, options) {
    options = options || {};
    var records = readAll_(tableName);

    // Apply filters
    if (options.filters) {
      records = applyFilters_(records, options.filters);
    }

    var total = records.length;

    // Apply sort
    if (options.sort) {
      records = applySort_(records, options.sort);
    }

    // Apply pagination
    var offset = options.offset || 0;
    var limit = options.limit;
    if (offset > 0) {
      records = records.slice(offset);
    }
    if (limit) {
      records = records.slice(0, limit);
    }

    // Project fields
    if (options.fields && options.fields.length > 0) {
      records = records.map(function(r) {
        var projected = {};
        options.fields.forEach(function(f) { projected[f] = r[f]; });
        return projected;
      });
    }

    return {
      data: records,
      total: total,
      hasMore: (offset + records.length) < total
    };
  }

  // ───────────────────────────────────────────────
  // Batch operations
  // ───────────────────────────────────────────────

  /**
   * Creates multiple records in a single batch write.
   * @param {string} tableName
   * @param {Object[]} records - Array of data objects
   * @returns {Object[]} Created records with IDs
   */
  function batchCreate(tableName, records) {
    var headers = getHeaders_(tableName);
    var now = nowISO();
    var created = [];
    var rowsToAppend = [];

    records.forEach(function(data) {
      var record = { id: generateId(), created_at: now, updated_at: now };
      for (var key in data) {
        if (data.hasOwnProperty(key)) record[key] = data[key];
      }
      var rowValues = headers.map(function(h) {
        return record[h] !== undefined ? record[h] : '';
      });
      rowsToAppend.push(rowValues);
      created.push(record);
    });

    if (rowsToAppend.length > 0) {
      var sheet = getSheet_(tableName);
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
      CacheManager.invalidateTable(tableName);
    }

    return created;
  }

  /**
   * Updates multiple records in a batch.
   * @param {string} tableName
   * @param {Object[]} updates - Array of { id, ...changes }
   * @returns {number} Number of records updated
   */
  function batchUpdate(tableName, updates) {
    if (!updates || !updates.length) return 0;

    var sheet = getSheet_(tableName);
    var headers = getHeaders_(tableName);
    var allData = sheet.getDataRange().getValues();
    var now = nowISO();
    var count = 0;

    // Build a map of id -> update for O(1) lookup
    var updateMap = {};
    updates.forEach(function(u) { updateMap[u.id] = u; });

    // Walk through all rows and apply updates
    for (var i = 1; i < allData.length; i++) {
      var rowId = String(allData[i][0]);
      if (updateMap[rowId]) {
        var u = updateMap[rowId];
        u.updated_at = now;
        for (var j = 0; j < headers.length; j++) {
          if (u.hasOwnProperty(headers[j]) && headers[j] !== 'id') {
            allData[i][j] = u[headers[j]];
          }
        }
        count++;
      }
    }

    // Write all data back in one call
    if (count > 0) {
      sheet.getRange(1, 1, allData.length, allData[0].length).setValues(allData);
      CacheManager.invalidateTable(tableName);
    }

    return count;
  }

  // ───────────────────────────────────────────────
  // Relationship helpers
  // ───────────────────────────────────────────────

  /**
   * Gets all records from a table where a foreign key matches a value.
   * Syntactic sugar over getRecords with a filter.
   * @param {string} tableName
   * @param {string} foreignKey - Column name
   * @param {string} foreignId - Value to match
   * @returns {Object[]}
   */
  function getRelated(tableName, foreignKey, foreignId) {
    var filters = {};
    filters[foreignKey] = foreignId;
    return getRecords(tableName, filters);
  }

  /**
   * Enriches records by looking up related data from another table.
   * Adds a nested object to each record under the specified alias.
   *
   * Example:
   *   hydrate(observations, { field: 'teacher_id', targetTable: 'staff', as: 'teacher' })
   *   // Each observation gets a .teacher property with the full staff record
   *
   * @param {Object[]} records
   * @param {Object} config
   * @param {string} config.field - Foreign key field on the source records
   * @param {string} config.targetTable - Table to look up
   * @param {string} config.as - Property name for the hydrated data
   * @returns {Object[]}
   */
  function hydrate(records, config) {
    var targetRecords = readAll_(config.targetTable);
    var lookupMap = {};
    targetRecords.forEach(function(r) {
      lookupMap[String(r.id)] = r;
    });

    return records.map(function(record) {
      var enriched = {};
      for (var key in record) {
        if (record.hasOwnProperty(key)) enriched[key] = record[key];
      }
      enriched[config.as] = lookupMap[String(record[config.field])] || null;
      return enriched;
    });
  }

  // ───────────────────────────────────────────────
  // Schema utilities
  // ───────────────────────────────────────────────

  /**
   * Returns the headers for a table.
   * @param {string} tableName
   * @returns {string[]}
   */
  function getTableHeaders(tableName) {
    return getHeaders_(tableName);
  }

  /**
   * Ensures a sheet exists with the given headers.
   * Creates it if missing; does NOT overwrite existing.
   * @param {string} tableName
   * @param {string[]} headers
   * @returns {boolean} true if created, false if already existed
   */
  function ensureTable(tableName, headers) {
    var ss = getSpreadsheet_();
    var sheet = ss.getSheetByName(tableName);
    if (sheet) return false;

    sheet = ss.insertSheet(tableName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);

    // Bold header row
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

    return true;
  }

  // Public API
  return {
    getRecords: getRecords,
    getRecordById: getRecordById,
    createRecord: createRecord,
    updateRecord: updateRecord,
    deleteRecord: deleteRecord,
    query: query,
    batchCreate: batchCreate,
    batchUpdate: batchUpdate,
    getRelated: getRelated,
    hydrate: hydrate,
    getTableHeaders: getTableHeaders,
    ensureTable: ensureTable
  };

})();
