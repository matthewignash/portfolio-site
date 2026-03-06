/**
 * Learning Map - Progress Service
 *
 * Handles:
 * - Student progress tracking
 * - Score/status updates
 * - Teacher approval workflow
 * - Progress retrieval and analytics
 * - Completion tracking
 *
 * @version 1.0.0
 */
// ============================================================================
// PROGRESS COLUMN MIGRATION HELPER
// ============================================================================
/**
 * Ensure all progress rows have the required columns (migration-safe).
 * Add new columns here — single source of truth for column defaults.
 * @param {Array<Object>} rows - Array of progress row objects
 */
function ensureProgressColumns_(rows) {
  const columns = ['feedback', 'feedbackAt', 'selfAssessRating', 'selfAssessNote',
                   'selfAssessGoal', 'selfAssessEvidenceJson', 'strategiesUsedJson', 'reflectionNote'];
  for (let i = 0; i < rows.length; i++) {
    for (let c = 0; c < columns.length; c++) {
      if (!rows[i].hasOwnProperty(columns[c])) {
        rows[i][columns[c]] = '';
      }
    }
    // Normalize teacherApproved to boolean
    if (typeof rows[i].teacherApproved === 'string') {
      rows[i].teacherApproved = rows[i].teacherApproved === 'true';
    }
  }
}

// ============================================================================
// PROGRESS - CRUD OPERATIONS
// ============================================================================
/**
 * Get student progress for a map
 *
 * @param {string} mapId - Map ID
 * @param {string} studentEmail - Student email (optional, defaults to current user)
 * @returns {Object} Progress object {hexId: {status, score, ...}}
 */
function getStudentProgress(mapId, studentEmail) {
const user = getCurrentUser();
const email = studentEmail || user.email;
// Students can only view their own progress
if (user.normalizedRole === 'student' && email.toLowerCase() !== user.email.toLowerCase()) {
throw new Error('You do not have permission to view this student\'s progress');
  }
// Verify user can view this map
if (!canViewMap(mapId)) {
throw new Error('You do not have permission to view this map');
  }
// Get progress records for this student and map (filtered read — avoids full-sheet object allocation)
const progressRecords = findRowsFiltered_(SHEETS_.PROGRESS, { email: email, mapId: mapId });
// Convert to object indexed by hexId
const progressByHex = {};
progressRecords.forEach(p => {
progressByHex[p.hexId] = {
status: p.status,
score: p.score ? parseFloat(p.score) : null,
maxScore: p.maxScore ? parseFloat(p.maxScore) : null,
teacherApproved: p.teacherApproved === true || p.teacherApproved === 'true',
completedAt: p.completedAt,
feedback: p.feedback || '',
feedbackAt: p.feedbackAt || '',
selfAssessRating: p.selfAssessRating ? parseInt(p.selfAssessRating) : null,
selfAssessNote: p.selfAssessNote || '',
selfAssessGoal: p.selfAssessGoal || '',
selfAssessEvidence: safeJsonParse_(p.selfAssessEvidenceJson, []),
strategiesUsed: safeJsonParse_(p.strategiesUsedJson, [])
    };
  });
return progressByHex;
}
/**
 * Update student progress for a hex
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {string} status - Progress status ('not_started', 'in_progress', 'completed', 'mastered')
 * @param {number} score - Score (optional)
 * @param {number} maxScore - Max possible score (optional)
 * @returns {Object} Updated progress record
 */
function updateStudentProgress(mapId, hexId, status, score, maxScore) {
const user = getCurrentUser();
// Verify map exists
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
// Verify hex exists in map
const hex = map.hexes.find(h => h.id === hexId);
if (!hex) {
throw new Error('Hex not found in map');
  }
// Validate status
const validStatuses = ['not_started', 'in_progress', 'completed', 'mastered'];
if (!validStatuses.includes(status)) {
throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
  }
// Create or update progress record
const progressRecord = {
email: user.email,
mapId: mapId,
hexId: hexId,
status: status,
score: score || '',
maxScore: maxScore || '',
teacherApproved: getConfigValue('requireTeacherApproval') === 'false' ? true : false,
completedAt: status === 'completed' || status === 'mastered' ? now_() : '',
feedback: '',
feedbackAt: '',
selfAssessRating: '',
selfAssessNote: '',
selfAssessGoal: '',
selfAssessEvidenceJson: '',
strategiesUsedJson: ''
  };
// Check if existing record exists (compound match)
const existingRows = findRowsFiltered_(SHEETS_.PROGRESS, { email: user.email, mapId: mapId, hexId: hexId });
if (existingRows.length > 0) {
  const existing = existingRows[0];
  // Build updates — only the fields that change
  const updates = {
    status: status,
    score: score || '',
    maxScore: maxScore || '',
    teacherApproved: progressRecord.teacherApproved,
    completedAt: progressRecord.completedAt
  };
  // Preserve feedback if staying in_progress
  if (status === 'completed' || status === 'mastered') {
    updates.feedback = '';
    updates.feedbackAt = '';
  }
  // Self-assessment/strategies preserved (not in updates — keeps existing values)
  updateRowByCompoundMatch_(SHEETS_.PROGRESS,
    { email: user.email, mapId: mapId, hexId: hexId },
    updates
  );
  // Update local record for return value
  progressRecord.selfAssessRating = existing.selfAssessRating || '';
  progressRecord.selfAssessNote = existing.selfAssessNote || '';
  progressRecord.selfAssessGoal = existing.selfAssessGoal || '';
  progressRecord.selfAssessEvidenceJson = existing.selfAssessEvidenceJson || '';
  progressRecord.strategiesUsedJson = existing.strategiesUsedJson || '';
  progressRecord.feedback = (status === 'completed' || status === 'mastered') ? '' : (existing.feedback || '');
  progressRecord.feedbackAt = (status === 'completed' || status === 'mastered') ? '' : (existing.feedbackAt || '');
} else {
  // New record — atomic insert, no lock needed
  ensureProgressColumns_([progressRecord]);
  appendRow_(SHEETS_.PROGRESS, progressRecord);
}
// Notify based on approval config
if (status === 'completed' || status === 'mastered') {
  const approvalRequired = getConfigValue('requireTeacherApproval') !== 'false';
  try {
    const ntfMap = getMapById(mapId);
    if (ntfMap && ntfMap.teacherEmail) {
      const ntfHex = ntfMap.hexes.find(h => h.id === hexId);
      const ntfHexLabel = ntfHex ? ntfHex.label || hexId : hexId;
      if (approvalRequired) {
        // Normal flow: teacher needs to review
        createNotification_(
          ntfMap.teacherEmail,
          'submission_pending',
          'New Submission',
          user.email + ' completed "' + ntfHexLabel + '" and needs review.',
          { sourceEmail: user.email, mapId: mapId, hexId: hexId }
        );
      } else {
        // Auto-approved: notify student directly
        createNotification_(
          user.email,
          'approval_granted',
          'Auto-Approved',
          'Your submission for "' + ntfHexLabel + '" has been automatically approved.',
          { sourceEmail: ntfMap.teacherEmail, mapId: mapId, hexId: hexId }
        );
      }
    }
  } catch (ntfErr) {
    Logger.log('Notification error (non-fatal): ' + ntfErr.message);
  }
}
return progressRecord;
}
/**
 * Get all progress for a student
 *
 * @param {string} studentEmail - Student email (optional, defaults to current user)
 * @returns {Array<Object>} Array of progress records
 */
