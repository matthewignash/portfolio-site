/**
 * MeetingService.gs
 * Backend logic for Meeting Minutes core operations.
 * Manages Meetings and MeetingTemplates tabs; orchestrates detail queries.
 */

const MeetingService = (function() {

  const MTG_SHEET  = 'Meetings';
  const TPL_SHEET  = 'MeetingTemplates';
  const ATT_SHEET  = 'Attendees';
  const AGN_SHEET  = 'AgendaItems';
  const DEC_SHEET  = 'Decisions';
  const ACT_SHEET  = 'ActionItems';

  /**
   * Get all meetings, sorted by date descending.
   * @returns {Array<Object>}
   */
  function getMeetings() {
    try {
      return DataService.getSheetData(MTG_SHEET)
        .sort((a, b) => (b.Date || '').localeCompare(a.Date || ''));
    } catch (error) {
      logError('getMeetings', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get all active meeting templates.
   * @returns {Array<Object>}
   */
  function getTemplates() {
    try {
      return DataService.getSheetData(TPL_SHEET)
        .filter(t => t.IsActive === true || t.IsActive === 'TRUE');
    } catch (error) {
      logError('getTemplates', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get full detail for a meeting: meeting + attendees + agenda + decisions + action items.
   * @param {string} meetingId
   * @returns {Object} { meeting, attendees, agendaItems, decisions, actionItems }
   */
  function getMeetingDetail(meetingId) {
    try {
      const meetings = DataService.getSheetData(MTG_SHEET);
      const meeting = meetings.find(m => m.MeetingId === meetingId);
      if (!meeting) throw new Error('Meeting not found.');

      const attendees = DataService.getSheetData(ATT_SHEET)
        .filter(a => a.MeetingId === meetingId);

      const agendaItems = DataService.getSheetData(AGN_SHEET)
        .filter(a => a.MeetingId === meetingId)
        .sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0));

      const decisions = DataService.getSheetData(DEC_SHEET)
        .filter(d => d.MeetingId === meetingId);

      const actionItems = DataService.getSheetData(ACT_SHEET)
        .filter(a => a.MeetingId === meetingId);

      return { meeting, attendees, agendaItems, decisions, actionItems };
    } catch (error) {
      logError('getMeetingDetail', error);
      throw new Error(error.message);
    }
  }

  /**
   * Create a meeting from a template (admin only).
   * @param {string} templateId
   * @param {string} date
   * @param {string} startTime
   * @param {string} endTime
   * @param {string} location
   * @returns {Object} { meetingId }
   */
  function createMeetingFromTemplate(templateId, date, startTime, endTime, location) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can create meetings.');

      const templates = DataService.getSheetData(TPL_SHEET);
      const tpl = templates.find(t => t.TemplateId === templateId);
      if (!tpl) throw new Error('Template not found.');

      // Build title from template with date substitution
      const dateObj = parseDateString(date);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const dateStr = months[dateObj.getMonth()] + ' ' + dateObj.getDate();
      const title = (tpl.DefaultTitle || '').replace('{DATE}', dateStr);

      const meetingId = generateId('mtg_');
      const meeting = {
        MeetingId: meetingId,
        Title: title,
        TemplateType: templateId,
        Date: date,
        StartTime: startTime,
        EndTime: endTime,
        Location: location || '',
        Organizer: user.email,
        Status: 'Draft',
        CreatedDate: new Date().toISOString(),
        FinalizedDate: '',
        FinalizedBy: ''
      };
      DataService.appendRow(MTG_SHEET, meeting);

      // Create default agenda items from template
      let agendaTitles = [];
      try { agendaTitles = JSON.parse(tpl.DefaultAgendaItems || '[]'); } catch(e) {}
      agendaTitles.forEach((title, idx) => {
        DataService.appendRow(AGN_SHEET, {
          AgendaId: generateId('ag_'),
          MeetingId: meetingId,
          SortOrder: idx + 1,
          Title: title,
          Description: '',
          Presenter: user.email,
          TimeAllocation: 10,
          Notes: ''
        });
      });

      // Add all department members as attendees if template says ALL
      if (tpl.DefaultAttendees === 'ALL') {
        // In production, this would iterate a Users/Members list.
        // For now, add only the creator as Organizer.
        DataService.appendRow(ATT_SHEET, {
          AttendeeId: generateId('att_'),
          MeetingId: meetingId,
          Email: user.email,
          Name: user.name,
          Role: 'Organizer',
          Attended: false
        });
      }

      return { meetingId };
    } catch (error) {
      logError('createMeetingFromTemplate', error);
      throw new Error(error.message);
    }
  }

  /**
   * Delete a meeting and cascade-delete all related data (admin only).
   * @param {string} meetingId
   * @returns {Object} { success: true }
   */
  function deleteMeeting(meetingId) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can delete meetings.');

      const idx = DataService.findRowIndex(MTG_SHEET, 'MeetingId', meetingId);
      if (idx === -1) throw new Error('Meeting not found.');

      // Cascade: delete action items, decisions, agenda, attendees, then meeting
      DataService.deleteRowsWhere(ACT_SHEET, 'MeetingId', meetingId);
      DataService.deleteRowsWhere(DEC_SHEET, 'MeetingId', meetingId);
      DataService.deleteRowsWhere(AGN_SHEET, 'MeetingId', meetingId);
      DataService.deleteRowsWhere(ATT_SHEET, 'MeetingId', meetingId);
      DataService.deleteRow(MTG_SHEET, idx);

      return { success: true };
    } catch (error) {
      logError('deleteMeeting', error);
      throw new Error(error.message);
    }
  }

  /**
   * Finalize a meeting (organizer or admin).
   * @param {string} meetingId
   * @returns {Object} { success: true }
   */
  function finalizeMeeting(meetingId) {
    try {
      const user = getCurrentUser();
      const data = DataService.getSheetData(MTG_SHEET);
      const idx = data.findIndex(m => m.MeetingId === meetingId);
      if (idx === -1) throw new Error('Meeting not found.');

      const meeting = data[idx];
      if (!user.isAdmin && meeting.Organizer !== user.email) {
        throw new Error('Only the organizer or admin can finalize.');
      }

      meeting.Status = 'Finalized';
      meeting.FinalizedDate = new Date().toISOString();
      meeting.FinalizedBy = user.email;
      DataService.updateRow(MTG_SHEET, idx, meeting);

      return { success: true };
    } catch (error) {
      logError('finalizeMeeting', error);
      throw new Error(error.message);
    }
  }

  /**
   * Start a meeting (change status from Draft/Scheduled to In Progress).
   * @param {string} meetingId
   * @returns {Object} { success: true }
   */
  function startMeeting(meetingId) {
    try {
      const data = DataService.getSheetData(MTG_SHEET);
      const idx = data.findIndex(m => m.MeetingId === meetingId);
      if (idx === -1) throw new Error('Meeting not found.');

      data[idx].Status = 'In Progress';
      DataService.updateRow(MTG_SHEET, idx, data[idx]);

      return { success: true };
    } catch (error) {
      logError('startMeeting', error);
      throw new Error(error.message);
    }
  }

  return {
    getMeetings, getTemplates, getMeetingDetail,
    createMeetingFromTemplate, deleteMeeting,
    finalizeMeeting, startMeeting
  };
})();
