/**
 * ChangeMgmtService.gs — Business logic for Change Management module
 *
 * Manages change initiatives using the Knoster Model (readiness assessment)
 * and Lippitt Model (7-phase change process). Admin-only module.
 *
 * Uses: DataService, AuthService, Utils
 */

var ChangeMgmtService = (function() {

  // ── Private Helpers ──

  function staffMap_() {
    var allStaff = DataService.getRecords('staff');
    var map = {};
    allStaff.forEach(function(s) { map[s.id] = s; });
    return map;
  }

  function staffName_(map, id) {
    var s = map[id];
    return s ? s.first_name + ' ' + s.last_name : 'Unknown';
  }

  /**
   * Reads knoster_use_consensus config.
   * @returns {boolean}
   */
  function getUseConsensus_() {
    var configs = DataService.getRecords('_config');
    for (var i = 0; i < configs.length; i++) {
      if (configs[i].key === 'knoster_use_consensus') {
        return configs[i].value === 'true';
      }
    }
    return false;
  }

  /**
   * Calculates Knoster risk predictions from an assessment.
   * @param {Object} assessment - assessment record with *_score fields
   * @param {boolean} useConsensus - whether to include 6th element
   * @returns {{ gaps: Object[], warnings: Object[], overallReadiness: number }}
   */
  function calculateRisk_(assessment, useConsensus) {
    var elements = [
      { name: 'Vision', score: parseInt(assessment.vision_score) || 0, risk: 'Confusion' },
      { name: 'Skills', score: parseInt(assessment.skills_score) || 0, risk: 'Anxiety' },
      { name: 'Incentives', score: parseInt(assessment.incentives_score) || 0, risk: 'Resistance' },
      { name: 'Resources', score: parseInt(assessment.resources_score) || 0, risk: 'Frustration' },
      { name: 'Action Plan', score: parseInt(assessment.action_plan_score) || 0, risk: 'False Starts' }
    ];
    if (useConsensus && assessment.consensus_score) {
      elements.push({ name: 'Consensus', score: parseInt(assessment.consensus_score) || 0, risk: 'Sabotage' });
    }

    var gaps = elements.filter(function(e) { return e.score <= 2; });
    var warnings = elements.filter(function(e) { return e.score === 3; });
    var scores = elements.map(function(e) { return e.score; });
    var avg = scores.length > 0 ? scores.reduce(function(s, n) { return s + n; }, 0) / scores.length : 0;

    return {
      gaps: gaps,
      warnings: warnings,
      overallReadiness: roundTo(avg, 1)
    };
  }

  // ── Valid Enum Values ──
  var INITIATIVE_STATUSES = ['proposed', 'active', 'stalled', 'completed', 'abandoned'];
  var STAKEHOLDER_ROLES = ['champion', 'contributor', 'informed', 'affected'];
  var ENGAGEMENT_LEVELS = ['supportive', 'neutral', 'resistant'];
  var LIPPITT_PHASE_NAMES = ['Diagnose', 'Assess Motivation', 'Assess Resources', 'Select Objectives', 'Choose Role', 'Maintain', 'Terminate'];
  var LIPPITT_STATUSES = ['not_started', 'in_progress', 'completed'];
  var COMMUNICATION_TYPES = ['announcement', 'update', 'feedback_request', 'milestone', 'escalation'];
  var COMMUNICATION_CHANNELS = ['email', 'meeting', 'newsletter', 'presentation', 'all_staff'];
  var COMMUNICATION_STATUSES = ['planned', 'sent', 'cancelled'];

  // ── Public API ──

  /**
   * Admin overview: all initiatives with stats, hydrated data.
   * @param {Object} [filters] - { status?, champion_id? }
   * @returns {{ initiatives: Object[], stats: Object }}
   */
  function getOverview(filters) {
    AuthService.requireAdmin();
    filters = filters || {};

    var initiatives = DataService.query('initiatives', {
      sort: { field: 'created_at', direction: 'desc' }
    }).data;

    var sMap = staffMap_();
    var useConsensus = getUseConsensus_();

    // Pre-fetch to avoid N+1
    var allAssessments = DataService.getRecords('knoster_assessments');
    var allPhases = DataService.getRecords('lippitt_phases');
    var allStakeholders = DataService.getRecords('initiative_stakeholders');

    // Group by initiative_id
    var assessmentsByInit = {};
    allAssessments.forEach(function(a) {
      if (!assessmentsByInit[a.initiative_id]) assessmentsByInit[a.initiative_id] = [];
      assessmentsByInit[a.initiative_id].push(a);
    });

    var phasesByInit = {};
    allPhases.forEach(function(p) {
      if (!phasesByInit[p.initiative_id]) phasesByInit[p.initiative_id] = [];
      phasesByInit[p.initiative_id].push(p);
    });

    var stakeholdersByInit = {};
    allStakeholders.forEach(function(s) {
      if (!stakeholdersByInit[s.initiative_id]) stakeholdersByInit[s.initiative_id] = [];
      stakeholdersByInit[s.initiative_id].push(s);
    });

    var statCounts = { total: 0, active: 0, stalled: 0, completed: 0 };

    var enriched = initiatives.map(function(init) {
      if (filters.status && init.status !== filters.status) return null;
      if (filters.champion_id && init.champion_id !== filters.champion_id) return null;

      // Latest assessment
      var assessments = (assessmentsByInit[init.id] || []).sort(function(a, b) {
        return new Date(b.assessed_at) - new Date(a.assessed_at);
      });
      var latest = assessments.length > 0 ? assessments[0] : null;
      var readiness = latest ? calculateRisk_(latest, useConsensus).overallReadiness : null;

      // Current Lippitt phase
      var phases = (phasesByInit[init.id] || []).sort(function(a, b) {
        return parseInt(a.phase_number) - parseInt(b.phase_number);
      });
      var currentPhase = null;
      for (var i = 0; i < phases.length; i++) {
        if (phases[i].status === 'in_progress') { currentPhase = phases[i]; break; }
      }
      if (!currentPhase) {
        // Find the highest completed phase or first not_started
        for (var j = phases.length - 1; j >= 0; j--) {
          if (phases[j].status === 'completed') {
            currentPhase = phases[j + 1] || phases[j];
            break;
          }
        }
        if (!currentPhase && phases.length > 0) currentPhase = phases[0];
      }

      var stakeholders = stakeholdersByInit[init.id] || [];

      statCounts.total++;
      if (init.status === 'active') statCounts.active++;
      if (init.status === 'stalled') statCounts.stalled++;
      if (init.status === 'completed') statCounts.completed++;

      return {
        id: init.id,
        title: init.title,
        description: init.description || '',
        championId: init.champion_id,
        championName: staffName_(sMap, init.champion_id),
        status: init.status,
        startDate: init.start_date || '',
        targetDate: init.target_date || '',
        latestReadiness: readiness,
        currentLippittPhase: currentPhase ? 'Phase ' + currentPhase.phase_number + ': ' + currentPhase.phase_name : '',
        currentLippittPhaseNumber: currentPhase ? parseInt(currentPhase.phase_number) : 0,
        stakeholderCount: stakeholders.length,
        createdAt: init.created_at
      };
    }).filter(Boolean);

    return {
      initiatives: enriched,
      stats: statCounts
    };
  }

  /**
   * Full initiative detail with assessments, Lippitt phases, and stakeholders.
   * @param {string} initiativeId
   * @returns {Object}
   */
  function getInitiativeDetail(initiativeId) {
    AuthService.requireAdmin();
    if (!initiativeId) throw new Error('VALIDATION: initiativeId is required');

    var init = DataService.getRecordById('initiatives', initiativeId);
    if (!init) throw new Error('NOT_FOUND: Initiative not found');

    var sMap = staffMap_();
    var useConsensus = getUseConsensus_();

    // Assessments (newest first)
    var assessments = DataService.query('knoster_assessments', {
      filters: { initiative_id: initiativeId },
      sort: { field: 'assessed_at', direction: 'desc' }
    }).data;

    assessments = assessments.map(function(a) {
      var risk = calculateRisk_(a, useConsensus);
      return {
        id: a.id,
        initiativeId: a.initiative_id,
        assessedBy: staffName_(sMap, a.assessed_by),
        assessedById: a.assessed_by,
        assessedAt: a.assessed_at,
        visionScore: parseInt(a.vision_score) || 0,
        visionNotes: a.vision_notes || '',
        skillsScore: parseInt(a.skills_score) || 0,
        skillsNotes: a.skills_notes || '',
        incentivesScore: parseInt(a.incentives_score) || 0,
        incentivesNotes: a.incentives_notes || '',
        resourcesScore: parseInt(a.resources_score) || 0,
        resourcesNotes: a.resources_notes || '',
        actionPlanScore: parseInt(a.action_plan_score) || 0,
        actionPlanNotes: a.action_plan_notes || '',
        consensusScore: parseInt(a.consensus_score) || 0,
        consensusNotes: a.consensus_notes || '',
        predictedRisk: a.predicted_risk || '',
        overallReadiness: risk.overallReadiness,
        gaps: risk.gaps,
        warnings: risk.warnings
      };
    });

    // Lippitt phases (by phase_number)
    var lippittPhases = DataService.query('lippitt_phases', {
      filters: { initiative_id: initiativeId },
      sort: { field: 'phase_number', direction: 'asc' }
    }).data;

    lippittPhases = lippittPhases.map(function(p) {
      return {
        id: p.id,
        initiativeId: p.initiative_id,
        phaseNumber: parseInt(p.phase_number),
        phaseName: p.phase_name,
        status: p.status,
        entryDate: p.entry_date || '',
        completionDate: p.completion_date || '',
        keyActions: p.key_actions || '',
        evidence: p.evidence || '',
        blockers: p.blockers || '',
        updatedBy: p.updated_by ? staffName_(sMap, p.updated_by) : '',
        updatedAt: p.updated_at || ''
      };
    });

    // Stakeholders
    var stakeholders = DataService.query('initiative_stakeholders', {
      filters: { initiative_id: initiativeId }
    }).data;

    stakeholders = stakeholders.map(function(s) {
      return {
        id: s.id,
        initiativeId: s.initiative_id,
        staffId: s.staff_id,
        staffName: staffName_(sMap, s.staff_id),
        role: s.role,
        engagementLevel: s.engagement_level,
        notes: s.notes || ''
      };
    });

    return {
      initiative: {
        id: init.id,
        title: init.title,
        description: init.description || '',
        championId: init.champion_id,
        championName: staffName_(sMap, init.champion_id),
        status: init.status,
        startDate: init.start_date || '',
        targetDate: init.target_date || '',
        createdAt: init.created_at,
        updatedAt: init.updated_at
      },
      assessments: assessments,
      lippittPhases: lippittPhases,
      stakeholders: stakeholders,
      useConsensus: useConsensus
    };
  }

  /**
   * Creates a new initiative with 7 auto-created Lippitt phases.
   * @param {Object} data - { title, description?, champion_id, start_date?, target_date? }
   * @returns {Object}
   */
  function createInitiative(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['title', 'champion_id']);

    var champion = DataService.getRecordById('staff', data.champion_id);
    if (!champion) throw new Error('VALIDATION: Champion not found in staff directory');

    var init = DataService.createRecord('initiatives', {
      title: data.title,
      description: data.description || '',
      champion_id: data.champion_id,
      status: 'proposed',
      start_date: data.start_date || '',
      target_date: data.target_date || ''
    });

    // Auto-create 7 Lippitt phases
    for (var i = 0; i < LIPPITT_PHASE_NAMES.length; i++) {
      DataService.createRecord('lippitt_phases', {
        initiative_id: init.id,
        phase_number: i + 1,
        phase_name: LIPPITT_PHASE_NAMES[i],
        status: 'not_started',
        entry_date: '',
        completion_date: '',
        key_actions: '',
        evidence: '',
        blockers: '',
        updated_by: '',
        updated_at: ''
      });
    }

    return init;
  }

  /**
   * Updates an initiative.
   * @param {string} initiativeId
   * @param {Object} updates
   * @returns {Object}
   */
  function updateInitiative(initiativeId, updates) {
    AuthService.requireAdmin();
    if (!initiativeId) throw new Error('VALIDATION: initiativeId is required');

    var init = DataService.getRecordById('initiatives', initiativeId);
    if (!init) throw new Error('NOT_FOUND: Initiative not found');

    if (updates.status && INITIATIVE_STATUSES.indexOf(updates.status) === -1) {
      throw new Error('VALIDATION: Invalid status. Must be one of: ' + INITIATIVE_STATUSES.join(', '));
    }

    return DataService.updateRecord('initiatives', initiativeId, updates);
  }

  /**
   * Deletes an initiative and cascades to all related data.
   * @param {string} initiativeId
   * @returns {boolean}
   */
  function deleteInitiative(initiativeId) {
    AuthService.requireAdmin();
    if (!initiativeId) throw new Error('VALIDATION: initiativeId is required');

    var init = DataService.getRecordById('initiatives', initiativeId);
    if (!init) throw new Error('NOT_FOUND: Initiative not found');

    // Cascade: assessments
    var assessments = DataService.getRelated('knoster_assessments', 'initiative_id', initiativeId);
    assessments.forEach(function(a) {
      DataService.deleteRecord('knoster_assessments', a.id, { hard: true });
    });

    // Cascade: lippitt phases
    var phases = DataService.getRelated('lippitt_phases', 'initiative_id', initiativeId);
    phases.forEach(function(p) {
      DataService.deleteRecord('lippitt_phases', p.id, { hard: true });
    });

    // Cascade: stakeholders
    var stakeholders = DataService.getRelated('initiative_stakeholders', 'initiative_id', initiativeId);
    stakeholders.forEach(function(s) {
      DataService.deleteRecord('initiative_stakeholders', s.id, { hard: true });
    });

    // Cascade: communications
    var comms = DataService.getRelated('cm_communications', 'initiative_id', initiativeId);
    comms.forEach(function(c) {
      DataService.deleteRecord('cm_communications', c.id, { hard: true });
    });

    DataService.deleteRecord('initiatives', initiativeId, { hard: true });
    return true;
  }

  /**
   * Creates a Knoster assessment with auto-computed risk and readiness.
   * @param {Object} data - { initiative_id, vision_score, vision_notes, ... }
   * @returns {Object}
   */
  function createAssessment(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['initiative_id']);

    var init = DataService.getRecordById('initiatives', data.initiative_id);
    if (!init) throw new Error('NOT_FOUND: Initiative not found');

    var useConsensus = getUseConsensus_();
    var user = AuthService.getCurrentUser();

    // Validate scores 1-5
    var scoreFields = ['vision_score', 'skills_score', 'incentives_score', 'resources_score', 'action_plan_score'];
    if (useConsensus) scoreFields.push('consensus_score');
    scoreFields.forEach(function(field) {
      var val = parseInt(data[field]);
      if (!val || val < 1 || val > 5) {
        throw new Error('VALIDATION: ' + field + ' must be between 1 and 5');
      }
    });

    // Calculate risk
    var risk = calculateRisk_(data, useConsensus);
    var predictedRiskText = risk.gaps.map(function(g) { return g.risk; }).join(', ') || '';

    return DataService.createRecord('knoster_assessments', {
      initiative_id: data.initiative_id,
      assessed_by: user.id,
      assessed_at: nowISO(),
      vision_score: data.vision_score,
      vision_notes: data.vision_notes || '',
      skills_score: data.skills_score,
      skills_notes: data.skills_notes || '',
      incentives_score: data.incentives_score,
      incentives_notes: data.incentives_notes || '',
      resources_score: data.resources_score,
      resources_notes: data.resources_notes || '',
      action_plan_score: data.action_plan_score,
      action_plan_notes: data.action_plan_notes || '',
      consensus_score: useConsensus ? (data.consensus_score || '') : '',
      consensus_notes: useConsensus ? (data.consensus_notes || '') : '',
      predicted_risk: predictedRiskText,
      overall_readiness: risk.overallReadiness
    });
  }

  /**
   * Returns all assessments for an initiative.
   * @param {string} initiativeId
   * @returns {Object[]}
   */
  function getAssessmentHistory(initiativeId) {
    AuthService.requireAdmin();
    if (!initiativeId) throw new Error('VALIDATION: initiativeId is required');

    var init = DataService.getRecordById('initiatives', initiativeId);
    if (!init) throw new Error('NOT_FOUND: Initiative not found');

    var sMap = staffMap_();
    var useConsensus = getUseConsensus_();

    var assessments = DataService.query('knoster_assessments', {
      filters: { initiative_id: initiativeId },
      sort: { field: 'assessed_at', direction: 'desc' }
    }).data;

    return assessments.map(function(a) {
      var risk = calculateRisk_(a, useConsensus);
      return {
        id: a.id,
        assessedBy: staffName_(sMap, a.assessed_by),
        assessedAt: a.assessed_at,
        overallReadiness: risk.overallReadiness,
        gaps: risk.gaps,
        warnings: risk.warnings,
        visionScore: parseInt(a.vision_score) || 0,
        skillsScore: parseInt(a.skills_score) || 0,
        incentivesScore: parseInt(a.incentives_score) || 0,
        resourcesScore: parseInt(a.resources_score) || 0,
        actionPlanScore: parseInt(a.action_plan_score) || 0,
        consensusScore: parseInt(a.consensus_score) || 0
      };
    });
  }

  /**
   * Updates a Lippitt phase with sequential enforcement.
   * @param {string} phaseId
   * @param {Object} updates - { status?, key_actions?, evidence?, blockers? }
   * @returns {Object}
   */
  function updateLippittPhase(phaseId, updates) {
    AuthService.requireAdmin();
    if (!phaseId) throw new Error('VALIDATION: phaseId is required');

    var phase = DataService.getRecordById('lippitt_phases', phaseId);
    if (!phase) throw new Error('NOT_FOUND: Lippitt phase not found');

    if (updates.status && LIPPITT_STATUSES.indexOf(updates.status) === -1) {
      throw new Error('VALIDATION: Invalid status. Must be one of: ' + LIPPITT_STATUSES.join(', '));
    }

    var user = AuthService.getCurrentUser();

    // Sequential enforcement
    if (updates.status && updates.status !== phase.status) {
      var siblingPhases = DataService.query('lippitt_phases', {
        filters: { initiative_id: phase.initiative_id },
        sort: { field: 'phase_number', direction: 'asc' }
      }).data;

      var phaseNum = parseInt(phase.phase_number);

      if (updates.status === 'in_progress') {
        // Can't start if a prior phase is not completed (except phase 1)
        if (phaseNum > 1) {
          for (var i = 0; i < siblingPhases.length; i++) {
            var prev = siblingPhases[i];
            if (parseInt(prev.phase_number) < phaseNum && prev.status !== 'completed') {
              throw new Error('VALIDATION: Phase ' + prev.phase_number + ' (' + prev.phase_name + ') must be completed before starting Phase ' + phaseNum);
            }
          }
        }
        updates.entry_date = nowISO();
      }

      if (updates.status === 'completed') {
        if (!updates.key_actions && !phase.key_actions) {
          throw new Error('VALIDATION: Key actions are required to complete a phase');
        }
        updates.completion_date = nowISO();
      }
    }

    updates.updated_by = user.id;
    updates.updated_at = nowISO();

    return DataService.updateRecord('lippitt_phases', phaseId, updates);
  }

  /**
   * Adds a stakeholder to an initiative.
   * @param {Object} data - { initiative_id, staff_id, role, engagement_level?, notes? }
   * @returns {Object}
   */
  function addStakeholder(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['initiative_id', 'staff_id', 'role']);

    var init = DataService.getRecordById('initiatives', data.initiative_id);
    if (!init) throw new Error('NOT_FOUND: Initiative not found');

    var staff = DataService.getRecordById('staff', data.staff_id);
    if (!staff) throw new Error('VALIDATION: Staff member not found');

    if (STAKEHOLDER_ROLES.indexOf(data.role) === -1) {
      throw new Error('VALIDATION: Invalid role. Must be one of: ' + STAKEHOLDER_ROLES.join(', '));
    }

    if (data.engagement_level && ENGAGEMENT_LEVELS.indexOf(data.engagement_level) === -1) {
      throw new Error('VALIDATION: Invalid engagement level. Must be one of: ' + ENGAGEMENT_LEVELS.join(', '));
    }

    // Prevent duplicate
    var existing = DataService.query('initiative_stakeholders', {
      filters: { initiative_id: data.initiative_id, staff_id: data.staff_id },
      limit: 1
    });
    if (existing.data.length > 0) {
      throw new Error('VALIDATION: This staff member is already a stakeholder for this initiative');
    }

    return DataService.createRecord('initiative_stakeholders', {
      initiative_id: data.initiative_id,
      staff_id: data.staff_id,
      role: data.role,
      engagement_level: data.engagement_level || 'neutral',
      notes: data.notes || ''
    });
  }

  /**
   * Updates a stakeholder.
   * @param {string} stakeholderId
   * @param {Object} updates
   * @returns {Object}
   */
  function updateStakeholder(stakeholderId, updates) {
    AuthService.requireAdmin();
    if (!stakeholderId) throw new Error('VALIDATION: stakeholderId is required');

    var sh = DataService.getRecordById('initiative_stakeholders', stakeholderId);
    if (!sh) throw new Error('NOT_FOUND: Stakeholder not found');

    if (updates.role && STAKEHOLDER_ROLES.indexOf(updates.role) === -1) {
      throw new Error('VALIDATION: Invalid role');
    }
    if (updates.engagement_level && ENGAGEMENT_LEVELS.indexOf(updates.engagement_level) === -1) {
      throw new Error('VALIDATION: Invalid engagement level');
    }

    return DataService.updateRecord('initiative_stakeholders', stakeholderId, updates);
  }

  /**
   * Removes a stakeholder.
   * @param {string} stakeholderId
   * @returns {boolean}
   */
  function removeStakeholder(stakeholderId) {
    AuthService.requireAdmin();
    if (!stakeholderId) throw new Error('VALIDATION: stakeholderId is required');

    var sh = DataService.getRecordById('initiative_stakeholders', stakeholderId);
    if (!sh) throw new Error('NOT_FOUND: Stakeholder not found');

    DataService.deleteRecord('initiative_stakeholders', stakeholderId, { hard: true });
    return true;
  }

  /**
   * Returns comparison data for all non-abandoned initiatives.
   * @returns {Object[]}
   */
  function getInitiativeComparison() {
    AuthService.requireAdmin();
    var useConsensus = getUseConsensus_();

    var initiatives = DataService.query('initiatives', {
      sort: { field: 'created_at', direction: 'desc' }
    }).data.filter(function(i) { return i.status !== 'abandoned'; });

    var allAssessments = DataService.getRecords('knoster_assessments');
    var allPhases = DataService.getRecords('lippitt_phases');
    var sMap = staffMap_();

    // Group assessments and phases by initiative_id
    var assessmentsByInit = {};
    allAssessments.forEach(function(a) {
      if (!assessmentsByInit[a.initiative_id]) assessmentsByInit[a.initiative_id] = [];
      assessmentsByInit[a.initiative_id].push(a);
    });

    var phasesByInit = {};
    allPhases.forEach(function(p) {
      if (!phasesByInit[p.initiative_id]) phasesByInit[p.initiative_id] = [];
      phasesByInit[p.initiative_id].push(p);
    });

    return initiatives.map(function(init) {
      // Latest assessment
      var assessments = (assessmentsByInit[init.id] || []).sort(function(a, b) {
        return new Date(b.assessed_at) - new Date(a.assessed_at);
      });
      var latest = assessments[0] || null;

      // Current Lippitt phase
      var phases = (phasesByInit[init.id] || []).sort(function(a, b) {
        return parseInt(a.phase_number) - parseInt(b.phase_number);
      });
      var currentPhase = null;
      for (var i = 0; i < phases.length; i++) {
        if (phases[i].status === 'in_progress') { currentPhase = phases[i]; break; }
      }
      if (!currentPhase) {
        for (var j = phases.length - 1; j >= 0; j--) {
          if (phases[j].status === 'completed') {
            currentPhase = phases[j + 1] || phases[j];
            break;
          }
        }
        if (!currentPhase && phases.length > 0) currentPhase = phases[0];
      }

      return {
        id: init.id,
        title: init.title,
        championName: staffName_(sMap, init.champion_id),
        status: init.status,
        visionScore: latest ? parseInt(latest.vision_score) || 0 : 0,
        skillsScore: latest ? parseInt(latest.skills_score) || 0 : 0,
        incentivesScore: latest ? parseInt(latest.incentives_score) || 0 : 0,
        resourcesScore: latest ? parseInt(latest.resources_score) || 0 : 0,
        actionPlanScore: latest ? parseInt(latest.action_plan_score) || 0 : 0,
        consensusScore: (useConsensus && latest) ? parseInt(latest.consensus_score) || 0 : null,
        overallReadiness: latest ? calculateRisk_(latest, useConsensus).overallReadiness : 0,
        currentLippittPhase: currentPhase ? currentPhase.phase_name : '',
        currentLippittPhaseNumber: currentPhase ? parseInt(currentPhase.phase_number) : 0
      };
    });
  }

  /**
   * Returns module configuration.
   * @returns {{ useConsensus: boolean }}
   */
  function getConfig() {
    AuthService.requireAdmin();
    return { useConsensus: getUseConsensus_() };
  }

  // ─── Communication Plan Functions ─────────────────────────────

  /**
   * Returns all communications for an initiative, grouped by status.
   * @param {string} initiativeId
   * @returns {{ communications: Object[], counts: Object }}
   */
  function getCommunications(initiativeId) {
    AuthService.requireAdmin();
    if (!initiativeId) throw new Error('VALIDATION: initiativeId is required');

    var init = DataService.getRecordById('initiatives', initiativeId);
    if (!init) throw new Error('NOT_FOUND: Initiative not found');

    var sMap = staffMap_();
    var records = DataService.query('cm_communications', {
      filters: { initiative_id: initiativeId },
      sort: { field: 'created_at', direction: 'desc' }
    }).data;

    var counts = { planned: 0, sent: 0, cancelled: 0, total: records.length };

    var communications = records.map(function(r) {
      if (r.status === 'planned') counts.planned++;
      else if (r.status === 'sent') counts.sent++;
      else if (r.status === 'cancelled') counts.cancelled++;

      return {
        id: r.id,
        initiativeId: r.initiative_id,
        stakeholderId: r.stakeholder_id || '',
        stakeholderName: r.stakeholder_id ? staffName_(sMap, r.stakeholder_id) : '',
        audienceDescription: r.audience_description || '',
        messageType: r.message_type,
        channel: r.channel,
        subject: r.subject,
        content: r.content || '',
        scheduledDate: r.scheduled_date || '',
        sentDate: r.sent_date || '',
        sentBy: r.sent_by || '',
        sentByName: r.sent_by ? staffName_(sMap, r.sent_by) : '',
        status: r.status,
        notes: r.notes || '',
        createdAt: r.created_at
      };
    });

    return { communications: communications, counts: counts };
  }

  /**
   * Creates a communication record.
   * @param {Object} data
   * @returns {Object}
   */
  function createCommunication(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['initiative_id', 'message_type', 'channel', 'subject', 'status']);

    var init = DataService.getRecordById('initiatives', data.initiative_id);
    if (!init) throw new Error('NOT_FOUND: Initiative not found');

    if (COMMUNICATION_TYPES.indexOf(data.message_type) === -1) {
      throw new Error('VALIDATION: Invalid message_type. Must be one of: ' + COMMUNICATION_TYPES.join(', '));
    }
    if (COMMUNICATION_CHANNELS.indexOf(data.channel) === -1) {
      throw new Error('VALIDATION: Invalid channel. Must be one of: ' + COMMUNICATION_CHANNELS.join(', '));
    }
    if (COMMUNICATION_STATUSES.indexOf(data.status) === -1) {
      throw new Error('VALIDATION: Invalid status. Must be one of: ' + COMMUNICATION_STATUSES.join(', '));
    }

    var user = AuthService.getCurrentUser();
    var sentBy = '';
    var sentDate = '';
    if (data.status === 'sent') {
      sentBy = data.sent_by || user.id;
      sentDate = data.sent_date || nowISO();
    }

    return DataService.createRecord('cm_communications', {
      initiative_id: data.initiative_id,
      stakeholder_id: data.stakeholder_id || '',
      audience_description: data.audience_description || '',
      message_type: data.message_type,
      channel: data.channel,
      subject: sanitizeInput(data.subject),
      content: sanitizeInput(data.content || ''),
      scheduled_date: data.scheduled_date || '',
      sent_date: sentDate,
      sent_by: sentBy,
      status: data.status,
      notes: data.notes || ''
    });
  }

  /**
   * Updates a communication record.
   * @param {string} communicationId
   * @param {Object} updates
   * @returns {Object}
   */
  function updateCommunication(communicationId, updates) {
    AuthService.requireAdmin();
    if (!communicationId) throw new Error('VALIDATION: communicationId is required');

    var record = DataService.getRecordById('cm_communications', communicationId);
    if (!record) throw new Error('NOT_FOUND: Communication not found');

    if (updates.message_type && COMMUNICATION_TYPES.indexOf(updates.message_type) === -1) {
      throw new Error('VALIDATION: Invalid message_type');
    }
    if (updates.channel && COMMUNICATION_CHANNELS.indexOf(updates.channel) === -1) {
      throw new Error('VALIDATION: Invalid channel');
    }
    if (updates.status && COMMUNICATION_STATUSES.indexOf(updates.status) === -1) {
      throw new Error('VALIDATION: Invalid status');
    }

    // Auto-set sent_by and sent_date when marking as sent
    if (updates.status === 'sent' && record.status !== 'sent') {
      var user = AuthService.getCurrentUser();
      if (!updates.sent_by) updates.sent_by = user.id;
      if (!updates.sent_date) updates.sent_date = nowISO();
    }

    if (updates.subject) updates.subject = sanitizeInput(updates.subject);
    if (updates.content) updates.content = sanitizeInput(updates.content);

    return DataService.updateRecord('cm_communications', communicationId, updates);
  }

  /**
   * Deletes a communication record.
   * @param {string} communicationId
   * @returns {boolean}
   */
  function deleteCommunication(communicationId) {
    AuthService.requireAdmin();
    if (!communicationId) throw new Error('VALIDATION: communicationId is required');

    var record = DataService.getRecordById('cm_communications', communicationId);
    if (!record) throw new Error('NOT_FOUND: Communication not found');

    DataService.deleteRecord('cm_communications', communicationId, { hard: true });
    return true;
  }

  /**
   * Returns a pre-filled communication template based on message type.
   * @param {string} messageType
   * @param {string} initiativeId
   * @returns {{ subject: string, content: string }}
   */
  function getCommunicationTemplate(messageType, initiativeId) {
    AuthService.requireAdmin();
    if (!messageType || !initiativeId) throw new Error('VALIDATION: messageType and initiativeId are required');

    var init = DataService.getRecordById('initiatives', initiativeId);
    if (!init) throw new Error('NOT_FOUND: Initiative not found');

    // Find current Lippitt phase
    var phases = DataService.query('lippitt_phases', {
      filters: { initiative_id: initiativeId },
      sort: { field: 'phase_number', direction: 'asc' }
    }).data;
    var currentPhase = null;
    for (var i = 0; i < phases.length; i++) {
      if (phases[i].status === 'in_progress') { currentPhase = phases[i]; break; }
    }
    var phaseName = currentPhase ? currentPhase.phase_name : 'Pre-launch';

    var title = init.title;

    switch (messageType) {
      case 'announcement':
        return {
          subject: title + ': Launch Announcement',
          content: 'Dear colleagues,\n\nWe are excited to announce the launch of ' + title + '. This initiative aims to ' + (init.description || 'improve our practices') + '.\n\nMore details will follow in upcoming communications. Please reach out if you have any questions.\n\nBest regards'
        };
      case 'update':
        return {
          subject: title + ': Progress Update',
          content: 'Dear colleagues,\n\nHere is an update on ' + title + '.\n\nCurrent phase: ' + phaseName + '\n\nKey developments:\n- [Add key developments here]\n\nNext steps:\n- [Add next steps here]\n\nBest regards'
        };
      case 'feedback_request':
        return {
          subject: title + ': Your Feedback Needed',
          content: 'Dear colleagues,\n\nAs we progress through the ' + phaseName + ' phase of ' + title + ', we value your input.\n\nPlease share your thoughts on:\n1. [Topic 1]\n2. [Topic 2]\n\nYour feedback will help shape the direction of this initiative.\n\nBest regards'
        };
      case 'milestone':
        return {
          subject: title + ': Milestone Reached',
          content: 'Dear colleagues,\n\nWe are pleased to share that ' + title + ' has reached an important milestone.\n\nThe ' + phaseName + ' phase has been successfully completed. Key outcomes include:\n- [Add outcomes here]\n\nThank you for your continued support.\n\nBest regards'
        };
      case 'escalation':
        return {
          subject: title + ': Action Required',
          content: 'Dear leadership team,\n\nThis initiative requires attention. Current status: ' + init.status + '.\n\nCurrent phase: ' + phaseName + '\n\nConcerns:\n- [Add concerns here]\n\nProposed actions:\n- [Add proposed actions here]\n\nWe request a meeting to discuss next steps.\n\nBest regards'
        };
      default:
        return { subject: title, content: '' };
    }
  }

  // ─── Readiness Trends ──────────────────────────────────────────

  /**
   * Computes readiness trend data from all assessments for an initiative.
   * @param {string} initiativeId
   * @returns {Object}
   */
  function getReadinessTrends(initiativeId) {
    AuthService.requireAdmin();
    if (!initiativeId) throw new Error('VALIDATION: initiativeId is required');

    var init = DataService.getRecordById('initiatives', initiativeId);
    if (!init) throw new Error('NOT_FOUND: Initiative not found');

    var sMap = staffMap_();
    var useConsensus = getUseConsensus_();

    var assessments = DataService.query('knoster_assessments', {
      filters: { initiative_id: initiativeId },
      sort: { field: 'assessed_at', direction: 'asc' }
    }).data;

    var trendData = [];
    var elementHistory = [];
    var riskHistory = [];

    for (var i = 0; i < assessments.length; i++) {
      var a = assessments[i];
      var risk = calculateRisk_(a, useConsensus);

      trendData.push({
        date: a.assessed_at,
        overallReadiness: risk.overallReadiness,
        assessedBy: staffName_(sMap, a.assessed_by)
      });

      elementHistory.push({
        date: a.assessed_at,
        vision: parseInt(a.vision_score) || 0,
        skills: parseInt(a.skills_score) || 0,
        incentives: parseInt(a.incentives_score) || 0,
        resources: parseInt(a.resources_score) || 0,
        actionPlan: parseInt(a.action_plan_score) || 0,
        consensus: useConsensus ? (parseInt(a.consensus_score) || 0) : null
      });

      riskHistory.push({
        date: a.assessed_at,
        gapCount: risk.gaps.length,
        warningCount: risk.warnings.length,
        risks: risk.gaps.map(function(g) { return g.risk; })
      });
    }

    // Latest vs previous for radar chart
    var latestVsPrevious = null;
    if (assessments.length >= 2) {
      var latest = assessments[assessments.length - 1];
      var previous = assessments[assessments.length - 2];
      latestVsPrevious = {
        latest: {
          vision: parseInt(latest.vision_score) || 0,
          skills: parseInt(latest.skills_score) || 0,
          incentives: parseInt(latest.incentives_score) || 0,
          resources: parseInt(latest.resources_score) || 0,
          actionPlan: parseInt(latest.action_plan_score) || 0,
          consensus: useConsensus ? (parseInt(latest.consensus_score) || 0) : null
        },
        previous: {
          vision: parseInt(previous.vision_score) || 0,
          skills: parseInt(previous.skills_score) || 0,
          incentives: parseInt(previous.incentives_score) || 0,
          resources: parseInt(previous.resources_score) || 0,
          actionPlan: parseInt(previous.action_plan_score) || 0,
          consensus: useConsensus ? (parseInt(previous.consensus_score) || 0) : null
        },
        latestDate: latest.assessed_at,
        previousDate: previous.assessed_at
      };
    }

    return {
      trendData: trendData,
      elementHistory: elementHistory,
      riskHistory: riskHistory,
      latestVsPrevious: latestVsPrevious,
      useConsensus: useConsensus
    };
  }

  /**
   * Returns a heat map matrix of all initiatives x all Knoster elements.
   * @returns {Object}
   */
  function getReadinessHeatMap() {
    AuthService.requireAdmin();
    var useConsensus = getUseConsensus_();

    var initiatives = DataService.query('initiatives', {
      sort: { field: 'created_at', direction: 'desc' }
    }).data.filter(function(i) { return i.status !== 'abandoned'; });

    var allAssessments = DataService.getRecords('knoster_assessments');
    var assessmentsByInit = {};
    for (var ai = 0; ai < allAssessments.length; ai++) {
      var a = allAssessments[ai];
      if (!assessmentsByInit[a.initiative_id]) assessmentsByInit[a.initiative_id] = [];
      assessmentsByInit[a.initiative_id].push(a);
    }

    var rows = [];
    for (var ii = 0; ii < initiatives.length; ii++) {
      var init = initiatives[ii];
      var assessments = (assessmentsByInit[init.id] || []).sort(function(a, b) {
        return new Date(b.assessed_at) - new Date(a.assessed_at);
      });
      var latest = assessments.length > 0 ? assessments[0] : null;

      rows.push({
        id: init.id,
        title: init.title,
        status: init.status,
        scores: latest ? {
          vision: parseInt(latest.vision_score) || 0,
          skills: parseInt(latest.skills_score) || 0,
          incentives: parseInt(latest.incentives_score) || 0,
          resources: parseInt(latest.resources_score) || 0,
          actionPlan: parseInt(latest.action_plan_score) || 0,
          consensus: useConsensus ? (parseInt(latest.consensus_score) || 0) : null
        } : null,
        overallReadiness: latest ? calculateRisk_(latest, useConsensus).overallReadiness : null
      });
    }

    var elements = ['Vision', 'Skills', 'Incentives', 'Resources', 'Action Plan'];
    if (useConsensus) elements.push('Consensus');

    return {
      initiatives: rows,
      elements: elements,
      useConsensus: useConsensus
    };
  }

  // ─── Progress Timeline ─────────────────────────────────────────

  /**
   * Computes timeline data: phase durations, milestones, and health score.
   * @param {string} initiativeId
   * @returns {Object}
   */
  function getInitiativeTimeline(initiativeId) {
    AuthService.requireAdmin();
    if (!initiativeId) throw new Error('VALIDATION: initiativeId is required');

    var init = DataService.getRecordById('initiatives', initiativeId);
    if (!init) throw new Error('NOT_FOUND: Initiative not found');

    var sMap = staffMap_();
    var useConsensus = getUseConsensus_();
    var now = new Date();

    // ── Phases ──
    var phases = DataService.query('lippitt_phases', {
      filters: { initiative_id: initiativeId },
      sort: { field: 'phase_number', direction: 'asc' }
    }).data;

    var phaseData = [];
    for (var pi = 0; pi < phases.length; pi++) {
      var p = phases[pi];
      var durationDays = null;
      if (p.status === 'completed' && p.entry_date && p.completion_date) {
        durationDays = daysBetween(new Date(p.entry_date), new Date(p.completion_date));
      } else if (p.status === 'in_progress' && p.entry_date) {
        durationDays = daysBetween(new Date(p.entry_date), now);
      }

      phaseData.push({
        phaseNumber: parseInt(p.phase_number),
        phaseName: p.phase_name,
        status: p.status,
        entryDate: p.entry_date || '',
        completionDate: p.completion_date || '',
        durationDays: durationDays,
        isActive: p.status === 'in_progress'
      });
    }

    // ── Milestones ──
    var milestones = [];

    // Phase completions
    for (var mi = 0; mi < phases.length; mi++) {
      if (phases[mi].status === 'completed' && phases[mi].completion_date) {
        milestones.push({
          type: 'phase_complete',
          date: phases[mi].completion_date,
          label: 'Phase ' + phases[mi].phase_number + ': ' + phases[mi].phase_name + ' completed',
          phaseNumber: parseInt(phases[mi].phase_number)
        });
      }
    }

    // Assessment dates
    var assessments = DataService.query('knoster_assessments', {
      filters: { initiative_id: initiativeId },
      sort: { field: 'assessed_at', direction: 'asc' }
    }).data;

    for (var ai = 0; ai < assessments.length; ai++) {
      var a = assessments[ai];
      var risk = calculateRisk_(a, useConsensus);
      milestones.push({
        type: 'assessment',
        date: a.assessed_at,
        label: 'Assessment: ' + risk.overallReadiness + '/5 readiness',
        readiness: risk.overallReadiness
      });
    }

    // Sort milestones by date
    milestones.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });

    // ── Phase Duration Analytics ──
    // Compute cross-initiative averages per phase number
    var allPhases = DataService.getRecords('lippitt_phases');
    var phaseAvgs = {};  // phaseNumber → [durations]
    for (var di = 0; di < allPhases.length; di++) {
      var ap = allPhases[di];
      if (ap.status === 'completed' && ap.entry_date && ap.completion_date) {
        var pNum = parseInt(ap.phase_number);
        if (!phaseAvgs[pNum]) phaseAvgs[pNum] = [];
        phaseAvgs[pNum].push(daysBetween(new Date(ap.entry_date), new Date(ap.completion_date)));
      }
    }

    var phaseDurations = [];
    for (var pdi = 0; pdi < phaseData.length; pdi++) {
      var pd = phaseData[pdi];
      if (pd.durationDays === null) continue;
      var avgArr = phaseAvgs[pd.phaseNumber] || [];
      var avgDays = avgArr.length > 0 ? roundTo(average(avgArr), 1) : null;
      var comparison = 'N/A';
      if (avgDays !== null && pd.status === 'completed') {
        comparison = pd.durationDays < avgDays ? 'faster' : (pd.durationDays > avgDays ? 'slower' : 'average');
      } else if (pd.status === 'in_progress') {
        comparison = 'in_progress';
      }

      phaseDurations.push({
        phaseNumber: pd.phaseNumber,
        phaseName: pd.phaseName,
        actualDays: pd.durationDays,
        avgDays: avgDays,
        comparison: comparison
      });
    }

    // ── Health Score ──
    // Knoster Readiness (40%): latest overall_readiness / 5 * 100
    var latestAssessment = assessments.length > 0 ? assessments[assessments.length - 1] : null;
    var knosterScore = 0;
    if (latestAssessment) {
      var latestRisk = calculateRisk_(latestAssessment, useConsensus);
      knosterScore = roundTo((latestRisk.overallReadiness / 5) * 100, 1);
    }

    // Lippitt Progress (35%): completed phases / 7 * 100
    var completedCount = 0;
    for (var ci = 0; ci < phases.length; ci++) {
      if (phases[ci].status === 'completed') completedCount++;
    }
    var lippittScore = roundTo((completedCount / 7) * 100, 1);

    // Stakeholder Balance (25%): weighted average
    var stakeholders = DataService.query('initiative_stakeholders', {
      filters: { initiative_id: initiativeId }
    }).data;
    var stakeholderScore = 0;
    if (stakeholders.length > 0) {
      var engagementTotal = 0;
      for (var si = 0; si < stakeholders.length; si++) {
        var level = stakeholders[si].engagement_level;
        if (level === 'supportive') engagementTotal += 100;
        else if (level === 'neutral') engagementTotal += 50;
        // resistant = 0
      }
      stakeholderScore = roundTo(engagementTotal / stakeholders.length, 1);
    }

    var overallHealth = roundTo(
      (knosterScore * 0.40) + (lippittScore * 0.35) + (stakeholderScore * 0.25),
      1
    );

    return {
      initiative: {
        id: init.id,
        title: init.title,
        startDate: init.start_date || '',
        targetDate: init.target_date || ''
      },
      phases: phaseData,
      milestones: milestones,
      healthScore: {
        overall: overallHealth,
        knosterScore: knosterScore,
        lippittScore: lippittScore,
        stakeholderScore: stakeholderScore
      },
      phaseDurations: phaseDurations
    };
  }

  // ─── Public API ─────────────────────────────────────────────────

  return {
    getOverview: getOverview,
    getInitiativeDetail: getInitiativeDetail,
    createInitiative: createInitiative,
    updateInitiative: updateInitiative,
    deleteInitiative: deleteInitiative,
    createAssessment: createAssessment,
    getAssessmentHistory: getAssessmentHistory,
    updateLippittPhase: updateLippittPhase,
    addStakeholder: addStakeholder,
    updateStakeholder: updateStakeholder,
    removeStakeholder: removeStakeholder,
    getInitiativeComparison: getInitiativeComparison,
    getConfig: getConfig,
    // Communications
    getCommunications: getCommunications,
    createCommunication: createCommunication,
    updateCommunication: updateCommunication,
    deleteCommunication: deleteCommunication,
    getCommunicationTemplate: getCommunicationTemplate,
    // Analytics
    getReadinessTrends: getReadinessTrends,
    getReadinessHeatMap: getReadinessHeatMap,
    // Timeline
    getInitiativeTimeline: getInitiativeTimeline
  };

})();
