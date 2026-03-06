/**
 * StandardsService.gs - Curriculum Standards Management
 * Version: 1.0
 *
 * Manages the Standards and HexStandards (link) tables.
 * Provides CRUD operations and coverage analytics.
 */
// ============================================
// STANDARDS CRUD
// ============================================
/**
 * Get all standards, optionally filtered by framework or subject.
 */
function getStandards(filters) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('Standards');
if (!sheet || sheet.getLastRow() < 2) return [];
var data = sheet.getDataRange().getValues();
var headers = data[0];
var standards = [];
// Find column indices
var colIdx = {};
for (var h = 0; h < headers.length; h++) {
colIdx[headers[h]] = h;
  }
for (var i = 1; i < data.length; i++) {
var row = data[i];
var standard = rowToObject(row, headers);
// Skip inactive
if (standard.active === false) continue;
// Apply filters if provided
if (filters) {
if (filters.framework && standard.framework !== filters.framework) continue;
if (filters.subject && standard.subject !== filters.subject) continue;
if (filters.gradeLevel && standard.gradeLevel !== filters.gradeLevel) continue;
    }
standards.push(standard);
  }
return standards;
}
/**
 * Get a single standard by ID.
 */
function getStandardById(standardId) {
var standards = getStandards();
return standards.find(function(s) { return String(s.standardId) === String(standardId); }) || null;
}
/**
 * Create or update a standard.
 */
function saveStandard(standardData) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('Standards');
var lock = LockService.getScriptLock();
try {
lock.waitLock(30000);
var user = getCurrentUser();
if (!user.canEdit) {
throw new Error('Permission denied. Only teachers can manage standards.');
    }
var now = new Date().toISOString();
var data = sheet.getDataRange().getValues();
var headers = data[0];
// Find column indices
var colIdx = {};
for (var h = 0; h < headers.length; h++) {
colIdx[headers[h]] = h;
    }
var standardIdCol = colIdx['standardId'];
var rowIndex = -1;
// Check if updating existing
if (standardData.standardId) {
for (var i = 1; i < data.length; i++) {
if (data[i][standardIdCol] === standardData.standardId) {
rowIndex = i + 1;
break;
        }
      }
    }
// Build row data
var rowData = {};
rowData['standardId'] = standardData.standardId || ('std-' + Date.now());
rowData['framework'] = standardData.framework || 'Custom';
rowData['code'] = standardData.code || '';
rowData['description'] = standardData.description || '';
rowData['gradeLevel'] = standardData.gradeLevel || '';
rowData['subject'] = standardData.subject || '';
rowData['strand'] = standardData.strand || '';
rowData['active'] = standardData.active !== false;
var row = headers.map(function(h) { return rowData[h] !== undefined ? rowData[h] : ''; });
if (rowIndex > 0) {
sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
Logger.log('Updated standard: ' + rowData['standardId']);
    } else {
sheet.appendRow(row);
Logger.log('Created standard: ' + rowData['standardId']);
    }
return rowData;
  } finally {
lock.releaseLock();
  }
}
/**
 * Delete a standard (soft delete - sets active to false).
 */
function deleteStandard(standardId) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('Standards');
var lock = LockService.getScriptLock();
try {
lock.waitLock(30000);
var user = getCurrentUser();
if (!user.isAdmin) {
throw new Error('Permission denied. Only administrators can delete standards.');
    }
var data = sheet.getDataRange().getValues();
var headers = data[0];
var idCol = headers.indexOf('standardId');
var activeCol = headers.indexOf('active');
for (var i = 1; i < data.length; i++) {
if (data[i][idCol] === standardId) {
sheet.getRange(i + 1, activeCol + 1).setValue(false);
Logger.log('Deleted (soft) standard: ' + standardId);
return { success: true };
      }
    }
return { success: false, error: 'Standard not found' };
  } finally {
lock.releaseLock();
  }
}
/**
 * Bulk import standards from an array.
 */
