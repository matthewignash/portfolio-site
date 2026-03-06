/**
 * Code.gs - Learning Map System Backend
 * Version: 3E - Enhanced Setup Wizard
 *
 * SCHEMA VERSION: 3
 *
 * CHANGES IN 3E:
 * - Added Standards and HexStandards to SCHEMA_TABS (11 total sheets)
 * - Enhanced setupDatabase() with detailed result tracking
 * - Added Config key migration (snake_case -> camelCase)
 * - Added default Config values population
 * - Setup is now fully idempotent
 */
// ============================================
// CONFIGURATION
// ============================================
var SCHEMA_VERSION = 3;
// IMPORTANT: These schemas match your ACTUAL spreadsheet column order
var SCHEMA_TABS = {
Config: ['key', 'value', 'description', 'updatedAt', 'updatedBy'],
Maps: ['mapId', 'title', 'courseId', 'unitId', 'gridRows', 'gridCols', 'hexesJson', 'edgesJson', 'ubdDataJson', 'metaJson', 'teacherEmail', 'createdAt', 'updatedAt'],
Progress: ['email', 'mapId', 'hexId', 'status', 'score', 'maxScore', 'teacherApproved', 'completedAt', 'progressId', 'updatedAt', 'selfAssessRating', 'selfAssessNote', 'selfAssessGoal', 'selfAssessEvidenceJson', 'strategiesUsedJson', 'reflectionNote'],
Users: ['email', 'name', 'role', 'active', 'displayName', 'createdAt', 'lastLogin'],
Classes: ['classId', 'className', 'teacherEmail', 'subject', 'year', 'status', 'createdAt', 'updatedAt', 'courseName', 'sectionId'],
ClassRoster: ['classId', 'studentEmail', 'studentName', 'addedAt', 'status', 'studentId'],
Courses: ['courseId', 'title', 'programTrack', 'gradeLevel', 'ownerTeacherEmail', 'year', 'gradingSystemJson', 'active', 'standardFramework', 'standardSubject'],
Units: ['unitId', 'courseId', 'title', 'sequence', 'mapId', 'status', 'active', 'designFrameworkJson', 'vocabularyJson'],
Lessons: ['lessonId', 'unitId', 'title', 'sequence', 'objectives', 'hexIds', 'standardIds', 'duration', 'materials', 'status', 'lessonDataJson', 'createdAt', 'updatedAt'],
Edges: ['edgeId', 'mapId', 'fromHexId', 'toHexId', 'type', 'conditionJson', 'color', 'label', 'thickness', 'active'],
// Added in v3E
Standards: ['standardId', 'framework', 'code', 'description', 'gradeLevel', 'subject', 'strand', 'active'],
HexStandards: ['hexId', 'mapId', 'standardId', 'alignmentNotes', 'addedAt'],
Notifications: ['notificationId', 'recipientEmail', 'type', 'title', 'message', 'sourceEmail', 'mapId', 'hexId', 'createdAt', 'readAt', 'status'],
FormativeChecks: ['checkId', 'mapId', 'hexId', 'classId', 'teacherEmail', 'checkDate', 'strategyType', 'topic', 'notes', 'studentResultsJson', 'createdAt', 'updatedAt'],
AssessmentResponses: ['responseId', 'mapId', 'hexId', 'studentEmail', 'attemptNumber', 'totalScore', 'maxScore', 'scorePct', 'passed', 'responsesJson', 'submittedAt'],
MapAssignments: ['assignmentId', 'mapId', 'classId', 'dueDate', 'assignedBy', 'assignedAt'],
StudentTaskOrder: ['email', 'mapId', 'hexId', 'sortOrder', 'updatedAt'],
StudentSupportProfiles: ['profileId', 'studentEmail', 'studentId', 'profileType', 'widaOverallLevel', 'widaDomainsJson', 'accommodationsJson', 'supportStrategiesJson', 'notes', 'isActive', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt', 'homeLanguagesJson'],
StudentATLProgress: ['atlProgressId', 'studentEmail', 'atlCategory', 'atlSubSkill', 'rating', 'reflectionNote', 'goalNote', 'updatedAt', 'term'],
StudentAchievements: ['achievementId', 'studentEmail', 'achievementType', 'achievementKey', 'earnedAt', 'metadata', 'mapId', 'acknowledged'],
IterationHistory: ['iterationId', 'mapId', 'hexId', 'studentEmail', 'iterationNumber', 'status', 'score', 'maxScore', 'evidenceJson', 'reflectionNote', 'teacherFeedback', 'teacherFeedbackAt', 'submittedAt', 'reviewedAt', 'reviewedBy'],
PeerFeedback: ['feedbackId', 'mapId', 'hexId', 'reviewerEmail', 'authorEmail', 'iterationNumber', 'ratingsJson', 'comment', 'isAnonymous', 'createdAt', 'isHelpful'],
UserPreferences: ['email', 'preferencesJson', 'updatedAt'],
StudentPortfolio: ['portfolioId', 'studentEmail', 'mapId', 'hexId', 'selectedAt', 'portfolioNote', 'displayOrder', 'isHighlight', 'updatedAt'],
StudentNotes: ['noteId', 'studentEmail', 'mapId', 'hexId', 'cuesJson', 'notesContent', 'summaryContent', 'distilledContent', 'boldIndicesJson', 'highlightIndicesJson', 'tagsJson', 'isStarred', 'lastLayerApplied', 'wordCount', 'createdAt', 'updatedAt'],
StudentTasks: ['taskId', 'studentEmail', 'title', 'isCompleted', 'sortOrder', 'dueDate', 'createdAt', 'updatedAt'],
TeacherReminders: ['reminderId', 'teacherEmail', 'title', 'isCompleted', 'sortOrder', 'relatedMapId', 'relatedStudentEmail', 'dueDate', 'createdAt', 'updatedAt'],
TeacherFeedbackTemplates: ['templateId', 'teacherEmail', 'templateText', 'category', 'mapId', 'createdAt'],
DifferentiationGroups: ['groupId', 'classId', 'mapId', 'groupName', 'groupColor', 'groupDescription', 'isDefault', 'createdBy', 'createdAt', 'updatedAt'],
GroupMemberships: ['membershipId', 'groupId', 'studentEmail', 'addedBy', 'addedAt'],
HexAssignments: ['assignmentId', 'mapId', 'hexId', 'groupId', 'studentEmail', 'isRequired', 'addedBy', 'addedAt'],
StudentChoices: ['choiceId', 'studentEmail', 'mapId', 'hexId', 'branchId', 'chosenAt'],
TimerSessions: ['sessionId', 'teacherEmail', 'classId', 'mapId', 'totalMs', 'remainingMs', 'state', 'stationConfigJson', 'label', 'messagesJson', 'pomodoroConfigJson', 'startedAt', 'updatedAt'],
NameSelectorState: ['stateId', 'teacherEmail', 'classId', 'absentEmailsJson', 'updatedAt'],
NameSelectorPicks: ['pickId', 'teacherEmail', 'classId', 'studentEmail', 'studentName', 'pickedAt'],
NameSelectorGroups: ['groupSetId', 'teacherEmail', 'classId', 'groupSetName', 'groupMode', 'groupNumber', 'groupsJson', 'createdAt', 'updatedAt'],
QuickPolls: ['pollId', 'classId', 'mapId', 'hexId', 'teacherEmail', 'pollText', 'pollType', 'optionsJson', 'correctOptionIndex', 'showResults', 'anonymousResults', 'status', 'respondentCount', 'createdAt', 'closedAt', 'updatedAt'],
QuickPollResponses: ['responseId', 'pollId', 'studentEmail', 'selectedOptionIndex', 'responseText', 'submittedAt'],
WhiteboardData: ['whiteboardId', 'mapId', 'hexId', 'studentEmail', 'imageFileId', 'imageFileUrl', 'thumbnailDataUrl', 'folderId', 'status', 'createdAt', 'updatedAt'],
ProcessJournal: ['journalId', 'studentEmail', 'mapId', 'hexId', 'entryType', 'content', 'promptId', 'metadataJson', 'createdAt', 'updatedAt']
};
// Config key migration map: snake_case -> camelCase
var CONFIG_MIGRATION = {
'schema_version': 'schemaVersion',
'owner_email': 'ownerEmail',
'created_at': 'createdAt',
'app_version': 'appVersion',
'grid_rows': 'gridRows',
'grid_cols': 'gridCols'
};
// Default Config values (only added if key doesn't exist)
var DEFAULT_CONFIG = [
  { key: 'schemaVersion', value: 'v3E', description: 'Database schema version' },
  { key: 'appName', value: 'Learning Map System', description: 'Application display name' },
  { key: 'ownerEmail', value: '', description: 'Primary owner email' },
  { key: 'createdAt', value: '', description: 'When database was created' },
  { key: 'appVersion', value: '1.0.0', description: 'Application version' },
  { key: 'gridRows', value: '10', description: 'Default grid rows' },
  { key: 'gridCols', value: '10', description: 'Default grid columns' },
  { key: 'defaultRole', value: 'student', description: 'Default role for new users' },
  { key: 'allowSelfRegistration', value: 'false', description: 'Allow users to self-register' },
  { key: 'requireTeacherApproval', value: 'true', description: 'Require teacher approval for progress' },
  { key: 'maxHexesPerMap', value: '100', description: 'Maximum hexes allowed per map' },
  { key: 'enableBranching', value: 'true', description: 'Enable conditional branching' },
  { key: 'debugMode', value: 'false', description: 'Enable debug logging' },
  { key: 'setupCompletedAt', value: '', description: 'Timestamp when setup wizard last ran' },
  { key: 'setupBy', value: '', description: 'Email of user who ran setup' },
  { key: 'enableGuidedTour', value: 'true', description: 'Show onboarding tour for new users' }
];
// Dropdown options for consistency
var SUBJECT_OPTIONS = [
'English Language Arts',
'Mathematics',
'Science',
'Social Studies',
'World Languages',
'Physical Education',
'Health',
'Art',
'Music',
'Technology',
'Computer Science',
'Business',
'Other'
];
var ROLE_OPTIONS = ['Administrator', 'Teacher', 'Student'];
// Generate academic years
function getAcademicYearOptions() {
var currentYear = new Date().getFullYear();
var years = [];
for (var i = -1; i <= 2; i++) {
var startYear = currentYear + i;
years.push(startYear + '-' + (startYear + 1));
  }
return years;
}
// ============================================
// WEB APP ENTRY POINTS
// ============================================
function doGet(e) {
var page = e && e.parameter && e.parameter.page ? e.parameter.page : 'index';
if (page === 'index') {
return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Learning Map System')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
return HtmlService.createHtmlOutput('Page not found');
}
/**
 * Include HTML partial files (CSS, JS) in templates.
 * Usage in .html files: <?!= include('Styles') ?>
 *
 * @param {string} filename - Name of the HTML file (without .html extension)
 * @returns {string} File content as HTML string
 */
function include(filename) {
return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
// ============================================
// SETUP WIZARD (Enhanced in v3E)
// ============================================
/**
 * Setup Wizard - Creates all required sheets and initial data
 * Safe to run multiple times (idempotent)
 * Also migrates legacy snake_case Config keys to camelCase
 *
 * @returns {Object} { success, created, skipped, migrated, warnings, errors }
 */
function setupDatabase() {
var result = {
success: true,
created: [],
skipped: [],
migrated: [],
warnings: [],
errors: []
  };
var lock = LockService.getScriptLock();
try {
lock.waitLock(30000);
var ss = SpreadsheetApp.getActiveSpreadsheet();
var currentUser = Session.getActiveUser().getEmail();
var now = new Date().toISOString();
Logger.log('=== SETUP DATABASE v3E ===');
Logger.log('Started by: ' + currentUser);
// 1. Check for unknown sheets (warning only)
checkUnknownSheets_(ss, result);
// 2. Create/verify all sheets from SCHEMA_TABS
createAllSheets_(ss, result);
// 3. Migrate legacy Config keys (snake_case -> camelCase)
migrateConfigKeys_(ss, result);
// 4. Populate Config defaults (skip existing keys)
populateConfigDefaults_(ss, result, currentUser, now);
// 5. Ensure first user is admin (only if Users is empty)
ensureAdminUser_(ss, result, currentUser, now);
// 6. Mark setup timestamp
setConfigValue('setupCompletedAt', now);
setConfigValue('setupBy', currentUser);
Logger.log('Setup completed successfully');
  } catch (e) {
result.success = false;
result.errors.push('Setup failed: ' + e.message);
Logger.log('Setup error: ' + e.message);
Logger.log('Stack: ' + e.stack);
  } finally {
lock.releaseLock();
  }
Logger.log('Setup result: ' + JSON.stringify(result, null, 2));
return result;
}
/**
 * Helper: Check for unknown sheets and log warnings
 */
function checkUnknownSheets_(ss, result) {
var allSheets = ss.getSheets();
var knownSheetNames = Object.keys(SCHEMA_TABS);
for (var i = 0; i < allSheets.length; i++) {
var sheetName = allSheets[i].getName();
if (knownSheetNames.indexOf(sheetName) === -1) {
var warning = 'Unknown sheet found: "' + sheetName + '" (not in SCHEMA_TABS, left untouched)';
result.warnings.push(warning);
Logger.log('WARNING: ' + warning);
    }
  }
}
/**
 * Helper: Create all sheets from SCHEMA_TABS
 */
function createAllSheets_(ss, result) {
for (var tabName in SCHEMA_TABS) {
var headers = SCHEMA_TABS[tabName];
var sheet = ss.getSheetByName(tabName);
if (!sheet) {
// Create new sheet
sheet = ss.insertSheet(tabName);
sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
formatHeaderRow(sheet, headers.length);
result.created.push(tabName);
Logger.log('Created sheet: ' + tabName);
    } else {
// Verify/add missing columns
var existingHeaders = [];
if (sheet.getLastColumn() > 0) {
existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      }
var missingHeaders = [];
for (var i = 0; i < headers.length; i++) {
if (existingHeaders.indexOf(headers[i]) === -1) {
missingHeaders.push(headers[i]);
        }
      }
if (missingHeaders.length > 0) {
var startCol = sheet.getLastColumn() + 1;
sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
result.created.push(tabName + ' (added columns: ' + missingHeaders.join(', ') + ')');
Logger.log('Added columns to ' + tabName + ': ' + missingHeaders.join(', '));
      } else {
result.skipped.push(tabName);
Logger.log('Skipped sheet (already exists): ' + tabName);
      }
formatHeaderRow(sheet, sheet.getLastColumn());
    }
  }
}
/**
 * Helper: Migrate snake_case Config keys to camelCase
 */
function migrateConfigKeys_(ss, result) {
var configSheet = ss.getSheetByName('Config');
if (!configSheet || configSheet.getLastRow() < 2) {
Logger.log('Config sheet empty or missing, skipping migration');
return;
  }
var data = configSheet.getDataRange().getValues();
var headers = data[0];
var keyCol = headers.indexOf('key');
var valueCol = headers.indexOf('value');
if (keyCol === -1 || valueCol === -1) {
Logger.log('Config sheet missing key/value columns, skipping migration');
return;
  }
// Build map of existing keys and their row indices
var existingKeys = {};
for (var i = 1; i < data.length; i++) {
var key = data[i][keyCol];
if (key) {
existingKeys[key] = i + 1; // 1-indexed row number
    }
  }
// Collect rows to delete after migration (process backwards to avoid index shifting)
var rowsToDelete = [];
for (var oldKey in CONFIG_MIGRATION) {
var newKey = CONFIG_MIGRATION[oldKey];
// Check if old key exists
if (existingKeys[oldKey]) {
var oldRowIndex = existingKeys[oldKey];
var oldValue = data[oldRowIndex - 1][valueCol];
// Only migrate if new key doesn't already exist
if (!existingKeys[newKey]) {
// Add new camelCase key with migrated value
if (oldValue !== '' && oldValue !== null) {
var now = new Date().toISOString();
var user = Session.getActiveUser().getEmail();
configSheet.appendRow([newKey, oldValue, 'Migrated from ' + oldKey, now, user]);
result.migrated.push(oldKey + ' -> ' + newKey + ' (value: ' + oldValue + ')');
Logger.log('Migrated: ' + oldKey + ' -> ' + newKey);
        }
      } else {
Logger.log('Skipped migration: ' + newKey + ' already exists');
      }
// Mark old row for deletion
rowsToDelete.push(oldRowIndex);
    }
  }
// Delete old snake_case rows (from bottom to top to preserve indices)
rowsToDelete.sort(function(a, b) { return b - a; });
for (var j = 0; j < rowsToDelete.length; j++) {
configSheet.deleteRow(rowsToDelete[j]);
Logger.log('Deleted legacy config row: ' + rowsToDelete[j]);
  }
}
/**
 * Helper: Populate Config with default values (skip existing keys)
 */
function populateConfigDefaults_(ss, result, currentUser, now) {
var configSheet = ss.getSheetByName('Config');
if (!configSheet) {
result.errors.push('Config sheet not found after creation');
return;
  }
// Get existing keys
var existingKeys = {};
if (configSheet.getLastRow() > 1) {
var data = configSheet.getDataRange().getValues();
var headers = data[0];
var keyCol = headers.indexOf('key');
for (var i = 1; i < data.length; i++) {
var key = data[i][keyCol];
if (key) {
existingKeys[key] = true;
      }
    }
  }
// Add missing defaults
var addedDefaults = [];
for (var j = 0; j < DEFAULT_CONFIG.length; j++) {
var config = DEFAULT_CONFIG[j];
if (!existingKeys[config.key]) {
var value = config.value;
// Special handling for dynamic defaults
if (config.key === 'ownerEmail' && !value) {
value = currentUser;
      }
if (config.key === 'createdAt' && !value) {
value = now;
      }
configSheet.appendRow([config.key, value, config.description, now, currentUser]);
addedDefaults.push(config.key);
    }
  }
if (addedDefaults.length > 0) {
result.created.push('Config defaults: ' + addedDefaults.join(', '));
Logger.log('Added config defaults: ' + addedDefaults.join(', '));
  } else {
Logger.log('All config defaults already exist');
  }
}
/**
 * Helper: Ensure first user is administrator (only if Users sheet is empty)
 */
function ensureAdminUser_(ss, result, currentUser, now) {
if (!currentUser) {
result.warnings.push('Cannot create admin user: no email from Session');
Logger.log('WARNING: No email from Session, skipping admin user creation');
return;
  }
var usersSheet = ss.getSheetByName('Users');
if (!usersSheet) {
result.errors.push('Users sheet not found after creation');
return;
  }
// Check if Users sheet has any data rows
if (usersSheet.getLastRow() > 1) {
Logger.log('Users sheet already has data, skipping admin creation');
result.skipped.push('Admin user (Users sheet not empty)');
return;
  }
// Add current user as administrator
// Schema: email, name, role, active, displayName, createdAt, lastLogin
usersSheet.appendRow([currentUser, currentUser, 'Administrator', true, currentUser, now, now]);
result.created.push('Admin user: ' + currentUser);
Logger.log('Created admin user: ' + currentUser);
}
/**
 * Legacy function - kept for backward compatibility
 * Use setupDatabase() instead
 */
function ensureTab(ss, tabName, headers) {
var sheet = ss.getSheetByName(tabName);
if (!sheet) {
sheet = ss.insertSheet(tabName);
sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
formatHeaderRow(sheet, headers.length);
Logger.log('Created tab: ' + tabName);
  } else {
var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
var newHeaders = [];
for (var i = 0; i < headers.length; i++) {
if (existingHeaders.indexOf(headers[i]) === -1) {
newHeaders.push(headers[i]);
      }
    }
if (newHeaders.length > 0) {
var startCol = sheet.getLastColumn() + 1;
sheet.getRange(1, startCol, 1, newHeaders.length).setValues([newHeaders]);
Logger.log('Added columns to ' + tabName + ': ' + newHeaders.join(', '));
    }
formatHeaderRow(sheet, sheet.getLastColumn());
Logger.log('Verified tab: ' + tabName);
  }
return sheet;
}
function formatHeaderRow(sheet, numCols) {
if (numCols < 1) return;
var headerRange = sheet.getRange(1, 1, 1, numCols);
headerRange.setFontWeight('bold');
headerRange.setBackground('#e2e8f0');
sheet.setFrozenRows(1);
}
function getSchemaStatus() {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var configSheet = ss.getSheetByName('Config');
if (!configSheet) {
return { configured: false, needsSetup: true };
  }
var currentVersion = getConfigValue('schemaVersion');
if (!currentVersion) {
return { configured: false, needsSetup: true };
  }
var version = parseInt(currentVersion.replace(/\D/g, '')) || 0;
if (version < SCHEMA_VERSION) {
return { configured: true, needsMigration: true, currentVersion: currentVersion, targetVersion: 'v' + SCHEMA_VERSION };
  }
// Check how many sheets exist
var existingSheets = [];
var missingSheets = [];
for (var tabName in SCHEMA_TABS) {
if (ss.getSheetByName(tabName)) {
existingSheets.push(tabName);
    } else {
missingSheets.push(tabName);
    }
  }
return {
configured: true,
schemaVersion: currentVersion,
sheetsExist: existingSheets.length,
sheetsTotal: Object.keys(SCHEMA_TABS).length,
missingSheets: missingSheets
  };
}
// ============================================
// CONFIG TAB HELPERS
// ============================================
function getConfigValue(key) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('Config');
if (!sheet) return null;
var data = sheet.getDataRange().getValues();
for (var i = 1; i < data.length; i++) {
if (data[i][0] === key) {
return data[i][1];
    }
  }
return null;
}
function setConfigValue(key, value) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('Config');
if (!sheet) return;
var data = sheet.getDataRange().getValues();
var headers = data[0];
var rowIndex = -1;
for (var i = 1; i < data.length; i++) {
if (data[i][0] === key) {
rowIndex = i + 1;
break;
    }
  }
var now = new Date().toISOString();
var user = Session.getActiveUser().getEmail();
// Config schema: key, value, description, updatedAt, updatedBy
if (rowIndex > 0) {
sheet.getRange(rowIndex, 2).setValue(value);
sheet.getRange(rowIndex, 4).setValue(now);
sheet.getRange(rowIndex, 5).setValue(user);
  } else {
sheet.appendRow([key, value, '', now, user]);
  }
}
// ============================================
// ADMIN SETTINGS DASHBOARD
// ============================================
function getAdminSettings() {
  requireRole('administrator');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Config');
  if (!sheet || sheet.getLastRow() < 2) return {};
  var data = sheet.getDataRange().getValues();
  var result = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      result[String(data[i][0])] = String(data[i][1]);
    }
  }
  return result;
}
function saveAdminSettings(updates) {
  requireRole('administrator');
  var EDITABLE_KEYS = [
    'appName', 'ownerEmail', 'defaultRole',
    'gridRows', 'gridCols', 'maxHexesPerMap',
    'enableBranching', 'requireTeacherApproval',
    'allowSelfRegistration', 'debugMode',
    'enableGuidedTour'
  ];
  var updated = [];
  for (var key in updates) {
    if (updates.hasOwnProperty(key)) {
      if (EDITABLE_KEYS.indexOf(key) === -1) {
        throw new Error('Cannot modify read-only setting: ' + key);
      }
      if (key === 'gridRows' || key === 'gridCols') {
        var gridNum = parseInt(updates[key]);
        if (isNaN(gridNum) || gridNum < 4 || gridNum > 50) {
          throw new Error(key + ' must be between 4 and 50');
        }
      }
      if (key === 'maxHexesPerMap') {
        var hexNum = parseInt(updates[key]);
        if (isNaN(hexNum) || hexNum < 10 || hexNum > 500) {
          throw new Error('maxHexesPerMap must be between 10 and 500');
        }
      }
      if (key === 'defaultRole') {
        var validRoles = ['student', 'teacher', 'administrator'];
        if (validRoles.indexOf(updates[key].toLowerCase()) === -1) {
          throw new Error('Invalid default role: ' + updates[key]);
        }
      }
      setConfigValue(key, String(updates[key]));
      updated.push(key);
    }
  }
  return { success: true, updated: updated };
}
function getFormOptions() {
return {
subjects: SUBJECT_OPTIONS,
years: getAcademicYearOptions(),
roles: ROLE_OPTIONS
  };
}
/**
 * Get public-facing config values for frontend enforcement.
 * No role restriction — all users need these values.
 * Only exposes 3 specific keys, not the full config.
 *
 * @returns {Object} {requireTeacherApproval: boolean, enableBranching: boolean, maxHexesPerMap: number}
 */
