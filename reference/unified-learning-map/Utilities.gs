/**
 * Learning Map - Utilities
 *
 * Helper functions used across all services:
 * - JSON parsing/stringifying with error handling
 * - Date/time utilities
 * - ID generation
 * - Data validation
 * - Array/object manipulation
 * - Row/object conversion for spreadsheet operations
 *
 * @version 1.1.0
 */
// ============================================================================
// JSON UTILITIES
// ============================================================================
/**
 * Safe JSON parse with fallback
 *
 * @param {string} jsonString - JSON string to parse
 * @param {any} fallback - Fallback value if parse fails (default: null)
 * @returns {any} Parsed object or fallback
 */
function safeJsonParse_(jsonString, fallback) {
if (fallback === undefined) {
fallback = null;
  }
if (!jsonString || jsonString === '') {
return fallback;
  }
try {
return JSON.parse(jsonString);
  } catch (err) {
Logger.log('JSON parse error: ' + err.toString());
return fallback;
  }
}
/**
 * Safe JSON stringify
 *
 * @param {any} obj - Object to stringify
 * @param {string} fallback - Fallback string if stringify fails (default: '')
 * @returns {string} JSON string or fallback
 */
function safeJsonStringify_(obj, fallback) {
if (fallback === undefined) {
fallback = '';
  }
if (obj === null || obj === undefined) {
return fallback;
  }
try {
return JSON.stringify(obj);
  } catch (err) {
Logger.log('JSON stringify error: ' + err.toString());
return fallback;
  }
}
// ============================================================================
// ID GENERATION
// ============================================================================
/**
 * Generate unique ID
 * Format: prefix-timestamp-random
 *
 * @param {string} prefix - ID prefix (e.g. 'map', 'course', 'hex')
 * @returns {string} Unique ID
 */
function generateId_(prefix) {
const timestamp = Date.now();
const random = Math.floor(Math.random() * 10000);
return `${prefix}-${timestamp}-${random}`;
}
/**
 * Generate map ID
 *
 * @returns {string} Map ID (e.g. 'map-1705766400000-1234')
 */
function generateMapId_() {
return generateId_('map');
}
/**
 * Generate course ID
 *
 * @returns {string} Course ID
 */
function generateCourseId_() {
return generateId_('course');
}
/**
 * Generate unit ID
 *
 * @returns {string} Unit ID
 */
function generateUnitId_() {
return generateId_('unit');
}
/**
 * Generate lesson ID
 *
 * @returns {string} Lesson ID
 */
function generateLessonId_() {
return generateId_('lesson');
}
/**
 * Generate hex ID
 *
 * @returns {string} Hex ID
 */
function generateHexId_() {
return generateId_('hex');
}
/**
 * Generate edge ID
 *
 * @returns {string} Edge ID
 */
