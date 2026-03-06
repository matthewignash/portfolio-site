/**
 * Code.gs — Main entry point for the School Admin Dashboard
 *
 * Contains:
 *   - doGet() web app entry point
 *   - include() helper for HTML templating
 *   - All api* wrapper functions (top-level, for google.script.run access)
 *
 * Convention: Every client-facing function is prefixed with "api" and returns
 * { success: true, data: ... } or { success: false, error: ..., code: ... }.
 */

// ═══════════════════════════════════════════════
// Web App Entry Point
// ═══════════════════════════════════════════════

/**
 * Serves the main HTML page when the web app is loaded.
 */
function doGet(e) {
  var html = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('School Admin Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  html.addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return html;
}

/**
 * Includes an HTML file's content for use in templates.
 * Used in Index.html as: <?!= include('CSS_Styles') ?>
 * @param {string} filename - Flat file name without .html extension
 * @returns {string} HTML content
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ═══════════════════════════════════════════════
// API Helper — wraps every api* function
// ═══════════════════════════════════════════════

/**
 * Wraps a function call in try-catch, returns structured response.
 * @param {string} fnName - Function name for logging
 * @param {Function} fn - The function to execute
 * @returns {{ success: boolean, data?: *, error?: string, code?: string }}
 */
function apiWrap_(fnName, fn) {
  try {
    var result = fn();
    return { success: true, data: result };
  } catch (e) {
    LogService.error(fnName, e.message, e.stack);
    var code = 'UNKNOWN';
    if (e.message && e.message.indexOf(':') !== -1) {
      code = e.message.split(':')[0];
    }
    return { success: false, error: e.message, code: code };
  }
}

// ═══════════════════════════════════════════════
// Auth API
// ═══════════════════════════════════════════════

/**
 * Returns the current user's context (id, name, role, visible modules).
 */
function apiGetCurrentUser() {
  return apiWrap_('apiGetCurrentUser', function() {
    return AuthService.getUserContext();
  });
}

// ═══════════════════════════════════════════════
// Config API
// ═══════════════════════════════════════════════

/**
 * Returns all configuration key-value pairs.
 */
function apiGetConfig() {
  return apiWrap_('apiGetConfig', function() {
    AuthService.requireAuth();
    var records = DataService.getRecords('_config');
    var configMap = {};
    records.forEach(function(r) {
      configMap[r.key] = r.value;
    });
    return configMap;
  });
}

// ═══════════════════════════════════════════════
// Generic CRUD API
// ═══════════════════════════════════════════════

/**
 * Generic record retrieval with optional filters.
 * @param {string} tableName
 * @param {Object} [filters]
 */
function apiGetRecords(tableName, filters) {
  return apiWrap_('apiGetRecords', function() {
    AuthService.requireAuth();
    return DataService.getRecords(tableName, filters);
  });
}

/**
 * Get a single record by ID.
 * @param {string} tableName
 * @param {string} id
 */
function apiGetRecordById(tableName, id) {
  return apiWrap_('apiGetRecordById', function() {
    AuthService.requireAuth();
    var record = DataService.getRecordById(tableName, id);
    if (!record) throw new Error('NOT_FOUND: Record not found');
    return record;
  });
}

/**
 * Create a new record.
 * @param {string} tableName
 * @param {Object} data
 */
function apiCreateRecord(tableName, data) {
  return apiWrap_('apiCreateRecord', function() {
    AuthService.requireAuth();
    var sanitized = sanitizeObject(data);
    return DataService.createRecord(tableName, sanitized);
  });
}

/**
 * Update an existing record.
 * @param {string} tableName
 * @param {string} id
 * @param {Object} updates
 */
function apiUpdateRecord(tableName, id, updates) {
  return apiWrap_('apiUpdateRecord', function() {
    AuthService.requireAuth();
    var sanitized = sanitizeObject(updates);
    return DataService.updateRecord(tableName, id, sanitized);
  });
}

/**
 * Delete (soft) a record.
 * @param {string} tableName
 * @param {string} id
 */
function apiDeleteRecord(tableName, id) {
  return apiWrap_('apiDeleteRecord', function() {
    AuthService.requireAdmin();
    return DataService.deleteRecord(tableName, id);
  });
}

/**
 * Advanced query with filters, sort, pagination.
 * @param {string} tableName
 * @param {Object} options - { filters, sort, limit, offset, fields }
 */
function apiQuery(tableName, options) {
  return apiWrap_('apiQuery', function() {
    AuthService.requireAuth();
    return DataService.query(tableName, options);
  });
}

// ═══════════════════════════════════════════════
// Staff API
// ═══════════════════════════════════════════════

/**
 * Returns all active staff members (for selectors and dropdowns).
 */
function apiGetActiveStaff() {
  return apiWrap_('apiGetActiveStaff', function() {
    AuthService.requireAuth();
    return DataService.query('staff', {
      filters: { is_active: true },
      sort: { field: 'last_name', direction: 'asc' }
    }).data;
  });
}

/**
 * Returns active staff filtered by role.
 * @param {string} role - 'teacher', 'admin', 'support', 'specialist'
 */
function apiGetStaffByRole(role) {
  return apiWrap_('apiGetStaffByRole', function() {
    AuthService.requireAuth();
    return DataService.query('staff', {
      filters: { is_active: true, role: role },
      sort: { field: 'last_name', direction: 'asc' }
    }).data;
  });
}

// ═══════════════════════════════════════════════
// Observation API (Phase 1 stubs — will be filled in Phase 1)
// ═══════════════════════════════════════════════

/**
 * Creates a new observation record.
 * @param {Object} data - Observation fields
 */
function apiCreateObservation(data) {
  return apiWrap_('apiCreateObservation', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    sanitized.observer_id = AuthService.getCurrentUser().id;
    sanitized.observation_date = sanitized.observation_date || nowISO();
    sanitized.created_at = nowISO();
    sanitized.shared_with_teacher = sanitized.shared_with_teacher || false;
    sanitized.follow_up_completed = sanitized.follow_up_completed || false;
    return DataService.createRecord('observations', sanitized);
  });
}

/**
 * Returns observation dashboard data (heat map, priority list, stats).
 * @param {Object} [filters] - Optional filters (department, observer, date range)
 */
function apiGetObservationDashboard(filters) {
  return apiWrap_('apiGetObservationDashboard', function() {
    AuthService.requireAdmin();
    return ObservationService.getDashboard(filters);
  });
}

/**
 * Returns drop-in planner data for a given day/period.
 * @param {string} dayOfWeek - MON, TUE, etc.
 * @param {number} period
 */
function apiGetDropInData(dayOfWeek, period) {
  return apiWrap_('apiGetDropInData', function() {
    AuthService.requireAdmin();
    return ObservationService.getDropInData(dayOfWeek, period);
  });
}

/**
 * Returns observations for a specific teacher.
 * Respects RBAC: teachers can only see their own shared observations.
 * @param {string} teacherId
 */
function apiGetTeacherObservations(teacherId) {
  return apiWrap_('apiGetTeacherObservations', function() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    var filters = { teacher_id: teacherId };

    // Non-admins can only see shared observations for themselves
    if (user.role !== 'admin') {
      if (user.id !== teacherId) {
        throw new Error('AUTH_DENIED: You can only view your own observations.');
      }
      filters.shared_with_teacher = true;
    }

    return DataService.query('observations', {
      filters: filters,
      sort: { field: 'observation_date', direction: 'desc' }
    });
  });
}

/**
 * Returns a teacher's observation history with rating trends and tag frequency.
 * Admins see all; non-admins see only their own shared observations.
 * @param {string} teacherId
 */
function apiGetTeacherHistory(teacherId) {
  return apiWrap_('apiGetTeacherHistory', function() {
    AuthService.requireAuth();
    return ObservationService.getTeacherHistory(teacherId);
  });
}

/**
 * Schedules a future observation with optional email notification.
 * @param {Object} data - { teacher_id, planned_date, planned_period, observation_type, notify }
 */
function apiScheduleObservation(data) {
  return apiWrap_('apiScheduleObservation', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    return ObservationService.scheduleObservation(sanitized);
  });
}

/**
 * Returns the observation schedule.
 * @param {Object} [filters]
 */
function apiGetObservationSchedule(filters) {
  return apiWrap_('apiGetObservationSchedule', function() {
    AuthService.requireAuth();
    return DataService.query('observation_schedule', {
      filters: filters || {},
      sort: { field: 'planned_date', direction: 'asc' }
    });
  });
}

// ═══════════════════════════════════════════════
// Kanban API (Phase 2)
// ═══════════════════════════════════════════════

// ── Board APIs ──

/**
 * Returns all active (non-archived) boards.
 */
function apiGetActiveBoards() {
  return apiWrap_('apiGetActiveBoards', function() {
    AuthService.requireAuth();
    return KanbanService.getActiveBoards();
  });
}

