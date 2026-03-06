/**
 * Learning Map - UbD Service
 *
 * Handles Understanding by Design (UbD) unit planning:
 * - Stage 1: Desired Results (goals, understandings, essential questions)
 * - Stage 2: Evidence & Assessment (performance tasks, criteria)
 * - Stage 3: Learning Plan (sequence, activities, UDL)
 *
 * @version 2.0.0 - Expanded data model with nested stages
 */
// ============================================================================
// UBD DATA MANAGEMENT
// ============================================================================
/**
 * Get UbD template
 * Returns empty UbD structure for a new unit (expanded nested format)
 *
 * @returns {Object} UbD template object
 */
function getUbdTemplate() {
  return {
    // Overview
    bigIdea: '',
    storyOfTheUnit: '',
    essentialQuestions: [],       // [{question: '', type: ''}] type = F/C/Z/D
    durationWeeks: null,
    status: 'draft',             // draft | in_review | approved | active | archived

    // Stage 1: Desired Results
    stage1: {
      standardIds: [],           // refs to Standards sheet
      additionalGoals: '',
      transferGoals: '',
      enduringUnderstandings: '',
      knowledge: '',
      skills: ''
    },

    // Stage 2: Evidence & Assessment
    stage2: {
      performanceTasks: '',
      otherEvidence: '',
      learningIntentions: []     // [{intention: '', successCriteria: '', evidenceType: ''}]
    },

    // Stage 3: Learning Plan
    stage3: {
      learningActivities: '',
      resources: ''
    },

    // UDL Planning
    udl: {
      representation: [],
      actionExpression: [],
      engagement: [],
      notes: ''
    },

    // Vocabulary
    vocabulary: [],              // [{term: '', definition: '', context: ''}]

    // Metadata (auto-calculated)
    completeness: 0
  };
}
/**
 * Migrate old flat UbD data format to new nested format.
 * Safe to call on already-migrated data (returns as-is).
 * Safe to call on null/empty (returns fresh template).
 *
 * @param {Object} data - UbD data (old or new format)
 * @returns {Object} UbD data in new nested format
 * @private
 */
function migrateUbdData_(data) {
  // Null or empty -> fresh template
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return getUbdTemplate();
  }

  // Already new format? Check for nested stage1 object
  if (data.stage1 && typeof data.stage1 === 'object') {
    // Ensure all fields exist (in case template was expanded after data was saved)
    var template = getUbdTemplate();
    // Merge top-level
    template.bigIdea = data.bigIdea || '';
    template.storyOfTheUnit = data.storyOfTheUnit || '';
    template.durationWeeks = data.durationWeeks || null;
    template.status = data.status || 'draft';
    template.completeness = data.completeness || 0;

    // Essential questions - ensure array of objects
    if (data.essentialQuestions && data.essentialQuestions.length > 0) {
      template.essentialQuestions = data.essentialQuestions.map(function(eq) {
        if (typeof eq === 'string') return { question: eq, type: '' };
        return eq;
      });
    }

    // Stage 1
    template.stage1.standardIds = (data.stage1 && data.stage1.standardIds) || [];
    template.stage1.additionalGoals = (data.stage1 && data.stage1.additionalGoals) || '';
    template.stage1.transferGoals = (data.stage1 && data.stage1.transferGoals) || '';
    template.stage1.enduringUnderstandings = (data.stage1 && data.stage1.enduringUnderstandings) || '';
    template.stage1.knowledge = (data.stage1 && data.stage1.knowledge) || '';
    template.stage1.skills = (data.stage1 && data.stage1.skills) || '';

    // Stage 2
    template.stage2.performanceTasks = (data.stage2 && data.stage2.performanceTasks) || '';
    template.stage2.otherEvidence = (data.stage2 && data.stage2.otherEvidence) || '';
    template.stage2.learningIntentions = (data.stage2 && data.stage2.learningIntentions) || [];

    // Stage 3
    template.stage3.learningActivities = (data.stage3 && data.stage3.learningActivities) || '';
    template.stage3.resources = (data.stage3 && data.stage3.resources) || '';

    // UDL
    template.udl.representation = (data.udl && data.udl.representation) || [];
    template.udl.actionExpression = (data.udl && data.udl.actionExpression) || [];
    template.udl.engagement = (data.udl && data.udl.engagement) || [];
    template.udl.notes = (data.udl && data.udl.notes) || '';

    // Vocabulary
    template.vocabulary = data.vocabulary || [];

    return template;
  }

  // OLD flat format -> migrate to nested
  var migrated = getUbdTemplate();
  migrated.bigIdea = data.bigIdea || '';

  // Old essentialQuestions were plain strings
  if (data.essentialQuestions && data.essentialQuestions.length > 0) {
    migrated.essentialQuestions = data.essentialQuestions.map(function(eq) {
      if (typeof eq === 'string') return { question: eq, type: '' };
      return eq;
    });
  }

  // Stage 1: old flat fields -> nested
  migrated.stage1.enduringUnderstandings = data.stage1_understandings || '';
  // Old format had combined knowledge_skills - put in knowledge, leave skills empty
  migrated.stage1.knowledge = data.stage1_knowledge_skills || '';

  // Stage 2: old flat fields -> nested
  migrated.stage2.performanceTasks = data.stage2_evidence || '';
  migrated.stage2.otherEvidence = data.assessment || '';

  // Stage 3: old flat field -> nested
  migrated.stage3.learningActivities = data.stage3_plan || '';

  // UDL: old single string -> nested notes
  migrated.udl.notes = data.udl_notes || '';

  return migrated;
}
/**
 * Validate UbD data
 * Checks that required fields are present (works with new nested format)
 *
 * @param {Object} ubdData - UbD data object (new nested format)
 * @returns {Object} {valid: boolean, errors: [string], warnings: [string]}
 */
