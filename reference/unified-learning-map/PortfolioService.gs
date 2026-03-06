/**
 * Portfolio Service
 * Student Portfolio & Growth Dashboard
 *
 * Provides growth timeline, skill inventory, portfolio curation,
 * and Google Doc export for student-led conferences.
 *
 * @version 1.0.0
 *
 * StudentPortfolio Schema:
 * portfolioId, studentEmail, mapId, hexId, selectedAt,
 * portfolioNote, displayOrder, isHighlight, updatedAt
 */

// ============================================================================
// GET STUDENT PORTFOLIO DATA (main batch endpoint)
// ============================================================================

/**
 * Get all portfolio & growth data for a student.
 * Optional studentEmail param for teacher preview (same pattern as getStudentDashboardData).
 *
 * @param {string} [studentEmail] - Student email for teacher preview
 * @returns {Object} { growthTimeline[], skillInventory[], portfolioItems[], growthMessage, streak, badges[], summary }
 */
function getStudentPortfolioData(studentEmail) {
  const user = getCurrentUser();

  // Determine target email (self or teacher preview)
  let email;
  if (studentEmail && studentEmail.toLowerCase() !== user.email.toLowerCase()) {
    if (!isTeacherOrAdmin()) {
      throw new Error('Permission denied: cannot view other student data');
    }
    email = studentEmail.toLowerCase();
  } else {
    email = user.email.toLowerCase();
  }

  // Thin wrapper — reads sheets then delegates
  const allProgress = readAll_(SHEETS_.PROGRESS);
  const allMaps = readAll_(SHEETS_.MAPS);
  const allPortfolio = readAll_(SHEETS_.STUDENT_PORTFOLIO);
  const allAchievements = readAll_(SHEETS_.STUDENT_ACHIEVEMENTS);
  const allHexStandards = readAll_(SHEETS_.HEX_STANDARDS);
  const allStandards = readAll_(SHEETS_.STANDARDS);

  return computeStudentPortfolio_(email, allProgress, allMaps, allPortfolio, allAchievements, allHexStandards, allStandards);
}

/**
 * Core portfolio computation — accepts pre-read sheet data for batch compatibility.
 * Called by getStudentPortfolioData() and getStudentBatchData().
 */
function computeStudentPortfolio_(email, allProgress, allMaps, allPortfolio, allAchievements, allHexStandards, allStandards) {
  // Filter student's progress records
  const studentProgress = [];
  for (let i = 0; i < allProgress.length; i++) {
    const p = allProgress[i];
    if (String(p.email || '').toLowerCase() === email) {
      studentProgress.push(p);
    }
  }

  // Build hex metadata lookup from maps
  const hexLookup = {};
  const mapLookup = {};
  for (let m = 0; m < allMaps.length; m++) {
    const map = allMaps[m];
    const mapId = String(map.mapId || '');
    const mapTitle = map.title || 'Untitled Map';
    const hexes = safeJsonParse_(map.hexesJson, []);
    mapLookup[mapId] = { title: mapTitle, hexCount: hexes.length };
    for (let h = 0; h < hexes.length; h++) {
      const hex = hexes[h];
      hexLookup[String(hex.id || '')] = {
        label: hex.label || hex.id,
        icon: hex.icon || '',
        type: hex.type || 'core',
        mapId: mapId,
        mapTitle: mapTitle
      };
    }
  }

  // 1. Growth timeline
  const growthTimeline = computeGrowthTimeline_(studentProgress);

  // 2. Skill inventory
  const skillInventory = computeSkillInventory_(studentProgress, allHexStandards, allStandards, hexLookup);

  // 3. Portfolio items
  const portfolioItems = buildPortfolioItems_(email, allPortfolio, studentProgress, hexLookup);

  // 4. Growth messaging
  const completedCount = countCompletedHexes_(studentProgress);
  const streakData = computeStreak_(studentProgress);
  const nearMilestone = computeNearMilestone_(completedCount);
  const growthMessage = computeGrowthMessage_(completedCount, streakData.currentStreak, nearMilestone);

  // 5. Badges
  const badges = [];
  for (let a = 0; a < allAchievements.length; a++) {
    const ach = allAchievements[a];
    if (String(ach.studentEmail || '').toLowerCase() === email) {
      badges.push({
        achievementType: ach.achievementType || '',
        achievementKey: ach.achievementKey || '',
        earnedAt: ach.earnedAt || '',
        mapId: ach.mapId || ''
      });
    }
  }

  // 6. Summary stats
  const mapIds = {};
  let totalHexes = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  for (let i = 0; i < studentProgress.length; i++) {
    const p = studentProgress[i];
    mapIds[String(p.mapId || '')] = true;
    const status = String(p.status || '');
    if ((status === 'completed' || status === 'mastered') && p.score) {
      const s = parseFloat(p.score);
      if (!isNaN(s)) {
        scoreSum += s;
        scoreCount++;
      }
    }
  }
  const studentMapIds = Object.keys(mapIds);
  for (let i = 0; i < studentMapIds.length; i++) {
    const ml = mapLookup[studentMapIds[i]];
    if (ml) totalHexes += ml.hexCount;
  }

  return {
    growthTimeline: growthTimeline,
    skillInventory: skillInventory,
    portfolioItems: portfolioItems,
    growthMessage: growthMessage,
    streak: streakData.currentStreak,
    badges: badges,
    summary: {
      totalMaps: studentMapIds.length,
      totalCompleted: completedCount,
      totalHexes: totalHexes,
      overallCompletionPct: totalHexes > 0 ? Math.round((completedCount / totalHexes) * 100) : 0,
      overallAvgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0
    }
  };
}

