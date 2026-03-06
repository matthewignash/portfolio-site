/**
 * QuickPollService.gs
 * Quick Polls / Exit Tickets for Learning Map System
 *
 * Teachers launch quick MC or open-ended questions; students respond in real time
 * via a fixed bottom bar. Results display live on teacher overlay and optionally
 * in Projector Mode.
 *
 * Sheets: QuickPolls, QuickPollResponses
 */

const VALID_POLL_TYPES_ = ['mc', 'open'];
const VALID_POLL_STATUSES_ = ['active', 'closed'];

// ============================================================================
// 1. createQuickPoll
// ============================================================================

/**
 * Create a new quick poll for a class. Auto-closes any existing active poll
 * for the same teacher+class.
 *
 * @param {string} classId - Class to poll
 * @param {Object} pollData - { pollText, pollType, options[], correctOptionIndex, showResults, anonymousResults, mapId?, hexId? }
 * @returns {Object} Created poll object
 */
function createQuickPoll(classId, pollData) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  if (!classId) throw new Error('Class ID is required.');

  // Class ownership check (admin bypass)
  if (!user.isAdmin) {
    const cls = findRowsFiltered_(SHEETS_.CLASSES, { classId: String(classId) });
    if (cls.length === 0) throw new Error('Class not found.');
    if (String(cls[0].teacherEmail).toLowerCase() !== user.email.toLowerCase()) {
      throw new Error('You do not have permission to poll this class.');
    }
  }

  // Validate pollText
  const pollText = (pollData.pollText || '').trim();
  if (!pollText) throw new Error('Poll question is required.');
  if (pollText.length > 300) throw new Error('Question must be 300 characters or less.');

  // Validate pollType
  const pollType = (pollData.pollType || '').trim();
  if (VALID_POLL_TYPES_.indexOf(pollType) === -1) {
    throw new Error('Invalid poll type. Must be "mc" or "open".');
  }

  // Validate MC options
  let optionsArr = [];
  let correctOptionIndex = -1;
  if (pollType === 'mc') {
    if (!pollData.options || !Array.isArray(pollData.options)) {
      throw new Error('MC poll requires an options array.');
    }
    if (pollData.options.length < 2 || pollData.options.length > 5) {
      throw new Error('MC poll requires 2-5 options.');
    }
    for (let i = 0; i < pollData.options.length; i++) {
      const opt = String(pollData.options[i] || '').trim();
      if (!opt) throw new Error('Option ' + (i + 1) + ' cannot be empty.');
      if (opt.length > 100) throw new Error('Each option must be 100 characters or less.');
      optionsArr.push(opt);
    }
    // correctOptionIndex: -1 means no correct answer
    if (pollData.correctOptionIndex !== undefined && pollData.correctOptionIndex !== null && pollData.correctOptionIndex !== -1) {
      const idx = parseInt(pollData.correctOptionIndex, 10);
      if (isNaN(idx) || idx < 0 || idx >= optionsArr.length) {
        throw new Error('Correct option index out of range.');
      }
      correctOptionIndex = idx;
    }
  }

  const showResults = pollData.showResults === true;
  const anonymousResults = pollData.anonymousResults === true;
  const mapId = String(pollData.mapId || '');
  const hexId = String(pollData.hexId || '');
  const now = new Date().toISOString();

  // Auto-close any existing active poll for this teacher+class
  const existing = findRowsFiltered_(SHEETS_.QUICK_POLLS, { teacherEmail: user.email.toLowerCase(), classId: String(classId) });
  for (let e = 0; e < existing.length; e++) {
    if (String(existing[e].status) === 'active') {
      updateRowByCompoundMatch_(SHEETS_.QUICK_POLLS, {
        pollId: String(existing[e].pollId)
      }, {
        status: 'closed',
        closedAt: now,
        updatedAt: now
      });
    }
  }

  // Create poll
  const pollId = generatePollId_();
  const pollRow = {
    pollId: pollId,
    classId: String(classId),
    mapId: mapId,
    hexId: hexId,
    teacherEmail: user.email.toLowerCase(),
    pollText: pollText,
    pollType: pollType,
    optionsJson: pollType === 'mc' ? JSON.stringify(optionsArr) : '',
    correctOptionIndex: String(correctOptionIndex),
    showResults: showResults ? 'true' : 'false',
    anonymousResults: anonymousResults ? 'true' : 'false',
    status: 'active',
    respondentCount: '0',
    createdAt: now,
    closedAt: '',
    updatedAt: now
  };

  appendRow_(SHEETS_.QUICK_POLLS, pollRow);

  return {
    pollId: pollId,
    classId: String(classId),
    pollText: pollText,
    pollType: pollType,
    options: optionsArr,
    correctOptionIndex: correctOptionIndex,
    showResults: showResults,
    anonymousResults: anonymousResults,
    status: 'active',
    respondentCount: 0,
    createdAt: now
  };
}

