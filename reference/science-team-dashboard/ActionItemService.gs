/**
 * ActionItemService.gs
 * Backend logic for meeting action items.
 * Manages ActionItems tab + cross-app Kanban integration.
 */

const ActionItemService = (function() {

  const SHEET     = 'ActionItems';
  const MTG_SHEET = 'Meetings';

  /**
   * Add an action item to a meeting.
   * @param {string} meetingId
   * @param {Object} data - { description, assignee, dueDate?, agendaId? }
   * @returns {Object} { success: true }
   */
  function addActionItem(meetingId, data) {
    try {
      DataService.appendRow(SHEET, {
        ActionId: generateId('act_'),
        MeetingId: meetingId,
        AgendaId: data.agendaId || '',
        Description: data.description || '',
        Assignee: data.assignee || '',
        DueDate: data.dueDate || '',
        Status: 'Open',
        CompletedDate: '',
        KanbanCardId: '',
        Notes: ''
      });

      return { success: true };
    } catch (error) {
      logError('addActionItem', error);
      throw new Error(error.message);
    }
  }

  /**
   * Update an action item's fields.
   * @param {string} actionId
   * @param {Object} data - { status?, description?, assignee?, dueDate? }
   * @returns {Object} { success: true }
   */
  function updateActionItem(actionId, data) {
    try {
      const rows = DataService.getSheetData(SHEET);
      const idx = rows.findIndex(a => a.ActionId === actionId);
      if (idx === -1) throw new Error('Action item not found.');

      const item = rows[idx];
      if (data.status !== undefined) {
        item.Status = data.status;
        if (data.status === 'Completed') {
          item.CompletedDate = new Date().toISOString();
        }
      }
      if (data.description !== undefined) item.Description = data.description;
      if (data.assignee !== undefined) item.Assignee = data.assignee;
      if (data.dueDate !== undefined) item.DueDate = data.dueDate;

      DataService.updateRow(SHEET, idx, item);
      return { success: true };
    } catch (error) {
      logError('updateActionItem', error);
      throw new Error(error.message);
    }
  }

  /**
   * Delete an action item.
   * @param {string} actionId
   * @returns {Object} { success: true }
   */
  function deleteActionItem(actionId) {
    try {
      const idx = DataService.findRowIndex(SHEET, 'ActionId', actionId);
      if (idx === -1) throw new Error('Action item not found.');

      DataService.deleteRow(SHEET, idx);
      return { success: true };
    } catch (error) {
      logError('deleteActionItem', error);
      throw new Error(error.message);
    }
  }

  /**
   * Send an action item to the Kanban board.
   * Creates a card via KanbanService (same Sheet, cross-tab).
   * @param {string} actionId
   * @returns {Object} { success: true, kanbanCardId }
   */
  function sendToKanban(actionId) {
    try {
      const rows = DataService.getSheetData(SHEET);
      const idx = rows.findIndex(a => a.ActionId === actionId);
      if (idx === -1) throw new Error('Action item not found.');

      const item = rows[idx];
      if (item.KanbanCardId) {
        throw new Error('Already on Kanban board.');
      }

      // Create a card via KanbanService
      const result = KanbanService.createCardFromActionItem({
        title: item.Description,
        assignee: item.Assignee,
        dueDate: item.DueDate,
        priority: 'Normal',
        linkedMeetingId: item.MeetingId
      });

      // Store the Kanban card ID back on the action item
      item.KanbanCardId = result.cardId;
      DataService.updateRow(SHEET, idx, item);

      return { success: true, kanbanCardId: result.cardId };
    } catch (error) {
      logError('sendToKanban', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get all action items across meetings, with meeting title/date added.
   * @returns {Array<Object>}
   */
  function getOpenActionItems() {
    try {
      const actionItems = DataService.getSheetData(SHEET);
      const meetings = DataService.getSheetData(MTG_SHEET);

      return actionItems.map(ai => {
        const meeting = meetings.find(m => m.MeetingId === ai.MeetingId);
        ai.meetingTitle = meeting ? meeting.Title : '';
        ai.meetingDate = meeting ? meeting.Date : '';
        return ai;
      });
    } catch (error) {
      logError('getOpenActionItems', error);
      throw new Error(error.message);
    }
  }

  return { addActionItem, updateActionItem, deleteActionItem, sendToKanban, getOpenActionItems };
})();
