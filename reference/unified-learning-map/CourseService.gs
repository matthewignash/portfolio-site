/**
 * Learning Map - Course Service
 *
 * Handles:
 * - Courses CRUD
 * - Units CRUD
 * - Course/Unit relationships
 * - Grading system configuration per course
 * - Role-based access control
 *
 * @version 1.0.0
 */
// ============================================================================
// COURSES - CRUD OPERATIONS
// ============================================================================
/**
 * Get all courses (filtered by user role)
 *
 * Admin: see all courses
 * Teacher: see courses they own
 * Student: see courses they're enrolled in
 *
 * @returns {Array<Object>} Array of course objects
 */
function getCourses() {
try {
Logger.log('=== getCourses START ===');
const allCourses = readAll_(SHEETS_.COURSES);
Logger.log('Raw rows from sheet: ' + allCourses.length);
if (allCourses.length > 0) {
Logger.log('First raw row: ' + JSON.stringify(allCourses[0]));
    }
const coursesWithData = [];
for (var i = 0; i < allCourses.length; i++) {
try {
var parsed = parseCourseFromRow_(allCourses[i]);
Logger.log('Parsed course ' + i + ': ' + parsed.title);
coursesWithData.push(parsed);
      } catch (parseErr) {
Logger.log('ERROR parsing course ' + i + ': ' + parseErr.message);
      }
    }
Logger.log('Successfully parsed: ' + coursesWithData.length);
const filtered = filterCoursesByRole(coursesWithData);
Logger.log('After filter: ' + filtered.length);
Logger.log('=== getCourses END ===');
return filtered;
  } catch (err) {
Logger.log('FATAL ERROR in getCourses: ' + err.message);
Logger.log('Stack: ' + err.stack);
throw new Error('Failed to load courses. Please try refreshing the page.');
  }
}
/**
 * Get course by ID
 *
 * @param {string} courseId - Course ID
 * @returns {Object|null} Course object or null
 */
function getCourseById(courseId) {
const course = findRow_(SHEETS_.COURSES, 'courseId', courseId);
if (!course) {
return null;
  }
return parseCourseFromRow_(course);
}
/**
 * Save course (create or update)
 *
 * @param {Object} course - Course object
 * @returns {Object} Saved course object
 */
function saveCourse(course) {
// Validate required fields
validateRequired_(course, ['title']);
// Check permissions
if (course.courseId && !canEditCourse(course.courseId)) {
throw new Error('You do not have permission to edit this course');
  }
const user = getCurrentUser();
// Set defaults
if (!course.courseId) {
course.courseId = generateCourseId_();
course.ownerTeacherEmail = user.email;
  }
if (!course.programTrack) {
course.programTrack = '';
  }
if (!course.gradeLevel) {
course.gradeLevel = '';
  }
if (!course.year) {
const currentYear = new Date().getFullYear();
course.year = `${currentYear}-${currentYear + 1}`;
  }
if (!course.gradingSystem) {
// Default to 8-point SBAR
course.gradingSystem = {
type: 'sbar_8point',
name: '8-Point SBAR',
scale: 8,
strands: ['KU', 'TT', 'C'],
passingLevel: 4
    };
  }
if (course.active === undefined) {
course.active = true;
  }
  if (!course.standardFramework) {
    course.standardFramework = '';
  }
  if (!course.standardSubject) {
    course.standardSubject = '';
  }
// Convert to row format
const row = courseToRow_(course);
// Save
upsertRow_(SHEETS_.COURSES, 'courseId', row);
return course;
}
/**
 * Delete course
 *
 * @param {string} courseId - Course ID
 * @returns {boolean} True if deleted
 */
function deleteCourse(courseId) {
  if (!canEditCourse(courseId)) {
    throw new Error('You do not have permission to delete this course');
  }
  // Cascade: delete all units (which cascade-deletes lessons + linked maps)
  const units = findRows_(SHEETS_.UNITS, 'courseId', courseId);
  for (let i = 0; i < units.length; i++) {
    try {
      deleteUnit(units[i].unitId);
    } catch (e) {
      console.log('Cascade delete unit ' + units[i].unitId + ' failed: ' + e.message);
    }
  }
  // Delete any maps directly linked to course (not via units)
  const maps = findRows_(SHEETS_.MAPS, 'courseId', courseId);
  for (let i = 0; i < maps.length; i++) {
    try {
      deleteMap(maps[i].mapId);
    } catch (e) {
      console.log('Cascade delete map ' + maps[i].mapId + ' failed: ' + e.message);
    }
  }
  return deleteRow_(SHEETS_.COURSES, 'courseId', courseId);
}
/**
 * Create new course
 *
 * @param {string} title - Course title
 * @param {string} programTrack - Program track (e.g. 'IB Diploma', 'AP')
 * @param {string} gradeLevel - Grade level (e.g. '11-12')
 * @returns {Object} New course object
 */
