/**
 * UnitPlannerService.gs - Unit & Lesson Planning (Extended)
 * Version: 1.1
 *
 * This service extends the existing Ubdservice.gs and Lessonservice.gs
 * to provide:
 * - Lessons stored in a separate tab (not embedded in hexes)
 * - Links between lessons and hexes
 * - Student progress checklist view
 * - Standards coverage reports
 *
 * DEPENDENCIES:
 * - Ubdservice.gs (UbD templates, validation, export)
 * - Lessonservice.gs (lesson templates, activities, assessments)
 * - StandardsService.gs (standards CRUD, coverage)
 */
// ============================================
// UNITS - Extended for UbD Planning
// ============================================
// getUnitById() -> now in CourseService.gs only
/**
 * Get all units for a course with lesson counts.
 */
function getUnitsForCourse(courseId) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var unitsSheet = ss.getSheetByName('Units');
var lessonsSheet = ss.getSheetByName('Lessons');
if (!unitsSheet || unitsSheet.getLastRow() < 2) return [];
var unitsData = unitsSheet.getDataRange().getValues();
var unitsHeaders = unitsData[0];
var courseIdCol = unitsHeaders.indexOf('courseId');
var units = [];
for (var i = 1; i < unitsData.length; i++) {
if (String(unitsData[i][courseIdCol]) === String(courseId)) {
var unit = rowToObject(unitsData[i], unitsHeaders);
unit.lessonCount = 0;
units.push(unit);
    }
  }
// Count lessons per unit
if (lessonsSheet && lessonsSheet.getLastRow() > 1) {
var lessonsData = lessonsSheet.getDataRange().getValues();
var lessonsHeaders = lessonsData[0];
var unitIdCol = lessonsHeaders.indexOf('unitId');
for (var j = 1; j < lessonsData.length; j++) {
var lessonUnitId = lessonsData[j][unitIdCol];
var matchingUnit = units.find(function(u) { return u.unitId === lessonUnitId; });
if (matchingUnit) matchingUnit.lessonCount++;
    }
  }
// Sort by sequence
units.sort(function(a, b) { return (a.sequence || 0) - (b.sequence || 0); });
return units;
}
/**
 * Create or update a unit with UbD fields.
 * Renamed from saveUnit() to avoid conflict with CourseService.gs saveUnit().
 * This version adds UbD data propagation to the linked map.
 */
function saveUnitExtended(unitData) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('Units');
var lock = LockService.getScriptLock();
try {
lock.waitLock(30000);
var user = getCurrentUser();
if (!user.canEdit) {
throw new Error('Permission denied. Only teachers can manage units.');
    }
var data = sheet.getDataRange().getValues();
var headers = data[0];
// Find column indices
var colIdx = {};
for (var h = 0; h < headers.length; h++) {
colIdx[headers[h]] = h;
    }
var unitIdCol = colIdx['unitId'];
var rowIndex = -1;
// Check if updating existing
if (unitData.unitId) {
for (var i = 1; i < data.length; i++) {
if (String(data[i][unitIdCol]) === String(unitData.unitId)) {
rowIndex = i + 1;
break;
        }
      }
    }
// Build row data
// Units schema: unitId, courseId, title, sequence, mapId, status, active
// Extended fields stored in ubdDataJson on the Map or as additional columns
var rowData = {};
rowData['unitId'] = unitData.unitId || ('unit-' + Date.now());
rowData['courseId'] = unitData.courseId || '';
rowData['title'] = unitData.title || 'Untitled Unit';
rowData['sequence'] = unitData.sequence || 1;
rowData['mapId'] = unitData.mapId || '';
rowData['status'] = unitData.status || 'draft';
rowData['active'] = unitData.active !== false;
var row = headers.map(function(h) { return rowData[h] !== undefined ? rowData[h] : ''; });
if (rowIndex > 0) {
sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
Logger.log('Updated unit: ' + rowData['unitId']);
    } else {
sheet.appendRow(row);
Logger.log('Created unit: ' + rowData['unitId']);
    }
// If unit has UbD data and a linked map, update the map's ubdData
if (unitData.ubdData && unitData.mapId) {
updateMapUbdData(unitData.mapId, unitData.ubdData);
    }
return rowData;
  } finally {
lock.releaseLock();
  }
}
/**
 * Update UbD data on a map.
 */
