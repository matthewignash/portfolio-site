// Api ib.gs
//
// ============================================================================
// API FUNCTIONS - IB Chemistry Grader (SL/HL Support)
// Called by Sidebar.html
// Handles Paper 1A (auto), Paper 1B (checklist/manual), Paper 2 (checklist/manual)
// Supports Standard Level (SL) and Higher Level (HL) with different grade boundaries
// ============================================================================


// =============================================================================
// Performance helpers
// =============================================================================
const RESP_CACHE_TTL_SECONDS_ = 120; // short-lived; enough to speed sidebar loads

function _respCacheKey_(examId, studentKey) {
  return `IB_RESPMAP::${String(examId || "").trim()}::${String(studentKey || "").trim()}`;
}

function _invalidateRespCache_(examId, studentKey) {
  const key = _respCacheKey_(examId, studentKey);
  CacheService.getScriptCache().remove(key);
}

/**
 * Build a response map for a single student+exam:
 * { qid: {points_awarded, detail_json, comment, mcq_choice, response_text}, ... }
 */
function _buildRespMap_(examId, studentKey) {
  const exam_id = String(examId || "").trim();
  const sk = String(studentKey || "").trim();
  const out = {};

  if (!exam_id || !sk) return out;

  // One table scan (still much faster than N scans)
  const rows = readAll_(SHEETS_.RESPONSES).filter(r =>
    String(r.exam_id || "").trim() === exam_id &&
    String(r.student_key || "").trim() === sk
  );

  rows.forEach(r => {
    const qid = String(r.qid || "").trim();
    if (!qid) return;
    out[qid] = {
      points_awarded: r.points_awarded,
      detail_json: r.detail_json,
      comment: r.comment,
      mcq_choice: r.mcq_choice,
      response_text: r.response_text
    };
  });

  return out;
}

/**
 * Cached lookup for response map.
 * Sidebar currently calls api_getExistingResponse per question; this makes that fast.
 */
function _getRespMapCached_(examId, studentKey) {
  const exam_id = String(examId || "").trim();
  const sk = String(studentKey || "").trim();
  const key = _respCacheKey_(exam_id, sk);
  const cache = CacheService.getScriptCache();

  const hit = cache.get(key);
  if (hit) {
    try { return JSON.parse(hit); } catch (e) {}
  }

  const map = _buildRespMap_(exam_id, sk);
  cache.put(key, JSON.stringify(map), RESP_CACHE_TTL_SECONDS_);
  return map;
}


// =============================================================================
// Helpers: points + paper parsing
// =============================================================================
function getQuestionPoints_(q) {
  return Number(q.max_points || q.points_possible || 0);
}

function getPaper_(q) {
  const paper = String(q.paper || "")
    .toUpperCase()
    .replace("PAPER", "")
    .replace(" ", "")
    .trim();
  if (paper === "1A" || paper === "1B" || paper === "2") return paper;
  return "";
}

function normalizeToken_(t) {
  return String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}


// =============================================================================
// Bootstrap (NEW) — optional, for next step sidebar optimization
// =============================================================================
function api_bootstrap() {
  const exams = api_getExams();
  const active = api_getActiveExam(); // {active_exam_id: "..."}
  const classes = api_getClasses();
  return {
    exams,
    active_exam_id: active.active_exam_id || "",
    classes
  };
}


// =============================================================================
// Exams
// =============================================================================
function api_getExams() {
  return readAll_(SHEETS_.EXAMS)
    .filter(r => String(r.exam_id || "").trim() !== "")
    .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
}

function api_createExam(exam) {
  const level = String(exam.level || "HL").toUpperCase().trim();
  if (level !== "SL" && level !== "HL") throw new Error("Level must be SL or HL");

  const row = {
    exam_id: String(exam.exam_id || "").trim(),
    exam_name: String(exam.exam_name || "").trim(),
    course: String(exam.course || "IB Chemistry").trim(),
    level: level,
    term: String(exam.term || "").trim(),
    class_section: String(exam.class_section || "").trim(),
    response_mode: String(exam.response_mode || "LONG"),
    papers_included: String(exam.papers_included || "1A,1B,2"),
    topics_covered: String(exam.topics_covered || ""),
    notes: String(exam.notes || ""),
    status: "hidden",
    created_at: new Date().toISOString(),
  };

  if (!row.exam_id) throw new Error("exam_id required");
  upsertByKey_(SHEETS_.EXAMS, ["exam_id"], row);
  setConfig_("active_exam_id", row.exam_id);
}

