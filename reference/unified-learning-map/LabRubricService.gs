/**
 * Lab Rubric Service — Rubric & Criteria CRUD with Framework Linking
 *
 * Manages lab report rubrics and their criteria in the external LabReports
 * spreadsheet. Rubrics define how lab reports are scored. Each rubric has
 * multiple criteria, and each criterion links to internal scientific thinking
 * dimensions and optionally to a specific framework criterion.
 *
 * Uses LabConfigService.gs helpers: readLabSheet_, findLabRows_, appendLabRow_,
 * updateLabRow_, deleteLabRow_.
 *
 * Uses LabFrameworks.gs: lookupDimension_(), lookupFramework_(),
 * getDimensionsForCriterion_().
 *
 * Sheet: LabRubrics (rubric metadata)
 * Sheet: LabRubricCriteria (individual criterion rows)
 *
 * @version 1.0.0
 */


// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_RUBRIC_STATUSES_ = ['draft', 'published'];
const VALID_SCALE_TYPES_ = ['numeric', 'level'];
const MAX_CRITERIA_PER_RUBRIC_ = 12;
const MAX_SCALE_MAX_ = 10;
const VALID_DIMENSION_CODES_ = ['QD', 'HP', 'DI', 'CD', 'PA', 'EC', 'CM', 'RC'];


// ============================================================================
// PUBLIC FUNCTIONS — RUBRICS
// ============================================================================

/**
 * Get all lab rubrics.
 * Teacher/admin only.
 *
 * @returns {Object} { rubrics: Array }
 */
function getLabRubrics() {
  requireRole(['administrator', 'teacher']);

  let rubrics = [];
  try {
    rubrics = readLabSheet_('LabRubrics');
    for (let i = 0; i < rubrics.length; i++) {
      rubrics[i].scaleLabelJson = parseJsonSafeObj_(rubrics[i].scaleLabelJson);
      rubrics[i].multiScorer = rubrics[i].multiScorer === 'true' || rubrics[i].multiScorer === true;
    }
  } catch (e) {
    Logger.log('getLabRubrics: custom rubrics unavailable: ' + e.message);
  }

  return { rubrics: rubrics, preloaded: getPreloadedRubrics() };
}


/**
 * Get a single rubric by ID, including its criteria.
 * Teacher/admin only.
 *
 * @param {string} rubricId - Rubric ID
 * @returns {Object} Rubric object with criteria array
 */
function getLabRubric(rubricId) {
  requireRole(['administrator', 'teacher']);
  if (!rubricId) throw new Error('Rubric ID is required.');

  // Check preloaded first
  const preloaded = getPreloadedRubrics();
  for (let i = 0; i < preloaded.length; i++) {
    if (preloaded[i].rubricId === rubricId) {
      return preloaded[i];
    }
  }

  // Custom rubrics
  const rows = findLabRows_('LabRubrics', 'rubricId', rubricId);
  if (rows.length === 0) throw new Error('Rubric not found: ' + rubricId);

  const rubric = rows[0];
  rubric.scaleLabelJson = parseJsonSafeObj_(rubric.scaleLabelJson);
  rubric.multiScorer = rubric.multiScorer === 'true' || rubric.multiScorer === true;

  // Load criteria
  rubric.criteria = getRubricCriteria(rubricId);

  return rubric;
}


/**
 * Save a rubric (create or update).
 * Teacher/admin only.
 *
 * @param {Object} rubric - Rubric data
 * @param {string} [rubric.rubricId] - If provided, update; if absent, create
 * @param {string} rubric.title - Rubric title (required, max 200 chars)
 * @param {string} [rubric.scaleType] - 'numeric' or 'level' (default: 'level')
 * @param {number} [rubric.scaleMax] - Max score per criterion (default: 8, max: 10)
 * @param {Object} [rubric.scaleLabels] - Label definitions for each level
 * @param {string} [rubric.frameworkId] - Framework this rubric follows
 * @param {boolean} [rubric.multiScorer] - Enable multi-scorer mode
 * @param {string} [rubric.status] - 'draft' or 'published'
 * @returns {Object} { success: true, rubricId }
 */
