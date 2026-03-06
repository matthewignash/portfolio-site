/**
 * WellnessService.gs — Staff Wellness & Workload tracking
 *
 * Provides wellness check-ins, cross-module workload calculation,
 * burnout detection, and admin dashboards.
 *
 * ES5 only (GAS Rhino runtime). IIFE pattern.
 */

var WellnessService = (function() {
  'use strict';

  // ═══════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════

  var staffCache_ = null;

  function staffMap_() {
    if (staffCache_) return staffCache_;
    var all = DataService.getRecords('staff');
    var map = {};
    for (var i = 0; i < all.length; i++) {
      map[all[i].id] = all[i];
    }
    staffCache_ = map;
    return map;
  }

  function staffName_(staffId) {
    var map = staffMap_();
    var s = map[staffId];
    if (!s) return 'Unknown';
    return s.first_name + ' ' + s.last_name;
  }

  function staffInitials_(staffId) {
    var map = staffMap_();
    var s = map[staffId];
    if (!s) return '??';
    return (s.first_name || '?').charAt(0) + (s.last_name || '?').charAt(0);
  }

  function logWellnessActivity_(staffId, actionType, fieldName, oldValue, newValue) {
    var user = AuthService.getCurrentUser();
    DataService.createRecord('wellness_activity', {
      staff_id: staffId || '',
      user_id: user.id,
      action_type: actionType,
      field_name: fieldName || '',
      old_value: oldValue || '',
      new_value: newValue || '',
      created_at: new Date().toISOString()
    });
  }

  function hydrateWellnessActivity_(entries) {
    var map = staffMap_();
    var result = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var staffRec = map[e.staff_id];
      var userRec = map[e.user_id];
      result.push({
        id: e.id,
        staffId: e.staff_id,
        staffName: staffRec ? (staffRec.first_name + ' ' + staffRec.last_name) : '',
        staffInitials: staffRec ? (staffRec.first_name.charAt(0) + staffRec.last_name.charAt(0)) : '',
        userId: e.user_id,
        userName: userRec ? (userRec.first_name + ' ' + userRec.last_name) : '',
        actionType: e.action_type,
        fieldName: e.field_name,
        oldValue: e.old_value,
        newValue: e.new_value,
        createdAt: e.created_at
      });
    }
    return result;
  }

  function getWellnessConfig_() {
    var rows = DataService.getRecords('wellness_config');
    var cfg = {};
    for (var i = 0; i < rows.length; i++) {
      cfg[rows[i].key] = rows[i].value;
    }
    return cfg;
  }

  function nowISO_() {
    return new Date().toISOString();
  }

  function daysAgoISO_(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  // ═══════════════════════════════════════════════
  // Check-in functions
  // ═══════════════════════════════════════════════

  /**
   * Submit a wellness check-in.
   * @param {string} staffId
   * @param {Object} data - { energy, mood, stress, balance, satisfaction, notes, developmental_comfort? }
   * @returns {Object} created record
   */
  function submitCheckin(staffId, data) {
    if (!staffId) throw new Error('VALIDATION: staffId is required');

    var dimensions = ['energy', 'mood', 'stress', 'balance', 'satisfaction'];
    for (var i = 0; i < dimensions.length; i++) {
      var val = parseInt(data[dimensions[i]], 10);
      if (isNaN(val) || val < 1 || val > 5) {
        throw new Error('VALIDATION: ' + dimensions[i] + ' must be between 1 and 5');
      }
    }

    var e = parseInt(data.energy, 10);
    var m = parseInt(data.mood, 10);
    var s = parseInt(data.stress, 10);
    var b = parseInt(data.balance, 10);
    var sat = parseInt(data.satisfaction, 10);
    var overall = Math.round(((e + m + s + b + sat) / 5) * 10) / 10;

    // Optional developmental comfort (6th dimension — DDO integration)
    var devComfort = 0;
    if (data.developmental_comfort) {
      devComfort = parseInt(data.developmental_comfort, 10);
      if (isNaN(devComfort) || devComfort < 1 || devComfort > 5) {
        devComfort = 0; // Silently ignore invalid — it's optional
      }
    }

    var recordData = {
      staff_id: staffId,
      checkin_date: nowISO_(),
      energy_score: String(e),
      mood_score: String(m),
      stress_score: String(s),
      balance_score: String(b),
      satisfaction_score: String(sat),
      notes: data.notes || '',
      overall_score: String(overall),
      developmental_comfort: devComfort > 0 ? String(devComfort) : '',
      created_at: nowISO_()
    };

    var record = DataService.createRecord('wellness_checkins', recordData);

    logWellnessActivity_(staffId, 'checkin_submitted', 'overall_score', '', String(overall));

    // Run burnout check after submission
    try {
      checkBurnoutIndicators_(staffId);
    } catch (err) {
      Logger.log('WellnessService: burnout check error — ' + err.message);
    }

    return record;
  }

  /**
   * Get check-ins for a specific staff member.
   * @param {string} staffId
   * @param {number} [limit] - max results (default 50)
   * @returns {Array}
   */
  function getMyCheckins(staffId, limit) {
    var all = DataService.getRecords('wellness_checkins', { staff_id: staffId });
    // Sort by date desc
    all.sort(function(a, b) {
      return (b.checkin_date || '').localeCompare(a.checkin_date || '');
    });
    var max = limit ? parseInt(limit, 10) : 50;
    return all.slice(0, max);
  }

  /**
   * Get weekly trend data for a staff member.
   * @param {string} staffId
   * @param {number} [weeks] - number of weeks (default 12)
   * @returns {Object} { weeks, energy, mood, stress, balance, satisfaction, overall }
   */
  function getMyTrend(staffId, weeks) {
    var numWeeks = weeks ? parseInt(weeks, 10) : 12;
    var all = DataService.getRecords('wellness_checkins', { staff_id: staffId });

    // Sort by date asc
    all.sort(function(a, b) {
      return (a.checkin_date || '').localeCompare(b.checkin_date || '');
    });

    // Group by week
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (numWeeks * 7));
    var cutoffISO = cutoff.toISOString();

    var weekLabels = [];
    var energyArr = [];
    var moodArr = [];
    var stressArr = [];
    var balanceArr = [];
    var satArr = [];
    var overallArr = [];
    var devComfortArr = [];

    // Build week buckets
    for (var w = 0; w < numWeeks; w++) {
      var weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - ((numWeeks - w) * 7));
      var weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - ((numWeeks - w - 1) * 7));

      var weekStartISO = weekStart.toISOString();
      var weekEndISO = weekEnd.toISOString();

      var weekCheckins = [];
      for (var c = 0; c < all.length; c++) {
        var cd = all[c].checkin_date || '';
        if (cd >= weekStartISO && cd < weekEndISO) {
          weekCheckins.push(all[c]);
        }
      }

      var weekLabel = (weekStart.getMonth() + 1) + '/' + weekStart.getDate();
      weekLabels.push(weekLabel);

      if (weekCheckins.length === 0) {
        energyArr.push(null);
        moodArr.push(null);
        stressArr.push(null);
        balanceArr.push(null);
        satArr.push(null);
        overallArr.push(null);
        devComfortArr.push(null);
      } else {
        var eSum = 0, mSum = 0, sSum = 0, bSum = 0, satSum = 0, oSum = 0;
        var dcSum = 0, dcCount = 0;
        for (var j = 0; j < weekCheckins.length; j++) {
          eSum += parseFloat(weekCheckins[j].energy_score) || 0;
          mSum += parseFloat(weekCheckins[j].mood_score) || 0;
          sSum += parseFloat(weekCheckins[j].stress_score) || 0;
          bSum += parseFloat(weekCheckins[j].balance_score) || 0;
          satSum += parseFloat(weekCheckins[j].satisfaction_score) || 0;
          oSum += parseFloat(weekCheckins[j].overall_score) || 0;
          var dcVal = parseInt(weekCheckins[j].developmental_comfort, 10);
          if (dcVal > 0) { dcSum += dcVal; dcCount++; }
        }
        var n = weekCheckins.length;
        energyArr.push(Math.round((eSum / n) * 10) / 10);
        moodArr.push(Math.round((mSum / n) * 10) / 10);
        stressArr.push(Math.round((sSum / n) * 10) / 10);
        balanceArr.push(Math.round((bSum / n) * 10) / 10);
        satArr.push(Math.round((satSum / n) * 10) / 10);
        overallArr.push(Math.round((oSum / n) * 10) / 10);
        devComfortArr.push(dcCount > 0 ? Math.round((dcSum / dcCount) * 10) / 10 : null);
      }
    }

    return {
      weeks: weekLabels,
      energy: energyArr,
      mood: moodArr,
      stress: stressArr,
      balance: balanceArr,
      satisfaction: satArr,
      overall: overallArr,
      developmental_comfort: devComfortArr
    };
  }

  /**
   * Get the most recent check-in for a staff member.
   * @param {string} staffId
   * @returns {Object|null}
   */
  function getMyLatestCheckin(staffId) {
    var all = DataService.getRecords('wellness_checkins', { staff_id: staffId });
    if (all.length === 0) return null;
    all.sort(function(a, b) {
      return (b.checkin_date || '').localeCompare(a.checkin_date || '');
    });
    return all[0];
  }

  // ═══════════════════════════════════════════════
  // Workload functions (cross-module)
  // ═══════════════════════════════════════════════

  /**
   * Calculate composite workload for a single staff member.
   * Reads from 6 module tables to compute a 0-100 score.
   *
   * @param {string} staffId
   * @returns {Object} { staffId, staffName, department, components, compositeScore, level }
   */
  function getStaffWorkload(staffId) {
    var map = staffMap_();
    var staff = map[staffId];
    if (!staff) throw new Error('NOT_FOUND: Staff not found');

    var cfg = getWellnessConfig_();
    var weights = {
      teaching: parseInt(cfg.workload_weight_teaching, 10) || 30,
      observations: parseInt(cfg.workload_weight_observations, 10) || 15,
      pd: parseInt(cfg.workload_weight_pd, 10) || 15,
      meetings: parseInt(cfg.workload_weight_meetings, 10) || 15,
      feedback: parseInt(cfg.workload_weight_feedback, 10) || 10,
      growth_plan: parseInt(cfg.workload_weight_growth_plan, 10) || 15
    };
    var greenThreshold = parseInt(cfg.green_threshold, 10) || 60;
    var amberThreshold = parseInt(cfg.amber_threshold, 10) || 80;

    var ninetyDaysAgo = daysAgoISO_(90);
    var components = {};

    // 1. Teaching: count non-prep timetable periods
    try {
      var ttRows = DataService.getRecords('timetable', { staff_id: staffId });
      var teachingCount = 0;
      for (var t = 0; t < ttRows.length; t++) {
        if (String(ttRows[t].is_prep).toLowerCase() !== 'true') {
          teachingCount++;
        }
      }
      // Normalize: assume 40 periods/week is max load (8 periods x 5 days)
      var maxPeriods = 40;
      components.teaching = {
        count: teachingCount,
        maxExpected: maxPeriods,
        normalized: Math.min(Math.round((teachingCount / maxPeriods) * 100), 100),
        label: teachingCount + ' teaching periods/week'
      };
    } catch (e) {
      components.teaching = { count: 0, maxExpected: 40, normalized: 0, label: 'Error loading' };
    }

    // 2. Observations: count where observer or teacher in last 90 days
    try {
      var allObs = DataService.getRecords('observations');
      var obsCount = 0;
      for (var o = 0; o < allObs.length; o++) {
        var obs = allObs[o];
        if ((obs.observer_id === staffId || obs.teacher_id === staffId) &&
            (obs.created_at || '') >= ninetyDaysAgo) {
          obsCount++;
        }
      }
      // Normalize: 10 observations in 90 days is high
      components.observations = {
        count: obsCount,
        maxExpected: 10,
        normalized: Math.min(Math.round((obsCount / 10) * 100), 100),
        label: obsCount + ' observations (90 days)'
      };
    } catch (e) {
      components.observations = { count: 0, maxExpected: 10, normalized: 0, label: 'Error loading' };
    }

    // 3. PD: count active registrations
    try {
      var pdRegs = DataService.getRecords('pd_registrations', { staff_id: staffId });
      var pdCount = 0;
      for (var p = 0; p < pdRegs.length; p++) {
        var pStatus = pdRegs[p].status;
        if (pStatus === 'registered' || pStatus === 'attended') {
          pdCount++;
        }
      }
      // Normalize: 8 PD sessions is high
      components.pd = {
        count: pdCount,
        maxExpected: 8,
        normalized: Math.min(Math.round((pdCount / 8) * 100), 100),
        label: pdCount + ' PD registrations'
      };
    } catch (e) {
      components.pd = { count: 0, maxExpected: 8, normalized: 0, label: 'Error loading' };
    }

    // 4. Meetings: count recent meetings + pending action items
    try {
      var allMeetings = DataService.getRecords('meetings');
      var meetingCount = 0;
      for (var mt = 0; mt < allMeetings.length; mt++) {
        var mtg = allMeetings[mt];
        var attendees = mtg.attendees_csv || '';
        if (attendees.indexOf(staffId) !== -1 &&
            (mtg.meeting_date || mtg.created_at || '') >= ninetyDaysAgo) {
          meetingCount++;
        }
      }
      // Also count pending action items assigned to this person
      var allActions = DataService.getRecords('meeting_action_items');
      var pendingActions = 0;
      for (var ai = 0; ai < allActions.length; ai++) {
        if (allActions[ai].assigned_to === staffId &&
            (allActions[ai].status === 'pending' || allActions[ai].status === 'in_progress')) {
          pendingActions++;
        }
      }
      // Normalize: 15 meetings in 90 days + 5 action items is high
      var meetingTotal = meetingCount + pendingActions;
      components.meetings = {
        count: meetingCount,
        actionItems: pendingActions,
        maxExpected: 20,
        normalized: Math.min(Math.round((meetingTotal / 20) * 100), 100),
        label: meetingCount + ' meetings + ' + pendingActions + ' action items'
      };
    } catch (e) {
      components.meetings = { count: 0, actionItems: 0, maxExpected: 20, normalized: 0, label: 'Error loading' };
    }

    // 5. Feedback: count pending/in-progress assignments as responder
    try {
      var fbAssignments = DataService.getRecords('feedback_assignments', { responder_id: staffId });
      var fbCount = 0;
      for (var fb = 0; fb < fbAssignments.length; fb++) {
        var fbStatus = fbAssignments[fb].status;
        if (fbStatus === 'pending' || fbStatus === 'in_progress') {
          fbCount++;
        }
      }
      // Normalize: 6 pending feedback assignments is high
      components.feedback = {
        count: fbCount,
        maxExpected: 6,
        normalized: Math.min(Math.round((fbCount / 6) * 100), 100),
        label: fbCount + ' pending feedback reviews'
      };
    } catch (e) {
      components.feedback = { count: 0, maxExpected: 6, normalized: 0, label: 'Error loading' };
    }

    // 6. Growth Plan: count in-progress standard selections
    try {
      // Find active plan for this staff
      var plans = DataService.getRecords('growth_plans', { staff_id: staffId });
      var gpCount = 0;
      for (var gp = 0; gp < plans.length; gp++) {
        if (plans[gp].status === 'active' || plans[gp].status === 'in_progress') {
          var selections = DataService.getRecords('pgp_standard_selections', { plan_id: plans[gp].id });
          for (var sel = 0; sel < selections.length; sel++) {
            if (selections[sel].status === 'in_progress') {
              gpCount++;
            }
          }
        }
      }
      // Normalize: 5 in-progress standards is high
      components.growth_plan = {
        count: gpCount,
        maxExpected: 5,
        normalized: Math.min(Math.round((gpCount / 5) * 100), 100),
        label: gpCount + ' active growth plan standards'
      };
    } catch (e) {
      components.growth_plan = { count: 0, maxExpected: 5, normalized: 0, label: 'Error loading' };
    }

    // 7. Developmental Load (DDO integration):
    //    Count active ITC maps + coaching group memberships + public growing edges
    try {
      var devItems = 0;
      var devDetails = { itcMaps: 0, coachingGroups: 0, publicEdges: 0 };

      // Active ITC maps (status = 'active' or 'in_progress')
      var itcMaps = DataService.getRecords('itc_maps', { staff_id: staffId });
      for (var itc = 0; itc < itcMaps.length; itc++) {
        var itcStatus = itcMaps[itc].status;
        if (itcStatus === 'active' || itcStatus === 'in_progress') {
          devDetails.itcMaps++;
        }
      }
      devItems += devDetails.itcMaps;

      // Active coaching group memberships
      var cgMembers = DataService.getRecords('coaching_group_members', { staff_id: staffId });
      for (var cg = 0; cg < cgMembers.length; cg++) {
        if (!cgMembers[cg].left_at) {
          devDetails.coachingGroups++;
        }
      }
      devItems += devDetails.coachingGroups;

      // Public growing edges (growing_edge_visibility = 'public' or 'team')
      var staffPlans = plans || DataService.getRecords('growth_plans', { staff_id: staffId });
      for (var pe = 0; pe < staffPlans.length; pe++) {
        var vis = staffPlans[pe].growing_edge_visibility;
        if ((vis === 'public' || vis === 'team') &&
            (staffPlans[pe].status === 'active' || staffPlans[pe].status === 'in_progress')) {
          devDetails.publicEdges++;
        }
      }
      devItems += devDetails.publicEdges;

      // Normalize: 6 developmental obligations is high load
      components.developmental = {
        count: devItems,
        maxExpected: 6,
        normalized: Math.min(Math.round((devItems / 6) * 100), 100),
        label: devDetails.itcMaps + ' ITC maps, ' + devDetails.coachingGroups + ' coaching groups, ' + devDetails.publicEdges + ' public edges',
        detail: devDetails
      };
    } catch (e) {
      components.developmental = { count: 0, maxExpected: 6, normalized: 0, label: 'Error loading', detail: { itcMaps: 0, coachingGroups: 0, publicEdges: 0 } };
    }

    // Calculate composite score (weighted average of normalized scores)
    // Developmental load uses a small weight (5%) borrowed proportionally from others
    var devWeight = 5;
    var totalWeight = weights.teaching + weights.observations + weights.pd +
                      weights.meetings + weights.feedback + weights.growth_plan + devWeight;
    var weightedSum = (components.teaching.normalized * weights.teaching) +
                      (components.observations.normalized * weights.observations) +
                      (components.pd.normalized * weights.pd) +
                      (components.meetings.normalized * weights.meetings) +
                      (components.feedback.normalized * weights.feedback) +
                      (components.growth_plan.normalized * weights.growth_plan) +
                      (components.developmental.normalized * devWeight);

    var compositeScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    var level = 'green';
    if (compositeScore >= amberThreshold) {
      level = 'red';
    } else if (compositeScore >= greenThreshold) {
      level = 'amber';
    }

    return {
      staffId: staffId,
      staffName: staffName_(staffId),
      department: staff.department || '',
      components: components,
      compositeScore: compositeScore,
      level: level
    };
  }

  /**
   * Get workload for all active staff.
   * @returns {Object} { staff, stats }
   */
  function getAllStaffWorkloads() {
    var allStaff = DataService.getRecords('staff');
    var results = [];
    var greenCount = 0, amberCount = 0, redCount = 0;
    var totalScore = 0;

    for (var i = 0; i < allStaff.length; i++) {
      if (String(allStaff[i].is_active).toLowerCase() !== 'true' &&
          String(allStaff[i].is_active) !== '1') continue;

      try {
        var wl = getStaffWorkload(allStaff[i].id);
        results.push(wl);
        totalScore += wl.compositeScore;
        if (wl.level === 'green') greenCount++;
        else if (wl.level === 'amber') amberCount++;
        else redCount++;
      } catch (e) {
        Logger.log('WellnessService: workload error for ' + allStaff[i].email + ' — ' + e.message);
      }
    }

    // Sort by composite score desc
    results.sort(function(a, b) { return b.compositeScore - a.compositeScore; });

    return {
      staff: results,
      stats: {
        total: results.length,
        greenCount: greenCount,
        amberCount: amberCount,
        redCount: redCount,
        avgScore: results.length > 0 ? Math.round(totalScore / results.length) : 0
      }
    };
  }

  // ═══════════════════════════════════════════════
  // Alert / Burnout functions
  // ═══════════════════════════════════════════════

  /**
   * Check burnout indicators for a staff member after check-in.
   * Creates alerts if patterns detected. Avoids duplicates.
   * @private
   */
  function checkBurnoutIndicators_(staffId) {
    var cfg = getWellnessConfig_();
    var declineWeeks = parseInt(cfg.burnout_decline_weeks, 10) || 3;
    var lowThreshold = parseFloat(cfg.low_score_threshold) || 2.5;

    // Get recent check-ins sorted by date desc
    var checkins = DataService.getRecords('wellness_checkins', { staff_id: staffId });
    checkins.sort(function(a, b) {
      return (b.checkin_date || '').localeCompare(a.checkin_date || '');
    });

    if (checkins.length < declineWeeks) return;

    // Check for declining trend
    var declining = true;
    for (var i = 0; i < declineWeeks - 1; i++) {
      var current = parseFloat(checkins[i].overall_score) || 0;
      var previous = parseFloat(checkins[i + 1].overall_score) || 0;
      if (current >= previous) {
        declining = false;
        break;
      }
    }

    if (declining) {
      // Check for existing active declining_wellness alert
      var existingAlerts = DataService.getRecords('wellness_alerts', {
        staff_id: staffId,
        alert_type: 'declining_wellness',
        status: 'active'
      });
      if (existingAlerts.length === 0) {
        var startScore = parseFloat(checkins[declineWeeks - 1].overall_score) || 0;
        var endScore = parseFloat(checkins[0].overall_score) || 0;
        DataService.createRecord('wellness_alerts', {
          staff_id: staffId,
          alert_type: 'declining_wellness',
          severity: 'warning',
          message: staffName_(staffId) + ' has shown declining wellness scores over ' + declineWeeks + ' consecutive weeks (from ' + startScore + ' to ' + endScore + ').',
          trigger_data: JSON.stringify({ weeks: declineWeeks, startScore: startScore, endScore: endScore }),
          status: 'active',
          acknowledged_by: '',
          acknowledged_at: '',
          created_at: nowISO_(),
          resolved_at: ''
        });
      }
    }

    // Check for low absolute score
    var latestScore = parseFloat(checkins[0].overall_score) || 0;
    if (latestScore <= lowThreshold) {
      var existingLow = DataService.getRecords('wellness_alerts', {
        staff_id: staffId,
        alert_type: 'burnout_risk',
        status: 'active'
      });
      if (existingLow.length === 0) {
        DataService.createRecord('wellness_alerts', {
          staff_id: staffId,
          alert_type: 'burnout_risk',
          severity: 'critical',
          message: staffName_(staffId) + ' has a critically low wellness score of ' + latestScore + '/5.',
          trigger_data: JSON.stringify({ score: latestScore }),
          status: 'active',
          acknowledged_by: '',
          acknowledged_at: '',
          created_at: nowISO_(),
          resolved_at: ''
        });
      }
    }

    // DDO Integration: check for high developmental load + low developmental comfort
    var latestDevComfort = parseInt(checkins[0].developmental_comfort, 10) || 0;
    if (latestDevComfort > 0 && latestDevComfort <= 2) {
      // Check if this person has a meaningful developmental load
      try {
        var devLoad = 0;
        var itcMaps = DataService.getRecords('itc_maps', { staff_id: staffId });
        for (var im = 0; im < itcMaps.length; im++) {
          if (itcMaps[im].status === 'active' || itcMaps[im].status === 'in_progress') devLoad++;
        }
        var cgMembers = DataService.getRecords('coaching_group_members', { staff_id: staffId });
        for (var cm = 0; cm < cgMembers.length; cm++) {
          if (!cgMembers[cm].left_at) devLoad++;
        }

        // Only flag if dev load >= 2 (has real developmental obligations)
        if (devLoad >= 2) {
          var existingDevAlert = DataService.getRecords('wellness_alerts', {
            staff_id: staffId,
            alert_type: 'developmental_strain',
            status: 'active'
          });
          if (existingDevAlert.length === 0) {
            DataService.createRecord('wellness_alerts', {
              staff_id: staffId,
              alert_type: 'developmental_strain',
              severity: 'warning',
              message: staffName_(staffId) + ' reports low developmental comfort (' + latestDevComfort + '/5) with ' + devLoad + ' active developmental obligations. Consider adjusting their growth pace.',
              trigger_data: JSON.stringify({ devComfort: latestDevComfort, devLoad: devLoad }),
              status: 'active',
              acknowledged_by: '',
              acknowledged_at: '',
              created_at: nowISO_(),
              resolved_at: ''
            });
          }
        }
      } catch (devErr) {
        Logger.log('WellnessService: dev strain check error — ' + devErr.message);
      }
    }
  }

  /**
   * Admin: Run a full burnout scan across all staff.
   * Checks for missing check-ins and high workloads.
   * @returns {Object} { alertsGenerated }
   */
  function runBurnoutScan() {
    var cfg = getWellnessConfig_();
    var noCheckinWeeks = parseInt(cfg.no_checkin_weeks, 10) || 3;
    var amberThreshold = parseInt(cfg.amber_threshold, 10) || 80;
    var cutoff = daysAgoISO_(noCheckinWeeks * 7);
    var alertsGenerated = 0;

    var allStaff = DataService.getRecords('staff');
    for (var i = 0; i < allStaff.length; i++) {
      var s = allStaff[i];
      if (String(s.is_active).toLowerCase() !== 'true' && String(s.is_active) !== '1') continue;

      // Check for missing check-ins
      var checkins = DataService.getRecords('wellness_checkins', { staff_id: s.id });
      var hasRecentCheckin = false;
      for (var c = 0; c < checkins.length; c++) {
        if ((checkins[c].checkin_date || '') >= cutoff) {
          hasRecentCheckin = true;
          break;
        }
      }

      if (!hasRecentCheckin) {
        var existingNoCheckin = DataService.getRecords('wellness_alerts', {
          staff_id: s.id,
          alert_type: 'no_checkin',
          status: 'active'
        });
        if (existingNoCheckin.length === 0) {
          DataService.createRecord('wellness_alerts', {
            staff_id: s.id,
            alert_type: 'no_checkin',
            severity: 'info',
            message: staffName_(s.id) + ' has not submitted a wellness check-in for ' + noCheckinWeeks + '+ weeks.',
            trigger_data: JSON.stringify({ weeksMissed: noCheckinWeeks }),
            status: 'active',
            acknowledged_by: '',
            acknowledged_at: '',
            created_at: nowISO_(),
            resolved_at: ''
          });
          alertsGenerated++;
        }
      }

      // Check for high workload
      try {
        var wl = getStaffWorkload(s.id);
        if (wl.compositeScore >= amberThreshold) {
          var existingHighWL = DataService.getRecords('wellness_alerts', {
            staff_id: s.id,
            alert_type: 'high_workload',
            status: 'active'
          });
          if (existingHighWL.length === 0) {
            DataService.createRecord('wellness_alerts', {
              staff_id: s.id,
              alert_type: 'high_workload',
              severity: wl.level === 'red' ? 'warning' : 'info',
              message: staffName_(s.id) + ' has an elevated workload score of ' + wl.compositeScore + '/100.',
              trigger_data: JSON.stringify({ compositeScore: wl.compositeScore }),
              status: 'active',
              acknowledged_by: '',
              acknowledged_at: '',
              created_at: nowISO_(),
              resolved_at: ''
            });
            alertsGenerated++;
          }
        }
      } catch (e) {
        // Skip workload check if error
      }

      // Also run burnout indicator check on existing check-in data
      try {
        if (checkins.length > 0) {
          checkBurnoutIndicators_(s.id);
        }
      } catch (e) {
        // Skip
      }
    }

    logWellnessActivity_('', 'burnout_scan', '', '', alertsGenerated + ' alert(s) generated');
    return { alertsGenerated: alertsGenerated };
  }

  /**
   * Get all active alerts with staff names.
   * @returns {Array}
   */
  function getActiveAlerts() {
    var alerts = DataService.getRecords('wellness_alerts');
    var result = [];
    for (var i = 0; i < alerts.length; i++) {
      var a = alerts[i];
      if (a.status === 'active' || a.status === 'acknowledged') {
        result.push({
          id: a.id,
          staffId: a.staff_id,
          staffName: staffName_(a.staff_id),
          staffInitials: staffInitials_(a.staff_id),
          alertType: a.alert_type,
          severity: a.severity,
          message: a.message,
          triggerData: a.trigger_data,
          status: a.status,
          acknowledgedBy: a.acknowledged_by ? staffName_(a.acknowledged_by) : '',
          acknowledgedAt: a.acknowledged_at,
          createdAt: a.created_at,
          resolvedAt: a.resolved_at
        });
      }
    }
    // Sort: critical first, then warning, then info; within same severity sort by date desc
    var severityOrder = { critical: 0, warning: 1, info: 2 };
    result.sort(function(a, b) {
      var sa = severityOrder[a.severity] !== undefined ? severityOrder[a.severity] : 3;
      var sb = severityOrder[b.severity] !== undefined ? severityOrder[b.severity] : 3;
      if (sa !== sb) return sa - sb;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    return result;
  }

  /**
   * Acknowledge an alert.
   * @param {string} alertId
   * @returns {Object}
   */
  function acknowledgeAlert(alertId) {
    var alert = DataService.getRecordById('wellness_alerts', alertId);
    if (!alert) throw new Error('NOT_FOUND: Alert not found');
    if (alert.status !== 'active') throw new Error('VALIDATION: Only active alerts can be acknowledged');

    var user = AuthService.getCurrentUser();
    var updated = DataService.updateRecord('wellness_alerts', alertId, {
      status: 'acknowledged',
      acknowledged_by: user.id,
      acknowledged_at: nowISO_()
    });

    logWellnessActivity_(alert.staff_id, 'alert_acknowledged', 'status', 'active', 'acknowledged');
    return updated;
  }

  /**
   * Resolve an alert.
   * @param {string} alertId
   * @returns {Object}
   */
  function resolveAlert(alertId) {
    var alert = DataService.getRecordById('wellness_alerts', alertId);
    if (!alert) throw new Error('NOT_FOUND: Alert not found');
    if (alert.status !== 'active' && alert.status !== 'acknowledged') {
      throw new Error('VALIDATION: Only active or acknowledged alerts can be resolved');
    }

    var updated = DataService.updateRecord('wellness_alerts', alertId, {
      status: 'resolved',
      resolved_at: nowISO_()
    });

    logWellnessActivity_(alert.staff_id, 'alert_resolved', 'status', alert.status, 'resolved');
    return updated;
  }

  // ═══════════════════════════════════════════════
  // Admin dashboard
  // ═══════════════════════════════════════════════

  /**
   * Returns aggregate admin dashboard data.
   * @returns {Object}
   */
  function getAdminDashboard() {
    var allCheckins = DataService.getRecords('wellness_checkins');
    var allStaff = DataService.getRecords('staff');
    var activeStaff = [];
    for (var i = 0; i < allStaff.length; i++) {
      if (String(allStaff[i].is_active).toLowerCase() === 'true' || String(allStaff[i].is_active) === '1') {
        activeStaff.push(allStaff[i]);
      }
    }

    var cfg = getWellnessConfig_();
    var freqWeeks = parseInt(cfg.checkin_frequency_weeks, 10) || 1;
    var checkinCutoff = daysAgoISO_(freqWeeks * 7 + 2); // 2-day grace

    // Average wellness score (last 2 weeks)
    var twoWeeksAgo = daysAgoISO_(14);
    var recentScores = [];
    for (var r = 0; r < allCheckins.length; r++) {
      if ((allCheckins[r].checkin_date || '') >= twoWeeksAgo) {
        recentScores.push(parseFloat(allCheckins[r].overall_score) || 0);
      }
    }
    var avgWellness = recentScores.length > 0
      ? Math.round((recentScores.reduce(function(a, b) { return a + b; }, 0) / recentScores.length) * 10) / 10
      : 0;

    // Check-in rate (how many active staff checked in within frequency)
    var checkedIn = {};
    for (var ci = 0; ci < allCheckins.length; ci++) {
      if ((allCheckins[ci].checkin_date || '') >= checkinCutoff) {
        checkedIn[allCheckins[ci].staff_id] = true;
      }
    }
    var checkinCount = 0;
    for (var key in checkedIn) {
      if (checkedIn.hasOwnProperty(key)) checkinCount++;
    }
    var checkinRate = activeStaff.length > 0
      ? Math.round((checkinCount / activeStaff.length) * 100)
      : 0;

    // Active alerts count
    var alerts = getActiveAlerts();
    var activeAlertCount = alerts.length;

    // Department heatmap
    var deptData = {};
    for (var di = 0; di < activeStaff.length; di++) {
      var dept = activeStaff[di].department || 'Unknown';
      if (!deptData[dept]) {
        deptData[dept] = { scores: [], count: 0 };
      }
    }
    // Aggregate latest check-in per staff by department
    var latestByStaff = {};
    for (var lc = 0; lc < allCheckins.length; lc++) {
      var sid = allCheckins[lc].staff_id;
      if (!latestByStaff[sid] || (allCheckins[lc].checkin_date || '') > (latestByStaff[sid].checkin_date || '')) {
        latestByStaff[sid] = allCheckins[lc];
      }
    }
    for (var ds = 0; ds < activeStaff.length; ds++) {
      var dept2 = activeStaff[ds].department || 'Unknown';
      var latest = latestByStaff[activeStaff[ds].id];
      if (latest) {
        if (!deptData[dept2]) deptData[dept2] = { scores: [], count: 0 };
        deptData[dept2].scores.push(parseFloat(latest.overall_score) || 0);
      }
      if (deptData[dept2]) deptData[dept2].count++;
    }

    var departmentHeatmap = [];
    for (var dName in deptData) {
      if (deptData.hasOwnProperty(dName)) {
        var dd = deptData[dName];
        var avg = dd.scores.length > 0
          ? Math.round((dd.scores.reduce(function(a, b) { return a + b; }, 0) / dd.scores.length) * 10) / 10
          : 0;
        departmentHeatmap.push({
          department: dName,
          avgScore: avg,
          staffCount: dd.count,
          respondents: dd.scores.length
        });
      }
    }

    // Staff requiring attention (declining + low + high workload)
    var staffAttention = [];
    for (var sa = 0; sa < alerts.length; sa++) {
      if (alerts[sa].status === 'active') {
        staffAttention.push({
          staffId: alerts[sa].staffId,
          staffName: alerts[sa].staffName,
          staffInitials: alerts[sa].staffInitials,
          alertType: alerts[sa].alertType,
          severity: alerts[sa].severity,
          message: alerts[sa].message
        });
      }
    }

    // Workload distribution
    var workloads;
    try {
      workloads = getAllStaffWorkloads();
    } catch (e) {
      workloads = { staff: [], stats: { total: 0, greenCount: 0, amberCount: 0, redCount: 0, avgScore: 0 } };
    }

    return {
      avgWellness: avgWellness,
      checkinRate: checkinRate,
      activeAlertCount: activeAlertCount,
      avgWorkload: workloads.stats.avgScore,
      departmentHeatmap: departmentHeatmap,
      staffRequiringAttention: staffAttention,
      workloadDistribution: workloads.stats
    };
  }

  /**
   * Get average wellness per department.
   * @returns {Array}
   */
  function getDepartmentWellness() {
    var dash = getAdminDashboard();
    return dash.departmentHeatmap;
  }

  /**
   * Get anonymized aggregate trends (no individual names).
   * @param {Object} [filters] - { department }
   * @returns {Object}
   */
  function getAnonymizedTrends(filters) {
    var allCheckins = DataService.getRecords('wellness_checkins');
    var map = staffMap_();

    // Filter by department if specified
    if (filters && filters.department) {
      var filtered = [];
      for (var f = 0; f < allCheckins.length; f++) {
        var staff = map[allCheckins[f].staff_id];
        if (staff && staff.department === filters.department) {
          filtered.push(allCheckins[f]);
        }
      }
      allCheckins = filtered;
    }

    // Sort by date asc
    allCheckins.sort(function(a, b) {
      return (a.checkin_date || '').localeCompare(b.checkin_date || '');
    });

    // Group by week, return averages
    var weekData = {};
    for (var c = 0; c < allCheckins.length; c++) {
      var dateStr = allCheckins[c].checkin_date || '';
      var d = new Date(dateStr);
      // Get week start (Monday)
      var day = d.getDay();
      var diff = d.getDate() - day + (day === 0 ? -6 : 1);
      var weekStart = new Date(d.setDate(diff));
      var weekKey = (weekStart.getMonth() + 1) + '/' + weekStart.getDate();

      if (!weekData[weekKey]) {
        weekData[weekKey] = { scores: [], count: 0, sortKey: weekStart.toISOString() };
      }
      weekData[weekKey].scores.push(parseFloat(allCheckins[c].overall_score) || 0);
      weekData[weekKey].count++;
    }

    var weeks = [];
    var avgScores = [];
    var sortable = [];
    for (var wk in weekData) {
      if (weekData.hasOwnProperty(wk)) {
        sortable.push({ label: wk, data: weekData[wk] });
      }
    }
    sortable.sort(function(a, b) { return a.data.sortKey.localeCompare(b.data.sortKey); });

    for (var sw = 0; sw < sortable.length; sw++) {
      weeks.push(sortable[sw].label);
      var scores = sortable[sw].data.scores;
      var sum = scores.reduce(function(a, b) { return a + b; }, 0);
      avgScores.push(Math.round((sum / scores.length) * 10) / 10);
    }

    return {
      weeks: weeks,
      avgOverall: avgScores
    };
  }

  // ═══════════════════════════════════════════════
  // Config & Stats
  // ═══════════════════════════════════════════════

  /**
   * Get wellness config as key-value map.
   * @returns {Object}
   */
  function getConfig() {
    return getWellnessConfig_();
  }

  /**
   * Update a config entry.
   * @param {string} key
   * @param {string} value
   * @returns {Object}
   */
  function updateConfig(key, value) {
    var rows = DataService.getRecords('wellness_config', { key: key });
    if (rows.length === 0) throw new Error('NOT_FOUND: Config key not found: ' + key);

    var oldValue = rows[0].value;
    var updated = DataService.updateRecord('wellness_config', rows[0].id, {
      value: String(value),
      updated_at: nowISO_()
    });

    logWellnessActivity_('', 'config_updated', key, oldValue, String(value));
    return updated;
  }

  /**
   * Get recent activity entries (hydrated).
   * @param {number} [limit] - default 50
   * @returns {Array}
   */
  function getActivity(limit) {
    var all = DataService.getRecords('wellness_activity');
    all.sort(function(a, b) {
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
    var max = limit ? parseInt(limit, 10) : 50;
    return hydrateWellnessActivity_(all.slice(0, max));
  }

  /**
   * Get aggregate stats for Reporting integration.
   * @returns {Object}
   */
  function getStats() {
    var allCheckins = DataService.getRecords('wellness_checkins');
    var allAlerts = DataService.getRecords('wellness_alerts');
    var allStaff = DataService.getRecords('staff');

    var activeStaffCount = 0;
    for (var i = 0; i < allStaff.length; i++) {
      if (String(allStaff[i].is_active).toLowerCase() === 'true' || String(allStaff[i].is_active) === '1') {
        activeStaffCount++;
      }
    }

    // Average overall score (all time)
    var totalScore = 0;
    for (var c = 0; c < allCheckins.length; c++) {
      totalScore += parseFloat(allCheckins[c].overall_score) || 0;
    }
    var avgScore = allCheckins.length > 0
      ? Math.round((totalScore / allCheckins.length) * 10) / 10
      : 0;

    // Active alerts
    var activeAlerts = 0;
    for (var a = 0; a < allAlerts.length; a++) {
      if (allAlerts[a].status === 'active') activeAlerts++;
    }

    // Check-in rate (last period)
    var cfg = getWellnessConfig_();
    var freqWeeks = parseInt(cfg.checkin_frequency_weeks, 10) || 1;
    var cutoff = daysAgoISO_(freqWeeks * 7 + 2);
    var checkedInStaff = {};
    for (var cr = 0; cr < allCheckins.length; cr++) {
      if ((allCheckins[cr].checkin_date || '') >= cutoff) {
        checkedInStaff[allCheckins[cr].staff_id] = true;
      }
    }
    var checkedInCount = 0;
    for (var k in checkedInStaff) {
      if (checkedInStaff.hasOwnProperty(k)) checkedInCount++;
    }
    var checkinRate = activeStaffCount > 0
      ? Math.round((checkedInCount / activeStaffCount) * 100)
      : 0;

    return {
      totalCheckins: allCheckins.length,
      avgScore: avgScore,
      activeAlerts: activeAlerts,
      checkinRate: checkinRate,
      activeStaffCount: activeStaffCount
    };
  }

  // ═══════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════

  return {
    // Check-ins
    submitCheckin: submitCheckin,
    getMyCheckins: getMyCheckins,
    getMyTrend: getMyTrend,
    getMyLatestCheckin: getMyLatestCheckin,

    // Workload
    getStaffWorkload: getStaffWorkload,
    getAllStaffWorkloads: getAllStaffWorkloads,

    // Alerts
    runBurnoutScan: runBurnoutScan,
    getActiveAlerts: getActiveAlerts,
    acknowledgeAlert: acknowledgeAlert,
    resolveAlert: resolveAlert,

    // Admin dashboard
    getAdminDashboard: getAdminDashboard,
    getDepartmentWellness: getDepartmentWellness,
    getAnonymizedTrends: getAnonymizedTrends,

    // Config & stats
    getConfig: getConfig,
    updateConfig: updateConfig,
    getActivity: getActivity,
    getStats: getStats
  };

})();
