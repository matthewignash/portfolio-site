// ============================================================================
// DIFFERENTIATION SERVICE
// Group-based learning path differentiation. Teachers create groups within
// classes, assign students to groups, and assign hexes to groups. Students
// see only hexes assigned to their group(s) or individually to them.
// ============================================================================

const VALID_GROUP_COLORS_ = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const MAX_GROUPS_PER_CLASS_ = 20;
const MAX_GROUP_NAME_ = 100;
const MAX_GROUP_DESC_ = 200;

// ============================================================================
// GROUP CRUD
// ============================================================================

/**
 * Get all differentiation groups for a class.
 * Returns class-wide groups + map-specific groups.
 *
 * @param {string} classId - Class ID
 * @returns {Array<Object>} Group objects
 */
function getClassGroups(classId) {
  requireRole(['administrator', 'teacher']);
  if (!classId) throw new Error('Class ID is required');

  const user = getCurrentUser();
  const cls = getClassById(classId);
  if (!cls) throw new Error('Class not found');
  if (!user.isAdmin && cls.teacherEmail !== user.email) {
    throw new Error('Permission denied: you do not own this class');
  }

  const allGroups = readAll_(SHEETS_.DIFFERENTIATION_GROUPS);
  const result = [];
  for (let i = 0; i < allGroups.length; i++) {
    if (String(allGroups[i].classId) === String(classId)) {
      result.push(allGroups[i]);
    }
  }
  return result;
}

/**
 * Create a new differentiation group.
 *
 * @param {string} classId - Class ID
 * @param {string|null} mapId - Map ID (null for class-wide)
 * @param {string} name - Group name (max 100 chars)
 * @param {string} color - Hex color from preset list
 * @param {string} description - Group description (max 200 chars)
 * @returns {Object} Created group
 */
function createGroup(classId, mapId, name, color, description) {
  requireRole(['administrator', 'teacher']);
  if (!classId) throw new Error('Class ID is required');
  if (!name || String(name).trim().length === 0) throw new Error('Group name is required');

  const user = getCurrentUser();
  const cls = getClassById(classId);
  if (!cls) throw new Error('Class not found');
  if (!user.isAdmin && cls.teacherEmail !== user.email) {
    throw new Error('Permission denied: you do not own this class');
  }

  const trimName = String(name).trim();
  if (trimName.length > MAX_GROUP_NAME_) throw new Error('Group name must be ' + MAX_GROUP_NAME_ + ' characters or fewer');

  const trimDesc = description ? String(description).trim() : '';
  if (trimDesc.length > MAX_GROUP_DESC_) throw new Error('Description must be ' + MAX_GROUP_DESC_ + ' characters or fewer');

  const safeColor = VALID_GROUP_COLORS_.indexOf(color) >= 0 ? color : VALID_GROUP_COLORS_[0];

  // Check group limit
  const existing = getClassGroups(classId);
  if (existing.length >= MAX_GROUPS_PER_CLASS_) {
    throw new Error('Maximum ' + MAX_GROUPS_PER_CLASS_ + ' groups per class');
  }

  const group = {
    groupId: generateGroupId_(),
    classId: String(classId),
    mapId: mapId ? String(mapId) : '',
    groupName: trimName,
    groupColor: safeColor,
    groupDescription: trimDesc,
    isDefault: 'false',
    createdBy: user.email,
    createdAt: now_(),
    updatedAt: now_()
  };

  appendRow_(SHEETS_.DIFFERENTIATION_GROUPS, group);
  return group;
}

/**
 * Update an existing group.
 *
 * @param {string} groupId - Group ID
 * @param {Object} updates - { groupName, groupColor, groupDescription }
 * @returns {boolean} True if updated
 */
