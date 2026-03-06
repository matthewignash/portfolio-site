/**
 * Lab Scoring Service — Teacher Scoring, Score Summary, Export & Reconciliation
 *
 * Manages lab report scoring against rubric criteria. Teachers score each
 * criterion independently. For multi-scorer rubrics (e.g., IB DP IA),
 * multiple teachers can score the same submission, then reconcile.
 *
 * Uses LabConfigService.gs helpers: findLabRows_, appendLabRow_, updateLabRow_,
 *   deleteLabRow_, readLabSheet_.
 * Uses LabRubricService.gs: getLabRubric().
 * Uses LabFrameworks.gs: lookupDimension_().
 * Uses Utilities.gs: generateLabScoreId_(), now_(), safeJsonParse_().
 * Uses ProgressService.gs: readAll_(SHEETS_.PROGRESS), writeAll_(),
 *   ensureProgressColumns_().
 * Uses Config.gs: readAll_, writeAll_, SHEETS_.
 *
 * Sheet: LabScores (8 cols: scoreId, submissionId, criterionId,
 *        scorerEmail, scorerRole, score, feedback, scoredAt)
 *
 * @version 1.0.0
 */


// ============================================================================
// PUBLIC FUNCTIONS
// ============================================================================


/**
 * Save scores for a submission. Batch save all criterion scores.
 * Teacher/admin only. Validates submission exists and status is 'submitted'.
 *
 * For multiScorer rubrics: replaces only this scorer's previous scores.
 * For single-scorer rubrics: replaces all non-reconciled scores.
 *
 * @param {string} submissionId
 * @param {Array<Object>} scores - [{criterionId, score, feedback}]
 * @returns {Object} { success: true, scoreCount: number }
 */
function saveLabScores(submissionId, scores) {
  requireRole(['teacher', 'administrator']);
  const user = getCurrentUser();
  const now = now_();

  if (!submissionId) throw new Error('Submission ID is required.');
  if (!scores || !Array.isArray(scores) || scores.length === 0) {
    throw new Error('Scores array is required.');
  }

  // 1. Verify submission exists and status is 'submitted'
  const submissions = findLabRows_('LabSubmissions', 'submissionId', submissionId);
  if (submissions.length === 0) throw new Error('Submission not found.');
  const submission = submissions[0];

  if (String(submission.status) !== 'submitted') {
    throw new Error('Can only score submitted reports. Current status: ' + submission.status);
  }

  // 2. Get the assignment and rubric for validation
  const assignments = findLabRows_('LabAssignments', 'assignmentId', submission.assignmentId);
  if (assignments.length === 0) throw new Error('Assignment not found.');
  const assignment = assignments[0];

  const rubric = getLabRubric(assignment.rubricId);
  if (!rubric) throw new Error('Rubric not found: ' + assignment.rubricId);

  const scaleMax = parseInt(rubric.scaleMax, 10) || 8;
  const isMultiScorer = rubric.multiScorer === true || rubric.multiScorer === 'true';

  // Build valid criterionId set
  const validCriteria = {};
  const criteria = rubric.criteria || [];
  for (let i = 0; i < criteria.length; i++) {
    validCriteria[String(criteria[i].criterionId)] = true;
  }

  // 3. Validate each score
  for (let s = 0; s < scores.length; s++) {
    const sc = scores[s];
    if (!sc.criterionId) throw new Error('Score ' + (s + 1) + ': criterionId required.');
    if (!validCriteria[String(sc.criterionId)]) {
      throw new Error('Score ' + (s + 1) + ': invalid criterionId.');
    }
    const scoreVal = parseInt(sc.score, 10);
    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > scaleMax) {
      throw new Error('Score ' + (s + 1) + ': must be 0-' + scaleMax + '.');
    }
    sc.feedback = String(sc.feedback || '').substring(0, 500);
  }

  // 4. Delete previous scores from this scorer (inside lock via deleteLabRow_)
  const existingScores = findLabRows_('LabScores', 'submissionId', submissionId);
  const scorerEmail = user.email.toLowerCase();

  for (let e = existingScores.length - 1; e >= 0; e--) {
    const es = existingScores[e];
    const esScorerEmail = String(es.scorerEmail || '').toLowerCase();
    const esRole = String(es.scorerRole || '');

    if (esScorerEmail === scorerEmail && esRole !== 'reconciled') {
      deleteLabRow_('LabScores', 'scoreId', es.scoreId);
    }
  }

  // For single-scorer: also delete all other non-reconciled scores
  if (!isMultiScorer) {
    for (let e2 = existingScores.length - 1; e2 >= 0; e2--) {
      const es2 = existingScores[e2];
      const es2Email = String(es2.scorerEmail || '').toLowerCase();
      const es2Role = String(es2.scorerRole || '');

      if (es2Email !== scorerEmail && es2Role !== 'reconciled') {
        deleteLabRow_('LabScores', 'scoreId', es2.scoreId);
      }
    }
  }

  // 5. Insert new scores
  for (let s = 0; s < scores.length; s++) {
    const sc = scores[s];
    appendLabRow_('LabScores', {
      scoreId: generateLabScoreId_(),
      submissionId: submissionId,
      criterionId: String(sc.criterionId),
      scorerEmail: user.email,
      scorerRole: user.normalizedRole || 'teacher',
      score: parseInt(sc.score, 10),
      feedback: sc.feedback,
      scoredAt: now
    });
  }

  return { success: true, scoreCount: scores.length };
}


