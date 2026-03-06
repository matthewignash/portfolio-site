/**
 * AISC Core — Mission, Vision, Values, Definition of Learning & Competencies
 *
 * Institutional identity constants + analytics functions for the
 * American International School Chennai Learning Map system.
 *
 * @version 1.0.0
 */

// ============================================================================
// AISC CORE CONSTANTS
// ============================================================================

const AISC_CORE = {
  mission: 'Together, we nurture learners who chart their unique paths, transforming curiosity into purpose, challenges into growth, and knowledge into action.',
  vision: 'A community where diverse paths meet, learners innovate, and we make meaningful change together.',
  definitionOfLearning: 'A transformative, reflective process of building understanding, empowering learners to think deeply, innovate, collaborate, and act with purpose.',

  competencies: [
    {
      key: 'criticalThinkers',
      label: 'Critical Thinkers',
      short: 'CT',
      color: '#6366f1',
      description: 'Define, analyze, evaluate, and solve complex problems.'
    },
    {
      key: 'resilientLearners',
      label: 'Resilient Learners',
      short: 'RL',
      color: '#f59e0b',
      description: 'Embrace challenges, persist through difficulties, learn from feedback, and adapt to new situations.'
    },
    {
      key: 'skillfulCommunicators',
      label: 'Skillful Communicators',
      short: 'SC',
      color: '#06b6d4',
      description: 'Communicate clearly and purposefully across diverse contexts and media.'
    },
    {
      key: 'effectiveCollaborators',
      label: 'Effective Collaborators',
      short: 'EC',
      color: '#10b981',
      description: 'Collaborate with empathy while learning from and with each other.'
    },
    {
      key: 'digitalNavigators',
      label: 'Digital Navigators',
      short: 'DN',
      color: '#8b5cf6',
      description: 'Leverage technology creatively, responsibly, and ethically.'
    },
    {
      key: 'changeMakers',
      label: 'Change Makers',
      short: 'CM',
      color: '#ef4444',
      description: 'Transfer and apply skills, knowledge, and understanding to make a difference locally and globally.'
    }
  ],

  values: [
    {
      key: 'discovery',
      label: 'Discovery',
      icon: '\uD83D\uDD0D',
      color: '#3b82f6',
      statements: {
        self: 'Embracing the unknown with wonder',
        act: 'Finding our own way forward',
        connect: 'Mapping new possibilities'
      }
    },
    {
      key: 'belonging',
      label: 'Belonging',
      icon: '\uD83E\uDD1D',
      color: '#8b5cf6',
      statements: {
        self: "Celebrating everyone's authentic self",
        act: 'Creating spaces where everyone feels safe, included, and has a sense of belonging',
        connect: 'Building bridges that connect different paths, ideas, and people'
      }
    },
    {
      key: 'wellbeing',
      label: 'Wellbeing',
      icon: '\uD83D\uDC9A',
      color: '#10b981',
      statements: {
        self: 'Nurturing mind, body, and self',
        act: 'Seeking balance while embracing challenges',
        connect: "Supporting each other's wellbeing"
      }
    },
    {
      key: 'responsibility',
      label: 'Responsibility',
      icon: '\u2696\uFE0F',
      color: '#f59e0b',
      statements: {
        self: 'Committing to personal and organizational excellence',
        act: 'Acting ethically and with integrity',
        connect: 'Considering our impact and being stewards of our shared environment'
      }
    },
    {
      key: 'purpose',
      label: 'Purpose',
      icon: '\uD83C\uDFAF',
      color: '#ef4444',
      statements: {
        self: 'Optimistically pursuing ambitious goals',
        act: 'Leading and learning with intention and direction',
        connect: 'Seeking global perspective to drive meaningful impact'
      }
    }
  ]
};


// ============================================================================
// PUBLIC FUNCTIONS
// ============================================================================

/**
 * Return the full AISC Core data for the frontend.
 * Available to all roles — institutional content is public.
 *
 * @returns {Object} AISC_CORE constant
 */
function getAiscCore() {
  getCurrentUser(); // validate logged in
  return AISC_CORE;
}


/**
 * Get competency & value coverage statistics for a map (teacher/admin).
 * Counts how many hexes are tagged with each competency and value.
 *
 * @param {string} mapId - The map to analyze
 * @returns {Object} { competencies: { key: { hexCount, hexLabels } }, values: { key: { hexCount, hexLabels } }, totalHexes }
 */