function updateGroup(groupId, updates) {
  requireRole(['administrator', 'teacher']);
  if (!groupId) throw new Error('Group ID is required');

  const group = findRow_(SHEETS_.DIFFERENTIATION_GROUPS, 'groupId', groupId);
  if (!group) throw new Error('Group not found');

  const user = getCurrentUser();
  const cls = getClassById(group.classId);
  if (!user.isAdmin && cls && cls.teacherEmail !== user.email) {
    throw new Error('Permission denied');
  }

  const fieldUpdates = { updatedAt: now_() };

  if (updates.groupName !== undefined) {
    const trimName = String(updates.groupName).trim();
    if (trimName.length === 0) throw new Error('Group name cannot be empty');
    if (trimName.length > MAX_GROUP_NAME_) throw new Error('Group name must be ' + MAX_GROUP_NAME_ + ' characters or fewer');
    fieldUpdates.groupName = trimName;
  }
  if (updates.groupColor !== undefined) {
    fieldUpdates.groupColor = VALID_GROUP_COLORS_.indexOf(updates.groupColor) >= 0 ? updates.groupColor : group.groupColor;
  }
  if (updates.groupDescription !== undefined) {
    const trimDesc = String(updates.groupDescription).trim();
    if (trimDesc.length > MAX_GROUP_DESC_) throw new Error('Description must be ' + MAX_GROUP_DESC_ + ' characters or fewer');
    fieldUpdates.groupDescription = trimDesc;
  }

  return updateRow_(SHEETS_.DIFFERENTIATION_GROUPS, 'groupId', groupId, fieldUpdates);
}

/**
 * Delete a group and cascade-delete memberships + hex assignments.
 *
 * @param {string} groupId - Group ID
 * @returns {boolean} True if deleted
 */
function deleteGroup(groupId) {
  requireRole(['administrator', 'teacher']);
  if (!groupId) throw new Error('Group ID is required');

  const group = findRow_(SHEETS_.DIFFERENTIATION_GROUPS, 'groupId', groupId);
  if (!group) throw new Error('Group not found');
  if (String(group.isDefault) === 'true') throw new Error('Cannot delete the default group');

  const user = getCurrentUser();
  const cls = getClassById(group.classId);
  if (!user.isAdmin && cls && cls.teacherEmail !== user.email) {
    throw new Error('Permission denied');
  }

  // Cascade delete memberships
  deleteRows_(SHEETS_.GROUP_MEMBERSHIPS, 'groupId', groupId);
  // Cascade delete hex assignments
  deleteRows_(SHEETS_.HEX_ASSIGNMENTS, 'groupId', groupId);
  // Delete the group
  return deleteRow_(SHEETS_.DIFFERENTIATION_GROUPS, 'groupId', groupId);
}

// ============================================================================
// MEMBERSHIP CRUD
// ============================================================================

/**
 * Get all members of a group.
 *
 * @param {string} groupId - Group ID
 * @returns {Array<Object>} Membership objects
 */
function getGroupMembers(groupId) {
  requireRole(['administrator', 'teacher']);
  if (!groupId) throw new Error('Group ID is required');
  return findRows_(SHEETS_.GROUP_MEMBERSHIPS, 'groupId', groupId);
}

/**
 * Batch-replace all members of a group.
 * Validates emails against class roster.
 *
 * @param {string} groupId - Group ID
 * @param {Array<string>} studentEmails - Student email list
 * @returns {Object} { added: number }
 */
