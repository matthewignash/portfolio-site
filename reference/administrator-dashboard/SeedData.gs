/**
 * SeedData.gs — Demo/sample data for development and testing
 *
 * Run these functions from the Apps Script editor after running setupPhase0a().
 * Each function is idempotent — checks for existing data before inserting.
 */

/**
 * Seeds all Phase 0a data: config, staff, timetable.
 */
function seedAllPhase0a() {
  seedConfigData();
  seedStaffData();
  seedTimetableData();
  Logger.log('=== All Phase 0a seed data loaded ===');
}

/**
 * Seeds the _config table with default application settings.
 */
function seedConfigData() {
  var existing = DataService.getRecords('_config');
  if (existing.length > 0) {
    Logger.log('Config already seeded (' + existing.length + ' entries). Skipping.');
    return;
  }

  var configs = [
    { key: 'school_name',                 value: 'International School',         description: 'School name used in exports and headers' },
    { key: 'academic_year',               value: '2025-26',                       description: 'Current academic year' },
    { key: 'observation_frequency_weeks',  value: '3',                            description: 'Target weeks between teacher visits' },
    { key: 'observation_overdue_weeks',    value: '5',                            description: 'Weeks before a teacher is flagged as overdue' },
    { key: 'growth_plan_checkin_weeks',    value: '6',                            description: 'Weeks between expected growth plan check-ins' },
    { key: 'periods_per_day',             value: '8',                             description: 'Number of teaching periods per day' },
    { key: 'period_times',               value: '8:00,8:50,9:40,10:40,11:30,12:20,13:50,14:40', description: 'Comma-separated period start times' },
    { key: 'knoster_use_consensus',       value: 'true',                          description: 'Include 6th element (Consensus) in Knoster model' },
    { key: 'admin_emails',               value: 'imatthew@aischennai.org',        description: 'Comma-separated admin emails (backup role check)' },
    { key: 'drive_root_folder_id',        value: '',                              description: 'Google Drive folder ID for exports' },
    { key: 'predefined_tags',            value: 'differentiation,engagement,tech_use,assessment,collaboration,questioning,classroom_mgmt,literacy,numeracy', description: 'Observation focus tags' },
    { key: 'rating_dimensions',          value: 'Student Engagement,Instructional Strategy,Learning Environment', description: 'Labels for 1-5 rating scales' }
  ];

  DataService.batchCreate('_config', configs);
  Logger.log('Seeded ' + configs.length + ' config entries.');
}

/**
 * Seeds the staff table with 15 sample staff members.
 */
function seedStaffData() {
  var existing = DataService.getRecords('staff');
  if (existing.length > 0) {
    Logger.log('Staff already seeded (' + existing.length + ' records). Skipping.');
    return;
  }

  var staff = [
    // Admins
    { email: 'principal@school.edu',     first_name: 'Sarah',    last_name: 'Chen',       role: 'admin',      department: 'Administration',  employment_status: 'full-time', hire_date: '2018-08-01', is_active: true },
    { email: 'vice.principal@school.edu', first_name: 'James',   last_name: 'Morrison',   role: 'admin',      department: 'Administration',  employment_status: 'full-time', hire_date: '2019-08-01', is_active: true },
    { email: 'curriculum@school.edu',     first_name: 'Aisha',   last_name: 'Patel',      role: 'admin',      department: 'Curriculum',      employment_status: 'full-time', hire_date: '2020-08-01', is_active: true },

    // Science Department
    { email: 'j.kim@school.edu',         first_name: 'Jin',      last_name: 'Kim',        role: 'teacher',    department: 'Science',         employment_status: 'full-time', hire_date: '2019-08-01', is_active: true },
    { email: 'r.martinez@school.edu',    first_name: 'Ricardo',  last_name: 'Martinez',   role: 'teacher',    department: 'Science',         employment_status: 'full-time', hire_date: '2021-08-01', is_active: true },

    // Math Department
    { email: 'l.johnson@school.edu',     first_name: 'Lisa',     last_name: 'Johnson',    role: 'teacher',    department: 'Mathematics',     employment_status: 'full-time', hire_date: '2017-08-01', is_active: true },
    { email: 'n.okafor@school.edu',      first_name: 'Nkechi',   last_name: 'Okafor',     role: 'teacher',    department: 'Mathematics',     employment_status: 'full-time', hire_date: '2022-08-01', is_active: true },

    // English Department
    { email: 'm.thompson@school.edu',    first_name: 'Michael',  last_name: 'Thompson',   role: 'teacher',    department: 'English',         employment_status: 'full-time', hire_date: '2016-08-01', is_active: true },
    { email: 's.nguyen@school.edu',      first_name: 'Sophie',   last_name: 'Nguyen',     role: 'teacher',    department: 'English',         employment_status: 'part-time', hire_date: '2023-08-01', is_active: true },

    // Humanities
    { email: 'd.weber@school.edu',       first_name: 'David',    last_name: 'Weber',      role: 'teacher',    department: 'Humanities',      employment_status: 'full-time', hire_date: '2020-08-01', is_active: true },

    // Arts
    { email: 'e.sato@school.edu',        first_name: 'Emi',      last_name: 'Sato',       role: 'teacher',    department: 'Arts',            employment_status: 'full-time', hire_date: '2021-08-01', is_active: true },

    // Elementary
    { email: 'k.brown@school.edu',       first_name: 'Karen',    last_name: 'Brown',      role: 'teacher',    department: 'Elementary',      employment_status: 'full-time', hire_date: '2018-08-01', is_active: true },
    { email: 't.garcia@school.edu',      first_name: 'Teresa',   last_name: 'Garcia',     role: 'teacher',    department: 'Elementary',      employment_status: 'full-time', hire_date: '2022-08-01', is_active: true },

    // Specialists
    { email: 'a.lee@school.edu',         first_name: 'Alex',     last_name: 'Lee',        role: 'specialist', department: 'Learning Support', employment_status: 'full-time', hire_date: '2020-08-01', is_active: true },

    // Support Staff
    { email: 'p.rogers@school.edu',      first_name: 'Patricia', last_name: 'Rogers',     role: 'support',    department: 'Administration',  employment_status: 'full-time', hire_date: '2015-08-01', is_active: true }
  ];

  DataService.batchCreate('staff', staff);
  Logger.log('Seeded ' + staff.length + ' staff records.');
}

/**
 * Seeds the timetable with a sample weekly schedule.
 * Creates entries for teachers across an 8-period day.
 */
function seedTimetableData() {
  var existing = DataService.getRecords('timetable');
  if (existing.length > 0) {
    Logger.log('Timetable already seeded (' + existing.length + ' records). Skipping.');
    return;
  }

  // Get staff IDs (we need teacher IDs to build the timetable)
  var staffRecords = DataService.getRecords('staff');
  var teachers = staffRecords.filter(function(s) {
    return (s.role === 'teacher' || s.role === 'specialist') && s.is_active;
  });

  if (teachers.length === 0) {
    Logger.log('No teachers found. Run seedStaffData() first.');
    return;
  }

  var days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  var periodTimes = [
    { start: '08:00', end: '08:45' },
    { start: '08:50', end: '09:35' },
    { start: '09:40', end: '10:25' },
    { start: '10:40', end: '11:25' },
    { start: '11:30', end: '12:15' },
    { start: '12:20', end: '13:05' },
    { start: '13:50', end: '14:35' },
    { start: '14:40', end: '15:25' }
  ];

  // Course assignments per department
  var courseMap = {
    'Science':          ['AP Chemistry', 'Biology 10', 'Physics 11', 'Earth Science 9'],
    'Mathematics':      ['Algebra 2', 'Geometry', 'Pre-Calculus', 'AP Statistics'],
    'English':          ['English 9', 'English 10', 'AP Literature', 'Creative Writing'],
    'Humanities':       ['World History', 'Geography 9', 'AP Government', 'Economics'],
    'Arts':             ['Studio Art', 'Digital Media', 'Art History', 'Portfolio'],
    'Elementary':       ['Homeroom', 'Literacy Block', 'Math Block', 'Science/SS'],
    'Learning Support': ['Learning Lab', 'Intervention', 'Co-teach Support', 'Skills Group']
  };

  var rooms = ['A101', 'A102', 'A201', 'A202', 'B101', 'B102', 'B201', 'B202', 'C101', 'C102', 'GYM', 'ART1', 'MUS1', 'LIB'];

  var timetableRecords = [];

  teachers.forEach(function(teacher, tIdx) {
    var dept = teacher.department;
    var courses = courseMap[dept] || ['General Class'];
    var roomBase = rooms[tIdx % rooms.length];

    days.forEach(function(day) {
      for (var p = 1; p <= 8; p++) {
        // Give each teacher 2 prep periods per day (period 6 = lunch area, vary one more)
        var isPrep = (p === 6) || (p === ((tIdx % 4) + 3)); // Lunch + one rotating prep
        var courseName = isPrep ? '' : courses[(p - 1) % courses.length];
        var room = isPrep ? '' : roomBase;

        timetableRecords.push({
          staff_id: teacher.id,
          day_of_week: day,
          period: p,
          period_start_time: periodTimes[p - 1].start,
          period_end_time: periodTimes[p - 1].end,
          course_name: courseName,
          room: room,
          is_prep: isPrep
        });
      }
    });
  });

  // Batch create in groups to avoid hitting limits
  var batchSize = 100;
  for (var i = 0; i < timetableRecords.length; i += batchSize) {
    var batch = timetableRecords.slice(i, i + batchSize);
    DataService.batchCreate('timetable', batch);
  }

  Logger.log('Seeded ' + timetableRecords.length + ' timetable records for ' + teachers.length + ' teachers.');
}

/**
 * Seeds a few sample observations for testing the dashboard.
 * Run after seedStaffData().
 */
function seedObservationData() {
  var existing = DataService.getRecords('observations');
  if (existing.length > 0) {
    Logger.log('Observations already seeded (' + existing.length + ' records). Skipping.');
    return;
  }

  var staff = DataService.getRecords('staff');
  var admins = staff.filter(function(s) { return s.role === 'admin'; });
  var teachers = staff.filter(function(s) { return s.role === 'teacher' || s.role === 'specialist'; });

  if (admins.length === 0 || teachers.length === 0) {
    Logger.log('Need staff data first. Run seedStaffData().');
    return;
  }

  var tags = ['differentiation', 'engagement', 'tech_use', 'assessment', 'collaboration', 'questioning'];
  var types = ['learning_walk', 'formal', 'informal'];
  var observations = [];

  // Create 2-3 observations per teacher, spread over the last 8 weeks
  teachers.forEach(function(teacher, tIdx) {
    var numObs = 2 + (tIdx % 2); // 2 or 3 observations per teacher
    for (var i = 0; i < numObs; i++) {
      var daysAgo = Math.floor(Math.random() * 56); // 0-56 days ago (8 weeks)
      var obsDate = new Date();
      obsDate.setDate(obsDate.getDate() - daysAgo);

      var observer = admins[i % admins.length];
      var obsType = types[i % types.length];
      var selectedTags = [tags[tIdx % tags.length], tags[(tIdx + i) % tags.length]];

      observations.push({
        observer_id: observer.id,
        teacher_id: teacher.id,
        observation_date: obsDate.toISOString(),
        observation_type: obsType,
        duration_minutes: obsType === 'learning_walk' ? 15 : (obsType === 'formal' ? 45 : 25),
        course_observed: 'Sample Course',
        room: 'A10' + (tIdx % 4 + 1),
        tags: selectedTags.join(', '),
        student_engagement_rating: Math.floor(Math.random() * 3) + 3, // 3-5
        instructional_strategy_rating: Math.floor(Math.random() * 3) + 3,
        environment_rating: Math.floor(Math.random() * 2) + 4, // 4-5
        notes: 'Sample observation notes for ' + teacher.first_name + ' ' + teacher.last_name + '.',
        commendations: 'Good use of questioning techniques. Students were engaged.',
        recommendations: 'Consider incorporating more formative assessment checkpoints.',
        follow_up_needed: i === 0, // First observation per teacher needs follow-up
        follow_up_date: '',
        follow_up_completed: false,
        shared_with_teacher: i > 0, // Share all but the first one
        created_at: obsDate.toISOString()
      });
    }
  });

  DataService.batchCreate('observations', observations);
  Logger.log('Seeded ' + observations.length + ' observation records.');
}

/**
 * Seeds Kanban data: 1 board, 5 columns, 15 cards, 4 comments.
 * Run after seedStaffData().
 */
function seedKanbanData() {
  var existingBoards = DataService.getRecords('kanban_boards');
  if (existingBoards.length > 0) {
    Logger.log('Kanban already seeded (' + existingBoards.length + ' boards). Skipping.');
    return;
  }

  var staff = DataService.getRecords('staff');
  var admins = staff.filter(function(s) { return s.role === 'admin'; });
  if (admins.length === 0) {
    Logger.log('Need staff data first. Run seedStaffData().');
    return;
  }

  var createdBy = admins[0].id;

  // ── Board ──
  var board = DataService.createRecord('kanban_boards', {
    title: 'Strategic Plan 2025-26',
    description: 'School-wide strategic initiatives and action items for the current academic year.',
    created_by: createdBy,
    is_archived: false
  });
  var boardId = board.id;

  // ── Columns ──
  var colDefs = [
    { title: 'Backlog',     position: 1, color: '#94a3b8', wip_limit: 0 },
    { title: 'To Do',       position: 2, color: '#3b82f6', wip_limit: 5 },
    { title: 'In Progress', position: 3, color: '#f59e0b', wip_limit: 3 },
    { title: 'Review',      position: 4, color: '#8b5cf6', wip_limit: 3 },
    { title: 'Done',        position: 5, color: '#22c55e', wip_limit: 0 }
  ];

  var columns = [];
  colDefs.forEach(function(cd) {
    var col = DataService.createRecord('kanban_columns', {
      board_id: boardId,
      title: cd.title,
      position: cd.position,
      color: cd.color,
      wip_limit: cd.wip_limit
    });
    columns.push(col);
  });

  // Helper: staff IDs as CSV
  var adminIds = admins.map(function(a) { return a.id; });
  var teachers = staff.filter(function(s) { return s.role === 'teacher'; });

  // ── Cards ──
  var today = new Date();
  function daysFromNow(n) {
    var d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString();
  }

  // PARA categories: project (time-bound), area (ongoing responsibility),
  //   resource (reference/evidence), archive (completed/shelved)
  var cardDefs = [
    // Backlog (3)
    { col: 0, title: 'Research peer observation models', description: 'Survey best practices from IB and CIS schools for peer observation frameworks.', priority: 'medium', assigned_to: adminIds[0], due_date: daysFromNow(60), labels: 'research,observations', category: 'resource', key_takeaway: 'Gather IB/CIS exemplars before designing our framework' },
    { col: 0, title: 'Review assessment policy', description: 'Align grading policies with updated MYP assessment criteria.', priority: 'low', assigned_to: '', due_date: '', labels: 'policy,curriculum', category: 'area', key_takeaway: 'MYP criteria changed — grading policy needs alignment' },
    { col: 0, title: 'Parent communication strategy', description: 'Develop plan for improved parent engagement and communication channels.', priority: 'low', assigned_to: '', due_date: '', labels: 'communications', category: 'area', key_takeaway: 'Need structured plan for parent engagement channels' },

    // To Do (4)
    { col: 1, title: 'Update teacher evaluation rubric', description: 'Revise rubric to include new instructional technology standards.', priority: 'high', assigned_to: adminIds.slice(0, 2).join(','), due_date: daysFromNow(14), labels: 'evaluation,urgent', category: 'project', key_takeaway: 'Add ed-tech standards to evaluation criteria by end of month' },
    { col: 1, title: 'Schedule PD workshops for Q2', description: 'Plan and calendar professional development sessions for January-March.', priority: 'medium', assigned_to: adminIds[1 % adminIds.length], due_date: daysFromNow(21), labels: 'professional-development', category: 'project', key_takeaway: 'Lock in Q2 PD calendar and external facilitators' },
    { col: 1, title: 'Onboard new science teacher', description: 'Complete onboarding checklist for the new physics teacher starting next month.', priority: 'high', assigned_to: adminIds[0], due_date: daysFromNow(10), labels: 'hiring,onboarding', category: 'project', key_takeaway: 'Physics teacher starts next month — complete checklist' },
    { col: 1, title: 'Student wellbeing survey', description: 'Design and distribute student wellbeing survey for semester 2.', priority: 'medium', assigned_to: teachers.length > 0 ? teachers[0].id : adminIds[0], due_date: daysFromNow(30), labels: 'wellbeing,data', category: 'project', key_takeaway: 'Survey must go out first week of semester 2' },

    // In Progress (3)
    { col: 2, title: 'CIS accreditation self-study', description: 'Complete Domain B self-study report with evidence portfolio.', priority: 'critical', assigned_to: adminIds.slice(0, Math.min(3, adminIds.length)).join(','), due_date: daysFromNow(7), labels: 'accreditation,priority', category: 'project', key_takeaway: 'Domain A done — Domain B evidence portfolio is the bottleneck' },
    { col: 2, title: 'Curriculum mapping - Grade 9', description: 'Complete horizontal and vertical alignment for all Grade 9 subjects.', priority: 'high', assigned_to: adminIds[2 % adminIds.length], due_date: daysFromNow(5), labels: 'curriculum,mapping', category: 'project', key_takeaway: 'Horizontal alignment complete, vertical alignment in progress' },
    { col: 2, title: 'Classroom technology audit', description: 'Inventory and assess condition of classroom tech across all buildings.', priority: 'medium', assigned_to: teachers.length > 1 ? teachers[1].id : adminIds[0], due_date: daysFromNow(12), labels: 'technology,facilities', category: 'resource', key_takeaway: 'Building A complete — Buildings B and C still need inventory' },

    // Review (2)
    { col: 3, title: 'Staff handbook updates', description: 'Review and finalize updated policies for the staff handbook.', priority: 'medium', assigned_to: adminIds[0], due_date: daysFromNow(3), labels: 'policy,handbook', category: 'area', key_takeaway: 'All sections reviewed — pending principal sign-off' },
    { col: 3, title: 'Budget proposal - Learning Support', description: 'Review budget request for additional learning support resources.', priority: 'high', assigned_to: adminIds.slice(0, 2).join(','), due_date: daysFromNow(-2), labels: 'budget,learning-support', category: 'project', key_takeaway: 'Request for 2 additional LSAs — needs board approval' },

    // Done (3)
    { col: 4, title: 'Semester 1 report cards', description: 'All semester 1 report cards published and distributed to families.', priority: 'high', assigned_to: adminIds[1 % adminIds.length], due_date: daysFromNow(-10), labels: 'reporting,completed', category: 'archive', key_takeaway: 'All reports published on time — 98% parent acknowledgment' },
    { col: 4, title: 'Emergency drill schedule', description: 'Published full-year emergency drill schedule with building coordinators.', priority: 'medium', assigned_to: adminIds[0], due_date: daysFromNow(-15), labels: 'safety', category: 'archive', key_takeaway: 'Full-year schedule published to all building coordinators' },
    { col: 4, title: 'New teacher mentoring program', description: 'Launched the mentoring pairs program for 5 new hires this year.', priority: 'high', assigned_to: adminIds[2 % adminIds.length], due_date: daysFromNow(-20), labels: 'mentoring,onboarding', category: 'archive', key_takeaway: '5 mentor pairs active — first check-in completed' }
  ];

  var cards = [];
  cardDefs.forEach(function(cd, idx) {
    var col = columns[cd.col];
    var card = DataService.createRecord('kanban_cards', {
      board_id: boardId,
      column_id: col.id,
      title: cd.title,
      description: cd.description,
      priority: cd.priority,
      assigned_to: cd.assigned_to,
      due_date: cd.due_date,
      labels: cd.labels,
      category: cd.category || '',
      key_takeaway: cd.key_takeaway || '',
      position: idx + 1,
      created_by: createdBy
    });
    cards.push(card);
  });

  // ── Comments ──
  var commentDefs = [
    { cardIdx: 7, content: 'Self-study draft is progressing well. Domain A is complete. Need input on Domain B evidence.', author: adminIds[0] },
    { cardIdx: 7, content: 'I\'ve uploaded the evidence documents to the shared drive. Let me know if anything is missing.', author: adminIds[1 % adminIds.length] },
    { cardIdx: 3, content: 'Let\'s discuss the new technology standards at next week\'s leadership meeting before finalizing.', author: adminIds[2 % adminIds.length] },
    { cardIdx: 10, content: 'All sections reviewed. Ready for final sign-off from the principal.', author: adminIds[1 % adminIds.length] }
  ];

  commentDefs.forEach(function(cd) {
    DataService.createRecord('kanban_comments', {
      card_id: cards[cd.cardIdx].id,
      author_id: cd.author,
      content: cd.content,
      created_at: nowISO()
    });
  });

  Logger.log('Seeded Kanban: 1 board, ' + columns.length + ' columns, ' + cards.length + ' cards, ' + commentDefs.length + ' comments.');
}

/**
 * Seeds kanban enhancement data: checklists and activity log entries.
 * Run after seedKanbanData() and setupPhase2b().
 */
