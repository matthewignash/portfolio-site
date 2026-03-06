/**
 * Lab Assignment Service — Assignment CRUD & Class Assignment
 *
 * Manages lab report assignments in the external LabReports spreadsheet.
 * An assignment links a template + rubric to a specific hex on a map,
 * optionally assigned to a class with section overrides and scaffold level.
 *
 * Uses LabConfigService.gs helpers: readLabSheet_, findLabRows_, appendLabRow_,
 * updateLabRow_, deleteLabRow_.
 *
 * Uses LabTemplateService.gs: getLabTemplate().
 * Uses LabRubricService.gs: getLabRubric().
 *
 * @version 1.0.0
 */


// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_ASSIGNMENT_STATUSES_ = ['draft', 'active', 'closed'];
const VALID_SCAFFOLD_LEVELS_ = ['high', 'medium', 'low', 'none'];


// ============================================================================
// PUBLIC FUNCTIONS
// ============================================================================

/**
 * Get all lab assignments, optionally filtered.
 * Teacher/admin only.
 *
 * @param {Object} [filters] - Optional filters
 * @param {string} [filters.mapId] - Filter by map ID
 * @param {string} [filters.classId] - Filter by class ID
 * @param {string} [filters.courseId] - Filter by course ID
 * @param {string} [filters.status] - Filter by status
 * @returns {Object} { assignments: Array }
 */
function getLabAssignments(filters) {
  requireRole(['administrator', 'teacher']);

  let assignments = readLabSheet_('LabAssignments');

  // Parse JSON fields
  for (let i = 0; i < assignments.length; i++) {
    assignments[i].sectionOverridesJson = parseJsonField_(assignments[i].sectionOverridesJson);
  }

  // Apply filters
  if (filters) {
    if (filters.mapId) {
      assignments = assignments.filter(a => String(a.mapId) === String(filters.mapId));
    }
    if (filters.classId) {
      assignments = assignments.filter(a => String(a.classId) === String(filters.classId));
    }
    if (filters.courseId) {
      assignments = assignments.filter(a => String(a.courseId) === String(filters.courseId));
    }
    if (filters.status) {
      assignments = assignments.filter(a => a.status === filters.status);
    }
  }

  return { assignments: assignments };
}


/**
 * Get a single lab assignment by ID.
 * Teacher/admin only.
 *
 * @param {string} assignmentId - Assignment ID
 * @returns {Object} Assignment object with parsed JSON fields
 */
function getLabAssignment(assignmentId) {
  requireRole(['administrator', 'teacher']);
  if (!assignmentId) throw new Error('Assignment ID is required.');

  const rows = findLabRows_('LabAssignments', 'assignmentId', assignmentId);
  if (rows.length === 0) throw new Error('Assignment not found: ' + assignmentId);

  const assignment = rows[0];
  assignment.sectionOverridesJson = parseJsonField_(assignment.sectionOverridesJson);
  return assignment;
}


/**
 * Get lab assignment(s) for a specific hex.
 * Teacher/admin only.
 *
 * @param {string} hexId - Hex ID
 * @returns {Array<Object>} Assignment(s) for this hex
 */
function getLabAssignmentsForHex(hexId) {
  requireRole(['administrator', 'teacher']);
  if (!hexId) throw new Error('Hex ID is required.');

  const rows = findLabRows_('LabAssignments', 'hexId', hexId);
  for (let i = 0; i < rows.length; i++) {
    rows[i].sectionOverridesJson = parseJsonField_(rows[i].sectionOverridesJson);
  }
  return rows;
}


/**
 * Create a new lab assignment.
 * Teacher/admin only.
 *
 * @param {Object} assignment - Assignment data
 * @param {string} assignment.templateId - Template to use (required)
 * @param {string} assignment.rubricId - Rubric to use (required)
 * @param {string} assignment.mapId - Map ID (required)
 * @param {string} assignment.hexId - Hex ID (required)
 * @param {string} [assignment.courseId] - Course ID
 * @param {string} [assignment.unitId] - Unit ID
 * @param {string} [assignment.classId] - Class ID
 * @param {string} [assignment.title] - Assignment title (max 200 chars)
 * @param {string} [assignment.instructions] - Teacher instructions (max 2000 chars)
 * @param {string} [assignment.dueDate] - ISO date string
 * @param {Object} [assignment.sectionOverrides] - Per-section customizations
 * @param {string} [assignment.scaffoldLevel] - 'high'/'medium'/'low'/'none'
 * @returns {Object} { success: true, assignmentId }
 */