/**
 * Returns a board with its columns and hydrated cards.
 * @param {string} boardId
 */
function apiGetBoardData(boardId) {
  return apiWrap_('apiGetBoardData', function() {
    AuthService.requireAuth();
    return KanbanService.getBoardData(boardId);
  });
}

/**
 * Creates a new board.
 * @param {Object} data - { title, description }
 */
function apiCreateBoard(data) {
  return apiWrap_('apiCreateBoard', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    sanitized.created_by = AuthService.getCurrentUser().id;
    sanitized.is_archived = false;
    return DataService.createRecord('kanban_boards', sanitized);
  });
}

/**
 * Archives a board (soft delete).
 * @param {string} boardId
 */
function apiArchiveBoard(boardId) {
  return apiWrap_('apiArchiveBoard', function() {
    AuthService.requireAdmin();
    return DataService.updateRecord('kanban_boards', boardId, { is_archived: true });
  });
}

// ── Column APIs ──

/**
 * Creates a new column on a board.
 * @param {Object} data - { board_id, title, position, color, wip_limit }
 */
function apiCreateColumn(data) {
  return apiWrap_('apiCreateColumn', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    return DataService.createRecord('kanban_columns', sanitized);
  });
}

/**
 * Updates a column.
 * @param {string} columnId
 * @param {Object} updates
 */
function apiUpdateColumn(columnId, updates) {
  return apiWrap_('apiUpdateColumn', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(updates);
    return DataService.updateRecord('kanban_columns', columnId, sanitized);
  });
}

/**
 * Deletes a column (hard delete).
 * @param {string} columnId
 */
function apiDeleteColumn(columnId) {
  return apiWrap_('apiDeleteColumn', function() {
    AuthService.requireAdmin();
    // Check column is empty before deleting
    var cards = DataService.getRecords('kanban_cards', { column_id: columnId });
    if (cards.length > 0) {
      throw new Error('VALIDATION: Cannot delete a column that contains cards. Move or delete cards first.');
    }
    return DataService.deleteRecord('kanban_columns', columnId, { hard: true });
  });
}

// ── Card APIs ──

/**
 * Creates a new card.
 * @param {Object} data - { board_id, column_id, title, description, assigned_to, priority, due_date, labels }
 */
function apiCreateCard(data) {
  return apiWrap_('apiCreateCard', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    validateRequired(sanitized, ['board_id', 'column_id', 'title']);
    sanitized.created_by = AuthService.getCurrentUser().id;
    // Set position to end of column
    var colCards = DataService.getRecords('kanban_cards', { column_id: sanitized.column_id });
    var maxPos = 0;
    colCards.forEach(function(c) { if (Number(c.position) > maxPos) maxPos = Number(c.position); });
    sanitized.position = maxPos + 1;
    var created = DataService.createRecord('kanban_cards', sanitized);
    // Log activity
    KanbanService.logActivity(created.id, sanitized.board_id, 'card_created', 'card', null, sanitized.title);
    return created;
  });
}

/**
 * Updates a card.
 * @param {string} cardId
 * @param {Object} updates
 */
function apiUpdateCard(cardId, updates) {
  return apiWrap_('apiUpdateCard', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(updates);
    // Snapshot old values for activity logging
    var oldCard = DataService.getRecordById('kanban_cards', cardId);
    var result = DataService.updateRecord('kanban_cards', cardId, sanitized);
    // Log each changed field
    if (oldCard) {
      var trackFields = ['title', 'description', 'priority', 'due_date', 'assigned_to', 'labels'];
      for (var fi = 0; fi < trackFields.length; fi++) {
        var f = trackFields[fi];
        if (sanitized.hasOwnProperty(f) && String(sanitized[f] || '') !== String(oldCard[f] || '')) {
          KanbanService.logActivity(cardId, oldCard.board_id, 'card_updated', f, oldCard[f], sanitized[f]);
        }
      }
    }
    return result;
  });
}

/**
 * Deletes a card (hard delete).
 * @param {string} cardId
 */
function apiDeleteCard(cardId) {
  return apiWrap_('apiDeleteCard', function() {
    AuthService.requireAdmin();
    var card = DataService.getRecordById('kanban_cards', cardId);
    // Log activity before deletion
    if (card) {
      KanbanService.logActivity(cardId, card.board_id, 'card_deleted', 'card', card.title, null);
    }
    // Delete associated comments
    var comments = DataService.getRecords('kanban_comments', { card_id: cardId });
    comments.forEach(function(c) {
      DataService.deleteRecord('kanban_comments', c.id, { hard: true });
    });
    // Delete associated checklists
    var checklists = DataService.getRecords('kanban_checklists', { card_id: cardId });
    checklists.forEach(function(cl) {
      DataService.deleteRecord('kanban_checklists', cl.id, { hard: true });
    });
    return DataService.deleteRecord('kanban_cards', cardId, { hard: true });
  });
}

/**
 * Moves a card to a new column and position.
 * @param {string} cardId
 * @param {string} newColumnId
 * @param {number} newPosition
 */
function apiMoveCard(cardId, newColumnId, newPosition) {
  return apiWrap_('apiMoveCard', function() {
    AuthService.requireAdmin();
    return KanbanService.moveCard(cardId, newColumnId, newPosition);
  });
}

// ── Comment APIs ──

/**
 * Returns comments for a card.
 * @param {string} cardId
 */
function apiGetCardComments(cardId) {
  return apiWrap_('apiGetCardComments', function() {
    AuthService.requireAuth();
    return KanbanService.getCardComments(cardId);
  });
}

/**
 * Creates a comment on a card.
 * @param {string} cardId
 * @param {string} content
 */
function apiCreateComment(cardId, content) {
  return apiWrap_('apiCreateComment', function() {
    AuthService.requireAuth();
    return KanbanService.createComment(cardId, content);
  });
}

// ── Checklist APIs ──

/**
 * Returns checklist items for a card.
 * @param {string} cardId
 */
function apiGetCardChecklists(cardId) {
  return apiWrap_('apiGetCardChecklists', function() {
    AuthService.requireAuth();
    return KanbanService.getCardChecklists(cardId);
  });
}

/**
 * Creates a checklist item on a card.
 * @param {string} cardId
 * @param {string} text
 */
function apiCreateChecklistItem(cardId, text) {
  return apiWrap_('apiCreateChecklistItem', function() {
    AuthService.requireAdmin();
    return KanbanService.createChecklistItem(cardId, text);
  });
}

/**
 * Updates a checklist item (toggle checked, edit text).
 * @param {string} itemId
 * @param {Object} updates — { is_checked, text }
 */
function apiUpdateChecklistItem(itemId, updates) {
  return apiWrap_('apiUpdateChecklistItem', function() {
    AuthService.requireAdmin();
    return KanbanService.updateChecklistItem(itemId, updates);
  });
}

/**
 * Deletes a checklist item.
 * @param {string} itemId
 */
function apiDeleteChecklistItem(itemId) {
  return apiWrap_('apiDeleteChecklistItem', function() {
    AuthService.requireAdmin();
    return KanbanService.deleteChecklistItem(itemId);
  });
}

/**
 * Reorders checklist items.
 * @param {string} cardId
 * @param {string[]} orderedIds
 */
function apiReorderChecklistItems(cardId, orderedIds) {
  return apiWrap_('apiReorderChecklistItems', function() {
    AuthService.requireAdmin();
    return KanbanService.reorderChecklistItems(cardId, orderedIds);
  });
}

// ── Activity APIs ──

/**
 * Returns activity entries for a card.
 * @param {string} cardId
 */
function apiGetCardActivity(cardId) {
  return apiWrap_('apiGetCardActivity', function() {
    AuthService.requireAuth();
    return KanbanService.getCardActivity(cardId);
  });
}

/**
 * Returns activity entries for a board.
 * @param {string} boardId
 * @param {number} [limit]
 */
function apiGetBoardActivity(boardId, limit) {
  return apiWrap_('apiGetBoardActivity', function() {
    AuthService.requireAuth();
    return KanbanService.getBoardActivity(boardId, limit);
  });
}

// ── Analytics API ──

/**
 * Returns analytics data for a board.
 * @param {string} boardId
 */
function apiGetKanbanAnalytics(boardId) {
  return apiWrap_('apiGetKanbanAnalytics', function() {
    AuthService.requireAdmin();
    return KanbanService.getKanbanAnalytics(boardId);
  });
}

// ── Bulk Operation APIs ──

/**
 * Moves multiple cards to a target column.
 * @param {string[]} cardIds
 * @param {string} targetColumnId
 */
