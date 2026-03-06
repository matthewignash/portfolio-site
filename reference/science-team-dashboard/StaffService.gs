/**
 * StaffService.gs
 * Backend logic for the Staff directory.
 * Manages the Staff tab — CRUD for team member records.
 */

const StaffService = (function() {

  const SHEET = 'Staff';

  /**
   * Get all active staff members.
   * Callable by any user (needed for dropdown population across apps).
   * @returns {Array<Object>}
   */
  function getStaff() {
    try {
      const data = DataService.getSheetData(SHEET);
      return data.filter(s => s.IsActive === true || s.IsActive === 'TRUE');
    } catch (error) {
      logError('getStaff', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get all staff including inactive (admin only, for the management panel).
   * @returns {Array<Object>}
   */
  function getAllStaff() {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can view all staff.');
      return DataService.getSheetData(SHEET);
    } catch (error) {
      logError('getAllStaff', error);
      throw new Error(error.message);
    }
  }

  /**
   * Lookup a single staff member by email.
   * Used by getCurrentUser() for display name resolution.
   * @param {string} email
   * @returns {Object|null}
   */
  function getStaffMember(email) {
    try {
      if (!email) return null;
      const data = DataService.getSheetData(SHEET);
      const match = data.find(s => s.Email.toLowerCase() === email.toLowerCase());
      return match || null;
    } catch (error) {
      logError('getStaffMember', error);
      return null;
    }
  }

  /**
   * Add a new staff member (admin only).
   * @param {Object} data - { email, displayName, role }
   * @returns {Object} the created staff record
   */
  function addStaff(data) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can add staff.');
      if (!data.email || !data.email.trim()) throw new Error('Email is required.');
      if (!data.displayName || !data.displayName.trim()) throw new Error('Display name is required.');

      // Check for duplicate email
      const existing = DataService.getSheetData(SHEET);
      const dup = existing.find(s => s.Email.toLowerCase() === data.email.trim().toLowerCase());
      if (dup) throw new Error('A staff member with this email already exists.');

      const staff = {
        StaffId: generateId('staff_'),
        Email: data.email.trim().toLowerCase(),
        DisplayName: data.displayName.trim(),
        Role: data.role || 'Teacher',
        IsActive: true,
        CreatedDate: new Date().toISOString()
      };
      DataService.appendRow(SHEET, staff);
      return staff;
    } catch (error) {
      logError('addStaff', error);
      throw new Error(error.message);
    }
  }

  /**
   * Update a staff member's display name and/or role (admin only).
   * Email is immutable after creation.
   * @param {string} staffId
   * @param {Object} data - { displayName?, role? }
   * @returns {Object} the updated staff record
   */
  function updateStaff(staffId, data) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can edit staff.');

      const rows = DataService.getSheetData(SHEET);
      const idx = rows.findIndex(s => s.StaffId === staffId);
      if (idx === -1) throw new Error('Staff member not found.');

      if (data.displayName !== undefined) rows[idx].DisplayName = data.displayName.trim();
      if (data.role !== undefined) rows[idx].Role = data.role;

      DataService.updateRow(SHEET, idx, rows[idx]);
      return rows[idx];
    } catch (error) {
      logError('updateStaff', error);
      throw new Error(error.message);
    }
  }

  /**
   * Soft-delete a staff member by setting IsActive = false (admin only).
   * Prevents self-deactivation.
   * @param {string} staffId
   * @returns {Object} { success: true }
   */
  function deactivateStaff(staffId) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can deactivate staff.');

      const rows = DataService.getSheetData(SHEET);
      const idx = rows.findIndex(s => s.StaffId === staffId);
      if (idx === -1) throw new Error('Staff member not found.');

      if (rows[idx].Email.toLowerCase() === user.email.toLowerCase()) {
        throw new Error('You cannot deactivate yourself.');
      }

      rows[idx].IsActive = false;
      DataService.updateRow(SHEET, idx, rows[idx]);
      return { success: true };
    } catch (error) {
      logError('deactivateStaff', error);
      throw new Error(error.message);
    }
  }

  /**
   * Re-enable a deactivated staff member (admin only).
   * @param {string} staffId
   * @returns {Object} the reactivated staff record
   */
  function reactivateStaff(staffId) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can reactivate staff.');

      const rows = DataService.getSheetData(SHEET);
      const idx = rows.findIndex(s => s.StaffId === staffId);
      if (idx === -1) throw new Error('Staff member not found.');

      rows[idx].IsActive = true;
      DataService.updateRow(SHEET, idx, rows[idx]);
      return rows[idx];
    } catch (error) {
      logError('reactivateStaff', error);
      throw new Error(error.message);
    }
  }

  return {
    getStaff,
    getAllStaff,
    getStaffMember,
    addStaff,
    updateStaff,
    deactivateStaff,
    reactivateStaff
  };

})();