function api_updateExamLevel(examId, level) {
  const exam_id = String(examId || "").trim();
  const lvl = String(level || "HL").toUpperCase().trim();
  if (lvl !== "SL" && lvl !== "HL") throw new Error("Level must be SL or HL");

  const exams = readAll_(SHEETS_.EXAMS);
  const exam = exams.find(e => String(e.exam_id) === exam_id);
  if (!exam) throw new Error("Exam not found");

  upsertByKey_(SHEETS_.EXAMS, ["exam_id"], { ...exam, level: lvl });
}

function api_getExamLevel(examId) {
  const exam_id = String(examId || "").trim();
  const exams = readAll_(SHEETS_.EXAMS);
  const exam = exams.find(e => String(e.exam_id) === exam_id);
  return { level: String(exam?.level || "HL").toUpperCase().trim() };
}

function api_setActiveExam(examId) {
  setConfig_("active_exam_id", String(examId || ""));
}

function api_getActiveExam() {
  return { active_exam_id: getConfig_("active_exam_id", "") };
}

// --- Exam Visibility (Story 9) ---
function api_setExamVisibility(examId, status) {
  const exam_id = String(examId || "").trim();
  const newStatus = String(status || "").toLowerCase().trim();
  if (newStatus !== "visible" && newStatus !== "hidden") {
    throw new Error("Status must be 'visible' or 'hidden'");
  }

  const exams = readAll_(SHEETS_.EXAMS);
  const exam = exams.find(e => String(e.exam_id) === exam_id);
  if (!exam) throw new Error("Exam not found: " + exam_id);

  upsertByKey_(SHEETS_.EXAMS, ["exam_id"], { ...exam, status: newStatus });
  return { exam_id: exam_id, status: newStatus };
}

function api_bulkSetExamVisibility(examIds, status) {
  const ids = examIds || [];
  const newStatus = String(status || "").toLowerCase().trim();
  if (newStatus !== "visible" && newStatus !== "hidden") {
    throw new Error("Status must be 'visible' or 'hidden'");
  }

  const exams = readAll_(SHEETS_.EXAMS);
  const idSet = {};
  ids.forEach(id => { idSet[String(id).trim()] = true; });

  const toUpdate = exams
    .filter(e => idSet[String(e.exam_id)])
    .map(e => ({ ...e, status: newStatus }));

  if (!toUpdate.length) return { updated: 0 };

  upsertManyByKey_(SHEETS_.EXAMS, ["exam_id"], toUpdate);
  return { updated: toUpdate.length };
}


// =============================================================================
// Roster / Classes
// =============================================================================
function api_getClasses() {
  const rows = readAll_(SHEETS_.ROSTER);
  return [...new Set(rows.map(r => String(r.class_section || "").trim()).filter(Boolean))].sort();
}

function api_getRoster(classSection) {
  const cls = String(classSection || "").trim();
  return readAll_(SHEETS_.ROSTER)
    .filter(r => !cls || String(r.class_section || "").trim() === cls)
    .map(r => ({
      class_section: String(r.class_section || ""),
      last_name: String(r.last_name || ""),
      first_name: String(r.first_name || ""),
      student_key: String(r.student_key || "") || studentKey_(r.last_name, r.first_name, r.class_section),
    }))
    .sort((a, b) => (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name));
}

function api_getRosterByClass(cls) {
  const rows = api_getRoster(cls);

  // Batch upsert instead of per-row calls
  const upserts = rows
    .filter(s => s.student_key)
    .map(s => ({
      class_section: s.class_section,
      last_name: s.last_name,
      first_name: s.first_name,
      student_key: s.student_key
    }));

  if (upserts.length) {
    upsertManyByKey_(SHEETS_.ROSTER, ["class_section", "last_name", "first_name"], upserts);
  }

  return rows;
}


// =============================================================================
// Questions (generic getter for sidebar)
// =============================================================================
function api_getQuestions(examId) {
  const exam_id = String(examId || "").trim();
  return readAll_(SHEETS_.QUESTIONS)
    .filter(r => String(r.exam_id) === exam_id && String(r.active).toUpperCase() !== "FALSE")
    .map(r => ({
      exam_id: r.exam_id,
      qid: r.qid,
      paper: getPaper_(r),
      number: r.number,
      label: r.label,
      max_points: getQuestionPoints_(r),
      points_possible: getQuestionPoints_(r),
      scoring_mode: r.scoring_mode || "",
      correct_answer: String(r.correct_answer || ""),
      strand: r.strand || "",
      ib_topic_code: r.ib_topic_code || r.ib_topics_csv || "",
      ib_skill_code: r.ib_skill_code || "",
      hl_only: String(r.hl_only || "").toUpperCase() === "TRUE",
      active: r.active
    }));
}