function apiKanbanBulkMove(cardIds, targetColumnId) {
  return apiWrap_('apiKanbanBulkMove', function() {
    AuthService.requireAdmin();
    if (!cardIds || !cardIds.length) throw new Error('VALIDATION: cardIds is required');
    if (!targetColumnId) throw new Error('VALIDATION: targetColumnId is required');
    var results = [];
    for (var i = 0; i < cardIds.length; i++) {
      results.push(KanbanService.moveCard(cardIds[i], targetColumnId, i + 1));
    }
    return { moved: results.length };
  });
}

/**
 * Updates priority for multiple cards.
 * @param {string[]} cardIds
 * @param {string} priority
 */
function apiKanbanBulkUpdatePriority(cardIds, priority) {
  return apiWrap_('apiKanbanBulkUpdatePriority', function() {
    AuthService.requireAdmin();
    if (!cardIds || !cardIds.length) throw new Error('VALIDATION: cardIds is required');
    if (!priority) throw new Error('VALIDATION: priority is required');
    for (var i = 0; i < cardIds.length; i++) {
      var oldCard = DataService.getRecordById('kanban_cards', cardIds[i]);
      DataService.updateRecord('kanban_cards', cardIds[i], { priority: priority });
      if (oldCard) {
        KanbanService.logActivity(cardIds[i], oldCard.board_id, 'card_updated', 'priority', oldCard.priority, priority);
      }
    }
    return { updated: cardIds.length };
  });
}

/**
 * Deletes multiple cards (with cascade for comments + checklists).
 * @param {string[]} cardIds
 */
function apiKanbanBulkDelete(cardIds) {
  return apiWrap_('apiKanbanBulkDelete', function() {
    AuthService.requireAdmin();
    if (!cardIds || !cardIds.length) throw new Error('VALIDATION: cardIds is required');
    for (var i = 0; i < cardIds.length; i++) {
      var card = DataService.getRecordById('kanban_cards', cardIds[i]);
      if (card) {
        KanbanService.logActivity(cardIds[i], card.board_id, 'card_deleted', 'card', card.title, null);
      }
      // Cascade delete comments
      var comments = DataService.getRecords('kanban_comments', { card_id: cardIds[i] });
      comments.forEach(function(c) {
        DataService.deleteRecord('kanban_comments', c.id, { hard: true });
      });
      // Cascade delete checklists
      var checklists = DataService.getRecords('kanban_checklists', { card_id: cardIds[i] });
      checklists.forEach(function(cl) {
        DataService.deleteRecord('kanban_checklists', cl.id, { hard: true });
      });
      DataService.deleteRecord('kanban_cards', cardIds[i], { hard: true });
    }
    return { deleted: cardIds.length };
  });
}

// ═══════════════════════════════════════════════
// Growth Plans / PGP API (Phase 3 — Standards-Based)
// ═══════════════════════════════════════════════

// ── Standards ──

function apiGetPgpStandards() {
  return apiWrap_('apiGetPgpStandards', function() {
    return GrowthPlanService.getStandards();
  });
}

function apiCreatePgpStandard(data) {
  return apiWrap_('apiCreatePgpStandard', function() {
    return GrowthPlanService.createStandard(sanitizeObject(data));
  });
}

function apiUpdatePgpStandard(standardId, updates) {
  return apiWrap_('apiUpdatePgpStandard', function() {
    return GrowthPlanService.updateStandard(standardId, sanitizeObject(updates));
  });
}

function apiDeletePgpStandard(standardId) {
  return apiWrap_('apiDeletePgpStandard', function() {
    return GrowthPlanService.deleteStandard(standardId);
  });
}

function apiReorderPgpStandards(orderList) {
  return apiWrap_('apiReorderPgpStandards', function() {
    return GrowthPlanService.reorderStandards(orderList);
  });
}

// ── Plans ──

function apiGetGrowthPlanOverview(filters) {
  return apiWrap_('apiGetGrowthPlanOverview', function() {
    return GrowthPlanService.getOverview(filters);
  });
}

function apiGetGrowthPlanDetail(planId) {
  return apiWrap_('apiGetGrowthPlanDetail', function() {
    return GrowthPlanService.getPlanDetail(planId);
  });
}

function apiGetMyGrowthPlan() {
  return apiWrap_('apiGetMyGrowthPlan', function() {
    return GrowthPlanService.getMyPlan();
  });
}

function apiCreateGrowthPlan(data) {
  return apiWrap_('apiCreateGrowthPlan', function() {
    return GrowthPlanService.createPlan(sanitizeObject(data));
  });
}

function apiUpdateGrowthPlan(planId, updates) {
  return apiWrap_('apiUpdateGrowthPlan', function() {
    return GrowthPlanService.updatePlan(planId, sanitizeObject(updates));
  });
}

function apiDeleteGrowthPlan(planId) {
  return apiWrap_('apiDeleteGrowthPlan', function() {
    return GrowthPlanService.deletePlan(planId);
  });
}

// ── Standard Selections ──

function apiSelectStandards(data) {
  return apiWrap_('apiSelectStandards', function() {
    return GrowthPlanService.selectStandards(sanitizeObject(data));
  });
}

function apiUpdateStandardSelection(selectionId, updates) {
  return apiWrap_('apiUpdateStandardSelection', function() {
    return GrowthPlanService.updateStandardSelection(selectionId, sanitizeObject(updates));
  });
}

// ── Cycle History ──

function apiGetStandardsAtAGlance(staffId) {
  return apiWrap_('apiGetStandardsAtAGlance', function() {
    return GrowthPlanService.getStandardsAtAGlance(staffId);
  });
}

function apiGetCycleHistory(staffId) {
  return apiWrap_('apiGetCycleHistory', function() {
    return GrowthPlanService.getCycleHistory(staffId);
  });
}

// ── Meetings ──

function apiCreateGrowthMeeting(data) {
  return apiWrap_('apiCreateGrowthMeeting', function() {
    return GrowthPlanService.createMeeting(sanitizeObject(data));
  });
}

function apiUpdateGrowthMeeting(meetingId, updates) {
  return apiWrap_('apiUpdateGrowthMeeting', function() {
    return GrowthPlanService.updateMeeting(meetingId, sanitizeObject(updates));
  });
}

// ── Signatures ──

function apiSignGrowthPlan(planId, signatureType) {
  return apiWrap_('apiSignGrowthPlan', function() {
    return GrowthPlanService.signPlan(planId, signatureType);
  });
}

// ── DDO: ITC Maps ──

/**
 * Creates or upserts an Immunity to Change map for a standard selection.
 * @param {Object} data - { selection_id, commitment, doing_not_doing, competing_commitments, big_assumptions, reflection_notes }
 */
function apiCreateITCMap(data) {
  return apiWrap_('apiCreateITCMap', function() {
    AuthService.requireAuth();
    return GrowthPlanService.createITCMap(sanitizeObject(data));
  });
}

/**
 * Updates an existing ITC map.
 * @param {string} mapId
 * @param {Object} updates
 */
function apiUpdateITCMap(mapId, updates) {
  return apiWrap_('apiUpdateITCMap', function() {
    AuthService.requireAuth();
    return GrowthPlanService.updateITCMap(mapId, sanitizeObject(updates));
  });
}

/**
 * Returns the ITC map for a standard selection.
 * @param {string} selectionId
 */
function apiGetITCMap(selectionId) {
  return apiWrap_('apiGetITCMap', function() {
    AuthService.requireAuth();
    return GrowthPlanService.getITCMap(selectionId);
  });
}

// ── DDO: Developmental Wall ──

/**
 * Returns publicly-shared growing edges for the developmental wall.
 */
function apiGetDevelopmentalWall() {
  return apiWrap_('apiGetDevelopmentalWall', function() {
    AuthService.requireAuth();
    return GrowthPlanService.getDevelopmentalWall();
  });
}

// ── DDO: Coaching Triads ──

/**
 * Returns all active coaching groups with members.
 */
function apiGetCoachingGroups() {
  return apiWrap_('apiGetCoachingGroups', function() {
    AuthService.requireAuth();
    return GrowthPlanService.getCoachingGroups();
  });
}

/**
 * Creates a coaching group. Admin only.
 * @param {Object} data - { group_name, group_type?, facilitator_id?, meeting_frequency_weeks? }
 */
function apiCreateCoachingGroup(data) {
  return apiWrap_('apiCreateCoachingGroup', function() {
    AuthService.requireAdmin();
    return GrowthPlanService.createCoachingGroup(sanitizeObject(data));
  });
}

/**
 * Adds a member to a coaching group. Admin only.
 * @param {string} groupId
 * @param {string} staffId
 * @param {string} [role] - 'member' or 'facilitator'
 */
function apiAddGroupMember(groupId, staffId, role) {
  return apiWrap_('apiAddGroupMember', function() {
    AuthService.requireAdmin();
    return GrowthPlanService.addGroupMember(groupId, staffId, role);
  });
}

