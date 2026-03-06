/**
 * Learning Map - Branch Service
 *
 * Handles:
 * - Adaptive branching logic (5 types)
 * - Branch evaluation based on conditions
 * - Hex unlocking based on branches
 * - Prerequisites management
 *
 * Branch Types:
 * 1. Performance-based: Auto-branch by score
 * 2. Teacher approval: Manual gate requiring approval
 * 3. Student choice: Learner selects path
 * 4. MTSS tier: Intervention level based on mastery
 * 5. Assessment: Branch on assessment results (total score, question, type)
 *
 * @version 1.0.0
 */
// ============================================================================
// BRANCH EVALUATION
// ============================================================================
/**
 * Evaluate all branches for a hex
 * Determines which next hexes should be unlocked
 *
 * @param {string} hexId - Current hex ID
 * @param {string} studentEmail - Student email
 * @returns {Object} {unlocked: [hexIds], locked: [hexIds], message: string}
 */
function evaluateBranches(hexId, studentEmail) {
// If branching is disabled, treat all hexes as unlocked via default prerequisites
if (getConfigValue('enableBranching') === 'false') {
  return { unlocked: [], locked: [], message: 'Branching is disabled' };
}
const user = getCurrentUser();
const email = studentEmail || user.email;
// Find the map containing this hex
const maps = getMaps();
let currentMap = null;
let currentHex = null;
for (const map of maps) {
const hex = map.hexes.find(h => h.id === hexId);
if (hex) {
currentMap = map;
currentHex = hex;
break;
    }
  }
if (!currentMap || !currentHex) {
throw new Error('Hex not found');
  }
// Get student progress for this hex
const progress = getStudentProgress(currentMap.mapId, email);
const hexProgress = progress[hexId];
if (!hexProgress) {
return {
unlocked: [],
locked: [],
message: 'No progress recorded for this hex yet'
    };
  }
// Get branches from this hex
const branches = currentHex.branches || [];
if (branches.length === 0) {
return {
unlocked: [],
locked: [],
message: 'No branches defined for this hex'
    };
  }
const unlocked = [];
const locked = [];
let message = '';
// Enrich hexProgress with context for assessment condition evaluation
hexProgress.mapId = currentMap.mapId;
hexProgress.hexId = hexId;
hexProgress.studentEmail = email;
// Evaluate each branch
branches.forEach(branch => {
const conditionMet = evaluateBranchCondition_(branch.condition, hexProgress);
if (conditionMet) {
unlocked.push(...(branch.nextHexIds || []));
message = branch.description || 'Path unlocked';
    } else {
locked.push(...(branch.nextHexIds || []));
    }
  });
return {
unlocked: unique_(unlocked),
locked: unique_(locked),
message: message
  };
}
/**
 * Evaluate a single branch condition
 *
 * @param {Object} condition - Branch condition
 * @param {Object} progress - Student progress for hex
 * @returns {boolean} True if condition is met
 */
function evaluateBranchCondition_(condition, progress) {
if (!condition || !condition.type) {
return false;
  }
switch (condition.type) {
case 'score':
return evaluateScoreCondition_(condition, progress);
case 'status':
return evaluateStatusCondition_(condition, progress);
case 'teacher_approval':
return progress.teacherApproved === true;
case 'assessment':
return evaluateAssessmentCondition_(condition, progress);
case 'time':
return evaluateTimeCondition_(condition);
case 'compound':
return evaluateCompoundCondition_(condition, progress);
case 'choice':
return false; // Choice branches never auto-unlock — require explicit saveStudentChoice
case 'peer_feedback':
return evaluatePeerFeedbackCondition_(condition, progress);
case 'always':
return true;
case 'never':
return false;
default:
Logger.log('Unknown condition type:', condition.type);
return false;
  }
}
/**
 * Evaluate score-based condition
 *
 * @param {Object} condition - {type: 'score', operator: 'gte'|'lte'|'eq'|'between', value: number, min: number, max: number}
 * @param {Object} progress - Student progress
 * @returns {boolean} True if condition is met
 */