function importStandards(standardsArray) {
var user = getCurrentUser();
if (!user.isAdmin) {
throw new Error('Permission denied. Only administrators can bulk import standards.');
  }
var imported = 0;
var skipped = 0;
for (var i = 0; i < standardsArray.length; i++) {
try {
// Check if standard with same code exists
var existing = getStandards({ framework: standardsArray[i].framework });
var duplicate = existing.find(function(s) {
return s.code === standardsArray[i].code;
      });
if (duplicate) {
skipped++;
continue;
      }
saveStandard(standardsArray[i]);
imported++;
    } catch (e) {
Logger.log('Error importing standard: ' + e.message);
skipped++;
    }
  }
return { imported: imported, skipped: skipped };
}
// ============================================
// HEX-STANDARDS LINKING
// ============================================
/**
 * Get all standards linked to a specific hex.
 */
function getStandardsForHex(mapId, hexId) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('HexStandards');
if (!sheet || sheet.getLastRow() < 2) return [];
var data = sheet.getDataRange().getValues();
var headers = data[0];
var links = [];
var mapIdCol = headers.indexOf('mapId');
var hexIdCol = headers.indexOf('hexId');
var standardIdCol = headers.indexOf('standardId');
for (var i = 1; i < data.length; i++) {
if (String(data[i][mapIdCol]) === String(mapId) && String(data[i][hexIdCol]) === String(hexId)) {
var standardId = data[i][standardIdCol];
var standard = getStandardById(standardId);
if (standard) {
links.push({
standardId: standardId,
standard: standard,
alignmentNotes: data[i][headers.indexOf('alignmentNotes')]
        });
      }
    }
  }
return links;
}
/**
 * Get all hexes linked to a specific standard (across all maps).
 */
function getHexesForStandard(standardId) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('HexStandards');
if (!sheet || sheet.getLastRow() < 2) return [];
var data = sheet.getDataRange().getValues();
var headers = data[0];
var hexes = [];
var standardIdCol = headers.indexOf('standardId');
var mapIdCol = headers.indexOf('mapId');
var hexIdCol = headers.indexOf('hexId');
for (var i = 1; i < data.length; i++) {
if (String(data[i][standardIdCol]) === String(standardId)) {
hexes.push({
mapId: data[i][mapIdCol],
hexId: data[i][hexIdCol],
alignmentNotes: data[i][headers.indexOf('alignmentNotes')]
      });
    }
  }
return hexes;
}
/**
 * Link a standard to a hex.
 */
function linkStandardToHex(mapId, hexId, standardId, alignmentNotes) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('HexStandards');
var lock = LockService.getScriptLock();
try {
lock.waitLock(30000);
var user = getCurrentUser();
if (!user.canEdit) {
throw new Error('Permission denied.');
    }
// Check if link already exists
var existing = getStandardsForHex(mapId, hexId);
var alreadyLinked = existing.find(function(l) { return String(l.standardId) === String(standardId); });
if (alreadyLinked) {
return { success: true, message: 'Already linked' };
    }
var now = new Date().toISOString();
// HexStandards schema: hexId, mapId, standardId, alignmentNotes, addedAt
sheet.appendRow([hexId, mapId, standardId, alignmentNotes || '', now]);
Logger.log('Linked standard ' + standardId + ' to hex ' + hexId);
return { success: true };
  } finally {
lock.releaseLock();
  }
}
/**
 * Unlink a standard from a hex.
 */
function unlinkStandardFromHex(mapId, hexId, standardId) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName('HexStandards');
var lock = LockService.getScriptLock();
try {
lock.waitLock(30000);
var user = getCurrentUser();
if (!user.canEdit) {
throw new Error('Permission denied.');
    }
var data = sheet.getDataRange().getValues();
var headers = data[0];
var mapIdCol = headers.indexOf('mapId');
var hexIdCol = headers.indexOf('hexId');
var standardIdCol = headers.indexOf('standardId');
for (var i = 1; i < data.length; i++) {
if (String(data[i][mapIdCol]) === String(mapId) &&
String(data[i][hexIdCol]) === String(hexId) &&
String(data[i][standardIdCol]) === String(standardId)) {
sheet.deleteRow(i + 1);
Logger.log('Unlinked standard ' + standardId + ' from hex ' + hexId);
return { success: true };
      }
    }
return { success: false, error: 'Link not found' };
  } finally {
lock.releaseLock();
  }
}
/**
 * Update alignment data (strength + notes) for an existing hex-standard link.
 */