// =============================================================================
// Questions (Paper 1A - MCQ-style)
// =============================================================================
function api_setPaper1ACount(payload) {
  const exam_id = String(payload.exam_id || "").trim();
  const count = Number(payload.count || 0);
  if (!exam_id || count < 0) throw new Error("Invalid paper 1A count");

  const qs = readAll_(SHEETS_.QUESTIONS).filter(r => String(r.exam_id) === exam_id);
  const p1a = qs.filter(r => getPaper_(r) === "1A");

  const desired = new Set();
  for (let i = 1; i <= count; i++) desired.add(`1A_${String(i).padStart(2, "0")}`);

  const upserts = [];
  for (let i = 1; i <= count; i++) {
    const qid = `1A_${String(i).padStart(2, "0")}`;
    const found = p1a.find(r => String(r.qid) === qid);
    upserts.push({
      exam_id,
      qid,
      paper: "1A",
      number: i,
      parent_qid: "",
      token: "",
      label: `Q${i}`,
      max_points: 1,
      points_possible: 1,
      scoring_mode: "auto",
      correct_answer: found ? String(found.correct_answer || "") : "",
      strand: found ? String(found.strand || "KU") : "KU",
      ib_topic_code: found ? String(found.ib_topic_code || "") : "",
      ib_skill_code: found ? String(found.ib_skill_code || "") : "",
      hl_only: found ? String(found.hl_only || "") : "",
      active: true
    });
  }

  // Deactivate extras
  p1a.forEach(r => {
    if (!desired.has(String(r.qid))) {
      upserts.push({
        ...r,
        exam_id,
        qid: String(r.qid),
        active: false,
        max_points: 0,
        points_possible: 0
      });
    }
  });

  upsertManyByKey_(SHEETS_.QUESTIONS, ["exam_id", "qid"], upserts);
}

function api_getPaper1ATable(examId) {
  const exam_id = String(examId || "").trim();
  return readAll_(SHEETS_.QUESTIONS)
    .filter(r => {
      if (String(r.exam_id) !== exam_id) return false;
      if (getPaper_(r) !== "1A") return false;
      if (String(r.active).toUpperCase() === "FALSE") return false;
      if (getQuestionPoints_(r) <= 0) return false;
      return true;
    })
    .sort((a, b) => Number(a.number || 0) - Number(b.number || 0))
    .map(r => ({
      exam_id: r.exam_id,
      qid: r.qid,
      number: r.number,
      correct_answer: String(r.correct_answer || ""),
      strand: r.strand || "KU",
      ib_topic_code: r.ib_topic_code || "",
      ib_skill_code: r.ib_skill_code || "",
      hl_only: String(r.hl_only || "").toUpperCase() === "TRUE"
    }));
}

/**
 * Optimized: previously did readAll_ inside loop.
 * Now indexes questions once and does a single upsertManyByKey_.
 */
function api_savePaper1ATable(payload) {
  const exam_id = String(payload.exam_id || "").trim();
  const rows = payload.rows || [];
  if (!exam_id) throw new Error("exam_id required");

  const allQs = readAll_(SHEETS_.QUESTIONS).filter(q => String(q.exam_id) === exam_id);
  const byQid = new Map(allQs.map(q => [String(q.qid), q]));

  const upserts = [];
  rows.forEach(r => {
    const qid = String(r.qid || "");
    const existing = byQid.get(qid);
    if (!existing) return;

    upserts.push({
      ...existing,
      correct_answer: String(r.correct_answer || "").toUpperCase().trim(),
      strand: String(r.strand || "KU").trim(),
      ib_topic_code: String(r.ib_topic_code || "").trim(),
      ib_skill_code: String(r.ib_skill_code || "").trim(),
      hl_only: r.hl_only ? "TRUE" : ""
    });
  });

  if (upserts.length) {
    upsertManyByKey_(SHEETS_.QUESTIONS, ["exam_id", "qid"], upserts);
  }
}


// =============================================================================
// Questions (Paper 1B / Paper 2)
// =============================================================================
function api_listPaperRoots(examId, paper) {
  const exam_id = String(examId || "").trim();
  const paperType = String(paper || "2").toUpperCase().replace("PAPER", "").replace(" ", "").trim();

  return readAll_(SHEETS_.QUESTIONS)
    .filter(r => String(r.exam_id) === exam_id && getPaper_(r) === paperType && String(r.scoring_mode) === "container")
    .sort((a, b) => String(a.qid).localeCompare(String(b.qid)))
    .map(r => ({ qid: r.qid }));
}

