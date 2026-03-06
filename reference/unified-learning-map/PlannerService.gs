// ============================================================================
// PLANNER SERVICE
// Student task dashboard + schedule data aggregation
// ============================================================================

/**
 * Get all planner data for the current student.
 * Aggregates tasks from Progress + Maps + MapAssignments,
 * applies personal sort order, and computes urgency flags.
 *
 * @returns {Object} {tasks: Array, stats: Object, scheduleData: Object|null}
 */
function getStudentPlannerData() {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  // Read data sources
  const allProgress = readAll_(SHEETS_.PROGRESS);
  const allMaps = readAll_(SHEETS_.MAPS);
  const allAssignments = readAll_(SHEETS_.MAP_ASSIGNMENTS);
  const studentRoster = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { studentEmail: email });
  const studentTaskOrder = findRowsFiltered_(SHEETS_.STUDENT_TASK_ORDER, { email: email });

  // Backward compat: try email column too
  if (studentRoster.length === 0) {
    const rosterByEmail = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { email: email });
    for (let r = 0; r < rosterByEmail.length; r++) studentRoster.push(rosterByEmail[r]);
  }

  return computeStudentPlanner_(email, allProgress, allMaps, allAssignments, studentRoster, studentTaskOrder);
}

/**
 * Private: compute student planner from pre-read data.
 * Extracted so getStudentBatchData() can share sheet reads.
 */