function createCourse(title, programTrack, gradeLevel) {
const user = getCurrentUser();
const course = {
courseId: generateCourseId_(),
title: title,
programTrack: programTrack || '',
gradeLevel: gradeLevel || '',
ownerTeacherEmail: user.email,
year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
gradingSystem: {
type: 'sbar_8point',
name: '8-Point SBAR',
scale: 8,
strands: ['KU', 'TT', 'C'],
passingLevel: 4
    },
active: true
  };
return saveCourse(course);
}
/**
 * Set grading system for course
 *
 * @param {string} courseId - Course ID
 * @param {Object} gradingSystem - Grading system config
 * @returns {Object} Updated course
 */
function setCourseGradingSystem(courseId, gradingSystem) {
const course = getCourseById(courseId);
if (!course) {
throw new Error('Course not found');
  }
if (!canEditCourse(courseId)) {
throw new Error('You do not have permission to edit this course');
  }
course.gradingSystem = gradingSystem;
return saveCourse(course);
}
// ============================================================================
// UNITS - CRUD OPERATIONS
// ============================================================================
/**
 * Get all units for a course
 *
 * @param {string} courseId - Course ID (optional, returns all if not provided)
 * @returns {Array<Object>} Array of unit objects
 */
function getUnits(courseId) {
if (courseId) {
const units = findRows_(SHEETS_.UNITS, 'courseId', courseId);
return sortBy_(units, 'sequence', 'asc');
  }
const allUnits = readAll_(SHEETS_.UNITS);
return sortBy_(allUnits, 'sequence', 'asc');
}
/**
 * Get unit by ID
 *
 * @param {string} unitId - Unit ID
 * @returns {Object|null} Unit object or null
 */
function getUnitById(unitId) {
return findRow_(SHEETS_.UNITS, 'unitId', unitId);
}
/**
 * Save unit (create or update)
 *
 * @param {Object} unit - Unit object
 * @returns {Object} Saved unit object
 */
function saveUnit(unit) {
// Validate required fields
validateRequired_(unit, ['courseId', 'title']);
// Check if course exists and user has permission
const course = getCourseById(unit.courseId);
if (!course) {
throw new Error('Course not found');
  }
if (!canEditCourse(unit.courseId)) {
throw new Error('You do not have permission to edit this course');
  }
// Set defaults
if (!unit.unitId) {
unit.unitId = generateUnitId_();
  }
if (!unit.sequence) {
// Auto-assign sequence (next available)
const existingUnits = getUnits(unit.courseId);
unit.sequence = existingUnits.length + 1;
  }
if (!unit.mapId) {
unit.mapId = '';
  }
if (!unit.status) {
unit.status = 'active';
  }
if (unit.active === undefined) {
unit.active = true;
  }
// Save
upsertRow_(SHEETS_.UNITS, 'unitId', unit);
return unit;
}
/**
 * Delete unit
 *
 * @param {string} unitId - Unit ID
 * @returns {boolean} True if deleted
 */
function deleteUnit(unitId) {
  const unit = getUnitById(unitId);
  if (!unit) {
    throw new Error('Unit not found');
  }
  if (!canEditCourse(unit.courseId)) {
    throw new Error('You do not have permission to delete this unit');
  }
  // Cascade: delete all lessons for this unit
  deleteRows_(SHEETS_.LESSONS, 'unitId', unitId);
  // Cascade: delete linked map (which cascade-deletes progress, edges, etc.)
  if (unit.mapId) {
    try {
      deleteMap(unit.mapId);
    } catch (e) {
      console.log('Cascade delete map ' + unit.mapId + ' failed: ' + e.message);
    }
  }
  return deleteRow_(SHEETS_.UNITS, 'unitId', unitId);
}
/**
 * Create new unit
 *
 * @param {string} courseId - Course ID
 * @param {string} title - Unit title
 * @param {number} sequence - Unit sequence number (optional)
 * @returns {Object} New unit object
 */