function api_addPaperRoot(payload) {
  const exam_id = String(payload.exam_id || "").trim();
  const paper = String(payload.paper || "2").toUpperCase().replace("PAPER", "").replace(" ", "").trim();
  const number = String(payload.number || "").trim();
  if (!exam_id || !number) throw new Error("Paper root requires number");

  const qid = `${paper}_${String(number).padStart(2, "0")}`;
  upsertByKey_(SHEETS_.QUESTIONS, ["exam_id", "qid"], {
    exam_id,
    qid,
    paper: paper,
    number: Number(number) || "",
    parent_qid: "",
    token: "",
    label: `Q${number}`,
    max_points: 0,
    points_possible: 0,
    scoring_mode: "container",
    correct_answer: "",
    strand: "TT",
    ib_topic_code: "",
    ib_skill_code: "",
    hl_only: "",
    active: true
  });
}

function api_addPaperPart(payload) {
  const exam_id = String(payload.exam_id || "").trim();
  const paper = String(payload.paper || "2").toUpperCase().replace("PAPER", "").replace(" ", "").trim();
  const parentQid = String(payload.parent_qid || "").trim();
  const token = normalizeToken_(payload.token);
  const pts = Number(payload.max_points || 1);
  const mode = String(payload.scoring_mode || "checklist");
  const strand = String(payload.strand || "TT").toUpperCase();
  const topic = String(payload.ib_topic_code || "").trim();
  const skill = String(payload.ib_skill_code || "").trim();
  const hlOnly = payload.hl_only ? "TRUE" : "";

  if (!parentQid || !token) throw new Error("Parent qid and token required");

  const qs = readAll_(SHEETS_.QUESTIONS).filter(q => String(q.exam_id) === exam_id);
  const parent = qs.find(q => String(q.qid) === parentQid);
  const parentLabel = parent ? String(parent.label || parent.qid) : parentQid;

  const qid = `${parentQid}_${token}`;
  const label = `${parentLabel}${token}`;

  upsertByKey_(SHEETS_.QUESTIONS, ["exam_id", "qid"], {
    exam_id,
    qid,
    paper: paper,
    number: parent ? parent.number : "",
    parent_qid: parentQid,
    token,
    label,
    max_points: pts,
    points_possible: pts,
    scoring_mode: mode,
    correct_answer: "",
    strand,
    ib_topic_code: topic,
    ib_skill_code: skill,
    hl_only: hlOnly,
    active: true
  });
}

function api_getPaperParts(examId, paper) {
  const exam_id = String(examId || "").trim();
  const paperType = String(paper || "2").toUpperCase().replace("PAPER", "").replace(" ", "").trim();

  return readAll_(SHEETS_.QUESTIONS)
    .filter(r => {
      if (String(r.exam_id) !== exam_id) return false;
      if (getPaper_(r) !== paperType) return false;
      if (getQuestionPoints_(r) <= 0) return false;
      if (String(r.active).toUpperCase() === "FALSE") return false;
      return true;
    })
    .sort((a, b) => String(a.qid).localeCompare(String(b.qid)))
    .map(r => ({
      qid: r.qid,
      label: r.label || r.qid,
      max_points: getQuestionPoints_(r),
      scoring_mode: r.scoring_mode || "manual",
      strand: r.strand || "TT",
      ib_topic_code: r.ib_topic_code || "",
      ib_skill_code: r.ib_skill_code || "",
      hl_only: String(r.hl_only || "").toUpperCase() === "TRUE"
    }));
}

/**
 * Optimized: previously did readAll_ inside loop.
 * Now indexes once and does a single upsertManyByKey_.
 */
function api_savePaperParts(payload) {
  const exam_id = String(payload.exam_id || "").trim();
  const rows = payload.rows || [];
  if (!exam_id) throw new Error("exam_id required");

  const allQs = readAll_(SHEETS_.QUESTIONS).filter(q => String(q.exam_id) === exam_id);
  const byQid = new Map(allQs.map(q => [String(q.qid), q]));

  const upserts = [];
  rows.forEach(r => {
    const qid = String(r.qid || "");
    const existing = byQid.get(qid);
    if (!existing) return;

    upserts.push({
      ...existing,
      strand: String(r.strand || existing.strand || "TT"),
      ib_topic_code: String(r.ib_topic_code || "").trim(),
      ib_skill_code: String(r.ib_skill_code || "").trim(),
      hl_only: r.hl_only ? "TRUE" : ""
    });
  });

  if (upserts.length) {
    upsertManyByKey_(SHEETS_.QUESTIONS, ["exam_id", "qid"], upserts);
  }
}


