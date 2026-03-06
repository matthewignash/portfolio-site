/**
 * Class Roster Service
 * Handles student enrollment in classes
 *
 * @version 1.0.0
 *
 * ClassRoster Schema: classId, studentEmail, studentName, addedAt, status
 * Users Schema: email, name, role, active, displayName, createdAt, lastLogin
 */
// ============================================================================
// STUDENT LOOKUP
// ============================================================================
/**
 * Lookup user by email to auto-fill name
 *
 * @param {string} email - Student email to lookup
 * @returns {Object} { found: boolean, name: string, email: string }
 */
function lookupUserByEmail(email) {
try {
if (!email) {
return { found: false, name: '', email: '' };
    }
var normalizedEmail = String(email).toLowerCase().trim();
var ss = SpreadsheetApp.getActiveSpreadsheet();
var usersSheet = ss.getSheetByName('Users');
if (!usersSheet) {
return { found: false, name: '', email: normalizedEmail };
    }
var data = usersSheet.getDataRange().getValues();
var headers = data[0];
// Find column indices
var emailCol = headers.indexOf('email');
var nameCol = headers.indexOf('name');
var displayNameCol = headers.indexOf('displayName');
if (emailCol < 0) emailCol = 0;
if (nameCol < 0) nameCol = 1;
// Search for user
for (var i = 1; i < data.length; i++) {
var rowEmail = data[i][emailCol];
if (rowEmail && String(rowEmail).toLowerCase().trim() === normalizedEmail) {
// Found - return name (prefer displayName if available)
var name = '';
if (displayNameCol >= 0 && data[i][displayNameCol]) {
name = data[i][displayNameCol];
        } else if (data[i][nameCol]) {
name = data[i][nameCol];
        }
Logger.log('lookupUserByEmail: Found ' + normalizedEmail + ' -> ' + name);
return { found: true, name: name, email: normalizedEmail };
      }
    }
Logger.log('lookupUserByEmail: Not found ' + normalizedEmail);
return { found: false, name: '', email: normalizedEmail };
  } catch (err) {
Logger.log('Error in lookupUserByEmail: ' + err.message);
return { found: false, name: '', email: email, error: err.message };
  }
}
// ============================================================================
// CHECK FOR EXISTING ENROLLMENT
// ============================================================================
/**
 * Check if student is already enrolled in a class
 *
 * @param {string} classId - Class ID
 * @param {string} email - Student email
 * @returns {boolean} True if already enrolled
 */
function isStudentEnrolled(classId, email) {
try {
var normalizedEmail = String(email).toLowerCase().trim();
var ss = SpreadsheetApp.getActiveSpreadsheet();
var rosterSheet = ss.getSheetByName('ClassRoster');
if (!rosterSheet) {
return false;
    }
var data = rosterSheet.getDataRange().getValues();
var headers = data[0];
var classIdCol = headers.indexOf('classId');
var emailCol = headers.indexOf('studentEmail');
if (classIdCol < 0) classIdCol = 0;
if (emailCol < 0) emailCol = 1;
for (var i = 1; i < data.length; i++) {
var rowClassId = data[i][classIdCol];
var rowEmail = data[i][emailCol];
if (rowClassId === classId &&
rowEmail && String(rowEmail).toLowerCase().trim() === normalizedEmail) {
return true;
      }
    }
return false;
  } catch (err) {
Logger.log('Error in isStudentEnrolled: ' + err.message);
return false;
  }
}
// ============================================================================
// ADD SINGLE STUDENT
// ============================================================================
/**
 * Add a single student to a class
 * Creates User record if student doesn't exist
 *
 * @param {string} classId - Class ID
 * @param {string} studentEmail - Student email
 * @param {string} studentName - Student name
 * @returns {Object} { success: boolean, message: string }
 */
function addStudentToClass(classId, studentEmail, studentName) {
// Check permissions
var user = getCurrentUser();
if (!user.canEdit) {
throw new Error('Permission denied. Only teachers and administrators can add students.');
  }
// Validate inputs
if (!classId) {
throw new Error('Class ID is required');
  }
if (!studentEmail) {
throw new Error('Student email is required');
  }
if (!studentName) {
throw new Error('Student name is required');
  }
var normalizedEmail = String(studentEmail).toLowerCase().trim();
var trimmedName = String(studentName).trim();
// Validate email format
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
throw new Error('Invalid email format: ' + studentEmail);
  }