function evaluateScoreCondition_(condition, progress) {
if (!progress.score || !progress.maxScore) {
return false;
  }
const percentage = (progress.score / progress.maxScore) * 100;
switch (condition.operator) {
case 'gte': // Greater than or equal
return percentage >= condition.value;
case 'lte': // Less than or equal
return percentage <= condition.value;
case 'gt': // Greater than
return percentage > condition.value;
case 'lt': // Less than
return percentage < condition.value;
case 'eq': // Equal to
return Math.abs(percentage - condition.value) < 0.01;
case 'between': // Between min and max (inclusive)
return percentage >= condition.min && percentage <= condition.max;
default:
return false;
  }
}
/**
 * Evaluate status-based condition
 *
 * @param {Object} condition - {type: 'status', value: 'completed'|'mastered'|etc}
 * @param {Object} progress - Student progress
 * @returns {boolean} True if condition is met
 */
function evaluateStatusCondition_(condition, progress) {
return progress.status === condition.value;
}
/**
 * Evaluate time-based condition
 * Compares server current date (YYYY-MM-DD) against availableAfter and/or availableBefore.
 * Both bounds are inclusive. If only one is set, the other is unchecked.
 *
 * @param {Object} condition - {type: 'time', availableAfter: 'YYYY-MM-DD', availableBefore: 'YYYY-MM-DD'}
 * @returns {boolean} True if current date is within the specified range
 */
function evaluateTimeCondition_(condition) {
  const now = new Date();
  const today = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  if (condition.availableAfter && today < condition.availableAfter) {
    return false;
  }
  if (condition.availableBefore && today > condition.availableBefore) {
    return false;
  }
  return true;
}
/**
 * Evaluate compound condition (AND/OR logic)
 * Recursively evaluates sub-conditions using the existing evaluateBranchCondition_.
 * Max 5 sub-conditions supported.
 *
 * @param {Object} condition - {type: 'compound', logic: 'and'|'or', conditions: [...]}
 * @param {Object} progress - Student progress for hex
 * @returns {boolean} True if compound condition is satisfied
 */
function evaluateCompoundCondition_(condition, progress) {
  if (!condition.conditions || condition.conditions.length === 0) {
    return false;
  }
  const logic = condition.logic || 'and';
  const subs = condition.conditions;

  if (logic === 'and') {
    for (let i = 0; i < subs.length; i++) {
      if (!evaluateBranchCondition_(subs[i], progress)) return false;
    }
    return true;
  } else {
    // OR logic
    for (let i = 0; i < subs.length; i++) {
      if (evaluateBranchCondition_(subs[i], progress)) return true;
    }
    return false;
  }
}
/**
 * Evaluate assessment-based condition
 * Reads best attempt from AssessmentResponses for student+hex
 *
 * @param {Object} condition - {type: 'assessment', subType: 'total_score'|'question_correct'|'all_type_correct', ...}
 * @param {Object} progress - Student progress for hex (used as fallback)
 * @returns {boolean} True if condition is met
 */
