/**
 * MeetingService — Meeting Minutes CRUD, action items, task linking, activity logging.
 *
 * Tables: meetings, meeting_action_items, meeting_activity
 *
 * IIFE module — ES5 only (GAS Rhino runtime).
 */

var MeetingService = (function() {
  'use strict';

  // ═══════════════════════════════════════════════
  // Constants
  // ═══════════════════════════════════════════════

  var MEETING_TYPES = ['leadership_team', 'department', 'committee', 'staff', 'parent', 'other'];
  var MEETING_STATUSES = ['draft', 'finalized', 'archived'];
  var ACTION_ITEM_STATUSES = ['pending', 'in_progress', 'completed'];
  var ACTION_ITEM_PRIORITIES = ['low', 'medium', 'high'];
  var ACTIVITY_TYPES = [
    'meeting_created', 'meeting_updated', 'meeting_finalized', 'meeting_archived',
    'action_item_created', 'action_item_updated', 'action_item_completed', 'task_linked'
  ];

  // ═══════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════

  function staffMap_() {
    var allStaff = DataService.getRecords('staff');
    var map = {};
    allStaff.forEach(function(s) { map[s.id] = s; });
    return map;
  }

  function staffName_(map, id) {
    var s = map[id];
    return s ? s.first_name + ' ' + s.last_name : 'Unknown';
  }

  function staffInitials_(map, id) {
    var s = map[id];
    return s ? (s.first_name || '').charAt(0) + (s.last_name || '').charAt(0) : '??';
  }

  /**
   * Logs an activity entry for a meeting event.
   */
  function logMeetingActivity_(meetingId, actionItemId, actionType, fieldName, oldValue, newValue, userId) {
    var uid = userId;
    if (!uid) {
      try {
        var user = AuthService.getCurrentUser();
        uid = user.id;
      } catch (e) {
        uid = 'system';
      }
    }
    DataService.createRecord('meeting_activity', {
      meeting_id: meetingId || '',
      action_item_id: actionItemId || '',
      user_id: uid,
      action_type: actionType,
      field_name: fieldName || '',
      old_value: oldValue !== null && oldValue !== undefined ? String(oldValue) : '',
      new_value: newValue !== null && newValue !== undefined ? String(newValue) : '',
      created_at: nowISO()
    });
  }

  /**
   * Hydrates activity entries with user names and initials.
   */
  function hydrateMeetingActivity_(entries) {
    var sMap = staffMap_();
    return entries.map(function(e) {
      var staff = sMap[e.user_id];
      return {
        id: e.id,
        meetingId: e.meeting_id,
        actionItemId: e.action_item_id,
        userId: e.user_id,
        userName: staff ? staff.first_name + ' ' + staff.last_name : 'System',
        userInitials: staff ? (staff.first_name || '').charAt(0) + (staff.last_name || '').charAt(0) : 'SY',
        actionType: e.action_type,
        fieldName: e.field_name,
        oldValue: e.old_value,
        newValue: e.new_value,
        createdAt: e.created_at
      };
    });
  }

  /**
   * Hydrates a linked task reference on an action item.
   * Returns task details or null if not linked / task deleted.
   */
  function hydrateLinkedTask_(item) {
    if (!item.linked_task_type || !item.linked_task_id) return null;

    if (item.linked_task_type === 'project_task') {
      var task = DataService.getRecordById('project_tasks', item.linked_task_id);
      if (!task) return { type: 'project_task', id: item.linked_task_id, deleted: true };
      return {
        type: 'project_task',
        id: task.id,
        title: task.title,
        status: task.status,
        projectId: task.project_id,
        deleted: false
      };
    }

    if (item.linked_task_type === 'kanban_card') {
      var card = DataService.getRecordById('kanban_cards', item.linked_task_id);
      if (!card) return { type: 'kanban_card', id: item.linked_task_id, deleted: true };
      return {
        type: 'kanban_card',
        id: card.id,
        title: card.title,
        boardId: card.board_id,
        columnId: card.column_id,
        deleted: false
      };
    }

    return null;
  }

  // ═══════════════════════════════════════════════
  // Meeting CRUD
  // ═══════════════════════════════════════════════

  /**
   * Overview: all meetings with action item counts, sorted by date desc.
   * Filters: meeting_type, status, search, date_from, date_to
   */
  function getOverview(filters) {
    AuthService.requireAdmin();
    filters = filters || {};

    var allMeetings = DataService.getRecords('meetings');
    var allItems = DataService.getRecords('meeting_action_items');
    var sMap = staffMap_();

    // Build action-items-per-meeting counts
    var itemsByMeeting = {};
    var pendingByMeeting = {};
    allItems.forEach(function(ai) {
      if (!itemsByMeeting[ai.meeting_id]) itemsByMeeting[ai.meeting_id] = 0;
      itemsByMeeting[ai.meeting_id]++;
      if (ai.status !== 'completed') {
        if (!pendingByMeeting[ai.meeting_id]) pendingByMeeting[ai.meeting_id] = 0;
        pendingByMeeting[ai.meeting_id]++;
      }
    });

    // Filter
    var meetings = allMeetings.filter(function(m) {
      if (filters.meeting_type && m.meeting_type !== filters.meeting_type) return false;
      if (filters.status && m.status !== filters.status) return false;
      if (filters.search) {
        var s = filters.search.toLowerCase();
        if ((m.title || '').toLowerCase().indexOf(s) === -1 &&
            (m.location || '').toLowerCase().indexOf(s) === -1) return false;
      }
      if (filters.date_from && m.meeting_date < filters.date_from) return false;
      if (filters.date_to && m.meeting_date > filters.date_to) return false;
      return true;
    });

    // Sort by meeting_date descending
    meetings.sort(function(a, b) {
      return (b.meeting_date || '').localeCompare(a.meeting_date || '');
    });

    // Hydrate
    var result = meetings.map(function(m) {
      var attendeeIds = m.attendees_csv ? m.attendees_csv.split(',') : [];
      return {
        id: m.id,
        title: m.title,
        meetingType: m.meeting_type,
        meetingDate: m.meeting_date,
        startTime: m.start_time || '',
        endTime: m.end_time || '',
        location: m.location || '',
        organizerName: staffName_(sMap, m.organizer_id),
        status: m.status,
        attendeeCount: attendeeIds.length,
        actionItemCount: itemsByMeeting[m.id] || 0,
        pendingItemCount: pendingByMeeting[m.id] || 0,
        createdAt: m.created_at
      };
    });

    return result;
  }

  /**
   * Full meeting detail: meeting + attendees + action items + activity.
   */
  function getMeetingDetail(meetingId) {
    AuthService.requireAdmin();
    if (!meetingId) throw new Error('VALIDATION: meetingId is required');

    var meeting = DataService.getRecordById('meetings', meetingId);
    if (!meeting) throw new Error('NOT_FOUND: Meeting not found');

    var sMap = staffMap_();

    // Hydrate attendees
    var attendeeIds = meeting.attendees_csv ? meeting.attendees_csv.split(',') : [];
    var attendees = attendeeIds.map(function(id) {
      var s = sMap[id.trim()];
      return s ? {
        id: s.id,
        name: s.first_name + ' ' + s.last_name,
        initials: (s.first_name || '').charAt(0) + (s.last_name || '').charAt(0),
        department: s.department || '',
        email: s.email
      } : { id: id.trim(), name: 'Unknown', initials: '??', department: '', email: '' };
    });

    // Action items sorted by position
    var items = DataService.getRecords('meeting_action_items', { meeting_id: meetingId });
    items.sort(function(a, b) { return Number(a.position || 0) - Number(b.position || 0); });

    var actionItems = items.map(function(ai) {
      return {
        id: ai.id,
        meetingId: ai.meeting_id,
        title: ai.title,
        description: ai.description || '',
        assignedTo: ai.assigned_to || '',
        assignedToName: ai.assigned_to ? staffName_(sMap, ai.assigned_to) : '',
        assignedToInitials: ai.assigned_to ? staffInitials_(sMap, ai.assigned_to) : '',
        dueDate: ai.due_date || '',
        status: ai.status,
        priority: ai.priority,
        linkedTaskType: ai.linked_task_type || '',
        linkedTaskId: ai.linked_task_id || '',
        linkedTask: hydrateLinkedTask_(ai),
        position: Number(ai.position || 0),
        createdAt: ai.created_at,
        updatedAt: ai.updated_at
      };
    });

    // Activity (newest first)
    var activityRaw = DataService.query('meeting_activity', {
      filters: { meeting_id: meetingId },
      sort: { field: 'created_at', direction: 'desc' }
    }).data;
    var activity = hydrateMeetingActivity_(activityRaw);

    return {
      id: meeting.id,
      title: meeting.title,
      meetingType: meeting.meeting_type,
      meetingDate: meeting.meeting_date,
      startTime: meeting.start_time || '',
      endTime: meeting.end_time || '',
      location: meeting.location || '',
      organizerId: meeting.organizer_id,
      organizerName: staffName_(sMap, meeting.organizer_id),
      attendees: attendees,
      status: meeting.status,
      agenda: meeting.agenda || '',
      notes: meeting.notes || '',
      createdBy: meeting.created_by,
      createdByName: staffName_(sMap, meeting.created_by),
      createdAt: meeting.created_at,
      updatedAt: meeting.updated_at,
      actionItems: actionItems,
      activity: activity
    };
  }

  /**
   * Creates a new meeting.
   */
  function createMeeting(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['title', 'meeting_type', 'meeting_date']);

    if (MEETING_TYPES.indexOf(data.meeting_type) === -1) {
      throw new Error('VALIDATION: Invalid meeting type. Must be one of: ' + MEETING_TYPES.join(', '));
    }

    var user = AuthService.getCurrentUser();
    var created = DataService.createRecord('meetings', {
      title: sanitizeInput(data.title),
      meeting_type: data.meeting_type,
      meeting_date: data.meeting_date,
      start_time: data.start_time || '',
      end_time: data.end_time || '',
      location: sanitizeInput(data.location || ''),
      organizer_id: data.organizer_id || user.id,
      attendees_csv: data.attendees_csv || '',
      status: 'draft',
      agenda: sanitizeInput(data.agenda || ''),
      notes: sanitizeInput(data.notes || ''),
      created_by: user.id
    });

    logMeetingActivity_(created.id, '', 'meeting_created', '', '', created.title);
    return created;
  }

  /**
   * Updates a meeting.
   */
  function updateMeeting(meetingId, updates) {
    AuthService.requireAdmin();
    if (!meetingId) throw new Error('VALIDATION: meetingId is required');

    var meeting = DataService.getRecordById('meetings', meetingId);
    if (!meeting) throw new Error('NOT_FOUND: Meeting not found');

    if (updates.meeting_type && MEETING_TYPES.indexOf(updates.meeting_type) === -1) {
      throw new Error('VALIDATION: Invalid meeting type');
    }

    // Sanitize text fields
    var safe = {};
    var textFields = ['title', 'location', 'agenda', 'notes'];
    textFields.forEach(function(f) {
      if (updates[f] !== undefined) safe[f] = sanitizeInput(updates[f]);
    });
    // Pass-through non-text fields
    var passFields = ['meeting_type', 'meeting_date', 'start_time', 'end_time', 'organizer_id', 'attendees_csv'];
    passFields.forEach(function(f) {
      if (updates[f] !== undefined) safe[f] = updates[f];
    });

    // Log field-level changes
    var trackFields = ['title', 'meeting_type', 'meeting_date', 'location', 'agenda', 'notes'];
    trackFields.forEach(function(f) {
      if (safe[f] !== undefined && String(safe[f]) !== String(meeting[f] || '')) {
        logMeetingActivity_(meetingId, '', 'meeting_updated', f, meeting[f] || '', safe[f]);
      }
    });

    return DataService.updateRecord('meetings', meetingId, safe);
  }

  /**
   * Deletes a meeting and cascades to action items and activity.
   */
  function deleteMeeting(meetingId) {
    AuthService.requireAdmin();
    if (!meetingId) throw new Error('VALIDATION: meetingId is required');

    var meeting = DataService.getRecordById('meetings', meetingId);
    if (!meeting) throw new Error('NOT_FOUND: Meeting not found');

    // Cascade delete action items
    var items = DataService.getRelated('meeting_action_items', 'meeting_id', meetingId);
    items.forEach(function(ai) {
      DataService.deleteRecord('meeting_action_items', ai.id, { hard: true });
    });

    // Cascade delete activity
    var activities = DataService.getRelated('meeting_activity', 'meeting_id', meetingId);
    activities.forEach(function(a) {
      DataService.deleteRecord('meeting_activity', a.id, { hard: true });
    });

    DataService.deleteRecord('meetings', meetingId, { hard: true });
    return { deleted: true };
  }

  /**
   * Updates meeting status (finalize / archive).
   */
  function updateMeetingStatus(meetingId, newStatus) {
    AuthService.requireAdmin();
    if (!meetingId) throw new Error('VALIDATION: meetingId is required');

    if (MEETING_STATUSES.indexOf(newStatus) === -1) {
      throw new Error('VALIDATION: Invalid status. Must be one of: ' + MEETING_STATUSES.join(', '));
    }

    var meeting = DataService.getRecordById('meetings', meetingId);
    if (!meeting) throw new Error('NOT_FOUND: Meeting not found');

    var oldStatus = meeting.status;

    // Validate transitions
    if (newStatus === 'finalized' && oldStatus !== 'draft') {
      throw new Error('VALIDATION: Only draft meetings can be finalized');
    }
    if (newStatus === 'archived' && oldStatus !== 'finalized') {
      throw new Error('VALIDATION: Only finalized meetings can be archived');
    }

    var updated = DataService.updateRecord('meetings', meetingId, { status: newStatus });

    var activityType = newStatus === 'finalized' ? 'meeting_finalized' : 'meeting_archived';
    logMeetingActivity_(meetingId, '', activityType, 'status', oldStatus, newStatus);

    return updated;
  }

  // ═══════════════════════════════════════════════
  // Action Items
  // ═══════════════════════════════════════════════

  /**
   * Returns action items for a meeting, sorted by position.
   */
  function getActionItems(meetingId) {
    AuthService.requireAdmin();
    if (!meetingId) throw new Error('VALIDATION: meetingId is required');

    var sMap = staffMap_();
    var items = DataService.getRecords('meeting_action_items', { meeting_id: meetingId });
    items.sort(function(a, b) { return Number(a.position || 0) - Number(b.position || 0); });

    return items.map(function(ai) {
      return {
        id: ai.id,
        meetingId: ai.meeting_id,
        title: ai.title,
        description: ai.description || '',
        assignedTo: ai.assigned_to || '',
        assignedToName: ai.assigned_to ? staffName_(sMap, ai.assigned_to) : '',
        dueDate: ai.due_date || '',
        status: ai.status,
        priority: ai.priority,
        linkedTaskType: ai.linked_task_type || '',
        linkedTaskId: ai.linked_task_id || '',
        linkedTask: hydrateLinkedTask_(ai),
        position: Number(ai.position || 0)
      };
    });
  }

  /**
   * Creates an action item.
   */
  function createActionItem(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['meeting_id', 'title']);

    var meeting = DataService.getRecordById('meetings', data.meeting_id);
    if (!meeting) throw new Error('NOT_FOUND: Meeting not found');

    if (data.status && ACTION_ITEM_STATUSES.indexOf(data.status) === -1) {
      throw new Error('VALIDATION: Invalid status');
    }
    if (data.priority && ACTION_ITEM_PRIORITIES.indexOf(data.priority) === -1) {
      throw new Error('VALIDATION: Invalid priority');
    }

    // Auto-position at end
    var existing = DataService.getRecords('meeting_action_items', { meeting_id: data.meeting_id });
    var maxPos = 0;
    existing.forEach(function(ai) {
      if (Number(ai.position || 0) > maxPos) maxPos = Number(ai.position || 0);
    });

    var created = DataService.createRecord('meeting_action_items', {
      meeting_id: data.meeting_id,
      title: sanitizeInput(data.title),
      description: sanitizeInput(data.description || ''),
      assigned_to: data.assigned_to || '',
      due_date: data.due_date || '',
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      linked_task_type: '',
      linked_task_id: '',
      position: String(maxPos + 1)
    });

    logMeetingActivity_(data.meeting_id, created.id, 'action_item_created', '', '', created.title);
    return created;
  }

  /**
   * Updates an action item. Detects status completion.
   */
  function updateActionItem(itemId, updates) {
    AuthService.requireAdmin();
    if (!itemId) throw new Error('VALIDATION: itemId is required');

    var item = DataService.getRecordById('meeting_action_items', itemId);
    if (!item) throw new Error('NOT_FOUND: Action item not found');

    if (updates.status && ACTION_ITEM_STATUSES.indexOf(updates.status) === -1) {
      throw new Error('VALIDATION: Invalid status');
    }
    if (updates.priority && ACTION_ITEM_PRIORITIES.indexOf(updates.priority) === -1) {
      throw new Error('VALIDATION: Invalid priority');
    }

    // Sanitize text fields
    var safe = {};
    if (updates.title !== undefined) safe.title = sanitizeInput(updates.title);
    if (updates.description !== undefined) safe.description = sanitizeInput(updates.description);
    if (updates.assigned_to !== undefined) safe.assigned_to = updates.assigned_to;
    if (updates.due_date !== undefined) safe.due_date = updates.due_date;
    if (updates.status !== undefined) safe.status = updates.status;
    if (updates.priority !== undefined) safe.priority = updates.priority;

    // Log field changes
    var trackFields = ['title', 'status', 'priority', 'assigned_to', 'due_date'];
    trackFields.forEach(function(f) {
      if (safe[f] !== undefined && String(safe[f]) !== String(item[f] || '')) {
        var actionType = (f === 'status' && safe[f] === 'completed') ? 'action_item_completed' : 'action_item_updated';
        logMeetingActivity_(item.meeting_id, itemId, actionType, f, item[f] || '', safe[f]);
      }
    });

    return DataService.updateRecord('meeting_action_items', itemId, safe);
  }

  /**
   * Deletes an action item.
   */
  function deleteActionItem(itemId) {
    AuthService.requireAdmin();
    if (!itemId) throw new Error('VALIDATION: itemId is required');

    var item = DataService.getRecordById('meeting_action_items', itemId);
    if (!item) throw new Error('NOT_FOUND: Action item not found');

    DataService.deleteRecord('meeting_action_items', itemId, { hard: true });
    return { deleted: true };
  }

  /**
   * Reorders action items by updating positions.
   */
  function reorderActionItems(meetingId, itemIds) {
    AuthService.requireAdmin();
    if (!meetingId || !itemIds || !itemIds.length) {
      throw new Error('VALIDATION: meetingId and itemIds are required');
    }

    for (var i = 0; i < itemIds.length; i++) {
      DataService.updateRecord('meeting_action_items', itemIds[i], { position: String(i) });
    }
    return { reordered: true };
  }

  // ═══════════════════════════════════════════════
  // Task Linking
  // ═══════════════════════════════════════════════

  /**
   * Links an action item to a new Project Task.
   * Creates the task via ProjectService and stores the reference.
   */
  function linkToProjectTask(itemId, projectId, phaseId) {
    AuthService.requireAdmin();
    if (!itemId || !projectId || !phaseId) {
      throw new Error('VALIDATION: itemId, projectId, and phaseId are required');
    }

    var item = DataService.getRecordById('meeting_action_items', itemId);
    if (!item) throw new Error('NOT_FOUND: Action item not found');

    if (item.linked_task_id) {
      throw new Error('VALIDATION: Action item is already linked to a task');
    }

    // Create the project task
    var task = ProjectService.createTask({
      phase_id: phaseId,
      project_id: projectId,
      title: item.title,
      assigned_to: item.assigned_to || '',
      due_date: item.due_date || '',
      notes: item.description || ''
    });

    // Store link on action item
    DataService.updateRecord('meeting_action_items', itemId, {
      linked_task_type: 'project_task',
      linked_task_id: task.id
    });

    logMeetingActivity_(item.meeting_id, itemId, 'task_linked', 'linked_task_type', '', 'project_task');

    return { taskId: task.id, taskType: 'project_task' };
  }

  /**
   * Links an action item to a new Kanban Card.
   * Creates the card directly via DataService (following Code.gs apiCreateCard pattern).
   */
  function linkToKanbanCard(itemId, boardId, columnId) {
    AuthService.requireAdmin();
    if (!itemId || !boardId || !columnId) {
      throw new Error('VALIDATION: itemId, boardId, and columnId are required');
    }

    var item = DataService.getRecordById('meeting_action_items', itemId);
    if (!item) throw new Error('NOT_FOUND: Action item not found');

    if (item.linked_task_id) {
      throw new Error('VALIDATION: Action item is already linked to a task');
    }

    var user = AuthService.getCurrentUser();

    // Calculate position (end of column)
    var colCards = DataService.getRecords('kanban_cards', { column_id: columnId });
    var maxPos = 0;
    colCards.forEach(function(c) { if (Number(c.position) > maxPos) maxPos = Number(c.position); });

    // Create the kanban card
    var card = DataService.createRecord('kanban_cards', {
      board_id: boardId,
      column_id: columnId,
      title: item.title,
      description: item.description || '',
      assigned_to: item.assigned_to || '',
      priority: item.priority || 'medium',
      due_date: item.due_date || '',
      labels: '',
      position: maxPos + 1,
      created_by: user.id
    });

    // Log kanban activity
    KanbanService.logActivity(card.id, boardId, 'card_created', 'card', null, item.title);

    // Store link on action item
    DataService.updateRecord('meeting_action_items', itemId, {
      linked_task_type: 'kanban_card',
      linked_task_id: card.id
    });

    logMeetingActivity_(item.meeting_id, itemId, 'task_linked', 'linked_task_type', '', 'kanban_card');

    return { taskId: card.id, taskType: 'kanban_card' };
  }

  // ═══════════════════════════════════════════════
  // Activity
  // ═══════════════════════════════════════════════

  /**
   * Returns activity for a meeting (newest first).
   */
  function getMeetingActivity(meetingId, limit) {
    AuthService.requireAdmin();
    if (!meetingId) throw new Error('VALIDATION: meetingId is required');

    var activityRaw = DataService.query('meeting_activity', {
      filters: { meeting_id: meetingId },
      sort: { field: 'created_at', direction: 'desc' },
      limit: limit || 50
    }).data;

    return hydrateMeetingActivity_(activityRaw);
  }

  // ═══════════════════════════════════════════════
  // Statistics
  // ═══════════════════════════════════════════════

  /**
   * Returns meeting statistics for the overview dashboard.
   */
  function getStats() {
    AuthService.requireAdmin();

    var allMeetings = DataService.getRecords('meetings');
    var allItems = DataService.getRecords('meeting_action_items');

    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    var totalMeetings = allMeetings.length;
    var thisMonth = 0;
    var byType = {};
    MEETING_TYPES.forEach(function(t) { byType[t] = 0; });

    allMeetings.forEach(function(m) {
      if (m.meeting_date >= monthStart) thisMonth++;
      if (byType[m.meeting_type] !== undefined) byType[m.meeting_type]++;
    });

    var pendingActionItems = 0;
    var overdueActionItems = 0;
    var todayStr = now.toISOString().split('T')[0];

    allItems.forEach(function(ai) {
      if (ai.status !== 'completed') {
        pendingActionItems++;
        if (ai.due_date && ai.due_date < todayStr) {
          overdueActionItems++;
        }
      }
    });

    return {
      totalMeetings: totalMeetings,
      thisMonth: thisMonth,
      pendingActionItems: pendingActionItems,
      overdueActionItems: overdueActionItems,
      byType: byType
    };
  }

  // ═══════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════

  return {
    // Constants
    MEETING_TYPES: MEETING_TYPES,
    MEETING_STATUSES: MEETING_STATUSES,
    ACTION_ITEM_STATUSES: ACTION_ITEM_STATUSES,
    ACTION_ITEM_PRIORITIES: ACTION_ITEM_PRIORITIES,
    // Meetings
    getOverview: getOverview,
    getMeetingDetail: getMeetingDetail,
    createMeeting: createMeeting,
    updateMeeting: updateMeeting,
    deleteMeeting: deleteMeeting,
    updateMeetingStatus: updateMeetingStatus,
    // Action items
    getActionItems: getActionItems,
    createActionItem: createActionItem,
    updateActionItem: updateActionItem,
    deleteActionItem: deleteActionItem,
    reorderActionItems: reorderActionItems,
    // Task linking
    linkToProjectTask: linkToProjectTask,
    linkToKanbanCard: linkToKanbanCard,
    // Activity
    getMeetingActivity: getMeetingActivity,
    // Stats
    getStats: getStats
  };
})();