function getAllStudentProgress(studentEmail) {
const email = studentEmail || getCurrentUser().email;
// Only allow teachers/admins to view other students' progress
if (email !== getCurrentUser().email && !isTeacherOrAdmin()) {
throw new Error('You do not have permission to view this student\'s progress');
  }
return findRows_(SHEETS_.PROGRESS, 'email', email);
}
/**
 * Get all progress for a map (teacher/admin only)
 *
 * @param {string} mapId - Map ID
 * @returns {Array<Object>} Array of progress records for all students
 */
function getAllProgressForMap(mapId) {
// Check permissions
if (!canViewMap(mapId)) {
throw new Error('You do not have permission to view this map');
  }
if (!isTeacherOrAdmin()) {
throw new Error('Only teachers and administrators can view all student progress');
  }
return findRows_(SHEETS_.PROGRESS, 'mapId', mapId);
}
/**
 * Delete progress record
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {string} studentEmail - Student email
 * @returns {boolean} True if deleted
 */
function deleteProgress(mapId, hexId, studentEmail) {
// Only teachers/admins can delete progress
requireRole(['administrator', 'teacher']);
if (!canEditMap(mapId)) {
throw new Error('You do not have permission to edit this map');
  }
const lock = LockService.getScriptLock();
lock.waitLock(10000);
try {
const allProgress = readAll_(SHEETS_.PROGRESS);
const filtered = allProgress.filter(p =>
      !(p.email === studentEmail && p.mapId === mapId && p.hexId === hexId)
    );
if (filtered.length < allProgress.length) {
ensureProgressColumns_(filtered);
writeAll_(SHEETS_.PROGRESS, filtered);
return true;
    }
return false;
  } finally {
lock.releaseLock();
  }
}
// ============================================================================
// TEACHER APPROVAL WORKFLOW
// ============================================================================
/**
 * Get pending approvals for a map
 *
 * @param {string} mapId - Map ID
 * @returns {Array<Object>} Array of pending submissions
 */
function getPendingApprovals(mapId) {
requireRole(['administrator', 'teacher']);
// If teacher approval is not required, there are no pending approvals
if (getConfigValue('requireTeacherApproval') === 'false') {
  return [];
}
if (!canViewMap(mapId)) {
throw new Error('You do not have permission to view this map');
  }
const allProgress = findRows_(SHEETS_.PROGRESS, 'mapId', mapId);
// Filter for completed but not approved
return allProgress.filter(p =>
    (p.status === 'completed' || p.status === 'mastered') &&
    (p.teacherApproved === false || p.teacherApproved === 'false' || !p.teacherApproved)
  );
}
/**
 * Approve student submission
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {string} studentEmail - Student email
 * @param {number} score - Final score (optional)
 * @param {number} maxScore - Max score (optional)
 * @returns {Object} Updated progress record
 */
function approveSubmission(mapId, hexId, studentEmail, score, maxScore) {
requireRole(['administrator', 'teacher']);
if (!canEditMap(mapId)) {
throw new Error('You do not have permission to approve submissions for this map');
  }
const lock = LockService.getScriptLock();
lock.waitLock(10000);
try {
const allProgress = readAll_(SHEETS_.PROGRESS);
const index = allProgress.findIndex(p =>
p.email === studentEmail && p.mapId === mapId && p.hexId === hexId
    );
if (index === -1) {
throw new Error('Progress record not found');
    }
// Update record
allProgress[index].teacherApproved = true;
if (score !== undefined) {
allProgress[index].score = score;
    }
if (maxScore !== undefined) {
allProgress[index].maxScore = maxScore;
    }
ensureProgressColumns_(allProgress);
writeAll_(SHEETS_.PROGRESS, allProgress);
// Notify student of approval
try {
  const approveMap = getMapById(mapId);
  const approveHex = approveMap ? approveMap.hexes.find(h => h.id === hexId) : null;
  const approveHexLabel = approveHex ? approveHex.label || hexId : hexId;
  createNotification_(
    studentEmail,
    'approval_granted',
    'Submission Approved',
    'Your submission for "' + approveHexLabel + '" has been approved.',
    { sourceEmail: getCurrentUser().email, mapId: mapId, hexId: hexId }
  );
} catch (ntfErr) {
  Logger.log('Notification error (non-fatal): ' + ntfErr.message);
}
return allProgress[index];
  } finally {
lock.releaseLock();
  }
}
/**
 * Bulk approve multiple submissions and iterations for a map.
 * Calls approveSubmission/reviewIteration per item, collecting results.
 *
 * @param {string} mapId - Map ID
 * @param {Array} items - Array of { type, hexId, studentEmail, iterationId }
 * @returns {Object} { approved, failed, errors }
 */