/**
 * Removes a member from a coaching group. Admin only.
 * @param {string} groupId
 * @param {string} staffId
 */
function apiRemoveGroupMember(groupId, staffId) {
  return apiWrap_('apiRemoveGroupMember', function() {
    AuthService.requireAdmin();
    return GrowthPlanService.removeGroupMember(groupId, staffId);
  });
}

/**
 * Returns the current user's coaching group with members and recent meetings.
 */
function apiGetMyCoachingGroup() {
  return apiWrap_('apiGetMyCoachingGroup', function() {
    AuthService.requireAuth();
    return GrowthPlanService.getMyCoachingGroup();
  });
}

/**
 * Returns meetings for a coaching group.
 * @param {string} groupId
 */
function apiGetCoachingMeetings(groupId) {
  return apiWrap_('apiGetCoachingMeetings', function() {
    AuthService.requireAuth();
    return GrowthPlanService.getCoachingMeetings(groupId);
  });
}

/**
 * Creates a coaching meeting log. Any group member can log.
 * @param {Object} data - { group_id, meeting_date, facilitator_id?, attendees_csv?, topic, growing_edge_discussed?, key_insights?, action_commitments?, next_meeting_date? }
 */
function apiCreateCoachingMeeting(data) {
  return apiWrap_('apiCreateCoachingMeeting', function() {
    AuthService.requireAuth();
    return GrowthPlanService.createCoachingMeeting(sanitizeObject(data));
  });
}

// ═══════════════════════════════════════════════
// Projects API (Phase 4)
// ═══════════════════════════════════════════════

/**
 * Returns project overview with stats.
 * @param {Object} [filters] - { status?, owner_id? }
 */
function apiGetProjectOverview(filters) {
  return apiWrap_('apiGetProjectOverview', function() {
    AuthService.requireAdmin();
    return ProjectService.getOverview(filters);
  });
}

/**
 * Returns full project detail with phases and tasks.
 * @param {string} projectId
 */
function apiGetProjectDetail(projectId) {
  return apiWrap_('apiGetProjectDetail', function() {
    AuthService.requireAdmin();
    return ProjectService.getProjectDetail(projectId);
  });
}

/**
 * Creates a new project.
 * @param {Object} data - { title, description?, owner_id, start_date?, target_end_date? }
 */
function apiCreateProject(data) {
  return apiWrap_('apiCreateProject', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    return ProjectService.createProject(sanitized);
  });
}

/**
 * Updates a project.
 * @param {string} projectId
 * @param {Object} updates
 */
function apiUpdateProject(projectId, updates) {
  return apiWrap_('apiUpdateProject', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(updates);
    var oldProject = DataService.getRecordById('projects', projectId);
    var result = ProjectService.updateProject(projectId, sanitized);
    if (oldProject && sanitized.status && sanitized.status !== oldProject.status) {
      ProjectService.logProjectActivity('', projectId, 'project_status_changed', 'status', oldProject.status, sanitized.status);
    }
    return result;
  });
}

/**
 * Deletes a project and cascades to phases and tasks.
 * @param {string} projectId
 */
function apiDeleteProject(projectId) {
  return apiWrap_('apiDeleteProject', function() {
    AuthService.requireAdmin();
    return ProjectService.deleteProject(projectId);
  });
}

/**
 * Creates a phase within a project.
 * @param {Object} data - { project_id, title, description?, start_date?, end_date?, depends_on_phase_id? }
 */
function apiCreateProjectPhase(data) {
  return apiWrap_('apiCreateProjectPhase', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    var created = ProjectService.createPhase(sanitized);
    ProjectService.logProjectActivity('', sanitized.project_id, 'phase_created', 'phase', null, sanitized.title);
    return created;
  });
}

/**
 * Updates a project phase.
 * @param {string} phaseId
 * @param {Object} updates
 */
function apiUpdateProjectPhase(phaseId, updates) {
  return apiWrap_('apiUpdateProjectPhase', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(updates);
    var oldPhase = DataService.getRecordById('project_phases', phaseId);
    var result = ProjectService.updatePhase(phaseId, sanitized);
    if (oldPhase && sanitized.status && sanitized.status !== oldPhase.status) {
      ProjectService.logProjectActivity('', oldPhase.project_id, 'phase_status_changed', 'status', oldPhase.status, sanitized.status);
    }
    return result;
  });
}

/**
 * Deletes a project phase and cascades to tasks.
 * @param {string} phaseId
 */
function apiDeleteProjectPhase(phaseId) {
  return apiWrap_('apiDeleteProjectPhase', function() {
    AuthService.requireAdmin();
    var phase = DataService.getRecordById('project_phases', phaseId);
    if (phase) {
      ProjectService.logProjectActivity('', phase.project_id, 'phase_deleted', 'phase', phase.title, null);
    }
    return ProjectService.deletePhase(phaseId);
  });
}

/**
 * Creates a task within a phase.
 * @param {Object} data - { phase_id, project_id, title, assigned_to?, due_date?, notes? }
 */
function apiCreateProjectTask(data) {
  return apiWrap_('apiCreateProjectTask', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    var created = ProjectService.createTask(sanitized);
    ProjectService.logProjectActivity(created.id, sanitized.project_id, 'task_created', 'task', null, sanitized.title);
    return created;
  });
}

/**
 * Updates a project task.
 * @param {string} taskId
 * @param {Object} updates
 */
function apiUpdateProjectTask(taskId, updates) {
  return apiWrap_('apiUpdateProjectTask', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(updates);
    // Snapshot old values for activity logging
    var oldTask = DataService.getRecordById('project_tasks', taskId);
    var result = ProjectService.updateTask(taskId, sanitized);
    if (oldTask) {
      if (sanitized.status && sanitized.status !== oldTask.status) {
        ProjectService.logProjectActivity(taskId, oldTask.project_id, 'task_status_changed', 'status', oldTask.status, sanitized.status);
      }
      var trackFields = ['title', 'assigned_to', 'due_date', 'notes'];
      for (var i = 0; i < trackFields.length; i++) {
        var f = trackFields[i];
        if (sanitized.hasOwnProperty(f) && String(sanitized[f] || '') !== String(oldTask[f] || '')) {
          ProjectService.logProjectActivity(taskId, oldTask.project_id, 'task_updated', f, oldTask[f], sanitized[f]);
        }
      }
    }
    return result;
  });
}

/**
 * Deletes a project task.
 * @param {string} taskId
 */
function apiDeleteProjectTask(taskId) {
  return apiWrap_('apiDeleteProjectTask', function() {
    AuthService.requireAdmin();
    var task = DataService.getRecordById('project_tasks', taskId);
    if (task) {
      ProjectService.logProjectActivity(taskId, task.project_id, 'task_deleted', 'task', task.title, null);
    }
    return ProjectService.deleteTask(taskId);
  });
}

/**
 * Returns timeline data for a project.
 * @param {string} projectId
 */
function apiGetProjectTimeline(projectId) {
  return apiWrap_('apiGetProjectTimeline', function() {
    AuthService.requireAdmin();
    return ProjectService.getTimelineData(projectId);
  });
}

// ── Project Risk Register (Phase 4b) ──

/**
 * Returns risks for a project sorted by score.
 * @param {string} projectId
 */
function apiGetProjectRisks(projectId) {
  return apiWrap_('apiGetProjectRisks', function() {
    AuthService.requireAdmin();
    return ProjectService.getProjectRisks(projectId);
  });
}

/**
 * Creates a new project risk.
 * @param {Object} data
 */
function apiCreateProjectRisk(data) {
  return apiWrap_('apiCreateProjectRisk', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    return ProjectService.createRisk(sanitized);
  });
}

/**
 * Updates a project risk.
 * @param {string} riskId
 * @param {Object} updates
 */
function apiUpdateProjectRisk(riskId, updates) {
  return apiWrap_('apiUpdateProjectRisk', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(updates);
    return ProjectService.updateRisk(riskId, sanitized);
  });
}

/**
 * Deletes a project risk.
 * @param {string} riskId
 */
function apiDeleteProjectRisk(riskId) {
  return apiWrap_('apiDeleteProjectRisk', function() {
    AuthService.requireAdmin();
    return ProjectService.deleteRisk(riskId);
  });
}

/**
 * Returns the 5×5 risk heat map for a project.
 * @param {string} projectId
 */
function apiGetRiskHeatMap(projectId) {
  return apiWrap_('apiGetRiskHeatMap', function() {
    AuthService.requireAdmin();
    return ProjectService.getRiskHeatMap(projectId);
  });
}

// ── Project Activity & Comments (Phase 4b) ──

/**
 * Returns activity entries for a specific task.
 * @param {string} taskId
 */
