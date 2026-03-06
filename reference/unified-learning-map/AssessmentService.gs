/**
 * AssessmentService.gs
 * Embedded Formative Assessment Engine for Learning Map System
 *
 * Handles auto-grading of 4 question types (MC, short answer, matching, ordering),
 * student submission with configurable retry limits, and teacher analytics.
 *
 * Assessment definitions are stored as JSON on each hex (assessmentJson field).
 * Student responses are stored in the AssessmentResponses sheet.
 *
 * Sheet: AssessmentResponses
 * Schema: responseId, mapId, hexId, studentEmail, attemptNumber, totalScore,
 *         maxScore, scorePct, passed, responsesJson, submittedAt
 */

// Allowed question types
const ASSESSMENT_QUESTION_TYPES_ = [
  'multiple_choice', 'short_answer', 'matching', 'ordering'
];

/**
 * Submit a student assessment attempt.
 * Auto-grades all questions, writes response record, updates progress.
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID (must have assessmentJson)
 * @param {string} answersJson - JSON string of student answers array
 * @returns {Object} { responseId, totalScore, maxScore, scorePct, passed, perQuestion, attemptsUsed, attemptsRemaining, unlockedHexes }
 */
function submitAssessment(mapId, hexId, answersJson) {
  const user = getCurrentUser();
  if (!mapId || !hexId) throw new Error('Map ID and Hex ID are required.');

  // Get map and hex
  const map = getMapById(mapId);
  if (!map) throw new Error('Map not found.');

  let hex = null;
  for (let i = 0; i < map.hexes.length; i++) {
    if (String(map.hexes[i].id) === String(hexId)) {
      hex = map.hexes[i];
      break;
    }
  }
  if (!hex) throw new Error('Hex not found in map.');

  // Validate assessment exists on hex
  const assessment = safeJsonParse_(hex.assessmentJson, null);
  if (!assessment || !assessment.questions || assessment.questions.length === 0) {
    throw new Error('No assessment found on this hex.');
  }

  // Validate question structure
  for (let q = 0; q < assessment.questions.length; q++) {
    const question = assessment.questions[q];
    if (!question.questionId || !question.type) {
      throw new Error('Invalid assessment: question ' + (q + 1) + ' is missing required fields.');
    }
    if (ASSESSMENT_QUESTION_TYPES_.indexOf(question.type) === -1) {
      throw new Error('Invalid question type: ' + question.type);
    }
  }

  // Parse student answers
  const answers = safeJsonParse_(answersJson, null);
  if (!answers || !Array.isArray(answers)) {
    throw new Error('Invalid answers format.');
  }

  // Check attempt count
  const attemptCount = getAttemptCount_(mapId, hexId, user.email);
  const maxAttempts = assessment.maxAttempts || 0; // 0 = unlimited
  if (maxAttempts > 0 && attemptCount >= maxAttempts) {
    throw new Error('Maximum attempts (' + maxAttempts + ') reached for this assessment.');
  }

  // Grade the assessment
  const gradeResult = gradeAssessment_(assessment, answers);

  // Determine if passed
  const passingScorePct = assessment.passingScorePct || 70;
  const passed = gradeResult.scorePct >= passingScorePct;

  const now = new Date().toISOString();
  const newAttemptNumber = attemptCount + 1;
  const attemptsRemaining = maxAttempts > 0 ? maxAttempts - newAttemptNumber : -1; // -1 = unlimited

  // Build response record
  const record = {
    responseId: generateResponseId_(),
    mapId: String(mapId),
    hexId: String(hexId),
    studentEmail: user.email,
    attemptNumber: newAttemptNumber,
    totalScore: gradeResult.totalScore,
    maxScore: gradeResult.maxScore,
    scorePct: Math.round(gradeResult.scorePct * 100) / 100,
    passed: passed,
    responsesJson: JSON.stringify(gradeResult.perQuestion),
    submittedAt: now
  };

  // Write response to sheet — appendRow_ is atomic, no lock needed for inserts
  appendRow_(SHEETS_.ASSESSMENT_RESPONSES, record);

  // Update student progress with score
  let unlockedHexes = [];
  if (passed) {
    updateStudentProgress(mapId, hexId, 'completed', gradeResult.totalScore, gradeResult.maxScore);
    const autoResult = autoProgressStudent(mapId, hexId, user.email);
    if (autoResult && autoResult.unlockedHexes) {
      unlockedHexes = autoResult.unlockedHexes;
    }
  } else {
    // Update score on progress but keep in_progress
    updateStudentProgress(mapId, hexId, 'in_progress', gradeResult.totalScore, gradeResult.maxScore);
  }

  return {
    responseId: record.responseId,
    totalScore: gradeResult.totalScore,
    maxScore: gradeResult.maxScore,
    scorePct: record.scorePct,
    passed: passed,
    perQuestion: gradeResult.perQuestion,
    attemptsUsed: newAttemptNumber,
    attemptsRemaining: attemptsRemaining,
    unlockedHexes: unlockedHexes
  };
}

