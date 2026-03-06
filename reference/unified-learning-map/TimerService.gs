/**
 * Learning Map - Timer Service
 *
 * Backend persistence for countdown timer sessions.
 * Enables timer state to survive page reloads and be broadcast to students.
 * Teacher presets migrate from localStorage to server-side Config storage.
 *
 * Sheet: TimerSessions (one active session per teacher, upsert pattern)
 * Config keys: timerPresets_{email} (JSON array of preset objects)
 *
 * @version 1.0.0
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_TIMER_STATES_ = ['running', 'paused', 'finished', 'idle'];
const MAX_TIMER_MS_ = 10800000; // 3 hours
const TIMER_PRESETS_PREFIX_ = 'timerPresets_';
const MAX_TIMER_PRESETS_ = 10;

// ============================================================================
// TIMER SESSION MANAGEMENT
// ============================================================================

/**
 * Save or update the teacher's active timer session.
 * Upsert pattern: one active session per teacher.
 * Called fire-and-forget from frontend on start/pause/resume/finish.
 *
 * @param {Object} sessionData - Timer session data
 * @param {string} sessionData.classId - Class ID for student broadcasting
 * @param {string} [sessionData.mapId] - Optional map ID context
 * @param {number} sessionData.totalMs - Total timer duration in milliseconds
 * @param {number} sessionData.remainingMs - Remaining time in milliseconds
 * @param {string} sessionData.state - Timer state: running|paused|finished|idle
 * @param {string} [sessionData.stationConfigJson] - JSON station rotation config
 * @param {string} [sessionData.label] - Timer label text (max 50 chars)
 * @param {string} [sessionData.messagesJson] - JSON countdown messages config
 * @param {string} [sessionData.pomodoroConfigJson] - JSON pomodoro config
 * @returns {Object} { sessionId }
 */
function saveTimerSession(sessionData) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  // Validate required fields
  if (!sessionData || typeof sessionData !== 'object') {
    throw new Error('Invalid session data');
  }

  const state = String(sessionData.state || '');
  if (VALID_TIMER_STATES_.indexOf(state) === -1) {
    throw new Error('Invalid timer state: ' + state);
  }

  const totalMs = parseInt(sessionData.totalMs, 10) || 0;
  if (totalMs <= 0 || totalMs > MAX_TIMER_MS_) {
    throw new Error('Invalid totalMs: must be 1-' + MAX_TIMER_MS_);
  }

  const remainingMs = Math.max(0, Math.min(totalMs, parseInt(sessionData.remainingMs, 10) || 0));
  const classId = String(sessionData.classId || '');
  const mapId = String(sessionData.mapId || '');
  const label = String(sessionData.label || '').substring(0, 50).trim();
  const stationConfigJson = String(sessionData.stationConfigJson || '');
  const messagesJson = String(sessionData.messagesJson || '');
  const pomodoroConfigJson = String(sessionData.pomodoroConfigJson || '');
  const now = new Date().toISOString();

  // Check for existing session
  const existing = findRowsFiltered_(SHEETS_.TIMER_SESSIONS, { teacherEmail: email });

  if (existing.length > 0) {
    // Update existing session
    const sessionId = existing[0].sessionId;
    updateRow_(SHEETS_.TIMER_SESSIONS, 'sessionId', sessionId, {
      classId: classId,
      mapId: mapId,
      totalMs: totalMs,
      remainingMs: remainingMs,
      state: state,
      stationConfigJson: stationConfigJson,
      label: label,
      messagesJson: messagesJson,
      pomodoroConfigJson: pomodoroConfigJson,
      updatedAt: now
    });
    return { sessionId: sessionId };
  } else {
    // Create new session
    const sessionId = generateTimerSessionId_();
    appendRow_(SHEETS_.TIMER_SESSIONS, {
      sessionId: sessionId,
      teacherEmail: email,
      classId: classId,
      mapId: mapId,
      totalMs: totalMs,
      remainingMs: remainingMs,
      state: state,
      stationConfigJson: stationConfigJson,
      label: label,
      messagesJson: messagesJson,
      pomodoroConfigJson: pomodoroConfigJson,
      startedAt: now,
      updatedAt: now
    });
    return { sessionId: sessionId };
  }
}

/**
 * Get the active timer session for the current context.
 * - Teachers: returns their own active session (for recovery on reload)
 * - Students: returns the active session for their class's teacher
 *
 * @param {string} [classId] - Required for students; optional for teachers
 * @returns {Object|null} Session data or null if no active session
 */