function getPublicConfig() {
  return {
    requireTeacherApproval: getConfigValue('requireTeacherApproval') !== 'false',
    enableBranching: getConfigValue('enableBranching') !== 'false',
    maxHexesPerMap: parseInt(getConfigValue('maxHexesPerMap')) || 100,
    enableGuidedTour: getConfigValue('enableGuidedTour') !== 'false'
  };
}
/**
 * Batch initial data endpoint — combines multiple RPCs into one.
 * Reduces page-load RPC burst from ~8-14 calls to 1.
 * All users call this on page load instead of individual data functions.
 *
 * @returns {Object} { user, formOptions, maps, classes, config, courses?, standards? }
 */
function getInitialData() {
  const user = getCurrentUser();
  const result = {
    user: user,
    formOptions: getFormOptions(),
    maps: getMaps(),
    classes: getClasses(),
    config: getPublicConfig(),
    tourStatus: getTourStatus()
  };
  // Teacher/admin-only data
  if (user.canEdit) {
    result.courses = getCourses();
    result.standards = getStandards();
  }
  return result;
}
/**
 * Batch endpoint for student page load.
 * Reads expensive sheets ONCE (Progress, Maps, MapAssignments, StudentAchievements)
 * and computes dashboard + planner + celebration data in a single call.
 * Replaces 3 separate RPCs to save 2-4 seconds on student load.
 *
 * @returns {Object} { dashboard, planner, celebrations }
 */
