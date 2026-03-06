/**
 * Learning Map - Map Service
 *
 * Handles:
 * - Maps CRUD (Create, Read, Update, Delete)
 * - Hexes management with 12x12 grid snapping
 * - Edges (visual connectors between hexes)
 * - Grid size configuration
 * - Role-based access control
 *
 * @version 1.0.0
 */
// ============================================================================
// MAPS - CRUD OPERATIONS
// ============================================================================
/**
 * Get all maps (filtered by user role)
 *
 * Admin/Teacher: see all maps
 * Student: see only assigned maps
 *
 * @returns {Array<Object>} Array of map objects
 */
function getMaps() {
const user = getCurrentUser();
const allMaps = readAll_(SHEETS_.MAPS);
// Parse JSON fields
const mapsWithData = allMaps.map(m => parseMapFromRow_(m));
// Filter by role
return filterMapsByRole(mapsWithData);
}
/**
 * Get map by ID
 *
 * @param {string} mapId - Map ID
 * @returns {Object|null} Map object or null
 */
function getMapById(mapId) {
const map = findRow_(SHEETS_.MAPS, 'mapId', mapId);
if (!map) {
return null;
  }
// Check permissions
if (!canViewMap(mapId)) {
throw new Error('You do not have permission to view this map');
  }
return parseMapFromRow_(map);
}
/**
 * Save map (create or update)
 *
 * @param {Object} map - Map object
 * @returns {Object} Saved map object
 */
function saveMap(map) {
// Validate required fields
validateRequired_(map, ['title']);
// Check permissions
if (map.mapId && !canEditMap(map.mapId)) {
throw new Error('You do not have permission to edit this map');
  }
const user = getCurrentUser();
const now = now_();
// Set defaults
if (!map.mapId) {
map.mapId = generateMapId_();
map.createdAt = now;
map.teacherEmail = user.email;
  }
if (!map.gridRows) {
map.gridRows = getGridConfig_().rows;
  }
if (!map.gridCols) {
map.gridCols = getGridConfig_().cols;
  }
if (!map.hexes) {
map.hexes = [];
  }
if (!map.edges) {
map.edges = [];
  }
if (!map.ubdData) {
map.ubdData = {};
  }
if (!map.meta) {
map.meta = {};
  }
map.updatedAt = now;
// Convert to row format for database
const row = mapToRow_(map);
// Save
upsertRow_(SHEETS_.MAPS, 'mapId', row);
return map;
}
/**
 * Delete map
 *
 * @param {string} mapId - Map ID
 * @returns {boolean} True if deleted
 */
function deleteMap(mapId) {
// Check permissions
if (!canEditMap(mapId)) {
throw new Error('You do not have permission to delete this map');
  }

// Cascade delete linked lesson maps
const map = getMapById(mapId);
if (map && map.hexes) {
  map.hexes.forEach(hex => {
    if (hex.type === 'lesson' && hex.linkedMapId) {
      try {
        deleteMap(hex.linkedMapId);
      } catch (e) {
        console.log('Cascade delete lesson map ' + hex.linkedMapId + ' failed: ' + e.message);
      }
    }
  });
}

// Delete all associated data (cascade)
deleteRows_(SHEETS_.PROGRESS, 'mapId', mapId);
deleteRows_(SHEETS_.EDGES, 'mapId', mapId);
deleteRows_(SHEETS_.ASSESSMENT_RESPONSES, 'mapId', mapId);
deleteRows_(SHEETS_.FORMATIVE_CHECKS, 'mapId', mapId);
deleteRows_(SHEETS_.MAP_ASSIGNMENTS, 'mapId', mapId);
deleteRows_(SHEETS_.STUDENT_TASK_ORDER, 'mapId', mapId);
deleteRows_(SHEETS_.STUDENT_ACHIEVEMENTS, 'mapId', mapId);
deleteRows_(SHEETS_.ITERATION_HISTORY, 'mapId', mapId);
deleteRows_(SHEETS_.PEER_FEEDBACK, 'mapId', mapId);
deleteRows_(SHEETS_.STUDENT_CHOICES, 'mapId', mapId);
// Delete map
return deleteRow_(SHEETS_.MAPS, 'mapId', mapId);
}
/**
 * Duplicate map
 *
 * @param {string} sourceMapId - Source map ID
 * @param {string} newTitle - New map title
 * @returns {Object} New map object
 */
