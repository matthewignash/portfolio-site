/**
 * TaskService.gs
 * Personal Task Lists for Learning Map System
 *
 * Two features:
 * 1. Student Custom Tasks — personal to-do items in the Student Planner
 * 2. Teacher Reminders — personal followup items in the Progress tab
 *
 * Sheet: StudentTasks
 * Schema: taskId, studentEmail, title, isCompleted, sortOrder, dueDate, createdAt, updatedAt
 *
 * Sheet: TeacherReminders
 * Schema: reminderId, teacherEmail, title, isCompleted, sortOrder, relatedMapId, relatedStudentEmail, dueDate, createdAt, updatedAt
 */

const MAX_STUDENT_TASKS_ = 50;
const MAX_TEACHER_REMINDERS_ = 100;
const MAX_TASK_TITLE_ = 200;
const MAX_REMINDER_TITLE_ = 300;

// ============================================================================
// STUDENT CUSTOM TASKS
// ============================================================================

/**
 * Get all custom tasks for the current student, sorted by sortOrder.
 * Student-only (also accessible in teacher preview mode by teachers).
 *
 * @returns {Array<Object>} tasks
 */
function getStudentTasks() {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!email) throw new Error('Not authenticated.');

  const rows = readAll_(SHEETS_.STUDENT_TASKS);
  const tasks = [];
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].studentEmail).toLowerCase() === email) {
      tasks.push({
        taskId: rows[i].taskId,
        title: rows[i].title || '',
        isCompleted: String(rows[i].isCompleted) === 'true',
        sortOrder: parseInt(rows[i].sortOrder, 10) || 0,
        dueDate: rows[i].dueDate || '',
        createdAt: rows[i].createdAt || '',
        updatedAt: rows[i].updatedAt || ''
      });
    }
  }
  tasks.sort(function(a, b) { return a.sortOrder - b.sortOrder; });
  return tasks;
}

/**
 * Create a new custom task for the current student.
 * Enforces MAX_STUDENT_TASKS_ limit.
 *
 * @param {Object} taskData - { title, dueDate? }
 * @returns {Object} created task
 */
function createStudentTask(taskData) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!email) throw new Error('Not authenticated.');

  // Validate title
  const title = String(taskData.title || '').trim();
  if (!title) throw new Error('Task title is required.');
  if (title.length > MAX_TASK_TITLE_) throw new Error('Task title must be ' + MAX_TASK_TITLE_ + ' characters or less.');

  // Validate dueDate
  const dueDate = validateDueDate_(taskData.dueDate);

  // Check limit
  const rows = readAll_(SHEETS_.STUDENT_TASKS);
  let count = 0;
  let maxOrder = 0;
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].studentEmail).toLowerCase() === email) {
      count++;
      const order = parseInt(rows[i].sortOrder, 10) || 0;
      if (order > maxOrder) maxOrder = order;
    }
  }
  if (count >= MAX_STUDENT_TASKS_) {
    throw new Error('Maximum of ' + MAX_STUDENT_TASKS_ + ' tasks allowed. Delete some tasks first.');
  }

  const now = new Date().toISOString();
  const task = {
    taskId: generateTaskId_(),
    studentEmail: email,
    title: title,
    isCompleted: 'false',
    sortOrder: maxOrder + 1,
    dueDate: dueDate,
    createdAt: now,
    updatedAt: now
  };

  appendRow_(SHEETS_.STUDENT_TASKS, task);

  return {
    taskId: task.taskId,
    title: task.title,
    isCompleted: false,
    sortOrder: task.sortOrder,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };
}

/**
 * Update an existing custom task (title, dueDate, isCompleted).
 * Student-only. Verifies task belongs to current student.
 *
 * @param {string} taskId
 * @param {Object} updates - { title?, dueDate?, isCompleted? }
 * @returns {Object} { success: true }
 */
