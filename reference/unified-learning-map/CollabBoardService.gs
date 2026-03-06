/**
 * CollabSpace Board Service — Board CRUD, Membership, Templates
 *
 * Manages collaboration boards in the external CollabSpace spreadsheet.
 * Boards are linked to classes (via classId) with auto-populated membership
 * from class rosters. Teachers create boards; students join via class enrollment.
 *
 * Uses CollabConfigService.gs helpers for all external sheet operations.
 *
 * @version 1.0.0
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_BOARD_TYPES_ = ['discussion', 'brainstorm', 'labgroup', 'project', 'freeform'];
const VALID_LAYOUT_MODES_ = ['wall', 'stream', 'columns'];
const VALID_POST_APPROVAL_ = ['none', 'required'];
const MAX_BOARDS_PER_CLASS_ = 20;
const MAX_BOARD_TITLE_ = 200;
const MAX_BOARD_DESCRIPTION_ = 500;

const BOARD_TEMPLATES_ = {
  discussion: {
    title: 'Class Discussion',
    description: 'Share ideas and respond to classmates.',
    boardType: 'discussion',
    layoutMode: 'stream',
    postApproval: 'none',
    maxPostsPerStudent: 5,
    allowAnonymous: false
  },
  brainstorm: {
    title: 'Brainstorm Wall',
    description: 'Post ideas freely. All contributions welcome!',
    boardType: 'brainstorm',
    layoutMode: 'wall',
    postApproval: 'none',
    maxPostsPerStudent: 0,
    allowAnonymous: true
  },
  labgroup: {
    title: 'Lab Group Workspace',
    description: 'Organize your lab work by section.',
    boardType: 'labgroup',
    layoutMode: 'columns',
    postApproval: 'required',
    maxPostsPerStudent: 0,
    allowAnonymous: false,
    defaultColumns: ['Hypothesis', 'Data', 'Analysis', 'Conclusion']
  },
  project: {
    title: 'Project Tracker',
    description: 'Track project progress across stages.',
    boardType: 'project',
    layoutMode: 'columns',
    postApproval: 'none',
    maxPostsPerStudent: 0,
    allowAnonymous: false,
    defaultColumns: ['To Do', 'In Progress', 'Done', 'Review']
  },
  exitticket: {
    title: 'Exit Ticket',
    description: 'Submit your exit ticket response.',
    boardType: 'discussion',
    layoutMode: 'stream',
    postApproval: 'required',
    maxPostsPerStudent: 1,
    allowAnonymous: false
  }
};


// ============================================================================
// PUBLIC FUNCTIONS — Board CRUD
// ============================================================================

/**
 * Get boards accessible to the current user.
 * Teachers see boards they created + boards for classes they teach.
 * Students see boards for classes they are enrolled in.
 *
 * @param {Object} [filters] - { classId, mapId, boardType, isArchived }
 * @returns {Array<Object>} boards
 */
function getBoards(filters) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  filters = filters || {};

  const allBoards = readCollabSheet_('CollabBoards');
  const allMembers = readCollabSheet_('CollabMembers');

  // Build set of boardIds where user is an active member
  const memberBoardIds = {};
  for (let i = 0; i < allMembers.length; i++) {
    var m = allMembers[i];
    if (String(m.memberEmail).toLowerCase() === email &&
        String(m.isActive) === 'true') {
      memberBoardIds[String(m.boardId)] = String(m.memberRole);
    }
  }

  const boards = [];
  for (let i = 0; i < allBoards.length; i++) {
    var b = allBoards[i];
    var boardId = String(b.boardId);

    // Access check: user must be a member OR creator OR admin
    var hasAccess = memberBoardIds[boardId] ||
      String(b.createdBy).toLowerCase() === email ||
      user.isAdmin;

    if (!hasAccess) continue;

    // Apply filters
    if (filters.classId && String(b.classId) !== String(filters.classId)) continue;
    if (filters.mapId && String(b.mapId) !== String(filters.mapId)) continue;
    if (filters.boardType && String(b.boardType) !== String(filters.boardType)) continue;

    var isArchived = String(b.isArchived) === 'true';
    if (filters.isArchived !== undefined) {
      if (filters.isArchived && !isArchived) continue;
      if (!filters.isArchived && isArchived) continue;
    } else {
      // Default: hide archived
      if (isArchived) continue;
    }

    boards.push({
      boardId: boardId,
      title: b.title || '',
      description: b.description || '',
      boardType: b.boardType || 'freeform',
      layoutMode: b.layoutMode || 'wall',
      mapId: b.mapId || '',
      hexId: b.hexId || '',
      classId: b.classId || '',
      courseId: b.courseId || '',
      createdBy: b.createdBy || '',
      isArchived: isArchived,
      allowAnonymous: String(b.allowAnonymous) === 'true',
      postApproval: b.postApproval || 'none',
      maxPostsPerStudent: parseInt(b.maxPostsPerStudent, 10) || 0,
      defaultColumnsJson: b.defaultColumnsJson || '',
      createdAt: b.createdAt || '',
      updatedAt: b.updatedAt || '',
      memberRole: memberBoardIds[boardId] || (String(b.createdBy).toLowerCase() === email ? 'owner' : 'viewer')
    });
  }

  // Sort by most recently updated first
  boards.sort(function(a, b) {
    return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
  });

  return boards;
}


