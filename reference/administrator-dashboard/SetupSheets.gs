/**
 * SetupSheets.gs — Schema creation and validation
 *
 * Each phase has a dedicated setup function. All are idempotent —
 * running them again will NOT overwrite existing data.
 *
 * Run from the Apps Script editor: select function → Run.
 */

// ═══════════════════════════════════════════════
// Phase 0a: Foundation tables
// ═══════════════════════════════════════════════

/**
 * Creates all Phase 0a tables: _meta, _config, _logs, staff, timetable,
 * observations, observation_schedule.
 */
function setupPhase0a() {
  Logger.log('=== Setting up Phase 0a tables ===');

  // _meta — schema version tracking
  createTable_('_meta', ['id', 'version', 'description', 'applied_at']);
  seedMetaVersion_('0.1.0', 'Phase 0a: Foundation tables');

  // _config — application settings
  createTable_('_config', ['id', 'key', 'value', 'description', 'updated_at']);

  // _logs — error/debug logging
  createTable_('_logs', ['id', 'timestamp', 'severity', 'function_name', 'message', 'stack', 'user_email']);

  // staff — staff directory
  createTable_('staff', [
    'id', 'email', 'first_name', 'last_name', 'role', 'department',
    'employment_status', 'hire_date', 'is_active'
  ]);

  // timetable — master teaching schedule
  createTable_('timetable', [
    'id', 'staff_id', 'day_of_week', 'period', 'period_start_time',
    'period_end_time', 'course_name', 'room', 'is_prep'
  ]);

  // observations
  createTable_('observations', [
    'id', 'observer_id', 'teacher_id', 'observation_date', 'observation_type',
    'duration_minutes', 'course_observed', 'room', 'tags',
    'student_engagement_rating', 'instructional_strategy_rating', 'environment_rating',
    'notes', 'commendations', 'recommendations',
    'follow_up_needed', 'follow_up_date', 'follow_up_completed',
    'shared_with_teacher', 'created_at'
  ]);

  // observation_schedule
  createTable_('observation_schedule', [
    'id', 'teacher_id', 'observer_id', 'planned_date', 'planned_period',
    'observation_type', 'status', 'linked_observation_id'
  ]);

  // Apply data validation where useful
  applyStaffValidation_();
  applyObservationValidation_();

  Logger.log('=== Phase 0a setup complete ===');
}

// ═══════════════════════════════════════════════
// Phase 2: Kanban tables
// ═══════════════════════════════════════════════

function setupPhase2() {
  Logger.log('=== Setting up Phase 2 (Kanban) tables ===');

  createTable_('kanban_boards', [
    'id', 'title', 'description', 'created_by', 'created_at', 'is_archived'
  ]);

  createTable_('kanban_columns', [
    'id', 'board_id', 'title', 'position', 'color', 'wip_limit'
  ]);

  createTable_('kanban_cards', [
    'id', 'board_id', 'column_id', 'title', 'description', 'assigned_to',
    'priority', 'due_date', 'labels', 'position',
    'created_by', 'created_at', 'updated_at'
  ]);

  createTable_('kanban_comments', [
    'id', 'card_id', 'author_id', 'content', 'created_at'
  ]);

  seedMetaVersion_('0.2.0', 'Phase 2: Kanban tables');
  Logger.log('=== Phase 2 setup complete ===');
}

// ═══════════════════════════════════════════════
// Phase 2b: Kanban Enhancements — checklists + activity log
// ═══════════════════════════════════════════════

function setupPhase2b() {
  Logger.log('=== Setting up Phase 2b (Kanban Enhancements) tables ===');

  createTable_('kanban_checklists', [
    'id', 'card_id', 'text', 'is_checked', 'sort_order', 'created_at', 'updated_at'
  ]);

  createTable_('kanban_activity', [
    'id', 'card_id', 'board_id', 'user_id', 'action_type',
    'field_name', 'old_value', 'new_value', 'created_at'
  ]);

  // BASB-inspired fields: PARA category + progressive summarization
  addColumnsIfMissing_('kanban_cards', ['category', 'key_takeaway']);

  seedMetaVersion_('0.2.1', 'Phase 2b: Kanban checklists and activity log');
  Logger.log('=== Phase 2b setup complete ===');
}