function getStudentBatchData() {
  var user = getCurrentUser();
  var email = user.email.toLowerCase();

  // Shared expensive reads — done ONCE instead of 3x
  var allProgress = readAll_(SHEETS_.PROGRESS);
  var allMaps = readAll_(SHEETS_.MAPS);
  var allAssignments = readAll_(SHEETS_.MAP_ASSIGNMENTS);
  var allAchievements = readAll_(SHEETS_.STUDENT_ACHIEVEMENTS);

  // Portfolio-specific reads (piggyback on existing batch)
  var allPortfolio = readAll_(SHEETS_.STUDENT_PORTFOLIO);
  var allHexStandards = readAll_(SHEETS_.HEX_STANDARDS);
  var allStandards = readAll_(SHEETS_.STANDARDS);

  // Student-specific filtered reads (cheap)
  var studentRoster = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { studentEmail: email });
  // Backward compat: try email column too
  if (studentRoster.length === 0) {
    studentRoster = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { email: email });
  }
  var studentTaskOrder = findRowsFiltered_(SHEETS_.STUDENT_TASK_ORDER, { email: email });

  return {
    dashboard: computeStudentDashboard_(email, allProgress, allMaps),
    planner: computeStudentPlanner_(email, allProgress, allMaps, allAssignments, studentRoster, studentTaskOrder),
    celebrations: computeStudentCelebrations_(email, allProgress, allAchievements),
    portfolio: computeStudentPortfolio_(email, allProgress, allMaps, allPortfolio, allAchievements, allHexStandards, allStandards),
    unitChecklists: computeStudentUnitChecklists_(email, allProgress, allMaps)
  };
}

