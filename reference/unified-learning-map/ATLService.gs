/**
 * ATL Service
 * IB Approaches to Learning — student self-rating + teacher summaries
 *
 * @version 1.0.0
 *
 * StudentATLProgress Schema:
 * atlProgressId, studentEmail, atlCategory, atlSubSkill, rating,
 * reflectionNote, goalNote, updatedAt, term
 *
 * ATL Categories: thinking, communication, social, selfManagement, research
 */

// ATL sub-skill definitions per category
const ATL_FRAMEWORK = {
  thinking: {
    label: 'Thinking',
    subSkills: [
      { key: 'criticalThinking', label: 'Critical Thinking' },
      { key: 'creativeThinking', label: 'Creative Thinking' },
      { key: 'transfer', label: 'Transfer' }
    ]
  },
  communication: {
    label: 'Communication',
    subSkills: [
      { key: 'reading', label: 'Reading' },
      { key: 'writing', label: 'Writing' },
      { key: 'speaking', label: 'Speaking' },
      { key: 'listening', label: 'Listening' }
    ]
  },
  social: {
    label: 'Social',
    subSkills: [
      { key: 'collaboration', label: 'Collaboration' }
    ]
  },
  selfManagement: {
    label: 'Self-management',
    subSkills: [
      { key: 'organization', label: 'Organization' },
      { key: 'affective', label: 'Affective / Mindfulness' },
      { key: 'reflection', label: 'Reflection' }
    ]
  },
  research: {
    label: 'Research',
    subSkills: [
      { key: 'informationLiteracy', label: 'Information Literacy' },
      { key: 'mediaLiteracy', label: 'Media Literacy' }
    ]
  }
};

// Contextual tips keyed by ATL category / situation
const ATL_TIPS = {
  thinking: [
    'Try looking at the problem from a different perspective — what would someone who disagrees with you say?',
    'Use a thinking routine: See-Think-Wonder or Claim-Support-Question.',
    'Before answering, pause and identify what you already know vs. what you need to find out.'
  ],
  communication: [
    'Before writing, create a quick outline with 3 main points.',
    'When reading a complex text, annotate as you go — underline key ideas, write margin notes.',
    'Practice active listening: summarize what the speaker said before responding.'
  ],
  social: [
    'In group work, assign clear roles: facilitator, note-taker, timekeeper, presenter.',
    'Use "I think... because..." statements to share opinions respectfully.',
    'Check in with your team: is everyone contributing and being heard?'
  ],
  selfManagement: [
    'Use the Pomodoro technique: 25 minutes of focused work, then a 5-minute break.',
    'At the start of each session, write down 3 things you want to accomplish.',
    'When feeling overwhelmed, break your task into the smallest possible next step.',
    'Try the 2-minute rule: if a task takes less than 2 minutes, do it now.'
  ],
  research: [
    'Break research into steps: Question → Sources → Notes → Synthesis.',
    'Use the CRAAP test to evaluate sources: Currency, Relevance, Authority, Accuracy, Purpose.',
    'Keep a research log: track what you searched, where you looked, and what you found.'
  ],
  overdue: [
    'You have overdue tasks. Try the 2-minute rule: if a task takes less than 2 minutes, do it now.',
    'Prioritize your overdue tasks by which ones are worth the most or are closest to done.'
  ],
  manyDue: [
    'Prioritize by urgency — use the reorder buttons to put the most urgent task first.',
    'Focus on one task at a time. Multitasking reduces quality and increases stress.'
  ],
  noProgress: [
    'Start with your easiest task to build momentum.',
    'Set a timer for just 10 minutes — often starting is the hardest part.'
  ]
};

// ============================================================================
// GET ATL PROGRESS
// ============================================================================
/**
 * Get all ATL ratings for a student
 * Students can only access their own; teachers can access students in their classes
 *
 * @param {string} [studentEmail] - Optional, for teacher access. Omit for own data.
 * @returns {Object} { categories: ATL_FRAMEWORK, progress: [...], email: string }
 */