function seedKanbanEnhancementsData() {
  var existingChecklists = DataService.getRecords('kanban_checklists');
  if (existingChecklists.length > 0) {
    Logger.log('Kanban enhancements already seeded (' + existingChecklists.length + ' checklists). Skipping.');
    return;
  }

  var cards = DataService.getRecords('kanban_cards');
  if (cards.length === 0) {
    Logger.log('Need kanban card data first. Run seedKanbanData().');
    return;
  }

  var staff = DataService.getRecords('staff');
  var admins = staff.filter(function(s) { return s.role === 'admin'; });
  if (admins.length === 0) {
    Logger.log('Need staff data first. Run seedStaffData().');
    return;
  }

  var now = new Date();
  var totalChecklists = 0;
  var totalActivity = 0;

  // Pick 4 cards that have meaningful work (skip first 3 backlog cards)
  var targetCards = cards.slice(3, 7); // cards in To Do / In Progress range
  if (targetCards.length < 4) targetCards = cards.slice(0, 4);

  var checklistDefs = [
    // Card 0 checklists
    [
      { text: 'Draft initial framework document', is_checked: true },
      { text: 'Collect feedback from department heads', is_checked: true },
      { text: 'Revise based on leadership input', is_checked: false },
      { text: 'Present to full faculty for approval', is_checked: false }
    ],
    // Card 1 checklists
    [
      { text: 'Define evaluation categories', is_checked: true },
      { text: 'Draft scoring rubric criteria', is_checked: true },
      { text: 'Pilot with 3 volunteer teachers', is_checked: false }
    ],
    // Card 2 checklists
    [
      { text: 'Research best practices from peer schools', is_checked: true },
      { text: 'Create implementation timeline', is_checked: false },
      { text: 'Identify budget requirements', is_checked: false }
    ],
    // Card 3 checklists
    [
      { text: 'Set up project workspace', is_checked: true },
      { text: 'Assign team roles', is_checked: true },
      { text: 'Complete phase 1 deliverables', is_checked: true },
      { text: 'Review with stakeholders', is_checked: false },
      { text: 'Finalize documentation', is_checked: false }
    ]
  ];

  for (var c = 0; c < targetCards.length && c < checklistDefs.length; c++) {
    var items = checklistDefs[c];
    for (var i = 0; i < items.length; i++) {
      DataService.createRecord('kanban_checklists', {
        card_id: targetCards[c].id,
        text: items[i].text,
        is_checked: items[i].is_checked,
        sort_order: i + 1,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      });
      totalChecklists++;
    }
  }

  // Seed activity log entries across various cards
  var boardId = cards[0] ? cards[0].board_id : '';
  var columns = DataService.getRecords('kanban_columns');
  var colIds = columns.map(function(col) { return col.id; });

  // Card creation activity for first 8 cards
  for (var k = 0; k < Math.min(8, cards.length); k++) {
    var daysAgo = 30 - (k * 3);
    var actDate = new Date(now);
    actDate.setDate(actDate.getDate() - daysAgo);

    DataService.createRecord('kanban_activity', {
      card_id: cards[k].id,
      board_id: boardId,
      user_id: admins[k % admins.length].id,
      action_type: 'card_created',
      field_name: '',
      old_value: '',
      new_value: cards[k].title,
      created_at: actDate.toISOString()
    });
    totalActivity++;
  }

  // Card moved activity for cards in later columns
  for (var m = 5; m < Math.min(12, cards.length); m++) {
    var moveDaysAgo = 15 - (m - 5);
    var moveDate = new Date(now);
    moveDate.setDate(moveDate.getDate() - moveDaysAgo);

    var fromCol = colIds.length > 1 ? colIds[0] : '';
    var toCol = cards[m].column_id || '';

    DataService.createRecord('kanban_activity', {
      card_id: cards[m].id,
      board_id: boardId,
      user_id: admins[m % admins.length].id,
      action_type: 'card_moved',
      field_name: 'column_id',
      old_value: fromCol,
      new_value: toCol,
      created_at: moveDate.toISOString()
    });
    totalActivity++;
  }

  // Comment activity for cards with comments
  var commentCards = [3, 7, 10];
  for (var cc = 0; cc < commentCards.length; cc++) {
    var idx = commentCards[cc];
    if (idx < cards.length) {
      var commentDate = new Date(now);
      commentDate.setDate(commentDate.getDate() - (5 + cc));

      DataService.createRecord('kanban_activity', {
        card_id: cards[idx].id,
        board_id: boardId,
        user_id: admins[cc % admins.length].id,
        action_type: 'comment_added',
        field_name: 'comment',
        old_value: '',
        new_value: 'Comment added',
        created_at: commentDate.toISOString()
      });
      totalActivity++;
    }
  }

  Logger.log('Seeded Kanban enhancements: ' + totalChecklists + ' checklists, ' + totalActivity + ' activity entries.');
}

/**
 * Seeds the pgp_standards table with AISC's 9 Professional Growth Standards.
 * Standard 8 (Embeds Wellbeing) is mandatory every year.
 * Run after setupPhase3b().
 */
function seedPgpStandards() {
  var existing = DataService.getRecords('pgp_standards');
  if (existing.length > 0) {
    Logger.log('PGP standards already seeded (' + existing.length + ' standards). Skipping.');
    return;
  }

  var now = new Date().toISOString();
  var standards = [
    {
      standard_number: 1,
      short_name: 'Embraces Responsibility',
      hashtag: '#ResponsibleTeacher',
      description: 'Takes responsibility for the learning of students by maintaining current subject knowledge, implementing evidence-based teaching practices, and committing to continuous professional improvement in content and pedagogy.',
      is_mandatory: false
    },
    {
      standard_number: 2,
      short_name: 'Understands Students',
      hashtag: '#KnowsStudents',
      description: 'Understands the diverse backgrounds, developmental stages, and learning needs of students. Uses this knowledge to create inclusive, differentiated learning experiences that recognize and value each student as an individual.',
      is_mandatory: false
    },
    {
      standard_number: 3,
      short_name: 'Designs Curriculum',
      hashtag: '#CurriculumDesigner',
      description: 'Designs, selects, and organizes curriculum that is aligned with recognized frameworks, incorporates interdisciplinary connections, and ensures coherent learning progressions across units and grade levels.',
      is_mandatory: false
    },
    {
      standard_number: 4,
      short_name: 'Facilitates Learning',
      hashtag: '#LearningFacilitator',
      description: 'Plans and implements engaging, student-centered learning experiences that promote critical thinking, creativity, collaboration, and communication through varied instructional strategies and appropriate use of technology.',
      is_mandatory: false
    },
    {
      standard_number: 5,
      short_name: 'Assesses Effectively',
      hashtag: '#AssessmentExpert',
      description: 'Uses a variety of formative and summative assessment strategies aligned to learning objectives to monitor progress, provide timely feedback, and inform instructional decisions that support student growth.',
      is_mandatory: false
    },
    {
      standard_number: 6,
      short_name: 'Creates Environment',
      hashtag: '#PositiveEnvironment',
      description: 'Creates and maintains a safe, respectful, and inclusive learning environment that fosters positive relationships, student agency, and a culture of high expectations and mutual respect.',
      is_mandatory: false
    },
    {
      standard_number: 7,
      short_name: 'Engages Community',
      hashtag: '#CommunityPartner',
      description: 'Engages parents, families, and the wider community as partners in the educational process. Communicates effectively and regularly about student learning, well-being, and school initiatives.',
      is_mandatory: false
    },
    {
      standard_number: 8,
      short_name: 'Embeds Wellbeing',
      hashtag: '#WellbeingChampion',
      description: 'Embeds social-emotional learning and wellbeing practices into the educational experience. Models self-care, promotes resilience, and supports the holistic development of students and colleagues.',
      is_mandatory: true
    },
    {
      standard_number: 9,
      short_name: 'Demonstrates Ethics',
      hashtag: '#EthicalProfessional',
      description: 'Demonstrates professionalism, ethical conduct, and integrity in all interactions. Upholds the values of the school community, respects confidentiality, and contributes to a positive professional culture.',
      is_mandatory: false
    }
  ];

  for (var i = 0; i < standards.length; i++) {
    var s = standards[i];
    DataService.createRecord('pgp_standards', {
      standard_number: s.standard_number,
      short_name: s.short_name,
      hashtag: s.hashtag,
      description: s.description,
      is_mandatory: s.is_mandatory,
      is_active: true,
      sort_order: s.standard_number,
      created_at: now,
      updated_at: now
    });
  }

  Logger.log('Seeded ' + standards.length + ' PGP standards.');
}

/**
 * Seeds growth plan data using the standards-based PGP model.
 * Creates 1 plan per teacher/specialist with standard selections, cycle history, and meetings.
 * Run after seedStaffData() and seedPgpStandards().
 */
function seedGrowthPlanData() {
  var existingPlans = DataService.getRecords('growth_plans');
  if (existingPlans.length > 0) {
    Logger.log('Growth plans already seeded (' + existingPlans.length + ' plans). Skipping.');
    return;
  }

  var staff = DataService.getRecords('staff');
  var admins = staff.filter(function(s) { return s.role === 'admin'; });
  var teachers = staff.filter(function(s) { return s.role === 'teacher' || s.role === 'specialist'; });

  if (admins.length === 0 || teachers.length === 0) {
    Logger.log('Need staff data first. Run seedStaffData().');
    return;
  }

  // Load PGP standards
  var allStandards = DataService.getRecords('pgp_standards');
  if (allStandards.length === 0) {
    Logger.log('Need PGP standards first. Run seedPgpStandards().');
    return;
  }

  // Index standards by number for easy lookup
  var stdByNum = {};
  var mandatoryStd = null;
  for (var si = 0; si < allStandards.length; si++) {
    var num = Number(allStandards[si].standard_number);
    stdByNum[num] = allStandards[si];
    if (String(allStandards[si].is_mandatory) === 'true' || allStandards[si].is_mandatory === true) {
      mandatoryStd = allStandards[si];
    }
  }

  // Get academic year from config
  var configs = DataService.getRecords('_config');
  var academicYear = '2025-26';
  configs.forEach(function(c) {
    if (c.key === 'academic_year') academicYear = c.value;
  });

  // Divisions for variety
  var divisions = ['Elementary', 'Middle School', 'High School'];

  // Status distribution for 11 teachers
  var statuses = ['draft', 'draft', 'draft', 'active', 'active', 'active', 'active', 'mid_year_review', 'mid_year_review', 'final_review', 'completed'];

  // 4-year cycle: each teacher picks 2 custom standards + mandatory #8
  // Simulate different cycle years and standard selections
  var cycleSelections = [
    { yearInCycle: 1, customs: [1, 2] },
    { yearInCycle: 1, customs: [3, 4] },
    { yearInCycle: 2, customs: [5, 6] },
    { yearInCycle: 2, customs: [1, 7] },
    { yearInCycle: 3, customs: [9, 3] },
    { yearInCycle: 3, customs: [2, 5] },
    { yearInCycle: 4, customs: [4, 6] },
    { yearInCycle: 4, customs: [7, 9] },
    { yearInCycle: 1, customs: [1, 5] },
    { yearInCycle: 2, customs: [3, 7] },
    { yearInCycle: 3, customs: [2, 4] }
  ];

  // Goal/reflection templates keyed by standard number
  var goalTemplates = {
    1: 'Deepen content knowledge through advanced coursework and apply research-based instructional strategies to improve student outcomes.',
    2: 'Use student interest surveys and learning profiles to design differentiated tasks that address individual student needs.',
    3: 'Redesign unit planners to strengthen vertical alignment and incorporate authentic interdisciplinary connections.',
    4: 'Implement inquiry-based learning protocols that increase student voice, choice, and critical thinking opportunities.',
    5: 'Develop a balanced assessment system with clear success criteria and timely, actionable feedback loops.',
    6: 'Establish restorative classroom practices that build student agency and foster a growth mindset culture.',
    7: 'Create structured opportunities for parent engagement including student-led conferences and curriculum showcases.',
    8: 'Integrate mindfulness and social-emotional check-ins into daily routines and model healthy work-life practices.',
    9: 'Engage in ethical reflection practices and contribute to building a collaborative, trust-based professional culture.'
  };

  var criteriaTemplates = {
    1: 'Evidence of updated unit plans reflecting current research; student achievement data shows measurable improvement.',
    2: 'All units include differentiation strategies; student feedback indicates increased engagement and relevance.',
    3: 'Curriculum maps reviewed and approved showing clear vertical alignment; at least 2 interdisciplinary units delivered.',
    4: 'Student-led inquiry documented in at least 3 units; student reflection data shows growth in critical thinking.',
    5: 'Formative assessment cycle implemented in all units; 90% of students receive feedback within 48 hours.',
    6: 'Classroom agreements co-created with students; behavioral referrals reduced by 25%; student surveys show belonging.',
    7: 'Parent participation increases by 20%; post-event surveys indicate satisfaction; communication log maintained.',
    8: 'Weekly wellbeing activities documented; staff/student survey data shows improved wellbeing indicators.',
    9: 'Peer collaboration log maintained; ethical dilemma discussions documented; positive feedback from colleagues.'
  };

  var evidencePlannedTemplates = {
    1: 'Updated unit plans, PD certificates, student performance data comparisons.',
    2: 'Student profiles, differentiated task samples, student voice survey results.',
    3: 'Curriculum maps, unit planners with interdisciplinary links, peer review notes.',
    4: 'Lesson recordings, student inquiry projects, thinking routine documentation.',
    5: 'Assessment samples with rubrics, feedback logs, student achievement tracking sheets.',
    6: 'Classroom agreement posters, student survey data, restorative conversation logs.',
    7: 'Parent communication logs, conference attendance records, event feedback surveys.',
    8: 'Wellbeing activity plans, check-in data, personal reflection journal entries.',
    9: 'Collaboration meeting notes, mentoring logs, professional reading reflections.'
  };

  var reflectionTemplates = {
    1: 'Implementing evidence-based strategies has significantly changed how I approach lesson design. Students are more engaged with the new instructional techniques.',
    2: 'Using learning profiles was eye-opening. I now see more clearly where students need support versus challenge.',
    3: 'The vertical alignment work revealed gaps I had not noticed. Collaborative planning sessions were invaluable.',
    4: 'Inquiry-based learning took more setup time but the depth of student thinking improved noticeably.',
    5: 'The feedback loop system works well. Students report feeling more supported and clear about expectations.',
    6: 'Restorative practices transformed our classroom dynamics. Students take more ownership of the community.',
    7: 'Parent engagement increased substantially. Student-led conferences were a highlight for families.',
    8: 'Daily check-ins have become essential. Both students and I benefit from the mindfulness routines.',
    9: 'Ethical reflection has deepened my practice. Peer collaboration has been a genuine source of growth.'
  };

  var meetingTemplates = [
    { type: 'initial', notes: 'Discussed PGP standard selections for the year. Reviewed cycle coverage and identified focus areas based on previous year reflections and observation feedback.', actions: 'Finalize initial goals for each selected standard by next week\nReview Standards at a Glance chart for cycle coverage' },
    { type: 'check_in', notes: 'Reviewed progress on selected standards. Good momentum on wellbeing integration. Discussed evidence collection strategies and upcoming professional development opportunities.', actions: 'Share evidence artifacts at next meeting\nComplete success criteria self-assessment' },
    { type: 'mid_year', notes: 'Mid-year review of all three standards. Wellbeing standard on track with strong evidence. Custom standards progressing well. Discussed adjustments for semester 2 and reflection prompts.', actions: 'Draft mid-year reflections for each standard\nPrepare evidence portfolio for supervisor review' },
    { type: 'informal', notes: 'Brief check-in following classroom observation. Connected observation feedback to PGP goals. Positive alignment between stated goals and observed practice.', actions: 'Incorporate observation feedback into reflection notes' }
  ];

  var plans = [];
  var totalSelections = 0;
  var totalMeetings = 0;
  var totalCycleEntries = 0;

  teachers.forEach(function(teacher, tIdx) {
    var supervisor = admins[tIdx % admins.length];
    var status = statuses[tIdx % statuses.length];
    var cycle = cycleSelections[tIdx % cycleSelections.length];
    var division = divisions[tIdx % divisions.length];
    var yearsAtSchool = 1 + (tIdx % 8); // 1-8 years

    // Create plan with staggered creation dates
    var daysAgo = 60 + (tIdx * 5);
    var createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - daysAgo);

    var facultySigned = '';
    var supervisorSigned = '';
    if (status === 'completed' || status === 'final_review') {
      var signDate = new Date();
      signDate.setDate(signDate.getDate() - 10 - tIdx);
      facultySigned = signDate.toISOString();
      if (status === 'completed') {
        var supSignDate = new Date(signDate);
        supSignDate.setDate(supSignDate.getDate() + 3);
        supervisorSigned = supSignDate.toISOString();
      }
    }

    var plan = DataService.createRecord('growth_plans', {
      staff_id: teacher.id,
      academic_year: academicYear,
      supervisor_id: supervisor.id,
      status: status,
      division: division,
      years_at_school: yearsAtSchool,
      faculty_signed_date: facultySigned,
      supervisor_signed_date: supervisorSigned,
      created_at: createdDate.toISOString()
    });
    plans.push(plan);

    // Select standards: mandatory #8 + 2 custom standards
    var selectedStdNums = [8]; // Always mandatory
    for (var c = 0; c < cycle.customs.length; c++) {
      if (cycle.customs[c] !== 8) { // Skip if overlap with mandatory
        selectedStdNums.push(cycle.customs[c]);
      }
    }

    // Create pgp_standard_selections for each selected standard
    for (var s = 0; s < selectedStdNums.length; s++) {
      var stdNum = selectedStdNums[s];
      var std = stdByNum[stdNum];
      if (!std) continue;

      var selStatus = 'not_started';
      if (status === 'draft') {
        selStatus = 'not_started';
      } else if (status === 'active') {
        selStatus = 'in_progress';
      } else if (status === 'mid_year_review') {
        selStatus = 'in_progress';
      } else if (status === 'final_review' || status === 'completed') {
        selStatus = 'completed';
      }

      var initialGoal = goalTemplates[stdNum] || '';
      var successCriteria = criteriaTemplates[stdNum] || '';
      var evidencePlanned = evidencePlannedTemplates[stdNum] || '';
      var reflection = '';
      var evidenceLinked = '';
      var supervisorComments = '';

      // Fill in reflection/evidence for plans that are further along
      if (status === 'mid_year_review' || status === 'final_review' || status === 'completed') {
        reflection = reflectionTemplates[stdNum] || '';
        evidenceLinked = evidencePlannedTemplates[stdNum] || '';
      }
      if (status === 'completed') {
        supervisorComments = 'Strong progress demonstrated. Evidence is well-documented and reflections show genuine professional growth. Continue building on these practices next year.';
      }

      DataService.createRecord('pgp_standard_selections', {
        plan_id: plan.id,
        standard_id: std.id,
        year_in_cycle: cycle.yearInCycle,
        initial_goal: initialGoal,
        success_criteria: successCriteria,
        evidence_planned: evidencePlanned,
        reflection: reflection,
        evidence_linked: evidenceLinked,
        supervisor_comments: supervisorComments,
        status: selStatus,
        sort_order: s + 1,
        created_at: createdDate.toISOString(),
        updated_at: createdDate.toISOString()
      });
      totalSelections++;

      // Create cycle history entry for non-draft plans
      if (status !== 'draft') {
        DataService.createRecord('pgp_cycle_history', {
          staff_id: teacher.id,
          academic_year: academicYear,
          year_in_cycle: cycle.yearInCycle,
          standard_id: std.id,
          created_at: createdDate.toISOString(),
          updated_at: createdDate.toISOString()
        });
        totalCycleEntries++;
      }
    }

    // Create 1-3 meetings per plan (more for active/review/completed plans)
    var numMeetings = status === 'draft' ? 1 : (status === 'completed' ? 3 : 2);

    for (var m = 0; m < numMeetings; m++) {
      var tmpl = meetingTemplates[m % meetingTemplates.length];
      var meetingDate = new Date();
      meetingDate.setDate(meetingDate.getDate() - (daysAgo - 10) + (m * 25));

      var nextMeetingDate = '';
      if (m < numMeetings - 1 || status !== 'completed') {
        var next = new Date(meetingDate);
        next.setDate(next.getDate() + 42); // ~6 weeks
        nextMeetingDate = next.toISOString();
      }

      DataService.createRecord('growth_meetings', {
        plan_id: plan.id,
        meeting_date: meetingDate.toISOString(),
        meeting_type: tmpl.type,
        attendees: teacher.id + ',' + supervisor.id,
        notes: tmpl.notes,
        action_items: tmpl.actions,
        next_meeting_date: nextMeetingDate,
        created_by: supervisor.id
      });
      totalMeetings++;
    }
  });

  Logger.log('Seeded Growth Plans: ' + plans.length + ' plans, ' + totalSelections + ' standard selections, ' + totalCycleEntries + ' cycle entries, ' + totalMeetings + ' meetings.');
}

/**
 * Seeds project data: 3 projects, 11 phases, ~35 tasks.
 * Realistic international school projects.
 */
