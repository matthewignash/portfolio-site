/**
 * Learning Map - Dashboard Service
 *
 * Aggregation layer for the Progress Dashboard tab.
 * Calls existing ProgressService, ClassRosterService, CourseService,
 * and MapService functions — does NOT duplicate sheet reads.
 *
 * Uses batch-read-once pattern for performance:
 * reads Progress sheet once, groups/computes in memory.
 *
 * @version 1.0.0
 */

// ============================================================================
// CLASS → MAP DISCOVERY
// ============================================================================

/**
 * Discover which maps a class has progress on.
 * Since Classes have no courseId FK, we discover maps through
 * student progress records.
 *
 * Chain: class → roster (emails) → progress records → unique mapIds → map titles
 *
 * @param {string} classId - Class ID
 * @returns {Array<Object>} [{mapId, title}]
 */
function getClassMaps(classId) {
  requireRole(['administrator', 'teacher']);

  if (!classId) {
    throw new Error('Class ID is required');
  }

  // 1. Get roster for this class
  const roster = getClassRoster(classId);
  if (!roster || roster.length === 0) {
    return [];
  }

  // 2. Collect active student emails
  const emails = {};
  for (let i = 0; i < roster.length; i++) {
    if (roster[i].status !== 'removed' && roster[i].email) {
      emails[roster[i].email.toLowerCase()] = true;
    }
  }

  // 3. Read all progress, filter to class students
  const allProgress = readAll_(SHEETS_.PROGRESS);
  const mapIdSet = {};
  for (let i = 0; i < allProgress.length; i++) {
    const p = allProgress[i];
    const email = String(p.email || '').toLowerCase();
    if (emails[email]) {
      const mapId = String(p.mapId || '');
      if (mapId) {
        mapIdSet[mapId] = true;
      }
    }
  }

  // 4. Get map titles for each discovered mapId
  const mapIds = Object.keys(mapIdSet);
  const results = [];
  const allMaps = readAll_(SHEETS_.MAPS);

  for (let m = 0; m < allMaps.length; m++) {
    const mapRow = allMaps[m];
    const mid = String(mapRow.mapId || '');
    if (mapIdSet[mid]) {
      results.push({
        mapId: mid,
        title: mapRow.title || 'Untitled Map'
      });
    }
  }

  return results;
}

// ============================================================================
// TEACHER DASHBOARD DATA
// ============================================================================

/**
 * Get aggregated teacher dashboard data for a class + map.
 * Single batch read of Progress sheet, groups in memory.
 *
 * @param {string} classId - Class ID
 * @param {string} mapId   - Map ID
 * @returns {Object} Dashboard data
 */
function getTeacherDashboardData(classId, mapId) {
  Logger.log('getTeacherDashboardData called: classId=' + classId + ', mapId=' + mapId);
  requireRole(['administrator', 'teacher']);

  if (!classId || !mapId) {
    throw new Error('Both classId and mapId are required');
  }

  // 1. Get class info
  const classInfo = getClassById(classId);
  if (!classInfo) {
    throw new Error('Class not found');
  }

  // 2. Get roster (active students only)
  const fullRoster = getClassRoster(classId);
  const roster = [];
  for (let i = 0; i < fullRoster.length; i++) {
    if (fullRoster[i].status !== 'removed') {
      roster.push(fullRoster[i]);
    }
  }

  // 3. Get map and its hexes
  const map = getMapById(mapId);
  if (!map) {
    throw new Error('Map not found');
  }
  const hexes = map.hexes || [];

  // 3b. Build hexId→label O(1) lookup (used throughout this function)
  const hexLabelById = {};
  for (let h = 0; h < hexes.length; h++) {
    hexLabelById[hexes[h].id] = hexes[h].label || 'Hex ' + (h + 1);
  }

  // 4. Build email→name lookup from roster
  const nameByEmail = {};
  for (let i = 0; i < roster.length; i++) {
    nameByEmail[roster[i].email.toLowerCase()] = roster[i].name || roster[i].email;
  }

  // 5. Batch-read progress for this map (filtered read — skips non-matching rows)
  const mapProgress = findRowsFiltered_(SHEETS_.PROGRESS, { mapId: String(mapId) });

  // 6. Group progress by student email
  const progressByStudent = {};
  for (let i = 0; i < mapProgress.length; i++) {
    const p = mapProgress[i];
    const email = String(p.email || '').toLowerCase();
    if (!progressByStudent[email]) {
      progressByStudent[email] = {};
    }
    progressByStudent[email][String(p.hexId || '')] = {
      status: p.status || 'not_started',
      score: p.score ? parseFloat(p.score) : null,
      maxScore: p.maxScore ? parseFloat(p.maxScore) : null,
      teacherApproved: p.teacherApproved === true || p.teacherApproved === 'true',
      completedAt: p.completedAt || '',
      selfAssessRating: p.selfAssessRating ? parseInt(p.selfAssessRating) : null,
      selfAssessNote: p.selfAssessNote || '',
      selfAssessGoal: p.selfAssessGoal || '',
      selfAssessEvidence: safeJsonParse_(p.selfAssessEvidenceJson, []),
      strategiesUsed: safeJsonParse_(p.strategiesUsedJson, []),
      reflectionNote: p.reflectionNote || ''
    };
  }

  // 7. Compute per-student analytics
  const students = [];
  let totalCompletion = 0;
  let totalScore = 0;
  let scoredStudents = 0;
  let pendingCount = 0;

  for (let r = 0; r < roster.length; r++) {
    const email = roster[r].email.toLowerCase();
    const studentProgress = progressByStudent[email] || {};

    const statusCounts = { not_started: 0, in_progress: 0, completed: 0, mastered: 0 };
    let studentTotalScore = 0;
    let studentTotalMaxScore = 0;
    let studentScoredHexes = 0;

    for (let h = 0; h < hexes.length; h++) {
      const hexId = hexes[h].id;
      const hp = studentProgress[hexId];

      if (hp) {
        statusCounts[hp.status] = (statusCounts[hp.status] || 0) + 1;

        if (hp.score !== null && hp.maxScore !== null && hp.maxScore > 0) {
          studentTotalScore += hp.score;
          studentTotalMaxScore += hp.maxScore;
          studentScoredHexes++;
        }

        // Count pending approvals
        if ((hp.status === 'completed' || hp.status === 'mastered') && !hp.teacherApproved) {
          pendingCount++;
        }
      } else {
        statusCounts.not_started++;
      }
    }

    const percentComplete = hexes.length > 0
      ? parseFloat(((statusCounts.completed + statusCounts.mastered) / hexes.length * 100).toFixed(1))
      : 0;

    const averageScore = studentTotalMaxScore > 0
      ? parseFloat(((studentTotalScore / studentTotalMaxScore) * 100).toFixed(1))
      : null;

    totalCompletion += percentComplete;
    if (averageScore !== null) {
      totalScore += averageScore;
      scoredStudents++;
    }

    students.push({
      email: email,
      name: nameByEmail[email] || email,
      percentComplete: percentComplete,
      averageScore: averageScore,
      statusCounts: statusCounts,
      hexProgress: studentProgress
    });
  }

  // 8. Build pending approvals list
  const pendingApprovals = [];
  for (let i = 0; i < mapProgress.length; i++) {
    const p = mapProgress[i];
    const isCompleted = p.status === 'completed' || p.status === 'mastered';
    const isApproved = p.teacherApproved === true || p.teacherApproved === 'true';

    if (isCompleted && !isApproved) {
      const email = String(p.email || '').toLowerCase();
      // Find hex label via O(1) lookup
      const hexIdStr = String(p.hexId || '');
      const hexLabel = hexLabelById[hexIdStr] || hexIdStr;

      pendingApprovals.push({
        email: email,
        studentName: nameByEmail[email] || email,
        hexId: hexIdStr,
        hexLabel: hexLabel,
        status: p.status,
        score: p.score ? parseFloat(p.score) : null,
        maxScore: p.maxScore ? parseFloat(p.maxScore) : null,
        completedAt: p.completedAt || '',
        selfAssessRating: p.selfAssessRating ? parseInt(p.selfAssessRating) : null,
        selfAssessNote: p.selfAssessNote || '',
        selfAssessGoal: p.selfAssessGoal || '',
        selfAssessEvidence: safeJsonParse_(p.selfAssessEvidenceJson, []),
        strategiesUsed: safeJsonParse_(p.strategiesUsedJson, []),
        reflectionNote: p.reflectionNote || ''
      });
    }
  }

  // 9. Get grading system if map has a courseId
  let gradingSystem = null;
  if (map.courseId) {
    try {
      const course = getCourseById(String(map.courseId));
      if (course && course.gradingSystem) {
        // Translation layer: extract primary scale for progress dashboard compat
        gradingSystem = course.gradingSystem.primary || course.gradingSystem;
      }
    } catch (e) {
      Logger.log('Could not load grading system for courseId=' + map.courseId + ': ' + e.message);
    }
  }

  // 10. Build hex metadata for grid column headers (hexLabelById already built in step 3b)
  const hexMeta = [];
  for (let h = 0; h < hexes.length; h++) {
    hexMeta.push({
      id: hexes[h].id,
      label: hexes[h].label || 'Hex ' + (h + 1),
      type: hexes[h].type || 'core',
      curriculum: hexes[h].curriculum || {}
    });
  }

  // 10.5. Load formative check data for this map (optional, non-fatal)
  const formativeChecksByHex = {};
  const studentNotYetMap = {};
  try {
    const mapChecks = findRowsFiltered_(SHEETS_.FORMATIVE_CHECKS, { mapId: String(mapId) });
    for (let fc = 0; fc < mapChecks.length; fc++) {
      const check = mapChecks[fc];

      const hid = String(check.hexId || '');
      if (!formativeChecksByHex[hid]) {
        formativeChecksByHex[hid] = { totalChecks: 0, totalGotIt: 0, totalObserved: 0 };
      }
      formativeChecksByHex[hid].totalChecks++;

      const studentResults = safeJsonParse_(check.studentResultsJson, []);
      for (let sr = 0; sr < studentResults.length; sr++) {
        const result = studentResults[sr];
        const srEmail = String(result.email || '').toLowerCase();
        formativeChecksByHex[hid].totalObserved++;
        if (result.gotIt === true) {
          formativeChecksByHex[hid].totalGotIt++;
        } else {
          if (!studentNotYetMap[srEmail]) studentNotYetMap[srEmail] = [];
          const nyHexLabel = hexLabelById[hid] || hid;
          studentNotYetMap[srEmail].push({
            hexId: hid, hexLabel: nyHexLabel,
            checkDate: check.checkDate || '', topic: check.topic || '',
            strategyType: check.strategyType || ''
          });
        }
      }
    }
  } catch (e) {
    Logger.log('Warning: Could not load formative checks: ' + e.message);
  }

  // Attach formative check summary to hex metadata
  for (let hm4 = 0; hm4 < hexMeta.length; hm4++) {
    const fcData = formativeChecksByHex[hexMeta[hm4].id];
    if (fcData && fcData.totalObserved > 0) {
      hexMeta[hm4].checkCount = fcData.totalChecks;
      hexMeta[hm4].gotItRate = parseFloat(((fcData.totalGotIt / fcData.totalObserved) * 100).toFixed(1));
    } else {
      hexMeta[hm4].checkCount = 0;
      hexMeta[hm4].gotItRate = null;
    }
  }

  // Build student "not yet" summary (top 10 students with most "not yet" tags)
  let notYetSummary = [];
  const nyEmails = Object.keys(studentNotYetMap);
  for (let ny = 0; ny < nyEmails.length; ny++) {
    const nyEmail = nyEmails[ny];
    const nyPatterns = studentNotYetMap[nyEmail];
    notYetSummary.push({
      email: nyEmail,
      name: nameByEmail[nyEmail] || nyEmail,
      notYetCount: nyPatterns.length,
      hexes: nyPatterns.slice(0, 5)
    });
  }
  notYetSummary.sort((a, b) => b.notYetCount - a.notYetCount);
  notYetSummary = notYetSummary.slice(0, 10);

  // 11. Compute overview averages
  const avgCompletion = roster.length > 0
    ? parseFloat((totalCompletion / roster.length).toFixed(1))
    : 0;

  const avgScore = scoredStudents > 0
    ? parseFloat((totalScore / scoredStudents).toFixed(1))
    : null;

  // 12. Compute self-assessment summary for teacher insights
  let saRated = 0, saTotal = 0;
  const saDistribution = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const saGaps = [];
  for (let s = 0; s < students.length; s++) {
    const hp = students[s].hexProgress;
    const hexIds = Object.keys(hp);
    for (let h = 0; h < hexIds.length; h++) {
      const p = hp[hexIds[h]];
      saTotal++;
      if (p.selfAssessRating) {
        saRated++;
        saDistribution[p.selfAssessRating]++;
        if (p.selfAssessRating <= 2 && (p.status === 'completed' || p.status === 'mastered')) {
          // Resolve hex label from hexMeta
          const gapHexLabel = hexLabelById[hexIds[h]] || hexIds[h];
          saGaps.push({ name: students[s].name, hexId: hexIds[h], hexLabel: gapHexLabel, rating: p.selfAssessRating });
        }
      }
    }
  }
  const saSum = Object.keys(saDistribution).reduce((s, k) => s + parseInt(k) * saDistribution[k], 0);
  const saAvg = saRated > 0 ? parseFloat((saSum / saRated).toFixed(1)) : null;

  Logger.log('getTeacherDashboardData returning: ' + students.length + ' students, ' + hexMeta.length + ' hexes, ' + pendingApprovals.length + ' pending');
  return {
    className: classInfo.className,
    mapTitle: map.title,
    overview: {
      totalStudents: roster.length,
      avgCompletion: avgCompletion,
      avgScore: avgScore,
      pendingApprovals: pendingApprovals.length
    },
    students: students,
    hexes: hexMeta,
    pendingApprovals: pendingApprovals,
    gradingSystem: gradingSystem,
    selfAssessmentSummary: {
      totalHexes: saTotal,
      ratedHexes: saRated,
      avgConfidence: saAvg,
      distribution: saDistribution,
      confidenceGaps: saGaps.slice(0, 10)
    },
    formativeCheckSummary: {
      studentNotYetPatterns: notYetSummary
    }
  };
}