function createLabAssignment(assignment) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  if (!assignment) throw new Error('Assignment data is required.');

  // Validate required fields
  if (!assignment.templateId) throw new Error('Template ID is required.');
  if (!assignment.rubricId) throw new Error('Rubric ID is required.');
  if (!assignment.mapId) throw new Error('Map ID is required.');
  if (!assignment.hexId) throw new Error('Hex ID is required.');

  // Validate template exists
  try {
    getLabTemplate(assignment.templateId);
  } catch (e) {
    throw new Error('Invalid template: ' + e.message);
  }

  // Validate rubric exists
  try {
    getLabRubric(assignment.rubricId);
  } catch (e) {
    throw new Error('Invalid rubric: ' + e.message);
  }

  // Validate title
  const title = assignment.title && assignment.title.trim().length > 0
    ? assignment.title.trim() : 'Lab Assignment';
  if (title.length > 200) {
    throw new Error('Assignment title must be 200 characters or less.');
  }

  // Validate instructions
  if (assignment.instructions && assignment.instructions.length > 2000) {
    throw new Error('Instructions must be 2000 characters or less.');
  }

  // Validate scaffold level
  const scaffoldLevel = assignment.scaffoldLevel &&
    VALID_SCAFFOLD_LEVELS_.indexOf(assignment.scaffoldLevel) !== -1
    ? assignment.scaffoldLevel : 'medium';

  // Validate due date if provided
  if (assignment.dueDate) {
    validateDueDate_(assignment.dueDate);
  }

  // Check for existing assignment on this hex
  const existing = findLabRows_('LabAssignments', 'hexId', assignment.hexId);
  if (existing.length > 0) {
    throw new Error('This hex already has a lab assignment. Edit or delete the existing one first.');
  }

  const ts = now_();
  const assignmentId = generateLabAssignmentId_();
  const overridesStr = assignment.sectionOverrides
    ? JSON.stringify(assignment.sectionOverrides) : '';

  appendLabRow_('LabAssignments', {
    assignmentId: assignmentId,
    templateId: assignment.templateId,
    rubricId: assignment.rubricId,
    mapId: assignment.mapId,
    hexId: assignment.hexId,
    courseId: assignment.courseId || '',
    unitId: assignment.unitId || '',
    classId: assignment.classId || '',
    title: title,
    instructions: assignment.instructions || '',
    dueDate: assignment.dueDate || '',
    sectionOverridesJson: overridesStr,
    scaffoldLevel: scaffoldLevel,
    status: 'draft',
    createdBy: user.email,
    createdAt: ts,
    updatedAt: ts
  });

  return { success: true, assignmentId: assignmentId };
}


/**
 * Update an existing lab assignment.
 * Teacher/admin only.
 *
 * @param {string} assignmentId - Assignment ID
 * @param {Object} updates - Fields to update
 * @returns {Object} { success: true }
 */
function updateLabAssignment(assignmentId, updates) {
  requireRole(['administrator', 'teacher']);
  if (!assignmentId) throw new Error('Assignment ID is required.');
  if (!updates) throw new Error('Updates are required.');

  // Validate title if provided
  if (updates.title !== undefined) {
    if (!updates.title || typeof updates.title !== 'string' || updates.title.trim().length === 0) {
      throw new Error('Title cannot be empty.');
    }
    if (updates.title.length > 200) {
      throw new Error('Title must be 200 characters or less.');
    }
    updates.title = updates.title.trim();
  }

  // Validate instructions if provided
  if (updates.instructions !== undefined && updates.instructions.length > 2000) {
    throw new Error('Instructions must be 2000 characters or less.');
  }

  // Validate scaffold level if provided
  if (updates.scaffoldLevel !== undefined) {
    if (VALID_SCAFFOLD_LEVELS_.indexOf(updates.scaffoldLevel) === -1) {
      throw new Error('Invalid scaffold level: ' + updates.scaffoldLevel);
    }
  }

  // Validate status if provided
  if (updates.status !== undefined) {
    if (VALID_ASSIGNMENT_STATUSES_.indexOf(updates.status) === -1) {
      throw new Error('Invalid status: ' + updates.status);
    }
  }

  // Validate due date if provided
  if (updates.dueDate !== undefined && updates.dueDate !== '') {
    validateDueDate_(updates.dueDate);
  }

  // Validate template if changing
  if (updates.templateId) {
    try {
      getLabTemplate(updates.templateId);
    } catch (e) {
      throw new Error('Invalid template: ' + e.message);
    }
  }

  // Validate rubric if changing
  if (updates.rubricId) {
    try {
      getLabRubric(updates.rubricId);
    } catch (e) {
      throw new Error('Invalid rubric: ' + e.message);
    }
  }

  // Serialize section overrides if provided
  if (updates.sectionOverrides !== undefined) {
    updates.sectionOverridesJson = updates.sectionOverrides
      ? JSON.stringify(updates.sectionOverrides) : '';
    delete updates.sectionOverrides;
  }

  updates.updatedAt = now_();

  const updated = updateLabRow_('LabAssignments', 'assignmentId', assignmentId, updates);
  if (!updated) throw new Error('Assignment not found: ' + assignmentId);

  return { success: true };
}


