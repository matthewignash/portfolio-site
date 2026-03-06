/**
 * LabSubmissionService.gs
 *
 * Student-accessible backend for lab report submissions.
 * Uses getCurrentUser() + email matching for access control (no requireRole).
 * Stores data in the external LabReports spreadsheet via LabConfigService helpers.
 *
 * Sheets used:
 *   LabAssignments — read only (assignment lookup)
 *   LabSubmissions  — create/update (one row per student per assignment)
 *   LabSectionData  — create/update (one row per section per submission)
 *   LabTemplates    — read only (template lookup)
 */


// ============================================================================
// PUBLIC FUNCTIONS
// ============================================================================


/**
 * Get everything the student lab editor needs in a single RPC.
 * Returns assignment, template (with section overrides applied), existing
 * submission, and section data — or null if no active assignment exists.
 *
 * @param {string} hexId - The hex ID to look up
 * @returns {Object|null} { assignment, template, submission, sectionData } or null
 */
function getStudentLabContext(hexId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!hexId) throw new Error('Hex ID is required.');

  // 1. Find assignment for this hex
  let assignments = [];
  try {
    assignments = findLabRows_('LabAssignments', 'hexId', hexId);
  } catch (e) {
    // External spreadsheet not configured — no assignments possible
    return null;
  }

  if (assignments.length === 0) return null;

  // Use the first assignment (one assignment per hex enforced by createLabAssignment)
  const assignment = assignments[0];

  // Only show active assignments to students
  if (String(assignment.status) !== 'active') return null;

  // Parse sectionOverridesJson
  const sectionOverrides = parseLabJsonField_(assignment.sectionOverridesJson);

  // 2. Get the template
  let template = null;

  // Check preloaded templates first
  const preloaded = getPreloadedTemplates();
  for (let i = 0; i < preloaded.length; i++) {
    if (String(preloaded[i].templateId) === String(assignment.templateId)) {
      template = preloaded[i];
      break;
    }
  }

  // If not preloaded, try custom templates
  if (!template) {
    try {
      const customTemplates = findLabRows_('LabTemplates', 'templateId', assignment.templateId);
      if (customTemplates.length > 0) {
        template = customTemplates[0];
        template.sectionsJson = parseLabJsonField_(template.sectionsJson);
      }
    } catch (e) {
      Logger.log('getStudentLabContext: custom template lookup failed: ' + e.message);
    }
  }

  if (!template) return null; // Template not found — assignment is misconfigured

  // 3. Apply section overrides to template
  const sections = template.sectionsJson || template.sections || [];
  if (sectionOverrides && typeof sectionOverrides === 'object') {
    for (let s = 0; s < sections.length; s++) {
      const secId = sections[s].sectionId;
      if (sectionOverrides[secId]) {
        // Merge override properties (enabled, promptOverride, etc.)
        const overrides = sectionOverrides[secId];
        const keys = Object.keys(overrides);
        for (let k = 0; k < keys.length; k++) {
          sections[s]['_override_' + keys[k]] = overrides[keys[k]];
        }
      }
    }
  }

  // 4. Find existing submission for this student
  let submission = null;
  let sectionData = [];

  try {
    const submissions = findLabRows_('LabSubmissions', 'assignmentId', assignment.assignmentId);
    for (let j = 0; j < submissions.length; j++) {
      if (String(submissions[j].studentEmail).toLowerCase() === email) {
        submission = submissions[j];
        break;
      }
    }
  } catch (e) {
    Logger.log('getStudentLabContext: submission lookup failed: ' + e.message);
  }

  // 5. Get section data if submission exists
  if (submission && submission.submissionId) {
    try {
      sectionData = findLabRows_('LabSectionData', 'submissionId', submission.submissionId);
    } catch (e) {
      Logger.log('getStudentLabContext: section data lookup failed: ' + e.message);
    }
  }

  return {
    assignment: {
      assignmentId: assignment.assignmentId,
      templateId: assignment.templateId,
      rubricId: assignment.rubricId,
      hexId: assignment.hexId,
      mapId: assignment.mapId,
      classId: assignment.classId,
      title: assignment.title || '',
      instructions: assignment.instructions || '',
      dueDate: assignment.dueDate || '',
      scaffoldLevel: assignment.scaffoldLevel || 'medium',
      status: assignment.status
    },
    template: {
      templateId: template.templateId,
      title: template.title || '',
      sectionsJson: sections
    },
    submission: submission ? {
      submissionId: submission.submissionId,
      status: submission.status || 'draft',
      revisionNumber: submission.revisionNumber || 0,
      submittedAt: submission.submittedAt || '',
      updatedAt: submission.updatedAt || '',
      embeddedSheetsJson: submission.embeddedSheetsJson || ''
    } : null,
    sectionData: sectionData
  };
}