// =============================================================================
// Rubrics
// =============================================================================
function api_getChecklistQids(examId) {
  const exam_id = String(examId || "").trim();
  return readAll_(SHEETS_.QUESTIONS)
    .filter(function(r) {
      if (String(r.exam_id) !== exam_id) return false;
      if (getQuestionPoints_(r) <= 0) return false;
      var mode = String(r.scoring_mode || "").toLowerCase();
      return mode !== "auto" && mode !== "container";
    })
    .sort((a, b) => String(a.qid).localeCompare(String(b.qid)))
    .map(r => ({ qid: r.qid, label: r.label || r.qid, max_points: getQuestionPoints_(r) }));
}

function api_getRubricItems(examId, qid) {
  const exam_id = String(examId || "").trim();
  const q = String(qid || "").trim();
  return readAll_(SHEETS_.RUBRICS)
    .filter(r => String(r.exam_id) === exam_id && String(r.qid) === q)
    .sort((a, b) => String(a.item_id).localeCompare(String(b.item_id)))
    .map(r => ({
      item_id: String(r.item_id || ""),
      points: Number(r.points || 0),
      criteria_text: String(r.criteria_text || "")
    }));
}

function api_replaceRubricItems(payload) {
  const exam_id = String(payload.exam_id || "").trim();
  const qid = String(payload.qid || "").trim();
  const items = payload.items || [];

  const all = readAll_(SHEETS_.RUBRICS);
  const kept = all.filter(r => !(String(r.exam_id) === exam_id && String(r.qid) === qid));
  const add = items.map(it => ({
    exam_id, qid,
    item_id: String(it.item_id || "").trim(),
    points: Number(it.points || 0),
    criteria_text: String(it.criteria_text || "").trim()
  }));

  writeAll_(SHEETS_.RUBRICS, kept.concat(add));
}


// =============================================================================
// Question Content (Story 13)
// =============================================================================

/**
 * Get content blocks for a specific question.
 * Returns array sorted by block_order.
 */
function api_getQuestionContent(examId, qid) {
  const exam_id = String(examId || "").trim();
  const q = String(qid || "").trim();
  return readAll_(SHEETS_.QUESTION_CONTENT)
    .filter(r => String(r.exam_id) === exam_id && String(r.qid) === q)
    .sort((a, b) => Number(a.block_order || 0) - Number(b.block_order || 0))
    .map(r => ({
      block_order: Number(r.block_order || 0),
      block_type: String(r.block_type || "text"),
      content: String(r.content || "")
    }));
}

/**
 * Replace all content blocks for a question.
 * Same pattern as api_replaceRubricItems: readAll → filter out → concat → writeAll.
 */
function api_saveQuestionContent(payload) {
  const exam_id = String(payload.exam_id || "").trim();
  const qid = String(payload.qid || "").trim();
  const blocks = payload.blocks || [];

  const all = readAll_(SHEETS_.QUESTION_CONTENT);
  const kept = all.filter(r => !(String(r.exam_id) === exam_id && String(r.qid) === qid));
  const add = blocks.map(b => ({
    qid: qid,
    exam_id: exam_id,
    block_order: Number(b.block_order || 0),
    block_type: String(b.block_type || "text").trim(),
    content: String(b.content || "")
  }));

  writeAll_(SHEETS_.QUESTION_CONTENT, kept.concat(add));
}

/**
 * Get all questions for an exam, sorted by paper → section → number.
 * Used by the content editor question selector.
 */
function api_getExamQuestions(examId) {
  const exam_id = String(examId || "").trim();
  return readAll_(SHEETS_.QUESTIONS)
    .filter(r => String(r.exam_id) === exam_id)
    .sort((a, b) => {
      var pa = getPaper_(a), pb = getPaper_(b);
      if (pa !== pb) return pa.localeCompare(pb);
      var sa = String(a.section || ""), sb = String(b.section || "");
      if (sa !== sb) return sa.localeCompare(sb);
      var na = Number(a.number || 0), nb = Number(b.number || 0);
      if (na !== nb) return na - nb;
      return String(a.qid || "").localeCompare(String(b.qid || ""));
    })
    .map(r => ({
      qid: String(r.qid || ""),
      label: String(r.label || r.qid || ""),
      paper: getPaper_(r),
      section: String(r.section || ""),
      number: String(r.number || ""),
      parent_qid: String(r.parent_qid || ""),
      correct_answer: String(r.correct_answer || ""),
      question_text: String(r.question_text || ""),
      scoring_mode: String(r.scoring_mode || ""),
      points_possible: Number(r.points_possible || 0)
    }));
}

/**
 * Get all content blocks for an exam, grouped by qid.
 * Returns { qid: [{block_order, block_type, content}] }
 */