/**
 * Get a single board by ID with membership validation.
 *
 * @param {string} boardId
 * @returns {Object|null} board with memberRole
 */
function getBoard(boardId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!boardId) throw new Error('Board ID is required.');

  const boards = findCollabRows_('CollabBoards', 'boardId', boardId);
  if (boards.length === 0) throw new Error('Board not found.');

  var b = boards[0];

  // Check access
  var role = validateBoardAccess_(boardId, email, user.isAdmin);

  return {
    boardId: String(b.boardId),
    title: b.title || '',
    description: b.description || '',
    boardType: b.boardType || 'freeform',
    layoutMode: b.layoutMode || 'wall',
    mapId: b.mapId || '',
    hexId: b.hexId || '',
    classId: b.classId || '',
    courseId: b.courseId || '',
    createdBy: b.createdBy || '',
    isArchived: String(b.isArchived) === 'true',
    allowAnonymous: String(b.allowAnonymous) === 'true',
    postApproval: b.postApproval || 'none',
    maxPostsPerStudent: parseInt(b.maxPostsPerStudent, 10) || 0,
    createdAt: b.createdAt || '',
    updatedAt: b.updatedAt || '',
    memberRole: role
  };
}


/**
 * Create a new collaboration board.
 * Teacher/admin only.
 * If classId provided, auto-populates CollabMembers from class roster.
 *
 * @param {Object} boardData - { title, description, boardType, layoutMode, classId, courseId, mapId, hexId, postApproval, maxPostsPerStudent, allowAnonymous }
 * @returns {Object} created board
 */