function saveLabRubric(rubric) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  if (!rubric) throw new Error('Rubric data is required.');
  if (!rubric.title || typeof rubric.title !== 'string' || rubric.title.trim().length === 0) {
    throw new Error('Rubric title is required.');
  }
  if (rubric.title.length > 200) {
    throw new Error('Rubric title must be 200 characters or less.');
  }

  // Validate scale type
  const scaleType = rubric.scaleType && VALID_SCALE_TYPES_.indexOf(rubric.scaleType) !== -1
    ? rubric.scaleType : 'level';

  // Validate scaleMax
  let scaleMax = parseInt(rubric.scaleMax, 10);
  if (isNaN(scaleMax) || scaleMax < 1) scaleMax = 8;
  if (scaleMax > MAX_SCALE_MAX_) scaleMax = MAX_SCALE_MAX_;

  // Validate frameworkId if provided
  if (rubric.frameworkId && rubric.frameworkId !== '') {
    const fw = lookupFramework_(rubric.frameworkId);
    if (!fw) throw new Error('Invalid framework ID: ' + rubric.frameworkId);
  }

  const status = rubric.status && VALID_RUBRIC_STATUSES_.indexOf(rubric.status) !== -1
    ? rubric.status : 'draft';

  const ts = now_();
  const scaleLabelsStr = rubric.scaleLabels ? JSON.stringify(rubric.scaleLabels) : '';

  if (rubric.rubricId) {
    // Block editing preloaded rubrics
    if (String(rubric.rubricId).indexOf('preload-rubric-') === 0) {
      throw new Error('Cannot edit a preloaded rubric. Duplicate it first to customize.');
    }

    const updated = updateLabRow_('LabRubrics', 'rubricId', rubric.rubricId, {
      title: rubric.title.trim(),
      scaleType: scaleType,
      scaleMax: scaleMax,
      scaleLabelJson: scaleLabelsStr,
      frameworkId: rubric.frameworkId || '',
      multiScorer: rubric.multiScorer ? 'true' : 'false',
      status: status,
      updatedAt: ts
    });
    if (!updated) throw new Error('Rubric not found for update: ' + rubric.rubricId);
    return { success: true, rubricId: rubric.rubricId };
  } else {
    // Create new
    const rubricId = generateLabRubricId_();
    appendLabRow_('LabRubrics', {
      rubricId: rubricId,
      title: rubric.title.trim(),
      createdBy: user.email,
      scaleType: scaleType,
      scaleMax: scaleMax,
      scaleLabelJson: scaleLabelsStr,
      frameworkId: rubric.frameworkId || '',
      multiScorer: rubric.multiScorer ? 'true' : 'false',
      status: status,
      createdAt: ts,
      updatedAt: ts
    });
    return { success: true, rubricId: rubricId };
  }
}


/**
 * Delete a rubric and all its criteria.
 * Teacher/admin only. Cannot delete preloaded rubrics.
 *
 * @param {string} rubricId - Rubric ID to delete
 * @returns {Object} { success: true }
 */
function deleteLabRubric(rubricId) {
  requireRole(['administrator', 'teacher']);
  if (!rubricId) throw new Error('Rubric ID is required.');

  if (String(rubricId).indexOf('preload-rubric-') === 0) {
    throw new Error('Cannot delete a preloaded rubric.');
  }

  // Check if any assignments use this rubric
  const assignments = findLabRows_('LabAssignments', 'rubricId', rubricId);
  if (assignments.length > 0) {
    throw new Error('Cannot delete rubric: ' + assignments.length + ' assignment(s) are using it.');
  }

  // Delete all criteria for this rubric first
  deleteAllRubricCriteria_(rubricId);

  // Delete the rubric itself
  const deleted = deleteLabRow_('LabRubrics', 'rubricId', rubricId);
  if (!deleted) throw new Error('Rubric not found: ' + rubricId);
  return { success: true };
}


/**
 * Duplicate a rubric (including all criteria).
 * Teacher/admin only. Works for both preloaded and custom rubrics.
 *
 * @param {string} sourceRubricId - Rubric to duplicate
 * @param {string} [newTitle] - Optional new title
 * @returns {Object} { success: true, rubricId }
 */