function apiGetTaskActivity(taskId) {
  return apiWrap_('apiGetTaskActivity', function() {
    AuthService.requireAdmin();
    return ProjectService.getTaskActivity(taskId);
  });
}

/**
 * Returns project-wide activity feed.
 * @param {string} projectId
 * @param {number} [limit]
 */
function apiGetProjectActivity(projectId, limit) {
  return apiWrap_('apiGetProjectActivity', function() {
    AuthService.requireAdmin();
    return ProjectService.getProjectActivity(projectId, limit);
  });
}

/**
 * Creates a comment on a project task.
 * @param {string} taskId
 * @param {string} projectId
 * @param {string} content
 */
function apiCreateProjectComment(taskId, projectId, content) {
  return apiWrap_('apiCreateProjectComment', function() {
    AuthService.requireAdmin();
    return ProjectService.createProjectComment(taskId, projectId, sanitizeInput(content));
  });
}

/**
 * Returns comments for a project task.
 * @param {string} taskId
 */
function apiGetTaskComments(taskId) {
  return apiWrap_('apiGetTaskComments', function() {
    AuthService.requireAdmin();
    return ProjectService.getTaskComments(taskId);
  });
}

// ── Project Resource Workload (Phase 4b) ──

/**
 * Returns cross-project resource workload analysis.
 */
function apiGetResourceWorkload() {
  return apiWrap_('apiGetResourceWorkload', function() {
    AuthService.requireAdmin();
    return ProjectService.getResourceWorkload();
  });
}

// ═══════════════════════════════════════════════
// Change Management API (Phase 5)
// ═══════════════════════════════════════════════

/**
 * Returns change management overview with stats.
 * @param {Object} [filters] - { status?, champion_id? }
 */
function apiGetChangeMgmtOverview(filters) {
  return apiWrap_('apiGetChangeMgmtOverview', function() {
    AuthService.requireAdmin();
    return ChangeMgmtService.getOverview(filters);
  });
}

/**
 * Returns full initiative detail with assessments, phases, stakeholders.
 * @param {string} initiativeId
 */
function apiGetInitiativeDetail(initiativeId) {
  return apiWrap_('apiGetInitiativeDetail', function() {
    AuthService.requireAdmin();
    return ChangeMgmtService.getInitiativeDetail(initiativeId);
  });
}

/**
 * Creates a new initiative with auto-created Lippitt phases.
 * @param {Object} data
 */
function apiCreateInitiative(data) {
  return apiWrap_('apiCreateInitiative', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    return ChangeMgmtService.createInitiative(sanitized);
  });
}

/**
 * Updates an initiative.
 * @param {string} initiativeId
 * @param {Object} updates
 */
function apiUpdateInitiative(initiativeId, updates) {
  return apiWrap_('apiUpdateInitiative', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(updates);
    return ChangeMgmtService.updateInitiative(initiativeId, sanitized);
  });
}

/**
 * Deletes an initiative and cascades.
 * @param {string} initiativeId
 */
function apiDeleteInitiative(initiativeId) {
  return apiWrap_('apiDeleteInitiative', function() {
    AuthService.requireAdmin();
    return ChangeMgmtService.deleteInitiative(initiativeId);
  });
}

/**
 * Creates a Knoster assessment.
 * @param {Object} data
 */
function apiCreateKnosterAssessment(data) {
  return apiWrap_('apiCreateKnosterAssessment', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    return ChangeMgmtService.createAssessment(sanitized);
  });
}

/**
 * Returns assessment history for an initiative.
 * @param {string} initiativeId
 */
function apiGetAssessmentHistory(initiativeId) {
  return apiWrap_('apiGetAssessmentHistory', function() {
    AuthService.requireAdmin();
    return ChangeMgmtService.getAssessmentHistory(initiativeId);
  });
}

/**
 * Updates a Lippitt phase with sequential enforcement.
 * @param {string} phaseId
 * @param {Object} updates
 */
function apiUpdateLippittPhase(phaseId, updates) {
  return apiWrap_('apiUpdateLippittPhase', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(updates);
    return ChangeMgmtService.updateLippittPhase(phaseId, sanitized);
  });
}

/**
 * Adds a stakeholder to an initiative.
 * @param {Object} data
 */
function apiAddStakeholder(data) {
  return apiWrap_('apiAddStakeholder', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    return ChangeMgmtService.addStakeholder(sanitized);
  });
}

/**
 * Updates a stakeholder.
 * @param {string} stakeholderId
 * @param {Object} updates
 */
function apiUpdateStakeholder(stakeholderId, updates) {
  return apiWrap_('apiUpdateStakeholder', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(updates);
    return ChangeMgmtService.updateStakeholder(stakeholderId, sanitized);
  });
}

/**
 * Removes a stakeholder.
 * @param {string} stakeholderId
 */
function apiRemoveStakeholder(stakeholderId) {
  return apiWrap_('apiRemoveStakeholder', function() {
    AuthService.requireAdmin();
    return ChangeMgmtService.removeStakeholder(stakeholderId);
  });
}

/**
 * Returns initiative comparison data.
 */
function apiGetInitiativeComparison() {
  return apiWrap_('apiGetInitiativeComparison', function() {
    AuthService.requireAdmin();
    return ChangeMgmtService.getInitiativeComparison();
  });
}

/**
 * Returns change management config.
 */
function apiGetChangeMgmtConfig() {
  return apiWrap_('apiGetChangeMgmtConfig', function() {
    AuthService.requireAdmin();
    return ChangeMgmtService.getConfig();
  });
}

// ── CM Communications & Analytics (Phase 5b) ──

/**
 * Returns communications for an initiative with counts.
 * @param {string} initiativeId
 */
function apiGetCommunications(initiativeId) {
  return apiWrap_('apiGetCommunications', function() {
    AuthService.requireAdmin();
    return ChangeMgmtService.getCommunications(initiativeId);
  });
}

/**
 * Creates a new stakeholder communication.
 * @param {Object} data
 */
function apiCreateCommunication(data) {
  return apiWrap_('apiCreateCommunication', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    return ChangeMgmtService.createCommunication(sanitized);
  });
}

/**
 * Updates a communication record.
 * @param {string} communicationId
 * @param {Object} updates
 */
function apiUpdateCommunication(communicationId, updates) {
  return apiWrap_('apiUpdateCommunication', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(updates);
    return ChangeMgmtService.updateCommunication(communicationId, sanitized);
  });
}

/**
 * Deletes a communication record.
 * @param {string} communicationId
 */
function apiDeleteCommunication(communicationId) {
  return apiWrap_('apiDeleteCommunication', function() {
    AuthService.requireAdmin();
    return ChangeMgmtService.deleteCommunication(communicationId);
  });
}

/**
 * Returns a pre-filled communication template for a message type.
 * @param {string} messageType
 * @param {string} initiativeId
 */
function apiGetCommunicationTemplate(messageType, initiativeId) {
  return apiWrap_('apiGetCommunicationTemplate', function() {
    AuthService.requireAdmin();
    return ChangeMgmtService.getCommunicationTemplate(messageType, initiativeId);
  });
}

/**
 * Returns readiness trend data for an initiative (assessment history for charting).
 * @param {string} initiativeId
 */
function apiGetReadinessTrends(initiativeId) {
  return apiWrap_('apiGetReadinessTrends', function() {
    AuthService.requireAdmin();
    return ChangeMgmtService.getReadinessTrends(initiativeId);
  });
}

/**
 * Returns cross-initiative readiness heat map data.
 */
function apiGetReadinessHeatMap() {
  return apiWrap_('apiGetReadinessHeatMap', function() {
    AuthService.requireAdmin();
    return ChangeMgmtService.getReadinessHeatMap();
  });
}

/**
 * Returns initiative timeline with phases, milestones, health score, durations.
 * @param {string} initiativeId
 */
function apiGetInitiativeTimeline(initiativeId) {
  return apiWrap_('apiGetInitiativeTimeline', function() {
    AuthService.requireAdmin();
    return ChangeMgmtService.getInitiativeTimeline(initiativeId);
  });
}

// ═══════════════════════════════════════════════
// Accreditation API
// ═══════════════════════════════════════════════

/**
 * Returns accreditation overview (all frameworks with stats).
 */
function apiGetAccreditationOverview(filters) {
  return apiWrap_('apiGetAccreditationOverview', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(filters);
    return AccreditationService.getOverview(sanitized);
  });
}

/**
 * Returns full framework detail with domains and standards.
 */
function apiGetFrameworkDetail(frameworkId) {
  return apiWrap_('apiGetFrameworkDetail', function() {
    AuthService.requireAdmin();
    return AccreditationService.getFrameworkDetail(frameworkId);
  });
}

/**
 * Creates a new accreditation framework.
 */
function apiCreateFramework(data) {
  return apiWrap_('apiCreateFramework', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    return AccreditationService.createFramework(sanitized);
  });
}