/**
 * Save a draft of one section of a lab report.
 * Auto-creates the submission row on first save (status='draft').
 * Upserts the LabSectionData row for the given section.
 *
 * @param {string} assignmentId - The assignment this belongs to
 * @param {string} submissionId - Existing submission ID, or empty string for first save
 * @param {string} sectionKey - The section identifier (matches template sectionId)
 * @param {string} contentMarkup - The text content (max 10000 chars)
 * @param {string} structuredDataJson - JSON string for structured data (max 5000 chars)
 * @param {number} wordCount - Word count computed client-side
 * @returns {Object} { success: true, submissionId, sectionDataId }
 */
function saveLabSectionDraft(assignmentId, submissionId, sectionKey, contentMarkup, structuredDataJson, wordCount) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  const now = now_();

  // Validate inputs
  if (!assignmentId) throw new Error('Assignment ID is required.');
  if (!sectionKey) throw new Error('Section key is required.');

  contentMarkup = String(contentMarkup || '').substring(0, 10000);
  structuredDataJson = String(structuredDataJson || '').substring(0, 5000);
  wordCount = parseInt(wordCount, 10) || 0;
  if (wordCount < 0) wordCount = 0;

  let actualSubmissionId = String(submissionId || '').trim();

  // If no submission exists yet, create one
  if (!actualSubmissionId) {
    // Verify assignment exists and is active
    let assignments = [];
    try {
      assignments = findLabRows_('LabAssignments', 'assignmentId', assignmentId);
    } catch (e) {
      throw new Error('Could not access lab assignments. Please ensure Lab Reports is enabled in Integrations.');
    }

    if (assignments.length === 0) throw new Error('Assignment not found.');
    if (String(assignments[0].status) !== 'active') throw new Error('Assignment is not active.');

    // Check for existing submission (prevent duplicates)
    try {
      const existing = findLabRows_('LabSubmissions', 'assignmentId', assignmentId);
      for (let i = 0; i < existing.length; i++) {
        if (String(existing[i].studentEmail).toLowerCase() === email) {
          actualSubmissionId = String(existing[i].submissionId);
          break;
        }
      }
    } catch (e) {
      // If lookup fails, proceed to create new
    }

    // Create new submission if none found
    if (!actualSubmissionId) {
      actualSubmissionId = generateLabSubmissionId_();
      appendLabRow_('LabSubmissions', {
        submissionId: actualSubmissionId,
        assignmentId: assignmentId,
        studentEmail: email,
        status: 'draft',
        embeddedSheetsJson: '',
        revisionNumber: 0,
        submittedAt: '',
        returnedAt: '',
        exportDocId: '',
        exportDocUrl: '',
        createdAt: now,
        updatedAt: now
      });
    }
  } else {
    // Verify ownership of existing submission
    let submissions = [];
    try {
      submissions = findLabRows_('LabSubmissions', 'submissionId', actualSubmissionId);
    } catch (e) {
      throw new Error('Could not verify submission ownership.');
    }

    if (submissions.length === 0) throw new Error('Submission not found.');

    const sub = submissions[0];
    if (String(sub.studentEmail).toLowerCase() !== email) {
      throw new Error('You do not have permission to edit this submission.');
    }

    // Only allow edits on draft or returned submissions
    const allowedStatuses = ['draft', 'returned'];
    let statusAllowed = false;
    for (let s = 0; s < allowedStatuses.length; s++) {
      if (String(sub.status) === allowedStatuses[s]) {
        statusAllowed = true;
        break;
      }
    }
    if (!statusAllowed) {
      throw new Error('Cannot edit a submitted report. Status: ' + sub.status);
    }
  }

  // Upsert LabSectionData
  let sectionDataId = '';
  let existingSection = null;

  try {
    const allSections = findLabRows_('LabSectionData', 'submissionId', actualSubmissionId);
    for (let d = 0; d < allSections.length; d++) {
      if (String(allSections[d].sectionKey) === String(sectionKey)) {
        existingSection = allSections[d];
        break;
      }
    }
  } catch (e) {
    // If lookup fails, treat as new section
  }

  if (existingSection) {
    // Update existing section data
    sectionDataId = String(existingSection.sectionDataId);
    updateLabRow_('LabSectionData', 'sectionDataId', sectionDataId, {
      contentMarkup: contentMarkup,
      structuredDataJson: structuredDataJson,
      wordCount: wordCount,
      updatedAt: now
    });
  } else {
    // Create new section data
    sectionDataId = generateLabSectionDataId_();
    appendLabRow_('LabSectionData', {
      sectionDataId: sectionDataId,
      submissionId: actualSubmissionId,
      sectionKey: sectionKey,
      contentMarkup: contentMarkup,
      structuredDataJson: structuredDataJson,
      wordCount: wordCount,
      updatedAt: now
    });
  }

  // Update submission updatedAt timestamp
  try {
    updateLabRow_('LabSubmissions', 'submissionId', actualSubmissionId, {
      updatedAt: now
    });
  } catch (e) {
    // Non-critical — section data was saved successfully
    Logger.log('saveLabSectionDraft: failed to update submission timestamp: ' + e.message);
  }

  return {
    success: true,
    submissionId: actualSubmissionId,
    sectionDataId: sectionDataId
  };
}


