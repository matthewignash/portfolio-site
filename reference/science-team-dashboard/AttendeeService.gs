/**
 * AttendeeService.gs
 * Backend logic for meeting attendees.
 * Manages Attendees tab.
 */

const AttendeeService = (function() {

  const SHEET = 'Attendees';

  /**
   * Add an attendee to a meeting.
   * @param {string} meetingId
   * @param {string} email
   * @param {string} role - 'Organizer', 'Note Taker', or 'Attendee'
   * @returns {Object} { success: true }
   */
  function addAttendee(meetingId, email, role) {
    try {
      // Check for duplicate
      const existing = DataService.getSheetData(SHEET);
      const dup = existing.find(a => a.MeetingId === meetingId && a.Email === email);
      if (dup) throw new Error('Already an attendee.');

      // Look up display name from Staff sheet, fall back to email prefix
      const staffMember = StaffService.getStaffMember(email);
      let name;
      if (staffMember) {
        name = staffMember.DisplayName;
      } else {
        name = email.split('@')[0];
        name = name.charAt(0).toUpperCase() + name.slice(1);
      }

      DataService.appendRow(SHEET, {
        AttendeeId: generateId('att_'),
        MeetingId: meetingId,
        Email: email,
        Name: name,
        Role: role || 'Attendee',
        Attended: false
      });

      return { success: true };
    } catch (error) {
      logError('addAttendee', error);
      throw new Error(error.message);
    }
  }

  /**
   * Remove an attendee from a meeting.
   * @param {string} meetingId
   * @param {string} attendeeId
   * @returns {Object} { success: true }
   */
  function removeAttendee(meetingId, attendeeId) {
    try {
      const data = DataService.getSheetData(SHEET);
      const idx = data.findIndex(a => a.AttendeeId === attendeeId && a.MeetingId === meetingId);
      if (idx === -1) throw new Error('Attendee not found.');

      DataService.deleteRow(SHEET, idx);
      return { success: true };
    } catch (error) {
      logError('removeAttendee', error);
      throw new Error(error.message);
    }
  }

  /**
   * Toggle or set attendance for an attendee.
   * @param {string} meetingId
   * @param {string} attendeeId
   * @param {boolean} attended
   * @returns {Object} { success: true }
   */
  function updateAttendance(meetingId, attendeeId, attended) {
    try {
      const data = DataService.getSheetData(SHEET);
      const idx = data.findIndex(a => a.AttendeeId === attendeeId);
      if (idx === -1) throw new Error('Attendee not found.');

      data[idx].Attended = attended;
      DataService.updateRow(SHEET, idx, data[idx]);

      return { success: true };
    } catch (error) {
      logError('updateAttendance', error);
      throw new Error(error.message);
    }
  }

  return { addAttendee, removeAttendee, updateAttendance };
})();