/**
 * Batch endpoint for teacher preview of a specific student.
 * Same data as getStudentBatchData but takes an explicit studentEmail param.
 * Validates that the requesting teacher has access to the student's class.
 *
 * @param {string} studentEmail - The student email to preview
 * @returns {Object} { dashboard, planner, celebrations, unitChecklists }
 */
function getStudentBatchDataForPreview(studentEmail) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  const email = (studentEmail || '').toLowerCase().trim();
  if (!email) throw new Error('Student email is required');

  // Non-admin teachers: verify student is in one of their classes
  if (user.normalizedRole !== 'administrator' && !canTeacherViewStudent_(user.email, email)) {
    throw new Error('Student not found in your classes');
  }

  // Shared expensive reads — done ONCE
  const allProgress = readAll_(SHEETS_.PROGRESS);
  const allMaps = readAll_(SHEETS_.MAPS);
  const allAssignments = readAll_(SHEETS_.MAP_ASSIGNMENTS);
  const allAchievements = readAll_(SHEETS_.STUDENT_ACHIEVEMENTS);

  // Student-specific filtered reads
  let studentRoster = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { studentEmail: email });
  if (studentRoster.length === 0) {
    studentRoster = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { email: email });
  }
  const studentTaskOrder = findRowsFiltered_(SHEETS_.STUDENT_TASK_ORDER, { email: email });

  return {
    dashboard: computeStudentDashboard_(email, allProgress, allMaps),
    planner: computeStudentPlanner_(email, allProgress, allMaps, allAssignments, studentRoster, studentTaskOrder),
    celebrations: computeStudentCelebrations_(email, allProgress, allAchievements),
    unitChecklists: computeStudentUnitChecklists_(email, allProgress, allMaps)
  };
}

