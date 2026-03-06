// ============================================================================
// SUPPORT IMPORT SERVICE
// Imports IEP/WIDA student support data from a protected external spreadsheet.
// Teacher/admin only. Follows ScheduleImportService.gs pattern.
// ============================================================================

/**
 * Get current support data import configuration.
 * @returns {Object} { enabled, spreadsheetUrl, lastImported }
 */
function getSupportDataConfig() {
  requireRole(['administrator', 'teacher']);
  // URL = enabled: no separate toggle, URL presence determines enabled state
  var url = getConfigValue_('supportDataSpreadsheetUrl') || '';
  return {
    enabled: !!url,
    spreadsheetUrl: url,
    lastImported: getConfigValue_('supportDataLastImported') || ''
  };
}

/**
 * Save support data import configuration (enable/disable + URL).
 * @param {Object} config - { enabled, spreadsheetUrl }
 * @returns {Object} { success: true }
 */
function saveSupportDataConfig(config) {
  requireRole(['administrator', 'teacher']);
  if (!config) throw new Error('Config is required');

  // URL = enabled: only store URL, no separate enabled flag
  setConfigValues_({
    supportDataSpreadsheetUrl: config.spreadsheetUrl || ''
  });
  return { success: true };
}

/**
 * Test connection to the support data spreadsheet.
 * @returns {Object} { success, message, sheetNames }
 */
function testSupportDataConnection() {
  requireRole(['administrator', 'teacher']);
  const url = getConfigValue_('supportDataSpreadsheetUrl') || '';
  if (!url) throw new Error('Support Data spreadsheet URL not configured');

  const spreadsheetId = extractSpreadsheetId_(url);
  if (!spreadsheetId) throw new Error('Could not extract spreadsheet ID from URL');

  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheets = ss.getSheets().map(s => s.getName());

    return {
      success: true,
      message: 'Connected! Found ' + sheets.length + ' sheet(s).',
      sheetNames: sheets,
      hasProfilesTab: sheets.indexOf('Student Profiles') !== -1
    };
  } catch (e) {
    return {
      success: false,
      message: 'Cannot open spreadsheet: ' + e.message,
      sheetNames: []
    };
  }
}

/**
 * Initialize the external support spreadsheet with proper tabs and headers.
 * Creates "Student Profiles" and "Import Log" tabs if they don't exist.
 * @returns {Object} { success, message, created }
 */
function initializeSupportSpreadsheet() {
  requireRole(['administrator', 'teacher']);
  const url = getConfigValue_('supportDataSpreadsheetUrl') || '';
  if (!url) throw new Error('Support Data spreadsheet URL not configured');

  const spreadsheetId = extractSpreadsheetId_(url);
  if (!spreadsheetId) throw new Error('Could not extract spreadsheet ID from URL');

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const created = [];

  // --- Student Profiles tab ---
  const profileHeaders = [
    'studentId', 'studentEmail', 'profileType',
    'widaOverallLevel', 'widaListening', 'widaSpeaking', 'widaReading', 'widaWriting',
    'extendedTime', 'wordToWordDictionary', 'sentenceStarters',
    'reducedWorkload', 'preferentialSeating', 'readAloud',
    'scribe', 'visualSupports', 'simplifiedLanguage', 'translationSupport',
    'customAccommodations', 'notes'
  ];

  let profileSheet = ss.getSheetByName('Student Profiles');
  if (!profileSheet) {
    profileSheet = ss.insertSheet('Student Profiles');
    profileSheet.getRange(1, 1, 1, profileHeaders.length).setValues([profileHeaders]);
    profileSheet.getRange(1, 1, 1, profileHeaders.length)
      .setFontWeight('bold')
      .setBackground('#4a5568')
      .setFontColor('#ffffff');
    profileSheet.setFrozenRows(1);
    // Add data validation hints in row 2 as a guide
    profileSheet.getRange(2, 1).setNote('Student ID number');
    profileSheet.getRange(2, 2).setNote('Student email address');
    profileSheet.getRange(2, 3).setNote('IEP, 504, WIDA, EAL, or other');
    profileSheet.getRange(2, 4).setNote('1-6 (WIDA overall level)');
    profileSheet.getRange(2, 9).setNote('TRUE or FALSE');
    created.push('Student Profiles');
  }

  // --- Import Log tab ---
  const logHeaders = ['importedAt', 'importedBy', 'recordsImported', 'recordsUpdated', 'recordsSkipped'];
  let logSheet = ss.getSheetByName('Import Log');
  if (!logSheet) {
    logSheet = ss.insertSheet('Import Log');
    logSheet.getRange(1, 1, 1, logHeaders.length).setValues([logHeaders]);
    logSheet.getRange(1, 1, 1, logHeaders.length)
      .setFontWeight('bold')
      .setBackground('#4a5568')
      .setFontColor('#ffffff');
    logSheet.setFrozenRows(1);
    created.push('Import Log');
  }

  return {
    success: true,
    message: created.length > 0
      ? 'Created tab(s): ' + created.join(', ')
      : 'All tabs already exist. Ready for data.',
    created: created
  };
}