function updateHexStandardAlignment(mapId, hexId, standardId, alignmentData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('HexStandards');
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var user = getCurrentUser();
    if (!user.canEdit) {
      throw new Error('Permission denied.');
    }
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var mapIdCol = headers.indexOf('mapId');
    var hexIdCol = headers.indexOf('hexId');
    var standardIdCol = headers.indexOf('standardId');
    var notesCol = headers.indexOf('alignmentNotes');

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][mapIdCol]) === String(mapId) &&
          String(data[i][hexIdCol]) === String(hexId) &&
          String(data[i][standardIdCol]) === String(standardId)) {
        sheet.getRange(i + 1, notesCol + 1).setValue(JSON.stringify(alignmentData));
        return { success: true };
      }
    }
    return { success: false, error: 'Link not found' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Get count of standards linked to each hex in a map (for badge rendering).
 * Returns { hexId1: 3, hexId2: 1, ... }
 */
function getHexStandardsCounts(mapId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('HexStandards');
  if (!sheet || sheet.getLastRow() < 2) return {};

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var mapIdCol = headers.indexOf('mapId');
  var hexIdCol = headers.indexOf('hexId');
  var counts = {};

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][mapIdCol]) === String(mapId)) {
      var hId = data[i][hexIdCol];
      counts[hId] = (counts[hId] || 0) + 1;
    }
  }
  return counts;
}

/**
 * Bulk link multiple standards to one hex. Skips already-linked.
 */
function bulkLinkStandardsToHex(mapId, hexId, standardIds, defaultStrength) {
  var user = getCurrentUser();
  if (!user.canEdit) {
    throw new Error('Permission denied.');
  }
  var linked = 0;
  var skipped = 0;
  var alignmentJson = JSON.stringify({ strength: defaultStrength || 'introduced', notes: '' });

  for (var i = 0; i < standardIds.length; i++) {
    var result = linkStandardToHex(mapId, hexId, standardIds[i], alignmentJson);
    if (result.message === 'Already linked') {
      skipped++;
    } else {
      linked++;
    }
  }
  return { linked: linked, skipped: skipped };
}

/**
 * Bulk link one standard to multiple hexes. Skips already-linked.
 */
function bulkLinkStandardToHexes(standardId, mapId, hexIds, defaultStrength) {
  var user = getCurrentUser();
  if (!user.canEdit) {
    throw new Error('Permission denied.');
  }
  var linked = 0;
  var skipped = 0;
  var alignmentJson = JSON.stringify({ strength: defaultStrength || 'introduced', notes: '' });

  for (var i = 0; i < hexIds.length; i++) {
    var result = linkStandardToHex(mapId, hexIds[i], standardId, alignmentJson);
    if (result.message === 'Already linked') {
      skipped++;
    } else {
      linked++;
    }
  }
  return { linked: linked, skipped: skipped };
}

/**
 * Get hexes in a map that have zero standards linked.
 */
function getUncoveredHexes(mapId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mapsSheet = ss.getSheetByName(SHEETS_.MAPS);
  if (!mapsSheet || mapsSheet.getLastRow() < 2) return [];

  // Find the map and its hexes
  var mapsData = mapsSheet.getDataRange().getValues();
  var mapsHeaders = mapsData[0];
  var mapIdCol = mapsHeaders.indexOf('mapId');
  var hexesJsonCol = mapsHeaders.indexOf('hexesJson');
  var hexes = [];

  for (var i = 1; i < mapsData.length; i++) {
    if (String(mapsData[i][mapIdCol]) === String(mapId)) {
      try {
        hexes = JSON.parse(mapsData[i][hexesJsonCol] || '[]');
      } catch (e) {
        hexes = [];
      }
      break;
    }
  }
  if (hexes.length === 0) return [];

  // Get standards counts for this map
  var counts = getHexStandardsCounts(mapId);

  // Filter to hexes with zero standards
  var uncovered = [];
  for (var h = 0; h < hexes.length; h++) {
    if (!counts[hexes[h].id]) {
      uncovered.push({
        id: hexes[h].id,
        title: hexes[h].title || 'Untitled',
        row: hexes[h].row,
        col: hexes[h].col,
        type: hexes[h].type || 'core'
      });
    }
  }
  return uncovered;
}