// ═══════════════════════════════════════════════
// Phase 3: Growth Plans tables
// ═══════════════════════════════════════════════

function setupPhase3() {
  Logger.log('=== Setting up Phase 3 (Growth Plans) tables ===');

  createTable_('growth_plans', [
    'id', 'staff_id', 'academic_year', 'supervisor_id', 'status',
    'created_at', 'updated_at'
  ]);

  createTable_('growth_goals', [
    'id', 'plan_id', 'goal_text', 'goal_category', 'target_date', 'status',
    'evidence_summary', 'created_at', 'updated_at'
  ]);

  createTable_('growth_meetings', [
    'id', 'plan_id', 'meeting_date', 'meeting_type', 'attendees',
    'notes', 'action_items', 'next_meeting_date', 'created_by', 'created_at'
  ]);

  createTable_('growth_evidence', [
    'id', 'goal_id', 'title', 'description', 'drive_file_id',
    'drive_file_url', 'uploaded_by', 'uploaded_at'
  ]);

  seedMetaVersion_('0.3.0', 'Phase 3: Growth Plans tables');
  Logger.log('=== Phase 3 setup complete ===');
}

// ═══════════════════════════════════════════════
// Phase 3b: PGP Redesign — Standards-based growth plans
// ═══════════════════════════════════════════════

/**
 * Adds columns to an existing table if they don't already exist.
 * @param {string} tableName
 * @param {string[]} newColumns
 */
function addColumnsIfMissing_(tableName, newColumns) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tableName);
    if (!sheet) {
      Logger.log('  Table ' + tableName + ' not found, skipping column additions.');
      return;
    }
    var lastCol = sheet.getLastColumn();
    var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    var added = [];
    for (var i = 0; i < newColumns.length; i++) {
      if (headers.indexOf(newColumns[i]) === -1) {
        var nextCol = lastCol + added.length + 1;
        sheet.getRange(1, nextCol).setValue(newColumns[i]).setFontWeight('bold');
        added.push(newColumns[i]);
      }
    }
    if (added.length > 0) {
      Logger.log('  Added columns to ' + tableName + ': ' + added.join(', '));
    } else {
      Logger.log('  All columns already exist in ' + tableName);
    }
  } catch (e) {
    Logger.log('  Warning: Could not add columns to ' + tableName + ': ' + e.message);
  }
}

function setupPhase3b() {
  Logger.log('=== Setting up Phase 3b (PGP Redesign) tables ===');

  // Professional Growth Standards library (admin-configurable)
  createTable_('pgp_standards', [
    'id', 'standard_number', 'short_name', 'hashtag', 'description',
    'is_mandatory', 'is_active', 'sort_order', 'created_at', 'updated_at'
  ]);

  // Per-standard selections with all 5 PGP fields
  createTable_('pgp_standard_selections', [
    'id', 'plan_id', 'standard_id', 'year_in_cycle',
    'initial_goal', 'success_criteria', 'evidence_planned',
    'reflection', 'evidence_linked', 'supervisor_comments',
    'status', 'sort_order', 'created_at', 'updated_at'
  ]);

  // Multi-year cycle tracking (Standards at a Glance)
  createTable_('pgp_cycle_history', [
    'id', 'staff_id', 'academic_year', 'year_in_cycle',
    'standard_id', 'created_at', 'updated_at'
  ]);

  // Add new columns to existing growth_plans table
  addColumnsIfMissing_('growth_plans', [
    'division', 'years_at_school', 'faculty_signed_date', 'supervisor_signed_date'
  ]);

  seedMetaVersion_('0.3.1', 'Phase 3b: PGP Redesign — standards, selections, cycle tracking');
  Logger.log('=== Phase 3b setup complete ===');
}

// ═══════════════════════════════════════════════
// Phase 3c: DDO — Growing Edge + Immunity to Change
// ═══════════════════════════════════════════════

