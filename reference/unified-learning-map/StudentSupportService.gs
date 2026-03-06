// ============================================================================
// STUDENT SUPPORT SERVICE
// In-app CRUD for student support profiles (IEP/WIDA/EAL/504).
// Access-controlled: teachers see only their class students, admins see all.
// ============================================================================

/**
 * Get all active support profiles for students in a specific class.
 * Requires teacher to own the class, or admin.
 *
 * @param {string} classId - Class ID
 * @returns {Array<Object>} Parsed profile objects with JSON fields expanded
 */
function getClassSupportProfiles(classId) {
  requireRole(['administrator', 'teacher']);
  if (!classId) throw new Error('Class ID is required');

  const user = getCurrentUser();
  const cls = getClassById(classId);
  if (!cls) throw new Error('Class not found');
  if (!user.isAdmin && cls.teacherEmail !== user.email) {
    throw new Error('Permission denied: you do not own this class');
  }

  // Get student emails in this class
  const roster = getClassRoster(classId);
  const classEmails = {};
  for (let i = 0; i < roster.length; i++) {
    if (roster[i].status !== 'removed') {
      classEmails[String(roster[i].email).toLowerCase()] = roster[i];
    }
  }

  // Get all active profiles, filter to class members
  const allProfiles = readAll_(SHEETS_.STUDENT_SUPPORT_PROFILES);
  const result = [];
  for (let i = 0; i < allProfiles.length; i++) {
    const p = allProfiles[i];
    if (String(p.isActive) !== 'true') continue;
    const email = String(p.studentEmail).toLowerCase();
    if (!classEmails[email]) continue;

    result.push(expandProfile_(p, classEmails[email]));
  }

  return result;
}

/**
 * Get a single student's support profile.
 * Teachers can only access students in their classes. Admins can access any.
 *
 * @param {string} studentEmail - Student email
 * @returns {Object|null} Expanded profile or null
 */
function getStudentSupportProfile(studentEmail) {
  requireRole(['administrator', 'teacher']);
  if (!studentEmail) throw new Error('Student email is required');

  const user = getCurrentUser();
  const normalizedEmail = String(studentEmail).toLowerCase().trim();

  // Access check: teacher must have this student in one of their classes
  if (!user.isAdmin) {
    if (!canAccessStudentProfile_(normalizedEmail, user.email)) {
      throw new Error('Permission denied: student not in your classes');
    }
  }

  const profiles = findRowsFiltered_(SHEETS_.STUDENT_SUPPORT_PROFILES, { studentEmail: normalizedEmail });
  for (let i = 0; i < profiles.length; i++) {
    if (String(profiles[i].isActive) !== 'true') continue;
    return expandProfile_(profiles[i], null);
  }

  return null;
}

/**
 * Get the current student's own support profile.
 * Students can only see their own profile — uses Session email, no parameters.
 * Returns a student-safe subset (no teacher notes, no audit metadata).
 *
 * @returns {Object|null} Student-safe profile or null if no profile exists
 */
function getMyStudentProfile() {
  const email = Session.getActiveUser().getEmail().toLowerCase().trim();
  if (!email) return null;

  const profiles = findRowsFiltered_(SHEETS_.STUDENT_SUPPORT_PROFILES, { studentEmail: email });
  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    if (String(p.isActive) !== 'true') continue;
    return {
      profileType: p.profileType,
      widaOverallLevel: parseInt(p.widaOverallLevel) || 0,
      widaDomains: safeJsonParse_(p.widaDomainsJson, { listening: 0, speaking: 0, reading: 0, writing: 0 }),
      accommodations: safeJsonParse_(p.accommodationsJson, {}),
      strategies: safeJsonParse_(p.supportStrategiesJson, []).filter(function(s) { return s.active !== false; }),
      homeLanguages: safeJsonParse_(p.homeLanguagesJson, [])
    };
  }
  return null;
}

/**
 * Create or update a student support profile.
 * If profileId exists, updates. Otherwise creates new.
 *
 * @param {Object} profileData - Profile fields
 * @returns {Object} Saved profile
 */
