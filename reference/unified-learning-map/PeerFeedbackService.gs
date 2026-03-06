// ============================================================================
// PEER FEEDBACK SERVICE — Structured peer review at PBL hexes
// ES6 allowed in .gs files.
// ============================================================================

/**
 * Get a random peer who needs reviews for a specific hex.
 * Excludes: self, already-reviewed authors.
 *
 * @param {string} mapId
 * @param {string} hexId
 * @returns {Object|null} { email, name } or null if no peers available
 */
function getAvailablePeerForReview(mapId, hexId) {
  const user = getCurrentUser();
  const email = user.email;

  // Get all students who have submitted iterations at this hex
  const iterations = findRows_(SHEETS_.ITERATION_HISTORY, 'hexId', hexId)
    .filter(r => r.mapId === mapId && r.status !== 'revision_requested');

  // Get unique author emails (excluding self)
  const authorEmails = {};
  for (let i = 0; i < iterations.length; i++) {
    if (iterations[i].studentEmail !== email) {
      authorEmails[iterations[i].studentEmail] = true;
    }
  }

  // Get existing reviews by this reviewer for this hex
  const existingReviews = findRows_(SHEETS_.PEER_FEEDBACK, 'hexId', hexId)
    .filter(r => r.mapId === mapId && r.reviewerEmail === email);

  const reviewedAuthors = {};
  for (let j = 0; j < existingReviews.length; j++) {
    reviewedAuthors[existingReviews[j].authorEmail] = true;
  }

  // Filter to authors not yet reviewed
  const availableAuthors = Object.keys(authorEmails).filter(e => !reviewedAuthors[e]);
  if (availableAuthors.length === 0) return null;

  // Random selection
  const randomIdx = Math.floor(Math.random() * availableAuthors.length);
  const selectedEmail = availableAuthors[randomIdx];

  // Try to get name from roster
  let name = selectedEmail;
  try {
    const roster = readAll_(SHEETS_.CLASS_ROSTER);
    for (let k = 0; k < roster.length; k++) {
      if (roster[k].studentEmail === selectedEmail) {
        name = roster[k].studentName || selectedEmail;
        break;
      }
    }
  } catch (e) { /* fallback to email */ }

  return { email: selectedEmail, name: name };
}

/**
 * Submit peer feedback for a classmate's work.
 *
 * @param {string} mapId
 * @param {string} hexId
 * @param {string} authorEmail - The student being reviewed
 * @param {Object} data - { ratings: [{criterion, rating, comment}], comment, isAnonymous }
 * @returns {Object} { success, feedbackId }
 */
function submitPeerFeedback(mapId, hexId, authorEmail, data) {
  const user = getCurrentUser();
  if (user.canEdit) throw new Error('Only students can submit peer feedback');
  if (user.email === authorEmail) throw new Error('Cannot review your own work');
  if (!mapId || !hexId || !authorEmail) throw new Error('Missing required fields');

  // Validate ratings (max 3 criteria, rating 1-4)
  const ratings = (data.ratings || []).slice(0, 3).map(r => ({
    criterion: String(r.criterion || '').substring(0, 100),
    rating: Math.max(1, Math.min(4, parseInt(r.rating) || 1)),
    comment: String(r.comment || '').substring(0, 200)
  }));

  // Look up author's latest iteration number (non-fatal)
  let iterNum = 0;
  try {
    const itrRows = findRowsFiltered_(SHEETS_.ITERATION_HISTORY, {
      studentEmail: authorEmail, mapId: mapId, hexId: hexId
    });
    if (itrRows.length > 0) {
      iterNum = Math.max.apply(null, itrRows.map(r => parseInt(r.iterationNumber) || 0));
    }
  } catch (e) {
    Logger.log('Peer feedback iteration lookup: ' + e.message);
  }

  const row = {
    feedbackId: generateFeedbackId_(),
    mapId: mapId,
    hexId: hexId,
    reviewerEmail: user.email,
    authorEmail: authorEmail,
    iterationNumber: iterNum,
    ratingsJson: JSON.stringify(ratings),
    comment: String(data.comment || '').substring(0, 500),
    isAnonymous: data.isAnonymous === true,
    createdAt: now_(),
    isHelpful: ''
  };

  appendRow_(SHEETS_.PEER_FEEDBACK, row);

  // Notify the author
  try {
    const reviewerName = data.isAnonymous ? 'Anonymous peer' : user.email;
    createNotification_(authorEmail, 'peer_feedback_received', 'New Peer Feedback',
      reviewerName + ' reviewed your work', user.email, mapId, hexId);
  } catch (e) {
    Logger.log('Peer feedback notification error: ' + e.message);
  }

  return { success: true, feedbackId: row.feedbackId };
}