function getATLProgress(studentEmail) {
  const user = getCurrentUser();
  let targetEmail = user.email.toLowerCase();

  if (studentEmail) {
    const requestedEmail = String(studentEmail).toLowerCase().trim();
    if (requestedEmail !== targetEmail) {
      // Must be teacher/admin to view other students
      if (!isTeacherOrAdmin()) {
        throw new Error('Permission denied. Students can only view their own ATL progress.');
      }
      // Verify teacher has access to this student via class ownership
      if (!canAccessStudentProfile_(requestedEmail, user.email)) {
        throw new Error('Permission denied. Student not in your classes.');
      }
      targetEmail = requestedEmail;
    }
  }

  const allProgress = readAll_(SHEETS_.STUDENT_ATL_PROGRESS);
  const studentProgress = [];

  for (let i = 0; i < allProgress.length; i++) {
    if (String(allProgress[i].studentEmail || '').toLowerCase() === targetEmail) {
      studentProgress.push({
        atlProgressId: allProgress[i].atlProgressId || '',
        atlCategory: allProgress[i].atlCategory || '',
        atlSubSkill: allProgress[i].atlSubSkill || '',
        rating: parseInt(allProgress[i].rating, 10) || 0,
        reflectionNote: allProgress[i].reflectionNote || '',
        goalNote: allProgress[i].goalNote || '',
        updatedAt: allProgress[i].updatedAt || '',
        term: allProgress[i].term || ''
      });
    }
  }

  return {
    categories: ATL_FRAMEWORK,
    progress: studentProgress,
    email: targetEmail
  };
}

// ============================================================================
// SAVE ATL RATING
// ============================================================================
/**
 * Save or update a student's ATL self-rating
 *
 * @param {string} atlCategory - e.g. 'thinking', 'communication'
 * @param {string} atlSubSkill - e.g. 'criticalThinking', 'reading'
 * @param {number} rating - 1-4
 * @param {string} reflectionNote - max 300 chars
 * @param {string} goalNote - max 150 chars
 * @param {string} term - e.g. '2025-T2'
 * @returns {Object} { success: boolean, atlProgressId: string }
 */
function saveATLRating(atlCategory, atlSubSkill, rating, reflectionNote, goalNote, term) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  const now = new Date().toISOString();

  // Validate category
  if (!ATL_FRAMEWORK[atlCategory]) {
    throw new Error('Invalid ATL category: ' + atlCategory);
  }

  // Validate sub-skill belongs to category
  const subSkills = ATL_FRAMEWORK[atlCategory].subSkills;
  let validSubSkill = false;
  for (let s = 0; s < subSkills.length; s++) {
    if (subSkills[s].key === atlSubSkill) { validSubSkill = true; break; }
  }
  if (!validSubSkill) {
    throw new Error('Invalid ATL sub-skill: ' + atlSubSkill + ' for category: ' + atlCategory);
  }

  // Validate rating
  const ratingNum = parseInt(rating, 10);
  if (ratingNum < 1 || ratingNum > 4) {
    throw new Error('Rating must be between 1 and 4');
  }

  // Validate note lengths
  const reflection = String(reflectionNote || '').substring(0, 300);
  const goal = String(goalNote || '').substring(0, 150);
  const termStr = String(term || '').substring(0, 20);

  // Read existing progress
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS_.STUDENT_ATL_PROGRESS);
  if (!sheet) {
    throw new Error('StudentATLProgress sheet not found. Please run setup.');
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const schema = SCHEMA_TABS.StudentATLProgress;

  // Find existing row for this student + category + subSkill + term
  let existingRow = -1;
  const emailCol = headers.indexOf('studentEmail');
  const catCol = headers.indexOf('atlCategory');
  const subCol = headers.indexOf('atlSubSkill');
  const termCol = headers.indexOf('term');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][emailCol] || '').toLowerCase() === email &&
        data[i][catCol] === atlCategory &&
        data[i][subCol] === atlSubSkill &&
        data[i][termCol] === termStr) {
      existingRow = i;
      break;
    }
  }

  let atlProgressId;

  if (existingRow >= 0) {
    // Update existing row
    atlProgressId = data[existingRow][headers.indexOf('atlProgressId')];
    const rowValues = [];
    for (let h = 0; h < headers.length; h++) {
      switch (headers[h]) {
        case 'rating': rowValues.push(ratingNum); break;
        case 'reflectionNote': rowValues.push(reflection); break;
        case 'goalNote': rowValues.push(goal); break;
        case 'updatedAt': rowValues.push(now); break;
        default: rowValues.push(data[existingRow][h]); break;
      }
    }
    sheet.getRange(existingRow + 1, 1, 1, headers.length).setValues([rowValues]);
  } else {
    // Insert new row
    atlProgressId = generateATLProgressId_();
    const newRow = [];
    for (let h = 0; h < headers.length; h++) {
      switch (headers[h]) {
        case 'atlProgressId': newRow.push(atlProgressId); break;
        case 'studentEmail': newRow.push(email); break;
        case 'atlCategory': newRow.push(atlCategory); break;
        case 'atlSubSkill': newRow.push(atlSubSkill); break;
        case 'rating': newRow.push(ratingNum); break;
        case 'reflectionNote': newRow.push(reflection); break;
        case 'goalNote': newRow.push(goal); break;
        case 'updatedAt': newRow.push(now); break;
        case 'term': newRow.push(termStr); break;
        default: newRow.push(''); break;
      }
    }
    sheet.appendRow(newRow);
  }

  Logger.log('saveATLRating: ' + email + ' / ' + atlCategory + '.' + atlSubSkill + ' = ' + ratingNum);
  return { success: true, atlProgressId: atlProgressId };
}

