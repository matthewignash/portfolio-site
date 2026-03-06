/**
 * NewsletterService.gs
 * Backend logic for the Department Newsletter.
 * Manages Newsletters tab + orchestrates Sections and Items.
 */

const NewsletterService = (function() {

  const NL_SHEET   = 'Newsletters';
  const SEC_SHEET  = 'Sections';
  const ITEM_SHEET = 'Items';

  /**
   * Get all newsletters with computed counts.
   * @returns {Array<Object>} each with sectionCount, itemCount, pendingCount
   */
  function getNewsletters() {
    try {
      const newsletters = DataService.getSheetData(NL_SHEET);
      const sections = DataService.getSheetData(SEC_SHEET);
      const items = DataService.getSheetData(ITEM_SHEET);

      return newsletters.map(nl => {
        let sectionCount = 0, itemCount = 0, pendingCount = 0;
        sections.forEach(s => { if (s.NewsletterId === nl.NewsletterId) sectionCount++; });
        items.forEach(item => {
          if (item.NewsletterId === nl.NewsletterId) {
            if (item.Status === 'Accepted') itemCount++;
            if (item.Status === 'Pending') pendingCount++;
          }
        });
        nl.sectionCount = sectionCount;
        nl.itemCount = itemCount;
        nl.pendingCount = pendingCount;
        return nl;
      }).sort((a, b) => (b.WeekOf || '').localeCompare(a.WeekOf || ''));
    } catch (error) {
      logError('getNewsletters', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get full detail for a single newsletter.
   * @param {string} newsletterId
   * @returns {Object} { newsletter, sections, items }
   */
  function getNewsletterDetail(newsletterId) {
    try {
      const newsletters = DataService.getSheetData(NL_SHEET);
      const newsletter = newsletters.find(nl => nl.NewsletterId === newsletterId);
      if (!newsletter) throw new Error('Newsletter not found.');

      const sections = DataService.getSheetData(SEC_SHEET)
        .filter(s => s.NewsletterId === newsletterId)
        .sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0));

      const items = DataService.getSheetData(ITEM_SHEET)
        .filter(item => item.NewsletterId === newsletterId);

      return { newsletter, sections, items };
    } catch (error) {
      logError('getNewsletterDetail', error);
      throw new Error(error.message);
    }
  }

  /**
   * Create a new newsletter (admin only).
   * @param {string} title
   * @param {string} weekOf - ISO date string
   * @returns {Object} the created newsletter
   */
  function createNewsletter(title, weekOf) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can create newsletters.');
      if (!title || !title.trim()) throw new Error('Newsletter title is required.');

      const nl = {
        NewsletterId: generateId('nl_'),
        Title: title.trim(),
        WeekOf: weekOf,
        Status: 'Draft',
        CreatedBy: user.email,
        CreatedDate: new Date().toISOString(),
        SentDate: '',
        SentBy: ''
      };
      DataService.appendRow(NL_SHEET, nl);
      return nl;
    } catch (error) {
      logError('createNewsletter', error);
      throw new Error(error.message);
    }
  }

  /**
   * Delete a newsletter and cascade-delete its sections and items.
   * @param {string} newsletterId
   * @returns {Object} { success: true }
   */
  function deleteNewsletter(newsletterId) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can delete newsletters.');

      const idx = DataService.findRowIndex(NL_SHEET, 'NewsletterId', newsletterId);
      if (idx === -1) throw new Error('Newsletter not found.');

      // Cascade: delete items, then sections, then newsletter
      DataService.deleteRowsWhere(ITEM_SHEET, 'NewsletterId', newsletterId);
      DataService.deleteRowsWhere(SEC_SHEET, 'NewsletterId', newsletterId);
      DataService.deleteRow(NL_SHEET, idx);

      return { success: true };
    } catch (error) {
      logError('deleteNewsletter', error);
      throw new Error(error.message);
    }
  }

  /**
   * Send a newsletter: set status to Sent, remove Pending/Rejected items.
   * @param {string} newsletterId
   * @returns {Object} { success: true }
   */
  function sendNewsletter(newsletterId) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can send newsletters.');

      const data = DataService.getSheetData(NL_SHEET);
      const idx = data.findIndex(nl => nl.NewsletterId === newsletterId);
      if (idx === -1) throw new Error('Newsletter not found.');

      const nl = data[idx];
      nl.Status = 'Sent';
      nl.SentDate = new Date().toISOString();
      nl.SentBy = user.email;
      DataService.updateRow(NL_SHEET, idx, nl);

      // Remove Pending and Rejected items
      const items = DataService.getSheetData(ITEM_SHEET);
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].NewsletterId === newsletterId &&
            (items[i].Status === 'Pending' || items[i].Status === 'Rejected')) {
          DataService.deleteRow(ITEM_SHEET, i);
        }
      }

      return { success: true };
    } catch (error) {
      logError('sendNewsletter', error);
      throw new Error(error.message);
    }
  }

  return { getNewsletters, getNewsletterDetail, createNewsletter, deleteNewsletter, sendNewsletter };
})();