function validateUbdData(ubdData) {
  var data = migrateUbdData_(ubdData);
  var errors = [];
  var warnings = [];

  // Required fields
  if (!data.bigIdea || data.bigIdea.trim() === '') {
    errors.push('Big Idea is required');
  }
  if (!data.essentialQuestions || data.essentialQuestions.length === 0) {
    errors.push('At least one Essential Question is required');
  }
  if (!data.stage1.enduringUnderstandings || data.stage1.enduringUnderstandings.trim() === '') {
    errors.push('Stage 1: Enduring Understandings are required');
  }
  if (!data.stage2.performanceTasks || data.stage2.performanceTasks.trim() === '') {
    errors.push('Stage 2: Performance Tasks are required');
  }
  if (!data.stage3.learningActivities || data.stage3.learningActivities.trim() === '') {
    errors.push('Stage 3: Learning Activities are required');
  }

  // Warnings (recommended but not required)
  if (!data.stage1.knowledge || data.stage1.knowledge.trim() === '') {
    warnings.push('Stage 1: Knowledge section is empty');
  }
  if (!data.stage1.skills || data.stage1.skills.trim() === '') {
    warnings.push('Stage 1: Skills section is empty');
  }
  if (data.stage1.standardIds.length === 0) {
    warnings.push('Stage 1: No standards linked');
  }
  if (data.stage2.learningIntentions.length === 0) {
    warnings.push('Stage 2: No Learning Intentions defined');
  }
  if (data.udl.representation.length === 0 &&
      data.udl.actionExpression.length === 0 &&
      data.udl.engagement.length === 0 &&
      (!data.udl.notes || data.udl.notes.trim() === '')) {
    warnings.push('UDL Planning is empty');
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}
/**
 * Calculate UbD completeness percentage
 * Scores across all fields in the expanded nested structure
 *
 * @param {Object} ubdData - UbD data (new nested format)
 * @returns {number} Percentage complete (0-100)
 * @private
 */
function calculateUbdCompleteness_(ubdData) {
  var data = migrateUbdData_(ubdData);

  // Define fields to check with their paths and types
  var checks = [
    // Overview (3 fields)
    { value: data.bigIdea, type: 'string' },
    { value: data.essentialQuestions, type: 'array' },
    { value: data.storyOfTheUnit, type: 'string' },
    // Stage 1 (4 fields)
    { value: data.stage1.enduringUnderstandings, type: 'string' },
    { value: data.stage1.knowledge, type: 'string' },
    { value: data.stage1.skills, type: 'string' },
    { value: data.stage1.standardIds, type: 'array' },
    // Stage 2 (3 fields)
    { value: data.stage2.performanceTasks, type: 'string' },
    { value: data.stage2.otherEvidence, type: 'string' },
    { value: data.stage2.learningIntentions, type: 'array' },
    // Stage 3 (2 fields)
    { value: data.stage3.learningActivities, type: 'string' },
    { value: data.stage3.resources, type: 'string' }
  ];

  var completed = 0;
  for (var i = 0; i < checks.length; i++) {
    var check = checks[i];
    if (check.type === 'array') {
      if (check.value && check.value.length > 0) completed++;
    } else {
      if (check.value && check.value.trim && check.value.trim() !== '') completed++;
    }
  }

  return Math.round((completed / checks.length) * 100);
}
/**
 * Generate UbD report for map
 *
 * @param {string} mapId - Map ID
 * @returns {Object} UbD report with formatted data
 */
function generateUbdReport(mapId) {
  var map = getMapById(mapId);
  if (!map) {
    throw new Error('Map not found');
  }

  var ubdData = migrateUbdData_(map.ubdData);
  var validation = validateUbdData(ubdData);

  // Count hexes by stage
  var hexesByStage = {
    stage1: 0,
    stage2: 0,
    stage3: 0,
    unassigned: 0
  };
  map.hexes.forEach(function(hex) {
    var stage = (hex.curriculum && hex.curriculum.ubdStage) || 'unassigned';
    hexesByStage[stage] = (hexesByStage[stage] || 0) + 1;
  });

  return {
    mapId: mapId,
    title: map.title,
    ubdData: ubdData,
    validation: validation,
    hexesByStage: hexesByStage,
    totalHexes: map.hexes.length,
    completeness: calculateUbdCompleteness_(ubdData)
  };
}
// ============================================================================
// UBD PLANNER DATA FUNCTIONS (New - for UBD Planner tab)
// ============================================================================
/**
 * Get all data needed for the UBD Planner browser panel.
 * Returns courses with their units and UBD completion percentages.
 *
 * @returns {Object} {courses: [{courseId, title, units: [{unitId, title, mapId, mapTitle, completeness, status}]}]}
 */
function getUbdPlannerData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var user = getCurrentUser();

  // Get all courses
  var coursesSheet = ss.getSheetByName('Courses');
  var courses = [];
  if (coursesSheet && coursesSheet.getLastRow() > 1) {
    var coursesData = coursesSheet.getDataRange().getValues();
    var coursesHeaders = coursesData[0];
    for (var c = 1; c < coursesData.length; c++) {
      var course = rowToObject(coursesData[c], coursesHeaders);
      if (course.active !== false && course.active !== 'false') {
        courses.push({
          courseId: String(course.courseId || ''),
          title: String(course.title || ''),
          department: String(course.programTrack || ''),
          gradeLevel: String(course.gradeLevel || ''),
          units: []
        });
      }
    }
  }

  // Get all units
  var unitsSheet = ss.getSheetByName('Units');
  if (unitsSheet && unitsSheet.getLastRow() > 1) {
    var unitsData = unitsSheet.getDataRange().getValues();
    var unitsHeaders = unitsData[0];
    for (var u = 1; u < unitsData.length; u++) {
      var unit = rowToObject(unitsData[u], unitsHeaders);
      if (unit.active !== false && unit.active !== 'false') {
        var matchingCourse = null;
        for (var mc = 0; mc < courses.length; mc++) {
          if (courses[mc].courseId === String(unit.courseId || '')) {
            matchingCourse = courses[mc];
            break;
          }
        }
        if (matchingCourse) {
          matchingCourse.units.push({
            unitId: String(unit.unitId || ''),
            title: String(unit.title || ''),
            mapId: String(unit.mapId || ''),
            sequence: unit.sequence || 0,
            status: String(unit.status || 'draft'),
            mapTitle: '',
            completeness: 0,
            ubdStatus: 'draft'
          });
        }
      }
    }
  }

  // Get maps data for UBD completeness and map titles
  var mapsSheet = ss.getSheetByName('Maps');
  if (mapsSheet && mapsSheet.getLastRow() > 1) {
    var mapsData = mapsSheet.getDataRange().getValues();
    var mapsHeaders = mapsData[0];
    var mapsLookup = {};
    for (var m = 1; m < mapsData.length; m++) {
      var mapRow = rowToObject(mapsData[m], mapsHeaders);
      var ubdRaw = safeJsonParse_(mapRow.ubdDataJson, {});
      var ubdMigrated = migrateUbdData_(ubdRaw);
      mapsLookup[String(mapRow.mapId || '')] = {
        title: mapRow.title,
        completeness: calculateUbdCompleteness_(ubdMigrated),
        ubdStatus: ubdMigrated.status || 'draft'
      };
    }

    // Enrich units with map data
    for (var ci = 0; ci < courses.length; ci++) {
      for (var ui = 0; ui < courses[ci].units.length; ui++) {
        var unitRef = courses[ci].units[ui];
        if (unitRef.mapId && mapsLookup[unitRef.mapId]) {
          unitRef.mapTitle = mapsLookup[unitRef.mapId].title;
          unitRef.completeness = mapsLookup[unitRef.mapId].completeness;
          unitRef.ubdStatus = mapsLookup[unitRef.mapId].ubdStatus;
        }
      }
      // Sort units by sequence
      courses[ci].units.sort(function(a, b) { return (a.sequence || 0) - (b.sequence || 0); });
    }
  }

  // Filter out courses with no units
  courses = courses.filter(function(c) { return c.units.length > 0; });

  return { courses: courses };
}
/**
 * Get full UBD data for a single unit.
 * Reads from the unit's linked map's ubdDataJson, applies migration.
 * Requires a linked map.
 *
 * @param {string} unitId - Unit ID
 * @returns {Object} {unitId, unitTitle, courseId, mapId, mapTitle, ubdData, hexesByStage}
 */