function computeStudentPlanner_(email, allProgress, allMaps, allAssignments, studentRoster, studentTaskOrder) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  // Filter progress for this student from pre-read data
  const studentProgress = [];
  for (let i = 0; i < allProgress.length; i++) {
    if (String(allProgress[i].email || '').toLowerCase() === email) {
      studentProgress.push(allProgress[i]);
    }
  }

  // 2. Get student's class enrollments
  const studentClasses = [];
  for (let i = 0; i < studentRoster.length; i++) {
    if (String(studentRoster[i].studentEmail || studentRoster[i].email || '').toLowerCase() === email &&
        studentRoster[i].status !== 'removed') {
      studentClasses.push(String(studentRoster[i].classId));
    }
  }

  // 3. Build map of mapId -> due date (from MapAssignments matching student's classes)
  const mapDueDates = {};
  for (let a = 0; a < allAssignments.length; a++) {
    const assign = allAssignments[a];
    if (studentClasses.indexOf(String(assign.classId)) !== -1 && assign.dueDate) {
      // If student is in multiple classes with same map, use earliest due date
      const existing = mapDueDates[String(assign.mapId)];
      if (!existing || assign.dueDate < existing) {
        // Normalize Date objects from Sheets to "YYYY-MM-DD" strings (matches hex JSON dueDate format)
        const dd = assign.dueDate;
        mapDueDates[String(assign.mapId)] = (dd instanceof Date) ? dd.toISOString().slice(0, 10) : String(dd);
      }
    }
  }

  // 4. Build maps lookup (mapId -> {title, hexes})
  const mapsById = {};
  for (let m = 0; m < allMaps.length; m++) {
    const map = allMaps[m];
    const hexes = safeJsonParse_(map.hexesJson, []);
    mapsById[String(map.mapId)] = {
      title: map.title || 'Untitled Map',
      hexes: hexes,
      hexById: {},
      meta: safeJsonParse_(map.metaJson, {})
    };
    for (let h = 0; h < hexes.length; h++) {
      mapsById[String(map.mapId)].hexById[String(hexes[h].id)] = hexes[h];
    }
  }

  // 5. Build task order lookup (already filtered to this student)
  const taskOrderKey = function(mapId, hexId) { return mapId + '|' + hexId; };
  const orderMap = {};
  for (let o = 0; o < studentTaskOrder.length; o++) {
    const ord = studentTaskOrder[o];
    orderMap[taskOrderKey(String(ord.mapId), String(ord.hexId))] = parseInt(ord.sortOrder, 10) || 0;
  }

  // 5b. Build per-map visibility sets for differentiation filtering
  const difVisibleSets = {};
  try {
    const myMemberships = findRowsFiltered_(SHEETS_.GROUP_MEMBERSHIPS, { studentEmail: email });
    const allHexAssigns = readAll_(SHEETS_.HEX_ASSIGNMENTS);

    // Get student's group IDs (already filtered to this student)
    const myGroupIds = {};
    for (let gm = 0; gm < myMemberships.length; gm++) {
      myGroupIds[String(myMemberships[gm].groupId)] = true;
    }

    // For each map that has differentiation enabled, compute visible hex IDs
    for (const mid in mapsById) {
      if (!mapsById.hasOwnProperty(mid)) continue;
      const mapMeta = mapsById[mid].meta || {};
      if (!mapMeta.differentiationMode || mapMeta.differentiationMode === 'none') continue;

      // Gather hex assignments for this map
      const hexGroupAssigns = {};  // hexId -> [{groupId, isRequired}]
      const hexStudentOverrides = {};  // hexId -> {visibility}
      const hexesWithAssigns = {};

      for (let ha = 0; ha < allHexAssigns.length; ha++) {
        const a = allHexAssigns[ha];
        if (String(a.mapId) !== mid) continue;
        const hid = String(a.hexId);

        if (a.groupId && !a.studentEmail) {
          if (!hexGroupAssigns[hid]) hexGroupAssigns[hid] = [];
          hexGroupAssigns[hid].push({ groupId: String(a.groupId) });
          hexesWithAssigns[hid] = true;
        } else if (a.studentEmail && !a.groupId && String(a.studentEmail).toLowerCase() === email) {
          const parts = String(a.isRequired).split('_');
          hexStudentOverrides[hid] = { visibility: parts[0] || 'show' };
        }
      }

      const visibleSet = {};
      const hexes = mapsById[mid].hexes || [];
      for (let h = 0; h < hexes.length; h++) {
        const hid = hexes[h].id;
        if (hexStudentOverrides[hid]) {
          if (hexStudentOverrides[hid].visibility === 'show') visibleSet[hid] = true;
          continue;
        }
        if (!hexesWithAssigns[hid]) { visibleSet[hid] = true; continue; }
        const groups = hexGroupAssigns[hid] || [];
        for (let g = 0; g < groups.length; g++) {
          if (myGroupIds[groups[g].groupId]) { visibleSet[hid] = true; break; }
        }
      }
      difVisibleSets[mid] = visibleSet;
    }
  } catch (e) {
    // If sheets don't exist yet, silently skip
    Logger.log('Differentiation planner filter skipped: ' + e.message);
  }

  // 6. Build tasks from student's Progress records (already filtered to this student)
  const tasks = [];
  for (let p = 0; p < studentProgress.length; p++) {
    const prog = studentProgress[p];
    const mapId = String(prog.mapId || '');
    const hexId = String(prog.hexId || '');
    const mapInfo = mapsById[mapId];
    if (!mapInfo) continue;

    const hex = mapInfo.hexById[hexId];
    if (!hex) continue;

    // Differentiation visibility filter: skip hidden hexes
    if (difVisibleSets[mapId] && !difVisibleSets[mapId][hexId]) continue;

    // Determine effective due date: hex-level takes priority, then map-level
    const hexDueDate = hex.dueDate || '';
    const mapDueDate = mapDueDates[mapId] || '';
    const effectiveDueDate = hexDueDate || mapDueDate;

    // Compute urgency flags
    let isOverdue = false;
    let isDueToday = false;
    let isDueThisWeek = false;
    const status = prog.status || 'not_started';

    if (effectiveDueDate && status !== 'completed' && status !== 'mastered') {
      const dueDate = new Date(effectiveDueDate + 'T23:59:59');
      const diffMs = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) isOverdue = true;
      else if (diffDays === 0) isDueToday = true;
      else if (diffDays <= 7) isDueThisWeek = true;
    }

    const key = taskOrderKey(mapId, hexId);
    const task = {
      hexId: hexId,
      hexLabel: hex.label || 'Untitled',
      hexIcon: hex.icon || '',
      hexType: hex.type || 'core',
      mapId: mapId,
      mapTitle: mapInfo.title,
      status: status,
      score: prog.score || '',
      maxScore: prog.maxScore || '',
      dueDate: hexDueDate,
      mapDueDate: mapDueDate,
      effectiveDueDate: effectiveDueDate,
      estimatedMinutes: hex.estimatedMinutes || 0,
      atlSkills: (hex.curriculum && hex.curriculum.atlSkills) || '',
      isResource: hex.type === 'resource',
      resourceType: (hex.type === 'resource' && hex.resourceConfig) ? (hex.resourceConfig.resourceType || '') : '',
      resourceUrl: (hex.type === 'resource' && hex.resourceConfig) ? (hex.resourceConfig.resourceUrl || '') : '',
      sortOrder: orderMap.hasOwnProperty(key) ? orderMap[key] : 9999,
      isOverdue: isOverdue,
      isDueToday: isDueToday,
      isDueThisWeek: isDueThisWeek
    };

    // Add lesson map context: if this task belongs to a lesson map, include parent info
    const mapMeta = mapInfo.meta || {};
    if (mapMeta.isLessonMap && mapMeta.parentMapId) {
      task.isLessonMapTask = true;
      task.parentMapId = String(mapMeta.parentMapId);
      task.parentHexId = mapMeta.parentHexId || '';
      task.lessonMapTitle = mapInfo.title;
      // Look up parent hex label from parent map
      const parentMapInfo = mapsById[String(mapMeta.parentMapId)];
      if (parentMapInfo && mapMeta.parentHexId) {
        const parentHex = parentMapInfo.hexById[String(mapMeta.parentHexId)];
        task.parentHexLabel = parentHex ? (parentHex.label || 'Lesson') : 'Lesson';
      } else {
        task.parentHexLabel = 'Lesson';
      }
    }

    tasks.push(task);
  }

  // 7. Sort tasks: custom order first, then urgency
  tasks.sort(function(a, b) {
    // Completed/mastered always at the end
    const aCompleted = (a.status === 'completed' || a.status === 'mastered') ? 1 : 0;
    const bCompleted = (b.status === 'completed' || b.status === 'mastered') ? 1 : 0;
    if (aCompleted !== bCompleted) return aCompleted - bCompleted;

    // Then by custom sort order
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;

    // Then by urgency (overdue > due today > due this week > upcoming > no deadline)
    const aUrgency = a.isOverdue ? 0 : (a.isDueToday ? 1 : (a.isDueThisWeek ? 2 : (a.effectiveDueDate ? 3 : 4)));
    const bUrgency = b.isOverdue ? 0 : (b.isDueToday ? 1 : (b.isDueThisWeek ? 2 : (b.effectiveDueDate ? 3 : 4)));
    if (aUrgency !== bUrgency) return aUrgency - bUrgency;

    // Then by due date ascending
    if (a.effectiveDueDate && b.effectiveDueDate) return a.effectiveDueDate.localeCompare(b.effectiveDueDate);
    return 0;
  });

  // 8. Compute stats
  let overdue = 0, dueToday = 0, dueThisWeek = 0, completed = 0;
  for (let t = 0; t < tasks.length; t++) {
    if (tasks[t].status === 'completed' || tasks[t].status === 'mastered') completed++;
    else if (tasks[t].isOverdue) overdue++;
    else if (tasks[t].isDueToday) dueToday++;
    else if (tasks[t].isDueThisWeek) dueThisWeek++;
  }

  // 9. Schedule data (populated in Sub-Story 3)
  let scheduleData = null;
  try {
    scheduleData = buildStudentSchedule_(email, todayStr, studentClasses, allAssignments, mapsById, tasks);
  } catch (e) {
    Logger.log('Schedule build error (non-fatal): ' + e.message);
  }

  return {
    tasks: tasks,
    stats: {
      total: tasks.length,
      completed: completed,
      overdue: overdue,
      dueToday: dueToday,
      dueThisWeek: dueThisWeek
    },
    scheduleData: scheduleData
  };
}