function getCompetencyCoverage(mapId) {
  const user = getCurrentUser();
  if (!isTeacherOrAdmin()) {
    throw new Error('Only teachers and admins can view competency coverage.');
  }

  const map = getMapById(mapId);
  if (!map) throw new Error('Map not found.');

  const hexes = map.hexes || [];

  // Build accumulators for competencies
  const compCoverage = {};
  for (let c = 0; c < AISC_CORE.competencies.length; c++) {
    const comp = AISC_CORE.competencies[c];
    compCoverage[comp.key] = { hexCount: 0, hexLabels: [] };
  }

  // Build accumulators for values
  const valCoverage = {};
  for (let v = 0; v < AISC_CORE.values.length; v++) {
    const val = AISC_CORE.values[v];
    valCoverage[val.key] = { hexCount: 0, hexLabels: [] };
  }

  // Iterate hexes
  for (let h = 0; h < hexes.length; h++) {
    const hex = hexes[h];
    const curriculum = hex.curriculum || {};
    const comps = curriculum.competencies || [];
    const vals = curriculum.valuesAlignment || [];

    for (let i = 0; i < comps.length; i++) {
      if (compCoverage[comps[i]]) {
        compCoverage[comps[i]].hexCount++;
        compCoverage[comps[i]].hexLabels.push(hex.label || 'Hex');
      }
    }

    for (let i = 0; i < vals.length; i++) {
      if (valCoverage[vals[i]]) {
        valCoverage[vals[i]].hexCount++;
        valCoverage[vals[i]].hexLabels.push(hex.label || 'Hex');
      }
    }
  }

  return {
    competencies: compCoverage,
    values: valCoverage,
    totalHexes: hexes.length
  };
}


/**
 * Get a student's competency profile for a map.
 * Attributes hex completion and scores to competencies based on hex tags.
 * Similar pattern to getSbarBreakdown() in DashboardService.gs.
 *
 * @param {string} mapId         - Map ID
 * @param {string} studentEmail  - Optional, defaults to current user
 * @returns {Object} { competencies: { key: { totalHexes, completedHexes, completionPct, avgScore } } }
 */
function getStudentCompetencyProfile(mapId, studentEmail) {
  const user = getCurrentUser();
  const email = studentEmail ? studentEmail.toLowerCase() : user.email.toLowerCase();

  // Permission check
  if (email !== user.email.toLowerCase() && !isTeacherOrAdmin()) {
    throw new Error('You do not have permission to view this student\'s competency data.');
  }

  const map = getMapById(mapId);
  if (!map) throw new Error('Map not found.');

  // Get student progress
  const progress = getStudentProgress(mapId, email);
  const hexes = map.hexes || [];

  // Build accumulators
  const profile = {};
  for (let c = 0; c < AISC_CORE.competencies.length; c++) {
    const comp = AISC_CORE.competencies[c];
    profile[comp.key] = {
      totalHexes: 0,
      completedHexes: 0,
      totalScore: 0,
      totalMaxScore: 0,
      completionPct: 0,
      avgScorePct: 0
    };
  }

  // Attribute hex data to competencies
  for (let h = 0; h < hexes.length; h++) {
    const hex = hexes[h];
    const curriculum = hex.curriculum || {};
    const comps = curriculum.competencies || [];

    if (comps.length === 0) continue;

    const hp = progress[hex.id];

    for (let i = 0; i < comps.length; i++) {
      const key = comps[i];
      if (!profile[key]) continue;

      profile[key].totalHexes++;

      if (hp) {
        const status = hp.status || 'not_started';
        if (status === 'completed' || status === 'mastered') {
          profile[key].completedHexes++;
        }

        if (hp.score !== null && hp.score !== undefined && hp.maxScore > 0) {
          profile[key].totalScore += hp.score;
          profile[key].totalMaxScore += hp.maxScore;
        }
      }
    }
  }

  // Compute percentages
  const keys = Object.keys(profile);
  for (let k = 0; k < keys.length; k++) {
    const p = profile[keys[k]];
    if (p.totalHexes > 0) {
      p.completionPct = Math.round((p.completedHexes / p.totalHexes) * 100);
    }
    if (p.totalMaxScore > 0) {
      p.avgScorePct = Math.round((p.totalScore / p.totalMaxScore) * 100);
    }
  }

  return { competencies: profile };
}