// ============================================================================
// 2. getActivePollForStudent
// ============================================================================

/**
 * Get the active poll for a class.
 * - Teachers: returns own active poll with full data
 * - Students: validates roster membership, returns safe subset
 *
 * @param {string} classId - Class to check
 * @returns {Object|null} Poll data or null
 */
function getActivePollForStudent(classId) {
  if (!classId) return null;
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (user.canEdit) {
    // Teacher/admin: return own active poll for this class
    const polls = findRowsFiltered_(SHEETS_.QUICK_POLLS, {
      teacherEmail: email,
      classId: String(classId)
    });
    for (let i = 0; i < polls.length; i++) {
      if (String(polls[i].status) === 'active') {
        return buildPollResponse_(polls[i], true, false);
      }
    }
    return null;
  }

  // Student path: find teacher for this class
  const classes = findRowsFiltered_(SHEETS_.CLASSES, { classId: String(classId) });
  if (classes.length === 0) return null;

  const teacherEmail = String(classes[0].teacherEmail || '').toLowerCase();
  if (!teacherEmail) return null;

  // Validate student is in this class
  const roster = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { classId: String(classId) });
  let isInClass = false;
  for (let r = 0; r < roster.length; r++) {
    const studentEmail = String(roster[r].studentEmail || roster[r].email || '').toLowerCase();
    if (studentEmail === email && String(roster[r].status) !== 'removed') {
      isInClass = true;
      break;
    }
  }
  if (!isInClass) return null;

  // Find active poll from this class's teacher
  const polls = findRowsFiltered_(SHEETS_.QUICK_POLLS, {
    teacherEmail: teacherEmail,
    classId: String(classId)
  });
  for (let i = 0; i < polls.length; i++) {
    if (String(polls[i].status) === 'active') {
      const poll = polls[i];
      const pollId = String(poll.pollId);

      // Check if student already responded
      const responses = findRowsFiltered_(SHEETS_.QUICK_POLL_RESPONSES, { pollId: pollId, studentEmail: email });
      const hasResponded = responses.length > 0;

      // Build student-safe return
      const result = {
        pollId: pollId,
        classId: String(classId),
        pollText: String(poll.pollText || ''),
        pollType: String(poll.pollType || 'mc'),
        options: qpParseJson_(poll.optionsJson, []),
        showResults: String(poll.showResults) === 'true',
        hasResponded: hasResponded,
        respondentCount: parseInt(poll.respondentCount, 10) || 0
      };

      // Include correctOptionIndex only after responding
      if (hasResponded) {
        const idx = parseInt(poll.correctOptionIndex, 10);
        result.correctOptionIndex = isNaN(idx) ? -1 : idx;
      }

      // Include results only if showResults && student has responded
      if (result.showResults && hasResponded && result.pollType === 'mc') {
        result.results = computeMcResults_(pollId, result.options);
      }

      return result;
    }
  }
  return null;
}

// ============================================================================
// 3. submitPollResponse
// ============================================================================

/**
 * Submit a student's response to an active poll.
 *
 * @param {string} pollId - Poll ID
 * @param {Object} responseData - { selectedOptionIndex (MC) or responseText (open) }
 * @returns {Object} { success: true }
 */