function setGroupMembers(groupId, studentEmails) {
  requireRole(['administrator', 'teacher']);
  if (!groupId) throw new Error('Group ID is required');

  const group = findRow_(SHEETS_.DIFFERENTIATION_GROUPS, 'groupId', groupId);
  if (!group) throw new Error('Group not found');

  const user = getCurrentUser();
  const cls = getClassById(group.classId);
  if (!user.isAdmin && cls && cls.teacherEmail !== user.email) {
    throw new Error('Permission denied');
  }

  // Validate emails against class roster
  const roster = getClassRoster(group.classId);
  const validEmails = {};
  for (let i = 0; i < roster.length; i++) {
    if (roster[i].status !== 'removed') {
      validEmails[String(roster[i].email || roster[i].studentEmail).toLowerCase()] = true;
    }
  }

  const emails = studentEmails || [];
  const filtered = [];
  for (let i = 0; i < emails.length; i++) {
    const e = String(emails[i]).trim().toLowerCase();
    if (e && validEmails[e]) filtered.push(e);
  }

  // Delete existing memberships for this group
  deleteRows_(SHEETS_.GROUP_MEMBERSHIPS, 'groupId', groupId);

  // Insert new memberships
  const now = now_();
  for (let i = 0; i < filtered.length; i++) {
    appendRow_(SHEETS_.GROUP_MEMBERSHIPS, {
      membershipId: generateGroupMembershipId_(),
      groupId: groupId,
      studentEmail: filtered[i],
      addedBy: user.email,
      addedAt: now
    });
  }

  return { added: filtered.length };
}

/**
 * Add a single student to a group.
 *
 * @param {string} groupId - Group ID
 * @param {string} studentEmail - Student email
 * @returns {Object} Created membership
 */
function addStudentToGroup(groupId, studentEmail) {
  requireRole(['administrator', 'teacher']);
  if (!groupId || !studentEmail) throw new Error('Group ID and student email are required');

  const group = findRow_(SHEETS_.DIFFERENTIATION_GROUPS, 'groupId', groupId);
  if (!group) throw new Error('Group not found');

  const user = getCurrentUser();
  const cls = getClassById(group.classId);
  if (!user.isAdmin && cls && cls.teacherEmail !== user.email) {
    throw new Error('Permission denied');
  }

  const email = String(studentEmail).trim().toLowerCase();

  // Check not already a member
  const existing = findRows_(SHEETS_.GROUP_MEMBERSHIPS, 'groupId', groupId);
  for (let i = 0; i < existing.length; i++) {
    if (String(existing[i].studentEmail).toLowerCase() === email) {
      return existing[i]; // Already a member
    }
  }

  const membership = {
    membershipId: generateGroupMembershipId_(),
    groupId: groupId,
    studentEmail: email,
    addedBy: user.email,
    addedAt: now_()
  };
  appendRow_(SHEETS_.GROUP_MEMBERSHIPS, membership);
  return membership;
}

/**
 * Remove a student from a group.
 *
 * @param {string} groupId - Group ID
 * @param {string} studentEmail - Student email
 * @returns {boolean} True if removed
 */