/**
 * Compute unit checklists for a student from pre-read sheet data.
 * Returns array of unit objects with lesson-level progress.
 */
function computeStudentUnitChecklists_(email, allProgress, allMaps) {
  let allUnits, allLessons;
  try {
    allUnits = readAll_(SHEETS_.UNITS);
    allLessons = readAll_(SHEETS_.LESSONS);
  } catch (e) {
    return []; // Units/Lessons sheets may not exist
  }
  if (!allUnits || allUnits.length === 0) return [];

  // Build student progress lookup: mapId -> { hexId -> row }
  const progressByMap = {};
  for (let i = 0; i < allProgress.length; i++) {
    const row = allProgress[i];
    if (String(row.email || '').toLowerCase() !== email) continue;
    const mid = String(row.mapId || '');
    if (!progressByMap[mid]) progressByMap[mid] = {};
    progressByMap[mid][String(row.hexId || '')] = row;
  }

  // Build map lookup: mapId -> map object
  const mapById = {};
  for (let i = 0; i < allMaps.length; i++) {
    mapById[String(allMaps[i].mapId || '')] = allMaps[i];
  }

  // Build lessons by unitId
  const lessonsByUnit = {};
  for (let i = 0; i < allLessons.length; i++) {
    const l = allLessons[i];
    const uid = String(l.unitId || '');
    if (!lessonsByUnit[uid]) lessonsByUnit[uid] = [];
    let hexIds = [];
    try { hexIds = l.hexIds ? JSON.parse(l.hexIds) : []; } catch (e) { /* skip */ }
    lessonsByUnit[uid].push({
      title: l.title || '',
      sequence: parseInt(l.sequence) || 0,
      hexIds: hexIds
    });
  }

  const result = [];
  for (let u = 0; u < allUnits.length; u++) {
    const unit = allUnits[u];
    const unitMapId = String(unit.mapId || '');
    if (!unitMapId || !progressByMap[unitMapId]) continue; // Student has no progress on this map

    const unitLessons = lessonsByUnit[String(unit.unitId || '')] || [];
    if (unitLessons.length === 0) continue;

    const map = mapById[unitMapId];
    let hexes = [];
    try {
      hexes = map && map.hexesJson ? JSON.parse(map.hexesJson) : (map && map.hexes ? map.hexes : []);
    } catch (e) { /* skip */ }
    const hexById = {};
    for (let h = 0; h < hexes.length; h++) {
      hexById[String(hexes[h].id || '')] = hexes[h];
    }

    const studentProgress = progressByMap[unitMapId] || {};
    let total = 0, completed = 0;
    const lessons = [];

    // Sort lessons by sequence
    unitLessons.sort((a, b) => a.sequence - b.sequence);

    for (let li = 0; li < unitLessons.length; li++) {
      const lesson = unitLessons[li];
      const lessonHexes = [];
      for (let hi = 0; hi < lesson.hexIds.length; hi++) {
        const hid = String(lesson.hexIds[hi]);
        const hex = hexById[hid];
        if (!hex) continue;
        const prog = studentProgress[hid];
        const status = prog ? (prog.status || 'not_started') : 'not_started';
        lessonHexes.push({ hexId: hid, label: hex.label || '', status: status });
        total++;
        if (status === 'completed' || status === 'mastered') completed++;
      }

      // Determine lesson status
      let lessonStatus = 'not_started';
      if (lessonHexes.length > 0) {
        const allDone = lessonHexes.every(h => h.status === 'completed' || h.status === 'mastered');
        const anyStarted = lessonHexes.some(h => h.status !== 'not_started');
        if (allDone) lessonStatus = 'completed';
        else if (anyStarted) lessonStatus = 'in_progress';
      }

      lessons.push({
        title: lesson.title,
        sequence: lesson.sequence,
        status: lessonStatus,
        hexCount: lessonHexes.length,
        hexes: lessonHexes
      });
    }

    result.push({
      unitId: String(unit.unitId || ''),
      unitTitle: unit.title || 'Untitled Unit',
      mapId: unitMapId,
      mapTitle: (map && map.title) || '',
      progress: { total: total, completed: completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 },
      lessons: lessons
    });
  }

  return result;
}