function bulkApproveItems(mapId, items) {
  requireRole(['administrator', 'teacher']);
  if (!mapId || !items || !items.length) throw new Error('No items to approve');
  if (!canEditMap(mapId)) throw new Error('You do not have permission to approve items for this map');

  let approved = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      if (item.type === 'submission') {
        approveSubmission(mapId, item.hexId, item.studentEmail);
        approved++;
      } else if (item.type === 'iteration' && item.iterationId) {
        reviewIteration(item.iterationId, 'approved', '');
        approved++;
      }
      // Skip lab and assessment types (require scoring)
    } catch (err) {
      failed++;
      errors.push((item.studentEmail || '') + ': ' + err.message);
      Logger.log('Bulk approve item failed: ' + err.message);
    }
  }

  return { approved: approved, failed: failed, errors: errors };
}

/**
 * Request revision from student
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {string} studentEmail - Student email
 * @param {string} feedback - Feedback message
 * @returns {Object} Updated progress record
 */
function requestRevision(mapId, hexId, studentEmail, feedback) {
requireRole(['administrator', 'teacher']);
if (!canEditMap(mapId)) {
throw new Error('You do not have permission to request revisions for this map');
  }
const lock = LockService.getScriptLock();
lock.waitLock(10000);
try {
const allProgress = readAll_(SHEETS_.PROGRESS);
const index = allProgress.findIndex(p =>
p.email === studentEmail && p.mapId === mapId && p.hexId === hexId
    );
if (index === -1) {
throw new Error('Progress record not found');
    }
// Validate feedback length
if (feedback && feedback.length > 1000) {
  throw new Error('Feedback must be 1000 characters or less.');
}
// Reset to in_progress and store feedback
allProgress[index].status = 'in_progress';
allProgress[index].teacherApproved = false;
allProgress[index].feedback = feedback || '';
allProgress[index].feedbackAt = feedback ? now_() : '';
ensureProgressColumns_(allProgress);
writeAll_(SHEETS_.PROGRESS, allProgress);
// Notify student of revision request
try {
  const revMap = getMapById(mapId);
  const revHex = revMap ? revMap.hexes.find(h => h.id === hexId) : null;
  const revHexLabel = revHex ? revHex.label || hexId : hexId;
  createNotification_(
    studentEmail,
    'revision_requested',
    'Revision Requested',
    'Your teacher has requested a revision on "' + revHexLabel + '".' + (feedback ? ' Feedback: ' + feedback : ''),
    { sourceEmail: getCurrentUser().email, mapId: mapId, hexId: hexId }
  );
} catch (ntfErr) {
  Logger.log('Notification error (non-fatal): ' + ntfErr.message);
}
return allProgress[index];
  } finally {
lock.releaseLock();
  }
}
// ============================================================================
// BULK OPERATIONS
// ============================================================================
/**
 * Assign map to student(s)
 * Creates initial progress records
 *
 * @param {string} mapId - Map ID
 * @param {Array<string>} studentEmails - Array of student emails
 * @returns {number} Number of students assigned
 */
function assignMapToStudents(mapId, studentEmails) {
requireRole(['administrator', 'teacher']);
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
if (!canEditMap(mapId)) {
throw new Error('You do not have permission to assign this map');
  }
// Check which students already have this map — filtered read
const existingProgress = findRowsFiltered_(SHEETS_.PROGRESS, { mapId: mapId });
const existingEmails = {};
for (let e = 0; e < existingProgress.length; e++) {
  existingEmails[String(existingProgress[e].email).toLowerCase()] = true;
}
// Build deduped list of hex IDs to auto-unlock: hexes[0] + all autoUnlock hexes
const unlockHexIds = [];
const unlockHexSet = {};
if (map.hexes.length > 0) {
  unlockHexIds.push(map.hexes[0].id);
  unlockHexSet[map.hexes[0].id] = true;
  for (let h = 0; h < map.hexes.length; h++) {
    if (map.hexes[h].autoUnlock && !unlockHexSet[map.hexes[h].id]) {
      unlockHexIds.push(map.hexes[h].id);
      unlockHexSet[map.hexes[h].id] = true;
    }
  }
}

let assignedCount = 0;
for (let s = 0; s < studentEmails.length; s++) {
  const email = studentEmails[s];
  if (!existingEmails[email.toLowerCase()] && unlockHexIds.length > 0) {
    for (let u = 0; u < unlockHexIds.length; u++) {
      // Atomic insert — no lock needed, no full-sheet rewrite
      const record = {
        email: email,
        mapId: mapId,
        hexId: unlockHexIds[u],
        status: 'not_started',
        score: '',
        maxScore: '',
        teacherApproved: false,
        completedAt: '',
        feedback: '',
        feedbackAt: '',
        selfAssessRating: '',
        selfAssessNote: '',
        selfAssessGoal: '',
        selfAssessEvidenceJson: '',
        strategiesUsedJson: ''
      };
      appendRow_(SHEETS_.PROGRESS, record);
    }
    assignedCount++;
  }
}
// Notify assigned students
try {
  const mapTitle = map.title || 'a learning map';
  const teacherEmail = getCurrentUser().email;
  for (let k = 0; k < studentEmails.length; k++) {
    createNotification_(
      studentEmails[k],
      'map_assigned',
      'New Map Assigned',
      'You have been assigned to "' + mapTitle + '".',
      { sourceEmail: teacherEmail, mapId: mapId, hexId: '' }
    );
  }
} catch (ntfErr) {
  Logger.log('Notification error (non-fatal): ' + ntfErr.message);
}
return assignedCount;
}