function getUbdDataForUnit(unitId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Find the unit
  var unitsSheet = ss.getSheetByName('Units');
  if (!unitsSheet || unitsSheet.getLastRow() < 2) {
    throw new Error('Unit not found');
  }
  var unitsData = unitsSheet.getDataRange().getValues();
  var unitsHeaders = unitsData[0];
  var unit = null;
  for (var i = 1; i < unitsData.length; i++) {
    var row = rowToObject(unitsData[i], unitsHeaders);
    if (String(row.unitId) === String(unitId)) {
      unit = row;
      break;
    }
  }
  if (!unit) throw new Error('Unit not found: ' + unitId);
  if (!unit.mapId) throw new Error('Unit has no linked map. Link a map first to enable UBD editing.');

  // Get the map and its UBD data — skip canViewMap() permission check
  // since teachers always pass anyway and this avoids unnecessary sheet reads
  var mapRow = findRow_(SHEETS_.MAPS, 'mapId', unit.mapId);
  if (!mapRow) throw new Error('Linked map not found: ' + unit.mapId);
  var map = parseMapFromRow_(mapRow);

  var ubdData = migrateUbdData_(map.ubdData);

  // Count hexes by stage
  var hexesByStage = { stage1: 0, stage2: 0, stage3: 0, unassigned: 0 };
  map.hexes.forEach(function(hex) {
    var stage = (hex.curriculum && hex.curriculum.ubdStage) || 'unassigned';
    hexesByStage[stage] = (hexesByStage[stage] || 0) + 1;
  });

  return {
    unitId: unit.unitId,
    unitTitle: unit.title,
    courseId: unit.courseId,
    mapId: unit.mapId,
    mapTitle: map.title,
    ubdData: ubdData,
    hexesByStage: hexesByStage,
    totalHexes: map.hexes.length,
    completeness: calculateUbdCompleteness_(ubdData)
  };
}
/**
 * Save UBD planner data for a unit.
 * Writes the ubdData to the unit's linked map's ubdDataJson column.
 * Recalculates completeness before saving.
 *
 * @param {string} unitId - Unit ID
 * @param {Object} ubdData - UBD data object (new nested format)
 * @returns {Object} {success: boolean, completeness: number}
 */
