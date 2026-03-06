/**
 * WebAppServer.gs — Web App Entry Point + Auth + Endpoint Wrappers
 *
 * Story 1: Shell + Auth + Role Routing
 *
 * Auth helpers live here (not in Db.gs) to keep the existing data layer untouched.
 * All webapp_* functions wrap existing api_* functions with auth checks.
 */

// ============================================================================
// HTML template helper
// ============================================================================

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================================
// Auth helpers
// ============================================================================

/**
 * Get teacher email(s) from Config tab.
 * Supports comma-separated list for future multi-teacher use.
 */
function getTeacherEmails_() {
  var raw = getConfig_("teacher_email", "");
  return raw.split(",").map(function(e) { return e.trim().toLowerCase(); }).filter(Boolean);
}

/**
 * Determine user role from email.
 * Checks teacher list first, then Students sheet (which has email column).
 */
function getRole_(email) {
  var e = String(email || "").trim().toLowerCase();
  if (!e) return "none";

  var teachers = getTeacherEmails_();
  if (teachers.indexOf(e) !== -1) return "teacher";

  var students = readAll_(SHEETS_.STUDENTS);
  var found = students.find(function(r) {
    return String(r.email || "").trim().toLowerCase() === e;
  });
  if (found) return "student";

  return "none";
}

/**
 * Look up student record by email from Students sheet.
 */
function emailToStudent_(email) {
  var e = String(email || "").trim().toLowerCase();
  if (!e) return null;

  var students = readAll_(SHEETS_.STUDENTS);
  var found = students.find(function(r) {
    return String(r.email || "").trim().toLowerCase() === e;
  });

  if (!found) return null;

  return {
    student_key: String(found.student_key || ""),
    last_name: String(found.last_name || ""),
    first_name: String(found.first_name || ""),
    class_section: String(found.class_section || ""),
    email: e,
    level: String(found.level || "")
  };
}

/**
 * Check if email belongs to the allowed domain.
 * If no domain is configured, all domains are allowed.
 */
function isAllowedDomain_(email) {
  var allowedDomain = getConfig_("allowed_domain", "").replace(/^@/, "");
  if (!allowedDomain) return true;

  var e = String(email || "").trim().toLowerCase();
  if (!e) return false;

  return e.endsWith("@" + allowedDomain.toLowerCase());
}

/**
 * Auth guard: throws if caller is not a teacher.
 * Returns the teacher's email on success.
 */
function requireTeacher_() {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error("Not authenticated");
  if (getRole_(email) !== "teacher") throw new Error("Access denied: teacher only");
  return email;
}