function updateMapUbdData(mapId, ubdData) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('Maps');
var lock = LockService.getScriptLock();
try {
lock.waitLock(30000);
var data = sheet.getDataRange().getValues();
var headers = data[0];
var mapIdCol = headers.indexOf('mapId');
var ubdCol = headers.indexOf('ubdDataJson');
for (var i = 1; i < data.length; i++) {
if (String(data[i][mapIdCol]) === String(mapId)) {
sheet.getRange(i + 1, ubdCol + 1).setValue(JSON.stringify(ubdData));
Logger.log('Updated UbD data for map: ' + mapId);
return { success: true };
      }
    }
return { success: false, error: 'Map not found' };
  } finally {
lock.releaseLock();
  }
}
// ============================================
// LESSONS CRUD
// ============================================
/**
 * Get all lessons for a unit.
 */
function getLessonsForUnit(unitId) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('Lessons');
if (!sheet || sheet.getLastRow() < 2) return [];
var data = sheet.getDataRange().getValues();
var headers = data[0];
var unitIdCol = headers.indexOf('unitId');
var lessons = [];
for (var i = 1; i < data.length; i++) {
if (String(data[i][unitIdCol]) === String(unitId)) {
var lesson = rowToObject(data[i], headers);
// Parse JSON fields
try {
  lesson.objectives = lesson.objectives ? JSON.parse(lesson.objectives) : [];
  lesson.hexIds = lesson.hexIds ? JSON.parse(lesson.hexIds) : [];
  lesson.standardIds = lesson.standardIds ? JSON.parse(lesson.standardIds) : [];
  lesson.materials = lesson.materials ? JSON.parse(lesson.materials) : [];
} catch (e) {
  lesson.objectives = []; lesson.hexIds = []; lesson.standardIds = []; lesson.materials = [];
}
lessons.push(lesson);
    }
  }
// Sort by sequence
lessons.sort(function(a, b) { return (a.sequence || 0) - (b.sequence || 0); });
return lessons;
}
/**
 * Get a single lesson by ID.
 */
function getLessonById(lessonId) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('Lessons');
if (!sheet || sheet.getLastRow() < 2) return null;
var data = sheet.getDataRange().getValues();
var headers = data[0];
var idCol = headers.indexOf('lessonId');
for (var i = 1; i < data.length; i++) {
if (String(data[i][idCol]) === String(lessonId)) {
var lesson = rowToObject(data[i], headers);
// Parse JSON fields
try {
  lesson.objectives = lesson.objectives ? JSON.parse(lesson.objectives) : [];
  lesson.hexIds = lesson.hexIds ? JSON.parse(lesson.hexIds) : [];
  lesson.standardIds = lesson.standardIds ? JSON.parse(lesson.standardIds) : [];
  lesson.materials = lesson.materials ? JSON.parse(lesson.materials) : [];
} catch (e) {
  lesson.objectives = []; lesson.hexIds = []; lesson.standardIds = []; lesson.materials = [];
}
return lesson;
    }
  }
return null;
}
/**
 * Create or update a lesson.
 */