/**
 * Get all assessment responses for a student on a specific hex.
 * Teachers/admins can query any student; students can only query self.
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {string} studentEmail - (optional) Student email, defaults to current user
 * @returns {Array<Object>} Responses sorted by attemptNumber desc, with parsed responsesJson
 */
function getAssessmentResponses(mapId, hexId, studentEmail) {
  const user = getCurrentUser();
  const email = studentEmail || user.email;

  // Permission check: students can only view their own
  if (email !== user.email && !user.canEdit) {
    throw new Error('You can only view your own assessment responses.');
  }

  const allResponses = readAll_(SHEETS_.ASSESSMENT_RESPONSES);
  const filtered = [];

  for (let i = 0; i < allResponses.length; i++) {
    const r = allResponses[i];
    if (String(r.mapId) === String(mapId) &&
        String(r.hexId) === String(hexId) &&
        String(r.studentEmail) === String(email)) {
      r.studentResults = safeJsonParse_(r.responsesJson, []);
      filtered.push(r);
    }
  }

  // Sort by attemptNumber descending (most recent first)
  filtered.sort(function(a, b) {
    return Number(b.attemptNumber) - Number(a.attemptNumber);
  });

  return filtered;
}

/**
 * Get aggregated assessment results for a hex (teacher analytics).
 * Teacher/admin only.
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @returns {Object} { totalStudents, totalAttempts, passRate, avgScore, questionAnalytics, studentResults }
 */
function getAssessmentResultsForHex(mapId, hexId) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers/admins can view assessment results.');

  const allResponses = readAll_(SHEETS_.ASSESSMENT_RESPONSES);
  const hexResponses = [];

  for (let i = 0; i < allResponses.length; i++) {
    if (String(allResponses[i].mapId) === String(mapId) &&
        String(allResponses[i].hexId) === String(hexId)) {
      hexResponses.push(allResponses[i]);
    }
  }

  if (hexResponses.length === 0) {
    return { totalStudents: 0, totalAttempts: 0, passRate: 0, avgScore: 0, questionAnalytics: [], studentResults: [] };
  }

  // Group by student — find best attempt per student
  const studentMap = {};
  let totalScoreSum = 0;
  let passedCount = 0;

  for (let i = 0; i < hexResponses.length; i++) {
    const r = hexResponses[i];
    const email = String(r.studentEmail);
    if (!studentMap[email]) {
      studentMap[email] = { email: email, attempts: 0, bestScore: 0, passed: false };
    }
    studentMap[email].attempts++;
    const scorePct = Number(r.scorePct) || 0;
    if (scorePct > studentMap[email].bestScore) {
      studentMap[email].bestScore = scorePct;
    }
    if (r.passed === true || r.passed === 'true') {
      studentMap[email].passed = true;
    }
    totalScoreSum += scorePct;
  }

  const studentEmails = Object.keys(studentMap);
  for (let j = 0; j < studentEmails.length; j++) {
    if (studentMap[studentEmails[j]].passed) passedCount++;
  }

  // Per-question analytics from most recent attempts
  const questionStats = {};
  for (let i = 0; i < hexResponses.length; i++) {
    const perQ = safeJsonParse_(hexResponses[i].responsesJson, []);
    for (let q = 0; q < perQ.length; q++) {
      const qId = perQ[q].questionId;
      if (!questionStats[qId]) {
        questionStats[qId] = { questionId: qId, questionType: perQ[q].questionType, correctCount: 0, totalCount: 0 };
      }
      questionStats[qId].totalCount++;
      if (perQ[q].isCorrect) questionStats[qId].correctCount++;
    }
  }

  const questionAnalytics = [];
  const qIds = Object.keys(questionStats);
  for (let k = 0; k < qIds.length; k++) {
    const qs = questionStats[qIds[k]];
    questionAnalytics.push({
      questionId: qs.questionId,
      questionType: qs.questionType,
      correctRate: qs.totalCount > 0 ? Math.round((qs.correctCount / qs.totalCount) * 100) : 0
    });
  }

  const studentResults = [];
  for (let s = 0; s < studentEmails.length; s++) {
    studentResults.push(studentMap[studentEmails[s]]);
  }

  return {
    totalStudents: studentEmails.length,
    totalAttempts: hexResponses.length,
    passRate: studentEmails.length > 0 ? Math.round((passedCount / studentEmails.length) * 100) : 0,
    avgScore: hexResponses.length > 0 ? Math.round(totalScoreSum / hexResponses.length) : 0,
    questionAnalytics: questionAnalytics,
    studentResults: studentResults
  };
}