// ============================================================================
// GROWTH TIMELINE COMPUTATION
// ============================================================================

/**
 * Bucket completedAt timestamps into ISO weeks and compute cumulative progress.
 * @param {Array} progressRecords - Student's progress records
 * @returns {Array} [{weekStart, completedCount, cumulativeCount, cumulativePercent}]
 */
function computeGrowthTimeline_(progressRecords) {
  // Collect all completion dates
  const weekBuckets = {};  // 'YYYY-MM-DD' (Monday) -> count
  let totalCompleted = 0;

  for (let i = 0; i < progressRecords.length; i++) {
    const completedAt = progressRecords[i].completedAt;
    const status = String(progressRecords[i].status || '');
    if (!completedAt || (status !== 'completed' && status !== 'mastered')) continue;

    const dateStr = String(completedAt).split('T')[0];
    if (!dateStr || dateStr.length !== 10) continue;

    // Get the Monday of this date's week
    const d = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(d.getTime())) continue;
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;  // Adjust to Monday
    d.setUTCDate(d.getUTCDate() + diff);
    const weekStart = d.toISOString().split('T')[0];

    weekBuckets[weekStart] = (weekBuckets[weekStart] || 0) + 1;
    totalCompleted++;
  }

  // Sort weeks chronologically
  const weeks = Object.keys(weekBuckets).sort();
  const timeline = [];
  let cumulative = 0;

  for (let w = 0; w < weeks.length; w++) {
    cumulative += weekBuckets[weeks[w]];
    timeline.push({
      weekStart: weeks[w],
      completedCount: weekBuckets[weeks[w]],
      cumulativeCount: cumulative,
      cumulativePercent: totalCompleted > 0 ? Math.round((cumulative / totalCompleted) * 100) : 0
    });
  }

  return timeline;
}

// ============================================================================
// SKILL INVENTORY COMPUTATION
// ============================================================================

/**
 * Compute standards mastery from completed hexes.
 * @param {Array} progressRecords - Student's progress
 * @param {Array} allHexStandards - All hex-standard links
 * @param {Array} allStandards - All standards
 * @param {Object} hexLookup - Hex metadata lookup
 * @returns {Array} [{standardId, code, description, framework, strand, hexCount, avgScore, masteryLevel}]
 */
