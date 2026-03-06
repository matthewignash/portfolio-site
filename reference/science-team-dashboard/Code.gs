/**
 * Code.gs
 * Main entry point for the Science Department Dashboard.
 * Contains doGet() router, getCurrentUser(), initialSetup(),
 * and proxy functions that map flat names to IIFE service methods.
 */

// ==================== Web App Entry Point ====================

/**
 * Serve the appropriate HTML page based on ?page= parameter.
 * Default is the Index hub page.
 * @param {Object} e - Event object
 * @returns {HtmlOutput}
 */
function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'index';

  const pageMap = {
    'index':         'Index',
    'announcements': 'Announcements',
    'tasks':         'Tasks',
    'kanban':        'Kanban',
    'meetings':      'Meetings',
    'newsletter':    'Newsletter',
    'waterfall':     'Waterfall',
    'curriculum':    'Curriculum'
  };

  const fileName = pageMap[page] || 'Index';

  return HtmlService.createHtmlOutputFromFile(fileName)
    .setTitle('Science Dept Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ==================== Shared: getCurrentUser ====================

/**
 * Get the current user's email, display name, and admin status.
 * Called by ALL dashboard apps via google.script.run.getCurrentUser()
 * @returns {Object} { email, name, isAdmin }
 */
function getCurrentUser() {
  const email = Session.getActiveUser().getEmail();

  // Look up staff record for display name and role
  const staffMember = StaffService.getStaffMember(email);

  let name;
  let isAdmin;

  if (staffMember) {
    name = staffMember.DisplayName;
    isAdmin = (staffMember.Role === 'Admin' || staffMember.Role === 'Head of Department');
  } else {
    // Fallback: derive from email prefix (backward compatible for users not yet in Staff)
    name = email.split('@')[0];
    name = name.charAt(0).toUpperCase() + name.slice(1);
    isAdmin = false;
  }

  // Also check legacy AdminEmails config (union of both sources)
  const config = DataService.getAllConfig();
  const adminList = (config.AdminEmails || '').split(',').map(e => e.trim().toLowerCase());
  if (adminList.indexOf(email.toLowerCase()) !== -1) {
    isAdmin = true;
  }

  return { email: email, name: name, isAdmin: isAdmin };
}

// ==================== Script URL (for iframe routing) ====================

/**
 * Returns the deployed web app URL so Index.html can build correct iframe URLs.
 * window.location.href returns googleusercontent.com in Apps Script, but
 * doGet() routing only works on the script.google.com deployment URL.
 * @returns {string}
 */
function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

// ==================== Initial Setup ====================

/**
 * Run this ONCE from the Apps Script editor to create the spreadsheet
 * and initialize all 16 tabs with headers and default data.
 * @returns {Object} { success, spreadsheetId, spreadsheetUrl }
 */
function initialSetup() {
  try {
    Logger.log('=== Starting Dashboard Initial Setup ===');

    const ss = DataService.getSpreadsheet();
    Logger.log('Spreadsheet: ' + ss.getName());
    Logger.log('URL: ' + ss.getUrl());
    Logger.log('ID: ' + ss.getId());

    // Initialize all 16 tabs by accessing them (auto-creates with headers)
    const allSheets = Object.values(DataService.SHEETS);
    allSheets.forEach(name => {
      DataService.getSheet(name);
      Logger.log('Initialized tab: ' + name);
    });

    // Set default config values if not already set
    const config = DataService.getAllConfig();
    if (!config.AdminEmails) {
      const userEmail = Session.getActiveUser().getEmail();
      DataService.setConfigValue('AdminEmails', userEmail);
      Logger.log('Set AdminEmails to: ' + userEmail);
    }
    if (!config.MaxPostLength) {
      DataService.setConfigValue('MaxPostLength', '500');
    }
    if (!config.Categories) {
      DataService.setConfigValue('Categories', 'General,Deadline,Event,FYI,Urgent');
    }

    // Seed default Kanban columns if empty
    const columns = DataService.getSheetData(DataService.SHEETS.KANBAN_COLUMNS);
    if (columns.length === 0) {
      const defaults = [
        { ColumnId: generateId('col_'), Title: 'Backlog',     SortOrder: 1, WipLimit: 0, Color: '#6c757d' },
        { ColumnId: generateId('col_'), Title: 'To Do',       SortOrder: 2, WipLimit: 0, Color: '#0d6efd' },
        { ColumnId: generateId('col_'), Title: 'In Progress', SortOrder: 3, WipLimit: 5, Color: '#fd7e14' },
        { ColumnId: generateId('col_'), Title: 'Review',      SortOrder: 4, WipLimit: 3, Color: '#6f42c1' },
        { ColumnId: generateId('col_'), Title: 'Done',        SortOrder: 5, WipLimit: 0, Color: '#198754' }
      ];
      defaults.forEach(col => DataService.appendRow(DataService.SHEETS.KANBAN_COLUMNS, col));
      Logger.log('Seeded 5 default Kanban columns');
    }

    // Seed default meeting templates if empty
    const templates = DataService.getSheetData(DataService.SHEETS.MEETING_TEMPLATES);
    if (templates.length === 0) {
      const defaultTemplates = [
        {
          TemplateId: generateId('tpl_'), Name: 'Weekly Department Meeting',
          DefaultTitle: 'Science Dept Meeting — {DATE}',
          DefaultAgendaItems: JSON.stringify(['Welcome & Announcements', 'Curriculum Updates', 'Assessment Review', 'Action Items & Wrap-up']),
          DefaultDuration: '60', DefaultAttendees: 'ALL', IsActive: true
        },
        {
          TemplateId: generateId('tpl_'), Name: 'IB Moderation Meeting',
          DefaultTitle: 'IB Moderation — {DATE}',
          DefaultAgendaItems: JSON.stringify(['Standards Review', 'Sample Marking', 'Moderation Discussion', 'Agreement & Next Steps']),
          DefaultDuration: '90', DefaultAttendees: 'ALL', IsActive: true
        },
        {
          TemplateId: generateId('tpl_'), Name: 'Lab Safety Review',
          DefaultTitle: 'Lab Safety Review — {DATE}',
          DefaultAgendaItems: JSON.stringify(['Incident Reports', 'Equipment Check', 'Protocol Updates', 'Training Needs']),
          DefaultDuration: '45', DefaultAttendees: 'ALL', IsActive: true
        },
        {
          TemplateId: generateId('tpl_'), Name: 'Ad Hoc Meeting',
          DefaultTitle: 'Science Dept — {DATE}',
          DefaultAgendaItems: JSON.stringify(['Discussion']),
          DefaultDuration: '30', DefaultAttendees: 'ALL', IsActive: true
        }
      ];
      defaultTemplates.forEach(tpl => DataService.appendRow(DataService.SHEETS.MEETING_TEMPLATES, tpl));
      Logger.log('Seeded 4 default meeting templates');
    }

    // Seed the deploying user as initial staff member
    const staffData = DataService.getSheetData(DataService.SHEETS.STAFF);
    if (staffData.length === 0) {
      const userEmail = Session.getActiveUser().getEmail();
      let userName = userEmail.split('@')[0];
      userName = userName.charAt(0).toUpperCase() + userName.slice(1);
      DataService.appendRow(DataService.SHEETS.STAFF, {
        StaffId: generateId('staff_'),
        Email: userEmail,
        DisplayName: userName,
        Role: 'Admin',
        IsActive: true,
        CreatedDate: new Date().toISOString()
      });
      Logger.log('Seeded initial staff member: ' + userEmail);
    }

    // Seed default curriculum courses if empty
    const currCourses = DataService.getSheetData(DataService.SHEETS.CURRICULUM_COURSES);
    if (currCourses.length === 0) {
      const defaultCourses = [
        { CourseId: generateId('course_'), Name: 'Kindergarten Science', GradeLevel: 'K', School: 'ES', SortOrder: 1, Color: '#e91e63', Description: 'Foundational science concepts for kindergarten', IsActive: true, CreatedBy: Session.getActiveUser().getEmail(), CreatedDate: new Date().toISOString() },
        { CourseId: generateId('course_'), Name: 'Grade 1 Science', GradeLevel: '1', School: 'ES', SortOrder: 2, Color: '#9c27b0', Description: 'Grade 1 science curriculum', IsActive: true, CreatedBy: Session.getActiveUser().getEmail(), CreatedDate: new Date().toISOString() },
        { CourseId: generateId('course_'), Name: 'MS Life Science', GradeLevel: '6-8', School: 'MS', SortOrder: 3, Color: '#4caf50', Description: 'Middle school life science', IsActive: true, CreatedBy: Session.getActiveUser().getEmail(), CreatedDate: new Date().toISOString() },
        { CourseId: generateId('course_'), Name: 'HS Biology', GradeLevel: '9-10', School: 'HS', SortOrder: 4, Color: '#2196f3', Description: 'High school biology', IsActive: true, CreatedBy: Session.getActiveUser().getEmail(), CreatedDate: new Date().toISOString() },
        { CourseId: generateId('course_'), Name: 'IB Chemistry HL', GradeLevel: '11-12', School: 'HS', SortOrder: 5, Color: '#ff9800', Description: 'IB Chemistry Higher Level', IsActive: true, CreatedBy: Session.getActiveUser().getEmail(), CreatedDate: new Date().toISOString() }
      ];
      defaultCourses.forEach(c => DataService.appendRow(DataService.SHEETS.CURRICULUM_COURSES, c));
      Logger.log('Seeded 5 default curriculum courses');
    }

    // Migrate Posts sheet: add EventDate, EventTime columns if missing
    const postsSheet = DataService.getSheet(DataService.SHEETS.POSTS);
    const postsHeaders = postsSheet.getRange(1, 1, 1, postsSheet.getLastColumn()).getValues()[0];
    if (postsHeaders.indexOf('EventDate') === -1) {
      const nextCol = postsHeaders.length + 1;
      postsSheet.getRange(1, nextCol).setValue('EventDate');
      postsSheet.getRange(1, nextCol + 1).setValue('EventTime');
      Logger.log('Migrated Posts sheet: added EventDate, EventTime columns');
    }

    Logger.log('=== Setup Complete ===');
    Logger.log('Spreadsheet ID: ' + ss.getId());

    return {
      success: true,
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl()
    };

  } catch (error) {
    logError('initialSetup', error);
    return { success: false, error: error.message };
  }
}

// ==================== PROXY FUNCTIONS ====================
// These flat functions are what the HTML calls via google.script.run.
// They delegate to the namespaced IIFE service methods.

// --- Announcements ---
function getPosts()                                       { return AnnouncementService.getPosts(); }
function createPost(message, category, eventDate, eventTime) { return AnnouncementService.createPost(message, category, eventDate, eventTime); }
function editPost(postId, message)                        { return AnnouncementService.editPost(postId, message); }
function deletePost(postId)                               { return AnnouncementService.deletePost(postId); }
function togglePin(postId)                                { return AnnouncementService.togglePin(postId); }
function getAnnouncementsByDateRange(startDate, endDate)  { return AnnouncementService.getAnnouncementsByDateRange(startDate, endDate); }

// --- Tasks ---
function getSharedTasks()                            { return TaskService.getSharedTasks(); }
function getPersonalTasks()                          { return TaskService.getPersonalTasks(); }
function createSharedTask(data)                      { return TaskService.createSharedTask(data); }
function createPersonalTask(data)                    { return TaskService.createPersonalTask(data); }
function updateTaskStatus(taskId, type, status)      { return TaskService.updateTaskStatus(taskId, type, status); }
function editTask(taskId, type, data)                { return TaskService.editTask(taskId, type, data); }
function deleteTask(taskId, type)                    { return TaskService.deleteTask(taskId, type); }
function archiveCompleted()                          { return TaskService.archiveCompleted(); }
function getCompletionSummary()                      { return TaskService.getCompletionSummary(); }

// --- Kanban ---
function getBoard()                                  { return KanbanService.getBoard(); }
function createCard(data)                            { return KanbanService.createCard(data); }
function updateCard(cardId, data)                    { return KanbanService.updateCard(cardId, data); }
function moveCard(cardId, toColumnId, newIndex)      { return KanbanService.moveCard(cardId, toColumnId, newIndex); }
function archiveCard(cardId)                         { return KanbanService.archiveCard(cardId); }
function bulkArchiveDone()                           { return KanbanService.bulkArchiveDone(); }
function createCardFromActionItem(data)              { return KanbanService.createCardFromActionItem(data); }

// --- Kanban Columns ---
function createColumn(data)                          { return KanbanColumnService.createColumn(data); }
function updateColumn(columnId, data)                { return KanbanColumnService.updateColumn(columnId, data); }
function deleteColumn(columnId)                      { return KanbanColumnService.deleteColumn(columnId); }

// --- Kanban Card History ---
function getCardHistory(cardId)                      { return KanbanService.getCardHistory(cardId); }

// --- Meetings ---
function getMeetings()                                                        { return MeetingService.getMeetings(); }
function getTemplates()                                                       { return MeetingService.getTemplates(); }
function getMeetingDetail(meetingId)                                           { return MeetingService.getMeetingDetail(meetingId); }
function createMeetingFromTemplate(templateId, date, startTime, endTime, location) { return MeetingService.createMeetingFromTemplate(templateId, date, startTime, endTime, location); }
function deleteMeeting(meetingId)                                             { return MeetingService.deleteMeeting(meetingId); }
function finalizeMeeting(meetingId)                                           { return MeetingService.finalizeMeeting(meetingId); }
function startMeeting(meetingId)                                              { return MeetingService.startMeeting(meetingId); }

// --- Attendees ---
function addAttendee(meetingId, email, role)                  { return AttendeeService.addAttendee(meetingId, email, role); }
function removeAttendee(meetingId, attendeeId)                { return AttendeeService.removeAttendee(meetingId, attendeeId); }
function updateAttendance(meetingId, attendeeId, attended)    { return AttendeeService.updateAttendance(meetingId, attendeeId, attended); }

// --- Agenda ---
function addAgendaItem(meetingId, data)              { return AgendaService.addAgendaItem(meetingId, data); }
function updateAgendaItem(agendaId, data)            { return AgendaService.updateAgendaItem(agendaId, data); }
function deleteAgendaItem(agendaId)                  { return AgendaService.deleteAgendaItem(agendaId); }

// --- Decisions ---
function addDecision(meetingId, data)                { return DecisionService.addDecision(meetingId, data); }
function deleteDecision(decisionId)                  { return DecisionService.deleteDecision(decisionId); }

// --- Action Items ---
function addActionItem(meetingId, data)              { return ActionItemService.addActionItem(meetingId, data); }
function updateActionItem(actionId, data)            { return ActionItemService.updateActionItem(actionId, data); }
function deleteActionItem(actionId)                  { return ActionItemService.deleteActionItem(actionId); }
function sendToKanban(actionId)                      { return ActionItemService.sendToKanban(actionId); }
function getOpenActionItems()                        { return ActionItemService.getOpenActionItems(); }

// --- Newsletter ---
function getNewsletters()                            { return NewsletterService.getNewsletters(); }
function getNewsletterDetail(newsletterId)           { return NewsletterService.getNewsletterDetail(newsletterId); }
function createNewsletter(title, weekOf)             { return NewsletterService.createNewsletter(title, weekOf); }
function deleteNewsletter(newsletterId)              { return NewsletterService.deleteNewsletter(newsletterId); }
function sendNewsletter(newsletterId)                { return NewsletterService.sendNewsletter(newsletterId); }

// --- Sections ---
function addSection(newsletterId, title, icon, sortOrder) { return SectionService.addSection(newsletterId, title, icon, sortOrder); }
function deleteSection(sectionId)                         { return SectionService.deleteSection(sectionId); }

// --- Items ---
function submitItem(newsletterId, sectionId, content)     { return ItemService.submitItem(newsletterId, sectionId, content); }
function deleteSubmission(itemId)                         { return ItemService.deleteSubmission(itemId); }
function reviewItem(itemId, status)                       { return ItemService.reviewItem(itemId, status); }
function addItemDirect(newsletterId, sectionId, content)  { return ItemService.addItemDirect(newsletterId, sectionId, content); }
function deleteItem(itemId)                               { return ItemService.deleteItem(itemId); }

// --- Waterfall ---
function getTodaySchedule(school)                    { return WaterfallService.getTodaySchedule(school); }
function getWeekSchedule(weekOfDate, school)         { return WaterfallService.getWeekSchedule(weekOfDate, school); }
function getTeacherSchedules(date, school)           { return WaterfallService.getTeacherSchedules(date, school); }
function getMonthSchedule(year, month, school)       { return WaterfallService.getMonthSchedule(year, month, school); }

// --- Curriculum ---
function getCurriculumBoard()                                        { return CurriculumService.getCurriculumBoard(); }
function getCurriculumCourses()                                      { return CurriculumService.getCourses(); }
function createCurriculumCourse(data)                                { return CurriculumService.createCourse(data); }
function updateCurriculumCourse(courseId, data)                      { return CurriculumService.updateCourse(courseId, data); }
function deleteCurriculumCourse(courseId)                             { return CurriculumService.deleteCourse(courseId); }
function reorderCurriculumCourses(orderedIds)                        { return CurriculumService.reorderCourses(orderedIds); }
function createCurriculumUnit(data)                                  { return CurriculumService.createUnit(data); }
function updateCurriculumUnit(unitId, data)                          { return CurriculumService.updateUnit(unitId, data); }
function deleteCurriculumUnit(unitId)                                { return CurriculumService.deleteUnit(unitId); }
function reorderCurriculumUnits(courseId, orderedUnitIds)             { return CurriculumService.reorderUnits(courseId, orderedUnitIds); }
function moveCurriculumUnit(unitId, newCourseId, newSortOrder)       { return CurriculumService.moveUnitToCourse(unitId, newCourseId, newSortOrder); }
function proposeCurriculumUnit(unitId)                               { return CurriculumService.proposeUnit(unitId); }
function approveCurriculumUnit(unitId)                               { return CurriculumService.approveUnit(unitId); }
function rejectCurriculumUnit(unitId)                                { return CurriculumService.rejectUnit(unitId); }
function archiveCurriculumUnit(unitId)                               { return CurriculumService.archiveUnit(unitId); }
function proposeEditToCurriculumUnit(unitId)                         { return CurriculumService.proposeEditToUnit(unitId); }

// --- Staff ---
function getStaff()                               { return StaffService.getStaff(); }
function getAllStaff()                             { return StaffService.getAllStaff(); }
function addStaff(data)                           { return StaffService.addStaff(data); }
function updateStaff(staffId, data)               { return StaffService.updateStaff(staffId, data); }
function deactivateStaff(staffId)                 { return StaffService.deactivateStaff(staffId); }
function reactivateStaff(staffId)                 { return StaffService.reactivateStaff(staffId); }

// --- Dashboard Summary ---
function getDashboardSummary() {
  var summary = {};
  try { summary.tasks = TaskService.getCompletionSummary(); } catch(e) { summary.tasks = null; }
  try { summary.posts = AnnouncementService.getPosts(); } catch(e) { summary.posts = null; }
  try { summary.board = KanbanService.getBoard(); } catch(e) { summary.board = null; }
  try { summary.meetings = MeetingService.getMeetings(); } catch(e) { summary.meetings = null; }
  try { summary.newsletters = NewsletterService.getNewsletters(); } catch(e) { summary.newsletters = null; }
  try { summary.curriculum = CurriculumService.getCurriculumBoard(); } catch(e) { summary.curriculum = null; }
  try { summary.staff = StaffService.getStaff(); } catch(e) { summary.staff = null; }
  return summary;
}