function updateStudentTask(taskId, updates) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!email) throw new Error('Not authenticated.');
  if (!taskId) throw new Error('Task ID is required.');

  const now = new Date().toISOString();
  const fieldUpdates = { updatedAt: now };

  if (updates.title !== undefined) {
    const title = String(updates.title).trim();
    if (!title) throw new Error('Task title cannot be empty.');
    if (title.length > MAX_TASK_TITLE_) throw new Error('Task title must be ' + MAX_TASK_TITLE_ + ' characters or less.');
    fieldUpdates.title = title;
  }

  if (updates.dueDate !== undefined) {
    fieldUpdates.dueDate = validateDueDate_(updates.dueDate);
  }

  if (updates.isCompleted !== undefined) {
    fieldUpdates.isCompleted = updates.isCompleted === true ? 'true' : 'false';
  }

  // Verify ownership before updating
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const rows = readAll_(SHEETS_.STUDENT_TASKS);
    let found = false;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i].taskId) === String(taskId)) {
        if (String(rows[i].studentEmail).toLowerCase() !== email) {
          throw new Error('You can only update your own tasks.');
        }
        // Apply updates
        const keys = Object.keys(fieldUpdates);
        for (let k = 0; k < keys.length; k++) {
          rows[i][keys[k]] = fieldUpdates[keys[k]];
        }
        found = true;
        break;
      }
    }
    if (!found) throw new Error('Task not found.');
    writeAll_(SHEETS_.STUDENT_TASKS, rows);
  } finally {
    lock.releaseLock();
  }

  return { success: true };
}

/**
 * Delete a custom task.
 * Student-only. Verifies task belongs to current student.
 *
 * @param {string} taskId
 * @returns {Object} { success: true }
 */
function deleteStudentTask(taskId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!email) throw new Error('Not authenticated.');
  if (!taskId) throw new Error('Task ID is required.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const rows = readAll_(SHEETS_.STUDENT_TASKS);
    const filtered = [];
    let found = false;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i].taskId) === String(taskId)) {
        if (String(rows[i].studentEmail).toLowerCase() !== email) {
          throw new Error('You can only delete your own tasks.');
        }
        found = true;
        continue; // skip this row (delete)
      }
      filtered.push(rows[i]);
    }
    if (!found) throw new Error('Task not found.');
    writeAll_(SHEETS_.STUDENT_TASKS, filtered);
  } finally {
    lock.releaseLock();
  }

  return { success: true };
}

/**
 * Save reordered sort orders for student custom tasks.
 * Student-only.
 *
 * @param {Array} orderData - [{ taskId, sortOrder }]
 * @returns {Object} { success: true, saved: number }
 */
function saveStudentTaskOrder_Custom(orderData) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!email) throw new Error('Not authenticated.');
  if (!orderData || !orderData.length) return { success: true, saved: 0 };

  // Build lookup
  const orderMap = {};
  for (let i = 0; i < orderData.length; i++) {
    orderMap[String(orderData[i].taskId)] = parseInt(orderData[i].sortOrder, 10) || 0;
  }

  const now = new Date().toISOString();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let saved = 0;
  try {
    const rows = readAll_(SHEETS_.STUDENT_TASKS);
    for (let i = 0; i < rows.length; i++) {
      const tid = String(rows[i].taskId);
      if (orderMap[tid] !== undefined && String(rows[i].studentEmail).toLowerCase() === email) {
        rows[i].sortOrder = orderMap[tid];
        rows[i].updatedAt = now;
        saved++;
      }
    }
    writeAll_(SHEETS_.STUDENT_TASKS, rows);
  } finally {
    lock.releaseLock();
  }

  return { success: true, saved: saved };
}

// ============================================================================
// TEACHER REMINDERS
// ============================================================================

/**
 * Get all reminders for the current teacher, sorted by sortOrder.
 * Teacher/admin only.
 *
 * @returns {Array<Object>} reminders
 */
function getTeacherReminders() {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers and administrators can access reminders.');

  const rows = readAll_(SHEETS_.TEACHER_REMINDERS);
  const reminders = [];
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].teacherEmail).toLowerCase() === user.email.toLowerCase()) {
      reminders.push({
        reminderId: rows[i].reminderId,
        title: rows[i].title || '',
        isCompleted: String(rows[i].isCompleted) === 'true',
        sortOrder: parseInt(rows[i].sortOrder, 10) || 0,
        relatedMapId: rows[i].relatedMapId || '',
        relatedStudentEmail: rows[i].relatedStudentEmail || '',
        dueDate: rows[i].dueDate || '',
        createdAt: rows[i].createdAt || '',
        updatedAt: rows[i].updatedAt || ''
      });
    }
  }
  reminders.sort(function(a, b) { return a.sortOrder - b.sortOrder; });
  return reminders;
}

