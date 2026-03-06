/**
 * User Service - COMPLETE FIXED VERSION
 * Handles user authentication and role management
 *
 * @version 1.2.0 - Fixed getCurrentUser to return normalizedRole, canEdit, isAdmin
 *
 * CHANGE LOG v1.2.0:
 * - getCurrentUser() now returns normalizedRole, canEdit, isAdmin
 * - Added normalizeUserRole() helper function
 * - Fixed to work with createClass() permission checks
 * - All functions use dynamic column lookup by header name
 * - Added changeUserRole(), getAllUsers(), addUser() for admin management
 */
// ============================================================================
// ROLE NORMALIZATION HELPER
// ============================================================================
/**
 * Normalize role string for consistent comparison
 * Handles variations like "Admin", "administrator", "TEACHER", etc.
 *
 * @param {string} role - Raw role string
 * @returns {string} Normalized role: 'administrator', 'teacher', or 'student'
 */
function normalizeUserRole(role) {
if (!role) return 'student';
var r = String(role).toLowerCase().trim();
if (r === 'admin' || r === 'administrator' || r === 'superadmin') {
return 'administrator';
  }
if (r === 'teacher' || r === 'instructor' || r === 'faculty') {
return 'teacher';
  }
return 'student';
}
// ============================================================================
// USER AUTHENTICATION
// ============================================================================
/**
 * Get current user with web app authentication
 * Works for both container-bound and web app contexts
 *
 * @returns {Object} User object with email, role, name, normalizedRole, canEdit, isAdmin
 */
function getCurrentUser() {
try {
var userEmail = '';
// Try multiple methods to get user email
try {
userEmail = Session.getEffectiveUser().getEmail();
    } catch (e) {
Logger.log('getEffectiveUser failed, trying getActiveUser: ' + e.message);
    }
if (!userEmail || userEmail === '') {
try {
userEmail = Session.getActiveUser().getEmail();
      } catch (e) {
Logger.log('getActiveUser failed: ' + e.message);
      }
    }
// If still no email, return a restricted guest (never grant edit access)
if (!userEmail || userEmail === '') {
Logger.log('SECURITY: No user email found — returning restricted guest');
return {
email: '',
role: 'student',
normalizedRole: 'student',
name: 'Guest',
displayName: 'Guest',
canEdit: false,
isAdmin: false
      };
    }
Logger.log('User email found: ' + userEmail);
// Get role from Users sheet
var role = getUserRole(userEmail);
var name = getUserName(userEmail) || userEmail.split('@')[0];
// Normalize the role for consistent checking
var normalizedRole = normalizeUserRole(role);
Logger.log('getCurrentUser result: email=' + userEmail + ', role=' + role + ', normalized=' + normalizedRole + ', canEdit=' + (normalizedRole === 'administrator' || normalizedRole === 'teacher'));
return {
email: userEmail,
role: role,
normalizedRole: normalizedRole,
name: name,
displayName: name,
canEdit: (normalizedRole === 'administrator' || normalizedRole === 'teacher'),
isAdmin: (normalizedRole === 'administrator')
    };
  } catch (err) {
Logger.log('ERROR in getCurrentUser: ' + err.message);
Logger.log('Stack: ' + err.stack);
// Return default user instead of throwing error
return {
email: 'unknown@example.com',
role: 'student',
normalizedRole: 'student',
name: 'Guest User',
displayName: 'Guest User',
canEdit: false,
isAdmin: false
    };
  }
}
/**
 * Get user role from Users sheet
 *
 * @param {string} email - User email
 * @returns {string} User role (administrator, teacher, or student)
 */