function saveUbdPlannerData(unitId, ubdData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var user = getCurrentUser();
  if (!user.canEdit) {
    throw new Error('Permission denied. Only teachers can save UBD plans.');
  }

  // Find the unit to get its mapId
  var unitsSheet = ss.getSheetByName('Units');
  if (!unitsSheet || unitsSheet.getLastRow() < 2) {
    throw new Error('Unit not found');
  }
  var unitsData = unitsSheet.getDataRange().getValues();
  var unitsHeaders = unitsData[0];
  var unit = null;
  for (var i = 1; i < unitsData.length; i++) {
    var row = rowToObject(unitsData[i], unitsHeaders);
    if (String(row.unitId) === String(unitId)) {
      unit = row;
      break;
    }
  }
  if (!unit) throw new Error('Unit not found: ' + unitId);
  if (!unit.mapId) throw new Error('Unit has no linked map. Link a map first to enable UBD editing.');

  // Ensure data is in the new format
  var cleanData = migrateUbdData_(ubdData);
  cleanData.completeness = calculateUbdCompleteness_(cleanData);

  // Write to the map's ubdDataJson column
  var result = updateMapUbdData(unit.mapId, cleanData);
  if (!result.success) {
    throw new Error('Failed to save UBD data: ' + (result.error || 'Unknown error'));
  }

  return {
    success: true,
    completeness: cleanData.completeness
  };
}
// ============================================================================
// ESSENTIAL QUESTIONS
// ============================================================================
/**
 * Add essential question to map
 *
 * @param {string} mapId - Map ID
 * @param {string|Object} question - Essential question (string or {question, type})
 * @returns {Object} Updated map
 */