/**
 * Get class-level competency breakdown for a map (teacher analytics).
 * Aggregates all student progress into per-competency class averages.
 *
 * @param {string} classId - Class ID
 * @param {string} mapId   - Map ID
 * @returns {Object} { competencies: { key: { avgCompletionPct, avgScorePct, studentCount } } }
 */
function getClassCompetencyBreakdown(classId, mapId) {
  const user = getCurrentUser();
  if (!isTeacherOrAdmin()) {
    throw new Error('Only teachers and admins can view class competency data.');
  }

  const map = getMapById(mapId);
  if (!map) throw new Error('Map not found.');

  // Get roster for this class
  const rosterRows = findRows_(SHEETS_.CLASS_ROSTER, 'classId', classId);
  const studentEmails = [];
  for (let r = 0; r < rosterRows.length; r++) {
    if (rosterRows[r].studentEmail) {
      studentEmails.push(rosterRows[r].studentEmail.toLowerCase());
    }
  }

  if (studentEmails.length === 0) {
    return { competencies: {}, studentCount: 0 };
  }

  // Read all progress for this map
  const allProgress = findRows_(SHEETS_.PROGRESS, 'mapId', mapId);
  const hexes = map.hexes || [];

  // Build student → { hexId → progressRow } lookup
  const studentProgressMap = {};
  for (let p = 0; p < allProgress.length; p++) {
    const row = allProgress[p];
    const email = (row.studentEmail || '').toLowerCase();
    if (studentEmails.indexOf(email) === -1) continue;
    if (!studentProgressMap[email]) studentProgressMap[email] = {};
    studentProgressMap[email][row.hexId] = row;
  }

  // Build accumulators
  const classProfile = {};
  for (let c = 0; c < AISC_CORE.competencies.length; c++) {
    const comp = AISC_CORE.competencies[c];
    classProfile[comp.key] = {
      totalCompletionPct: 0,
      totalScorePct: 0,
      studentsWithData: 0
    };
  }

  // Per student, compute competency completion + score, then average
  for (let s = 0; s < studentEmails.length; s++) {
    const email = studentEmails[s];
    const prog = studentProgressMap[email] || {};

    // Per-competency accumulators for this student
    const studentComps = {};
    for (let c = 0; c < AISC_CORE.competencies.length; c++) {
      studentComps[AISC_CORE.competencies[c].key] = {
        totalHexes: 0, completedHexes: 0, totalScore: 0, totalMaxScore: 0
      };
    }

    for (let h = 0; h < hexes.length; h++) {
      const hex = hexes[h];
      const comps = (hex.curriculum || {}).competencies || [];
      if (comps.length === 0) continue;

      const hp = prog[hex.id];

      for (let i = 0; i < comps.length; i++) {
        const key = comps[i];
        if (!studentComps[key]) continue;

        studentComps[key].totalHexes++;

        if (hp) {
          const status = hp.status || 'not_started';
          if (status === 'completed' || status === 'mastered') {
            studentComps[key].completedHexes++;
          }
          const score = parseFloat(hp.score);
          const maxScore = parseFloat(hp.maxScore);
          if (!isNaN(score) && !isNaN(maxScore) && maxScore > 0) {
            studentComps[key].totalScore += score;
            studentComps[key].totalMaxScore += maxScore;
          }
        }
      }
    }

    // Add student data to class totals
    const compKeys = Object.keys(studentComps);
    for (let k = 0; k < compKeys.length; k++) {
      const sc = studentComps[compKeys[k]];
      if (sc.totalHexes > 0) {
        classProfile[compKeys[k]].studentsWithData++;
        classProfile[compKeys[k]].totalCompletionPct += Math.round((sc.completedHexes / sc.totalHexes) * 100);
        if (sc.totalMaxScore > 0) {
          classProfile[compKeys[k]].totalScorePct += Math.round((sc.totalScore / sc.totalMaxScore) * 100);
        }
      }
    }
  }

  // Compute class averages
  const result = {};
  for (let c = 0; c < AISC_CORE.competencies.length; c++) {
    const key = AISC_CORE.competencies[c].key;
    const cp = classProfile[key];
    result[key] = {
      avgCompletionPct: cp.studentsWithData > 0 ? Math.round(cp.totalCompletionPct / cp.studentsWithData) : 0,
      avgScorePct: cp.studentsWithData > 0 ? Math.round(cp.totalScorePct / cp.studentsWithData) : 0,
      studentCount: cp.studentsWithData
    };
  }

  return { competencies: result, studentCount: studentEmails.length };
}