/**
 * Get a student's submission and all section data for an assignment.
 *
 * @param {string} assignmentId - The assignment ID
 * @returns {Object|null} { submission, sectionData } or null
 */
function getStudentSubmission(assignmentId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!assignmentId) throw new Error('Assignment ID is required.');

  let submission = null;
  try {
    const submissions = findLabRows_('LabSubmissions', 'assignmentId', assignmentId);
    for (let i = 0; i < submissions.length; i++) {
      if (String(submissions[i].studentEmail).toLowerCase() === email) {
        submission = submissions[i];
        break;
      }
    }
  } catch (e) {
    return null;
  }

  if (!submission) return null;

  let sectionData = [];
  try {
    sectionData = findLabRows_('LabSectionData', 'submissionId', submission.submissionId);
  } catch (e) {
    // Return submission without section data
  }

  return {
    submission: submission,
    sectionData: sectionData
  };
}


/**
 * Submit a lab report. Changes status from draft/returned to submitted.
 * Validates all required sections have content.
 *
 * @param {string} assignmentId - The assignment to submit for
 * @returns {Object} { success, submissionId, status, submittedAt }
 */
function submitLabReport(assignmentId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  const now = now_();

  if (!assignmentId) throw new Error('Assignment ID is required.');

  // Find assignment
  let assignments = [];
  try {
    assignments = findLabRows_('LabAssignments', 'assignmentId', assignmentId);
  } catch (e) {
    throw new Error('Could not access lab assignments.');
  }
  if (assignments.length === 0) throw new Error('Assignment not found.');
  const assignment = assignments[0];

  // Find student's submission
  let submission = null;
  try {
    const submissions = findLabRows_('LabSubmissions', 'assignmentId', assignmentId);
    for (let i = 0; i < submissions.length; i++) {
      if (String(submissions[i].studentEmail).toLowerCase() === email) {
        submission = submissions[i];
        break;
      }
    }
  } catch (e) {
    throw new Error('Could not find submission.');
  }
  if (!submission) throw new Error('No submission found. Please save your work first.');

  // Validate status — only draft or returned can be submitted
  const status = String(submission.status || 'draft');
  if (status !== 'draft' && status !== 'returned') {
    throw new Error('Cannot submit: report is already ' + status + '.');
  }

  // Validate required sections have content
  let template = null;
  const preloaded = getPreloadedTemplates();
  for (let p = 0; p < preloaded.length; p++) {
    if (String(preloaded[p].templateId) === String(assignment.templateId)) {
      template = preloaded[p];
      break;
    }
  }
  if (!template) {
    try {
      const custom = findLabRows_('LabTemplates', 'templateId', assignment.templateId);
      if (custom.length > 0) {
        template = custom[0];
        template.sectionsJson = parseLabJsonField_(template.sectionsJson);
      }
    } catch (e) { /* proceed without validation */ }
  }

  if (template) {
    const sections = template.sectionsJson || [];
    const sectionOverrides = parseLabJsonField_(assignment.sectionOverridesJson);
    let sectionData = [];
    try {
      sectionData = findLabRows_('LabSectionData', 'submissionId', submission.submissionId);
    } catch (e) { /* proceed without data */ }

    for (let s = 0; s < sections.length; s++) {
      const sec = sections[s];
      // Check if section is disabled via overrides
      if (sectionOverrides && sectionOverrides[sec.sectionId] && sectionOverrides[sec.sectionId].enabled === false) continue;
      if (!sec.required) continue;

      // Find section data
      let hasContent = false;
      for (let d = 0; d < sectionData.length; d++) {
        if (String(sectionData[d].sectionKey) === String(sec.sectionId)) {
          const markup = String(sectionData[d].contentMarkup || '').trim();
          const structured = String(sectionData[d].structuredDataJson || '').trim();
          if (markup.length > 0 || (structured.length > 2)) { // > 2 to skip empty "{}"
            hasContent = true;
          }
          break;
        }
      }
      if (!hasContent) {
        throw new Error('Required section "' + (sec.title || sec.sectionId) + '" is incomplete.');
      }
    }
  }

  // Update submission status
  const newRevision = status === 'returned' ? (parseInt(submission.revisionNumber || 0, 10) + 1) : (parseInt(submission.revisionNumber || 0, 10));
  updateLabRow_('LabSubmissions', 'submissionId', submission.submissionId, {
    status: 'submitted',
    submittedAt: now,
    revisionNumber: newRevision,
    updatedAt: now
  });

  // Snapshot all section data for version history (non-fatal)
  try {
    const snapshotSections = findLabRows_('LabSectionData', 'submissionId', submission.submissionId);
    for (let vs = 0; vs < snapshotSections.length; vs++) {
      const secSnap = snapshotSections[vs];
      appendLabRow_('LabSectionVersions', {
        versionId: generateLabVersionId_(),
        submissionId: submission.submissionId,
        sectionKey: String(secSnap.sectionKey || ''),
        revisionNumber: newRevision,
        contentMarkup: String(secSnap.contentMarkup || '').substring(0, 10000),
        structuredDataJson: String(secSnap.structuredDataJson || '').substring(0, 5000),
        wordCount: parseInt(secSnap.wordCount || 0, 10),
        createdAt: now
      });
    }
  } catch (snapErr) {
    // Non-fatal: submission succeeded even if snapshot fails
    Logger.log('submitLabReport: version snapshot failed: ' + snapErr.message);
  }

  return {
    success: true,
    submissionId: submission.submissionId,
    status: 'submitted',
    submittedAt: now
  };
}