function createBoard(boardData) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers and administrators can create boards.');
  const email = user.email.toLowerCase();

  if (!boardData) throw new Error('Board data is required.');
  if (!boardData.title || !boardData.title.trim()) throw new Error('Board title is required.');

  var title = String(boardData.title).trim();
  if (title.length > MAX_BOARD_TITLE_) {
    throw new Error('Title must be ' + MAX_BOARD_TITLE_ + ' characters or less.');
  }

  var description = String(boardData.description || '').trim();
  if (description.length > MAX_BOARD_DESCRIPTION_) {
    throw new Error('Description must be ' + MAX_BOARD_DESCRIPTION_ + ' characters or less.');
  }

  var boardType = String(boardData.boardType || 'freeform');
  if (VALID_BOARD_TYPES_.indexOf(boardType) === -1) {
    throw new Error('Invalid board type: ' + boardType);
  }

  var layoutMode = String(boardData.layoutMode || 'wall');
  if (VALID_LAYOUT_MODES_.indexOf(layoutMode) === -1) {
    throw new Error('Invalid layout mode: ' + layoutMode);
  }

  var postApproval = String(boardData.postApproval || 'none');
  if (VALID_POST_APPROVAL_.indexOf(postApproval) === -1) {
    postApproval = 'none';
  }

  var maxPosts = parseInt(boardData.maxPostsPerStudent, 10) || 0;
  if (maxPosts < 0) maxPosts = 0;

  var classId = String(boardData.classId || '').trim();

  // Enforce per-class board limit
  if (classId) {
    var existingBoards = findCollabRows_('CollabBoards', 'classId', classId);
    var activeCount = 0;
    for (let i = 0; i < existingBoards.length; i++) {
      if (String(existingBoards[i].isArchived) !== 'true') {
        activeCount++;
      }
    }
    if (activeCount >= MAX_BOARDS_PER_CLASS_) {
      throw new Error('Maximum of ' + MAX_BOARDS_PER_CLASS_ + ' active boards per class reached.');
    }
  }

  var boardId = generateBoardId_();
  var timestamp = now_();

  var board = {
    boardId: boardId,
    title: title,
    description: description,
    boardType: boardType,
    layoutMode: layoutMode,
    mapId: String(boardData.mapId || ''),
    hexId: String(boardData.hexId || ''),
    classId: classId,
    courseId: String(boardData.courseId || ''),
    createdBy: email,
    isArchived: 'false',
    allowAnonymous: boardData.allowAnonymous ? 'true' : 'false',
    postApproval: postApproval,
    maxPostsPerStudent: maxPosts,
    defaultColumnsJson: boardData.defaultColumnsJson || '',
    createdAt: timestamp,
    updatedAt: timestamp
  };

  appendCollabRow_('CollabBoards', board);

  // Add creator as owner member
  appendCollabRow_('CollabMembers', {
    membershipId: generateMembershipId_(),
    boardId: boardId,
    memberEmail: email,
    memberRole: 'owner',
    addedBy: email,
    addedAt: timestamp,
    isActive: 'true'
  });

  // Auto-populate class roster as members
  if (classId) {
    try {
      var roster = getClassRoster(classId);
      if (roster && roster.length > 0) {
        for (let r = 0; r < roster.length; r++) {
          var studentEmail = String(roster[r].studentEmail || '').toLowerCase().trim();
          if (!studentEmail || studentEmail === email) continue;
          if (String(roster[r].status) === 'removed') continue;

          appendCollabRow_('CollabMembers', {
            membershipId: generateMembershipId_(),
            boardId: boardId,
            memberEmail: studentEmail,
            memberRole: 'member',
            addedBy: email,
            addedAt: timestamp,
            isActive: 'true'
          });
        }
      }
    } catch (e) {
      // Non-fatal — roster auto-populate failure shouldn't block board creation
      Logger.log('CollabBoard: roster auto-populate failed for class ' + classId + ': ' + e.message);
    }
  }

  // Log activity
  logCollabActivity_(boardId, email, 'board_created', boardId, 'board', '');

  board.memberRole = 'owner';
  return board;
}


/**
 * Create a board from a preset template.
 * Teacher/admin only.
 *
 * @param {string} templateKey - one of: discussion, brainstorm, labgroup, project, exitticket
 * @param {string} classId - class to assign
 * @param {string} [mapId] - optional map link
 * @param {string} [hexId] - optional hex link
 * @returns {Object} created board
 */
function createBoardFromTemplate(templateKey, classId, mapId, hexId) {
  var template = BOARD_TEMPLATES_[templateKey];
  if (!template) throw new Error('Unknown template: ' + templateKey);
  if (!classId) throw new Error('Class ID is required for template boards.');

  return createBoard({
    title: template.title,
    description: template.description,
    boardType: template.boardType,
    layoutMode: template.layoutMode,
    classId: classId,
    mapId: mapId || '',
    hexId: hexId || '',
    postApproval: template.postApproval,
    maxPostsPerStudent: template.maxPostsPerStudent,
    allowAnonymous: template.allowAnonymous || false
  });
}


/**
 * Update a board's settings.
 * Owner or moderator only.
 *
 * @param {string} boardId
 * @param {Object} updates - partial: { title, description, layoutMode, postApproval, maxPostsPerStudent, isArchived, allowAnonymous }
 * @returns {Object} { success: true }
 */