function saveLesson(lessonData) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('Lessons');
var lock = LockService.getScriptLock();
try {
lock.waitLock(30000);
var user = getCurrentUser();
if (!user.canEdit) {
throw new Error('Permission denied. Only teachers can manage lessons.');
    }
var now = new Date().toISOString();
var data = sheet.getDataRange().getValues();
var headers = data[0];
// Find column indices
var colIdx = {};
for (var h = 0; h < headers.length; h++) {
colIdx[headers[h]] = h;
    }
var lessonIdCol = colIdx['lessonId'];
var rowIndex = -1;
var originalCreatedAt = now;
// Check if updating existing
if (lessonData.lessonId) {
for (var i = 1; i < data.length; i++) {
if (String(data[i][lessonIdCol]) === String(lessonData.lessonId)) {
rowIndex = i + 1;
originalCreatedAt = data[i][colIdx['createdAt']] || now;
break;
        }
      }
    }
// Build row data
// Lessons schema: lessonId, unitId, title, sequence, objectives, hexIds, standardIds, duration, materials, status, createdAt, updatedAt
var rowData = {};
rowData['lessonId'] = lessonData.lessonId || ('lesson-' + Date.now());
rowData['unitId'] = lessonData.unitId || '';
rowData['title'] = lessonData.title || 'Untitled Lesson';
rowData['sequence'] = lessonData.sequence || 1;
rowData['objectives'] = JSON.stringify(lessonData.objectives || []);
rowData['hexIds'] = JSON.stringify(lessonData.hexIds || []);
rowData['standardIds'] = JSON.stringify(lessonData.standardIds || []);
rowData['duration'] = lessonData.duration || '';
rowData['materials'] = JSON.stringify(lessonData.materials || []);
rowData['status'] = lessonData.status || 'draft';
rowData['createdAt'] = originalCreatedAt;
rowData['updatedAt'] = now;
var row = headers.map(function(h) { return rowData[h] !== undefined ? rowData[h] : ''; });
if (rowIndex > 0) {
sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
Logger.log('Updated lesson: ' + rowData['lessonId']);
    } else {
sheet.appendRow(row);
Logger.log('Created lesson: ' + rowData['lessonId']);
    }
// Return with parsed JSON
rowData['objectives'] = lessonData.objectives || [];
rowData['hexIds'] = lessonData.hexIds || [];
rowData['standardIds'] = lessonData.standardIds || [];
rowData['materials'] = lessonData.materials || [];
return rowData;
  } finally {
lock.releaseLock();
  }
}
/**
 * Delete a lesson.
 */
function deleteLesson(lessonId) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('Lessons');
var lock = LockService.getScriptLock();
try {
lock.waitLock(30000);
var user = getCurrentUser();
if (!user.canEdit) {
throw new Error('Permission denied. Only teachers can delete lessons.');
    }
var data = sheet.getDataRange().getValues();
var headers = data[0];
var idCol = headers.indexOf('lessonId');
for (var i = 1; i < data.length; i++) {
if (String(data[i][idCol]) === String(lessonId)) {
sheet.deleteRow(i + 1);
Logger.log('Deleted lesson: ' + lessonId);
return { success: true };
      }
    }
return { success: false, error: 'Lesson not found' };
  } finally {
lock.releaseLock();
  }
}
/**
 * Reorder lessons within a unit.
 */
function reorderLessons(unitId, lessonOrder) {
var user = getCurrentUser();
if (!user.canEdit) {
throw new Error('Permission denied.');
  }
// Each saveLesson call acquires its own lock — no outer lock to avoid deadlock
for (var i = 0; i < lessonOrder.length; i++) {
var lesson = getLessonById(lessonOrder[i]);
if (lesson && String(lesson.unitId) === String(unitId)) {
lesson.sequence = i + 1;
saveLesson(lesson);
    }
  }
return { success: true };
}
// ============================================
// STUDENT CHECKLIST / PROGRESS VIEW
// ============================================
/**
 * Get the complete learning checklist for a student in a unit.
 * Returns lessons with their linked hexes and completion status.
 */