function computeSkillInventory_(progressRecords, allHexStandards, allStandards, hexLookup) {
  // Build set of completed/mastered hexes with scores
  const completedHexes = {};  // hexId -> { status, score }
  for (let i = 0; i < progressRecords.length; i++) {
    const p = progressRecords[i];
    const status = String(p.status || '');
    if (status === 'completed' || status === 'mastered') {
      completedHexes[String(p.hexId || '')] = {
        status: status,
        score: parseFloat(p.score) || 0,
        maxScore: parseFloat(p.maxScore) || 100
      };
    }
  }

  // Map standards to completed hexes
  const standardAgg = {};  // standardId -> { scores[], hexCount }
  for (let h = 0; h < allHexStandards.length; h++) {
    const hs = allHexStandards[h];
    const hexId = String(hs.hexId || '');
    const stdId = String(hs.standardId || '');
    if (completedHexes[hexId] && stdId) {
      if (!standardAgg[stdId]) {
        standardAgg[stdId] = { scores: [], hexCount: 0 };
      }
      const hexData = completedHexes[hexId];
      const pct = hexData.maxScore > 0 ? Math.round((hexData.score / hexData.maxScore) * 100) : 0;
      standardAgg[stdId].scores.push(pct);
      standardAgg[stdId].hexCount++;
    }
  }

  // Build standard lookup
  const stdLookup = {};
  for (let s = 0; s < allStandards.length; s++) {
    const std = allStandards[s];
    stdLookup[String(std.standardId || '')] = std;
  }

  // Build skill inventory
  const inventory = [];
  const stdIds = Object.keys(standardAgg);
  for (let i = 0; i < stdIds.length; i++) {
    const stdId = stdIds[i];
    const agg = standardAgg[stdId];
    const std = stdLookup[stdId];
    if (!std) continue;

    const avgScore = Math.round(agg.scores.reduce(function(sum, s) { return sum + s; }, 0) / agg.scores.length);
    let masteryLevel = 'developing';
    if (avgScore >= 80) masteryLevel = 'mastered';
    else if (avgScore >= 50) masteryLevel = 'proficient';

    inventory.push({
      standardId: stdId,
      code: std.code || '',
      description: std.description || '',
      framework: std.framework || 'Other',
      strand: std.strand || '',
      hexCount: agg.hexCount,
      avgScore: avgScore,
      masteryLevel: masteryLevel
    });
  }

  // Sort by framework then code
  inventory.sort(function(a, b) {
    if (a.framework < b.framework) return -1;
    if (a.framework > b.framework) return 1;
    if (a.code < b.code) return -1;
    if (a.code > b.code) return 1;
    return 0;
  });

  return inventory;
}

// ============================================================================
// PORTFOLIO ITEMS BUILDER
// ============================================================================

/**
 * Build portfolio items from StudentPortfolio joined with progress + hex metadata.
 */