/**
 * Updates an accreditation framework.
 */
function apiUpdateFramework(frameworkId, updates) {
  return apiWrap_('apiUpdateFramework', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(updates);
    return AccreditationService.updateFramework(frameworkId, sanitized);
  });
}

/**
 * Deletes a framework and all related data.
 */
function apiDeleteFramework(frameworkId) {
  return apiWrap_('apiDeleteFramework', function() {
    AuthService.requireAdmin();
    return AccreditationService.deleteFramework(frameworkId);
  });
}

/**
 * Creates a standard within a framework.
 */
function apiCreateStandard(data) {
  return apiWrap_('apiCreateStandard', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    return AccreditationService.createStandard(sanitized);
  });
}

/**
 * Updates a standard.
 */
function apiUpdateStandard(standardId, updates) {
  return apiWrap_('apiUpdateStandard', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(updates);
    return AccreditationService.updateStandard(standardId, sanitized);
  });
}

/**
 * Deletes a standard and all related evidence/narratives.
 */
function apiDeleteStandard(standardId) {
  return apiWrap_('apiDeleteStandard', function() {
    AuthService.requireAdmin();
    return AccreditationService.deleteStandard(standardId);
  });
}

/**
 * Reorders standards by position.
 */
function apiReorderStandards(standardIds) {
  return apiWrap_('apiReorderStandards', function() {
    AuthService.requireAdmin();
    return AccreditationService.reorderStandards(standardIds);
  });
}

/**
 * Returns full standard detail with evidence and narratives.
 */
function apiGetStandardDetail(standardId) {
  return apiWrap_('apiGetStandardDetail', function() {
    AuthService.requireAdmin();
    return AccreditationService.getStandardDetail(standardId);
  });
}

/**
 * Creates an evidence record.
 */
function apiCreateEvidence(data) {
  return apiWrap_('apiCreateEvidence', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    return AccreditationService.createEvidence(sanitized);
  });
}

/**
 * Updates an evidence record.
 */
function apiUpdateEvidence(evidenceId, updates) {
  return apiWrap_('apiUpdateEvidence', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(updates);
    return AccreditationService.updateEvidence(evidenceId, sanitized);
  });
}

/**
 * Deletes an evidence record.
 */
function apiDeleteEvidence(evidenceId) {
  return apiWrap_('apiDeleteEvidence', function() {
    AuthService.requireAdmin();
    return AccreditationService.deleteEvidence(evidenceId);
  });
}

/**
 * Reviews evidence (sets reviewer, status, notes).
 */
function apiReviewEvidence(evidenceId, data) {
  return apiWrap_('apiReviewEvidence', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    return AccreditationService.reviewEvidence(evidenceId, sanitized);
  });
}

/**
 * Saves a new narrative version.
 */
function apiSaveNarrative(data) {
  return apiWrap_('apiSaveNarrative', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    return AccreditationService.saveNarrative(sanitized);
  });
}

/**
 * Updates narrative status (draft/review/final).
 */
function apiUpdateNarrativeStatus(narrativeId, status) {
  return apiWrap_('apiUpdateNarrativeStatus', function() {
    AuthService.requireAdmin();
    return AccreditationService.updateNarrativeStatus(narrativeId, status);
  });
}

/**
 * Exports a single standard to a Google Doc.
 */
function apiExportStandardDoc(standardId) {
  return apiWrap_('apiExportStandardDoc', function() {
    AuthService.requireAdmin();
    return AccreditationService.exportStandardDoc(standardId);
  });
}

/**
 * Exports all standards in a domain to a Google Doc.
 */
function apiExportDomainDoc(frameworkId, domain) {
  return apiWrap_('apiExportDomainDoc', function() {
    AuthService.requireAdmin();
    return AccreditationService.exportDomainDoc(frameworkId, domain);
  });
}

/**
 * Exports the complete self-study to a Google Doc.
 */
function apiExportSelfStudy(frameworkId) {
  return apiWrap_('apiExportSelfStudy', function() {
    AuthService.requireAdmin();
    return AccreditationService.exportSelfStudy(frameworkId);
  });
}

/**
 * Converts a Google Doc to PDF.
 */
function apiExportToPdf(docId) {
  return apiWrap_('apiExportToPdf', function() {
    AuthService.requireAdmin();
    return AccreditationService.exportToPdf(docId);
  });
}

/**
 * Creates an evidence binder folder structure in Google Drive.
 */
function apiCreateEvidenceBinder(frameworkId) {
  return apiWrap_('apiCreateEvidenceBinder', function() {
    AuthService.requireAdmin();
    return AccreditationService.createEvidenceBinder(frameworkId);
  });
}

/**
 * Returns visit readiness analysis (gaps, progress).
 */
function apiGetVisitReadiness(frameworkId) {
  return apiWrap_('apiGetVisitReadiness', function() {
    AuthService.requireAdmin();
    return AccreditationService.getVisitReadiness(frameworkId);
  });
}

// ═══════════════════════════════════════════════
// Reporting API (Phase 7)
// ═══════════════════════════════════════════════

/**
 * Returns executive summary KPIs across all modules.
 */
function apiGetExecutiveSummary() {
  return apiWrap_('apiGetExecutiveSummary', function() {
    AuthService.requireAdmin();
    return ReportingService.getExecutiveSummary();
  });
}

/**
 * Returns drill-down detail for a specific module section.
 */
function apiGetReportingModuleDetail(moduleKey) {
  return apiWrap_('apiGetReportingModuleDetail', function() {
    AuthService.requireAdmin();
    return ReportingService.getModuleDetail(sanitizeInput(moduleKey));
  });
}

/**
 * Returns a print-friendly snapshot of the executive summary.
 */
function apiGetPrintSnapshot() {
  return apiWrap_('apiGetPrintSnapshot', function() {
    AuthService.requireAdmin();
    return ReportingService.getPrintSnapshot();
  });
}

/**
 * Returns a Leadership Investment Report for a supervisor.
 */
function apiGetLeadershipInvestmentReport(supervisorId) {
  return apiWrap_('apiGetLeadershipInvestmentReport', function() {
    AuthService.requireAdmin();
    return ReportingService.getLeadershipInvestmentReport(sanitizeInput(supervisorId));
  });
}

// ═══════════════════════════════════════════════
// Meeting Minutes API
// ═══════════════════════════════════════════════

/**
 * Returns all meetings with action item counts.
 */
function apiGetMeetingOverview(filters) {
  return apiWrap_('apiGetMeetingOverview', function() {
    AuthService.requireAdmin();
    return MeetingService.getOverview(filters);
  });
}

/**
 * Returns full meeting detail with attendees, action items, activity.
 */
function apiGetMeetingDetail(meetingId) {
  return apiWrap_('apiGetMeetingDetail', function() {
    AuthService.requireAdmin();
    return MeetingService.getMeetingDetail(meetingId);
  });
}

/**
 * Creates a new meeting.
 */
function apiCreateMeeting(data) {
  return apiWrap_('apiCreateMeeting', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    validateRequired(sanitized, ['title', 'meeting_type', 'meeting_date']);
    return MeetingService.createMeeting(sanitized);
  });
}

/**
 * Updates a meeting.
 */
function apiUpdateMeeting(meetingId, updates) {
  return apiWrap_('apiUpdateMeeting', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(updates);
    return MeetingService.updateMeeting(meetingId, sanitized);
  });
}

/**
 * Deletes a meeting and all associated data.
 */
function apiDeleteMeeting(meetingId) {
  return apiWrap_('apiDeleteMeeting', function() {
    AuthService.requireAdmin();
    return MeetingService.deleteMeeting(meetingId);
  });
}

/**
 * Updates meeting status (finalize / archive).
 */
function apiUpdateMeetingStatus(meetingId, newStatus) {
  return apiWrap_('apiUpdateMeetingStatus', function() {
    AuthService.requireAdmin();
    return MeetingService.updateMeetingStatus(meetingId, sanitizeInput(newStatus));
  });
}

/**
 * Returns action items for a meeting.
 */
function apiGetMeetingActionItems(meetingId) {
  return apiWrap_('apiGetMeetingActionItems', function() {
    AuthService.requireAdmin();
    return MeetingService.getActionItems(meetingId);
  });
}

/**
 * Creates an action item on a meeting.
 */
function apiCreateMeetingActionItem(data) {
  return apiWrap_('apiCreateMeetingActionItem', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(data);
    validateRequired(sanitized, ['meeting_id', 'title']);
    return MeetingService.createActionItem(sanitized);
  });
}

/**
 * Updates an action item.
 */
function apiUpdateMeetingActionItem(itemId, updates) {
  return apiWrap_('apiUpdateMeetingActionItem', function() {
    AuthService.requireAdmin();
    var sanitized = sanitizeObject(updates);
    return MeetingService.updateActionItem(itemId, sanitized);
  });
}