function duplicateMap(sourceMapId, newTitle) {
const sourceMap = getMapById(sourceMapId);
if (!sourceMap) {
throw new Error('Source map not found');
  }
// Create new map
const newMap = deepClone_(sourceMap);
newMap.mapId = generateMapId_();
newMap.title = newTitle;
newMap.createdAt = now_();
newMap.updatedAt = now_();
newMap.teacherEmail = getCurrentUser().email;
// Generate new IDs for hexes
newMap.hexes = newMap.hexes.map(hex => ({
    ...hex,
id: generateHexId_()
  }));
// Update edges to use new hex IDs
if (newMap.edges && newMap.edges.length > 0) {
const oldToNewHexIds = {};
sourceMap.hexes.forEach((oldHex, i) => {
oldToNewHexIds[oldHex.id] = newMap.hexes[i].id;
    });
newMap.edges = newMap.edges.map(edge => ({
      ...edge,
edgeId: generateEdgeId_(),
fromHexId: oldToNewHexIds[edge.fromHexId] || edge.fromHexId,
toHexId: oldToNewHexIds[edge.toHexId] || edge.toHexId
    }));
  }
// Update meta
newMap.meta = newMap.meta || {};
newMap.meta.description = `Copy of ${sourceMap.title}`;
newMap.meta.basedOnMapId = sourceMapId;
const savedMap = saveMap(newMap);

// Cascade duplicate linked lesson maps
const oldToNewHexMap = {};
sourceMap.hexes.forEach((oldHex, i) => {
  oldToNewHexMap[oldHex.id] = savedMap.hexes[i].id;
});

savedMap.hexes.forEach((hex, idx) => {
  const origHex = sourceMap.hexes[idx];
  if (origHex && origHex.type === 'lesson' && origHex.linkedMapId) {
    try {
      const childMap = duplicateMap(origHex.linkedMapId, `Copy of ${origHex.label || 'Lesson'} — Activities`);
      // Update the child map's parent references
      childMap.meta = childMap.meta || {};
      childMap.meta.parentMapId = savedMap.mapId;
      childMap.meta.parentHexId = hex.id;
      childMap.meta.isLessonMap = true;
      saveMap(childMap);
      // Update the new hex's linkedMapId
      hex.linkedMapId = childMap.mapId;
    } catch (e) {
      console.log('Cascade duplicate lesson map failed: ' + e.message);
    }
  }
});

// Re-save if any linkedMapIds were updated
const hasLinkedUpdates = savedMap.hexes.some(h => h.type === 'lesson' && h.linkedMapId);
if (hasLinkedUpdates) {
  saveMap(savedMap);
}

return savedMap;
}
/**
 * Create new blank map
 *
 * @param {string} title - Map title
 * @param {string} courseId - Course ID (optional)
 * @param {string} unitId - Unit ID (optional)
 * @returns {Object} New map object
 */
function createMap(title, courseId, unitId) {
const user = getCurrentUser();
const gridConfig = getGridConfig_();
const map = {
mapId: generateMapId_(),
title: title,
courseId: courseId || '',
unitId: unitId || '',
gridRows: gridConfig.rows,
gridCols: gridConfig.cols,
hexes: [],
edges: [],
ubdData: {},
meta: {
description: ''
    },
teacherEmail: user.email,
createdAt: now_(),
updatedAt: now_()
  };
return saveMap(map);
}

/**
 * Create a new map from a template definition (Teaching Methods tab)
 *
 * @param {Object} templateData - { title, hexes: [{label, type, row, col, designPhase, isCheckpoint}], edges: [{fromIndex, toIndex}] }
 * @returns {Object} The created map
 */
