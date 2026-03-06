/**
 * ObservationService.gs — Business logic for Learning Walks & Observations
 *
 * Provides dashboard analytics, drop-in planner data, teacher history,
 * and scheduling with optional email notifications.
 *
 * Uses: DataService, AuthService, CacheManager, Utils
 */

var ObservationService = (function() {

  // ───────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────

  /**
   * Loads config values needed for observation thresholds.
   * @returns {{ frequencyWeeks: number, overdueWeeks: number }}
   */
  function getThresholds_() {
    var configs = DataService.getRecords('_config');
    var map = {};
    configs.forEach(function(c) { map[c.key] = c.value; });
    return {
      frequencyWeeks: parseInt(map.observation_frequency_weeks) || 3,
      overdueWeeks: parseInt(map.observation_overdue_weeks) || 5
    };
  }

  /**
   * Returns the last 12 week-start dates (Mondays), newest first.
   * @returns {Date[]}
   */
  function getLast12Weeks_() {
    var weeks = [];
    var now = new Date();
    var ws = weekStart(now);
    for (var i = 0; i < 12; i++) {
      weeks.push(new Date(ws));
      ws.setDate(ws.getDate() - 7);
    }
    return weeks;
  }

  /**
   * Formats a Date as YYYY-MM-DD for use as a map key.
   */
  function dateKey_(d) {
    return d.toISOString().slice(0, 10);
  }

  /**
   * Determines heat map cell status based on days since last visit.
   */
  function heatStatus_(daysSinceVisit, thresholds) {
    if (daysSinceVisit === null) return 'empty';
    var freqDays = thresholds.frequencyWeeks * 7;
    var overdueDays = thresholds.overdueWeeks * 7;
    if (daysSinceVisit <= freqDays) return 'green';
    if (daysSinceVisit <= overdueDays) return 'yellow';
    return 'red';
  }

  // ───────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────

  /**
   * Returns full dashboard data: heat map, priority list, stats, department chart.
   * @param {Object} [filters] - { department, observer_id, date_from, date_to }
   * @returns {Object}
   */
  function getDashboard(filters) {
    filters = filters || {};
    var thresholds = getThresholds_();

    // Load all observations
    var obsFilters = {};
    if (filters.observer_id) obsFilters.observer_id = filters.observer_id;
    if (filters.date_from) obsFilters.observation_date = { op: '>=', value: filters.date_from };
    var allObs = DataService.query('observations', {
      filters: obsFilters,
      sort: { field: 'observation_date', direction: 'desc' }
    }).data;

    // Apply date_to filter if present (need second pass since query supports one op per field)
    if (filters.date_to) {
      allObs = allObs.filter(function(o) {
        return o.observation_date <= filters.date_to;
      });
    }

    // Load active teachers + specialists
    var allStaff = DataService.query('staff', {
      filters: { is_active: true },
      sort: { field: 'last_name', direction: 'asc' }
    }).data;
    var teachers = allStaff.filter(function(s) {
      return s.role === 'teacher' || s.role === 'specialist';
    });

    // Apply department filter
    if (filters.department) {
      teachers = teachers.filter(function(t) { return t.department === filters.department; });
    }

    // Build lookup: teacher_id → array of observations
    var obsByTeacher = {};
    allObs.forEach(function(o) {
      if (!obsByTeacher[o.teacher_id]) obsByTeacher[o.teacher_id] = [];
      obsByTeacher[o.teacher_id].push(o);
    });

    // Last 12 weeks for heat map
    var weeks = getLast12Weeks_();
    var now = new Date();

    // ── Heat Map ──
    var heatMap = teachers.map(function(t) {
      var teacherObs = obsByTeacher[t.id] || [];

      // Bucket observations by week
      var obsByWeek = {};
      teacherObs.forEach(function(o) {
        var ws = weekStart(new Date(o.observation_date));
        var key = dateKey_(ws);
        obsByWeek[key] = (obsByWeek[key] || 0) + 1;
      });

      // Find last visit date
      var lastVisit = teacherObs.length > 0 ? new Date(teacherObs[0].observation_date) : null;
      var daysSinceLast = lastVisit ? daysBetween(lastVisit, now) : null;

      var weekData = weeks.map(function(ws) {
        var key = dateKey_(ws);
        var count = obsByWeek[key] || 0;
        // Status for this cell: if there's a visit in this week, green; otherwise check cumulative
        var status = 'empty';
        if (count > 0) {
          status = 'green';
        } else if (daysSinceLast !== null) {
          var weekAge = daysBetween(ws, now);
          // Only color non-visited weeks that are in the past and after last visit
          if (lastVisit && ws <= now) {
            var daysSinceLastAtWeek = daysBetween(lastVisit, ws);
            if (ws > lastVisit) {
              status = heatStatus_(daysSinceLastAtWeek, thresholds);
            }
          }
        }
        return { weekStart: dateKey_(ws), count: count, status: status };
      });

      return {
        teacher: { id: t.id, name: t.first_name + ' ' + t.last_name, department: t.department },
        weeks: weekData.reverse(), // oldest first for left-to-right display
        daysSinceLastVisit: daysSinceLast
      };
    });

    // Sort heat map by department then name
    heatMap.sort(function(a, b) {
      if (a.teacher.department < b.teacher.department) return -1;
      if (a.teacher.department > b.teacher.department) return 1;
      if (a.teacher.name < b.teacher.name) return -1;
      if (a.teacher.name > b.teacher.name) return 1;
      return 0;
    });

    // ── Priority List ──
    var priorityList = teachers.map(function(t) {
      var teacherObs = obsByTeacher[t.id] || [];
      var lastObs = teacherObs.length > 0 ? teacherObs[0] : null;
      var daysSince = lastObs ? daysBetween(new Date(lastObs.observation_date), now) : 999;
      var followUp = teacherObs.filter(function(o) {
        return o.follow_up_needed === true || o.follow_up_needed === 'TRUE' || o.follow_up_needed === 'true';
      }).length > 0;

      return {
        teacher: { id: t.id, name: t.first_name + ' ' + t.last_name, department: t.department },
        daysSinceLastVisit: daysSince,
        lastObservation: lastObs ? {
          date: lastObs.observation_date,
          type: lastObs.observation_type
        } : null,
        followUpPending: followUp
      };
    });

    priorityList.sort(function(a, b) { return b.daysSinceLastVisit - a.daysSinceLastVisit; });

    // ── Stats ──
    var teacherIds = {};
    teachers.forEach(function(t) { teacherIds[t.id] = true; });
    // Filter observations to only those for current teacher set
    var relevantObs = allObs.filter(function(o) { return teacherIds[o.teacher_id]; });

    var teachersVisited = {};
    var typeCount = {};
    relevantObs.forEach(function(o) {
      teachersVisited[o.teacher_id] = true;
      var t = o.observation_type || 'other';
      typeCount[t] = (typeCount[t] || 0) + 1;
    });

    var overdue = priorityList.filter(function(p) {
      return p.daysSinceLastVisit > thresholds.overdueWeeks * 7;
    }).length;

    var stats = {
      totalThisTerm: relevantObs.length,
      averagePerTeacher: teachers.length > 0 ? roundTo(relevantObs.length / teachers.length, 1) : 0,
      teachersVisited: Object.keys(teachersVisited).length,
      teachersOverdue: overdue,
      observationsByType: typeCount
    };

    // ── Department Chart ──
    var deptMap = {};
    var deptTeacherCount = {};
    teachers.forEach(function(t) {
      var dept = t.department;
      if (!deptTeacherCount[dept]) deptTeacherCount[dept] = 0;
      if (!deptMap[dept]) deptMap[dept] = 0;
      deptTeacherCount[dept]++;
    });
    relevantObs.forEach(function(o) {
      var teacher = teachers.filter(function(t) { return t.id === o.teacher_id; })[0];
      if (teacher) {
        deptMap[teacher.department] = (deptMap[teacher.department] || 0) + 1;
      }
    });

    var deptLabels = Object.keys(deptTeacherCount).sort();
    var deptData = deptLabels.map(function(dept) {
      var total = deptMap[dept] || 0;
      var count = deptTeacherCount[dept] || 1;
      return roundTo(total / count, 1);
    });

    return {
      heatMap: heatMap,
      priorityList: priorityList,
      stats: stats,
      departmentChart: { labels: deptLabels, data: deptData }
    };
  }

  /**
   * Returns drop-in planner data for a given day and period.
   * @param {string} dayOfWeek - MON, TUE, etc.
   * @param {number} period - 1-based period number
   * @returns {Object[]}
   */
  function getDropInData(dayOfWeek, period) {
    if (!dayOfWeek || !period) return [];

    // Get timetable entries for this day/period that are not prep
    var timetableEntries = DataService.query('timetable', {
      filters: { day_of_week: dayOfWeek, period: period, is_prep: false }
    }).data;

    if (timetableEntries.length === 0) return [];

    // Load staff for name hydration
    var allStaff = DataService.getRecords('staff');
    var staffMap = {};
    allStaff.forEach(function(s) { staffMap[s.id] = s; });

    // Load all observations to find last visit per teacher
    var allObs = DataService.query('observations', {
      sort: { field: 'observation_date', direction: 'desc' }
    }).data;

    var lastObsByTeacher = {};
    allObs.forEach(function(o) {
      if (!lastObsByTeacher[o.teacher_id]) {
        lastObsByTeacher[o.teacher_id] = o;
      }
    });

    var now = new Date();
    var results = timetableEntries.map(function(entry) {
      var staff = staffMap[entry.staff_id];
      if (!staff || !staff.is_active) return null;

      var lastObs = lastObsByTeacher[entry.staff_id];
      var daysSince = lastObs ? daysBetween(new Date(lastObs.observation_date), now) : 999;
      var followUp = false;
      if (lastObs) {
        followUp = lastObs.follow_up_needed === true || lastObs.follow_up_needed === 'TRUE' || lastObs.follow_up_needed === 'true';
      }

      return {
        staffId: entry.staff_id,
        teacherName: staff.first_name + ' ' + staff.last_name,
        department: staff.department,
        courseName: entry.course_name,
        room: entry.room,
        daysSinceLastVisit: daysSince,
        followUpPending: followUp,
        lastObservationType: lastObs ? lastObs.observation_type : null
      };
    }).filter(Boolean);

    // Sort by days since last visit descending (most overdue first)
    results.sort(function(a, b) { return b.daysSinceLastVisit - a.daysSinceLastVisit; });

    return results;
  }

  /**
   * Returns teacher observation history with rating trends and tag frequency.
   * @param {string} teacherId
   * @returns {Object}
   */
  function getTeacherHistory(teacherId) {
    if (!teacherId) throw new Error('VALIDATION: teacherId is required');

    var user = AuthService.getCurrentUser();
    var isAdmin = user.role === 'admin';

    // Load teacher record
    var teacher = DataService.getRecordById('staff', teacherId);
    if (!teacher) throw new Error('NOT_FOUND: Teacher not found');

    // Load observations
    var obsFilters = { teacher_id: teacherId };
    if (!isAdmin) {
      // Non-admins only see shared observations for themselves
      if (user.id !== teacherId) {
        throw new Error('AUTH_DENIED: You can only view your own observations.');
      }
      obsFilters.shared_with_teacher = true;
    }

    var observations = DataService.query('observations', {
      filters: obsFilters,
      sort: { field: 'observation_date', direction: 'desc' }
    }).data;

    // Hydrate with observer names
    observations = DataService.hydrate(observations, {
      field: 'observer_id',
      targetTable: 'staff',
      as: 'observer'
    });

    // Build rating trends (chronological order for chart)
    var chronological = observations.slice().reverse();
    var ratingTrends = {
      labels: [],
      engagement: [],
      strategy: [],
      environment: []
    };

    chronological.forEach(function(o) {
      if (o.student_engagement_rating || o.instructional_strategy_rating || o.environment_rating) {
        ratingTrends.labels.push(o.observation_date ? o.observation_date.slice(0, 10) : '');
        ratingTrends.engagement.push(Number(o.student_engagement_rating) || 0);
        ratingTrends.strategy.push(Number(o.instructional_strategy_rating) || 0);
        ratingTrends.environment.push(Number(o.environment_rating) || 0);
      }
    });

    // Build tag frequency
    var tagCounts = {};
    observations.forEach(function(o) {
      if (o.tags) {
        var tagList = parseCSV(o.tags);
        tagList.forEach(function(tag) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    var tagLabels = Object.keys(tagCounts).sort(function(a, b) {
      return tagCounts[b] - tagCounts[a];
    });
    var tagData = tagLabels.map(function(t) { return tagCounts[t]; });

    // Summary stats
    var engagementScores = observations.map(function(o) { return Number(o.student_engagement_rating); }).filter(Boolean);
    var strategyScores = observations.map(function(o) { return Number(o.instructional_strategy_rating); }).filter(Boolean);
    var environmentScores = observations.map(function(o) { return Number(o.environment_rating); }).filter(Boolean);

    // Multiplier Effect: compute per-discipline averages (1-5 scale)
    var multiplierDisciplines = ['multiplier_talent_finder', 'multiplier_liberator', 'multiplier_challenger', 'multiplier_debate_maker', 'multiplier_investor'];
    var multiplierLabels = ['Talent Finder', 'Liberator', 'Challenger', 'Debate Maker', 'Investor'];
    var multiplierSums = [0, 0, 0, 0, 0];
    var multiplierCounts = [0, 0, 0, 0, 0];

    observations.forEach(function(o) {
      for (var mi = 0; mi < multiplierDisciplines.length; mi++) {
        var val = Number(o[multiplierDisciplines[mi]]);
        if (val > 0) {
          multiplierSums[mi] += val;
          multiplierCounts[mi]++;
        }
      }
    });

    var multiplierProfile = null;
    var hasMultiplierData = multiplierCounts.some(function(c) { return c > 0; });
    if (hasMultiplierData) {
      multiplierProfile = {
        labels: multiplierLabels,
        values: multiplierSums.map(function(sum, idx) {
          return multiplierCounts[idx] > 0 ? roundTo(sum / multiplierCounts[idx], 1) : 0;
        }),
        counts: multiplierCounts
      };
    }

    return {
      teacher: {
        id: teacher.id,
        name: teacher.first_name + ' ' + teacher.last_name,
        department: teacher.department
      },
      observations: observations.map(function(o) {
        return {
          id: o.id,
          date: o.observation_date,
          type: o.observation_type,
          duration: o.duration_minutes,
          observerName: o.observer ? o.observer.first_name + ' ' + o.observer.last_name : 'Unknown',
          course: o.course_observed,
          room: o.room,
          engagement: Number(o.student_engagement_rating) || 0,
          strategy: Number(o.instructional_strategy_rating) || 0,
          environment: Number(o.environment_rating) || 0,
          multiplierTalentFinder: Number(o.multiplier_talent_finder) || 0,
          multiplierLiberator: Number(o.multiplier_liberator) || 0,
          multiplierChallenger: Number(o.multiplier_challenger) || 0,
          multiplierDebateMaker: Number(o.multiplier_debate_maker) || 0,
          multiplierInvestor: Number(o.multiplier_investor) || 0,
          tags: o.tags ? parseCSV(o.tags) : [],
          notes: o.notes || '',
          commendations: o.commendations || '',
          recommendations: o.recommendations || '',
          followUpNeeded: o.follow_up_needed === true || o.follow_up_needed === 'TRUE' || o.follow_up_needed === 'true',
          followUpCompleted: o.follow_up_completed === true || o.follow_up_completed === 'TRUE' || o.follow_up_completed === 'true',
          sharedWithTeacher: o.shared_with_teacher === true || o.shared_with_teacher === 'TRUE' || o.shared_with_teacher === 'true'
        };
      }),
      ratingTrends: ratingTrends,
      tagFrequency: { labels: tagLabels, data: tagData },
      multiplierProfile: multiplierProfile,
      summary: {
        totalObservations: observations.length,
        avgEngagement: roundTo(average(engagementScores), 1),
        avgStrategy: roundTo(average(strategyScores), 1),
        avgEnvironment: roundTo(average(environmentScores), 1)
      }
    };
  }

  /**
   * Schedules an observation with optional email notification.
   * @param {Object} data - { teacher_id, planned_date, planned_period, observation_type, notify }
   * @returns {Object} The created schedule record
   */
  function scheduleObservation(data) {
    validateRequired(data, ['teacher_id', 'planned_date']);

    var user = AuthService.getCurrentUser();
    var record = {
      teacher_id: data.teacher_id,
      observer_id: user.id,
      planned_date: data.planned_date,
      planned_period: data.planned_period || '',
      observation_type: data.observation_type || 'learning_walk',
      status: 'scheduled',
      notes: data.notes || ''
    };

    var created = DataService.createRecord('observation_schedule', record);

    // Send email notification if requested
    if (data.notify) {
      try {
        var teacher = DataService.getRecordById('staff', data.teacher_id);
        if (teacher && teacher.email) {
          var observerName = user.first_name + ' ' + user.last_name;
          var teacherName = teacher.first_name + ' ' + teacher.last_name;
          var subject = 'Observation Scheduled — ' + formatDateDisplay(data.planned_date);
          var body = 'Hi ' + teacherName + ',\n\n' +
            observerName + ' has scheduled a ' + (data.observation_type || 'learning walk').replace(/_/g, ' ') +
            ' observation for ' + formatDateDisplay(data.planned_date) +
            (data.planned_period ? ' (Period ' + data.planned_period + ')' : '') + '.\n\n' +
            'No preparation is needed — this is a supportive visit.\n\n' +
            'Best regards,\n' + observerName;

          MailApp.sendEmail(teacher.email, subject, body);
        }
      } catch (e) {
        // Log but don't fail the schedule creation
        LogService.warn('scheduleObservation', 'Email notification failed: ' + e.message);
      }
    }

    return created;
  }

  return {
    getDashboard: getDashboard,
    getDropInData: getDropInData,
    getTeacherHistory: getTeacherHistory,
    scheduleObservation: scheduleObservation
  };

})();