function removeStudentFromGroup(groupId, studentEmail) {
  requireRole(['administrator', 'teacher']);
  if (!groupId || !studentEmail) throw new Error('Group ID and student email are required');

  const group = findRow_(SHEETS_.DIFFERENTIATION_GROUPS, 'groupId', groupId);
  if (!group) throw new Error('Group not found');

  const user = getCurrentUser();
  const cls = getClassById(group.classId);
  if (!user.isAdmin && cls && cls.teacherEmail !== user.email) {
    throw new Error('Permission denied');
  }

  const email = String(studentEmail).trim().toLowerCase();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const all = readAll_(SHEETS_.GROUP_MEMBERSHIPS);
    const filtered = all.filter(function(r) {
      return !(String(r.groupId) === String(groupId) && String(r.studentEmail).toLowerCase() === email);
    });
    if (filtered.length < all.length) {
      writeAll_(SHEETS_.GROUP_MEMBERSHIPS, filtered);
      return true;
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// HEX ASSIGNMENT CRUD
// ============================================================================

/**
 * Get all hex assignments for a map (group-level + student overrides).
 *
 * @param {string} mapId - Map ID
 * @returns {Array<Object>} Assignment objects
 */
function getHexAssignments(mapId) {
  requireRole(['administrator', 'teacher']);
  if (!mapId) throw new Error('Map ID is required');
  return findRows_(SHEETS_.HEX_ASSIGNMENTS, 'mapId', mapId);
}

/**
 * Set which groups a hex is assigned to (batch replace for that hex).
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {Array<Object>} groupAssignments - [{groupId, isRequired}]
 * @returns {Object} { count: number }
 */
function setHexGroups(mapId, hexId, groupAssignments) {
  requireRole(['administrator', 'teacher']);
  if (!mapId || !hexId) throw new Error('Map ID and hex ID are required');

  const user = getCurrentUser();
  const now = now_();

  // Delete existing group-level assignments for this hex (not student overrides)
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const all = readAll_(SHEETS_.HEX_ASSIGNMENTS);
    const filtered = all.filter(function(r) {
      // Keep rows that are NOT (this mapId + this hexId + group-level)
      return !(String(r.mapId) === String(mapId) && String(r.hexId) === String(hexId) && r.groupId && !r.studentEmail);
    });
    writeAll_(SHEETS_.HEX_ASSIGNMENTS, filtered);
  } finally {
    lock.releaseLock();
  }

  // Insert new group assignments
  const assignments = groupAssignments || [];
  for (let i = 0; i < assignments.length; i++) {
    if (!assignments[i].groupId) continue;
    appendRow_(SHEETS_.HEX_ASSIGNMENTS, {
      assignmentId: generateHexAssignmentId_(),
      mapId: String(mapId),
      hexId: String(hexId),
      groupId: String(assignments[i].groupId),
      studentEmail: '',
      isRequired: assignments[i].isRequired ? 'true' : 'false',
      addedBy: user.email,
      addedAt: now
    });
  }

  return { count: assignments.length };
}

/**
 * Set a per-student hex override (show/hide + required).
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {string} studentEmail - Student email
 * @param {string} visibility - 'show' or 'hide'
 * @param {boolean} isRequired - Whether hex is required
 * @returns {Object} Created/updated override
 */
function setStudentHexOverride(mapId, hexId, studentEmail, visibility, isRequired) {
  requireRole(['administrator', 'teacher']);
  if (!mapId || !hexId || !studentEmail) throw new Error('Map ID, hex ID, and student email are required');
  if (visibility !== 'show' && visibility !== 'hide') throw new Error('Visibility must be "show" or "hide"');

  const user = getCurrentUser();
  const email = String(studentEmail).trim().toLowerCase();

  // Remove existing override for this student+hex if any
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const all = readAll_(SHEETS_.HEX_ASSIGNMENTS);
    const filtered = all.filter(function(r) {
      return !(String(r.mapId) === String(mapId) && String(r.hexId) === String(hexId) &&
               String(r.studentEmail).toLowerCase() === email && !r.groupId);
    });
    writeAll_(SHEETS_.HEX_ASSIGNMENTS, filtered);
  } finally {
    lock.releaseLock();
  }

  const override = {
    assignmentId: generateHexAssignmentId_(),
    mapId: String(mapId),
    hexId: String(hexId),
    groupId: '',
    studentEmail: email,
    // Encode visibility in isRequired: 'show_true', 'show_false', 'hide_true', 'hide_false'
    isRequired: visibility + '_' + (isRequired ? 'true' : 'false'),
    addedBy: user.email,
    addedAt: now_()
  };

  appendRow_(SHEETS_.HEX_ASSIGNMENTS, override);
  return override;
}

/**
 * Remove a per-student hex override.
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {string} studentEmail - Student email
 * @returns {boolean} True if removed
 */
