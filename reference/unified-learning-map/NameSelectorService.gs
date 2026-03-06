/**
 * Learning Map - Name Selector Service
 *
 * Backend persistence for the Name Selector / Grouping tool.
 * Enables absent marks, selection history, and saved group configurations
 * to survive page reloads.
 *
 * Sheets: NameSelectorState (absent marks, upsert per teacher+class)
 *         NameSelectorPicks (selection history, append-only log)
 *         NameSelectorGroups (saved group sets, CRUD)
 *
 * @version 1.0.0
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_NSG_PICKS_PER_CLASS_ = 50;
const MAX_NSG_GROUP_SETS_ = 20;
const MAX_NSG_GROUP_SET_NAME_ = 50;
const MAX_NSG_ABSENT_EMAILS_ = 200;
const MAX_NSG_STUDENT_NAME_ = 100;

// ============================================================================
// BATCH ENDPOINT
// ============================================================================

/**
 * Load all Name Selector persisted data for a class in one RPC.
 * Returns absent marks, pick history, and saved group summaries.
 *
 * @param {string} classId - Class ID
 * @returns {Object} { absentEmails:[], pickHistory:[], savedGroups:[] }
 */
function getNameSelectorData(classId) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!classId) throw new Error('classId is required');
  const cid = String(classId);

  // Verify class ownership (admin bypasses)
  if (!user.isAdmin) {
    const classes = findRowsFiltered_(SHEETS_.CLASSES, { classId: cid });
    if (classes.length === 0) throw new Error('Class not found');
    if (String(classes[0].teacherEmail || '').toLowerCase() !== email) {
      throw new Error('Access denied');
    }
  }

  // 1. Absent marks
  let absentEmails = [];
  const stateRows = findRowsFiltered_(SHEETS_.NAME_SELECTOR_STATE, { teacherEmail: email, classId: cid });
  if (stateRows.length > 0 && stateRows[0].absentEmailsJson) {
    try {
      const parsed = JSON.parse(stateRows[0].absentEmailsJson);
      if (Array.isArray(parsed)) absentEmails = parsed;
    } catch (e) { /* ignore parse error */ }
  }

  // 2. Pick history (last 50, sorted newest first)
  const pickRows = findRowsFiltered_(SHEETS_.NAME_SELECTOR_PICKS, { teacherEmail: email, classId: cid });
  pickRows.sort((a, b) => {
    const da = new Date(a.pickedAt || 0).getTime();
    const db = new Date(b.pickedAt || 0).getTime();
    return db - da;
  });
  const pickHistory = pickRows.slice(0, MAX_NSG_PICKS_PER_CLASS_).map(r => ({
    studentEmail: String(r.studentEmail || ''),
    studentName: String(r.studentName || ''),
    pickedAt: String(r.pickedAt || '')
  }));

  // 3. Saved group summaries (no full groupsJson — keep response small)
  const groupRows = findRowsFiltered_(SHEETS_.NAME_SELECTOR_GROUPS, { teacherEmail: email, classId: cid });
  groupRows.sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime();
    const db = new Date(b.createdAt || 0).getTime();
    return db - da;
  });
  const savedGroups = groupRows.map(r => {
    let groupCount = 0;
    let studentCount = 0;
    try {
      const groups = JSON.parse(r.groupsJson || '[]');
      groupCount = groups.length;
      for (let i = 0; i < groups.length; i++) {
        studentCount += (groups[i].members || []).length;
      }
    } catch (e) { /* ignore */ }
    return {
      groupSetId: String(r.groupSetId || ''),
      groupSetName: String(r.groupSetName || ''),
      groupMode: String(r.groupMode || 'count'),
      groupNumber: parseInt(r.groupNumber, 10) || 4,
      groupCount: groupCount,
      studentCount: studentCount,
      createdAt: String(r.createdAt || '')
    };
  });

  return { absentEmails, pickHistory, savedGroups };
}

