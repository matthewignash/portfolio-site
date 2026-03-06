/**
 * ReportingService.gs — Executive Dashboard Aggregation
 *
 * Lightweight read-only service that calls existing module services
 * to assemble cross-module KPIs for the reporting dashboard.
 * No new sheets required — purely aggregates existing data.
 *
 * Dependencies: ObservationService, KanbanService, GrowthPlanService,
 *               ProjectService, ChangeMgmtService, AccreditationService,
 *               DataService, Utils
 */

var ReportingService = (function() {

  /**
   * Returns the full executive dashboard payload — one call, all KPIs.
   * Each module section is wrapped in a try/catch so a failure in one
   * module doesn't break the entire dashboard.
   *
   * @returns {Object}
   */
  function getExecutiveSummary() {

    var summary = {
      generatedAt: nowISO(),
      observations: null,
      growthPlans: null,
      projects: null,
      changeMgmt: null,
      accreditation: null,
      kanban: null,
      pd: null,
      feedback: null,
      wellness: null
    };

    // ── Observations ──
    try {
      var obsDash = ObservationService.getDashboard({});
      var obsStats = obsDash.stats || {};
      var totalTeachers = obsStats.teachersVisited + obsStats.teachersOverdue;
      if (totalTeachers === 0) totalTeachers = 1; // avoid divide-by-zero
      summary.observations = {
        coveragePercent: Math.round((obsStats.teachersVisited / totalTeachers) * 100),
        totalTeachers: totalTeachers,
        teachersVisited: obsStats.teachersVisited || 0,
        teachersOverdue: obsStats.teachersOverdue || 0,
        totalThisTerm: obsStats.totalThisTerm || 0,
        avgPerTeacher: obsStats.averagePerTeacher || 0,
        byType: obsStats.observationsByType || {}
      };
    } catch (e) {
      Logger.log('ReportingService: observations error — ' + e.message);
      summary.observations = { error: e.message };
    }

    // ── Growth Plans ──
    try {
      var gpData = GrowthPlanService.getOverview({});
      var gpStats = gpData.stats || {};
      var gpTotal = gpStats.total || 0;
      var gpActive = (gpStats.active || 0) + (gpStats.mid_year_review || 0) + (gpStats.final_review || 0);
      summary.growthPlans = {
        totalPlans: gpTotal,
        activePercent: gpTotal > 0 ? Math.round((gpActive / gpTotal) * 100) : 0,
        completedCount: gpStats.completed || 0,
        overdueCheckins: gpStats.overdueCheckins || 0,
        statusDistribution: {
          draft: gpStats.draft || 0,
          active: gpStats.active || 0,
          mid_year_review: gpStats.mid_year_review || 0,
          final_review: gpStats.final_review || 0,
          completed: gpStats.completed || 0
        }
      };
    } catch (e) {
      Logger.log('ReportingService: growthPlans error — ' + e.message);
      summary.growthPlans = { error: e.message };
    }

    // ── Projects ──
    try {
      var pjData = ProjectService.getOverview({});
      var pjStats = pjData.stats || {};
      var pjTotal = pjStats.total || 0;
      var pjOnTrack = pjTotal > 0 ? pjTotal - (pjStats.overdue || 0) : 0;
      summary.projects = {
        totalProjects: pjTotal,
        activeCount: pjStats.active || 0,
        onTrackPercent: pjTotal > 0 ? Math.round((pjOnTrack / pjTotal) * 100) : 0,
        overdueCount: pjStats.overdue || 0,
        completedCount: pjStats.completed || 0
      };
    } catch (e) {
      Logger.log('ReportingService: projects error — ' + e.message);
      summary.projects = { error: e.message };
    }

    // ── Change Management ──
    try {
      var cmComparison = ChangeMgmtService.getInitiativeComparison();
      var cmOverview = ChangeMgmtService.getOverview({});
      var cmStats = cmOverview.stats || {};

      // Compute average readiness across active initiatives
      var activeInitiatives = cmComparison.filter(function(i) {
        return i.status === 'active';
      });
      var avgReadiness = 0;
      var gapCount = 0;
      if (activeInitiatives.length > 0) {
        var totalReadiness = 0;
        for (var i = 0; i < activeInitiatives.length; i++) {
          totalReadiness += activeInitiatives[i].overallReadiness || 0;
          // Count initiatives with any element <= 2
          var scores = [
            activeInitiatives[i].visionScore,
            activeInitiatives[i].skillsScore,
            activeInitiatives[i].incentivesScore,
            activeInitiatives[i].resourcesScore,
            activeInitiatives[i].actionPlanScore
          ];
          if (activeInitiatives[i].consensusScore !== null && activeInitiatives[i].consensusScore !== undefined) {
            scores.push(activeInitiatives[i].consensusScore);
          }
          var hasGap = false;
          for (var j = 0; j < scores.length; j++) {
            if (scores[j] !== null && scores[j] !== undefined && scores[j] <= 2) {
              hasGap = true;
              break;
            }
          }
          if (hasGap) gapCount++;
        }
        avgReadiness = roundTo(totalReadiness / activeInitiatives.length, 1);
      }

      summary.changeMgmt = {
        totalActive: cmStats.active || 0,
        avgReadiness: avgReadiness,
        gapCount: gapCount,
        stalledCount: cmStats.stalled || 0,
        totalInitiatives: cmStats.total || 0
      };
    } catch (e) {
      Logger.log('ReportingService: changeMgmt error — ' + e.message);
      summary.changeMgmt = { error: e.message };
    }

    // ── Accreditation ──
    try {
      var accData = AccreditationService.getOverview({});
      var accStats = accData.stats || {};
      var frameworks = accData.frameworks || [];

      // Use first framework for headline KPIs (most schools have one active)
      var headline = frameworks.length > 0 ? frameworks[0] : null;
      var visitCountdown = null;
      if (headline && headline.visitDate) {
        visitCountdown = daysBetween(nowISO(), headline.visitDate);
      }

      summary.accreditation = {
        frameworkCount: accStats.frameworks || 0,
        greenPercent: headline ? headline.progress || 0 : 0,
        greenCount: headline ? headline.greenCount || 0 : 0,
        amberCount: headline ? headline.amberCount || 0 : 0,
        redCount: headline ? headline.redCount || 0 : 0,
        totalStandards: headline ? headline.standardCount || 0 : 0,
        avgProgress: accStats.averageProgress || 0,
        visitCountdown: visitCountdown
      };
    } catch (e) {
      Logger.log('ReportingService: accreditation error — ' + e.message);
      summary.accreditation = { error: e.message };
    }

    // ── Kanban ──
    try {
      var boards = KanbanService.getActiveBoards();
      var totalCards = 0;
      // Limit to first 5 boards to keep it lightweight
      var boardLimit = Math.min(boards.length, 5);
      for (var b = 0; b < boardLimit; b++) {
        var boardData = KanbanService.getBoardData(boards[b].id);
        totalCards += boardData.cards ? boardData.cards.length : 0;
      }
      summary.kanban = {
        activeBoards: boards.length,
        totalCards: totalCards
      };
    } catch (e) {
      Logger.log('ReportingService: kanban error — ' + e.message);
      summary.kanban = { error: e.message };
    }

    // ── PD Tracking ──
    try {
      var pdStats = PDService.getStats();
      summary.pd = {
        totalOfferings: pdStats.totalOfferings || 0,
        completedCount: pdStats.completedCount || 0,
        totalAttended: pdStats.totalAttended || 0,
        totalCreditHours: pdStats.totalCreditHours || 0,
        avgRating: pdStats.avgRating || 0,
        publishedCount: pdStats.publishedCount || 0
      };
    } catch (e) {
      Logger.log('ReportingService: pd error — ' + e.message);
      summary.pd = { error: e.message };
    }

    // ── Staff Feedback ──
    try {
      var fbStats = FeedbackService.getStats();
      summary.feedback = {
        totalCycles: fbStats.totalCycles || 0,
        openCycles: fbStats.openCycles || 0,
        closedCycles: fbStats.closedCycles || 0,
        totalAssignments: fbStats.totalAssignments || 0,
        submittedCount: fbStats.submittedCount || 0,
        completionRate: fbStats.completionRate || 0,
        avgRating: fbStats.avgRating || 0
      };
    } catch (e) {
      Logger.log('ReportingService: feedback error — ' + e.message);
      summary.feedback = { error: e.message };
    }

    // ── Staff Wellness ──
    try {
      var wlStats = WellnessService.getStats();
      summary.wellness = {
        totalCheckins: wlStats.totalCheckins || 0,
        avgScore: wlStats.avgScore || 0,
        activeAlerts: wlStats.activeAlerts || 0,
        checkinRate: wlStats.checkinRate || 0
      };
    } catch (e) {
      Logger.log('ReportingService: wellness error — ' + e.message);
      summary.wellness = { error: e.message };
    }

    return summary;
  }

  /**
   * Returns drill-down detail for a specific module section.
   * Called lazily when the user expands a section in the dashboard.
   *
   * @param {string} moduleKey - observations | growth_plans | projects | change_management | accreditation | kanban
   * @returns {Object}
   */
  function getModuleDetail(moduleKey) {
    switch (moduleKey) {

      case 'observations':
        var obsDash = ObservationService.getDashboard({});
        // Top 5 overdue teachers
        var priority = (obsDash.priorityList || []).slice(0, 5);
        return {
          departmentChart: obsDash.departmentChart || { labels: [], data: [] },
          priorityList: priority
        };

      case 'growth_plans':
        var gpData = GrowthPlanService.getOverview({});
        var overduePlans = (gpData.plans || []).filter(function(p) {
          return p.isOverdue;
        }).slice(0, 10);
        return {
          overduePlans: overduePlans,
          statusDistribution: gpData.stats || {}
        };

      case 'projects':
        var pjData = ProjectService.getOverview({});
        var overdueProjects = (pjData.projects || []).filter(function(p) {
          return p.isOverdue;
        }).slice(0, 10);
        var statusBreakdown = {};
        var allProjects = pjData.projects || [];
        for (var p = 0; p < allProjects.length; p++) {
          var st = allProjects[p].status || 'unknown';
          statusBreakdown[st] = (statusBreakdown[st] || 0) + 1;
        }
        return {
          overdueProjects: overdueProjects,
          statusBreakdown: statusBreakdown
        };

      case 'change_management':
        var comparison = ChangeMgmtService.getInitiativeComparison();
        return {
          initiativeComparison: comparison
        };

      case 'accreditation':
        var accData = AccreditationService.getOverview({});
        var frameworks = accData.frameworks || [];
        // Return per-framework domain readiness
        var frameworkDetails = [];
        for (var f = 0; f < frameworks.length; f++) {
          frameworkDetails.push({
            id: frameworks[f].id,
            name: frameworks[f].name,
            greenCount: frameworks[f].greenCount || 0,
            amberCount: frameworks[f].amberCount || 0,
            redCount: frameworks[f].redCount || 0,
            progress: frameworks[f].progress || 0,
            standardCount: frameworks[f].standardCount || 0
          });
        }
        return {
          frameworks: frameworkDetails
        };

      case 'kanban':
        var boards = KanbanService.getActiveBoards();
        var boardSummaries = [];
        var limit = Math.min(boards.length, 5);
        for (var k = 0; k < limit; k++) {
          var bd = KanbanService.getBoardData(boards[k].id);
          var colBreakdown = {};
          var cols = bd.columns || [];
          var cards = bd.cards || [];
          for (var c = 0; c < cols.length; c++) {
            colBreakdown[cols[c].name] = 0;
          }
          for (var d = 0; d < cards.length; d++) {
            var colId = cards[d].column_id;
            for (var e = 0; e < cols.length; e++) {
              if (cols[e].id === colId) {
                colBreakdown[cols[e].name] = (colBreakdown[cols[e].name] || 0) + 1;
                break;
              }
            }
          }
          boardSummaries.push({
            title: bd.board.name || bd.board.title || 'Board',
            cardCount: cards.length,
            columnBreakdown: colBreakdown
          });
        }
        return {
          boardSummaries: boardSummaries
        };

      case 'pd':
        var pdStats = PDService.getStats();
        return {
          categoryBreakdown: pdStats.byCategory || {},
          topOfferings: pdStats.topOfferings || [],
          totalAttended: pdStats.totalAttended || 0,
          totalCreditHours: pdStats.totalCreditHours || 0,
          avgRating: pdStats.avgRating || 0
        };

      case 'feedback':
        var fbStats = FeedbackService.getStats();
        var fbCycles = FeedbackService.getCyclesOverview({});
        var cycleTypeBreakdown = fbStats.byCycleType || {};
        var completionByCycle = [];
        var avgRatingByCycle = [];
        var allCycles = fbCycles.cycles || [];
        for (var fc = 0; fc < allCycles.length; fc++) {
          var fcy = allCycles[fc];
          completionByCycle.push({
            name: fcy.cycle_name,
            submitted: fcy.submittedCount,
            total: fcy.totalAssignments,
            rate: fcy.completionRate
          });
        }
        return {
          cycleTypeBreakdown: cycleTypeBreakdown,
          completionByCycle: completionByCycle,
          totalAssignments: fbStats.totalAssignments || 0,
          completionRate: fbStats.completionRate || 0,
          avgRating: fbStats.avgRating || 0
        };

      case 'wellness':
        var wlStats = WellnessService.getStats();
        var wlDash = WellnessService.getAdminDashboard();
        return {
          avgScore: wlStats.avgScore || 0,
          checkinRate: wlStats.checkinRate || 0,
          activeAlerts: wlStats.activeAlerts || 0,
          totalCheckins: wlStats.totalCheckins || 0,
          departmentHeatmap: wlDash.departmentHeatmap || [],
          workloadDistribution: wlDash.workloadDistribution || {}
        };

      default:
        throw new Error('Unknown module key: ' + moduleKey);
    }
  }

  /**
   * Returns a print-friendly snapshot with formatted dates.
   * @returns {Object}
   */
  function getPrintSnapshot() {
    var data = getExecutiveSummary();
    data.formattedDate = formatDateDisplay(new Date());
    data.isPrintMode = true;
    return data;
  }

  /**
   * Returns a Leadership Investment Report for a given supervisor.
   * Aggregates activities across modules to compute an investment score.
   *
   * @param {string} supervisorId - Staff ID of the supervisor/admin
   * @returns {Object}
   */
  function getLeadershipInvestmentReport(supervisorId) {
    if (!supervisorId) throw new Error('VALIDATION: supervisorId is required');

    var staff = DataService.getRecordById('staff', supervisorId);
    if (!staff) throw new Error('NOT_FOUND: Staff member not found');

    var allStaff = DataService.getRecords('staff');
    var teachers = allStaff.filter(function(s) {
      return (s.role === 'teacher' || s.role === 'specialist') && String(s.is_active) === 'true';
    });
    var staffMap = {};
    allStaff.forEach(function(s) { staffMap[s.id] = s; });

    var now = new Date();
    var dimensions = {
      observations: { score: 0, detail: [] },
      feedback: { score: 0, detail: [] },
      growthPlans: { score: 0, detail: [] },
      coaching: { score: 0, detail: [] },
      pd: { score: 0, detail: [] }
    };

    // ── Observations conducted by this supervisor ──
    try {
      var allObs = DataService.query('observations', {
        filters: { observer_id: supervisorId },
        sort: { field: 'observation_date', direction: 'desc' }
      }).data;
      var obsCount = allObs.length;
      var teachersCovered = {};
      var obsByType = {};
      allObs.forEach(function(o) {
        teachersCovered[o.teacher_id] = true;
        var t = o.observation_type || 'other';
        obsByType[t] = (obsByType[t] || 0) + 1;
      });

      // Score: up to 30 points (1 point per observation, max 30)
      dimensions.observations.score = Math.min(30, obsCount);
      dimensions.observations.detail = {
        totalObservations: obsCount,
        teachersCovered: Object.keys(teachersCovered).length,
        totalTeachers: teachers.length,
        byType: obsByType,
        coveragePercent: teachers.length > 0 ? Math.round((Object.keys(teachersCovered).length / teachers.length) * 100) : 0
      };
    } catch (e) {
      dimensions.observations.detail = { error: e.message };
    }

    // ── Feedback responses submitted as supervisor ──
    try {
      var allAssignments = DataService.getRecords('feedback_assignments');
      var submittedFeedback = allAssignments.filter(function(a) {
        return a.responder_id === supervisorId && a.status === 'submitted';
      });
      var feedbackCount = submittedFeedback.length;

      // Group by recipient
      var feedbackByRecipient = {};
      submittedFeedback.forEach(function(a) {
        if (!feedbackByRecipient[a.recipient_id]) feedbackByRecipient[a.recipient_id] = 0;
        feedbackByRecipient[a.recipient_id]++;
      });
      var feedbackRecipients = Object.keys(feedbackByRecipient).map(function(id) {
        var s = staffMap[id];
        return { id: id, name: s ? (s.first_name + ' ' + s.last_name) : 'Unknown', count: feedbackByRecipient[id] };
      });

      // Score: up to 20 points (2 points per submitted feedback, max 20)
      dimensions.feedback.score = Math.min(20, feedbackCount * 2);
      dimensions.feedback.detail = {
        totalSubmitted: feedbackCount,
        recipientCount: feedbackRecipients.length,
        byRecipient: feedbackRecipients
      };
    } catch (e) {
      dimensions.feedback.detail = { error: e.message };
    }

    // ── Growth plan meetings attended + supervisor comments ──
    try {
      var allMeetings = DataService.getRecords('pgp_meetings');
      var supervisorMeetings = allMeetings.filter(function(m) {
        return m.created_by === supervisorId || m.attendee_ids && m.attendee_ids.indexOf(supervisorId) !== -1;
      });
      var meetingCount = supervisorMeetings.length;

      // Count supervisor comments on growth plans
      var allComments = DataService.getRecords('pgp_comments');
      var supComments = allComments.filter(function(c) {
        return c.commenter_id === supervisorId;
      });
      var commentCount = supComments.length;

      // Score: up to 20 points (2 points per meeting + 1 per comment, max 20)
      dimensions.growthPlans.score = Math.min(20, (meetingCount * 2) + commentCount);
      dimensions.growthPlans.detail = {
        meetingsAttended: meetingCount,
        commentsWritten: commentCount
      };
    } catch (e) {
      dimensions.growthPlans.detail = { error: e.message };
    }

    // ── Coaching meetings facilitated ──
    try {
      var allCoachingMeetings = DataService.getRecords('coaching_meetings');
      var facilitatedMeetings = allCoachingMeetings.filter(function(m) {
        return m.facilitator_id === supervisorId || m.created_by === supervisorId;
      });
      var coachingCount = facilitatedMeetings.length;

      // Score: up to 15 points (3 points per meeting, max 15)
      dimensions.coaching.score = Math.min(15, coachingCount * 3);
      dimensions.coaching.detail = {
        meetingsFacilitated: coachingCount
      };
    } catch (e) {
      dimensions.coaching.detail = { error: e.message };
    }

    // ── PD sessions facilitated ──
    try {
      var allPD = DataService.getRecords('pd_offerings');
      var facilitatedPD = allPD.filter(function(p) {
        return p.facilitator_id === supervisorId;
      });
      var pdCount = facilitatedPD.length;

      // Score: up to 15 points (3 points per session, max 15)
      dimensions.pd.score = Math.min(15, pdCount * 3);
      dimensions.pd.detail = {
        sessionsFacilitated: pdCount
      };
    } catch (e) {
      dimensions.pd.detail = { error: e.message };
    }

    // ── Composite Investment Score (0-100) ──
    var totalScore = dimensions.observations.score +
                     dimensions.feedback.score +
                     dimensions.growthPlans.score +
                     dimensions.coaching.score +
                     dimensions.pd.score;

    // Per-staff investment detail
    var perStaffInvestment = [];
    teachers.forEach(function(t) {
      var tId = t.id;
      var obsForTeacher = 0;
      var fbForTeacher = 0;

      try {
        var teacherObs = DataService.query('observations', {
          filters: { observer_id: supervisorId, teacher_id: tId }
        }).data;
        obsForTeacher = teacherObs.length;
      } catch (e) { /* skip */ }

      var assignments = DataService.getRecords('feedback_assignments');
      for (var a = 0; a < assignments.length; a++) {
        if (assignments[a].responder_id === supervisorId &&
            assignments[a].recipient_id === tId &&
            assignments[a].status === 'submitted') {
          fbForTeacher++;
        }
      }

      if (obsForTeacher > 0 || fbForTeacher > 0) {
        perStaffInvestment.push({
          staffId: tId,
          staffName: t.first_name + ' ' + t.last_name,
          department: t.department,
          observations: obsForTeacher,
          feedbackSubmissions: fbForTeacher,
          totalTouchpoints: obsForTeacher + fbForTeacher
        });
      }
    });

    perStaffInvestment.sort(function(a, b) {
      return b.totalTouchpoints - a.totalTouchpoints;
    });

    return {
      supervisor: {
        id: staff.id,
        name: staff.first_name + ' ' + staff.last_name,
        role: staff.role
      },
      investmentScore: totalScore,
      dimensions: {
        observations: { score: dimensions.observations.score, maxScore: 30, detail: dimensions.observations.detail },
        feedback: { score: dimensions.feedback.score, maxScore: 20, detail: dimensions.feedback.detail },
        growthPlans: { score: dimensions.growthPlans.score, maxScore: 20, detail: dimensions.growthPlans.detail },
        coaching: { score: dimensions.coaching.score, maxScore: 15, detail: dimensions.coaching.detail },
        pd: { score: dimensions.pd.score, maxScore: 15, detail: dimensions.pd.detail }
      },
      perStaffInvestment: perStaffInvestment,
      generatedAt: nowISO()
    };
  }

  return {
    getExecutiveSummary: getExecutiveSummary,
    getModuleDetail: getModuleDetail,
    getPrintSnapshot: getPrintSnapshot,
    getLeadershipInvestmentReport: getLeadershipInvestmentReport
  };

})();