/**
 * Get all scores for a submission.
 * Teacher sees all scorer data; student sees only after status is 'scored'.
 *
 * @param {string} submissionId
 * @returns {Object} { scores: Array, scorers: Array<string> }
 */
function getLabScoresForSubmission(submissionId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!submissionId) throw new Error('Submission ID is required.');

  // Verify access
  const submissions = findLabRows_('LabSubmissions', 'submissionId', submissionId);
  if (submissions.length === 0) throw new Error('Submission not found.');
  const sub = submissions[0];

  const isOwner = String(sub.studentEmail).toLowerCase() === email;
  let isTeacher = false;
  try { requireRole(['teacher', 'administrator']); isTeacher = true; } catch (e) {}

  if (!isOwner && !isTeacher) throw new Error('Access denied.');

  // Students can only see scores after finalization
  if (isOwner && !isTeacher && String(sub.status) !== 'scored') {
    return { scores: [], scorers: [] };
  }

  const allScores = findLabRows_('LabScores', 'submissionId', submissionId);

  // Collect unique scorer emails
  const scorerSet = {};
  const scorerList = [];
  for (let i = 0; i < allScores.length; i++) {
    const se = String(allScores[i].scorerEmail || '').toLowerCase();
    if (se && !scorerSet[se]) {
      scorerSet[se] = true;
      scorerList.push(se);
    }
  }

  return {
    scores: allScores.map(function(s) {
      return {
        scoreId: s.scoreId || '',
        criterionId: s.criterionId || '',
        scorerEmail: s.scorerEmail || '',
        scorerRole: s.scorerRole || '',
        score: parseFloat(s.score) || 0,
        feedback: s.feedback || '',
        scoredAt: s.scoredAt || ''
      };
    }),
    scorers: scorerList
  };
}


/**
 * Compute score summary for a submission.
 * Weighted average per criterion, total, percentage, dimension breakdown.
 * For multiScorer: reconciled scores take priority, then averages across scorers.
 *
 * @param {string} submissionId
 * @returns {Object} { criteria, totalWeightedScore, totalMaxWeightedScore,
 *                     percentage, scaleLabel, dimensionScores }
 */
