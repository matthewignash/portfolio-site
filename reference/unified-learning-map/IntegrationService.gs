/**
 * Learning Map - Integration Service
 *
 * Handles integration with linked systems:
 * 1. Learning Tracker - Import lessons and learning experiences
 * 2. Assessment Tracker - Link assessments to hexes
 * 3. Curriculum Map - Import standards and competencies
 *
 * @version 1.0.0
 */
// ============================================================================
// CONFIGURATION
// ============================================================================
/**
 * Get integration configuration
 *
 * @returns {Object} Integration config with system URLs and enabled status
 */
function getIntegrationConfig() {
  requireRole(['administrator', 'teacher']);
  // URL = enabled: a service is active if its URL is set, no separate toggle needed.
  // This eliminates Google Sheets boolean coercion bugs permanently.
  const vals = getConfigValues_([
    'learningTrackerUrl', 'learningTrackerSpreadsheetId',
    'assessmentTrackerUrl', 'assessmentTrackerSpreadsheetId',
    'curriculumMapUrl', 'curriculumMapSpreadsheetId'
  ]);

  // If any URL exists, return config derived from URLs
  if (vals.learningTrackerUrl || vals.assessmentTrackerUrl || vals.curriculumMapUrl) {
    return {
      learningTracker: {
        enabled: !!(vals.learningTrackerUrl),
        url: vals.learningTrackerUrl || '',
        spreadsheetId: vals.learningTrackerSpreadsheetId || extractSpreadsheetId_(vals.learningTrackerUrl || '')
      },
      assessmentTracker: {
        enabled: !!(vals.assessmentTrackerUrl),
        url: vals.assessmentTrackerUrl || '',
        spreadsheetId: vals.assessmentTrackerSpreadsheetId || extractSpreadsheetId_(vals.assessmentTrackerUrl || '')
      },
      curriculumMap: {
        enabled: !!(vals.curriculumMapUrl),
        url: vals.curriculumMapUrl || '',
        spreadsheetId: vals.curriculumMapSpreadsheetId || extractSpreadsheetId_(vals.curriculumMapUrl || '')
      }
    };
  }

  // Default config (no URLs configured)
  return {
    learningTracker: { enabled: false, url: '', spreadsheetId: '' },
    assessmentTracker: { enabled: false, url: '', spreadsheetId: '' },
    curriculumMap: { enabled: false, url: '', spreadsheetId: '' }
  };
}
/**
 * Save integration configuration
 *
 * @param {Object} config - Integration config
 * @returns {boolean} True if saved
 */
function saveIntegrationConfig(config) {
  requireRole(['administrator', 'teacher']);
  // URL = enabled: only store URL + spreadsheetId, no separate enabled flag
  const updates = {};
  if (config.learningTracker) {
    updates.learningTrackerUrl = config.learningTracker.url || '';
    updates.learningTrackerSpreadsheetId = config.learningTracker.spreadsheetId ||
      extractSpreadsheetId_(config.learningTracker.url || '') || '';
  }
  if (config.assessmentTracker) {
    updates.assessmentTrackerUrl = config.assessmentTracker.url || '';
    updates.assessmentTrackerSpreadsheetId = config.assessmentTracker.spreadsheetId ||
      extractSpreadsheetId_(config.assessmentTracker.url || '') || '';
  }
  if (config.curriculumMap) {
    updates.curriculumMapUrl = config.curriculumMap.url || '';
    updates.curriculumMapSpreadsheetId = config.curriculumMap.spreadsheetId ||
      extractSpreadsheetId_(config.curriculumMap.url || '') || '';
  }
  setConfigValues_(updates);
  return true;
}
/**
 * Test connection to integrated system
 *
 * @param {string} system - System name ('learningTracker', 'assessmentTracker', 'curriculumMap')
 * @returns {Object} {success: boolean, message: string}
 */
function testIntegrationConnection(system) {
requireRole(['administrator', 'teacher']);
const config = getIntegrationConfig();
const systemConfig = config[system];
if (!systemConfig || !systemConfig.url) {
return {
success: false,
message: `${system} is not configured — enter a spreadsheet URL first`
    };
  }
if (!systemConfig.spreadsheetId) {
return {
success: false,
message: 'No spreadsheet ID configured'
    };
  }
try {
// Try to open the spreadsheet
const ss = SpreadsheetApp.openById(systemConfig.spreadsheetId);
const name = ss.getName();
return {
success: true,
message: `Connected to: ${name}`
    };
  } catch (err) {
return {
success: false,
message: `Connection failed: ${err.message}`
    };
  }
}
// ============================================================================
// LEARNING TRACKER INTEGRATION
// ============================================================================
/**
 * Get lessons from Learning Tracker
 *
 * @param {string} unitId - Unit ID (optional filter)
 * @returns {Array<Object>} Array of lesson objects
 */