/**
 * Retroactively sync auto-unlock hexes for already-assigned students.
 * Called after map save when teacher may have toggled autoUnlock on existing hexes.
 *
 * @param {string} mapId - Map ID
 * @returns {number} Number of progress records created
 */
function syncAutoUnlockHexes(mapId) {
  requireRole(['administrator', 'teacher']);
  const map = getMapById(mapId);
  if (!map) throw new Error('Map not found');
  if (!canEditMap(mapId)) throw new Error('Permission denied');

  // Collect auto-unlock hex IDs
  const autoUnlockIds = [];
  for (let h = 0; h < map.hexes.length; h++) {
    if (map.hexes[h].autoUnlock) {
      autoUnlockIds.push(map.hexes[h].id);
    }
  }
  if (autoUnlockIds.length === 0) return 0;

  // Read existing progress for this map
  const existing = findRowsFiltered_(SHEETS_.PROGRESS, { mapId: mapId });

  // Build set of assigned students (anyone with at least one progress row)
  const studentEmails = {};
  const progressKeys = {};
  for (let i = 0; i < existing.length; i++) {
    const email = String(existing[i].email).toLowerCase();
    studentEmails[email] = true;
    progressKeys[email + '|' + String(existing[i].hexId)] = true;
  }

  // Create missing progress records
  let created = 0;
  const emails = Object.keys(studentEmails);
  for (let s = 0; s < emails.length; s++) {
    for (let h = 0; h < autoUnlockIds.length; h++) {
      const key = emails[s] + '|' + autoUnlockIds[h];
      if (!progressKeys[key]) {
        appendRow_(SHEETS_.PROGRESS, {
          email: emails[s],
          mapId: mapId,
          hexId: autoUnlockIds[h],
          status: 'not_started',
          score: '',
          maxScore: '',
          teacherApproved: false,
          completedAt: '',
          feedback: '',
          feedbackAt: '',
          selfAssessRating: '',
          selfAssessNote: '',
          selfAssessGoal: '',
          selfAssessEvidenceJson: '',
          strategiesUsedJson: ''
        });
        created++;
      }
    }
  }
  return created;
}

/**
 * Repair missing progress records for all map assignments.
 * Fixes the classId type coercion bug that caused getClassRoster()
 * to return 0 students, resulting in 0 progress rows created.
 *
 * For each MapAssignment, gets the class roster and calls assignMapToStudents()
 * which handles dedup (skips students who already have progress rows).
 *
 * @returns {Object} { mapsProcessed: number, studentsRepaired: number }
 */
function repairMissingProgress() {
  requireRole(['administrator', 'teacher']);

  const allAssignments = readAll_(SHEETS_.MAP_ASSIGNMENTS);
  if (allAssignments.length === 0) return { mapsProcessed: 0, studentsRepaired: 0 };

  // Group assignments by mapId to avoid duplicate work
  const mapClasses = {};
  for (let i = 0; i < allAssignments.length; i++) {
    const mid = String(allAssignments[i].mapId);
    const cid = String(allAssignments[i].classId);
    if (!mapClasses[mid]) mapClasses[mid] = [];
    mapClasses[mid].push(cid);
  }

  let mapsProcessed = 0;
  let studentsRepaired = 0;
  const mapIds = Object.keys(mapClasses);

  for (let m = 0; m < mapIds.length; m++) {
    const mapId = mapIds[m];
    const classIds = mapClasses[mapId];

    // Collect all active student emails across all classes assigned to this map
    const emailSet = {};
    for (let c = 0; c < classIds.length; c++) {
      try {
        const roster = getClassRoster(classIds[c]);
        for (let r = 0; r < roster.length; r++) {
          if (roster[r].status !== 'removed' && roster[r].email) {
            emailSet[roster[r].email.toLowerCase()] = roster[r].email;
          }
        }
      } catch (e) {
        // Skip classes we can't access (e.g., another teacher's class)
        Logger.log('repairMissingProgress: skipping class ' + classIds[c] + ': ' + e.message);
      }
    }

    const emails = [];
    const keys = Object.keys(emailSet);
    for (let k = 0; k < keys.length; k++) {
      emails.push(emailSet[keys[k]]);
    }

    if (emails.length > 0) {
      try {
        const assigned = assignMapToStudents(mapId, emails);
        studentsRepaired += assigned;
        mapsProcessed++;
      } catch (e) {
        Logger.log('repairMissingProgress: error on map ' + mapId + ': ' + e.message);
      }
    }
  }

  return { mapsProcessed: mapsProcessed, studentsRepaired: studentsRepaired };
}


/**
 * Teacher overrides the score on a student's hex (e.g., after reviewing auto-graded assessment).
 * Sets score, maxScore, and marks teacherApproved = true.
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {string} studentEmail - Student email
 * @param {number} score - New score
 * @param {number} maxScore - Max score
 * @returns {Object} { success: true }
 */