/**
 * Concurrency wrapper using LockService.
 * All write operations should be wrapped with this.
 */
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    return fn();
  } catch (e) {
    if (String(e.message || "").indexOf("lock") !== -1) {
      throw new Error("Server is busy — please try again in a moment.");
    }
    throw e;
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// ============================================================================
// Access logging — non-blocking (Story 12)
// ============================================================================

/**
 * Non-blocking access log. Wrapped in try-catch so failures never
 * break the calling request.
 */
function logAccess_(email, role, action, details) {
  try {
    var sh = sheet_(SHEETS_.ACCESS_LOG);
    sh.appendRow([
      new Date().toISOString(),
      String(email || ""),
      String(role || ""),
      String(action || ""),
      String(details || ""),
      ""
    ]);
  } catch (_) {
    // Swallow — logging must never break the request
  }
}

// ============================================================================
// Permission checks — granular exam access (Story 12)
// ============================================================================

/**
 * Check if a student has access to a specific exam based on PERMISSIONS sheet.
 * If no PERMISSIONS rows exist, default is "allow all".
 * Deny takes precedence over allow.
 */
function checkExamPermission_(studentKey, classSection, examId) {
  try {
    var rows = readAll_(SHEETS_.PERMISSIONS);
    if (!rows || rows.length === 0) return true;

    var eid = String(examId || "").trim();
    var sk = String(studentKey || "").trim();
    var cls = String(classSection || "").trim();

    // Filter to rows about this exam
    var examRows = rows.filter(function(r) {
      return String(r.resource_type || "") === "exam" &&
             String(r.resource_id || "").trim() === eid;
    });
    if (examRows.length === 0) return true;

    // Check for deny rules first (deny wins)
    var isDenied = examRows.some(function(r) {
      if (String(r.access || "") !== "deny") return false;
      var st = String(r.scope_type || "");
      var sv = String(r.scope_value || "").trim();
      if (st === "student" && sv === sk) return true;
      if (st === "class" && sv === cls) return true;
      if (st === "all") return true;
      return false;
    });
    if (isDenied) return false;

    // Check for allow rules
    var hasAllowRules = examRows.some(function(r) {
      return String(r.access || "") === "allow";
    });
    if (!hasAllowRules) return true;

    var isAllowed = examRows.some(function(r) {
      if (String(r.access || "") !== "allow") return false;
      var st = String(r.scope_type || "");
      var sv = String(r.scope_value || "").trim();
      if (st === "student" && sv === sk) return true;
      if (st === "class" && sv === cls) return true;
      if (st === "all") return true;
      return false;
    });

    return isAllowed;
  } catch (_) {
    return true; // Fail open
  }
}

// ============================================================================
// Web app entry point
// ============================================================================

function doGet(e) {
  var email = Session.getActiveUser().getEmail();
  var userData;

  // Domain restriction check
  if (email && !isAllowedDomain_(email)) {
    var allowedDomain = getConfig_("allowed_domain", "").replace(/^@/, "");
    return HtmlService.createHtmlOutput(
      "<!DOCTYPE html><html><head><title>Access Denied</title>" +
      "<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;" +
      "align-items:center;min-height:100vh;margin:0;background:#f9fafb;}" +
      ".card{background:#fff;border-radius:12px;padding:40px;max-width:400px;" +
      "text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.1);}" +
      "h1{color:#991b1b;font-size:24px;}p{color:#6b7280;}</style></head>" +
      "<body><div class='card'><h1>Access Denied</h1>" +
      "<p>This app is restricted to <strong>@" + allowedDomain + "</strong> accounts.</p>" +
      "<p>You are signed in as: " + email + "</p></div></body></html>"
    ).setTitle("Access Denied");
  }

  if (!email) {
    userData = {
      role: "none",
      email: "(unable to detect identity — use a real deployment URL)"
    };
  } else {
    var role = getRole_(email);
    if (role === "teacher") {
      userData = { role: "teacher", name: "Teacher", email: email };
    } else if (role === "student") {
      var student = emailToStudent_(email);
      userData = {
        role: "student",
        name: (student && student.first_name) ? student.first_name : "Student",
        student_key: student ? student.student_key : "",
        class_section: student ? student.class_section : "",
        level: student ? (student.level || "") : "",
        email: email
      };
    } else {
      userData = { role: "none", email: email };
    }
    logAccess_(email, role, "login", "");
  }

  var template = HtmlService.createTemplateFromFile("WebAppUi");
  template.userData = JSON.stringify(userData);

  return template.evaluate()
    .setTitle("IB Chemistry Assessment Tracker")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

// ============================================================================
// webapp_* endpoints — read-only (any authenticated user)
// ============================================================================

function webapp_bootstrap() {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error("Not authenticated");
  var role = getRole_(email);
  if (role === "none") throw new Error("Access denied");
  var data = api_bootstrap();
  // Students only see visible exams (Story 9)
  if (role === "student") {
    data.exams = (data.exams || []).filter(function(e) {
      return String(e.status || "").toLowerCase() === "visible";
    });

    // SL/HL level filtering (Story 12)
    var studentInfo = emailToStudent_(email);
    if (studentInfo) {
      var studentLevel = String(studentInfo.level || "").toUpperCase();
      if (studentLevel) {
        data.exams = data.exams.filter(function(e) {
          var examLevel = String(e.level || "").toUpperCase();
          return !examLevel || examLevel === studentLevel;
        });
      }

      // Granular permission filtering (Story 12)
      data.exams = data.exams.filter(function(e) {
        return checkExamPermission_(studentInfo.student_key, studentInfo.class_section, String(e.exam_id));
      });
    }
  }
  return data;
}

// ============================================================================
// Story 16: View-as-Student — teacher-only bootstrap with student filtering
// ============================================================================

/**
 * Teacher-only: Bootstrap data filtered as if the specified student were viewing.
 * Applies visibility, level, and permission filters.
 */
function webapp_bootstrapAsStudent(studentKey) {
  requireTeacher_();
  var sk = String(studentKey || "").trim();
  if (!sk) throw new Error("studentKey is required");

  var students = readAll_(SHEETS_.STUDENTS);
  var student = students.find(function(s) {
    return String(s.student_key || "").trim() === sk;
  });
  if (!student) throw new Error("Student not found");

  var data = api_bootstrap();

  // Apply same filtering as student path in webapp_bootstrap
  data.exams = (data.exams || []).filter(function(e) {
    return String(e.status || "").toLowerCase() === "visible";
  });

  var studentLevel = String(student.level || "").toUpperCase();
  if (studentLevel) {
    data.exams = data.exams.filter(function(e) {
      var examLevel = String(e.level || "").toUpperCase();
      return !examLevel || examLevel === studentLevel;
    });
  }

  data.exams = data.exams.filter(function(e) {
    return checkExamPermission_(sk, String(student.class_section || ""), String(e.exam_id));
  });

  return data;
}

// ============================================================================
// webapp_* endpoints — student-facing (derive student_key from session)
// ============================================================================

/**
 * Get student dashboard data for a specific exam.
 * Student can only see their own data (student_key derived from session email).
 */
function webapp_getStudentDashboard(examId) {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error("Not authenticated");

  var student = emailToStudent_(email);
  if (!student) throw new Error("Not enrolled — your email is not in the student roster. Please contact your teacher.");

  logAccess_(email, "student", "view_dashboard", "exam=" + examId);

  // Check exam visibility (Story 9)
  var exams = readAll_(SHEETS_.EXAMS);
  var exam = exams.find(function(e) { return String(e.exam_id) === String(examId || "").trim(); });
  if (!exam || String(exam.status || "").toLowerCase() !== "visible") {
    throw new Error("This exam is not currently available.");
  }

  // SL/HL level check (Story 12)
  if (student.level) {
    var studentLvl = student.level.toUpperCase();
    var examLvl = String(exam.level || "").toUpperCase();
    if (examLvl && examLvl !== studentLvl) {
      throw new Error("This exam is not available for your level.");
    }
  }

  // Permission check (Story 12)
  if (!checkExamPermission_(student.student_key, student.class_section, examId)) {
    throw new Error("You do not have access to this exam.");
  }

  var data = api_getStudentReportData(examId, student.student_key);

  // Story 13: Attach question content if show_questions is enabled
  if (String(exam.show_questions || "").toLowerCase() === "true") {
    data.showQuestions = true;
    data.questionContent = api_getExamContentBulk(examId);
  }

  return data;
}

/**
 * Get student scores across all exams for trend view.
 * Returns array of score rows enriched with exam name and level.
 */
function webapp_getStudentTrendData() {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error("Not authenticated");

  var student = emailToStudent_(email);
  if (!student) throw new Error("Not enrolled — your email is not in the student roster. Please contact your teacher.");

  logAccess_(email, "student", "view_trend", "");

  var sk = student.student_key;
  var allScores = readAll_(SHEETS_.SCORES_ALL).filter(function(s) {
    return String(s.student_key) === sk;
  });

  // Join exam name + level from Exams sheet
  var exams = readAll_(SHEETS_.EXAMS);
  var examMap = {};
  exams.forEach(function(e) {
    examMap[String(e.exam_id)] = e;
  });

  var result = allScores.map(function(s) {
    var ex = examMap[String(s.exam_id)] || {};
    return {
      exam_id: String(s.exam_id || ""),
      exam_name: String(ex.exam_name || s.exam_id || ""),
      level: String(ex.level || ""),
      date: String(ex.date || ""),
      total_points: Number(s.total_points || 0),
      ku_points: Number(s.ku_points || 0),
      tt_points: Number(s.tt_points || 0),
      c_points: Number(s.c_points || 0),
      ib_grade: String(s.ib_grade || s.overall_band || ""),
      ku_band: String(s.ku_band || ""),
      tt_band: String(s.tt_band || ""),
      c_band: String(s.c_band || "")
    };
  });

  // Filter to only visible exams (Story 9)
  result = result.filter(function(r) {
    var ex = examMap[r.exam_id] || {};
    return String(ex.status || "").toLowerCase() === "visible";
  });

  // SL/HL level filter (Story 12)
  if (student.level) {
    var sl = student.level.toUpperCase();
    result = result.filter(function(r) {
      var el = r.level.toUpperCase();
      return !el || el === sl;
    });
  }

  // Permission filter (Story 12)
  result = result.filter(function(r) {
    return checkExamPermission_(sk, student.class_section, r.exam_id);
  });

  // Sort by date, then exam_id as fallback
  result.sort(function(a, b) {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    return a.exam_id.localeCompare(b.exam_id);
  });

  return result;
}

/**
 * Teacher-only: Get student trend data for a specified student.
 * Mirrors webapp_getStudentTrendData logic but with explicit student key.
 */
function webapp_getStudentTrendDataAsTeacher(studentKey) {
  var email = requireTeacher_();
  var sk = String(studentKey || "").trim();
  if (!sk) throw new Error("studentKey is required");

  logAccess_(email, "teacher", "preview_trend", "student=" + sk);

  var students = readAll_(SHEETS_.STUDENTS);
  var student = students.find(function(s) {
    return String(s.student_key || "").trim() === sk;
  });
  if (!student) throw new Error("Student not found");

  var allScores = readAll_(SHEETS_.SCORES_ALL).filter(function(s) {
    return String(s.student_key) === sk;
  });

  var exams = readAll_(SHEETS_.EXAMS);
  var examMap = {};
  exams.forEach(function(e) { examMap[String(e.exam_id)] = e; });

  var result = allScores.map(function(s) {
    var ex = examMap[String(s.exam_id)] || {};
    return {
      exam_id: String(s.exam_id || ""),
      exam_name: String(ex.exam_name || s.exam_id || ""),
      level: String(ex.level || ""),
      date: String(ex.date || ""),
      total_points: Number(s.total_points || 0),
      ku_points: Number(s.ku_points || 0),
      tt_points: Number(s.tt_points || 0),
      c_points: Number(s.c_points || 0),
      ib_grade: String(s.ib_grade || s.overall_band || ""),
      ku_band: String(s.ku_band || ""),
      tt_band: String(s.tt_band || ""),
      c_band: String(s.c_band || "")
    };
  });

  // Filter to only visible exams
  result = result.filter(function(r) {
    var ex = examMap[r.exam_id] || {};
    return String(ex.status || "").toLowerCase() === "visible";
  });

  if (student.level) {
    var sl = String(student.level).toUpperCase();
    result = result.filter(function(r) {
      var el = r.level.toUpperCase();
      return !el || el === sl;
    });
  }

  result = result.filter(function(r) {
    return checkExamPermission_(sk, String(student.class_section || ""), r.exam_id);
  });

  result.sort(function(a, b) {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    return a.exam_id.localeCompare(b.exam_id);
  });

  return result;
}

/**
 * Teacher-only: Get all students for the View-as-Student selector.
 */
function webapp_getAllStudents() {
  requireTeacher_();
  var students = readAll_(SHEETS_.STUDENTS);
  return students
    .filter(function(s) { return String(s.student_key || "").trim(); })
    .map(function(s) {
      return {
        student_key: String(s.student_key || ""),
        first_name: String(s.first_name || ""),
        last_name: String(s.last_name || ""),
        class_section: String(s.class_section || ""),
        level: String(s.level || ""),
        email: String(s.email || "")
      };
    })
    .sort(function(a, b) {
      var c = a.class_section.localeCompare(b.class_section);
      if (c !== 0) return c;
      var l = a.last_name.localeCompare(b.last_name);
      if (l !== 0) return l;
      return a.first_name.localeCompare(b.first_name);
    });
}

// ============================================================================
// webapp_* endpoints — teacher-only (write operations use withLock_)
// ============================================================================

// --- Exam management ---
function webapp_createExam(exam) {
  requireTeacher_();
  return withLock_(function() { return api_createExam(exam); });
}

function webapp_setActiveExam(examId) {
  requireTeacher_();
  return withLock_(function() { return api_setActiveExam(examId); });
}

function webapp_updateExamLevel(examId, level) {
  requireTeacher_();
  return withLock_(function() { return api_updateExamLevel(examId, level); });
}

// --- Exam visibility (Story 9) ---
function webapp_setExamVisibility(examId, status) {
  requireTeacher_();
  return withLock_(function() { return api_setExamVisibility(examId, status); });
}

function webapp_bulkSetExamVisibility(examIds, status) {
  requireTeacher_();
  return withLock_(function() { return api_bulkSetExamVisibility(examIds, status); });
}

// --- Paper 1A builder ---
function webapp_setPaper1ACount(payload) {
  requireTeacher_();
  return withLock_(function() { return api_setPaper1ACount(payload); });
}

function webapp_savePaper1ATable(payload) {
  requireTeacher_();
  return withLock_(function() { return api_savePaper1ATable(payload); });
}

// --- Paper 1B/2 builder ---
function webapp_addPaperRoot(payload) {
  requireTeacher_();
  return withLock_(function() { return api_addPaperRoot(payload); });
}

function webapp_addPaperPart(payload) {
  requireTeacher_();
  return withLock_(function() { return api_addPaperPart(payload); });
}

function webapp_savePaperParts(payload) {
  requireTeacher_();
  return withLock_(function() { return api_savePaperParts(payload); });
}

// --- Rubrics ---
function webapp_replaceRubricItems(payload) {
  requireTeacher_();
  return withLock_(function() { return api_replaceRubricItems(payload); });
}

// --- Grade bands ---
function webapp_saveGradeBands(payload) {
  requireTeacher_();
  return withLock_(function() { return api_saveGradeBands(payload); });
}

// --- Grading / responses ---
function webapp_savePaper1ABatch(payload) {
  requireTeacher_();
  return withLock_(function() { return api_savePaper1ABatch(payload); });
}

function webapp_saveResponse(payload) {
  requireTeacher_();
  return withLock_(function() { return api_saveResponse(payload); });
}

// --- Scoring ---
function webapp_recomputeExam(examId, classSection) {
  requireTeacher_();
  return withLock_(function() { return api_recomputeExam(examId, classSection); });
}

// --- Reports ---
function webapp_generateStudentReport(examId, studentKey, folderId, options) {
  requireTeacher_();
  return api_generateStudentReport(examId, studentKey, folderId, options);
}

function webapp_generateBatchReports(examId, studentKeys, folderId) {
  requireTeacher_();
  return api_generateBatchReports(examId, studentKeys, folderId);
}

function webapp_createExamReportFolder(examId, examName, parentFolderId) {
  requireTeacher_();
  return withLock_(function() { return api_createExamReportFolder(examId, examName, parentFolderId); });
}

function webapp_getPickerConfig() {
  requireTeacher_();
  return api_getPickerConfig();
}

// --- Teacher-only read endpoints ---
function webapp_listPaperRoots(examId, paper) {
  requireTeacher_();
  return api_listPaperRoots(examId, paper);
}

function webapp_getPaperParts(examId, paper) {
  requireTeacher_();
  return api_getPaperParts(examId, paper);
}

function webapp_getChecklistQids(examId) {
  requireTeacher_();
  return api_getChecklistQids(examId);
}

function webapp_getRubricItems(examId, qid) {
  requireTeacher_();
  return api_getRubricItems(examId, qid);
}

function webapp_getPaper1ATable(examId) {
  requireTeacher_();
  return api_getPaper1ATable(examId);
}

function webapp_getRosterByClass(cls) {
  requireTeacher_();
  return api_getRosterByClass(cls);
}

function webapp_getPaperQuestionRenderModel(examId, paper) {
  requireTeacher_();
  return api_getPaperQuestionRenderModel(examId, paper);
}

function webapp_getPaperMarkingModel(examId, paper, student_key) {
  requireTeacher_();
  return api_getPaperMarkingModel(examId, paper, student_key);
}

function webapp_getBandDistributions(examId, classSection) {
  requireTeacher_();
  return api_getBandDistributions(examId, classSection);
}

/**
 * Story 4: Get per-student score rows for class overview table.
 * Returns full score data (points + bands) filtered by exam and optional class.
 */
function webapp_getClassScores(examId, classSection) {
  requireTeacher_();
  var exam_id = String(examId || "").trim();
  var cls = String(classSection || "").trim();
  return readAll_(SHEETS_.SCORES_CURRENT)
    .filter(function(r) {
      return String(r.exam_id) === exam_id && (!cls || String(r.class_section) === cls);
    })
    .map(function(r) {
      return {
        student_key: String(r.student_key || ""),
        last_name: String(r.last_name || ""),
        first_name: String(r.first_name || ""),
        class_section: String(r.class_section || ""),
        total_points: Number(r.total_points || 0),
        ku_points: Number(r.ku_points || 0),
        tt_points: Number(r.tt_points || 0),
        c_points: Number(r.c_points || 0),
        ib_grade: String(r.ib_grade || ""),
        ku_band: String(r.ku_band || ""),
        tt_band: String(r.tt_band || ""),
        c_band: String(r.c_band || "")
      };
    })
    .sort(function(a, b) {
      var c = a.class_section.localeCompare(b.class_section);
      if (c !== 0) return c;
      return a.last_name.localeCompare(b.last_name);
    });
}

function webapp_getStudentsForReports(examId, classSection) {
  requireTeacher_();
  return api_getStudentsForReports(examId, classSection);
}

function webapp_getResponses(examId, classSection) {
  requireTeacher_();
  return api_getResponses(examId, classSection);
}

// Story 6: Exam Builder — grade bands support
function webapp_getExamTotals(examId) {
  requireTeacher_();
  return api_getExamTotals(examId);
}

function webapp_getGradeBands(examId) {
  requireTeacher_();
  return api_getGradeBands(examId);
}

// ============================================================================
// Topic Drill-Down Endpoints (Story 11)
// ============================================================================

/**
 * Student-facing topic drill-down — derives studentKey from session.
 */
function webapp_getTopicDrillDown(topicCode, examId, allExams) {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error("Not authenticated");
  var student = emailToStudent_(email);
  if (!student) throw new Error("Not enrolled — your email is not in the student roster.");
  return api_getTopicDrillDown(topicCode, student.student_key, examId, !!allExams, false);
}

/**
 * Teacher viewing any student's topic drill-down.
 */
function webapp_getTeacherTopicDrillDown(topicCode, studentKey, examId, allExams) {
  requireTeacher_();
  return api_getTopicDrillDown(topicCode, studentKey, examId, !!allExams, true);
}

/**
 * Teacher class-wide topic stats.
 */
function webapp_getClassTopicStats(topicCode, examId, classSection, allExams) {
  requireTeacher_();
  return api_getClassTopicStats(topicCode, examId, classSection, !!allExams);
}

// ============================================================================
// Student Profile Endpoint (Story 12)
// ============================================================================

/**
 * Get comprehensive student profile data for teacher view.
 * Returns student info, all exam scores, and topic breakdown with per-exam detail.
 */
function webapp_getStudentProfile(studentKey) {
  var email = requireTeacher_();
  logAccess_(email, "teacher", "view_student_profile", "student=" + studentKey);

  var sk = String(studentKey || "").trim();
  if (!sk) throw new Error("studentKey is required");

  // Get student info
  var students = readAll_(SHEETS_.STUDENTS);
  var student = students.find(function(s) {
    return String(s.student_key || "").trim() === sk;
  });
  if (!student) throw new Error("Student not found");

  // Get all exam scores for this student
  var allScores = readAll_(SHEETS_.SCORES_ALL).filter(function(s) {
    return String(s.student_key) === sk;
  });

  // Get exams metadata
  var exams = readAll_(SHEETS_.EXAMS);
  var examMap = {};
  exams.forEach(function(e) { examMap[String(e.exam_id)] = e; });

  // Build exam scores array sorted by date
  var examScores = allScores.map(function(s) {
    var ex = examMap[String(s.exam_id)] || {};
    return {
      exam_id: String(s.exam_id || ""),
      exam_name: String(ex.exam_name || s.exam_id || ""),
      level: String(ex.level || ""),
      date: String(ex.date || ""),
      status: String(ex.status || ""),
      total_points: Number(s.total_points || 0),
      ku_points: Number(s.ku_points || 0),
      tt_points: Number(s.tt_points || 0),
      c_points: Number(s.c_points || 0),
      ib_grade: String(s.ib_grade || s.overall_band || ""),
      ku_band: String(s.ku_band || ""),
      tt_band: String(s.tt_band || ""),
      c_band: String(s.c_band || "")
    };
  }).sort(function(a, b) {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    return a.exam_id.localeCompare(b.exam_id);
  });

  // Get all TOPIC_SKILL rows for this student
  var topicRows = readAll_(SHEETS_.TOPIC_SKILL).filter(function(r) {
    return String(r.student_key || "").trim() === sk;
  });

  // Get curriculum alignment
  var curriculum = getCurriculumAlignment_();

  // Build per-topic, per-exam aggregation for charts
  var topicsByExamMap = {};
  topicRows.forEach(function(r) {
    var tc = String(r.ap_topic || "").trim();
    var eid = String(r.exam_id || "").trim();
    if (!tc || !eid) return;

    if (!topicsByExamMap[tc]) {
      var info = curriculum[tc] || {};
      topicsByExamMap[tc] = {
        topic: tc,
        description: info.description || "",
        group: info.group || tc.split(".")[0] || "",
        groupDescription: info.groupDescription || "",
        exams: {}
      };
    }
    if (!topicsByExamMap[tc].exams[eid]) {
      topicsByExamMap[tc].exams[eid] = { earned: 0, possible: 0 };
    }
    topicsByExamMap[tc].exams[eid].earned += Number(r.points_earned || 0);
    topicsByExamMap[tc].exams[eid].possible += Number(r.points_possible || 0);
  });

  // Convert to sorted array
  var topicsByExam = Object.keys(topicsByExamMap).map(function(k) {
    return topicsByExamMap[k];
  }).sort(function(a, b) {
    return a.topic.localeCompare(b.topic, undefined, { numeric: true });
  });

  // Build overall topic analysis using existing helper
  var topicAnalysis = buildTopicAnalysis_(topicRows, curriculum);

  return {
    student: {
      student_key: sk,
      first_name: String(student.first_name || ""),
      last_name: String(student.last_name || ""),
      class_section: String(student.class_section || ""),
      email: String(student.email || ""),
      level: String(student.level || "")
    },
    examScores: examScores,
    topicAnalysis: topicAnalysis,
    topicsByExam: topicsByExam
  };
}

// =============================================================================
// Question Content endpoints (Story 13)
// =============================================================================

function webapp_getQuestionContent(examId, qid) {
  requireTeacher_();
  return api_getQuestionContent(examId, qid);
}

function webapp_saveQuestionContent(payload) {
  requireTeacher_();
  return api_saveQuestionContent(payload);
}

function webapp_getExamQuestions(examId) {
  requireTeacher_();
  return api_getExamQuestions(examId);
}

function webapp_setShowQuestions(examId, show) {
  requireTeacher_();
  return api_setShowQuestions(examId, show);
}

function webapp_exportExamPaper(examId) {
  requireTeacher_();
  return api_exportExamPaper(examId);
}

function webapp_exportAnswerKey(examId) {
  requireTeacher_();
  return api_exportAnswerKey(examId);
}

// ============================================================================
// Story 15: Student Preview + Drive Image Browser
// ============================================================================

/**
 * Teacher-only: Preview the student view for a specific student.
 * Skips visibility/level/permission checks — teacher can preview anyone.
 */
function webapp_previewStudentView(examId, studentKey) {
  var email = requireTeacher_();
  logAccess_(email, "teacher", "preview_student_view", "exam=" + examId + " student=" + studentKey);

  var sk = String(studentKey || "").trim();
  var eid = String(examId || "").trim();
  if (!sk || !eid) throw new Error("examId and studentKey are required");

  var data = api_getStudentReportData(eid, sk);

  // Attach question content if show_questions is enabled
  var exams = readAll_(SHEETS_.EXAMS);
  var exam = exams.find(function(e) { return String(e.exam_id) === eid; });
  if (exam && String(exam.show_questions || "").toLowerCase() === "true") {
    data.showQuestions = true;
    data.questionContent = api_getExamContentBulk(eid);
  }

  return data;
}

/**
 * Teacher-only: List image files in a Google Drive folder.
 */
function webapp_listDriveImages(folderId) {
  requireTeacher_();
  return api_listDriveImages(folderId);
}