function buildPortfolioItems_(email, allPortfolio, studentProgress, hexLookup) {
  // Filter student's portfolio entries
  const studentPortfolio = [];
  for (let i = 0; i < allPortfolio.length; i++) {
    const p = allPortfolio[i];
    if (String(p.studentEmail || '').toLowerCase() === email) {
      studentPortfolio.push(p);
    }
  }

  // Build progress lookup: mapId:hexId -> progress record
  const progressLookup = {};
  for (let i = 0; i < studentProgress.length; i++) {
    const p = studentProgress[i];
    const key = String(p.mapId || '') + ':' + String(p.hexId || '');
    progressLookup[key] = p;
  }

  // Build items
  const items = [];
  for (let i = 0; i < studentPortfolio.length; i++) {
    const pf = studentPortfolio[i];
    const mapId = String(pf.mapId || '');
    const hexId = String(pf.hexId || '');
    const key = mapId + ':' + hexId;
    const progress = progressLookup[key];
    const hexMeta = hexLookup[hexId] || {};

    items.push({
      portfolioId: pf.portfolioId || '',
      mapId: mapId,
      hexId: hexId,
      hexLabel: hexMeta.label || hexId,
      hexIcon: hexMeta.icon || '',
      hexType: hexMeta.type || 'core',
      mapTitle: hexMeta.mapTitle || '',
      portfolioNote: pf.portfolioNote || '',
      displayOrder: parseInt(pf.displayOrder, 10) || 0,
      isHighlight: String(pf.isHighlight) === 'true',
      selectedAt: pf.selectedAt || '',
      status: progress ? String(progress.status || '') : '',
      score: progress ? (parseFloat(progress.score) || 0) : 0,
      maxScore: progress ? (parseFloat(progress.maxScore) || 100) : 100,
      selfAssessRating: progress ? (parseInt(progress.selfAssessRating, 10) || 0) : 0,
      selfAssessGoal: progress ? (progress.selfAssessGoal || '') : '',
      selfAssessNote: progress ? (progress.selfAssessNote || '') : '',
      selfAssessEvidence: progress ? safeJsonParse_(progress.selfAssessEvidenceJson, []) : []
    });
  }

  // Sort by displayOrder
  items.sort(function(a, b) { return a.displayOrder - b.displayOrder; });

  return items;
}

// ============================================================================
// ADD TO PORTFOLIO
// ============================================================================

/**
 * Add a hex to the student's portfolio.
 * @param {string} mapId
 * @param {string} hexId
 * @param {string} [note] - Optional portfolio note (max 300 chars)
 * @returns {string} New portfolio ID
 */
function addToPortfolio(mapId, hexId, note) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!mapId || !hexId) throw new Error('Map ID and Hex ID are required');

  // Validate note length
  const cleanNote = String(note || '').substring(0, 300);

  // Check student has progress on this hex (not not_started)
  const allProgress = readAll_(SHEETS_.PROGRESS);
  let hasProgress = false;
  for (let i = 0; i < allProgress.length; i++) {
    const p = allProgress[i];
    if (String(p.email || '').toLowerCase() === email &&
        String(p.mapId) === String(mapId) &&
        String(p.hexId) === String(hexId)) {
      const status = String(p.status || '');
      if (status === 'in_progress' || status === 'completed' || status === 'mastered') {
        hasProgress = true;
      }
      break;
    }
  }
  if (!hasProgress) {
    throw new Error('You must have started this hex to add it to your portfolio');
  }

  // Check for duplicate
  const allPortfolio = readAll_(SHEETS_.STUDENT_PORTFOLIO);
  for (let i = 0; i < allPortfolio.length; i++) {
    const pf = allPortfolio[i];
    if (String(pf.studentEmail || '').toLowerCase() === email &&
        String(pf.mapId) === String(mapId) &&
        String(pf.hexId) === String(hexId)) {
      throw new Error('This hex is already in your portfolio');
    }
  }

  // Compute next displayOrder
  let maxOrder = 0;
  for (let i = 0; i < allPortfolio.length; i++) {
    if (String(allPortfolio[i].studentEmail || '').toLowerCase() === email) {
      const order = parseInt(allPortfolio[i].displayOrder, 10) || 0;
      if (order > maxOrder) maxOrder = order;
    }
  }

  const portfolioId = generatePortfolioId_();
  appendRow_(SHEETS_.STUDENT_PORTFOLIO, {
    portfolioId: portfolioId,
    studentEmail: email,
    mapId: String(mapId),
    hexId: String(hexId),
    selectedAt: now_(),
    portfolioNote: cleanNote,
    displayOrder: maxOrder + 1,
    isHighlight: 'false',
    updatedAt: now_()
  });

  return portfolioId;
}

// ============================================================================
// REMOVE FROM PORTFOLIO
// ============================================================================

/**
 * Remove a hex from the student's portfolio.
 * @param {string} portfolioId
 * @returns {boolean} Success
 */