function createMapFromTemplate(templateData) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers can create maps from templates');
  if (!templateData || !templateData.title) throw new Error('Template title is required');

  const gridConfig = getGridConfig_();
  const hexes = [];
  const tplHexes = templateData.hexes || [];

  // Build hexes with generated IDs
  for (let i = 0; i < tplHexes.length; i++) {
    const h = tplHexes[i];
    hexes.push({
      id: generateHexId_(),
      label: String(h.label || 'Hex ' + (i + 1)).substring(0, 100),
      icon: '&#11042;',
      type: h.type || 'core',
      row: h.row || 1,
      col: h.col || 1,
      content: { type: 'text', url: '' },
      curriculum: {},
      designPhase: String(h.designPhase || ''),
      isCheckpoint: h.isCheckpoint === true
    });
  }

  // Build edges using hex array indices
  const edges = [];
  const tplEdges = templateData.edges || [];
  for (let j = 0; j < tplEdges.length; j++) {
    const e = tplEdges[j];
    const fromIdx = e.fromIndex;
    const toIdx = e.toIndex;
    if (fromIdx >= 0 && fromIdx < hexes.length && toIdx >= 0 && toIdx < hexes.length) {
      edges.push({
        edgeId: generateEdgeId_(),
        fromHexId: hexes[fromIdx].id,
        toHexId: hexes[toIdx].id,
        condition: { type: 'completion' }
      });
    }
  }

  const map = {
    mapId: generateMapId_(),
    title: String(templateData.title).substring(0, 200),
    courseId: '',
    unitId: '',
    gridRows: gridConfig.rows,
    gridCols: gridConfig.cols,
    hexes: hexes,
    edges: edges,
    ubdData: {},
    meta: { description: 'Created from template' },
    teacherEmail: user.email,
    createdAt: now_(),
    updatedAt: now_()
  };

  return saveMap(map);
}

// ============================================================================
// HEXES - CRUD OPERATIONS
// ============================================================================
/**
 * Add hex to map
 *
 * @param {string} mapId - Map ID
 * @param {Object} hex - Hex object
 * @returns {Object} Updated map
 */
function addHex(mapId, hex) {
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
if (!canEditMap(mapId)) {
throw new Error('You do not have permission to edit this map');
  }
// Validate required fields
validateRequired_(hex, ['label', 'icon', 'type', 'row', 'col']);
// Snap to grid
const snapped = snapToGrid_(hex.row, hex.col);
hex.row = snapped.row;
hex.col = snapped.col;
// Validate grid bounds
if (!isValidGridPosition_(hex.row, hex.col)) {
throw new Error(`Position (${hex.row}, ${hex.col}) is outside grid bounds`);
  }
// Set defaults
if (!hex.id) {
hex.id = generateHexId_();
  }
if (!hex.status) {
hex.status = '';
  }
if (!hex.size) {
hex.size = 'default';
  }
if (!hex.progress) {
hex.progress = 'not_started';
  }
if (!hex.curriculum) {
hex.curriculum = {};
  }
// Enforce maxHexesPerMap config
const maxHexes = parseInt(getConfigValue('maxHexesPerMap')) || 100;
if (map.hexes.length >= maxHexes) {
  throw new Error('Cannot add more hexes. Maximum is ' + maxHexes + ' per map. Adjust in Admin Settings.');
}
// Add to map
map.hexes.push(hex);
return saveMap(map);
}
/**
 * Update hex in map
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {Object} updates - Hex updates
 * @returns {Object} Updated map
 */
function updateHex(mapId, hexId, updates) {
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
if (!canEditMap(mapId)) {
throw new Error('You do not have permission to edit this map');
  }
const hexIndex = map.hexes.findIndex(h => h.id === hexId);
if (hexIndex === -1) {
throw new Error('Hex not found');
  }
// If position is being updated, snap to grid
if (updates.row !== undefined || updates.col !== undefined) {
const row = updates.row !== undefined ? updates.row : map.hexes[hexIndex].row;
const col = updates.col !== undefined ? updates.col : map.hexes[hexIndex].col;
const snapped = snapToGrid_(row, col);
updates.row = snapped.row;
updates.col = snapped.col;
// Validate grid bounds
if (!isValidGridPosition_(updates.row, updates.col)) {
throw new Error(`Position (${updates.row}, ${updates.col}) is outside grid bounds`);
    }
  }
// Update hex
map.hexes[hexIndex] = {
    ...map.hexes[hexIndex],
    ...updates
  };
return saveMap(map);
}
/**
 * Delete hex from map
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @returns {Object} Updated map
 */