function updateBoard(boardId, updates) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!boardId) throw new Error('Board ID is required.');
  if (!updates) throw new Error('Updates are required.');

  var role = validateBoardAccess_(boardId, email, user.isAdmin);
  if (role !== 'owner' && role !== 'moderator' && !user.isAdmin) {
    throw new Error('Only board owners and moderators can update board settings.');
  }

  var safeUpdates = {};

  if (updates.title !== undefined) {
    var t = String(updates.title).trim();
    if (!t) throw new Error('Title cannot be empty.');
    if (t.length > MAX_BOARD_TITLE_) throw new Error('Title too long.');
    safeUpdates.title = t;
  }

  if (updates.description !== undefined) {
    var d = String(updates.description).trim();
    if (d.length > MAX_BOARD_DESCRIPTION_) throw new Error('Description too long.');
    safeUpdates.description = d;
  }

  if (updates.layoutMode !== undefined) {
    if (VALID_LAYOUT_MODES_.indexOf(updates.layoutMode) === -1) {
      throw new Error('Invalid layout mode.');
    }
    safeUpdates.layoutMode = updates.layoutMode;
  }

  if (updates.postApproval !== undefined) {
    if (VALID_POST_APPROVAL_.indexOf(updates.postApproval) === -1) {
      updates.postApproval = 'none';
    }
    safeUpdates.postApproval = updates.postApproval;
  }

  if (updates.maxPostsPerStudent !== undefined) {
    safeUpdates.maxPostsPerStudent = Math.max(0, parseInt(updates.maxPostsPerStudent, 10) || 0);
  }

  if (updates.isArchived !== undefined) {
    safeUpdates.isArchived = updates.isArchived ? 'true' : 'false';
  }

  if (updates.allowAnonymous !== undefined) {
    safeUpdates.allowAnonymous = updates.allowAnonymous ? 'true' : 'false';
  }

  if (updates.defaultColumnsJson !== undefined) {
    var colsStr = String(updates.defaultColumnsJson || '');
    if (colsStr) {
      try {
        var parsed = JSON.parse(colsStr);
        if (!Array.isArray(parsed)) throw new Error('Must be an array.');
        if (parsed.length > 20) throw new Error('Maximum 20 columns.');
        var cleaned = [];
        for (let ci = 0; ci < parsed.length; ci++) {
          var col = String(parsed[ci] || '').trim();
          if (col.length === 0) continue;
          if (col.length > 100) col = col.substring(0, 100);
          cleaned.push(col);
        }
        safeUpdates.defaultColumnsJson = JSON.stringify(cleaned);
      } catch (e) {
        throw new Error('Invalid columns data: ' + e.message);
      }
    } else {
      safeUpdates.defaultColumnsJson = '';
    }
  }

  safeUpdates.updatedAt = now_();

  updateCollabRow_('CollabBoards', 'boardId', boardId, safeUpdates);
  return { success: true };
}


/**
 * Archive a board.
 * Owner only.
 *
 * @param {string} boardId
 * @returns {Object} { success: true }
 */
function archiveBoard(boardId) {
  return updateBoard(boardId, { isArchived: true });
}


/**
 * Delete a board and all associated data.
 * Owner only. Returns count of deleted items before performing cascade.
 *
 * @param {string} boardId
 * @returns {Object} { success, deletedPosts, deletedComments, deletedReactions, deletedMembers, deletedActivity }
 */
function deleteBoard(boardId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!boardId) throw new Error('Board ID is required.');

  var role = validateBoardAccess_(boardId, email, user.isAdmin);
  if (role !== 'owner' && !user.isAdmin) {
    throw new Error('Only the board owner can delete a board.');
  }

  // Cascade delete all associated data
  var deletedPosts = deleteCollabRows_('CollabPosts', 'boardId', boardId);
  var deletedComments = deleteCollabRows_('CollabComments', 'boardId', boardId);
  var deletedReactions = deleteCollabRows_('CollabReactions', 'boardId', boardId);
  var deletedMembers = deleteCollabRows_('CollabMembers', 'boardId', boardId);
  var deletedActivity = deleteCollabRows_('CollabActivity', 'boardId', boardId);

  // Delete the board itself
  deleteCollabRow_('CollabBoards', 'boardId', boardId);

  return {
    success: true,
    deletedPosts: deletedPosts,
    deletedComments: deletedComments,
    deletedReactions: deletedReactions,
    deletedMembers: deletedMembers,
    deletedActivity: deletedActivity
  };
}


/**
 * Duplicate a board's settings (not posts) with a new ID.
 * Owner only.
 *
 * @param {string} boardId
 * @returns {Object} new board
 */