/**
 * Create a new reminder for the current teacher.
 * Enforces MAX_TEACHER_REMINDERS_ limit.
 *
 * @param {Object} reminderData - { title, dueDate?, relatedMapId?, relatedStudentEmail? }
 * @returns {Object} created reminder
 */
function createTeacherReminder(reminderData) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers and administrators can create reminders.');

  // Validate title
  const title = String(reminderData.title || '').trim();
  if (!title) throw new Error('Reminder title is required.');
  if (title.length > MAX_REMINDER_TITLE_) throw new Error('Reminder title must be ' + MAX_REMINDER_TITLE_ + ' characters or less.');

  // Validate dueDate
  const dueDate = validateDueDate_(reminderData.dueDate);

  // Optional links
  const relatedMapId = String(reminderData.relatedMapId || '').trim();
  const relatedStudentEmail = String(reminderData.relatedStudentEmail || '').trim().toLowerCase();

  // Check limit
  const rows = readAll_(SHEETS_.TEACHER_REMINDERS);
  let count = 0;
  let maxOrder = 0;
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].teacherEmail).toLowerCase() === user.email.toLowerCase()) {
      count++;
      const order = parseInt(rows[i].sortOrder, 10) || 0;
      if (order > maxOrder) maxOrder = order;
    }
  }
  if (count >= MAX_TEACHER_REMINDERS_) {
    throw new Error('Maximum of ' + MAX_TEACHER_REMINDERS_ + ' reminders allowed. Delete some first.');
  }

  const now = new Date().toISOString();
  const reminder = {
    reminderId: generateReminderId_(),
    teacherEmail: user.email.toLowerCase(),
    title: title,
    isCompleted: 'false',
    sortOrder: maxOrder + 1,
    relatedMapId: relatedMapId,
    relatedStudentEmail: relatedStudentEmail,
    dueDate: dueDate,
    createdAt: now,
    updatedAt: now
  };

  appendRow_(SHEETS_.TEACHER_REMINDERS, reminder);

  return {
    reminderId: reminder.reminderId,
    title: reminder.title,
    isCompleted: false,
    sortOrder: reminder.sortOrder,
    relatedMapId: reminder.relatedMapId,
    relatedStudentEmail: reminder.relatedStudentEmail,
    dueDate: reminder.dueDate,
    createdAt: reminder.createdAt,
    updatedAt: reminder.updatedAt
  };
}

/**
 * Update an existing reminder.
 * Teacher/admin only. Verifies reminder belongs to current user.
 *
 * @param {string} reminderId
 * @param {Object} updates - { title?, dueDate?, isCompleted?, relatedMapId?, relatedStudentEmail? }
 * @returns {Object} { success: true }
 */
function updateTeacherReminder(reminderId, updates) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers and administrators can update reminders.');
  if (!reminderId) throw new Error('Reminder ID is required.');

  const now = new Date().toISOString();
  const fieldUpdates = { updatedAt: now };

  if (updates.title !== undefined) {
    const title = String(updates.title).trim();
    if (!title) throw new Error('Reminder title cannot be empty.');
    if (title.length > MAX_REMINDER_TITLE_) throw new Error('Reminder title must be ' + MAX_REMINDER_TITLE_ + ' characters or less.');
    fieldUpdates.title = title;
  }

  if (updates.dueDate !== undefined) {
    fieldUpdates.dueDate = validateDueDate_(updates.dueDate);
  }

  if (updates.isCompleted !== undefined) {
    fieldUpdates.isCompleted = updates.isCompleted === true ? 'true' : 'false';
  }

  if (updates.relatedMapId !== undefined) {
    fieldUpdates.relatedMapId = String(updates.relatedMapId || '').trim();
  }

  if (updates.relatedStudentEmail !== undefined) {
    fieldUpdates.relatedStudentEmail = String(updates.relatedStudentEmail || '').trim().toLowerCase();
  }

  // Verify ownership before updating
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const rows = readAll_(SHEETS_.TEACHER_REMINDERS);
    let found = false;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i].reminderId) === String(reminderId)) {
        if (String(rows[i].teacherEmail).toLowerCase() !== user.email.toLowerCase()) {
          throw new Error('You can only update your own reminders.');
        }
        const keys = Object.keys(fieldUpdates);
        for (let k = 0; k < keys.length; k++) {
          rows[i][keys[k]] = fieldUpdates[keys[k]];
        }
        found = true;
        break;
      }
    }
    if (!found) throw new Error('Reminder not found.');
    writeAll_(SHEETS_.TEACHER_REMINDERS, rows);
  } finally {
    lock.releaseLock();
  }

  return { success: true };
}