function removeFromPortfolio(portfolioId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!portfolioId) throw new Error('Portfolio ID is required');

  // Verify ownership
  const row = findRow_(SHEETS_.STUDENT_PORTFOLIO, 'portfolioId', portfolioId);
  if (!row) throw new Error('Portfolio item not found');
  if (String(row.studentEmail || '').toLowerCase() !== email) {
    throw new Error('Permission denied: not your portfolio item');
  }

  return deleteRow_(SHEETS_.STUDENT_PORTFOLIO, 'portfolioId', portfolioId);
}

// ============================================================================
// UPDATE PORTFOLIO ITEM
// ============================================================================

/**
 * Update a portfolio item (note, highlight, displayOrder).
 * @param {string} portfolioId
 * @param {Object} updates - { portfolioNote, isHighlight, displayOrder }
 * @returns {boolean} Success
 */
function updatePortfolioItem(portfolioId, updates) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!portfolioId) throw new Error('Portfolio ID is required');

  // Verify ownership
  const row = findRow_(SHEETS_.STUDENT_PORTFOLIO, 'portfolioId', portfolioId);
  if (!row) throw new Error('Portfolio item not found');
  if (String(row.studentEmail || '').toLowerCase() !== email) {
    throw new Error('Permission denied: not your portfolio item');
  }

  const safeUpdates = { updatedAt: now_() };
  if (updates.portfolioNote !== undefined) {
    safeUpdates.portfolioNote = String(updates.portfolioNote || '').substring(0, 300);
  }
  if (updates.isHighlight !== undefined) {
    safeUpdates.isHighlight = String(updates.isHighlight === true || updates.isHighlight === 'true');
  }
  if (updates.displayOrder !== undefined) {
    safeUpdates.displayOrder = parseInt(updates.displayOrder, 10) || 0;
  }

  return updateRow_(SHEETS_.STUDENT_PORTFOLIO, 'portfolioId', portfolioId, safeUpdates);
}

// ============================================================================
// SAVE PORTFOLIO ORDER
// ============================================================================

/**
 * Bulk-update displayOrder for portfolio items.
 * @param {Array} orderData - [{portfolioId, displayOrder}]
 * @returns {boolean} Success
 */
function savePortfolioOrder(orderData) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!orderData || !Array.isArray(orderData)) {
    throw new Error('Order data is required');
  }

  for (let i = 0; i < orderData.length; i++) {
    const item = orderData[i];
    if (!item.portfolioId) continue;

    // Verify ownership inline (avoids extra reads)
    const row = findRow_(SHEETS_.STUDENT_PORTFOLIO, 'portfolioId', item.portfolioId);
    if (row && String(row.studentEmail || '').toLowerCase() === email) {
      updateRow_(SHEETS_.STUDENT_PORTFOLIO, 'portfolioId', item.portfolioId, {
        displayOrder: parseInt(item.displayOrder, 10) || 0,
        updatedAt: now_()
      });
    }
  }

  return true;
}

// ============================================================================
// EXPORT PORTFOLIO TO GOOGLE DOC
// ============================================================================

/**
 * Export portfolio to a formatted Google Doc.
 * @param {string} [studentEmail] - For teacher preview export
 * @returns {string} Google Doc URL
 */