/**
 * Get assessment results summary for all hexes in a map.
 * Teacher/admin only.
 *
 * @param {string} mapId - Map ID
 * @returns {Object} { hexId: { title, totalAttempts, passRate, avgScore } }
 */
function getAssessmentResultsForMap(mapId) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers/admins can view assessment results.');

  const allResponses = readAll_(SHEETS_.ASSESSMENT_RESPONSES);
  const byHex = {};

  for (let i = 0; i < allResponses.length; i++) {
    if (String(allResponses[i].mapId) === String(mapId)) {
      const hid = String(allResponses[i].hexId);
      if (!byHex[hid]) {
        byHex[hid] = { responses: [], students: {} };
      }
      byHex[hid].responses.push(allResponses[i]);
      const email = String(allResponses[i].studentEmail);
      if (!byHex[hid].students[email]) {
        byHex[hid].students[email] = { passed: false };
      }
      if (allResponses[i].passed === true || allResponses[i].passed === 'true') {
        byHex[hid].students[email].passed = true;
      }
    }
  }

  // Get hex titles from map
  const map = getMapById(mapId);
  const hexTitleMap = {};
  if (map && map.hexes) {
    for (let j = 0; j < map.hexes.length; j++) {
      hexTitleMap[String(map.hexes[j].id)] = map.hexes[j].label || '';
    }
  }

  const result = {};
  const hexIds = Object.keys(byHex);
  for (let k = 0; k < hexIds.length; k++) {
    const hid = hexIds[k];
    const data = byHex[hid];
    const studentEmails = Object.keys(data.students);
    let passedCount = 0;
    let scoreSum = 0;

    for (let r = 0; r < data.responses.length; r++) {
      scoreSum += Number(data.responses[r].scorePct) || 0;
    }
    for (let s = 0; s < studentEmails.length; s++) {
      if (data.students[studentEmails[s]].passed) passedCount++;
    }

    result[hid] = {
      title: hexTitleMap[hid] || '',
      totalAttempts: data.responses.length,
      passRate: studentEmails.length > 0 ? Math.round((passedCount / studentEmails.length) * 100) : 0,
      avgScore: data.responses.length > 0 ? Math.round(scoreSum / data.responses.length) : 0
    };
  }

  return result;
}

/**
 * Delete all assessment responses for a student on a specific hex.
 * Teacher/admin only. Used to reset a student's attempts.
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {string} studentEmail - Student email to reset
 * @returns {Object} { success: true, deletedCount: number }
 */
