/**
 * FeedbackService.gs — Staff Feedback & 360 Reviews
 *
 * Manages feedback cycles, question banks, assignment workflows,
 * response collection (with anonymity), summary generation, and
 * Growth Plan evidence linking.
 *
 * Tables: feedback_cycles, feedback_questions, feedback_assignments,
 *         feedback_responses, feedback_summaries, feedback_activity
 *
 * ES5 only (GAS Rhino runtime).
 */

var FeedbackService = (function() {
  'use strict';

  // ═══════════════════════════════════════════════
  // Constants
  // ═══════════════════════════════════════════════

  var CYCLE_STATUSES    = ['draft', 'open', 'closed', 'archived'];
  var FEEDBACK_TYPES    = ['360', 'peer', 'supervisor', 'self'];
  var ASSIGNMENT_STATUSES = ['pending', 'in_progress', 'submitted', 'declined'];
  var QUESTION_TYPES    = ['rating', 'text', 'both'];
  var RESPONDER_ROLES   = ['self', 'peer', 'supervisor'];

  var VALID_TRANSITIONS = {
    draft:  ['open'],
    open:   ['closed'],
    closed: ['archived']
  };

  var ACTIVITY_TYPES = [
    'cycle_created', 'cycle_updated', 'cycle_opened', 'cycle_closed',
    'cycle_archived', 'assigned', 'bulk_assigned', 'declined',
    'response_submitted', 'summary_generated', 'summary_shared', 'evidence_linked'
  ];

  // ═══════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════

  /** Cached staff map (per execution). */
  var staffCache_ = null;

  function staffMap_() {
    if (!staffCache_) {
      staffCache_ = {};
      var all = DataService.getRecords('staff');
      for (var i = 0; i < all.length; i++) {
        staffCache_[all[i].id] = all[i];
      }
    }
    return staffCache_;
  }

  function staffName_(id) {
    var s = staffMap_()[id];
    return s ? (s.first_name + ' ' + s.last_name) : 'Unknown';
  }

  function staffInitials_(id) {
    var s = staffMap_()[id];
    return s ? ((s.first_name || '').charAt(0) + (s.last_name || '').charAt(0)).toUpperCase() : '??';
  }

  /** Logs an activity entry. */
  function logFeedbackActivity_(cycleId, assignmentId, actionType, fieldName, oldValue, newValue) {
    var user = AuthService.getCurrentUser();
    DataService.createRecord('feedback_activity', {
      cycle_id:      cycleId || '',
      assignment_id: assignmentId || '',
      user_id:       user.id,
      action_type:   actionType,
      field_name:    fieldName || '',
      old_value:     oldValue != null ? String(oldValue) : '',
      new_value:     newValue != null ? String(newValue) : '',
      created_at:    new Date().toISOString()
    });
  }

  /** Hydrates activity entries with staff names. */
  function hydrateFeedbackActivity_(entries) {
    var map = staffMap_();
    var result = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var staff = map[e.user_id];
      result.push({
        id:            e.id,
        cycle_id:      e.cycle_id,
        assignment_id: e.assignment_id,
        user_id:       e.user_id,
        user_name:     staff ? (staff.first_name + ' ' + staff.last_name) : 'Unknown',
        user_initials: staff ? ((staff.first_name || '').charAt(0) + (staff.last_name || '').charAt(0)).toUpperCase() : '??',
        action_type:   e.action_type,
        field_name:    e.field_name,
        old_value:     e.old_value,
        new_value:     e.new_value,
        created_at:    e.created_at
      });
    }
    return result;
  }

  /** Validates status transition. */
  function validateTransition_(currentStatus, newStatus) {
    var allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || allowed.indexOf(newStatus) === -1) {
      throw new Error('VALIDATION: Cannot transition from ' + currentStatus + ' to ' + newStatus +
        '. Allowed: ' + (allowed ? allowed.join(', ') : 'none'));
    }
  }

  // ═══════════════════════════════════════════════
  // Cycle functions
  // ═══════════════════════════════════════════════

  /**
   * Returns cycles overview with assignment counts and completion rates.
   * @param {Object} filters - { status, feedback_type, academic_year, search }
   */
  function getCyclesOverview(filters) {
    filters = filters || {};
    var cycles = DataService.getRecords('feedback_cycles');
    var assignments = DataService.getRecords('feedback_assignments');
    var map = staffMap_();

    // Build assignment counts per cycle
    var cycleCounts = {};
    for (var a = 0; a < assignments.length; a++) {
      var asg = assignments[a];
      if (!cycleCounts[asg.cycle_id]) {
        cycleCounts[asg.cycle_id] = { total: 0, submitted: 0, pending: 0, declined: 0 };
      }
      cycleCounts[asg.cycle_id].total++;
      if (asg.status === 'submitted') cycleCounts[asg.cycle_id].submitted++;
      if (asg.status === 'pending' || asg.status === 'in_progress') cycleCounts[asg.cycle_id].pending++;
      if (asg.status === 'declined') cycleCounts[asg.cycle_id].declined++;
    }

    // Filter
    var result = [];
    for (var c = 0; c < cycles.length; c++) {
      var cy = cycles[c];
      if (filters.status && cy.status !== filters.status) continue;
      if (filters.feedback_type && cy.feedback_type !== filters.feedback_type) continue;
      if (filters.academic_year && cy.academic_year !== filters.academic_year) continue;
      if (filters.search) {
        var q = filters.search.toLowerCase();
        if ((cy.cycle_name || '').toLowerCase().indexOf(q) === -1 &&
            (cy.description || '').toLowerCase().indexOf(q) === -1) continue;
      }

      var counts = cycleCounts[cy.id] || { total: 0, submitted: 0, pending: 0, declined: 0 };
      var completionRate = counts.total > 0 ? Math.round((counts.submitted / counts.total) * 100) : 0;
      var creator = map[cy.created_by];

      result.push({
        id:              cy.id,
        academic_year:   cy.academic_year,
        cycle_name:      cy.cycle_name,
        description:     cy.description,
        status:          cy.status,
        open_date:       cy.open_date,
        close_date:      cy.close_date,
        feedback_type:   cy.feedback_type,
        min_responses:   parseInt(cy.min_responses, 10) || 3,
        allow_anonymous: cy.allow_anonymous === 'true',
        created_by:      cy.created_by,
        creator_name:    creator ? (creator.first_name + ' ' + creator.last_name) : 'Unknown',
        totalAssignments:  counts.total,
        submittedCount:    counts.submitted,
        pendingCount:      counts.pending,
        declinedCount:     counts.declined,
        completionRate:    completionRate,
        created_at:      cy.created_at,
        updated_at:      cy.updated_at
      });
    }

    // Sort by created_at desc
    result.sort(function(a, b) {
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    return { cycles: result };
  }

  /**
   * Returns full cycle detail with questions, assignments, summaries, activity.
   */
  function getCycleDetail(cycleId) {
    if (!cycleId) throw new Error('VALIDATION: cycleId is required');
    var cycle = DataService.getRecordById('feedback_cycles', cycleId);
    if (!cycle) throw new Error('NOT_FOUND: Feedback cycle not found');

    var map = staffMap_();
    var creator = map[cycle.created_by];

    // Questions
    var allQuestions = DataService.getRecords('feedback_questions');
    var questions = [];
    for (var q = 0; q < allQuestions.length; q++) {
      if (allQuestions[q].cycle_id === cycleId) {
        questions.push(allQuestions[q]);
      }
    }
    questions.sort(function(a, b) {
      return (parseInt(a.sort_order, 10) || 0) - (parseInt(b.sort_order, 10) || 0);
    });

    // Assignments
    var allAssignments = DataService.getRecords('feedback_assignments');
    var assignments = [];
    for (var a = 0; a < allAssignments.length; a++) {
      var asg = allAssignments[a];
      if (asg.cycle_id === cycleId) {
        assignments.push({
          id:             asg.id,
          cycle_id:       asg.cycle_id,
          recipient_id:   asg.recipient_id,
          recipient_name: staffName_(asg.recipient_id),
          responder_id:   asg.responder_id,
          responder_name: staffName_(asg.responder_id),
          responder_role: asg.responder_role,
          status:         asg.status,
          is_anonymous:   asg.is_anonymous === 'true',
          submitted_at:   asg.submitted_at,
          created_at:     asg.created_at,
          updated_at:     asg.updated_at
        });
      }
    }

    // Summaries
    var allSummaries = DataService.getRecords('feedback_summaries');
    var summaries = [];
    for (var s = 0; s < allSummaries.length; s++) {
      var sum = allSummaries[s];
      if (sum.cycle_id === cycleId) {
        // Parse multiplier profile JSON if present
        var multiplierProfile = null;
        if (sum.multiplier_profile_json) {
          try { multiplierProfile = JSON.parse(sum.multiplier_profile_json); } catch (e) { /* ignore */ }
        }

        summaries.push({
          id:                    sum.id,
          cycle_id:              sum.cycle_id,
          recipient_id:          sum.recipient_id,
          recipient_name:        staffName_(sum.recipient_id),
          avg_rating:            parseFloat(sum.avg_rating) || 0,
          response_count:        parseInt(sum.response_count, 10) || 0,
          threshold_met:         sum.threshold_met === 'true',
          multiplierProfile:     multiplierProfile,
          admin_notes:           sum.admin_notes,
          shared_with_recipient: sum.shared_with_recipient === 'true',
          shared_at:             sum.shared_at,
          linked_selection_id:   sum.linked_selection_id,
          created_at:            sum.created_at,
          updated_at:            sum.updated_at
        });
      }
    }

    // Activity
    var allActivity = DataService.getRecords('feedback_activity');
    var activityRaw = [];
    for (var t = 0; t < allActivity.length; t++) {
      if (allActivity[t].cycle_id === cycleId) {
        activityRaw.push(allActivity[t]);
      }
    }
    activityRaw.sort(function(a, b) {
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
    var activity = hydrateFeedbackActivity_(activityRaw.slice(0, 50));

    return {
      id:              cycle.id,
      academic_year:   cycle.academic_year,
      cycle_name:      cycle.cycle_name,
      description:     cycle.description,
      status:          cycle.status,
      open_date:       cycle.open_date,
      close_date:      cycle.close_date,
      feedback_type:   cycle.feedback_type,
      min_responses:   parseInt(cycle.min_responses, 10) || 3,
      allow_anonymous: cycle.allow_anonymous === 'true',
      created_by:      cycle.created_by,
      creator_name:    creator ? (creator.first_name + ' ' + creator.last_name) : 'Unknown',
      questions:       questions,
      assignments:     assignments,
      summaries:       summaries,
      activity:        activity
    };
  }

  /**
   * Creates a new feedback cycle.
   */
  function createCycle(data) {
    AuthService.requireAdmin();
    if (!data.cycle_name) throw new Error('VALIDATION: cycle_name is required');
    if (!data.feedback_type) throw new Error('VALIDATION: feedback_type is required');
    if (FEEDBACK_TYPES.indexOf(data.feedback_type) === -1) {
      throw new Error('VALIDATION: Invalid feedback_type. Must be one of: ' + FEEDBACK_TYPES.join(', '));
    }

    var user = AuthService.getCurrentUser();
    var now = new Date().toISOString();

    var record = DataService.createRecord('feedback_cycles', {
      academic_year:  data.academic_year || '',
      cycle_name:     data.cycle_name,
      description:    data.description || '',
      status:         'draft',
      open_date:      data.open_date || '',
      close_date:     data.close_date || '',
      feedback_type:  data.feedback_type,
      min_responses:  data.min_responses || '3',
      allow_anonymous: data.allow_anonymous === true || data.allow_anonymous === 'true' ? 'true' : 'false',
      created_by:     user.id,
      created_at:     now,
      updated_at:     now
    });

    logFeedbackActivity_(record.id, '', 'cycle_created', '', '', record.cycle_name);
    return record;
  }

  /**
   * Updates a feedback cycle (only when draft).
   */
  function updateCycle(cycleId, updates) {
    AuthService.requireAdmin();
    if (!cycleId) throw new Error('VALIDATION: cycleId is required');

    var cycle = DataService.getRecordById('feedback_cycles', cycleId);
    if (!cycle) throw new Error('NOT_FOUND: Feedback cycle not found');
    if (cycle.status !== 'draft') {
      throw new Error('VALIDATION: Can only edit cycles in draft status. Current status: ' + cycle.status);
    }

    var allowed = ['cycle_name', 'description', 'academic_year', 'open_date', 'close_date',
                   'feedback_type', 'min_responses', 'allow_anonymous'];
    var changes = {};
    for (var i = 0; i < allowed.length; i++) {
      var key = allowed[i];
      if (updates[key] !== undefined && String(updates[key]) !== String(cycle[key])) {
        logFeedbackActivity_(cycleId, '', 'cycle_updated', key, cycle[key], updates[key]);
        changes[key] = key === 'allow_anonymous'
          ? (updates[key] === true || updates[key] === 'true' ? 'true' : 'false')
          : String(updates[key]);
      }
    }

    if (updates.feedback_type && FEEDBACK_TYPES.indexOf(updates.feedback_type) === -1) {
      throw new Error('VALIDATION: Invalid feedback_type. Must be one of: ' + FEEDBACK_TYPES.join(', '));
    }

    changes.updated_at = new Date().toISOString();
    return DataService.updateRecord('feedback_cycles', cycleId, changes);
  }

  /**
   * Transitions cycle status (draft→open→closed→archived).
   */
  function updateCycleStatus(cycleId, newStatus) {
    AuthService.requireAdmin();
    if (!cycleId) throw new Error('VALIDATION: cycleId is required');
    if (CYCLE_STATUSES.indexOf(newStatus) === -1) {
      throw new Error('VALIDATION: Invalid status. Must be one of: ' + CYCLE_STATUSES.join(', '));
    }

    var cycle = DataService.getRecordById('feedback_cycles', cycleId);
    if (!cycle) throw new Error('NOT_FOUND: Feedback cycle not found');

    validateTransition_(cycle.status, newStatus);

    var actionType = 'cycle_' + newStatus;
    if (newStatus === 'open') actionType = 'cycle_opened';
    else if (newStatus === 'closed') actionType = 'cycle_closed';
    else if (newStatus === 'archived') actionType = 'cycle_archived';

    logFeedbackActivity_(cycleId, '', actionType, 'status', cycle.status, newStatus);

    return DataService.updateRecord('feedback_cycles', cycleId, {
      status: newStatus,
      updated_at: new Date().toISOString()
    });
  }

  // ═══════════════════════════════════════════════
  // Question functions
  // ═══════════════════════════════════════════════

  /**
   * Adds a question to a draft cycle.
   */
  function addQuestion(cycleId, data) {
    AuthService.requireAdmin();
    if (!cycleId) throw new Error('VALIDATION: cycleId is required');
    if (!data.question_text) throw new Error('VALIDATION: question_text is required');
    if (QUESTION_TYPES.indexOf(data.question_type) === -1) {
      throw new Error('VALIDATION: Invalid question_type. Must be one of: ' + QUESTION_TYPES.join(', '));
    }

    var cycle = DataService.getRecordById('feedback_cycles', cycleId);
    if (!cycle) throw new Error('NOT_FOUND: Feedback cycle not found');
    if (cycle.status !== 'draft') {
      throw new Error('VALIDATION: Can only add questions to draft cycles.');
    }

    // Auto-increment sort_order
    var allQuestions = DataService.getRecords('feedback_questions');
    var maxOrder = 0;
    for (var i = 0; i < allQuestions.length; i++) {
      if (allQuestions[i].cycle_id === cycleId) {
        var order = parseInt(allQuestions[i].sort_order, 10) || 0;
        if (order > maxOrder) maxOrder = order;
      }
    }

    var now = new Date().toISOString();
    return DataService.createRecord('feedback_questions', {
      cycle_id:      cycleId,
      question_text: data.question_text,
      question_type: data.question_type,
      sort_order:    data.sort_order || String(maxOrder + 1),
      is_required:   data.is_required === true || data.is_required === 'true' ? 'true' : 'false',
      discipline_tag: data.discipline_tag || '',
      created_at:    now,
      updated_at:    now
    });
  }

  /**
   * Updates a question (only when parent cycle is draft).
   */
  function updateQuestion(questionId, updates) {
    AuthService.requireAdmin();
    if (!questionId) throw new Error('VALIDATION: questionId is required');

    var question = DataService.getRecordById('feedback_questions', questionId);
    if (!question) throw new Error('NOT_FOUND: Question not found');

    var cycle = DataService.getRecordById('feedback_cycles', question.cycle_id);
    if (!cycle || cycle.status !== 'draft') {
      throw new Error('VALIDATION: Can only edit questions in draft cycles.');
    }

    if (updates.question_type && QUESTION_TYPES.indexOf(updates.question_type) === -1) {
      throw new Error('VALIDATION: Invalid question_type. Must be one of: ' + QUESTION_TYPES.join(', '));
    }

    var changes = {};
    var allowed = ['question_text', 'question_type', 'sort_order', 'is_required', 'discipline_tag'];
    for (var i = 0; i < allowed.length; i++) {
      var key = allowed[i];
      if (updates[key] !== undefined) {
        changes[key] = key === 'is_required'
          ? (updates[key] === true || updates[key] === 'true' ? 'true' : 'false')
          : String(updates[key]);
      }
    }

    changes.updated_at = new Date().toISOString();
    return DataService.updateRecord('feedback_questions', questionId, changes);
  }

  /**
   * Deletes a question (only when parent cycle is draft).
   */
  function deleteQuestion(questionId) {
    AuthService.requireAdmin();
    if (!questionId) throw new Error('VALIDATION: questionId is required');

    var question = DataService.getRecordById('feedback_questions', questionId);
    if (!question) throw new Error('NOT_FOUND: Question not found');

    var cycle = DataService.getRecordById('feedback_cycles', question.cycle_id);
    if (!cycle || cycle.status !== 'draft') {
      throw new Error('VALIDATION: Can only delete questions in draft cycles.');
    }

    DataService.deleteRecord('feedback_questions', questionId);
    return { success: true };
  }

  // ═══════════════════════════════════════════════
  // Assignment functions
  // ═══════════════════════════════════════════════

  /**
   * Creates a single feedback assignment.
   */
  function createAssignment(data) {
    AuthService.requireAdmin();
    if (!data.cycle_id) throw new Error('VALIDATION: cycle_id is required');
    if (!data.recipient_id) throw new Error('VALIDATION: recipient_id is required');
    if (!data.responder_id) throw new Error('VALIDATION: responder_id is required');
    if (RESPONDER_ROLES.indexOf(data.responder_role) === -1) {
      throw new Error('VALIDATION: Invalid responder_role. Must be one of: ' + RESPONDER_ROLES.join(', '));
    }

    var cycle = DataService.getRecordById('feedback_cycles', data.cycle_id);
    if (!cycle) throw new Error('NOT_FOUND: Feedback cycle not found');
    if (cycle.status !== 'draft' && cycle.status !== 'open') {
      throw new Error('VALIDATION: Can only assign in draft or open cycles.');
    }

    // Prevent duplicate
    var allAssignments = DataService.getRecords('feedback_assignments');
    for (var i = 0; i < allAssignments.length; i++) {
      var ex = allAssignments[i];
      if (ex.cycle_id === data.cycle_id &&
          ex.recipient_id === data.recipient_id &&
          ex.responder_id === data.responder_id &&
          ex.status !== 'cancelled' && ex.status !== 'declined') {
        throw new Error('VALIDATION: This assignment already exists.');
      }
    }

    var now = new Date().toISOString();
    var record = DataService.createRecord('feedback_assignments', {
      cycle_id:       data.cycle_id,
      recipient_id:   data.recipient_id,
      responder_id:   data.responder_id,
      responder_role: data.responder_role,
      status:         'pending',
      is_anonymous:   data.is_anonymous === true || data.is_anonymous === 'true' ? 'true' : 'false',
      submitted_at:   '',
      created_at:     now,
      updated_at:     now
    });

    logFeedbackActivity_(data.cycle_id, record.id, 'assigned', '', '',
      staffName_(data.responder_id) + ' → ' + staffName_(data.recipient_id));
    return record;
  }

  /**
   * Bulk-assigns feedback for multiple recipients.
   * responderConfig: { includeSelf, includePeers, includeSupervisor }
   */
  function bulkAssign(cycleId, recipientIds, responderConfig) {
    AuthService.requireAdmin();
    if (!cycleId) throw new Error('VALIDATION: cycleId is required');
    if (!recipientIds || recipientIds.length === 0) throw new Error('VALIDATION: recipientIds required');

    var cycle = DataService.getRecordById('feedback_cycles', cycleId);
    if (!cycle) throw new Error('NOT_FOUND: Feedback cycle not found');
    if (cycle.status !== 'draft' && cycle.status !== 'open') {
      throw new Error('VALIDATION: Can only assign in draft or open cycles.');
    }

    responderConfig = responderConfig || {};
    var map = staffMap_();
    var allAssignments = DataService.getRecords('feedback_assignments');
    var isAnonymous = cycle.allow_anonymous === 'true' ? 'true' : 'false';
    var now = new Date().toISOString();
    var created = 0;

    // Build existing assignment lookup
    var existingLookup = {};
    for (var e = 0; e < allAssignments.length; e++) {
      var ea = allAssignments[e];
      if (ea.cycle_id === cycleId && ea.status !== 'cancelled' && ea.status !== 'declined') {
        existingLookup[ea.recipient_id + '|' + ea.responder_id] = true;
      }
    }

    for (var r = 0; r < recipientIds.length; r++) {
      var recipientId = recipientIds[r];
      var recipient = map[recipientId];
      if (!recipient) continue;

      // Self-assessment
      if (responderConfig.includeSelf) {
        var selfKey = recipientId + '|' + recipientId;
        if (!existingLookup[selfKey]) {
          DataService.createRecord('feedback_assignments', {
            cycle_id: cycleId, recipient_id: recipientId, responder_id: recipientId,
            responder_role: 'self', status: 'pending', is_anonymous: 'false',
            submitted_at: '', created_at: now, updated_at: now
          });
          existingLookup[selfKey] = true;
          created++;
        }
      }

      // Peers from same department
      if (responderConfig.includePeers && recipient.department) {
        for (var id in map) {
          if (!map.hasOwnProperty(id)) continue;
          var peer = map[id];
          if (peer.id !== recipientId &&
              peer.department === recipient.department &&
              peer.is_active === 'true' &&
              peer.role !== 'admin') {
            var peerKey = recipientId + '|' + peer.id;
            if (!existingLookup[peerKey]) {
              DataService.createRecord('feedback_assignments', {
                cycle_id: cycleId, recipient_id: recipientId, responder_id: peer.id,
                responder_role: 'peer', status: 'pending', is_anonymous: isAnonymous,
                submitted_at: '', created_at: now, updated_at: now
              });
              existingLookup[peerKey] = true;
              created++;
            }
          }
        }
      }

      // Supervisor — assign admins
      if (responderConfig.includeSupervisor) {
        for (var sid in map) {
          if (!map.hasOwnProperty(sid)) continue;
          var sup = map[sid];
          if (sup.role === 'admin' && sup.id !== recipientId && sup.is_active === 'true') {
            var supKey = recipientId + '|' + sup.id;
            if (!existingLookup[supKey]) {
              DataService.createRecord('feedback_assignments', {
                cycle_id: cycleId, recipient_id: recipientId, responder_id: sup.id,
                responder_role: 'supervisor', status: 'pending', is_anonymous: 'false',
                submitted_at: '', created_at: now, updated_at: now
              });
              existingLookup[supKey] = true;
              created++;
            }
          }
        }
      }
    }

    logFeedbackActivity_(cycleId, '', 'bulk_assigned', '', '', created + ' assignments created');
    return { created: created };
  }

  /**
   * Declines a feedback assignment (responder only).
   */
  function declineAssignment(assignmentId) {
    AuthService.requireAuth();
    if (!assignmentId) throw new Error('VALIDATION: assignmentId is required');

    var assignment = DataService.getRecordById('feedback_assignments', assignmentId);
    if (!assignment) throw new Error('NOT_FOUND: Assignment not found');

    var user = AuthService.getCurrentUser();
    if (assignment.responder_id !== user.id && user.role !== 'admin') {
      throw new Error('AUTH_DENIED: You can only decline your own assignments.');
    }

    if (assignment.status === 'submitted') {
      throw new Error('VALIDATION: Cannot decline an already submitted assignment.');
    }

    logFeedbackActivity_(assignment.cycle_id, assignmentId, 'declined', 'status', assignment.status, 'declined');

    return DataService.updateRecord('feedback_assignments', assignmentId, {
      status: 'declined',
      updated_at: new Date().toISOString()
    });
  }

  // ═══════════════════════════════════════════════
  // Response functions
  // ═══════════════════════════════════════════════

  /**
   * Submits feedback responses for an assignment.
   * @param {string} assignmentId
   * @param {Array} answers - [{ question_id, rating, response_text }]
   */
  function submitResponse(assignmentId, answers) {
    AuthService.requireAuth();
    if (!assignmentId) throw new Error('VALIDATION: assignmentId is required');
    if (!answers || answers.length === 0) throw new Error('VALIDATION: answers are required');

    var assignment = DataService.getRecordById('feedback_assignments', assignmentId);
    if (!assignment) throw new Error('NOT_FOUND: Assignment not found');

    var user = AuthService.getCurrentUser();
    if (assignment.responder_id !== user.id) {
      throw new Error('AUTH_DENIED: This assignment belongs to another user.');
    }

    if (assignment.status === 'submitted') {
      throw new Error('VALIDATION: This assignment has already been submitted.');
    }
    if (assignment.status === 'declined') {
      throw new Error('VALIDATION: This assignment was declined.');
    }

    var cycle = DataService.getRecordById('feedback_cycles', assignment.cycle_id);
    if (!cycle || cycle.status !== 'open') {
      throw new Error('VALIDATION: This cycle is not currently open for responses.');
    }

    // Get questions for validation
    var allQuestions = DataService.getRecords('feedback_questions');
    var questionMap = {};
    var requiredIds = [];
    for (var q = 0; q < allQuestions.length; q++) {
      if (allQuestions[q].cycle_id === assignment.cycle_id) {
        questionMap[allQuestions[q].id] = allQuestions[q];
        if (allQuestions[q].is_required === 'true') {
          requiredIds.push(allQuestions[q].id);
        }
      }
    }

    // Validate all required questions answered
    var answeredIds = {};
    for (var a = 0; a < answers.length; a++) {
      answeredIds[answers[a].question_id] = true;
    }
    for (var r = 0; r < requiredIds.length; r++) {
      if (!answeredIds[requiredIds[r]]) {
        var reqQ = questionMap[requiredIds[r]];
        throw new Error('VALIDATION: Required question not answered: ' + (reqQ ? reqQ.question_text : requiredIds[r]));
      }
    }

    // Delete existing draft responses
    var allResponses = DataService.getRecords('feedback_responses');
    for (var d = 0; d < allResponses.length; d++) {
      if (allResponses[d].assignment_id === assignmentId) {
        DataService.deleteRecord('feedback_responses', allResponses[d].id);
      }
    }

    // Create responses
    var now = new Date().toISOString();
    for (var i = 0; i < answers.length; i++) {
      var ans = answers[i];
      var question = questionMap[ans.question_id];
      if (!question) continue;

      // Validate rating
      if ((question.question_type === 'rating' || question.question_type === 'both') && ans.rating) {
        var rating = parseInt(ans.rating, 10);
        if (rating < 1 || rating > 5) {
          throw new Error('VALIDATION: Rating must be between 1 and 5.');
        }
      }

      DataService.createRecord('feedback_responses', {
        assignment_id: assignmentId,
        question_id:   ans.question_id,
        rating:        ans.rating ? String(ans.rating) : '',
        response_text: ans.response_text || '',
        created_at:    now,
        updated_at:    now
      });
    }

    // Update assignment status
    DataService.updateRecord('feedback_assignments', assignmentId, {
      status: 'submitted',
      submitted_at: now,
      updated_at: now
    });

    logFeedbackActivity_(assignment.cycle_id, assignmentId, 'response_submitted', '', '',
      assignment.responder_role + ' feedback');

    return { success: true };
  }

  /**
   * Saves draft responses (partial, no validation).
   */
  function saveResponseDraft(assignmentId, answers) {
    AuthService.requireAuth();
    if (!assignmentId) throw new Error('VALIDATION: assignmentId is required');

    var assignment = DataService.getRecordById('feedback_assignments', assignmentId);
    if (!assignment) throw new Error('NOT_FOUND: Assignment not found');

    var user = AuthService.getCurrentUser();
    if (assignment.responder_id !== user.id) {
      throw new Error('AUTH_DENIED: This assignment belongs to another user.');
    }
    if (assignment.status === 'submitted') {
      throw new Error('VALIDATION: Cannot save draft for submitted assignment.');
    }

    // Delete existing draft responses
    var allResponses = DataService.getRecords('feedback_responses');
    for (var d = 0; d < allResponses.length; d++) {
      if (allResponses[d].assignment_id === assignmentId) {
        DataService.deleteRecord('feedback_responses', allResponses[d].id);
      }
    }

    // Save new drafts
    var now = new Date().toISOString();
    for (var i = 0; i < answers.length; i++) {
      var ans = answers[i];
      if (ans.rating || ans.response_text) {
        DataService.createRecord('feedback_responses', {
          assignment_id: assignmentId,
          question_id:   ans.question_id,
          rating:        ans.rating ? String(ans.rating) : '',
          response_text: ans.response_text || '',
          created_at:    now,
          updated_at:    now
        });
      }
    }

    // Update assignment to in_progress if still pending
    if (assignment.status === 'pending') {
      DataService.updateRecord('feedback_assignments', assignmentId, {
        status: 'in_progress',
        updated_at: now
      });
    }

    return { success: true };
  }

  // ═══════════════════════════════════════════════
  // Summary functions
  // ═══════════════════════════════════════════════

  /**
   * Generates a feedback summary for one recipient in a cycle.
   */
  function generateSummary(cycleId, recipientId) {
    AuthService.requireAdmin();
    if (!cycleId) throw new Error('VALIDATION: cycleId is required');
    if (!recipientId) throw new Error('VALIDATION: recipientId is required');

    var cycle = DataService.getRecordById('feedback_cycles', cycleId);
    if (!cycle) throw new Error('NOT_FOUND: Feedback cycle not found');

    // Get all submitted assignments for this recipient in this cycle
    var allAssignments = DataService.getRecords('feedback_assignments');
    var submittedIds = [];
    for (var a = 0; a < allAssignments.length; a++) {
      var asg = allAssignments[a];
      if (asg.cycle_id === cycleId && asg.recipient_id === recipientId && asg.status === 'submitted') {
        submittedIds.push(asg.id);
      }
    }

    // Get questions for this cycle (need discipline_tag)
    var allQuestions = DataService.getRecords('feedback_questions');
    var questionMap = {};
    for (var qi = 0; qi < allQuestions.length; qi++) {
      if (allQuestions[qi].cycle_id === cycleId) {
        questionMap[allQuestions[qi].id] = allQuestions[qi];
      }
    }

    // Get all responses for those assignments
    var allResponses = DataService.getRecords('feedback_responses');
    var ratingSum = 0;
    var ratingCount = 0;

    // Multiplier/diminisher discipline tag aggregation
    var disciplineSums = {};
    var disciplineCounts = {};

    for (var r = 0; r < allResponses.length; r++) {
      var resp = allResponses[r];
      if (submittedIds.indexOf(resp.assignment_id) !== -1 && resp.rating) {
        var val = parseFloat(resp.rating);
        if (!isNaN(val)) {
          ratingSum += val;
          ratingCount++;

          // Aggregate by discipline tag if present
          var question = questionMap[resp.question_id];
          if (question && question.discipline_tag) {
            var tag = question.discipline_tag;
            if (!disciplineSums[tag]) { disciplineSums[tag] = 0; disciplineCounts[tag] = 0; }
            disciplineSums[tag] += val;
            disciplineCounts[tag]++;
          }
        }
      }
    }

    var avgRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;
    var responseCount = submittedIds.length;
    var minResponses = parseInt(cycle.min_responses, 10) || 3;
    var thresholdMet = responseCount >= minResponses;

    // Build multiplier profile JSON if discipline tags were used
    var multiplierProfileJson = '';
    var tagKeys = Object.keys(disciplineSums);
    if (tagKeys.length > 0) {
      var profile = {};
      for (var tk = 0; tk < tagKeys.length; tk++) {
        var tKey = tagKeys[tk];
        profile[tKey] = {
          avg: Math.round((disciplineSums[tKey] / disciplineCounts[tKey]) * 10) / 10,
          count: disciplineCounts[tKey]
        };
      }
      multiplierProfileJson = JSON.stringify(profile);
    }

    // Check for existing summary
    var allSummaries = DataService.getRecords('feedback_summaries');
    var existingSummary = null;
    for (var s = 0; s < allSummaries.length; s++) {
      if (allSummaries[s].cycle_id === cycleId && allSummaries[s].recipient_id === recipientId) {
        existingSummary = allSummaries[s];
        break;
      }
    }

    var now = new Date().toISOString();
    var result;

    if (existingSummary) {
      result = DataService.updateRecord('feedback_summaries', existingSummary.id, {
        avg_rating:             String(avgRating),
        response_count:         String(responseCount),
        threshold_met:          thresholdMet ? 'true' : 'false',
        multiplier_profile_json: multiplierProfileJson,
        updated_at:             now
      });
    } else {
      result = DataService.createRecord('feedback_summaries', {
        cycle_id:               cycleId,
        recipient_id:           recipientId,
        avg_rating:             String(avgRating),
        response_count:         String(responseCount),
        threshold_met:          thresholdMet ? 'true' : 'false',
        multiplier_profile_json: multiplierProfileJson,
        admin_notes:            '',
        shared_with_recipient:  'false',
        shared_at:              '',
        linked_selection_id:    '',
        created_at:             now,
        updated_at:             now
      });
    }

    logFeedbackActivity_(cycleId, '', 'summary_generated', '', '',
      staffName_(recipientId) + ': ' + avgRating + ' avg (' + responseCount + ' responses)');

    return result;
  }

  /**
   * Generates summaries for ALL recipients in a cycle.
   */
  function generateAllSummaries(cycleId) {
    AuthService.requireAdmin();
    if (!cycleId) throw new Error('VALIDATION: cycleId is required');

    var allAssignments = DataService.getRecords('feedback_assignments');
    var recipientIds = {};
    for (var a = 0; a < allAssignments.length; a++) {
      if (allAssignments[a].cycle_id === cycleId) {
        recipientIds[allAssignments[a].recipient_id] = true;
      }
    }

    var generated = 0;
    for (var id in recipientIds) {
      if (recipientIds.hasOwnProperty(id)) {
        generateSummary(cycleId, id);
        generated++;
      }
    }

    return { generated: generated };
  }

  /**
   * Shares a summary with its recipient (only if threshold met).
   */
  function shareSummary(summaryId) {
    AuthService.requireAdmin();
    if (!summaryId) throw new Error('VALIDATION: summaryId is required');

    var summary = DataService.getRecordById('feedback_summaries', summaryId);
    if (!summary) throw new Error('NOT_FOUND: Summary not found');

    if (summary.threshold_met !== 'true') {
      throw new Error('VALIDATION: Cannot share summary that has not met the minimum response threshold.');
    }

    var now = new Date().toISOString();
    logFeedbackActivity_(summary.cycle_id, '', 'summary_shared', '', '',
      staffName_(summary.recipient_id) + ' summary shared');

    return DataService.updateRecord('feedback_summaries', summaryId, {
      shared_with_recipient: 'true',
      shared_at: now,
      updated_at: now
    });
  }

  // ═══════════════════════════════════════════════
  // My Feedback functions
  // ═══════════════════════════════════════════════

  /**
   * Returns all assignments where the user is a responder.
   */
  function getMyAssignments(staffId) {
    if (!staffId) throw new Error('VALIDATION: staffId is required');

    var allAssignments = DataService.getRecords('feedback_assignments');
    var allCycles = DataService.getRecords('feedback_cycles');

    // Build cycle lookup
    var cycleLookup = {};
    for (var c = 0; c < allCycles.length; c++) {
      cycleLookup[allCycles[c].id] = allCycles[c];
    }

    var result = [];
    for (var a = 0; a < allAssignments.length; a++) {
      var asg = allAssignments[a];
      if (asg.responder_id === staffId) {
        var cycle = cycleLookup[asg.cycle_id];
        result.push({
          id:              asg.id,
          cycle_id:        asg.cycle_id,
          cycle_name:      cycle ? cycle.cycle_name : 'Unknown',
          cycle_status:    cycle ? cycle.status : '',
          feedback_type:   cycle ? cycle.feedback_type : '',
          close_date:      cycle ? cycle.close_date : '',
          recipient_id:    asg.recipient_id,
          recipient_name:  staffName_(asg.recipient_id),
          responder_role:  asg.responder_role,
          status:          asg.status,
          is_anonymous:    asg.is_anonymous === 'true',
          submitted_at:    asg.submitted_at,
          created_at:      asg.created_at
        });
      }
    }

    // Sort: pending first, then by date
    result.sort(function(a, b) {
      var statusOrder = { pending: 0, in_progress: 1, submitted: 2, declined: 3 };
      var aOrder = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 9;
      var bOrder = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 9;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    return result;
  }

  /**
   * Returns assignment detail with questions and existing responses (for the form).
   */
  function getAssignmentDetail(assignmentId) {
    AuthService.requireAuth();
    if (!assignmentId) throw new Error('VALIDATION: assignmentId is required');

    var assignment = DataService.getRecordById('feedback_assignments', assignmentId);
    if (!assignment) throw new Error('NOT_FOUND: Assignment not found');

    var user = AuthService.getCurrentUser();
    if (assignment.responder_id !== user.id && user.role !== 'admin') {
      throw new Error('AUTH_DENIED: You can only view your own assignments.');
    }

    var cycle = DataService.getRecordById('feedback_cycles', assignment.cycle_id);

    // Get questions
    var allQuestions = DataService.getRecords('feedback_questions');
    var questions = [];
    for (var q = 0; q < allQuestions.length; q++) {
      if (allQuestions[q].cycle_id === assignment.cycle_id) {
        questions.push(allQuestions[q]);
      }
    }
    questions.sort(function(a, b) {
      return (parseInt(a.sort_order, 10) || 0) - (parseInt(b.sort_order, 10) || 0);
    });

    // Get existing responses (drafts)
    var allResponses = DataService.getRecords('feedback_responses');
    var drafts = {};
    for (var r = 0; r < allResponses.length; r++) {
      if (allResponses[r].assignment_id === assignmentId) {
        drafts[allResponses[r].question_id] = {
          rating:        allResponses[r].rating,
          response_text: allResponses[r].response_text
        };
      }
    }

    return {
      id:             assignment.id,
      cycle_id:       assignment.cycle_id,
      cycle_name:     cycle ? cycle.cycle_name : 'Unknown',
      cycle_status:   cycle ? cycle.status : '',
      feedback_type:  cycle ? cycle.feedback_type : '',
      recipient_id:   assignment.recipient_id,
      recipient_name: staffName_(assignment.recipient_id),
      responder_role: assignment.responder_role,
      status:         assignment.status,
      is_anonymous:   assignment.is_anonymous === 'true',
      questions:      questions,
      drafts:         drafts
    };
  }

  // ═══════════════════════════════════════════════
  // Integration & Statistics
  // ═══════════════════════════════════════════════

  /**
   * Links a feedback summary to a Growth Plan standard selection.
   */
  function linkSummaryToStandard(summaryId, selectionId) {
    AuthService.requireAuth();
    if (!summaryId) throw new Error('VALIDATION: summaryId is required');
    if (!selectionId) throw new Error('VALIDATION: selectionId is required');

    var summary = DataService.getRecordById('feedback_summaries', summaryId);
    if (!summary) throw new Error('NOT_FOUND: Summary not found');

    // Only the recipient or admin can link
    var user = AuthService.getCurrentUser();
    if (summary.recipient_id !== user.id && user.role !== 'admin') {
      throw new Error('AUTH_DENIED: Only the feedback recipient or admin can link evidence.');
    }

    if (summary.shared_with_recipient !== 'true' && user.role !== 'admin') {
      throw new Error('VALIDATION: Summary must be shared before linking to growth plan.');
    }

    // Get cycle for name/date
    var cycle = DataService.getRecordById('feedback_cycles', summary.cycle_id);
    var cycleName = cycle ? cycle.cycle_name : 'Feedback';
    var closeDate = cycle ? cycle.close_date : '';
    var dateStr = closeDate ? closeDate.substring(0, 10) : new Date().toISOString().substring(0, 10);
    var avgRating = parseFloat(summary.avg_rating) || 0;

    // Append evidence text to the standard selection
    var sel = DataService.getRecordById('pgp_standard_selections', selectionId);
    if (!sel) throw new Error('NOT_FOUND: Standard selection not found');

    var evidenceText = '[360: ' + cycleName + ' (' + dateStr + ') - ' + avgRating + '\u2605]';
    var existingEvidence = sel.evidence_linked || '';
    var newEvidence = existingEvidence ? (existingEvidence + '\n' + evidenceText) : evidenceText;

    GrowthPlanService.updateStandardSelection(selectionId, {
      evidence_linked: newEvidence
    });

    // Update summary with linked selection
    DataService.updateRecord('feedback_summaries', summaryId, {
      linked_selection_id: selectionId,
      updated_at: new Date().toISOString()
    });

    logFeedbackActivity_(summary.cycle_id, '', 'evidence_linked', '', '', evidenceText);

    return { success: true, evidenceText: evidenceText };
  }

  /**
   * Returns aggregate statistics for feedback module.
   */
  function getStats() {
    var cycles = DataService.getRecords('feedback_cycles');
    var assignments = DataService.getRecords('feedback_assignments');
    var responses = DataService.getRecords('feedback_responses');

    var totalCycles = cycles.length;
    var openCycles = 0;
    var closedCycles = 0;
    var byCycleType = {};

    for (var c = 0; c < cycles.length; c++) {
      var cy = cycles[c];
      if (cy.status === 'open') openCycles++;
      if (cy.status === 'closed') closedCycles++;
      var ft = cy.feedback_type || 'other';
      byCycleType[ft] = (byCycleType[ft] || 0) + 1;
    }

    var totalAssignments = assignments.length;
    var submittedCount = 0;
    for (var a = 0; a < assignments.length; a++) {
      if (assignments[a].status === 'submitted') submittedCount++;
    }

    var completionRate = totalAssignments > 0
      ? Math.round((submittedCount / totalAssignments) * 100)
      : 0;

    // Average rating across all responses
    var ratingSum = 0;
    var ratingCount = 0;
    for (var r = 0; r < responses.length; r++) {
      if (responses[r].rating) {
        var val = parseFloat(responses[r].rating);
        if (!isNaN(val)) {
          ratingSum += val;
          ratingCount++;
        }
      }
    }
    var avgRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;

    return {
      totalCycles:      totalCycles,
      openCycles:       openCycles,
      closedCycles:     closedCycles,
      totalAssignments: totalAssignments,
      submittedCount:   submittedCount,
      completionRate:   completionRate,
      avgRating:        avgRating,
      byCycleType:      byCycleType
    };
  }

  /**
   * Returns activity log for a cycle.
   */
  function getActivity(cycleId, limit) {
    if (!cycleId) throw new Error('VALIDATION: cycleId is required');
    limit = limit || 50;

    var allActivity = DataService.getRecords('feedback_activity');
    var filtered = [];
    for (var i = 0; i < allActivity.length; i++) {
      if (allActivity[i].cycle_id === cycleId) {
        filtered.push(allActivity[i]);
      }
    }

    filtered.sort(function(a, b) {
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    return hydrateFeedbackActivity_(filtered.slice(0, limit));
  }

  // ═══════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════

  return {
    // Cycles
    getCyclesOverview:     getCyclesOverview,
    getCycleDetail:        getCycleDetail,
    createCycle:           createCycle,
    updateCycle:           updateCycle,
    updateCycleStatus:     updateCycleStatus,

    // Questions
    addQuestion:           addQuestion,
    updateQuestion:        updateQuestion,
    deleteQuestion:        deleteQuestion,

    // Assignments
    createAssignment:      createAssignment,
    bulkAssign:            bulkAssign,
    declineAssignment:     declineAssignment,

    // Responses
    submitResponse:        submitResponse,
    saveResponseDraft:     saveResponseDraft,

    // Summaries
    generateSummary:       generateSummary,
    generateAllSummaries:  generateAllSummaries,
    shareSummary:          shareSummary,

    // My Feedback
    getMyAssignments:      getMyAssignments,
    getAssignmentDetail:   getAssignmentDetail,

    // Integration & Stats
    linkSummaryToStandard: linkSummaryToStandard,
    getStats:              getStats,
    getActivity:           getActivity
  };

})();