function exportPortfolioToDoc(studentEmail) {
  const user = getCurrentUser();

  let email;
  if (studentEmail && studentEmail.toLowerCase() !== user.email.toLowerCase()) {
    if (!isTeacherOrAdmin()) {
      throw new Error('Permission denied');
    }
    email = studentEmail.toLowerCase();
  } else {
    email = user.email.toLowerCase();
  }

  // Get portfolio data
  const data = getStudentPortfolioData(email);

  // Get student display name
  const allUsers = readAll_(SHEETS_.USERS);
  let studentName = email;
  for (let u = 0; u < allUsers.length; u++) {
    if (String(allUsers[u].email || '').toLowerCase() === email) {
      studentName = allUsers[u].displayName || allUsers[u].name || email;
      break;
    }
  }

  // Create document
  const docTitle = 'Learning Portfolio - ' + studentName;
  const doc = DocumentApp.create(docTitle);
  const body = doc.getBody();

  // Title
  body.appendParagraph(docTitle).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Generated: ' + new Date().toLocaleDateString());

  // Growth Summary
  body.appendParagraph('Growth Summary').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Current Streak: ' + (data.streak || 0) + ' days');
  body.appendParagraph('Hexes Completed: ' + data.summary.totalCompleted + ' of ' + data.summary.totalHexes);
  body.appendParagraph('Overall Completion: ' + data.summary.overallCompletionPct + '%');
  body.appendParagraph('Average Score: ' + data.summary.overallAvgScore + '%');
  if (data.growthMessage) {
    body.appendParagraph(data.growthMessage);
  }

  // Skill Inventory
  if (data.skillInventory.length > 0) {
    body.appendParagraph('Skills & Standards').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    let currentFramework = '';
    for (let s = 0; s < data.skillInventory.length; s++) {
      const skill = data.skillInventory[s];
      if (skill.framework !== currentFramework) {
        currentFramework = skill.framework;
        body.appendParagraph(currentFramework).setHeading(DocumentApp.ParagraphHeading.HEADING3);
      }
      body.appendListItem(skill.code + ' - ' + skill.description +
        ' (Avg: ' + skill.avgScore + '%, ' + skill.masteryLevel + ', ' + skill.hexCount + ' hex' + (skill.hexCount !== 1 ? 'es' : '') + ')');
    }
  }

  // Portfolio Items
  if (data.portfolioItems.length > 0) {
    body.appendParagraph('My Portfolio').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    for (let p = 0; p < data.portfolioItems.length; p++) {
      const item = data.portfolioItems[p];
      const highlight = item.isHighlight ? ' \u2B50' : '';
      body.appendParagraph(item.hexLabel + highlight + ' (' + item.mapTitle + ')').setHeading(DocumentApp.ParagraphHeading.HEADING3);

      const scorePct = item.maxScore > 0 ? Math.round((item.score / item.maxScore) * 100) : 0;
      body.appendParagraph('Status: ' + item.status + ' | Score: ' + scorePct + '%');

      if (item.selfAssessGoal) {
        body.appendParagraph('Goal: ' + item.selfAssessGoal);
      }
      if (item.selfAssessNote) {
        body.appendParagraph('Reflection: ' + item.selfAssessNote);
      }
      if (item.portfolioNote) {
        body.appendParagraph('Portfolio Note: ' + item.portfolioNote);
      }

      // Evidence links
      const evidence = item.selfAssessEvidence || [];
      if (evidence.length > 0) {
        body.appendParagraph('Evidence:');
        for (let e = 0; e < evidence.length; e++) {
          const ev = evidence[e];
          if (ev.url) {
            body.appendListItem((ev.label || 'Link') + ': ' + ev.url);
          }
        }
      }
    }
  }

  // Badges
  if (data.badges.length > 0) {
    body.appendParagraph('Badges Earned').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    for (let b = 0; b < data.badges.length; b++) {
      const badge = data.badges[b];
      const def = BADGE_DEFINITIONS[badge.achievementKey];
      if (def) {
        body.appendListItem(def.icon + ' ' + def.label + ' - ' + def.description);
      }
    }
  }

  doc.saveAndClose();
  return doc.getUrl();
}

// ============================================================================
// TEACHER PORTFOLIO INSIGHTS
// ============================================================================

/**
 * Get class-level portfolio insights for teachers.
 * @param {string} classId
 * @param {string} mapId - Optional map filter
 * @returns {Object} { adoptionRate, avgItemsPerStudent, topCuratedHex, students[] }
 */