function overrideAssessmentScore(mapId, hexId, studentEmail, score, maxScore) {
  requireRole(['administrator', 'teacher']);
  if (!mapId || !hexId || !studentEmail) throw new Error('mapId, hexId, and studentEmail are required');
  if (!canEditMap(mapId)) throw new Error('You do not have permission to edit this map');

  score = parseFloat(score);
  maxScore = parseFloat(maxScore);
  if (isNaN(score) || isNaN(maxScore) || maxScore <= 0) throw new Error('Invalid score values');
  if (score < 0 || score > maxScore) throw new Error('Score must be between 0 and ' + maxScore);

  updateRowByCompoundMatch_(SHEETS_.PROGRESS,
    { email: studentEmail, mapId: String(mapId), hexId: String(hexId) },
    { score: String(score), maxScore: String(maxScore), teacherApproved: 'true', updatedAt: now_() }
  );

  return { success: true };
}


/**
 * Unassign map from student(s)
 * Deletes all progress records
 *
 * @param {string} mapId - Map ID
 * @param {Array<string>} studentEmails - Array of student emails
 * @returns {number} Number of records deleted
 */
function unassignMapFromStudents(mapId, studentEmails) {
requireRole(['administrator', 'teacher']);
if (!canEditMap(mapId)) {
throw new Error('You do not have permission to unassign this map');
  }
const lock = LockService.getScriptLock();
lock.waitLock(10000);
try {
const allProgress = readAll_(SHEETS_.PROGRESS);
const filtered = allProgress.filter(p =>
      !(p.mapId === mapId && studentEmails.includes(p.email))
    );
const deletedCount = allProgress.length - filtered.length;
ensureProgressColumns_(filtered);
writeAll_(SHEETS_.PROGRESS, filtered);
return deletedCount;
  } finally {
lock.releaseLock();
  }
}

// ============================================================================
// CLASS MAP ASSIGNMENT
// ============================================================================

/**
 * Assign a map to all active students in a class.
 * Wraps assignMapToStudents with roster lookup.
 * Also creates/updates a MapAssignment record with optional due date.
 *
 * @param {string} classId - Class ID
 * @param {string} mapId - Map ID
 * @param {string} [dueDate] - Optional ISO date string for map due date (e.g. "2026-03-15")
 * @returns {Object} {assigned: number, total: number}
 */
function assignMapToClass(classId, mapId, dueDate) {
  requireRole(['administrator', 'teacher']);

  if (!classId || !mapId) {
    throw new Error('Class ID and Map ID are required');
  }

  // Create/update MapAssignment record (tracks assignment + optional due date)
  const lockAssign = LockService.getScriptLock();
  lockAssign.waitLock(10000);
  try {
    const allAssignments = readAll_(SHEETS_.MAP_ASSIGNMENTS);
    let existing = null;
    for (let i = 0; i < allAssignments.length; i++) {
      if (String(allAssignments[i].mapId) === String(mapId) && String(allAssignments[i].classId) === String(classId)) {
        existing = allAssignments[i];
        break;
      }
    }
    if (!existing) {
      allAssignments.push({
        assignmentId: generateAssignmentId_(),
        mapId: mapId,
        classId: classId,
        dueDate: dueDate || '',
        assignedBy: getCurrentUser().email,
        assignedAt: now_()
      });
    } else if (dueDate !== undefined) {
      existing.dueDate = dueDate || '';
    }
    writeAll_(SHEETS_.MAP_ASSIGNMENTS, allAssignments);
  } finally {
    lockAssign.releaseLock();
  }

  const roster = getClassRoster(classId);
  const activeEmails = roster
    .filter(r => r.status !== 'removed' && r.email)
    .map(r => r.email);

  if (activeEmails.length === 0) {
    return { assigned: 0, total: 0 };
  }

  const assigned = assignMapToStudents(mapId, activeEmails);

  // Cascade: also assign linked lesson maps
  try {
    const map = getMapById(mapId);
    if (map && map.hexes) {
      map.hexes.forEach(hex => {
        if (hex.type === 'lesson' && hex.linkedMapId) {
          try {
            assignMapToStudents(hex.linkedMapId, activeEmails);
          } catch (e) {
            console.log('Cascade assign lesson map ' + hex.linkedMapId + ' failed: ' + e.message);
          }
        }
      });
    }
  } catch (e) {
    console.log('Cascade assign lookup failed: ' + e.message);
  }

  return { assigned: assigned, total: activeEmails.length };
}

/**
 * Unassign a map from all active students in a class.
 * Wraps unassignMapFromStudents with roster lookup.
 *
 * @param {string} classId - Class ID
 * @param {string} mapId - Map ID
 * @returns {Object} {removed: number}
 */
function unassignMapFromClass(classId, mapId) {
  requireRole(['administrator', 'teacher']);

  if (!classId || !mapId) {
    throw new Error('Class ID and Map ID are required');
  }

  // Remove MapAssignment record
  try {
    const lockAssign = LockService.getScriptLock();
    lockAssign.waitLock(10000);
    try {
      const allAssignments = readAll_(SHEETS_.MAP_ASSIGNMENTS);
      const filtered = allAssignments.filter(a =>
        !(String(a.mapId) === String(mapId) && String(a.classId) === String(classId))
      );
      if (filtered.length < allAssignments.length) {
        writeAll_(SHEETS_.MAP_ASSIGNMENTS, filtered);
      }
    } finally {
      lockAssign.releaseLock();
    }
  } catch (e) {
    Logger.log('Warning: Could not clean up MapAssignment: ' + e.message);
  }

  const roster = getClassRoster(classId);
  const activeEmails = roster
    .filter(r => r.status !== 'removed' && r.email)
    .map(r => r.email);

  if (activeEmails.length === 0) {
    return { removed: 0 };
  }

  const removed = unassignMapFromStudents(mapId, activeEmails);
  return { removed: removed };
}

/**
 * Get map IDs currently assigned to a class (via progress records).
 * Lightweight version of DashboardService.getClassMaps — returns IDs only.
 *
 * @param {string} classId - Class ID
 * @returns {Array<string>} Array of mapId strings
 */