function seedProjectData() {
  var existing = DataService.getRecords('projects');
  if (existing.length > 0) {
    Logger.log('Projects already seeded (' + existing.length + ' records). Skipping.');
    return;
  }

  // Resolve staff IDs
  var allStaff = DataService.getRecords('staff');
  var staffByEmail = {};
  allStaff.forEach(function(s) { staffByEmail[s.email] = s; });

  var sarah   = staffByEmail['principal@school.edu'];       // admin
  var james   = staffByEmail['vice.principal@school.edu'];   // admin
  var aisha   = staffByEmail['curriculum@school.edu'];       // admin
  var jin     = staffByEmail['j.kim@school.edu'];            // teacher, Science
  var lisa    = staffByEmail['l.johnson@school.edu'];        // teacher, Math
  var michael = staffByEmail['m.thompson@school.edu'];       // teacher, English
  var david   = staffByEmail['d.weber@school.edu'];          // teacher, Humanities
  var karen   = staffByEmail['k.brown@school.edu'];          // teacher, Elementary
  var alex    = staffByEmail['a.lee@school.edu'];            // specialist

  // Date helpers — relative to today
  var today = new Date();
  function daysAgo(n) {
    var d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }
  function daysFromNow(n) {
    var d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  }

  // ═══════════════════════════════════════
  // Project 1: Curriculum Redesign – MYP Alignment
  // ═══════════════════════════════════════
  var proj1 = DataService.createRecord('projects', {
    title: 'Curriculum Redesign – MYP Alignment',
    description: 'Comprehensive review and redesign of the school curriculum to align with IB MYP standards across all subject areas.',
    owner_id: sarah.id,
    status: 'active',
    start_date: daysAgo(90),
    target_end_date: daysFromNow(120),
    actual_end_date: ''
  });

  var p1phase1 = DataService.createRecord('project_phases', {
    project_id: proj1.id, title: 'Audit Current Curriculum', description: 'Comprehensive review of existing curriculum against MYP framework requirements.',
    phase_order: 1, start_date: daysAgo(90), end_date: daysAgo(42), status: 'completed', depends_on_phase_id: ''
  });
  var p1phase2 = DataService.createRecord('project_phases', {
    project_id: proj1.id, title: 'Design New Framework', description: 'Create vertical alignment maps, assessment rubrics, and unit planner templates.',
    phase_order: 2, start_date: daysAgo(42), end_date: daysFromNow(28), status: 'in_progress', depends_on_phase_id: p1phase1.id
  });
  var p1phase3 = DataService.createRecord('project_phases', {
    project_id: proj1.id, title: 'Pilot Implementation', description: 'Selected departments trial new curriculum framework with student cohorts.',
    phase_order: 3, start_date: daysFromNow(35), end_date: daysFromNow(90), status: 'not_started', depends_on_phase_id: p1phase2.id
  });
  var p1phase4 = DataService.createRecord('project_phases', {
    project_id: proj1.id, title: 'Full Rollout & Review', description: 'School-wide implementation with ongoing monitoring and feedback loops.',
    phase_order: 4, start_date: daysFromNow(90), end_date: daysFromNow(120), status: 'not_started', depends_on_phase_id: p1phase3.id
  });

  // Phase 1 tasks (completed)
  DataService.createRecord('project_tasks', { phase_id: p1phase1.id, project_id: proj1.id, title: 'Review all MYP subject guides', assigned_to: aisha.id, due_date: daysAgo(70), status: 'completed', notes: 'All 8 subject group guides reviewed.' });
  DataService.createRecord('project_tasks', { phase_id: p1phase1.id, project_id: proj1.id, title: 'Identify alignment gaps by department', assigned_to: aisha.id, due_date: daysAgo(56), status: 'completed', notes: 'Gap analysis spreadsheet completed for all departments.' });
  DataService.createRecord('project_tasks', { phase_id: p1phase1.id, project_id: proj1.id, title: 'Document findings report', assigned_to: sarah.id, due_date: daysAgo(42), status: 'completed', notes: 'Report shared with leadership team.' });

  // Phase 2 tasks (mixed)
  DataService.createRecord('project_tasks', { phase_id: p1phase2.id, project_id: proj1.id, title: 'Draft vertical alignment maps', assigned_to: aisha.id, due_date: daysFromNow(7), status: 'in_progress', notes: 'Science and Math maps complete. English and Humanities in progress.' });
  DataService.createRecord('project_tasks', { phase_id: p1phase2.id, project_id: proj1.id, title: 'Create assessment rubric templates', assigned_to: lisa.id, due_date: daysFromNow(14), status: 'in_progress', notes: 'Criterion-based rubrics aligned with MYP assessment criteria.' });
  DataService.createRecord('project_tasks', { phase_id: p1phase2.id, project_id: proj1.id, title: 'Design unit planner format', assigned_to: michael.id, due_date: daysFromNow(21), status: 'pending', notes: '' });

  // Phase 3 tasks (pending)
  DataService.createRecord('project_tasks', { phase_id: p1phase3.id, project_id: proj1.id, title: 'Select pilot departments', assigned_to: sarah.id, due_date: daysFromNow(42), status: 'pending', notes: '' });
  DataService.createRecord('project_tasks', { phase_id: p1phase3.id, project_id: proj1.id, title: 'Train pilot teachers on new framework', assigned_to: aisha.id, due_date: daysFromNow(56), status: 'pending', notes: '' });
  DataService.createRecord('project_tasks', { phase_id: p1phase3.id, project_id: proj1.id, title: 'Develop feedback instruments', assigned_to: alex.id, due_date: daysFromNow(63), status: 'pending', notes: '' });

  // Phase 4 tasks (pending)
  DataService.createRecord('project_tasks', { phase_id: p1phase4.id, project_id: proj1.id, title: 'School-wide professional development session', assigned_to: aisha.id, due_date: daysFromNow(98), status: 'pending', notes: '' });
  DataService.createRecord('project_tasks', { phase_id: p1phase4.id, project_id: proj1.id, title: 'Monitor implementation across departments', assigned_to: sarah.id, due_date: daysFromNow(112), status: 'pending', notes: '' });
  DataService.createRecord('project_tasks', { phase_id: p1phase4.id, project_id: proj1.id, title: 'Collect and analyze feedback data', assigned_to: alex.id, due_date: daysFromNow(120), status: 'pending', notes: '' });

  // ═══════════════════════════════════════
  // Project 2: Facility Technology Upgrade
  // ═══════════════════════════════════════
  var proj2 = DataService.createRecord('projects', {
    title: 'Facility Technology Upgrade',
    description: 'Upgrade classroom technology infrastructure including interactive displays, student devices, and network improvements.',
    owner_id: james.id,
    status: 'active',
    start_date: daysAgo(60),
    target_end_date: daysFromNow(60),
    actual_end_date: ''
  });

  var p2phase1 = DataService.createRecord('project_phases', {
    project_id: proj2.id, title: 'Needs Assessment', description: 'Audit current technology and survey teacher needs.',
    phase_order: 1, start_date: daysAgo(60), end_date: daysAgo(35), status: 'completed', depends_on_phase_id: ''
  });
  var p2phase2 = DataService.createRecord('project_phases', {
    project_id: proj2.id, title: 'Procurement & Budget', description: 'Research vendors, submit budget proposal, obtain board approval.',
    phase_order: 2, start_date: daysAgo(35), end_date: daysAgo(14), status: 'completed', depends_on_phase_id: p2phase1.id
  });
  var p2phase3 = DataService.createRecord('project_phases', {
    project_id: proj2.id, title: 'Installation', description: 'Phased rollout of new equipment across campus buildings.',
    phase_order: 3, start_date: daysAgo(14), end_date: daysFromNow(28), status: 'in_progress', depends_on_phase_id: p2phase2.id
  });
  var p2phase4 = DataService.createRecord('project_phases', {
    project_id: proj2.id, title: 'Training & Support', description: 'Teacher training workshops and ongoing help desk support.',
    phase_order: 4, start_date: daysFromNow(21), end_date: daysFromNow(60), status: 'not_started', depends_on_phase_id: p2phase3.id
  });

  // Phase 1 tasks (completed)
  DataService.createRecord('project_tasks', { phase_id: p2phase1.id, project_id: proj2.id, title: 'Classroom technology audit', assigned_to: david.id, due_date: daysAgo(49), status: 'completed', notes: 'All 42 classrooms audited. Report filed.' });
  DataService.createRecord('project_tasks', { phase_id: p2phase1.id, project_id: proj2.id, title: 'Teacher technology survey', assigned_to: james.id, due_date: daysAgo(42), status: 'completed', notes: '87% response rate. Key needs: displays and reliable WiFi.' });

  // Phase 2 tasks (completed)
  DataService.createRecord('project_tasks', { phase_id: p2phase2.id, project_id: proj2.id, title: 'Research vendor options', assigned_to: james.id, due_date: daysAgo(28), status: 'completed', notes: 'Shortlisted 3 vendors. Demos completed.' });
  DataService.createRecord('project_tasks', { phase_id: p2phase2.id, project_id: proj2.id, title: 'Submit budget proposal to board', assigned_to: sarah.id, due_date: daysAgo(21), status: 'completed', notes: 'Approved at February board meeting.' });
  DataService.createRecord('project_tasks', { phase_id: p2phase2.id, project_id: proj2.id, title: 'Finalize vendor contracts', assigned_to: james.id, due_date: daysAgo(14), status: 'completed', notes: '' });

  // Phase 3 tasks (mixed)
  DataService.createRecord('project_tasks', { phase_id: p2phase3.id, project_id: proj2.id, title: 'Install displays in Building A', assigned_to: james.id, due_date: daysAgo(3), status: 'completed', notes: '14 classrooms in Building A complete.' });
  DataService.createRecord('project_tasks', { phase_id: p2phase3.id, project_id: proj2.id, title: 'Install displays in Building B', assigned_to: james.id, due_date: daysFromNow(10), status: 'in_progress', notes: '6 of 16 classrooms complete.' });
  DataService.createRecord('project_tasks', { phase_id: p2phase3.id, project_id: proj2.id, title: 'Network infrastructure upgrade', assigned_to: '', due_date: daysFromNow(14), status: 'in_progress', notes: 'IT contractor handling WiFi access point upgrades.' });
  DataService.createRecord('project_tasks', { phase_id: p2phase3.id, project_id: proj2.id, title: 'Staff device distribution', assigned_to: james.id, due_date: daysFromNow(28), status: 'pending', notes: '' });

  // Phase 4 tasks (pending)
  DataService.createRecord('project_tasks', { phase_id: p2phase4.id, project_id: proj2.id, title: 'Develop training modules', assigned_to: aisha.id, due_date: daysFromNow(35), status: 'pending', notes: '' });
  DataService.createRecord('project_tasks', { phase_id: p2phase4.id, project_id: proj2.id, title: 'Run teacher training workshops', assigned_to: aisha.id, due_date: daysFromNow(49), status: 'pending', notes: '' });
  DataService.createRecord('project_tasks', { phase_id: p2phase4.id, project_id: proj2.id, title: 'Set up help desk process', assigned_to: james.id, due_date: daysFromNow(56), status: 'pending', notes: '' });

  // ═══════════════════════════════════════
  // Project 3: CIS Accreditation Preparation
  // ═══════════════════════════════════════
  var proj3 = DataService.createRecord('projects', {
    title: 'CIS Accreditation Preparation',
    description: 'Prepare for Council of International Schools accreditation visit including self-study, evidence collection, and report writing.',
    owner_id: aisha.id,
    status: 'planning',
    start_date: daysFromNow(30),
    target_end_date: daysFromNow(300),
    actual_end_date: ''
  });

  var p3phase1 = DataService.createRecord('project_phases', {
    project_id: proj3.id, title: 'Self-Study Planning', description: 'Form committee, assign domain leaders, establish evidence collection protocols.',
    phase_order: 1, start_date: daysFromNow(30), end_date: daysFromNow(90), status: 'not_started', depends_on_phase_id: ''
  });
  var p3phase2 = DataService.createRecord('project_phases', {
    project_id: proj3.id, title: 'Evidence Collection', description: 'Systematic gathering and organizing of evidence across all CIS domains.',
    phase_order: 2, start_date: daysFromNow(90), end_date: daysFromNow(210), status: 'not_started', depends_on_phase_id: p3phase1.id
  });
  var p3phase3 = DataService.createRecord('project_phases', {
    project_id: proj3.id, title: 'Self-Study Report Writing', description: 'Draft, review, and finalize the self-study report for CIS submission.',
    phase_order: 3, start_date: daysFromNow(210), end_date: daysFromNow(300), status: 'not_started', depends_on_phase_id: p3phase2.id
  });

  // Phase 1 tasks
  DataService.createRecord('project_tasks', { phase_id: p3phase1.id, project_id: proj3.id, title: 'Form accreditation steering committee', assigned_to: sarah.id, due_date: daysFromNow(42), status: 'pending', notes: '' });
  DataService.createRecord('project_tasks', { phase_id: p3phase1.id, project_id: proj3.id, title: 'Assign CIS domain leaders', assigned_to: aisha.id, due_date: daysFromNow(49), status: 'pending', notes: '' });
  DataService.createRecord('project_tasks', { phase_id: p3phase1.id, project_id: proj3.id, title: 'Establish evidence collection protocol', assigned_to: aisha.id, due_date: daysFromNow(70), status: 'pending', notes: '' });
  DataService.createRecord('project_tasks', { phase_id: p3phase1.id, project_id: proj3.id, title: 'Create shared drive folder structure', assigned_to: james.id, due_date: daysFromNow(56), status: 'pending', notes: '' });

  // Phase 2 tasks
  DataService.createRecord('project_tasks', { phase_id: p3phase2.id, project_id: proj3.id, title: 'Domain A: Purpose and Direction evidence', assigned_to: sarah.id, due_date: daysFromNow(150), status: 'pending', notes: '' });
  DataService.createRecord('project_tasks', { phase_id: p3phase2.id, project_id: proj3.id, title: 'Domain B: Governance and Leadership evidence', assigned_to: james.id, due_date: daysFromNow(150), status: 'pending', notes: '' });
  DataService.createRecord('project_tasks', { phase_id: p3phase2.id, project_id: proj3.id, title: 'Domain C: Teaching and Learning evidence', assigned_to: aisha.id, due_date: daysFromNow(180), status: 'pending', notes: '' });
  DataService.createRecord('project_tasks', { phase_id: p3phase2.id, project_id: proj3.id, title: 'Cross-reference evidence with CIS standards', assigned_to: aisha.id, due_date: daysFromNow(200), status: 'pending', notes: '' });

  // Phase 3 tasks
  DataService.createRecord('project_tasks', { phase_id: p3phase3.id, project_id: proj3.id, title: 'Draft domain narratives', assigned_to: aisha.id, due_date: daysFromNow(250), status: 'pending', notes: '' });
  DataService.createRecord('project_tasks', { phase_id: p3phase3.id, project_id: proj3.id, title: 'Compile supporting documents', assigned_to: karen.id, due_date: daysFromNow(265), status: 'pending', notes: '' });
  DataService.createRecord('project_tasks', { phase_id: p3phase3.id, project_id: proj3.id, title: 'Internal review and editing', assigned_to: sarah.id, due_date: daysFromNow(280), status: 'pending', notes: '' });
  DataService.createRecord('project_tasks', { phase_id: p3phase3.id, project_id: proj3.id, title: 'Final submission preparation', assigned_to: aisha.id, due_date: daysFromNow(295), status: 'pending', notes: '' });

  Logger.log('Seeded Projects: 3 projects, 11 phases, 35 tasks.');
}

/**
 * Seeds project enhancement data: risks, activity log entries, and task comments.
 * Depends on seedProjectData() having run first.
 */
function seedProjectEnhancementsData() {
  var existingRisks = DataService.getRecords('project_risks');
  if (existingRisks.length > 0) {
    Logger.log('Project enhancements already seeded (' + existingRisks.length + ' risks). Skipping.');
    return;
  }

  var projects = DataService.getRecords('projects');
  if (projects.length === 0) {
    Logger.log('Need project data first. Run seedProjectData().');
    return;
  }

  var allStaff = DataService.getRecords('staff');
  var staffByEmail = {};
  allStaff.forEach(function(s) { staffByEmail[s.email] = s; });

  var sarah = staffByEmail['principal@school.edu'];
  var james = staffByEmail['vice.principal@school.edu'];
  var aisha = staffByEmail['curriculum@school.edu'];
  var jin = staffByEmail['j.kim@school.edu'];
  var lisa = staffByEmail['l.johnson@school.edu'];
  var michael = staffByEmail['m.thompson@school.edu'];

  // Find projects by title
  var proj1 = projects.filter(function(p) { return p.title.indexOf('Curriculum') !== -1; })[0];
  var proj2 = projects.filter(function(p) { return p.title.indexOf('Technology') !== -1; })[0];

  if (!proj1 || !proj2) {
    Logger.log('Could not find expected projects. Skipping enhancement seed.');
    return;
  }

  var now = new Date();
  function daysAgoISO(n) {
    var d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }
  function daysAgoDate(n) {
    var d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }

  // ═══════════════════════════════════════
  // Risks — 4 per project
  // ═══════════════════════════════════════

  DataService.createRecord('project_risks', {
    project_id: proj1.id, title: 'Staff resistance to MYP framework changes',
    description: 'Some experienced teachers may resist adopting new MYP-aligned unit planners and assessment criteria.',
    category: 'stakeholder', likelihood: 3, impact: 4, risk_score: 12,
    mitigation_strategy: 'Schedule 1-on-1 meetings with resistant staff. Provide exemplar units showing benefits. Include teacher voice in design process.',
    owner_id: aisha.id, status: 'mitigating', identified_date: daysAgoDate(60)
  });
  DataService.createRecord('project_risks', {
    project_id: proj1.id, title: 'Insufficient time for curriculum writing',
    description: 'Teachers may not have enough release time to rewrite unit plans alongside regular teaching duties.',
    category: 'schedule', likelihood: 4, impact: 3, risk_score: 12,
    mitigation_strategy: 'Request substitute teacher budget for release days. Offer summer writing workshop with stipend.',
    owner_id: sarah.id, status: 'identified', identified_date: daysAgoDate(45)
  });
  DataService.createRecord('project_risks', {
    project_id: proj1.id, title: 'External IB consultant availability',
    description: 'Preferred IB workshop leader may not be available during our scheduled PD windows.',
    category: 'external', likelihood: 2, impact: 4, risk_score: 8,
    mitigation_strategy: 'Identify 2 backup consultants. Consider virtual workshop options.',
    owner_id: aisha.id, status: 'accepted', identified_date: daysAgoDate(50)
  });
  DataService.createRecord('project_risks', {
    project_id: proj1.id, title: 'Misalignment between departments',
    description: 'Different departments may interpret MYP requirements inconsistently, leading to fragmented implementation.',
    category: 'technical', likelihood: 3, impact: 3, risk_score: 9,
    mitigation_strategy: 'Create cross-departmental working groups. Establish shared rubric calibration sessions.',
    owner_id: aisha.id, status: 'mitigating', identified_date: daysAgoDate(30)
  });

  DataService.createRecord('project_risks', {
    project_id: proj2.id, title: 'Vendor delivery delays for displays',
    description: 'Interactive display manufacturer has reported supply chain issues affecting delivery timelines.',
    category: 'external', likelihood: 3, impact: 4, risk_score: 12,
    mitigation_strategy: 'Order 10% buffer stock. Identify alternative vendor for emergency procurement.',
    owner_id: james.id, status: 'mitigating', identified_date: daysAgoDate(40)
  });
  DataService.createRecord('project_risks', {
    project_id: proj2.id, title: 'Network infrastructure incompatibility',
    description: 'Existing network switches may not support bandwidth requirements for 42 simultaneous display connections.',
    category: 'technical', likelihood: 2, impact: 5, risk_score: 10,
    mitigation_strategy: 'Conduct bandwidth stress test before full rollout. Budget for switch upgrades if needed.',
    owner_id: james.id, status: 'identified', identified_date: daysAgoDate(35)
  });
  DataService.createRecord('project_risks', {
    project_id: proj2.id, title: 'Budget overrun from unforeseen costs',
    description: 'Electrical upgrades, cabling, or mounting hardware may exceed initial estimates.',
    category: 'resource', likelihood: 3, impact: 3, risk_score: 9,
    mitigation_strategy: 'Include 15% contingency in budget. Prioritize buildings with existing infrastructure.',
    owner_id: sarah.id, status: 'identified', identified_date: daysAgoDate(30)
  });
  DataService.createRecord('project_risks', {
    project_id: proj2.id, title: 'Low teacher adoption without training',
    description: 'Teachers may default to using new displays as simple projectors without leveraging interactive features.',
    category: 'stakeholder', likelihood: 4, impact: 3, risk_score: 12,
    mitigation_strategy: 'Mandatory 2-hour training per teacher. Create quick-start guides. Identify early adopter champions per department.',
    owner_id: aisha.id, status: 'identified', identified_date: daysAgoDate(20)
  });

  // ═══════════════════════════════════════
  // Activity entries
  // ═══════════════════════════════════════

  // Get tasks for activity logging
  var allTasks = DataService.getRecords('project_tasks');
  var proj1Tasks = allTasks.filter(function(t) { return t.project_id === proj1.id; });
  var proj2Tasks = allTasks.filter(function(t) { return t.project_id === proj2.id; });

  // Proj1: task creation events for completed tasks
  proj1Tasks.forEach(function(t, idx) {
    if (t.status === 'completed' || idx < 6) {
      DataService.createRecord('project_activity', {
        task_id: t.id, project_id: proj1.id,
        user_id: aisha.id, action_type: 'task_created',
        field_name: 'task', old_value: '', new_value: t.title,
        created_at: daysAgoISO(80 - idx * 3)
      });
    }
  });

  // Proj1: status changes for completed tasks
  proj1Tasks.filter(function(t) { return t.status === 'completed'; }).forEach(function(t, idx) {
    DataService.createRecord('project_activity', {
      task_id: t.id, project_id: proj1.id,
      user_id: aisha.id, action_type: 'task_status_changed',
      field_name: 'status', old_value: 'pending', new_value: 'completed',
      created_at: daysAgoISO(50 - idx * 5)
    });
  });

  // Proj1: phase status change
  DataService.createRecord('project_activity', {
    task_id: '', project_id: proj1.id,
    user_id: sarah.id, action_type: 'phase_status_changed',
    field_name: 'status', old_value: 'in_progress', new_value: 'completed',
    created_at: daysAgoISO(42)
  });

  // Proj2: similar activity pattern
  proj2Tasks.forEach(function(t, idx) {
    if (t.status === 'completed' || idx < 5) {
      DataService.createRecord('project_activity', {
        task_id: t.id, project_id: proj2.id,
        user_id: james.id, action_type: 'task_created',
        field_name: 'task', old_value: '', new_value: t.title,
        created_at: daysAgoISO(55 - idx * 3)
      });
    }
  });

  proj2Tasks.filter(function(t) { return t.status === 'completed'; }).forEach(function(t, idx) {
    DataService.createRecord('project_activity', {
      task_id: t.id, project_id: proj2.id,
      user_id: james.id, action_type: 'task_status_changed',
      field_name: 'status', old_value: 'pending', new_value: 'completed',
      created_at: daysAgoISO(20 - idx * 3)
    });
  });

  // Proj2: phase completions
  DataService.createRecord('project_activity', {
    task_id: '', project_id: proj2.id,
    user_id: james.id, action_type: 'phase_status_changed',
    field_name: 'status', old_value: 'in_progress', new_value: 'completed',
    created_at: daysAgoISO(35)
  });
  DataService.createRecord('project_activity', {
    task_id: '', project_id: proj2.id,
    user_id: james.id, action_type: 'phase_status_changed',
    field_name: 'status', old_value: 'in_progress', new_value: 'completed',
    created_at: daysAgoISO(14)
  });

  // ═══════════════════════════════════════
  // Comments on tasks
  // ═══════════════════════════════════════

  // Comments on Proj1 tasks
  if (proj1Tasks.length >= 4) {
    DataService.createRecord('project_comments', {
      task_id: proj1Tasks[0].id, project_id: proj1.id,
      author_id: aisha.id, content: 'All subject guides now reviewed. The biggest gaps are in Arts and Design.',
      created_at: daysAgoISO(55)
    });
    DataService.createRecord('project_comments', {
      task_id: proj1Tasks[0].id, project_id: proj1.id,
      author_id: sarah.id, content: 'Good work. Let us schedule a meeting with the Arts department head to discuss priorities.',
      created_at: daysAgoISO(54)
    });
    DataService.createRecord('project_comments', {
      task_id: proj1Tasks[3].id, project_id: proj1.id,
      author_id: lisa.id, content: 'Math vertical alignment map is complete. Working on Science now with Jin.',
      created_at: daysAgoISO(10)
    });
  }

  // Comments on Proj2 tasks
  if (proj2Tasks.length >= 7) {
    DataService.createRecord('project_comments', {
      task_id: proj2Tasks[5].id, project_id: proj2.id,
      author_id: james.id, content: 'Building A installation is ahead of schedule. All 14 classrooms done.',
      created_at: daysAgoISO(5)
    });
    DataService.createRecord('project_comments', {
      task_id: proj2Tasks[6].id, project_id: proj2.id,
      author_id: james.id, content: 'Building B is taking longer due to older wiring. May need electrician for 4 rooms.',
      created_at: daysAgoISO(3)
    });
    DataService.createRecord('project_comments', {
      task_id: proj2Tasks[6].id, project_id: proj2.id,
      author_id: sarah.id, content: 'Approved the additional electrician budget. Please proceed.',
      created_at: daysAgoISO(2)
    });
  }

  var riskCount = DataService.getRecords('project_risks').length;
  var actCount = DataService.getRecords('project_activity').length;
  var commentCount = DataService.getRecords('project_comments').length;
  Logger.log('Seeded Project Enhancements: ' + riskCount + ' risks, ' + actCount + ' activity entries, ' + commentCount + ' comments.');
}

