// ============================================================================
// ITERATION HISTORY SERVICE — Teacher-Gated Checkpoints
// Tracks submission attempts at checkpoint hexes with evidence + reflection.
// ES6 allowed in .gs files.
// ============================================================================

/**
 * Submit an iteration attempt at a checkpoint hex.
 * Creates a new IterationHistory row. Sets Progress to completed (pending review).
 *
 * @param {string} mapId
 * @param {string} hexId
 * @param {Object} data - { evidence: [{label, url}], reflectionNote, score, maxScore }
 * @returns {Object} { success, iterationId, iterationNumber }
 */
function submitIteration(mapId, hexId, data) {
  const user = getCurrentUser();
  if (user.canEdit) throw new Error('Only students can submit iterations');

  const email = user.email;
  if (!mapId || !hexId) throw new Error('Map ID and Hex ID are required');

  // Get next iteration number
  const existing = findRows_(SHEETS_.ITERATION_HISTORY, 'hexId', hexId)
    .filter(r => r.mapId === mapId && r.studentEmail === email);
  const nextNum = existing.length + 1;

  // Validate evidence URLs
  const evidence = (data.evidence || []).slice(0, 3).map(e => ({
    label: String(e.label || '').substring(0, 50),
    url: String(e.url || '').substring(0, 500)
  })).filter(e => {
    const u = e.url.trim();
    if (!u) return false;
    if (!/^https?:\/\//i.test(u)) throw new Error('Evidence URLs must start with http:// or https://');
    return true;
  });

  const row = {
    iterationId: generateIterationId_(),
    mapId: mapId,
    hexId: hexId,
    studentEmail: email,
    iterationNumber: nextNum,
    status: 'submitted',
    score: data.score || 0,
    maxScore: data.maxScore || 0,
    evidenceJson: JSON.stringify(evidence),
    reflectionNote: String(data.reflectionNote || '').substring(0, 500),
    teacherFeedback: '',
    teacherFeedbackAt: '',
    submittedAt: now_(),
    reviewedAt: '',
    reviewedBy: ''
  };

  appendRow_(SHEETS_.ITERATION_HISTORY, row);

  // Dual-write reflection to ProcessJournal for timeline visibility
  try {
    if (data.reflectionNote) {
      appendRow_(SHEETS_.PROCESS_JOURNAL, {
        journalId: generateJournalId_(),
        studentEmail: email,
        mapId: String(mapId),
        hexId: String(hexId),
        entryType: 'checkpoint',
        content: String(data.reflectionNote || '').substring(0, 1000),
        promptId: 'iteration_checkpoint',
        metadataJson: JSON.stringify({ sourceType: 'iteration', iterationNumber: nextNum }),
        createdAt: now_(),
        updatedAt: now_()
      });
    }
  } catch (e) {
    // Non-fatal: journal write failure must not break iteration submission
    Logger.log('ProcessJournal dual-write failed: ' + e.toString());
  }

  return { success: true, iterationId: row.iterationId, iterationNumber: nextNum };
}

/**
 * Get iteration history for a student at a specific hex.
 *
 * @param {string} mapId
 * @param {string} hexId
 * @param {string} [studentEmail] - optional, defaults to current user
 * @returns {Array} Iteration records sorted by iterationNumber
 */
function getIterationHistory(mapId, hexId, studentEmail) {
  const user = getCurrentUser();
  const email = studentEmail || user.email;

  // Students can only see their own history
  if (!user.canEdit && email !== user.email) {
    throw new Error('Access denied');
  }

  const rows = findRows_(SHEETS_.ITERATION_HISTORY, 'hexId', hexId)
    .filter(r => r.mapId === mapId && r.studentEmail === email);

  // Parse evidence JSON and sort
  return rows.map(r => ({
    iterationId: r.iterationId,
    mapId: r.mapId,
    hexId: r.hexId,
    studentEmail: r.studentEmail,
    iterationNumber: parseInt(r.iterationNumber) || 0,
    status: r.status,
    score: parseInt(r.score) || 0,
    maxScore: parseInt(r.maxScore) || 0,
    evidence: safeJsonParse_(r.evidenceJson, []),
    reflectionNote: r.reflectionNote || '',
    teacherFeedback: r.teacherFeedback || '',
    teacherFeedbackAt: r.teacherFeedbackAt || '',
    submittedAt: r.submittedAt || '',
    reviewedAt: r.reviewedAt || '',
    reviewedBy: r.reviewedBy || ''
  })).sort((a, b) => a.iterationNumber - b.iterationNumber);
}

/**
 * Teacher reviews an iteration: approve or request revision.
 *
 * @param {string} iterationId
 * @param {string} decision - 'approved' or 'revision_requested'
 * @param {string} feedback - Teacher feedback text
 * @returns {Object} { success }
 */
function reviewIteration(iterationId, decision, feedback, score, maxScore) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers can review iterations');

  if (decision !== 'approved' && decision !== 'revision_requested') {
    throw new Error('Invalid decision. Must be "approved" or "revision_requested"');
  }

  // Validate feedback length
  if (feedback && feedback.length > 1000) {
    throw new Error('Feedback must be 1000 characters or less');
  }

  const row = findRow_(SHEETS_.ITERATION_HISTORY, 'iterationId', iterationId);
  if (!row) throw new Error('Iteration not found');

  row.status = decision;
  row.teacherFeedback = String(feedback || '').substring(0, 1000);
  row.teacherFeedbackAt = now_();
  row.reviewedAt = now_();
  row.reviewedBy = user.email;

  // Write optional score to iteration row on approval
  if (decision === 'approved' && score !== undefined && score !== null) {
    const parsedScore = parseFloat(score);
    const parsedMax = parseFloat(maxScore);
    if (!isNaN(parsedScore) && !isNaN(parsedMax) && parsedMax > 0 && parsedScore >= 0 && parsedScore <= parsedMax) {
      row.score = parsedScore;
      row.maxScore = parsedMax;
    }
  }

  upsertRow_(SHEETS_.ITERATION_HISTORY, 'iterationId', row);

  // On approval, update Progress sheet (score + teacherApproved)
  if (decision === 'approved') {
    const progressUpdates = { teacherApproved: 'true' };
    if (row.score > 0 && row.maxScore > 0) {
      progressUpdates.score = String(row.score);
      progressUpdates.maxScore = String(row.maxScore);
    }
    try {
      updateRowByCompoundMatch_(SHEETS_.PROGRESS,
        { email: row.studentEmail, mapId: row.mapId, hexId: row.hexId },
        progressUpdates
      );
    } catch (e) {
      Logger.log('Progress update on iteration approve: ' + e.message);
    }
  }

  // If revision requested, reset Progress status to in_progress
  if (decision === 'revision_requested') {
    const progressRows = findRows_(SHEETS_.PROGRESS, 'hexId', row.hexId)
      .filter(r => r.mapId === row.mapId && r.email === row.studentEmail);
    if (progressRows.length > 0) {
      const pRow = progressRows[0];
      pRow.status = 'in_progress';
      pRow.teacherApproved = false;
      upsertRow_(SHEETS_.PROGRESS, 'progressId', pRow);
    }
  }

  // Create notification for student
  try {
    const notifType = decision === 'approved' ? 'approval_granted' : 'revision_requested';
    const notifTitle = decision === 'approved' ? 'Iteration Approved' : 'Revision Requested';
    const notifMessage = feedback ? notifTitle + ': ' + feedback.substring(0, 200) : notifTitle;
    createNotification_(row.studentEmail, notifType, notifTitle, notifMessage, user.email, row.mapId, row.hexId);
  } catch (e) {
    // Non-fatal
    Logger.log('Notification error: ' + e.message);
  }

  return { success: true };
}

/**
 * Get iteration summary for a map (teacher view).
 * Returns per-hex iteration counts for each student.
 *
 * @param {string} mapId
 * @returns {Object} { hexId: { studentEmail: { count, latestStatus } } }
 */
function getIterationSummaryForMap(mapId) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers can view iteration summaries');

  const rows = findRows_(SHEETS_.ITERATION_HISTORY, 'mapId', mapId);
  const summary = {};

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!summary[r.hexId]) summary[r.hexId] = {};
    if (!summary[r.hexId][r.studentEmail]) {
      summary[r.hexId][r.studentEmail] = { count: 0, latestStatus: '', maxNum: 0 };
    }
    summary[r.hexId][r.studentEmail].count++;
    // Track latest by highest iteration number
    const num = parseInt(r.iterationNumber) || 0;
    if (num > summary[r.hexId][r.studentEmail].maxNum) {
      summary[r.hexId][r.studentEmail].maxNum = num;
      summary[r.hexId][r.studentEmail].latestStatus = r.status;
    }
  }

  return summary;
}