function duplicateBoard(boardId) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Permission denied.');
  const email = user.email.toLowerCase();

  var role = validateBoardAccess_(boardId, email, user.isAdmin);
  if (role !== 'owner' && !user.isAdmin) {
    throw new Error('Only the board owner can duplicate a board.');
  }

  var boards = findCollabRows_('CollabBoards', 'boardId', boardId);
  if (boards.length === 0) throw new Error('Board not found.');

  var source = boards[0];
  return createBoard({
    title: 'Copy of ' + (source.title || 'Board'),
    description: source.description || '',
    boardType: source.boardType || 'freeform',
    layoutMode: source.layoutMode || 'wall',
    classId: source.classId || '',
    courseId: source.courseId || '',
    mapId: source.mapId || '',
    hexId: source.hexId || '',
    postApproval: source.postApproval || 'none',
    maxPostsPerStudent: parseInt(source.maxPostsPerStudent, 10) || 0,
    allowAnonymous: String(source.allowAnonymous) === 'true'
  });
}


// ============================================================================
// PUBLIC FUNCTIONS — Membership
// ============================================================================

/**
 * Get all members of a board.
 * Owner/moderator or admin only.
 *
 * @param {string} boardId
 * @returns {Array<Object>} members
 */
function getBoardMembers(boardId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!boardId) throw new Error('Board ID is required.');

  var role = validateBoardAccess_(boardId, email, user.isAdmin);
  if (role !== 'owner' && role !== 'moderator' && !user.isAdmin) {
    throw new Error('Only board owners and moderators can view the member list.');
  }

  var members = findCollabRows_('CollabMembers', 'boardId', boardId);
  var result = [];
  for (let i = 0; i < members.length; i++) {
    var m = members[i];
    if (String(m.isActive) !== 'true') continue;
    result.push({
      membershipId: m.membershipId || '',
      memberEmail: m.memberEmail || '',
      memberRole: m.memberRole || 'member',
      addedBy: m.addedBy || '',
      addedAt: m.addedAt || ''
    });
  }

  // Sort: owners first, then moderators, then members, then viewers
  var roleOrder = { owner: 0, moderator: 1, member: 2, viewer: 3 };
  result.sort(function(a, b) {
    return (roleOrder[a.memberRole] || 9) - (roleOrder[b.memberRole] || 9);
  });

  return result;
}


/**
 * Add a member to a board.
 * Owner only.
 *
 * @param {string} boardId
 * @param {string} memberEmail
 * @param {string} [memberRole='member'] - 'moderator', 'member', or 'viewer'
 * @returns {Object} { success: true }
 */
function addBoardMember(boardId, memberEmail, memberRole) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!boardId) throw new Error('Board ID is required.');
  if (!memberEmail) throw new Error('Member email is required.');

  var role = validateBoardAccess_(boardId, email, user.isAdmin);
  if (role !== 'owner' && !user.isAdmin) {
    throw new Error('Only the board owner can add members.');
  }

  var targetEmail = String(memberEmail).toLowerCase().trim();
  if (!isValidEmail_(targetEmail)) {
    throw new Error('Invalid email address.');
  }

  var newRole = memberRole || 'member';
  if (['moderator', 'member', 'viewer'].indexOf(newRole) === -1) {
    newRole = 'member';
  }

  // Check if already a member
  var existing = findCollabRows_('CollabMembers', 'boardId', boardId);
  for (let i = 0; i < existing.length; i++) {
    if (String(existing[i].memberEmail).toLowerCase() === targetEmail &&
        String(existing[i].isActive) === 'true') {
      throw new Error('User is already a member of this board.');
    }
  }

  appendCollabRow_('CollabMembers', {
    membershipId: generateMembershipId_(),
    boardId: boardId,
    memberEmail: targetEmail,
    memberRole: newRole,
    addedBy: email,
    addedAt: now_(),
    isActive: 'true'
  });

  logCollabActivity_(boardId, email, 'member_joined', targetEmail, 'member', '');

  return { success: true };
}


/**
 * Remove a member from a board (soft deactivate).
 * Owner only. Cannot remove self.
 *
 * @param {string} boardId
 * @param {string} memberEmail
 * @returns {Object} { success: true }
 */
