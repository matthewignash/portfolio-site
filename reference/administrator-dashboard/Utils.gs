/**
 * Utils.gs — Shared server-side utilities
 */

/**
 * Generates a UUID v4 identifier.
 * @returns {string} UUID string
 */
function generateId() {
  return Utilities.getUuid();
}

/**
 * Returns the current timestamp as an ISO 8601 string.
 * @returns {string}
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * Formats a Date or ISO string to a locale-friendly display string.
 * @param {Date|string} date
 * @param {Object} [opts] - Intl.DateTimeFormat options
 * @returns {string}
 */
function formatDateDisplay(date, opts) {
  if (!date) return '';
  var d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  var defaults = { year: 'numeric', month: 'short', day: 'numeric' };
  return d.toLocaleDateString('en-US', opts || defaults);
}

/**
 * Calculates the number of whole days between two dates.
 * @param {Date|string} dateA
 * @param {Date|string} dateB
 * @returns {number}
 */
function daysBetween(dateA, dateB) {
  var a = typeof dateA === 'string' ? new Date(dateA) : dateA;
  var b = typeof dateB === 'string' ? new Date(dateB) : dateB;
  var ms = Math.abs(b.getTime() - a.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Returns the Monday of the week containing the given date.
 * @param {Date} date
 * @returns {Date}
 */
function weekStart(date) {
  var d = new Date(date);
  var day = d.getDay();
  var diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Sanitizes a string for safe output — strips HTML tags.
 * @param {string} str
 * @returns {string}
 */
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Deep-sanitizes all string values in an object.
 * @param {Object} obj
 * @returns {Object}
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  var clean = {};
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    clean[keys[i]] = typeof obj[keys[i]] === 'string' ? sanitizeInput(obj[keys[i]]) : obj[keys[i]];
  }
  return clean;
}

/**
 * Validates that required fields are present and non-empty.
 * @param {Object} data
 * @param {string[]} requiredFields
 * @throws {Error} if any required field is missing
 */
function validateRequired(data, requiredFields) {
  var missing = requiredFields.filter(function(f) { return data[f] === undefined || data[f] === null || data[f] === ''; });
  if (missing.length) {
    throw new Error('Missing required fields: ' + missing.join(', '));
  }
}

/**
 * Parses a comma-separated string into a trimmed array. Returns empty array for falsy input.
 * @param {string} str
 * @returns {string[]}
 */
function parseCSV(str) {
  if (!str) return [];
  if (typeof str !== 'string') str = String(str);
  return str.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
}

/**
 * Joins an array into a comma-separated string.
 * @param {string[]} arr
 * @returns {string}
 */
function toCSV(arr) {
  if (!Array.isArray(arr)) return '';
  return arr.filter(Boolean).join(', ');
}

/**
 * Calculates a simple average of an array of numbers.
 * @param {number[]} nums
 * @returns {number}
 */
function average(nums) {
  if (!nums || !nums.length) return 0;
  return nums.reduce(function(sum, n) { return sum + n; }, 0) / nums.length;
}

/**
 * Rounds a number to the specified decimal places.
 * @param {number} num
 * @param {number} [decimals=1]
 * @returns {number}
 */
function roundTo(num, decimals) {
  if (decimals === undefined) decimals = 1;
  var factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * Returns the current academic year string (e.g., "2025-26") based on a July 1 cutover.
 * @returns {string}
 */
function currentAcademicYear() {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth(); // 0-indexed
  if (month < 6) { // Before July
    return (year - 1) + '-' + String(year).slice(2);
  }
  return year + '-' + String(year + 1).slice(2);
}

/**
 * Returns the three-letter day-of-week code for a Date.
 * @param {Date} date
 * @returns {string} MON, TUE, WED, THU, FRI, SAT, SUN
 */
function dayOfWeekCode(date) {
  var codes = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return codes[date.getDay()];
}