/**
 * Save student's personal task ordering.
 * Each student can only save their own order.
 *
 * @param {Array} orderData - Array of {mapId, hexId, sortOrder}
 * @returns {Object} {success: true, saved: number}
 */
function saveStudentTaskOrder(orderData) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!orderData || !Array.isArray(orderData)) {
    throw new Error('Order data must be an array');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const allOrders = readAll_(SHEETS_.STUDENT_TASK_ORDER);
    const timestamp = now_();

    // Remove existing orders for this student
    const filtered = allOrders.filter(function(o) {
      return String(o.email || '').toLowerCase() !== email;
    });

    // Add new orders
    for (let i = 0; i < orderData.length; i++) {
      const item = orderData[i];
      filtered.push({
        email: email,
        mapId: String(item.mapId || ''),
        hexId: String(item.hexId || ''),
        sortOrder: parseInt(item.sortOrder, 10) || 0,
        updatedAt: timestamp
      });
    }

    writeAll_(SHEETS_.STUDENT_TASK_ORDER, filtered);
    return { success: true, saved: orderData.length };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Build student's daily schedule from Waterfall Scheduler data.
 * Returns null if waterfall integration is not configured.
 *
 * @param {string} email - Student email
 * @param {string} dateStr - Date string YYYY-MM-DD
 * @param {Array} studentClasses - Array of classId strings
 * @param {Array} allAssignments - All MapAssignment records
 * @param {Object} mapsById - Maps lookup
 * @param {Array} tasks - Student tasks array
 * @returns {Object|null} Schedule data or null
 */
function buildStudentSchedule_(email, dateStr, studentClasses, allAssignments, mapsById, tasks) {
  // URL = enabled: check for waterfall URL presence
  const waterfallUrl = getConfigValue_('waterfallSpreadsheetUrl');
  if (!waterfallUrl) return null;

  const scheduleJson = getConfigValue_('waterfallScheduleJson');
  if (!scheduleJson) return null;

  let schedule;
  try {
    schedule = JSON.parse(scheduleJson);
  } catch (e) {
    Logger.log('Invalid waterfallScheduleJson: ' + e.message);
    return null;
  }

  if (!schedule.rotation || !schedule.bellSchedules || !schedule.teacherSchedules || !schedule.teachers) {
    return null;
  }

  // 1. Get student's enrolled classes → teacher emails
  const allClasses = readAll_(SHEETS_.CLASSES);
  const classTeachers = {};  // classId → { teacherEmail, className, subject }
  for (let c = 0; c < allClasses.length; c++) {
    const cls = allClasses[c];
    if (studentClasses.indexOf(String(cls.classId)) !== -1) {
      classTeachers[String(cls.classId)] = {
        teacherEmail: String(cls.teacherEmail || '').toLowerCase(),
        className: cls.className || cls.subject || 'Unknown',
        subject: cls.subject || ''
      };
    }
  }

  // 2. Build teacher email → Waterfall TeacherID lookup
  const emailToTeacherId = {};
  for (let t = 0; t < schedule.teachers.length; t++) {
    const teacher = schedule.teachers[t];
    if (teacher.Active === 'TRUE' || teacher.Active === 'true') {
      emailToTeacherId[String(teacher.Email || '').toLowerCase()] = teacher.TeacherID;
    }
  }

  // 3. Build TeacherID+Block → { Course, Room } lookup
  const teacherBlockMap = {};  // "T001|A1" → { Course, Room }
  for (let ts = 0; ts < schedule.teacherSchedules.length; ts++) {
    const entry = schedule.teacherSchedules[ts];
    const key = entry.TeacherID + '|' + entry.Block;
    teacherBlockMap[key] = {
      course: entry.Course || '',
      room: entry.Room || ''
    };
  }

  // 4. Find today's rotation entry
  let todayRotation = null;
  for (let r = 0; r < schedule.rotation.length; r++) {
    const rot = schedule.rotation[r];
    if (String(rot.Date) === dateStr) {
      todayRotation = rot;
      break;
    }
  }

  // Check holidays
  let isHoliday = false;
  let holidayName = '';
  if (todayRotation && (todayRotation.DayType === 'HOLIDAY' || todayRotation.DayType === 'NO-ROTATION')) {
    isHoliday = true;
    holidayName = todayRotation.Notes || todayRotation.DayType;
  }
  if (!todayRotation) {
    // Check if it's a holiday from the holidays list
    for (let h = 0; h < (schedule.holidays || []).length; h++) {
      if (String(schedule.holidays[h].Date) === dateStr) {
        isHoliday = true;
        holidayName = schedule.holidays[h].Name || 'Holiday';
        break;
      }
    }
  }

  // 5. Determine bell schedule for today
  // Check for override first, then use default based on school
  let bellSchedule = null;
  // Determine student's school from their teachers
  let studentSchool = 'HS'; // default
  for (const classId in classTeachers) {
    const tEmail = classTeachers[classId].teacherEmail;
    const tId = emailToTeacherId[tEmail];
    if (tId) {
      for (let t = 0; t < schedule.teachers.length; t++) {
        if (schedule.teachers[t].TeacherID === tId && schedule.teachers[t].School) {
          studentSchool = schedule.teachers[t].School;
          break;
        }
      }
      if (studentSchool !== 'HS') break;
    }
  }

  // Check overrides for today
  for (let ov = 0; ov < (schedule.scheduleOverrides || []).length; ov++) {
    const override = schedule.scheduleOverrides[ov];
    if (String(override.Date) === dateStr &&
        (override.School === studentSchool || override.School === 'BOTH')) {
      // Find the matching bell schedule
      for (let bs = 0; bs < schedule.bellSchedules.length; bs++) {
        if (schedule.bellSchedules[bs].ScheduleID === override.ScheduleID) {
          bellSchedule = schedule.bellSchedules[bs];
          break;
        }
      }
      break;
    }
  }

  // If no override, use default normal schedule
  if (!bellSchedule) {
    const normalId = studentSchool + '-NORMAL';
    for (let bs = 0; bs < schedule.bellSchedules.length; bs++) {
      if (schedule.bellSchedules[bs].ScheduleID === normalId) {
        bellSchedule = schedule.bellSchedules[bs];
        break;
      }
    }
    // Fallback: try first bell schedule matching school
    if (!bellSchedule) {
      for (let bs = 0; bs < schedule.bellSchedules.length; bs++) {
        if (schedule.bellSchedules[bs].School === studentSchool || schedule.bellSchedules[bs].School === 'BOTH') {
          bellSchedule = schedule.bellSchedules[bs];
          break;
        }
      }
    }
  }

  // 6. Build today's blocks
  const blocks = [];
  if (todayRotation && !isHoliday && bellSchedule) {
    const blockPositions = [
      { key: 'Block1', startKey: 'Block1Start', endKey: 'Block1End' },
      { key: 'Block2', startKey: 'Block2Start', endKey: 'Block2End' },
      { key: 'Block3', startKey: 'Block3Start', endKey: 'Block3End' },
      { key: 'Block4', startKey: 'Block4Start', endKey: 'Block4End' }
    ];

    for (let bp = 0; bp < blockPositions.length; bp++) {
      const pos = blockPositions[bp];
      const blockName = todayRotation[pos.key] || '';
      const startTime = bellSchedule[pos.startKey] || '';
      const endTime = bellSchedule[pos.endKey] || '';

      if (!blockName) continue;

      // Find which of the student's teachers teaches this block
      let matchedClass = null;
      let matchedRoom = '';
      let matchedCourse = '';

      for (const classId in classTeachers) {
        const info = classTeachers[classId];
        const tId = emailToTeacherId[info.teacherEmail];
        if (!tId) continue;

        const lookupKey = tId + '|' + blockName;
        if (teacherBlockMap[lookupKey]) {
          matchedClass = { classId: classId, className: info.className };
          matchedRoom = teacherBlockMap[lookupKey].room;
          matchedCourse = teacherBlockMap[lookupKey].course;
          break;
        }
      }

      // Find tasks for this class block
      const blockTasks = [];
      if (matchedClass) {
        // Find maps assigned to this class
        const classMapIds = [];
        for (let a = 0; a < allAssignments.length; a++) {
          if (String(allAssignments[a].classId) === matchedClass.classId) {
            classMapIds.push(String(allAssignments[a].mapId));
          }
        }
        // Find tasks from those maps
        for (let tk = 0; tk < tasks.length; tk++) {
          if (classMapIds.indexOf(tasks[tk].mapId) !== -1 &&
              tasks[tk].status !== 'completed' && tasks[tk].status !== 'mastered') {
            blockTasks.push({
              hexLabel: tasks[tk].hexLabel,
              hexId: tasks[tk].hexId,
              mapId: tasks[tk].mapId,
              status: tasks[tk].status
            });
          }
        }
      }

      blocks.push({
        position: bp + 1,
        blockName: blockName,
        startTime: startTime,
        endTime: endTime,
        className: matchedClass ? (matchedCourse || matchedClass.className) : '',
        room: matchedRoom,
        classId: matchedClass ? matchedClass.classId : '',
        hasClass: !!matchedClass,
        tasks: blockTasks.slice(0, 5)  // limit to 5 tasks per block
      });
    }
  }

  // 7. Build week overview (5 days from today's Monday)
  const todayDate = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = todayDate.getDay();  // 0=Sun, 1=Mon, ...
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const weekDays = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  for (let d = 0; d < 5; d++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + d);
    const dayStr = day.toISOString().split('T')[0];

    let dayType = '';
    let dayIsHoliday = false;
    let dayHolidayName = '';

    // Find rotation for this day
    for (let r = 0; r < schedule.rotation.length; r++) {
      if (String(schedule.rotation[r].Date) === dayStr) {
        dayType = schedule.rotation[r].DayType || '';
        if (dayType === 'HOLIDAY' || dayType === 'NO-ROTATION') {
          dayIsHoliday = true;
          dayHolidayName = schedule.rotation[r].Notes || dayType;
        }
        break;
      }
    }

    weekDays.push({
      date: dayStr,
      dayName: dayNames[d],
      dayType: dayType,
      isHoliday: dayIsHoliday,
      holidayName: dayHolidayName,
      isToday: dayStr === dateStr
    });
  }

  return {
    enabled: true,
    today: {
      date: dateStr,
      dayType: todayRotation ? todayRotation.DayType : '',
      isHoliday: isHoliday,
      holidayName: holidayName,
      blocks: blocks
    },
    week: weekDays
  };
}