function evaluateAssessmentCondition_(condition, progress) {
  if (!condition.subType) {
    // Default to total_score if no subType specified
    return evaluateScoreCondition_(condition, progress);
  }

  // Try to get assessment responses for this student+hex
  // We need mapId and hexId from the calling context — progress should have them
  let responses = [];
  try {
    if (progress && progress.mapId && progress.hexId && progress.studentEmail) {
      responses = getAssessmentResponses(progress.mapId, progress.hexId, progress.studentEmail);
    }
  } catch (e) {
    Logger.log('Assessment condition evaluation - no responses found: ' + e.message);
  }

  // If no assessment responses, fall back to progress.score/maxScore for total_score
  if (!responses || responses.length === 0) {
    if (condition.subType === 'total_score') {
      return evaluateScoreCondition_(condition, progress);
    }
    return false;
  }

  // Use the best attempt (highest scorePct)
  let bestAttempt = responses[0];
  for (let i = 1; i < responses.length; i++) {
    if (Number(responses[i].scorePct) > Number(bestAttempt.scorePct)) {
      bestAttempt = responses[i];
    }
  }

  switch (condition.subType) {
    case 'total_score': {
      // Reuse score condition logic with assessment response data
      const assessProgress = {
        score: Number(bestAttempt.totalScore),
        maxScore: Number(bestAttempt.maxScore)
      };
      return evaluateScoreCondition_(condition, assessProgress);
    }

    case 'question_correct': {
      // Check if a specific question was answered correctly
      if (!condition.questionId) return false;
      let respArray = [];
      try {
        respArray = typeof bestAttempt.responsesJson === 'string'
          ? JSON.parse(bestAttempt.responsesJson)
          : (bestAttempt.responsesJson || []);
      } catch (e) {
        return false;
      }
      for (let i = 0; i < respArray.length; i++) {
        if (String(respArray[i].questionId) === String(condition.questionId)) {
          return respArray[i].isCorrect === true;
        }
      }
      return false; // questionId not found
    }

    case 'all_type_correct': {
      // Check if all questions of a given type were answered correctly
      if (!condition.questionType) return false;
      let respArray2 = [];
      try {
        respArray2 = typeof bestAttempt.responsesJson === 'string'
          ? JSON.parse(bestAttempt.responsesJson)
          : (bestAttempt.responsesJson || []);
      } catch (e) {
        return false;
      }
      const typeQuestions = respArray2.filter(r => r.questionType === condition.questionType);
      if (typeQuestions.length === 0) return false;
      return typeQuestions.every(r => r.isCorrect === true);
    }

    default:
      return false;
  }
}
// ============================================================================
// HEX UNLOCKING
// ============================================================================
/**
 * Unlock hexes for a student
 * Creates progress records with status 'not_started'
 *
 * @param {Array<string>} hexIds - Array of hex IDs to unlock
 * @param {string} studentEmail - Student email
 * @returns {number} Number of hexes unlocked
 */