function removeStudentHexOverride(mapId, hexId, studentEmail) {
  requireRole(['administrator', 'teacher']);
  if (!mapId || !hexId || !studentEmail) throw new Error('Map ID, hex ID, and student email are required');

  const email = String(studentEmail).trim().toLowerCase();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const all = readAll_(SHEETS_.HEX_ASSIGNMENTS);
    const filtered = all.filter(function(r) {
      return !(String(r.mapId) === String(mapId) && String(r.hexId) === String(hexId) &&
               String(r.studentEmail).toLowerCase() === email && !r.groupId);
    });
    if (filtered.length < all.length) {
      writeAll_(SHEETS_.HEX_ASSIGNMENTS, filtered);
      return true;
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// VISIBILITY COMPUTATION
// ============================================================================

/**
 * Compute which hexes a student can see for a given map.
 * Called on student map load.
 *
 * @param {string} mapId - Map ID
 * @returns {Object} { visibleHexIds: [...], requiredHexIds: [...], mode: 'none'|'hidden'|'dimmed' }
 */
function getStudentVisibleHexIds(mapId) {
  if (!mapId) throw new Error('Map ID is required');

  const user = getCurrentUser();
  const email = String(user.email).toLowerCase();

  // Get map to read differentiationMode
  const mapRow = findRow_(SHEETS_.MAPS, 'mapId', mapId);
  if (!mapRow) throw new Error('Map not found');
  const meta = safeJsonParse_(mapRow.metaJson, {});
  const mode = meta.differentiationMode || 'none';

  // Lesson map parent visibility cascade:
  // If this is a lesson map, check if the parent hex is visible to this student.
  // If parent map uses differentiation and parent hex is NOT visible, hide entire lesson map.
  // Recursion is safe: lesson maps never contain lesson hexes (max depth = 1).
  if (meta.isLessonMap && meta.parentMapId && meta.parentHexId) {
    const parentVis = getStudentVisibleHexIds(meta.parentMapId);
    if (parentVis.mode !== 'none') {
      let parentHexVisible = false;
      for (let pv = 0; pv < parentVis.visibleHexIds.length; pv++) {
        if (String(parentVis.visibleHexIds[pv]) === String(meta.parentHexId)) {
          parentHexVisible = true;
          break;
        }
      }
      if (!parentHexVisible) {
        return { visibleHexIds: [], requiredHexIds: [], mode: parentVis.mode };
      }
    }
  }

  // If no differentiation, return all hex IDs
  if (mode === 'none') {
    const hexes = safeJsonParse_(mapRow.hexesJson, []);
    const allIds = [];
    for (let i = 0; i < hexes.length; i++) allIds.push(hexes[i].id);
    return { visibleHexIds: allIds, requiredHexIds: [], mode: 'none' };
  }

  // Get student's group memberships (filtered read — only this student's rows)
  const myMemberships = findRowsFiltered_(SHEETS_.GROUP_MEMBERSHIPS, { studentEmail: email });
  const myGroupIds = {};
  for (let i = 0; i < myMemberships.length; i++) {
    myGroupIds[String(myMemberships[i].groupId)] = true;
  }

  // Get hex assignments for this map (filtered read — only this map's rows)
  const mapAssignments = findRowsFiltered_(SHEETS_.HEX_ASSIGNMENTS, { mapId: String(mapId) });

  // Build per-hex data structures
  // hexGroupAssignments: { hexId: [{groupId, isRequired}] }
  // hexStudentOverrides: { hexId: {visibility, isRequired} }
  // hexesWithAssignments: set of hexIds that have any group assignment
  const hexGroupAssignments = {};
  const hexStudentOverrides = {};
  const hexesWithAssignments = {};

  for (let i = 0; i < mapAssignments.length; i++) {
    const a = mapAssignments[i];
    const hid = String(a.hexId);

    if (a.groupId && !a.studentEmail) {
      // Group-level assignment
      if (!hexGroupAssignments[hid]) hexGroupAssignments[hid] = [];
      hexGroupAssignments[hid].push({
        groupId: String(a.groupId),
        isRequired: String(a.isRequired) === 'true'
      });
      hexesWithAssignments[hid] = true;
    } else if (a.studentEmail && !a.groupId) {
      // Student override — only for this student
      if (String(a.studentEmail).toLowerCase() === email) {
        // Parse compound isRequired field: 'show_true' / 'hide_false' etc.
        const parts = String(a.isRequired).split('_');
        hexStudentOverrides[hid] = {
          visibility: parts[0] || 'show',
          isRequired: parts[1] === 'true'
        };
      }
    }
  }

  // Compute visibility for each hex
  const hexes = safeJsonParse_(mapRow.hexesJson, []);
  const visibleHexIds = [];
  const requiredHexIds = [];

  for (let i = 0; i < hexes.length; i++) {
    const hid = hexes[i].id;

    // Check student override first (highest priority)
    if (hexStudentOverrides[hid]) {
      if (hexStudentOverrides[hid].visibility === 'show') {
        visibleHexIds.push(hid);
        if (hexStudentOverrides[hid].isRequired) requiredHexIds.push(hid);
      }
      // If 'hide', skip — hex is not visible
      continue;
    }

    // No override — check group assignments
    if (!hexesWithAssignments[hid]) {
      // No assignments for this hex — default visible to all
      visibleHexIds.push(hid);
      continue;
    }

    // Hex has group assignments — check if student is in any assigned group
    const groups = hexGroupAssignments[hid] || [];
    let matched = false;
    for (let g = 0; g < groups.length; g++) {
      if (myGroupIds[groups[g].groupId]) {
        matched = true;
        if (groups[g].isRequired) requiredHexIds.push(hid);
      }
    }

    if (matched) {
      visibleHexIds.push(hid);
    }
    // If not matched, hex is not visible (hidden or dimmed based on mode)
  }

  return { visibleHexIds: visibleHexIds, requiredHexIds: requiredHexIds, mode: mode };
}

// ============================================================================
// TEACHER BATCH ENDPOINT
// ============================================================================

/**
 * Get all differentiation data for a map (teacher view).
 * Returns groups, memberships, and hex assignments for all classes
 * assigned to this map.
 *
 * @param {string} mapId - Map ID
 * @returns {Object} { groups: [...], memberships: [...], hexAssignments: [...], mode: string }
 */
function getMapDifferentiationData(mapId) {
  requireRole(['administrator', 'teacher']);
  if (!mapId) throw new Error('Map ID is required');

  // Get classes assigned to this map
  const allMapAssigns = readAll_(SHEETS_.MAP_ASSIGNMENTS);
  const classIds = {};
  for (let i = 0; i < allMapAssigns.length; i++) {
    if (String(allMapAssigns[i].mapId) === String(mapId)) {
      classIds[String(allMapAssigns[i].classId)] = true;
    }
  }

  // Get groups for those classes
  const allGroups = readAll_(SHEETS_.DIFFERENTIATION_GROUPS);
  const groups = [];
  const groupIds = {};
  for (let i = 0; i < allGroups.length; i++) {
    const g = allGroups[i];
    // Include class-wide groups for assigned classes, or map-specific groups for this map
    if (classIds[String(g.classId)] && (!g.mapId || String(g.mapId) === String(mapId))) {
      groups.push(g);
      groupIds[String(g.groupId)] = true;
    }
  }

  // Get memberships for those groups
  const allMemberships = readAll_(SHEETS_.GROUP_MEMBERSHIPS);
  const memberships = [];
  for (let i = 0; i < allMemberships.length; i++) {
    if (groupIds[String(allMemberships[i].groupId)]) {
      memberships.push(allMemberships[i]);
    }
  }

  // Get hex assignments for this map
  const hexAssignments = findRows_(SHEETS_.HEX_ASSIGNMENTS, 'mapId', mapId);

  // Get map mode
  const mapRow = findRow_(SHEETS_.MAPS, 'mapId', mapId);
  const meta = mapRow ? safeJsonParse_(mapRow.metaJson, {}) : {};
  const mode = meta.differentiationMode || 'none';

  return {
    groups: groups,
    memberships: memberships,
    hexAssignments: hexAssignments,
    mode: mode
  };
}


/**
 * Suggest differentiation groups based on WIDA profile levels.
 * Returns suggestions only — does NOT create anything.
 * Teacher/admin only, must own the class.
 *
 * @param {string} classId - Class ID
 * @returns {Array<Object>} [{ name, color, bracket, students: [{email, name, widaLevel}] }]
 */
function suggestGroupsFromWida(classId) {
  requireRole(['administrator', 'teacher']);
  if (!classId) throw new Error('Class ID is required');

  const user = getCurrentUser();
  const cls = getClassById(classId);
  if (!cls) throw new Error('Class not found');
  if (!user.isAdmin && cls.teacherEmail !== user.email) {
    throw new Error('Permission denied: you do not own this class');
  }

  // Get class roster
  const roster = getClassRoster(classId);
  const rosterByEmail = {};
  for (let i = 0; i < roster.length; i++) {
    if (roster[i].status !== 'removed') {
      const email = String(roster[i].email || roster[i].studentEmail).toLowerCase();
      rosterByEmail[email] = roster[i];
    }
  }

  // Get active support profiles for class members
  const allProfiles = readAll_(SHEETS_.STUDENT_SUPPORT_PROFILES);
  const profilesByEmail = {};
  for (let i = 0; i < allProfiles.length; i++) {
    const p = allProfiles[i];
    if (String(p.isActive) !== 'true') continue;
    const email = String(p.studentEmail).toLowerCase();
    if (rosterByEmail[email]) {
      profilesByEmail[email] = { widaLevel: parseInt(p.widaOverallLevel) || 0 };
    }
  }

  // Bracket definitions
  const BRACKETS = [
    { bracket: '1-2', name: 'WIDA Entering/Emerging (1-2)', color: '#ef4444', min: 1, max: 2 },
    { bracket: '3-4', name: 'WIDA Developing/Expanding (3-4)', color: '#f59e0b', min: 3, max: 4 },
    { bracket: '5-6', name: 'WIDA Bridging/Reaching (5-6)', color: '#22c55e', min: 5, max: 6 }
  ];

  const noProfileStudents = [];
  const bracketStudents = { '1-2': [], '3-4': [], '5-6': [] };

  const rosterEmails = Object.keys(rosterByEmail);
  for (let i = 0; i < rosterEmails.length; i++) {
    const email = rosterEmails[i];
    const profile = profilesByEmail[email];
    const name = rosterByEmail[email].studentName || rosterByEmail[email].name || email;

    if (!profile || profile.widaLevel === 0) {
      noProfileStudents.push({ email: email, name: name, widaLevel: 0 });
      continue;
    }

    let placed = false;
    for (let b = 0; b < BRACKETS.length; b++) {
      if (profile.widaLevel >= BRACKETS[b].min && profile.widaLevel <= BRACKETS[b].max) {
        bracketStudents[BRACKETS[b].bracket].push({ email: email, name: name, widaLevel: profile.widaLevel });
        placed = true;
        break;
      }
    }
    if (!placed) {
      noProfileStudents.push({ email: email, name: name, widaLevel: profile.widaLevel });
    }
  }

  // Build suggestions — only for brackets that have students
  const suggestions = [];
  for (let b = 0; b < BRACKETS.length; b++) {
    const br = BRACKETS[b];
    if (bracketStudents[br.bracket].length > 0) {
      suggestions.push({ name: br.name, color: br.color, bracket: br.bracket, students: bracketStudents[br.bracket] });
    }
  }

  // Add "No WIDA Profile" group if applicable
  if (noProfileStudents.length > 0) {
    suggestions.push({ name: 'No WIDA Profile', color: '#06b6d4', bracket: 'none', students: noProfileStudents });
  }

  return suggestions;
}