/**
 * Delete a lab assignment.
 * Teacher/admin only. Checks for submissions first.
 *
 * @param {string} assignmentId - Assignment ID
 * @returns {Object} { success: true }
 */
function deleteLabAssignment(assignmentId) {
  requireRole(['administrator', 'teacher']);
  if (!assignmentId) throw new Error('Assignment ID is required.');

  // Check for submissions
  const submissions = findLabRows_('LabSubmissions', 'assignmentId', assignmentId);
  if (submissions.length > 0) {
    throw new Error(
      'Cannot delete assignment: ' + submissions.length +
      ' submission(s) exist. Close the assignment instead.'
    );
  }

  const deleted = deleteLabRow_('LabAssignments', 'assignmentId', assignmentId);
  if (!deleted) throw new Error('Assignment not found: ' + assignmentId);

  return { success: true };
}


/**
 * Assign a lab assignment to a class.
 * Updates the classId on an existing assignment.
 * Teacher/admin only.
 *
 * @param {string} assignmentId - Assignment ID
 * @param {string} classId - Class ID to assign to
 * @returns {Object} { success: true }
 */
function assignLabToClass(assignmentId, classId) {
  requireRole(['administrator', 'teacher']);
  if (!assignmentId) throw new Error('Assignment ID is required.');
  if (!classId) throw new Error('Class ID is required.');

  const updated = updateLabRow_('LabAssignments', 'assignmentId', assignmentId, {
    classId: classId,
    updatedAt: now_()
  });

  if (!updated) throw new Error('Assignment not found: ' + assignmentId);

  return { success: true };
}


/**
 * Activate a lab assignment (set status to 'active').
 * Validates that template and rubric are set before activation.
 * Teacher/admin only.
 *
 * @param {string} assignmentId - Assignment ID
 * @returns {Object} { success: true }
 */
function activateLabAssignment(assignmentId) {
  requireRole(['administrator', 'teacher']);
  if (!assignmentId) throw new Error('Assignment ID is required.');

  // Load assignment to validate readiness
  const rows = findLabRows_('LabAssignments', 'assignmentId', assignmentId);
  if (rows.length === 0) throw new Error('Assignment not found: ' + assignmentId);

  const asmt = rows[0];

  if (!asmt.templateId) {
    throw new Error('Cannot activate: no template selected.');
  }
  if (!asmt.rubricId) {
    throw new Error('Cannot activate: no rubric selected.');
  }

  const updated = updateLabRow_('LabAssignments', 'assignmentId', assignmentId, {
    status: 'active',
    updatedAt: now_()
  });

  if (!updated) throw new Error('Assignment not found: ' + assignmentId);

  return { success: true };
}


/**
 * Get a summary of lab assignments for a map (for teacher dashboard / hex info).
 * Returns a lightweight summary: assignmentId, hexId, title, status, templateTitle, rubricTitle.
 * Teacher/admin only.
 *
 * @param {string} mapId - Map ID
 * @returns {Array<Object>} Assignment summaries
 */
function getLabAssignmentSummaryForMap(mapId) {
  requireRole(['administrator', 'teacher']);
  if (!mapId) return [];

  const assignments = findLabRows_('LabAssignments', 'mapId', mapId);
  const summaries = [];

  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    summaries.push({
      assignmentId: a.assignmentId,
      hexId: a.hexId,
      title: a.title || 'Untitled',
      status: a.status || 'draft',
      templateId: a.templateId,
      rubricId: a.rubricId,
      classId: a.classId || '',
      scaffoldLevel: a.scaffoldLevel || 'medium',
      dueDate: a.dueDate || ''
    });
  }

  return summaries;
}


// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Parse a JSON field value safely.
 *
 * @param {string} value - JSON string or empty
 * @returns {Object|null} Parsed object or null
 * @private
 */
function parseJsonField_(value) {
  if (!value || typeof value !== 'string' || value.trim() === '') return null;
  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
}


// Note: validateDueDate_ is reused from TaskService.gs — shared helper.
// parseJsonSafe_ is reused from LabTemplateService.gs.