function submitPollResponse(pollId, responseData) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!pollId) throw new Error('Poll ID is required.');

  // Find poll
  const polls = findRowsFiltered_(SHEETS_.QUICK_POLLS, { pollId: String(pollId) });
  if (polls.length === 0) throw new Error('Poll not found.');
  const poll = polls[0];

  if (String(poll.status) !== 'active') throw new Error('This poll is no longer active.');

  // Validate student is in poll's class roster
  const classId = String(poll.classId);
  const roster = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { classId: classId });
  let isInClass = false;
  for (let r = 0; r < roster.length; r++) {
    const studentEmail = String(roster[r].studentEmail || roster[r].email || '').toLowerCase();
    if (studentEmail === email && String(roster[r].status) !== 'removed') {
      isInClass = true;
      break;
    }
  }
  if (!isInClass) throw new Error('You are not in this class.');

  // Prevent duplicate response
  const existing = findRowsFiltered_(SHEETS_.QUICK_POLL_RESPONSES, { pollId: String(pollId), studentEmail: email });
  if (existing.length > 0) throw new Error('You have already responded to this poll.');

  const pollType = String(poll.pollType || 'mc');
  let selectedOptionIndex = -1;
  let responseText = '';

  if (pollType === 'mc') {
    const idx = parseInt(responseData.selectedOptionIndex, 10);
    const options = qpParseJson_(poll.optionsJson, []);
    if (isNaN(idx) || idx < 0 || idx >= options.length) {
      throw new Error('Please select a valid option.');
    }
    selectedOptionIndex = idx;
  } else {
    responseText = String(responseData.responseText || '').trim();
    if (!responseText) throw new Error('Please enter a response.');
    if (responseText.length > 500) throw new Error('Response must be 500 characters or less.');
  }

  const now = new Date().toISOString();
  const responseId = generatePollResponseId_();

  appendRow_(SHEETS_.QUICK_POLL_RESPONSES, {
    responseId: responseId,
    pollId: String(pollId),
    studentEmail: email,
    selectedOptionIndex: String(selectedOptionIndex),
    responseText: responseText,
    submittedAt: now
  });

  // Increment respondent count
  updateRowByCompoundMatch_(SHEETS_.QUICK_POLLS, { pollId: String(pollId) }, {
    respondentCount: String((parseInt(poll.respondentCount, 10) || 0) + 1),
    updatedAt: now
  });

  return { success: true };
}

// ============================================================================
// 4. getPollResults
// ============================================================================

/**
 * Get full results for a poll. Teacher/admin only.
 *
 * @param {string} pollId - Poll ID
 * @returns {Object} { poll, responses, summary }
 */
function getPollResults(pollId) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  if (!pollId) throw new Error('Poll ID is required.');

  const polls = findRowsFiltered_(SHEETS_.QUICK_POLLS, { pollId: String(pollId) });
  if (polls.length === 0) throw new Error('Poll not found.');
  const poll = polls[0];

  // Ownership check (admin bypass)
  if (!user.isAdmin && String(poll.teacherEmail).toLowerCase() !== user.email.toLowerCase()) {
    throw new Error('You do not own this poll.');
  }

  const responses = findRowsFiltered_(SHEETS_.QUICK_POLL_RESPONSES, { pollId: String(pollId) });
  const pollType = String(poll.pollType || 'mc');
  const options = qpParseJson_(poll.optionsJson, []);
  const anonymousResults = String(poll.anonymousResults) === 'true';

  const responseList = [];
  for (let i = 0; i < responses.length; i++) {
    const r = responses[i];
    const item = {
      responseId: String(r.responseId),
      selectedOptionIndex: parseInt(r.selectedOptionIndex, 10),
      responseText: String(r.responseText || ''),
      submittedAt: String(r.submittedAt || '')
    };
    if (!anonymousResults) {
      item.studentEmail = String(r.studentEmail || '');
    }
    responseList.push(item);
  }

  // Compute summary
  let summary = {};
  if (pollType === 'mc') {
    summary = computeMcResults_(String(pollId), options);
  } else {
    summary = { totalResponses: responses.length };
  }

  return {
    poll: buildPollResponse_(poll, true, false),
    responses: responseList,
    summary: summary
  };
}

// ============================================================================
// 5. closePoll
// ============================================================================

/**
 * Close an active poll. Teacher/admin only.
 *
 * @param {string} pollId - Poll ID
 * @returns {Object} Updated poll
 */
function closePoll(pollId) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  if (!pollId) throw new Error('Poll ID is required.');

  const polls = findRowsFiltered_(SHEETS_.QUICK_POLLS, { pollId: String(pollId) });
  if (polls.length === 0) throw new Error('Poll not found.');
  const poll = polls[0];

  if (!user.isAdmin && String(poll.teacherEmail).toLowerCase() !== user.email.toLowerCase()) {
    throw new Error('You do not own this poll.');
  }

  if (String(poll.status) !== 'active') throw new Error('Poll is not active.');

  const now = new Date().toISOString();
  updateRowByCompoundMatch_(SHEETS_.QUICK_POLLS, { pollId: String(pollId) }, {
    status: 'closed',
    closedAt: now,
    updatedAt: now
  });

  return { pollId: String(pollId), status: 'closed', closedAt: now };
}

// ============================================================================
// 6. getTeacherPollHistory
// ============================================================================

/**
 * Get recent closed polls for a class. Teacher/admin only.
 *
 * @param {string} classId - Class ID
 * @param {number} [limit=10] - Max results
 * @returns {Array} Poll summaries sorted by createdAt desc
 */
