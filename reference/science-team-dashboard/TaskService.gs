/**
 * TaskService.gs
 * Backend logic for the Department Task List.
 * Manages SharedTasks and PersonalTasks tabs.
 */

const TaskService = (function() {

  const SHARED = 'SharedTasks';
  const PERSONAL = 'PersonalTasks';

  /**
   * Get all shared tasks, excluding Archived.
   * @returns {Array<Object>}
   */
  function getSharedTasks() {
    try {
      const tasks = DataService.getSheetData(SHARED);
      return tasks.filter(t => t.Status !== 'Archived');
    } catch (error) {
      logError('getSharedTasks', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get personal tasks for the current user, sorted by SortOrder.
   * @returns {Array<Object>}
   */
  function getPersonalTasks() {
    try {
      const user = getCurrentUser();
      const tasks = DataService.getSheetData(PERSONAL);
      return tasks
        .filter(t => t.Owner === user.email)
        .sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0));
    } catch (error) {
      logError('getPersonalTasks', error);
      throw new Error(error.message);
    }
  }

  /**
   * Create a shared task (admin only).
   * @param {Object} data - { title, assignee, priority, dueDate?, notes? }
   * @returns {Object} the created task
   */
  function createSharedTask(data) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can create shared tasks.');
      if (!data.title || !data.title.trim()) throw new Error('Task title is required.');

      const task = {
        TaskId: generateId('st_'),
        Title: data.title.trim(),
        Assignee: data.assignee || 'ALL',
        CreatedBy: user.email,
        CreatedDate: new Date().toISOString(),
        DueDate: data.dueDate || '',
        Priority: data.priority || 'Normal',
        Status: 'Open',
        CompletedBy: '',
        CompletedDate: '',
        Notes: data.notes || ''
      };
      DataService.appendRow(SHARED, task);
      return task;
    } catch (error) {
      logError('createSharedTask', error);
      throw new Error(error.message);
    }
  }

  /**
   * Create a personal task for the current user.
   * @param {Object} data - { title, priority, dueDate? }
   * @returns {Object} the created task
   */
  function createPersonalTask(data) {
    try {
      const user = getCurrentUser();
      if (!data.title || !data.title.trim()) throw new Error('Task title is required.');

      // Calculate next sort order
      const existing = DataService.getSheetData(PERSONAL).filter(t => t.Owner === user.email);
      let maxOrder = 0;
      existing.forEach(t => { if ((t.SortOrder || 0) > maxOrder) maxOrder = t.SortOrder; });

      const task = {
        TaskId: generateId('pt_'),
        Owner: user.email,
        Title: data.title.trim(),
        DueDate: data.dueDate || '',
        Priority: data.priority || 'Normal',
        Status: 'Open',
        CompletedDate: '',
        SortOrder: maxOrder + 1
      };
      DataService.appendRow(PERSONAL, task);
      return task;
    } catch (error) {
      logError('createPersonalTask', error);
      throw new Error(error.message);
    }
  }

  /**
   * Update a task's status (Open or Completed).
   * @param {string} taskId
   * @param {string} type - 'shared' or 'personal'
   * @param {string} status - 'Open' or 'Completed'
   * @returns {Object} { success: true }
   */
  function updateTaskStatus(taskId, type, status) {
    try {
      const user = getCurrentUser();
      const sheet = (type === 'shared') ? SHARED : PERSONAL;
      const data = DataService.getSheetData(sheet);
      const idx = data.findIndex(t => t.TaskId === taskId);
      if (idx === -1) throw new Error('Task not found.');

      const task = data[idx];
      task.Status = status;
      if (status === 'Completed') {
        if (type === 'shared') task.CompletedBy = user.email;
        task.CompletedDate = new Date().toISOString();
      } else {
        if (type === 'shared') task.CompletedBy = '';
        task.CompletedDate = '';
      }
      DataService.updateRow(sheet, idx, task);
      return { success: true };
    } catch (error) {
      logError('updateTaskStatus', error);
      throw new Error(error.message);
    }
  }

  /**
   * Edit a task's fields.
   * @param {string} taskId
   * @param {string} type - 'shared' or 'personal'
   * @param {Object} data - fields to update
   * @returns {Object} the updated task
   */
  function editTask(taskId, type, data) {
    try {
      const user = getCurrentUser();
      const sheet = (type === 'shared') ? SHARED : PERSONAL;
      const rows = DataService.getSheetData(sheet);
      const idx = rows.findIndex(t => t.TaskId === taskId);
      if (idx === -1) throw new Error('Task not found.');

      const task = rows[idx];

      // Auth check
      if (type === 'shared') {
        if (!user.isAdmin) throw new Error('Only admins can edit shared tasks.');
      } else {
        if (task.Owner !== user.email) throw new Error('You can only edit your own tasks.');
      }

      // Apply updates
      if (data.title !== undefined) task.Title = data.title.trim();
      if (data.dueDate !== undefined) task.DueDate = data.dueDate || '';
      if (data.priority !== undefined) task.Priority = data.priority;
      if (data.assignee !== undefined) task.Assignee = data.assignee;
      if (data.notes !== undefined) task.Notes = data.notes;

      DataService.updateRow(sheet, idx, task);
      return task;
    } catch (error) {
      logError('editTask', error);
      throw new Error(error.message);
    }
  }

  /**
   * Delete a task.
   * @param {string} taskId
   * @param {string} type - 'shared' or 'personal'
   * @returns {Object} { success: true }
   */
  function deleteTask(taskId, type) {
    try {
      const user = getCurrentUser();
      const sheet = (type === 'shared') ? SHARED : PERSONAL;
      const data = DataService.getSheetData(sheet);
      const idx = data.findIndex(t => t.TaskId === taskId);
      if (idx === -1) throw new Error('Task not found.');

      if (type === 'shared' && !user.isAdmin) {
        throw new Error('Only admins can delete shared tasks.');
      }
      if (type === 'personal' && data[idx].Owner !== user.email) {
        throw new Error('You can only delete your own tasks.');
      }

      DataService.deleteRow(sheet, idx);
      return { success: true };
    } catch (error) {
      logError('deleteTask', error);
      throw new Error(error.message);
    }
  }

  /**
   * Archive all completed shared tasks (admin only).
   * @returns {Object} { archived: count }
   */
  function archiveCompleted() {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can archive tasks.');

      const data = DataService.getSheetData(SHARED);
      let count = 0;
      // Update in reverse to maintain indices
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].Status === 'Completed') {
          data[i].Status = 'Archived';
          DataService.updateRow(SHARED, i, data[i]);
          count++;
        }
      }
      return { archived: count };
    } catch (error) {
      logError('archiveCompleted', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get completion summary stats for shared tasks.
   * @returns {Object} { totalOpen, totalCompleted, totalOverdue, byAssignee }
   */
  function getCompletionSummary() {
    try {
      const data = DataService.getSheetData(SHARED);
      let totalOpen = 0, totalCompleted = 0, totalOverdue = 0;
      const byAssignee = {};
      const now = new Date();

      data.forEach(t => {
        if (t.Status === 'Archived') return;

        const key = t.Assignee === 'ALL' ? 'Everyone' : t.Assignee;
        if (!byAssignee[key]) byAssignee[key] = { open: 0, completed: 0, overdue: 0 };

        if (t.Status === 'Completed') {
          totalCompleted++;
          byAssignee[key].completed++;
        } else {
          totalOpen++;
          byAssignee[key].open++;
          // Check overdue
          if (t.DueDate) {
            const due = parseDateString(t.DueDate);
            if (due && due < now) {
              totalOverdue++;
              byAssignee[key].overdue++;
            }
          }
        }
      });

      return { totalOpen, totalCompleted, totalOverdue, byAssignee };
    } catch (error) {
      logError('getCompletionSummary', error);
      throw new Error(error.message);
    }
  }

  return {
    getSharedTasks, getPersonalTasks,
    createSharedTask, createPersonalTask,
    updateTaskStatus, editTask, deleteTask,
    archiveCompleted, getCompletionSummary
  };
})();