function unlockHexes(hexIds, studentEmail) {
const email = studentEmail || getCurrentUser().email;
if (!hexIds || hexIds.length === 0) return 0;

// Read maps ONCE (not per hex)
const maps = getMaps();

// Build hexId → mapId lookup
const hexToMap = {};
for (let m = 0; m < maps.length; m++) {
  const map = maps[m];
  for (let h = 0; h < map.hexes.length; h++) {
    hexToMap[map.hexes[h].id] = map.mapId;
  }
}

// Get all existing progress for this student (single filtered read)
const existingProgress = findRowsFiltered_(SHEETS_.PROGRESS, { email: email });
const progressKeys = {};
for (let p = 0; p < existingProgress.length; p++) {
  progressKeys[String(existingProgress[p].mapId) + '|' + String(existingProgress[p].hexId)] = true;
}

// Create missing progress records via atomic inserts
let unlockedCount = 0;
for (let i = 0; i < hexIds.length; i++) {
  const hexId = hexIds[i];
  const mapId = hexToMap[hexId];
  if (mapId && !progressKeys[mapId + '|' + hexId]) {
    const record = {
      email: email,
      mapId: mapId,
      hexId: hexId,
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
    unlockedCount++;
  }
}
return unlockedCount;
}
/**
 * Check if hex is unlocked for student
 *
 * @param {string} hexId - Hex ID
 * @param {string} studentEmail - Student email
 * @returns {boolean} True if unlocked
 */
function isHexUnlocked(hexId, studentEmail) {
const email = studentEmail || getCurrentUser().email;
// Find which map this hex belongs to
const maps = getMaps();
for (const map of maps) {
if (map.hexes.some(h => h.id === hexId)) {
const progress = getStudentProgress(map.mapId, email);
return !!progress[hexId];
    }
  }
return false;
}
/**
 * Get all unlocked hexes for student in a map
 *
 * @param {string} mapId - Map ID
 * @param {string} studentEmail - Student email
 * @returns {Array<string>} Array of unlocked hex IDs
 */
function getUnlockedHexes(mapId, studentEmail) {
const email = studentEmail || getCurrentUser().email;
const progress = getStudentProgress(mapId, email);
return Object.keys(progress);
}
// ============================================================================
// PREREQUISITES
// ============================================================================
/**
 * Check if hex prerequisites are met
 *
 * @param {Object} hex - Hex object
 * @param {string} studentEmail - Student email
 * @returns {Object} {met: boolean, missing: [hexIds]}
 */
function checkPrerequisites(hex, studentEmail) {
const email = studentEmail || getCurrentUser().email;
if (!hex.prerequisites || hex.prerequisites.length === 0) {
return {
met: true,
missing: []
    };
  }
// Find the map
const maps = getMaps();
let currentMap = null;
for (const map of maps) {
if (map.hexes.some(h => h.id === hex.id)) {
currentMap = map;
break;
    }
  }
if (!currentMap) {
return {
met: false,
missing: []
    };
  }
const progress = getStudentProgress(currentMap.mapId, email);
const missing = [];
hex.prerequisites.forEach(prereq => {
const prereqProgress = progress[prereq.hexId];
if (!prereqProgress) {
missing.push(prereq.hexId);
return;
    }
// Check condition
if (prereq.condition === 'completed') {
if (prereqProgress.status !== 'completed' && prereqProgress.status !== 'mastered') {
missing.push(prereq.hexId);
      }
    } else if (prereq.condition && prereq.condition.startsWith('score_min_')) {
const minScore = parseInt(prereq.condition.replace('score_min_', ''));
const percentage = (prereqProgress.score / prereqProgress.maxScore) * 100;
if (percentage < minScore) {
missing.push(prereq.hexId);
      }
    }
  });
return {
met: missing.length === 0,
missing: missing
  };
}
// ============================================================================
// BRANCH TYPES - HELPER FUNCTIONS
// ============================================================================
/**
 * Create performance-based branch
 * Auto-branches based on score
 *
 * Example:
 *   <70% -> Review/Remediation
 *   70-84% -> Core curriculum
 *   >=85% -> Extension
 *
 * @param {number} threshold1 - First threshold (e.g. 70)
 * @param {number} threshold2 - Second threshold (e.g. 85)
 * @param {string} lowPathHexId - Hex ID for low score path
 * @param {string} midPathHexId - Hex ID for medium score path
 * @param {string} highPathHexId - Hex ID for high score path
 * @returns {Array<Object>} Array of branch objects
 */
function createPerformanceBranches(threshold1, threshold2, lowPathHexId, midPathHexId, highPathHexId) {
return [
    {
branchId: generateId_('branch'),
condition: {
type: 'score',
operator: 'lt',
value: threshold1,
label: `<${threshold1}%`
      },
nextHexIds: [lowPathHexId],
description: 'Review path - needs support',
color: '#f59e0b', // Amber
type: 'performance'
    },
    {
branchId: generateId_('branch'),
condition: {
type: 'score',
operator: 'between',
min: threshold1,
max: threshold2 - 1,
label: `${threshold1}-${threshold2 - 1}%`
      },
nextHexIds: [midPathHexId],
description: 'Core path - on track',
color: '#3b82f6', // Blue
type: 'performance'
    },
    {
branchId: generateId_('branch'),
condition: {
type: 'score',
operator: 'gte',
value: threshold2,
label: `>=${threshold2}%`
      },
nextHexIds: [highPathHexId],
description: 'Extension path - ready for challenge',
color: '#10b981', // Green
type: 'performance'
    }
  ];
}
/**
 * Create teacher approval branch
 * Requires teacher approval before unlocking
 *
 * @param {string} approvedHexId - Hex to unlock when approved
 * @param {string} revisionHexId - Hex to loop back to if revision requested (optional)
 * @returns {Array<Object>} Array of branch objects
 */
function createApprovalBranch(approvedHexId, revisionHexId) {
const branches = [
    {
branchId: generateId_('branch'),
condition: {
type: 'teacher_approval',
label: 'Teacher approved'
      },
nextHexIds: [approvedHexId],
description: 'Approved - continue to next lesson',
color: '#10b981', // Green
type: 'approval'
    }
  ];
if (revisionHexId) {
branches.push({
branchId: generateId_('branch'),
condition: {
type: 'status',
value: 'in_progress',
label: 'Revision requested'
      },
nextHexIds: [revisionHexId],
description: 'Revision requested - review feedback',
color: '#f59e0b', // Amber
type: 'approval'
    });
  }
return branches;
}
/**
 * Create MTSS tier branches
 * Multi-Tiered System of Supports
 *
 * @param {string} tier1HexId - Tier 1 (core instruction) hex
 * @param {string} tier2HexId - Tier 2 (small group) hex
 * @param {string} tier3HexId - Tier 3 (intensive) hex
 * @returns {Array<Object>} Array of branch objects
 */
function createMtssBranches(tier1HexId, tier2HexId, tier3HexId) {
return [
    {
branchId: generateId_('branch'),
condition: {
type: 'score',
operator: 'gte',
value: 80,
label: '>=80% - Tier 1'
      },
nextHexIds: [tier1HexId],
description: 'Tier 1: Core curriculum',
color: '#10b981', // Green
type: 'mtss',
tier: 1
    },
    {
branchId: generateId_('branch'),
condition: {
type: 'score',
operator: 'between',
min: 60,
max: 79,
label: '60-79% - Tier 2'
      },
nextHexIds: [tier2HexId],
description: 'Tier 2: Small group support',
color: '#f59e0b', // Amber
type: 'mtss',
tier: 2
    },
    {
branchId: generateId_('branch'),
condition: {
type: 'score',
operator: 'lt',
value: 60,
label: '<60% - Tier 3'
      },
nextHexIds: [tier3HexId],
description: 'Tier 3: Intensive intervention',
color: '#ef4444', // Red
type: 'mtss',
tier: 3
    }
  ];
}
// ============================================================================
// STUDENT CHOICE BRANCHES
// ============================================================================
/**
 * Evaluate choice condition.
 * Checks if student has chosen this specific branch at the source hex.
 *
 * @param {Object} condition - {type: 'choice', choiceLabel: '...'}
 * @param {Object} progress - Student progress (used for email context)
 * @param {Object} branch - The branch object (used for branchId matching)
 * @returns {boolean} True if student chose this branch
 */
function evaluateChoiceCondition_(condition, progress, branch) {
  // Need to check StudentChoices for matching record
  // This requires access to context (mapId, hexId, branchId) which simple evaluator doesn't have
  // We'll handle this in evaluateBranches() directly instead
  return false; // Never auto-unlock — requires explicit choice
}

/**
 * Save a student's choice at a choice point.
 * Validates: student exists, hex has choice branches, no prior choice for this hex.
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Source hex ID (where the choice is made)
 * @param {string} branchId - The chosen branch ID
 * @returns {Object} {chosenBranchId, unlockedHexes}
 */
function saveStudentChoice(mapId, hexId, branchId) {
  const user = getCurrentUser();
  if (!user || user.normalizedRole !== 'student') {
    throw new Error('Only students can make choices');
  }
  const email = user.email;

  // Validate branch exists and is a choice type
  const map = findRow_(SHEETS_.MAPS, 'mapId', mapId);
  if (!map) throw new Error('Map not found');
  const hexes = JSON.parse(map.hexesJson || '[]');
  let hex = null;
  for (let i = 0; i < hexes.length; i++) {
    if (String(hexes[i].id) === String(hexId)) { hex = hexes[i]; break; }
  }
  if (!hex || !hex.branches) throw new Error('Hex not found or has no branches');

  // Verify the branch exists and is a choice type
  let choiceBranch = null;
  let hasChoiceBranches = false;
  for (let i = 0; i < hex.branches.length; i++) {
    if (hex.branches[i].condition && hex.branches[i].condition.type === 'choice') {
      hasChoiceBranches = true;
      if (hex.branches[i].branchId === branchId) {
        choiceBranch = hex.branches[i];
      }
    }
  }
  if (!hasChoiceBranches) throw new Error('This hex has no choice branches');
  if (!choiceBranch) throw new Error('Invalid branch selection');

  // Check for prior choice on this hex
  const existingChoices = findRowsFiltered_(SHEETS_.STUDENT_CHOICES, {
    studentEmail: email,
    mapId: mapId,
    hexId: hexId
  });
  if (existingChoices.length > 0) {
    throw new Error('You have already made a choice for this activity');
  }

  // Save choice
  const now = new Date().toISOString();
  appendRow_(SHEETS_.STUDENT_CHOICES, {
    choiceId: generateChoiceId_(),
    studentEmail: email,
    mapId: mapId,
    hexId: hexId,
    branchId: branchId,
    chosenAt: now
  });

  // Unlock the chosen path
  const unlockedHexIds = choiceBranch.nextHexIds || [];
  let unlockedCount = 0;
  if (unlockedHexIds.length > 0) {
    unlockedCount = unlockHexes(unlockedHexIds, email);
  }

  return {
    chosenBranchId: branchId,
    unlockedHexes: unlockedHexIds,
    unlockedCount: unlockedCount
  };
}

/**
 * Get all student choices for a map.
 *
 * @param {string} mapId - Map ID
 * @returns {Array} Array of choice records
 */
function getStudentChoices(mapId) {
  const user = getCurrentUser();
  const email = user.email;
  return findRowsFiltered_(SHEETS_.STUDENT_CHOICES, {
    studentEmail: email,
    mapId: mapId
  });
}

// ============================================================================
// AUTO-PROGRESSION
// ============================================================================
/**
 * Auto-progress student after completing a hex
 * Evaluates branches and unlocks next hexes automatically
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Completed hex ID
 * @param {string} studentEmail - Student email
 * @returns {Object} {unlockedHexes: [hexIds], message: string}
 */
function autoProgressStudent(mapId, hexId, studentEmail) {
const email = studentEmail || getCurrentUser().email;
// Evaluate branches for this hex
const branchResult = evaluateBranches(hexId, email);
if (branchResult.unlocked.length > 0) {
// Unlock the next hexes
const unlockedCount = unlockHexes(branchResult.unlocked, email);

// Build unlocked hex metadata for frontend
const unlockedHexMeta = [];
try {
  const maps = getMaps();
  const map = maps.find(m => m.mapId === mapId);
  if (map && map.hexes) {
    for (const uid of branchResult.unlocked) {
      const hex = map.hexes.find(h => h.id === uid);
      if (hex) {
        unlockedHexMeta.push({ hexId: hex.id, type: hex.type || 'core', label: hex.label || 'Hex' });
      }
    }
  }
} catch (e) {
  // Non-fatal — metadata is optional
}

return {
unlockedHexes: branchResult.unlocked,
unlockedHexMeta: unlockedHexMeta,
message: `${unlockedCount} new hex(es) unlocked: ${branchResult.message}`
    };
  }
return {
unlockedHexes: [],
unlockedHexMeta: [],
message: 'No new hexes unlocked'
  };
}
// ============================================================================
// TIME RE-EVALUATION (called by client-side polling)
// ============================================================================
/**
 * Re-evaluate all time-based branches in a map for the current student.
 * Called by client-side polling when a time gate's state may have changed.
 * Only processes branches with time conditions (direct or compound-nested).
 *
 * @param {string} mapId - Map ID
 * @returns {Object} { unlockedHexes: string[], unlockedHexMeta: Object[] }
 */
function reevaluateTimeBranches(mapId) {
  const user = getCurrentUser();
  const email = user.email;

  if (!canViewMap(mapId)) {
    throw new Error('You do not have permission to view this map');
  }

  const map = getMapById(mapId);
  if (!map) throw new Error('Map not found');

  const progress = getStudentProgress(mapId, email);
  const allUnlocked = [];

  for (let h = 0; h < map.hexes.length; h++) {
    const hex = map.hexes[h];
    if (!hex.branches || hex.branches.length === 0) continue;

    // Source hex must have progress (student has been here)
    const hexProgress = progress[hex.id];
    if (!hexProgress) continue;

    for (let b = 0; b < hex.branches.length; b++) {
      const branch = hex.branches[b];
      if (!branch.condition || !branch.nextHexIds || branch.nextHexIds.length === 0) continue;

      // Only process branches involving time conditions
      const hasTime = branch.condition.type === 'time' ||
        (branch.condition.type === 'compound' && branch.condition.conditions &&
         branch.condition.conditions.some(c => c.type === 'time'));
      if (!hasTime) continue;

      // Check if any target hex is still locked (no progress)
      const lockedTargets = branch.nextHexIds.filter(tid => !progress[tid]);
      if (lockedTargets.length === 0) continue;

      // Evaluate the full branch condition (respects compound AND/OR logic)
      const conditionMet = evaluateBranchCondition_(branch.condition, hexProgress);
      if (conditionMet) {
        for (let t = 0; t < lockedTargets.length; t++) {
          allUnlocked.push(lockedTargets[t]);
        }
      }
    }
  }

  // Deduplicate
  const uniqueUnlocked = [];
  const seen = {};
  for (let u = 0; u < allUnlocked.length; u++) {
    if (!seen[allUnlocked[u]]) {
      seen[allUnlocked[u]] = true;
      uniqueUnlocked.push(allUnlocked[u]);
    }
  }

  // Unlock newly available hexes
  if (uniqueUnlocked.length > 0) {
    unlockHexes(uniqueUnlocked, email);
  }

  // Build metadata for frontend notification
  const unlockedHexMeta = [];
  for (let i = 0; i < uniqueUnlocked.length; i++) {
    const hex = map.hexes.find(h => h.id === uniqueUnlocked[i]);
    if (hex) {
      unlockedHexMeta.push({ hexId: hex.id, type: hex.type || 'core', label: hex.label || 'Hex' });
    }
  }

  return { unlockedHexes: uniqueUnlocked, unlockedHexMeta: unlockedHexMeta };
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================
/**
 * Test creating performance branches
 */
function test_createPerformanceBranches() {
const branches = createPerformanceBranches(
70, 85,
'hex-review',
'hex-core',
'hex-extension'
  );
Logger.log('Performance branches created:');
branches.forEach(b => {
Logger.log(`  ${b.condition.label}: ${b.description}`);
  });
}
/**
 * Test branch evaluation
 */
function test_evaluateBranches() {
try {
const maps = getMaps();
if (maps.length === 0 || maps[0].hexes.length === 0) {
Logger.log('No maps or hexes found.');
return;
    }
const hexId = maps[0].hexes[0].id;
const result = evaluateBranches(hexId, getCurrentUser().email);
Logger.log('Branch evaluation result:');
Logger.log('Unlocked hexes:', result.unlocked);
Logger.log('Locked hexes:', result.locked);
Logger.log('Message:', result.message);
  } catch (err) {
Logger.log('Error:', err.message);
  }
}
/**
 * Test prerequisites
 */
function test_checkPrerequisites() {
try {
const maps = getMaps();
if (maps.length === 0 || maps[0].hexes.length === 0) {
Logger.log('No maps or hexes found.');
return;
    }
const hex = maps[0].hexes[0];
const result = checkPrerequisites(hex, getCurrentUser().email);
Logger.log('Prerequisites check:');
Logger.log('Met:', result.met);
Logger.log('Missing:', result.missing);
  } catch (err) {
Logger.log('Error:', err.message);
  }
}

/**
 * Evaluate peer feedback condition — student must have given N reviews at this hex.
 *
 * @param {Object} condition - { type: 'peer_feedback', requiredReviews: number }
 * @param {Object} progress - Student progress for hex
 * @returns {boolean} True if student has submitted required number of reviews
 */
function evaluatePeerFeedbackCondition_(condition, progress) {
  if (!progress || !progress.studentEmail || !progress.hexId || !progress.mapId) return false;
  const requiredReviews = parseInt(condition.requiredReviews) || 2;

  try {
    const givenFeedback = findRowsFiltered_(SHEETS_.PEER_FEEDBACK, {
      reviewerEmail: progress.studentEmail,
      hexId: progress.hexId,
      mapId: progress.mapId
    });
    return givenFeedback.length >= requiredReviews;
  } catch (e) {
    Logger.log('Peer feedback condition error: ' + e.message);
    return false;
  }
}