function api_getExamContentBulk(examId) {
  const exam_id = String(examId || "").trim();
  const rows = readAll_(SHEETS_.QUESTION_CONTENT)
    .filter(r => String(r.exam_id) === exam_id);

  const grouped = {};
  rows.forEach(r => {
    const q = String(r.qid || "");
    if (!q) return;
    if (!grouped[q]) grouped[q] = [];
    grouped[q].push({
      block_order: Number(r.block_order || 0),
      block_type: String(r.block_type || "text"),
      content: String(r.content || "")
    });
  });

  // Sort each group by block_order
  Object.keys(grouped).forEach(q => {
    grouped[q].sort((a, b) => a.block_order - b.block_order);
  });

  return grouped;
}

/**
 * Toggle show_questions on an exam.
 */
function api_setShowQuestions(examId, show) {
  const exam_id = String(examId || "").trim();
  upsertByKey_(SHEETS_.EXAMS, ["exam_id"], {
    exam_id: exam_id,
    show_questions: show ? "true" : "false"
  });
}


// =============================================================================
// Grade bands (level support)
// =============================================================================
function api_getGradeBands(examId) {
  const exam_id = String(examId || "").trim();
  return readAll_(SHEETS_.GRADE_BANDS).filter(r => String(r.exam_id) === exam_id);
}

function api_getGradeBandsByLevel(examId, level) {
  const exam_id = String(examId || "").trim();
  const lvl = String(level || "").toUpperCase().trim();
  return readAll_(SHEETS_.GRADE_BANDS).filter(r => {
    if (String(r.exam_id) !== exam_id) return false;
    if (lvl && String(r.level || "").toUpperCase().trim() !== lvl) return false;
    return true;
  });
}

function api_saveGradeBands(payload) {
  const exam_id = String(payload.exam_id || "").trim();

  const rows = (payload.rows || []).map(r => ({
    exam_id,
    level: String(r.level || "").toUpperCase().trim(),
    scale: String(r.scale || "").trim(),
    strand: String(r.strand || "").trim(),
    band: String(r.band || "").trim(),
    min_points: Number(r.min_points),
    max_points: Number(r.max_points),
  }));

  const all = readAll_(SHEETS_.GRADE_BANDS);
  const kept = all.filter(r => String(r.exam_id) !== exam_id);
  writeAll_(SHEETS_.GRADE_BANDS, kept.concat(rows));

  // Immediately recompute for that exam
  api_recomputeExam(exam_id, "");
}


// =============================================================================
// Responses
// =============================================================================
function api_getResponses(examId, classSection) {
  const exam_id = String(examId || "").trim();
  const cls = String(classSection || "").trim();
  return readAll_(SHEETS_.RESPONSES)
    .filter(r => {
      if (String(r.exam_id) !== exam_id) return false;
      if (cls && String(r.class_section) !== cls) return false;
      return true;
    })
    .map(r => ({
      exam_id: r.exam_id,
      student_key: String(r.student_key || ""),
      qid: String(r.qid || ""),
      mcq_choice: String(r.mcq_choice || ""),
      response_text: String(r.response_text || ""),
      points_awarded: r.points_awarded,
      detail_json: r.detail_json,
      comment: r.comment
    }));
}

function api_getStudentPaper1AChoices(examId, student_key) {
  const exam_id = String(examId || "").trim();
  const sk = String(student_key || "").trim();

  const rows = readAll_(SHEETS_.RESPONSES)
    .filter(r => String(r.exam_id) === exam_id && String(r.student_key) === sk);

  const p1aQids = new Set(
    readAll_(SHEETS_.QUESTIONS)
      .filter(q => String(q.exam_id) === exam_id && getPaper_(q) === "1A")
      .map(q => String(q.qid))
  );

  const out = {};
  rows.forEach(r => {
    if (p1aQids.has(String(r.qid))) {
      out[String(r.qid)] = String(r.mcq_choice || r.response_text || "");
    }
  });

  return out;
}