/**
 * Seeds change management data: 3 initiatives, 4 assessments, 21 Lippitt phases, 12 stakeholders.
 */
function seedChangeMgmtData() {
  var existing = DataService.getRecords('initiatives');
  if (existing.length > 0) {
    Logger.log('Change Mgmt already seeded (' + existing.length + ' records). Skipping.');
    return;
  }

  // Resolve staff IDs
  var allStaff = DataService.getRecords('staff');
  var staffByEmail = {};
  allStaff.forEach(function(s) { staffByEmail[s.email] = s; });

  var sarah   = staffByEmail['principal@school.edu'];
  var james   = staffByEmail['vice.principal@school.edu'];
  var aisha   = staffByEmail['curriculum@school.edu'];
  var jin     = staffByEmail['j.kim@school.edu'];
  var lisa    = staffByEmail['l.johnson@school.edu'];
  var michael = staffByEmail['m.thompson@school.edu'];
  var david   = staffByEmail['d.weber@school.edu'];
  var sophie  = staffByEmail['s.nguyen@school.edu'];
  var emi     = staffByEmail['e.sato@school.edu'];
  var karen   = staffByEmail['k.brown@school.edu'];
  var alex    = staffByEmail['a.lee@school.edu'];

  var today = new Date();
  function daysAgo(n) {
    var d = new Date(today); d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }
  function daysFromNow(n) {
    var d = new Date(today); d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  }
  function isoAgo(n) {
    var d = new Date(today); d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  var LIPPITT_NAMES = ['Diagnose', 'Assess Motivation', 'Assess Resources', 'Select Objectives', 'Choose Role', 'Maintain', 'Terminate'];

  // ═══════════════════════════════════════
  // Initiative 1: Standards-Based Grading (active, progressing well)
  // ═══════════════════════════════════════
  var init1 = DataService.createRecord('initiatives', {
    title: 'Implementing Standards-Based Grading',
    description: 'Transition from traditional percentage-based grading to a standards-based system aligned with MYP assessment criteria across all departments.',
    champion_id: aisha.id,
    status: 'active',
    start_date: daysAgo(60),
    target_date: daysFromNow(120)
  });

  // Assessments for init1 (2 — showing improvement)
  DataService.createRecord('knoster_assessments', {
    initiative_id: init1.id, assessed_by: aisha.id, assessed_at: isoAgo(55),
    vision_score: '5', vision_notes: 'Clear vision presented at staff meeting. Buy-in from leadership.',
    skills_score: '3', skills_notes: 'Teachers need PD on rubric design and standards alignment.',
    incentives_score: '4', incentives_notes: 'Reduced workload once system is in place. Student clarity improves.',
    resources_score: '4', resources_notes: 'ManageBac supports SBG. Budget allocated for PD.',
    action_plan_score: '4', action_plan_notes: 'Phased rollout plan drafted. Timeline realistic.',
    consensus_score: '3', consensus_notes: 'Some departments hesitant. Math and Science on board, English cautious.',
    predicted_risk: '', overall_readiness: '3.8'
  });

  DataService.createRecord('knoster_assessments', {
    initiative_id: init1.id, assessed_by: aisha.id, assessed_at: isoAgo(14),
    vision_score: '5', vision_notes: 'Vision reinforced through parent information evenings.',
    skills_score: '4', skills_notes: 'Two PD workshops completed. Teachers more confident.',
    incentives_score: '4', incentives_notes: 'Early adopters reporting positive student outcomes.',
    resources_score: '4', resources_notes: 'All resources in place. Template library shared.',
    action_plan_score: '5', action_plan_notes: 'Action plan updated with detailed department timelines.',
    consensus_score: '4', consensus_notes: 'English department now on board after pilot results shared.',
    predicted_risk: '', overall_readiness: '4.3'
  });

  // Lippitt phases for init1 (phases 1-3 completed, 4 in_progress)
  for (var i = 0; i < 7; i++) {
    var status1 = 'not_started';
    var entry1 = '';
    var comp1 = '';
    var actions1 = '';
    var evidence1 = '';
    var blockers1 = '';
    var updBy1 = '';

    if (i === 0) {
      status1 = 'completed'; entry1 = daysAgo(58); comp1 = daysAgo(45);
      actions1 = 'Surveyed all department heads on current grading practices. Analyzed student grade distributions. Reviewed research on SBG effectiveness.';
      evidence1 = 'Survey results compiled in shared drive. Research summary document.';
      updBy1 = aisha.id;
    } else if (i === 1) {
      status1 = 'completed'; entry1 = daysAgo(44); comp1 = daysAgo(30);
      actions1 = 'Held focus groups with teachers from each department. Presented SBG benefits at staff meeting. Addressed concerns about workload.';
      evidence1 = 'Focus group transcripts. Staff meeting slides and attendance.';
      updBy1 = aisha.id;
    } else if (i === 2) {
      status1 = 'completed'; entry1 = daysAgo(29); comp1 = daysAgo(16);
      actions1 = 'Audited current gradebook systems for SBG compatibility. Confirmed ManageBac supports criteria-based assessment. Secured PD budget.';
      evidence1 = 'Resource audit document. Budget approval form.';
      updBy1 = aisha.id;
    } else if (i === 3) {
      status1 = 'in_progress'; entry1 = daysAgo(15);
      actions1 = 'Drafting SMART objectives for each department. Defining assessment criteria standards.';
      blockers1 = 'Math department needs additional time for alignment with IB criteria.';
      updBy1 = aisha.id;
    }

    DataService.createRecord('lippitt_phases', {
      initiative_id: init1.id, phase_number: i + 1, phase_name: LIPPITT_NAMES[i],
      status: status1, entry_date: entry1, completion_date: comp1,
      key_actions: actions1, evidence: evidence1, blockers: blockers1,
      updated_by: updBy1, updated_at: updBy1 ? isoAgo(i === 3 ? 2 : 16 + i * 10) : ''
    });
  }

  // Stakeholders for init1
  DataService.createRecord('initiative_stakeholders', { initiative_id: init1.id, staff_id: aisha.id, role: 'champion', engagement_level: 'supportive', notes: 'Driving the initiative across all departments.' });
  DataService.createRecord('initiative_stakeholders', { initiative_id: init1.id, staff_id: sarah.id, role: 'contributor', engagement_level: 'supportive', notes: 'Providing leadership backing and parent communication.' });
  DataService.createRecord('initiative_stakeholders', { initiative_id: init1.id, staff_id: lisa.id, role: 'contributor', engagement_level: 'supportive', notes: 'Leading pilot in Mathematics department.' });
  DataService.createRecord('initiative_stakeholders', { initiative_id: init1.id, staff_id: jin.id, role: 'affected', engagement_level: 'neutral', notes: 'Science department willing but wants more PD time.' });
  DataService.createRecord('initiative_stakeholders', { initiative_id: init1.id, staff_id: michael.id, role: 'affected', engagement_level: 'resistant', notes: 'Concerned about subjectivity in English assessment.' });

  // ═══════════════════════════════════════
  // Initiative 2: Blended Learning (stalled, struggling)
  // ═══════════════════════════════════════
  var init2 = DataService.createRecord('initiatives', {
    title: 'Transitioning to Blended Learning Model',
    description: 'Shift instruction to a blended learning approach combining in-person teaching with online components using the LMS platform.',
    champion_id: james.id,
    status: 'stalled',
    start_date: daysAgo(90),
    target_date: daysFromNow(60)
  });

  // Assessment for init2 (1 — showing gaps)
  DataService.createRecord('knoster_assessments', {
    initiative_id: init2.id, assessed_by: james.id, assessed_at: isoAgo(80),
    vision_score: '4', vision_notes: 'Clear vision documented but not widely communicated to staff.',
    skills_score: '2', skills_notes: 'Most teachers lack experience with LMS tools. Limited tech skills.',
    incentives_score: '2', incentives_notes: 'Teachers see this as extra work. No clear benefit communicated.',
    resources_score: '3', resources_notes: 'LMS platform available but training materials incomplete.',
    action_plan_score: '3', action_plan_notes: 'Basic plan exists but lacks department-specific milestones.',
    consensus_score: '2', consensus_notes: 'Significant pushback from veteran teachers. No buy-in process.',
    predicted_risk: 'Anxiety, Resistance, Sabotage', overall_readiness: '2.7'
  });

  // Lippitt phases for init2 (phase 1 completed, phase 2 stuck)
  for (var j = 0; j < 7; j++) {
    var status2 = 'not_started';
    var entry2 = '';
    var comp2 = '';
    var actions2 = '';
    var evidence2 = '';
    var blockers2 = '';
    var updBy2 = '';

    if (j === 0) {
      status2 = 'completed'; entry2 = daysAgo(85); comp2 = daysAgo(70);
      actions2 = 'Assessed current technology usage across departments. Identified baseline digital literacy levels.';
      evidence2 = 'Technology usage survey results.';
      updBy2 = james.id;
    } else if (j === 1) {
      status2 = 'in_progress'; entry2 = daysAgo(69);
      actions2 = 'Attempting to build motivation through demo sessions. Limited attendance so far.';
      blockers2 = 'Low teacher engagement. Veteran staff resistant to change. No dedicated PD time allocated.';
      updBy2 = james.id;
    }

    DataService.createRecord('lippitt_phases', {
      initiative_id: init2.id, phase_number: j + 1, phase_name: LIPPITT_NAMES[j],
      status: status2, entry_date: entry2, completion_date: comp2,
      key_actions: actions2, evidence: evidence2, blockers: blockers2,
      updated_by: updBy2, updated_at: updBy2 ? isoAgo(j === 1 ? 5 : 70) : ''
    });
  }

  // Stakeholders for init2
  DataService.createRecord('initiative_stakeholders', { initiative_id: init2.id, staff_id: james.id, role: 'champion', engagement_level: 'supportive', notes: 'VP leading the technology initiative.' });
  DataService.createRecord('initiative_stakeholders', { initiative_id: init2.id, staff_id: david.id, role: 'contributor', engagement_level: 'neutral', notes: 'Willing to help but uncertain about effectiveness.' });
  DataService.createRecord('initiative_stakeholders', { initiative_id: init2.id, staff_id: sophie.id, role: 'affected', engagement_level: 'resistant', notes: 'Part-time teacher. Feels this adds unreasonable workload.' });
  DataService.createRecord('initiative_stakeholders', { initiative_id: init2.id, staff_id: emi.id, role: 'affected', engagement_level: 'neutral', notes: 'Open to trying but needs hands-on training.' });

  // ═══════════════════════════════════════
  // Initiative 3: Parent Communication Platform (proposed, early)
  // ═══════════════════════════════════════
  var init3 = DataService.createRecord('initiatives', {
    title: 'Parent Communication Platform Rollout',
    description: 'Implement a unified parent communication platform replacing multiple disconnected channels (email, newsletters, WhatsApp groups) with a single school app.',
    champion_id: sarah.id,
    status: 'proposed',
    start_date: daysFromNow(14),
    target_date: daysFromNow(180)
  });

  // Assessment for init3 (1 — early stage gaps)
  DataService.createRecord('knoster_assessments', {
    initiative_id: init3.id, assessed_by: sarah.id, assessed_at: isoAgo(3),
    vision_score: '4', vision_notes: 'Clear need identified. Parents and staff both requesting unified platform.',
    skills_score: '3', skills_notes: 'Admin staff comfortable with tech. Teacher training needed for app features.',
    incentives_score: '3', incentives_notes: 'Parents eager. Some teachers see benefit but worry about response expectations.',
    resources_score: '2', resources_notes: 'Budget not yet approved. Need to evaluate platform vendors.',
    action_plan_score: '2', action_plan_notes: 'Initial concept only. No detailed timeline or rollout plan yet.',
    consensus_score: '3', consensus_notes: 'General support but no formal consultation with all stakeholders.',
    predicted_risk: 'Frustration, False Starts', overall_readiness: '2.8'
  });

  // Lippitt phases for init3 (all not_started)
  for (var k = 0; k < 7; k++) {
    DataService.createRecord('lippitt_phases', {
      initiative_id: init3.id, phase_number: k + 1, phase_name: LIPPITT_NAMES[k],
      status: 'not_started', entry_date: '', completion_date: '',
      key_actions: '', evidence: '', blockers: '',
      updated_by: '', updated_at: ''
    });
  }

  // Stakeholders for init3
  DataService.createRecord('initiative_stakeholders', { initiative_id: init3.id, staff_id: sarah.id, role: 'champion', engagement_level: 'supportive', notes: 'Principal driving parent engagement improvement.' });
  DataService.createRecord('initiative_stakeholders', { initiative_id: init3.id, staff_id: karen.id, role: 'contributor', engagement_level: 'supportive', notes: 'Elementary lead. Strong parent relationships.' });
  DataService.createRecord('initiative_stakeholders', { initiative_id: init3.id, staff_id: alex.id, role: 'informed', engagement_level: 'supportive', notes: 'Learning support. Interested in parent communication for IEP updates.' });

  Logger.log('Seeded Change Mgmt: 3 initiatives, 4 assessments, 21 Lippitt phases, 12 stakeholders.');
}

// ═══════════════════════════════════════════════
// CM Communications Seed Data
// ═══════════════════════════════════════════════

function seedCommunicationsData() {
  var existing = DataService.getRecords('cm_communications');
  if (existing.length > 0) {
    Logger.log('Communications already seeded (' + existing.length + ' records). Skipping.');
    return;
  }

  // Lookup initiatives by title
  var initiatives = DataService.getRecords('initiatives');
  var initByTitle = {};
  initiatives.forEach(function(i) { initByTitle[i.title] = i; });

  var init1 = initByTitle['Implementing Standards-Based Grading'];
  var init2 = initByTitle['Transitioning to Blended Learning Model'];
  var init3 = initByTitle['Parent Communication Platform Rollout'];

  if (!init1 || !init2 || !init3) {
    Logger.log('Initiatives not found. Run seedChangeMgmtData() first.');
    return;
  }

  // Resolve staff for sent_by
  var allStaff = DataService.getRecords('staff');
  var staffByEmail = {};
  allStaff.forEach(function(s) { staffByEmail[s.email] = s; });

  var aisha   = staffByEmail['curriculum@school.edu'];
  var james   = staffByEmail['vice.principal@school.edu'];
  var sarah   = staffByEmail['principal@school.edu'];
  var michael = staffByEmail['m.thompson@school.edu'];

  var today = new Date();
  function daysAgo(n) {
    var d = new Date(today); d.setDate(d.getDate() - n);
    return d.toISOString();
  }
  function daysFromNow(n) {
    var d = new Date(today); d.setDate(d.getDate() + n);
    return d.toISOString();
  }

  // Find Michael's stakeholder record for targeted communication
  var stakeholders = DataService.getRecords('initiative_stakeholders');
  var michaelStakeholder = null;
  for (var si = 0; si < stakeholders.length; si++) {
    if (stakeholders[si].initiative_id === init1.id && stakeholders[si].staff_id === michael.id) {
      michaelStakeholder = stakeholders[si];
      break;
    }
  }

  // ── Initiative 1: SBG (active) — 6 communications ──

  DataService.createRecord('cm_communications', {
    initiative_id: init1.id, stakeholder_id: '', audience_description: 'All teaching staff',
    message_type: 'announcement', channel: 'email', subject: 'Launching Standards-Based Grading',
    content: 'Dear colleagues, We are excited to announce the launch of our Standards-Based Grading initiative. This initiative aims to transition our assessment practices to a standards-based system aligned with MYP criteria. More details will follow in upcoming professional development sessions.',
    scheduled_date: daysAgo(50), sent_date: daysAgo(50), sent_by: aisha.id,
    status: 'sent', notes: 'Initial launch announcement sent to all staff.'
  });

  DataService.createRecord('cm_communications', {
    initiative_id: init1.id, stakeholder_id: '', audience_description: 'All teaching staff',
    message_type: 'update', channel: 'newsletter', subject: 'SBG Phase 1 Complete — Survey Results',
    content: 'The diagnostic phase of our Standards-Based Grading initiative is now complete. Survey results show 72% of staff are open to the change, with concerns primarily around workload and grading consistency. We will address these in upcoming PD sessions.',
    scheduled_date: daysAgo(30), sent_date: daysAgo(30), sent_by: aisha.id,
    status: 'sent', notes: 'Shared via monthly staff newsletter.'
  });

  DataService.createRecord('cm_communications', {
    initiative_id: init1.id, stakeholder_id: michaelStakeholder ? michaelStakeholder.id : '',
    audience_description: 'Michael Thompson (English Dept)',
    message_type: 'feedback_request', channel: 'email', subject: 'Your Input on English Assessment Rubrics',
    content: 'Hi Michael, As we develop the SBG rubrics for English, we value your perspective on how standards-based assessment might work with literary analysis and creative writing. Could we schedule 20 minutes to discuss your concerns and ideas?',
    scheduled_date: daysAgo(20), sent_date: daysAgo(20), sent_by: aisha.id,
    status: 'sent', notes: 'Targeted outreach to address resistance. Michael responded and meeting scheduled.'
  });

  DataService.createRecord('cm_communications', {
    initiative_id: init1.id, stakeholder_id: '', audience_description: 'Leadership team',
    message_type: 'milestone', channel: 'presentation', subject: 'SBG Pilot Results: Positive Student Outcomes',
    content: 'Presenting pilot results from the Math department showing improved student self-assessment accuracy and clearer learning targets. Data shows 15% improvement in student ability to articulate their learning goals.',
    scheduled_date: daysAgo(14), sent_date: daysAgo(14), sent_by: aisha.id,
    status: 'sent', notes: 'Presented at leadership meeting. Positive reception.'
  });

  DataService.createRecord('cm_communications', {
    initiative_id: init1.id, stakeholder_id: '', audience_description: 'All teaching staff',
    message_type: 'announcement', channel: 'all_staff', subject: 'Standards-Based Grading: Next Steps and PD Schedule',
    content: 'Dear colleagues, Building on our successful Math pilot, we are expanding SBG to Science and Humanities next term. PD sessions will be held on the following dates...',
    scheduled_date: daysFromNow(14), sent_date: '', sent_by: '',
    status: 'planned', notes: 'Scheduled for next all-staff meeting.'
  });

  DataService.createRecord('cm_communications', {
    initiative_id: init1.id, stakeholder_id: '', audience_description: 'Department heads',
    message_type: 'update', channel: 'meeting', subject: 'SBG Mid-Implementation Check-in',
    content: 'Mid-implementation review meeting with department heads to assess progress, gather feedback on rubric development, and plan for the expanded rollout.',
    scheduled_date: daysFromNow(30), sent_date: '', sent_by: '',
    status: 'planned', notes: 'Calendar invite to be sent 1 week prior.'
  });

  // ── Initiative 2: Blended Learning (stalled) — 4 communications ──

  DataService.createRecord('cm_communications', {
    initiative_id: init2.id, stakeholder_id: '', audience_description: 'All teaching staff',
    message_type: 'announcement', channel: 'email', subject: 'Blended Learning Vision and Roadmap',
    content: 'We are exploring a transition to blended learning across the school. This initiative will combine face-to-face instruction with digital learning tools to enhance student engagement and personalised learning pathways.',
    scheduled_date: daysAgo(80), sent_date: daysAgo(80), sent_by: james.id,
    status: 'sent', notes: 'Initial announcement. Low response rate.'
  });

  DataService.createRecord('cm_communications', {
    initiative_id: init2.id, stakeholder_id: '', audience_description: 'Interested teachers',
    message_type: 'update', channel: 'email', subject: 'Blended Learning Demo Sessions Schedule',
    content: 'We have arranged demo sessions with three technology vendors. Please sign up for at least one session to learn about available tools and approaches.',
    scheduled_date: daysAgo(40), sent_date: daysAgo(40), sent_by: james.id,
    status: 'sent', notes: 'Only 8 of 35 teachers signed up.'
  });

  DataService.createRecord('cm_communications', {
    initiative_id: init2.id, stakeholder_id: '', audience_description: 'All teaching staff',
    message_type: 'feedback_request', channel: 'email', subject: 'Blended Learning Feedback Survey',
    content: 'We would like to understand your comfort level with digital tools and any concerns about the blended learning transition. Please complete this brief survey.',
    scheduled_date: daysAgo(10), sent_date: '', sent_by: '',
    status: 'cancelled', notes: 'Cancelled due to low engagement and initiative stalling. Need to address fundamental buy-in first.'
  });

  DataService.createRecord('cm_communications', {
    initiative_id: init2.id, stakeholder_id: '', audience_description: 'Leadership team',
    message_type: 'escalation', channel: 'meeting', subject: 'Blended Learning Initiative: Addressing the Stall',
    content: 'This initiative has stalled at the motivation assessment phase. We need leadership alignment on: (1) dedicated PD time allocation, (2) addressing veteran teacher resistance, (3) reconsidering the timeline and scope.',
    scheduled_date: daysFromNow(7), sent_date: '', sent_by: '',
    status: 'planned', notes: 'Escalation meeting requested by James. Critical for initiative survival.'
  });

  // ── Initiative 3: Parent Comms (proposed) — 2 communications ──

  DataService.createRecord('cm_communications', {
    initiative_id: init3.id, stakeholder_id: '', audience_description: 'All staff',
    message_type: 'announcement', channel: 'all_staff', subject: 'New Parent Communication Platform — Coming Soon',
    content: 'We are evaluating platforms to improve parent-school communication. The goal is a unified system for newsletters, progress updates, event coordination, and IEP communication. Your input on requirements will be sought soon.',
    scheduled_date: daysFromNow(20), sent_date: '', sent_by: '',
    status: 'planned', notes: 'Pending start date confirmation from Sarah.'
  });

  DataService.createRecord('cm_communications', {
    initiative_id: init3.id, stakeholder_id: '', audience_description: 'Teaching staff',
    message_type: 'feedback_request', channel: 'email', subject: 'Parent Communication: What Features Matter Most?',
    content: 'Before we select a platform vendor, we need your input on must-have features. Please complete the linked survey ranking communication features by importance for your role.',
    scheduled_date: daysFromNow(25), sent_date: '', sent_by: '',
    status: 'planned', notes: 'Survey to be created by Karen after initiative launch.'
  });

  Logger.log('Seeded CM Communications: 12 records across 3 initiatives.');
}

// ═══════════════════════════════════════════════
// Accreditation Seed Data
// ═══════════════════════════════════════════════

function seedAccreditationData() {
  var existing = DataService.getRecords('accreditation_frameworks');
  if (existing.length > 0) {
    Logger.log('Accreditation already seeded (' + existing.length + ' frameworks). Skipping.');
    return;
  }

  // Resolve staff IDs
  var allStaff = DataService.getRecords('staff');
  var staffByEmail = {};
  allStaff.forEach(function(s) { staffByEmail[s.email] = s; });

  var sarah   = staffByEmail['principal@school.edu'];
  var james   = staffByEmail['vice.principal@school.edu'];
  var aisha   = staffByEmail['curriculum@school.edu'];
  var jin     = staffByEmail['j.kim@school.edu'];
  var lisa    = staffByEmail['l.johnson@school.edu'];
  var michael = staffByEmail['m.thompson@school.edu'];
  var david   = staffByEmail['d.weber@school.edu'];
  var sophie  = staffByEmail['s.nguyen@school.edu'];
  var karen   = staffByEmail['k.brown@school.edu'];

  var today = new Date();
  function daysAgo(n) {
    var d = new Date(today); d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }
  function isoAgo(n) {
    var d = new Date(today); d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  // ═══════════════════════════════════════
  // Framework: CIS Preparatory Visit 2025
  // ═══════════════════════════════════════

  var fw = DataService.createRecord('accreditation_frameworks', {
    name: 'CIS Preparatory Visit 2025',
    description: 'Council of International Schools preparatory evaluation visit. Self-study in progress with visit scheduled for November 2025.',
    visit_date: '2025-11-15',
    status: 'self_study',
    created_at: isoAgo(120)
  });

  // ── Domain A: Governance & Leadership (3 standards) ──

  var a1 = DataService.createRecord('accreditation_standards', {
    framework_id: fw.id, domain: 'Governance & Leadership',
    standard_code: 'A.1', standard_text: 'The governing body demonstrates a commitment to the school\'s mission, vision, and strategic direction through documented policies and regular review.',
    position: '1'
  });

  var a2 = DataService.createRecord('accreditation_standards', {
    framework_id: fw.id, domain: 'Governance & Leadership',
    standard_code: 'A.2', standard_text: 'The school has a clear, documented organizational structure that delineates roles, responsibilities, and lines of communication.',
    position: '2'
  });

  var a3 = DataService.createRecord('accreditation_standards', {
    framework_id: fw.id, domain: 'Governance & Leadership',
    standard_code: 'A.3', standard_text: 'Financial resources are sufficient for the school\'s programs and are managed through transparent budgeting and regular auditing processes.',
    position: '3'
  });

  // ── Domain B: Teaching & Learning (4 standards) ──

  var b1 = DataService.createRecord('accreditation_standards', {
    framework_id: fw.id, domain: 'Teaching & Learning',
    standard_code: 'B.1', standard_text: 'The curriculum is documented, vertically and horizontally aligned, and regularly reviewed to ensure coherence and relevance across all grade levels.',
    position: '4'
  });

  var b2 = DataService.createRecord('accreditation_standards', {
    framework_id: fw.id, domain: 'Teaching & Learning',
    standard_code: 'B.2', standard_text: 'Assessment practices are varied, authentic, and used formatively and summatively to inform instruction and measure student learning.',
    position: '5'
  });

  var b3 = DataService.createRecord('accreditation_standards', {
    framework_id: fw.id, domain: 'Teaching & Learning',
    standard_code: 'B.3', standard_text: 'Differentiation strategies are systematically employed to meet diverse learner needs including ELL, special needs, and gifted students.',
    position: '6'
  });

  var b4 = DataService.createRecord('accreditation_standards', {
    framework_id: fw.id, domain: 'Teaching & Learning',
    standard_code: 'B.4', standard_text: 'Technology is meaningfully integrated into teaching and learning to enhance engagement, collaboration, and critical thinking skills.',
    position: '7'
  });

  // ── Domain C: Student Wellbeing (3 standards) ──

  var c1 = DataService.createRecord('accreditation_standards', {
    framework_id: fw.id, domain: 'Student Wellbeing',
    standard_code: 'C.1', standard_text: 'A comprehensive pastoral care system supports students\' social-emotional development through dedicated counseling and advisory programs.',
    position: '8'
  });

  var c2 = DataService.createRecord('accreditation_standards', {
    framework_id: fw.id, domain: 'Student Wellbeing',
    standard_code: 'C.2', standard_text: 'The school maintains a safe, inclusive, and respectful environment through documented policies, procedures, and regular safety reviews.',
    position: '9'
  });

  var c3 = DataService.createRecord('accreditation_standards', {
    framework_id: fw.id, domain: 'Student Wellbeing',
    standard_code: 'C.3', standard_text: 'Student voice is actively sought, valued, and incorporated into school decision-making through student government and feedback mechanisms.',
    position: '10'
  });

  // ── Domain D: Community & Culture (2 standards) ──

  var d1 = DataService.createRecord('accreditation_standards', {
    framework_id: fw.id, domain: 'Community & Culture',
    standard_code: 'D.1', standard_text: 'Parent engagement is actively cultivated through regular communication, involvement opportunities, and partnerships in student learning.',
    position: '11'
  });

  var d2 = DataService.createRecord('accreditation_standards', {
    framework_id: fw.id, domain: 'Community & Culture',
    standard_code: 'D.2', standard_text: 'The school promotes intercultural understanding and global citizenship through curriculum, programs, and community engagement.',
    position: '12'
  });

  // ═══════════════════════════════════════
  // Evidence — varied statuses
  // ═══════════════════════════════════════

  // A.1 — well-prepared (2 approved, 1 under review)
  DataService.createRecord('accreditation_evidence', {
    standard_id: a1.id, title: 'Board Meeting Minutes 2024-25',
    description: 'Complete set of board meeting minutes demonstrating regular strategic review and mission alignment discussions.',
    drive_file_id: 'abc123def456', drive_file_url: 'https://docs.google.com/document/d/abc123def456/edit',
    file_type: 'doc', uploaded_by: sarah.id, uploaded_at: isoAgo(60),
    status: 'approved', reviewer_id: james.id, review_notes: 'Comprehensive documentation of board oversight.'
  });
  DataService.createRecord('accreditation_evidence', {
    standard_id: a1.id, title: 'Strategic Plan 2023-2028',
    description: 'Five-year strategic plan approved by board with annual review process documented.',
    drive_file_id: 'ghi789jkl012', drive_file_url: 'https://docs.google.com/document/d/ghi789jkl012/edit',
    file_type: 'doc', uploaded_by: sarah.id, uploaded_at: isoAgo(55),
    status: 'approved', reviewer_id: james.id, review_notes: 'Well-structured plan with measurable KPIs.'
  });
  DataService.createRecord('accreditation_evidence', {
    standard_id: a1.id, title: 'Board Self-Evaluation Survey Results',
    description: 'Annual board self-evaluation results with action items for governance improvement.',
    drive_file_id: 'mno345pqr678', drive_file_url: 'https://docs.google.com/spreadsheets/d/mno345pqr678/edit',
    file_type: 'sheet', uploaded_by: james.id, uploaded_at: isoAgo(30),
    status: 'under_review', reviewer_id: sarah.id, review_notes: ''
  });

  // A.2 — mostly ready (1 approved, 1 draft)
  DataService.createRecord('accreditation_evidence', {
    standard_id: a2.id, title: 'Organizational Chart 2024-25',
    description: 'Current organizational chart showing reporting lines, committees, and communication pathways.',
    drive_file_id: 'stu901vwx234', drive_file_url: 'https://docs.google.com/document/d/stu901vwx234/edit',
    file_type: 'doc', uploaded_by: james.id, uploaded_at: isoAgo(45),
    status: 'approved', reviewer_id: sarah.id, review_notes: 'Clear and up-to-date.'
  });
  DataService.createRecord('accreditation_evidence', {
    standard_id: a2.id, title: 'Job Description Handbook',
    description: 'Compiled job descriptions for all leadership and teaching positions.',
    drive_file_id: 'yza567bcd890', drive_file_url: 'https://docs.google.com/document/d/yza567bcd890/edit',
    file_type: 'doc', uploaded_by: james.id, uploaded_at: isoAgo(20),
    status: 'draft', reviewer_id: '', review_notes: ''
  });

  // B.1 — well-prepared (2 approved)
  DataService.createRecord('accreditation_evidence', {
    standard_id: b1.id, title: 'Curriculum Maps K-12',
    description: 'Complete K-12 curriculum maps showing vertical and horizontal alignment across subjects.',
    drive_file_id: 'efg123hij456', drive_file_url: 'https://docs.google.com/spreadsheets/d/efg123hij456/edit',
    file_type: 'sheet', uploaded_by: aisha.id, uploaded_at: isoAgo(40),
    status: 'approved', reviewer_id: sarah.id, review_notes: 'Excellent cross-curricular alignment documented.'
  });
  DataService.createRecord('accreditation_evidence', {
    standard_id: b1.id, title: 'Curriculum Review Cycle Document',
    description: 'Three-year rolling curriculum review schedule with responsible department heads.',
    drive_file_id: 'klm789nop012', drive_file_url: 'https://docs.google.com/document/d/klm789nop012/edit',
    file_type: 'doc', uploaded_by: aisha.id, uploaded_at: isoAgo(35),
    status: 'approved', reviewer_id: james.id, review_notes: 'Review cycle is systematic and well-documented.'
  });

  // B.2 — partial (1 approved, 1 insufficient)
  DataService.createRecord('accreditation_evidence', {
    standard_id: b2.id, title: 'Assessment Policy Document',
    description: 'School-wide assessment policy outlining formative and summative practices.',
    drive_file_id: 'qrs345tuv678', drive_file_url: 'https://docs.google.com/document/d/qrs345tuv678/edit',
    file_type: 'doc', uploaded_by: aisha.id, uploaded_at: isoAgo(50),
    status: 'approved', reviewer_id: sarah.id, review_notes: 'Comprehensive policy document.'
  });
  DataService.createRecord('accreditation_evidence', {
    standard_id: b2.id, title: 'Sample Assessment Rubrics',
    description: 'Collection of assessment rubrics from various departments.',
    drive_file_id: 'wxy901zab234', drive_file_url: 'https://docs.google.com/document/d/wxy901zab234/edit',
    file_type: 'doc', uploaded_by: jin.id, uploaded_at: isoAgo(15),
    status: 'insufficient', reviewer_id: aisha.id, review_notes: 'Only 3 departments represented. Need rubrics from all departments to demonstrate consistency.'
  });

  // B.3 — draft evidence only
  DataService.createRecord('accreditation_evidence', {
    standard_id: b3.id, title: 'Differentiation Framework',
    description: 'School differentiation framework and implementation guidelines.',
    drive_file_id: 'cde567fgh890', drive_file_url: 'https://docs.google.com/document/d/cde567fgh890/edit',
    file_type: 'doc', uploaded_by: aisha.id, uploaded_at: isoAgo(10),
    status: 'draft', reviewer_id: '', review_notes: ''
  });

  // C.1 — one evidence item under review
  DataService.createRecord('accreditation_evidence', {
    standard_id: c1.id, title: 'Pastoral Care Program Overview',
    description: 'Description of advisory program, counseling services, and student support structures.',
    drive_file_id: 'ijk123lmn456', drive_file_url: 'https://docs.google.com/document/d/ijk123lmn456/edit',
    file_type: 'doc', uploaded_by: karen.id, uploaded_at: isoAgo(25),
    status: 'under_review', reviewer_id: james.id, review_notes: ''
  });

  // C.2 — one approved
  DataService.createRecord('accreditation_evidence', {
    standard_id: c2.id, title: 'Health & Safety Policy',
    description: 'School health and safety policies including emergency procedures and safeguarding.',
    drive_file_id: 'opq789rst012', drive_file_url: 'https://docs.google.com/document/d/opq789rst012/edit',
    file_type: 'pdf', uploaded_by: james.id, uploaded_at: isoAgo(65),
    status: 'approved', reviewer_id: sarah.id, review_notes: 'Meets all regulatory requirements.'
  });

  // C.3 — NO evidence (gap)
  // D.1 — one draft
  DataService.createRecord('accreditation_evidence', {
    standard_id: d1.id, title: 'Parent Survey Results 2024',
    description: 'Annual parent satisfaction survey results with trend analysis.',
    drive_file_id: 'uvw345xyz678', drive_file_url: 'https://docs.google.com/spreadsheets/d/uvw345xyz678/edit',
    file_type: 'sheet', uploaded_by: sophie.id, uploaded_at: isoAgo(8),
    status: 'draft', reviewer_id: '', review_notes: ''
  });

  // D.2 — NO evidence (gap)

  // ═══════════════════════════════════════
  // Narratives — version progression
  // ═══════════════════════════════════════

  // A.1 — 3 versions, latest is final
  DataService.createRecord('accreditation_narratives', {
    standard_id: a1.id,
    narrative_text: 'Initial draft of governance narrative. The board meets quarterly to review strategic objectives.',
    author_id: sarah.id, version: '1', status: 'draft',
    created_at: isoAgo(90), updated_at: isoAgo(90)
  });
  DataService.createRecord('accreditation_narratives', {
    standard_id: a1.id,
    narrative_text: 'The governing board demonstrates its commitment to the school\'s mission through quarterly strategic review meetings, annual self-evaluation, and a five-year strategic plan (2023-2028). Board minutes document consistent attention to mission alignment, with dedicated agenda items for strategic KPI review at each meeting. The board conducts annual self-evaluation using a structured framework, leading to targeted governance improvements. The current strategic plan includes measurable goals aligned to the school\'s vision of developing globally-minded learners.',
    author_id: sarah.id, version: '2', status: 'review',
    created_at: isoAgo(45), updated_at: isoAgo(30)
  });
  DataService.createRecord('accreditation_narratives', {
    standard_id: a1.id,
    narrative_text: 'The governing board demonstrates its commitment to the school\'s mission through quarterly strategic review meetings, annual self-evaluation, and a comprehensive five-year strategic plan (2023-2028). Board minutes document consistent attention to mission alignment, with dedicated agenda items for strategic KPI review at each meeting. The board conducts rigorous annual self-evaluation using a structured framework aligned to CIS governance indicators, leading to targeted improvements such as the creation of a Finance Sub-committee in 2024 and enhanced community engagement protocols. The current strategic plan includes measurable goals aligned to the school\'s vision of developing globally-minded learners, with annual progress reported to the school community through the Head\'s Report.',
    author_id: sarah.id, version: '3', status: 'final',
    created_at: isoAgo(15), updated_at: isoAgo(10)
  });

  // A.2 — 1 version, review status
  DataService.createRecord('accreditation_narratives', {
    standard_id: a2.id,
    narrative_text: 'The school maintains a detailed organizational chart updated annually, clearly delineating reporting lines from the board through senior leadership to departments. Each position has a documented job description outlining key responsibilities, qualifications, and performance expectations. Communication pathways are formalized through weekly leadership team meetings, monthly all-staff meetings, and a digital communication platform that ensures timely information flow.',
    author_id: james.id, version: '1', status: 'review',
    created_at: isoAgo(30), updated_at: isoAgo(20)
  });

  // B.1 — 2 versions, latest in review
  DataService.createRecord('accreditation_narratives', {
    standard_id: b1.id,
    narrative_text: 'Draft: The school uses UbD framework for curriculum documentation.',
    author_id: aisha.id, version: '1', status: 'draft',
    created_at: isoAgo(60), updated_at: isoAgo(60)
  });
  DataService.createRecord('accreditation_narratives', {
    standard_id: b1.id,
    narrative_text: 'The school\'s curriculum is documented using the Understanding by Design (UbD) framework, with comprehensive K-12 curriculum maps maintained in a shared digital platform accessible to all teachers. Vertical alignment is ensured through cross-divisional curriculum meetings held twice annually, while horizontal alignment is maintained through departmental collaboration within each division. A three-year rolling review cycle ensures all subjects are reviewed regularly, with curriculum coordinators facilitating data-informed revisions based on student achievement data and teacher feedback.',
    author_id: aisha.id, version: '2', status: 'review',
    created_at: isoAgo(25), updated_at: isoAgo(18)
  });

  // B.2 — 1 version, draft
  DataService.createRecord('accreditation_narratives', {
    standard_id: b2.id,
    narrative_text: 'Assessment practices at the school include a balance of formative and summative approaches. Teachers use a variety of assessment methods including performance tasks, portfolios, standardized tests, and rubric-based evaluations. The school assessment policy guides consistent practice across divisions, though implementation varies by department. Student achievement data is analyzed at department and division levels to inform instructional decisions.',
    author_id: aisha.id, version: '1', status: 'draft',
    created_at: isoAgo(12), updated_at: isoAgo(12)
  });

  // C.1 — 1 version, draft
  DataService.createRecord('accreditation_narratives', {
    standard_id: c1.id,
    narrative_text: 'The school\'s pastoral care system includes a dedicated advisory program in all divisions, two full-time school counselors, and a Student Support Team that meets weekly to discuss at-risk students. The advisory program provides a consistent point of contact for students and families, with structured SEL curriculum delivered through regular advisory periods.',
    author_id: karen.id, version: '1', status: 'draft',
    created_at: isoAgo(18), updated_at: isoAgo(18)
  });

  // C.2 — 1 version, review
  DataService.createRecord('accreditation_narratives', {
    standard_id: c2.id,
    narrative_text: 'The school maintains comprehensive health and safety policies reviewed annually by the Safety Committee. Safeguarding procedures follow international best practices, with all staff completing mandatory training. The anti-bullying policy includes prevention programs, clear reporting procedures, and restorative justice practices. Regular safety drills and campus security reviews ensure physical safety, while digital citizenship programs address online safety.',
    author_id: james.id, version: '1', status: 'review',
    created_at: isoAgo(22), updated_at: isoAgo(14)
  });

  // A.3, B.3, B.4, C.3, D.1, D.2 — NO narratives (gaps for visit readiness)

  Logger.log('Seeded Accreditation: 1 framework, 12 standards (4 domains), 15 evidence items, 10 narrative versions.');
}

// ═══════════════════════════════════════════════
// Meeting Minutes seed data
// ═══════════════════════════════════════════════

function seedMeetingMinutesData() {
  var existing = DataService.getRecords('meetings');
  if (existing.length > 0) {
    Logger.log('Meeting minutes already seeded (' + existing.length + ' meetings). Skipping.');
    return;
  }

  // Resolve staff IDs
  var allStaff = DataService.getRecords('staff');
  var staffByEmail = {};
  allStaff.forEach(function(s) { staffByEmail[s.email] = s; });

  var sarah   = staffByEmail['principal@school.edu'];
  var james   = staffByEmail['vice.principal@school.edu'];
  var aisha   = staffByEmail['curriculum@school.edu'];
  var jin     = staffByEmail['j.kim@school.edu'];
  var lisa    = staffByEmail['l.johnson@school.edu'];
  var michael = staffByEmail['m.thompson@school.edu'];
  var david   = staffByEmail['d.weber@school.edu'];
  var karen   = staffByEmail['k.brown@school.edu'];

  var today = new Date();
  function daysAgo(n) {
    var d = new Date(today); d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }
  function isoAgo(n) {
    var d = new Date(today); d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  // ── Meeting 1: Leadership Team — Finalized ──

  var m1 = DataService.createRecord('meetings', {
    title: 'Leadership Team — Q2 Strategic Priorities',
    meeting_type: 'leadership_team',
    meeting_date: daysAgo(14),
    start_time: '09:00',
    end_time: '11:00',
    location: 'Admin Conference Room B',
    organizer_id: sarah.id,
    attendees_csv: [sarah.id, james.id, aisha.id].join(','),
    status: 'finalized',
    agenda: '1. Review Q1 progress against strategic plan targets\n2. Enrollment projections for next academic year\n3. Curriculum alignment update (MYP)\n4. Facility improvement timeline\n5. Budget reallocation requests',
    notes: 'Q1 targets largely on track. Enrollment stable at 420 students with 12 new applications pending.\n\nCurriculum alignment progressing — Aisha reported 6 of 8 subject areas have completed MYP unit planners. Science and Humanities still in progress.\n\nFacility upgrades: new STEM lab completion pushed to end of Q3 due to supply chain delays. James to follow up with contractor.\n\nBudget: approved reallocation of $15K from travel to professional development for IB workshop attendance.',
    created_by: sarah.id,
    created_at: isoAgo(14),
    updated_at: isoAgo(13)
  });

  // Meeting 1 action items
  var m1a1 = DataService.createRecord('meeting_action_items', {
    meeting_id: m1.id,
    title: 'Follow up with STEM lab contractor on revised timeline',
    description: 'Contact BuildRight Construction for updated completion schedule. Need firm date for equipment installation.',
    assigned_to: james.id,
    due_date: daysAgo(7),
    status: 'completed',
    priority: 'high',
    linked_task_type: '',
    linked_task_id: '',
    position: '0',
    created_at: isoAgo(14),
    updated_at: isoAgo(8)
  });

  var m1a2 = DataService.createRecord('meeting_action_items', {
    meeting_id: m1.id,
    title: 'Complete MYP unit planners for Science and Humanities',
    description: 'Coordinate with Jin (Science) and David (Humanities) to finalize remaining unit planners by end of month.',
    assigned_to: aisha.id,
    due_date: daysAgo(-14),
    status: 'in_progress',
    priority: 'high',
    linked_task_type: '',
    linked_task_id: '',
    position: '1',
    created_at: isoAgo(14),
    updated_at: isoAgo(10)
  });

  // ── Meeting 2: Department Heads — Draft ──

  var m2 = DataService.createRecord('meetings', {
    title: 'Department Heads — Assessment Policy Review',
    meeting_type: 'department',
    meeting_date: daysAgo(5),
    start_time: '14:00',
    end_time: '15:30',
    location: 'Virtual — Google Meet',
    organizer_id: aisha.id,
    attendees_csv: [aisha.id, jin.id, lisa.id, michael.id, david.id].join(','),
    status: 'draft',
    agenda: '1. Review proposed changes to assessment policy\n2. Discuss standards-based grading pilot results\n3. Rubric standardization across departments\n4. Timeline for policy approval',
    notes: '',
    created_by: aisha.id,
    created_at: isoAgo(5),
    updated_at: isoAgo(5)
  });

  // Meeting 2 action items
  var m2a1 = DataService.createRecord('meeting_action_items', {
    meeting_id: m2.id,
    title: 'Compile standards-based grading pilot data from Math dept',
    description: 'Gather student achievement data and teacher feedback from the semester-long SBG pilot in Math.',
    assigned_to: lisa.id,
    due_date: daysAgo(-7),
    status: 'pending',
    priority: 'medium',
    linked_task_type: '',
    linked_task_id: '',
    position: '0',
    created_at: isoAgo(5),
    updated_at: isoAgo(5)
  });

  var m2a2 = DataService.createRecord('meeting_action_items', {
    meeting_id: m2.id,
    title: 'Draft updated assessment policy document',
    description: 'Incorporate feedback from all department heads into revised policy draft for leadership review.',
    assigned_to: aisha.id,
    due_date: daysAgo(-21),
    status: 'pending',
    priority: 'high',
    linked_task_type: '',
    linked_task_id: '',
    position: '1',
    created_at: isoAgo(5),
    updated_at: isoAgo(5)
  });

  // ── Meeting 3: Committee — Finalized ──

  var m3 = DataService.createRecord('meetings', {
    title: 'Accreditation Steering Committee — Self-Study Progress',
    meeting_type: 'committee',
    meeting_date: daysAgo(21),
    start_time: '10:00',
    end_time: '12:00',
    location: 'Library Meeting Room',
    organizer_id: james.id,
    attendees_csv: [james.id, sarah.id, aisha.id, karen.id, michael.id].join(','),
    status: 'finalized',
    agenda: '1. Self-study progress by domain\n2. Evidence collection status\n3. Narrative writing assignments\n4. Timeline to preparatory visit\n5. Gaps and risk areas',
    notes: 'Domain A (Governance) narratives are in good shape — 2 of 3 standards have final narratives.\n\nDomain B (Curriculum) is the biggest concern — only 1 of 4 standards has a draft narrative. Aisha committed to accelerating this.\n\nEvidence collection at ~60% overall. Need more from Domains C and D.\n\nAgreed to schedule monthly check-ins leading up to the November visit.\n\nKaren raised concern about Domain C.3 (student support) having zero evidence — need to document existing programs.',
    created_by: james.id,
    created_at: isoAgo(21),
    updated_at: isoAgo(20)
  });

  // Meeting 3 action items
  var m3a1 = DataService.createRecord('meeting_action_items', {
    meeting_id: m3.id,
    title: 'Document student support programs for Domain C.3',
    description: 'Create evidence documents for advisory program, counseling services, and student support team processes.',
    assigned_to: karen.id,
    due_date: daysAgo(-7),
    status: 'in_progress',
    priority: 'high',
    linked_task_type: '',
    linked_task_id: '',
    position: '0',
    created_at: isoAgo(21),
    updated_at: isoAgo(15)
  });

  var m3a2 = DataService.createRecord('meeting_action_items', {
    meeting_id: m3.id,
    title: 'Schedule monthly accreditation check-in meetings',
    description: 'Set up recurring monthly meetings for the steering committee through November.',
    assigned_to: james.id,
    due_date: daysAgo(14),
    status: 'completed',
    priority: 'medium',
    linked_task_type: '',
    linked_task_id: '',
    position: '1',
    created_at: isoAgo(21),
    updated_at: isoAgo(18)
  });

  // ── Activity entries ──

  DataService.createRecord('meeting_activity', {
    meeting_id: m1.id, action_item_id: '', user_id: sarah.id,
    action_type: 'meeting_created', field_name: '', old_value: '', new_value: m1.title,
    created_at: isoAgo(14)
  });

  DataService.createRecord('meeting_activity', {
    meeting_id: m1.id, action_item_id: m1a1.id, user_id: sarah.id,
    action_type: 'action_item_created', field_name: '', old_value: '', new_value: m1a1.title,
    created_at: isoAgo(14)
  });

  DataService.createRecord('meeting_activity', {
    meeting_id: m1.id, action_item_id: m1a2.id, user_id: sarah.id,
    action_type: 'action_item_created', field_name: '', old_value: '', new_value: m1a2.title,
    created_at: isoAgo(14)
  });

  DataService.createRecord('meeting_activity', {
    meeting_id: m1.id, action_item_id: '', user_id: sarah.id,
    action_type: 'meeting_finalized', field_name: 'status', old_value: 'draft', new_value: 'finalized',
    created_at: isoAgo(13)
  });

  DataService.createRecord('meeting_activity', {
    meeting_id: m1.id, action_item_id: m1a1.id, user_id: james.id,
    action_type: 'action_item_completed', field_name: 'status', old_value: 'pending', new_value: 'completed',
    created_at: isoAgo(8)
  });

  DataService.createRecord('meeting_activity', {
    meeting_id: m2.id, action_item_id: '', user_id: aisha.id,
    action_type: 'meeting_created', field_name: '', old_value: '', new_value: m2.title,
    created_at: isoAgo(5)
  });

  DataService.createRecord('meeting_activity', {
    meeting_id: m3.id, action_item_id: '', user_id: james.id,
    action_type: 'meeting_created', field_name: '', old_value: '', new_value: m3.title,
    created_at: isoAgo(21)
  });

  DataService.createRecord('meeting_activity', {
    meeting_id: m3.id, action_item_id: m3a2.id, user_id: james.id,
    action_type: 'action_item_completed', field_name: 'status', old_value: 'pending', new_value: 'completed',
    created_at: isoAgo(18)
  });

  Logger.log('Seeded Meeting Minutes: 3 meetings, 6 action items, 8 activity entries.');
}

// ═══════════════════════════════════════════════
// PD Tracking seed data
// ═══════════════════════════════════════════════

function seedPDTrackingData() {
  var existing = DataService.getRecords('pd_offerings');
  if (existing.length > 0) {
    Logger.log('PD offerings already seeded (' + existing.length + ' offerings). Skipping.');
    return;
  }

  // Resolve staff IDs
  var allStaff = DataService.getRecords('staff');
  var staffByEmail = {};
  allStaff.forEach(function(s) { staffByEmail[s.email] = s; });

  var sarah   = staffByEmail['principal@school.edu'];
  var james   = staffByEmail['vice.principal@school.edu'];
  var aisha   = staffByEmail['curriculum@school.edu'];
  var jin     = staffByEmail['j.kim@school.edu'];
  var lisa    = staffByEmail['l.johnson@school.edu'];
  var michael = staffByEmail['m.thompson@school.edu'];
  var david   = staffByEmail['d.weber@school.edu'];
  var karen   = staffByEmail['k.brown@school.edu'];

  // Lookup PGP standards for related_standards_csv
  var pgpStandards = DataService.getRecords('pgp_standards');
  var stdByNum = {};
  pgpStandards.forEach(function(s) { stdByNum[s.standard_number] = s; });

  var today = new Date();
  function daysAgo(n) {
    var d = new Date(today); d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }
  function daysFromNow(n) {
    var d = new Date(today); d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  }
  function isoAgo(n) {
    var d = new Date(today); d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  // ── Offering 1: Published workshop (upcoming, partial registration) ──
  var o1 = DataService.createRecord('pd_offerings', {
    title: 'Differentiated Instruction Strategies',
    description: 'Hands-on workshop exploring practical strategies for differentiating instruction across diverse learner profiles. Includes modeling, practice, and collaborative planning time.',
    facilitator_id: aisha.id,
    category: 'workshop',
    session_date: daysFromNow(14),
    start_time: '09:00',
    end_time: '12:00',
    location: 'Professional Learning Center',
    max_capacity: '15',
    credit_hours: '3',
    status: 'published',
    related_standards_csv: stdByNum[2] ? stdByNum[2].id + ',' + stdByNum[5].id : '',
    related_tags: 'differentiation,inclusive practice,student needs',
    recurrence: 'none',
    series_id: '',
    created_by: aisha.id,
    created_at: isoAgo(10),
    updated_at: isoAgo(10)
  });

  // ── Offering 2: Published course (ongoing, with waitlist) ──
  var o2 = DataService.createRecord('pd_offerings', {
    title: 'Data-Driven Decision Making for Educators',
    description: 'A multi-session course exploring how to collect, analyze, and use student data to inform instructional decisions. Participants will develop a data action plan for their classroom.',
    facilitator_id: james.id,
    category: 'course',
    session_date: daysFromNow(7),
    start_time: '14:00',
    end_time: '16:00',
    location: 'Room 204',
    max_capacity: '3',
    credit_hours: '6',
    status: 'published',
    related_standards_csv: stdByNum[1] ? stdByNum[1].id + ',' + stdByNum[7].id : '',
    related_tags: 'data literacy,assessment,evidence-based',
    recurrence: 'weekly',
    series_id: 'series-data-course-01',
    created_by: james.id,
    created_at: isoAgo(30),
    updated_at: isoAgo(5)
  });

  // ── Offering 3: Completed workshop (with attendance + reflections) ──
  var o3 = DataService.createRecord('pd_offerings', {
    title: 'Collaborative Learning Structures',
    description: 'Explore and practice a range of collaborative learning structures that promote student engagement and deeper thinking. Walk away with at least 5 new strategies to implement immediately.',
    facilitator_id: aisha.id,
    category: 'workshop',
    session_date: daysAgo(21),
    start_time: '09:00',
    end_time: '15:00',
    location: 'Library Conference Room',
    max_capacity: '20',
    credit_hours: '5',
    status: 'completed',
    related_standards_csv: stdByNum[4] ? stdByNum[4].id + ',' + stdByNum[5].id : '',
    related_tags: 'collaboration,engagement,student-centered',
    recurrence: 'none',
    series_id: '',
    created_by: aisha.id,
    created_at: isoAgo(45),
    updated_at: isoAgo(21)
  });

  // ── Offering 4: Draft webinar (upcoming) ──
  var o4 = DataService.createRecord('pd_offerings', {
    title: 'AI Tools in the Classroom',
    description: 'An introductory webinar on responsible AI integration in educational settings. Topics include prompt engineering for lesson planning, AI-assisted feedback, and ethical considerations.',
    facilitator_id: david.id,
    category: 'webinar',
    session_date: daysFromNow(30),
    start_time: '10:00',
    end_time: '11:30',
    location: 'Virtual - Zoom',
    max_capacity: '50',
    credit_hours: '1.5',
    status: 'draft',
    related_standards_csv: stdByNum[6] ? stdByNum[6].id : '',
    related_tags: 'AI,technology,innovation',
    recurrence: 'none',
    series_id: '',
    created_by: david.id,
    created_at: isoAgo(3),
    updated_at: isoAgo(3)
  });

  // ── Offering 5: Published book study (recurring monthly) ──
  var o5 = DataService.createRecord('pd_offerings', {
    title: 'Book Study: Visible Learning for Teachers',
    description: 'Monthly book study group exploring John Hattie\'s research on effective teaching practices. Each session covers 2-3 chapters with discussion and application activities.',
    facilitator_id: sarah.id,
    category: 'book_study',
    session_date: daysFromNow(5),
    start_time: '15:30',
    end_time: '16:30',
    location: 'Staff Lounge',
    max_capacity: '12',
    credit_hours: '1',
    status: 'published',
    related_standards_csv: stdByNum[1] ? stdByNum[1].id + ',' + stdByNum[8].id : '',
    related_tags: 'visible learning,research,Hattie',
    recurrence: 'monthly',
    series_id: 'series-book-hattie-01',
    created_by: sarah.id,
    created_at: isoAgo(60),
    updated_at: isoAgo(2)
  });

  // ── Registrations ──

  // Offering 1: 2 registered
  var r1a = DataService.createRecord('pd_registrations', {
    offering_id: o1.id, staff_id: jin.id, status: 'registered',
    registered_at: isoAgo(8), attended_at: '', cancelled_at: '',
    waitlist_position: '', credit_hours_earned: '', created_at: isoAgo(8), updated_at: isoAgo(8)
  });
  var r1b = DataService.createRecord('pd_registrations', {
    offering_id: o1.id, staff_id: lisa.id, status: 'registered',
    registered_at: isoAgo(7), attended_at: '', cancelled_at: '',
    waitlist_position: '', credit_hours_earned: '', created_at: isoAgo(7), updated_at: isoAgo(7)
  });

  // Offering 2: 3 registered (at capacity) + 1 waitlisted
  var r2a = DataService.createRecord('pd_registrations', {
    offering_id: o2.id, staff_id: michael.id, status: 'registered',
    registered_at: isoAgo(25), attended_at: '', cancelled_at: '',
    waitlist_position: '', credit_hours_earned: '', created_at: isoAgo(25), updated_at: isoAgo(25)
  });
  var r2b = DataService.createRecord('pd_registrations', {
    offering_id: o2.id, staff_id: karen.id, status: 'registered',
    registered_at: isoAgo(24), attended_at: '', cancelled_at: '',
    waitlist_position: '', credit_hours_earned: '', created_at: isoAgo(24), updated_at: isoAgo(24)
  });
  var r2c = DataService.createRecord('pd_registrations', {
    offering_id: o2.id, staff_id: jin.id, status: 'registered',
    registered_at: isoAgo(23), attended_at: '', cancelled_at: '',
    waitlist_position: '', credit_hours_earned: '', created_at: isoAgo(23), updated_at: isoAgo(23)
  });
  var r2d = DataService.createRecord('pd_registrations', {
    offering_id: o2.id, staff_id: david.id, status: 'waitlisted',
    registered_at: isoAgo(20), attended_at: '', cancelled_at: '',
    waitlist_position: '1', credit_hours_earned: '', created_at: isoAgo(20), updated_at: isoAgo(20)
  });

  // Offering 3: 4 attended, 1 cancelled
  var r3a = DataService.createRecord('pd_registrations', {
    offering_id: o3.id, staff_id: jin.id, status: 'attended',
    registered_at: isoAgo(40), attended_at: isoAgo(21), cancelled_at: '',
    waitlist_position: '', credit_hours_earned: '5', created_at: isoAgo(40), updated_at: isoAgo(21)
  });
  var r3b = DataService.createRecord('pd_registrations', {
    offering_id: o3.id, staff_id: lisa.id, status: 'attended',
    registered_at: isoAgo(38), attended_at: isoAgo(21), cancelled_at: '',
    waitlist_position: '', credit_hours_earned: '5', created_at: isoAgo(38), updated_at: isoAgo(21)
  });
  var r3c = DataService.createRecord('pd_registrations', {
    offering_id: o3.id, staff_id: michael.id, status: 'attended',
    registered_at: isoAgo(37), attended_at: isoAgo(21), cancelled_at: '',
    waitlist_position: '', credit_hours_earned: '5', created_at: isoAgo(37), updated_at: isoAgo(21)
  });
  var r3d = DataService.createRecord('pd_registrations', {
    offering_id: o3.id, staff_id: karen.id, status: 'attended',
    registered_at: isoAgo(35), attended_at: isoAgo(21), cancelled_at: '',
    waitlist_position: '', credit_hours_earned: '5', created_at: isoAgo(35), updated_at: isoAgo(21)
  });
  var r3e = DataService.createRecord('pd_registrations', {
    offering_id: o3.id, staff_id: david.id, status: 'cancelled',
    registered_at: isoAgo(36), attended_at: '', cancelled_at: isoAgo(28),
    waitlist_position: '', credit_hours_earned: '', created_at: isoAgo(36), updated_at: isoAgo(28)
  });

  // Offering 5: 2 registered
  var r5a = DataService.createRecord('pd_registrations', {
    offering_id: o5.id, staff_id: lisa.id, status: 'registered',
    registered_at: isoAgo(15), attended_at: '', cancelled_at: '',
    waitlist_position: '', credit_hours_earned: '', created_at: isoAgo(15), updated_at: isoAgo(15)
  });
  var r5b = DataService.createRecord('pd_registrations', {
    offering_id: o5.id, staff_id: aisha.id, status: 'registered',
    registered_at: isoAgo(12), attended_at: '', cancelled_at: '',
    waitlist_position: '', credit_hours_earned: '', created_at: isoAgo(12), updated_at: isoAgo(12)
  });

  // ── Reflections (for completed offering 3) ──

  // Try to find a pgp_standard_selection to link one reflection to
  var allSelections = DataService.getRecords('pgp_standard_selections');
  var linkableSelection = null;
  for (var i = 0; i < allSelections.length; i++) {
    if (allSelections[i].status === 'in_progress') {
      linkableSelection = allSelections[i];
      break;
    }
  }

  var ref1 = DataService.createRecord('pd_reflections', {
    offering_id: o3.id, staff_id: jin.id, registration_id: r3a.id,
    rating: '4', reflection_text: 'The collaborative structures were practical and easy to adapt for my science classes. I particularly liked the Jigsaw Expert Groups approach and have already used it with my Grade 10 students. The peer discussion was also valuable.',
    linked_selection_id: linkableSelection ? linkableSelection.id : '',
    created_at: isoAgo(19), updated_at: isoAgo(19)
  });

  var ref2 = DataService.createRecord('pd_reflections', {
    offering_id: o3.id, staff_id: lisa.id, registration_id: r3b.id,
    rating: '5', reflection_text: 'Excellent workshop! The modeling of each strategy made it so much easier to understand how to implement them. I have already incorporated Think-Pair-Share and Numbered Heads Together into my daily routines.',
    linked_selection_id: '',
    created_at: isoAgo(18), updated_at: isoAgo(18)
  });

  var ref3 = DataService.createRecord('pd_reflections', {
    offering_id: o3.id, staff_id: michael.id, registration_id: r3c.id,
    rating: '3', reflection_text: 'Good content overall, though I felt the workshop tried to cover too many strategies. Would have preferred deeper exploration of fewer approaches. The resource handout is useful for future reference.',
    linked_selection_id: '',
    created_at: isoAgo(17), updated_at: isoAgo(17)
  });

  // If we linked a reflection, update the evidence_linked field
  if (linkableSelection) {
    var currentEvidence = linkableSelection.evidence_linked || '';
    var pdEvidence = '[PD: Collaborative Learning Structures (' + daysAgo(21) + ') - 4\u2605]';
    var newEvidence = currentEvidence ? currentEvidence + '\n' + pdEvidence : pdEvidence;
    DataService.updateRecord('pgp_standard_selections', linkableSelection.id, {
      evidence_linked: newEvidence
    });
  }

  // ── Activity entries ──
  var activities = [
    { offering_id: o1.id, user_id: aisha.id, action_type: 'offering_created', field_name: '', old_value: '', new_value: o1.title, created_at: isoAgo(10) },
    { offering_id: o1.id, user_id: aisha.id, action_type: 'offering_published', field_name: 'status', old_value: 'draft', new_value: 'published', created_at: isoAgo(9) },
    { offering_id: o2.id, user_id: james.id, action_type: 'offering_created', field_name: '', old_value: '', new_value: o2.title, created_at: isoAgo(30) },
    { offering_id: o2.id, user_id: james.id, action_type: 'offering_published', field_name: 'status', old_value: 'draft', new_value: 'published', created_at: isoAgo(28) },
    { offering_id: o3.id, user_id: aisha.id, action_type: 'offering_created', field_name: '', old_value: '', new_value: o3.title, created_at: isoAgo(45) },
    { offering_id: o3.id, user_id: aisha.id, action_type: 'offering_published', field_name: 'status', old_value: 'draft', new_value: 'published', created_at: isoAgo(43) },
    { offering_id: o3.id, user_id: aisha.id, action_type: 'attendance_marked', field_name: '', old_value: '', new_value: '4 staff attended', created_at: isoAgo(21) },
    { offering_id: o4.id, user_id: david.id, action_type: 'offering_created', field_name: '', old_value: '', new_value: o4.title, created_at: isoAgo(3) },
    { offering_id: o5.id, user_id: sarah.id, action_type: 'offering_created', field_name: '', old_value: '', new_value: o5.title, created_at: isoAgo(60) },
    { offering_id: o5.id, user_id: sarah.id, action_type: 'offering_published', field_name: 'status', old_value: 'draft', new_value: 'published', created_at: isoAgo(58) },
    { offering_id: o3.id, user_id: jin.id, action_type: 'reflection_added', field_name: '', old_value: '', new_value: 'Rating: 4/5', created_at: isoAgo(19) },
    { offering_id: o3.id, user_id: lisa.id, action_type: 'reflection_added', field_name: '', old_value: '', new_value: 'Rating: 5/5', created_at: isoAgo(18) }
  ];

  for (var a = 0; a < activities.length; a++) {
    DataService.createRecord('pd_activity', activities[a]);
  }

  Logger.log('Seeded PD Tracking: 5 offerings, 13 registrations, 3 reflections, 12 activity entries.');
}

// ═══════════════════════════════════════════════════════════
// Staff Feedback & 360 Reviews
// ═══════════════════════════════════════════════════════════

function seedFeedbackData() {
  Logger.log('Seeding feedback data...');

  // Idempotent guard
  var existing = DataService.getRecords('feedback_cycles');
  if (existing.length > 0) {
    Logger.log('Feedback data already seeded — skipping.');
    return;
  }

  // Helper: ISO date N days ago
  function isoAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  // Staff lookup
  var allStaff = DataService.getRecords('staff');
  var staffByEmail = {};
  allStaff.forEach(function(s) { staffByEmail[s.email] = s; });

  var sarah   = staffByEmail['principal@school.edu'];
  var james   = staffByEmail['vice.principal@school.edu'];
  var aisha   = staffByEmail['curriculum@school.edu'];
  var jin     = staffByEmail['j.kim@school.edu'];
  var lisa    = staffByEmail['l.johnson@school.edu'];
  var michael = staffByEmail['m.thompson@school.edu'];
  var david   = staffByEmail['d.weber@school.edu'];
  var karen   = staffByEmail['k.brown@school.edu'];

  // ═══════════════════════════════════════════════
  // Cycle 1: Completed 360 Review (closed)
  // ═══════════════════════════════════════════════

  var c1 = DataService.createRecord('feedback_cycles', {
    academic_year: '2024-2025',
    cycle_name: 'Mid-Year 360 Review',
    description: 'Comprehensive 360-degree feedback cycle for all teaching staff. Includes self-assessment, peer feedback, and supervisor evaluation to inform growth planning.',
    status: 'closed',
    open_date: isoAgo(90),
    close_date: isoAgo(30),
    feedback_type: '360',
    min_responses: '3',
    allow_anonymous: 'true',
    created_by: sarah.id,
    created_at: isoAgo(100),
    updated_at: isoAgo(30)
  });

  // Cycle 1 Questions (3 questions)
  var q1a = DataService.createRecord('feedback_questions', {
    cycle_id: c1.id,
    question_text: 'How effectively does this teacher demonstrate knowledge of their subject area and curriculum standards?',
    question_type: 'both',
    sort_order: '1',
    is_required: 'true',
    created_at: isoAgo(100),
    updated_at: isoAgo(100)
  });

  var q1b = DataService.createRecord('feedback_questions', {
    cycle_id: c1.id,
    question_text: 'Rate the quality of collaboration and professional communication with colleagues.',
    question_type: 'rating',
    sort_order: '2',
    is_required: 'true',
    created_at: isoAgo(100),
    updated_at: isoAgo(100)
  });

  var q1c = DataService.createRecord('feedback_questions', {
    cycle_id: c1.id,
    question_text: 'What areas of growth or professional development would you recommend for this colleague?',
    question_type: 'text',
    sort_order: '3',
    is_required: 'false',
    created_at: isoAgo(100),
    updated_at: isoAgo(100)
  });

  // Cycle 1 Assignments — Jin Kim as recipient
  // Self assessment
  var a1_self = DataService.createRecord('feedback_assignments', {
    cycle_id: c1.id,
    recipient_id: jin.id,
    responder_id: jin.id,
    responder_role: 'self',
    status: 'submitted',
    is_anonymous: 'false',
    submitted_at: isoAgo(75),
    created_at: isoAgo(90),
    updated_at: isoAgo(75)
  });

  // Peer: Lisa
  var a1_peer1 = DataService.createRecord('feedback_assignments', {
    cycle_id: c1.id,
    recipient_id: jin.id,
    responder_id: lisa.id,
    responder_role: 'peer',
    status: 'submitted',
    is_anonymous: 'true',
    submitted_at: isoAgo(60),
    created_at: isoAgo(90),
    updated_at: isoAgo(60)
  });

  // Peer: Michael
  var a1_peer2 = DataService.createRecord('feedback_assignments', {
    cycle_id: c1.id,
    recipient_id: jin.id,
    responder_id: michael.id,
    responder_role: 'peer',
    status: 'submitted',
    is_anonymous: 'true',
    submitted_at: isoAgo(55),
    created_at: isoAgo(90),
    updated_at: isoAgo(55)
  });

  // Supervisor: Sarah
  var a1_sup = DataService.createRecord('feedback_assignments', {
    cycle_id: c1.id,
    recipient_id: jin.id,
    responder_id: sarah.id,
    responder_role: 'supervisor',
    status: 'submitted',
    is_anonymous: 'false',
    submitted_at: isoAgo(50),
    created_at: isoAgo(90),
    updated_at: isoAgo(50)
  });

  // Cycle 1 Assignments — Lisa as recipient (fewer responses, below threshold)
  var a1b_self = DataService.createRecord('feedback_assignments', {
    cycle_id: c1.id,
    recipient_id: lisa.id,
    responder_id: lisa.id,
    responder_role: 'self',
    status: 'submitted',
    is_anonymous: 'false',
    submitted_at: isoAgo(70),
    created_at: isoAgo(90),
    updated_at: isoAgo(70)
  });

  var a1b_peer = DataService.createRecord('feedback_assignments', {
    cycle_id: c1.id,
    recipient_id: lisa.id,
    responder_id: jin.id,
    responder_role: 'peer',
    status: 'submitted',
    is_anonymous: 'true',
    submitted_at: isoAgo(65),
    created_at: isoAgo(90),
    updated_at: isoAgo(65)
  });

  // Declined assignment
  var a1b_declined = DataService.createRecord('feedback_assignments', {
    cycle_id: c1.id,
    recipient_id: lisa.id,
    responder_id: david.id,
    responder_role: 'peer',
    status: 'declined',
    is_anonymous: 'true',
    submitted_at: '',
    created_at: isoAgo(90),
    updated_at: isoAgo(80)
  });

  // ── Responses for Jin's assignments ──

  // Self-assessment responses (Jin about Jin)
  DataService.createRecord('feedback_responses', {
    assignment_id: a1_self.id, question_id: q1a.id,
    rating: '4', response_text: 'I feel confident in my subject knowledge but want to strengthen my integration of cross-curricular connections, particularly with the humanities department.',
    created_at: isoAgo(75), updated_at: isoAgo(75)
  });
  DataService.createRecord('feedback_responses', {
    assignment_id: a1_self.id, question_id: q1b.id,
    rating: '3', response_text: '',
    created_at: isoAgo(75), updated_at: isoAgo(75)
  });
  DataService.createRecord('feedback_responses', {
    assignment_id: a1_self.id, question_id: q1c.id,
    rating: '', response_text: 'I would benefit from more training in differentiated instruction strategies and technology integration for lab work.',
    created_at: isoAgo(75), updated_at: isoAgo(75)
  });

  // Lisa about Jin (peer, anonymous)
  DataService.createRecord('feedback_responses', {
    assignment_id: a1_peer1.id, question_id: q1a.id,
    rating: '5', response_text: 'Jin has an exceptional grasp of the science curriculum and consistently brings current research into lessons.',
    created_at: isoAgo(60), updated_at: isoAgo(60)
  });
  DataService.createRecord('feedback_responses', {
    assignment_id: a1_peer1.id, question_id: q1b.id,
    rating: '4', response_text: '',
    created_at: isoAgo(60), updated_at: isoAgo(60)
  });
  DataService.createRecord('feedback_responses', {
    assignment_id: a1_peer1.id, question_id: q1c.id,
    rating: '', response_text: 'Consider leading a professional development session on inquiry-based learning — others would benefit from your expertise.',
    created_at: isoAgo(60), updated_at: isoAgo(60)
  });

  // Michael about Jin (peer, anonymous)
  DataService.createRecord('feedback_responses', {
    assignment_id: a1_peer2.id, question_id: q1a.id,
    rating: '4', response_text: 'Strong content knowledge. Could improve on making complex topics more accessible for struggling learners.',
    created_at: isoAgo(55), updated_at: isoAgo(55)
  });
  DataService.createRecord('feedback_responses', {
    assignment_id: a1_peer2.id, question_id: q1b.id,
    rating: '4', response_text: '',
    created_at: isoAgo(55), updated_at: isoAgo(55)
  });
  DataService.createRecord('feedback_responses', {
    assignment_id: a1_peer2.id, question_id: q1c.id,
    rating: '', response_text: 'More collaborative planning time with the math department would strengthen the STEM integration initiative.',
    created_at: isoAgo(55), updated_at: isoAgo(55)
  });

  // Sarah about Jin (supervisor)
  DataService.createRecord('feedback_responses', {
    assignment_id: a1_sup.id, question_id: q1a.id,
    rating: '5', response_text: 'Jin demonstrates outstanding subject expertise and creates engaging, standards-aligned lessons consistently.',
    created_at: isoAgo(50), updated_at: isoAgo(50)
  });
  DataService.createRecord('feedback_responses', {
    assignment_id: a1_sup.id, question_id: q1b.id,
    rating: '5', response_text: '',
    created_at: isoAgo(50), updated_at: isoAgo(50)
  });
  DataService.createRecord('feedback_responses', {
    assignment_id: a1_sup.id, question_id: q1c.id,
    rating: '', response_text: 'I recommend Jin pursue leadership opportunities such as department chair or PD facilitation.',
    created_at: isoAgo(50), updated_at: isoAgo(50)
  });

  // ── Responses for Lisa's assignments (only 2 submitted) ──

  // Self-assessment (Lisa about Lisa)
  DataService.createRecord('feedback_responses', {
    assignment_id: a1b_self.id, question_id: q1a.id,
    rating: '4', response_text: 'I continue to grow my understanding of assessment practices. My focus this year has been on formative assessment techniques.',
    created_at: isoAgo(70), updated_at: isoAgo(70)
  });
  DataService.createRecord('feedback_responses', {
    assignment_id: a1b_self.id, question_id: q1b.id,
    rating: '4', response_text: '',
    created_at: isoAgo(70), updated_at: isoAgo(70)
  });

  // Jin about Lisa (peer)
  DataService.createRecord('feedback_responses', {
    assignment_id: a1b_peer.id, question_id: q1a.id,
    rating: '4', response_text: 'Lisa brings creative approaches to teaching English and is always willing to share resources.',
    created_at: isoAgo(65), updated_at: isoAgo(65)
  });
  DataService.createRecord('feedback_responses', {
    assignment_id: a1b_peer.id, question_id: q1b.id,
    rating: '5', response_text: '',
    created_at: isoAgo(65), updated_at: isoAgo(65)
  });

  // ── Summaries ──

  // Jin: 4 responses (above threshold of 3) — shared
  var linkableSelection = null;
  var allSelections = DataService.getRecords('pgp_standard_selections');
  for (var i = 0; i < allSelections.length; i++) {
    if (allSelections[i].status === 'in_progress') {
      linkableSelection = allSelections[i];
      break;
    }
  }

  var sum1 = DataService.createRecord('feedback_summaries', {
    cycle_id: c1.id,
    recipient_id: jin.id,
    avg_rating: '4.3',
    response_count: '4',
    threshold_met: 'true',
    admin_notes: 'Strong performance across all areas. Recommend for department chair consideration.',
    shared_with_recipient: 'true',
    shared_at: isoAgo(28),
    linked_selection_id: linkableSelection ? linkableSelection.id : '',
    created_at: isoAgo(29),
    updated_at: isoAgo(28)
  });

  // Lisa: 2 responses (below threshold of 3) — NOT shared
  var sum2 = DataService.createRecord('feedback_summaries', {
    cycle_id: c1.id,
    recipient_id: lisa.id,
    avg_rating: '4.3',
    response_count: '2',
    threshold_met: 'false',
    admin_notes: 'Below minimum response threshold. One peer declined. Consider re-opening or adjusting assignments.',
    shared_with_recipient: 'false',
    shared_at: '',
    linked_selection_id: '',
    created_at: isoAgo(29),
    updated_at: isoAgo(29)
  });

  // ═══════════════════════════════════════════════
  // Cycle 2: Open Peer Feedback (currently active)
  // ═══════════════════════════════════════════════

  var c2 = DataService.createRecord('feedback_cycles', {
    academic_year: '2024-2025',
    cycle_name: 'Q3 Peer Feedback',
    description: 'Peer-to-peer feedback cycle focused on collaboration and instructional practices. All teaching staff participate.',
    status: 'open',
    open_date: isoAgo(14),
    close_date: isoAgo(-14),
    feedback_type: 'peer',
    min_responses: '2',
    allow_anonymous: 'true',
    created_by: james.id,
    created_at: isoAgo(21),
    updated_at: isoAgo(14)
  });

  // Cycle 2 Questions
  var q2a = DataService.createRecord('feedback_questions', {
    cycle_id: c2.id,
    question_text: 'How well does this colleague collaborate on shared planning and curriculum development?',
    question_type: 'both',
    sort_order: '1',
    is_required: 'true',
    created_at: isoAgo(21),
    updated_at: isoAgo(21)
  });

  var q2b = DataService.createRecord('feedback_questions', {
    cycle_id: c2.id,
    question_text: 'Rate this colleague\'s contribution to our professional learning community.',
    question_type: 'rating',
    sort_order: '2',
    is_required: 'true',
    created_at: isoAgo(21),
    updated_at: isoAgo(21)
  });

  var q2c = DataService.createRecord('feedback_questions', {
    cycle_id: c2.id,
    question_text: 'What is one specific thing this colleague does well that you have learned from or appreciate?',
    question_type: 'text',
    sort_order: '3',
    is_required: 'false',
    created_at: isoAgo(21),
    updated_at: isoAgo(21)
  });

  // Cycle 2 Assignments — Michael as recipient
  var a2_p1 = DataService.createRecord('feedback_assignments', {
    cycle_id: c2.id,
    recipient_id: michael.id,
    responder_id: jin.id,
    responder_role: 'peer',
    status: 'submitted',
    is_anonymous: 'true',
    submitted_at: isoAgo(5),
    created_at: isoAgo(14),
    updated_at: isoAgo(5)
  });

  var a2_p2 = DataService.createRecord('feedback_assignments', {
    cycle_id: c2.id,
    recipient_id: michael.id,
    responder_id: lisa.id,
    responder_role: 'peer',
    status: 'in_progress',
    is_anonymous: 'true',
    submitted_at: '',
    created_at: isoAgo(14),
    updated_at: isoAgo(3)
  });

  var a2_p3 = DataService.createRecord('feedback_assignments', {
    cycle_id: c2.id,
    recipient_id: michael.id,
    responder_id: karen.id,
    responder_role: 'peer',
    status: 'pending',
    is_anonymous: 'true',
    submitted_at: '',
    created_at: isoAgo(14),
    updated_at: isoAgo(14)
  });

  // Cycle 2 Assignments — Karen as recipient
  var a2_k1 = DataService.createRecord('feedback_assignments', {
    cycle_id: c2.id,
    recipient_id: karen.id,
    responder_id: michael.id,
    responder_role: 'peer',
    status: 'pending',
    is_anonymous: 'true',
    submitted_at: '',
    created_at: isoAgo(14),
    updated_at: isoAgo(14)
  });

  var a2_k2 = DataService.createRecord('feedback_assignments', {
    cycle_id: c2.id,
    recipient_id: karen.id,
    responder_id: lisa.id,
    responder_role: 'peer',
    status: 'pending',
    is_anonymous: 'true',
    submitted_at: '',
    created_at: isoAgo(14),
    updated_at: isoAgo(14)
  });

  // ── Responses for Cycle 2 (only Jin about Michael is submitted) ──
  DataService.createRecord('feedback_responses', {
    assignment_id: a2_p1.id, question_id: q2a.id,
    rating: '4', response_text: 'Michael is always prepared for team meetings and actively contributes to curriculum alignment discussions.',
    created_at: isoAgo(5), updated_at: isoAgo(5)
  });
  DataService.createRecord('feedback_responses', {
    assignment_id: a2_p1.id, question_id: q2b.id,
    rating: '4', response_text: '',
    created_at: isoAgo(5), updated_at: isoAgo(5)
  });
  DataService.createRecord('feedback_responses', {
    assignment_id: a2_p1.id, question_id: q2c.id,
    rating: '', response_text: 'Michael\'s use of data to drive instructional decisions has inspired me to adopt similar practices in my own classroom.',
    created_at: isoAgo(5), updated_at: isoAgo(5)
  });

  // Draft responses for Lisa (in_progress assignment)
  DataService.createRecord('feedback_responses', {
    assignment_id: a2_p2.id, question_id: q2a.id,
    rating: '3', response_text: '',
    created_at: isoAgo(3), updated_at: isoAgo(3)
  });

  // ═══════════════════════════════════════════════
  // Activity log
  // ═══════════════════════════════════════════════

  var activities = [
    { cycle_id: c1.id, assignment_id: '', user_id: sarah.id, action_type: 'cycle_created', field_name: '', old_value: '', new_value: c1.cycle_name, created_at: isoAgo(100) },
    { cycle_id: c1.id, assignment_id: '', user_id: sarah.id, action_type: 'cycle_opened', field_name: 'status', old_value: 'draft', new_value: 'open', created_at: isoAgo(90) },
    { cycle_id: c1.id, assignment_id: '', user_id: sarah.id, action_type: 'bulk_assigned', field_name: '', old_value: '', new_value: '7 assignments created', created_at: isoAgo(90) },
    { cycle_id: c1.id, assignment_id: a1_self.id, user_id: jin.id, action_type: 'response_submitted', field_name: '', old_value: '', new_value: 'Self-assessment', created_at: isoAgo(75) },
    { cycle_id: c1.id, assignment_id: a1_peer1.id, user_id: lisa.id, action_type: 'response_submitted', field_name: '', old_value: '', new_value: 'Peer feedback', created_at: isoAgo(60) },
    { cycle_id: c1.id, assignment_id: a1b_declined.id, user_id: david.id, action_type: 'declined', field_name: 'status', old_value: 'pending', new_value: 'declined', created_at: isoAgo(80) },
    { cycle_id: c1.id, assignment_id: '', user_id: sarah.id, action_type: 'cycle_closed', field_name: 'status', old_value: 'open', new_value: 'closed', created_at: isoAgo(30) },
    { cycle_id: c1.id, assignment_id: '', user_id: sarah.id, action_type: 'summary_generated', field_name: '', old_value: '', new_value: '2 summaries generated', created_at: isoAgo(29) },
    { cycle_id: c1.id, assignment_id: '', user_id: sarah.id, action_type: 'summary_shared', field_name: '', old_value: '', new_value: 'Jin Kim summary shared', created_at: isoAgo(28) },
    { cycle_id: c2.id, assignment_id: '', user_id: james.id, action_type: 'cycle_created', field_name: '', old_value: '', new_value: c2.cycle_name, created_at: isoAgo(21) },
    { cycle_id: c2.id, assignment_id: '', user_id: james.id, action_type: 'cycle_opened', field_name: 'status', old_value: 'draft', new_value: 'open', created_at: isoAgo(14) },
    { cycle_id: c2.id, assignment_id: a2_p1.id, user_id: jin.id, action_type: 'response_submitted', field_name: '', old_value: '', new_value: 'Peer feedback', created_at: isoAgo(5) }
  ];

  for (var a = 0; a < activities.length; a++) {
    DataService.createRecord('feedback_activity', activities[a]);
  }

  Logger.log('Seeded Feedback: 2 cycles, 6 questions, 12 assignments, 21 responses, 2 summaries, 12 activity entries.');
}

// ═══════════════════════════════════════════════
// Staff Wellness & Workload seed data
// ═══════════════════════════════════════════════

function seedWellnessData() {
  Logger.log('Seeding wellness data...');

  // Idempotent guard
  var existing = DataService.getRecords('wellness_config');
  if (existing.length > 0) {
    Logger.log('Wellness data already seeded — skipping.');
    return;
  }

  // Helper: ISO date N days ago
  function isoAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  // Staff lookup
  var allStaff = DataService.getRecords('staff');
  var staffByEmail = {};
  allStaff.forEach(function(s) { staffByEmail[s.email] = s; });

  var sarah   = staffByEmail['principal@school.edu'];
  var james   = staffByEmail['vice.principal@school.edu'];
  var aisha   = staffByEmail['curriculum@school.edu'];
  var jin     = staffByEmail['j.kim@school.edu'];
  var lisa    = staffByEmail['l.johnson@school.edu'];
  var michael = staffByEmail['m.thompson@school.edu'];
  var david   = staffByEmail['d.weber@school.edu'];
  var karen   = staffByEmail['k.brown@school.edu'];

  // ═══════════════════════════════════════════════
  // Config entries (12)
  // ═══════════════════════════════════════════════

  var configs = [
    { key: 'checkin_frequency_weeks', value: '1', description: 'How often staff should submit wellness check-ins (weeks)' },
    { key: 'workload_weight_teaching', value: '30', description: 'Workload weight for teaching periods (%)' },
    { key: 'workload_weight_observations', value: '15', description: 'Workload weight for observations (%)' },
    { key: 'workload_weight_pd', value: '15', description: 'Workload weight for PD activities (%)' },
    { key: 'workload_weight_meetings', value: '15', description: 'Workload weight for meetings (%)' },
    { key: 'workload_weight_feedback', value: '10', description: 'Workload weight for feedback assignments (%)' },
    { key: 'workload_weight_growth_plan', value: '15', description: 'Workload weight for growth plan tasks (%)' },
    { key: 'green_threshold', value: '60', description: 'Workload score below this is green (healthy)' },
    { key: 'amber_threshold', value: '80', description: 'Workload score below this is amber (elevated)' },
    { key: 'burnout_decline_weeks', value: '3', description: 'Consecutive declining weeks before burnout alert' },
    { key: 'low_score_threshold', value: '2.5', description: 'Overall wellness score below this triggers alert' },
    { key: 'no_checkin_weeks', value: '3', description: 'Weeks without check-in before alert is generated' }
  ];

  var now = new Date().toISOString();
  for (var i = 0; i < configs.length; i++) {
    configs[i].updated_at = now;
    DataService.createRecord('wellness_config', configs[i]);
  }

  // ═══════════════════════════════════════════════
  // Check-ins: 8 weeks x 6 staff with realistic trends
  // ═══════════════════════════════════════════════

  var staffCheckins = [
    // Jin: Declining trend (starts well, gradually drops — potential burnout)
    { staff: jin, weeks: [
      { e: 5, m: 5, s: 5, b: 4, sat: 5 },
      { e: 5, m: 4, s: 4, b: 4, sat: 4 },
      { e: 4, m: 4, s: 4, b: 3, sat: 4 },
      { e: 4, m: 3, s: 3, b: 3, sat: 3 },
      { e: 3, m: 3, s: 3, b: 2, sat: 3 },
      { e: 3, m: 2, s: 2, b: 2, sat: 2 },
      { e: 2, m: 2, s: 2, b: 2, sat: 2 },
      { e: 2, m: 1, s: 1, b: 1, sat: 2 }
    ]},
    // Lisa: Consistently high — no concerns
    { staff: lisa, weeks: [
      { e: 4, m: 5, s: 4, b: 5, sat: 5 },
      { e: 5, m: 5, s: 5, b: 4, sat: 5 },
      { e: 4, m: 4, s: 5, b: 5, sat: 4 },
      { e: 5, m: 5, s: 4, b: 4, sat: 5 },
      { e: 4, m: 4, s: 5, b: 5, sat: 4 },
      { e: 5, m: 5, s: 4, b: 5, sat: 5 },
      { e: 4, m: 4, s: 5, b: 4, sat: 4 },
      { e: 5, m: 5, s: 4, b: 5, sat: 5 }
    ]},
    // Michael: Variable — up and down, generally ok
    { staff: michael, weeks: [
      { e: 3, m: 4, s: 3, b: 3, sat: 4 },
      { e: 4, m: 3, s: 4, b: 4, sat: 3 },
      { e: 2, m: 3, s: 2, b: 3, sat: 3 },
      { e: 4, m: 4, s: 4, b: 4, sat: 4 },
      { e: 3, m: 3, s: 3, b: 2, sat: 3 },
      { e: 4, m: 4, s: 4, b: 4, sat: 4 },
      { e: 3, m: 3, s: 3, b: 3, sat: 3 },
      { e: 4, m: 4, s: 3, b: 4, sat: 4 }
    ]},
    // David: Steady middle — average scores
    { staff: david, weeks: [
      { e: 3, m: 3, s: 3, b: 3, sat: 3 },
      { e: 3, m: 3, s: 3, b: 3, sat: 4 },
      { e: 3, m: 4, s: 3, b: 3, sat: 3 },
      { e: 3, m: 3, s: 3, b: 4, sat: 3 },
      { e: 4, m: 3, s: 3, b: 3, sat: 3 },
      { e: 3, m: 3, s: 4, b: 3, sat: 3 },
      { e: 3, m: 4, s: 3, b: 3, sat: 4 },
      { e: 3, m: 3, s: 3, b: 3, sat: 3 }
    ]},
    // Karen: Improving trend — started low, getting better
    { staff: karen, weeks: [
      { e: 2, m: 2, s: 2, b: 2, sat: 2 },
      { e: 2, m: 3, s: 2, b: 2, sat: 3 },
      { e: 3, m: 3, s: 3, b: 3, sat: 3 },
      { e: 3, m: 3, s: 3, b: 3, sat: 3 },
      { e: 3, m: 4, s: 3, b: 4, sat: 4 },
      { e: 4, m: 4, s: 4, b: 4, sat: 4 },
      { e: 4, m: 4, s: 4, b: 4, sat: 4 },
      { e: 5, m: 5, s: 4, b: 5, sat: 5 }
    ]},
    // Aisha: High but recent dip — worth watching
    { staff: aisha, weeks: [
      { e: 5, m: 5, s: 5, b: 5, sat: 5 },
      { e: 5, m: 5, s: 4, b: 5, sat: 5 },
      { e: 4, m: 5, s: 5, b: 4, sat: 4 },
      { e: 5, m: 4, s: 4, b: 5, sat: 5 },
      { e: 4, m: 5, s: 5, b: 4, sat: 4 },
      { e: 4, m: 4, s: 4, b: 4, sat: 4 },
      { e: 3, m: 3, s: 3, b: 3, sat: 3 },
      { e: 3, m: 3, s: 2, b: 3, sat: 3 }
    ]}
  ];

  var checkinNotes = [
    'Feeling good this week, productive classes.',
    '',
    'A bit tired from report writing but manageable.',
    '',
    'Heavy marking load this week.',
    'Great collaborative session with the team.',
    '',
    'End of term exhaustion setting in.'
  ];

  var checkinCount = 0;
  for (var s = 0; s < staffCheckins.length; s++) {
    var sc = staffCheckins[s];
    for (var w = 0; w < sc.weeks.length; w++) {
      var wk = sc.weeks[w];
      var overall = Math.round(((wk.e + wk.m + wk.s + wk.b + wk.sat) / 5) * 10) / 10;
      var daysAgo = (7 - w) * 7; // week 0 = 8 weeks ago, week 7 = 1 week ago
      DataService.createRecord('wellness_checkins', {
        staff_id: sc.staff.id,
        checkin_date: isoAgo(daysAgo),
        energy_score: String(wk.e),
        mood_score: String(wk.m),
        stress_score: String(wk.s),
        balance_score: String(wk.b),
        satisfaction_score: String(wk.sat),
        notes: checkinNotes[w] || '',
        overall_score: String(overall),
        created_at: isoAgo(daysAgo)
      });
      checkinCount++;
    }
  }

  // ═══════════════════════════════════════════════
  // Alerts (3)
  // ═══════════════════════════════════════════════

  DataService.createRecord('wellness_alerts', {
    staff_id: jin.id,
    alert_type: 'declining_wellness',
    severity: 'warning',
    message: 'Jin Kim has shown declining wellness scores over 5 consecutive weeks (from 4.8 to 1.4).',
    trigger_data: '{"weeks":5,"startScore":4.8,"endScore":1.4}',
    status: 'active',
    acknowledged_by: '',
    acknowledged_at: '',
    created_at: isoAgo(7),
    resolved_at: ''
  });

  DataService.createRecord('wellness_alerts', {
    staff_id: michael.id,
    alert_type: 'high_workload',
    severity: 'info',
    message: 'Michael Thompson has an elevated workload score of 72/100.',
    trigger_data: '{"compositeScore":72}',
    status: 'acknowledged',
    acknowledged_by: sarah.id,
    acknowledged_at: isoAgo(5),
    created_at: isoAgo(14),
    resolved_at: ''
  });

  DataService.createRecord('wellness_alerts', {
    staff_id: james.id,
    alert_type: 'no_checkin',
    severity: 'info',
    message: 'James Wilson has not submitted a wellness check-in for 4 weeks.',
    trigger_data: '{"weeksMissed":4}',
    status: 'resolved',
    acknowledged_by: sarah.id,
    acknowledged_at: isoAgo(10),
    created_at: isoAgo(21),
    resolved_at: isoAgo(7)
  });

  // ═══════════════════════════════════════════════
  // Activity log (10 entries)
  // ═══════════════════════════════════════════════

  var activities = [
    { staff_id: jin.id, user_id: jin.id, action_type: 'checkin_submitted', field_name: 'overall_score', old_value: '', new_value: '4.8', created_at: isoAgo(56) },
    { staff_id: lisa.id, user_id: lisa.id, action_type: 'checkin_submitted', field_name: 'overall_score', old_value: '', new_value: '4.6', created_at: isoAgo(56) },
    { staff_id: jin.id, user_id: jin.id, action_type: 'checkin_submitted', field_name: 'overall_score', old_value: '', new_value: '2.8', created_at: isoAgo(14) },
    { staff_id: jin.id, user_id: jin.id, action_type: 'checkin_submitted', field_name: 'overall_score', old_value: '', new_value: '2.0', created_at: isoAgo(7) },
    { staff_id: '', user_id: sarah.id, action_type: 'alert_generated', field_name: 'alert_type', old_value: '', new_value: 'declining_wellness', created_at: isoAgo(7) },
    { staff_id: '', user_id: sarah.id, action_type: 'alert_acknowledged', field_name: 'status', old_value: 'active', new_value: 'acknowledged', created_at: isoAgo(5) },
    { staff_id: karen.id, user_id: karen.id, action_type: 'checkin_submitted', field_name: 'overall_score', old_value: '', new_value: '4.8', created_at: isoAgo(7) },
    { staff_id: '', user_id: sarah.id, action_type: 'config_updated', field_name: 'checkin_frequency_weeks', old_value: '2', new_value: '1', created_at: isoAgo(30) },
    { staff_id: '', user_id: sarah.id, action_type: 'burnout_scan', field_name: '', old_value: '', new_value: '1 alert generated', created_at: isoAgo(7) },
    { staff_id: '', user_id: sarah.id, action_type: 'alert_resolved', field_name: 'status', old_value: 'acknowledged', new_value: 'resolved', created_at: isoAgo(7) }
  ];

  for (var a = 0; a < activities.length; a++) {
    DataService.createRecord('wellness_activity', activities[a]);
  }

  Logger.log('Seeded Wellness: ' + configs.length + ' config, ' + checkinCount + ' check-ins, 3 alerts, ' + activities.length + ' activity entries.');
}

/**
 * Seeds DDO data: growing edges on existing growth plans + ITC maps.
 * Run AFTER seedGrowthPlanData().
 */
function seedDDOData() {
  // Check if ITC maps already exist
  var existingMaps = DataService.getRecords('itc_maps');
  if (existingMaps.length > 0) {
    Logger.log('DDO data already seeded (' + existingMaps.length + ' ITC maps). Skipping.');
    return;
  }

  var now = new Date().toISOString();

  // Get growth plans to update with growing edges
  var plans = DataService.getRecords('growth_plans');
  if (plans.length === 0) {
    Logger.log('No growth plans found. Run seedGrowthPlanData() first.');
    return;
  }

  // Growing edge summaries for variety
  var edges = [
    'Learning to give constructive feedback that challenges without demoralizing — moving from "nice" to "kind and honest."',
    'Developing comfort with ambiguity in project-based learning outcomes — trusting the process over predetermined results.',
    'Building capacity to delegate meaningful leadership tasks to students rather than maintaining control.',
    'Strengthening my ability to engage in productive conflict during team meetings rather than avoiding disagreement.',
    'Growing past my tendency to over-scaffold — allowing students to struggle productively before intervening.'
  ];

  var visibilities = ['public', 'public', 'team', 'private', 'public'];

  for (var p = 0; p < plans.length && p < 5; p++) {
    // Update plan with growing edge
    DataService.updateRecord('growth_plans', plans[p].id, {
      growing_edge_summary: edges[p % edges.length],
      growing_edge_visibility: visibilities[p % visibilities.length],
      updated_at: now
    });

    // Get selections for this plan
    var selections = DataService.getRecords('pgp_standard_selections').filter(function(s) {
      return s.plan_id === plans[p].id;
    });

    // Add growing edge and ITC map to the first selection
    if (selections.length > 0) {
      var sel = selections[0];

      DataService.updateRecord('pgp_standard_selections', sel.id, {
        growing_edge: 'Stretching beyond my comfort zone in ' + (sel.standard_id ? 'this standard area' : 'professional practice') + ' by embracing vulnerability as a growth catalyst.',
        updated_at: now
      });

      // Create ITC map for this selection
      DataService.createRecord('itc_maps', {
        selection_id: sel.id,
        staff_id: plans[p].staff_id,
        commitment: 'I am committed to ' + edges[p % edges.length].toLowerCase().substring(0, 60) + '...',
        doing_not_doing: 'I sometimes avoid difficult conversations. I tend to over-plan rather than improvise. I seek validation before sharing new ideas.',
        competing_commitments: 'I am also committed to being liked by colleagues. I am committed to maintaining a sense of control and predictability.',
        big_assumptions: 'I assume that if I give honest feedback, people will reject me. I assume that if things go wrong, it reflects my competence.',
        status: p === 0 ? 'active' : 'draft',
        reflection_notes: p === 0 ? 'After three months, I notice I am more willing to sit in discomfort. The competing commitments are still strong but I can name them in the moment now.' : '',
        created_at: now,
        updated_at: now
      });
    }
  }

  Logger.log('Seeded DDO: ' + Math.min(plans.length, 5) + ' growing edges, ' + Math.min(plans.length, 5) + ' ITC maps.');
}

/**
 * Seeds coaching triads/groups with members and sample meetings.
 * Run AFTER seedStaffData() and seedDDOData().
 */
function seedCoachingData() {
  var existingGroups = DataService.getRecords('coaching_groups');
  if (existingGroups.length > 0) {
    Logger.log('Coaching data already seeded (' + existingGroups.length + ' groups). Skipping.');
    return;
  }

  var now = new Date().toISOString();
  var staff = DataService.getRecords('staff');
  if (staff.length < 6) {
    Logger.log('Not enough staff for coaching groups. Run seedStaffData() first.');
    return;
  }

  // Sort staff: admins first, then teachers
  var admins = staff.filter(function(s) { return s.role === 'admin'; });
  var teachers = staff.filter(function(s) { return s.role !== 'admin' && String(s.is_active) !== 'false'; });

  var facilitator = admins.length > 0 ? admins[0] : teachers[0];

  // Create 3 coaching groups
  var groups = [
    { group_name: 'ES Growth Triad A', group_type: 'triad', members: teachers.slice(0, 3) },
    { group_name: 'MS Growth Dyad', group_type: 'dyad', members: teachers.slice(3, 5) },
    { group_name: 'HS Home Group', group_type: 'home_group', members: teachers.slice(5, 9) }
  ];

  function isoAgo(days) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  }

  for (var g = 0; g < groups.length; g++) {
    var gData = groups[g];
    if (!gData.members || gData.members.length === 0) continue;

    var group = DataService.createRecord('coaching_groups', {
      group_name: gData.group_name,
      group_type: gData.group_type,
      academic_year: '2025-26',
      facilitator_id: facilitator.id,
      status: 'active',
      meeting_frequency_weeks: gData.group_type === 'home_group' ? 4 : 2,
      created_by: facilitator.id,
      created_at: now,
      updated_at: now
    });

    // Add members
    for (var m = 0; m < gData.members.length; m++) {
      DataService.createRecord('coaching_group_members', {
        group_id: group.id,
        staff_id: gData.members[m].id,
        role: m === 0 ? 'facilitator' : 'member',
        joined_at: now,
        left_at: ''
      });
    }

    // Add 2 sample meetings for the first group
    if (g === 0) {
      var attendeeIds = gData.members.map(function(mm) { return mm.id; }).join(',');

      DataService.createRecord('coaching_meetings', {
        group_id: group.id,
        meeting_date: isoAgo(14),
        facilitator_id: gData.members[0].id,
        attendees_csv: attendeeIds,
        topic: 'Exploring our immunity to change maps',
        growing_edge_discussed: 'We each shared our big assumptions and tested one with the group.',
        key_insights: 'Several of us share the assumption that vulnerability equals weakness. Naming this together made it feel less threatening.',
        action_commitments: 'Each member will run one small "experiment" to test a big assumption before next meeting.',
        next_meeting_date: isoAgo(-14),
        created_by: gData.members[0].id,
        created_at: isoAgo(14)
      });

      DataService.createRecord('coaching_meetings', {
        group_id: group.id,
        meeting_date: isoAgo(0),
        facilitator_id: gData.members[1].id,
        attendees_csv: attendeeIds,
        topic: 'Experiment debrief — testing big assumptions',
        growing_edge_discussed: 'Reporting back on our assumption-testing experiments.',
        key_insights: 'Two of us found our assumptions did not hold when tested. One person found the assumption was partially true but manageable.',
        action_commitments: 'Continue with assumption testing. Start documenting growth in ITC reflection notes.',
        next_meeting_date: isoAgo(-14),
        created_by: gData.members[1].id,
        created_at: now
      });
    }
  }

  Logger.log('Seeded Coaching: ' + groups.length + ' groups with members and sample meetings.');
}

/**
 * Seeds multiplier ratings on existing observations.
 * Adds realistic multiplier discipline scores (1-5) to a subset of observations.
 * Run AFTER seedObservationData().
 */
function seedMultiplierObservationData() {
  var observations = DataService.getRecords('observations');
  if (observations.length === 0) {
    Logger.log('No observations found. Run seedObservationData() first.');
    return;
  }

  // Check if already seeded
  var alreadySeeded = observations.some(function(o) {
    return Number(o.multiplier_talent_finder) > 0;
  });
  if (alreadySeeded) {
    Logger.log('Multiplier observation data already seeded. Skipping.');
    return;
  }

  // Add multiplier ratings to ~70% of observations
  var updated = 0;
  observations.forEach(function(obs, idx) {
    if (idx % 10 < 7) { // ~70% of observations get multiplier data
      var base = (idx % 3) + 2; // 2-4 base rating
      DataService.updateRecord('observations', obs.id, {
        multiplier_talent_finder: Math.min(5, base + (idx % 2)),
        multiplier_liberator: Math.min(5, base + ((idx + 1) % 3 === 0 ? 1 : 0)),
        multiplier_challenger: Math.min(5, base + (idx % 4 === 0 ? 1 : -1)),
        multiplier_debate_maker: Math.min(5, Math.max(1, base - (idx % 3 === 0 ? 1 : 0))),
        multiplier_investor: Math.min(5, base + (idx % 2 === 0 ? 1 : 0))
      });
      updated++;
    }
  });

  Logger.log('Seeded multiplier ratings on ' + updated + '/' + observations.length + ' observations.');
}

/**
 * Seeds a Multiplier Effect 360 feedback cycle template.
 * Creates a draft cycle with 10 questions (2 per discipline: 1 rating + 1 text).
 * Each question is tagged with its discipline for profile computation.
 */
function seedMultiplierFeedbackTemplate() {
  var existing = DataService.getRecords('feedback_cycles');
  var alreadyExists = existing.some(function(c) { return c.cycle_name === 'Multiplier Effect 360'; });
  if (alreadyExists) {
    Logger.log('Multiplier feedback template already exists. Skipping.');
    return;
  }

  var staff = DataService.getRecords('staff');
  var admin = staff.filter(function(s) { return s.role === 'admin'; })[0];
  if (!admin) { Logger.log('Need admin staff. Run seedStaffData() first.'); return; }

  var now = new Date().toISOString();

  // Create the cycle
  var cycle = DataService.createRecord('feedback_cycles', {
    academic_year: '2025-26',
    cycle_name: 'Multiplier Effect 360',
    description: 'Assess leadership through the lens of the 5 Multiplier disciplines. Based on Liz Wiseman\'s "Multipliers" framework.',
    status: 'draft',
    open_date: '',
    close_date: '',
    feedback_type: '360',
    min_responses: '3',
    allow_anonymous: 'true',
    created_by: admin.id,
    created_at: now,
    updated_at: now
  });

  // Questions: 2 per discipline (rating + text)
  var questions = [
    { text: 'How effectively does this leader identify and utilize people\'s natural talents?', type: 'rating', tag: 'talent_finder', order: 1 },
    { text: 'Describe a specific example of this leader recognizing or developing someone\'s talent.', type: 'text', tag: 'talent_finder', order: 2 },
    { text: 'How well does this leader create an environment where people feel safe to think, make mistakes, and contribute their best?', type: 'rating', tag: 'liberator', order: 3 },
    { text: 'How does this leader balance creating safety with demanding excellence?', type: 'text', tag: 'liberator', order: 4 },
    { text: 'How effectively does this leader set challenges that stretch people beyond their comfort zone?', type: 'rating', tag: 'challenger', order: 5 },
    { text: 'Describe a challenge this leader set that caused meaningful growth.', type: 'text', tag: 'challenger', order: 6 },
    { text: 'How well does this leader facilitate rigorous debate to drive sound decisions?', type: 'rating', tag: 'debate_maker', order: 7 },
    { text: 'How does this leader ensure all perspectives are heard before making decisions?', type: 'text', tag: 'debate_maker', order: 8 },
    { text: 'How effectively does this leader invest in others by giving ownership and holding people accountable for results?', type: 'rating', tag: 'investor', order: 9 },
    { text: 'Describe how this leader delegates and empowers others to take ownership.', type: 'text', tag: 'investor', order: 10 }
  ];

  questions.forEach(function(q) {
    DataService.createRecord('feedback_questions', {
      cycle_id: cycle.id,
      question_text: q.text,
      question_type: q.type,
      sort_order: String(q.order),
      is_required: 'true',
      discipline_tag: q.tag,
      created_at: now,
      updated_at: now
    });
  });

  Logger.log('Seeded Multiplier Effect 360 feedback template with ' + questions.length + ' questions.');
}

/**
 * Seeds a Diminisher Self-Assessment feedback cycle.
 * Creates a draft self-assessment cycle with questions for 8 accidental diminisher patterns.
 */
function seedDiminisherSelfAssessment() {
  var existing = DataService.getRecords('feedback_cycles');
  var alreadyExists = existing.some(function(c) { return c.cycle_name === 'Diminisher Self-Assessment'; });
  if (alreadyExists) {
    Logger.log('Diminisher self-assessment already exists. Skipping.');
    return;
  }

  var staff = DataService.getRecords('staff');
  var admin = staff.filter(function(s) { return s.role === 'admin'; })[0];
  if (!admin) { Logger.log('Need admin staff. Run seedStaffData() first.'); return; }

  var now = new Date().toISOString();

  var cycle = DataService.createRecord('feedback_cycles', {
    academic_year: '2025-26',
    cycle_name: 'Diminisher Self-Assessment',
    description: 'Identify your accidental diminisher tendencies. Higher ratings indicate greater awareness and frequency of the pattern. Based on Liz Wiseman\'s "Multipliers" framework.',
    status: 'draft',
    open_date: '',
    close_date: '',
    feedback_type: 'self',
    min_responses: '1',
    allow_anonymous: 'false',
    created_by: admin.id,
    created_at: now,
    updated_at: now
  });

  var patterns = [
    { tag: 'diminisher_idea_guy', text: 'The Idea Guy: I frequently share new ideas, sometimes before people have finished implementing the last ones. I can overwhelm my team with too many directions.', order: 1 },
    { tag: 'diminisher_always_on', text: 'Always On: My energy and enthusiasm can be exhausting for others. I sometimes dominate conversations and leave little space for quieter voices.', order: 2 },
    { tag: 'diminisher_rescuer', text: 'The Rescuer: I tend to jump in and help when people struggle, which may prevent them from learning through their own problem-solving.', order: 3 },
    { tag: 'diminisher_pace_setter', text: 'The Pace Setter: I set a high bar with my own work pace, which can make others feel inadequate or rushed rather than empowered.', order: 4 },
    { tag: 'diminisher_rapid_responder', text: 'Rapid Responder: I respond quickly to issues, which can train people to depend on me rather than developing their own solutions.', order: 5 },
    { tag: 'diminisher_optimist', text: 'The Optimist: My positive outlook can sometimes dismiss people\'s real concerns or make them feel their struggles aren\'t being heard.', order: 6 },
    { tag: 'diminisher_protector', text: 'The Protector: I shield my team from organizational politics, which may deprive them of important context and growth opportunities.', order: 7 },
    { tag: 'diminisher_strategist', text: 'The Strategist: I see the big picture clearly, which can lead me to provide too much direction rather than letting people discover the path themselves.', order: 8 }
  ];

  patterns.forEach(function(p) {
    DataService.createRecord('feedback_questions', {
      cycle_id: cycle.id,
      question_text: p.text,
      question_type: 'both',
      sort_order: String(p.order),
      is_required: 'true',
      discipline_tag: p.tag,
      created_at: now,
      updated_at: now
    });
  });

  Logger.log('Seeded Diminisher Self-Assessment with ' + patterns.length + ' patterns.');
}

/**
 * Seeds developmental_comfort scores on existing wellness check-ins.
 * Backfills ~60% of check-ins with realistic developmental comfort ratings.
 * Also creates a few developmental_strain alerts for testing.
 */
function seedWellnessDDOData() {
  var checkins = DataService.getRecords('wellness_checkins');
  if (checkins.length === 0) {
    Logger.log('No wellness check-ins found. Run seedWellnessData() first.');
    return;
  }

  // Check if already seeded
  var alreadySeeded = checkins.some(function(c) { return c.developmental_comfort && c.developmental_comfort !== ''; });
  if (alreadySeeded) {
    Logger.log('Wellness DDO data already seeded — skipping.');
    return;
  }

  var updated = 0;
  for (var i = 0; i < checkins.length; i++) {
    // Only backfill ~60% of check-ins (simulates optional nature)
    if (Math.random() > 0.6) continue;

    // Generate realistic developmental comfort scores:
    // Correlate loosely with overall score — lower wellness → lower dev comfort
    var overallScore = parseFloat(checkins[i].overall_score) || 3;
    var baseComfort = Math.round(overallScore);
    // Add some variance (-1 to +1)
    var variance = Math.floor(Math.random() * 3) - 1;
    var devComfort = Math.max(1, Math.min(5, baseComfort + variance));

    DataService.updateRecord('wellness_checkins', checkins[i].id, {
      developmental_comfort: String(devComfort)
    });
    updated++;
  }

  Logger.log('Seeded developmental_comfort on ' + updated + '/' + checkins.length + ' wellness check-ins.');
}