function duplicateLabRubric(sourceRubricId, newTitle) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  if (!sourceRubricId) throw new Error('Source rubric ID is required.');

  const source = getLabRubric(sourceRubricId);
  const ts = now_();
  const rubricId = generateLabRubricId_();
  const title = newTitle && newTitle.trim().length > 0
    ? newTitle.trim()
    : 'Copy of ' + source.title;

  if (title.length > 200) {
    throw new Error('Rubric title must be 200 characters or less.');
  }

  // Create the rubric
  appendLabRow_('LabRubrics', {
    rubricId: rubricId,
    title: title,
    createdBy: user.email,
    scaleType: source.scaleType || 'level',
    scaleMax: source.scaleMax || 8,
    scaleLabelJson: source.scaleLabelJson ? JSON.stringify(source.scaleLabelJson) : '',
    frameworkId: source.frameworkId || '',
    multiScorer: source.multiScorer ? 'true' : 'false',
    status: 'draft',
    createdAt: ts,
    updatedAt: ts
  });

  // Duplicate all criteria with new IDs
  const criteria = source.criteria || [];
  for (let i = 0; i < criteria.length; i++) {
    const crit = criteria[i];
    const newCritId = generateLabCriterionId_();
    appendLabRow_('LabRubricCriteria', {
      criterionId: newCritId,
      rubricId: rubricId,
      title: crit.title || '',
      internalDimensions: crit.internalDimensions || '',
      frameworkCriterionId: crit.frameworkCriterionId || '',
      sequence: crit.sequence || (i + 1),
      weight: crit.weight !== undefined ? crit.weight : 1,
      level0Desc: crit.level0Desc || '',
      level1Desc: crit.level1Desc || '',
      level2Desc: crit.level2Desc || '',
      level3Desc: crit.level3Desc || '',
      level4Desc: crit.level4Desc || ''
    });
  }

  return { success: true, rubricId: rubricId };
}


// ============================================================================
// PUBLIC FUNCTIONS — CRITERIA
// ============================================================================

/**
 * Get all criteria for a rubric.
 * Teacher/admin only.
 *
 * @param {string} rubricId - Rubric ID
 * @returns {Array<Object>} Criteria sorted by sequence
 */
function getRubricCriteria(rubricId) {
  requireRole(['administrator', 'teacher']);
  if (!rubricId) throw new Error('Rubric ID is required.');

  // Check preloaded first
  const preloaded = getPreloadedRubrics();
  for (let i = 0; i < preloaded.length; i++) {
    if (preloaded[i].rubricId === rubricId) {
      return preloaded[i].criteria || [];
    }
  }

  // Custom criteria from sheet
  const criteria = findLabRows_('LabRubricCriteria', 'rubricId', rubricId);

  // Sort by sequence
  criteria.sort(function(a, b) {
    return (parseInt(a.sequence, 10) || 0) - (parseInt(b.sequence, 10) || 0);
  });

  return criteria;
}


/**
 * Save criteria for a rubric (batch upsert).
 * Replaces all criteria for the rubric with the provided set.
 * Teacher/admin only.
 *
 * @param {string} rubricId - Rubric ID
 * @param {Array<Object>} criteria - Array of criterion objects
 * @returns {Object} { success: true, count }
 */
function saveRubricCriteria(rubricId, criteria) {
  requireRole(['administrator', 'teacher']);
  if (!rubricId) throw new Error('Rubric ID is required.');

  if (String(rubricId).indexOf('preload-rubric-') === 0) {
    throw new Error('Cannot edit criteria on a preloaded rubric. Duplicate the rubric first.');
  }

  if (!criteria || !Array.isArray(criteria)) {
    throw new Error('Criteria array is required.');
  }
  if (criteria.length === 0) {
    throw new Error('Rubric must have at least one criterion.');
  }
  if (criteria.length > MAX_CRITERIA_PER_RUBRIC_) {
    throw new Error('Rubric can have at most ' + MAX_CRITERIA_PER_RUBRIC_ + ' criteria.');
  }

  // Validate each criterion
  for (let i = 0; i < criteria.length; i++) {
    validateCriterion_(criteria[i], i);
  }

  // Delete existing criteria for this rubric
  deleteAllRubricCriteria_(rubricId);

  // Insert new criteria
  for (let i = 0; i < criteria.length; i++) {
    const crit = criteria[i];
    const criterionId = crit.criterionId || generateLabCriterionId_();

    appendLabRow_('LabRubricCriteria', {
      criterionId: criterionId,
      rubricId: rubricId,
      title: crit.title.trim(),
      internalDimensions: formatDimensionsString_(crit.internalDimensions),
      frameworkCriterionId: crit.frameworkCriterionId || '',
      sequence: crit.sequence || (i + 1),
      weight: crit.weight !== undefined ? crit.weight : 1,
      level0Desc: crit.level0Desc || '',
      level1Desc: crit.level1Desc || '',
      level2Desc: crit.level2Desc || '',
      level3Desc: crit.level3Desc || '',
      level4Desc: crit.level4Desc || ''
    });
  }

  // Update rubric updatedAt
  updateLabRow_('LabRubrics', 'rubricId', rubricId, {
    updatedAt: now_()
  });

  return { success: true, count: criteria.length };
}