function deleteHex(mapId, hexId) {
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
if (!canEditMap(mapId)) {
throw new Error('You do not have permission to edit this map');
  }
// Remove hex
map.hexes = map.hexes.filter(h => h.id !== hexId);
// Remove associated edges
map.edges = map.edges.filter(e =>
e.fromHexId !== hexId && e.toHexId !== hexId
  );
// Remove associated data (cascade) — single lock, reads all sheets once
batchDeleteRows_([
  { sheetName: SHEETS_.ASSESSMENT_RESPONSES, field: 'hexId', value: hexId },
  { sheetName: SHEETS_.FORMATIVE_CHECKS, field: 'hexId', value: hexId },
  { sheetName: SHEETS_.PROGRESS, field: 'hexId', value: hexId },
  { sheetName: SHEETS_.ITERATION_HISTORY, field: 'hexId', value: hexId },
  { sheetName: SHEETS_.PEER_FEEDBACK, field: 'hexId', value: hexId }
]);
return saveMap(map);
}
/**
 * Move hex to new position
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {number} row - New row
 * @param {number} col - New column
 * @returns {Object} Updated map
 */
function moveHex(mapId, hexId, row, col) {
return updateHex(mapId, hexId, {row: row, col: col});
}
// ============================================================================
// EDGES - CRUD OPERATIONS
// ============================================================================
/**
 * Add edge to map
 *
 * @param {string} mapId - Map ID
 * @param {Object} edge - Edge object
 * @returns {Object} Updated map
 */
function addEdge(mapId, edge) {
// Check if branching is enabled
if (getConfigValue('enableBranching') === 'false') {
  throw new Error('Branching is disabled. Enable it in Admin Settings to add connections.');
}
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
if (!canEditMap(mapId)) {
throw new Error('You do not have permission to edit this map');
  }
// Validate required fields
validateRequired_(edge, ['fromHexId', 'toHexId', 'type']);
// Verify hexes exist
const fromHex = map.hexes.find(h => h.id === edge.fromHexId);
const toHex = map.hexes.find(h => h.id === edge.toHexId);
if (!fromHex || !toHex) {
throw new Error('One or both hexes not found in map');
  }
// Set defaults
if (!edge.edgeId) {
edge.edgeId = generateEdgeId_();
  }
if (!edge.color) {
edge.color = '#3b82f6'; // Default blue
  }
if (!edge.thickness) {
edge.thickness = 2;
  }
if (!edge.style) {
edge.style = 'solid';
  }
if (!edge.label) {
edge.label = '';
  }
// Add to map
map.edges.push(edge);
return saveMap(map);
}
/**
 * Update edge in map
 *
 * @param {string} mapId - Map ID
 * @param {string} edgeId - Edge ID
 * @param {Object} updates - Edge updates
 * @returns {Object} Updated map
 */
function updateEdge(mapId, edgeId, updates) {
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
if (!canEditMap(mapId)) {
throw new Error('You do not have permission to edit this map');
  }
const edgeIndex = map.edges.findIndex(e => e.edgeId === edgeId);
if (edgeIndex === -1) {
throw new Error('Edge not found');
  }
// Update edge
map.edges[edgeIndex] = {
    ...map.edges[edgeIndex],
    ...updates
  };
return saveMap(map);
}
/**
 * Delete edge from map
 *
 * @param {string} mapId - Map ID
 * @param {string} edgeId - Edge ID
 * @returns {Object} Updated map
 */
function deleteEdge(mapId, edgeId) {
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
if (!canEditMap(mapId)) {
throw new Error('You do not have permission to edit this map');
  }
// Remove edge
map.edges = map.edges.filter(e => e.edgeId !== edgeId);
return saveMap(map);
}
/**
 * Get edges for a hex
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @returns {Array<Object>} Array of edges
 */