/**
 * Return a submitted lab report to the student for revision.
 * Teacher/admin only.
 *
 * @param {string} submissionId - The submission to return
 * @param {string} feedback - Teacher feedback text (max 500 chars)
 * @returns {Object} { success: true }
 */
function returnLabReport(submissionId, feedback) {
  requireRole(['teacher', 'administrator']);
  const user = getCurrentUser();
  const now = now_();

  if (!submissionId) throw new Error('Submission ID is required.');
  feedback = String(feedback || '').substring(0, 500);

  // Find submission
  let submissions = [];
  try {
    submissions = findLabRows_('LabSubmissions', 'submissionId', submissionId);
  } catch (e) {
    throw new Error('Could not access submissions.');
  }
  if (submissions.length === 0) throw new Error('Submission not found.');

  const submission = submissions[0];
  if (String(submission.status) === 'scored') {
    throw new Error('Cannot return a scored report.');
  }
  if (String(submission.status) !== 'submitted') {
    throw new Error('Can only return submitted reports. Current status: ' + submission.status);
  }

  // Store feedback in embeddedSheetsJson (reuses existing column)
  const returnPayload = JSON.stringify({
    returnFeedback: feedback,
    returnedAt: now,
    returnedBy: user.email
  });

  updateLabRow_('LabSubmissions', 'submissionId', submissionId, {
    status: 'returned',
    returnedAt: now,
    embeddedSheetsJson: returnPayload,
    updatedAt: now
  });

  return { success: true };
}


/**
 * Get all submissions for an assignment. Teacher/admin only.
 *
 * @param {string} assignmentId - The assignment to list submissions for
 * @returns {Array} [{ studentEmail, status, submittedAt, submissionId }]
 */