function getLessonsFromTracker(unitId) {
const config = getIntegrationConfig();
if (!config.learningTracker.enabled) {
throw new Error('Learning Tracker integration is not enabled');
  }
try {
const ss = SpreadsheetApp.openById(config.learningTracker.spreadsheetId);
const sheet = ss.getSheetByName('Lessons') || ss.getSheets()[0];
const data = sheet.getDataRange().getValues();
const headers = data[0];
const rows = data.slice(1);
const lessons = rows.map(row => {
const lesson = {};
headers.forEach((header, i) => {
lesson[header] = row[i];
      });
return lesson;
    });
// Filter by unit if specified
if (unitId) {
return lessons.filter(l => String(l.unitId) === String(unitId));
    }
return lessons;
  } catch (err) {
throw new Error(`Failed to get lessons: ${err.message}`);
  }
}
/**
 * Import lesson as hex
 *
 * @param {string} lessonId - Lesson ID from Learning Tracker
 * @param {string} mapId - Target map ID
 * @param {number} row - Grid row
 * @param {number} col - Grid column
 * @returns {Object} Created hex
 */
function importLessonAsHex(lessonId, mapId, row, col) {
requireRole(['administrator', 'teacher']);
const lessons = getLessonsFromTracker();
const lesson = lessons.find(l => String(l.lessonId) === String(lessonId) || String(l.id) === String(lessonId));
if (!lesson) {
throw new Error('Lesson not found in Learning Tracker');
  }
// Create hex from lesson
const hex = {
label: lesson.title || lesson.name || 'Imported Lesson',
icon: lesson.icon || '📚',
type: 'core',
row: row,
col: col,
linkUrl: lesson.url || lesson.link || '',
curriculum: {
standards: lesson.standards ? lesson.standards.split(',').map(s => s.trim()) : [],
sbarDomains: lesson.sbarDomains ? lesson.sbarDomains.split(',').map(s => s.trim()) : []
    }
  };
// Add to map
return addHex(mapId, hex);
}
/**
 * Sync lesson data to hex
 * Updates existing hex with latest lesson data
 *
 * @param {string} hexId - Hex ID
 * @param {string} lessonId - Lesson ID
 * @returns {Object} Updated map
 */
function syncLessonToHex(hexId, lessonId) {
requireRole(['administrator', 'teacher']);
const lessons = getLessonsFromTracker();
const lesson = lessons.find(l => String(l.lessonId) === String(lessonId) || String(l.id) === String(lessonId));
if (!lesson) {
throw new Error('Lesson not found');
  }
// Find map containing hex
const allMaps = readAll_(SHEETS_.MAPS);
let mapId = null;
for (const mapRow of allMaps) {
const map = parseMapFromRow_(mapRow);
if (map.hexes.some(h => h.id === hexId)) {
mapId = map.mapId;
break;
    }
  }
if (!mapId) {
throw new Error('Hex not found');
  }
// Update hex with lesson data
const updates = {
label: lesson.title || lesson.name,
linkUrl: lesson.url || lesson.link || ''
  };
return updateHex(mapId, hexId, updates);
}
// ============================================================================
// ASSESSMENT TRACKER INTEGRATION
// ============================================================================
/**
 * Get assessments from Assessment Tracker
 *
 * @param {string} unitId - Unit ID (optional filter)
 * @returns {Array<Object>} Array of assessment objects
 */
function getAssessmentsFromTracker(unitId) {
const config = getIntegrationConfig();
if (!config.assessmentTracker.enabled) {
throw new Error('Assessment Tracker integration is not enabled');
  }
try {
const ss = SpreadsheetApp.openById(config.assessmentTracker.spreadsheetId);
const sheet = ss.getSheetByName('Assessments') || ss.getSheets()[0];
const data = sheet.getDataRange().getValues();
const headers = data[0];
const rows = data.slice(1);
const assessments = rows.map(row => {
const assessment = {};
headers.forEach((header, i) => {
assessment[header] = row[i];
      });
return assessment;
    });
// Filter by unit if specified
if (unitId) {
return assessments.filter(a => String(a.unitId) === String(unitId));
    }
return assessments;
  } catch (err) {
throw new Error(`Failed to get assessments: ${err.message}`);
  }
}
/**
 * Link assessment to hex
 *
 * @param {string} hexId - Hex ID
 * @param {string} assessmentId - Assessment ID from tracker
 * @returns {Object} Updated map
 */
function linkAssessmentToHex(hexId, assessmentId) {
requireRole(['administrator', 'teacher']);
const assessments = getAssessmentsFromTracker();
const assessment = assessments.find(a => String(a.assessmentId) === String(assessmentId) || String(a.id) === String(assessmentId));
if (!assessment) {
throw new Error('Assessment not found');
  }
// Find map containing hex
const allMaps = readAll_(SHEETS_.MAPS);
let mapId = null;
for (const mapRow of allMaps) {
const map = parseMapFromRow_(mapRow);
if (map.hexes.some(h => h.id === hexId)) {
mapId = map.mapId;
break;
    }
  }
if (!mapId) {
throw new Error('Hex not found');
  }
// Update hex with assessment link
const updates = {
linkUrl: assessment.url || assessment.link || '',
type: 'student' // Assessments are typically student hexes
  };
return updateHex(mapId, hexId, updates);
}
// ============================================================================
// CURRICULUM MAP INTEGRATION
// ============================================================================
/**
 * Get standards from Curriculum Map
 *
 * @param {string} courseId - Course ID (optional filter)
 * @returns {Array<Object>} Array of standard objects
 */