// ============================================
// USER & AUTH -> UserService.gs
// ============================================
// normalizeRole() -> normalizeUserRole() in UserService.gs
// getCurrentUser() -> in UserService.gs only
// canEdit(), isAdmin(), isTeacher() -> in UserService.gs only
// getAllUsers(), changeUserRole(), addUser() -> in UserService.gs only
/**
 * Debug function - call from Apps Script editor to diagnose auth issues.
 */
function debugAuth() {
var email = Session.getActiveUser().getEmail();
var effectiveEmail = Session.getEffectiveUser().getEmail();
var ss = SpreadsheetApp.getActiveSpreadsheet();
var owner = ss.getOwner();
var result = {
timestamp: new Date().toISOString(),
activeUserEmail: email,
effectiveUserEmail: effectiveEmail,
spreadsheetOwner: owner ? owner.getEmail() : 'unknown',
spreadsheetName: ss.getName(),
usersSheetExists: ss.getSheetByName('Users') !== null
  };
try {
result.currentUser = getCurrentUser();
  } catch (e) {
result.currentUserError = e.message;
  }
var usersSheet = ss.getSheetByName('Users');
if (usersSheet && usersSheet.getLastRow() > 1) {
var data = usersSheet.getDataRange().getValues();
var headers = data[0];
result.usersHeaders = headers;
result.usersInSheet = [];
for (var i = 1; i < data.length; i++) {
result.usersInSheet.push(rowToObject(data[i], headers));
    }
  }
Logger.log(JSON.stringify(result, null, 2));
return result;
}
// getMaps(), saveMap() -> now in MapService.gs only
// getStudentMaps() -> removed (no callers)
// ============================================
// CLASSES CRUD (FIXED IN v3D)
// ============================================
function getClasses() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Classes');
  if (!sheet || sheet.getLastRow() < 2) return [];
  var user = getCurrentUser();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var classes = [];

  // Student path: return only classes student is enrolled in via ClassRoster
  if (user.normalizedRole === 'student') {
    var studentClasses = {};
    try {
      var rosterEntries = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { email: user.email.toLowerCase() });
      for (var r = 0; r < rosterEntries.length; r++) {
        if (rosterEntries[r].status !== 'removed') {
          studentClasses[String(rosterEntries[r].classId)] = true;
        }
      }
      // Backward compat: also check studentEmail column
      if (Object.keys(studentClasses).length === 0) {
        var rosterByStudentEmail = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { studentEmail: user.email.toLowerCase() });
        for (var r2 = 0; r2 < rosterByStudentEmail.length; r2++) {
          if (rosterByStudentEmail[r2].status !== 'removed') {
            studentClasses[String(rosterByStudentEmail[r2].classId)] = true;
          }
        }
      }
    } catch (err) {
      Logger.log('Error reading ClassRoster for student: ' + err.message);
      return [];
    }
    for (var s = 1; s < data.length; s++) {
      var sCls = rowToObject(data[s], headers);
      if (studentClasses[String(sCls.classId)]) {
        classes.push(sCls);
      }
    }
    return classes;
  }

  // Admin/teacher path (existing logic)
  for (var i = 1; i < data.length; i++) {
    var cls = rowToObject(data[i], headers);
    if (user.isAdmin || cls.teacherEmail === user.email) {
      classes.push(cls);
    }
  }
  return classes;
}
/**
 * Create a new class.
 * FIXED: Writes columns in the order they appear in the spreadsheet.
 */
function createClass(classData) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('Classes');
var lock = LockService.getScriptLock();
try {
lock.waitLock(30000);
var user = getCurrentUser();
Logger.log('createClass called by: ' + user.email + ' (role: ' + user.role + ', normalizedRole: ' + user.normalizedRole + ', canEdit: ' + user.canEdit + ')');
if (!user.canEdit) {
throw new Error('Permission denied. Your role (' + user.role + ') cannot create classes. Contact an administrator.');
    }
var now = new Date().toISOString();
var classId = classData.classId || ('class-' + Date.now());
// Get actual headers from sheet to ensure correct column order
var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
Logger.log('Classes headers: ' + JSON.stringify(headers));
// Build row data object
var rowData = {};
rowData['classId'] = classId;
rowData['className'] = classData.className || 'New Class';
rowData['teacherEmail'] = classData.teacherEmail || user.email;
rowData['subject'] = classData.subject || '';
rowData['year'] = classData.year || getAcademicYearOptions()[1];
rowData['status'] = classData.status || 'active';
rowData['createdAt'] = now;
rowData['updatedAt'] = now;
rowData['courseName'] = classData.courseName || '';
rowData['sectionId'] = classData.sectionId || '';
// Build row array matching header order
var row = headers.map(function(h) {
return rowData[h] !== undefined ? rowData[h] : '';
    });
Logger.log('Appending row: ' + JSON.stringify(row));
sheet.appendRow(row);
Logger.log('Created class: ' + classId + ' by ' + user.email);
return rowData;
  } catch (e) {
Logger.log('ERROR in createClass: ' + e.message);
Logger.log('Stack: ' + e.stack);
throw e;
  } finally {
lock.releaseLock();
  }
}
/**
 * Update an existing class.
 * FIXED: Writes columns in the order they appear in the spreadsheet.
 */
