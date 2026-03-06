/**
 * ProjectService.gs — Business logic for Projects module
 *
 * Manages waterfall-style school projects with phases and tasks.
 * Admin-only module: all functions require admin role.
 *
 * Uses: DataService, AuthService, Utils
 */

var ProjectService = (function() {

  // ── Private Helpers ──

  /**
   * Builds a staff lookup map { id → record }.
   * @returns {Object}
   */
  function staffMap_() {
    var allStaff = DataService.getRecords('staff');
    var map = {};
    allStaff.forEach(function(s) { map[s.id] = s; });
    return map;
  }

  /**
   * Returns a display name from a staff map lookup.
   */
  function staffName_(map, id) {
    var s = map[id];
    return s ? s.first_name + ' ' + s.last_name : 'Unknown';
  }

  /**
   * Computes percentage of completed tasks from an array.
   * @param {Object[]} tasks
   * @returns {number} 0–100
   */
  function computeProgress_(tasks) {
    if (!tasks || tasks.length === 0) return 0;
    var completed = 0;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].status === 'completed') completed++;
    }
    return Math.round((completed / tasks.length) * 100);
  }

  /**
   * Checks if a project is overdue: target_end_date < today AND status not completed/cancelled.
   * @param {Object} project
   * @returns {boolean}
   */
  function isOverdue_(project) {
    if (!project.target_end_date) return false;
    if (project.status === 'completed' || project.status === 'cancelled') return false;
    var target = new Date(project.target_end_date);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return target < today;
  }

  // ── Valid Enum Values ──
  var PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];
  var PHASE_STATUSES = ['not_started', 'in_progress', 'completed', 'blocked'];
  var TASK_STATUSES = ['pending', 'in_progress', 'completed', 'deferred'];

  var RISK_CATEGORIES = ['technical', 'schedule', 'resource', 'external', 'stakeholder'];
  var RISK_STATUSES = ['identified', 'mitigating', 'accepted', 'resolved', 'closed'];
  var ACTIVITY_TYPES = [
    'task_created', 'task_updated', 'task_deleted', 'task_status_changed',
    'phase_created', 'phase_updated', 'phase_deleted', 'phase_status_changed',
    'project_status_changed', 'comment_added', 'risk_created', 'risk_updated', 'risk_resolved'
  ];

  // ── Activity & Hydration Helpers ──

  /**
   * Logs a project activity entry.
   * @param {string} taskId — optional (empty for project/phase-level events)
   * @param {string} projectId
   * @param {string} actionType
   * @param {string} [fieldName]
   * @param {*} [oldValue]
   * @param {*} [newValue]
   * @param {string} [userId] — defaults to current user
   */
  function logProjectActivity_(taskId, projectId, actionType, fieldName, oldValue, newValue, userId) {
    var uid = userId;
    if (!uid) {
      try {
        var user = AuthService.getCurrentUser();
        uid = user.id;
      } catch (e) {
        uid = 'system';
      }
    }
    DataService.createRecord('project_activity', {
      task_id: taskId || '',
      project_id: projectId || '',
      user_id: uid,
      action_type: actionType,
      field_name: fieldName || '',
      old_value: oldValue != null ? String(oldValue) : '',
      new_value: newValue != null ? String(newValue) : ''
    });
  }

  /**
   * Hydrates activity entries with user names and initials.
   * @param {Object[]} entries
   * @returns {Object[]}
   */
  function hydrateProjectActivity_(entries) {
    var sMap = staffMap_();
    return entries.map(function(e) {
      var staff = sMap[e.user_id];
      return {
        id: e.id,
        taskId: e.task_id,
        projectId: e.project_id,
        userId: e.user_id,
        userName: staff ? staff.first_name + ' ' + staff.last_name : 'System',
        userInitials: staff ? (staff.first_name || '').charAt(0) + (staff.last_name || '').charAt(0) : 'SY',
        actionType: e.action_type,
        fieldName: e.field_name,
        oldValue: e.old_value,
        newValue: e.new_value,
        createdAt: e.created_at
      };
    });
  }

  // ── Public API ──

  /**
   * Admin overview: all projects with stats, hydrated owner, phase/task counts, progress.
   * @param {Object} [filters] - { status?, owner_id? }
   * @returns {{ projects: Object[], stats: Object }}
   */
  function getOverview(filters) {
    AuthService.requireAdmin();
    filters = filters || {};

    var projects = DataService.query('projects', {
      sort: { field: 'created_at', direction: 'desc' }
    }).data;

    var sMap = staffMap_();

    // Pre-fetch all phases, tasks, and risks to avoid N+1
    var allPhases = DataService.getRecords('project_phases');
    var allTasks = DataService.getRecords('project_tasks');
    var allRisks = DataService.getRecords('project_risks');

    var phasesByProject = {};
    allPhases.forEach(function(p) {
      if (!phasesByProject[p.project_id]) phasesByProject[p.project_id] = [];
      phasesByProject[p.project_id].push(p);
    });

    var tasksByProject = {};
    allTasks.forEach(function(t) {
      if (!tasksByProject[t.project_id]) tasksByProject[t.project_id] = [];
      tasksByProject[t.project_id].push(t);
    });

    var risksByProject = {};
    allRisks.forEach(function(r) {
      if (!risksByProject[r.project_id]) risksByProject[r.project_id] = [];
      risksByProject[r.project_id].push(r);
    });

    var statCounts = { total: 0, active: 0, overdue: 0, completed: 0 };

    var enriched = projects.map(function(proj) {
      // Apply filters
      if (filters.status && proj.status !== filters.status) return null;
      if (filters.owner_id && proj.owner_id !== filters.owner_id) return null;

      var phases = phasesByProject[proj.id] || [];
      var tasks = tasksByProject[proj.id] || [];
      var risks = risksByProject[proj.id] || [];
      var progress = computeProgress_(tasks);
      var overdue = isOverdue_(proj);

      statCounts.total++;
      if (proj.status === 'active') statCounts.active++;
      if (proj.status === 'completed') statCounts.completed++;
      if (overdue) statCounts.overdue++;

      // Count active high risks (score >= 15, not resolved/closed)
      var highRiskCount = 0;
      for (var ri = 0; ri < risks.length; ri++) {
        var rsk = risks[ri];
        if (rsk.status !== 'resolved' && rsk.status !== 'closed') {
          var score = (parseInt(rsk.likelihood) || 1) * (parseInt(rsk.impact) || 1);
          if (score >= 15) highRiskCount++;
        }
      }

      return {
        id: proj.id,
        title: proj.title,
        description: proj.description || '',
        ownerId: proj.owner_id,
        ownerName: staffName_(sMap, proj.owner_id),
        status: proj.status,
        startDate: proj.start_date || '',
        targetEndDate: proj.target_end_date || '',
        actualEndDate: proj.actual_end_date || '',
        phaseCount: phases.length,
        taskCount: tasks.length,
        progress: progress,
        isOverdue: overdue,
        riskCount: risks.length,
        highRiskCount: highRiskCount,
        createdAt: proj.created_at
      };
    }).filter(Boolean);

    return {
      projects: enriched,
      stats: statCounts
    };
  }

  /**
   * Full project detail: project + phases (sorted by order) + tasks (grouped by phase).
   * @param {string} projectId
   * @returns {Object}
   */
  function getProjectDetail(projectId) {
    AuthService.requireAdmin();
    if (!projectId) throw new Error('VALIDATION: projectId is required');

    var proj = DataService.getRecordById('projects', projectId);
    if (!proj) throw new Error('NOT_FOUND: Project not found');

    var sMap = staffMap_();

    // Phases sorted by phase_order
    var phases = DataService.query('project_phases', {
      filters: { project_id: projectId },
      sort: { field: 'phase_order', direction: 'asc' }
    }).data;

    // Tasks sorted by due_date
    var tasks = DataService.query('project_tasks', {
      filters: { project_id: projectId },
      sort: { field: 'due_date', direction: 'asc' }
    }).data;

    // Build phase lookup for dependency titles
    var phaseMap = {};
    phases.forEach(function(p) { phaseMap[p.id] = p; });

    // Group tasks by phase_id
    var tasksByPhase = {};
    tasks.forEach(function(t) {
      if (!tasksByPhase[t.phase_id]) tasksByPhase[t.phase_id] = [];
      tasksByPhase[t.phase_id].push(t);
    });

    // Enrich phases
    var enrichedPhases = phases.map(function(p) {
      var phaseTasks = tasksByPhase[p.id] || [];
      var depPhase = p.depends_on_phase_id ? phaseMap[p.depends_on_phase_id] : null;

      return {
        id: p.id,
        projectId: p.project_id,
        title: p.title,
        description: p.description || '',
        phaseOrder: parseInt(p.phase_order) || 0,
        startDate: p.start_date || '',
        endDate: p.end_date || '',
        status: p.status,
        dependsOnPhaseId: p.depends_on_phase_id || '',
        dependsOnPhaseTitle: depPhase ? depPhase.title : '',
        taskCount: phaseTasks.length,
        completedTaskCount: phaseTasks.filter(function(t) { return t.status === 'completed'; }).length,
        progress: computeProgress_(phaseTasks)
      };
    });

    // Enrich tasks
    var enrichedTasks = tasks.map(function(t) {
      var isTaskOverdue = false;
      if (t.due_date && t.status !== 'completed' && t.status !== 'deferred') {
        var due = new Date(t.due_date);
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        isTaskOverdue = due < today;
      }

      return {
        id: t.id,
        phaseId: t.phase_id,
        projectId: t.project_id,
        title: t.title,
        assignedTo: t.assigned_to || '',
        assigneeName: t.assigned_to ? staffName_(sMap, t.assigned_to) : '',
        dueDate: t.due_date || '',
        status: t.status,
        notes: t.notes || '',
        isOverdue: isTaskOverdue,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      };
    });

    // Group enriched tasks by phase
    var enrichedTasksByPhase = {};
    enrichedTasks.forEach(function(t) {
      if (!enrichedTasksByPhase[t.phaseId]) enrichedTasksByPhase[t.phaseId] = [];
      enrichedTasksByPhase[t.phaseId].push(t);
    });

    var allProgress = computeProgress_(tasks);

    return {
      project: {
        id: proj.id,
        title: proj.title,
        description: proj.description || '',
        ownerId: proj.owner_id,
        ownerName: staffName_(sMap, proj.owner_id),
        status: proj.status,
        startDate: proj.start_date || '',
        targetEndDate: proj.target_end_date || '',
        actualEndDate: proj.actual_end_date || '',
        progress: allProgress,
        isOverdue: isOverdue_(proj),
        createdAt: proj.created_at
      },
      phases: enrichedPhases,
      tasksByPhase: enrichedTasksByPhase,
      stats: {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(function(t) { return t.status === 'completed'; }).length,
        pendingTasks: tasks.filter(function(t) { return t.status === 'pending'; }).length,
        overdueTasks: enrichedTasks.filter(function(t) { return t.isOverdue; }).length,
        progress: allProgress
      }
    };
  }

  /**
   * Creates a new project. Admin only.
   * @param {Object} data - { title, description?, owner_id, start_date?, target_end_date? }
   * @returns {Object} Created record
   */
  function createProject(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['title', 'owner_id']);

    // Validate owner exists
    var owner = DataService.getRecordById('staff', data.owner_id);
    if (!owner) throw new Error('VALIDATION: Owner not found in staff directory');

    return DataService.createRecord('projects', {
      title: data.title,
      description: data.description || '',
      owner_id: data.owner_id,
      status: 'planning',
      start_date: data.start_date || '',
      target_end_date: data.target_end_date || '',
      actual_end_date: ''
    });
  }

  /**
   * Updates a project.
   * @param {string} projectId
   * @param {Object} updates - { title?, description?, owner_id?, status?, start_date?, target_end_date?, actual_end_date? }
   * @returns {Object} Updated record
   */
  function updateProject(projectId, updates) {
    AuthService.requireAdmin();
    if (!projectId) throw new Error('VALIDATION: projectId is required');

    var proj = DataService.getRecordById('projects', projectId);
    if (!proj) throw new Error('NOT_FOUND: Project not found');

    if (updates.status) {
      if (PROJECT_STATUSES.indexOf(updates.status) === -1) {
        throw new Error('VALIDATION: Invalid status. Must be one of: ' + PROJECT_STATUSES.join(', '));
      }
      // Auto-set actual_end_date when completing
      if (updates.status === 'completed' && !proj.actual_end_date && !updates.actual_end_date) {
        updates.actual_end_date = nowISO();
      }
    }

    return DataService.updateRecord('projects', projectId, updates);
  }

  /**
   * Deletes a project and cascades to phases and tasks.
   * @param {string} projectId
   * @returns {boolean}
   */
  function deleteProject(projectId) {
    AuthService.requireAdmin();
    if (!projectId) throw new Error('VALIDATION: projectId is required');

    var proj = DataService.getRecordById('projects', projectId);
    if (!proj) throw new Error('NOT_FOUND: Project not found');

    // Cascade: delete all tasks for this project
    var tasks = DataService.getRelated('project_tasks', 'project_id', projectId);
    tasks.forEach(function(t) {
      DataService.deleteRecord('project_tasks', t.id, { hard: true });
    });

    // Cascade: delete all phases for this project
    var phases = DataService.getRelated('project_phases', 'project_id', projectId);
    phases.forEach(function(p) {
      DataService.deleteRecord('project_phases', p.id, { hard: true });
    });

    // Cascade: delete risks, activity, and comments for this project
    var risks = DataService.getRelated('project_risks', 'project_id', projectId);
    risks.forEach(function(r) {
      DataService.deleteRecord('project_risks', r.id, { hard: true });
    });

    var activities = DataService.getRelated('project_activity', 'project_id', projectId);
    activities.forEach(function(a) {
      DataService.deleteRecord('project_activity', a.id, { hard: true });
    });

    var comments = DataService.getRelated('project_comments', 'project_id', projectId);
    comments.forEach(function(c) {
      DataService.deleteRecord('project_comments', c.id, { hard: true });
    });

    // Delete the project itself
    DataService.deleteRecord('projects', projectId, { hard: true });
    return true;
  }

  /**
   * Creates a phase within a project.
   * @param {Object} data - { project_id, title, description?, start_date?, end_date?, depends_on_phase_id? }
   * @returns {Object} Created record
   */
  function createPhase(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['project_id', 'title']);

    var proj = DataService.getRecordById('projects', data.project_id);
    if (!proj) throw new Error('NOT_FOUND: Project not found');

    // Auto-compute phase_order as max existing + 1
    var existingPhases = DataService.getRelated('project_phases', 'project_id', data.project_id);
    var maxOrder = 0;
    existingPhases.forEach(function(p) {
      var order = parseInt(p.phase_order) || 0;
      if (order > maxOrder) maxOrder = order;
    });

    return DataService.createRecord('project_phases', {
      project_id: data.project_id,
      title: data.title,
      description: data.description || '',
      phase_order: maxOrder + 1,
      start_date: data.start_date || '',
      end_date: data.end_date || '',
      status: 'not_started',
      depends_on_phase_id: data.depends_on_phase_id || ''
    });
  }

  /**
   * Updates a phase.
   * @param {string} phaseId
   * @param {Object} updates - { title?, description?, phase_order?, start_date?, end_date?, status?, depends_on_phase_id? }
   * @returns {Object} Updated record
   */
  function updatePhase(phaseId, updates) {
    AuthService.requireAdmin();
    if (!phaseId) throw new Error('VALIDATION: phaseId is required');

    var phase = DataService.getRecordById('project_phases', phaseId);
    if (!phase) throw new Error('NOT_FOUND: Phase not found');

    if (updates.status && PHASE_STATUSES.indexOf(updates.status) === -1) {
      throw new Error('VALIDATION: Invalid phase status. Must be one of: ' + PHASE_STATUSES.join(', '));
    }

    return DataService.updateRecord('project_phases', phaseId, updates);
  }

  /**
   * Deletes a phase and cascades to its tasks. Clears depends_on references.
   * @param {string} phaseId
   * @returns {boolean}
   */
  function deletePhase(phaseId) {
    AuthService.requireAdmin();
    if (!phaseId) throw new Error('VALIDATION: phaseId is required');

    var phase = DataService.getRecordById('project_phases', phaseId);
    if (!phase) throw new Error('NOT_FOUND: Phase not found');

    // Cascade: delete all tasks for this phase
    var tasks = DataService.getRelated('project_tasks', 'phase_id', phaseId);
    tasks.forEach(function(t) {
      DataService.deleteRecord('project_tasks', t.id, { hard: true });
    });

    // Clear depends_on_phase_id references in sibling phases
    var siblingPhases = DataService.getRelated('project_phases', 'project_id', phase.project_id);
    siblingPhases.forEach(function(p) {
      if (p.depends_on_phase_id === phaseId) {
        DataService.updateRecord('project_phases', p.id, { depends_on_phase_id: '' });
      }
    });

    DataService.deleteRecord('project_phases', phaseId, { hard: true });
    return true;
  }

  /**
   * Creates a task within a phase.
   * @param {Object} data - { phase_id, project_id, title, assigned_to?, due_date?, notes? }
   * @returns {Object} Created record
   */
  function createTask(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['phase_id', 'project_id', 'title']);

    var phase = DataService.getRecordById('project_phases', data.phase_id);
    if (!phase) throw new Error('NOT_FOUND: Phase not found');
    if (phase.project_id !== data.project_id) {
      throw new Error('VALIDATION: Phase does not belong to the specified project');
    }

    return DataService.createRecord('project_tasks', {
      phase_id: data.phase_id,
      project_id: data.project_id,
      title: data.title,
      assigned_to: data.assigned_to || '',
      due_date: data.due_date || '',
      status: 'pending',
      notes: data.notes || ''
    });
  }

  /**
   * Updates a task.
   * @param {string} taskId
   * @param {Object} updates - { title?, assigned_to?, due_date?, status?, notes? }
   * @returns {Object} Updated record
   */
  function updateTask(taskId, updates) {
    AuthService.requireAdmin();
    if (!taskId) throw new Error('VALIDATION: taskId is required');

    var task = DataService.getRecordById('project_tasks', taskId);
    if (!task) throw new Error('NOT_FOUND: Task not found');

    if (updates.status && TASK_STATUSES.indexOf(updates.status) === -1) {
      throw new Error('VALIDATION: Invalid task status. Must be one of: ' + TASK_STATUSES.join(', '));
    }

    return DataService.updateRecord('project_tasks', taskId, updates);
  }

  /**
   * Hard-deletes a task.
   * @param {string} taskId
   * @returns {boolean}
   */
  function deleteTask(taskId) {
    AuthService.requireAdmin();
    if (!taskId) throw new Error('VALIDATION: taskId is required');

    var task = DataService.getRecordById('project_tasks', taskId);
    if (!task) throw new Error('NOT_FOUND: Task not found');

    DataService.deleteRecord('project_tasks', taskId, { hard: true });
    return true;
  }

  /**
   * Returns timeline data for a project (phases with computed positions).
   * @param {string} projectId
   * @returns {Object}
   */
  function getTimelineData(projectId) {
    AuthService.requireAdmin();
    if (!projectId) throw new Error('VALIDATION: projectId is required');

    var proj = DataService.getRecordById('projects', projectId);
    if (!proj) throw new Error('NOT_FOUND: Project not found');

    var phases = DataService.query('project_phases', {
      filters: { project_id: projectId },
      sort: { field: 'phase_order', direction: 'asc' }
    }).data;

    // Compute overall date range from project + all phases
    var allDates = [];
    if (proj.start_date) allDates.push(new Date(proj.start_date));
    if (proj.target_end_date) allDates.push(new Date(proj.target_end_date));
    phases.forEach(function(p) {
      if (p.start_date) allDates.push(new Date(p.start_date));
      if (p.end_date) allDates.push(new Date(p.end_date));
    });

    var minDate = allDates.length > 0 ? new Date(Math.min.apply(null, allDates)) : new Date();
    var maxDate = allDates.length > 0 ? new Date(Math.max.apply(null, allDates)) : new Date();

    // Ensure at least 1 month range
    if (maxDate <= minDate) {
      maxDate = new Date(minDate);
      maxDate.setMonth(maxDate.getMonth() + 1);
    }

    return {
      project: {
        id: proj.id,
        title: proj.title,
        startDate: proj.start_date || '',
        targetEndDate: proj.target_end_date || ''
      },
      phases: phases.map(function(p) {
        return {
          id: p.id,
          title: p.title,
          startDate: p.start_date || '',
          endDate: p.end_date || '',
          status: p.status,
          phaseOrder: parseInt(p.phase_order) || 0
        };
      }),
      dateRange: {
        min: minDate.toISOString(),
        max: maxDate.toISOString()
      }
    };
  }

  // ── Risk Register ──

  /**
   * Returns all risks for a project, sorted by risk_score descending.
   * @param {string} projectId
   * @returns {Object[]}
   */
  function getProjectRisks(projectId) {
    AuthService.requireAdmin();
    if (!projectId) throw new Error('VALIDATION: projectId is required');

    var risks = DataService.query('project_risks', {
      filters: { project_id: projectId },
      sort: { field: 'risk_score', direction: 'desc' }
    }).data;

    var sMap = staffMap_();
    return risks.map(function(r) {
      return {
        id: r.id,
        projectId: r.project_id,
        title: r.title,
        description: r.description || '',
        category: r.category,
        likelihood: parseInt(r.likelihood) || 1,
        impact: parseInt(r.impact) || 1,
        riskScore: parseInt(r.risk_score) || 1,
        mitigationStrategy: r.mitigation_strategy || '',
        ownerId: r.owner_id || '',
        ownerName: r.owner_id ? staffName_(sMap, r.owner_id) : 'Unassigned',
        status: r.status,
        identifiedDate: r.identified_date || '',
        createdAt: r.created_at,
        updatedAt: r.updated_at
      };
    });
  }

  /**
   * Creates a new risk for a project.
   * @param {Object} data - { project_id, title, description?, category, likelihood, impact, mitigation_strategy?, owner_id?, status? }
   * @returns {Object}
   */
  function createRisk(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['project_id', 'title', 'category', 'likelihood', 'impact']);

    var proj = DataService.getRecordById('projects', data.project_id);
    if (!proj) throw new Error('NOT_FOUND: Project not found');

    if (RISK_CATEGORIES.indexOf(data.category) === -1) {
      throw new Error('VALIDATION: Invalid risk category. Must be one of: ' + RISK_CATEGORIES.join(', '));
    }

    var likelihood = parseInt(data.likelihood);
    var impact = parseInt(data.impact);
    if (likelihood < 1 || likelihood > 5) throw new Error('VALIDATION: Likelihood must be between 1 and 5');
    if (impact < 1 || impact > 5) throw new Error('VALIDATION: Impact must be between 1 and 5');

    var status = data.status || 'identified';
    if (RISK_STATUSES.indexOf(status) === -1) {
      throw new Error('VALIDATION: Invalid risk status. Must be one of: ' + RISK_STATUSES.join(', '));
    }

    var record = DataService.createRecord('project_risks', {
      project_id: data.project_id,
      title: data.title,
      description: data.description || '',
      category: data.category,
      likelihood: likelihood,
      impact: impact,
      risk_score: likelihood * impact,
      mitigation_strategy: data.mitigation_strategy || '',
      owner_id: data.owner_id || '',
      status: status,
      identified_date: data.identified_date || nowISO()
    });

    logProjectActivity_('', data.project_id, 'risk_created', 'risk', null, data.title);

    var sMap = staffMap_();
    return {
      id: record.id,
      projectId: record.project_id,
      title: record.title,
      description: record.description || '',
      category: record.category,
      likelihood: parseInt(record.likelihood),
      impact: parseInt(record.impact),
      riskScore: parseInt(record.risk_score),
      mitigationStrategy: record.mitigation_strategy || '',
      ownerId: record.owner_id || '',
      ownerName: record.owner_id ? staffName_(sMap, record.owner_id) : 'Unassigned',
      status: record.status,
      identifiedDate: record.identified_date || '',
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }

  /**
   * Updates an existing risk.
   * @param {string} riskId
   * @param {Object} updates
   * @returns {Object}
   */
  function updateRisk(riskId, updates) {
    AuthService.requireAdmin();
    if (!riskId) throw new Error('VALIDATION: riskId is required');

    var risk = DataService.getRecordById('project_risks', riskId);
    if (!risk) throw new Error('NOT_FOUND: Risk not found');

    if (updates.category && RISK_CATEGORIES.indexOf(updates.category) === -1) {
      throw new Error('VALIDATION: Invalid risk category. Must be one of: ' + RISK_CATEGORIES.join(', '));
    }

    if (updates.status && RISK_STATUSES.indexOf(updates.status) === -1) {
      throw new Error('VALIDATION: Invalid risk status. Must be one of: ' + RISK_STATUSES.join(', '));
    }

    // Recompute risk_score if likelihood or impact changed
    var likelihood = updates.likelihood ? parseInt(updates.likelihood) : parseInt(risk.likelihood);
    var impact = updates.impact ? parseInt(updates.impact) : parseInt(risk.impact);
    if (updates.likelihood || updates.impact) {
      if (likelihood < 1 || likelihood > 5) throw new Error('VALIDATION: Likelihood must be between 1 and 5');
      if (impact < 1 || impact > 5) throw new Error('VALIDATION: Impact must be between 1 and 5');
      updates.likelihood = likelihood;
      updates.impact = impact;
      updates.risk_score = likelihood * impact;
    }

    // Log status changes
    if (updates.status && updates.status !== risk.status) {
      logProjectActivity_('', risk.project_id, 'risk_updated', 'status', risk.status, updates.status);
      if (updates.status === 'resolved' || updates.status === 'closed') {
        logProjectActivity_('', risk.project_id, 'risk_resolved', 'risk', null, risk.title);
      }
    }

    var record = DataService.updateRecord('project_risks', riskId, updates);

    var sMap = staffMap_();
    return {
      id: record.id,
      projectId: record.project_id,
      title: record.title,
      description: record.description || '',
      category: record.category,
      likelihood: parseInt(record.likelihood),
      impact: parseInt(record.impact),
      riskScore: parseInt(record.risk_score),
      mitigationStrategy: record.mitigation_strategy || '',
      ownerId: record.owner_id || '',
      ownerName: record.owner_id ? staffName_(sMap, record.owner_id) : 'Unassigned',
      status: record.status,
      identifiedDate: record.identified_date || '',
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }

  /**
   * Hard-deletes a risk.
   * @param {string} riskId
   * @returns {boolean}
   */
  function deleteRisk(riskId) {
    AuthService.requireAdmin();
    if (!riskId) throw new Error('VALIDATION: riskId is required');

    var risk = DataService.getRecordById('project_risks', riskId);
    if (!risk) throw new Error('NOT_FOUND: Risk not found');

    logProjectActivity_('', risk.project_id, 'risk_updated', 'risk', risk.title, '(deleted)');
    DataService.deleteRecord('project_risks', riskId, { hard: true });
    return true;
  }

  /**
   * Returns a 5x5 risk heat map matrix and summary totals.
   * @param {string} projectId
   * @returns {{ matrix: number[][], totals: Object }}
   */
  function getRiskHeatMap(projectId) {
    AuthService.requireAdmin();
    if (!projectId) throw new Error('VALIDATION: projectId is required');

    var risks = DataService.query('project_risks', {
      filters: { project_id: projectId }
    }).data;

    // Initialize 5x5 matrix (likelihood rows x impact cols)
    var matrix = [];
    for (var r = 0; r < 5; r++) {
      matrix[r] = [0, 0, 0, 0, 0];
    }

    var activeRisks = 0;
    var highCount = 0;
    var mediumCount = 0;
    var lowCount = 0;

    for (var i = 0; i < risks.length; i++) {
      var risk = risks[i];
      // Skip resolved/closed for heat map
      if (risk.status === 'resolved' || risk.status === 'closed') continue;

      var lk = parseInt(risk.likelihood) || 1;
      var im = parseInt(risk.impact) || 1;
      matrix[lk - 1][im - 1]++;
      activeRisks++;

      var score = lk * im;
      if (score >= 15) highCount++;
      else if (score >= 8) mediumCount++;
      else lowCount++;
    }

    return {
      matrix: matrix,
      totals: {
        total: risks.length,
        active: activeRisks,
        high: highCount,
        medium: mediumCount,
        low: lowCount
      }
    };
  }

  // ── Activity & Comments ──

  /**
   * Public wrapper for activity logging (called from Code.gs).
   */
  function logProjectActivity(taskId, projectId, actionType, fieldName, oldValue, newValue, userId) {
    logProjectActivity_(taskId, projectId, actionType, fieldName, oldValue, newValue, userId);
  }

  /**
   * Returns activity entries for a specific task, newest first.
   * @param {string} taskId
   * @returns {Object[]}
   */
  function getTaskActivity(taskId) {
    AuthService.requireAdmin();
    if (!taskId) throw new Error('VALIDATION: taskId is required');

    var entries = DataService.query('project_activity', {
      filters: { task_id: taskId },
      sort: { field: 'created_at', direction: 'desc' }
    }).data;

    return hydrateProjectActivity_(entries);
  }

  /**
   * Returns project-wide activity feed with task title hydration.
   * @param {string} projectId
   * @param {number} [limit] — max entries (default 50)
   * @returns {Object[]}
   */
  function getProjectActivity(projectId, limit) {
    AuthService.requireAdmin();
    if (!projectId) throw new Error('VALIDATION: projectId is required');
    var maxEntries = limit || 50;

    var entries = DataService.query('project_activity', {
      filters: { project_id: projectId },
      sort: { field: 'created_at', direction: 'desc' }
    }).data;

    if (entries.length > maxEntries) {
      entries = entries.slice(0, maxEntries);
    }

    // Build task title map for hydration
    var allTasks = DataService.getRelated('project_tasks', 'project_id', projectId);
    var taskTitleMap = {};
    for (var i = 0; i < allTasks.length; i++) {
      taskTitleMap[allTasks[i].id] = allTasks[i].title;
    }

    var hydrated = hydrateProjectActivity_(entries);
    for (var j = 0; j < hydrated.length; j++) {
      hydrated[j].taskTitle = hydrated[j].taskId ? (taskTitleMap[hydrated[j].taskId] || 'Deleted Task') : '';
    }

    return hydrated;
  }

  /**
   * Creates a comment on a task.
   * @param {string} taskId
   * @param {string} projectId
   * @param {string} content
   * @returns {Object} Hydrated comment
   */
  function createProjectComment(taskId, projectId, content) {
    AuthService.requireAdmin();
    if (!taskId) throw new Error('VALIDATION: taskId is required');
    if (!projectId) throw new Error('VALIDATION: projectId is required');
    if (!content || !content.trim()) throw new Error('VALIDATION: Comment content is required');

    var user = AuthService.getCurrentUser();

    var record = DataService.createRecord('project_comments', {
      task_id: taskId,
      project_id: projectId,
      author_id: user.id,
      content: sanitizeInput(content)
    });

    logProjectActivity_(taskId, projectId, 'comment_added', 'comment', null, null);

    return {
      id: record.id,
      taskId: taskId,
      projectId: projectId,
      authorName: user.first_name + ' ' + user.last_name,
      authorInitials: (user.first_name || '').charAt(0) + (user.last_name || '').charAt(0),
      content: record.content,
      createdAt: record.created_at
    };
  }

  /**
   * Returns comments for a task, sorted ascending (oldest first).
   * @param {string} taskId
   * @returns {Object[]}
   */
  function getTaskComments(taskId) {
    AuthService.requireAdmin();
    if (!taskId) throw new Error('VALIDATION: taskId is required');

    var comments = DataService.query('project_comments', {
      filters: { task_id: taskId },
      sort: { field: 'created_at', direction: 'asc' }
    }).data;

    var sMap = staffMap_();
    return comments.map(function(c) {
      var staff = sMap[c.author_id];
      return {
        id: c.id,
        taskId: c.task_id,
        projectId: c.project_id,
        authorName: staff ? staff.first_name + ' ' + staff.last_name : 'Unknown',
        authorInitials: staff ? (staff.first_name || '').charAt(0) + (staff.last_name || '').charAt(0) : '??',
        content: c.content,
        createdAt: c.created_at
      };
    });
  }

  // ── Resource & Workload ──

  /**
   * Cross-project resource workload analysis.
   * Groups tasks by assigned_to, computes per-staff counts and capacity.
   * @returns {{ staff: Object[], summary: Object }}
   */
  function getResourceWorkload() {
    AuthService.requireAdmin();

    var allTasks = DataService.getRecords('project_tasks');
    var allProjects = DataService.getRecords('projects');
    var sMap = staffMap_();

    // Build project lookup
    var projMap = {};
    for (var pi = 0; pi < allProjects.length; pi++) {
      var p = allProjects[pi];
      projMap[p.id] = { title: p.title, status: p.status };
    }

    // Only consider tasks from active/planning projects
    var activeTasks = allTasks.filter(function(t) {
      var proj = projMap[t.project_id];
      return proj && (proj.status === 'active' || proj.status === 'planning');
    });

    // Group by assigned_to
    var staffGroups = {};
    var unassignedCount = 0;

    for (var i = 0; i < activeTasks.length; i++) {
      var task = activeTasks[i];
      if (!task.assigned_to) {
        unassignedCount++;
        continue;
      }
      if (!staffGroups[task.assigned_to]) {
        staffGroups[task.assigned_to] = {
          total: 0, pending: 0, inProgress: 0, completed: 0, deferred: 0, overdue: 0,
          projects: {}
        };
      }
      var group = staffGroups[task.assigned_to];
      group.total++;

      // Status counts
      if (task.status === 'pending') group.pending++;
      else if (task.status === 'in_progress') group.inProgress++;
      else if (task.status === 'completed') group.completed++;
      else if (task.status === 'deferred') group.deferred++;

      // Overdue check
      if (task.due_date && task.status !== 'completed' && task.status !== 'deferred') {
        var due = new Date(task.due_date);
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        if (due < today) group.overdue++;
      }

      // Per-project breakdown
      if (!group.projects[task.project_id]) {
        var projInfo = projMap[task.project_id];
        group.projects[task.project_id] = {
          projectId: task.project_id,
          projectTitle: projInfo ? projInfo.title : 'Unknown Project',
          taskCount: 0
        };
      }
      group.projects[task.project_id].taskCount++;
    }

    // Build staff array
    var staffArray = [];
    var totalTasks = 0;
    var loads = [];

    for (var staffId in staffGroups) {
      if (!staffGroups.hasOwnProperty(staffId)) continue;
      var sg = staffGroups[staffId];
      var staffRec = sMap[staffId];
      totalTasks += sg.total;
      loads.push(sg.total);

      // Capacity indicator
      var activeLoad = sg.pending + sg.inProgress;
      var capacity = 'light';
      if (activeLoad >= 8) capacity = 'heavy';
      else if (activeLoad >= 4) capacity = 'moderate';

      // Convert projects object to array
      var projectBreakdown = [];
      for (var pid in sg.projects) {
        if (sg.projects.hasOwnProperty(pid)) {
          projectBreakdown.push(sg.projects[pid]);
        }
      }

      staffArray.push({
        staffId: staffId,
        staffName: staffRec ? staffRec.first_name + ' ' + staffRec.last_name : 'Unknown',
        staffInitials: staffRec ? (staffRec.first_name || '').charAt(0) + (staffRec.last_name || '').charAt(0) : '??',
        department: staffRec ? (staffRec.department || '') : '',
        total: sg.total,
        pending: sg.pending,
        inProgress: sg.inProgress,
        completed: sg.completed,
        deferred: sg.deferred,
        overdue: sg.overdue,
        capacity: capacity,
        projects: projectBreakdown
      });
    }

    // Sort by total tasks descending
    staffArray.sort(function(a, b) { return b.total - a.total; });

    return {
      staff: staffArray,
      summary: {
        totalTasks: totalTasks + unassignedCount,
        unassigned: unassignedCount,
        staffWithTasks: staffArray.length,
        avgPerPerson: staffArray.length > 0 ? roundTo(totalTasks / staffArray.length, 1) : 0,
        maxLoad: loads.length > 0 ? Math.max.apply(null, loads) : 0,
        minLoad: loads.length > 0 ? Math.min.apply(null, loads) : 0
      }
    };
  }

  return {
    getOverview: getOverview,
    getProjectDetail: getProjectDetail,
    createProject: createProject,
    updateProject: updateProject,
    deleteProject: deleteProject,
    createPhase: createPhase,
    updatePhase: updatePhase,
    deletePhase: deletePhase,
    createTask: createTask,
    updateTask: updateTask,
    deleteTask: deleteTask,
    getTimelineData: getTimelineData,
    // Risk Register
    getProjectRisks: getProjectRisks,
    createRisk: createRisk,
    updateRisk: updateRisk,
    deleteRisk: deleteRisk,
    getRiskHeatMap: getRiskHeatMap,
    // Activity & Comments
    logProjectActivity: logProjectActivity,
    getTaskActivity: getTaskActivity,
    getProjectActivity: getProjectActivity,
    createProjectComment: createProjectComment,
    getTaskComments: getTaskComments,
    // Resource Workload
    getResourceWorkload: getResourceWorkload
  };

})();