function setupPhase3c() {
  Logger.log('=== Setting up Phase 3c (DDO: Growing Edge + ITC) ===');

  // Add DDO columns to existing growth_plans
  addColumnsIfMissing_('growth_plans', [
    'growing_edge_summary', 'growing_edge_visibility'
  ]);

  // Add growing edge + stretch challenge columns to standard selections
  addColumnsIfMissing_('pgp_standard_selections', [
    'growing_edge', 'stretch_challenge', 'stretch_challenge_set_by'
  ]);

  // Immunity to Change maps (1 per standard selection, optional)
  createTable_('itc_maps', [
    'id', 'selection_id', 'staff_id',
    'commitment', 'doing_not_doing', 'competing_commitments', 'big_assumptions',
    'status', 'reflection_notes', 'created_at', 'updated_at'
  ]);

  seedMetaVersion_('0.3.2', 'Phase 3c: DDO — Growing Edge, ITC maps, stretch challenges');
  Logger.log('=== Phase 3c setup complete ===');
}

// ═══════════════════════════════════════════════
// Phase 3d: DDO — Coaching Triads
// ═══════════════════════════════════════════════

function setupPhase3d() {
  Logger.log('=== Setting up Phase 3d (DDO: Coaching Triads) ===');

  createTable_('coaching_groups', [
    'id', 'group_name', 'group_type', 'academic_year',
    'facilitator_id', 'status', 'meeting_frequency_weeks',
    'created_by', 'created_at', 'updated_at'
  ]);

  createTable_('coaching_group_members', [
    'id', 'group_id', 'staff_id', 'role', 'joined_at', 'left_at'
  ]);

  createTable_('coaching_meetings', [
    'id', 'group_id', 'meeting_date', 'facilitator_id', 'attendees_csv',
    'topic', 'growing_edge_discussed', 'key_insights', 'action_commitments',
    'next_meeting_date', 'created_by', 'created_at'
  ]);

  seedMetaVersion_('0.3.3', 'Phase 3d: DDO — Coaching triads, group members, meetings');
  Logger.log('=== Phase 3d setup complete ===');
}

// ═══════════════════════════════════════════════
// Phase 10a-b: Multiplier Effect — Observations + Feedback
// ═══════════════════════════════════════════════

function setupMultiplier() {
  Logger.log('=== Setting up Multiplier Effect tables ===');

  // Add 5 Multiplier discipline ratings to observations
  addColumnsIfMissing_('observations', [
    'multiplier_talent_finder', 'multiplier_liberator',
    'multiplier_challenger', 'multiplier_debate_maker', 'multiplier_investor'
  ]);

  // Add discipline tag to feedback questions + multiplier profile to summaries
  addColumnsIfMissing_('feedback_questions', ['discipline_tag']);
  addColumnsIfMissing_('feedback_summaries', ['multiplier_profile_json']);

  // Add config toggle for multiplier ratings
  var configs = DataService.getRecords('_config');
  var hasMultiplierConfig = configs.some(function(c) { return c.key === 'multiplier_ratings_enabled'; });
  if (!hasMultiplierConfig) {
    DataService.createRecord('_config', {
      key: 'multiplier_ratings_enabled',
      value: 'true',
      description: 'Enable Multiplier Effect ratings on observations'
    });
  }

  seedMetaVersion_('0.10.0', 'Multiplier Effect — observation ratings, feedback discipline tags');
  Logger.log('=== Multiplier setup complete ===');
}

// ═══════════════════════════════════════════════
// Phase 11a: Wellness-DDO Integration
// ═══════════════════════════════════════════════

function setupWellnessDDO() {
  Logger.log('=== Setting up Wellness-DDO integration ===');

  addColumnsIfMissing_('wellness_checkins', ['developmental_comfort']);

  seedMetaVersion_('0.11.0', 'Wellness-DDO — developmental comfort dimension');
  Logger.log('=== Wellness-DDO setup complete ===');
}

// ═══════════════════════════════════════════════
// Phase 4: Waterfall Projects tables
// ═══════════════════════════════════════════════