function getEdgesForHex(mapId, hexId) {
const map = getMapById(mapId);
if (!map) {
return [];
  }
return map.edges.filter(e =>
e.fromHexId === hexId || e.toHexId === hexId
  );
}
// ============================================================================
// GRID MANAGEMENT
// ============================================================================
/**
 * Set grid size for map
 *
 * @param {string} mapId - Map ID
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 * @returns {Object} Updated map
 */
function setMapGridSize(mapId, rows, cols) {
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
if (!canEditMap(mapId)) {
throw new Error('You do not have permission to edit this map');
  }
// Validate bounds
if (rows < GRID_CONFIG.minRows || rows > GRID_CONFIG.maxRows) {
throw new Error(`Rows must be between ${GRID_CONFIG.minRows} and ${GRID_CONFIG.maxRows}`);
  }
if (cols < GRID_CONFIG.minCols || cols > GRID_CONFIG.maxCols) {
throw new Error(`Columns must be between ${GRID_CONFIG.minCols} and ${GRID_CONFIG.maxCols}`);
  }
// Check if any hexes would be out of bounds
const outOfBounds = map.hexes.filter(h =>
h.row >= rows || h.col >= cols
  );
if (outOfBounds.length > 0) {
throw new Error(`Cannot shrink grid: ${outOfBounds.length} hex(es) would be out of bounds`);
  }
map.gridRows = rows;
map.gridCols = cols;
return saveMap(map);
}
/**
 * Get grid size for map
 *
 * @param {string} mapId - Map ID
 * @returns {Object} {rows, cols}
 */
function getMapGridSize(mapId) {
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
return {
rows: map.gridRows || GRID_CONFIG.defaultRows,
cols: map.gridCols || GRID_CONFIG.defaultCols
  };
}
// ============================================================================
// UBD DATA
// ============================================================================
/**
 * Get UbD data for map
 *
 * @param {string} mapId - Map ID
 * @returns {Object} UbD data
 */
function getUbdData(mapId) {
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
return migrateUbdData_(map.ubdData);
}
/**
 * Save UbD data for map
 *
 * @param {string} mapId - Map ID
 * @param {Object} ubdData - UbD data
 * @returns {Object} Updated map
 */