function api_savePaper1ABatch(payload) {
  const exam_id = String(payload.exam_id || "").trim();
  const sk = String(payload.student_key || "").trim();
  const answers = payload.answers || {};

  const roster = readAll_(SHEETS_.ROSTER);
  const rHit = roster.find(r => String(r.student_key) === sk);
  const cls = rHit ? String(rHit.class_section || "") : "";
  const last = rHit ? String(rHit.last_name || "") : "";
  const first = rHit ? String(rHit.first_name || "") : "";
  const now = new Date().toISOString();

  // Load questions to auto-score MCQs at save time
  const questionList = readAll_(SHEETS_.QUESTIONS).filter(
    q => String(q.exam_id) === exam_id
  );
  const questionMap = new Map(questionList.map(q => [String(q.qid), q]));

  const rows = Object.keys(answers).map(qid => {
    const choice = String(answers[qid] || "").toUpperCase().replace(/[^A-E-]/g, "");
    const question = questionMap.get(String(qid));

    // Calculate points: compare student choice to correct answer
    let pointsAwarded = "";
    if (question) {
      const correct = String(question.correct_answer || "").toUpperCase().trim();
      const maxPts = getMaxPoints_(question);
      if (correct && choice) {
        pointsAwarded = (choice === correct) ? maxPts : 0;
      }
    }

    return {
      timestamp: now,
      exam_id,
      class_section: cls,
      student_key: sk,
      last_name: last,
      first_name: first,
      qid: String(qid),
      paper: "1A",
      mcq_choice: choice,
      response_text: choice,
      points_awarded: pointsAwarded,
      detail_json: "",
      comment: ""
    };
  });

  upsertManyByKey_(SHEETS_.RESPONSES, ["exam_id", "student_key", "qid"], rows);

  // invalidate cache so existing responses reflect latest
  _invalidateRespCache_(exam_id, sk);

  return { saved: rows.length };
}

/**
 * Backward compatible endpoint.
 * Now fast due to cached response map.
 */
function api_getExistingResponse(examId, student_key, qid) {
  const exam_id = String(examId || "").trim();
  const sk = String(student_key || "").trim();
  const qq = String(qid || "").trim();

  const map = _getRespMapCached_(exam_id, sk);
  const hit = map[qq];

  return hit ? {
    points_awarded: hit.points_awarded,
    detail_json: hit.detail_json,
    comment: hit.comment,
    mcq_choice: hit.mcq_choice,
    response_text: hit.response_text
  } : {
    points_awarded: "",
    detail_json: "[]",
    comment: "",
    mcq_choice: "",
    response_text: ""
  };
}

function api_saveResponse(payload) {
  const exam_id = String(payload.exam_id || "").trim();
  const sk = String(payload.student_key || "").trim();
  const qid = String(payload.qid || "").trim();

  const roster = readAll_(SHEETS_.ROSTER);
  const rHit = roster.find(r => String(r.student_key) === sk);
  const cls = rHit ? String(rHit.class_section || "") : "";
  const last = rHit ? String(rHit.last_name || "") : "";
  const first = rHit ? String(rHit.first_name || "") : "";

  // Calculate points_awarded from checklist when detail_json is provided
  let pointsAwarded = payload.points_awarded === "" ? "" : Number(payload.points_awarded);
  const detailJson = String(payload.detail_json || "");

  if (detailJson && detailJson !== "" && detailJson !== "[]") {
    let picked = [];
    try { picked = JSON.parse(detailJson); } catch(e) { picked = []; }

    if (picked.length > 0) {
      const question = readAll_(SHEETS_.QUESTIONS).find(
        q => String(q.qid) === qid && String(q.exam_id) === exam_id
      );
      const rubricItems = readAll_(SHEETS_.RUBRICS).filter(
        r => String(r.qid) === qid && String(r.exam_id) === exam_id
      );

      if (question && rubricItems.length > 0) {
        const maxPts = getMaxPoints_(question);
        const itemMap = new Map(rubricItems.map(it => [String(it.item_id), Number(it.points || 0)]));
        const checklistMode = String(question.checklist_mode || "").toUpperCase().trim();
        const rubricTotal = rubricItems.reduce((sum, it) => sum + Number(it.points || 0), 0);

        let isOrRubric = false;
        if (checklistMode === "OR") {
          isOrRubric = true;
        } else if (checklistMode === "AND") {
          isOrRubric = false;
        } else {
          isOrRubric = rubricTotal > maxPts;
        }

        if (isOrRubric) {
          const validPicks = picked.filter(id => itemMap.has(String(id)));
          pointsAwarded = validPicks.length > 0 ? maxPts : 0;
        } else {
          pointsAwarded = picked.reduce((sum, id) => sum + (itemMap.get(String(id)) || 0), 0);
          pointsAwarded = Math.min(pointsAwarded, maxPts);
        }
      }
    }
  }

  upsertByKey_(SHEETS_.RESPONSES, ["exam_id", "student_key", "qid"], {
    timestamp: new Date().toISOString(),
    exam_id,
    class_section: cls,
    student_key: sk,
    last_name: last,
    first_name: first,
    qid,
    paper: payload.paper || "",
    mcq_choice: String(payload.mcq_choice || ""),
    response_text: String(payload.response_text || ""),
    points_awarded: pointsAwarded,
    detail_json: detailJson,
    comment: String(payload.comment || "")
  });

  // invalidate cache so the sidebar sees the new data immediately
  _invalidateRespCache_(exam_id, sk);
}