function setupPhase4() {
  Logger.log('=== Setting up Phase 4 (Projects) tables ===');

  createTable_('projects', [
    'id', 'title', 'description', 'owner_id', 'status',
    'start_date', 'target_end_date', 'actual_end_date', 'created_at'
  ]);

  createTable_('project_phases', [
    'id', 'project_id', 'title', 'description', 'phase_order',
    'start_date', 'end_date', 'status', 'depends_on_phase_id'
  ]);

  createTable_('project_tasks', [
    'id', 'phase_id', 'project_id', 'title', 'assigned_to',
    'due_date', 'status', 'notes', 'created_at', 'updated_at'
  ]);

  seedMetaVersion_('0.4.0', 'Phase 4: Waterfall Projects tables');
  Logger.log('=== Phase 4 setup complete ===');
}

// ═══════════════════════════════════════════════
// Phase 4b: Project Enhancement tables
// ═══════════════════════════════════════════════

function setupPhase4b() {
  Logger.log('=== Setting up Phase 4b (Project Enhancements) tables ===');

  createTable_('project_risks', [
    'id', 'project_id', 'title', 'description', 'category',
    'likelihood', 'impact', 'risk_score', 'mitigation_strategy',
    'owner_id', 'status', 'identified_date', 'created_at', 'updated_at'
  ]);

  createTable_('project_activity', [
    'id', 'task_id', 'project_id', 'user_id', 'action_type',
    'field_name', 'old_value', 'new_value', 'created_at'
  ]);

  createTable_('project_comments', [
    'id', 'task_id', 'project_id', 'author_id', 'content', 'created_at'
  ]);

  seedMetaVersion_('0.4.1', 'Phase 4b: Project risks, activity log, comments');
  Logger.log('=== Phase 4b setup complete ===');
}

// ═══════════════════════════════════════════════
// Phase 5: Change Management tables
// ═══════════════════════════════════════════════

function setupPhase5() {
  Logger.log('=== Setting up Phase 5 (Change Management) tables ===');

  createTable_('initiatives', [
    'id', 'title', 'description', 'champion_id', 'status',
    'start_date', 'target_date', 'created_at', 'updated_at'
  ]);

  createTable_('knoster_assessments', [
    'id', 'initiative_id', 'assessed_by', 'assessed_at',
    'vision_score', 'vision_notes',
    'skills_score', 'skills_notes',
    'incentives_score', 'incentives_notes',
    'resources_score', 'resources_notes',
    'action_plan_score', 'action_plan_notes',
    'consensus_score', 'consensus_notes',
    'predicted_risk', 'overall_readiness'
  ]);

  createTable_('lippitt_phases', [
    'id', 'initiative_id', 'phase_number', 'phase_name', 'status',
    'entry_date', 'completion_date', 'key_actions', 'evidence',
    'blockers', 'updated_by', 'updated_at'
  ]);

  createTable_('initiative_stakeholders', [
    'id', 'initiative_id', 'staff_id', 'role', 'engagement_level', 'notes'
  ]);

  seedMetaVersion_('0.5.0', 'Phase 5: Change Management tables');
  Logger.log('=== Phase 5 setup complete ===');
}

// ── Phase 5b: CM Communications table ──

function setupPhase5b() {
  Logger.log('=== Setting up Phase 5b (CM Communications) table ===');

  createTable_('cm_communications', [
    'id', 'initiative_id', 'stakeholder_id', 'audience_description',
    'message_type', 'channel', 'subject', 'content',
    'scheduled_date', 'sent_date', 'sent_by', 'status', 'notes', 'created_at'
  ]);

  seedMetaVersion_('0.5.1', 'Phase 5b: CM communications table');
  Logger.log('=== Phase 5b setup complete ===');
}

// ═══════════════════════════════════════════════
// Phase 6: Accreditation tables
// ═══════════════════════════════════════════════