function generateEdgeId_() {
return generateId_('edge');
}
function generateCheckId_() {
return generateId_('fck');
}
function generateAssessmentId_() {
return generateId_('asmnt');
}
function generateResponseId_() {
return generateId_('resp');
}
function generateAssignmentId_() {
return generateId_('asgn');
}
function generateProfileId_() {
return generateId_('spr');
}
function generateATLProgressId_() {
return generateId_('atl');
}
function generateAchievementId_() {
return generateId_('ach');
}
function generateIterationId_() {
return generateId_('itr');
}
function generateFeedbackId_() {
return generateId_('pfb');
}
function generateVocabId_() {
return generateId_('vocab');
}
function generatePortfolioId_() {
return generateId_('pfl');
}
function generateNoteId_() {
return generateId_('note');
}
function generateTaskId_() {
return generateId_('stk');
}
function generateReminderId_() {
return generateId_('trm');
}
// Lab Report System IDs
function generateLabTemplateId_() {
return generateId_('ltpl');
}
function generateLabRubricId_() {
return generateId_('lrub');
}
function generateLabCriterionId_() {
return generateId_('lcrt');
}
function generateLabAssignmentId_() {
return generateId_('lasg');
}
function generateLabSubmissionId_() {
return generateId_('lsub');
}
function generateLabSectionDataId_() {
return generateId_('lsec');
}
function generateLabScoreId_() {
return generateId_('lscr');
}
function generateLabVersionId_() {
return generateId_('lver');
}
// CollabSpace IDs
function generateBoardId_() {
return generateId_('brd');
}
function generatePostId_() {
return generateId_('cpo');
}
function generateCommentId_() {
return generateId_('cmt');
}
function generateReactionId_() {
return generateId_('crx');
}
function generateMembershipId_() {
return generateId_('cmb');
}
function generateActivityId_() {
return generateId_('cav');
}
function generateGroupId_() {
return generateId_('grp');
}
function generateGroupMembershipId_() {
return generateId_('gmb');
}
function generateHexAssignmentId_() {
return generateId_('hxa');
}
function generateChoiceId_() {
return generateId_('chc');
}
function generateFeedbackTemplateId_() {
return generateId_('qft');
}
function generateTimerSessionId_() {
return generateId_('ctds');
}
function generateNsgStateId_() {
return generateId_('nss');
}
function generateNsgPickId_() {
return generateId_('nsp');
}
function generateNsgGroupSetId_() {
return generateId_('nsg');
}
// Quick Polls IDs
function generatePollId_() {
return generateId_('qpoll');
}
function generatePollResponseId_() {
return generateId_('qpresp');
}
// Whiteboard IDs
function generateWhiteboardId_() {
return generateId_('wbd');
}
// Process Journal IDs
function generateJournalId_() {
return generateId_('pj');
}
// ============================================================================
// DATE/TIME UTILITIES
// ============================================================================
/**
 * Get current timestamp in ISO format
 *
 * @returns {string} ISO timestamp (e.g. '2025-01-20T12:34:56.789Z')
 */
function now_() {
return new Date().toISOString();
}
/**
 * Format date for display
 *
 * @param {string|Date} dateInput - Date string or Date object
 * @param {string} format - Format ('short', 'long', 'iso') default: 'short'
 * @returns {string} Formatted date
 */
function formatDate_(dateInput, format) {
format = format || 'short';
let date;
if (typeof dateInput === 'string') {
date = new Date(dateInput);
  } else {
date = dateInput;
  }
if (isNaN(date.getTime())) {
return 'Invalid Date';
  }
switch (format) {
case 'short':
return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MM/dd/yyyy');
case 'long':
return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MMMM dd, yyyy h:mm a');
case 'iso':
return date.toISOString();
default:
return date.toString();
  }
}
/**
 * Days between two dates
 *
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Number of days
 */