function saveUbdData(mapId, ubdData) {
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
if (!canEditMap(mapId)) {
throw new Error('You do not have permission to edit this map');
  }
map.ubdData = ubdData;
return saveMap(map);
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Parse map from database row
 * Converts JSON strings to objects
 *
 * @param {Object} row - Database row
 * @returns {Object} Map object
 */
function parseMapFromRow_(row) {
return {
mapId: row.mapId,
title: row.title,
courseId: row.courseId || '',
unitId: row.unitId || '',
gridRows: parseInt(row.gridRows) || GRID_CONFIG.defaultRows,
gridCols: parseInt(row.gridCols) || GRID_CONFIG.defaultCols,
hexes: safeJsonParse_(row.hexesJson, []),
edges: safeJsonParse_(row.edgesJson, []),
ubdData: migrateUbdData_(safeJsonParse_(row.ubdDataJson, {})),
meta: safeJsonParse_(row.metaJson, {}),
teacherEmail: row.teacherEmail,
createdAt: row.createdAt,
updatedAt: row.updatedAt
  };
}
/**
 * Convert map to database row
 * Converts objects to JSON strings
 *
 * @param {Object} map - Map object
 * @returns {Object} Database row
 */
function mapToRow_(map) {
return {
mapId: map.mapId,
title: map.title,
courseId: map.courseId || '',
unitId: map.unitId || '',
gridRows: map.gridRows || GRID_CONFIG.defaultRows,
gridCols: map.gridCols || GRID_CONFIG.defaultCols,
hexesJson: safeJsonStringify_(map.hexes, '[]'),
edgesJson: safeJsonStringify_(map.edges, '[]'),
ubdDataJson: safeJsonStringify_(map.ubdData, '{}'),
metaJson: safeJsonStringify_(map.meta, '{}'),
teacherEmail: map.teacherEmail,
createdAt: map.createdAt,
updatedAt: map.updatedAt
  };
}
// ============================================================================
// REPORTING & ANALYTICS
// ============================================================================
/**
 * Get map analytics
 *
 * @param {string} mapId - Map ID
 * @returns {Object} Analytics data
 */
function getMapAnalytics(mapId) {
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
// Count by type
const countsByType = {};
map.hexes.forEach(h => {
const type = h.type || 'core';
countsByType[type] = (countsByType[type] || 0) + 1;
  });
// Count linked vs unlinked
const linked = map.hexes.filter(h => h.linkUrl).length;
const unlinked = map.hexes.length - linked;
// Get unique standards
const standards = new Set();
map.hexes.forEach(h => {
if (h.curriculum && h.curriculum.standards) {
h.curriculum.standards.forEach(s => standards.add(s));
    }
  });
// Get student progress (if teacher/admin)
let progressData = null;
if (isTeacherOrAdmin()) {
const allProgress = findRows_(SHEETS_.PROGRESS, 'mapId', mapId);
const students = [...new Set(allProgress.map(p => p.email))];
progressData = {
totalStudents: students.length,
totalSubmissions: allProgress.length,
averageProgress: students.length > 0
        ? (allProgress.length / (students.length * map.hexes.length) * 100).toFixed(1)
        : 0
    };
  }
return {
totalHexes: map.hexes.length,
countsByType: countsByType,
linkedCount: linked,
unlinkedCount: unlinked,
totalEdges: map.edges.length,
uniqueStandards: standards.size,
gridSize: `${map.gridRows}x${map.gridCols}`,
hasUbdData: Object.keys(map.ubdData).length > 0,
progress: progressData
  };
}
// ============================================================================
// TEST FUNCTIONS
// ============================================================================
/**
 * Test creating a map
 */
function test_createMap() {
try {
const map = createMap('Test Map', '', '');
Logger.log('Created map:', map);
Logger.log('Map ID:', map.mapId);
Logger.log('Grid size:', map.gridRows + 'x' + map.gridCols);
  } catch (err) {
Logger.log('Error:', err.message);
  }
}
/**
 * Test adding hex
 */
function test_addHex() {
try {
// Get first map
const maps = getMaps();
if (maps.length === 0) {
Logger.log('No maps found. Create one first.');
return;
    }
const mapId = maps[0].mapId;
const hex = {
label: 'Test Hex',
icon: '🧪',
type: 'core',
row: 2,
col: 3
    };
const updatedMap = addHex(mapId, hex);
Logger.log('Added hex to map');
Logger.log('Total hexes:', updatedMap.hexes.length);
  } catch (err) {
Logger.log('Error:', err.message);
  }
}
/**
 * Test getting maps
 */
function test_getMaps() {
try {
const maps = getMaps();
Logger.log('Total maps:', maps.length);
if (maps.length > 0) {
Logger.log('First map:', maps[0].title);
Logger.log('Grid size:', maps[0].gridRows + 'x' + maps[0].gridCols);
Logger.log('Hexes:', maps[0].hexes.length);
Logger.log('Edges:', maps[0].edges.length);
    }
  } catch (err) {
Logger.log('Error:', err.message);
  }
}
/**
 * MISSING FUNCTIONS FIX
 * Add these functions to MapService.gs or UserService.gs
 *
 * These are permission check functions that MapService.gs is trying to call
 */
/**
 * Check if current user can edit a specific map
 * @param {string} mapId - The map ID to check
 * @returns {boolean} True if user can edit this map
 */
function canEditMap(mapId) {
try {
const user = getCurrentUser();
const role = (user.role || '').toLowerCase();
// Administrators can edit any map
if (role === 'administrator') {
return true;
    }
// Teachers can edit maps they created
if (role === 'teacher') {
// Get the map to check ownership
const map = getMapById(mapId);
if (!map) return false;
// Check if this teacher created the map
const teacherEmail = map.teacherEmail || (map.meta && map.meta.createdBy);
return teacherEmail === user.email;
    }
// Students cannot edit maps
return false;
  } catch (err) {
Logger.log('Error in canEditMap: ' + err.message);
return false;
  }
}
/**
 * Check if current user can create new maps
 * @returns {boolean} True if user can create maps
 */
function canCreateMap() {
try {
const user = getCurrentUser();
const role = (user.role || '').toLowerCase();
// Administrators and teachers can create maps
return role === 'administrator' || role === 'teacher';
  } catch (err) {
Logger.log('Error in canCreateMap: ' + err.message);
return false;
  }
}
/**
 * Check if current user can delete a specific map
 * @param {string} mapId - The map ID to check
 * @returns {boolean} True if user can delete this map
 */
function canDeleteMap(mapId) {
try {
const user = getCurrentUser();
const role = (user.role || '').toLowerCase();
// Administrators can delete any map
if (role === 'administrator') {
return true;
    }
// Teachers can delete maps they created
if (role === 'teacher') {
const map = getMapById(mapId);
if (!map) return false;
const teacherEmail = map.teacherEmail || (map.meta && map.meta.createdBy);
return teacherEmail === user.email;
    }
// Students cannot delete maps
return false;
  } catch (err) {
Logger.log('Error in canDeleteMap: ' + err.message);
return false;
  }
}
/**
 * Check if current user can view a specific map
 * @param {string} mapId - The map ID to check
 * @returns {boolean} True if user can view this map
 */
function canViewMap(mapId) {
try {
const user = getCurrentUser();
const role = (user.role || '').toLowerCase();
// Administrators can view any map
if (role === 'administrator') {
return true;
    }
// Teachers can view any map (for now)
if (role === 'teacher') {
return true;
    }
// Students can only view maps assigned to their classes
if (role === 'student') {
const studentEmail = user.email.toLowerCase();
// Filtered reads — only constructs objects for this student's roster entries
const rosterEntries = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { email: studentEmail });
const studentClasses = [];
for (let i = 0; i < rosterEntries.length; i++) {
  if (rosterEntries[i].status !== 'removed') {
    studentClasses.push(String(rosterEntries[i].classId));
  }
}
if (studentClasses.length === 0) {
  // Also check studentEmail column (backward compat)
  const rosterByStudentEmail = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { studentEmail: studentEmail });
  for (let i = 0; i < rosterByStudentEmail.length; i++) {
    if (rosterByStudentEmail[i].status !== 'removed') {
      studentClasses.push(String(rosterByStudentEmail[i].classId));
    }
  }
}
// Filtered read — only constructs objects for this map's assignments
const mapAssignments = findRowsFiltered_(SHEETS_.MAP_ASSIGNMENTS, { mapId: mapId });
for (let i = 0; i < mapAssignments.length; i++) {
  if (studentClasses.indexOf(String(mapAssignments[i].classId)) !== -1) {
    return true;
  }
}
return false;
    }
return false;
  } catch (err) {
Logger.log('Error in canViewMap: ' + err.message);
return false;
  }
}
/**
 * Test all permission functions
 */
function test_permissionFunctions() {
Logger.log('Testing permission functions...');
try {
const user = getCurrentUser();
Logger.log('Current user: ' + user.email + ' (' + user.role + ')');
// Test canCreateMap
const canCreate = canCreateMap();
Logger.log('canCreateMap: ' + canCreate);
// Test canEditMap with a fake map ID
const canEdit = canEditMap('test-map-123');
Logger.log('canEditMap(test-map-123): ' + canEdit);
// Test canDeleteMap
const canDelete = canDeleteMap('test-map-123');
Logger.log('canDeleteMap(test-map-123): ' + canDelete);
// Test canViewMap
const canView = canViewMap('test-map-123');
Logger.log('canViewMap(test-map-123): ' + canView);
Logger.log('All permission functions work!');
  } catch (err) {
Logger.log('Error testing permissions: ' + err.message);
Logger.log(err.stack);
  }
}