function getUserRole(email) {
try {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var usersSheet = ss.getSheetByName('Users');
if (!usersSheet) {
Logger.log('Users sheet not found, returning default role');
return 'teacher'; // Default to teacher if no Users sheet
    }
var data = usersSheet.getDataRange().getValues();
var headers = data[0];
// Find column indices dynamically by header name
var emailCol = headers.indexOf('email');
var roleCol = headers.indexOf('role');
// Fallback to position-based if headers not found
if (emailCol < 0) emailCol = 0;
if (roleCol < 0) roleCol = 2;
// Normalize search email
var normalizedEmail = email.toLowerCase().trim();
// Skip header row and search for user
for (var i = 1; i < data.length; i++) {
var rowEmail = data[i][emailCol];
if (rowEmail && String(rowEmail).toLowerCase().trim() === normalizedEmail) {
var role = data[i][roleCol] || 'student';
Logger.log('Found role for ' + email + ': ' + role);
return role;
      }
    }
// User not found in sheet - add them as student by default
Logger.log('User not found, adding as student: ' + email);
// Build row based on actual headers
var newRow = [];
for (var h = 0; h < headers.length; h++) {
switch(headers[h]) {
case 'email': newRow.push(email); break;
case 'name': newRow.push(email.split('@')[0]); break;
case 'role': newRow.push('Student'); break;
case 'active': newRow.push(true); break;
case 'displayName': newRow.push(email.split('@')[0]); break;
case 'createdAt': newRow.push(new Date().toISOString()); break;
case 'lastLogin': newRow.push(new Date().toISOString()); break;
default: newRow.push(''); break;
      }
    }
usersSheet.appendRow(newRow);
return 'student';
  } catch (err) {
Logger.log('Error getting user role: ' + err.message);
return 'student'; // Default to student on error
  }
}
/**
 * Get user name from Users sheet
 *
 * @param {string} email - User email
 * @returns {string|null} User name or null
 */
function getUserName(email) {
try {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var usersSheet = ss.getSheetByName('Users');
if (!usersSheet) {
return null;
    }
var data = usersSheet.getDataRange().getValues();
var headers = data[0];
// Find column indices dynamically
var emailCol = headers.indexOf('email');
var nameCol = headers.indexOf('name');
var displayNameCol = headers.indexOf('displayName');
if (emailCol < 0) emailCol = 0;
if (nameCol < 0) nameCol = 1;
var normalizedEmail = email.toLowerCase().trim();
for (var i = 1; i < data.length; i++) {
var rowEmail = data[i][emailCol];
if (rowEmail && String(rowEmail).toLowerCase().trim() === normalizedEmail) {
// Prefer displayName, fall back to name
if (displayNameCol >= 0 && data[i][displayNameCol]) {
return data[i][displayNameCol];
        }
return data[i][nameCol] || null;
      }
    }
return null;
  } catch (err) {
Logger.log('Error getting user name: ' + err.message);
return null;
  }
}
/**
 * Check if current user can edit (is teacher or admin)
 * @returns {boolean}
 */
function canEdit() {
var user = getCurrentUser();
return user.canEdit === true;
}
/**
 * Check if current user is admin
 * @returns {boolean}
 */
function isAdmin() {
var user = getCurrentUser();
return user.isAdmin === true;
}
/**
 * Check if user has role
 *
 * @param {string} requiredRole - Required role (administrator, teacher, or student)
 * @returns {boolean} True if user has role
 */
function hasRole(requiredRole) {
try {
var user = getCurrentUser();
// Administrator has all permissions
if (user.normalizedRole === 'administrator') {
return true;
    }
// Check if user has required role
var normalizedRequired = normalizeUserRole(requiredRole);
return user.normalizedRole === normalizedRequired;
  } catch (err) {
Logger.log('Error checking role: ' + err.message);
return false;
  }
}
/**
 * Check if user is administrator
 *
 * @returns {boolean} True if administrator
 */
function isAdministrator() {
return hasRole('administrator');
}
/**
 * Check if user is teacher (or admin)
 *
 * @returns {boolean} True if teacher or administrator
 */
function isTeacher() {
var user = getCurrentUser();
return user.normalizedRole === 'administrator' || user.normalizedRole === 'teacher';
}
/**
 * Check if user is teacher or administrator.
 * Called by MapService, CourseService, ProgressService for permission checks.
 *
 * @returns {boolean} True if teacher or administrator
 */
function isTeacherOrAdmin() {
var user = getCurrentUser();
var role = (user.normalizedRole || '').toLowerCase();
return role === 'administrator' || role === 'teacher';
}
/**
 * Check if user is student
 *
 * @returns {boolean} True if student
 */
