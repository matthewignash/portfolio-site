/**
 * FormativeCheckService.gs
 * Formative Check Logging for Learning Map System
 *
 * Teachers log quick formative checks per hex with optional student-level results.
 * Each check records: strategy type, topic, notes, and which students "got it" or "not yet".
 *
 * Sheet: FormativeChecks
 * Schema: checkId, mapId, hexId, classId, teacherEmail, checkDate, strategyType,
 *         topic, notes, studentResultsJson, createdAt, updatedAt
 */

// Allowed strategy types
const FORMATIVE_STRATEGIES_ = [
  'Observation', 'Questioning', 'Think-Aloud', 'Whiteboard Responses',
  'Four Corners', 'Misconception Check', 'Self-Assessment', 'Othr'
];

/**
 * Save a formative check (create or update).
 * Teacher/admin only.
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {string} classId - Class ID (for roster context)
 * @param {Object} checkData - { checkId?, checkDate, strategyType, topic, notes, studentResults: [{email, name, gotIt}] }
 * @returns {Object} Saved check object
 */
function saveFormativeCheck(mapId, hexId, classId, checkData) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers/admins can log formative checks.');
  if (!mapId || !hexId) throw new Error('Map ID and Hex ID are required.');
  if (!classId) throw new Error('Class ID is required.');

  // Verify teacher owns this class (admins bypass)
  if (!user.isAdmin) {
    const cls = findRowsFiltered_(SHEETS_.CLASSES, { classId: classId });
    if (cls.length === 0) throw new Error('Class not found.');
    if (String(cls[0].teacherEmail).toLowerCase() !== user.email.toLowerCase()) {
      throw new Error('You do not have permission to log checks for this class.');
    }
  }

  // Validate strategy
  const strategy = (checkData.strategyType || '').trim();
  if (FORMATIVE_STRATEGIES_.indexOf(strategy) === -1) {
    throw new Error('Invalid strategy type: ' + strategy);
  }

  // Validate topic
  const topic = (checkData.topic || '').trim();
  if (topic.length > 150) throw new Error('Topic must be 150 characters or less.');

  // Validate notes
  const notes = (checkData.notes || '').trim();
  if (notes.length > 500) throw new Error('Notes must be 500 characters or less.');

  // Validate & parse student results
  let studentResults = [];
  if (checkData.studentResults && checkData.studentResults.length > 0) {
    if (checkData.studentResults.length > 50) {
      throw new Error('Maximum 50 student results per check.');
    }
    // Build roster email set for validation
    const roster = getClassRoster(classId);
    const rosterEmails = {};
    for (let r = 0; r < roster.length; r++) {
      if (roster[r].email && roster[r].status !== 'removed') {
        rosterEmails[String(roster[r].email).trim().toLowerCase()] = true;
      }
    }
    for (let i = 0; i < checkData.studentResults.length; i++) {
      const sr = checkData.studentResults[i];
      if (!sr.email) continue; // skip entries without email
      const srEmail = String(sr.email).trim().toLowerCase();
      if (!rosterEmails[srEmail]) continue; // skip non-roster students silently
      studentResults.push({
        email: srEmail,
        name: String(sr.name || '').trim(),
        gotIt: sr.gotIt === true
      });
    }
  }

  const now = new Date().toISOString();
  const checkDate = checkData.checkDate || now.substring(0, 10);

  const record = {
    checkId: checkData.checkId || generateCheckId_(),
    mapId: String(mapId),
    hexId: String(hexId),
    classId: String(classId),
    teacherEmail: user.email,
    checkDate: checkDate,
    strategyType: strategy,
    topic: topic,
    notes: notes,
    studentResultsJson: JSON.stringify(studentResults),
    createdAt: checkData.checkId ? undefined : now, // preserve on update
    updatedAt: now
  };

  if (checkData.checkId) {
    // Update existing — needs lock + readAll/writeAll
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const allChecks = readAll_(SHEETS_.FORMATIVE_CHECKS);
      let found = false;
      for (let i = 0; i < allChecks.length; i++) {
        if (allChecks[i].checkId === checkData.checkId) {
          // Verify ownership
          if (allChecks[i].teacherEmail !== user.email && !user.isAdmin) {
            throw new Error('You can only edit your own checks.');
          }
          record.createdAt = allChecks[i].createdAt;
          allChecks[i] = record;
          found = true;
          break;
        }
      }
      if (!found) throw new Error('Check not found: ' + checkData.checkId);
      writeAll_(SHEETS_.FORMATIVE_CHECKS, allChecks);
    } finally {
      lock.releaseLock();
    }
  } else {
    // Create new — appendRow_ is atomic, no lock needed
    record.createdAt = now;
    appendRow_(SHEETS_.FORMATIVE_CHECKS, record);
  }

  return record;
}