// ============================================================================
// STUDENT DASHBOARD DATA
// ============================================================================

/**
 * Check if a teacher has a class containing the given student.
 * Uses findRowsFiltered_ for efficiency (avoids reading ALL classes/roster rows).
 *
 * @param {string} teacherEmail
 * @param {string} studentEmail
 * @returns {boolean}
 */
function canTeacherViewStudent_(teacherEmail, studentEmail) {
  const classes = findRowsFiltered_(SHEETS_.CLASSES, { teacherEmail: teacherEmail });
  const targetEmail = studentEmail.toLowerCase();
  for (let i = 0; i < classes.length; i++) {
    const roster = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { classId: String(classes[i].classId) });
    for (let r = 0; r < roster.length; r++) {
      if (String(roster[r].studentEmail || roster[r].email || '').toLowerCase() === targetEmail
          && roster[r].status !== 'removed') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get dashboard data for the current student.
 * Shows all maps the student has progress on.
 *
 * @param {string} [studentEmail] - Optional: teacher can preview a specific student's data
 * @returns {Object} {maps: [{mapId, mapTitle, ...}]}
 */
function getStudentDashboardData(studentEmail) {
  const user = getCurrentUser();
  // If teacher is previewing a specific student, use their email instead
  let email;
  if (studentEmail && studentEmail.toLowerCase() !== user.email.toLowerCase()) {
    if (!isTeacherOrAdmin()) {
      throw new Error('Permission denied: cannot view other student data');
    }
    // Non-admin teachers can only view students in their own classes
    if (!user.isAdmin && !canTeacherViewStudent_(user.email, studentEmail)) {
      throw new Error('Permission denied: student is not in your classes');
    }
    email = studentEmail.toLowerCase();
  } else {
    email = user.email.toLowerCase();
  }

  // Delegate to extracted private function with fresh data reads
  const allProgressRecords = readAll_(SHEETS_.PROGRESS);
  const allMaps = readAll_(SHEETS_.MAPS);
  return computeStudentDashboard_(email, allProgressRecords, allMaps);
}

/**
 * Private: compute student dashboard from pre-read data.
 * Extracted so getStudentBatchData() can share sheet reads.
 */
function computeStudentDashboard_(email, allProgressRecords, allMaps) {
  // 2. Separate student's own progress and group all progress by mapId
  const studentProgress = [];
  const allProgressByMap = {};  // mapId → [{email, hexId, status, ...}]

  for (let i = 0; i < allProgressRecords.length; i++) {
    const p = allProgressRecords[i];
    const pEmail = String(p.email || '').toLowerCase();
    const mapId = String(p.mapId || '');
    if (!mapId) continue;

    if (pEmail === email) {
      studentProgress.push(p);
    }

    if (!allProgressByMap[mapId]) {
      allProgressByMap[mapId] = [];
    }
    allProgressByMap[mapId].push(p);
  }

  if (studentProgress.length === 0) {
    return { maps: [] };
  }

  // 3. Group student's progress by mapId
  const progressByMap = {};
  for (let i = 0; i < studentProgress.length; i++) {
    const p = studentProgress[i];
    const mapId = String(p.mapId || '');
    if (!mapId) continue;

    if (!progressByMap[mapId]) {
      progressByMap[mapId] = [];
    }
    progressByMap[mapId].push(p);
  }

  // 4. Build map lookup from pre-read data
  const mapLookup = {};
  for (let i = 0; i < allMaps.length; i++) {
    mapLookup[String(allMaps[i].mapId || '')] = allMaps[i];
  }

  // 5. Pre-compute class averages per map
  const classStatsByMap = {};
  const mapIdsForClass = Object.keys(allProgressByMap);
  for (let mc = 0; mc < mapIdsForClass.length; mc++) {
    const mid = mapIdsForClass[mc];
    const mapRow = mapLookup[mid];
    if (!mapRow) continue;

    const hexes = safeJsonParse_(mapRow.hexesJson, []);
    if (hexes.length === 0) continue;

    // Group by student email, compute each student's completion
    const studentEmails = {};
    const records = allProgressByMap[mid];
    for (let r = 0; r < records.length; r++) {
      const e = String(records[r].email || '').toLowerCase();
      if (!e) continue;
      if (!studentEmails[e]) studentEmails[e] = {};
      studentEmails[e][String(records[r].hexId || '')] = records[r].status || 'not_started';
    }

    const emails = Object.keys(studentEmails);
    let totalCompletion = 0;
    for (let s = 0; s < emails.length; s++) {
      const hexProg = studentEmails[emails[s]];
      let completed = 0;
      for (let h = 0; h < hexes.length; h++) {
        const st = hexProg[hexes[h].id];
        if (st === 'completed' || st === 'mastered') completed++;
      }
      totalCompletion += (completed / hexes.length * 100);
    }

    classStatsByMap[mid] = {
      avgCompletion: emails.length > 0 ? parseFloat((totalCompletion / emails.length).toFixed(1)) : 0,
      studentCount: emails.length
    };
  }

  const maps = [];
  const mapIds = Object.keys(progressByMap);

  for (let m = 0; m < mapIds.length; m++) {
    const mapId = mapIds[m];
    const mapRow = mapLookup[mapId];
    if (!mapRow) continue;

    // Skip lesson maps from top-level student dashboard — they appear as roll-ups on parent unit maps
    const mapMeta = safeJsonParse_(mapRow.metaJson, {});
    if (mapMeta.isLessonMap) continue;

    const hexes = safeJsonParse_(mapRow.hexesJson, []);
    const progressRecords = progressByMap[mapId];

    // Build progress lookup by hexId
    const progressByHex = {};
    for (let p = 0; p < progressRecords.length; p++) {
      const rec = progressRecords[p];
      progressByHex[String(rec.hexId || '')] = {
        status: rec.status || 'not_started',
        score: rec.score ? parseFloat(rec.score) : null,
        maxScore: rec.maxScore ? parseFloat(rec.maxScore) : null,
        teacherApproved: rec.teacherApproved === true || rec.teacherApproved === 'true',
        completedAt: rec.completedAt || '',
        selfAssessRating: rec.selfAssessRating ? parseInt(rec.selfAssessRating) : null,
        selfAssessNote: rec.selfAssessNote || '',
        selfAssessGoal: rec.selfAssessGoal || '',
        selfAssessEvidence: safeJsonParse_(rec.selfAssessEvidenceJson, []),
        strategiesUsed: safeJsonParse_(rec.strategiesUsedJson, []),
        reflectionNote: rec.reflectionNote || ''
      };
    }

    // Compute analytics
    const statusCounts = { not_started: 0, in_progress: 0, completed: 0, mastered: 0 };
    let totalScore = 0;
    let totalMaxScore = 0;

    for (let h = 0; h < hexes.length; h++) {
      const hp = progressByHex[hexes[h].id];
      if (hp) {
        statusCounts[hp.status] = (statusCounts[hp.status] || 0) + 1;
        if (hp.score !== null && hp.maxScore !== null && hp.maxScore > 0) {
          totalScore += hp.score;
          totalMaxScore += hp.maxScore;
        }
      } else {
        statusCounts.not_started++;
      }
    }

    const percentComplete = hexes.length > 0
      ? parseFloat(((statusCounts.completed + statusCounts.mastered) / hexes.length * 100).toFixed(1))
      : 0;

    const averageScore = totalMaxScore > 0
      ? parseFloat(((totalScore / totalMaxScore) * 100).toFixed(1))
      : null;

    // Recent activity: last 5 completed/mastered, sorted by completedAt desc
    const recentActivity = [];
    for (let p = 0; p < progressRecords.length; p++) {
      const rec = progressRecords[p];
      if (rec.completedAt && (rec.status === 'completed' || rec.status === 'mastered')) {
        let hexLabel = String(rec.hexId || '');
        for (let h = 0; h < hexes.length; h++) {
          if (hexes[h].id === String(rec.hexId || '')) {
            hexLabel = hexes[h].label || hexes[h].id;
            break;
          }
        }
        recentActivity.push({
          hexId: String(rec.hexId || ''),
          hexLabel: hexLabel,
          status: rec.status,
          completedAt: rec.completedAt
        });
      }
    }
    recentActivity.sort(function(a, b) {
      return (b.completedAt || '').localeCompare(a.completedAt || '');
    });
    const topActivity = recentActivity.slice(0, 5);

    // Build hex details for drill-down panel
    const hexDetails = [];
    for (let h = 0; h < hexes.length; h++) {
      const hex = hexes[h];
      const hp = progressByHex[hex.id];
      hexDetails.push({
        hexId: hex.id,
        label: hex.label || 'Hex',
        icon: hex.icon || '',
        type: hex.type || 'core',
        isCheckpoint: hex.isCheckpoint === true,
        teacherApproved: hp ? (String(hp.teacherApproved) === 'true') : false,
        status: hp ? hp.status : 'not_started',
        score: hp ? hp.score : null,
        maxScore: hp ? hp.maxScore : null,
        completedAt: hp ? hp.completedAt : '',
        selfAssessRating: hp ? hp.selfAssessRating : null,
        selfAssessNote: hp ? (hp.selfAssessNote || '') : '',
        selfAssessGoal: hp ? (hp.selfAssessGoal || '') : '',
        selfAssessEvidence: hp ? (hp.selfAssessEvidence || []) : [],
        reflectionNote: hp ? (hp.reflectionNote || '') : ''
      });
    }

    // Get grading system if map has courseId
    let gradingSystem = null;
    const courseId = String(mapRow.courseId || '');
    if (courseId) {
      try {
        const course = getCourseById(courseId);
        if (course && course.gradingSystem) {
          gradingSystem = course.gradingSystem.primary || course.gradingSystem;
        }
      } catch (e) {
        // ignore - grading system is optional
      }
    }

    // Class average (anonymized)
    const classStats = classStatsByMap[mapId];

    // Per-map self-assessment stats
    let saRatedCount = 0, saRatingSum = 0;
    for (let h = 0; h < hexDetails.length; h++) {
      if (hexDetails[h].selfAssessRating) {
        saRatedCount++;
        saRatingSum += hexDetails[h].selfAssessRating;
      }
    }

    // Lesson hex summaries: for unit maps with lesson hexes, compute per-lesson progress roll-up
    let lessonHexSummaries = null;
    const lessonHexes = hexes.filter(hx => hx.type === 'lesson' && hx.linkedMapId);
    if (lessonHexes.length > 0) {
      lessonHexSummaries = {};
      for (let lh = 0; lh < lessonHexes.length; lh++) {
        const lHex = lessonHexes[lh];
        const linkedRow = mapLookup[String(lHex.linkedMapId)];
        if (!linkedRow) continue;
        const linkedHexes = safeJsonParse_(linkedRow.hexesJson, []);
        const total = linkedHexes.length;
        if (total === 0) {
          lessonHexSummaries[lHex.id] = { label: lHex.label || 'Lesson', total: 0, completed: 0, completionPct: 0 };
          continue;
        }
        // Count completed/mastered in linked lesson map using allProgressByMap batch data
        const linkedProg = allProgressByMap[String(lHex.linkedMapId)] || [];
        const studentLinkedProg = {};
        for (let lp = 0; lp < linkedProg.length; lp++) {
          if (String(linkedProg[lp].email || '').toLowerCase() === email) {
            studentLinkedProg[String(linkedProg[lp].hexId || '')] = linkedProg[lp].status || 'not_started';
          }
        }
        let lCompleted = 0;
        for (let lhi = 0; lhi < linkedHexes.length; lhi++) {
          const st = studentLinkedProg[String(linkedHexes[lhi].id)] || 'not_started';
          if (st === 'completed' || st === 'mastered') lCompleted++;
        }
        lessonHexSummaries[lHex.id] = {
          label: lHex.label || 'Lesson',
          total: total,
          completed: lCompleted,
          completionPct: Math.round((lCompleted / total) * 100)
        };
      }
    }

    maps.push({
      mapId: mapId,
      mapTitle: mapRow.title || 'Untitled Map',
      totalHexes: hexes.length,
      percentComplete: percentComplete,
      averageScore: averageScore,
      statusCounts: statusCounts,
      recentActivity: topActivity,
      gradingSystem: gradingSystem,
      hexDetails: hexDetails,
      lessonHexSummaries: lessonHexSummaries,
      classAvgCompletion: classStats ? classStats.avgCompletion : null,
      classStudentCount: classStats ? classStats.studentCount : 0,
      selfAssessStats: {
        ratedCount: saRatedCount,
        avgRating: saRatedCount > 0 ? parseFloat((saRatingSum / saRatedCount).toFixed(1)) : null
      }
    });
  }

  return { maps: maps };
}

// ============================================================================
// SBAR STRAND BREAKDOWN
// ============================================================================

/**
 * Get SBAR strand breakdown for a student on a map.
 * Attributes hex scores to strands based on hex curriculum.sbarDomains.
 *
 * @param {string} mapId        - Map ID
 * @param {string} studentEmail - Student email (optional, defaults to current user)
 * @returns {Object} {hasSbar, strands: {KU, TT, C}, gradingSystem}
 */
function getSbarBreakdown(mapId, studentEmail) {
  const user = getCurrentUser();
  const email = studentEmail ? studentEmail.toLowerCase() : user.email.toLowerCase();

  // Verify permissions
  if (email !== user.email.toLowerCase() && !isTeacherOrAdmin()) {
    throw new Error('You do not have permission to view this student\'s SBAR data');
  }

  // 1. Get map
  const map = getMapById(mapId);
  if (!map) {
    throw new Error('Map not found');
  }

  // 2. Check if course uses SBAR grading
  let gradingSystem = null;
  if (map.courseId) {
    try {
      const course = getCourseById(String(map.courseId));
      if (course && course.gradingSystem) {
        // Translation layer: extract primary scale for progress dashboard compat
        gradingSystem = course.gradingSystem.primary || course.gradingSystem;
      }
    } catch (e) {
      // ignore
    }
  }

  const hasSbar = gradingSystem &&
    gradingSystem.strands &&
    gradingSystem.strands.length > 0;

  if (!hasSbar) {
    return { hasSbar: false, strands: {}, gradingSystem: gradingSystem };
  }

  // 3. Get student progress for this map
  const progress = getStudentProgress(mapId, email);

  // 4. Build strand accumulators
  const strands = {};
  for (let s = 0; s < gradingSystem.strands.length; s++) {
    const strand = gradingSystem.strands[s];
    strands[strand] = { count: 0, totalScore: 0, totalMaxScore: 0, avgScore: 0 };
  }

  // 5. For each hex with a score, attribute to its sbarDomains
  const hexes = map.hexes || [];
  for (let h = 0; h < hexes.length; h++) {
    const hex = hexes[h];
    const hp = progress[hex.id];

    if (!hp || hp.score === null || hp.maxScore === null || hp.maxScore <= 0) {
      continue;
    }

    // Get sbarDomains from hex curriculum
    const curriculum = hex.curriculum || {};
    const domains = curriculum.sbarDomains || [];

    for (let d = 0; d < domains.length; d++) {
      const strand = domains[d];
      if (strands[strand]) {
        strands[strand].count++;
        strands[strand].totalScore += hp.score;
        strands[strand].totalMaxScore += hp.maxScore;
      }
    }
  }

  // 6. Compute averages
  const strandKeys = Object.keys(strands);
  for (let s = 0; s < strandKeys.length; s++) {
    const k = strandKeys[s];
    if (strands[k].totalMaxScore > 0) {
      strands[k].avgScore = parseFloat(
        ((strands[k].totalScore / strands[k].totalMaxScore) * gradingSystem.scale).toFixed(1)
      );
    }
  }

  return {
    hasSbar: true,
    strands: strands,
    gradingSystem: gradingSystem
  };
}

// ============================================================================
// CSV EXPORT
// ============================================================================

/**
 * Export class progress as CSV string.
 * Frontend downloads via Blob.
 *
 * @param {string} classId - Class ID
 * @param {string} mapId   - Map ID
 * @returns {string} CSV content
 */
function exportProgressCsv(classId, mapId) {
  requireRole(['administrator', 'teacher']);

  // Get full dashboard data
  const data = getTeacherDashboardData(classId, mapId);

  // Build CSV rows
  const rows = [];

  // Header row
  const headerCols = ['Student Email', 'Student Name', 'Completion %', 'Avg Score %'];
  for (let h = 0; h < data.hexes.length; h++) {
    headerCols.push(data.hexes[h].label);
  }
  rows.push(headerCols);

  // Student rows
  for (let s = 0; s < data.students.length; s++) {
    const student = data.students[s];
    const cols = [
      student.email,
      student.name,
      student.percentComplete,
      student.averageScore !== null ? student.averageScore : ''
    ];

    for (let h = 0; h < data.hexes.length; h++) {
      const hexId = data.hexes[h].id;
      const hp = student.hexProgress[hexId];
      if (hp) {
        let cellValue = hp.status;
        if (hp.score !== null && hp.maxScore !== null) {
          cellValue = hp.score + '/' + hp.maxScore;
        }
        cols.push(cellValue);
      } else {
        cols.push('not_started');
      }
    }

    rows.push(cols);
  }

  // Convert to CSV string
  const csvLines = [];
  for (let r = 0; r < rows.length; r++) {
    const line = [];
    for (let c = 0; c < rows[r].length; c++) {
      let val = String(rows[r][c] !== null && rows[r][c] !== undefined ? rows[r][c] : '');
      // Escape CSV: wrap in quotes if contains comma, quote, or newline
      if (val.indexOf(',') > -1 || val.indexOf('"') > -1 || val.indexOf('\n') > -1) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      line.push(val);
    }
    csvLines.push(line.join(','));
  }

  return csvLines.join('\n');
}

// ============================================================================
// COURSE ANALYTICS DASHBOARD
// ============================================================================

/**
 * Get aggregated analytics for an entire course (teacher/admin only).
 * Uses batch-read-once pattern: one readAll_ per sheet, filter in memory.
 *
 * @param {string} courseId - Course ID
 * @returns {Object} Full analytics payload
 */
function getCourseAnalyticsDashboard(courseId) {
  requireRole(['administrator', 'teacher']);

  if (!courseId) {
    throw new Error('courseId is required');
  }

  // 1. Get course metadata
  const course = getCourseById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  // 2. Get units for this course
  const units = getUnits(courseId);

  // 3. Batch-read sheets (one read each)
  const allMapsRaw = readAll_(SHEETS_.MAPS);
  const allProgress = readAll_(SHEETS_.PROGRESS);
  const allHexStandards = readAll_(SHEETS_.HEX_STANDARDS);
  const allRoster = readAll_(SHEETS_.CLASS_ROSTER);

  // 4. Build unit lookup and collect mapIds for this course
  const unitById = {};
  const courseMapIds = {};
  for (let i = 0; i < units.length; i++) {
    unitById[String(units[i].unitId)] = units[i];
    if (units[i].mapId) {
      courseMapIds[String(units[i].mapId)] = true;
    }
  }

  // 5. Filter maps belonging to this course, parse hexes
  const maps = [];
  const mapById = {};
  for (let i = 0; i < allMapsRaw.length; i++) {
    const raw = allMapsRaw[i];
    const mid = String(raw.mapId || '');
    if (courseMapIds[mid]) {
      const hexes = safeJsonParse_(raw.hexesJson, []);
      const mapObj = {
        mapId: mid,
        title: raw.title || 'Untitled Map',
        hexes: hexes,
        totalHexes: hexes.length
      };
      maps.push(mapObj);
      mapById[mid] = mapObj;
    }
  }

  // 6. Attach unit info to maps
  for (let i = 0; i < units.length; i++) {
    const mid = String(units[i].mapId || '');
    if (mapById[mid]) {
      mapById[mid].unitTitle = units[i].title || '';
      mapById[mid].unitSequence = units[i].sequence || 0;
    }
  }

  // 7. Build global email → name lookup from all roster entries
  const nameByEmail = {};
  for (let i = 0; i < allRoster.length; i++) {
    const email = String(allRoster[i].email || '').toLowerCase();
    if (email && !nameByEmail[email]) {
      nameByEmail[email] = allRoster[i].name || email;
    }
  }

  // 8. Filter progress to relevant maps, group by student+map
  //    progressByStudent[email][mapId] = { hexProgress: {hexId: status}, statusCounts, scores }
  const progressByStudent = {};
  const mapStudentEmails = {}; // mapId → Set-like object of emails
  for (let i = 0; i < allProgress.length; i++) {
    const p = allProgress[i];
    const mid = String(p.mapId || '');
    if (!courseMapIds[mid]) continue;

    const email = String(p.email || '').toLowerCase();
    if (!email) continue;

    if (!progressByStudent[email]) {
      progressByStudent[email] = {};
    }
    if (!progressByStudent[email][mid]) {
      progressByStudent[email][mid] = {};
    }
    progressByStudent[email][mid][String(p.hexId || '')] = {
      status: p.status || 'not_started',
      score: p.score ? parseFloat(p.score) : null,
      maxScore: p.maxScore ? parseFloat(p.maxScore) : null
    };

    if (!mapStudentEmails[mid]) {
      mapStudentEmails[mid] = {};
    }
    mapStudentEmails[mid][email] = true;
  }

  // 9. Count hex-standards per map for coverage
  const hexStdByMap = {}; // mapId → { total unique standardIds, hexIds with standards }
  for (let i = 0; i < allHexStandards.length; i++) {
    const hs = allHexStandards[i];
    const mid = String(hs.mapId || '');
    if (!courseMapIds[mid]) continue;

    if (!hexStdByMap[mid]) {
      hexStdByMap[mid] = { standardIds: {}, hexIds: {} };
    }
    hexStdByMap[mid].standardIds[String(hs.standardId || '')] = true;
    hexStdByMap[mid].hexIds[String(hs.hexId || '')] = true;
  }

  // 10. Compute per-map analytics
  let totalHexes = 0;
  let totalSubmissions = 0;
  const allStudentEmails = {};
  const mapAnalytics = [];

  for (let m = 0; m < maps.length; m++) {
    const map = maps[m];
    const mid = map.mapId;
    totalHexes += map.totalHexes;

    const studentEmails = mapStudentEmails[mid] ? Object.keys(mapStudentEmails[mid]) : [];
    for (let s = 0; s < studentEmails.length; s++) {
      allStudentEmails[studentEmails[s]] = true;
    }

    // Per-student completion for this map
    let mapTotalCompletion = 0;
    let mapTotalScore = 0;
    let mapScoredStudents = 0;
    let mapSubmissions = 0;

    for (let s = 0; s < studentEmails.length; s++) {
      const email = studentEmails[s];
      const hexProg = progressByStudent[email][mid] || {};
      let completed = 0;
      let studentScore = 0;
      let studentMaxScore = 0;

      for (let h = 0; h < map.hexes.length; h++) {
        const hexId = map.hexes[h].id;
        const hp = hexProg[hexId];
        if (hp) {
          mapSubmissions++;
          if (hp.status === 'completed' || hp.status === 'mastered') {
            completed++;
          }
          if (hp.score !== null && hp.maxScore !== null && hp.maxScore > 0) {
            studentScore += hp.score;
            studentMaxScore += hp.maxScore;
          }
        }
      }

      const pct = map.totalHexes > 0 ? (completed / map.totalHexes * 100) : 0;
      mapTotalCompletion += pct;
      if (studentMaxScore > 0) {
        mapTotalScore += (studentScore / studentMaxScore * 100);
        mapScoredStudents++;
      }
    }

    totalSubmissions += mapSubmissions;

    // Standards coverage for this map
    const hsCov = hexStdByMap[mid] || { standardIds: {}, hexIds: {} };
    const coveredStdCount = Object.keys(hsCov.standardIds).length;
    const coveredHexCount = Object.keys(hsCov.hexIds).length;

    mapAnalytics.push({
      mapId: mid,
      title: map.title,
      unitTitle: map.unitTitle || '',
      unitSequence: map.unitSequence || 0,
      totalHexes: map.totalHexes,
      studentCount: studentEmails.length,
      avgCompletion: studentEmails.length > 0
        ? parseFloat((mapTotalCompletion / studentEmails.length).toFixed(1))
        : 0,
      avgScore: mapScoredStudents > 0
        ? parseFloat((mapTotalScore / mapScoredStudents).toFixed(1))
        : null,
      standardsCoverage: {
        total: coveredStdCount + 0, // total unique standards linked to this map
        covered: coveredHexCount,   // hexes that have at least one standard
        percent: map.totalHexes > 0
          ? Math.round((coveredHexCount / map.totalHexes) * 100)
          : 0
      }
    });
  }

  // Sort maps by unit sequence
  mapAnalytics.sort(function(a, b) {
    return (a.unitSequence || 0) - (b.unitSequence || 0);
  });

  // 11. Compute per-student cross-map analytics
  const allEmails = Object.keys(allStudentEmails);
  const students = [];
  let overallCompletionSum = 0;
  let overallScoreSum = 0;
  let overallScoredCount = 0;

  for (let e = 0; e < allEmails.length; e++) {
    const email = allEmails[e];
    const studentMaps = progressByStudent[email] || {};
    const mapProgress = {};
    let studentCompletionSum = 0;
    let studentScoreSum = 0;
    let studentScoredMaps = 0;
    let studentMapCount = 0;

    for (let m = 0; m < maps.length; m++) {
      const mid = maps[m].mapId;
      const hexProg = studentMaps[mid] || {};
      let completed = 0;
      let scoreTotal = 0;
      let maxScoreTotal = 0;
      const statusCounts = { not_started: 0, in_progress: 0, completed: 0, mastered: 0 };

      for (let h = 0; h < maps[m].hexes.length; h++) {
        const hexId = maps[m].hexes[h].id;
        const hp = hexProg[hexId];
        if (hp) {
          statusCounts[hp.status] = (statusCounts[hp.status] || 0) + 1;
          if (hp.status === 'completed' || hp.status === 'mastered') {
            completed++;
          }
          if (hp.score !== null && hp.maxScore !== null && hp.maxScore > 0) {
            scoreTotal += hp.score;
            maxScoreTotal += hp.maxScore;
          }
        } else {
          statusCounts.not_started++;
        }
      }

      const pct = maps[m].totalHexes > 0 ? parseFloat((completed / maps[m].totalHexes * 100).toFixed(1)) : 0;
      const avgScore = maxScoreTotal > 0 ? parseFloat((scoreTotal / maxScoreTotal * 100).toFixed(1)) : null;

      mapProgress[mid] = {
        percentComplete: pct,
        avgScore: avgScore,
        statusCounts: statusCounts
      };

      // Only count maps where student has progress
      if (Object.keys(hexProg).length > 0) {
        studentCompletionSum += pct;
        studentMapCount++;
        if (avgScore !== null) {
          studentScoreSum += avgScore;
          studentScoredMaps++;
        }
      }
    }

    const overallCompletion = studentMapCount > 0
      ? parseFloat((studentCompletionSum / studentMapCount).toFixed(1))
      : 0;
    const overallScore = studentScoredMaps > 0
      ? parseFloat((studentScoreSum / studentScoredMaps).toFixed(1))
      : null;

    overallCompletionSum += overallCompletion;
    if (overallScore !== null) {
      overallScoreSum += overallScore;
      overallScoredCount++;
    }

    students.push({
      email: email,
      name: nameByEmail[email] || email,
      mapProgress: mapProgress,
      overallCompletion: overallCompletion,
      overallScore: overallScore
    });
  }

  // Sort students by name
  students.sort(function(a, b) {
    return a.name.localeCompare(b.name);
  });

  // 12. Completion distribution buckets
  const distribution = [
    { label: '0–25%', count: 0 },
    { label: '25–50%', count: 0 },
    { label: '50–75%', count: 0 },
    { label: '75–100%', count: 0 }
  ];
  for (let i = 0; i < students.length; i++) {
    const pct = students[i].overallCompletion;
    if (pct < 25) distribution[0].count++;
    else if (pct < 50) distribution[1].count++;
    else if (pct < 75) distribution[2].count++;
    else distribution[3].count++;
  }

  // 13. At-risk students (below 25% completion)
  const atRiskStudents = [];
  for (let i = 0; i < students.length; i++) {
    if (students[i].overallCompletion < 25) {
      atRiskStudents.push({
        email: students[i].email,
        name: students[i].name,
        overallCompletion: students[i].overallCompletion,
        overallScore: students[i].overallScore
      });
    }
  }

  return {
    course: {
      courseId: String(course.courseId),
      title: course.title || '',
      department: course.department || '',
      gradeLevel: course.gradeLevel || ''
    },
    overview: {
      totalUnits: units.length,
      totalMaps: maps.length,
      totalHexes: totalHexes,
      totalStudents: allEmails.length,
      avgCompletion: allEmails.length > 0
        ? parseFloat((overallCompletionSum / allEmails.length).toFixed(1))
        : 0,
      avgScore: overallScoredCount > 0
        ? parseFloat((overallScoreSum / overallScoredCount).toFixed(1))
        : null,
      totalSubmissions: totalSubmissions
    },
    maps: mapAnalytics,
    students: students,
    completionDistribution: distribution,
    atRiskStudents: atRiskStudents
  };
}

/**
 * Get detailed standards coverage for a specific map within a course.
 * Lazy-loaded on drill-down click from the Course Analytics view.
 *
 * @param {string} courseId - Course ID (for permission context)
 * @param {string} mapId - Map ID to get coverage for
 * @returns {Object} { covered: [...], gaps: [...] }
 */
function getCourseStandardsDetail(courseId, mapId) {
  requireRole(['administrator', 'teacher']);

  if (!courseId || !mapId) {
    throw new Error('Both courseId and mapId are required');
  }

  const coverage = getStandardsCoverage(mapId);
  return {
    covered: coverage.covered || [],
    gaps: coverage.gaps || []
  };
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test getClassMaps
 */
function test_getClassMaps() {
  try {
    const classes = getClasses();
    if (classes.length === 0) {
      Logger.log('No classes found.');
      return;
    }
    const classId = classes[0].classId;
    Logger.log('Testing getClassMaps for class: ' + classId);
    const maps = getClassMaps(classId);
    Logger.log('Discovered maps: ' + JSON.stringify(maps));
  } catch (err) {
    Logger.log('Error: ' + err.message);
  }
}

/**
 * Test getTeacherDashboardData
 */
function test_getTeacherDashboardData() {
  try {
    const classes = getClasses();
    if (classes.length === 0) {
      Logger.log('No classes found.');
      return;
    }
    const classId = classes[0].classId;
    const maps = getClassMaps(classId);
    if (maps.length === 0) {
      Logger.log('No maps found for class.');
      return;
    }
    Logger.log('Testing dashboard for class=' + classId + ', map=' + maps[0].mapId);
    const data = getTeacherDashboardData(classId, maps[0].mapId);
    Logger.log('Overview: ' + JSON.stringify(data.overview));
    Logger.log('Students: ' + data.students.length);
    Logger.log('Hexes: ' + data.hexes.length);
    Logger.log('Pending: ' + data.pendingApprovals.length);
  } catch (err) {
    Logger.log('Error: ' + err.message);
  }
}

/**
 * Test getStudentDashboardData
 */
function test_getStudentDashboardData() {
  try {
    const data = getStudentDashboardData();
    Logger.log('Student maps: ' + data.maps.length);
    for (let i = 0; i < data.maps.length; i++) {
      Logger.log('  Map: ' + data.maps[i].mapTitle + ' - ' + data.maps[i].percentComplete + '% complete');
    }
  } catch (err) {
    Logger.log('Error: ' + err.message);
  }
}

/**
 * Test exportProgressCsv
 */
function test_exportProgressCsv() {
  try {
    const classes = getClasses();
    if (classes.length === 0) {
      Logger.log('No classes found.');
      return;
    }
    const classId = classes[0].classId;
    const maps = getClassMaps(classId);
    if (maps.length === 0) {
      Logger.log('No maps found for class.');
      return;
    }
    const csv = exportProgressCsv(classId, maps[0].mapId);
    Logger.log('CSV output (' + csv.length + ' chars):');
    Logger.log(csv.substring(0, 500));
  } catch (err) {
    Logger.log('Error: ' + err.message);
  }
}

// ============================================================================
// PBL DASHBOARD DATA
// ============================================================================

/**
 * Get PBL-specific dashboard data for a class + map.
 * Returns raw iteration history, peer feedback, phase info, and student progress
 * for client-side computation.
 *
 * @param {string} classId - Class ID
 * @param {string} mapId - Map ID
 * @returns {Object} PBL dashboard data
 */
function getPBLDashboardData(classId, mapId) {
  const user = getUser_();
  if (!user || !isTeacherOrAdmin(user)) {
    throw new Error('Teacher or admin access required');
  }

  // Get class roster
  const roster = readAll_(SHEETS_.CLASS_ROSTER)
    .filter(r => String(r.classId) === String(classId))
    .map(r => ({ email: r.studentEmail, name: r.studentName || r.studentEmail }));

  // Get map data
  const allMaps = readAll_(SHEETS_.MAPS);
  let mapData = null;
  for (let i = 0; i < allMaps.length; i++) {
    if (String(allMaps[i].mapId) === String(mapId)) {
      mapData = allMaps[i];
      break;
    }
  }
  if (!mapData) throw new Error('Map not found');

  const hexes = safeJsonParse_(mapData.hexesJson, []);

  // Get unit's design framework for phases
  let phases = [];
  if (mapData.unitId) {
    const allUnits = readAll_(SHEETS_.UNITS);
    for (let u = 0; u < allUnits.length; u++) {
      if (String(allUnits[u].unitId) === String(mapData.unitId)) {
        const fw = safeJsonParse_(allUnits[u].designFrameworkJson, null);
        if (fw && fw.isActive && fw.phases) {
          phases = fw.phases;
        }
        break;
      }
    }
  }

  // Batch-read iteration history for this map
  const allIterations = readAll_(SHEETS_.ITERATION_HISTORY);
  const iterations = allIterations
    .filter(it => String(it.mapId) === String(mapId))
    .map(it => ({
      hexId: it.hexId,
      studentEmail: it.studentEmail,
      iterationNumber: parseInt(it.iterationNumber, 10) || 1,
      status: it.status || 'submitted',
      score: parseFloat(it.score) || 0,
      maxScore: parseFloat(it.maxScore) || 0,
      submittedAt: it.submittedAt
    }));

  // Batch-read peer feedback for this map
  const allFeedback = readAll_(SHEETS_.PEER_FEEDBACK);
  const feedback = allFeedback
    .filter(fb => String(fb.mapId) === String(mapId))
    .map(fb => ({
      hexId: fb.hexId,
      reviewerEmail: fb.reviewerEmail,
      authorEmail: fb.authorEmail,
      ratings: safeJsonParse_(fb.ratingsJson, []),
      isHelpful: fb.isHelpful === true || fb.isHelpful === 'true',
      createdAt: fb.createdAt
    }));

  // Batch-read progress for this map + roster students
  const allProgress = readAll_(SHEETS_.PROGRESS);
  const rosterEmails = {};
  for (let r = 0; r < roster.length; r++) {
    rosterEmails[roster[r].email] = true;
  }
  const progressByStudent = {};
  for (let p = 0; p < allProgress.length; p++) {
    const prog = allProgress[p];
    if (String(prog.mapId) !== String(mapId)) continue;
    if (!rosterEmails[prog.studentEmail]) continue;
    if (!progressByStudent[prog.studentEmail]) progressByStudent[prog.studentEmail] = {};
    progressByStudent[prog.studentEmail][prog.hexId] = {
      status: prog.status || 'not_started',
      score: parseFloat(prog.score) || 0
    };
  }

  return {
    students: roster,
    hexes: hexes.map(h => ({
      id: h.id,
      label: h.label || h.id,
      designPhase: h.designPhase || '',
      isCheckpoint: h.isCheckpoint === true
    })),
    phases: phases,
    iterations: iterations,
    feedback: feedback,
    progress: progressByStudent
  };
}


// ============================================================================
// GRADE & REVIEW QUEUE
// ============================================================================

/**
 * Unified grading queue aggregating all pending student work.
 * Reads Progress, AssessmentResponses, IterationHistory (local),
 * and LabSubmissions (external, try/catch).
 *
 * @param {string} classId - Class ID
 * @param {string} mapId   - Map ID
 * @returns {Object} { queueItems: [...], summary: {...} }
 */
function getGradingQueue(classId, mapId) {
  requireRole(['administrator', 'teacher']);
  if (!classId || !mapId) throw new Error('Both classId and mapId are required');

  // 1. Roster → nameByEmail
  const fullRoster = getClassRoster(classId);
  const nameByEmail = {};
  for (let i = 0; i < fullRoster.length; i++) {
    if (fullRoster[i].status !== 'removed') {
      nameByEmail[String(fullRoster[i].email).toLowerCase()] = fullRoster[i].name || fullRoster[i].email;
    }
  }

  // 2. Map → hex lookups
  const map = getMapById(mapId);
  if (!map) throw new Error('Map not found');
  const hexLabelById = {};
  const hexTypeById = {};
  const hexes = map.hexes || [];
  for (let h = 0; h < hexes.length; h++) {
    hexLabelById[hexes[h].id] = hexes[h].label || 'Hex ' + (h + 1);
    hexTypeById[hexes[h].id] = hexes[h].type || 'core';
  }

  const queueItems = [];

  // 3. Progress — pending approvals (completed/mastered + !teacherApproved)
  const mapProgress = findRowsFiltered_(SHEETS_.PROGRESS, { mapId: String(mapId) });
  for (let i = 0; i < mapProgress.length; i++) {
    const p = mapProgress[i];
    const email = String(p.email || '').toLowerCase();
    const approved = p.teacherApproved === true || p.teacherApproved === 'true';
    const status = p.status || '';
    if ((status === 'completed' || status === 'mastered') && !approved) {
      queueItems.push({
        type: 'submission',
        id: p.progressId || (email + '_' + p.hexId),
        studentEmail: email,
        studentName: nameByEmail[email] || email,
        hexId: String(p.hexId || ''),
        hexLabel: hexLabelById[String(p.hexId || '')] || 'Unknown',
        hexType: hexTypeById[String(p.hexId || '')] || 'core',
        date: p.completedAt || p.updatedAt || '',
        status: status,
        score: p.score ? parseFloat(p.score) : null,
        maxScore: p.maxScore ? parseFloat(p.maxScore) : null,
        selfAssessRating: p.selfAssessRating ? parseInt(p.selfAssessRating) : null,
        selfAssessNote: p.selfAssessNote || '',
        selfAssessGoal: p.selfAssessGoal || '',
        selfAssessEvidence: safeJsonParse_(p.selfAssessEvidenceJson, []),
        strategiesUsed: safeJsonParse_(p.strategiesUsedJson, []),
        reflectionNote: p.reflectionNote || ''
      });
    }
  }

  // 4. AssessmentResponses — most recent attempt per student+hex
  const allResponses = findRowsFiltered_(SHEETS_.ASSESSMENT_RESPONSES, { mapId: String(mapId) });
  const latestAttempts = {};
  for (let i = 0; i < allResponses.length; i++) {
    const r = allResponses[i];
    const key = String(r.studentEmail).toLowerCase() + '|' + String(r.hexId);
    const attempt = parseInt(r.attemptNumber) || 1;
    if (!latestAttempts[key] || attempt > (parseInt(latestAttempts[key].attemptNumber) || 0)) {
      latestAttempts[key] = r;
    }
  }
  const attemptKeys = Object.keys(latestAttempts);
  for (let i = 0; i < attemptKeys.length; i++) {
    const r = latestAttempts[attemptKeys[i]];
    const email = String(r.studentEmail || '').toLowerCase();
    queueItems.push({
      type: 'assessment',
      id: r.responseId || attemptKeys[i],
      studentEmail: email,
      studentName: nameByEmail[email] || email,
      hexId: String(r.hexId || ''),
      hexLabel: hexLabelById[String(r.hexId || '')] || 'Unknown',
      hexType: hexTypeById[String(r.hexId || '')] || 'core',
      date: r.submittedAt || '',
      status: 'completed',
      score: r.totalScore ? parseFloat(r.totalScore) : null,
      maxScore: r.maxScore ? parseFloat(r.maxScore) : null,
      attemptNumber: parseInt(r.attemptNumber) || 1,
      scorePct: r.scorePct ? parseFloat(r.scorePct) : null,
      passed: r.passed === true || r.passed === 'true'
    });
  }

  // 5. IterationHistory — submitted iterations
  const allIterations = findRowsFiltered_(SHEETS_.ITERATION_HISTORY, { mapId: String(mapId) });
  for (let i = 0; i < allIterations.length; i++) {
    const it = allIterations[i];
    if (String(it.status) !== 'submitted') continue;
    const email = String(it.studentEmail || '').toLowerCase();
    queueItems.push({
      type: 'iteration',
      id: it.iterationId || '',
      studentEmail: email,
      studentName: nameByEmail[email] || email,
      hexId: String(it.hexId || ''),
      hexLabel: hexLabelById[String(it.hexId || '')] || 'Unknown',
      hexType: hexTypeById[String(it.hexId || '')] || 'core',
      date: it.submittedAt || '',
      status: 'submitted',
      score: it.score ? parseFloat(it.score) : null,
      maxScore: it.maxScore ? parseFloat(it.maxScore) : null,
      iterationId: it.iterationId || '',
      iterationNumber: parseInt(it.iterationNumber) || 1,
      evidence: safeJsonParse_(it.evidenceJson, []),
      reflectionNote: it.reflectionNote || ''
    });
  }

  // 6. Lab submissions (external spreadsheet — graceful fallback)
  try {
    const allLabAssignments = readLabSheet_('LabAssignments');
    const mapLabAssignments = [];
    for (let i = 0; i < allLabAssignments.length; i++) {
      if (String(allLabAssignments[i].mapId) === String(mapId)) {
        mapLabAssignments.push(allLabAssignments[i]);
      }
    }
    for (let a = 0; a < mapLabAssignments.length; a++) {
      const assignment = mapLabAssignments[a];
      const subs = findLabRows_('LabSubmissions', 'assignmentId', assignment.assignmentId);
      for (let s = 0; s < subs.length; s++) {
        const sub = subs[s];
        if (String(sub.status) !== 'submitted') continue;
        const email = String(sub.studentEmail || '').toLowerCase();
        queueItems.push({
          type: 'lab',
          id: sub.submissionId || '',
          studentEmail: email,
          studentName: nameByEmail[email] || email,
          hexId: String(assignment.hexId || ''),
          hexLabel: hexLabelById[String(assignment.hexId || '')] || 'Unknown',
          hexType: 'lab',
          date: sub.submittedAt || '',
          status: 'submitted',
          assignmentId: assignment.assignmentId || '',
          submissionId: sub.submissionId || '',
          revisionNumber: parseInt(sub.revisionNumber) || 0
        });
      }
    }
  } catch (e) {
    // Lab Reports not configured — skip silently
    Logger.log('getGradingQueue: Lab submissions skipped — ' + e.message);
  }

  // 7. Sort by date descending (newest first)
  queueItems.sort(function(a, b) {
    var da = a.date ? new Date(a.date).getTime() : 0;
    var db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  // 8. Compute summary
  var summary = { total: queueItems.length, byType: { submission: 0, lab: 0, assessment: 0, iteration: 0 }, oldestPending: '' };
  for (let i = 0; i < queueItems.length; i++) {
    summary.byType[queueItems[i].type] = (summary.byType[queueItems[i].type] || 0) + 1;
  }
  if (queueItems.length > 0) {
    summary.oldestPending = queueItems[queueItems.length - 1].date;
  }

  return { queueItems: queueItems, summary: summary };
}


/**
 * getTeacherLessonInsights — Aggregates lesson-level progress for a class+map.
 * Shows per-lesson completion rates, avg scores, and per-student breakdown.
 * Only meaningful for unit maps that have lesson-type hexes with linked maps.
 *
 * @param {string} classId - Class ID
 * @param {string} mapId   - Map ID (unit map)
 * @returns {Object} { lessons: [...], hasLessons, totalStudents }
 */
function getTeacherLessonInsights(classId, mapId) {
  requireRole(['administrator', 'teacher']);
  if (!classId || !mapId) throw new Error('Both classId and mapId are required');

  // 1. Roster (active students)
  const fullRoster = getClassRoster(classId);
  const nameByEmail = {};
  const activeEmails = [];
  for (let i = 0; i < fullRoster.length; i++) {
    if (fullRoster[i].status !== 'removed') {
      const email = String(fullRoster[i].email || '').toLowerCase();
      nameByEmail[email] = fullRoster[i].name || fullRoster[i].email;
      activeEmails.push(email);
    }
  }

  // 2. Get parent map and find lesson hexes
  const parentMap = getMapById(mapId);
  if (!parentMap) throw new Error('Map not found');
  const hexes = parentMap.hexes || [];

  const lessonHexes = [];
  for (let h = 0; h < hexes.length; h++) {
    if (hexes[h].type === 'lesson' && hexes[h].linkedMapId) {
      lessonHexes.push(hexes[h]);
    }
  }

  if (lessonHexes.length === 0) {
    return { lessons: [], hasLessons: false, totalStudents: activeEmails.length };
  }

  // 3. Batch-read all maps + all progress once
  const allMaps = readAll_(SHEETS_.MAPS);
  const allProgress = readAll_(SHEETS_.PROGRESS);

  // Build map lookup
  const mapLookup = {};
  for (let i = 0; i < allMaps.length; i++) {
    mapLookup[String(allMaps[i].mapId || '')] = allMaps[i];
  }

  // Build progress lookup: progressByEmailMap[email][mapId][hexId] = {status, score, maxScore}
  const progressByEmailMap = {};
  for (let i = 0; i < allProgress.length; i++) {
    const p = allProgress[i];
    const email = String(p.email || '').toLowerCase();
    const mid = String(p.mapId || '');
    const hid = String(p.hexId || '');
    if (!email || !mid || !hid) continue;

    if (!progressByEmailMap[email]) progressByEmailMap[email] = {};
    if (!progressByEmailMap[email][mid]) progressByEmailMap[email][mid] = {};
    progressByEmailMap[email][mid][hid] = {
      status: p.status || 'not_started',
      score: p.score ? parseFloat(p.score) : null,
      maxScore: p.maxScore ? parseFloat(p.maxScore) : null
    };
  }

  // 4. Per lesson hex: compute per-student child completion
  const lessons = [];
  for (let l = 0; l < lessonHexes.length; l++) {
    const lHex = lessonHexes[l];
    const linkedMapId = String(lHex.linkedMapId);
    const linkedRow = mapLookup[linkedMapId];
    if (!linkedRow) continue;

    const linkedHexes = safeJsonParse_(linkedRow.hexesJson, []);
    const totalActivities = linkedHexes.length;

    let classCompletionSum = 0;
    let classScoreSum = 0;
    let classScoredCount = 0;
    const students = [];

    for (let s = 0; s < activeEmails.length; s++) {
      const email = activeEmails[s];
      const emailProg = progressByEmailMap[email] || {};
      const mapProg = emailProg[linkedMapId] || {};

      let completed = 0;
      let scoreTotal = 0;
      let maxScoreTotal = 0;

      for (let h = 0; h < linkedHexes.length; h++) {
        const hp = mapProg[String(linkedHexes[h].id)];
        if (hp) {
          if (hp.status === 'completed' || hp.status === 'mastered') completed++;
          if (hp.score !== null && hp.maxScore !== null && hp.maxScore > 0) {
            scoreTotal += hp.score;
            maxScoreTotal += hp.maxScore;
          }
        }
      }

      const completionPct = totalActivities > 0 ? Math.round((completed / totalActivities) * 100) : 0;
      const avgScore = maxScoreTotal > 0 ? parseFloat(((scoreTotal / maxScoreTotal) * 100).toFixed(1)) : null;

      classCompletionSum += completionPct;
      if (avgScore !== null) {
        classScoreSum += avgScore;
        classScoredCount++;
      }

      students.push({
        email: email,
        name: nameByEmail[email] || email,
        activitiesCompleted: completed,
        activitiesTotal: totalActivities,
        completionPct: completionPct,
        avgScore: avgScore
      });
    }

    // Sort students by completion ascending (struggling first)
    students.sort(function(a, b) { return a.completionPct - b.completionPct; });

    const classCompletionRate = activeEmails.length > 0
      ? Math.round(classCompletionSum / activeEmails.length)
      : 0;
    const classAvgScore = classScoredCount > 0
      ? parseFloat((classScoreSum / classScoredCount).toFixed(1))
      : null;

    lessons.push({
      hexId: lHex.id,
      label: lHex.label || 'Lesson',
      icon: lHex.icon || '',
      linkedMapId: linkedMapId,
      totalActivities: totalActivities,
      classCompletionRate: classCompletionRate,
      classAvgScore: classAvgScore,
      students: students
    });
  }

  return {
    lessons: lessons,
    hasLessons: true,
    totalStudents: activeEmails.length
  };
}

/**
 * getLabInsightsDashboard — Aggregates lab report scoring data for a class+map.
 * Reads 4 lab sheets once, computes per-criterion/dimension/student analytics.
 * Teacher/admin only. Returns { configured: false } if lab spreadsheet not set up.
 */
function getLabInsightsDashboard(classId, mapId) {
  requireRole(['administrator', 'teacher']);
  if (!classId || !mapId) throw new Error('Class ID and Map ID are required.');

  try {
    // 1. Batch-read all lab sheets once
    const allAssignments = readLabSheet_('LabAssignments');
    const allSubmissions = readLabSheet_('LabSubmissions');
    const allScores = readLabSheet_('LabScores');
    const allCriteria = readLabSheet_('LabRubricCriteria');

    // 2. Filter assignments to this map + class (active/closed only)
    const assignments = [];
    const assignmentIds = {};
    const rubricIds = {};
    for (let i = 0; i < allAssignments.length; i++) {
      const a = allAssignments[i];
      if (String(a.mapId) !== String(mapId)) continue;
      if (a.classId && String(a.classId) !== String(classId)) continue;
      const st = String(a.status || '').toLowerCase();
      if (st !== 'active' && st !== 'closed') continue;
      assignmentIds[String(a.assignmentId)] = true;
      rubricIds[String(a.rubricId)] = true;
      assignments.push(a);
    }

    if (assignments.length === 0) {
      return { configured: true, assignments: [], criteria: [], dimensions: {}, distribution: [], revisionPatterns: { avgRevisions: 0, maxRevisions: 0 }, students: [], overview: { totalAssignments: 0, totalSubmissions: 0, scoredCount: 0, scoredPct: 0, classAvgPct: 0, highestDimension: null, lowestDimension: null } };
    }

    // 3. Filter submissions to matching assignments
    const submissions = [];
    const submissionIds = {};
    const submissionsByAssignment = {};
    for (let i = 0; i < allSubmissions.length; i++) {
      const s = allSubmissions[i];
      if (!assignmentIds[String(s.assignmentId)]) continue;
      submissions.push(s);
      submissionIds[String(s.submissionId)] = true;
      const aid = String(s.assignmentId);
      if (!submissionsByAssignment[aid]) submissionsByAssignment[aid] = [];
      submissionsByAssignment[aid].push(s);
    }

    // 4. Filter scores to matching submissions
    const scores = [];
    const scoresBySubmission = {};
    for (let i = 0; i < allScores.length; i++) {
      const sc = allScores[i];
      if (!submissionIds[String(sc.submissionId)]) continue;
      scores.push(sc);
      const sid = String(sc.submissionId);
      if (!scoresBySubmission[sid]) scoresBySubmission[sid] = [];
      scoresBySubmission[sid].push(sc);
    }

    // 5. Filter criteria to matching rubrics
    const criteria = [];
    const criteriaById = {};
    for (let i = 0; i < allCriteria.length; i++) {
      const cr = allCriteria[i];
      if (!rubricIds[String(cr.rubricId)]) continue;
      criteria.push(cr);
      criteriaById[String(cr.criterionId)] = cr;
    }

    // 6. Get roster for student names
    let rosterMap = {};
    try {
      const roster = getClassRoster(classId);
      for (let i = 0; i < roster.length; i++) {
        const r = roster[i];
        rosterMap[(r.studentEmail || r.email || '').toLowerCase()] = r.studentName || r.name || r.studentEmail || r.email || '';
      }
    } catch (e) { /* roster unavailable — names will be emails */ }

    // 7. Determine scaleMax from rubric criteria (default: IB MYP 8-point scale)
    let resolvedScaleMax = 8;
    for (let i = 0; i < assignments.length; i++) {
      try {
        const rubric = getLabRubric(assignments[i].rubricId);
        if (rubric && rubric.scaleMax) { resolvedScaleMax = parseInt(rubric.scaleMax, 10) || 8; break; }
      } catch (e) { /* ignore */ }
    }

    // 8. Compute per-assignment status counts
    const assignmentResults = [];
    for (let i = 0; i < assignments.length; i++) {
      const a = assignments[i];
      const aid = String(a.assignmentId);
      const subs = submissionsByAssignment[aid] || [];
      const counts = { draft: 0, submitted: 0, scored: 0, returned: 0 };
      for (let j = 0; j < subs.length; j++) {
        const status = String(subs[j].status || '').toLowerCase();
        if (counts.hasOwnProperty(status)) counts[status]++;
      }
      assignmentResults.push({
        assignmentId: aid,
        title: a.title || 'Untitled',
        hexId: a.hexId || '',
        rubricId: a.rubricId || '',
        scaleMax: resolvedScaleMax,
        status: a.status || '',
        statusCounts: counts,
        totalSubmissions: subs.length
      });
    }

    // 9. Resolve per-submission scores (replicate LabScoringService pattern)
    // Only process scored submissions
    const scoredSubmissions = submissions.filter(s => String(s.status).toLowerCase() === 'scored');
    const criterionScoreSums = {};   // criterionId → { sum, count }
    const criterionMasteryCount = {}; // criterionId → count scoring >= 85%
    const dimTotals = {};            // dimCode → weighted sum
    const dimCounts = {};            // dimCode → weight sum
    const studentResults = [];
    const distributionBuckets = [0, 0, 0, 0, 0]; // 0-20, 20-40, 40-60, 60-80, 80-100
    let totalRevisions = 0;
    let maxRevisions = 0;

    // Build all students list (including non-scored for status display)
    const studentSubmissionMap = {}; // email → best submission
    for (let i = 0; i < submissions.length; i++) {
      const s = submissions[i];
      const email = (s.studentEmail || '').toLowerCase();
      if (!studentSubmissionMap[email] || String(s.status).toLowerCase() === 'scored') {
        studentSubmissionMap[email] = s;
      }
    }

    // Process scored submissions for criterion/dimension aggregation
    for (let i = 0; i < scoredSubmissions.length; i++) {
      const sub = scoredSubmissions[i];
      const sid = String(sub.submissionId);
      const subScores = scoresBySubmission[sid] || [];
      const rev = parseInt(sub.revisionNumber, 10) || 0;
      totalRevisions += rev;
      if (rev > maxRevisions) maxRevisions = rev;

      // Group scores by criterion
      const byCrit = {};
      for (let j = 0; j < subScores.length; j++) {
        const sc = subScores[j];
        const cid = String(sc.criterionId);
        if (!byCrit[cid]) byCrit[cid] = [];
        byCrit[cid].push(sc);
      }

      // Resolve per-criterion for this submission
      let subTotalWeighted = 0;
      let subMaxWeighted = 0;
      const studentCritScores = [];

      for (let c = 0; c < criteria.length; c++) {
        const crit = criteria[c];
        const cid = String(crit.criterionId);
        const weight = parseInt(crit.weight, 10) || 1;
        const critScores = byCrit[cid] || [];

        // Resolve: reconciled first, else average
        let finalScore = 0;
        let hasReconciled = false;
        for (let s = 0; s < critScores.length; s++) {
          if (String(critScores[s].scorerRole) === 'reconciled') {
            finalScore = parseFloat(critScores[s].score) || 0;
            hasReconciled = true;
            break;
          }
        }
        if (!hasReconciled && critScores.length > 0) {
          let sum = 0;
          for (let s = 0; s < critScores.length; s++) {
            sum += parseFloat(critScores[s].score) || 0;
          }
          finalScore = Math.round((sum / critScores.length) * 10) / 10;
        }

        studentCritScores.push({ criterionId: cid, score: finalScore });

        // Accumulate class-level criterion stats
        if (!criterionScoreSums[cid]) criterionScoreSums[cid] = { sum: 0, count: 0 };
        criterionScoreSums[cid].sum += finalScore;
        criterionScoreSums[cid].count++;

        if (!criterionMasteryCount[cid]) criterionMasteryCount[cid] = 0;
        if (resolvedScaleMax > 0 && finalScore >= resolvedScaleMax * 0.85) {
          criterionMasteryCount[cid]++;
        }

        subTotalWeighted += finalScore * weight;
        subMaxWeighted += resolvedScaleMax * weight;

        // Accumulate dimension scores
        const dims = String(crit.internalDimensions || '').split(',');
        for (let d = 0; d < dims.length; d++) {
          const dimCode = dims[d].trim();
          if (!dimCode) continue;
          const dimPct = resolvedScaleMax > 0 ? (finalScore / resolvedScaleMax) * 100 : 0;
          if (!dimTotals[dimCode]) { dimTotals[dimCode] = 0; dimCounts[dimCode] = 0; }
          dimTotals[dimCode] += dimPct * weight;
          dimCounts[dimCode] += weight;
        }
      }

      const subPct = subMaxWeighted > 0 ? Math.round((subTotalWeighted / subMaxWeighted) * 100) : 0;

      // Distribution bucket
      const bucketIdx = subPct >= 100 ? 4 : Math.floor(subPct / 20);
      distributionBuckets[Math.min(bucketIdx, 4)]++;

      // Store student result (only scored)
      const email = (sub.studentEmail || '').toLowerCase();
      studentResults.push({
        email: email,
        name: rosterMap[email] || email,
        status: 'scored',
        totalScore: Math.round(subTotalWeighted * 10) / 10,
        maxScore: subMaxWeighted,
        percentage: subPct,
        revisionNumber: rev,
        criterionScores: studentCritScores
      });
    }

    // Add non-scored students
    const scoredEmails = {};
    for (let i = 0; i < studentResults.length; i++) {
      scoredEmails[studentResults[i].email] = true;
    }
    const allEmails = Object.keys(studentSubmissionMap);
    for (let i = 0; i < allEmails.length; i++) {
      const email = allEmails[i];
      if (scoredEmails[email]) continue;
      const sub = studentSubmissionMap[email];
      studentResults.push({
        email: email,
        name: rosterMap[email] || email,
        status: String(sub.status || 'draft').toLowerCase(),
        totalScore: 0,
        maxScore: 0,
        percentage: 0,
        revisionNumber: parseInt(sub.revisionNumber, 10) || 0,
        criterionScores: []
      });
    }

    // 10. Build criterion results
    const criterionResults = [];
    for (let c = 0; c < criteria.length; c++) {
      const crit = criteria[c];
      const cid = String(crit.criterionId);
      const stats = criterionScoreSums[cid] || { sum: 0, count: 0 };
      const avg = stats.count > 0 ? Math.round((stats.sum / stats.count) * 10) / 10 : 0;
      const mastery = stats.count > 0 ? Math.round(((criterionMasteryCount[cid] || 0) / stats.count) * 100) : 0;
      criterionResults.push({
        criterionId: cid,
        title: crit.title || '',
        weight: parseInt(crit.weight, 10) || 1,
        scaleMax: resolvedScaleMax,
        classAvg: avg,
        masteryRate: mastery,
        internalDimensions: crit.internalDimensions || ''
      });
    }

    // 11. Build dimension results
    const dimensions = {};
    const dimKeys = Object.keys(dimTotals);
    let highestDim = null;
    let lowestDim = null;
    for (let i = 0; i < dimKeys.length; i++) {
      const code = dimKeys[i];
      const avg = dimCounts[code] > 0 ? Math.round(dimTotals[code] / dimCounts[code]) : 0;
      dimensions[code] = avg;
      const dimInfo = LAB_DIMENSIONS.find(d => d.code === code);
      const label = dimInfo ? dimInfo.label : code;
      if (!highestDim || avg > highestDim.avg) highestDim = { code: code, label: label, avg: avg };
      if (!lowestDim || avg < lowestDim.avg) lowestDim = { code: code, label: label, avg: avg };
    }

    // 12. Build distribution
    const distribution = [
      { label: '0-20%', count: distributionBuckets[0] },
      { label: '20-40%', count: distributionBuckets[1] },
      { label: '40-60%', count: distributionBuckets[2] },
      { label: '60-80%', count: distributionBuckets[3] },
      { label: '80-100%', count: distributionBuckets[4] }
    ];

    // 13. Overview
    const totalSubs = submissions.length;
    const scoredCount = scoredSubmissions.length;
    let classAvgPct = 0;
    if (studentResults.length > 0) {
      let pctSum = 0;
      let pctCount = 0;
      for (let i = 0; i < studentResults.length; i++) {
        if (studentResults[i].status === 'scored') {
          pctSum += studentResults[i].percentage;
          pctCount++;
        }
      }
      classAvgPct = pctCount > 0 ? Math.round(pctSum / pctCount) : 0;
    }

    return {
      configured: true,
      assignments: assignmentResults,
      criteria: criterionResults,
      dimensions: dimensions,
      distribution: distribution,
      revisionPatterns: {
        avgRevisions: scoredCount > 0 ? Math.round((totalRevisions / scoredCount) * 10) / 10 : 0,
        maxRevisions: maxRevisions
      },
      students: studentResults,
      overview: {
        totalAssignments: assignments.length,
        totalSubmissions: totalSubs,
        scoredCount: scoredCount,
        scoredPct: totalSubs > 0 ? Math.round((scoredCount / totalSubs) * 100) : 0,
        classAvgPct: classAvgPct,
        highestDimension: highestDim,
        lowestDimension: lowestDim
      }
    };

  } catch (e) {
    if (String(e.message || '').indexOf('not configured') > -1 || String(e.message || '').indexOf('not found') > -1) {
      return { configured: false, error: String(e.message) };
    }
    throw e;
  }
}