/**
 * Link a criterion to a framework criterion and auto-populate dimensions.
 * Teacher/admin only.
 *
 * When a criterion is linked to a framework criterion (e.g. 'MYP-SCI-B'),
 * the internalDimensions are auto-populated from the framework definition.
 *
 * @param {string} criterionId - Lab criterion ID
 * @param {string} frameworkId - Framework ID (e.g. 'IB-MYP-SCI')
 * @param {string} frameworkCriterionId - Framework criterion ID (e.g. 'MYP-SCI-B')
 * @returns {Object} { success: true, dimensions }
 */
function linkCriterionToFramework(criterionId, frameworkId, frameworkCriterionId) {
  requireRole(['administrator', 'teacher']);
  if (!criterionId) throw new Error('Criterion ID is required.');
  if (!frameworkId) throw new Error('Framework ID is required.');
  if (!frameworkCriterionId) throw new Error('Framework criterion ID is required.');

  // Validate the framework exists
  const framework = lookupFramework_(frameworkId);
  if (!framework) throw new Error('Invalid framework: ' + frameworkId);

  // Find the framework criterion and get its dimensions
  const items = framework.criteria || framework.practices || [];
  let foundItem = null;
  for (let i = 0; i < items.length; i++) {
    if (items[i].criterionId === frameworkCriterionId || items[i].practiceId === frameworkCriterionId) {
      foundItem = items[i];
      break;
    }
  }

  if (!foundItem) {
    throw new Error('Framework criterion not found: ' + frameworkCriterionId + ' in ' + frameworkId);
  }

  const dimensions = foundItem.internalDimensions || [];
  const dimensionsStr = dimensions.join(',');

  // Update the criterion
  const updated = updateLabRow_('LabRubricCriteria', 'criterionId', criterionId, {
    frameworkCriterionId: frameworkCriterionId,
    internalDimensions: dimensionsStr
  });

  if (!updated) throw new Error('Criterion not found: ' + criterionId);

  return {
    success: true,
    dimensions: dimensions,
    dimensionsStr: dimensionsStr,
    frameworkCriterionTitle: foundItem.title
  };
}


// ============================================================================
// PRELOADED RUBRICS (Hardcoded, read-only)
// ============================================================================

/**
 * Get preloaded rubrics matching the 5 preloaded templates.
 *
 * @returns {Array<Object>} Preloaded rubric objects with criteria
 */
function getPreloadedRubrics() {
  return [
    buildPreloadedMypBcRubric_(),
    buildPreloadedDpIaRubric_(),
    buildPreloadedApRubric_(),
    buildPreloadedQuickLabRubric_(),
    buildPreloadedMypY13Rubric_()
  ];
}


// ── Rubric 1: MYP Sciences Criteria B+C (Year 4-5) ─────────────────────