var ss = SpreadsheetApp.getActiveSpreadsheet();
var lock = LockService.getScriptLock();
try {
// Acquire lock for concurrent safety
lock.waitLock(10000);
// Validate roster sheet exists before any writes
var rosterSheet = ss.getSheetByName('ClassRoster');
if (!rosterSheet) {
throw new Error('ClassRoster sheet not found');
    }
// Check if already enrolled
if (isStudentEnrolled(classId, normalizedEmail)) {
return {
success: false,
message: 'Student ' + normalizedEmail + ' is already enrolled in this class',
alreadyEnrolled: true
      };
    }
// Check if user exists, if not create them
var usersSheet = ss.getSheetByName('Users');
if (!usersSheet) {
throw new Error('Users sheet not found');
    }
var userData = usersSheet.getDataRange().getValues();
var userHeaders = userData[0];
var userEmailCol = userHeaders.indexOf('email');
if (userEmailCol < 0) userEmailCol = 0;
var userExists = false;
for (var i = 1; i < userData.length; i++) {
var rowEmail = userData[i][userEmailCol];
if (rowEmail && String(rowEmail).toLowerCase().trim() === normalizedEmail) {
userExists = true;
break;
      }
    }
// Create user if doesn't exist
if (!userExists) {
Logger.log('Creating new user for student: ' + normalizedEmail);
var now = new Date().toISOString();
// Build user row based on headers
var userRow = [];
for (var h = 0; h < userHeaders.length; h++) {
switch(userHeaders[h]) {
case 'email': userRow.push(normalizedEmail); break;
case 'name': userRow.push(trimmedName); break;
case 'role': userRow.push('Student'); break;
case 'active': userRow.push(true); break;
case 'displayName': userRow.push(trimmedName); break;
case 'createdAt': userRow.push(now); break;
case 'lastLogin': userRow.push(''); break;
default: userRow.push(''); break;
        }
      }
usersSheet.appendRow(userRow);
Logger.log('Created new user: ' + normalizedEmail);
    }
// Add to ClassRoster (rosterSheet validated above)
var rosterData = rosterSheet.getDataRange().getValues();
var rosterHeaders = rosterData[0];
// Build roster row based on headers: classId, studentEmail, studentName, addedAt, status, studentId
var rosterRow = [];
var now = new Date().toISOString();
for (var r = 0; r < rosterHeaders.length; r++) {
switch(rosterHeaders[r]) {
case 'classId': rosterRow.push(classId); break;
case 'studentEmail': rosterRow.push(normalizedEmail); break;
case 'studentName': rosterRow.push(trimmedName); break;
case 'addedAt': rosterRow.push(now); break;
case 'status': rosterRow.push('active'); break;
case 'studentId': rosterRow.push(''); break;
default: rosterRow.push(''); break;
      }
    }
rosterSheet.appendRow(rosterRow);
Logger.log('Added student ' + normalizedEmail + ' to class ' + classId);
return {
success: true,
message: 'Student ' + trimmedName + ' (' + normalizedEmail + ') added to class',
email: normalizedEmail,
name: trimmedName,
newUser: !userExists
    };
  } catch (err) {
Logger.log('Error in addStudentToClass: ' + err.message);
throw err;
  } finally {
lock.releaseLock();
  }
}
// ============================================================================
// ADD MULTIPLE STUDENTS (BATCH)
// ============================================================================
/**
 * Add multiple students to a class
 *
 * @param {string} classId - Class ID
 * @param {Array<Object>} students - Array of { email, name } objects
 * @returns {Object} { added: number, skipped: number, errors: [], results: [] }
 */