function isStudent() {
var user = getCurrentUser();
return user.normalizedRole === 'student';
}
/**
 * Require role (throws error if not authorized).
 * Accepts a single role string or an array of roles (any match passes).
 *
 * @param {string|Array<string>} requiredRole - Required role(s)
 * @throws {Error} If user doesn't have any of the required roles
 */
function requireRole(requiredRole) {
  if (Array.isArray(requiredRole)) {
    for (var i = 0; i < requiredRole.length; i++) {
      if (hasRole(requiredRole[i])) return;
    }
    const user = getCurrentUser();
    throw new Error('Access denied. Required: ' + requiredRole.join(' or ') + ', Your role: ' + user.role);
  }
  if (!hasRole(requiredRole)) {
    const user = getCurrentUser();
    throw new Error('Access denied. Required: ' + requiredRole + ', Your role: ' + user.role);
  }
}
// ============================================================================
// USER MANAGEMENT
// ============================================================================
/**
 * Get all users (admin only)
 *
 * @returns {Array<Object>} Array of user objects
 */
function getUsers() {
requireRole('administrator');
var ss = SpreadsheetApp.getActiveSpreadsheet();
var usersSheet = ss.getSheetByName('Users');
if (!usersSheet) {
return [];
  }
var data = usersSheet.getDataRange().getValues();
var headers = data[0];
var users = [];
// Find column indices
var emailCol = headers.indexOf('email');
var nameCol = headers.indexOf('name');
var roleCol = headers.indexOf('role');
var activeCol = headers.indexOf('active');
var displayNameCol = headers.indexOf('displayName');
var createdAtCol = headers.indexOf('createdAt');
var lastLoginCol = headers.indexOf('lastLogin');
// Use defaults if columns not found
if (emailCol < 0) emailCol = 0;
if (nameCol < 0) nameCol = 1;
if (roleCol < 0) roleCol = 2;
// Skip header
for (var i = 1; i < data.length; i++) {
users.push({
email: data[i][emailCol] || '',
name: nameCol >= 0 ? data[i][nameCol] : '',
role: data[i][roleCol] || 'student',
active: activeCol >= 0 ? data[i][activeCol] : true,
displayName: displayNameCol >= 0 ? data[i][displayNameCol] : '',
createdAt: createdAtCol >= 0 ? data[i][createdAtCol] : '',
lastLogin: lastLoginCol >= 0 ? data[i][lastLoginCol] : ''
    });
  }
return users;
}
/**
 * Get all users (alias for HTML interface)
 *
 * @returns {Array<Object>} Array of user objects
 */
function getAllUsers() {
return getUsers();
}
/**
 * Add or update user
 *
 * @param {Object} user - User object with email, name, role
 * @returns {Object} Saved user
 */
function saveUser(user) {
requireRole('administrator');
if (!user || !user.email) {
throw new Error('User email is required');
  }
var ss = SpreadsheetApp.getActiveSpreadsheet();
var usersSheet = ss.getSheetByName('Users');
// Create Users sheet if it doesn't exist
if (!usersSheet) {
usersSheet = ss.insertSheet('Users');
usersSheet.appendRow(['email', 'name', 'role', 'active', 'displayName', 'createdAt', 'lastLogin']);
  }
var data = usersSheet.getDataRange().getValues();
var headers = data[0];
// Find column indices
var emailCol = headers.indexOf('email');
if (emailCol < 0) emailCol = 0;
var normalizedEmail = user.email.toLowerCase().trim();
// Find existing user
for (var i = 1; i < data.length; i++) {
var rowEmail = data[i][emailCol];
if (rowEmail && String(rowEmail).toLowerCase().trim() === normalizedEmail) {
// Update existing - build row based on headers
var updateRow = [];
for (var h = 0; h < headers.length; h++) {
switch(headers[h]) {
case 'email': updateRow.push(user.email); break;
case 'name': updateRow.push(user.name || data[i][h]); break;
case 'role': updateRow.push(user.role || data[i][h]); break;
case 'active': updateRow.push(user.active !== undefined ? user.active : data[i][h]); break;
case 'displayName': updateRow.push(user.displayName || user.name || data[i][h]); break;
case 'createdAt': updateRow.push(data[i][h]); break; // Keep original
case 'lastLogin': updateRow.push(data[i][h]); break; // Keep original
default: updateRow.push(data[i][h]); break;
        }
      }
usersSheet.getRange(i + 1, 1, 1, headers.length).setValues([updateRow]);
Logger.log('Updated user: ' + user.email);
return user;
    }
  }
// Add new user - build row based on headers
var newRow = [];
for (var h = 0; h < headers.length; h++) {
switch(headers[h]) {
case 'email': newRow.push(user.email); break;
case 'name': newRow.push(user.name || user.email.split('@')[0]); break;
case 'role': newRow.push(user.role || 'student'); break;
case 'active': newRow.push(true); break;
case 'displayName': newRow.push(user.displayName || user.name || user.email.split('@')[0]); break;
case 'createdAt': newRow.push(new Date().toISOString()); break;
case 'lastLogin': newRow.push(''); break;
default: newRow.push(''); break;
    }
  }
usersSheet.appendRow(newRow);
Logger.log('Added new user: ' + user.email);
return user;
}
/**
 * Add a new user (alias for HTML interface)
 *
 * @param {Object} userData - User data object with email, name, role
 * @returns {Object} Result with success/error
 */
