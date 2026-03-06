/**
 * ItemService.gs
 * Backend logic for newsletter items (submissions and direct adds).
 * Manages Items tab.
 */

const ItemService = (function() {

  const SHEET = 'Items';

  /**
   * Submit an item for review (any user). Status = 'Pending'.
   * @param {string} newsletterId
   * @param {string} sectionId
   * @param {string} content
   * @returns {Object} the created item
   */
  function submitItem(newsletterId, sectionId, content) {
    try {
      if (!content || !content.trim()) throw new Error('Content is required.');
      const user = getCurrentUser();

      const item = {
        ItemId: generateId('item_'),
        NewsletterId: newsletterId,
        SectionId: sectionId,
        Content: content.trim(),
        SubmittedBy: user.email,
        SubmittedDate: new Date().toISOString(),
        Status: 'Pending',
        AddedBy: '',
        AddedDate: '',
        SortOrder: 0
      };
      DataService.appendRow(SHEET, item);
      return item;
    } catch (error) {
      logError('submitItem', error);
      throw new Error(error.message);
    }
  }

  /**
   * Delete a submission. Only the submitter can delete their own pending items.
   * @param {string} itemId
   * @returns {Object} { success: true }
   */
  function deleteSubmission(itemId) {
    try {
      const user = getCurrentUser();
      const data = DataService.getSheetData(SHEET);
      const idx = data.findIndex(item => item.ItemId === itemId);
      if (idx === -1) throw new Error('Submission not found.');

      const item = data[idx];
      if (item.SubmittedBy !== user.email && !user.isAdmin) {
        throw new Error('You can only delete your own submissions.');
      }

      DataService.deleteRow(SHEET, idx);
      return { success: true };
    } catch (error) {
      logError('deleteSubmission', error);
      throw new Error(error.message);
    }
  }

  /**
   * Review an item: Accept or Reject (admin only).
   * @param {string} itemId
   * @param {string} status - 'Accepted' or 'Rejected'
   * @returns {Object} { success: true }
   */
  function reviewItem(itemId, status) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can review items.');

      const data = DataService.getSheetData(SHEET);
      const idx = data.findIndex(item => item.ItemId === itemId);
      if (idx === -1) throw new Error('Item not found.');

      const item = data[idx];
      item.Status = status;
      item.AddedBy = user.email;
      item.AddedDate = new Date().toISOString();

      // If accepting, calculate sort order among accepted items in this section
      if (status === 'Accepted') {
        let maxOrder = 0;
        data.forEach(other => {
          if (other.SectionId === item.SectionId && other.Status === 'Accepted') {
            if ((other.SortOrder || 0) > maxOrder) maxOrder = other.SortOrder;
          }
        });
        item.SortOrder = maxOrder + 1;
      }

      DataService.updateRow(SHEET, idx, item);
      return { success: true };
    } catch (error) {
      logError('reviewItem', error);
      throw new Error(error.message);
    }
  }

  /**
   * Add an item directly (admin bypass, status = 'Accepted').
   * @param {string} newsletterId
   * @param {string} sectionId
   * @param {string} content
   * @returns {Object} the created item
   */
  function addItemDirect(newsletterId, sectionId, content) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can add items directly.');
      if (!content || !content.trim()) throw new Error('Content is required.');

      // Calculate sort order
      const existing = DataService.getSheetData(SHEET);
      let maxOrder = 0;
      existing.forEach(item => {
        if (item.SectionId === sectionId && item.Status === 'Accepted') {
          if ((item.SortOrder || 0) > maxOrder) maxOrder = item.SortOrder;
        }
      });

      const item = {
        ItemId: generateId('item_'),
        NewsletterId: newsletterId,
        SectionId: sectionId,
        Content: content.trim(),
        SubmittedBy: user.email,
        SubmittedDate: new Date().toISOString(),
        Status: 'Accepted',
        AddedBy: user.email,
        AddedDate: new Date().toISOString(),
        SortOrder: maxOrder + 1
      };
      DataService.appendRow(SHEET, item);
      return item;
    } catch (error) {
      logError('addItemDirect', error);
      throw new Error(error.message);
    }
  }

  /**
   * Delete an accepted/rejected item (admin only).
   * @param {string} itemId
   * @returns {Object} { success: true }
   */
  function deleteItem(itemId) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can delete items.');

      const idx = DataService.findRowIndex(SHEET, 'ItemId', itemId);
      if (idx === -1) throw new Error('Item not found.');

      DataService.deleteRow(SHEET, idx);
      return { success: true };
    } catch (error) {
      logError('deleteItem', error);
      throw new Error(error.message);
    }
  }

  return { submitItem, deleteSubmission, reviewItem, addItemDirect, deleteItem };
})();