function getLabScoreSummary(submissionId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!submissionId) throw new Error('Submission ID is required.');

  // Verify access (same as getLabScoresForSubmission)
  const submissions = findLabRows_('LabSubmissions', 'submissionId', submissionId);
  if (submissions.length === 0) throw new Error('Submission not found.');
  const sub = submissions[0];

  const isOwner = String(sub.studentEmail).toLowerCase() === email;
  let isTeacher = false;
  try { requireRole(['teacher', 'administrator']); isTeacher = true; } catch (e) {}
  if (!isOwner && !isTeacher) throw new Error('Access denied.');

  // Get assignment + rubric
  const assignments = findLabRows_('LabAssignments', 'assignmentId', sub.assignmentId);
  if (assignments.length === 0) throw new Error('Assignment not found.');
  const assignment = assignments[0];

  const rubric = getLabRubric(assignment.rubricId);
  if (!rubric) throw new Error('Rubric not found.');

  const scaleMax = parseInt(rubric.scaleMax, 10) || 8;
  const criteria = rubric.criteria || [];

  // Get all scores
  const allScores = findLabRows_('LabScores', 'submissionId', submissionId);

  // Group scores by criterionId
  const scoresByCriterion = {};
  for (let i = 0; i < allScores.length; i++) {
    const s = allScores[i];
    const cid = String(s.criterionId);
    if (!scoresByCriterion[cid]) scoresByCriterion[cid] = [];
    scoresByCriterion[cid].push(s);
  }

  // Compute per-criterion results
  const criteriaResults = [];
  let totalWeightedScore = 0;
  let totalMaxWeightedScore = 0;
  const dimensionTotals = {};
  const dimensionCounts = {};

  for (let c = 0; c < criteria.length; c++) {
    const crit = criteria[c];
    const cid = String(crit.criterionId);
    const weight = parseInt(crit.weight, 10) || 1;
    const scoresForCrit = scoresByCriterion[cid] || [];

    // Resolve final score: reconciled takes priority, else average scorers
    let finalScore = 0;
    let finalFeedback = '';
    const scorers = [];

    // Check for reconciled score first
    let hasReconciled = false;
    for (let s = 0; s < scoresForCrit.length; s++) {
      if (String(scoresForCrit[s].scorerRole) === 'reconciled') {
        finalScore = parseFloat(scoresForCrit[s].score) || 0;
        finalFeedback = scoresForCrit[s].feedback || '';
        hasReconciled = true;
        break;
      }
    }

    if (!hasReconciled) {
      // Average across non-reconciled scorers
      let scoreSum = 0;
      let scoreCount = 0;
      const feedbackParts = [];

      for (let s = 0; s < scoresForCrit.length; s++) {
        const sc = scoresForCrit[s];
        scoreSum += parseFloat(sc.score) || 0;
        scoreCount++;
        if (sc.feedback) feedbackParts.push(sc.feedback);
        scorers.push({
          email: sc.scorerEmail || '',
          score: parseFloat(sc.score) || 0,
          feedback: sc.feedback || ''
        });
      }

      if (scoreCount > 0) {
        finalScore = Math.round((scoreSum / scoreCount) * 10) / 10;
        finalFeedback = feedbackParts.join(' | ');
      }
    }

    const scaleLabel = resolveScaleLabel_(
      typeof rubric.scaleLabelJson === 'string'
        ? safeJsonParse_(rubric.scaleLabelJson, {})
        : (rubric.scaleLabelJson || {}),
      finalScore
    );

    criteriaResults.push({
      criterionId: cid,
      title: crit.title || '',
      score: finalScore,
      maxScore: scaleMax,
      weight: weight,
      feedback: finalFeedback,
      scaleLabel: scaleLabel,
      scorers: scorers,
      internalDimensions: crit.internalDimensions || ''
    });

    totalWeightedScore += finalScore * weight;
    totalMaxWeightedScore += scaleMax * weight;

    // Accumulate dimension scores
    const dims = String(crit.internalDimensions || '').split(',');
    for (let d = 0; d < dims.length; d++) {
      const dimCode = dims[d].trim();
      if (!dimCode) continue;
      const dimPct = scaleMax > 0 ? (finalScore / scaleMax) * 100 : 0;
      if (!dimensionTotals[dimCode]) {
        dimensionTotals[dimCode] = 0;
        dimensionCounts[dimCode] = 0;
      }
      dimensionTotals[dimCode] += dimPct * weight;
      dimensionCounts[dimCode] += weight;
    }
  }

  // Compute dimension averages
  const dimensionScores = {};
  const dimKeys = Object.keys(dimensionTotals);
  for (let dk = 0; dk < dimKeys.length; dk++) {
    const key = dimKeys[dk];
    dimensionScores[key] = dimensionCounts[key] > 0
      ? Math.round(dimensionTotals[key] / dimensionCounts[key])
      : 0;
  }

  const percentage = totalMaxWeightedScore > 0
    ? Math.round((totalWeightedScore / totalMaxWeightedScore) * 100)
    : 0;

  const overallLabel = resolveScaleLabel_(
    typeof rubric.scaleLabelJson === 'string'
      ? safeJsonParse_(rubric.scaleLabelJson, {})
      : (rubric.scaleLabelJson || {}),
    totalMaxWeightedScore > 0
      ? (totalWeightedScore / (totalMaxWeightedScore / scaleMax))
      : 0
  );

  return {
    criteria: criteriaResults,
    totalWeightedScore: Math.round(totalWeightedScore * 10) / 10,
    totalMaxWeightedScore: totalMaxWeightedScore,
    percentage: percentage,
    scaleLabel: overallLabel,
    dimensionScores: dimensionScores
  };
}