function setupPhase6() {
  Logger.log('=== Setting up Phase 6 (Accreditation) tables ===');

  createTable_('accreditation_frameworks', [
    'id', 'name', 'description', 'visit_date', 'status', 'created_at'
  ]);

  createTable_('accreditation_standards', [
    'id', 'framework_id', 'domain', 'standard_code', 'standard_text', 'position'
  ]);

  createTable_('accreditation_evidence', [
    'id', 'standard_id', 'title', 'description', 'drive_file_id',
    'drive_file_url', 'file_type', 'uploaded_by', 'uploaded_at',
    'status', 'reviewer_id', 'review_notes'
  ]);

  createTable_('accreditation_narratives', [
    'id', 'standard_id', 'narrative_text', 'author_id', 'version',
    'status', 'created_at', 'updated_at'
  ]);

  seedMetaVersion_('0.6.0', 'Phase 6: Accreditation tables');
  Logger.log('=== Phase 6 setup complete ===');
}

// ═══════════════════════════════════════════════
// Meeting Minutes tables
// ═══════════════════════════════════════════════

function setupMeetingMinutes() {
  Logger.log('=== Setting up Meeting Minutes tables ===');

  createTable_('meetings', [
    'id', 'title', 'meeting_type', 'meeting_date', 'start_time', 'end_time',
    'location', 'organizer_id', 'attendees_csv', 'status', 'agenda', 'notes',
    'created_by', 'created_at', 'updated_at'
  ]);

  createTable_('meeting_action_items', [
    'id', 'meeting_id', 'title', 'description', 'assigned_to', 'due_date',
    'status', 'priority', 'linked_task_type', 'linked_task_id', 'position',
    'created_at', 'updated_at'
  ]);

  createTable_('meeting_activity', [
    'id', 'meeting_id', 'action_item_id', 'user_id', 'action_type',
    'field_name', 'old_value', 'new_value', 'created_at'
  ]);

  seedMetaVersion_('0.8.0', 'Meeting Minutes module');
  Logger.log('=== Meeting Minutes setup complete ===');
}

// ═══════════════════════════════════════════════
// PD Tracking (pd_offerings, pd_registrations, pd_reflections, pd_activity)
// ═══════════════════════════════════════════════

function setupPDTracking() {
  Logger.log('=== Setting up PD Tracking tables ===');

  createTable_('pd_offerings', [
    'id', 'title', 'description', 'facilitator_id', 'category', 'session_date',
    'start_time', 'end_time', 'location', 'max_capacity', 'credit_hours',
    'status', 'related_standards_csv', 'related_tags', 'recurrence', 'series_id',
    'created_by', 'created_at', 'updated_at'
  ]);

  createTable_('pd_registrations', [
    'id', 'offering_id', 'staff_id', 'status', 'registered_at', 'attended_at',
    'cancelled_at', 'waitlist_position', 'credit_hours_earned', 'created_at', 'updated_at'
  ]);

  createTable_('pd_reflections', [
    'id', 'offering_id', 'staff_id', 'registration_id', 'rating', 'reflection_text',
    'linked_selection_id', 'created_at', 'updated_at'
  ]);

  createTable_('pd_activity', [
    'id', 'offering_id', 'user_id', 'action_type', 'field_name',
    'old_value', 'new_value', 'created_at'
  ]);

  seedMetaVersion_('0.9.0', 'PD Tracking module');
  Logger.log('=== PD Tracking setup complete ===');
}

// ═══════════════════════════════════════════════
// Phase: Staff Feedback & 360 Reviews
// ═══════════════════════════════════════════════