// ============================================
// COVERAGE ANALYTICS
// ============================================
/**
 * Get standards coverage report for a map or unit.
 * Returns which standards are covered and which have gaps.
 */
function getStandardsCoverage(mapId, filters) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var hexStandardsSheet = ss.getSheetByName('HexStandards');
// Get all relevant standards
var allStandards = getStandards(filters);
// Get all links for this map
var linkedStandardIds = [];
if (hexStandardsSheet && hexStandardsSheet.getLastRow() > 1) {
var data = hexStandardsSheet.getDataRange().getValues();
var headers = data[0];
var mapIdCol = headers.indexOf('mapId');
var standardIdCol = headers.indexOf('standardId');
var hexIdCol = headers.indexOf('hexId');
for (var i = 1; i < data.length; i++) {
if (String(data[i][mapIdCol]) === String(mapId)) {
linkedStandardIds.push({
standardId: data[i][standardIdCol],
hexId: data[i][hexIdCol]
        });
      }
    }
  }
// Build coverage report
var covered = [];
var gaps = [];
for (var j = 0; j < allStandards.length; j++) {
var std = allStandards[j];
var links = linkedStandardIds.filter(function(l) { return String(l.standardId) === String(std.standardId); });
if (links.length > 0) {
covered.push({
standard: std,
hexCount: links.length,
hexIds: links.map(function(l) { return l.hexId; })
      });
    } else {
gaps.push(std);
    }
  }
return {
totalStandards: allStandards.length,
coveredCount: covered.length,
gapCount: gaps.length,
coveragePercent: allStandards.length > 0 ? Math.round((covered.length / allStandards.length) * 100) : 0,
covered: covered,
gaps: gaps
  };
}
/**
 * Get standards coverage for an entire unit (across all lessons and map hexes).
 */
function getUnitStandardsCoverage(unitId) {
// Get the unit
var unit = getUnitById(unitId);
if (!unit) return null;
// Get coverage from the unit's map
var mapCoverage = unit.mapId ? getStandardsCoverage(unit.mapId) : null;
// Get lessons for this unit
var lessons = getLessonsForUnit(unitId);
// Combine lesson standards
var lessonStandardIds = [];
for (var i = 0; i < lessons.length; i++) {
if (lessons[i].standardIds) {
var ids = JSON.parse(lessons[i].standardIds);
lessonStandardIds = lessonStandardIds.concat(ids);
    }
  }
// Unique standards from lessons
var uniqueLessonStandards = [...new Set(lessonStandardIds)];
return {
unit: unit,
mapCoverage: mapCoverage,
lessonStandardCount: uniqueLessonStandards.length,
lessonCount: lessons.length
  };
}
// ============================================
// STANDARD SUBJECTS — Framework-to-Subject Mapping
// ============================================
const STANDARD_SUBJECTS = {
  'AP': ['AP Chemistry', 'AP Biology', 'AP Physics', 'AP Environmental Science'],
  'IB-MYP': ['MYP Sciences', 'MYP Design', 'MYP Individuals & Societies', 'MYP Mathematics'],
  'NGSS': ['Physical Science', 'Life Science', 'Earth & Space Science'],
  'CCSS': ['Mathematics', 'English Language Arts'],
  'Custom': []
};

/**
 * Get available subjects per framework.
 * @returns {Object} Map of framework → subject array
 */
function getStandardSubjects() {
  return STANDARD_SUBJECTS;
}

// ============================================
// SEED DATA - Common Standards Frameworks
// ============================================
/**
 * Seed initial standards data (call from setup or manually).
 */