/**
 * Finalize scoring for a submission.
 * Sets submission status to 'scored'.
 * Writes aggregate score to Progress sheet.
 * Sends notification to student.
 *
 * @param {string} submissionId
 * @returns {Object} { success: true }
 */
function finalizeLabScore(submissionId) {
  requireRole(['teacher', 'administrator']);
  const user = getCurrentUser();
  const now = now_();

  if (!submissionId) throw new Error('Submission ID is required.');

  // Verify submission exists and is submitted
  const submissions = findLabRows_('LabSubmissions', 'submissionId', submissionId);
  if (submissions.length === 0) throw new Error('Submission not found.');
  const submission = submissions[0];

  if (String(submission.status) !== 'submitted') {
    throw new Error('Can only finalize submitted reports. Current status: ' + submission.status);
  }

  // Get score summary
  const summary = getLabScoreSummary(submissionId);
  if (summary.criteria.length === 0) {
    throw new Error('No scores found. Score the submission before finalizing.');
  }

  // Get assignment for mapId + hexId
  const assignments = findLabRows_('LabAssignments', 'assignmentId', submission.assignmentId);
  if (assignments.length === 0) throw new Error('Assignment not found.');
  const assignment = assignments[0];

  // 1. Update LabSubmissions status to 'scored'
  updateLabRow_('LabSubmissions', 'submissionId', submissionId, {
    status: 'scored',
    updatedAt: now
  });

  // 2. Write aggregate score to Progress sheet
  //    Follow approveSubmission pattern (ProgressService.gs line 294)
  const mapId = String(assignment.mapId);
  const hexId = String(assignment.hexId);
  const studentEmail = String(submission.studentEmail).toLowerCase();

  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const allProgress = readAll_(SHEETS_.PROGRESS);
      const index = allProgress.findIndex(function(p) {
        return String(p.email).toLowerCase() === studentEmail &&
               String(p.mapId) === mapId &&
               String(p.hexId) === hexId;
      });

      if (index !== -1) {
        allProgress[index].score = summary.totalWeightedScore;
        allProgress[index].maxScore = summary.totalMaxWeightedScore;
        allProgress[index].teacherApproved = true;

        // Set status based on percentage
        if (summary.percentage >= 85) {
          allProgress[index].status = 'mastered';
        } else if (String(allProgress[index].status) !== 'mastered') {
          allProgress[index].status = 'completed';
        }

        allProgress[index].updatedAt = now;
        ensureProgressColumns_(allProgress);
        writeAll_(SHEETS_.PROGRESS, allProgress);
      }
    } finally {
      lock.releaseLock();
    }
  } catch (progErr) {
    // Non-fatal: lab scoring succeeded even if Progress write fails
    Logger.log('finalizeLabScore: Progress write failed: ' + progErr.message);
  }

  // 3. Send notification to student
  try {
    const hexLabel = assignment.title || hexId;
    createNotification_(
      studentEmail,
      'approval_granted',
      'Lab Report Scored',
      'Your lab report "' + hexLabel + '" has been scored. View your results.',
      { sourceEmail: user.email, mapId: mapId, hexId: hexId }
    );
  } catch (ntfErr) {
    Logger.log('finalizeLabScore: notification failed: ' + ntfErr.message);
  }

  return { success: true };
}


/**
 * Export a lab submission to Google Doc.
 * Creates doc with title page, section content, rubric table, feedback.
 * Stores exportDocId + exportDocUrl on LabSubmissions row.
 *
 * @param {string} submissionId
 * @returns {Object} { success: true, docUrl: string }
 */