function getClassMapAssignments(classId) {
  requireRole(['administrator', 'teacher']);

  if (!classId) {
    throw new Error('Class ID is required');
  }

  // 1. Get active roster emails
  const roster = getClassRoster(classId);
  const emails = {};
  for (let i = 0; i < roster.length; i++) {
    if (roster[i].status !== 'removed' && roster[i].email) {
      emails[roster[i].email.toLowerCase()] = true;
    }
  }

  if (Object.keys(emails).length === 0) {
    return [];
  }

  // 2. Scan progress records for unique mapIds
  const allProgress = readAll_(SHEETS_.PROGRESS);
  const mapIdSet = {};
  for (let i = 0; i < allProgress.length; i++) {
    const p = allProgress[i];
    const email = String(p.email || '').toLowerCase();
    if (emails[email]) {
      const mid = String(p.mapId || '');
      if (mid) {
        mapIdSet[mid] = true;
      }
    }
  }

  return Object.keys(mapIdSet);
}

// ============================================================================
// SELF-ASSESSMENT
// ============================================================================

/**
 * Save student self-assessment for a hex.
 * Students can rate their confidence and write a short reflection.
 * Can only self-assess hexes that already have a progress record (not locked).
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {number} rating - Confidence rating 1-4 (1=Beginning, 2=Developing, 3=Proficient, 4=Extending)
 * @param {string} note - Reflection note (max 300 chars)
 * @returns {Object} Updated progress record
 */
function saveSelfAssessment(mapId, hexId, rating, note, goal, evidenceJson) {
  const user = getCurrentUser();

  // Validate rating
  const ratingNum = parseInt(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 4) {
    throw new Error('Rating must be between 1 and 4');
  }

  // Validate note length
  const safeNote = String(note || '').substring(0, 300);

  // Validate goal length
  const safeGoal = String(goal || '').substring(0, 150);

  // Validate evidence JSON
  let evidence = [];
  if (evidenceJson) {
    try {
      evidence = JSON.parse(evidenceJson);
      if (!Array.isArray(evidence)) evidence = [];
      evidence = evidence.slice(0, 3).map(e => ({
        label: String(e.label || '').substring(0, 50),
        url: String(e.url || '').substring(0, 500)
      })).filter(e => {
        const u = e.url.trim();
        if (!u) return false;
        // Only allow http/https protocols (block javascript:, data:, etc.)
        if (!/^https?:\/\//i.test(u)) {
          throw new Error('Evidence URLs must start with http:// or https://');
        }
        return true;
      });
    } catch (e) { evidence = []; }
  }

  // Cell-level update — avoids full-sheet rewrite
  const updated = updateRowByCompoundMatch_(SHEETS_.PROGRESS,
    { email: user.email, mapId: mapId, hexId: hexId },
    {
      selfAssessRating: ratingNum,
      selfAssessNote: safeNote,
      selfAssessGoal: safeGoal,
      selfAssessEvidenceJson: JSON.stringify(evidence)
    }
  );
  if (!updated) {
    throw new Error('No progress record found for this hex. Start working on it first.');
  }
  return { selfAssessRating: ratingNum, selfAssessNote: safeNote, selfAssessGoal: safeGoal, selfAssessEvidence: evidence };
}

/**
 * Save a completion reflection note for a hex.
 * Called when student completes a hex and fills in the reflection prompt.
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {string} note - Reflection text (max 300 chars)
 * @returns {Object} { reflectionNote }
 */
function saveReflectionNote(mapId, hexId, note) {
  const user = getCurrentUser();
  if (!mapId || !hexId) throw new Error('mapId and hexId required');
  const safeNote = String(note || '').substring(0, 300);

  const updated = updateRowByCompoundMatch_(SHEETS_.PROGRESS,
    { email: user.email, mapId: mapId, hexId: hexId },
    { reflectionNote: safeNote }
  );
  if (!updated) {
    throw new Error('No progress record found for this hex.');
  }

  // Dual-write to ProcessJournal for timeline visibility
  try {
    appendRow_(SHEETS_.PROCESS_JOURNAL, {
      journalId: generateJournalId_(),
      studentEmail: user.email,
      mapId: String(mapId),
      hexId: String(hexId),
      entryType: 'reflection',
      content: safeNote,
      promptId: 'hex_completion',
      metadataJson: JSON.stringify({ sourceType: 'hex_reflection' }),
      createdAt: now_(),
      updatedAt: now_()
    });
  } catch (e) {
    // Non-fatal: journal write failure must not break reflection save
    Logger.log('ProcessJournal dual-write failed: ' + e.toString());
  }

  return { reflectionNote: safeNote };
}

/**
 * Save student's self-marked strategies for a hex.
 * Students mark which strategies they tried from their support profile.
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {Array<string>} strategies - Array of strategy strings the student marked
 * @returns {Object} { success: true }
 */
function saveStrategiesUsed(mapId, hexId, strategies) {
  requireRole(['student', 'teacher', 'administrator']);
  if (!mapId || !hexId) throw new Error('mapId and hexId required');
  if (!Array.isArray(strategies)) strategies = [];
  if (strategies.length > 15) strategies = strategies.slice(0, 15);

  const email = Session.getActiveUser().getEmail();
  // Cell-level update — avoids full-sheet rewrite
  const updated = updateRowByCompoundMatch_(SHEETS_.PROGRESS,
    { email: email, mapId: mapId, hexId: hexId },
    { strategiesUsedJson: JSON.stringify(strategies), updatedAt: now_() }
  );
  if (!updated) throw new Error('No progress record found for this hex');
  return { success: true };
}