function getStandardsFromCurriculumMap(courseId) {
const config = getIntegrationConfig();
if (!config.curriculumMap.enabled) {
throw new Error('Curriculum Map integration is not enabled');
  }
try {
const ss = SpreadsheetApp.openById(config.curriculumMap.spreadsheetId);
const sheet = ss.getSheetByName('Standards') || ss.getSheets()[0];
const data = sheet.getDataRange().getValues();
const headers = data[0];
const rows = data.slice(1);
const standards = rows.map(row => {
const standard = {};
headers.forEach((header, i) => {
standard[header] = row[i];
      });
return standard;
    });
// Filter by course if specified
if (courseId) {
return standards.filter(s => String(s.courseId) === String(courseId));
    }
return standards;
  } catch (err) {
throw new Error(`Failed to get standards: ${err.message}`);
  }
}
/**
 * Import standards to course
 *
 * @param {string} courseId - Course ID
 * @returns {number} Number of standards imported
 */
function importStandardsToCourse(courseId) {
requireRole(['administrator', 'teacher']);
const course = getCourseById(courseId);
if (!course) {
throw new Error('Course not found');
  }
if (!canEditCourse(courseId)) {
throw new Error('You do not have permission to edit this course');
  }
const standards = getStandardsFromCurriculumMap(courseId);
// TODO: Store standards in a course-specific way
// For now, standards are referenced in hex curriculum objects
Logger.log(`Found ${standards.length} standards for course ${courseId}`);
return standards.length;
}
// ============================================================================
// BULK SYNC
// ============================================================================
/**
 * Sync all lessons for a unit
 *
 * @param {string} unitId - Unit ID
 * @param {string} mapId - Map ID
 * @returns {number} Number of lessons synced
 */
function syncUnitLessons(unitId, mapId) {
requireRole(['administrator', 'teacher']);
const lessons = getLessonsFromTracker(unitId);
let syncedCount = 0;
// Auto-place lessons in grid
let row = 0;
let col = 0;
lessons.forEach((lesson, index) => {
try {
importLessonAsHex(String(lesson.lessonId || lesson.id), mapId, row, col);
syncedCount++;
// Move to next grid position
col++;
if (col >= 6) { // Wrap at 6 columns
col = 0;
row++;
      }
    } catch (err) {
Logger.log(`Failed to import lesson ${lesson.lessonId}: ${err.message}`);
    }
  });
return syncedCount;
}
/**
 * Sync all assessments for a unit
 *
 * @param {string} unitId - Unit ID
 * @param {string} mapId - Map ID
 * @returns {number} Number of assessments synced
 */
function syncUnitAssessments(unitId, mapId) {
requireRole(['administrator', 'teacher']);
const assessments = getAssessmentsFromTracker(unitId);
let syncedCount = 0;
// Place assessments in bottom row
const map = getMapById(mapId);
const maxRow = Math.max(...map.hexes.map(h => h.row), 0);
let col = 0;
assessments.forEach(assessment => {
try {
const hex = {
label: assessment.title || assessment.name,
icon: '📝',
type: 'student',
row: maxRow + 1,
col: col,
linkUrl: assessment.url || assessment.link || ''
      };
addHex(mapId, hex);
syncedCount++;
col++;
    } catch (err) {
Logger.log(`Failed to import assessment: ${err.message}`);
    }
  });
return syncedCount;
}
// ============================================================================
// TEST FUNCTIONS
// ============================================================================
/**
 * Test integration config
 */
function test_getIntegrationConfig() {
const config = getIntegrationConfig();
Logger.log('Integration config:');
Logger.log('Learning Tracker enabled:', config.learningTracker.enabled);
Logger.log('Assessment Tracker enabled:', config.assessmentTracker.enabled);
Logger.log('Curriculum Map enabled:', config.curriculumMap.enabled);
}
/**
 * Test connection to integrated system
 */
function test_testConnection() {
try {
const result = testIntegrationConnection('learningTracker');
Logger.log('Connection test result:');
Logger.log('Success:', result.success);
Logger.log('Message:', result.message);
  } catch (err) {
Logger.log('Error:', err.message);
  }
}
/**
 * Test importing standards
 */
function test_importStandards() {
try {
const courses = getCourses();
if (courses.length === 0) {
Logger.log('No courses found.');
return;
    }
const count = importStandardsToCourse(courses[0].courseId);
Logger.log('Standards imported:', count);
  } catch (err) {
Logger.log('Error:', err.message);
  }
}