function buildPreloadedMypBcRubric_() {
  return {
    rubricId: 'preload-rubric-myp-bc',
    title: 'MYP Sciences Criteria B+C (Year 4-5)',
    createdBy: 'system',
    isPreloaded: true,
    scaleType: 'level',
    scaleMax: 8,
    scaleLabelJson: {
      '0': 'Not Achieved',
      '1-2': 'Limited',
      '3-4': 'Adequate',
      '5-6': 'Substantial',
      '7-8': 'Excellent'
    },
    frameworkId: 'IB-MYP-SCI',
    multiScorer: false,
    status: 'published',
    criteria: [
      {
        criterionId: 'preload-crit-myp-b',
        rubricId: 'preload-rubric-myp-bc',
        title: 'Criterion B: Inquiring and Designing',
        internalDimensions: 'QD,HP,DI',
        frameworkCriterionId: 'MYP-SCI-B',
        sequence: 1,
        weight: 1,
        level0Desc: 'The student does not reach a standard identified by any of the descriptors below.',
        level1Desc: 'States a problem or question; outlines a hypothesis; outlines variables; designs a method with limited success.',
        level2Desc: 'Outlines a problem; formulates a hypothesis using scientific reasoning; outlines variable manipulation and data collection; designs a safe method with selected materials.',
        level3Desc: 'Describes a problem; formulates and explains a hypothesis; describes variable manipulation and sufficient data collection; designs a complete and safe method with appropriate materials.',
        level4Desc: 'Explains a problem; formulates and explains a hypothesis using correct scientific reasoning; explains variable manipulation and data collection; designs a logical, complete and safe method.'
      },
      {
        criterionId: 'preload-crit-myp-c',
        rubricId: 'preload-rubric-myp-bc',
        title: 'Criterion C: Processing and Evaluating',
        internalDimensions: 'CD,PA,EC',
        frameworkCriterionId: 'MYP-SCI-C',
        sequence: 2,
        weight: 1,
        level0Desc: 'The student does not reach a standard identified by any of the descriptors below.',
        level1Desc: 'Collects and presents data; interprets data; states validity of hypothesis and method; states improvements.',
        level2Desc: 'Correctly presents data; accurately interprets and explains results; outlines validity of hypothesis and method; outlines beneficial improvements.',
        level3Desc: 'Correctly organizes and presents data; accurately interprets and explains results using scientific reasoning; discusses validity; describes beneficial improvements.',
        level4Desc: 'Correctly organizes, transforms and presents data; accurately interprets and explains using correct scientific reasoning; evaluates validity; explains beneficial improvements.'
      }
    ]
  };
}


// ── Rubric 2: IB DP IA 2025 ────────────────────────────────────────────

function buildPreloadedDpIaRubric_() {
  return {
    rubricId: 'preload-rubric-dp-ia',
    title: 'IB DP Internal Assessment (2025)',
    createdBy: 'system',
    isPreloaded: true,
    scaleType: 'numeric',
    scaleMax: 6,
    scaleLabelJson: {
      '0': 'Not Demonstrated',
      '1-2': 'Emerging',
      '3-4': 'Developing',
      '5-6': 'Complete'
    },
    frameworkId: 'IB-DP-IA',
    multiScorer: true,
    status: 'published',
    criteria: [
      {
        criterionId: 'preload-crit-dp-rd',
        rubricId: 'preload-rubric-dp-ia',
        title: 'Research Design',
        internalDimensions: 'QD,HP,DI',
        frameworkCriterionId: 'DP-IA-RD',
        sequence: 1,
        weight: 1,
        level0Desc: 'The report does not reach a standard described by the descriptors below.',
        level1Desc: 'Research question stated but not clearly focused. Methodology outlined with significant gaps. Variables identified but not fully explained.',
        level2Desc: 'Research question relevant and focused. Methodology described and mostly appropriate. Variables identified and explained. Safety/ethical considerations addressed.',
        level3Desc: '',
        level4Desc: 'Research question relevant, fully focused and feasible. Methodology clearly communicated and highly appropriate. Variables fully explained with control strategies. Safety/ethical/environmental considerations thoroughly addressed.'
      },
      {
        criterionId: 'preload-crit-dp-da',
        rubricId: 'preload-rubric-dp-ia',
        title: 'Data Analysis',
        internalDimensions: 'CD,PA',
        frameworkCriterionId: 'DP-IA-DA',
        sequence: 2,
        weight: 1,
        level0Desc: 'The report does not reach a standard described by the descriptors below.',
        level1Desc: 'Raw data recorded but may be incomplete. Some processing attempted. Uncertainties not adequately addressed.',
        level2Desc: 'Raw data correctly recorded and organized. Processing appropriate and mostly correct. Some consideration of uncertainties.',
        level3Desc: '',
        level4Desc: 'Raw data recorded accurately with appropriate precision. Data processed thoroughly with correct techniques. Uncertainties fully propagated and impact discussed.'
      },
      {
        criterionId: 'preload-crit-dp-co',
        rubricId: 'preload-rubric-dp-ia',
        title: 'Conclusion',
        internalDimensions: 'EC,RC',
        frameworkCriterionId: 'DP-IA-CO',
        sequence: 3,
        weight: 1,
        level0Desc: 'The report does not reach a standard described by the descriptors below.',
        level1Desc: 'Conclusion stated but weakly justified. Limited scientific context.',
        level2Desc: 'Conclusion supported by data and addresses the research question. Some scientific context and reasoning provided.',
        level3Desc: '',
        level4Desc: 'Conclusion fully supported by data, comprehensively addresses the research question, and placed in thorough scientific context with detailed reasoning.'
      },
      {
        criterionId: 'preload-crit-dp-ev',
        rubricId: 'preload-rubric-dp-ia',
        title: 'Evaluation',
        internalDimensions: 'EC,RC',
        frameworkCriterionId: 'DP-IA-EV',
        sequence: 4,
        weight: 1,
        level0Desc: 'The report does not reach a standard described by the descriptors below.',
        level1Desc: 'Strengths and/or weaknesses stated. Improvements are superficial.',
        level2Desc: 'Strengths and weaknesses described with some detail. Realistic improvements suggested.',
        level3Desc: '',
        level4Desc: 'Strengths and weaknesses thoroughly evaluated with reference to data quality. Detailed, realistic improvements proposed with scientific justification. Extensions thoughtfully suggested.'
      }
    ]
  };
}