/**
 * Deletes an action item.
 */
function apiDeleteMeetingActionItem(itemId) {
  return apiWrap_('apiDeleteMeetingActionItem', function() {
    AuthService.requireAdmin();
    return MeetingService.deleteActionItem(itemId);
  });
}

/**
 * Reorders action items within a meeting.
 */
function apiReorderMeetingActionItems(meetingId, itemIds) {
  return apiWrap_('apiReorderMeetingActionItems', function() {
    AuthService.requireAdmin();
    return MeetingService.reorderActionItems(meetingId, itemIds);
  });
}

/**
 * Links an action item to a new Project Task.
 */
function apiLinkActionToProjectTask(itemId, projectId, phaseId) {
  return apiWrap_('apiLinkActionToProjectTask', function() {
    AuthService.requireAdmin();
    var result = MeetingService.linkToProjectTask(itemId, projectId, phaseId);
    // Also log project activity
    ProjectService.logProjectActivity(result.taskId, projectId, 'task_created', 'task', null, 'Created from meeting action item');
    return result;
  });
}

/**
 * Links an action item to a new Kanban Card.
 */
function apiLinkActionToKanbanCard(itemId, boardId, columnId) {
  return apiWrap_('apiLinkActionToKanbanCard', function() {
    AuthService.requireAdmin();
    return MeetingService.linkToKanbanCard(itemId, boardId, columnId);
  });
}

/**
 * Returns activity log for a meeting.
 */
function apiGetMeetingActivity(meetingId, limit) {
  return apiWrap_('apiGetMeetingActivity', function() {
    AuthService.requireAdmin();
    return MeetingService.getMeetingActivity(meetingId, limit);
  });
}

/**
 * Returns meeting statistics for the dashboard.
 */
function apiGetMeetingStats() {
  return apiWrap_('apiGetMeetingStats', function() {
    AuthService.requireAdmin();
    return MeetingService.getStats();
  });
}

// ═══════════════════════════════════════════════
// PD Tracking API
// ═══════════════════════════════════════════════

function apiGetPDOverview(filters) {
  return apiWrap_('apiGetPDOverview', function() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    // Non-admins only see published offerings
    if (!user.isAdmin) {
      filters = filters || {};
      filters.status = 'published';
    }
    return PDService.getOverview(filters);
  });
}

function apiGetPDOfferingDetail(offeringId) {
  return apiWrap_('apiGetPDOfferingDetail', function() {
    AuthService.requireAuth();
    return PDService.getOfferingDetail(offeringId);
  });
}

function apiCreatePDOffering(data) {
  return apiWrap_('apiCreatePDOffering', function() {
    AuthService.requireAdmin();
    var user = AuthService.getCurrentUser();
    var sanitized = {
      title: sanitizeInput(data.title || ''),
      description: sanitizeInput(data.description || ''),
      facilitator_id: data.facilitator_id || '',
      category: data.category || 'workshop',
      session_date: data.session_date || '',
      start_time: data.start_time || '',
      end_time: data.end_time || '',
      location: sanitizeInput(data.location || ''),
      max_capacity: data.max_capacity || '',
      credit_hours: data.credit_hours || '',
      status: data.status || 'draft',
      related_standards_csv: data.related_standards_csv || '',
      related_tags: sanitizeInput(data.related_tags || ''),
      recurrence: data.recurrence || 'none',
      series_id: data.series_id || '',
      created_by: user.id
    };
    validateRequired(sanitized, ['title', 'category', 'session_date']);
    return PDService.createOffering(sanitized);
  });
}

function apiUpdatePDOffering(offeringId, updates) {
  return apiWrap_('apiUpdatePDOffering', function() {
    AuthService.requireAdmin();
    return PDService.updateOffering(offeringId, updates);
  });
}

function apiDeletePDOffering(offeringId) {
  return apiWrap_('apiDeletePDOffering', function() {
    AuthService.requireAdmin();
    return PDService.deleteOffering(offeringId);
  });
}

function apiUpdatePDOfferingStatus(offeringId, status) {
  return apiWrap_('apiUpdatePDOfferingStatus', function() {
    AuthService.requireAdmin();
    return PDService.updateOfferingStatus(offeringId, status);
  });
}

function apiRegisterForPD(offeringId) {
  return apiWrap_('apiRegisterForPD', function() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    return PDService.register(offeringId, user.id);
  });
}

function apiCancelPDRegistration(registrationId) {
  return apiWrap_('apiCancelPDRegistration', function() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    // Verify ownership
    var reg = DataService.getRecordById('pd_registrations', registrationId);
    if (!reg) throw new Error('Registration not found');
    if (reg.staff_id !== user.id && !user.isAdmin) {
      throw new Error('Not authorized to cancel this registration');
    }
    return PDService.cancelRegistration(registrationId);
  });
}

function apiMarkPDAttendance(offeringId, staffIds) {
  return apiWrap_('apiMarkPDAttendance', function() {
    AuthService.requireAdmin();
    return PDService.markAttendance(offeringId, staffIds);
  });
}

function apiGetMyPDRegistrations() {
  return apiWrap_('apiGetMyPDRegistrations', function() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    return PDService.getMyRegistrations(user.id);
  });
}

function apiAddPDReflection(data) {
  return apiWrap_('apiAddPDReflection', function() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    data.staff_id = user.id;
    return PDService.addReflection(data);
  });
}

function apiUpdatePDReflection(reflectionId, updates) {
  return apiWrap_('apiUpdatePDReflection', function() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    // Verify ownership
    var ref = DataService.getRecordById('pd_reflections', reflectionId);
    if (!ref) throw new Error('Reflection not found');
    if (ref.staff_id !== user.id && !user.isAdmin) {
      throw new Error('Not authorized to edit this reflection');
    }
    return PDService.updateReflection(reflectionId, updates);
  });
}

function apiLinkReflectionToStandard(reflectionId, selectionId) {
  return apiWrap_('apiLinkReflectionToStandard', function() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    // Verify ownership of reflection
    var ref = DataService.getRecordById('pd_reflections', reflectionId);
    if (!ref) throw new Error('Reflection not found');
    if (ref.staff_id !== user.id && !user.isAdmin) {
      throw new Error('Not authorized to link this reflection');
    }
    return PDService.linkReflectionToStandard(reflectionId, selectionId);
  });
}

function apiGetPDActivity(offeringId, limit) {
  return apiWrap_('apiGetPDActivity', function() {
    AuthService.requireAdmin();
    return PDService.getActivity(offeringId, limit);
  });
}

function apiGetPDStats() {
  return apiWrap_('apiGetPDStats', function() {
    AuthService.requireAdmin();
    return PDService.getStats();
  });
}

function apiGetStaffPDSummary(staffId) {
  return apiWrap_('apiGetStaffPDSummary', function() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    // Teachers can only see own summary
    var targetId = staffId || user.id;
    if (targetId !== user.id && !user.isAdmin) {
      throw new Error('Not authorized to view this staff PD summary');
    }
    return PDService.getStaffPDSummary(targetId);
  });
}

function apiGetRecommendedPD(standardId) {
  return apiWrap_('apiGetRecommendedPD', function() {
    AuthService.requireAuth();
    return PDService.getRecommendedForStandard(standardId);
  });
}

function apiGetMyPDSummary() {
  return apiWrap_('apiGetMyPDSummary', function() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    return PDService.getStaffPDSummary(user.id);
  });
}

// ═══════════════════════════════════════════════════════════
// Staff Feedback & 360 Reviews API
// ═══════════════════════════════════════════════════════════

function apiGetFeedbackCycles(filters) {
  return apiWrap_('apiGetFeedbackCycles', function() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    var result = FeedbackService.getCyclesOverview(filters);
    // Non-admin users only see cycles where they have assignments
    if (user.role !== 'admin') {
      var assignments = FeedbackService.getMyAssignments(user.id);
      var myCycleIds = {};
      for (var i = 0; i < assignments.length; i++) {
        myCycleIds[assignments[i].cycle_id] = true;
      }
      result.cycles = result.cycles.filter(function(c) {
        return myCycleIds[c.id] && c.status !== 'draft';
      });
    }
    return result;
  });
}

function apiGetFeedbackCycleDetail(cycleId) {
  return apiWrap_('apiGetFeedbackCycleDetail', function() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    var detail = FeedbackService.getCycleDetail(cycleId);
    // Non-admin: filter to only own assignments, hide other responder details
    if (user.role !== 'admin') {
      detail.assignments = detail.assignments.filter(function(a) {
        return a.responder_id === user.id || a.recipient_id === user.id;
      });
      // Hide responder names from recipients for anonymous assignments
      for (var i = 0; i < detail.assignments.length; i++) {
        var asg = detail.assignments[i];
        if (asg.is_anonymous && asg.recipient_id === user.id && asg.responder_id !== user.id) {
          asg.responder_name = 'Anonymous';
          asg.responder_id = '';
        }
      }
      detail.activity = [];
    }
    return detail;
  });
}