function getTeacherPollHistory(classId, limit) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  if (!classId) return [];

  const maxResults = Math.min(parseInt(limit, 10) || 10, 50);

  const polls = findRowsFiltered_(SHEETS_.QUICK_POLLS, {
    teacherEmail: user.email.toLowerCase(),
    classId: String(classId)
  });

  // Filter to closed, sort by createdAt desc
  const closed = [];
  for (let i = 0; i < polls.length; i++) {
    if (String(polls[i].status) === 'closed') {
      closed.push(polls[i]);
    }
  }
  closed.sort(function(a, b) {
    return (String(b.createdAt || '') > String(a.createdAt || '')) ? 1 : -1;
  });

  const result = [];
  for (let i = 0; i < Math.min(closed.length, maxResults); i++) {
    const p = closed[i];
    result.push({
      pollId: String(p.pollId),
      pollText: String(p.pollText || ''),
      pollType: String(p.pollType || 'mc'),
      respondentCount: parseInt(p.respondentCount, 10) || 0,
      createdAt: String(p.createdAt || ''),
      closedAt: String(p.closedAt || '')
    });
  }
  return result;
}

// ============================================================================
// 7. deletePoll
// ============================================================================

/**
 * Delete a poll and all its responses. Teacher/admin only.
 *
 * @param {string} pollId - Poll ID
 * @returns {Object} { success: true }
 */
function deletePoll(pollId) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  if (!pollId) throw new Error('Poll ID is required.');

  const polls = findRowsFiltered_(SHEETS_.QUICK_POLLS, { pollId: String(pollId) });
  if (polls.length === 0) throw new Error('Poll not found.');

  if (!user.isAdmin && String(polls[0].teacherEmail).toLowerCase() !== user.email.toLowerCase()) {
    throw new Error('You do not own this poll.');
  }

  // Cascade delete responses + poll
  batchDeleteRows_([
    { sheetName: SHEETS_.QUICK_POLL_RESPONSES, matchField: 'pollId', matchValue: String(pollId) },
    { sheetName: SHEETS_.QUICK_POLLS, matchField: 'pollId', matchValue: String(pollId) }
  ]);

  return { success: true };
}

// ============================================================================
// Private helpers
// ============================================================================

/**
 * Build a poll response object.
 *
 * @param {Object} row - Raw sheet row
 * @param {boolean} includeTeacherEmail - Whether to include teacherEmail
 * @param {boolean} includeResults - Whether to include results summary
 * @returns {Object} Poll object
 */
function buildPollResponse_(row, includeTeacherEmail, includeResults) {
  const options = qpParseJson_(row.optionsJson, []);
  const idx = parseInt(row.correctOptionIndex, 10);
  const result = {
    pollId: String(row.pollId),
    classId: String(row.classId || ''),
    mapId: String(row.mapId || ''),
    hexId: String(row.hexId || ''),
    pollText: String(row.pollText || ''),
    pollType: String(row.pollType || 'mc'),
    options: options,
    correctOptionIndex: isNaN(idx) ? -1 : idx,
    showResults: String(row.showResults) === 'true',
    anonymousResults: String(row.anonymousResults) === 'true',
    status: String(row.status || 'active'),
    respondentCount: parseInt(row.respondentCount, 10) || 0,
    createdAt: String(row.createdAt || ''),
    closedAt: String(row.closedAt || '')
  };
  if (includeTeacherEmail) {
    result.teacherEmail = String(row.teacherEmail || '');
  }
  return result;
}

/**
 * Compute MC result summary (per-option counts).
 *
 * @param {string} pollId - Poll ID
 * @param {Array} options - Option text array
 * @returns {Object} { optionCounts: number[], totalResponses: number }
 */
function computeMcResults_(pollId, options) {
  const responses = findRowsFiltered_(SHEETS_.QUICK_POLL_RESPONSES, { pollId: pollId });
  const optionCounts = [];
  for (let i = 0; i < options.length; i++) {
    optionCounts.push(0);
  }
  for (let r = 0; r < responses.length; r++) {
    const idx = parseInt(responses[r].selectedOptionIndex, 10);
    if (!isNaN(idx) && idx >= 0 && idx < optionCounts.length) {
      optionCounts[idx]++;
    }
  }
  return { optionCounts: optionCounts, totalResponses: responses.length };
}

/**
 * Safe JSON parse with fallback.
 *
 * @param {*} val - Value to parse
 * @param {*} fallback - Fallback value
 * @returns {*} Parsed value or fallback
 */
function qpParseJson_(val, fallback) {
  if (!val || val === '') return fallback;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}