function addStudentsToClass(classId, students) {
// Check permissions
var user = getCurrentUser();
if (!user.canEdit) {
throw new Error('Permission denied. Only teachers and administrators can add students.');
  }
if (!classId) {
throw new Error('Class ID is required');
  }
if (!students || !Array.isArray(students) || students.length === 0) {
throw new Error('At least one student is required');
  }
Logger.log('addStudentsToClass: Adding ' + students.length + ' students to class ' + classId);
var results = [];
var added = 0;
var skipped = 0;
var errors = [];
for (var i = 0; i < students.length; i++) {
var student = students[i];
try {
if (!student.email) {
errors.push({ email: 'unknown', error: 'Email is required for student #' + (i + 1) });
continue;
      }
if (!student.name) {
errors.push({ email: student.email, error: 'Name is required' });
continue;
      }
var result = addStudentToClass(classId, student.email, student.name);
if (result.success) {
added++;
results.push(result);
      } else if (result.alreadyEnrolled) {
skipped++;
results.push(result);
      } else {
errors.push({ email: student.email, error: result.message });
      }
    } catch (err) {
errors.push({ email: student.email || 'unknown', error: err.message });
    }
  }
Logger.log('addStudentsToClass complete: added=' + added + ', skipped=' + skipped + ', errors=' + errors.length);
return {
success: true,
added: added,
skipped: skipped,
errors: errors,
results: results,
message: added + ' student(s) added' + (skipped > 0 ? ', ' + skipped + ' already enrolled' : '') + (errors.length > 0 ? ', ' + errors.length + ' error(s)' : '')
  };
}
// ============================================================================
// GET CLASS ROSTER
// ============================================================================
/**
 * Get all students in a class
 *
 * @param {string} classId - Class ID
 * @returns {Array<Object>} Array of student objects
 */
function getClassRoster(classId) {
var user = getCurrentUser();
if (!user.canEdit) {
throw new Error('Permission denied. Only teachers and administrators can view class rosters.');
  }
if (!classId) {
throw new Error('Class ID is required');
  }
// Teachers can only view their own classes; admins can view any
if (!user.isAdmin) {
var classInfo = getClassById(classId);
if (classInfo && classInfo.teacherEmail &&
    classInfo.teacherEmail.toLowerCase() !== user.email.toLowerCase()) {
  throw new Error('You do not have permission to view this class roster.');
}
  }
var ss = SpreadsheetApp.getActiveSpreadsheet();
var rosterSheet = ss.getSheetByName('ClassRoster');
if (!rosterSheet) {
return [];
  }
var data = rosterSheet.getDataRange().getValues();
var headers = data[0];
// Find column indices
var classIdCol = headers.indexOf('classId');
var emailCol = headers.indexOf('studentEmail');
var nameCol = headers.indexOf('studentName');
var addedAtCol = headers.indexOf('addedAt');
var statusCol = headers.indexOf('status');
var studentIdCol = headers.indexOf('studentId');
if (classIdCol < 0) classIdCol = 0;
if (emailCol < 0) emailCol = 1;
if (nameCol < 0) nameCol = 2;
var students = [];
for (var i = 1; i < data.length; i++) {
if (String(data[i][classIdCol]) === String(classId)) {
students.push({
email: data[i][emailCol] || '',
name: data[i][nameCol] || '',
addedAt: addedAtCol >= 0 ? data[i][addedAtCol] : '',
status: statusCol >= 0 ? data[i][statusCol] : 'active',
studentId: studentIdCol >= 0 ? (data[i][studentIdCol] || '') : ''
      });
    }
  }
Logger.log('getClassRoster: Found ' + students.length + ' students in class ' + classId);
return students;
}
/**
 * Get class info by ID
 *
 * @param {string} classId - Class ID
 * @returns {Object|null} Class object or null
 */
function getClassById(classId) {
if (!classId) return null;
var ss = SpreadsheetApp.getActiveSpreadsheet();
var classesSheet = ss.getSheetByName('Classes');
if (!classesSheet) return null;
var data = classesSheet.getDataRange().getValues();
var headers = data[0];
// Find columns
var idCol = headers.indexOf('classId');
var nameCol = headers.indexOf('className');
var teacherCol = headers.indexOf('teacherEmail');
var subjectCol = headers.indexOf('subject');
var yearCol = headers.indexOf('year');
if (idCol < 0) idCol = 0;
if (nameCol < 0) nameCol = 1;
for (var i = 1; i < data.length; i++) {
if (data[i][idCol] === classId) {
return {
classId: data[i][idCol],
className: data[i][nameCol] || '',
teacherEmail: teacherCol >= 0 ? data[i][teacherCol] : '',
subject: subjectCol >= 0 ? data[i][subjectCol] : '',
year: yearCol >= 0 ? data[i][yearCol] : ''
      };
    }
  }
return null;
}
// ============================================================================
// REMOVE STUDENT FROM CLASS
// ============================================================================
/**
 * Remove a student from a class (sets status to 'removed')
 *
 * @param {string} classId - Class ID
 * @param {string} studentEmail - Student email
 * @returns {Object} { success: boolean, message: string }
 */