/**
 * Get peer feedback received for a student at a hex.
 *
 * @param {string} mapId
 * @param {string} hexId
 * @param {string} [studentEmail]
 * @returns {Array} Feedback records
 */
function getPeerFeedbackForHex(mapId, hexId, studentEmail) {
  const user = getCurrentUser();
  const email = studentEmail || user.email;

  // Students can only see feedback for themselves
  if (!user.canEdit && email !== user.email) throw new Error('Access denied');

  const rows = findRows_(SHEETS_.PEER_FEEDBACK, 'hexId', hexId)
    .filter(r => r.mapId === mapId && r.authorEmail === email);

  return rows.map(r => ({
    feedbackId: r.feedbackId,
    reviewerEmail: r.isAnonymous === true || r.isAnonymous === 'true' ? '' : r.reviewerEmail,
    isAnonymous: r.isAnonymous === true || r.isAnonymous === 'true',
    ratings: safeJsonParse_(r.ratingsJson, []),
    comment: r.comment || '',
    createdAt: r.createdAt || '',
    isHelpful: r.isHelpful === true || r.isHelpful === 'true'
  }));
}

/**
 * Get feedback given by a student.
 *
 * @param {string} mapId
 * @param {string} hexId
 * @returns {Array} Feedback records given by current user
 */
function getPeerFeedbackGiven(mapId, hexId) {
  const user = getCurrentUser();
  const rows = findRows_(SHEETS_.PEER_FEEDBACK, 'hexId', hexId)
    .filter(r => r.mapId === mapId && r.reviewerEmail === user.email);

  return rows.map(r => ({
    feedbackId: r.feedbackId,
    authorEmail: r.authorEmail,
    ratings: safeJsonParse_(r.ratingsJson, []),
    comment: r.comment || '',
    createdAt: r.createdAt || ''
  }));
}

/**
 * Mark peer feedback as helpful (author toggle).
 *
 * @param {string} feedbackId
 * @param {boolean} helpful
 * @returns {Object} { success }
 */
function markFeedbackHelpful(feedbackId, helpful) {
  const user = getCurrentUser();
  const row = findRow_(SHEETS_.PEER_FEEDBACK, 'feedbackId', feedbackId);
  if (!row) throw new Error('Feedback not found');
  if (row.authorEmail !== user.email && !user.canEdit) throw new Error('Access denied');

  row.isHelpful = helpful === true;
  upsertRow_(SHEETS_.PEER_FEEDBACK, 'feedbackId', row);
  return { success: true };
}

/**
 * Get peer feedback summary for a map (teacher view).
 *
 * @param {string} mapId
 * @returns {Object} Summary stats
 */
function getPeerFeedbackSummaryForMap(mapId) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers can view feedback summaries');

  const rows = findRows_(SHEETS_.PEER_FEEDBACK, 'mapId', mapId);
  const totalReviews = rows.length;
  let helpfulCount = 0;
  const reviewerCounts = {};

  for (let i = 0; i < rows.length; i++) {
    if (rows[i].isHelpful === true || rows[i].isHelpful === 'true') helpfulCount++;
    reviewerCounts[rows[i].reviewerEmail] = (reviewerCounts[rows[i].reviewerEmail] || 0) + 1;
  }

  return {
    totalReviews: totalReviews,
    helpfulRate: totalReviews > 0 ? Math.round((helpfulCount / totalReviews) * 100) : 0,
    uniqueReviewers: Object.keys(reviewerCounts).length,
    reviewerCounts: reviewerCounts
  };
}