function getStudentChecklist(unitId, studentEmail) {
var user = getCurrentUser();
if (!user.canEdit) {
  // Students can only see their own checklist
  if (!studentEmail || studentEmail.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error('Permission denied');
  }
}
var unit = getUnitById(unitId);
if (!unit) return null;
var lessons = getLessonsForUnit(unitId);
var mapHexes = [];
// Get map hexes if unit has a linked map
if (unit.mapId) {
var map = getMapById(unit.mapId);
if (map && map.hexes) {
mapHexes = map.hexes;
    }
  }
// Get student progress
var progress = {};
if (studentEmail && unit.mapId) {
var progressRecords = getProgressForStudent_(studentEmail, unit.mapId);
for (var p = 0; p < progressRecords.length; p++) {
progress[progressRecords[p].hexId] = progressRecords[p];
    }
  }
// Build checklist
var checklist = [];
var totalItems = 0;
var completedItems = 0;
for (var i = 0; i < lessons.length; i++) {
var lesson = lessons[i];
var lessonItem = {
lessonId: lesson.lessonId,
title: lesson.title,
sequence: lesson.sequence,
duration: lesson.duration,
objectives: lesson.objectives,
status: 'not_started',
hexes: []
    };
// Get linked hexes with progress
for (var h = 0; h < lesson.hexIds.length; h++) {
var hexId = lesson.hexIds[h];
var hex = mapHexes.find(function(x) { return x.id === hexId; });
if (hex) {
var hexProgress = progress[hexId] || { status: 'not_started' };
lessonItem.hexes.push({
hexId: hex.id,
label: hex.label,
icon: hex.icon,
type: hex.type,
progress: hexProgress
        });
totalItems++;
if (hexProgress.status === 'completed' || hexProgress.status === 'mastered') {
completedItems++;
        }
      }
    }
// Determine lesson status based on hex progress
if (lessonItem.hexes.length > 0) {
var hexStatuses = lessonItem.hexes.map(function(h) { return h.progress.status; });
var allComplete = hexStatuses.every(function(s) { return s === 'completed' || s === 'mastered'; });
var anyStarted = hexStatuses.some(function(s) { return s !== 'not_started'; });
if (allComplete) {
lessonItem.status = 'completed';
      } else if (anyStarted) {
lessonItem.status = 'in_progress';
      }
    }
checklist.push(lessonItem);
  }
return {
unit: unit,
lessons: checklist,
progress: {
total: totalItems,
completed: completedItems,
percent: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
    }
  };
}
/**
 * Get progress records for a student on a specific map.
 * Uses findRowsFiltered_ for efficient filtered reads.
 */
function getProgressForStudent_(studentEmail, mapId) {
  return findRowsFiltered_(SHEETS_.PROGRESS, {
    email: studentEmail.toLowerCase().trim(),
    mapId: String(mapId)
  });
}
// getMapById() -> now in MapService.gs only
// ============================================
// COMPREHENSIVE REPORTS
// ============================================
/**
 * Get a comprehensive unit report for teachers.
 * Requires teacher/admin role.
 */
function getUnitReport(unitId) {
var user = getCurrentUser();
if (!user.canEdit) throw new Error('Permission denied');
var unit = getUnitById(unitId);
if (!unit) return null;
var lessons = getLessonsForUnit(unitId);
var map = unit.mapId ? getMapById(unit.mapId) : null;
// Collect all standards from lessons
var allStandardIds = [];
var hexIds = [];
for (var i = 0; i < lessons.length; i++) {
allStandardIds = allStandardIds.concat(lessons[i].standardIds || []);
hexIds = hexIds.concat(lessons[i].hexIds || []);
  }
// Unique standards
var uniqueStandardIds = [...new Set(allStandardIds)];
var standards = uniqueStandardIds.map(function(id) { return getStandardById(id); }).filter(Boolean);
// Coverage report
var coverage = unit.mapId ? getStandardsCoverage(unit.mapId) : null;
// Unique hexes used
var uniqueHexIds = [...new Set(hexIds)];
return {
unit: unit,
map: map ? { mapId: map.mapId, title: map.title, hexCount: (map.hexes || []).length } : null,
lessons: lessons.map(function(l) {
return {
lessonId: l.lessonId,
title: l.title,
sequence: l.sequence,
duration: l.duration,
hexCount: (l.hexIds || []).length,
standardCount: (l.standardIds || []).length,
status: l.status
      };
    }),
summary: {
totalLessons: lessons.length,
totalHexesUsed: uniqueHexIds.length,
totalStandards: standards.length,
standards: standards
    },
coverage: coverage
  };
}
/**
 * Get course-wide standards coverage report.
 * Requires teacher/admin role.
 */