function createUnit(courseId, title, sequence) {
const unit = {
unitId: generateUnitId_(),
courseId: courseId,
title: title,
sequence: sequence,
mapId: '',
status: 'active',
active: true
  };
return saveUnit(unit);
}

// ============================================================================
// DESIGN FRAMEWORK PRESETS (PBL / Design Thinking)
// ============================================================================

/**
 * Get available design thinking framework presets
 * @returns {Object} Map of preset ID to framework definition
 */
function getDesignFrameworkPresets() {
  return {
    dschool: {
      type: 'dschool',
      label: 'd.school 5-Phase',
      phases: [
        { id: 'empathize', label: 'Empathize', icon: '\u2764', color: '#7c3aed' },
        { id: 'define', label: 'Define', icon: '\u{1F3AF}', color: '#2563eb' },
        { id: 'ideate', label: 'Ideate', icon: '\u{1F4A1}', color: '#059669' },
        { id: 'prototype', label: 'Prototype', icon: '\u{1F6E0}', color: '#d97706' },
        { id: 'test', label: 'Test', icon: '\u{1F9EA}', color: '#dc2626' }
      ]
    },
    doubleDiamond: {
      type: 'doubleDiamond',
      label: 'Double Diamond',
      phases: [
        { id: 'discover', label: 'Discover', icon: '\u{1F50D}', color: '#7c3aed' },
        { id: 'define', label: 'Define', icon: '\u{1F3AF}', color: '#2563eb' },
        { id: 'develop', label: 'Develop', icon: '\u{1F527}', color: '#059669' },
        { id: 'deliver', label: 'Deliver', icon: '\u{1F4E6}', color: '#d97706' }
      ]
    },
    ibDesign: {
      type: 'ibDesign',
      label: 'IB Design Cycle',
      phases: [
        { id: 'inquiring', label: 'Inquiring & Analysing', icon: '\u{1F50E}', color: '#7c3aed' },
        { id: 'developing', label: 'Developing Ideas', icon: '\u{1F4DD}', color: '#2563eb' },
        { id: 'creating', label: 'Creating the Solution', icon: '\u{2699}', color: '#059669' },
        { id: 'evaluating', label: 'Evaluating', icon: '\u{2705}', color: '#d97706' }
      ]
    }
  };
}

/**
 * Save design framework configuration for a unit
 *
 * @param {string} unitId - Unit ID
 * @param {Object} frameworkData - { type, phases, isActive }
 * @returns {Object} Updated unit
 */
function setUnitDesignFramework(unitId, frameworkData) {
  const unit = getUnitById(unitId);
  if (!unit) throw new Error('Unit not found');
  if (!canEditCourse(unit.courseId)) throw new Error('Permission denied');

  // Validate framework data
  if (!frameworkData || typeof frameworkData !== 'object') {
    throw new Error('Invalid framework data');
  }

  const fw = {
    type: String(frameworkData.type || 'custom'),
    isActive: frameworkData.isActive === true,
    phases: []
  };

  // Validate phases (max 8)
  const phases = frameworkData.phases || [];
  for (let i = 0; i < Math.min(phases.length, 8); i++) {
    const p = phases[i];
    fw.phases.push({
      id: String(p.id || 'phase_' + (i + 1)).substring(0, 30),
      label: String(p.label || 'Phase ' + (i + 1)).substring(0, 50),
      icon: String(p.icon || '').substring(0, 10),
      color: String(p.color || '#64748b').substring(0, 20)
    });
  }

  // Save to unit
  unit.designFrameworkJson = JSON.stringify(fw);
  upsertRow_(SHEETS_.UNITS, 'unitId', unit);
  return unit;
}

/**
 * Link map to unit
 *
 * @param {string} unitId - Unit ID
 * @param {string} mapId - Map ID
 * @returns {Object} Updated unit
 */
function linkMapToUnit(unitId, mapId) {
const unit = getUnitById(unitId);
if (!unit) {
throw new Error('Unit not found');
  }
// Check permissions
if (!canEditCourse(unit.courseId)) {
throw new Error('You do not have permission to edit this unit');
  }
// Verify map exists
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
unit.mapId = mapId;
// Also update the map to link back to the unit
map.unitId = unitId;
map.courseId = unit.courseId;
saveMap(map);
return saveUnit(unit);
}
/**
 * Unlink map from unit
 *
 * @param {string} unitId - Unit ID
 * @returns {Object} Updated unit
 */
