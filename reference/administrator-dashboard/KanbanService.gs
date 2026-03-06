/**
 * KanbanService.gs — Business logic for Strategic Plan (Kanban) module
 *
 * Provides board loading with hydrated cards, card movement with
 * position management, comment operations, checklists, activity logging,
 * and analytics.
 *
 * Uses: DataService, AuthService, CacheManager, Utils
 */

var KanbanService = (function() {

  /**
   * Returns all non-archived boards.
   * @returns {Object[]}
   */
  function getActiveBoards() {
    return DataService.query('kanban_boards', {
      filters: { is_archived: false },
      sort: { field: 'created_at', direction: 'desc' }
    }).data;
  }

  /**
   * Loads a complete board with columns and hydrated cards.
   * @param {string} boardId
   * @returns {{ board: Object, columns: Object[], cards: Object[] }}
   */
  function getBoardData(boardId) {
    if (!boardId) throw new Error('VALIDATION: boardId is required');

    var board = DataService.getRecordById('kanban_boards', boardId);
    if (!board) throw new Error('NOT_FOUND: Board not found');

    // Load columns sorted by position
    var columns = DataService.query('kanban_columns', {
      filters: { board_id: boardId },
      sort: { field: 'position', direction: 'asc' }
    }).data;

    // Load all cards for this board sorted by position
    var cards = DataService.query('kanban_cards', {
      filters: { board_id: boardId },
      sort: { field: 'position', direction: 'asc' }
    }).data;

    // Hydrate assignees: parse CSV IDs and look up staff records
    var allStaff = DataService.getRecords('staff');
    var staffMap = {};
    allStaff.forEach(function(s) { staffMap[s.id] = s; });

    // Bulk-load all checklists for this board's cards for count hydration
    var allChecklists = DataService.getRecords('kanban_checklists');
    var checklistCountMap = {};  // cardId → { total, checked }
    var cardIds = cards.map(function(c) { return c.id; });
    for (var ci = 0; ci < allChecklists.length; ci++) {
      var cl = allChecklists[ci];
      if (cardIds.indexOf(cl.card_id) === -1) continue;
      if (!checklistCountMap[cl.card_id]) {
        checklistCountMap[cl.card_id] = { total: 0, checked: 0 };
      }
      checklistCountMap[cl.card_id].total++;
      if (cl.is_checked === true || cl.is_checked === 'true') {
        checklistCountMap[cl.card_id].checked++;
      }
    }

    cards = cards.map(function(card) {
      var enriched = {};
      for (var key in card) {
        if (card.hasOwnProperty(key)) enriched[key] = card[key];
      }

      // Parse assigned_to CSV into array of staff objects
      var assigneeIds = parseCSV(card.assigned_to);
      enriched.assignees = assigneeIds.map(function(id) {
        var staff = staffMap[id];
        if (!staff) return { id: id, first_name: '?', last_name: '' };
        return { id: staff.id, first_name: staff.first_name, last_name: staff.last_name };
      });

      // Parse labels CSV into array
      enriched.labelList = parseCSV(card.labels);

      // Add created_by name
      var creator = staffMap[card.created_by];
      enriched.createdByName = creator ? creator.first_name + ' ' + creator.last_name : 'Unknown';

      // Add checklist counts
      var counts = checklistCountMap[card.id];
      enriched.checklistTotal = counts ? counts.total : 0;
      enriched.checklistChecked = counts ? counts.checked : 0;

      return enriched;
    });

    return {
      board: board,
      columns: columns,
      cards: cards
    };
  }

  /**
   * Moves a card to a new column and/or position.
   * @param {string} cardId
   * @param {string} newColumnId
   * @param {number} newPosition
   * @returns {Object} Updated card
   */
  function moveCard(cardId, newColumnId, newPosition) {
    if (!cardId) throw new Error('VALIDATION: cardId is required');
    if (!newColumnId) throw new Error('VALIDATION: newColumnId is required');

    var card = DataService.getRecordById('kanban_cards', cardId);
    if (!card) throw new Error('NOT_FOUND: Card not found');

    var oldColumnId = card.column_id;
    var updates = {
      column_id: newColumnId,
      position: newPosition || 1
    };

    var result = DataService.updateRecord('kanban_cards', cardId, updates);

    // Log activity if column actually changed
    if (oldColumnId !== newColumnId) {
      var oldCol = DataService.getRecordById('kanban_columns', oldColumnId);
      var newCol = DataService.getRecordById('kanban_columns', newColumnId);
      logActivity_(cardId, card.board_id, 'card_moved', 'column',
        oldCol ? oldCol.title : oldColumnId,
        newCol ? newCol.title : newColumnId);
    }

    return result;
  }

  /**
   * Returns comments for a card, hydrated with author names.
   * @param {string} cardId
   * @returns {Object[]}
   */
  function getCardComments(cardId) {
    if (!cardId) throw new Error('VALIDATION: cardId is required');

    var comments = DataService.query('kanban_comments', {
      filters: { card_id: cardId },
      sort: { field: 'created_at', direction: 'asc' }
    }).data;

    // Hydrate with author names
    comments = DataService.hydrate(comments, {
      field: 'author_id',
      targetTable: 'staff',
      as: 'author'
    });

    return comments.map(function(c) {
      return {
        id: c.id,
        cardId: c.card_id,
        authorName: c.author ? c.author.first_name + ' ' + c.author.last_name : 'Unknown',
        authorInitials: c.author ? (c.author.first_name || '').charAt(0) + (c.author.last_name || '').charAt(0) : '??',
        content: c.content,
        createdAt: c.created_at
      };
    });
  }

  /**
   * Creates a comment on a card.
   * @param {string} cardId
   * @param {string} content
   * @returns {Object} Created comment
   */
  function createComment(cardId, content) {
    if (!cardId) throw new Error('VALIDATION: cardId is required');
    if (!content || !content.trim()) throw new Error('VALIDATION: Comment content is required');

    var user = AuthService.getCurrentUser();

    // Look up card for board_id
    var card = DataService.getRecordById('kanban_cards', cardId);

    var record = DataService.createRecord('kanban_comments', {
      card_id: cardId,
      author_id: user.id,
      content: sanitizeInput(content)
    });

    // Log activity
    if (card) {
      logActivity_(cardId, card.board_id, 'comment_added', 'comment', null, null);
    }

    return {
      id: record.id,
      cardId: cardId,
      authorName: user.first_name + ' ' + user.last_name,
      authorInitials: (user.first_name || '').charAt(0) + (user.last_name || '').charAt(0),
      content: record.content,
      createdAt: record.created_at
    };
  }

  // ─── Activity Logging (private helper) ───────────────────────────

  /**
   * Logs an activity entry for a card.
   * @param {string} cardId
   * @param {string} boardId
   * @param {string} actionType — card_created|card_moved|card_updated|card_deleted|comment_added|checklist_added|checklist_toggled
   * @param {string} [fieldName]
   * @param {*} [oldValue]
   * @param {*} [newValue]
   * @param {string} [userId] — defaults to current user
   */
  function logActivity_(cardId, boardId, actionType, fieldName, oldValue, newValue, userId) {
    var uid = userId;
    if (!uid) {
      try {
        var user = AuthService.getCurrentUser();
        uid = user.id;
      } catch (e) {
        uid = 'system';
      }
    }
    DataService.createRecord('kanban_activity', {
      card_id: cardId || '',
      board_id: boardId || '',
      user_id: uid,
      action_type: actionType,
      field_name: fieldName || '',
      old_value: oldValue != null ? String(oldValue) : '',
      new_value: newValue != null ? String(newValue) : ''
    });
  }

  /**
   * Public wrapper for activity logging (called from Code.gs for card CRUD).
   */
  function logActivity(cardId, boardId, actionType, fieldName, oldValue, newValue, userId) {
    logActivity_(cardId, boardId, actionType, fieldName, oldValue, newValue, userId);
  }

  // ─── Checklist Functions ────────────────────────────────────────

  /**
   * Returns checklist items for a card, sorted by sort_order.
   * @param {string} cardId
   * @returns {Object[]}
   */
  function getCardChecklists(cardId) {
    if (!cardId) throw new Error('VALIDATION: cardId is required');

    var items = DataService.query('kanban_checklists', {
      filters: { card_id: cardId },
      sort: { field: 'sort_order', direction: 'asc' }
    }).data;

    return items.map(function(item) {
      return {
        id: item.id,
        cardId: item.card_id,
        text: item.text,
        isChecked: item.is_checked === true || item.is_checked === 'true',
        sortOrder: Number(item.sort_order) || 0,
        createdAt: item.created_at
      };
    });
  }

  /**
   * Creates a checklist item on a card.
   * @param {string} cardId
   * @param {string} text
   * @returns {Object} Created item
   */
  function createChecklistItem(cardId, text) {
    if (!cardId) throw new Error('VALIDATION: cardId is required');
    if (!text || !text.trim()) throw new Error('VALIDATION: Checklist text is required');

    // Determine next sort_order
    var existing = DataService.query('kanban_checklists', {
      filters: { card_id: cardId }
    }).data;
    var maxOrder = 0;
    for (var i = 0; i < existing.length; i++) {
      var order = Number(existing[i].sort_order) || 0;
      if (order > maxOrder) maxOrder = order;
    }

    var record = DataService.createRecord('kanban_checklists', {
      card_id: cardId,
      text: sanitizeInput(text),
      is_checked: false,
      sort_order: maxOrder + 1
    });

    // Log activity
    var card = DataService.getRecordById('kanban_cards', cardId);
    if (card) {
      logActivity_(cardId, card.board_id, 'checklist_added', 'checklist', null, sanitizeInput(text));
    }

    return {
      id: record.id,
      cardId: record.card_id,
      text: record.text,
      isChecked: false,
      sortOrder: record.sort_order,
      createdAt: record.created_at
    };
  }

  /**
   * Updates a checklist item (toggle checked, edit text).
   * @param {string} itemId
   * @param {Object} updates — { is_checked, text }
   * @returns {Object} Updated item
   */
  function updateChecklistItem(itemId, updates) {
    if (!itemId) throw new Error('VALIDATION: itemId is required');

    var item = DataService.getRecordById('kanban_checklists', itemId);
    if (!item) throw new Error('NOT_FOUND: Checklist item not found');

    var cleanUpdates = {};
    if (updates.hasOwnProperty('is_checked')) {
      cleanUpdates.is_checked = updates.is_checked === true || updates.is_checked === 'true';
    }
    if (updates.hasOwnProperty('text') && updates.text && updates.text.trim()) {
      cleanUpdates.text = sanitizeInput(updates.text);
    }

    var result = DataService.updateRecord('kanban_checklists', itemId, cleanUpdates);

    // Log toggle activity
    if (updates.hasOwnProperty('is_checked')) {
      var card = DataService.getRecordById('kanban_cards', item.card_id);
      if (card) {
        var wasChecked = item.is_checked === true || item.is_checked === 'true';
        logActivity_(item.card_id, card.board_id, 'checklist_toggled', 'checklist',
          wasChecked ? 'checked' : 'unchecked',
          cleanUpdates.is_checked ? 'checked' : 'unchecked');
      }
    }

    return {
      id: result.id,
      cardId: result.card_id,
      text: result.text,
      isChecked: result.is_checked === true || result.is_checked === 'true',
      sortOrder: Number(result.sort_order) || 0,
      createdAt: result.created_at
    };
  }

  /**
   * Deletes a checklist item (hard delete).
   * @param {string} itemId
   */
  function deleteChecklistItem(itemId) {
    if (!itemId) throw new Error('VALIDATION: itemId is required');

    var item = DataService.getRecordById('kanban_checklists', itemId);
    if (!item) throw new Error('NOT_FOUND: Checklist item not found');

    DataService.deleteRecord('kanban_checklists', itemId);
    return { success: true };
  }

  /**
   * Reorders checklist items by updating sort_order.
   * @param {string} cardId
   * @param {string[]} orderedIds — item IDs in desired order
   */
  function reorderChecklistItems(cardId, orderedIds) {
    if (!cardId) throw new Error('VALIDATION: cardId is required');
    if (!orderedIds || !orderedIds.length) throw new Error('VALIDATION: orderedIds is required');

    for (var i = 0; i < orderedIds.length; i++) {
      DataService.updateRecord('kanban_checklists', orderedIds[i], {
        sort_order: i + 1
      });
    }
    return { success: true };
  }

  // ─── Activity Query Functions ───────────────────────────────────

  /**
   * Returns activity entries for a card, newest first, hydrated with user names.
   * @param {string} cardId
   * @returns {Object[]}
   */
  function getCardActivity(cardId) {
    if (!cardId) throw new Error('VALIDATION: cardId is required');

    var entries = DataService.query('kanban_activity', {
      filters: { card_id: cardId },
      sort: { field: 'created_at', direction: 'desc' }
    }).data;

    return hydrateActivity_(entries);
  }

  /**
   * Returns activity entries for a board, newest first, hydrated with user names and card titles.
   * @param {string} boardId
   * @param {number} [limit] — max entries to return (default 50)
   * @returns {Object[]}
   */
  function getBoardActivity(boardId, limit) {
    if (!boardId) throw new Error('VALIDATION: boardId is required');
    var maxEntries = limit || 50;

    var entries = DataService.query('kanban_activity', {
      filters: { board_id: boardId },
      sort: { field: 'created_at', direction: 'desc' }
    }).data;

    // Limit results
    if (entries.length > maxEntries) {
      entries = entries.slice(0, maxEntries);
    }

    // Get all card titles for hydration
    var allCards = DataService.query('kanban_cards', {
      filters: { board_id: boardId }
    }).data;
    var cardTitleMap = {};
    for (var i = 0; i < allCards.length; i++) {
      cardTitleMap[allCards[i].id] = allCards[i].title;
    }

    var hydrated = hydrateActivity_(entries);
    for (var j = 0; j < hydrated.length; j++) {
      hydrated[j].cardTitle = cardTitleMap[hydrated[j].cardId] || 'Deleted Card';
    }

    return hydrated;
  }

  /**
   * Hydrates activity entries with user names.
   * @param {Object[]} entries
   * @returns {Object[]}
   * @private
   */
  function hydrateActivity_(entries) {
    var allStaff = DataService.getRecords('staff');
    var staffMap = {};
    for (var i = 0; i < allStaff.length; i++) {
      staffMap[allStaff[i].id] = allStaff[i];
    }

    return entries.map(function(e) {
      var staff = staffMap[e.user_id];
      return {
        id: e.id,
        cardId: e.card_id,
        boardId: e.board_id,
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

  // ─── Analytics ──────────────────────────────────────────────────

  /**
   * Computes analytics for a board.
   * @param {string} boardId
   * @returns {Object} Analytics data
   */
  function getKanbanAnalytics(boardId) {
    if (!boardId) throw new Error('VALIDATION: boardId is required');

    var board = DataService.getRecordById('kanban_boards', boardId);
    if (!board) throw new Error('NOT_FOUND: Board not found');

    var columns = DataService.query('kanban_columns', {
      filters: { board_id: boardId },
      sort: { field: 'position', direction: 'asc' }
    }).data;

    var cards = DataService.query('kanban_cards', {
      filters: { board_id: boardId }
    }).data;

    var now = new Date();

    // Total and completed cards (last column = "Done")
    var totalCards = cards.length;
    var lastColumnId = columns.length ? columns[columns.length - 1].id : null;
    var completedCards = 0;
    var overdueCount = 0;

    // Cards by column
    var cardsByColumn = [];
    var columnMap = {};
    for (var ci = 0; ci < columns.length; ci++) {
      columnMap[columns[ci].id] = { title: columns[ci].title, count: 0 };
    }

    // Cards by priority
    var priorityCounts = { high: 0, medium: 0, low: 0, none: 0 };

    // Cards by PARA category
    var categoryCounts = { project: 0, area: 0, resource: 0, archive: 0, uncategorized: 0 };

    // Cycle time tracking (cards in last column that have activity entries)
    var cycleTimes = [];

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];

      // Count by column
      if (columnMap[card.column_id]) {
        columnMap[card.column_id].count++;
      }

      // Count completed
      if (card.column_id === lastColumnId) {
        completedCards++;
      }

      // Count by priority
      var p = (card.priority || 'none').toLowerCase();
      if (priorityCounts.hasOwnProperty(p)) {
        priorityCounts[p]++;
      } else {
        priorityCounts.none++;
      }

      // Count by PARA category
      var cat = (card.category || '').toLowerCase();
      if (cat && categoryCounts.hasOwnProperty(cat)) {
        categoryCounts[cat]++;
      } else if (!cat) {
        categoryCounts.uncategorized++;
      }

      // Overdue: has due_date in the past and NOT in last column
      if (card.due_date && card.column_id !== lastColumnId) {
        var dueDate = new Date(card.due_date);
        if (dueDate < now) {
          overdueCount++;
        }
      }
    }

    // Build cardsByColumn array
    for (var k = 0; k < columns.length; k++) {
      var colData = columnMap[columns[k].id];
      cardsByColumn.push({
        columnId: columns[k].id,
        columnTitle: colData.title,
        count: colData.count
      });
    }

    // Build cardsByPriority array
    var cardsByPriority = [
      { priority: 'High', count: priorityCounts.high },
      { priority: 'Medium', count: priorityCounts.medium },
      { priority: 'Low', count: priorityCounts.low },
      { priority: 'None', count: priorityCounts.none }
    ];

    // Calculate average cycle time from activity log
    // (time from card_created to card_moved into last column)
    var activities = DataService.query('kanban_activity', {
      filters: { board_id: boardId }
    }).data;

    var cardCreatedMap = {};  // cardId → earliest created_at
    var cardCompletedMap = {};  // cardId → latest moved-to-done timestamp
    var lastColTitle = columns.length ? columns[columns.length - 1].title : '';

    for (var ai = 0; ai < activities.length; ai++) {
      var act = activities[ai];
      if (act.action_type === 'card_created') {
        var createdDate = new Date(act.created_at);
        if (!cardCreatedMap[act.card_id] || createdDate < cardCreatedMap[act.card_id]) {
          cardCreatedMap[act.card_id] = createdDate;
        }
      }
      if (act.action_type === 'card_moved' && act.new_value === lastColTitle) {
        var movedDate = new Date(act.created_at);
        if (!cardCompletedMap[act.card_id] || movedDate > cardCompletedMap[act.card_id]) {
          cardCompletedMap[act.card_id] = movedDate;
        }
      }
    }

    for (var cardId in cardCompletedMap) {
      if (cardCompletedMap.hasOwnProperty(cardId) && cardCreatedMap[cardId]) {
        var days = daysBetween(cardCreatedMap[cardId], cardCompletedMap[cardId]);
        cycleTimes.push(days);
      }
    }

    var avgCycleTime = cycleTimes.length ? roundTo(average(cycleTimes), 1) : null;

    // Aging report: cards NOT in last column, with days since creation
    var agingReport = [];
    for (var ri = 0; ri < cards.length; ri++) {
      var rc = cards[ri];
      if (rc.column_id === lastColumnId) continue;
      var age = daysBetween(new Date(rc.created_at), now);
      var colInfo = columnMap[rc.column_id];
      agingReport.push({
        cardId: rc.id,
        title: rc.title,
        column: colInfo ? colInfo.title : 'Unknown',
        priority: rc.priority || 'none',
        ageDays: age,
        dueDate: rc.due_date || null,
        isOverdue: rc.due_date ? new Date(rc.due_date) < now : false
      });
    }
    // Sort aging report by age descending
    agingReport.sort(function(a, b) { return b.ageDays - a.ageDays; });

    // Build cardsByCategory array
    var cardsByCategory = [
      { category: 'Project', count: categoryCounts.project },
      { category: 'Area', count: categoryCounts.area },
      { category: 'Resource', count: categoryCounts.resource },
      { category: 'Archive', count: categoryCounts.archive },
      { category: 'Uncategorized', count: categoryCounts.uncategorized }
    ].filter(function(c) { return c.count > 0; });

    return {
      totalCards: totalCards,
      completedCards: completedCards,
      avgCycleTime: avgCycleTime,
      overdueCount: overdueCount,
      cardsByColumn: cardsByColumn,
      cardsByPriority: cardsByPriority,
      cardsByCategory: cardsByCategory,
      agingReport: agingReport
    };
  }

  // ─── Public API ─────────────────────────────────────────────────

  return {
    getActiveBoards: getActiveBoards,
    getBoardData: getBoardData,
    moveCard: moveCard,
    getCardComments: getCardComments,
    createComment: createComment,
    // Checklists
    getCardChecklists: getCardChecklists,
    createChecklistItem: createChecklistItem,
    updateChecklistItem: updateChecklistItem,
    deleteChecklistItem: deleteChecklistItem,
    reorderChecklistItems: reorderChecklistItems,
    // Activity
    logActivity: logActivity,
    getCardActivity: getCardActivity,
    getBoardActivity: getBoardActivity,
    // Analytics
    getKanbanAnalytics: getKanbanAnalytics
  };

})();