// ============================================================================
// GET ATL SUGGESTIONS
// ============================================================================
/**
 * Get contextual tips/strategies for given ATL skill tags
 *
 * @param {string} atlTags - Comma-separated ATL skill tags from hex
 * @returns {Array<Object>} Array of { category, tip }
 */
function getATLSuggestions(atlTags) {
  if (!atlTags) return [];

  const tagsLower = String(atlTags).toLowerCase();
  const suggestions = [];

  // Match tags to categories
  const categoryKeywords = {
    thinking: ['think', 'critical', 'creative', 'transfer', 'analysis', 'evaluate'],
    communication: ['communicat', 'read', 'writ', 'speak', 'listen', 'present'],
    social: ['social', 'collaborat', 'group', 'team', 'peer'],
    selfManagement: ['self', 'manag', 'organiz', 'reflect', 'mindful', 'plan', 'time'],
    research: ['research', 'information', 'media', 'source', 'inquiry', 'investigat']
  };

  const matchedCategories = {};
  const categories = Object.keys(categoryKeywords);
  for (let c = 0; c < categories.length; c++) {
    const cat = categories[c];
    const keywords = categoryKeywords[cat];
    for (let k = 0; k < keywords.length; k++) {
      if (tagsLower.indexOf(keywords[k]) !== -1) {
        matchedCategories[cat] = true;
        break;
      }
    }
  }

  // Get one random tip per matched category
  const matched = Object.keys(matchedCategories);
  for (let m = 0; m < matched.length; m++) {
    const cat = matched[m];
    const tips = ATL_TIPS[cat];
    if (tips && tips.length > 0) {
      const idx = Math.floor(Math.random() * tips.length);
      suggestions.push({
        category: cat,
        categoryLabel: ATL_FRAMEWORK[cat].label,
        tip: tips[idx]
      });
    }
  }

  return suggestions;
}

// ============================================================================
// GET CLASS ATL SUMMARY (Teacher View)
// ============================================================================
/**
 * Get aggregated ATL ratings for a class
 *
 * @param {string} classId - Class ID
 * @returns {Object} { categoryAverages, studentsNeedingSupport, totalStudents }
 */