function updateClass(classData) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('Classes');
var lock = LockService.getScriptLock();
try {
lock.waitLock(30000);
var user = getCurrentUser();
var data = sheet.getDataRange().getValues();
var headers = data[0];
// Find column indices
var colIdx = {};
for (var h = 0; h < headers.length; h++) {
colIdx[headers[h]] = h;
    }
var classIdCol = colIdx['classId'];
var teacherEmailCol = colIdx['teacherEmail'];
var createdAtCol = colIdx['createdAt'];
var rowIndex = -1;
var originalCreatedAt = '';
for (var i = 1; i < data.length; i++) {
if (String(data[i][classIdCol]) === String(classData.classId)) {
if (!user.isAdmin && data[i][teacherEmailCol] !== user.email) {
throw new Error('You do not have permission to update this class');
        }
rowIndex = i + 1;
originalCreatedAt = data[i][createdAtCol];
break;
      }
    }
if (rowIndex < 0) {
throw new Error('Class not found');
    }
var now = new Date().toISOString();
// Build row data object
var rowData = {};
rowData['classId'] = classData.classId;
rowData['className'] = classData.className;
rowData['teacherEmail'] = classData.teacherEmail || user.email;
rowData['subject'] = classData.subject || '';
rowData['year'] = classData.year || '';
rowData['status'] = classData.status || 'active';
rowData['createdAt'] = originalCreatedAt;
rowData['updatedAt'] = now;
rowData['courseName'] = classData.courseName || '';
rowData['sectionId'] = classData.sectionId || '';
// Build row array matching header order
var row = headers.map(function(h) {
return rowData[h] !== undefined ? rowData[h] : '';
    });
sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
Logger.log('Updated class: ' + classData.classId);
return rowData;
  } finally {
lock.releaseLock();
  }
}
/**
 * Delete a class and all associated data (cascade).
 * Removes: ClassRoster, MapAssignments, FormativeChecks,
 * DifferentiationGroups + GroupMemberships + HexAssignments, then the class itself.
 */
function deleteClass(classId) {
  var user = getCurrentUser();
  if (!user.canEdit) {
    throw new Error('Permission denied');
  }
  // Verify class exists and user owns it (admin bypasses)
  var cls = findRow_(SHEETS_.CLASSES, 'classId', classId);
  if (!cls) {
    throw new Error('Class not found');
  }
  if (!user.isAdmin && cls.teacherEmail !== user.email) {
    throw new Error('You do not have permission to delete this class');
  }
  // Cascade: delete differentiation groups and their memberships + hex assignments
  var groups = findRows_(SHEETS_.DIFFERENTIATION_GROUPS, 'classId', classId);
  for (var i = 0; i < groups.length; i++) {
    var gid = groups[i].groupId;
    deleteRows_(SHEETS_.GROUP_MEMBERSHIPS, 'groupId', gid);
    deleteRows_(SHEETS_.HEX_ASSIGNMENTS, 'groupId', gid);
  }
  if (groups.length > 0) {
    deleteRows_(SHEETS_.DIFFERENTIATION_GROUPS, 'classId', classId);
  }
  // Cascade: delete roster, map assignments, formative checks
  deleteRows_(SHEETS_.CLASS_ROSTER, 'classId', classId);
  deleteRows_(SHEETS_.MAP_ASSIGNMENTS, 'classId', classId);
  deleteRows_(SHEETS_.FORMATIVE_CHECKS, 'classId', classId);
  // Delete the class row
  return deleteRow_(SHEETS_.CLASSES, 'classId', classId);
}
// getClassRoster(), addStudentsToClass(), removeStudentFromClass() -> now in ClassRosterService.gs only
// rowToObject() -> now in Utilities.gs only
// ============================================
// TEST & DIAGNOSTICS
// ============================================
/**
 * Test the setupDatabase wizard
 */
function test_SetupDatabase() {
Logger.log('=== TEST: Setup Database ===');
// Run setup
var result = setupDatabase();
Logger.log('Result: ' + JSON.stringify(result, null, 2));
// Verify all sheets exist
var ss = SpreadsheetApp.getActiveSpreadsheet();
var expectedSheets = Object.keys(SCHEMA_TABS);
Logger.log('--- Verifying Sheets ---');
expectedSheets.forEach(function(name) {
var sheet = ss.getSheetByName(name);
if (!sheet) {
Logger.log('FAIL: Sheet ' + name + ' not created');
    } else {
var headers = [];
if (sheet.getLastColumn() > 0) {
headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      }
Logger.log('OK ' + name + ': ' + headers.length + ' columns');
    }
  });
// Verify Config migration
Logger.log('--- Config Keys After Migration ---');
var configSheet = ss.getSheetByName('Config');
if (configSheet && configSheet.getLastRow() > 1) {
var configData = configSheet.getDataRange().getValues();
var keys = configData.slice(1).map(function(r) { return r[0]; });
Logger.log('Keys: ' + keys.join(', '));
// Check for any remaining snake_case
var snakeCase = keys.filter(function(k) { return k && k.indexOf('_') > -1; });
if (snakeCase.length > 0) {
Logger.log('WARNING Snake_case keys still exist: ' + snakeCase.join(', '));
    } else {
Logger.log('OK No snake_case keys remain');
    }
  }
// Test idempotency
Logger.log('--- Running setup again (idempotency test) ---');
var result2 = setupDatabase();
if (result2.created.length === 0 && result2.migrated.length === 0) {
Logger.log('OK Idempotency confirmed: no changes on second run');
  } else {
Logger.log('WARNING Second run changes: created=' + result2.created.length + ', migrated=' + result2.migrated.length);
Logger.log('Created: ' + JSON.stringify(result2.created));
Logger.log('Migrated: ' + JSON.stringify(result2.migrated));
  }
Logger.log('=== END TEST ===');
return { firstRun: result, secondRun: result2 };
}
// createTestMap() -> now in TestHelpers.gs only
function createTestClass() {
var cls = createClass({
className: 'Period 1 - Test',
courseName: 'Science 101',
sectionId: 'SCI-101-P1',
subject: 'Science',
year: getAcademicYearOptions()[1]
  });
addStudentsToClass(cls.classId, [
    { email: 'student1@test.edu', name: 'Alice' },
    { email: 'student2@test.edu', name: 'Bob' }
  ]);
return cls;
}
function runDiagnostics() {
var results = {
timestamp: new Date().toISOString(),
user: getCurrentUser(),
schemaStatus: getSchemaStatus(),
tabs: {}
  };
var ss = SpreadsheetApp.getActiveSpreadsheet();
for (var tabName in SCHEMA_TABS) {
var sheet = ss.getSheetByName(tabName);
if (sheet) {
var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
results.tabs[tabName] = {
exists: true,
rows: sheet.getLastRow(),
cols: sheet.getLastColumn(),
headers: headers
      };
    } else {
results.tabs[tabName] = { exists: false };
    }
  }
Logger.log(JSON.stringify(results, null, 2));
return results;
}
/**
 * Fix duplicate user entries - keeps only the first (highest privilege) entry.
 * Run this manually from Apps Script editor if needed.
 */