function setupFeedback() {
  Logger.log('=== Setting up Staff Feedback tables ===');

  createTable_('feedback_cycles', [
    'id', 'academic_year', 'cycle_name', 'description', 'status', 'open_date',
    'close_date', 'feedback_type', 'min_responses', 'allow_anonymous',
    'created_by', 'created_at', 'updated_at'
  ]);

  createTable_('feedback_questions', [
    'id', 'cycle_id', 'question_text', 'question_type', 'sort_order',
    'is_required', 'created_at', 'updated_at'
  ]);

  createTable_('feedback_assignments', [
    'id', 'cycle_id', 'recipient_id', 'responder_id', 'responder_role',
    'status', 'is_anonymous', 'submitted_at', 'created_at', 'updated_at'
  ]);

  createTable_('feedback_responses', [
    'id', 'assignment_id', 'question_id', 'rating', 'response_text',
    'created_at', 'updated_at'
  ]);

  createTable_('feedback_summaries', [
    'id', 'cycle_id', 'recipient_id', 'avg_rating', 'response_count',
    'threshold_met', 'admin_notes', 'shared_with_recipient', 'shared_at',
    'linked_selection_id', 'created_at', 'updated_at'
  ]);

  createTable_('feedback_activity', [
    'id', 'cycle_id', 'assignment_id', 'user_id', 'action_type',
    'field_name', 'old_value', 'new_value', 'created_at'
  ]);

  seedMetaVersion_('0.10.0', 'Staff Feedback module');
  Logger.log('=== Staff Feedback setup complete ===');
}

// ═══════════════════════════════════════════════
// Phase: Staff Wellness & Workload
// ═══════════════════════════════════════════════

function setupWellness() {
  Logger.log('=== Setting up Staff Wellness tables ===');

  createTable_('wellness_checkins', [
    'id', 'staff_id', 'checkin_date', 'energy_score', 'mood_score',
    'stress_score', 'balance_score', 'satisfaction_score', 'notes',
    'overall_score', 'created_at'
  ]);

  createTable_('wellness_config', [
    'id', 'key', 'value', 'description', 'updated_at'
  ]);

  createTable_('wellness_alerts', [
    'id', 'staff_id', 'alert_type', 'severity', 'message', 'trigger_data',
    'status', 'acknowledged_by', 'acknowledged_at', 'created_at', 'resolved_at'
  ]);

  createTable_('wellness_activity', [
    'id', 'staff_id', 'user_id', 'action_type', 'field_name',
    'old_value', 'new_value', 'created_at'
  ]);

  seedMetaVersion_('0.11.0', 'Staff Wellness module');
  Logger.log('=== Staff Wellness setup complete ===');
}

// ═══════════════════════════════════════════════
// Run all phases at once (for fresh setup)
// ═══════════════════════════════════════════════

function setupAll() {
  setupPhase0a();
  setupPhase2();
  setupPhase2b();
  setupPhase3();
  setupPhase3b();
  setupPhase4();
  setupPhase4b();
  setupPhase5();
  setupPhase5b();
  setupPhase6();
  setupMeetingMinutes();
  setupPDTracking();
  setupFeedback();
  setupWellness();
  setupPhase3c();
  setupPhase3d();
  setupMultiplier();
  setupWellnessDDO();
  Logger.log('=== All phases set up ===');
}

// ═══════════════════════════════════════════════
// Import utilities
// ═══════════════════════════════════════════════

/**
 * Imports staff data from an existing spreadsheet.
 * Source sheet must have columns matching the staff table headers.
 * @param {string} sourceSpreadsheetId - ID of the source spreadsheet
 * @param {string} [sourceSheetName] - Name of the source tab (defaults to first sheet)
 */
function importStaffFromSheet(sourceSpreadsheetId, sourceSheetName) {
  var source = SpreadsheetApp.openById(sourceSpreadsheetId);
  var sheet = sourceSheetName ? source.getSheetByName(sourceSheetName) : source.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('No data rows found in source.');
    return;
  }

  var sourceHeaders = data[0].map(function(h) { return String(h).trim().toLowerCase().replace(/\s+/g, '_'); });
  var targetHeaders = DataService.getTableHeaders('staff');

  var records = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var record = {};
    for (var j = 0; j < sourceHeaders.length; j++) {
      if (targetHeaders.indexOf(sourceHeaders[j]) !== -1) {
        record[sourceHeaders[j]] = row[j];
      }
    }
    // Ensure required fields
    if (record.email && record.first_name && record.last_name) {
      if (!record.is_active && record.is_active !== false) record.is_active = true;
      if (!record.role) record.role = 'teacher';
      records.push(record);
    }
  }

  if (records.length > 0) {
    DataService.batchCreate('staff', records);
    Logger.log('Imported ' + records.length + ' staff records.');
  }
}