function deleteAssessmentResponses(mapId, hexId, studentEmail) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers/admins can reset assessment attempts.');
  if (!mapId || !hexId || !studentEmail) throw new Error('Map ID, Hex ID, and student email are required.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const allResponses = readAll_(SHEETS_.ASSESSMENT_RESPONSES);
    const filtered = [];
    let deletedCount = 0;

    for (let i = 0; i < allResponses.length; i++) {
      if (String(allResponses[i].mapId) === String(mapId) &&
          String(allResponses[i].hexId) === String(hexId) &&
          String(allResponses[i].studentEmail) === String(studentEmail)) {
        deletedCount++;
      } else {
        filtered.push(allResponses[i]);
      }
    }

    if (deletedCount === 0) {
      return { success: true, deletedCount: 0 };
    }

    if (filtered.length > 0) {
      writeAll_(SHEETS_.ASSESSMENT_RESPONSES, filtered);
    } else {
      // Clear sheet but keep headers
      const sheet = getSheet_(SHEETS_.ASSESSMENT_RESPONSES);
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
    }

    return { success: true, deletedCount: deletedCount };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// PRIVATE: GRADING ENGINE
// ============================================================================

/**
 * Grade an assessment submission.
 * Dispatches grading to type-specific handlers.
 *
 * @param {Object} assessmentDef - Assessment definition from hex.assessmentJson
 * @param {Array} answersArray - Student answers [{questionId, answer}]
 * @returns {Object} { totalScore, maxScore, scorePct, perQuestion: [{questionId, questionType, studentAnswer, correctAnswer, isCorrect, pointsEarned, pointsPossible}] }
 */
function gradeAssessment_(assessmentDef, answersArray) {
  const questions = assessmentDef.questions || [];
  const perQuestion = [];
  let totalScore = 0;
  let maxScore = 0;

  // Index answers by questionId for fast lookup
  const answerMap = {};
  for (let i = 0; i < answersArray.length; i++) {
    answerMap[answersArray[i].questionId] = answersArray[i].answer;
  }

  for (let q = 0; q < questions.length; q++) {
    const question = questions[q];
    const points = Number(question.points) || 1;
    maxScore += points;

    const studentAnswer = answerMap[question.questionId];
    let result;

    switch (question.type) {
      case 'multiple_choice':
        result = gradeMcQuestion_(question, studentAnswer, points);
        break;
      case 'short_answer':
        result = gradeSaQuestion_(question, studentAnswer, points);
        break;
      case 'matching':
        result = gradeMatchingQuestion_(question, studentAnswer, points);
        break;
      case 'ordering':
        result = gradeOrderingQuestion_(question, studentAnswer, points);
        break;
      default:
        result = {
          isCorrect: false,
          pointsEarned: 0,
          correctAnswer: '',
          studentAnswer: studentAnswer || ''
        };
    }

    totalScore += result.pointsEarned;

    perQuestion.push({
      questionId: question.questionId,
      questionType: question.type,
      studentAnswer: result.studentAnswer,
      correctAnswer: result.correctAnswer,
      isCorrect: result.isCorrect,
      pointsEarned: result.pointsEarned,
      pointsPossible: points
    });
  }

  const scorePct = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  return {
    totalScore: totalScore,
    maxScore: maxScore,
    scorePct: scorePct,
    perQuestion: perQuestion
  };
}

/**
 * Grade a multiple choice question.
 * Exact match on option ID.
 */
function gradeMcQuestion_(question, studentAnswer, points) {
  const correct = String(question.correctAnswer || '');
  const student = String(studentAnswer || '');
  const isCorrect = student === correct && student !== '';

  return {
    isCorrect: isCorrect,
    pointsEarned: isCorrect ? points : 0,
    correctAnswer: correct,
    studentAnswer: student
  };
}

/**
 * Grade a short answer question.
 * Case-insensitive exact match against acceptedAnswers[].
 * Fallback: keyword partial credit.
 */
function gradeSaQuestion_(question, studentAnswer, points) {
  const student = String(studentAnswer || '').trim().toLowerCase();
  const acceptedAnswers = question.acceptedAnswers || [];
  const keywords = question.keywords || [];
  const keywordPct = Number(question.keywordPointsPct) || 50;

  // Check exact match (case-insensitive)
  let exactMatch = false;
  for (let i = 0; i < acceptedAnswers.length; i++) {
    if (String(acceptedAnswers[i]).trim().toLowerCase() === student) {
      exactMatch = true;
      break;
    }
  }

  if (exactMatch) {
    return {
      isCorrect: true,
      pointsEarned: points,
      correctAnswer: acceptedAnswers[0] || '',
      studentAnswer: studentAnswer || ''
    };
  }

  // Check keyword partial credit
  if (keywords.length > 0 && student.length > 0) {
    let keywordFound = false;
    for (let k = 0; k < keywords.length; k++) {
      if (student.indexOf(String(keywords[k]).toLowerCase()) !== -1) {
        keywordFound = true;
        break;
      }
    }
    if (keywordFound) {
      const partialPoints = Math.round((points * keywordPct / 100) * 100) / 100;
      return {
        isCorrect: false,
        pointsEarned: partialPoints,
        correctAnswer: acceptedAnswers[0] || '',
        studentAnswer: studentAnswer || ''
      };
    }
  }

  return {
    isCorrect: false,
    pointsEarned: 0,
    correctAnswer: acceptedAnswers[0] || '',
    studentAnswer: studentAnswer || ''
  };
}

/**
 * Grade a matching question.
 * Score = (correct pairs / total pairs) * points.
 * Student answer is array of {left, right} pairs.
 */
function gradeMatchingQuestion_(question, studentAnswer, points) {
  const correctPairs = question.pairs || [];
  const studentPairs = studentAnswer || [];

  if (correctPairs.length === 0) {
    return { isCorrect: false, pointsEarned: 0, correctAnswer: '', studentAnswer: '' };
  }

  // Build correct answer map: left -> right
  const correctMap = {};
  for (let i = 0; i < correctPairs.length; i++) {
    correctMap[String(correctPairs[i].left)] = String(correctPairs[i].right);
  }

  // Count correct student matches
  let correctCount = 0;
  for (let j = 0; j < studentPairs.length; j++) {
    const sLeft = String(studentPairs[j].left || '');
    const sRight = String(studentPairs[j].right || '');
    if (correctMap[sLeft] && correctMap[sLeft] === sRight) {
      correctCount++;
    }
  }

  const ratio = correctCount / correctPairs.length;
  const earnedPoints = Math.round(points * ratio * 100) / 100;
  const isCorrect = correctCount === correctPairs.length;

  return {
    isCorrect: isCorrect,
    pointsEarned: earnedPoints,
    correctAnswer: JSON.stringify(correctPairs),
    studentAnswer: JSON.stringify(studentPairs)
  };
}

/**
 * Grade an ordering question.
 * Score = (correct adjacent pairs / (total items - 1)) * points.
 * Student answer is array of items in student's order.
 */
function gradeOrderingQuestion_(question, studentAnswer, points) {
  const correctOrder = question.items || [];
  const studentOrder = studentAnswer || [];

  if (correctOrder.length < 2) {
    return { isCorrect: false, pointsEarned: 0, correctAnswer: '', studentAnswer: '' };
  }

  // Count correct adjacent pairs
  let correctAdj = 0;
  const totalAdj = correctOrder.length - 1;

  for (let i = 0; i < totalAdj; i++) {
    if (i < studentOrder.length - 1) {
      // Check if this pair is correct
      const correctPair = String(correctOrder[i]) + '→' + String(correctOrder[i + 1]);
      const studentPair = String(studentOrder[i]) + '→' + String(studentOrder[i + 1]);
      if (correctPair === studentPair) {
        correctAdj++;
      }
    }
  }

  const ratio = totalAdj > 0 ? correctAdj / totalAdj : 0;
  const earnedPoints = Math.round(points * ratio * 100) / 100;
  const isCorrect = correctAdj === totalAdj;

  return {
    isCorrect: isCorrect,
    pointsEarned: earnedPoints,
    correctAnswer: JSON.stringify(correctOrder),
    studentAnswer: JSON.stringify(studentOrder)
  };
}

/**
 * Get attempt count for a student on a hex.
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {string} email - Student email
 * @returns {number} Number of attempts
 */
function getAttemptCount_(mapId, hexId, email) {
  // Filtered read — only constructs objects for matching responses
  const responses = findRowsFiltered_(SHEETS_.ASSESSMENT_RESPONSES, {
    mapId: mapId, hexId: hexId, studentEmail: email
  });
  return responses.length;
}
