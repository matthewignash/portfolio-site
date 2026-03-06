/**
 * Utils.gs
 * Shared utility functions for the Science Department Dashboard
 */

/**
 * Generate a unique ID with optional prefix
 * @param {string} prefix - Optional prefix (e.g., 'post_', 'card_')
 * @returns {string}
 */
function generateId(prefix) {
  prefix = prefix || '';
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Format a Date object to YYYY-MM-DD string
 * @param {Date} date
 * @returns {string}
 */
function formatDateString(date) {
  if (!date) return '';
  if (typeof date === 'string') return date;

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return year + '-' + month + '-' + day;
}

/**
 * Parse a YYYY-MM-DD string to Date object
 * @param {string} dateStr
 * @returns {Date}
 */
function parseDateString(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;

  const parts = dateStr.split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

/**
 * Add days to a date
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get the Monday of the week containing the given date
 * @param {Date} date
 * @returns {Date}
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Check if two dates are the same day
 * @param {Date|string} date1
 * @param {Date|string} date2
 * @returns {boolean}
 */
function isSameDay(date1, date2) {
  const d1 = typeof date1 === 'string' ? date1 : formatDateString(date1);
  const d2 = typeof date2 === 'string' ? date2 : formatDateString(date2);
  return d1 === d2;
}

/**
 * Log error to console
 * @param {string} context - Where the error occurred
 * @param {Error} error - The error object
 */
function logError(context, error) {
  console.error(context + ':', error.message || error);
  if (error.stack) console.error(error.stack);
}