function unlinkMapFromUnit(unitId) {
const unit = getUnitById(unitId);
if (!unit) {
throw new Error('Unit not found');
  }
// Check permissions
if (!canEditCourse(unit.courseId)) {
throw new Error('You do not have permission to edit this unit');
  }
// Update map to remove unit link
if (unit.mapId) {
const map = getMapById(unit.mapId);
if (map) {
map.unitId = '';
saveMap(map);
    }
  }
unit.mapId = '';
return saveUnit(unit);
}
/**
 * Reorder units in a course
 *
 * @param {string} courseId - Course ID
 * @param {Array<string>} unitIds - Array of unit IDs in new order
 * @returns {Array<Object>} Updated units
 */
function reorderUnits(courseId, unitIds) {
// Check permissions
if (!canEditCourse(courseId)) {
throw new Error('You do not have permission to edit this course');
  }
const updatedUnits = [];
unitIds.forEach((unitId, index) => {
const unit = getUnitById(unitId);
if (!unit) {
throw new Error(`Unit not found: ${unitId}`);
    }
if (unit.courseId !== courseId) {
throw new Error(`Unit ${unitId} does not belong to course ${courseId}`);
    }
unit.sequence = index + 1;
saveUnit(unit);
updatedUnits.push(unit);
  });
return updatedUnits;
}
// ============================================================================
// LESSONS CRUD
// ============================================================================
/**
 * Get all lessons for a unit
 *
 * @param {string} unitId - Unit ID
 * @returns {Array<Object>} Array of lesson objects sorted by sequence
 */
function getLessonsForUnit(unitId) {
  const lessons = findRows_(SHEETS_.LESSONS, 'unitId', unitId);
  return sortBy_(lessons.map(parseLessonFromRow_), 'sequence', 'asc');
}
/**
 * Get lesson by ID
 *
 * @param {string} lessonId - Lesson ID
 * @returns {Object|null} Lesson object or null
 */
function getLessonById(lessonId) {
  const row = findRow_(SHEETS_.LESSONS, 'lessonId', lessonId);
  if (!row) return null;
  return parseLessonFromRow_(row);
}
/**
 * Save lesson (create or update)
 *
 * @param {Object} lessonData - Lesson object
 * @returns {Object} Saved lesson object
 */
function saveLesson(lessonData) {
  validateRequired_(lessonData, ['unitId', 'title']);

  // Verify unit exists and check permissions
  const unit = getUnitById(lessonData.unitId);
  if (!unit) throw new Error('Unit not found');
  if (!canEditCourse(unit.courseId)) throw new Error('Permission denied');

  // Generate ID + timestamps for new lessons
  if (!lessonData.lessonId) {
    lessonData.lessonId = generateLessonId_();
    lessonData.createdAt = now_();
  }
  lessonData.updatedAt = now_();

  // Auto-assign sequence if not set
  if (!lessonData.sequence) {
    const existing = findRows_(SHEETS_.LESSONS, 'unitId', lessonData.unitId);
    lessonData.sequence = existing.length + 1;
  }

  // Defaults
  if (!lessonData.status) lessonData.status = 'active';
  if (!lessonData.objectives) lessonData.objectives = [];
  if (!lessonData.hexIds) lessonData.hexIds = [];
  if (!lessonData.standardIds) lessonData.standardIds = [];
  if (!lessonData.materials) lessonData.materials = [];
  if (!lessonData.lessonData) lessonData.lessonData = {};

  // Serialize for storage
  const rowData = prepareLessonForRow_(lessonData);
  upsertRow_(SHEETS_.LESSONS, 'lessonId', rowData);
  return lessonData;
}
/**
 * Delete lesson
 *
 * @param {string} lessonId - Lesson ID
 * @returns {boolean} True if deleted
 */
function deleteLesson(lessonId) {
  const lesson = findRow_(SHEETS_.LESSONS, 'lessonId', lessonId);
  if (!lesson) throw new Error('Lesson not found');

  // Permission check via parent unit -> course
  const unit = getUnitById(lesson.unitId);
  if (unit && !canEditCourse(unit.courseId)) {
    throw new Error('Permission denied');
  }

  return deleteRow_(SHEETS_.LESSONS, 'lessonId', lessonId);
}
/**
 * Reorder lessons within a unit
 *
 * @param {string} unitId - Unit ID
 * @param {Array<string>} lessonIds - Array of lesson IDs in new order
 * @returns {boolean} True on success
 */