function exportLabSubmissionToDoc(submissionId) {
  requireRole(['teacher', 'administrator']);

  if (!submissionId) throw new Error('Submission ID is required.');

  // Load submission + assignment + template + section data
  const submissions = findLabRows_('LabSubmissions', 'submissionId', submissionId);
  if (submissions.length === 0) throw new Error('Submission not found.');
  const submission = submissions[0];

  const assignments = findLabRows_('LabAssignments', 'assignmentId', submission.assignmentId);
  if (assignments.length === 0) throw new Error('Assignment not found.');
  const assignment = assignments[0];

  // Get template for section ordering
  let template = null;
  try { template = getLabTemplate(assignment.templateId); } catch (e) {}
  const sections = (template && template.sectionsJson) ? template.sectionsJson : [];
  sections.sort(function(a, b) { return (a.sequence || 0) - (b.sequence || 0); });

  // Get section data
  const sectionData = findLabRows_('LabSectionData', 'submissionId', submissionId);
  const sectionMap = {};
  for (let i = 0; i < sectionData.length; i++) {
    sectionMap[String(sectionData[i].sectionKey)] = sectionData[i];
  }

  // Get score summary (may not exist if not yet scored)
  let scoreSummary = null;
  try { scoreSummary = getLabScoreSummary(submissionId); } catch (e) {}

  // Get student name
  const studentEmail = String(submission.studentEmail || '');
  let studentName = studentEmail;
  try {
    const allUsers = readAll_(SHEETS_.USERS);
    for (let u = 0; u < allUsers.length; u++) {
      if (String(allUsers[u].email).toLowerCase() === studentEmail.toLowerCase()) {
        studentName = allUsers[u].displayName || allUsers[u].name || studentEmail;
        break;
      }
    }
  } catch (e) {}

  // Create Google Doc
  const docTitle = (assignment.title || 'Lab Report') + ' \u2014 ' + studentName;
  const doc = DocumentApp.create(docTitle);
  const body = doc.getBody();

  // Title page
  body.appendParagraph(docTitle)
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Student: ' + studentName);
  body.appendParagraph('Email: ' + studentEmail);
  if (submission.submittedAt) {
    body.appendParagraph('Submitted: ' + String(submission.submittedAt));
  }
  if (scoreSummary) {
    body.appendParagraph('Score: ' + scoreSummary.totalWeightedScore +
      '/' + scoreSummary.totalMaxWeightedScore +
      ' (' + scoreSummary.percentage + '%) \u2014 ' +
      (scoreSummary.scaleLabel || ''));
  }
  body.appendParagraph('');

  // Section content
  body.appendParagraph('Report Content')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  for (let s = 0; s < sections.length; s++) {
    const sec = sections[s];
    const secKey = String(sec.sectionId || '');
    const secData = sectionMap[secKey];

    body.appendParagraph(sec.title || 'Section ' + (s + 1))
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);

    if (secData && secData.contentMarkup) {
      appendHtmlContentToDoc_(body, String(secData.contentMarkup));
    } else if (secData && secData.structuredDataJson) {
      // Structured data: just stringify for now
      body.appendParagraph(String(secData.structuredDataJson));
    } else {
      body.appendParagraph('(No content)');
    }

    if (secData && secData.wordCount) {
      body.appendParagraph('Word count: ' + secData.wordCount)
        .setFontSize(9).setItalic(true);
    }

    body.appendParagraph('');
  }

  // Rubric score table (if scored)
  if (scoreSummary && scoreSummary.criteria.length > 0) {
    body.appendParagraph('Rubric Scores')
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);

    const tableData = [['Criterion', 'Score', 'Level', 'Feedback']];
    for (let c = 0; c < scoreSummary.criteria.length; c++) {
      const crit = scoreSummary.criteria[c];
      tableData.push([
        crit.title || '',
        crit.score + '/' + crit.maxScore,
        crit.scaleLabel || '',
        crit.feedback || ''
      ]);
    }
    body.appendTable(tableData);

    body.appendParagraph('');
    body.appendParagraph('Total: ' + scoreSummary.totalWeightedScore +
      '/' + scoreSummary.totalMaxWeightedScore +
      ' (' + scoreSummary.percentage + '%) \u2014 ' +
      (scoreSummary.scaleLabel || ''))
      .setBold(true);
  }

  // Footer
  body.appendParagraph('');
  body.appendParagraph('Generated: ' + new Date().toLocaleDateString())
    .setFontSize(9).setItalic(true);

  doc.saveAndClose();

  // Store doc URL on submission
  updateLabRow_('LabSubmissions', 'submissionId', submissionId, {
    exportDocId: doc.getId(),
    exportDocUrl: doc.getUrl()
  });

  return { success: true, docUrl: doc.getUrl() };
}