// ============================================================================
// ABSENT MARKS
// ============================================================================

/**
 * Save the full absent marks list for a class (upsert pattern).
 * Called fire-and-forget from frontend on each toggle.
 *
 * @param {string} classId
 * @param {Array<string>} absentEmails - Array of absent student emails
 * @returns {Object} { success: true }
 */
function saveAbsentMarks(classId, absentEmails) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!classId) throw new Error('classId is required');
  const cid = String(classId);

  // Verify class ownership (admin bypasses)
  if (!user.isAdmin) {
    const classes = findRowsFiltered_(SHEETS_.CLASSES, { classId: cid });
    if (classes.length === 0) throw new Error('Class not found');
    if (String(classes[0].teacherEmail || '').toLowerCase() !== email) {
      throw new Error('Access denied');
    }
  }

  if (!Array.isArray(absentEmails)) throw new Error('absentEmails must be an array');
  if (absentEmails.length > MAX_NSG_ABSENT_EMAILS_) {
    throw new Error('Too many absent marks (max ' + MAX_NSG_ABSENT_EMAILS_ + ')');
  }

  // Sanitize emails
  const cleaned = absentEmails.map(e => String(e || '').toLowerCase().trim()).filter(e => e.length > 0);
  const now = new Date().toISOString();

  // Upsert: find existing row for this teacher+class
  const existing = findRowsFiltered_(SHEETS_.NAME_SELECTOR_STATE, { teacherEmail: email, classId: cid });

  if (existing.length > 0) {
    updateRow_(SHEETS_.NAME_SELECTOR_STATE, 'stateId', existing[0].stateId, {
      absentEmailsJson: JSON.stringify(cleaned),
      updatedAt: now
    });
  } else {
    appendRow_(SHEETS_.NAME_SELECTOR_STATE, {
      stateId: generateNsgStateId_(),
      teacherEmail: email,
      classId: cid,
      absentEmailsJson: JSON.stringify(cleaned),
      updatedAt: now
    });
  }

  return { success: true };
}

// ============================================================================
// SELECTION HISTORY
// ============================================================================

/**
 * Record a name pick (append-only log).
 * Called fire-and-forget from frontend after each pick.
 * Auto-prunes if history exceeds limit for this teacher+class.
 *
 * @param {string} classId
 * @param {string} studentEmail
 * @param {string} studentName
 * @returns {Object} { success: true }
 */
function recordNamePick(classId, studentEmail, studentName) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!classId) throw new Error('classId is required');
  if (!studentEmail) throw new Error('studentEmail is required');

  const cid = String(classId);

  // Verify class ownership (admin bypasses)
  if (!user.isAdmin) {
    const classes = findRowsFiltered_(SHEETS_.CLASSES, { classId: cid });
    if (classes.length === 0) throw new Error('Class not found');
    if (String(classes[0].teacherEmail || '').toLowerCase() !== email) {
      throw new Error('Access denied');
    }
  }
  const sEmail = String(studentEmail).toLowerCase().trim();
  const sName = String(studentName || '').substring(0, MAX_NSG_STUDENT_NAME_).trim();
  const now = new Date().toISOString();

  // Append the pick
  appendRow_(SHEETS_.NAME_SELECTOR_PICKS, {
    pickId: generateNsgPickId_(),
    teacherEmail: email,
    classId: cid,
    studentEmail: sEmail,
    studentName: sName,
    pickedAt: now
  });

  // Prune old entries if over limit
  const allPicks = findRowsFiltered_(SHEETS_.NAME_SELECTOR_PICKS, { teacherEmail: email, classId: cid });
  if (allPicks.length > MAX_NSG_PICKS_PER_CLASS_) {
    // Sort oldest first, delete the excess
    allPicks.sort((a, b) => {
      const da = new Date(a.pickedAt || 0).getTime();
      const db = new Date(b.pickedAt || 0).getTime();
      return da - db;
    });
    const toDelete = allPicks.slice(0, allPicks.length - MAX_NSG_PICKS_PER_CLASS_);
    for (let i = 0; i < toDelete.length; i++) {
      deleteRows_(SHEETS_.NAME_SELECTOR_PICKS, 'pickId', toDelete[i].pickId);
    }
  }

  return { success: true };
}

