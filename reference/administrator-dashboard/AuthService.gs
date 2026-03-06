/**
 * AuthService.gs — Authentication and Role-Based Access Control
 *
 * Uses Google OAuth via Apps Script Session to identify users.
 * Matches the session email against the `staff` table.
 *
 * Roles:
 *   admin    — Full access to all modules and data
 *   teacher  — Observations (own only, when shared) + Growth Plans (own only)
 *   support  — Limited read-only views (same as teacher for now)
 *   specialist — Same as teacher
 *
 * Module visibility:
 *   Admin:     All 6 tabs
 *   Non-admin: Observations, Growth Plans only
 */

var AuthService = (function() {

  // In-memory cache for the current execution (not persisted across calls)
  var currentUserCache_ = null;

  // Modules that only admins can access
  var ADMIN_ONLY_MODULES = ['kanban', 'projects', 'change_management', 'accreditation', 'reporting', 'meeting_minutes'];

  // Modules accessible by all authenticated users
  var ALL_USER_MODULES = ['observations', 'growth_plans', 'pd', 'feedback', 'wellness'];

  /**
   * Returns the current user's staff record.
   * Matches Session email to the staff table.
   * @returns {Object} Staff record
   * @throws {Error} If not authenticated or not in staff directory
   */
  function getCurrentUser() {
    if (currentUserCache_) return currentUserCache_;

    var email = Session.getActiveUser().getEmail();
    if (!email) {
      throw new Error('AUTH_NOT_AUTHENTICATED: No active session. Please sign in with your Google account.');
    }
    email = email.toLowerCase().trim();

    // Case-insensitive email lookup — fetch ALL staff (no is_active filter)
    var allStaff = DataService.query('staff', {});
    var matchedStaff = allStaff.data.filter(function(s) {
      var staffEmail = String(s.email || '').toLowerCase().trim();
      return staffEmail === email;
    });
    var result = { data: matchedStaff.slice(0, 1) };

    if (!result.data.length) {
      // Check admin_emails fallback in config before rejecting
      var config = DataService.getRecords('_config');
      var adminEmailsRow = null;
      for (var i = 0; i < config.length; i++) {
        if (config[i].key === 'admin_emails') {
          adminEmailsRow = config[i];
          break;
        }
      }
      if (adminEmailsRow && adminEmailsRow.value) {
        var adminEmails = parseCSV(adminEmailsRow.value);
        var emailMatch = false;
        for (var j = 0; j < adminEmails.length; j++) {
          if (adminEmails[j].toLowerCase().trim() === email) {
            emailMatch = true;
            break;
          }
        }
        if (emailMatch) {
          // Create a synthetic admin user record
          currentUserCache_ = {
            id: 'admin_' + email,
            email: email,
            first_name: email.split('@')[0],
            last_name: '(Admin)',
            role: 'admin',
            department: 'Administration',
            is_active: true
          };
          return currentUserCache_;
        }
      }

      Logger.log('AUTH DEBUG: email=' + email + ', staffCount=' + allStaff.data.length +
        ', emails=' + allStaff.data.map(function(s) { return s.email; }).join('|'));
      throw new Error('AUTH_USER_NOT_FOUND: Your account (' + email + ') is not registered in the staff directory. Contact an administrator.');
    }

    currentUserCache_ = result.data[0];
    return currentUserCache_;
  }

  /**
   * Checks if the current user has admin role.
   * @returns {boolean}
   */
  function isAdmin() {
    try {
      var user = getCurrentUser();
      return user.role === 'admin';
    } catch (e) {
      return false;
    }
  }

  /**
   * Ensures the current request is authenticated. Throws if not.
   */
  function requireAuth() {
    getCurrentUser();
  }

  /**
   * Ensures the current user is an admin. Throws if not.
   */
  function requireAdmin() {
    var user = getCurrentUser();
    if (user.role !== 'admin') {
      throw new Error('AUTH_ADMIN_REQUIRED: This action requires administrator access.');
    }
  }

  /**
   * Checks if the current user can view a given module.
   * @param {string} moduleName - e.g., 'observations', 'kanban', 'growth_plans'
   * @returns {boolean}
   */
  function canViewModule(moduleName) {
    if (isAdmin()) return true;
    return ALL_USER_MODULES.indexOf(moduleName) !== -1;
  }

  /**
   * Returns the list of module names visible to the current user.
   * @returns {string[]}
   */
  function getVisibleModules() {
    if (isAdmin()) {
      return ADMIN_ONLY_MODULES.concat(ALL_USER_MODULES);
    }
    return ALL_USER_MODULES.slice();
  }

  /**
   * Checks if the current user can access a specific record.
   * Admin: always yes.
   * Non-admin: only their own records in restricted tables.
   *
   * @param {string} tableName
   * @param {Object} record
   * @returns {boolean}
   */
  function canAccessRecord(tableName, record) {
    if (isAdmin()) return true;

    var user = getCurrentUser();
    var userId = user.id;

    switch (tableName) {
      case 'observations':
        // Teachers can see their own observations (when shared)
        return record.teacher_id === userId && record.shared_with_teacher === true;

      case 'growth_plans':
        // Teachers can view and edit their own growth plan
        return record.staff_id === userId;

      case 'pgp_standard_selections':
      case 'growth_meetings':
      case 'pgp_cycle_history':
        // Need to check the parent plan's staff_id
        // For performance, the caller should pre-check this
        return false;

      case 'staff':
        // Everyone can see the staff directory (for selectors)
        return true;

      default:
        return false;
    }
  }

  /**
   * Returns a user-safe representation of the current user (for the client).
   * @returns {Object}
   */
  function getUserContext() {
    var user = getCurrentUser();
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      department: user.department,
      isAdmin: user.role === 'admin',
      visibleModules: getVisibleModules()
    };
  }

  return {
    getCurrentUser: getCurrentUser,
    isAdmin: isAdmin,
    requireAuth: requireAuth,
    requireAdmin: requireAdmin,
    canViewModule: canViewModule,
    getVisibleModules: getVisibleModules,
    canAccessRecord: canAccessRecord,
    getUserContext: getUserContext
  };

})();