function reorderLessons(unitId, lessonIds) {
  // Permission check
  const unit = getUnitById(unitId);
  if (!unit) throw new Error('Unit not found');
  if (!canEditCourse(unit.courseId)) throw new Error('Permission denied');

  for (let i = 0; i < lessonIds.length; i++) {
    const lesson = findRow_(SHEETS_.LESSONS, 'lessonId', lessonIds[i]);
    if (lesson && String(lesson.unitId) === String(unitId)) {
      lesson.sequence = i + 1;
      upsertRow_(SHEETS_.LESSONS, 'lessonId', lesson);
    }
  }
  return true;
}
/**
 * Parse lesson from database row
 * Deserializes JSON columns into arrays/objects
 *
 * @param {Object} row - Database row
 * @returns {Object} Parsed lesson object
 */
function parseLessonFromRow_(row) {
  const lesson = {
    lessonId: String(row.lessonId || ''),
    unitId: String(row.unitId || ''),
    title: String(row.title || ''),
    sequence: parseInt(row.sequence) || 0,
    duration: String(row.duration || ''),
    status: String(row.status || 'active'),
    createdAt: String(row.createdAt || ''),
    updatedAt: String(row.updatedAt || '')
  };

  // Parse JSON array columns
  lesson.objectives = safeJsonParse_(row.objectives, []);
  if (typeof lesson.objectives === 'string') lesson.objectives = [];

  lesson.hexIds = safeJsonParse_(row.hexIds, []);
  if (typeof lesson.hexIds === 'string') lesson.hexIds = [];

  lesson.standardIds = safeJsonParse_(row.standardIds, []);
  if (typeof lesson.standardIds === 'string') lesson.standardIds = [];

  lesson.materials = safeJsonParse_(row.materials, []);
  if (typeof lesson.materials === 'string') lesson.materials = [];

  // Parse rich lesson data JSON
  lesson.lessonData = safeJsonParse_(row.lessonDataJson, {});
  if (typeof lesson.lessonData === 'string') lesson.lessonData = {};

  return lesson;
}
/**
 * Prepare lesson object for database storage
 * Serializes arrays/objects into JSON strings
 *
 * @param {Object} lesson - Lesson object
 * @returns {Object} Row-ready object
 */