function addEssentialQuestion(mapId, question) {
  var map = getMapById(mapId);
  if (!map) {
    throw new Error('Map not found');
  }
  if (!canEditMap(mapId)) {
    throw new Error('You do not have permission to edit this map');
  }
  map.ubdData = migrateUbdData_(map.ubdData);
  if (!map.ubdData.essentialQuestions) {
    map.ubdData.essentialQuestions = [];
  }
  // Accept either a string or {question, type} object
  var eqObj = typeof question === 'string' ? { question: question, type: '' } : question;
  map.ubdData.essentialQuestions.push(eqObj);
  return saveMap(map);
}
/**
 * Remove essential question from map
 *
 * @param {string} mapId - Map ID
 * @param {number} index - Question index
 * @returns {Object} Updated map
 */
function removeEssentialQuestion(mapId, index) {
  var map = getMapById(mapId);
  if (!map) {
    throw new Error('Map not found');
  }
  if (!canEditMap(mapId)) {
    throw new Error('You do not have permission to edit this map');
  }
  map.ubdData = migrateUbdData_(map.ubdData);
  if (!map.ubdData.essentialQuestions) {
    return map;
  }
  map.ubdData.essentialQuestions.splice(index, 1);
  return saveMap(map);
}
/**
 * Get suggested essential questions
 * Template-based suggestions by subject
 *
 * @param {string} subject - Subject area
 * @param {string} topic - Topic
 * @returns {Array<string>} Suggested questions
 */
function getSuggestedEssentialQuestions(subject, topic) {
  var templates = {
    science: [
      'How do we know what we know about {topic}?',
      'What patterns can we observe in {topic}?',
      'How does {topic} affect our daily lives?',
      'What would happen if {topic} changed?'
    ],
    math: [
      'When would we use {topic} in real life?',
      'What patterns exist in {topic}?',
      'How can we prove {topic}?',
      'Why does {topic} work the way it does?'
    ],
    language: [
      'How does {topic} help us communicate?',
      'What makes {topic} effective?',
      'How has {topic} evolved over time?',
      'Why does {topic} matter?'
    ],
    history: [
      'How did {topic} shape our world?',
      'What can we learn from {topic}?',
      'How might {topic} have been different?',
      'Why should we remember {topic}?'
    ]
  };
  var subjectTemplates = templates[subject.toLowerCase()] || templates.science;
  return subjectTemplates.map(function(template) {
    return template.replace('{topic}', topic);
  });
}
// ============================================================================
// UDL (UNIVERSAL DESIGN FOR LEARNING)
// ============================================================================
/**
 * Get UDL framework template
 *
 * @returns {Object} UDL framework with three principles
 */
function getUdlTemplate() {
  return {
    representation: {
      label: 'Representation (The "What")',
      description: 'Provide multiple means of representation',
      strategies: []
    },
    actionExpression: {
      label: 'Action & Expression (The "How")',
      description: 'Provide multiple means of action and expression',
      strategies: []
    },
    engagement: {
      label: 'Engagement (The "Why")',
      description: 'Provide multiple means of engagement',
      strategies: []
    }
  };
}
/**
 * Get UDL strategy suggestions
 *
 * @param {string} principle - UDL principle ('representation', 'actionExpression', 'engagement')
 * @returns {Array<string>} Suggested strategies
 */