function addUser(userData) {
try {
var result = saveUser(userData);
return {
success: true,
email: userData.email,
role: userData.role,
message: 'User added successfully'
    };
  } catch (e) {
Logger.log('Error in addUser: ' + e.message);
throw e;
  }
}
/**
 * Change a user's role
 *
 * @param {string} email - User email
 * @param {string} newRole - New role (Administrator, Teacher, Student)
 * @returns {Object} Result with success status
 */
function changeUserRole(email, newRole) {
requireRole('administrator');
var lock = LockService.getScriptLock();
try {
lock.waitLock(30000);
// Validate role
var validRoles = ['Administrator', 'Teacher', 'Student', 'administrator', 'teacher', 'student'];
if (validRoles.indexOf(newRole) === -1) {
  throw new Error('Invalid role. Must be one of: Administrator, Teacher, Student');
}
var ss = SpreadsheetApp.getActiveSpreadsheet();
var usersSheet = ss.getSheetByName('Users');
if (!usersSheet) {
  throw new Error('Users sheet not found');
}
var data = usersSheet.getDataRange().getValues();
var headers = data[0];
// Find column indices
var emailCol = headers.indexOf('email');
var roleCol = headers.indexOf('role');
if (emailCol < 0) emailCol = 0;
if (roleCol < 0) roleCol = 2;
var normalizedEmail = email.toLowerCase().trim();
// Find and update user
for (var i = 1; i < data.length; i++) {
  var rowEmail = data[i][emailCol];
  if (rowEmail && String(rowEmail).toLowerCase().trim() === normalizedEmail) {
    // Prevent removing the last admin
    var currentRole = data[i][roleCol];
    if (normalizeUserRole(String(currentRole)) === 'administrator' && normalizeUserRole(newRole) !== 'administrator') {
      var adminCount = 0;
      for (var j = 1; j < data.length; j++) {
        if (normalizeUserRole(String(data[j][roleCol])) === 'administrator') adminCount++;
      }
      if (adminCount <= 1) {
        throw new Error('Cannot remove the last administrator. Assign another admin first.');
      }
    }
    usersSheet.getRange(i + 1, roleCol + 1).setValue(newRole);
    Logger.log('Changed role for ' + email + ' to ' + newRole);
    return {
      success: true,
      email: email,
      newRole: newRole,
      message: 'Role updated successfully'
    };
  }
}
throw new Error('User not found: ' + email);
} finally {
lock.releaseLock();
}
}
/**
 * Delete user
 *
 * @param {string} email - User email to delete
 */
function deleteUser(email) {
requireRole('administrator');
var ss = SpreadsheetApp.getActiveSpreadsheet();
var usersSheet = ss.getSheetByName('Users');
if (!usersSheet) {
return;
  }
var data = usersSheet.getDataRange().getValues();
var headers = data[0];
var emailCol = headers.indexOf('email');
if (emailCol < 0) emailCol = 0;
var normalizedEmail = email.toLowerCase().trim();
for (var i = 1; i < data.length; i++) {
var rowEmail = data[i][emailCol];
if (rowEmail && String(rowEmail).toLowerCase().trim() === normalizedEmail) {
usersSheet.deleteRow(i + 1);
Logger.log('Deleted user: ' + email);
return;
    }
  }
}
/**
 * Remove duplicate user entries (keeps first occurrence)
 *
 * @returns {Object} Result with count of duplicates removed
 */