function seedCommonStandards() {
  const user = getCurrentUser();
  if (!user.isAdmin) {
    throw new Error('Permission denied. Only administrators can seed standards.');
  }
  const standards = [
    // ---- NGSS: Physical Science ----
    { framework: 'NGSS', code: 'HS-PS1-1', subject: 'Physical Science', gradeLevel: 'High School', strand: 'Matter and Its Interactions', description: 'Use the periodic table as a model to predict the relative properties of elements' },
    { framework: 'NGSS', code: 'HS-PS1-2', subject: 'Physical Science', gradeLevel: 'High School', strand: 'Matter and Its Interactions', description: 'Construct and revise an explanation for the outcome of a simple chemical reaction' },
    { framework: 'NGSS', code: 'HS-PS2-1', subject: 'Physical Science', gradeLevel: 'High School', strand: 'Motion and Stability', description: 'Analyze data to support the claim that Newton\'s second law of motion describes the relationship among forces and motion' },
    // ---- NGSS: Life Science ----
    { framework: 'NGSS', code: 'HS-LS1-1', subject: 'Life Science', gradeLevel: 'High School', strand: 'From Molecules to Organisms', description: 'Construct an explanation based on evidence for how the structure of DNA determines the structure of proteins' },
    { framework: 'NGSS', code: 'HS-LS2-1', subject: 'Life Science', gradeLevel: 'High School', strand: 'Ecosystems', description: 'Use mathematical and computational representations to support explanations of ecosystem dynamics' },
    { framework: 'NGSS', code: 'HS-LS4-1', subject: 'Life Science', gradeLevel: 'High School', strand: 'Biological Evolution', description: 'Communicate scientific information that common ancestry and biological evolution are supported by evidence' },
    // ---- NGSS: Earth & Space Science ----
    { framework: 'NGSS', code: 'HS-ESS1-1', subject: 'Earth & Space Science', gradeLevel: 'High School', strand: 'Earth\'s Place in the Universe', description: 'Develop a model based on evidence to illustrate the life span of the sun' },
    { framework: 'NGSS', code: 'HS-ESS2-1', subject: 'Earth & Space Science', gradeLevel: 'High School', strand: 'Earth\'s Systems', description: 'Develop a model to illustrate how Earth\'s internal and surface processes operate at different spatial and temporal scales' },
    { framework: 'NGSS', code: 'HS-ESS3-1', subject: 'Earth & Space Science', gradeLevel: 'High School', strand: 'Earth and Human Activity', description: 'Construct an explanation based on evidence for how the availability of natural resources has influenced human activity' },

    // ---- CCSS: Mathematics ----
    { framework: 'CCSS', code: 'HSN-RN.A.1', subject: 'Mathematics', gradeLevel: 'High School', strand: 'Number & Quantity', description: 'Explain how the definition of the meaning of rational exponents follows from extending the properties' },
    { framework: 'CCSS', code: 'HSA-CED.A.1', subject: 'Mathematics', gradeLevel: 'High School', strand: 'Algebra', description: 'Create equations and inequalities in one variable and use them to solve problems' },
    { framework: 'CCSS', code: 'HSF-IF.B.4', subject: 'Mathematics', gradeLevel: 'High School', strand: 'Functions', description: 'For a function that models a relationship between two quantities, interpret key features of graphs and tables' },
    // ---- CCSS: English Language Arts ----
    { framework: 'CCSS', code: 'RST.9-10.1', subject: 'English Language Arts', gradeLevel: 'Grades 9-10', strand: 'Reading', description: 'Cite specific textual evidence to support analysis of science and technical texts' },
    { framework: 'CCSS', code: 'WHST.9-10.2', subject: 'English Language Arts', gradeLevel: 'Grades 9-10', strand: 'Writing', description: 'Write informative/explanatory texts, including the narration of scientific procedures' },

    // ---- IB-MYP: Sciences ----
    { framework: 'IB-MYP', code: 'MYP.SCI.A', subject: 'MYP Sciences', gradeLevel: 'MYP', strand: 'Knowing and Understanding', description: 'Explain scientific knowledge' },
    { framework: 'IB-MYP', code: 'MYP.SCI.B', subject: 'MYP Sciences', gradeLevel: 'MYP', strand: 'Inquiring and Designing', description: 'Explain a problem or question to be tested by a scientific investigation' },
    { framework: 'IB-MYP', code: 'MYP.SCI.C', subject: 'MYP Sciences', gradeLevel: 'MYP', strand: 'Processing and Evaluating', description: 'Present collected and transformed data' },
    { framework: 'IB-MYP', code: 'MYP.SCI.D', subject: 'MYP Sciences', gradeLevel: 'MYP', strand: 'Reflecting on Impacts', description: 'Explain the ways in which science is applied and used to address a specific problem or issue' },
    // ---- IB-MYP: Design ----
    { framework: 'IB-MYP', code: 'MYP.DES.A', subject: 'MYP Design', gradeLevel: 'MYP', strand: 'Inquiring and Analysing', description: 'Explain and justify the need for a solution to a problem' },
    { framework: 'IB-MYP', code: 'MYP.DES.B', subject: 'MYP Design', gradeLevel: 'MYP', strand: 'Developing Ideas', description: 'Develop a design specification which outlines the success criteria for the design of a solution' },
    { framework: 'IB-MYP', code: 'MYP.DES.C', subject: 'MYP Design', gradeLevel: 'MYP', strand: 'Creating the Solution', description: 'Construct a logical plan, which outlines the efficient use of time and resources' },
    { framework: 'IB-MYP', code: 'MYP.DES.D', subject: 'MYP Design', gradeLevel: 'MYP', strand: 'Evaluating', description: 'Design testing methods to evaluate the solution against the design specification' },
    // ---- IB-MYP: Individuals & Societies ----
    { framework: 'IB-MYP', code: 'MYP.IS.A', subject: 'MYP Individuals & Societies', gradeLevel: 'MYP', strand: 'Knowing and Understanding', description: 'Use terminology and concepts accurately' },
    { framework: 'IB-MYP', code: 'MYP.IS.B', subject: 'MYP Individuals & Societies', gradeLevel: 'MYP', strand: 'Investigating', description: 'Formulate a clear and focused research question and justify its relevance' },
    { framework: 'IB-MYP', code: 'MYP.IS.C', subject: 'MYP Individuals & Societies', gradeLevel: 'MYP', strand: 'Communicating', description: 'Communicate information and ideas effectively using an appropriate style' },
    { framework: 'IB-MYP', code: 'MYP.IS.D', subject: 'MYP Individuals & Societies', gradeLevel: 'MYP', strand: 'Thinking Critically', description: 'Discuss concepts, issues, models and arguments' },
    // ---- IB-MYP: Mathematics ----
    { framework: 'IB-MYP', code: 'MYP.MATH.A', subject: 'MYP Mathematics', gradeLevel: 'MYP', strand: 'Knowing and Understanding', description: 'Select and apply mathematical problem-solving techniques' },
    { framework: 'IB-MYP', code: 'MYP.MATH.B', subject: 'MYP Mathematics', gradeLevel: 'MYP', strand: 'Investigating Patterns', description: 'Select and apply mathematical problem-solving techniques to discover complex patterns' },
    { framework: 'IB-MYP', code: 'MYP.MATH.C', subject: 'MYP Mathematics', gradeLevel: 'MYP', strand: 'Communicating', description: 'Use appropriate mathematical language and notation' },
    { framework: 'IB-MYP', code: 'MYP.MATH.D', subject: 'MYP Mathematics', gradeLevel: 'MYP', strand: 'Applying Mathematics', description: 'Identify relevant elements of authentic real-life situations' },

    // ---- AP: Chemistry ----
    { framework: 'AP', code: 'AP.CHEM.1', subject: 'AP Chemistry', gradeLevel: 'AP', strand: 'Atomic Structure', description: 'Explain the relationship between atomic structure, periodicity, and chemical properties' },
    { framework: 'AP', code: 'AP.CHEM.2', subject: 'AP Chemistry', gradeLevel: 'AP', strand: 'Bonding', description: 'Explain how atoms bond to form molecules and predict molecular geometry' },
    { framework: 'AP', code: 'AP.CHEM.3', subject: 'AP Chemistry', gradeLevel: 'AP', strand: 'Reactions', description: 'Represent chemical reactions using balanced equations and predict reaction products' },
    { framework: 'AP', code: 'AP.CHEM.4', subject: 'AP Chemistry', gradeLevel: 'AP', strand: 'Kinetics', description: 'Explain how reaction rates are influenced by concentration, temperature, and catalysts' },
    { framework: 'AP', code: 'AP.CHEM.5', subject: 'AP Chemistry', gradeLevel: 'AP', strand: 'Thermodynamics', description: 'Apply thermodynamic principles to predict the spontaneity and direction of chemical processes' },
    { framework: 'AP', code: 'AP.CHEM.6', subject: 'AP Chemistry', gradeLevel: 'AP', strand: 'Equilibrium', description: 'Explain how systems at equilibrium respond to external stresses' },
    // ---- AP: Biology ----
    { framework: 'AP', code: 'AP.BIO.1', subject: 'AP Biology', gradeLevel: 'AP', strand: 'Evolution', description: 'Explain how natural selection leads to evolution of populations' },
    { framework: 'AP', code: 'AP.BIO.2', subject: 'AP Biology', gradeLevel: 'AP', strand: 'Cellular Processes', description: 'Explain how cells maintain homeostasis through membrane transport and signaling' },
    { framework: 'AP', code: 'AP.BIO.3', subject: 'AP Biology', gradeLevel: 'AP', strand: 'Genetics', description: 'Explain how genetic information is transmitted from parent to offspring' },
    { framework: 'AP', code: 'AP.BIO.4', subject: 'AP Biology', gradeLevel: 'AP', strand: 'Ecology', description: 'Explain how energy flows through and matter cycles within ecosystems' },
    { framework: 'AP', code: 'AP.BIO.5', subject: 'AP Biology', gradeLevel: 'AP', strand: 'Energy', description: 'Describe the role of cellular respiration and photosynthesis in energy conversion' },
    { framework: 'AP', code: 'AP.BIO.6', subject: 'AP Biology', gradeLevel: 'AP', strand: 'Interactions', description: 'Explain how organisms interact with each other and their environment' },
    // ---- AP: Physics ----
    { framework: 'AP', code: 'AP.PHY.1', subject: 'AP Physics', gradeLevel: 'AP', strand: 'Kinematics', description: 'Describe motion in terms of displacement, velocity, and acceleration' },
    { framework: 'AP', code: 'AP.PHY.2', subject: 'AP Physics', gradeLevel: 'AP', strand: 'Forces', description: 'Apply Newton\'s laws to analyze the motion of objects and systems' },
    { framework: 'AP', code: 'AP.PHY.3', subject: 'AP Physics', gradeLevel: 'AP', strand: 'Energy', description: 'Apply conservation of energy principles to analyze physical situations' },
    { framework: 'AP', code: 'AP.PHY.4', subject: 'AP Physics', gradeLevel: 'AP', strand: 'Waves', description: 'Explain the properties and behavior of mechanical and electromagnetic waves' },
    { framework: 'AP', code: 'AP.PHY.5', subject: 'AP Physics', gradeLevel: 'AP', strand: 'Electricity', description: 'Analyze electric circuits and the relationships between charge, current, and voltage' },
    // ---- AP: Environmental Science ----
    { framework: 'AP', code: 'AP.ENV.1', subject: 'AP Environmental Science', gradeLevel: 'AP', strand: 'Ecosystems', description: 'Describe the flow of energy and cycling of matter within ecosystems' },
    { framework: 'AP', code: 'AP.ENV.2', subject: 'AP Environmental Science', gradeLevel: 'AP', strand: 'Biodiversity', description: 'Explain the importance of biodiversity and the effects of habitat loss' },
    { framework: 'AP', code: 'AP.ENV.3', subject: 'AP Environmental Science', gradeLevel: 'AP', strand: 'Pollution', description: 'Analyze the sources, effects, and methods of reducing air, water, and soil pollution' },
    { framework: 'AP', code: 'AP.ENV.4', subject: 'AP Environmental Science', gradeLevel: 'AP', strand: 'Resources', description: 'Evaluate the sustainability of natural resource extraction and use' },
    { framework: 'AP', code: 'AP.ENV.5', subject: 'AP Environmental Science', gradeLevel: 'AP', strand: 'Climate', description: 'Explain the causes and consequences of global climate change' }
  ];
  return importStandards(standards);
}