/**
 * Imports timetable data from an existing spreadsheet.
 * @param {string} sourceSpreadsheetId
 * @param {string} [sourceSheetName]
 */
function importTimetableFromSheet(sourceSpreadsheetId, sourceSheetName) {
  var source = SpreadsheetApp.openById(sourceSpreadsheetId);
  var sheet = sourceSheetName ? source.getSheetByName(sourceSheetName) : source.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('No data rows found in source.');
    return;
  }

  var sourceHeaders = data[0].map(function(h) { return String(h).trim().toLowerCase().replace(/\s+/g, '_'); });
  var targetHeaders = DataService.getTableHeaders('timetable');

  var records = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var record = {};
    for (var j = 0; j < sourceHeaders.length; j++) {
      if (targetHeaders.indexOf(sourceHeaders[j]) !== -1) {
        record[sourceHeaders[j]] = row[j];
      }
    }
    if (record.staff_id && record.day_of_week && record.period) {
      records.push(record);
    }
  }

  if (records.length > 0) {
    DataService.batchCreate('timetable', records);
    Logger.log('Imported ' + records.length + ' timetable records.');
  }
}

// ═══════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════

/**
 * Creates a table (sheet tab) with headers if it doesn't already exist.
 * @param {string} tableName
 * @param {string[]} headers
 */
function createTable_(tableName, headers) {
  var created = DataService.ensureTable(tableName, headers);
  if (created) {
    Logger.log('  Created table: ' + tableName);
  } else {
    Logger.log('  Table already exists: ' + tableName + ' (skipped)');
  }
}

/**
 * Writes a version entry to the _meta table.
 */
function seedMetaVersion_(version, description) {
  var existing = DataService.getRecords('_meta', { version: version });
  if (existing.length > 0) return;
  DataService.createRecord('_meta', {
    version: version,
    description: description,
    applied_at: nowISO()
  });
}

/**
 * Applies data validation to the staff table.
 */
function applyStaffValidation_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('staff');
    if (!sheet) return;

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Role validation (column index)
    var roleIdx = headers.indexOf('role');
    if (roleIdx !== -1) {
      var roleRange = sheet.getRange(2, roleIdx + 1, sheet.getMaxRows() - 1, 1);
      var roleRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['admin', 'teacher', 'support', 'specialist'], true)
        .setAllowInvalid(false)
        .build();
      roleRange.setDataValidation(roleRule);
    }

    // Employment status validation
    var empIdx = headers.indexOf('employment_status');
    if (empIdx !== -1) {
      var empRange = sheet.getRange(2, empIdx + 1, sheet.getMaxRows() - 1, 1);
      var empRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['full-time', 'part-time', 'contract'], true)
        .setAllowInvalid(false)
        .build();
      empRange.setDataValidation(empRule);
    }
  } catch (e) {
    Logger.log('  Warning: Could not apply staff validation: ' + e.message);
  }
}

/**
 * Applies data validation to the observations table.
 */
function applyObservationValidation_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('observations');
    if (!sheet) return;

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Observation type validation
    var typeIdx = headers.indexOf('observation_type');
    if (typeIdx !== -1) {
      var typeRange = sheet.getRange(2, typeIdx + 1, sheet.getMaxRows() - 1, 1);
      var typeRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['learning_walk', 'formal', 'informal', 'peer'], true)
        .setAllowInvalid(false)
        .build();
      typeRange.setDataValidation(typeRule);
    }

    // Rating validations (1-5)
    var ratingCols = ['student_engagement_rating', 'instructional_strategy_rating', 'environment_rating'];
    ratingCols.forEach(function(colName) {
      var idx = headers.indexOf(colName);
      if (idx !== -1) {
        var range = sheet.getRange(2, idx + 1, sheet.getMaxRows() - 1, 1);
        var rule = SpreadsheetApp.newDataValidation()
          .requireNumberBetween(1, 5)
          .setAllowInvalid(false)
          .build();
        range.setDataValidation(rule);
      }
    });
  } catch (e) {
    Logger.log('  Warning: Could not apply observation validation: ' + e.message);
  }
}
