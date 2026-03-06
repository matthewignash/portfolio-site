/**
 * Celebration Service
 * Progress milestones, streaks, badges & growth messaging
 *
 * @version 1.0.0
 *
 * StudentAchievements Schema:
 * achievementId, studentEmail, achievementType, achievementKey,
 * earnedAt, metadata, mapId, acknowledged
 */

// ============================================================================
// BADGE DEFINITIONS
// ============================================================================

const HEX_MILESTONES = [1, 5, 10, 25, 50, 100];
const STREAK_MILESTONES = [3, 7, 14, 30];

const BADGE_DEFINITIONS = {
  first_hex:     { icon: '\u{1F31F}', label: 'First Steps',        description: 'Completed your first hex' },
  hex_5:         { icon: '\u2B50',    label: 'Getting Going',      description: 'Completed 5 hexes' },
  hex_10:        { icon: '\u{1F3C6}', label: 'Double Digits',      description: 'Completed 10 hexes' },
  hex_25:        { icon: '\u{1F525}', label: 'Quarter Century',    description: 'Completed 25 hexes' },
  hex_50:        { icon: '\u{1F4AA}', label: 'Halfway Hero',       description: 'Completed 50 hexes' },
  hex_100:       { icon: '\u{1F389}', label: 'Century Club',       description: 'Completed 100 hexes' },
  streak_3:      { icon: '\u{1F525}', label: '3-Day Streak',       description: '3 consecutive days of progress' },
  streak_7:      { icon: '\u{1F525}', label: 'Week Warrior',       description: '7-day streak' },
  streak_14:     { icon: '\u{1F525}', label: 'Two-Week Titan',     description: '14-day streak' },
  streak_30:     { icon: '\u{1F525}', label: 'Monthly Master',     description: '30-day streak' },
  perfect_score: { icon: '\u{1F4AF}', label: 'Perfect Score',      description: 'Scored 100% on a hex' },
  map_complete:  { icon: '\u{1F3C1}', label: 'Map Complete',       description: 'Completed all hexes in a map' },
  design_cycle_complete: { icon: '\u{1F3A8}', label: 'Design Cycle Complete', description: 'Completed all design phase hexes in a PBL map' },
  lesson_complete: { icon: '\u{1F4D6}', label: 'Lesson Complete', description: 'Completed all activities in a lesson' }
};

// ============================================================================
// GET STUDENT CELEBRATION DATA (page load)
// ============================================================================

/**
 * Get all celebration data for current student
 * @returns {Object} { streak, completedCount, badges[], pendingCelebrations[], growthMessage, nearMilestone, badgeDefinitions }
 */
function getStudentCelebrationData() {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  // Delegate to extracted private function with fresh data reads
  const allProgress = readAll_(SHEETS_.PROGRESS);
  const allAchievements = readAll_(SHEETS_.STUDENT_ACHIEVEMENTS);
  return computeStudentCelebrations_(email, allProgress, allAchievements);
}

/**
 * Private: compute student celebrations from pre-read data.
 * Extracted so getStudentBatchData() can share sheet reads.
 */
function computeStudentCelebrations_(email, allProgress, allAchievements) {
  // Filter for this student
  const myProgress = allProgress.filter(p => String(p.email || '').toLowerCase() === email);
  const myAchievements = allAchievements.filter(a => String(a.studentEmail || '').toLowerCase() === email);

  // Compute stats
  const completedCount = countCompletedHexes_(myProgress);
  const streakData = computeStreak_(myProgress);

  // Build badges array
  const badges = myAchievements.map(a => ({
    achievementId: a.achievementId,
    achievementKey: a.achievementKey,
    achievementType: a.achievementType,
    earnedAt: a.earnedAt,
    metadata: safeJsonParse_(a.metadata, {}),
    mapId: a.mapId || '',
    acknowledged: String(a.acknowledged) === 'true'
  }));

  // Pending celebrations (not yet acknowledged)
  const pendingCelebrations = badges
    .filter(b => !b.acknowledged)
    .map(b => {
      const def = BADGE_DEFINITIONS[b.achievementKey] || {};
      return {
        achievementId: b.achievementId,
        key: b.achievementKey,
        icon: def.icon || '\u{1F3C6}',
        label: def.label || b.achievementKey,
        description: def.description || '',
        earnedAt: b.earnedAt,
        metadata: b.metadata
      };
    });

  // Near-milestone calculation
  const nearMilestone = computeNearMilestone_(completedCount);

  // Growth message
  const growthMessage = computeGrowthMessage_(completedCount, streakData.currentStreak, nearMilestone);

  return {
    streak: streakData.currentStreak,
    completedCount: completedCount,
    badges: badges,
    pendingCelebrations: pendingCelebrations,
    growthMessage: growthMessage,
    nearMilestone: nearMilestone,
    badgeDefinitions: BADGE_DEFINITIONS
  };
}