/**
 * Export all scored submissions for an assignment (one doc per student).
 * Teacher/admin only.
 *
 * @param {string} assignmentId
 * @returns {Object} { success: true, exports: [{studentEmail, docUrl}] }
 */
function exportLabAssignmentDocs(assignmentId) {
  requireRole(['teacher', 'administrator']);

  if (!assignmentId) throw new Error('Assignment ID is required.');

  const submissions = findLabRows_('LabSubmissions', 'assignmentId', assignmentId);
  const exports = [];

  for (let i = 0; i < submissions.length; i++) {
    const sub = submissions[i];
    // Export scored and submitted submissions
    if (String(sub.status) === 'scored' || String(sub.status) === 'submitted') {
      try {
        const result = exportLabSubmissionToDoc(sub.submissionId);
        exports.push({
          studentEmail: sub.studentEmail || '',
          docUrl: result.docUrl
        });
      } catch (e) {
        Logger.log('exportLabAssignmentDocs: failed for ' + sub.studentEmail + ': ' + e.message);
        exports.push({
          studentEmail: sub.studentEmail || '',
          docUrl: '',
          error: e.message
        });
      }
    }
  }

  return { success: true, exports: exports };
}


/**
 * Save reconciled scores for a multi-scorer submission.
 * Teacher picks per-criterion: 'scorer_a', 'scorer_b', 'average', or manual.
 *
 * @param {string} submissionId
 * @param {Array<Object>} reconciled - [{criterionId, method, manualScore, manualFeedback}]
 * @returns {Object} { success: true }
 */
function saveReconciledScores(submissionId, reconciled) {
  requireRole(['teacher', 'administrator']);
  const user = getCurrentUser();
  const now = now_();

  if (!submissionId) throw new Error('Submission ID is required.');
  if (!reconciled || !Array.isArray(reconciled) || reconciled.length === 0) {
    throw new Error('Reconciled scores array is required.');
  }

  // Verify submission
  const submissions = findLabRows_('LabSubmissions', 'submissionId', submissionId);
  if (submissions.length === 0) throw new Error('Submission not found.');
  const submission = submissions[0];

  if (String(submission.status) !== 'submitted') {
    throw new Error('Can only reconcile submitted reports.');
  }

  // Get rubric for validation
  const assignments = findLabRows_('LabAssignments', 'assignmentId', submission.assignmentId);
  if (assignments.length === 0) throw new Error('Assignment not found.');

  const rubric = getLabRubric(assignments[0].rubricId);
  if (!rubric) throw new Error('Rubric not found.');

  const scaleMax = parseInt(rubric.scaleMax, 10) || 8;

  // Get all existing scores grouped by criterion + scorer
  const allScores = findLabRows_('LabScores', 'submissionId', submissionId);
  const scorersByCriterion = {};

  for (let i = 0; i < allScores.length; i++) {
    const s = allScores[i];
    if (String(s.scorerRole) === 'reconciled') continue; // skip existing reconciled
    const cid = String(s.criterionId);
    if (!scorersByCriterion[cid]) scorersByCriterion[cid] = [];
    scorersByCriterion[cid].push(s);
  }

  // Delete existing reconciled scores
  for (let i = allScores.length - 1; i >= 0; i--) {
    if (String(allScores[i].scorerRole) === 'reconciled') {
      deleteLabRow_('LabScores', 'scoreId', allScores[i].scoreId);
    }
  }

  // Process each reconciliation
  for (let r = 0; r < reconciled.length; r++) {
    const rec = reconciled[r];
    const cid = String(rec.criterionId);
    const method = String(rec.method || 'average');
    const scorersForCrit = scorersByCriterion[cid] || [];

    let finalScore = 0;
    let finalFeedback = '';

    if (method === 'manual') {
      finalScore = parseInt(rec.manualScore, 10) || 0;
      if (finalScore < 0) finalScore = 0;
      if (finalScore > scaleMax) finalScore = scaleMax;
      finalFeedback = String(rec.manualFeedback || '').substring(0, 500);
    } else if (method === 'average') {
      let sum = 0;
      let count = 0;
      const feedbackParts = [];
      for (let s = 0; s < scorersForCrit.length; s++) {
        sum += parseFloat(scorersForCrit[s].score) || 0;
        count++;
        if (scorersForCrit[s].feedback) feedbackParts.push(scorersForCrit[s].feedback);
      }
      finalScore = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
      finalFeedback = feedbackParts.join(' | ');
    } else if (method === 'scorer_a' && scorersForCrit.length > 0) {
      finalScore = parseFloat(scorersForCrit[0].score) || 0;
      finalFeedback = scorersForCrit[0].feedback || '';
    } else if (method === 'scorer_b' && scorersForCrit.length > 1) {
      finalScore = parseFloat(scorersForCrit[1].score) || 0;
      finalFeedback = scorersForCrit[1].feedback || '';
    }

    appendLabRow_('LabScores', {
      scoreId: generateLabScoreId_(),
      submissionId: submissionId,
      criterionId: cid,
      scorerEmail: user.email,
      scorerRole: 'reconciled',
      score: finalScore,
      feedback: finalFeedback,
      scoredAt: now
    });
  }

  return { success: true };
}