function cleanupDuplicateUsers() {
requireRole('administrator');
var ss = SpreadsheetApp.getActiveSpreadsheet();
var usersSheet = ss.getSheetByName('Users');
if (!usersSheet) {
return { removed: 0 };
  }
var data = usersSheet.getDataRange().getValues();
var headers = data[0];
var emailCol = headers.indexOf('email');
if (emailCol < 0) emailCol = 0;
var seenEmails = {};
var rowsToDelete = [];
// Find duplicates (skip header)
for (var i = 1; i < data.length; i++) {
var rowEmail = data[i][emailCol];
if (rowEmail) {
var normalizedEmail = String(rowEmail).toLowerCase().trim();
if (seenEmails[normalizedEmail]) {
rowsToDelete.push(i + 1); // 1-indexed row number
      } else {
seenEmails[normalizedEmail] = true;
      }
    }
  }
// Delete from bottom to top to preserve row indices
for (var j = rowsToDelete.length - 1; j >= 0; j--) {
usersSheet.deleteRow(rowsToDelete[j]);
  }
Logger.log('Removed ' + rowsToDelete.length + ' duplicate user entries');
return { removed: rowsToDelete.length };
}
// ============================================================================
// COURSE & MAP FILTERING (REQUIRED BY OTHER SERVICES)
// ============================================================================
/**
 * Filter maps by user role
 *
 * Admin/Teacher: sees all maps
 * Student: sees only maps they have progress in
 *
 * @param {Array<Object>} maps - Array of map objects
 * @returns {Array<Object>} Filtered maps
 */
function filterMapsByRole(maps) {
  const user = getCurrentUser();
  // Admin and teachers see all maps
  if (user.normalizedRole === 'administrator' || user.normalizedRole === 'teacher') {
    return maps;
  }
  // Students: show maps with progress OR maps assigned via ClassRoster + MapAssignments
  try {
    const mapIds = {};

    // Path 1: Maps with existing progress rows (student has started work)
    const progressRecords = findRowsFiltered_(SHEETS_.PROGRESS, { email: user.email });
    for (let i = 0; i < progressRecords.length; i++) {
      mapIds[String(progressRecords[i].mapId)] = true;
    }

    // Path 2: Maps assigned via ClassRoster + MapAssignments (newly assigned, no progress yet)
    // Mirrors canViewMap() logic from MapService.gs
    const studentEmail = user.email.toLowerCase();
    let studentClasses = [];
    const rosterEntries = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { email: studentEmail });
    for (let i = 0; i < rosterEntries.length; i++) {
      if (rosterEntries[i].status !== 'removed') {
        studentClasses.push(String(rosterEntries[i].classId));
      }
    }
    // Backward compat: also check studentEmail column
    if (studentClasses.length === 0) {
      const rosterByStudentEmail = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { studentEmail: studentEmail });
      for (let i = 0; i < rosterByStudentEmail.length; i++) {
        if (rosterByStudentEmail[i].status !== 'removed') {
          studentClasses.push(String(rosterByStudentEmail[i].classId));
        }
      }
    }

    if (studentClasses.length > 0) {
      const allAssignments = readAll_(SHEETS_.MAP_ASSIGNMENTS);
      for (let a = 0; a < allAssignments.length; a++) {
        if (studentClasses.indexOf(String(allAssignments[a].classId)) !== -1) {
          mapIds[String(allAssignments[a].mapId)] = true;
        }
      }
    }

    return maps.filter(function(m) { return mapIds[String(m.mapId)]; });
  } catch (err) {
    Logger.log('Error filtering maps for student: ' + err.message);
    return [];
  }
}
/**
 * Filter courses by user role
 *
 * Admin: sees all courses
 * Teacher: sees only their courses
 * Student: sees courses they're enrolled in (via maps)
 *
 * @param {Array<Object>} courses - Array of course objects
 * @returns {Array<Object>} Filtered courses
 */