function getActiveTimerSession(classId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (user.canEdit) {
    // Teacher/admin: return own session
    const sessions = findRowsFiltered_(SHEETS_.TIMER_SESSIONS, { teacherEmail: email });
    if (sessions.length === 0) return null;
    const session = sessions[0];
    if (session.state === 'idle' || !session.state) return null;
    return {
      sessionId: session.sessionId,
      classId: String(session.classId || ''),
      mapId: String(session.mapId || ''),
      totalMs: parseInt(session.totalMs, 10) || 0,
      remainingMs: parseInt(session.remainingMs, 10) || 0,
      state: String(session.state),
      stationConfigJson: String(session.stationConfigJson || ''),
      label: String(session.label || ''),
      messagesJson: String(session.messagesJson || ''),
      pomodoroConfigJson: String(session.pomodoroConfigJson || ''),
      updatedAt: String(session.updatedAt || '')
    };
  } else {
    // Student: find teacher's session for this class
    if (!classId) return null;

    // Look up the class to find the teacher
    const classes = findRowsFiltered_(SHEETS_.CLASSES, { classId: String(classId) });
    if (classes.length === 0) return null;

    const teacherEmail = String(classes[0].teacherEmail || '').toLowerCase();
    if (!teacherEmail) return null;

    // Validate student is in this class
    const roster = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { classId: String(classId) });
    let isInClass = false;
    for (let i = 0; i < roster.length; i++) {
      const studentEmail = String(roster[i].studentEmail || roster[i].email || '').toLowerCase();
      if (studentEmail === email) {
        isInClass = true;
        break;
      }
    }
    if (!isInClass) return null;

    // Find teacher's active session
    const sessions = findRowsFiltered_(SHEETS_.TIMER_SESSIONS, { teacherEmail: teacherEmail });
    if (sessions.length === 0) return null;
    const session = sessions[0];
    if (session.state === 'idle' || !session.state) return null;

    // Return safe subset (no teacherEmail, no sessionId)
    return {
      totalMs: parseInt(session.totalMs, 10) || 0,
      remainingMs: parseInt(session.remainingMs, 10) || 0,
      state: String(session.state),
      stationConfigJson: String(session.stationConfigJson || ''),
      label: String(session.label || ''),
      messagesJson: String(session.messagesJson || ''),
      pomodoroConfigJson: String(session.pomodoroConfigJson || ''),
      updatedAt: String(session.updatedAt || '')
    };
  }
}

/**
 * Clear/delete the teacher's active timer session.
 * Called on ctdReset.
 *
 * @returns {boolean} True if session was deleted
 */
function clearTimerSession() {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  const sessions = findRowsFiltered_(SHEETS_.TIMER_SESSIONS, { teacherEmail: email });
  if (sessions.length === 0) return false;

  // Delete the row using updateRow to set state to idle (lightweight)
  updateRow_(SHEETS_.TIMER_SESSIONS, 'sessionId', sessions[0].sessionId, {
    state: 'idle',
    remainingMs: 0,
    updatedAt: new Date().toISOString()
  });
  return true;
}

// ============================================================================
// TEACHER TIMER PRESETS
// ============================================================================

/**
 * Get teacher's saved timer presets from Config.
 * Falls back to empty array if none saved.
 *
 * @returns {Array<{ms: number, label: string}>}
 */
function getTeacherTimerPresets() {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  const key = TIMER_PRESETS_PREFIX_ + email;
  const raw = getConfigValue_(key);
  if (!raw) return [];
  try {
    const presets = JSON.parse(raw);
    if (!Array.isArray(presets)) return [];
    return presets;
  } catch (e) {
    return [];
  }
}

/**
 * Save teacher's timer presets to Config.
 * Max 10 presets, each with ms (>0, <=10800000) and label (max 20 chars).
 *
 * @param {Array<{ms: number, label: string}>} presets
 * @returns {boolean}
 */
function saveTeacherTimerPresets(presets) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!Array.isArray(presets)) {
    throw new Error('Presets must be an array');
  }
  if (presets.length > MAX_TIMER_PRESETS_) {
    throw new Error('Maximum ' + MAX_TIMER_PRESETS_ + ' presets allowed');
  }

  // Validate each preset
  const validated = [];
  for (let i = 0; i < presets.length; i++) {
    const p = presets[i];
    const ms = parseInt(p.ms, 10) || 0;
    if (ms <= 0 || ms > MAX_TIMER_MS_) continue; // skip invalid
    const label = String(p.label || '').substring(0, 20).trim();
    if (!label) continue; // skip empty labels
    validated.push({ ms: ms, label: label });
  }

  const key = TIMER_PRESETS_PREFIX_ + email;
  const obj = {};
  obj[key] = JSON.stringify(validated);
  setConfigValues_(obj);
  return true;
}