function getCourseStandardsReport(courseId) {
var user = getCurrentUser();
if (!user.canEdit) throw new Error('Permission denied');
var units = getUnitsForCourse(courseId);
var allStandards = getStandards();
var standardUsage = {};
// Initialize
for (var s = 0; s < allStandards.length; s++) {
standardUsage[allStandards[s].standardId] = {
standard: allStandards[s],
units: [],
lessons: []
    };
  }
// Collect usage from each unit
for (var u = 0; u < units.length; u++) {
var unit = units[u];
var lessons = getLessonsForUnit(unit.unitId);
for (var l = 0; l < lessons.length; l++) {
var lesson = lessons[l];
var lessonStandardIds = lesson.standardIds || [];
for (var ls = 0; ls < lessonStandardIds.length; ls++) {
var stdId = lessonStandardIds[ls];
if (standardUsage[stdId]) {
if (standardUsage[stdId].units.indexOf(unit.unitId) === -1) {
standardUsage[stdId].units.push(unit.unitId);
          }
standardUsage[stdId].lessons.push({
unitId: unit.unitId,
unitTitle: unit.title,
lessonId: lesson.lessonId,
lessonTitle: lesson.title
          });
        }
      }
    }
  }
// Build report
var covered = [];
var gaps = [];
for (var id in standardUsage) {
if (standardUsage[id].lessons.length > 0) {
covered.push(standardUsage[id]);
    } else {
gaps.push(standardUsage[id].standard);
    }
  }
return {
courseId: courseId,
totalStandards: allStandards.length,
coveredCount: covered.length,
gapCount: gaps.length,
coveragePercent: allStandards.length > 0 ? Math.round((covered.length / allStandards.length) * 100) : 0,
covered: covered,
gaps: gaps,
units: units
  };
}

// ============================================
// EXPORT
// ============================================
/**
 * Export unit report to Google Doc.
 * Returns the document URL.
 */
function exportUnitReportToDoc(unitId) {
  requireRole(['administrator', 'teacher']);
  const report = getUnitReport(unitId);
  if (!report || !report.unit) throw new Error('Unit not found');

  const doc = DocumentApp.create('Unit Report \u2014 ' + (report.unit.title || 'Untitled'));
  const body = doc.getBody();

  // Title
  body.appendParagraph(report.unit.title || 'Untitled Unit')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  // Overview info
  const infoItems = [];
  if (report.unit.status) infoItems.push('Status: ' + report.unit.status);
  if (report.map) infoItems.push('Map: ' + report.map.title + ' (' + report.map.hexCount + ' hexes)');
  infoItems.push('Lessons: ' + report.summary.totalLessons);
  infoItems.push('Standards: ' + report.summary.totalStandards);
  body.appendParagraph(infoItems.join(' | ')).setItalic(true);

  // Lesson Summary
  body.appendParagraph('Lesson Summary')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

  if (report.lessons.length > 0) {
    const table = body.appendTable();
    const headerRow = table.appendTableRow();
    ['#', 'Title', 'Duration', 'Hexes', 'Standards', 'Status'].forEach(function(h) {
      headerRow.appendTableCell(h).setBold(true);
    });
    report.lessons.forEach(function(l) {
      const row = table.appendTableRow();
      row.appendTableCell(String(l.sequence || ''));
      row.appendTableCell(l.title || '');
      row.appendTableCell(l.duration || '');
      row.appendTableCell(String(l.hexCount || 0));
      row.appendTableCell(String(l.standardCount || 0));
      row.appendTableCell(l.status || 'draft');
    });
  } else {
    body.appendParagraph('No lessons in this unit.').setItalic(true);
  }

  // Standards Summary
  body.appendParagraph('Standards Summary')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Total standards: ' + report.summary.totalStandards);
  body.appendParagraph('Hexes used: ' + report.summary.totalHexesUsed);

  if (report.summary.standards && report.summary.standards.length > 0) {
    body.appendParagraph('Linked Standards:')
      .setHeading(DocumentApp.ParagraphHeading.HEADING3);
    report.summary.standards.forEach(function(std) {
      const code = std.code || std.standardCode || std.standardId || '';
      const desc = std.description || std.standardText || '';
      body.appendListItem(code + (desc ? ' \u2014 ' + desc : ''));
    });
  }

  // Coverage detail
  if (report.coverage) {
    body.appendParagraph('Standards Coverage')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph('Coverage: ' + (report.coverage.coveragePercent || 0) + '%');
    if (report.coverage.gaps && report.coverage.gaps.length > 0) {
      body.appendParagraph('Gap Standards:')
        .setHeading(DocumentApp.ParagraphHeading.HEADING3);
      report.coverage.gaps.forEach(function(g) {
        const gCode = g.code || g.standardCode || g.standardId || '';
        const gDesc = g.description || g.standardText || '';
        body.appendListItem(gCode + (gDesc ? ' \u2014 ' + gDesc : ''));
      });
    }
  }

  return doc.getUrl();
}