// ============================================================================
// PRIVATE HELPERS
// ============================================================================


/**
 * Strip HTML and append content to a Google Doc body as paragraphs.
 * Handles basic block-level structure: <p>, <br>, <li>, <h3>, <blockquote>.
 * Inline formatting (bold/italic) is stripped to plain text for v1.
 *
 * @param {GoogleAppsScript.Document.Body} body - Doc body
 * @param {string} htmlContent - HTML string to render
 * @private
 */
function appendHtmlContentToDoc_(body, htmlContent) {
  if (!htmlContent) return;

  let html = String(htmlContent);

  // Handle list items: convert <li> to bullet markers
  html = html.replace(/<li[^>]*>/gi, '\u2022 ');
  html = html.replace(/<\/li>/gi, '\n');

  // Handle headings
  html = html.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n###$1\n');

  // Handle blockquotes
  html = html.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n');

  // Handle line breaks and paragraph ends
  html = html.replace(/<br\s*\/?>/gi, '\n');
  html = html.replace(/<\/p>/gi, '\n');
  html = html.replace(/<\/div>/gi, '\n');

  // Strip all remaining HTML tags
  html = html.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  html = html.replace(/&amp;/g, '&');
  html = html.replace(/&lt;/g, '<');
  html = html.replace(/&gt;/g, '>');
  html = html.replace(/&nbsp;/g, ' ');
  html = html.replace(/&quot;/g, '"');
  html = html.replace(/&#39;/g, "'");

  // Split into lines and append
  const lines = html.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.indexOf('###') === 0) {
      // Heading
      body.appendParagraph(line.substring(3).trim())
        .setHeading(DocumentApp.ParagraphHeading.HEADING3);
    } else if (line.indexOf('> ') === 0) {
      // Blockquote
      body.appendParagraph(line.substring(2).trim())
        .setItalic(true);
    } else if (line.indexOf('\u2022 ') === 0) {
      // List item
      body.appendListItem(line.substring(2).trim());
    } else {
      body.appendParagraph(line);
    }
  }
}


/**
 * Resolve a numeric score to a scale label using the rubric's scaleLabelJson.
 * Handles range keys like '1-2', '3-4' etc.
 *
 * @param {Object} scaleLabelJson - e.g. {'0': 'Not Achieved', '1-2': 'Limited', ...}
 * @param {number} score - Numeric score
 * @returns {string} Scale label or empty string
 * @private
 */
function resolveScaleLabel_(scaleLabelJson, score) {
  if (!scaleLabelJson || typeof scaleLabelJson !== 'object') return '';

  const numScore = parseFloat(score) || 0;
  const keys = Object.keys(scaleLabelJson);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const parts = String(key).split('-');

    if (parts.length === 2) {
      // Range key like '1-2', '3-4'
      const lo = parseFloat(parts[0]);
      const hi = parseFloat(parts[1]);
      if (!isNaN(lo) && !isNaN(hi) && numScore >= lo && numScore <= hi) {
        return scaleLabelJson[key];
      }
    } else {
      // Single value key like '0'
      const val = parseFloat(key);
      if (!isNaN(val) && Math.abs(numScore - val) < 0.5) {
        return scaleLabelJson[key];
      }
    }
  }

  return '';
}