// ============================================================================
// CHECK AND AWARD ACHIEVEMENTS (after hex completion)
// ============================================================================

/**
 * Check for new milestones and award achievements
 * @param {string} mapId
 * @param {string} hexId
 * @param {string} newStatus - 'completed' or 'mastered'
 * @returns {Object} { newAchievements[], streak, completedCount, growthMessage }
 */
function checkAndAwardAchievements(mapId, hexId, newStatus) {
  try {
    const user = getCurrentUser();
    const email = user.email.toLowerCase();
    const now = new Date().toISOString();

    // Batch-read
    const allProgress = readAll_(SHEETS_.PROGRESS);
    const allAchievements = readAll_(SHEETS_.STUDENT_ACHIEVEMENTS);

    const myProgress = allProgress.filter(p => String(p.email || '').toLowerCase() === email);
    const myAchievements = allAchievements.filter(a => String(a.studentEmail || '').toLowerCase() === email);

    // Existing achievement keys
    const existingKeys = {};
    for (let i = 0; i < myAchievements.length; i++) {
      existingKeys[myAchievements[i].achievementKey] = true;
    }

    const completedCount = countCompletedHexes_(myProgress);
    const streakData = computeStreak_(myProgress);
    const newAchievements = [];

    // Check hex milestones
    for (let m = 0; m < HEX_MILESTONES.length; m++) {
      const milestone = HEX_MILESTONES[m];
      const key = milestone === 1 ? 'first_hex' : 'hex_' + milestone;
      if (completedCount >= milestone && !existingKeys[key]) {
        newAchievements.push(createAchievement_(email, 'milestone', key, mapId, now, { hexId: hexId }));
        existingKeys[key] = true;
      }
    }

    // Check streak milestones
    for (let s = 0; s < STREAK_MILESTONES.length; s++) {
      const streakMilestone = STREAK_MILESTONES[s];
      const key = 'streak_' + streakMilestone;
      if (streakData.currentStreak >= streakMilestone && !existingKeys[key]) {
        newAchievements.push(createAchievement_(email, 'streak', key, '', now, { streak: streakData.currentStreak }));
        existingKeys[key] = true;
      }
    }

    // Check perfect score
    const thisHexProgress = myProgress.find(p =>
      String(p.mapId) === String(mapId) && String(p.hexId) === String(hexId)
    );
    if (thisHexProgress && thisHexProgress.score && thisHexProgress.maxScore) {
      const score = parseFloat(thisHexProgress.score);
      const maxScore = parseFloat(thisHexProgress.maxScore);
      if (maxScore > 0 && score >= maxScore && !existingKeys['perfect_score']) {
        newAchievements.push(createAchievement_(email, 'badge', 'perfect_score', mapId, now, { hexId: hexId, score: score }));
        existingKeys['perfect_score'] = true;
      }
    }

    // Check map completion
    if (!existingKeys['map_complete']) {
      const mapCompleted = checkMapCompletion_(myProgress, mapId);
      if (mapCompleted) {
        newAchievements.push(createAchievement_(email, 'badge', 'map_complete', mapId, now, {}));
        existingKeys['map_complete'] = true;
      }
    }

    // Check design cycle completion (all design-phase hexes completed in PBL map)
    if (!existingKeys['design_cycle_complete']) {
      const designCycleComplete = checkDesignCycleCompletion_(myProgress, mapId);
      if (designCycleComplete) {
        newAchievements.push(createAchievement_(email, 'badge', 'design_cycle_complete', mapId, now, {}));
        existingKeys['design_cycle_complete'] = true;
      }
    }

    // Check lesson map completion (all hexes in a lesson sub-map completed)
    if (!existingKeys['lesson_complete']) {
      const allMapsForLesson = readAll_(SHEETS_.MAPS);
      for (let mi = 0; mi < allMapsForLesson.length; mi++) {
        if (String(allMapsForLesson[mi].mapId) === String(mapId)) {
          const lessonMeta = safeJsonParse_(allMapsForLesson[mi].metaJson, {});
          if (lessonMeta.isLessonMap && checkMapCompletion_(myProgress, mapId)) {
            newAchievements.push(createAchievement_(email, 'badge', 'lesson_complete', mapId, now, { parentMapId: lessonMeta.parentMapId || '' }));
            existingKeys['lesson_complete'] = true;
          }
          break;
        }
      }
    }

    // Build return data
    const nearMilestone = computeNearMilestone_(completedCount);
    const growthMessage = computeGrowthMessage_(completedCount, streakData.currentStreak, nearMilestone);

    const returnAchievements = newAchievements.map(a => {
      const def = BADGE_DEFINITIONS[a.achievementKey] || {};
      return {
        achievementId: a.achievementId,
        key: a.achievementKey,
        icon: def.icon || '\u{1F3C6}',
        label: def.label || a.achievementKey,
        description: def.description || ''
      };
    });

    return {
      newAchievements: returnAchievements,
      streak: streakData.currentStreak,
      completedCount: completedCount,
      growthMessage: growthMessage
    };
  } catch (err) {
    Logger.log('checkAndAwardAchievements error: ' + err.toString());
    return { newAchievements: [], streak: 0, completedCount: 0, growthMessage: '' };
  }
}