function getClassATLSummary(classId) {
  if (!isTeacherOrAdmin()) {
    throw new Error('Permission denied. Only teachers and administrators can view class ATL summaries.');
  }
  if (!classId) {
    throw new Error('Class ID is required');
  }

  // Get students in this class
  const allRoster = readAll_(SHEETS_.CLASS_ROSTER);
  const studentEmails = [];
  for (let r = 0; r < allRoster.length; r++) {
    if (String(allRoster[r].classId) === String(classId) && allRoster[r].status !== 'removed') {
      const email = String(allRoster[r].studentEmail || '').toLowerCase();
      if (email && studentEmails.indexOf(email) === -1) {
        studentEmails.push(email);
      }
    }
  }

  if (studentEmails.length === 0) {
    return { categoryAverages: {}, studentsNeedingSupport: [], totalStudents: 0 };
  }

  // Read all ATL progress
  const allProgress = readAll_(SHEETS_.STUDENT_ATL_PROGRESS);

  // Build per-student, per-category averages
  const studentCatRatings = {}; // { email: { category: [ratings] } }
  for (let p = 0; p < allProgress.length; p++) {
    const prog = allProgress[p];
    const email = String(prog.studentEmail || '').toLowerCase();
    if (studentEmails.indexOf(email) === -1) continue;

    const cat = prog.atlCategory;
    const rating = parseInt(prog.rating, 10);
    if (!cat || !rating) continue;

    if (!studentCatRatings[email]) studentCatRatings[email] = {};
    if (!studentCatRatings[email][cat]) studentCatRatings[email][cat] = [];
    studentCatRatings[email][cat].push(rating);
  }

  // Compute class-level category averages
  const categoryTotals = {};
  const categoryCounts = {};
  const categories = Object.keys(ATL_FRAMEWORK);

  for (let c = 0; c < categories.length; c++) {
    categoryTotals[categories[c]] = 0;
    categoryCounts[categories[c]] = 0;
  }

  const studentsNeedingSupport = [];
  const ratedStudents = Object.keys(studentCatRatings);

  for (let s = 0; s < ratedStudents.length; s++) {
    const email = ratedStudents[s];
    const catData = studentCatRatings[email];
    let lowestAvg = 5;
    let lowestCat = '';

    for (let c = 0; c < categories.length; c++) {
      const cat = categories[c];
      const ratings = catData[cat];
      if (!ratings || ratings.length === 0) continue;

      let sum = 0;
      for (let r = 0; r < ratings.length; r++) sum += ratings[r];
      const avg = sum / ratings.length;

      categoryTotals[cat] += avg;
      categoryCounts[cat]++;

      if (avg < lowestAvg) {
        lowestAvg = avg;
        lowestCat = cat;
      }
    }

    // Flag students with any category average below 2
    if (lowestAvg < 2 && lowestCat) {
      // Find student name from roster
      let name = email;
      for (let r = 0; r < allRoster.length; r++) {
        if (String(allRoster[r].studentEmail || '').toLowerCase() === email) {
          name = allRoster[r].studentName || email;
          break;
        }
      }
      studentsNeedingSupport.push({
        email: email,
        name: name,
        weakestCategory: lowestCat,
        weakestCategoryLabel: ATL_FRAMEWORK[lowestCat].label,
        averageRating: Math.round(lowestAvg * 10) / 10
      });
    }
  }

  // Compute final averages
  const categoryAverages = {};
  for (let c = 0; c < categories.length; c++) {
    const cat = categories[c];
    if (categoryCounts[cat] > 0) {
      categoryAverages[cat] = {
        label: ATL_FRAMEWORK[cat].label,
        average: Math.round((categoryTotals[cat] / categoryCounts[cat]) * 10) / 10,
        respondents: categoryCounts[cat]
      };
    }
  }

  return {
    categoryAverages: categoryAverages,
    studentsNeedingSupport: studentsNeedingSupport,
    totalStudents: studentEmails.length,
    studentsWithRatings: ratedStudents.length
  };
}

// ============================================================================
// GET ATL FRAMEWORK (Public)
// ============================================================================
/**
 * Returns the ATL framework definition (categories + sub-skills)
 * @returns {Object} ATL_FRAMEWORK
 */
function getATLFramework() {
  return ATL_FRAMEWORK;
}

// ============================================================================
// GET CONTEXTUAL TIPS FOR TASKS (Student helper)
// ============================================================================
/**
 * Get situational tips based on student task state
 *
 * @param {Object} taskStats - { overdueCount, dueTodayCount, totalActive }
 * @returns {Array<Object>} Array of { tipId, category, tip }
 */
function getContextualTaskTips(taskStats) {
  const tips = [];

  if (taskStats && taskStats.overdueCount > 0) {
    const overdueTips = ATL_TIPS.overdue;
    tips.push({
      tipId: 'overdue',
      category: 'selfManagement',
      categoryLabel: 'Self-management',
      tip: overdueTips[Math.floor(Math.random() * overdueTips.length)]
    });
  }

  if (taskStats && taskStats.dueTodayCount >= 3) {
    const manyTips = ATL_TIPS.manyDue;
    tips.push({
      tipId: 'manyDue',
      category: 'selfManagement',
      categoryLabel: 'Self-management',
      tip: manyTips[Math.floor(Math.random() * manyTips.length)]
    });
  }

  if (taskStats && taskStats.totalActive > 0 && taskStats.overdueCount === 0 && taskStats.dueTodayCount === 0) {
    // Student has tasks but none urgent — offer a general productivity tip
    const noProgressTips = ATL_TIPS.noProgress;
    if (Math.random() < 0.3) { // Only show 30% of the time to avoid annoyance
      tips.push({
        tipId: 'motivation',
        category: 'selfManagement',
        categoryLabel: 'Self-management',
        tip: noProgressTips[Math.floor(Math.random() * noProgressTips.length)]
      });
    }
  }

  return tips;
}
