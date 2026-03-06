/**
 * GrowthPlanService.gs — Standards-Based Professional Growth Plan (PGP) Service
 *
 * Manages professional growth plans using AISC's 9-standard framework:
 *   - Admin-configurable standards library (pgp_standards)
 *   - Per-standard selections with 5 PGP fields (pgp_standard_selections)
 *   - 4-year rotation cycle tracking (pgp_cycle_history)
 *   - Meeting logs (growth_meetings — unchanged)
 *   - Faculty / supervisor digital signatures
 *
 * RBAC: admins see all, teachers see only their own plan.
 * Uses: DataService, AuthService, Utils
 */

var GrowthPlanService = (function() {

  // ── Private Helpers ──

  /**
   * Reads the check-in frequency from config.
   * @returns {number} weeks between expected check-ins
   */
  function getCheckinWeeks_() {
    var configs = DataService.getRecords('_config');
    for (var i = 0; i < configs.length; i++) {
      if (configs[i].key === 'growth_plan_checkin_weeks') {
        return parseInt(configs[i].value) || 6;
      }
    }
    return 6;
  }

  /**
   * Verifies the current user may access a plan.
   * Admin: always allowed. Others: only their own plan.
   */
  function requirePlanAccess_(plan) {
    var user = AuthService.getCurrentUser();
    if (user.role === 'admin') return;
    if (user.id === plan.staff_id) return;
    throw new Error('AUTH_DENIED: You may only access your own growth plan.');
  }

  /**
   * Builds a staff lookup map { id → record }.
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

  // Valid enum values
  var PLAN_STATUSES = ['draft', 'active', 'mid_year_review', 'final_review', 'completed'];
  var SELECTION_STATUSES = ['not_started', 'in_progress', 'completed'];
  var MEETING_TYPES = ['initial', 'check_in', 'mid_year', 'final', 'informal'];

  // ════════════════════════════════════════════
  // Standards CRUD (admin only)
  // ════════════════════════════════════════════

  /**
   * Returns all active PGP standards, sorted by sort_order.
   * Any authenticated user can read standards.
   * @returns {Object[]}
   */
  function getStandards() {
    AuthService.requireAuth();
    var all = DataService.getRecords('pgp_standards');
    return all
      .filter(function(s) { return String(s.is_active) !== 'false'; })
      .sort(function(a, b) { return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0); })
      .map(function(s) {
        return {
          id: s.id,
          standardNumber: Number(s.standard_number),
          shortName: s.short_name,
          hashtag: s.hashtag || '',
          description: s.description || '',
          isMandatory: String(s.is_mandatory) === 'true',
          isActive: String(s.is_active) !== 'false',
          sortOrder: Number(s.sort_order) || 0
        };
      });
  }

  /**
   * Creates a new standard. Admin only.
   * @param {Object} data - { standard_number, short_name, hashtag?, description?, is_mandatory? }
   * @returns {Object}
   */
  function createStandard(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['standard_number', 'short_name']);

    var now = new Date().toISOString();
    return DataService.createRecord('pgp_standards', {
      standard_number: data.standard_number,
      short_name: data.short_name,
      hashtag: data.hashtag || '',
      description: data.description || '',
      is_mandatory: data.is_mandatory || false,
      is_active: true,
      sort_order: data.sort_order || data.standard_number,
      created_at: now,
      updated_at: now
    });
  }

  /**
   * Updates a standard. Admin only.
   * @param {string} standardId
   * @param {Object} updates
   * @returns {Object}
   */
  function updateStandard(standardId, updates) {
    AuthService.requireAdmin();
    if (!standardId) throw new Error('VALIDATION: standardId is required');

    var existing = DataService.getRecordById('pgp_standards', standardId);
    if (!existing) throw new Error('NOT_FOUND: Standard not found');

    updates.updated_at = new Date().toISOString();
    return DataService.updateRecord('pgp_standards', standardId, updates);
  }

  /**
   * Soft-deletes a standard (sets is_active = false). Admin only.
   * @param {string} standardId
   * @returns {boolean}
   */
  function deleteStandard(standardId) {
    AuthService.requireAdmin();
    if (!standardId) throw new Error('VALIDATION: standardId is required');

    var existing = DataService.getRecordById('pgp_standards', standardId);
    if (!existing) throw new Error('NOT_FOUND: Standard not found');

    DataService.updateRecord('pgp_standards', standardId, {
      is_active: false,
      updated_at: new Date().toISOString()
    });
    return true;
  }

  /**
   * Reorders standards. Admin only.
   * @param {Object[]} orderList - [{ id, sort_order }]
   * @returns {boolean}
   */
  function reorderStandards(orderList) {
    AuthService.requireAdmin();
    if (!orderList || !orderList.length) throw new Error('VALIDATION: orderList is required');

    for (var i = 0; i < orderList.length; i++) {
      DataService.updateRecord('pgp_standards', orderList[i].id, {
        sort_order: orderList[i].sort_order,
        updated_at: new Date().toISOString()
      });
    }
    return true;
  }

  // ════════════════════════════════════════════
  // Plans — Overview, Detail, CRUD
  // ════════════════════════════════════════════

  /**
   * Admin overview: all plans with stats, hydrated names, standard counts, overdue flags.
   * Compatible with ReportingService: returns { plans, stats } with same shape.
   * @param {Object} [filters] - { department?, status?, supervisor_id?, division? }
   * @returns {{ plans: Object[], stats: Object }}
   */
  function getOverview(filters) {
    AuthService.requireAdmin();
    filters = filters || {};

    var plans = DataService.query('growth_plans', {
      filters: filters.status ? { status: filters.status } : {},
      sort: { field: 'created_at', direction: 'desc' }
    }).data;

    var sMap = staffMap_();
    var checkinDays = getCheckinWeeks_() * 7;

    // Pre-fetch selections and meetings to avoid N+1
    var allSelections = DataService.getRecords('pgp_standard_selections');
    var allMeetings = DataService.getRecords('growth_meetings');

    var selectionsByPlan = {};
    allSelections.forEach(function(s) {
      if (!selectionsByPlan[s.plan_id]) selectionsByPlan[s.plan_id] = [];
      selectionsByPlan[s.plan_id].push(s);
    });

    var meetingsByPlan = {};
    allMeetings.forEach(function(m) {
      if (!meetingsByPlan[m.plan_id]) meetingsByPlan[m.plan_id] = [];
      meetingsByPlan[m.plan_id].push(m);
    });

    var now = new Date();
    var statCounts = { total: 0, draft: 0, active: 0, mid_year_review: 0, final_review: 0, completed: 0, overdueCheckins: 0 };

    var enriched = plans.map(function(plan) {
      var staff = sMap[plan.staff_id] || {};
      var supervisor = sMap[plan.supervisor_id] || {};

      // Apply filters
      if (filters.department && staff.department !== filters.department) return null;
      if (filters.supervisor_id && plan.supervisor_id !== filters.supervisor_id) return null;
      if (filters.division && plan.division !== filters.division) return null;

      var selections = selectionsByPlan[plan.id] || [];
      var meetings = (meetingsByPlan[plan.id] || []).sort(function(a, b) {
        return new Date(b.meeting_date) - new Date(a.meeting_date);
      });

      var lastMeeting = meetings.length > 0 ? meetings[0] : null;
      var lastMeetingDate = lastMeeting ? lastMeeting.meeting_date : null;
      var nextMeetingDate = lastMeeting ? lastMeeting.next_meeting_date : null;

      // Overdue check-in: last meeting > checkinDays ago (only for active plans)
      var isOverdue = false;
      if (plan.status !== 'completed' && plan.status !== 'draft') {
        if (lastMeetingDate) {
          isOverdue = daysBetween(lastMeetingDate, now) > checkinDays;
        } else {
          isOverdue = daysBetween(plan.created_at, now) > checkinDays;
        }
      }

      statCounts.total++;
      if (statCounts[plan.status] !== undefined) statCounts[plan.status]++;
      if (isOverdue) statCounts.overdueCheckins++;

      return {
        id: plan.id,
        staffId: plan.staff_id,
        staffName: staffName_(sMap, plan.staff_id),
        department: staff.department || '',
        division: plan.division || '',
        supervisorName: staffName_(sMap, plan.supervisor_id),
        academicYear: plan.academic_year,
        status: plan.status,
        standardCount: selections.length,
        nextMeetingDate: nextMeetingDate || '',
        lastMeetingDate: lastMeetingDate || '',
        isOverdue: isOverdue,
        hasFacultySig: !!plan.faculty_signed_date,
        hasSupervisorSig: !!plan.supervisor_signed_date
      };
    }).filter(Boolean);

    return {
      plans: enriched,
      stats: statCounts
    };
  }

  /**
   * Full plan detail: plan record + staff + supervisor + standard selections + meetings.
   * @param {string} planId
   * @returns {Object}
   */
  function getPlanDetail(planId) {
    AuthService.requireAuth();
    if (!planId) throw new Error('VALIDATION: planId is required');

    var plan = DataService.getRecordById('growth_plans', planId);
    if (!plan) throw new Error('NOT_FOUND: Growth plan not found');
    requirePlanAccess_(plan);

    var sMap = staffMap_();
    var staff = sMap[plan.staff_id] || {};

    // Load standards library for enrichment
    var allStandards = DataService.getRecords('pgp_standards');
    var stdById = {};
    allStandards.forEach(function(s) { stdById[s.id] = s; });

    // Selections for this plan
    var selections = DataService.query('pgp_standard_selections', {
      filters: { plan_id: planId },
      sort: { field: 'sort_order', direction: 'asc' }
    }).data;

    selections = selections.map(function(sel) {
      var std = stdById[sel.standard_id] || {};
      return {
        id: sel.id,
        planId: sel.plan_id,
        standardId: sel.standard_id,
        standardNumber: Number(std.standard_number) || 0,
        shortName: std.short_name || '',
        hashtag: std.hashtag || '',
        isMandatory: String(std.is_mandatory) === 'true',
        yearInCycle: Number(sel.year_in_cycle) || 0,
        initialGoal: sel.initial_goal || '',
        successCriteria: sel.success_criteria || '',
        evidencePlanned: sel.evidence_planned || '',
        reflection: sel.reflection || '',
        evidenceLinked: sel.evidence_linked || '',
        supervisorComments: sel.supervisor_comments || '',
        growingEdge: sel.growing_edge || '',
        stretchChallenge: sel.stretch_challenge || '',
        stretchChallengeSetBy: sel.stretch_challenge_set_by || '',
        status: sel.status || 'not_started',
        sortOrder: Number(sel.sort_order) || 0
      };
    });

    // Meetings
    var meetings = DataService.query('growth_meetings', {
      filters: { plan_id: planId },
      sort: { field: 'meeting_date', direction: 'desc' }
    }).data;

    meetings = meetings.map(function(m) {
      var attendeeIds = parseCSV(m.attendees);
      var attendeeNames = attendeeIds.map(function(id) {
        return staffName_(sMap, id);
      });

      return {
        id: m.id,
        planId: m.plan_id,
        meetingDate: m.meeting_date,
        meetingType: m.meeting_type,
        attendees: attendeeNames,
        attendeeIds: attendeeIds,
        notes: m.notes || '',
        actionItems: m.action_items || '',
        nextMeetingDate: m.next_meeting_date || '',
        createdBy: staffName_(sMap, m.created_by),
        createdAt: m.created_at
      };
    });

    // Load ITC maps for each selection
    var allItcMaps = DataService.getRecords('itc_maps');
    var itcBySelection = {};
    allItcMaps.forEach(function(m) { itcBySelection[m.selection_id] = m; });

    selections.forEach(function(sel) {
      var itc = itcBySelection[sel.id];
      sel.itcMap = itc ? {
        id: itc.id,
        commitment: itc.commitment || '',
        doingNotDoing: itc.doing_not_doing || '',
        competingCommitments: itc.competing_commitments || '',
        bigAssumptions: itc.big_assumptions || '',
        status: itc.status || 'draft',
        reflectionNotes: itc.reflection_notes || ''
      } : null;
    });

    return {
      plan: {
        id: plan.id,
        staffId: plan.staff_id,
        academicYear: plan.academic_year,
        supervisorId: plan.supervisor_id,
        status: plan.status,
        division: plan.division || '',
        yearsAtSchool: plan.years_at_school || '',
        facultySignedDate: plan.faculty_signed_date || '',
        supervisorSignedDate: plan.supervisor_signed_date || '',
        growingEdgeSummary: plan.growing_edge_summary || '',
        growingEdgeVisibility: plan.growing_edge_visibility || 'private',
        createdAt: plan.created_at,
        updatedAt: plan.updated_at
      },
      staffName: staffName_(sMap, plan.staff_id),
      staffEmail: staff.email || '',
      staffDepartment: staff.department || '',
      supervisorName: staffName_(sMap, plan.supervisor_id),
      selections: selections,
      meetings: meetings
    };
  }

  /**
   * Returns the current user's plan for the current academic year.
   * @returns {{ plan: Object|null, ... }}
   */
  function getMyPlan() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    var year = currentAcademicYear();

    var result = DataService.query('growth_plans', {
      filters: { staff_id: user.id, academic_year: year },
      limit: 1
    });

    if (result.data.length === 0) return { plan: null };
    return getPlanDetail(result.data[0].id);
  }

  /**
   * Creates a new growth plan. Admin only.
   * @param {Object} data - { staff_id, supervisor_id, academic_year?, division?, years_at_school? }
   * @returns {Object} Created plan record
   */
  function createPlan(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['staff_id', 'supervisor_id']);

    var year = data.academic_year || currentAcademicYear();

    // Check for duplicate
    var existing = DataService.query('growth_plans', {
      filters: { staff_id: data.staff_id, academic_year: year },
      limit: 1
    });
    if (existing.data.length > 0) {
      throw new Error('VALIDATION: A plan already exists for this staff member in ' + year + '.');
    }

    return DataService.createRecord('growth_plans', {
      staff_id: data.staff_id,
      academic_year: year,
      supervisor_id: data.supervisor_id,
      status: 'draft',
      division: data.division || '',
      years_at_school: data.years_at_school || '',
      faculty_signed_date: '',
      supervisor_signed_date: ''
    });
  }

  /**
   * Updates a plan (status and/or metadata). Admin or plan owner.
   * @param {string} planId
   * @param {Object} updates - { status?, supervisor_id?, division?, years_at_school? }
   * @returns {Object} Updated plan
   */
  function updatePlan(planId, updates) {
    AuthService.requireAuth();
    if (!planId) throw new Error('VALIDATION: planId is required');

    var plan = DataService.getRecordById('growth_plans', planId);
    if (!plan) throw new Error('NOT_FOUND: Growth plan not found');
    requirePlanAccess_(plan);

    // Only admins can change status
    if (updates.status) {
      AuthService.requireAdmin();
      if (PLAN_STATUSES.indexOf(updates.status) === -1) {
        throw new Error('VALIDATION: Invalid status. Must be one of: ' + PLAN_STATUSES.join(', '));
      }
    }

    // Only admins can change supervisor
    if (updates.supervisor_id) {
      AuthService.requireAdmin();
    }

    return DataService.updateRecord('growth_plans', planId, updates);
  }

  /**
   * Hard-deletes a plan and its selections. Admin only.
   * @param {string} planId
   * @returns {boolean}
   */
  function deletePlan(planId) {
    AuthService.requireAdmin();
    if (!planId) throw new Error('VALIDATION: planId is required');

    var plan = DataService.getRecordById('growth_plans', planId);
    if (!plan) throw new Error('NOT_FOUND: Growth plan not found');

    // Cascade delete selections
    var selections = DataService.getRelated('pgp_standard_selections', 'plan_id', planId);
    selections.forEach(function(sel) {
      DataService.deleteRecord('pgp_standard_selections', sel.id, { hard: true });
    });

    // Cascade delete meetings
    var meetings = DataService.getRelated('growth_meetings', 'plan_id', planId);
    meetings.forEach(function(m) {
      DataService.deleteRecord('growth_meetings', m.id, { hard: true });
    });

    // Cascade delete cycle history for this staff+year
    var cycleEntries = DataService.getRecords('pgp_cycle_history').filter(function(c) {
      return c.staff_id === plan.staff_id && c.academic_year === plan.academic_year;
    });
    cycleEntries.forEach(function(c) {
      DataService.deleteRecord('pgp_cycle_history', c.id, { hard: true });
    });

    DataService.deleteRecord('growth_plans', planId, { hard: true });
    return true;
  }

  // ════════════════════════════════════════════
  // Standard Selections
  // ════════════════════════════════════════════

  /**
   * Selects standards for a plan: mandatory + custom choices.
   * Validates: mandatory standard is included, max 2 custom.
   * Creates pgp_standard_selections and pgp_cycle_history entries.
   * @param {Object} data - { plan_id, standard_ids: string[], year_in_cycle: number }
   * @returns {Object[]} Created selections
   */
  function selectStandards(data) {
    AuthService.requireAuth();
    validateRequired(data, ['plan_id', 'standard_ids', 'year_in_cycle']);

    var plan = DataService.getRecordById('growth_plans', data.plan_id);
    if (!plan) throw new Error('NOT_FOUND: Growth plan not found');
    requirePlanAccess_(plan);

    var standardIds = data.standard_ids;
    var yearInCycle = Number(data.year_in_cycle);
    if (yearInCycle < 1 || yearInCycle > 4) {
      throw new Error('VALIDATION: year_in_cycle must be 1-4.');
    }

    // Load standards to validate
    var allStandards = DataService.getRecords('pgp_standards');
    var stdById = {};
    var mandatoryId = null;
    allStandards.forEach(function(s) {
      stdById[s.id] = s;
      if (String(s.is_mandatory) === 'true') mandatoryId = s.id;
    });

    // Validate mandatory standard is included
    if (mandatoryId && standardIds.indexOf(mandatoryId) === -1) {
      throw new Error('VALIDATION: The mandatory Wellbeing standard must be included.');
    }

    // Count custom (non-mandatory) selections — max 2
    var customCount = 0;
    for (var v = 0; v < standardIds.length; v++) {
      if (standardIds[v] !== mandatoryId) customCount++;
    }
    if (customCount > 2) {
      throw new Error('VALIDATION: You may select at most 2 custom standards plus the mandatory standard.');
    }

    // Delete existing selections for this plan
    var existingSelections = DataService.getRelated('pgp_standard_selections', 'plan_id', data.plan_id);
    existingSelections.forEach(function(sel) {
      DataService.deleteRecord('pgp_standard_selections', sel.id, { hard: true });
    });

    // Delete existing cycle history for this staff+year
    var existingCycle = DataService.getRecords('pgp_cycle_history').filter(function(c) {
      return c.staff_id === plan.staff_id && c.academic_year === plan.academic_year;
    });
    existingCycle.forEach(function(c) {
      DataService.deleteRecord('pgp_cycle_history', c.id, { hard: true });
    });

    // Create new selections and cycle history
    var now = new Date().toISOString();
    var created = [];

    for (var i = 0; i < standardIds.length; i++) {
      var stdId = standardIds[i];
      if (!stdById[stdId]) {
        throw new Error('VALIDATION: Standard not found: ' + stdId);
      }

      var sel = DataService.createRecord('pgp_standard_selections', {
        plan_id: data.plan_id,
        standard_id: stdId,
        year_in_cycle: yearInCycle,
        initial_goal: '',
        success_criteria: '',
        evidence_planned: '',
        reflection: '',
        evidence_linked: '',
        supervisor_comments: '',
        status: 'not_started',
        sort_order: i + 1,
        created_at: now,
        updated_at: now
      });
      created.push(sel);

      // Create cycle history entry
      DataService.createRecord('pgp_cycle_history', {
        staff_id: plan.staff_id,
        academic_year: plan.academic_year,
        year_in_cycle: yearInCycle,
        standard_id: stdId,
        created_at: now,
        updated_at: now
      });
    }

    return created;
  }

  /**
   * Updates a single standard selection's PGP fields.
   * @param {string} selectionId
   * @param {Object} updates - { initial_goal?, success_criteria?, evidence_planned?, reflection?, evidence_linked?, supervisor_comments?, growing_edge?, stretch_challenge?, stretch_challenge_set_by?, status? }
   * @returns {Object}
   */
  function updateStandardSelection(selectionId, updates) {
    AuthService.requireAuth();
    if (!selectionId) throw new Error('VALIDATION: selectionId is required');

    var sel = DataService.getRecordById('pgp_standard_selections', selectionId);
    if (!sel) throw new Error('NOT_FOUND: Standard selection not found');

    var plan = DataService.getRecordById('growth_plans', sel.plan_id);
    if (!plan) throw new Error('NOT_FOUND: Growth plan not found');
    requirePlanAccess_(plan);

    // Supervisor comments — only admin/supervisor can write
    if (updates.supervisor_comments !== undefined) {
      var user = AuthService.getCurrentUser();
      if (user.role !== 'admin' && user.id !== plan.supervisor_id) {
        throw new Error('AUTH_DENIED: Only the supervisor can write supervisor comments.');
      }
    }

    // Stretch challenge — only admin/supervisor can set (Multiplier: Challenger discipline)
    if (updates.stretch_challenge !== undefined) {
      var scUser = AuthService.getCurrentUser();
      if (scUser.role !== 'admin' && scUser.id !== plan.supervisor_id) {
        throw new Error('AUTH_DENIED: Only the supervisor can set stretch challenges.');
      }
      updates.stretch_challenge_set_by = scUser.id;
    }

    if (updates.status && SELECTION_STATUSES.indexOf(updates.status) === -1) {
      throw new Error('VALIDATION: Invalid selection status. Must be one of: ' + SELECTION_STATUSES.join(', '));
    }

    updates.updated_at = new Date().toISOString();
    return DataService.updateRecord('pgp_standard_selections', selectionId, updates);
  }

  // ════════════════════════════════════════════
  // Cycle History (Standards at a Glance)
  // ════════════════════════════════════════════

  /**
   * Returns the Standards at a Glance matrix for a staff member.
   * Shows which standards were selected each year across the 4-year cycle.
   * @param {string} staffId
   * @returns {Object} { staffId, staffName, history: { 'year': ['stdId', ...], ... }, standards: [...] }
   */
  function getStandardsAtAGlance(staffId) {
    AuthService.requireAuth();
    if (!staffId) throw new Error('VALIDATION: staffId is required');

    // Non-admin can only view their own
    var user = AuthService.getCurrentUser();
    if (user.role !== 'admin' && user.id !== staffId) {
      throw new Error('AUTH_DENIED: You may only view your own cycle history.');
    }

    var sMap = staffMap_();
    var allCycle = DataService.getRecords('pgp_cycle_history').filter(function(c) {
      return c.staff_id === staffId;
    });

    // Group by academic_year
    var historyByYear = {};
    allCycle.forEach(function(c) {
      var year = c.academic_year;
      if (!historyByYear[year]) {
        historyByYear[year] = { yearInCycle: Number(c.year_in_cycle) || 0, standardIds: [] };
      }
      historyByYear[year].standardIds.push(c.standard_id);
    });

    var standards = getStandards();

    return {
      staffId: staffId,
      staffName: staffName_(sMap, staffId),
      history: historyByYear,
      standards: standards
    };
  }

  /**
   * Returns cycle history entries for a staff member (raw records).
   * @param {string} staffId
   * @returns {Object[]}
   */
  function getCycleHistory(staffId) {
    AuthService.requireAuth();
    if (!staffId) throw new Error('VALIDATION: staffId is required');

    var user = AuthService.getCurrentUser();
    if (user.role !== 'admin' && user.id !== staffId) {
      throw new Error('AUTH_DENIED: You may only view your own cycle history.');
    }

    return DataService.getRecords('pgp_cycle_history').filter(function(c) {
      return c.staff_id === staffId;
    });
  }

  // ════════════════════════════════════════════
  // Meetings
  // ════════════════════════════════════════════

  /**
   * Creates a meeting record on a plan.
   * @param {Object} data - { plan_id, meeting_date, meeting_type, attendees?, notes?, action_items?, next_meeting_date? }
   * @returns {Object}
   */
  function createMeeting(data) {
    AuthService.requireAuth();
    validateRequired(data, ['plan_id', 'meeting_date', 'meeting_type']);

    if (MEETING_TYPES.indexOf(data.meeting_type) === -1) {
      throw new Error('VALIDATION: Invalid meeting type. Must be one of: ' + MEETING_TYPES.join(', '));
    }

    var plan = DataService.getRecordById('growth_plans', data.plan_id);
    if (!plan) throw new Error('NOT_FOUND: Growth plan not found');
    requirePlanAccess_(plan);

    var user = AuthService.getCurrentUser();

    return DataService.createRecord('growth_meetings', {
      plan_id: data.plan_id,
      meeting_date: data.meeting_date,
      meeting_type: data.meeting_type,
      attendees: data.attendees || '',
      notes: data.notes || '',
      action_items: data.action_items || '',
      next_meeting_date: data.next_meeting_date || '',
      created_by: user.id
    });
  }

  /**
   * Updates a meeting record.
   * @param {string} meetingId
   * @param {Object} updates
   * @returns {Object}
   */
  function updateMeeting(meetingId, updates) {
    AuthService.requireAuth();
    if (!meetingId) throw new Error('VALIDATION: meetingId is required');

    var meeting = DataService.getRecordById('growth_meetings', meetingId);
    if (!meeting) throw new Error('NOT_FOUND: Meeting not found');

    var plan = DataService.getRecordById('growth_plans', meeting.plan_id);
    if (!plan) throw new Error('NOT_FOUND: Growth plan not found');
    requirePlanAccess_(plan);

    if (updates.meeting_type && MEETING_TYPES.indexOf(updates.meeting_type) === -1) {
      throw new Error('VALIDATION: Invalid meeting type');
    }

    return DataService.updateRecord('growth_meetings', meetingId, updates);
  }

  // ════════════════════════════════════════════
  // Signatures
  // ════════════════════════════════════════════

  /**
   * Signs a plan (faculty or supervisor).
   * Faculty: plan owner signs. Supervisor: admin or designated supervisor signs.
   * @param {string} planId
   * @param {string} signatureType - 'faculty' or 'supervisor'
   * @returns {Object} Updated plan
   */
  function signPlan(planId, signatureType) {
    AuthService.requireAuth();
    if (!planId) throw new Error('VALIDATION: planId is required');
    if (signatureType !== 'faculty' && signatureType !== 'supervisor') {
      throw new Error('VALIDATION: signatureType must be "faculty" or "supervisor".');
    }

    var plan = DataService.getRecordById('growth_plans', planId);
    if (!plan) throw new Error('NOT_FOUND: Growth plan not found');

    var user = AuthService.getCurrentUser();
    var now = new Date().toISOString();

    if (signatureType === 'faculty') {
      // Only the plan owner can sign as faculty
      if (user.id !== plan.staff_id && user.role !== 'admin') {
        throw new Error('AUTH_DENIED: Only the plan owner can sign as faculty.');
      }
      return DataService.updateRecord('growth_plans', planId, { faculty_signed_date: now });

    } else {
      // Only admin or designated supervisor can sign
      if (user.role !== 'admin' && user.id !== plan.supervisor_id) {
        throw new Error('AUTH_DENIED: Only the supervisor can sign this plan.');
      }
      return DataService.updateRecord('growth_plans', planId, { supervisor_signed_date: now });
    }
  }

  // ── Public Interface ──

  // ════════════════════════════════════════════
  // DDO: Immunity to Change Maps
  // ════════════════════════════════════════════

  /**
   * Creates or updates an ITC map for a standard selection.
   * @param {Object} data - { selection_id, commitment, doing_not_doing, competing_commitments, big_assumptions, reflection_notes? }
   * @returns {Object}
   */
  function createITCMap(data) {
    AuthService.requireAuth();
    validateRequired(data, ['selection_id']);

    var sel = DataService.getRecordById('pgp_standard_selections', data.selection_id);
    if (!sel) throw new Error('NOT_FOUND: Standard selection not found');
    var plan = DataService.getRecordById('growth_plans', sel.plan_id);
    if (!plan) throw new Error('NOT_FOUND: Plan not found');
    requirePlanAccess_(plan);

    // Check for existing map
    var existing = DataService.query('itc_maps', {
      filters: { selection_id: data.selection_id },
      limit: 1
    });
    if (existing.data.length > 0) {
      return updateITCMap(existing.data[0].id, data);
    }

    var user = AuthService.getCurrentUser();
    var now = new Date().toISOString();
    return DataService.createRecord('itc_maps', {
      selection_id: data.selection_id,
      staff_id: user.id,
      commitment: data.commitment || '',
      doing_not_doing: data.doing_not_doing || '',
      competing_commitments: data.competing_commitments || '',
      big_assumptions: data.big_assumptions || '',
      status: 'draft',
      reflection_notes: data.reflection_notes || '',
      created_at: now,
      updated_at: now
    });
  }

  /**
   * Updates an existing ITC map.
   * @param {string} mapId
   * @param {Object} updates
   * @returns {Object}
   */
  function updateITCMap(mapId, updates) {
    AuthService.requireAuth();
    if (!mapId) throw new Error('VALIDATION: mapId is required');

    var map = DataService.getRecordById('itc_maps', mapId);
    if (!map) throw new Error('NOT_FOUND: ITC map not found');

    var sel = DataService.getRecordById('pgp_standard_selections', map.selection_id);
    if (sel) {
      var plan = DataService.getRecordById('growth_plans', sel.plan_id);
      if (plan) requirePlanAccess_(plan);
    }

    var allowed = ['commitment', 'doing_not_doing', 'competing_commitments',
                   'big_assumptions', 'status', 'reflection_notes'];
    var clean = {};
    allowed.forEach(function(f) {
      if (updates[f] !== undefined) clean[f] = updates[f];
    });
    clean.updated_at = new Date().toISOString();
    return DataService.updateRecord('itc_maps', mapId, clean);
  }

  /**
   * Gets the ITC map for a standard selection.
   * @param {string} selectionId
   * @returns {Object|null}
   */
  function getITCMap(selectionId) {
    AuthService.requireAuth();
    var result = DataService.query('itc_maps', {
      filters: { selection_id: selectionId },
      limit: 1
    });
    if (result.data.length === 0) return null;
    var m = result.data[0];
    return {
      id: m.id,
      selectionId: m.selection_id,
      staffId: m.staff_id,
      commitment: m.commitment || '',
      doingNotDoing: m.doing_not_doing || '',
      competingCommitments: m.competing_commitments || '',
      bigAssumptions: m.big_assumptions || '',
      status: m.status || 'draft',
      reflectionNotes: m.reflection_notes || ''
    };
  }

  // ════════════════════════════════════════════
  // DDO: Developmental Wall
  // ════════════════════════════════════════════

  /**
   * Returns publicly-shared growing edges for the developmental wall.
   * Respects visibility: 'public' visible to all, 'team' visible to same department.
   * @returns {Object[]}
   */
  function getDevelopmentalWall() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    var staffRec = DataService.getRecordById('staff', user.id);
    var userDept = staffRec ? staffRec.department : '';

    var allPlans = DataService.getRecords('growth_plans');
    var sMap = staffMap_();
    var year = currentAcademicYear();

    var wall = [];
    allPlans.forEach(function(plan) {
      if (plan.academic_year !== year) return;
      if (!plan.growing_edge_summary) return;

      var vis = plan.growing_edge_visibility || 'private';
      if (vis === 'private') return;

      // Team visibility: only same department
      if (vis === 'team') {
        var planStaff = sMap[plan.staff_id];
        if (!planStaff || planStaff.department !== userDept) return;
      }

      var s = sMap[plan.staff_id];
      // Load selections to get standard hashtags
      var selections = DataService.query('pgp_standard_selections', {
        filters: { plan_id: plan.id }
      }).data;

      var standards = DataService.getRecords('pgp_standards');
      var stdMap = {};
      standards.forEach(function(st) { stdMap[st.id] = st; });

      var hashtags = selections.map(function(sel) {
        var std = stdMap[sel.standard_id];
        return std ? (std.hashtag || std.short_name) : '';
      }).filter(Boolean);

      wall.push({
        staffId: plan.staff_id,
        staffName: s ? s.first_name + ' ' + s.last_name : 'Unknown',
        department: s ? s.department || '' : '',
        initials: s ? (s.first_name || '').charAt(0) + (s.last_name || '').charAt(0) : '?',
        growingEdge: plan.growing_edge_summary,
        hashtags: hashtags,
        visibility: vis
      });
    });

    return wall;
  }

  // ════════════════════════════════════════════
  // DDO: Coaching Triads
  // ════════════════════════════════════════════

  /**
   * Returns all coaching groups (admin) or the user's group (teacher).
   * @returns {Object[]}
   */
  function getCoachingGroups() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();
    var sMap = staffMap_();

    var groups = DataService.getRecords('coaching_groups').filter(function(g) {
      return g.status === 'active';
    });

    var allMembers = DataService.getRecords('coaching_group_members').filter(function(m) {
      return !m.left_at;
    });

    return groups.map(function(g) {
      var members = allMembers.filter(function(m) { return m.group_id === g.id; });
      return {
        id: g.id,
        groupName: g.group_name,
        groupType: g.group_type || 'triad',
        academicYear: g.academic_year || '',
        facilitatorId: g.facilitator_id || '',
        facilitatorName: staffName_(sMap, g.facilitator_id),
        status: g.status,
        meetingFrequencyWeeks: Number(g.meeting_frequency_weeks) || 2,
        members: members.map(function(m) {
          return {
            id: m.id,
            staffId: m.staff_id,
            staffName: staffName_(sMap, m.staff_id),
            role: m.role || 'member',
            initials: (sMap[m.staff_id] || {}).first_name
              ? ((sMap[m.staff_id].first_name || '').charAt(0) + (sMap[m.staff_id].last_name || '').charAt(0))
              : '?'
          };
        })
      };
    });
  }

  /**
   * Creates a coaching group. Admin only.
   * @param {Object} data - { group_name, group_type?, academic_year?, facilitator_id?, meeting_frequency_weeks? }
   * @returns {Object}
   */
  function createCoachingGroup(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['group_name']);

    var user = AuthService.getCurrentUser();
    var now = new Date().toISOString();
    return DataService.createRecord('coaching_groups', {
      group_name: data.group_name,
      group_type: data.group_type || 'triad',
      academic_year: data.academic_year || currentAcademicYear(),
      facilitator_id: data.facilitator_id || '',
      status: 'active',
      meeting_frequency_weeks: data.meeting_frequency_weeks || 2,
      created_by: user.id,
      created_at: now,
      updated_at: now
    });
  }

  /**
   * Adds a member to a coaching group. Admin only.
   * @param {string} groupId
   * @param {string} staffId
   * @param {string} [role] - 'member' or 'facilitator'
   * @returns {Object}
   */
  function addGroupMember(groupId, staffId, role) {
    AuthService.requireAdmin();
    if (!groupId || !staffId) throw new Error('VALIDATION: groupId and staffId are required');

    // Check for existing active membership
    var existing = DataService.getRecords('coaching_group_members').filter(function(m) {
      return m.group_id === groupId && m.staff_id === staffId && !m.left_at;
    });
    if (existing.length > 0) throw new Error('VALIDATION: Staff member is already in this group');

    return DataService.createRecord('coaching_group_members', {
      group_id: groupId,
      staff_id: staffId,
      role: role || 'member',
      joined_at: new Date().toISOString(),
      left_at: ''
    });
  }

  /**
   * Removes a member from a coaching group. Admin only.
   * @param {string} groupId
   * @param {string} staffId
   * @returns {boolean}
   */
  function removeGroupMember(groupId, staffId) {
    AuthService.requireAdmin();
    var members = DataService.getRecords('coaching_group_members').filter(function(m) {
      return m.group_id === groupId && m.staff_id === staffId && !m.left_at;
    });
    if (members.length === 0) throw new Error('NOT_FOUND: Member not found in group');

    DataService.updateRecord('coaching_group_members', members[0].id, {
      left_at: new Date().toISOString()
    });
    return true;
  }

  /**
   * Returns the current user's coaching group with members and recent meetings.
   * @returns {Object|null}
   */
  function getMyCoachingGroup() {
    AuthService.requireAuth();
    var user = AuthService.getCurrentUser();

    var allMembers = DataService.getRecords('coaching_group_members').filter(function(m) {
      return m.staff_id === user.id && !m.left_at;
    });
    if (allMembers.length === 0) return null;

    var groupId = allMembers[0].group_id;
    var groups = getCoachingGroups().filter(function(g) { return g.id === groupId; });
    if (groups.length === 0) return null;

    var group = groups[0];
    group.meetings = getCoachingMeetings(groupId);
    return group;
  }

  /**
   * Returns meetings for a coaching group.
   * @param {string} groupId
   * @returns {Object[]}
   */
  function getCoachingMeetings(groupId) {
    AuthService.requireAuth();
    var sMap = staffMap_();

    var meetings = DataService.query('coaching_meetings', {
      filters: { group_id: groupId },
      sort: { field: 'meeting_date', direction: 'desc' }
    }).data;

    return meetings.map(function(m) {
      return {
        id: m.id,
        groupId: m.group_id,
        meetingDate: m.meeting_date || '',
        facilitatorName: staffName_(sMap, m.facilitator_id),
        attendees: parseCSV(m.attendees_csv).map(function(id) { return staffName_(sMap, id); }),
        topic: m.topic || '',
        growingEdgeDiscussed: m.growing_edge_discussed || '',
        keyInsights: m.key_insights || '',
        actionCommitments: m.action_commitments || '',
        nextMeetingDate: m.next_meeting_date || '',
        createdBy: staffName_(sMap, m.created_by)
      };
    });
  }

  /**
   * Creates a coaching meeting. Any group member can log.
   * @param {Object} data
   * @returns {Object}
   */
  function createCoachingMeeting(data) {
    AuthService.requireAuth();
    validateRequired(data, ['group_id', 'meeting_date']);

    var user = AuthService.getCurrentUser();
    return DataService.createRecord('coaching_meetings', {
      group_id: data.group_id,
      meeting_date: data.meeting_date,
      facilitator_id: data.facilitator_id || user.id,
      attendees_csv: data.attendees_csv || user.id,
      topic: data.topic || '',
      growing_edge_discussed: data.growing_edge_discussed || '',
      key_insights: data.key_insights || '',
      action_commitments: data.action_commitments || '',
      next_meeting_date: data.next_meeting_date || '',
      created_by: user.id,
      created_at: new Date().toISOString()
    });
  }

  return {
    // Standards
    getStandards: getStandards,
    createStandard: createStandard,
    updateStandard: updateStandard,
    deleteStandard: deleteStandard,
    reorderStandards: reorderStandards,
    // Plans
    getOverview: getOverview,
    getPlanDetail: getPlanDetail,
    getMyPlan: getMyPlan,
    createPlan: createPlan,
    updatePlan: updatePlan,
    deletePlan: deletePlan,
    // Selections
    selectStandards: selectStandards,
    updateStandardSelection: updateStandardSelection,
    // Cycle
    getStandardsAtAGlance: getStandardsAtAGlance,
    getCycleHistory: getCycleHistory,
    // Meetings
    createMeeting: createMeeting,
    updateMeeting: updateMeeting,
    // Signatures
    signPlan: signPlan,
    // DDO: ITC Maps
    createITCMap: createITCMap,
    updateITCMap: updateITCMap,
    getITCMap: getITCMap,
    // DDO: Developmental Wall
    getDevelopmentalWall: getDevelopmentalWall,
    // DDO: Coaching Triads
    getCoachingGroups: getCoachingGroups,
    createCoachingGroup: createCoachingGroup,
    addGroupMember: addGroupMember,
    removeGroupMember: removeGroupMember,
    getMyCoachingGroup: getMyCoachingGroup,
    getCoachingMeetings: getCoachingMeetings,
    createCoachingMeeting: createCoachingMeeting
  };

})();