/**
 * Delete a reminder.
 * Teacher/admin only. Verifies reminder belongs to current user.
 *
 * @param {string} reminderId
 * @returns {Object} { success: true }
 */
function deleteTeacherReminder(reminderId) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers and administrators can delete reminders.');
  if (!reminderId) throw new Error('Reminder ID is required.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const rows = readAll_(SHEETS_.TEACHER_REMINDERS);
    const filtered = [];
    let found = false;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i].reminderId) === String(reminderId)) {
        if (String(rows[i].teacherEmail).toLowerCase() !== user.email.toLowerCase()) {
          throw new Error('You can only delete your own reminders.');
        }
        found = true;
        continue; // skip (delete)
      }
      filtered.push(rows[i]);
    }
    if (!found) throw new Error('Reminder not found.');
    writeAll_(SHEETS_.TEACHER_REMINDERS, filtered);
  } finally {
    lock.releaseLock();
  }

  return { success: true };
}

/**
 * Save reordered sort orders for teacher reminders.
 * Teacher/admin only.
 *
 * @param {Array} orderData - [{ reminderId, sortOrder }]
 * @returns {Object} { success: true, saved: number }
 */
function saveTeacherReminderOrder(orderData) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers and administrators can reorder reminders.');
  if (!orderData || !orderData.length) return { success: true, saved: 0 };

  const orderMap = {};
  for (let i = 0; i < orderData.length; i++) {
    orderMap[String(orderData[i].reminderId)] = parseInt(orderData[i].sortOrder, 10) || 0;
  }

  const now = new Date().toISOString();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let saved = 0;
  try {
    const rows = readAll_(SHEETS_.TEACHER_REMINDERS);
    for (let i = 0; i < rows.length; i++) {
      const rid = String(rows[i].reminderId);
      if (orderMap[rid] !== undefined && String(rows[i].teacherEmail).toLowerCase() === user.email.toLowerCase()) {
        rows[i].sortOrder = orderMap[rid];
        rows[i].updatedAt = now;
        saved++;
      }
    }
    writeAll_(SHEETS_.TEACHER_REMINDERS, rows);
  } finally {
    lock.releaseLock();
  }

  return { success: true, saved: saved };
}

// ============================================================================
// TEACHER FEEDBACK TEMPLATES
// ============================================================================

const QFT_VALID_CATEGORIES = ['general', 'submission', 'lab', 'assessment', 'iteration'];

const QFT_DEFAULTS = [
  { text: 'Great work!', category: 'general' },
  { text: 'Needs more evidence to support your claim.', category: 'general' },
  { text: 'Please review the rubric criteria before resubmitting.', category: 'general' },
  { text: 'Strong analysis \u2014 consider expanding your conclusion.', category: 'general' },
  { text: 'Good effort \u2014 try to include more specific examples.', category: 'general' },
  { text: 'Excellent use of scientific vocabulary.', category: 'general' },
  { text: 'Please revise and resubmit.', category: 'general' }
];

/**
 * Get feedback templates for the current teacher + defaults.
 * @param {string} mapId - Optional map ID for map-scoped templates
 * @returns {Array} Templates
 */