function apiCreateFeedbackCycle(data) {
  return apiWrap_('apiCreateFeedbackCycle', function() {
    AuthService.requireAdmin();
    return FeedbackService.createCycle(data);
  });
}

function apiUpdateFeedbackCycle(cycleId, updates) {
  return apiWrap_('apiUpdateFeedbackCycle', function() {
    AuthService.requireAdmin();
    return FeedbackService.updateCycle(cycleId, updates);
  });
}

function apiUpdateFeedbackCycleStatus(cycleId, status) {
  return apiWrap_('apiUpdateFeedbackCycleStatus', function() {
    AuthService.requireAdmin();
    return FeedbackService.updateCycleStatus(cycleId, status);
  });
}

function apiAddFeedbackQuestion(cycleId, data) {
  return apiWrap_('apiAddFeedbackQuestion', function() {
    AuthService.requireAdmin();
    return FeedbackService.addQuestion(cycleId, data);
  });
}

function apiUpdateFeedbackQuestion(questionId, updates) {
  return apiWrap_('apiUpdateFeedbackQuestion', function() {
    AuthService.requireAdmin();
    return FeedbackService.updateQuestion(questionId, updates);
  });
}

function apiDeleteFeedbackQuestion(questionId) {
  return apiWrap_('apiDeleteFeedbackQuestion', function() {
    AuthService.requireAdmin();
    return FeedbackService.deleteQuestion(questionId);
  });
}

function apiCreateFeedbackAssignment(data) {
  return apiWrap_('apiCreateFeedbackAssignment', function() {
    AuthService.requireAdmin();
    return FeedbackService.createAssignment(data);
  });
}

function apiBulkAssignFeedback(cycleId, recipientIds, config) {
  return apiWrap_('apiBulkAssignFeedback', function() {
    AuthService.requireAdmin();
    return FeedbackService.bulkAssign(cycleId, recipientIds, config);
  });
}

function apiDeclineFeedbackAssignment(assignmentId) {
  return apiWrap_('apiDeclineFeedbackAssignment', function() {
    AuthService.requireAuth();
    return FeedbackService.declineAssignment(assignmentId);
  });
}

function apiSubmitFeedbackResponse(assignmentId, answers) {
  return apiWrap_('apiSubmitFeedbackResponse', function() {
    AuthService.requireAuth();
    return FeedbackService.submitResponse(assignmentId, answers);
  });
}

function apiSaveFeedbackDraft(assignmentId, answers) {
  return apiWrap_('apiSaveFeedbackDraft', function() {
    AuthService.requireAuth();
    return FeedbackService.saveResponseDraft(assignmentId, answers);
  });
}

function apiGenerateFeedbackSummary(cycleId, recipientId) {
  return apiWrap_('apiGenerateFeedbackSummary', function() {
    AuthService.requireAdmin();
    return FeedbackService.generateSummary(cycleId, recipientId);
  });
}

function apiGenerateAllFeedbackSummaries(cycleId) {
  return apiWrap_('apiGenerateAllFeedbackSummaries', function() {
    AuthService.requireAdmin();
    return FeedbackService.generateAllSummaries(cycleId);
  });
}

function apiShareFeedbackSummary(summaryId) {
  return apiWrap_('apiShareFeedbackSummary', function() {
    AuthService.requireAdmin();
    return FeedbackService.shareSummary(summaryId);
  });
}

function apiGetMyFeedbackAssignments() {
  return apiWrap_('apiGetMyFeedbackAssignments', function() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    return FeedbackService.getMyAssignments(user.id);
  });
}

function apiGetFeedbackAssignmentDetail(assignmentId) {
  return apiWrap_('apiGetFeedbackAssignmentDetail', function() {
    AuthService.requireAuth();
    return FeedbackService.getAssignmentDetail(assignmentId);
  });
}

function apiLinkFeedbackToStandard(summaryId, selectionId) {
  return apiWrap_('apiLinkFeedbackToStandard', function() {
    AuthService.requireAuth();
    return FeedbackService.linkSummaryToStandard(summaryId, selectionId);
  });
}

function apiGetFeedbackStats() {
  return apiWrap_('apiGetFeedbackStats', function() {
    AuthService.requireAdmin();
    return FeedbackService.getStats();
  });
}

function apiGetFeedbackActivity(cycleId, limit) {
  return apiWrap_('apiGetFeedbackActivity', function() {
    AuthService.requireAdmin();
    return FeedbackService.getActivity(cycleId, limit);
  });
}

// ═══════════════════════════════════════════════
// Staff Wellness & Workload API
// ═══════════════════════════════════════════════

function apiSubmitWellnessCheckin(data) {
  return apiWrap_('apiSubmitWellnessCheckin', function() {
    var user = AuthService.requireAuth();
    return WellnessService.submitCheckin(user.id, data);
  });
}

function apiGetMyWellnessCheckins(limit) {
  return apiWrap_('apiGetMyWellnessCheckins', function() {
    var user = AuthService.requireAuth();
    return WellnessService.getMyCheckins(user.id, limit);
  });
}

function apiGetMyWellnessTrend(weeks) {
  return apiWrap_('apiGetMyWellnessTrend', function() {
    var user = AuthService.requireAuth();
    return WellnessService.getMyTrend(user.id, weeks);
  });
}

function apiGetMyLatestCheckin() {
  return apiWrap_('apiGetMyLatestCheckin', function() {
    var user = AuthService.requireAuth();
    return WellnessService.getMyLatestCheckin(user.id);
  });
}

function apiGetMyWorkload() {
  return apiWrap_('apiGetMyWorkload', function() {
    var user = AuthService.requireAuth();
    return WellnessService.getStaffWorkload(user.id);
  });
}

function apiGetStaffWorkload(staffId) {
  return apiWrap_('apiGetStaffWorkload', function() {
    var user = AuthService.requireAuth();
    // Admin can view any staff; non-admin can only view own
    if (user.role !== 'admin' && staffId !== user.id) {
      throw new Error('AUTH_FORBIDDEN: You can only view your own workload');
    }
    return WellnessService.getStaffWorkload(staffId);
  });
}

function apiGetWellnessAdminDashboard() {
  return apiWrap_('apiGetWellnessAdminDashboard', function() {
    AuthService.requireAdmin();
    return WellnessService.getAdminDashboard();
  });
}

function apiGetAllStaffWorkloads() {
  return apiWrap_('apiGetAllStaffWorkloads', function() {
    AuthService.requireAdmin();
    return WellnessService.getAllStaffWorkloads();
  });
}

function apiGetDepartmentWellness() {
  return apiWrap_('apiGetDepartmentWellness', function() {
    AuthService.requireAdmin();
    return WellnessService.getDepartmentWellness();
  });
}

function apiGetAnonymizedWellnessTrends(filters) {
  return apiWrap_('apiGetAnonymizedWellnessTrends', function() {
    AuthService.requireAdmin();
    return WellnessService.getAnonymizedTrends(filters);
  });
}

function apiGetWellnessAlerts() {
  return apiWrap_('apiGetWellnessAlerts', function() {
    AuthService.requireAdmin();
    return WellnessService.getActiveAlerts();
  });
}

function apiAcknowledgeWellnessAlert(alertId) {
  return apiWrap_('apiAcknowledgeWellnessAlert', function() {
    AuthService.requireAdmin();
    return WellnessService.acknowledgeAlert(alertId);
  });
}

function apiResolveWellnessAlert(alertId) {
  return apiWrap_('apiResolveWellnessAlert', function() {
    AuthService.requireAdmin();
    return WellnessService.resolveAlert(alertId);
  });
}

function apiRunBurnoutScan() {
  return apiWrap_('apiRunBurnoutScan', function() {
    AuthService.requireAdmin();
    return WellnessService.runBurnoutScan();
  });
}

function apiGetWellnessConfig() {
  return apiWrap_('apiGetWellnessConfig', function() {
    AuthService.requireAdmin();
    return WellnessService.getConfig();
  });
}

function apiUpdateWellnessConfig(key, value) {
  return apiWrap_('apiUpdateWellnessConfig', function() {
    AuthService.requireAdmin();
    return WellnessService.updateConfig(key, value);
  });
}

function apiGetWellnessActivity(limit) {
  return apiWrap_('apiGetWellnessActivity', function() {
    AuthService.requireAdmin();
    return WellnessService.getActivity(limit);
  });
}

function apiGetWellnessStats() {
  return apiWrap_('apiGetWellnessStats', function() {
    AuthService.requireAdmin();
    return WellnessService.getStats();
  });
}
