/**
 * KanbanColumnService.gs
 * Backend logic for Kanban board columns (admin only).
 * Manages KanbanColumns tab.
 */

const KanbanColumnService = (function() {

  const COLS_SHEET  = 'KanbanColumns';
  const CARDS_SHEET = 'KanbanCards';

  /**
   * Create a new column (admin only).
   * @param {Object} data - { title, color, wipLimit }
   * @returns {Object} the created column
   */
  function createColumn(data) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can manage columns.');
      if (!data.title || !data.title.trim()) throw new Error('Column title is required.');

      const existing = DataService.getSheetData(COLS_SHEET);
      let maxOrder = 0;
      existing.forEach(c => { if ((c.SortOrder || 0) > maxOrder) maxOrder = c.SortOrder; });

      const col = {
        ColumnId: generateId('col_'),
        Title: data.title.trim(),
        SortOrder: maxOrder + 1,
        WipLimit: data.wipLimit || 0,
        Color: data.color || '#0d6efd'
      };
      DataService.appendRow(COLS_SHEET, col);
      return col;
    } catch (error) {
      logError('createColumn', error);
      throw new Error(error.message);
    }
  }

  /**
   * Update a column (admin only).
   * @param {string} columnId
   * @param {Object} data - fields to update
   * @returns {Object} the updated column
   */
  function updateColumn(columnId, data) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can manage columns.');

      const cols = DataService.getSheetData(COLS_SHEET);
      const idx = cols.findIndex(c => c.ColumnId === columnId);
      if (idx === -1) throw new Error('Column not found.');

      const col = cols[idx];
      if (data.title !== undefined) col.Title = data.title.trim();
      if (data.color !== undefined) col.Color = data.color;
      if (data.wipLimit !== undefined) col.WipLimit = parseInt(data.wipLimit) || 0;

      DataService.updateRow(COLS_SHEET, idx, col);
      return col;
    } catch (error) {
      logError('updateColumn', error);
      throw new Error(error.message);
    }
  }

  /**
   * Delete a column (admin only). Fails if column has non-archived cards.
   * @param {string} columnId
   * @returns {Object} { success: true }
   */
  function deleteColumn(columnId) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can manage columns.');

      const idx = DataService.findRowIndex(COLS_SHEET, 'ColumnId', columnId);
      if (idx === -1) throw new Error('Column not found.');

      // Check for non-archived cards in this column
      const cards = DataService.getSheetData(CARDS_SHEET);
      const hasCards = cards.some(c => c.ColumnId === columnId && !c.ArchivedDate);
      if (hasCards) {
        throw new Error('Cannot delete a column that has cards. Move or archive all cards first.');
      }

      DataService.deleteRow(COLS_SHEET, idx);
      return { success: true };
    } catch (error) {
      logError('deleteColumn', error);
      throw new Error(error.message);
    }
  }

  return { createColumn, updateColumn, deleteColumn };
})();