// ── Rubric 3: AP Science Practices ──────────────────────────────────────

function buildPreloadedApRubric_() {
  return {
    rubricId: 'preload-rubric-ap',
    title: 'AP Lab Report Rubric',
    createdBy: 'system',
    isPreloaded: true,
    scaleType: 'level',
    scaleMax: 4,
    scaleLabelJson: {
      '0': 'Not Demonstrated',
      '1': 'Beginning',
      '2': 'Developing',
      '3': 'Proficient',
      '4': 'Advanced'
    },
    frameworkId: 'AP-SCI',
    multiScorer: false,
    status: 'published',
    criteria: [
      {
        criterionId: 'preload-crit-ap-q',
        rubricId: 'preload-rubric-ap',
        title: 'Questions and Methods',
        internalDimensions: 'QD,DI',
        frameworkCriterionId: 'AP-SP3',
        sequence: 1,
        weight: 1,
        level0Desc: 'No research question or method presented.',
        level1Desc: 'Question is vague or untestable. Procedure is incomplete.',
        level2Desc: 'Question is testable. Procedure is described but may lack detail.',
        level3Desc: 'Clear, focused question. Complete procedure with appropriate controls.',
        level4Desc: 'Precise, insightful question. Thorough procedure with excellent controls and justification.'
      },
      {
        criterionId: 'preload-crit-ap-dc',
        rubricId: 'preload-rubric-ap',
        title: 'Data Collection & Analysis',
        internalDimensions: 'CD,PA',
        frameworkCriterionId: 'AP-SP4',
        sequence: 2,
        weight: 1,
        level0Desc: 'No data collected or presented.',
        level1Desc: 'Data is incomplete or poorly organized. Minimal processing.',
        level2Desc: 'Data is organized with units. Some appropriate analysis performed.',
        level3Desc: 'Data is well-organized. Analysis is appropriate and mostly correct. Graphs are clear.',
        level4Desc: 'Data is comprehensive and precise. Analysis is thorough with appropriate statistical methods. Graphs are publication-quality.'
      },
      {
        criterionId: 'preload-crit-ap-arg',
        rubricId: 'preload-rubric-ap',
        title: 'Argumentation & Conclusions',
        internalDimensions: 'EC,RC',
        frameworkCriterionId: 'AP-SP6',
        sequence: 3,
        weight: 1,
        level0Desc: 'No conclusion presented.',
        level1Desc: 'Conclusion restates hypothesis without evidence. No error analysis.',
        level2Desc: 'Conclusion references data. Some error discussion. Limited connection to theory.',
        level3Desc: 'Conclusion well-supported by evidence. Error analysis includes systematic and random errors. Connects to scientific principles.',
        level4Desc: 'Compelling, evidence-based conclusion. Thorough error analysis with quantitative assessment. Deep integration with scientific theory. Insightful extensions proposed.'
      },
      {
        criterionId: 'preload-crit-ap-comm',
        rubricId: 'preload-rubric-ap',
        title: 'Communication',
        internalDimensions: 'CM',
        frameworkCriterionId: 'AP-SP1',
        sequence: 4,
        weight: 1,
        level0Desc: 'Report is incoherent or missing major sections.',
        level1Desc: 'Report has major organizational issues. Scientific language is limited.',
        level2Desc: 'Report is organized. Uses some scientific terminology correctly.',
        level3Desc: 'Report is well-organized and clear. Appropriate scientific language. Sources cited.',
        level4Desc: 'Report is professional quality. Precise scientific language throughout. Complete, correct citations. Excellent visual presentation.'
      }
    ]
  };
}