// =============================================================================
// Totals / recompute / overview
// =============================================================================
function api_getExamTotals(examId) {
  const exam_id = String(examId || "").trim();
  return computeExamTotals_(exam_id);
}

function api_recomputeExam(examId, classSection) {
  recomputeExam_(String(examId || "").trim(), String(classSection || "").trim());
}

function api_getBandDistributions(examId, classSection) {
  const exam_id = String(examId || "").trim();
  const cls = String(classSection || "").trim();

  const rows = readAll_(SHEETS_.SCORES_CURRENT)
    .filter(r => String(r.exam_id) === exam_id && (!cls || String(r.class_section) === cls));

  const dist = (col) => {
    const d = {};
    rows.forEach(r => {
      const v = String(r[col] || "").trim();
      if (!v) return;
      d[v] = (d[v] || 0) + 1;
    });
    return d;
  };

  const examLevel = api_getExamLevel(exam_id);

  return {
    n: rows.length,
    level: examLevel.level,
    ib: dist("ib_grade"),
    overall: dist("overall_band"),
    ku: dist("ku_band"),
    tt: dist("tt_band"),
    c: dist("c_band")
  };
}


// =============================================================================
// Render model for marking UI
// =============================================================================
function api_getPaperQuestionRenderModel(examId, paper) {
  const exam_id = String(examId || "").trim();
  const paperType = String(paper || "2").toUpperCase().replace("PAPER", "").replace(" ", "").trim();

  const parts = readAll_(SHEETS_.QUESTIONS)
    .filter(r => {
      if (String(r.exam_id) !== exam_id) return false;
      if (getPaper_(r) !== paperType) return false;
      if (getQuestionPoints_(r) <= 0) return false;
      if (String(r.active).toUpperCase() === "FALSE") return false;
      return true;
    })
    .sort((a, b) => String(a.qid).localeCompare(String(b.qid)));

  const rubrics = readAll_(SHEETS_.RUBRICS).filter(r => String(r.exam_id) === exam_id);
  const rubricByQ = new Map();

  rubrics.forEach(r => {
    const k = String(r.qid);
    if (!rubricByQ.has(k)) rubricByQ.set(k, []);
    rubricByQ.get(k).push({
      item_id: String(r.item_id || ""),
      points: Number(r.points || 0),
      criteria_text: String(r.criteria_text || "")
    });
  });

  return parts.map(p => ({
    qid: p.qid,
    label: String(p.label || p.qid),
    max_points: getQuestionPoints_(p),
    scoring_mode: String(p.scoring_mode || "manual"),
    strand: String(p.strand || "TT"),
    ib_topic_code: String(p.ib_topic_code || ""),
    ib_skill_code: String(p.ib_skill_code || ""),
    hl_only: String(p.hl_only || "").toUpperCase() === "TRUE",
    rubric_items: rubricByQ.get(String(p.qid)) || []
  }));
}

// NEW: one-call marking model (questions + existing responses)
function api_getPaperMarkingModel(examId, paper, student_key) {
  const exam_id = String(examId || "").trim();
  const sk = String(student_key || "").trim();

  const questions = api_getPaperQuestionRenderModel(exam_id, paper);
  const respMap = _getRespMapCached_(exam_id, sk);

  return (questions || []).map(q => {
    const existing = respMap[String(q.qid)] || null;
    return Object.assign({}, q, { existing });
  });
}

// Alias for backward compatibility
function api_getFrqQuestionRenderModel(examId) {
  return api_getPaperQuestionRenderModel(examId, "2");
}

// ============================================================================
// Story 15: Drive Image Browsing
// ============================================================================

/**
 * List image files in a Google Drive folder.
 * Returns array of {id, name, mimeType, thumbnailUrl}.
 */
function api_listDriveImages(folderId) {
  var fid = String(folderId || "").trim();
  if (!fid) throw new Error("folderId is required");

  var folder = DriveApp.getFolderById(fid);
  var imageMimes = [
    "image/jpeg", "image/png", "image/gif",
    "image/bmp", "image/webp", "image/svg+xml"
  ];

  var results = [];
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    var mime = f.getMimeType();
    if (imageMimes.indexOf(mime) === -1) continue;
    results.push({
      id: f.getId(),
      name: f.getName(),
      mimeType: mime,
      thumbnailUrl: "https://drive.google.com/thumbnail?id=" + f.getId() + "&sz=w200"
    });
  }

  results.sort(function(a, b) { return a.name.localeCompare(b.name); });
  return results;
}