/**
 * Import support profiles from external spreadsheet into local StudentSupportProfiles sheet.
 * Upserts on studentId OR studentEmail match.
 * @returns {Object} { success, importedAt, imported, updated, skipped, errors }
 */
function importSupportProfiles() {
  requireRole(['administrator', 'teacher']);
  const url = getConfigValue_('supportDataSpreadsheetUrl') || '';
  if (!url) throw new Error('Support Data spreadsheet URL not configured');

  const spreadsheetId = extractSpreadsheetId_(url);
  if (!spreadsheetId) throw new Error('Could not extract spreadsheet ID from URL');

  const extSs = SpreadsheetApp.openById(spreadsheetId);
  const extData = readSheetAsObjects_(extSs, 'Student Profiles');

  if (extData.length === 0) {
    return { success: true, importedAt: now_(), imported: 0, updated: 0, skipped: 0, errors: [] };
  }

  const user = getCurrentUser();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const existing = readAll_(SHEETS_.STUDENT_SUPPORT_PROFILES);
    // Build lookup maps
    const byStudentId = {};
    const byEmail = {};
    for (let i = 0; i < existing.length; i++) {
      if (existing[i].studentId) byStudentId[String(existing[i].studentId)] = i;
      if (existing[i].studentEmail) byEmail[String(existing[i].studentEmail).toLowerCase()] = i;
    }

    let imported = 0, updated = 0, skipped = 0;
    const errors = [];

    for (let r = 0; r < extData.length; r++) {
      const row = extData[r];
      try {
        const studentId = String(row.studentId || '').trim();
        const studentEmail = String(row.studentEmail || '').toLowerCase().trim();

        if (!studentId && !studentEmail) {
          skipped++;
          continue;
        }

        // Build accommodations JSON from boolean columns
        const accommodations = {
          extendedTime: parseBool_(row.extendedTime),
          wordToWordDictionary: parseBool_(row.wordToWordDictionary),
          sentenceStarters: parseBool_(row.sentenceStarters),
          reducedWorkload: parseBool_(row.reducedWorkload),
          preferentialSeating: parseBool_(row.preferentialSeating),
          readAloud: parseBool_(row.readAloud),
          scribe: parseBool_(row.scribe),
          visualSupports: parseBool_(row.visualSupports),
          simplifiedLanguage: parseBool_(row.simplifiedLanguage),
          translationSupport: parseBool_(row.translationSupport),
          custom: row.customAccommodations
            ? String(row.customAccommodations).split(',').map(s => s.trim()).filter(Boolean)
            : []
        };

        // Build WIDA domains JSON
        const widaLevel = parseInt(row.widaOverallLevel) || 0;
        const widaDomains = {
          listening: parseInt(row.widaListening) || 0,
          speaking: parseInt(row.widaSpeaking) || 0,
          reading: parseInt(row.widaReading) || 0,
          writing: parseInt(row.widaWriting) || 0
        };

        // Auto-generate support strategies from WIDA level
        const strategies = widaLevel > 0
          ? getWidaPresetStrategies(widaLevel).map(s => ({ strategy: s, source: 'wida', active: true }))
          : [];

        const profileType = String(row.profileType || 'other').trim();
        const now = now_();

        // Find existing by studentId first, then by email
        let existingIdx = -1;
        if (studentId && byStudentId.hasOwnProperty(studentId)) {
          existingIdx = byStudentId[studentId];
        } else if (studentEmail && byEmail.hasOwnProperty(studentEmail)) {
          existingIdx = byEmail[studentEmail];
        }

        if (existingIdx >= 0) {
          // Update existing — preserve teacher-edited strategies
          const existingProfile = existing[existingIdx];
          const existingStrategies = safeJsonParse_(existingProfile.supportStrategiesJson, []);
          // Keep teacher-added strategies, update wida-sourced ones
          const teacherStrategies = existingStrategies.filter(s => s.source === 'teacher');
          const mergedStrategies = strategies.concat(teacherStrategies);

          existingProfile.studentEmail = studentEmail || existingProfile.studentEmail;
          existingProfile.studentId = studentId || existingProfile.studentId;
          existingProfile.profileType = profileType;
          existingProfile.widaOverallLevel = widaLevel || '';
          existingProfile.widaDomainsJson = safeJsonStringify_(widaDomains, '{}');
          existingProfile.accommodationsJson = safeJsonStringify_(accommodations, '{}');
          existingProfile.supportStrategiesJson = safeJsonStringify_(mergedStrategies, '[]');
          existingProfile.notes = row.notes || existingProfile.notes;
          existingProfile.isActive = 'true';
          existingProfile.updatedBy = user.email;
          existingProfile.updatedAt = now;
          updated++;
        } else {
          // New profile
          existing.push({
            profileId: generateProfileId_(),
            studentEmail: studentEmail,
            studentId: studentId,
            profileType: profileType,
            widaOverallLevel: widaLevel || '',
            widaDomainsJson: safeJsonStringify_(widaDomains, '{}'),
            accommodationsJson: safeJsonStringify_(accommodations, '{}'),
            supportStrategiesJson: safeJsonStringify_(strategies, '[]'),
            notes: row.notes || '',
            isActive: 'true',
            createdBy: user.email,
            updatedBy: user.email,
            createdAt: now,
            updatedAt: now
          });
          imported++;
        }
      } catch (e) {
        errors.push('Row ' + (r + 2) + ': ' + e.message);
      }
    }

    // Write back
    if (imported > 0 || updated > 0) {
      writeAll_(SHEETS_.STUDENT_SUPPORT_PROFILES, existing);
    }

    // Write import log to external spreadsheet
    try {
      const logSheet = extSs.getSheetByName('Import Log');
      if (logSheet) {
        logSheet.appendRow([now_(), user.email, imported, updated, skipped]);
      }
    } catch (e) {
      Logger.log('Could not write import log: ' + e.message);
    }

    setConfigValues_({ supportDataLastImported: now_() });

    return {
      success: true,
      importedAt: now_(),
      imported: imported,
      updated: updated,
      skipped: skipped,
      errors: errors
    };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// WIDA PRESET STRATEGIES
// ============================================================================

/**
 * Get suggested support strategies for a WIDA proficiency level.
 * Returns an array of strategy description strings.
 * These are used as defaults when creating/importing profiles — teachers can then edit per student.
 *
 * @param {number} level - WIDA proficiency level (1-6)
 * @returns {Array<string>} Strategy descriptions
 */
function getWidaPresetStrategies(level) {
  const strategies = {
    1: [
      'Native language support and resources',
      'Picture dictionaries and labeled visuals',
      'Total Physical Response (TPR) activities',
      'Gestures and visual cues for instructions',
      'Labeled classroom visuals and word walls',
      'Pre-taught key vocabulary with images'
    ],
    2: [
      'Word-to-word bilingual dictionaries',
      'Sentence frames for speaking and writing',
      'Visual supports and graphic organizers',
      'Word banks for key vocabulary',
      'Simplified written instructions',
      'Extended wait time for responses'
    ],
    3: [
      'Sentence starters for academic writing',
      'Graphic organizers for reading comprehension',
      'Pre-teach vocabulary before reading tasks',
      'Simplified or adapted text versions',
      'Bilingual glossary for content terms',
      'Structured note-taking templates'
    ],
    4: [
      'Extended academic glossary',
      'Text annotation and highlighting tools',
      'Discussion scaffolds and talk protocols',
      'Academic vocabulary lists by topic',
      'Complex sentence construction models',
      'Peer study partnerships'
    ],
    5: [
      'Academic vocabulary support for nuanced terms',
      'Text complexity scaffolds for grade-level texts',
      'Peer collaboration and discussion prompts',
      'Writing process checklists',
      'Self-monitoring comprehension strategies'
    ],
    6: [
      'Independent learning strategies',
      'Peer mentoring opportunities',
      'Advanced academic vocabulary extension',
      'Self-directed research protocols'
    ]
  };

  return strategies[level] || [];
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Parse a boolean-ish value from spreadsheet import.
 * Accepts: TRUE, true, yes, 1, x — all resolve to true.
 * @param {any} val
 * @returns {boolean}
 */
function parseBool_(val) {
  if (!val) return false;
  var s = String(val).toLowerCase().trim();
  return s === 'true' || s === 'yes' || s === '1' || s === 'x';
}