function getLabSubmissionsForAssignment(assignmentId) {
  requireRole(['teacher', 'administrator']);

  if (!assignmentId) throw new Error('Assignment ID is required.');

  let submissions = [];
  try {
    submissions = findLabRows_('LabSubmissions', 'assignmentId', assignmentId);
  } catch (e) {
    return [];
  }

  return submissions.map(function(sub) {
    return {
      submissionId: sub.submissionId || '',
      studentEmail: sub.studentEmail || '',
      status: sub.status || 'draft',
      submittedAt: sub.submittedAt || '',
      revisionNumber: sub.revisionNumber || 0
    };
  });
}


/**
 * Get revision history summary for a submission.
 * Student can view own; teacher/admin can view any.
 *
 * @param {string} submissionId
 * @returns {Array} [{ revisionNumber, createdAt, sections: [{sectionKey, wordCount}] }]
 */
function getLabRevisionHistory(submissionId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!submissionId) throw new Error('Submission ID is required.');

  // Verify access: owner or teacher/admin
  const submissions = findLabRows_('LabSubmissions', 'submissionId', submissionId);
  if (submissions.length === 0) throw new Error('Submission not found.');
  const sub = submissions[0];

  const isOwner = String(sub.studentEmail).toLowerCase() === email;
  let isTeacher = false;
  try { requireRole(['teacher', 'administrator']); isTeacher = true; } catch (e) {}
  if (!isOwner && !isTeacher) throw new Error('Access denied.');

  // Read all versions for this submission
  let versions = [];
  try {
    versions = findLabRows_('LabSectionVersions', 'submissionId', submissionId);
  } catch (e) {
    return []; // Sheet may not exist yet
  }

  // Group by revisionNumber
  const revMap = {};
  for (let i = 0; i < versions.length; i++) {
    const v = versions[i];
    const revNum = parseInt(v.revisionNumber || 0, 10);
    if (!revMap[revNum]) {
      revMap[revNum] = { revisionNumber: revNum, createdAt: v.createdAt || '', sections: [] };
    }
    revMap[revNum].sections.push({
      sectionKey: String(v.sectionKey || ''),
      wordCount: parseInt(v.wordCount || 0, 10)
    });
  }

  // Convert to sorted array (ascending by revision number)
  const result = [];
  const keys = Object.keys(revMap);
  for (let k = 0; k < keys.length; k++) {
    result.push(revMap[keys[k]]);
  }
  result.sort(function(a, b) { return a.revisionNumber - b.revisionNumber; });

  return result;
}


/**
 * Get full content of a specific section at a specific revision.
 * Student can view own; teacher/admin can view any.
 *
 * @param {string} submissionId
 * @param {string} sectionKey
 * @param {number} revisionNumber
 * @returns {Object|null} { sectionKey, revisionNumber, contentMarkup, structuredDataJson, wordCount, createdAt }
 */
function getLabSectionVersion(submissionId, sectionKey, revisionNumber) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!submissionId) throw new Error('Submission ID is required.');
  if (!sectionKey) throw new Error('Section key is required.');

  // Verify access: owner or teacher/admin
  const submissions = findLabRows_('LabSubmissions', 'submissionId', submissionId);
  if (submissions.length === 0) throw new Error('Submission not found.');
  const sub = submissions[0];

  const isOwner = String(sub.studentEmail).toLowerCase() === email;
  let isTeacher = false;
  try { requireRole(['teacher', 'administrator']); isTeacher = true; } catch (e) {}
  if (!isOwner && !isTeacher) throw new Error('Access denied.');

  const revNum = parseInt(revisionNumber, 10);

  // Find matching version
  let versions = [];
  try {
    versions = findLabRows_('LabSectionVersions', 'submissionId', submissionId);
  } catch (e) {
    return null;
  }

  for (let i = 0; i < versions.length; i++) {
    const v = versions[i];
    if (String(v.sectionKey) === String(sectionKey) && parseInt(v.revisionNumber || 0, 10) === revNum) {
      return {
        sectionKey: String(v.sectionKey),
        revisionNumber: revNum,
        contentMarkup: String(v.contentMarkup || ''),
        structuredDataJson: String(v.structuredDataJson || ''),
        wordCount: parseInt(v.wordCount || 0, 10),
        createdAt: v.createdAt || ''
      };
    }
  }

  return null;
}


// ============================================================================
// PRIVATE HELPERS
// ============================================================================


/**
 * Safe JSON parse for lab fields. Returns null on failure.
 * @private
 */
function parseLabJsonField_(value) {
  if (!value || typeof value !== 'string' || value.trim() === '') return null;
  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
}