// ============================================================================
// ANALYTICS
// ============================================================================
/**
 * Get student analytics for a map
 *
 * @param {string} studentEmail - Student email
 * @param {string} mapId - Map ID
 * @returns {Object} Analytics data
 */
function getStudentAnalytics(studentEmail, mapId) {
// Check permissions
if (studentEmail !== getCurrentUser().email && !isTeacherOrAdmin()) {
throw new Error('You do not have permission to view this student\'s analytics');
  }
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
const progress = getStudentProgress(mapId, studentEmail);
// Count statuses
const statusCounts = {
not_started: 0,
in_progress: 0,
completed: 0,
mastered: 0
  };
let totalScore = 0;
let totalMaxScore = 0;
let scoredHexes = 0;
map.hexes.forEach(hex => {
const hexProgress = progress[hex.id];
if (hexProgress) {
statusCounts[hexProgress.status] = (statusCounts[hexProgress.status] || 0) + 1;
if (hexProgress.score && hexProgress.maxScore) {
totalScore += hexProgress.score;
totalMaxScore += hexProgress.maxScore;
scoredHexes++;
      }
    } else {
statusCounts.not_started++;
    }
  });
const percentComplete = map.hexes.length > 0
    ? ((statusCounts.completed + statusCounts.mastered) / map.hexes.length * 100).toFixed(1)
    : 0;
const averageScore = totalMaxScore > 0
    ? ((totalScore / totalMaxScore) * 100).toFixed(1)
    : null;
return {
totalHexes: map.hexes.length,
statusCounts: statusCounts,
percentComplete: parseFloat(percentComplete),
scoredHexes: scoredHexes,
averageScore: averageScore ? parseFloat(averageScore) : null,
totalScore: totalScore,
totalMaxScore: totalMaxScore
  };
}
/**
 * Get class analytics for a map
 * Teacher/admin only
 *
 * @param {string} mapId - Map ID
 * @returns {Object} Class analytics
 */
function getClassAnalytics(mapId) {
requireRole(['administrator', 'teacher']);
if (!canViewMap(mapId)) {
throw new Error('You do not have permission to view this map');
  }
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
const allProgress = getAllProgressForMap(mapId);
const students = [...new Set(allProgress.map(p => p.email))];
const studentAnalytics = students.map(email =>
getStudentAnalytics(email, mapId)
  );
// Calculate class averages
const totalStudents = students.length;
const avgComplete = totalStudents > 0
    ? (studentAnalytics.reduce((sum, s) => sum + s.percentComplete, 0) / totalStudents).toFixed(1)
    : 0;
const studentsWithScores = studentAnalytics.filter(s => s.averageScore !== null);
const avgScore = studentsWithScores.length > 0
    ? (studentsWithScores.reduce((sum, s) => sum + s.averageScore, 0) / studentsWithScores.length).toFixed(1)
    : null;
return {
totalStudents: totalStudents,
totalHexes: map.hexes.length,
averageCompletion: parseFloat(avgComplete),
averageScore: avgScore ? parseFloat(avgScore) : null,
studentAnalytics: studentAnalytics
  };
}
// ============================================================================
// LESSON MAP PROGRESS AGGREGATION
// ============================================================================
/**
 * Get aggregated lesson progress summaries for all lesson hexes in a unit map.
 * For each lesson-type hex with a linkedMapId, reads the student's progress
 * on the linked lesson map and returns {total, completed, completionPct, status}.
 *
 * @param {string} unitMapId - The parent unit map ID
 * @param {string} [studentEmail] - Optional, defaults to current user
 * @returns {Object} { hexId: { total, completed, completionPct, status } }
 */
function getLessonProgressSummaries(unitMapId, studentEmail) {
  const user = getCurrentUser();
  const email = (studentEmail || user.email).toLowerCase();

  // Students can only view their own data
  if (user.normalizedRole === 'student' && email !== user.email.toLowerCase()) {
    throw new Error('Permission denied');
  }

  // Get the unit map — skip canViewMap() permission check since the student
  // is already viewing this map and this function is read-only
  const unitMapRow = findRow_(SHEETS_.MAPS, 'mapId', unitMapId);
  if (!unitMapRow) throw new Error('Map not found');
  const unitMap = parseMapFromRow_(unitMapRow);

  // Find lesson hexes with linked maps
  const lessonHexes = unitMap.hexes.filter(h => h.type === 'lesson' && h.linkedMapId);
  if (lessonHexes.length === 0) return {};

  // Batch-read all maps once to find lesson map hex counts
  const allMaps = readAll_(SHEETS_.MAPS);
  const mapLookup = {};
  for (let i = 0; i < allMaps.length; i++) {
    mapLookup[String(allMaps[i].mapId)] = allMaps[i];
  }

  // Batch-read all progress once, filter to this student
  const allProgress = readAll_(SHEETS_.PROGRESS);
  const studentProgress = {};  // mapId -> { hexId -> status }
  for (let p = 0; p < allProgress.length; p++) {
    if (String(allProgress[p].email).toLowerCase() !== email) continue;
    const mId = String(allProgress[p].mapId);
    if (!studentProgress[mId]) studentProgress[mId] = {};
    studentProgress[mId][String(allProgress[p].hexId)] = allProgress[p].status || 'not_started';
  }

  // Compute summary for each lesson hex
  const result = {};
  for (let lh = 0; lh < lessonHexes.length; lh++) {
    const hex = lessonHexes[lh];
    const linkedMapRow = mapLookup[String(hex.linkedMapId)];
    if (!linkedMapRow) continue;

    // Parse the lesson map's hexes
    const lessonMapHexes = safeJsonParse_(linkedMapRow.hexesJson, []);
    const total = lessonMapHexes.length;
    if (total === 0) {
      result[hex.id] = { total: 0, completed: 0, completionPct: 0, status: 'not_started' };
      continue;
    }

    // Count completed/mastered in student progress for this lesson map
    const progForMap = studentProgress[String(hex.linkedMapId)] || {};
    let completed = 0;
    for (let h = 0; h < lessonMapHexes.length; h++) {
      const st = progForMap[String(lessonMapHexes[h].id)] || 'not_started';
      if (st === 'completed' || st === 'mastered') completed++;
    }

    const pct = Math.round((completed / total) * 100);
    const status = completed === 0 ? 'not_started' : completed >= total ? 'completed' : 'in_progress';
    result[hex.id] = { total: total, completed: completed, completionPct: pct, status: status };
  }

  return result;
}