// ── Rubric 4: Quick Lab (Simplified) ────────────────────────────────────

function buildPreloadedQuickLabRubric_() {
  return {
    rubricId: 'preload-rubric-quick',
    title: 'Quick Lab Rubric',
    createdBy: 'system',
    isPreloaded: true,
    scaleType: 'level',
    scaleMax: 4,
    scaleLabelJson: {
      '0': 'Not Shown',
      '1': 'Beginning',
      '2': 'Developing',
      '3': 'Meeting',
      '4': 'Exceeding'
    },
    frameworkId: '',
    multiScorer: false,
    status: 'published',
    criteria: [
      {
        criterionId: 'preload-crit-ql-q',
        rubricId: 'preload-rubric-quick',
        title: 'Question & Prediction',
        internalDimensions: 'QD,HP',
        frameworkCriterionId: '',
        sequence: 1,
        weight: 1,
        level0Desc: 'No question or prediction.',
        level1Desc: 'Question or prediction is unclear.',
        level2Desc: 'Question is stated. Prediction given without reasoning.',
        level3Desc: 'Clear question. Prediction includes a reason.',
        level4Desc: 'Precise question. Prediction includes scientific reasoning.'
      },
      {
        criterionId: 'preload-crit-ql-d',
        rubricId: 'preload-rubric-quick',
        title: 'Data',
        internalDimensions: 'CD',
        frameworkCriterionId: '',
        sequence: 2,
        weight: 1,
        level0Desc: 'No data recorded.',
        level1Desc: 'Some data recorded but disorganized.',
        level2Desc: 'Data recorded in a table. Some units missing.',
        level3Desc: 'Data clearly organized in a table with units.',
        level4Desc: 'Data well-organized with units, labels, and multiple trials.'
      },
      {
        criterionId: 'preload-crit-ql-c',
        rubricId: 'preload-rubric-quick',
        title: 'Conclusion',
        internalDimensions: 'EC',
        frameworkCriterionId: '',
        sequence: 3,
        weight: 1,
        level0Desc: 'No conclusion.',
        level1Desc: 'Conclusion is vague or unrelated to data.',
        level2Desc: 'Conclusion addresses the question. Some reference to data.',
        level3Desc: 'Conclusion clearly answers the question using data as evidence.',
        level4Desc: 'Conclusion answers the question with specific data evidence and scientific explanation.'
      }
    ]
  };
}


// ── Rubric 5: MYP B+C (Year 1-3) ───────────────────────────────────────

function buildPreloadedMypY13Rubric_() {
  return {
    rubricId: 'preload-rubric-myp-y13',
    title: 'MYP Sciences Criteria B+C (Year 1-3)',
    createdBy: 'system',
    isPreloaded: true,
    scaleType: 'level',
    scaleMax: 8,
    scaleLabelJson: {
      '0': 'Not Achieved',
      '1-2': 'Limited',
      '3-4': 'Adequate',
      '5-6': 'Substantial',
      '7-8': 'Excellent'
    },
    frameworkId: 'IB-MYP-SCI',
    multiScorer: false,
    status: 'published',
    criteria: [
      {
        criterionId: 'preload-crit-mypy13-b',
        rubricId: 'preload-rubric-myp-y13',
        title: 'Criterion B: Inquiring and Designing',
        internalDimensions: 'QD,HP,DI',
        frameworkCriterionId: 'MYP-SCI-B',
        sequence: 1,
        weight: 1,
        level0Desc: 'The student does not reach a standard identified by any of the descriptors below.',
        level1Desc: 'States a problem or question; states a testable hypothesis; states the variables; designs a method with limited success.',
        level2Desc: 'Outlines a problem; outlines a testable hypothesis; outlines variables and how to manipulate them; designs a safe method, selecting materials and equipment.',
        level3Desc: 'Describes a problem; describes a testable hypothesis; describes how to manipulate variables; designs a complete and safe method, selecting appropriate materials.',
        level4Desc: 'Explains a problem; explains a testable hypothesis using scientific reasoning; explains how to manipulate variables; designs a logical, complete and safe method.'
      },
      {
        criterionId: 'preload-crit-mypy13-c',
        rubricId: 'preload-rubric-myp-y13',
        title: 'Criterion C: Processing and Evaluating',
        internalDimensions: 'CD,PA,EC',
        frameworkCriterionId: 'MYP-SCI-C',
        sequence: 2,
        weight: 1,
        level0Desc: 'The student does not reach a standard identified by any of the descriptors below.',
        level1Desc: 'Collects and presents data; interprets data; states the validity of the hypothesis; states the validity of the method; states improvements.',
        level2Desc: 'Correctly presents data; accurately interprets data and explains results; outlines validity of hypothesis and method; outlines improvements.',
        level3Desc: 'Correctly organizes and presents data; accurately interprets data and explains results using scientific reasoning; discusses validity; describes improvements.',
        level4Desc: 'Correctly organizes, transforms and presents data; accurately interprets and explains using correct scientific reasoning; evaluates validity; explains improvements.'
      }
    ]
  };
}


// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Validate a single criterion object.
 *
 * @param {Object} crit - Criterion object
 * @param {number} index - Array index (for error messages)
 * @throws {Error} If validation fails
 * @private
 */
function validateCriterion_(crit, index) {
  if (!crit.title || typeof crit.title !== 'string' || crit.title.trim().length === 0) {
    throw new Error('Criterion ' + (index + 1) + ': title is required.');
  }
  if (crit.title.length > 200) {
    throw new Error('Criterion ' + (index + 1) + ': title must be 200 characters or less.');
  }

  // Validate weight
  if (crit.weight !== undefined) {
    const w = parseFloat(crit.weight);
    if (isNaN(w) || w < 0 || w > 10) {
      throw new Error('Criterion ' + (index + 1) + ': weight must be between 0 and 10.');
    }
  }

  // Validate dimension codes
  if (crit.internalDimensions) {
    const dims = typeof crit.internalDimensions === 'string'
      ? crit.internalDimensions.split(',')
      : (Array.isArray(crit.internalDimensions) ? crit.internalDimensions : []);

    for (let d = 0; d < dims.length; d++) {
      const code = dims[d].trim();
      if (code && VALID_DIMENSION_CODES_.indexOf(code) === -1) {
        throw new Error('Criterion ' + (index + 1) + ': invalid dimension code "' + code + '".');
      }
    }
  }

  // Validate sequence
  if (crit.sequence !== undefined) {
    const seq = parseInt(crit.sequence, 10);
    if (isNaN(seq) || seq < 1) {
      throw new Error('Criterion ' + (index + 1) + ': sequence must be a positive integer.');
    }
  }

  // Validate level descriptors (max length)
  const levelFields = ['level0Desc', 'level1Desc', 'level2Desc', 'level3Desc', 'level4Desc'];
  for (let l = 0; l < levelFields.length; l++) {
    if (crit[levelFields[l]] && crit[levelFields[l]].length > 1000) {
      throw new Error('Criterion ' + (index + 1) + ': ' + levelFields[l] + ' must be 1000 characters or less.');
    }
  }
}


/**
 * Format dimensions for storage as comma-separated string.
 * Accepts array or comma-separated string.
 *
 * @param {Array|string} dimensions - Dimension codes
 * @returns {string} Comma-separated string
 * @private
 */
function formatDimensionsString_(dimensions) {
  if (!dimensions) return '';
  if (Array.isArray(dimensions)) return dimensions.join(',');
  if (typeof dimensions === 'string') return dimensions;
  return '';
}


/**
 * Delete all criteria rows for a given rubric.
 * Uses lock for concurrency safety.
 *
 * @param {string} rubricId - Rubric ID
 * @private
 */
function deleteAllRubricCriteria_(rubricId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getLabSheet_('LabRubricCriteria');
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return;

    const headers = data[0];
    const rubricCol = headers.indexOf('rubricId');
    if (rubricCol === -1) return;

    // Delete from bottom to top to avoid index shifting
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][rubricCol]) === String(rubricId)) {
        sheet.deleteRow(i + 1);
      }
    }
  } finally {
    lock.releaseLock();
  }
}


/**
 * Safely parse a JSON string, returning an empty object on failure.
 *
 * @param {string} json - JSON string
 * @returns {Object} Parsed value or {}
 * @private
 */
function parseJsonSafeObj_(json) {
  if (!json || typeof json !== 'string') return {};
  try {
    return JSON.parse(json);
  } catch (e) {
    return {};
  }
}