function getClassPortfolioInsights(classId, mapId) {
  if (!isTeacherOrAdmin()) throw new Error('Permission denied');
  if (!classId) throw new Error('Class ID required');

  // Get class roster
  const roster = getClassRoster(classId);
  if (!roster || roster.length === 0) {
    return { adoptionRate: 0, avgItemsPerStudent: 0, topCuratedHex: null, students: [] };
  }

  // Build email set from roster
  const rosterEmails = {};
  for (let r = 0; r < roster.length; r++) {
    const re = String(roster[r].studentEmail || roster[r].email || '').toLowerCase();
    if (re) rosterEmails[re] = roster[r].name || roster[r].displayName || re;
  }

  // Read portfolio items
  const allPortfolio = readAll_(SHEETS_.STUDENT_PORTFOLIO);
  const allMaps = readAll_(SHEETS_.MAPS);

  // Build hex lookup from maps
  const hexLookup = {};
  for (let m = 0; m < allMaps.length; m++) {
    const map = allMaps[m];
    const mid = String(map.mapId || '');
    const hexes = safeJsonParse_(map.hexesJson, []);
    for (let h = 0; h < hexes.length; h++) {
      hexLookup[String(hexes[h].id || '')] = {
        label: hexes[h].label || hexes[h].id,
        mapId: mid,
        mapTitle: map.title || 'Untitled'
      };
    }
  }

  // Aggregate per student
  const studentItems = {};  // email -> [{...}]
  const hexCounts = {};     // hexId -> count
  for (let i = 0; i < allPortfolio.length; i++) {
    const pf = allPortfolio[i];
    const email = String(pf.studentEmail || '').toLowerCase();
    if (!rosterEmails[email]) continue;
    if (mapId && String(pf.mapId || '') !== String(mapId)) continue;

    if (!studentItems[email]) studentItems[email] = [];
    const hexId = String(pf.hexId || '');
    const isHL = String(pf.isHighlight) === 'true';
    studentItems[email].push({
      portfolioId: pf.portfolioId || '',
      hexId: hexId,
      hexLabel: (hexLookup[hexId] || {}).label || hexId,
      mapTitle: (hexLookup[hexId] || {}).mapTitle || '',
      isHighlight: isHL,
      portfolioNote: pf.portfolioNote || '',
      selectedAt: pf.selectedAt || ''
    });

    hexCounts[hexId] = (hexCounts[hexId] || 0) + 1;
  }

  // Compute metrics
  const rosterEmailList = Object.keys(rosterEmails);
  let withItems = 0;
  let totalItems = 0;
  let totalHighlights = 0;
  const students = [];

  for (let e = 0; e < rosterEmailList.length; e++) {
    const email = rosterEmailList[e];
    const items = studentItems[email] || [];
    const hlCount = items.filter(function(it) { return it.isHighlight; }).length;
    if (items.length > 0) withItems++;
    totalItems += items.length;
    totalHighlights += hlCount;

    // Find last curated date
    let lastDate = '';
    for (let j = 0; j < items.length; j++) {
      if (items[j].selectedAt > lastDate) lastDate = items[j].selectedAt;
    }

    students.push({
      email: email,
      name: rosterEmails[email],
      itemCount: items.length,
      highlightCount: hlCount,
      lastCuratedAt: lastDate,
      items: items
    });
  }

  // Sort students: most items first
  students.sort(function(a, b) { return b.itemCount - a.itemCount; });

  // Top curated hex
  let topHexId = null;
  let topHexCount = 0;
  const hexIds = Object.keys(hexCounts);
  for (let h = 0; h < hexIds.length; h++) {
    if (hexCounts[hexIds[h]] > topHexCount) {
      topHexCount = hexCounts[hexIds[h]];
      topHexId = hexIds[h];
    }
  }

  const adoptionRate = rosterEmailList.length > 0 ? Math.round((withItems / rosterEmailList.length) * 100) : 0;
  const avgItems = rosterEmailList.length > 0 ? Math.round((totalItems / rosterEmailList.length) * 10) / 10 : 0;

  return {
    adoptionRate: adoptionRate,
    avgItemsPerStudent: avgItems,
    topCuratedHex: topHexId ? { hexId: topHexId, label: (hexLookup[topHexId] || {}).label || topHexId, count: topHexCount } : null,
    students: students
  };
}