function getUdlStrategies(principle) {
  var strategies = {
    representation: [
      'Visual aids and diagrams',
      'Audio recordings and podcasts',
      'Text-to-speech options',
      'Multiple examples and non-examples',
      'Highlighting key information',
      'Vocabulary support',
      'Video demonstrations',
      'Graphic organizers'
    ],
    actionExpression: [
      'Choice in assignment format',
      'Scaffolded practice',
      'Speech-to-text options',
      'Progress monitoring tools',
      'Multiple submission methods',
      'Assistive technology',
      'Collaborative work options',
      'Self-assessment checklists'
    ],
    engagement: [
      'Student choice and autonomy',
      'Relevant real-world connections',
      'Collaborative learning',
      'Immediate feedback',
      'Goal-setting opportunities',
      'Varied difficulty levels',
      'Cultural relevance',
      'Gamification elements'
    ]
  };
  return strategies[principle] || [];
}
/**
 * Add UDL strategy to hex
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {string} principle - UDL principle
 * @param {string} strategy - Strategy description
 * @returns {Object} Updated map
 */
function addUdlStrategyToHex(mapId, hexId, principle, strategy) {
  var map = getMapById(mapId);
  if (!map) {
    throw new Error('Map not found');
  }
  if (!canEditMap(mapId)) {
    throw new Error('You do not have permission to edit this map');
  }
  var hex = map.hexes.find(function(h) { return h.id === hexId; });
  if (!hex) {
    throw new Error('Hex not found');
  }
  if (!hex.curriculum) {
    hex.curriculum = {};
  }
  if (!hex.curriculum.udl) {
    hex.curriculum.udl = {
      representation: [],
      actionExpression: [],
      engagement: []
    };
  }
  if (!hex.curriculum.udl[principle]) {
    hex.curriculum.udl[principle] = [];
  }
  hex.curriculum.udl[principle].push(strategy);
  return saveMap(map);
}
// ============================================================================
// STAGE ASSIGNMENT
// ============================================================================
/**
 * Assign hex to UbD stage
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {string} stage - Stage ('stage1', 'stage2', 'stage3')
 * @returns {Object} Updated map
 */
function assignHexToStage(mapId, hexId, stage) {
  var validStages = ['stage1', 'stage2', 'stage3'];
  if (validStages.indexOf(stage) === -1) {
    throw new Error('Invalid stage. Must be: stage1, stage2, or stage3');
  }
  return updateHex(mapId, hexId, {
    curriculum: {
      ubdStage: stage
    }
  });
}
/**
 * Get hexes by UbD stage
 *
 * @param {string} mapId - Map ID
 * @param {string} stage - Stage ('stage1', 'stage2', 'stage3')
 * @returns {Array<Object>} Hexes in that stage
 */
function getHexesByStage(mapId, stage) {
  var map = getMapById(mapId);
  if (!map) {
    return [];
  }
  return map.hexes.filter(function(hex) {
    return hex.curriculum && hex.curriculum.ubdStage === stage;
  });
}
// ============================================================================
// EXPORT & IMPORT
// ============================================================================
/**
 * Export UbD plan to Google Doc (enhanced with tables and all stages)
 *
 * @param {string} mapId - Map ID
 * @returns {string} Document URL
 */
