/**
 * SectionService.gs
 * Backend logic for newsletter sections.
 * Manages Sections tab.
 */

const SectionService = (function() {

  const SEC_SHEET  = 'Sections';
  const ITEM_SHEET = 'Items';

  /**
   * Add a section to a newsletter.
   * @param {string} newsletterId
   * @param {string} title
   * @param {string} icon - Bootstrap icon class
   * @param {number} sortOrder
   * @returns {Object} the created section
   */
  function addSection(newsletterId, title, icon, sortOrder) {
    try {
      const section = {
        SectionId: generateId('sec_'),
        NewsletterId: newsletterId,
        Title: title,
        Icon: icon || '',
        SortOrder: sortOrder || 0
      };
      DataService.appendRow(SEC_SHEET, section);
      return section;
    } catch (error) {
      logError('addSection', error);
      throw new Error(error.message);
    }
  }

  /**
   * Delete a section and cascade-delete its items.
   * @param {string} sectionId
   * @returns {Object} { success: true }
   */
  function deleteSection(sectionId) {
    try {
      const idx = DataService.findRowIndex(SEC_SHEET, 'SectionId', sectionId);
      if (idx === -1) throw new Error('Section not found.');

      // Cascade: delete items in this section
      DataService.deleteRowsWhere(ITEM_SHEET, 'SectionId', sectionId);
      DataService.deleteRow(SEC_SHEET, idx);

      return { success: true };
    } catch (error) {
      logError('deleteSection', error);
      throw new Error(error.message);
    }
  }

  return { addSection, deleteSection };
})();
