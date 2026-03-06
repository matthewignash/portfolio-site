/**
 * DecisionService.gs
 * Backend logic for meeting decisions.
 * Manages Decisions tab.
 */

const DecisionService = (function() {

  const SHEET = 'Decisions';

  /**
   * Record a decision for a meeting.
   * @param {string} meetingId
   * @param {Object} data - { decision, context?, agendaId? }
   * @returns {Object} { success: true }
   */
  function addDecision(meetingId, data) {
    try {
      DataService.appendRow(SHEET, {
        DecisionId: generateId('dec_'),
        MeetingId: meetingId,
        AgendaId: data.agendaId || '',
        Decision: data.decision || '',
        Context: data.context || '',
        Timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      logError('addDecision', error);
      throw new Error(error.message);
    }
  }

  /**
   * Delete a decision.
   * @param {string} decisionId
   * @returns {Object} { success: true }
   */
  function deleteDecision(decisionId) {
    try {
      const idx = DataService.findRowIndex(SHEET, 'DecisionId', decisionId);
      if (idx === -1) throw new Error('Decision not found.');

      DataService.deleteRow(SHEET, idx);
      return { success: true };
    } catch (error) {
      logError('deleteDecision', error);
      throw new Error(error.message);
    }
  }

  return { addDecision, deleteDecision };
})();