function exportUbdToDoc(mapId) {
  requireRole(['administrator', 'teacher']);
  var report = generateUbdReport(mapId);
  var ubdData = report.ubdData;

  // Create new document
  var doc = DocumentApp.create('UbD Plan - ' + report.title);
  var body = doc.getBody();

  // Title
  body.appendParagraph(report.title).setHeading(DocumentApp.ParagraphHeading.HEADING1);

  // Unit Information
  if (ubdData.storyOfTheUnit) {
    body.appendParagraph('Story of the Unit').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(ubdData.storyOfTheUnit);
  }

  // Status and Duration
  var infoItems = [];
  if (ubdData.status) infoItems.push('Status: ' + ubdData.status);
  if (ubdData.durationWeeks) infoItems.push('Duration: ' + ubdData.durationWeeks + ' weeks');
  infoItems.push('Completeness: ' + report.completeness + '%');
  body.appendParagraph(infoItems.join(' | ')).setItalic(true);

  // Big Idea
  body.appendParagraph('Big Idea').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(ubdData.bigIdea || 'Not defined');

  // Essential Questions
  body.appendParagraph('Essential Questions').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  if (ubdData.essentialQuestions && ubdData.essentialQuestions.length > 0) {
    ubdData.essentialQuestions.forEach(function(eq) {
      var qText = typeof eq === 'string' ? eq : eq.question;
      var typeLabel = eq.type ? ' [' + eq.type + ']' : '';
      body.appendListItem(qText + typeLabel);
    });
  } else {
    body.appendParagraph('Not defined');
  }

  // Stage 1: Desired Results
  body.appendPageBreak();
  body.appendParagraph('Stage 1: Desired Results').setHeading(DocumentApp.ParagraphHeading.HEADING1);

  if (ubdData.stage1.transferGoals) {
    body.appendParagraph('Transfer Goals').setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.appendParagraph(ubdData.stage1.transferGoals);
  }

  body.appendParagraph('Enduring Understandings').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph(ubdData.stage1.enduringUnderstandings || 'Not defined');

  body.appendParagraph('Knowledge').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph(ubdData.stage1.knowledge || 'Not defined');

  body.appendParagraph('Skills').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph(ubdData.stage1.skills || 'Not defined');

  if (ubdData.stage1.additionalGoals) {
    body.appendParagraph('Additional Goals').setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.appendParagraph(ubdData.stage1.additionalGoals);
  }

  // Stage 2: Evidence & Assessment
  body.appendPageBreak();
  body.appendParagraph('Stage 2: Evidence & Assessment').setHeading(DocumentApp.ParagraphHeading.HEADING1);

  body.appendParagraph('Performance Tasks').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph(ubdData.stage2.performanceTasks || 'Not defined');

  body.appendParagraph('Other Evidence').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph(ubdData.stage2.otherEvidence || 'Not defined');

  if (ubdData.stage2.learningIntentions && ubdData.stage2.learningIntentions.length > 0) {
    body.appendParagraph('Learning Intentions').setHeading(DocumentApp.ParagraphHeading.HEADING3);
    var liTable = body.appendTable();
    var liHeader = liTable.appendTableRow();
    liHeader.appendTableCell('Learning Intention').setBackgroundColor('#e8eaf6');
    liHeader.appendTableCell('Success Criteria').setBackgroundColor('#e8eaf6');
    liHeader.appendTableCell('Evidence Type').setBackgroundColor('#e8eaf6');
    ubdData.stage2.learningIntentions.forEach(function(li) {
      var liRow = liTable.appendTableRow();
      liRow.appendTableCell(li.intention || '');
      liRow.appendTableCell(li.successCriteria || '');
      liRow.appendTableCell(li.evidenceType || '');
    });
  }

  // Stage 3: Learning Plan
  body.appendPageBreak();
  body.appendParagraph('Stage 3: Learning Plan').setHeading(DocumentApp.ParagraphHeading.HEADING1);

  body.appendParagraph('Learning Activities').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph(ubdData.stage3.learningActivities || 'Not defined');

  if (ubdData.stage3.resources) {
    body.appendParagraph('Resources').setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.appendParagraph(ubdData.stage3.resources);
  }

  // UDL Considerations
  var hasUdl = (ubdData.udl.representation.length > 0 ||
                ubdData.udl.actionExpression.length > 0 ||
                ubdData.udl.engagement.length > 0 ||
                (ubdData.udl.notes && ubdData.udl.notes.trim() !== ''));
  if (hasUdl) {
    body.appendPageBreak();
    body.appendParagraph('UDL Considerations').setHeading(DocumentApp.ParagraphHeading.HEADING1);

    var udlPrinciples = [
      { key: 'representation', label: 'Representation (The "What")' },
      { key: 'actionExpression', label: 'Action & Expression (The "How")' },
      { key: 'engagement', label: 'Engagement (The "Why")' }
    ];
    udlPrinciples.forEach(function(p) {
      if (ubdData.udl[p.key] && ubdData.udl[p.key].length > 0) {
        body.appendParagraph(p.label).setHeading(DocumentApp.ParagraphHeading.HEADING3);
        ubdData.udl[p.key].forEach(function(strategy) {
          body.appendListItem(strategy);
        });
      }
    });

    if (ubdData.udl.notes) {
      body.appendParagraph('Additional UDL Notes').setHeading(DocumentApp.ParagraphHeading.HEADING3);
      body.appendParagraph(ubdData.udl.notes);
    }
  }

  // Vocabulary Appendix
  if (ubdData.vocabulary && ubdData.vocabulary.length > 0) {
    body.appendPageBreak();
    body.appendParagraph('Vocabulary').setHeading(DocumentApp.ParagraphHeading.HEADING1);
    var vocabTable = body.appendTable();
    var vocabHeader = vocabTable.appendTableRow();
    vocabHeader.appendTableCell('Term').setBackgroundColor('#e8eaf6');
    vocabHeader.appendTableCell('Definition').setBackgroundColor('#e8eaf6');
    vocabHeader.appendTableCell('Unit Context').setBackgroundColor('#e8eaf6');
    ubdData.vocabulary.forEach(function(v) {
      var vRow = vocabTable.appendTableRow();
      vRow.appendTableCell(v.term || '');
      vRow.appendTableCell(v.definition || '');
      vRow.appendTableCell(v.context || '');
    });
  }

  // Hex Stage Summary
  body.appendParagraph('');
  body.appendParagraph('Hex Stage Assignment Summary').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Stage 1 hexes: ' + report.hexesByStage.stage1);
  body.appendParagraph('Stage 2 hexes: ' + report.hexesByStage.stage2);
  body.appendParagraph('Stage 3 hexes: ' + report.hexesByStage.stage3);
  body.appendParagraph('Unassigned hexes: ' + report.hexesByStage.unassigned);

  // Footer
  body.appendParagraph('');
  body.appendParagraph('Generated on ' + new Date().toLocaleDateString() + ' by Learning Map System')
    .setItalic(true).setForegroundColor('#999999');

  doc.saveAndClose();
  return doc.getUrl();
}
// ============================================================================
// TEST FUNCTIONS
// ============================================================================
/**
 * Test UbD template
 */