function prepareLessonForRow_(lesson) {
  const row = {};
  row.lessonId = lesson.lessonId;
  row.unitId = lesson.unitId;
  row.title = lesson.title;
  row.sequence = lesson.sequence;
  row.duration = lesson.duration || '';
  row.status = lesson.status || 'active';
  row.createdAt = lesson.createdAt || '';
  row.updatedAt = lesson.updatedAt || '';

  // Serialize arrays to JSON strings
  row.objectives = safeJsonStringify_(lesson.objectives, '[]');
  row.hexIds = safeJsonStringify_(lesson.hexIds, '[]');
  row.standardIds = safeJsonStringify_(lesson.standardIds, '[]');
  row.materials = safeJsonStringify_(lesson.materials, '[]');

  // Serialize rich data
  row.lessonDataJson = safeJsonStringify_(lesson.lessonData, '{}');

  return row;
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Parse course from database row
 *
 * @param {Object} row - Database row
 * @returns {Object} Course object
 */
function parseCourseFromRow_(row) {
// Parse gradingSystem safely and ensure it's a plain object
var gradingSystem = null;
try {
var defaultGrading = {
type: 'sbar_8point',
name: '8-Point SBAR',
scale: 8,
strands: ['KU', 'TT', 'C'],
passingLevel: 4
    };
var parsed = safeJsonParse_(row.gradingSystemJson, defaultGrading);
// Force to plain object via JSON round-trip
gradingSystem = JSON.parse(JSON.stringify(parsed));
  } catch (e) {
Logger.log('Error parsing gradingSystem: ' + e.message);
gradingSystem = {
type: 'sbar_8point',
name: '8-Point SBAR',
scale: 8,
strands: ['KU', 'TT', 'C'],
passingLevel: 4
    };
  }
  // Backward compat: migrate old flat format to {primary, secondary}
  if (gradingSystem && gradingSystem.type && !gradingSystem.primary) {
    gradingSystem = { primary: gradingSystem, secondary: null };
  }
  // Ensure new-format always has primary
  if (gradingSystem && !gradingSystem.primary) {
    gradingSystem = {
      primary: { type: 'sbar_8point', name: '8-Point SBAR', scale: 8, strands: ['KU', 'TT', 'C'], passingLevel: 4, customized: false },
      secondary: null
    };
  }
return {
courseId: String(row.courseId || ''),
title: String(row.title || ''),
programTrack: String(row.programTrack || ''),
gradeLevel: String(row.gradeLevel || ''),
ownerTeacherEmail: String(row.ownerTeacherEmail || ''),
year: String(row.year || ''),
gradingSystem: gradingSystem,
active: row.active === true || row.active === 'true',
standardFramework: String(row.standardFramework || ''),
standardSubject: String(row.standardSubject || '')
  };
}
/**
 * Convert course to database row
 *
 * @param {Object} course - Course object
 * @returns {Object} Database row
 */
function courseToRow_(course) {
return {
courseId: course.courseId,
title: course.title,
programTrack: course.programTrack || '',
gradeLevel: course.gradeLevel || '',
ownerTeacherEmail: course.ownerTeacherEmail,
year: course.year || '',
gradingSystemJson: safeJsonStringify_(course.gradingSystem, '{}'),
active: course.active,
standardFramework: course.standardFramework || '',
standardSubject: course.standardSubject || ''
  };
}
/**
 * Check if current user can edit a course
 *
 * @param {string} courseId - Course ID
 * @returns {boolean} True if user can edit
 */
function canEditCourse(courseId) {
try {
const user = getCurrentUser();
const role = normalizeUserRole(user.role);
// Administrators can edit any course
if (role === 'administrator') {
return true;
    }
// Teachers can edit courses they own
if (role === 'teacher') {
const course = getCourseById(courseId);
if (!course) return false;
return course.ownerTeacherEmail === user.email;
    }
return false;
  } catch (err) {
Logger.log('Error in canEditCourse: ' + err.message);
return false;
  }
}
// ============================================================================
// REPORTING & ANALYTICS
// ============================================================================
/**
 * Get course analytics
 *
 * @param {string} courseId - Course ID
 * @returns {Object} Analytics data
 */
function getCourseAnalytics(courseId) {
const course = getCourseById(courseId);
if (!course) {
throw new Error('Course not found');
  }
// Get units
const units = getUnits(courseId);
// Get maps
const maps = findRows_(SHEETS_.MAPS, 'courseId', courseId);
// Get total hexes
let totalHexes = 0;
maps.forEach(mapRow => {
const map = parseMapFromRow_(mapRow);
totalHexes += map.hexes.length;
  });
// Get student progress (if teacher/admin)
let progressData = null;
if (isTeacherOrAdmin()) {
const mapIds = maps.map(m => m.mapId);
let totalProgress = 0;
let students = new Set();
mapIds.forEach(mapId => {
const progress = findRows_(SHEETS_.PROGRESS, 'mapId', mapId);
totalProgress += progress.length;
progress.forEach(p => students.add(p.email));
    });
progressData = {
totalStudents: students.size,
totalSubmissions: totalProgress
    };
  }
return {
totalUnits: units.length,
unitsWithMaps: units.filter(u => u.mapId).length,
totalMaps: maps.length,
totalHexes: totalHexes,
gradingSystem: course.gradingSystem.name,
progress: progressData
  };
}
// ============================================================================
// GRADING SYSTEM PRESETS
// ============================================================================
/**
 * Get available grading system presets
 *
 * @returns {Array<Object>} Array of grading system presets
 */
function getGradingSystemPresets() {
return [
    {
type: 'sbar_8point',
name: '8-Point SBAR',
scale: 8,
strands: ['KU', 'TT', 'C'],
levels: [
        {value: 8, label: 'Excellent', range: '91-100%'},
        {value: 7, label: 'Excellent', range: '81-90%'},
        {value: 6, label: 'Substantial', range: '71-80%'},
        {value: 5, label: 'Substantial', range: '61-70%'},
        {value: 4, label: 'Adequate', range: '51-60%'},
        {value: 3, label: 'Adequate', range: '41-50%'},
        {value: 2, label: 'Limited', range: '21-40%'},
        {value: 1, label: 'Very Limited', range: '0-20%'}
      ],
passingLevel: 4
    },
    {
type: 'ap_5point',
name: 'AP 5-Point Scale',
scale: 5,
strands: [],
levels: [
        {value: 5, label: 'Extremely well qualified', range: '70-100%'},
        {value: 4, label: 'Well qualified', range: '55-69%'},
        {value: 3, label: 'Qualified', range: '40-54%'},
        {value: 2, label: 'Possibly qualified', range: '25-39%'},
        {value: 1, label: 'No recommendation', range: '0-24%'}
      ],
passingLevel: 3
    },
    {
type: 'ib_7point',
name: 'IB DP 7-Point Scale',
scale: 7,
strands: [],
levels: [
        {value: 7, label: 'Excellent', range: '80-100%'},
        {value: 6, label: 'Very Good', range: '68-79%'},
        {value: 5, label: 'Good', range: '56-67%'},
        {value: 4, label: 'Satisfactory', range: '44-55%'},
        {value: 3, label: 'Mediocre', range: '32-43%'},
        {value: 2, label: 'Poor', range: '20-31%'},
        {value: 1, label: 'Very Poor', range: '0-19%'}
      ],
passingLevel: 4
    },
    {
type: 'percentage',
name: 'Percentage (0-100%)',
scale: 100,
strands: [],
passingLevel: 60
    },
    {
type: 'letter_grade',
name: 'Letter Grades (A-F)',
scale: 5,
strands: [],
levels: [
        {value: 5, label: 'A', range: '90-100%'},
        {value: 4, label: 'B', range: '80-89%'},
        {value: 3, label: 'C', range: '70-79%'},
        {value: 2, label: 'D', range: '60-69%'},
        {value: 1, label: 'F', range: '0-59%'}
      ],
passingLevel: 3
    }
  ];
}
// ============================================================================
// TEST FUNCTIONS
// ============================================================================
/**
 * Test creating a course
 */
function test_createCourse() {
try {
const course = createCourse('IB Chemistry HL', 'IB Diploma', '11-12');
Logger.log('Created course:', course);
Logger.log('Course ID:', course.courseId);
Logger.log('Grading system:', course.gradingSystem.name);
  } catch (err) {
Logger.log('Error:', err.message);
  }
}
/**
 * Test creating a unit
 */
function test_createUnit() {
try {
// Get first course
const courses = getCourses();
if (courses.length === 0) {
Logger.log('No courses found. Create one first.');
return;
    }
const courseId = courses[0].courseId;
const unit = createUnit(courseId, 'Topic 1: Stoichiometric Relationships', 1);
Logger.log('Created unit:', unit);
Logger.log('Unit ID:', unit.unitId);
Logger.log('Sequence:', unit.sequence);
  } catch (err) {
Logger.log('Error:', err.message);
  }
}
/**
 * Test getting courses
 */
function test_getCourses() {
try {
const courses = getCourses();
Logger.log('Total courses:', courses.length);
if (courses.length > 0) {
Logger.log('First course:', courses[0].title);
Logger.log('Program:', courses[0].programTrack);
Logger.log('Grading system:', courses[0].gradingSystem.name);
    }
  } catch (err) {
Logger.log('Error:', err.message);
  }
}
/**
 * Test getting units
 */
function test_getUnits() {
try {
const courses = getCourses();
if (courses.length === 0) {
Logger.log('No courses found.');
return;
    }
const courseId = courses[0].courseId;
const units = getUnits(courseId);
Logger.log('Course:', courses[0].title);
Logger.log('Total units:', units.length);
units.forEach(u => {
Logger.log(`  ${u.sequence}. ${u.title} ${u.mapId ? '(linked)' : '(no map)'}`);
    });
  } catch (err) {
Logger.log('Error:', err.message);
  }
}
function testGetCourses() {
// Hardcoded test - bypasses everything
return [
    { courseId: 'test-1', title: 'Test Course A', active: true },
    { courseId: 'test-2', title: 'Test Course B', active: true }
  ];
}
function getCoursesSimple() {
var allCourses = readAll_(SHEETS_.COURSES);
var result = [];
for (var i = 0; i < allCourses.length; i++) {
var c = allCourses[i];
result.push({
courseId: String(c.courseId || ''),
title: String(c.title || ''),
programTrack: String(c.programTrack || ''),
gradeLevel: String(c.gradeLevel || ''),
ownerTeacherEmail: String(c.ownerTeacherEmail || ''),
year: String(c.year || ''),
active: c.active === true || c.active === 'true'
    });
  }
Logger.log('getCoursesSimple returning: ' + result.length);
return result;
}