function filterCoursesByRole(courses) {
var user = getCurrentUser();
// Admin sees everything
if (user.normalizedRole === 'administrator') {
return courses;
  }
// Teachers see only courses they own
if (user.normalizedRole === 'teacher') {
return courses.filter(function(c) { return c.ownerTeacherEmail === user.email; });
  }
// Students: get courses from their assigned maps
try {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var progressSheet = ss.getSheetByName('Progress');
var mapsSheet = ss.getSheetByName('Maps');
if (!progressSheet || !mapsSheet) {
return [];
    }
// Get all progress records for this student
var progressData = progressSheet.getDataRange().getValues();
var pHeaders = progressData[0];
var mapIds = {};
var pEmailCol = pHeaders.indexOf('email');
var pMapIdCol = pHeaders.indexOf('mapId');
if (pEmailCol < 0) pEmailCol = 0;
if (pMapIdCol < 0) pMapIdCol = 1;
for (var i = 1; i < progressData.length; i++) {
if (progressData[i][pEmailCol] === user.email) {
mapIds[progressData[i][pMapIdCol]] = true;
      }
    }
// Get courses from those maps
var mapsData = mapsSheet.getDataRange().getValues();
var mHeaders = mapsData[0];
var courseIds = {};
var mMapIdCol = mHeaders.indexOf('mapId');
var mCourseIdCol = mHeaders.indexOf('courseId');
if (mMapIdCol < 0) mMapIdCol = 0;
if (mCourseIdCol < 0) mCourseIdCol = 2;
for (var j = 1; j < mapsData.length; j++) {
var mapId = mapsData[j][mMapIdCol];
if (mapIds[mapId]) {
courseIds[mapsData[j][mCourseIdCol]] = true;
      }
    }
// Filter courses
return courses.filter(function(c) { return courseIds[c.courseId]; });
  } catch (err) {
Logger.log('Error filtering courses for student: ' + err.message);
return [];
  }
}
// ============================================================================
// TEST FUNCTIONS
// ============================================================================
/**
 * Test: Get current user with all properties
 */
function test_getCurrentUser() {
Logger.log('=== Testing getCurrentUser ===');
var user = getCurrentUser();
Logger.log('Email: ' + user.email);
Logger.log('Role: ' + user.role);
Logger.log('Name: ' + user.name);
Logger.log('normalizedRole: ' + user.normalizedRole);
Logger.log('canEdit: ' + user.canEdit);
Logger.log('isAdmin: ' + user.isAdmin);
Logger.log('=== Test complete ===');
return user;
}
/**
 * Test: Check all role functions
 */
function test_checkRoles() {
Logger.log('=== Testing role checks ===');
Logger.log('isAdministrator(): ' + isAdministrator());
Logger.log('isTeacher(): ' + isTeacher());
Logger.log('isStudent(): ' + isStudent());
Logger.log('canEdit(): ' + canEdit());
Logger.log('isAdmin(): ' + isAdmin());
Logger.log('=== Test complete ===');
}
/**
 * Test: Verify canEdit is working
 */
function test_canEditCheck() {
Logger.log('=== Testing canEdit for class creation ===');
var user = getCurrentUser();
Logger.log('User: ' + JSON.stringify(user));
Logger.log('canEdit value: ' + user.canEdit);
Logger.log('canEdit type: ' + typeof user.canEdit);
if (user.canEdit) {
Logger.log('SUCCESS: User CAN create classes');
  } else {
Logger.log('BLOCKED: User CANNOT create classes');
  }
Logger.log('=== Test complete ===');
}
/**
 * Test: Add test users for development
 */
function test_addUsers() {
Logger.log('Adding test users...');
// Make sure current user is admin first
var currentUser = getCurrentUser();
Logger.log('Current user: ' + currentUser.email + ' (role: ' + currentUser.role + ')');
// Add test users
try {
saveUser({
email: 'teacher@school.edu',
name: 'Test Teacher',
role: 'Teacher'
    });
Logger.log('Added test teacher');
saveUser({
email: 'student@school.edu',
name: 'Test Student',
role: 'Student'
    });
Logger.log('Added test student');
Logger.log('Test users added successfully!');
  } catch (e) {
Logger.log('Error adding test users: ' + e.message);
  }
}