function removeBoardMember(boardId, memberEmail) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!boardId) throw new Error('Board ID is required.');

  var role = validateBoardAccess_(boardId, email, user.isAdmin);
  if (role !== 'owner' && !user.isAdmin) {
    throw new Error('Only the board owner can remove members.');
  }

  var targetEmail = String(memberEmail).toLowerCase().trim();
  if (targetEmail === email) {
    throw new Error('You cannot remove yourself from the board.');
  }

  var members = findCollabRows_('CollabMembers', 'boardId', boardId);
  for (let i = 0; i < members.length; i++) {
    if (String(members[i].memberEmail).toLowerCase() === targetEmail &&
        String(members[i].isActive) === 'true') {
      updateCollabRow_('CollabMembers', 'membershipId', members[i].membershipId, {
        isActive: 'false'
      });
      return { success: true };
    }
  }

  throw new Error('Member not found.');
}


/**
 * Change a member's role.
 * Owner only.
 *
 * @param {string} boardId
 * @param {string} memberEmail
 * @param {string} newRole - 'moderator', 'member', or 'viewer'
 * @returns {Object} { success: true }
 */
function changeMemberRole(boardId, memberEmail, newRole) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!boardId) throw new Error('Board ID is required.');

  var role = validateBoardAccess_(boardId, email, user.isAdmin);
  if (role !== 'owner' && !user.isAdmin) {
    throw new Error('Only the board owner can change member roles.');
  }

  if (['moderator', 'member', 'viewer'].indexOf(newRole) === -1) {
    throw new Error('Invalid role. Must be moderator, member, or viewer.');
  }

  var targetEmail = String(memberEmail).toLowerCase().trim();

  var members = findCollabRows_('CollabMembers', 'boardId', boardId);
  for (let i = 0; i < members.length; i++) {
    if (String(members[i].memberEmail).toLowerCase() === targetEmail &&
        String(members[i].isActive) === 'true') {
      updateCollabRow_('CollabMembers', 'membershipId', members[i].membershipId, {
        memberRole: newRole
      });
      return { success: true };
    }
  }

  throw new Error('Member not found.');
}


/**
 * Get available board templates.
 *
 * @returns {Array<Object>} templates with key, title, description, settings
 */
function getBoardTemplates() {
  var user = getCurrentUser();
  var templates = [];
  var keys = Object.keys(BOARD_TEMPLATES_);
  for (let i = 0; i < keys.length; i++) {
    var t = BOARD_TEMPLATES_[keys[i]];
    templates.push({
      key: keys[i],
      title: t.title,
      description: t.description,
      boardType: t.boardType,
      layoutMode: t.layoutMode,
      postApproval: t.postApproval,
      maxPostsPerStudent: t.maxPostsPerStudent,
      allowAnonymous: t.allowAnonymous || false,
      defaultColumns: t.defaultColumns || []
    });
  }
  return templates;
}


// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Validate that a user has access to a board and return their role.
 *
 * @param {string} boardId
 * @param {string} email - lowercase email
 * @param {boolean} isAdmin
 * @returns {string} role - 'owner', 'moderator', 'member', 'viewer'
 * @throws {Error} if no access
 * @private
 */
function validateBoardAccess_(boardId, email, isAdmin) {
  if (isAdmin) return 'owner'; // admins have full access

  var members = findCollabRows_('CollabMembers', 'boardId', boardId);
  for (let i = 0; i < members.length; i++) {
    if (String(members[i].memberEmail).toLowerCase() === email &&
        String(members[i].isActive) === 'true') {
      return members[i].memberRole || 'member';
    }
  }

  // Check if user is the creator (fallback for boards created before membership system)
  var boards = findCollabRows_('CollabBoards', 'boardId', boardId);
  if (boards.length > 0 && String(boards[0].createdBy).toLowerCase() === email) {
    return 'owner';
  }

  throw new Error('You do not have access to this board.');
}


/**
 * Log an activity event to the CollabActivity sheet.
 * Append-only, non-fatal.
 *
 * @param {string} boardId
 * @param {string} actorEmail
 * @param {string} actionType
 * @param {string} targetId
 * @param {string} targetType
 * @param {string} metadata - JSON string or plain text
 * @private
 */
function logCollabActivity_(boardId, actorEmail, actionType, targetId, targetType, metadata) {
  try {
    appendCollabRow_('CollabActivity', {
      activityId: generateActivityId_(),
      boardId: boardId,
      actorEmail: actorEmail,
      actionType: actionType,
      targetId: targetId || '',
      targetType: targetType || '',
      metadata: metadata || '',
      createdAt: now_()
    });
  } catch (e) {
    Logger.log('CollabActivity log failed: ' + e.message);
  }
}