/**
 * Check if all hexes in a lesson map are completed/mastered.
 * If so, auto-complete the parent lesson hex in the unit map.
 * Called after a student updates progress on a hex within a lesson map.
 *
 * @param {string} lessonMapId - The lesson map that was just progressed
 * @param {string} [studentEmail] - Optional, defaults to current user
 * @returns {Object} { parentUpdated: boolean, parentMapId: string, parentHexId: string, parentHexLabel: string }
 */
function checkAndCompleteParentLessonHex(lessonMapId, studentEmail) {
  const user = getCurrentUser();
  const email = (studentEmail || user.email).toLowerCase();

  // Get the lesson map
  const lessonMap = getMapById(lessonMapId);
  if (!lessonMap) return { parentUpdated: false };

  // Check if it's a lesson map with parent info
  const meta = lessonMap.meta || {};
  if (!meta.isLessonMap || !meta.parentMapId || !meta.parentHexId) {
    return { parentUpdated: false };
  }

  // Get lesson map hexes
  const hexes = lessonMap.hexes || [];
  if (hexes.length === 0) return { parentUpdated: false };

  // Get student's progress for this lesson map
  const allProgress = readAll_(SHEETS_.PROGRESS);
  const progressForMap = {};
  for (let i = 0; i < allProgress.length; i++) {
    if (String(allProgress[i].email).toLowerCase() === email &&
        String(allProgress[i].mapId) === String(lessonMapId)) {
      progressForMap[String(allProgress[i].hexId)] = allProgress[i].status || 'not_started';
    }
  }

  // Check if ALL hexes are completed or mastered
  for (let h = 0; h < hexes.length; h++) {
    const st = progressForMap[String(hexes[h].id)] || 'not_started';
    if (st !== 'completed' && st !== 'mastered') {
      return { parentUpdated: false };
    }
  }

  // All complete! Check parent hex current status
  const parentHexStatus = progressForMap[String(meta.parentHexId)];
  // Check parent progress on the parent map (different map!)
  let parentAlreadyDone = false;
  for (let p = 0; p < allProgress.length; p++) {
    if (String(allProgress[p].email).toLowerCase() === email &&
        String(allProgress[p].mapId) === String(meta.parentMapId) &&
        String(allProgress[p].hexId) === String(meta.parentHexId)) {
      const pSt = allProgress[p].status;
      if (pSt === 'completed' || pSt === 'mastered') {
        parentAlreadyDone = true;
      }
      break;
    }
  }

  if (parentAlreadyDone) return { parentUpdated: false };

  // Get parent hex label
  const parentMap = getMapById(meta.parentMapId);
  let parentHexLabel = 'Lesson';
  if (parentMap && parentMap.hexes) {
    for (let ph = 0; ph < parentMap.hexes.length; ph++) {
      if (String(parentMap.hexes[ph].id) === String(meta.parentHexId)) {
        parentHexLabel = parentMap.hexes[ph].label || 'Lesson';
        break;
      }
    }
  }

  // Auto-complete the parent lesson hex
  try {
    updateStudentProgress(meta.parentMapId, meta.parentHexId, 'completed');
  } catch (e) {
    Logger.log('Auto-complete parent lesson hex failed: ' + e.message);
    return { parentUpdated: false };
  }

  return {
    parentUpdated: true,
    parentMapId: meta.parentMapId,
    parentHexId: meta.parentHexId,
    parentHexLabel: parentHexLabel
  };
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================
/**
 * Test updating progress
 */
function test_updateProgress() {
try {
const maps = getMaps();
if (maps.length === 0) {
Logger.log('No maps found.');
return;
    }
const map = maps[0];
if (map.hexes.length === 0) {
Logger.log('Map has no hexes.');
return;
    }
const progress = updateStudentProgress(
map.mapId,
map.hexes[0].id,
'in_progress'
    );
Logger.log('Updated progress:', progress);
  } catch (err) {
Logger.log('Error:', err.message);
  }
}
/**
 * Test getting progress
 */
function test_getProgress() {
try {
const maps = getMaps();
if (maps.length === 0) {
Logger.log('No maps found.');
return;
    }
const progress = getStudentProgress(maps[0].mapId);
Logger.log('Progress for map:', maps[0].title);
Logger.log('Progress records:', Object.keys(progress).length);
Logger.log('Progress:', progress);
  } catch (err) {
Logger.log('Error:', err.message);
  }
}
/**
 * Test student analytics
 */
function test_studentAnalytics() {
try {
const user = getCurrentUser();
const maps = getMaps();
if (maps.length === 0) {
Logger.log('No maps found.');
return;
    }
const analytics = getStudentAnalytics(user.email, maps[0].mapId);
Logger.log('Analytics for:', maps[0].title);
Logger.log('Total hexes:', analytics.totalHexes);
Logger.log('Percent complete:', analytics.percentComplete + '%');
Logger.log('Average score:', analytics.averageScore);
Logger.log('Status counts:', analytics.statusCounts);
  } catch (err) {
Logger.log('Error:', err.message);
  }
}