/**
 * Clear all pick history for a class.
 * Called when teacher resets no-repeat mode.
 *
 * @param {string} classId
 * @returns {Object} { success: true, deleted: number }
 */
function clearPickHistory(classId) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!classId) throw new Error('classId is required');
  const cid = String(classId);

  // Find all picks for this teacher+class
  const picks = findRowsFiltered_(SHEETS_.NAME_SELECTOR_PICKS, { teacherEmail: email, classId: cid });
  let deleted = 0;
  for (let i = 0; i < picks.length; i++) {
    deleteRows_(SHEETS_.NAME_SELECTOR_PICKS, 'pickId', picks[i].pickId);
    deleted++;
  }

  return { success: true, deleted };
}

// ============================================================================
// SAVED GROUP SETS
// ============================================================================

/**
 * Save a group configuration for future recall.
 * Stores member emails only (names resolved from roster on load).
 *
 * @param {string} classId
 * @param {Object} groupSetData
 * @param {string} groupSetData.name - Group set name (max 50 chars)
 * @param {string} groupSetData.groupMode - 'count' or 'size'
 * @param {number} groupSetData.groupNumber - Number of groups or group size
 * @param {Array} groupSetData.groups - Array of { name, members:[], color }
 * @returns {Object} { groupSetId, groupSetName }
 */
function saveGroupSet(classId, groupSetData) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!classId) throw new Error('classId is required');
  const cid = String(classId);

  if (!groupSetData || typeof groupSetData !== 'object') {
    throw new Error('Invalid group set data');
  }

  // Validate name
  const name = String(groupSetData.name || '').substring(0, MAX_NSG_GROUP_SET_NAME_).trim();
  if (!name) throw new Error('Group set name is required');

  // Validate mode
  const mode = String(groupSetData.groupMode || 'count');
  if (mode !== 'count' && mode !== 'size') throw new Error('Invalid group mode');

  const number = parseInt(groupSetData.groupNumber, 10) || 4;
  if (number < 2 || number > 50) throw new Error('Group number must be 2-50');

  // Validate groups array
  if (!Array.isArray(groupSetData.groups) || groupSetData.groups.length === 0) {
    throw new Error('Groups array is required');
  }
  if (groupSetData.groups.length > 20) throw new Error('Maximum 20 groups per set');

  // Clean groups: store emails only
  const cleanedGroups = [];
  for (let i = 0; i < groupSetData.groups.length; i++) {
    const g = groupSetData.groups[i];
    const gName = String(g.name || 'Group ' + (i + 1)).substring(0, MAX_NSG_GROUP_SET_NAME_).trim();
    const members = [];
    if (Array.isArray(g.members)) {
      for (let j = 0; j < g.members.length; j++) {
        const m = String(g.members[j] || '').toLowerCase().trim();
        if (m) members.push(m);
      }
    }
    const rawColor = String(g.color || '#0d9488');
    const safeColor = /^#[0-9a-fA-F]{3,6}$/.test(rawColor) ? rawColor : '#0d9488';
    cleanedGroups.push({
      name: gName,
      members: members,
      color: safeColor
    });
  }

  // Check count limit
  const existing = findRowsFiltered_(SHEETS_.NAME_SELECTOR_GROUPS, { teacherEmail: email, classId: cid });
  if (existing.length >= MAX_NSG_GROUP_SETS_) {
    throw new Error('Maximum ' + MAX_NSG_GROUP_SETS_ + ' saved group sets per class');
  }

  const now = new Date().toISOString();
  const groupSetId = generateNsgGroupSetId_();

  appendRow_(SHEETS_.NAME_SELECTOR_GROUPS, {
    groupSetId: groupSetId,
    teacherEmail: email,
    classId: cid,
    groupSetName: name,
    groupMode: mode,
    groupNumber: number,
    groupsJson: JSON.stringify(cleanedGroups),
    createdAt: now,
    updatedAt: now
  });

  return { groupSetId, groupSetName: name };
}