// cleanupDuplicateUsers() -> now in UserService.gs only
/**
 * DIAGNOSTIC SCRIPT - Run this from Apps Script Editor
 */
function diagnoseClassCreationIssue() {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var results = [];
results.push('=== DIAGNOSTIC REPORT ===');
results.push('Timestamp: ' + new Date().toISOString());
results.push('');
// 1. Check current user email
var activeEmail = Session.getActiveUser().getEmail();
var effectiveEmail = Session.getEffectiveUser().getEmail();
results.push('1. SESSION INFO:');
results.push('   Active User Email: "' + activeEmail + '"');
results.push('   Effective User Email: "' + effectiveEmail + '"');
results.push('   Spreadsheet Owner: ' + (ss.getOwner() ? ss.getOwner().getEmail() : 'unknown'));
results.push('');
// 2. Check Users sheet
var usersSheet = ss.getSheetByName('Users');
results.push('2. USERS SHEET:');
if (!usersSheet) {
results.push('   ERROR: Users sheet not found!');
  } else {
var data = usersSheet.getDataRange().getValues();
var headers = data[0];
results.push('   Headers: ' + JSON.stringify(headers));
results.push('   Total rows (including header): ' + data.length);
results.push('');
// Find column indices
var emailCol = headers.indexOf('email');
var roleCol = headers.indexOf('role');
var nameCol = headers.indexOf('name');
var activeCol = headers.indexOf('active');
results.push('   Column Indices:');
results.push('     email: ' + emailCol);
results.push('     role: ' + roleCol);
results.push('     name: ' + nameCol);
results.push('     active: ' + activeCol);
results.push('');
// List all users
results.push('   All Users in Sheet:');
for (var i = 1; i < data.length; i++) {
var row = data[i];
var rowEmail = emailCol >= 0 ? row[emailCol] : 'N/A';
var rowRole = roleCol >= 0 ? row[roleCol] : 'N/A';
var rowActive = activeCol >= 0 ? row[activeCol] : 'N/A';
results.push('     Row ' + (i+1) + ': email="' + rowEmail + '", role="' + rowRole + '", active=' + rowActive);
    }
results.push('');
// 3. Try to find current user
results.push('3. USER LOOKUP:');
var normalizedEmail = (activeEmail || '').toLowerCase().trim();
results.push('   Looking for: "' + normalizedEmail + '"');
var foundRow = -1;
var foundData = null;
for (var j = 1; j < data.length; j++) {
var checkEmail = data[j][emailCol];
var checkNormalized = (checkEmail || '').toString().toLowerCase().trim();
results.push('   Comparing with row ' + (j+1) + ': "' + checkNormalized + '" === "' + normalizedEmail + '" ? ' + (checkNormalized === normalizedEmail));
if (checkNormalized === normalizedEmail) {
foundRow = j + 1;
foundData = data[j];
results.push('   >>> MATCH FOUND at row ' + foundRow);
break;
      }
    }
if (foundRow > 0) {
results.push('');
results.push('   Found User Data:');
results.push('     Row: ' + foundRow);
results.push('     Email: ' + foundData[emailCol]);
results.push('     Role: "' + foundData[roleCol] + '"');
results.push('     Role Type: ' + typeof foundData[roleCol]);
// Test normalizeRole
var rawRole = foundData[roleCol] || 'Student';
var normalizedRole = normalizeUserRole(rawRole);
results.push('');
results.push('   Role Normalization:');
results.push('     Raw role: "' + rawRole + '"');
results.push('     Normalized: "' + normalizedRole + '"');
results.push('     canEdit would be: ' + (normalizedRole === 'administrator' || normalizedRole === 'teacher'));
    } else {
results.push('');
results.push('   ERROR: User not found in Users sheet!');
results.push('   This means a new user row would be created as Teacher.');
    }
  }
results.push('');
results.push('=== END DIAGNOSTIC ===');
var output = results.join('\n');
Logger.log(output);
console.log(output);
return output;
}
function testCreateClass() {
try {
var result = createClass({
className: 'Test Class from Script',
subject: 'Science',
year: '2025-2026'
    });
Logger.log('SUCCESS: ' + JSON.stringify(result));
return result;
  } catch (e) {
Logger.log('ERROR: ' + e.message);
Logger.log('Stack: ' + e.stack);
return { error: e.message };
  }
}
// ============================================
// MIGRATION: Story 1.3 - Remove studentEmail column
// ============================================
/**
 * Migration: Remove the redundant 'studentEmail' column from Progress sheet.
 * Run once manually from Apps Script editor after deploying code changes.
 *
 * Safe to run: Only removes column if it exists and is empty.
 *
 * @returns {Object} Migration result
 */
function migrate_RemoveStudentEmailColumn() {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('Progress');
if (!sheet) {
return { success: false, error: 'Progress sheet not found' };
  }
var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
var studentEmailCol = headers.indexOf('studentEmail');
if (studentEmailCol === -1) {
return { success: true, message: 'studentEmail column does not exist. Nothing to do.' };
  }
// Safety check: Verify column is empty before deleting
if (sheet.getLastRow() > 1) {
var columnData = sheet.getRange(2, studentEmailCol + 1, sheet.getLastRow() - 1, 1).getValues();
var nonEmptyCount = columnData.filter(function(row) { return row[0] !== '' && row[0] !== null; }).length;
if (nonEmptyCount > 0) {
return {
success: false,
error: 'studentEmail column has ' + nonEmptyCount + ' non-empty values. Manual review required.',
action: 'Copy any needed data to email column first, then re-run this migration.'
      };
    }
  }
// Delete the column (1-indexed, so add 1)
sheet.deleteColumn(studentEmailCol + 1);
Logger.log('Migration complete: Removed studentEmail column from Progress sheet');
return {
success: true,
message: 'Successfully removed studentEmail column from Progress sheet',
removedColumnIndex: studentEmailCol
  };
}