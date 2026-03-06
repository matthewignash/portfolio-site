/**
 * AgendaService.gs
 * Backend logic for meeting agenda items.
 * Manages AgendaItems tab.
 */

const AgendaService = (function() {

  const SHEET = 'AgendaItems';

  /**
   * Add an agenda item to a meeting.
   * @param {string} meetingId
   * @param {Object} data - { title, description?, presenter, timeAllocation? }
   * @returns {Object} { success: true }
   */
  function addAgendaItem(meetingId, data) {
    try {
      const user = getCurrentUser();

      // Calculate next sort order for this meeting
      const existing = DataService.getSheetData(SHEET).filter(a => a.MeetingId === meetingId);
      let maxOrder = 0;
      existing.forEach(a => { if ((a.SortOrder || 0) > maxOrder) maxOrder = a.SortOrder; });

      DataService.appendRow(SHEET, {
        AgendaId: generateId('ag_'),
        MeetingId: meetingId,
        SortOrder: maxOrder + 1,
        Title: data.title || '',
        Description: data.description || '',
        Presenter: data.presenter || user.email,
        TimeAllocation: data.timeAllocation || 10,
        Notes: ''
      });

      return { success: true };
    } catch (error) {
      logError('addAgendaItem', error);
      throw new Error(error.message);
    }
  }

  /**
   * Update an agenda item's fields.
   * @param {string} agendaId
   * @param {Object} data - fields to update (title, notes, presenter, timeAllocation)
   * @returns {Object} { success: true }
   */
  function updateAgendaItem(agendaId, data) {
    try {
      const rows = DataService.getSheetData(SHEET);
      const idx = rows.findIndex(a => a.AgendaId === agendaId);
      if (idx === -1) throw new Error('Agenda item not found.');

      const item = rows[idx];
      if (data.title !== undefined) item.Title = data.title;
      if (data.notes !== undefined) item.Notes = data.notes;
      if (data.presenter !== undefined) item.Presenter = data.presenter;
      if (data.timeAllocation !== undefined) item.TimeAllocation = data.timeAllocation;

      DataService.updateRow(SHEET, idx, item);
      return { success: true };
    } catch (error) {
      logError('updateAgendaItem', error);
      throw new Error(error.message);
    }
  }

  /**
   * Delete an agenda item.
   * @param {string} agendaId
   * @returns {Object} { success: true }
   */
  function deleteAgendaItem(agendaId) {
    try {
      const idx = DataService.findRowIndex(SHEET, 'AgendaId', agendaId);
      if (idx === -1) throw new Error('Agenda item not found.');

      DataService.deleteRow(SHEET, idx);
      return { success: true };
    } catch (error) {
      logError('deleteAgendaItem', error);
      throw new Error(error.message);
    }
  }

  return { addAgendaItem, updateAgendaItem, deleteAgendaItem };
})();