// ============================================================================
// ACKNOWLEDGE ACHIEVEMENTS
// ============================================================================

/**
 * Mark achievements as acknowledged (overlay dismissed)
 * @param {string[]} achievementIds
 */
function acknowledgeAchievements(achievementIds) {
  if (!achievementIds || achievementIds.length === 0) return;
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  for (let i = 0; i < achievementIds.length; i++) {
    try {
      updateRowByCompoundMatch_(SHEETS_.STUDENT_ACHIEVEMENTS,
        { achievementId: String(achievementIds[i]), studentEmail: email },
        { acknowledged: 'true' }
      );
    } catch (e) {
      // Non-fatal — skip if achievement not found or not owned
    }
  }
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Count completed/mastered hexes for a student
 */
function countCompletedHexes_(progressRecords) {
  let count = 0;
  for (let i = 0; i < progressRecords.length; i++) {
    const status = String(progressRecords[i].status || '');
    if (status === 'completed' || status === 'mastered') {
      count++;
    }
  }
  return count;
}

/**
 * Compute streak from completedAt timestamps
 * Returns { currentStreak, lastActivityDate }
 */
function computeStreak_(progressRecords) {
  // Extract unique dates from completedAt
  const dateSet = {};
  for (let i = 0; i < progressRecords.length; i++) {
    const completedAt = progressRecords[i].completedAt;
    if (!completedAt) continue;
    const dateStr = String(completedAt).split('T')[0]; // YYYY-MM-DD
    if (dateStr && dateStr.length === 10) {
      dateSet[dateStr] = true;
    }
  }

  const dates = Object.keys(dateSet).sort().reverse(); // Most recent first
  if (dates.length === 0) {
    return { currentStreak: 0, lastActivityDate: '' };
  }

  // Walk backwards from today
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Start from today or yesterday (allow for "today hasn't had activity yet")
  let checkDate = new Date(today);
  let streak = 0;

  // If today has activity, start counting from today
  // If not, start from yesterday (streak is still alive if yesterday had activity)
  if (dateSet[todayStr]) {
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    // Check yesterday
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = checkDate.toISOString().split('T')[0];
    if (!dateSet[yesterdayStr]) {
      return { currentStreak: 0, lastActivityDate: dates[0] };
    }
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Continue walking back
  for (let d = 0; d < 365; d++) { // Safety limit
    const checkStr = checkDate.toISOString().split('T')[0];
    if (dateSet[checkStr]) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { currentStreak: streak, lastActivityDate: dates[0] };
}

/**
 * Find the nearest upcoming hex milestone
 */
function computeNearMilestone_(completedCount) {
  for (let m = 0; m < HEX_MILESTONES.length; m++) {
    const target = HEX_MILESTONES[m];
    if (completedCount < target) {
      const remaining = target - completedCount;
      if (remaining <= 3) {
        return { target: target, remaining: remaining };
      }
      return null; // Not close enough to mention
    }
  }
  return null; // All milestones hit
}

/**
 * Compute contextual growth message (priority-ordered)
 */
function computeGrowthMessage_(completedCount, streak, nearMilestone) {
  if (streak >= 3) {
    return '\u{1F525} ' + streak + '-day streak! Keep the momentum going!';
  }
  if (nearMilestone && nearMilestone.remaining <= 3) {
    return 'Just ' + nearMilestone.remaining + ' more to reach ' + nearMilestone.target + ' hexes!';
  }
  if (completedCount === 1) {
    return 'Great start! You\'re on your way!';
  }
  if (completedCount >= 50) {
    return 'Over 50 hexes completed! You\'re unstoppable!';
  }
  if (completedCount >= 20) {
    return '20+ hexes done! Strong progress!';
  }
  if (completedCount >= 5) {
    return 'Nice work! Keep building your knowledge!';
  }
  if (completedCount > 0) {
    return 'Every hex completed is a step forward!';
  }
  return '';
}

/**
 * Create and persist a new achievement record
 */
function createAchievement_(email, type, key, mapId, timestamp, metadataObj) {
  const achievementId = generateAchievementId_();
  try {
    appendRow_(SHEETS_.STUDENT_ACHIEVEMENTS, {
      achievementId: achievementId,
      studentEmail: email,
      achievementType: type,
      achievementKey: key,
      earnedAt: timestamp,
      metadata: safeJsonStringify_(metadataObj, ''),
      mapId: mapId || '',
      acknowledged: 'false'
    });
  } catch (e) {
    Logger.log('createAchievement_ failed: ' + e.message);
    return { achievementId: achievementId, achievementKey: key };
  }
  Logger.log('Achievement awarded: ' + email + ' / ' + key);
  return { achievementId: achievementId, achievementKey: key };
}

/**
 * Check if all hexes in a map are completed/mastered
 */
function checkMapCompletion_(progressRecords, mapId) {
  // Get map data to know total hex count
  const allMaps = readAll_(SHEETS_.MAPS);
  let mapData = null;
  for (let i = 0; i < allMaps.length; i++) {
    if (String(allMaps[i].mapId) === String(mapId)) {
      mapData = allMaps[i];
      break;
    }
  }
  if (!mapData || !mapData.hexesJson) return false;

  const hexes = safeJsonParse_(mapData.hexesJson, []);
  if (hexes.length === 0) return false;

  // Count how many hexes in this map are completed/mastered
  let completedInMap = 0;
  for (let p = 0; p < progressRecords.length; p++) {
    const prog = progressRecords[p];
    if (String(prog.mapId) !== String(mapId)) continue;
    const status = String(prog.status || '');
    if (status === 'completed' || status === 'mastered') {
      completedInMap++;
    }
  }

  return completedInMap >= hexes.length;
}

/**
 * Check if all design-phase hexes in a PBL map are completed/mastered.
 * Only triggers for maps with at least one hex that has a designPhase.
 */
function checkDesignCycleCompletion_(progressRecords, mapId) {
  const allMaps = readAll_(SHEETS_.MAPS);
  let mapData = null;
  for (let i = 0; i < allMaps.length; i++) {
    if (String(allMaps[i].mapId) === String(mapId)) {
      mapData = allMaps[i];
      break;
    }
  }
  if (!mapData || !mapData.hexesJson) return false;

  const hexes = safeJsonParse_(mapData.hexesJson, []);
  const phaseHexIds = [];
  for (let h = 0; h < hexes.length; h++) {
    if (hexes[h].designPhase) {
      phaseHexIds.push(hexes[h].id);
    }
  }
  if (phaseHexIds.length === 0) return false;

  // Count completed design-phase hexes
  let completedDesign = 0;
  for (let p = 0; p < progressRecords.length; p++) {
    const prog = progressRecords[p];
    if (String(prog.mapId) !== String(mapId)) continue;
    const status = String(prog.status || '');
    if (status === 'completed' || status === 'mastered') {
      for (let ph = 0; ph < phaseHexIds.length; ph++) {
        if (String(prog.hexId) === String(phaseHexIds[ph])) {
          completedDesign++;
          break;
        }
      }
    }
  }

  return completedDesign >= phaseHexIds.length;
}