function test_getUbdTemplate() {
  var template = getUbdTemplate();
  Logger.log('UbD Template:');
  Logger.log(JSON.stringify(template, null, 2));
}
/**
 * Test migration from old format
 */
function test_migrateUbdData() {
  var oldData = {
    bigIdea: 'Test idea',
    essentialQuestions: ['Question 1', 'Question 2'],
    stage1_understandings: 'Old understandings',
    stage1_knowledge_skills: 'Old knowledge and skills',
    stage2_evidence: 'Old evidence',
    assessment: 'Old assessment',
    stage3_plan: 'Old plan',
    udl_notes: 'Old UDL notes'
  };
  var migrated = migrateUbdData_(oldData);
  Logger.log('Migrated from old format:');
  Logger.log(JSON.stringify(migrated, null, 2));
  Logger.log('Completeness: ' + calculateUbdCompleteness_(migrated) + '%');
}
/**
 * Test essential questions
 */
function test_getSuggestedQuestions() {
  var questions = getSuggestedEssentialQuestions('science', 'atomic structure');
  Logger.log('Suggested essential questions:');
  questions.forEach(function(q, i) {
    Logger.log('  ' + (i + 1) + '. ' + q);
  });
}
/**
 * Test UDL strategies
 */
function test_getUdlStrategies() {
  var principles = ['representation', 'actionExpression', 'engagement'];
  principles.forEach(function(principle) {
    var strategies = getUdlStrategies(principle);
    Logger.log('\n' + principle + ' strategies:');
    strategies.forEach(function(s, i) {
      Logger.log('  ' + (i + 1) + '. ' + s);
    });
  });
}
/**
 * Test UbD report
 */
function test_generateUbdReport() {
  try {
    var maps = getMaps();
    if (maps.length === 0) {
      Logger.log('No maps found.');
      return;
    }
    var report = generateUbdReport(maps[0].mapId);
    Logger.log('UbD Report:');
    Logger.log('Map: ' + report.title);
    Logger.log('Completeness: ' + report.completeness + '%');
    Logger.log('Valid: ' + report.validation.valid);
    if (!report.validation.valid) {
      Logger.log('Errors: ' + JSON.stringify(report.validation.errors));
    }
    if (report.validation.warnings && report.validation.warnings.length > 0) {
      Logger.log('Warnings: ' + JSON.stringify(report.validation.warnings));
    }
    Logger.log('Hexes by stage: ' + JSON.stringify(report.hexesByStage));
  } catch (err) {
    Logger.log('Error: ' + err.message);
  }
}