function daysBetween_(date1, date2) {
const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
const diffMs = Math.abs(d2.getTime() - d1.getTime());
return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
// ============================================================================
// VALIDATION
// ============================================================================
/**
 * Validate email format
 *
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
function isValidEmail_(email) {
if (!email || typeof email !== 'string') {
return false;
  }
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
return emailRegex.test(email);
}
/**
 * Validate required fields in object
 *
 * @param {Object} obj - Object to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @throws {Error} If any required field is missing
 */
function validateRequired_(obj, requiredFields) {
const missing = [];
requiredFields.forEach(field => {
if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
missing.push(field);
    }
  });
if (missing.length > 0) {
throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}
/**
 * Validate grid position
 *
 * @param {number} row - Row number
 * @param {number} col - Column number
 * @returns {boolean} True if valid
 */
function isValidGridPosition_(row, col) {
const gridConfig = getGridConfig_();
return row >= 0 && row < gridConfig.rows &&
col >= 0 && col < gridConfig.cols;
}
// ============================================================================
// ARRAY/OBJECT UTILITIES
// ============================================================================
/**
 * Remove duplicates from array
 *
 * @param {Array} arr - Input array
 * @returns {Array} Array with duplicates removed
 */
function unique_(arr) {
return [...new Set(arr)];
}
/**
 * Group array of objects by field
 *
 * @param {Array<Object>} arr - Array of objects
 * @param {string} field - Field name to group by
 * @returns {Object} Object with groups {fieldValue: [items]}
 */
function groupBy_(arr, field) {
const groups = {};
arr.forEach(item => {
const key = item[field];
if (!groups[key]) {
groups[key] = [];
    }
groups[key].push(item);
  });
return groups;
}
/**
 * Sort array of objects by field
 *
 * @param {Array<Object>} arr - Array of objects
 * @param {string} field - Field name to sort by
 * @param {string} direction - 'asc' or 'desc' (default: 'asc')
 * @returns {Array<Object>} Sorted array
 */
function sortBy_(arr, field, direction) {
direction = direction || 'asc';
return arr.sort((a, b) => {
const aVal = a[field];
const bVal = b[field];
if (aVal < bVal) return direction === 'asc' ? -1 : 1;
if (aVal > bVal) return direction === 'asc' ? 1 : -1;
return 0;
  });
}
/**
 * Deep clone object
 *
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
function deepClone_(obj) {
return JSON.parse(JSON.stringify(obj));
}
/**
 * Merge two objects (shallow)
 *
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object (overwrites obj1)
 * @returns {Object} Merged object
 */
function merge_(obj1, obj2) {
return {...obj1, ...obj2};
}
// ============================================================================
// ROW/OBJECT CONVERSION
// ============================================================================
/**
 * Convert spreadsheet row array to object using headers as keys
 *
 * Used by services to convert raw spreadsheet data to structured objects.
 * This is the primary function called by StandardsService, UnitPlannerService, etc.
 *
 * @param {Array} row - Array of cell values [val1, val2, val3, ...]
 * @param {Array<string>} headers - Array of column names ['col1', 'col2', 'col3', ...]
 * @returns {Object} Object with header names as keys { col1: val1, col2: val2, ... }
 *
 * @example
 * const headers = ['id', 'name', 'email'];
 * const row = ['user-123', 'John Doe', 'john@school.edu'];
 * const obj = rowToObject(row, headers);
 * // Returns: { id: 'user-123', name: 'John Doe', email: 'john@school.edu' }
 */
function rowToObject(row, headers) {
// Handle null/undefined inputs
if (!row || !headers) {
return {};
  }
// Handle non-array inputs
if (!Array.isArray(row) || !Array.isArray(headers)) {
return {};
  }
var obj = {};
// Iterate through headers (headers length is authoritative for output keys)
for (var i = 0; i < headers.length; i++) {
var key = headers[i];
// Skip empty/null header names
if (!key || key === '') {
continue;
    }
// Get value from row, defaulting to empty string for:
// - index out of bounds
// - null values
// - undefined values
var value = '';
if (i < row.length && row[i] !== null && row[i] !== undefined) {
value = row[i];
    }
obj[key] = value;
  }
return obj;
}
/**
 * Convert object to spreadsheet row array using headers for column ordering
 *
 * Reverse of rowToObject(). Used when writing data back to spreadsheets.
 * Ensures values are in the correct column order based on headers.
 *
 * @param {Object} obj - Object with data { col1: val1, col2: val2, ... }
 * @param {Array<string>} headers - Array of column names ['col1', 'col2', 'col3', ...]
 * @returns {Array} Array of values in header order [val1, val2, val3, ...]
 *
 * @example
 * const headers = ['id', 'name', 'email'];
 * const obj = { name: 'Jane', id: 'user-456', email: 'jane@school.edu' };
 * const row = objectToRow(obj, headers);
 * // Returns: ['user-456', 'Jane', 'jane@school.edu']
 */
function objectToRow(obj, headers) {
// Handle null/undefined headers
if (!headers || !Array.isArray(headers)) {
return [];
  }
// Handle null/undefined/non-object input
// Return array of empty strings matching header length
if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
return headers.map(function() { return ''; });
  }
var row = [];
// Iterate through headers to maintain correct column order
for (var i = 0; i < headers.length; i++) {
var key = headers[i];
// Default to empty string for:
// - empty/null header names
// - missing keys in object
// - null/undefined values in object
var value = '';
if (key && obj.hasOwnProperty(key) && obj[key] !== null && obj[key] !== undefined) {
value = obj[key];
    }
row.push(value);
  }
return row;
}
/**
 * Internal version with underscore suffix (follows Utilities.gs convention)
 * Wraps rowToObject for consistency with other utility naming
 *
 * @param {Array} row - Array of cell values
 * @param {Array<string>} headers - Array of column names
 * @returns {Object} Object with header names as keys
 */
function rowToObject_(row, headers) {
return rowToObject(row, headers);
}
/**
 * Internal version with underscore suffix (follows Utilities.gs convention)
 * Wraps objectToRow for consistency with other utility naming
 *
 * @param {Object} obj - Object with data
 * @param {Array<string>} headers - Array of column names
 * @returns {Array} Array of values in header order
 */