/**
 * Load a saved group set with full member data.
 *
 * @param {string} groupSetId
 * @returns {Object} Full group set data including groupsJson
 */
function loadGroupSet(groupSetId) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!groupSetId) throw new Error('groupSetId is required');
  const gsid = String(groupSetId);

  const rows = findRowsFiltered_(SHEETS_.NAME_SELECTOR_GROUPS, { groupSetId: gsid });
  if (rows.length === 0) throw new Error('Group set not found');

  const row = rows[0];
  // Ownership check (admin bypasses)
  if (!user.isAdmin && String(row.teacherEmail || '').toLowerCase() !== email) {
    throw new Error('Access denied');
  }

  let groups = [];
  try {
    groups = JSON.parse(row.groupsJson || '[]');
  } catch (e) { /* return empty */ }

  return {
    groupSetId: String(row.groupSetId || ''),
    groupSetName: String(row.groupSetName || ''),
    groupMode: String(row.groupMode || 'count'),
    groupNumber: parseInt(row.groupNumber, 10) || 4,
    groups: groups,
    createdAt: String(row.createdAt || ''),
    updatedAt: String(row.updatedAt || '')
  };
}

/**
 * Delete a saved group set.
 *
 * @param {string} groupSetId
 * @returns {Object} { success: true }
 */
function deleteGroupSet(groupSetId) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!groupSetId) throw new Error('groupSetId is required');
  const gsid = String(groupSetId);

  // Verify ownership
  const rows = findRowsFiltered_(SHEETS_.NAME_SELECTOR_GROUPS, { groupSetId: gsid });
  if (rows.length === 0) throw new Error('Group set not found');
  if (!user.isAdmin && String(rows[0].teacherEmail || '').toLowerCase() !== email) {
    throw new Error('Access denied');
  }

  deleteRows_(SHEETS_.NAME_SELECTOR_GROUPS, 'groupSetId', gsid);
  return { success: true };
}

/**
 * Update a saved group set (name or membership).
 *
 * @param {string} groupSetId
 * @param {Object} updates - { groupSetName, groupsJson }
 * @returns {Object} { success: true }
 */
function updateGroupSet(groupSetId, updates) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!groupSetId) throw new Error('groupSetId is required');
  const gsid = String(groupSetId);

  // Verify ownership
  const rows = findRowsFiltered_(SHEETS_.NAME_SELECTOR_GROUPS, { groupSetId: gsid });
  if (rows.length === 0) throw new Error('Group set not found');
  if (!user.isAdmin && String(rows[0].teacherEmail || '').toLowerCase() !== email) {
    throw new Error('Access denied');
  }

  const allowed = {};
  if (updates.groupSetName !== undefined) {
    allowed.groupSetName = String(updates.groupSetName || '').substring(0, MAX_NSG_GROUP_SET_NAME_).trim();
    if (!allowed.groupSetName) throw new Error('Name cannot be empty');
  }
  if (updates.groupsJson !== undefined) {
    // Validate JSON
    try {
      const parsed = JSON.parse(updates.groupsJson);
      if (!Array.isArray(parsed)) throw new Error('Invalid groups');
      allowed.groupsJson = updates.groupsJson;
    } catch (e) {
      throw new Error('Invalid groupsJson');
    }
  }

  allowed.updatedAt = new Date().toISOString();
  updateRow_(SHEETS_.NAME_SELECTOR_GROUPS, 'groupSetId', gsid, allowed);
  return { success: true };
}
