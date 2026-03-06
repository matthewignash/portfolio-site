/**
 * KanbanService.gs
 * Backend logic for the Kanban Board cards and history.
 * Manages KanbanCards and CardHistory tabs.
 */

const KanbanService = (function() {

  const COLS_SHEET    = 'KanbanColumns';
  const CARDS_SHEET   = 'KanbanCards';
  const HISTORY_SHEET = 'CardHistory';

  /**
   * Get the full board: columns (sorted) and non-archived cards.
   * @returns {Object} { columns, cards }
   */
  function getBoard() {
    try {
      const columns = DataService.getSheetData(COLS_SHEET)
        .sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0));

      const cards = DataService.getSheetData(CARDS_SHEET)
        .filter(c => !c.ArchivedDate);

      return { columns, cards };
    } catch (error) {
      logError('getBoard', error);
      throw new Error(error.message);
    }
  }

  /**
   * Create a new card.
   * @param {Object} data - { title, description?, cardType, columnId, assignee, dueDate?, priority, sortOrder, labels? }
   * @returns {Object} the created card
   */
  function createCard(data) {
    try {
      if (!data.title || !data.title.trim()) throw new Error('Card title is required.');
      const user = getCurrentUser();

      const card = {
        CardId: generateId('card_'),
        Title: data.title.trim(),
        Description: data.description || '',
        CardType: data.cardType || 'Task',
        ColumnId: data.columnId,
        Assignee: data.assignee || 'ALL',
        CreatedBy: user.email,
        CreatedDate: new Date().toISOString(),
        DueDate: data.dueDate || '',
        Priority: data.priority || 'Normal',
        SortOrder: data.sortOrder || 999,
        Labels: data.labels || '',
        LinkedMeetingId: '',
        ArchivedDate: ''
      };
      DataService.appendRow(CARDS_SHEET, card);

      // Add history entry
      addHistoryEntry(card.CardId, 'created', '', data.columnId, user.email);

      return card;
    } catch (error) {
      logError('createCard', error);
      throw new Error(error.message);
    }
  }

  /**
   * Update card fields. Only admin, creator, or assignee can edit.
   * @param {string} cardId
   * @param {Object} data - fields to update
   * @returns {Object} the updated card
   */
  function updateCard(cardId, data) {
    try {
      const user = getCurrentUser();
      const cards = DataService.getSheetData(CARDS_SHEET);
      const idx = cards.findIndex(c => c.CardId === cardId);
      if (idx === -1) throw new Error('Card not found.');

      const card = cards[idx];
      if (!user.isAdmin && card.CreatedBy !== user.email && card.Assignee !== user.email) {
        throw new Error('You can only edit cards assigned to you or that you created.');
      }

      if (data.title !== undefined) card.Title = data.title.trim();
      if (data.description !== undefined) card.Description = data.description;
      if (data.cardType !== undefined) card.CardType = data.cardType;
      if (data.assignee !== undefined) card.Assignee = data.assignee;
      if (data.dueDate !== undefined) card.DueDate = data.dueDate || '';
      if (data.priority !== undefined) card.Priority = data.priority;
      if (data.labels !== undefined) card.Labels = data.labels;

      DataService.updateRow(CARDS_SHEET, idx, card);

      addHistoryEntry(cardId, 'edited', '', '', user.email);

      return card;
    } catch (error) {
      logError('updateCard', error);
      throw new Error(error.message);
    }
  }

  /**
   * Move a card to a different column with a new sort index.
   * @param {string} cardId
   * @param {string} toColumnId
   * @param {number} newIndex
   * @returns {Object} { success: true }
   */
  function moveCard(cardId, toColumnId, newIndex) {
    try {
      const user = getCurrentUser();
      const cards = DataService.getSheetData(CARDS_SHEET);
      const idx = cards.findIndex(c => c.CardId === cardId);
      if (idx === -1) throw new Error('Card not found.');

      const card = cards[idx];
      const fromCol = card.ColumnId;
      card.ColumnId = toColumnId;
      card.SortOrder = newIndex;
      DataService.updateRow(CARDS_SHEET, idx, card);

      addHistoryEntry(cardId, 'moved', fromCol, toColumnId, user.email);

      return { success: true };
    } catch (error) {
      logError('moveCard', error);
      throw new Error(error.message);
    }
  }

  /**
   * Archive a card by setting ArchivedDate.
   * @param {string} cardId
   * @returns {Object} { success: true }
   */
  function archiveCard(cardId) {
    try {
      const cards = DataService.getSheetData(CARDS_SHEET);
      const idx = cards.findIndex(c => c.CardId === cardId);
      if (idx === -1) throw new Error('Card not found.');

      cards[idx].ArchivedDate = new Date().toISOString();
      DataService.updateRow(CARDS_SHEET, idx, cards[idx]);
      return { success: true };
    } catch (error) {
      logError('archiveCard', error);
      throw new Error(error.message);
    }
  }

  /**
   * Bulk archive all cards in the Done column (admin only).
   * @returns {Object} { archived: count }
   */
  function bulkArchiveDone() {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can archive cards.');

      const columns = DataService.getSheetData(COLS_SHEET);
      const doneCol = columns.find(c => c.Title === 'Done');
      if (!doneCol) throw new Error('Done column not found.');

      const cards = DataService.getSheetData(CARDS_SHEET);
      let count = 0;
      const now = new Date().toISOString();

      for (let i = cards.length - 1; i >= 0; i--) {
        if (cards[i].ColumnId === doneCol.ColumnId && !cards[i].ArchivedDate) {
          cards[i].ArchivedDate = now;
          DataService.updateRow(CARDS_SHEET, i, cards[i]);
          count++;
        }
      }

      return { archived: count };
    } catch (error) {
      logError('bulkArchiveDone', error);
      throw new Error(error.message);
    }
  }

  /**
   * Create a card from a meeting action item (cross-app integration).
   * Places the card in the "To Do" column.
   * @param {Object} data - { title, description?, assignee, dueDate?, priority, linkedMeetingId? }
   * @returns {Object} { success: true, cardId }
   */
  function createCardFromActionItem(data) {
    try {
      if (!data.title || !data.title.trim()) throw new Error('Card title is required.');
      const user = getCurrentUser();

      const columns = DataService.getSheetData(COLS_SHEET);
      const toDoCol = columns.find(c => c.Title === 'To Do');
      if (!toDoCol) throw new Error('To Do column not found.');

      // Count existing cards in To Do for sort order
      const allCards = DataService.getSheetData(CARDS_SHEET);
      let cardsInCol = 0;
      allCards.forEach(c => {
        if (c.ColumnId === toDoCol.ColumnId && !c.ArchivedDate) cardsInCol++;
      });

      const card = {
        CardId: generateId('card_'),
        Title: data.title.trim(),
        Description: data.description || '',
        CardType: 'Action Item',
        ColumnId: toDoCol.ColumnId,
        Assignee: data.assignee || 'ALL',
        CreatedBy: user.email,
        CreatedDate: new Date().toISOString(),
        DueDate: data.dueDate || '',
        Priority: data.priority || 'Normal',
        SortOrder: cardsInCol + 1,
        Labels: '',
        LinkedMeetingId: data.linkedMeetingId || '',
        ArchivedDate: ''
      };
      DataService.appendRow(CARDS_SHEET, card);

      addHistoryEntry(card.CardId, 'created', '', toDoCol.ColumnId, user.email);

      return { success: true, cardId: card.CardId };
    } catch (error) {
      logError('createCardFromActionItem', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get card history entries for a specific card.
   * @param {string} cardId
   * @returns {Array<Object>}
   */
  function getCardHistory(cardId) {
    try {
      return DataService.getSheetData(HISTORY_SHEET)
        .filter(h => h.CardId === cardId)
        .sort((a, b) => (b.Timestamp || '').localeCompare(a.Timestamp || ''));
    } catch (error) {
      logError('getCardHistory', error);
      throw new Error(error.message);
    }
  }

  // --- Private helpers ---

  function addHistoryEntry(cardId, action, fromColumn, toColumn, actor) {
    DataService.appendRow(HISTORY_SHEET, {
      HistoryId: generateId('h_'),
      CardId: cardId,
      Action: action,
      FromColumn: fromColumn || '',
      ToColumn: toColumn || '',
      Actor: actor,
      Timestamp: new Date().toISOString()
    });
  }

  return {
    getBoard, createCard, updateCard, moveCard,
    archiveCard, bulkArchiveDone, createCardFromActionItem,
    getCardHistory
  };
})();