function removeStudentFromClass(classId, studentEmail) {
var user = getCurrentUser();
if (!user.canEdit) {
throw new Error('Permission denied. Only teachers and administrators can remove students.');
  }
if (!classId || !studentEmail) {
throw new Error('Class ID and student email are required');
  }
var normalizedEmail = String(studentEmail).toLowerCase().trim();
var ss = SpreadsheetApp.getActiveSpreadsheet();
var rosterSheet = ss.getSheetByName('ClassRoster');
if (!rosterSheet) {
throw new Error('ClassRoster sheet not found');
  }
var lock = LockService.getScriptLock();
try {
lock.waitLock(10000);
var data = rosterSheet.getDataRange().getValues();
var headers = data[0];
var classIdCol = headers.indexOf('classId');
var emailCol = headers.indexOf('studentEmail');
var statusCol = headers.indexOf('status');
if (classIdCol < 0) classIdCol = 0;
if (emailCol < 0) emailCol = 1;
if (statusCol < 0) statusCol = 4;
for (var i = 1; i < data.length; i++) {
var rowClassId = data[i][classIdCol];
var rowEmail = data[i][emailCol];
if (rowClassId === classId &&
rowEmail && String(rowEmail).toLowerCase().trim() === normalizedEmail) {
// Update status to 'removed'
rosterSheet.getRange(i + 1, statusCol + 1).setValue('removed');
Logger.log('Removed student ' + normalizedEmail + ' from class ' + classId);
return {
success: true,
message: 'Student removed from class'
        };
      }
    }
return {
success: false,
message: 'Student not found in this class'
    };
  } finally {
lock.releaseLock();
  }
}
// ============================================================================
// TEST FUNCTIONS
// ============================================================================
/**
 * Test: Lookup user by email
 */
function test_lookupUserByEmail() {
Logger.log('=== Testing lookupUserByEmail ===');
var result1 = lookupUserByEmail('imatthew@aischennai.org');
Logger.log('Lookup existing: ' + JSON.stringify(result1));
var result2 = lookupUserByEmail('nonexistent@test.com');
Logger.log('Lookup non-existing: ' + JSON.stringify(result2));
Logger.log('=== Test complete ===');
}
/**
 * Test: Add student to class
 */
function test_addStudentToClass() {
Logger.log('=== Testing addStudentToClass ===');
// First, get a class ID to test with
var ss = SpreadsheetApp.getActiveSpreadsheet();
var classesSheet = ss.getSheetByName('Classes');
if (!classesSheet || classesSheet.getLastRow() < 2) {
Logger.log('No classes found. Create a class first.');
return;
  }
var classId = classesSheet.getRange(2, 1).getValue();
Logger.log('Using class: ' + classId);
try {
var result = addStudentToClass(classId, 'teststudent@school.edu', 'Test Student');
Logger.log('Result: ' + JSON.stringify(result));
  } catch (e) {
Logger.log('Error: ' + e.message);
  }
Logger.log('=== Test complete ===');
}
/**
 * Test: Get class roster
 */
function test_getClassRoster() {
Logger.log('=== Testing getClassRoster ===');
var ss = SpreadsheetApp.getActiveSpreadsheet();
var classesSheet = ss.getSheetByName('Classes');
if (!classesSheet || classesSheet.getLastRow() < 2) {
Logger.log('No classes found.');
return;
  }
var classId = classesSheet.getRange(2, 1).getValue();
Logger.log('Getting roster for class: ' + classId);
var roster = getClassRoster(classId);
Logger.log('Roster: ' + JSON.stringify(roster));
Logger.log('=== Test complete ===');
}