function getTeacherFeedbackTemplates(mapId) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  const all = readAll_(SHEETS_.TEACHER_FEEDBACK_TEMPLATES);

  // Filter: teacher's own + defaults (__default__)
  // Filter: global (no mapId) + matching mapId
  const results = [];
  for (let i = 0; i < all.length; i++) {
    const t = all[i];
    const isOwn = String(t.teacherEmail).toLowerCase() === user.email.toLowerCase();
    const isDefault = String(t.teacherEmail) === '__default__';
    if (!isOwn && !isDefault) continue;

    const tMapId = String(t.mapId || '').trim();
    if (tMapId && mapId && tMapId !== String(mapId)) continue;

    results.push({
      templateId: t.templateId,
      teacherEmail: t.teacherEmail,
      templateText: t.templateText,
      category: t.category || 'general',
      mapId: t.mapId || '',
      isDefault: isDefault,
      createdAt: t.createdAt
    });
  }

  // If no defaults in sheet yet, return hardcoded defaults
  const hasDefaults = results.some(r => r.isDefault);
  if (!hasDefaults) {
    for (let d = 0; d < QFT_DEFAULTS.length; d++) {
      results.push({
        templateId: '__default_' + d,
        teacherEmail: '__default__',
        templateText: QFT_DEFAULTS[d].text,
        category: QFT_DEFAULTS[d].category,
        mapId: '',
        isDefault: true,
        createdAt: ''
      });
    }
  }

  return results;
}

/**
 * Save (create or update) a teacher feedback template.
 * @param {string} templateId - ID (null for new)
 * @param {string} text - Template text
 * @param {string} category - Category
 * @param {string} mapId - Optional map scope
 * @returns {Object} success
 */
function saveTeacherFeedbackTemplate(templateId, text, category, mapId) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  text = String(text || '').trim();
  if (!text) throw new Error('Template text is required');
  if (text.length > 200) throw new Error('Template text must be 200 characters or less');
  category = String(category || 'general').trim();
  if (QFT_VALID_CATEGORIES.indexOf(category) === -1) category = 'general';
  mapId = String(mapId || '').trim();
  const now = new Date().toISOString();

  if (templateId && !String(templateId).startsWith('__default_')) {
    // Update existing — verify ownership first
    const all = readAll_(SHEETS_.TEACHER_FEEDBACK_TEMPLATES);
    const found = all.find(t => String(t.templateId) === String(templateId));
    if (!found) throw new Error('Template not found');
    if (String(found.teacherEmail).toLowerCase() !== user.email.toLowerCase() && user.normalizedRole !== 'administrator') {
      throw new Error('You can only edit your own templates');
    }
    updateRowByCompoundMatch_(SHEETS_.TEACHER_FEEDBACK_TEMPLATES,
      { templateId: String(templateId) },
      { templateText: text, category: category, mapId: mapId }
    );
  } else {
    // Create new
    appendRow_(SHEETS_.TEACHER_FEEDBACK_TEMPLATES, {
      templateId: generateFeedbackTemplateId_(),
      teacherEmail: user.email,
      templateText: text,
      category: category,
      mapId: mapId,
      createdAt: now
    });
  }
  return { success: true };
}

/**
 * Delete a teacher feedback template.
 * @param {string} templateId
 * @returns {Object} success
 */
function deleteTeacherFeedbackTemplate(templateId) {
  requireRole(['administrator', 'teacher']);
  if (!templateId || String(templateId).startsWith('__default_')) {
    throw new Error('Cannot delete default templates');
  }
  const user = getCurrentUser();
  // Verify ownership
  const all = readAll_(SHEETS_.TEACHER_FEEDBACK_TEMPLATES);
  const found = all.find(t => String(t.templateId) === String(templateId));
  if (!found) throw new Error('Template not found');
  if (String(found.teacherEmail).toLowerCase() !== user.email.toLowerCase() && user.normalizedRole !== 'administrator') {
    throw new Error('You can only delete your own templates');
  }
  deleteRows_(SHEETS_.TEACHER_FEEDBACK_TEMPLATES, 'templateId', String(templateId));
  return { success: true };
}

// ============================================================================
// SHARED HELPERS
// ============================================================================

/**
 * Validate a due date string. Returns empty string or YYYY-MM-DD.
 * @param {*} value
 * @returns {string}
 */
function validateDueDate_(value) {
  if (!value) return '';
  const str = String(value).trim();
  if (!str) return '';
  // Basic YYYY-MM-DD validation
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw new Error('Due date must be in YYYY-MM-DD format.');
  }
  // Check it parses to a valid date
  const d = new Date(str + 'T00:00:00');
  if (isNaN(d.getTime())) {
    throw new Error('Invalid due date.');
  }
  return str;
}