function saveStudentSupportProfile(profileData) {
  requireRole(['administrator', 'teacher']);
  if (!profileData) throw new Error('Profile data is required');
  if (!profileData.studentEmail) throw new Error('Student email is required');

  const user = getCurrentUser();
  const normalizedEmail = String(profileData.studentEmail).toLowerCase().trim();
  const now = now_();

  // Validate profileType
  const validTypes = ['IEP', '504', 'WIDA', 'EAL', 'other'];
  const profileType = profileData.profileType || 'other';
  if (validTypes.indexOf(profileType) === -1) {
    throw new Error('Invalid profile type: ' + profileType);
  }

  // Validate WIDA level
  const widaLevel = parseInt(profileData.widaOverallLevel) || 0;
  if (widaLevel < 0 || widaLevel > 6) {
    throw new Error('WIDA level must be between 0 and 6');
  }

  // Build accommodations JSON
  const accommodations = profileData.accommodations || {};
  const accommodationsJson = safeJsonStringify_(accommodations, '{}');

  // Build WIDA domains JSON
  const widaDomains = profileData.widaDomains || {};
  const widaDomainsJson = safeJsonStringify_(widaDomains, '{}');

  // Build strategies JSON — if new profile with WIDA level, auto-populate presets
  let strategies = profileData.strategies || [];
  if (!profileData.profileId && widaLevel > 0 && strategies.length === 0) {
    strategies = getWidaPresetStrategies(widaLevel).map(function(s) {
      return { strategy: s, source: 'wida', active: true };
    });
  }
  const strategiesJson = safeJsonStringify_(strategies, '[]');

  // Build home languages JSON — validate only known codes
  const validLangCodes = ['ja', 'ko', 'fr', 'ta', 'zh', 'es', 'ar', 'hi', 'vi', 'tl', 'pt', 'ru', 'de', 'it'];
  const rawLangs = profileData.homeLanguages || [];
  const homeLanguages = [];
  for (let i = 0; i < rawLangs.length; i++) {
    const code = String(rawLangs[i]).toLowerCase().trim();
    if (code && validLangCodes.indexOf(code) !== -1 && homeLanguages.indexOf(code) === -1) {
      homeLanguages.push(code);
    }
  }
  const homeLanguagesJson = safeJsonStringify_(homeLanguages, '[]');

  // Validate notes length
  const notes = String(profileData.notes || '').substring(0, 1000);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const allProfiles = readAll_(SHEETS_.STUDENT_SUPPORT_PROFILES);

    if (profileData.profileId) {
      // Update existing
      const idx = allProfiles.findIndex(function(p) {
        return p.profileId === profileData.profileId;
      });
      if (idx < 0) throw new Error('Profile not found: ' + profileData.profileId);

      allProfiles[idx].studentEmail = normalizedEmail;
      allProfiles[idx].studentId = profileData.studentId || allProfiles[idx].studentId || '';
      allProfiles[idx].profileType = profileType;
      allProfiles[idx].widaOverallLevel = widaLevel || '';
      allProfiles[idx].widaDomainsJson = widaDomainsJson;
      allProfiles[idx].accommodationsJson = accommodationsJson;
      allProfiles[idx].supportStrategiesJson = strategiesJson;
      allProfiles[idx].homeLanguagesJson = homeLanguagesJson;
      allProfiles[idx].notes = notes;
      allProfiles[idx].updatedBy = user.email;
      allProfiles[idx].updatedAt = now;

      writeAll_(SHEETS_.STUDENT_SUPPORT_PROFILES, allProfiles);
      return expandProfile_(allProfiles[idx], null);
    } else {
      // Create new
      const newProfile = {
        profileId: generateProfileId_(),
        studentEmail: normalizedEmail,
        studentId: profileData.studentId || '',
        profileType: profileType,
        widaOverallLevel: widaLevel || '',
        widaDomainsJson: widaDomainsJson,
        accommodationsJson: accommodationsJson,
        supportStrategiesJson: strategiesJson,
        homeLanguagesJson: homeLanguagesJson,
        notes: notes,
        isActive: 'true',
        createdBy: user.email,
        updatedBy: user.email,
        createdAt: now,
        updatedAt: now
      };
      allProfiles.push(newProfile);
      writeAll_(SHEETS_.STUDENT_SUPPORT_PROFILES, allProfiles);
      return expandProfile_(newProfile, null);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Update the curated strategy list for a student profile.
 * Separate endpoint so teachers can quickly add/remove/toggle strategies.
 *
 * @param {string} profileId - Profile ID
 * @param {Array} strategies - Array of { strategy, source, active } objects
 * @returns {Object} { success: true }
 */
function updateStudentStrategies(profileId, strategies) {
  requireRole(['administrator', 'teacher']);
  if (!profileId) throw new Error('Profile ID is required');
  if (!Array.isArray(strategies)) throw new Error('Strategies must be an array');

  const user = getCurrentUser();

  // Validate each strategy
  for (let i = 0; i < strategies.length; i++) {
    if (!strategies[i].strategy || String(strategies[i].strategy).trim().length === 0) {
      throw new Error('Strategy at index ' + i + ' has no description');
    }
    if (String(strategies[i].strategy).length > 200) {
      throw new Error('Strategy at index ' + i + ' exceeds 200 characters');
    }
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const allProfiles = readAll_(SHEETS_.STUDENT_SUPPORT_PROFILES);
    const idx = allProfiles.findIndex(function(p) { return p.profileId === profileId; });
    if (idx < 0) throw new Error('Profile not found');

    allProfiles[idx].supportStrategiesJson = safeJsonStringify_(strategies, '[]');
    allProfiles[idx].updatedBy = user.email;
    allProfiles[idx].updatedAt = now_();

    writeAll_(SHEETS_.STUDENT_SUPPORT_PROFILES, allProfiles);
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Deactivate (soft delete) a student support profile.
 *
 * @param {string} profileId - Profile ID
 * @returns {Object} { success: true }
 */
function deactivateProfile(profileId) {
  requireRole(['administrator', 'teacher']);
  if (!profileId) throw new Error('Profile ID is required');

  const user = getCurrentUser();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const allProfiles = readAll_(SHEETS_.STUDENT_SUPPORT_PROFILES);
    const idx = allProfiles.findIndex(function(p) { return p.profileId === profileId; });
    if (idx < 0) throw new Error('Profile not found');

    allProfiles[idx].isActive = 'false';
    allProfiles[idx].updatedBy = user.email;
    allProfiles[idx].updatedAt = now_();

    writeAll_(SHEETS_.STUDENT_SUPPORT_PROFILES, allProfiles);
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Get accommodation reminders for a map (Story 2).
 * Finds all classes assigned to this map, loads their students' support profiles,
 * and groups reminders by accommodation type.
 *
 * @param {string} mapId - Map ID
 * @returns {Object} { reminders, widaStudents, totalStudentsWithProfiles, classNames }
 */
function getAccommodationReminders(mapId) {
  requireRole(['administrator', 'teacher']);
  if (!mapId) throw new Error('Map ID is required');

  const user = getCurrentUser();

  // Find classes assigned to this map
  const assignments = readAll_(SHEETS_.MAP_ASSIGNMENTS);
  const assignedClassIds = [];
  for (let i = 0; i < assignments.length; i++) {
    if (String(assignments[i].mapId) === String(mapId)) {
      assignedClassIds.push(assignments[i].classId);
    }
  }

  if (assignedClassIds.length === 0) {
    return { reminders: [], widaStudents: [], totalStudentsWithProfiles: 0, classNames: [] };
  }

  // Get class names and rosters (only for classes owned by this teacher or if admin)
  const classNames = [];
  const allStudentEmails = {};

  for (let c = 0; c < assignedClassIds.length; c++) {
    const cls = getClassById(assignedClassIds[c]);
    if (!cls) continue;
    if (!user.isAdmin && cls.teacherEmail !== user.email) continue;

    classNames.push(cls.className);
    const roster = getClassRoster(assignedClassIds[c]);
    for (let r = 0; r < roster.length; r++) {
      if (roster[r].status !== 'removed') {
        allStudentEmails[String(roster[r].email).toLowerCase()] = roster[r].name;
      }
    }
  }

  // Load active support profiles for these students
  const allProfiles = readAll_(SHEETS_.STUDENT_SUPPORT_PROFILES);
  const matchedProfiles = [];
  for (let i = 0; i < allProfiles.length; i++) {
    const p = allProfiles[i];
    if (String(p.isActive) !== 'true') continue;
    const email = String(p.studentEmail).toLowerCase();
    if (allStudentEmails[email]) {
      matchedProfiles.push({
        profile: p,
        studentName: allStudentEmails[email]
      });
    }
  }

  if (matchedProfiles.length === 0) {
    return { reminders: [], widaStudents: [], totalStudentsWithProfiles: 0, classNames: classNames };
  }

  // Group by accommodation type
  const accommodationLabels = {
    extendedTime: 'Extended Time',
    wordToWordDictionary: 'Word-to-Word Dictionaries',
    sentenceStarters: 'Sentence Starters',
    reducedWorkload: 'Reduced Workload',
    preferentialSeating: 'Preferential Seating',
    readAloud: 'Read Aloud',
    scribe: 'Scribe',
    visualSupports: 'Visual Supports',
    simplifiedLanguage: 'Simplified Language',
    translationSupport: 'Translation Support'
  };

  const reminderMap = {};
  const widaStudents = [];

  for (let m = 0; m < matchedProfiles.length; m++) {
    const mp = matchedProfiles[m];
    const accom = safeJsonParse_(mp.profile.accommodationsJson, {});
    const strategies = safeJsonParse_(mp.profile.supportStrategiesJson, []);
    const widaLevel = parseInt(mp.profile.widaOverallLevel) || 0;

    // Group standard accommodations
    for (const key in accommodationLabels) {
      if (accommodationLabels.hasOwnProperty(key) && accom[key] === true) {
        if (!reminderMap[key]) {
          reminderMap[key] = { type: key, label: accommodationLabels[key], students: [], count: 0 };
        }
        reminderMap[key].students.push(mp.studentName);
        reminderMap[key].count++;
      }
    }

    // Custom accommodations
    if (accom.custom && Array.isArray(accom.custom)) {
      for (let ci = 0; ci < accom.custom.length; ci++) {
        const customKey = 'custom_' + ci;
        if (!reminderMap[customKey]) {
          reminderMap[customKey] = { type: 'custom', label: accom.custom[ci], students: [], count: 0 };
        }
        reminderMap[customKey].students.push(mp.studentName);
        reminderMap[customKey].count++;
      }
    }

    // WIDA students
    if (widaLevel > 0) {
      const activeStrategies = strategies
        .filter(function(s) { return s.active !== false; })
        .map(function(s) { return s.strategy; });
      const domains = safeJsonParse_(mp.profile.widaDomainsJson, { listening: 0, speaking: 0, reading: 0, writing: 0 });
      widaStudents.push({
        name: mp.studentName,
        email: String(mp.profile.studentEmail || '').toLowerCase(),
        level: widaLevel,
        domains: domains,
        strategies: activeStrategies.slice(0, 3)
      });
    }
  }

  // Convert reminderMap to sorted array
  const reminders = [];
  for (const key in reminderMap) {
    if (reminderMap.hasOwnProperty(key)) {
      reminders.push(reminderMap[key]);
    }
  }
  reminders.sort(function(a, b) { return b.count - a.count; });

  return {
    reminders: reminders,
    widaStudents: widaStudents,
    totalStudentsWithProfiles: matchedProfiles.length,
    classNames: classNames
  };
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Check if a teacher can access a student's profile.
 * Returns true if the student is in any of the teacher's classes.
 *
 * @param {string} studentEmail - Normalized student email
 * @param {string} teacherEmail - Teacher email
 * @returns {boolean}
 */
function canAccessStudentProfile_(studentEmail, teacherEmail) {
  // Get teacher's classes using Config.gs helpers
  const teacherClasses = findRowsFiltered_(SHEETS_.CLASSES, { teacherEmail: teacherEmail });
  if (teacherClasses.length === 0) return false;

  const teacherClassIds = {};
  for (let i = 0; i < teacherClasses.length; i++) {
    teacherClassIds[String(teacherClasses[i].classId)] = true;
  }

  // Check if student is in any of these classes
  const studentRoster = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { studentEmail: studentEmail });
  for (let j = 0; j < studentRoster.length; j++) {
    if (studentRoster[j].status !== 'removed' && teacherClassIds[String(studentRoster[j].classId)]) {
      return true;
    }
  }

  return false;
}

/**
 * Expand a raw profile row into a parsed object with JSON fields expanded.
 *
 * @param {Object} p - Raw profile row from sheet
 * @param {Object|null} rosterInfo - Optional roster info { name, email }
 * @returns {Object} Expanded profile
 */
function expandProfile_(p, rosterInfo) {
  return {
    profileId: p.profileId,
    studentEmail: p.studentEmail,
    studentId: p.studentId || '',
    studentName: rosterInfo ? rosterInfo.name : '',
    profileType: p.profileType,
    widaOverallLevel: parseInt(p.widaOverallLevel) || 0,
    widaDomains: safeJsonParse_(p.widaDomainsJson, { listening: 0, speaking: 0, reading: 0, writing: 0 }),
    accommodations: safeJsonParse_(p.accommodationsJson, {}),
    strategies: safeJsonParse_(p.supportStrategiesJson, []),
    homeLanguages: safeJsonParse_(p.homeLanguagesJson, []),
    notes: p.notes || '',
    isActive: String(p.isActive) === 'true',
    createdBy: p.createdBy || '',
    updatedBy: p.updatedBy || '',
    createdAt: p.createdAt || '',
    updatedAt: p.updatedAt || ''
  };
}
