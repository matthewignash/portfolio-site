/**
 * WaterfallService.gs
 * Backend logic for the Waterfall Schedule widget (read-only).
 *
 * This service reads from the EXISTING waterfall scheduler's Google Sheet
 * (not the Dashboard's sheet). The scheduler sheet ID is stored in script
 * properties as 'WATERFALL_SPREADSHEET_ID'.
 *
 * It reads from these tabs of the scheduler sheet:
 *   - RotationSchedule: Date, DayType, Block1, Block2, Block3, Block4, Notes
 *   - BellSchedules: ScheduleID, Name, School, Block1Start..Block4End
 *   - ScheduleOverrides: Date, School, ScheduleID, Reason
 *   - Holidays: Date, Name, Type
 *   - NonRotationDays: Date, Reason
 */

const WaterfallService = (function() {

  let cachedSchedulerSheet = null;

  /**
   * Open the waterfall scheduler's spreadsheet (read-only access).
   * @returns {Spreadsheet}
   */
  function getSchedulerSheet() {
    if (cachedSchedulerSheet) return cachedSchedulerSheet;

    const props = PropertiesService.getScriptProperties();
    const ssId = props.getProperty('WATERFALL_SPREADSHEET_ID');
    if (!ssId) {
      throw new Error('Waterfall scheduler sheet not configured. Set WATERFALL_SPREADSHEET_ID in script properties.');
    }
    cachedSchedulerSheet = SpreadsheetApp.openById(ssId);
    return cachedSchedulerSheet;
  }

  /**
   * Read all data from a tab in the scheduler sheet as array of objects.
   * @param {string} sheetName
   * @returns {Array<Object>}
   */
  function readSchedulerTab(sheetName) {
    const ss = getSchedulerSheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0];
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((header, index) => {
        let value = data[i][index];
        if (value instanceof Date) {
          value = formatDateString(value);
        }
        // Handle Time objects (bell schedule times may come as Date objects)
        row[header] = value;
      });
      rows.push(row);
    }
    return rows;
  }

  /**
   * Format a time value: handles Date objects, strings, numbers.
   * @param {*} time
   * @returns {string} HH:MM format
   */
  function formatTimeValue(time) {
    if (!time) return '';
    if (time instanceof Date) {
      const h = time.getHours().toString().padStart(2, '0');
      const m = time.getMinutes().toString().padStart(2, '0');
      return h + ':' + m;
    }
    return time.toString();
  }

  /**
   * Get the bell schedule for a given date and school.
   * Checks ScheduleOverrides first, then falls back to default.
   * @param {string} date - YYYY-MM-DD
   * @param {string} school - 'HS' or 'MS'
   * @returns {Object} bell schedule row with Block1Start..Block4End
   */
  function getBellScheduleForDate(date, school) {
    // Check for override
    const overrides = readSchedulerTab('ScheduleOverrides');
    const override = overrides.find(o => o.Date === date && o.School === school);

    const bellSchedules = readSchedulerTab('BellSchedules');

    if (override && override.ScheduleID) {
      const schedule = bellSchedules.find(bs => bs.ScheduleID === override.ScheduleID);
      if (schedule) return schedule;
    }

    // Default schedule
    const defaultId = school === 'HS' ? 'HS-NORMAL' : 'MS-NORMAL';
    return bellSchedules.find(bs => bs.ScheduleID === defaultId) || null;
  }

  /**
   * Build a schedule entry for a single date.
   * @param {Object} rotation - row from RotationSchedule
   * @param {string} school - 'HS' or 'MS'
   * @returns {Object} schedule entry for the frontend
   */
  function buildDayEntry(rotation, school) {
    const date = rotation.Date;

    // Holiday or non-rotation
    if (rotation.DayType === 'HOLIDAY' || rotation.DayType === 'NO-ROTATION') {
      return {
        date: date,
        dayType: rotation.DayType,
        type: rotation.DayType,
        blocks: [],
        notes: rotation.Notes || '',
        noSchool: true,
        reason: rotation.Notes || rotation.DayType
      };
    }

    // Normal school day — get bell times
    const bell = getBellScheduleForDate(date, school);
    const bellTimes = {};
    if (bell) {
      for (let i = 1; i <= 4; i++) {
        bellTimes['Block' + i + 'Start'] = formatTimeValue(bell['Block' + i + 'Start']);
        bellTimes['Block' + i + 'End']   = formatTimeValue(bell['Block' + i + 'End']);
      }
    }

    // Determine A/B type from DayType label (e.g., 'A1' → 'A', 'B5' → 'B')
    const typeChar = (rotation.DayType || '').charAt(0);

    return {
      date: date,
      dayType: rotation.DayType,
      type: typeChar,
      blocks: [rotation.Block1, rotation.Block2, rotation.Block3, rotation.Block4],
      notes: rotation.Notes || '',
      bellTimes: bellTimes
    };
  }

  /**
   * Get today's schedule for a given school.
   * @param {string} school - 'HS' or 'MS'
   * @returns {Object} schedule entry, or { noSchool: true } for weekends
   */
  function getTodaySchedule(school) {
    try {
      const todayStr = formatDateString(new Date());
      const today = new Date();
      const dow = today.getDay();

      // Weekend
      if (dow === 0 || dow === 6) {
        return {
          date: todayStr,
          noSchool: true,
          reason: 'Weekend'
        };
      }

      const schedule = readSchedulerTab('RotationSchedule');
      const entry = schedule.find(s => s.Date === todayStr);

      if (!entry) {
        return {
          date: todayStr,
          noSchool: true,
          reason: 'No schedule data for today'
        };
      }

      return buildDayEntry(entry, school);
    } catch (error) {
      logError('getTodaySchedule', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get the weekly schedule (Mon-Fri) for the week containing weekOfDate.
   * @param {string} weekOfDate - any date in the target week (YYYY-MM-DD)
   * @param {string} school - 'HS' or 'MS'
   * @returns {Array<Object>} 5 schedule entries (Mon-Fri)
   */
  function getWeekSchedule(weekOfDate, school) {
    try {
      const refDate = parseDateString(weekOfDate);
      const monday = getWeekStart(refDate);
      const schedule = readSchedulerTab('RotationSchedule');

      const weekEntries = [];
      for (let d = 0; d < 5; d++) {
        const dayDate = addDays(monday, d);
        const dayStr = formatDateString(dayDate);
        const entry = schedule.find(s => s.Date === dayStr);

        if (entry) {
          weekEntries.push(buildDayEntry(entry, school));
        } else {
          weekEntries.push({
            date: dayStr,
            noSchool: true,
            reason: 'No data'
          });
        }
      }

      return weekEntries;
    } catch (error) {
      logError('getWeekSchedule', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get teacher schedules for a given date and school.
   * Merges rotation data, bell times, and teacher-block assignments.
   * Includes departmentEmails from dashboard Config for client-side filtering.
   * @param {string} date - YYYY-MM-DD
   * @param {string} school - 'HS' or 'MS'
   * @returns {Object} { date, dayType, noSchool, periods[], departmentEmails[] }
   */
  function getTeacherSchedules(date, school) {
    try {
      // Get rotation for the date
      const schedule = readSchedulerTab('RotationSchedule');
      const rotation = schedule.find(s => s.Date === date);

      if (!rotation || rotation.DayType === 'HOLIDAY' || rotation.DayType === 'NO-ROTATION') {
        return {
          date: date,
          dayType: rotation ? rotation.DayType : 'NONE',
          noSchool: true,
          reason: rotation ? (rotation.Notes || rotation.DayType) : 'No schedule data',
          periods: [],
          departmentEmails: getDepartmentEmails()
        };
      }

      // Get bell times
      const bell = getBellScheduleForDate(date, school);

      // Get active teachers filtered by school
      const allTeachers = readSchedulerTab('Teachers');
      const activeTeachers = allTeachers.filter(function(t) {
        var isActive = t.Active === true || t.Active === 'TRUE' || t.Active === 'true';
        var matchesSchool = t.School === school || t.School === 'BOTH';
        return isActive && matchesSchool;
      });

      // Build teacher lookup by ID
      var teacherMap = {};
      activeTeachers.forEach(function(t) {
        teacherMap[t.TeacherID] = t;
      });

      // Get all teacher-block assignments
      const teacherSchedules = readSchedulerTab('TeacherSchedules');

      // Build periods
      var blocks = [rotation.Block1, rotation.Block2, rotation.Block3, rotation.Block4];
      var periods = [];

      for (var i = 0; i < 4; i++) {
        var blockName = blocks[i];
        var startTime = bell ? formatTimeValue(bell['Block' + (i + 1) + 'Start']) : '';
        var endTime = bell ? formatTimeValue(bell['Block' + (i + 1) + 'End']) : '';

        // Find teachers teaching this block
        var periodTeachers = [];
        teacherSchedules.forEach(function(ts) {
          if (ts.Block === blockName && teacherMap[ts.TeacherID]) {
            var teacher = teacherMap[ts.TeacherID];
            periodTeachers.push({
              name: teacher.Name || '',
              email: teacher.Email || '',
              course: ts.Course || '',
              room: ts.Room || ''
            });
          }
        });

        // Sort alphabetically by name
        periodTeachers.sort(function(a, b) {
          return (a.name || '').localeCompare(b.name || '');
        });

        periods.push({
          period: i + 1,
          block: blockName,
          startTime: startTime,
          endTime: endTime,
          teachers: periodTeachers
        });
      }

      return {
        date: date,
        dayType: rotation.DayType,
        noSchool: false,
        periods: periods,
        departmentEmails: getDepartmentEmails()
      };
    } catch (error) {
      logError('getTeacherSchedules', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get department member emails from the dashboard's Config tab.
   * @returns {Array<string>}
   */
  function getDepartmentEmails() {
    try {
      var raw = DataService.getConfigValue('DepartmentMembers') || '';
      return raw.split(',').map(function(e) { return e.trim().toLowerCase(); }).filter(function(e) { return e.length > 0; });
    } catch (e) {
      return [];
    }
  }

  /**
   * Get schedule data for an entire month.
   * @param {number} year - e.g. 2026
   * @param {number} month - 1-indexed (1=Jan, 12=Dec)
   * @param {string} school - 'HS' or 'MS'
   * @returns {Array<Object>} array of day entries for each day of the month
   */
  function getMonthSchedule(year, month, school) {
    try {
      const schedule = readSchedulerTab('RotationSchedule');
      const daysInMonth = new Date(year, month, 0).getDate();
      const entries = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month - 1, d);
        const dateStr = formatDateString(dateObj);
        const dow = dateObj.getDay();

        // Weekend
        if (dow === 0 || dow === 6) {
          entries.push({
            date: dateStr,
            noSchool: true,
            dayType: 'NONE',
            blocks: [],
            notes: ''
          });
          continue;
        }

        const rotation = schedule.find(function(s) { return s.Date === dateStr; });
        if (rotation) {
          entries.push(buildDayEntry(rotation, school));
        } else {
          entries.push({
            date: dateStr,
            noSchool: true,
            dayType: 'NONE',
            blocks: [],
            notes: ''
          });
        }
      }

      return entries;
    } catch (error) {
      logError('getMonthSchedule', error);
      throw new Error(error.message);
    }
  }

  return { getTodaySchedule, getWeekSchedule, getTeacherSchedules, getMonthSchedule };
})();