/**
 * Get all formative checks for a specific hex.
 * Teacher/admin only.
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @returns {Array<Object>} Checks sorted by checkDate desc, with parsed studentResults
 */
function getFormativeChecksForHex(mapId, hexId) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers/admins can view formative checks.');

  const allChecks = readAll_(SHEETS_.FORMATIVE_CHECKS);
  const filtered = [];

  for (let i = 0; i < allChecks.length; i++) {
    if (String(allChecks[i].mapId) === String(mapId) && String(allChecks[i].hexId) === String(hexId)) {
      const check = allChecks[i];
      check.studentResults = safeJsonParse_(check.studentResultsJson, []);
      filtered.push(check);
    }
  }

  // Sort by checkDate descending
  filtered.sort(function(a, b) {
    return a.checkDate > b.checkDate ? -1 : a.checkDate < b.checkDate ? 1 : 0;
  });

  return filtered;
}

/**
 * Get all formative checks for a map, grouped by hexId.
 * Teacher/admin only.
 *
 * @param {string} mapId - Map ID
 * @returns {Object} { hexId: [checks...] } with parsed studentResults
 */
function getFormativeChecksForMap(mapId) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers/admins can view formative checks.');

  const allChecks = readAll_(SHEETS_.FORMATIVE_CHECKS);
  const grouped = {};

  for (let i = 0; i < allChecks.length; i++) {
    if (String(allChecks[i].mapId) === String(mapId)) {
      const check = allChecks[i];
      check.studentResults = safeJsonParse_(check.studentResultsJson, []);
      const hid = String(check.hexId);
      if (!grouped[hid]) grouped[hid] = [];
      grouped[hid].push(check);
    }
  }

  // Sort each hex's checks by date desc
  const hexIds = Object.keys(grouped);
  for (let j = 0; j < hexIds.length; j++) {
    grouped[hexIds[j]].sort(function(a, b) {
      return a.checkDate > b.checkDate ? -1 : a.checkDate < b.checkDate ? 1 : 0;
    });
  }

  return grouped;
}

/**
 * Delete a formative check.
 * Teacher who created it, or admin only.
 *
 * @param {string} checkId - Check ID to delete
 * @returns {Object} { success: true }
 */
function deleteFormativeCheck(checkId) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers/admins can delete formative checks.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const allChecks = readAll_(SHEETS_.FORMATIVE_CHECKS);
    let found = false;

    for (let i = 0; i < allChecks.length; i++) {
      if (allChecks[i].checkId === checkId) {
        if (allChecks[i].teacherEmail !== user.email && !user.isAdmin) {
          throw new Error('You can only delete your own checks.');
        }
        found = true;
        allChecks.splice(i, 1);
        break;
      }
    }

    if (!found) throw new Error('Check not found: ' + checkId);

    if (allChecks.length > 0) {
      writeAll_(SHEETS_.FORMATIVE_CHECKS, allChecks);
    } else {
      // If no checks remain, clear sheet but keep headers
      const sheet = getSheet_(SHEETS_.FORMATIVE_CHECKS);
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
    }
  } finally {
    lock.releaseLock();
  }

  return { success: true };
}