function objectToRow_(obj, headers) {
return objectToRow(obj, headers);
}
// ============================================================================
// STRING UTILITIES
// ============================================================================
/**
 * Truncate string to max length
 *
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to append if truncated (default: '...')
 * @returns {string} Truncated string
 */
function truncate_(str, maxLength, suffix) {
suffix = suffix || '...';
if (!str || str.length <= maxLength) {
return str;
  }
return str.substring(0, maxLength - suffix.length) + suffix;
}
/**
 * Slugify string (make URL-safe)
 *
 * @param {string} str - String to slugify
 * @returns {string} Slugified string
 */
function slugify_(str) {
return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
/**
 * Capitalize first letter
 *
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize_(str) {
if (!str) return '';
return str.charAt(0).toUpperCase() + str.slice(1);
}
// ============================================================================
// GRID UTILITIES
// ============================================================================
/**
 * Snap coordinates to grid
 * Ensures hex positions align to 12x12 grid
 *
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 * @returns {Object} {row, col} snapped to grid
 */
function snapToGrid_(row, col) {
const gridConfig = getGridConfig_();
// Clamp to grid bounds
const snappedRow = Math.max(0, Math.min(gridConfig.rows - 1, Math.round(row)));
const snappedCol = Math.max(0, Math.min(gridConfig.cols - 1, Math.round(col)));
return {
row: snappedRow,
col: snappedCol
  };
}
/**
 * Calculate pixel position from grid coordinates
 *
 * @param {number} row - Grid row
 * @param {number} col - Grid column
 * @returns {Object} {x, y} pixel position
 */
function gridToPixels_(row, col) {
const config = getGridConfig_();
// Offset every other row (hexagon stagger)
const xOffset = (row % 2 === 0) ? 0 : config.colSpacing / 2;
return {
x: col * config.colSpacing + xOffset,
y: row * config.rowSpacing
  };
}
/**
 * Calculate grid coordinates from pixel position
 *
 * @param {number} x - Pixel x
 * @param {number} y - Pixel y
 * @returns {Object} {row, col} grid position
 */
function pixelsToGrid_(x, y) {
const config = getGridConfig_();
const row = Math.round(y / config.rowSpacing);
const xOffset = (row % 2 === 0) ? 0 : config.colSpacing / 2;
const col = Math.round((x - xOffset) / config.colSpacing);
return snapToGrid_(row, col);
}
// ============================================================================
// RANGE UTILITIES
// ============================================================================
/**
 * Check if value is in range
 *
 * @param {number} value - Value to check
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {boolean} True if in range
 */
function inRange_(value, min, max) {
return value >= min && value <= max;
}
/**
 * Clamp value to range
 *
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp_(value, min, max) {
return Math.max(min, Math.min(max, value));
}
// ============================================================================
// ERROR HANDLING
// ============================================================================
/**
 * Create error response object
 *
 * @param {string} message - Error message
 * @param {string} code - Error code (optional)
 * @returns {Object} {success: false, error: message, code: code}
 */
function errorResponse_(message, code) {
return {
success: false,
error: message,
code: code || 'UNKNOWN_ERROR'
  };
}
/**
 * Create success response object
 *
 * @param {any} data - Data to return
 * @param {string} message - Success message (optional)
 * @returns {Object} {success: true, data: data, message: message}
 */
function successResponse_(data, message) {
const response = {
success: true,
data: data
  };
if (message) {
response.message = message;
  }
return response;
}
// ============================================================================
// TEST FUNCTIONS
// ============================================================================
/**
 * Test JSON utilities
 */
function test_json() {
const obj = {name: 'Test', value: 123};
const json = safeJsonStringify_(obj);
Logger.log('Stringified:', json);
const parsed = safeJsonParse_(json);
Logger.log('Parsed:', parsed);
const invalid = safeJsonParse_('invalid{json', {default: true});
Logger.log('Invalid (should be fallback):', invalid);
}
/**
 * Test ID generation
 */
function test_idGeneration() {
Logger.log('Map ID:', generateMapId_());
Logger.log('Course ID:', generateCourseId_());
Logger.log('Unit ID:', generateUnitId_());
Logger.log('Hex ID:', generateHexId_());
Logger.log('Edge ID:', generateEdgeId_());
}
/**
 * Test grid utilities
 */
function test_grid() {
Logger.log('Snap (5.7, 3.2):', snapToGrid_(5.7, 3.2));
Logger.log('Grid to pixels (2, 3):', gridToPixels_(2, 3));
Logger.log('Pixels to grid (264, 150):', pixelsToGrid_(264, 150));
}
/**
 * Test validation
 */
function test_validation() {
Logger.log('Valid email:', isValidEmail_('test@school.edu'));
Logger.log('Invalid email:', isValidEmail_('not-an-email'));
try {
validateRequired_({name: 'Test'}, ['name', 'email']);
  } catch (err) {
Logger.log('Validation error (expected):', err.message);
  }
}
/**
 * Test rowToObject function
 * Run this in Apps Script to verify functionality
 */
function test_rowToObject() {
Logger.log('=== Testing rowToObject ===');
var headers = ['id', 'name', 'email', 'role'];
// Test 1: Normal case
var row1 = ['user-123', 'John Doe', 'john@school.edu', 'teacher'];
var result1 = rowToObject(row1, headers);
Logger.log('Test 1 - Normal: ' + JSON.stringify(result1));
// Expected: {id: 'user-123', name: 'John Doe', email: 'john@school.edu', role: 'teacher'}
// Test 2: Row shorter than headers (missing values become empty strings)
var row2 = ['user-456', 'Jane'];
var result2 = rowToObject(row2, headers);
Logger.log('Test 2 - Short row: ' + JSON.stringify(result2));
// Expected: {id: 'user-456', name: 'Jane', email: '', role: ''}
// Test 3: Row with null/undefined values
var row3 = ['user-789', null, undefined, 'student'];
var result3 = rowToObject(row3, headers);
Logger.log('Test 3 - Null values: ' + JSON.stringify(result3));
// Expected: {id: 'user-789', name: '', email: '', role: 'student'}
// Test 4: Null inputs
Logger.log('Test 4a - Null row: ' + JSON.stringify(rowToObject(null, headers)));
Logger.log('Test 4b - Null headers: ' + JSON.stringify(rowToObject(row1, null)));
Logger.log('Test 4c - Both null: ' + JSON.stringify(rowToObject(null, null)));
// Expected: all return {}
// Test 5: Empty arrays
Logger.log('Test 5a - Empty row: ' + JSON.stringify(rowToObject([], headers)));
Logger.log('Test 5b - Empty headers: ' + JSON.stringify(rowToObject(row1, [])));
// Expected: {id: '', name: '', email: '', role: ''} and {}
// Test 6: Row longer than headers (extra values ignored)
var row6 = ['user-111', 'Extra', 'Person', 'admin', 'extra1', 'extra2'];
var result6 = rowToObject(row6, headers);
Logger.log('Test 6 - Long row: ' + JSON.stringify(result6));
// Expected: {id: 'user-111', name: 'Extra', email: 'Person', role: 'admin'}
// Test 7: Headers with empty string (should skip)
var headersWithEmpty = ['id', '', 'email', 'role'];
var row7 = ['user-222', 'skipped', 'test@test.com', 'student'];
var result7 = rowToObject(row7, headersWithEmpty);
Logger.log('Test 7 - Empty header: ' + JSON.stringify(result7));
// Expected: {id: 'user-222', email: 'test@test.com', role: 'student'}
// Test 8: Non-array inputs
Logger.log('Test 8a - String row: ' + JSON.stringify(rowToObject('not-array', headers)));
Logger.log('Test 8b - Object headers: ' + JSON.stringify(rowToObject(row1, {a: 1})));
// Expected: both return {}
Logger.log('=== rowToObject tests complete ===');
}
/**
 * Test objectToRow function
 * Run this in Apps Script to verify functionality
 */
function test_objectToRow() {
Logger.log('=== Testing objectToRow ===');
var headers = ['id', 'name', 'email', 'role'];
// Test 1: Normal case
var obj1 = {id: 'user-123', name: 'John Doe', email: 'john@school.edu', role: 'teacher'};
var result1 = objectToRow(obj1, headers);
Logger.log('Test 1 - Normal: ' + JSON.stringify(result1));
// Expected: ['user-123', 'John Doe', 'john@school.edu', 'teacher']
// Test 2: Object missing some keys
var obj2 = {id: 'user-456', name: 'Jane'};
var result2 = objectToRow(obj2, headers);
Logger.log('Test 2 - Missing keys: ' + JSON.stringify(result2));
// Expected: ['user-456', 'Jane', '', '']
// Test 3: Object with null/undefined values
var obj3 = {id: 'user-789', name: null, email: undefined, role: 'student'};
var result3 = objectToRow(obj3, headers);
Logger.log('Test 3 - Null values: ' + JSON.stringify(result3));
// Expected: ['user-789', '', '', 'student']
// Test 4: Null/undefined inputs
Logger.log('Test 4a - Null obj: ' + JSON.stringify(objectToRow(null, headers)));
Logger.log('Test 4b - Undefined obj: ' + JSON.stringify(objectToRow(undefined, headers)));
Logger.log('Test 4c - Null headers: ' + JSON.stringify(objectToRow(obj1, null)));
// Expected: ['', '', '', ''], ['', '', '', ''], []
// Test 5: Object with extra keys (ignored)
var obj5 = {id: 'user-111', name: 'Extra', email: 'e@e.com', role: 'admin', extra: 'ignored', another: 123};
var result5 = objectToRow(obj5, headers);
Logger.log('Test 5 - Extra keys: ' + JSON.stringify(result5));
// Expected: ['user-111', 'Extra', 'e@e.com', 'admin']
// Test 6: Keys in different order than headers
var obj6 = {role: 'student', email: 'order@test.com', name: 'Order Test', id: 'user-333'};
var result6 = objectToRow(obj6, headers);
Logger.log('Test 6 - Different order: ' + JSON.stringify(result6));
// Expected: ['user-333', 'Order Test', 'order@test.com', 'student']
// Test 7: Empty headers array
Logger.log('Test 7 - Empty headers: ' + JSON.stringify(objectToRow(obj1, [])));
// Expected: []
// Test 8: Array passed as object (should return empty strings)
Logger.log('Test 8 - Array as obj: ' + JSON.stringify(objectToRow(['a', 'b'], headers)));
// Expected: ['', '', '', '']
Logger.log('=== objectToRow tests complete ===');
}
/**
 * Test round-trip conversion (rowToObject -> objectToRow)
 * Verifies data integrity through conversion cycle
 */
function test_roundTrip() {
Logger.log('=== Testing Round-Trip Conversion ===');
var headers = ['id', 'name', 'email', 'role', 'status'];
// Test 1: Full data round-trip
var originalRow = ['user-999', 'Round Trip', 'trip@test.com', 'student', 'active'];
var obj = rowToObject(originalRow, headers);
var reconstructedRow = objectToRow(obj, headers);
Logger.log('Original row: ' + JSON.stringify(originalRow));
Logger.log('As object: ' + JSON.stringify(obj));
Logger.log('Reconstructed row: ' + JSON.stringify(reconstructedRow));
Logger.log('Match: ' + (JSON.stringify(originalRow) === JSON.stringify(reconstructedRow)));
// Test 2: Partial data round-trip
var partialRow = ['user-888', 'Partial'];
var partialObj = rowToObject(partialRow, headers);
var partialReconstructed = objectToRow(partialObj, headers);
Logger.log('Partial original: ' + JSON.stringify(partialRow));
Logger.log('Partial as object: ' + JSON.stringify(partialObj));
Logger.log('Partial reconstructed: ' + JSON.stringify(partialReconstructed));
// Note: reconstructed will have empty strings for missing values
// Test 3: Object modification then back to row
var modifyRow = ['user-777', 'Original Name', 'original@test.com', 'teacher', 'inactive'];
var modifyObj = rowToObject(modifyRow, headers);
modifyObj.name = 'Modified Name';
modifyObj.status = 'active';
var modifiedRow = objectToRow(modifyObj, headers);
Logger.log('Before modification: ' + JSON.stringify(modifyRow));
Logger.log('After modification: ' + JSON.stringify(modifiedRow));
Logger.log('=== Round-Trip tests complete ===');
}