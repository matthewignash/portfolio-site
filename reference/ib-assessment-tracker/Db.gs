/**
 * Db.gs — IB Science Assessment Grader
 *
 * Full replacement version (header-safe).
 *
 * Key fixes:
 * 1) Duplicate header immunity:
 *    - If a sheet has a duplicated header (e.g. Exams has exam_id twice),
 *      headerMap_ keeps the FIRST occurrence so blank duplicate columns
 *      don't overwrite real data.
 *
 * 2) Header repair is safe:
 *    - If headers are missing, we APPEND missing columns (never delete/reorder).
 *
 * 3) Faster upserts:
 *    - Builds row index from key columns (not full objects),
 *      then updates rows with minimal reads.
 */

// ============================================================================
// Sheet names (must match tab names exactly)
// ============================================================================
const SHEETS_ = {
  CONFIG: "Config",
  EXAMS: "Exams",
  QUESTIONS: "Questions",
  RUBRICS: "Rubrics",
  ROSTER: "Roster",
  STUDENTS: "Students",
  RESPONSES: "Responses",
  GRADE_BANDS: "Grade_Bands",

  // Template/working tabs (present in your workbook)
  SCORES_EXAMID: "Scores_ExamID",
  BREAKDOWN_EXAMID: "Breakdown_ExamID",

  // Rollups
  SCORES_CURRENT: "Scores_CurrentExam",
  SCORES_ALL: "Scores_AllExams",
  TOPIC_SKILL: "TopicSkillBreakdown",

  // Optional supporting data
  CURRICULUM: "Curriculum",

  // Security & audit (Story 12)
  ACCESS_LOG: "Access_Log",
  PERMISSIONS: "Permissions",

  // Question content blocks (Story 13)
  QUESTION_CONTENT: "Question_Content",
};

// ============================================================================
// Canonical headers (we only append missing columns; we never delete/reorder)
// ============================================================================
const HEADERS_ = {
  [SHEETS_.CONFIG]: [
    "setting_key",
    "setting_value",
    "course_name",
    "school_year",
    "schema_version",
    "key",
    "value",
  ],

  [SHEETS_.EXAMS]: [
    "exam_id",
    "exam_name",
    "course",
    "term",
    "date",
    "status",
    "papers_included",
    "topics_covered",
    "level",
    "class_section",
    "response_mode",
    "wide_response_sheet",
    "notes",
    "created_at",
    "show_questions",
    // NOTE: DO NOT include the duplicated trailing "exam_id".
    // If the sheet has it, we will ignore it safely.
  ],

  [SHEETS_.QUESTIONS]: [
    "qid",
    "exam_id",
    "paper",
    "scoring_mode",
    "strand",
    "points_possible",
    "ib_topic_code",
    "label",
    "correct_answer",
    "question_text",
    "section",
    "number",
    "parent_qid",
    "token",
    "ap_topics_csv",
    "ap_skill_code",
    "active",
  ],

  [SHEETS_.RUBRICS]: ["qid", "exam_id", "item_id", "criteria_text", "points"],

  [SHEETS_.STUDENTS]: ["student_key", "first_name", "last_name", "class_section", "email", "level"],

  [SHEETS_.ROSTER]: ["class_section", "last_name", "first_name", "student_key"],

  [SHEETS_.RESPONSES]: [
    "response_id",
    "student_key",
    "exam_id",
    "qid",
    "response_text",
    "points_awarded",
    "detail_json",
    "graded_by",
    "graded_at",
    "timestamp",
    "class_section",
    "last_name",
    "first_name",
    "section",
    "mcq_choice",
    "comment",
  ],

  [SHEETS_.SCORES_EXAMID]: [
    "student_key",
    "first_name",
    "last_name",
    "class_section",
    "total_points",
    "total_possible",
    "ib_grade",
    "ku_points",
    "ku_possible",
    "ku_band",
    "tt_points",
    "tt_possible",
    "tt_band",
    "c_points",
    "c_possible",
    "c_band",
    "paper_1a_earned",
    "paper_1a_possible",
    "paper_1b_earned",
    "paper_1b_possible",
    "paper_2_earned",
    "paper_2_possible",
  ],

  [SHEETS_.BREAKDOWN_EXAMID]: [
    "student_key",
    "qid",
    "paper",
    "strand",
    "ib_topic_code",
    "points_earned",
    "points_possible",
    "response",
    "correct_answer",
  ],

  [SHEETS_.GRADE_BANDS]: [
    "exam_id",
    "level",
    "band_type",
    "band",
    "min_pct",
    "max_pct",
    "scale",
    "strand",
    "min_points",
    "max_points",
  ],

  [SHEETS_.SCORES_CURRENT]: [
    "exam_id",
    "class_section",
    "student_key",
    "last_name",
    "first_name",
    "total_points",
    "ku_points",
    "tt_points",
    "c_points",
    "paper_1a_earned",
    "paper_1b_earned",
    "paper_2_earned",
    "ib_grade",
    "overall_band",
    "ku_band",
    "tt_band",
    "c_band",
    "last_updated",
    "ap_band",
  ],

  [SHEETS_.SCORES_ALL]: [
    "student_key",
    "last_name",
    "first_name",
    "class_section",
    "exam_id",
    "total_points",
    "ku_points",
    "tt_points",
    "c_points",
    "ap_band",
    "ku_band",
    "tt_band",
    "c_band",
    "last_updated",
  ],

  [SHEETS_.TOPIC_SKILL]: [
    "exam_id",
    "class_section",
    "student_key",
    "last_name",
    "first_name",
    "section",
    "qid",
    "strand",
    "ap_topic",
    "ap_skill",
    "points_possible",
    "points_earned",
    "is_correct_mcq",
  ],

  [SHEETS_.CURRICULUM]: ["ib_topic_code", "description", "group", "groupDescription", "hl_only"],

  [SHEETS_.ACCESS_LOG]: [
    "timestamp",
    "email",
    "role",
    "action_type",
    "details",
    "ip_hint",
  ],

  [SHEETS_.PERMISSIONS]: [
    "permission_id",
    "scope_type",
    "scope_value",
    "resource_type",
    "resource_id",
    "access",
    "created_by",
    "created_at",
  ],

  [SHEETS_.QUESTION_CONTENT]: [
    "qid",
    "exam_id",
    "block_order",
    "block_type",
    "content",
  ],
};

// ============================================================================
// Internal helpers
// ============================================================================
const _ENSURED_ = {};

function _norm_(v) {
  return String(v == null ? "" : v).trim();
}

function _lower_(v) {
  return _norm_(v).toLowerCase();
}

function _isBlank_(v) {
  return v === "" || v === null || v === undefined;
}

// ============================================================================
// Sheet creation + header repair
// ============================================================================
function ensureSheets_() {
  const ss = SpreadsheetApp.getActive();

  Object.keys(HEADERS_).forEach((name) => {
    if (_ENSURED_[name]) return;

    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);

    const desired = HEADERS_[name];
    if (!desired || !desired.length) {
      _ENSURED_[name] = true;
      return;
    }

    const lastCol = Math.max(1, sh.getLastColumn());
    const existingRaw = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    const existing = existingRaw.map(_norm_);

    const headerLooksEmpty = existing.every((h) => !h);

    // If the sheet is empty / header row is empty, initialize
    if (headerLooksEmpty) {
      sh.getRange(1, 1, 1, desired.length).setValues([desired]);
      sh.setFrozenRows(1);
      _ENSURED_[name] = true;
      return;
    }

    // Append missing headers (case-insensitive)
    const existingSet = new Set(existing.map(_lower_).filter(Boolean));
    const missing = desired.filter((h) => !existingSet.has(_lower_(h)));

    if (missing.length) {
      sh.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
    }

    sh.setFrozenRows(1);
    _ENSURED_[name] = true;
  });
}

function sheet_(name) {
  ensureSheets_();
  return SpreadsheetApp.getActive().getSheetByName(name);
}

// ============================================================================
// Header map (DUPLICATE-SAFE)
// - Keeps FIRST occurrence of a header key
// ============================================================================
function headerMap_(sheetName) {
  const sh = sheet_(sheetName);
  const lastCol = Math.max(1, sh.getLastColumn());
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(_norm_);

  const map = {};
  headers.forEach((h, idx) => {
    if (!h) return;
    if (map[h] === undefined) map[h] = idx; // FIRST wins
  });

  return { headers, map };
}

// ============================================================================
// Read all rows as objects
// - Duplicate headers: keep FIRST non-blank value encountered
// ============================================================================
function readAll_(sheetName) {
  const sh = sheet_(sheetName);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();

  if (lastRow < 2 || lastCol < 1) return [];

  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(_norm_);
  const values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();

  const out = [];
  values.forEach((row) => {
    if (row.every(_isBlank_)) return;

    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c];
      if (!h) continue;

      // If duplicate header exists, don't overwrite a real value with blank
      if (obj[h] !== undefined && !_isBlank_(obj[h])) continue;

      obj[h] = row[c];
    }
    out.push(obj);
  });

  return out;
}

// ============================================================================
// Overwrite entire sheet (headers remain; rows replaced)
// ============================================================================
function writeAll_(sheetName, rowObjs) {
  const sh = sheet_(sheetName);
  const { headers } = headerMap_(sheetName);

  // Clear all data rows (leave header)
  const dataRows = Math.max(0, sh.getLastRow() - 1);
  if (dataRows) {
    sh.getRange(2, 1, dataRows, headers.length).clearContent();
  }

  const rows = rowObjs || [];
  if (!rows.length) return;

  const matrix = rows.map((obj) => headers.map((h) => (h ? (obj[h] ?? "") : "")));
  sh.getRange(2, 1, matrix.length, headers.length).setValues(matrix);
}

// ============================================================================
// UPSERT helpers
// - upsertByKey_ wraps upsertManyByKey_
// ============================================================================
function upsertByKey_(sheetName, keyCols, obj) {
  upsertManyByKey_(sheetName, keyCols, [obj]);
}

/**
 * Upsert many rows by composite key.
 * keyCols: ["exam_id","student_key","qid"] etc
 *
 * Implementation:
 * - Reads ONLY the key columns to build an index (cheaper than full table read)
 * - Updates matched rows (row-level write)
 * - Appends new rows in one batch
 */
function upsertManyByKey_(sheetName, keyCols, rowObjs) {
  const sh = sheet_(sheetName);
  const { headers, map } = headerMap_(sheetName);

  const keys = (Array.isArray(keyCols) ? keyCols : [keyCols]).map(_norm_).filter(Boolean);
  const objs = rowObjs || [];
  if (!keys.length || !objs.length) return;

  const lastRow = sh.getLastRow();
  const dataRows = Math.max(0, lastRow - 1);

  // If sheet has no data rows, append everything
  if (dataRows === 0) {
    const appendMatrix = objs.map((obj) => headers.map((h) => (h ? (obj[h] ?? "") : "")));
    sh.getRange(2, 1, appendMatrix.length, headers.length).setValues(appendMatrix);
    return;
  }

  // Build key column indices (must exist on sheet)
  const keyIdxs = keys.map((k) => map[k]).filter((i) => i !== undefined);
  if (keyIdxs.length !== keys.length) {
    // If a key col is missing, fail loudly to force schema correction
    throw new Error(
      `Db.gs upsertManyByKey_: Missing key column(s) on sheet "${sheetName}". Expected keys: ${keys.join(", ")}`
    );
  }

  // Read key columns only
  const keyColsData = keyIdxs.map((colIdx) =>
    sh.getRange(2, colIdx + 1, dataRows, 1).getValues().flat()
  );

  // Index existing rows by composite key (LAST occurrence wins)
  const index = new Map();
  for (let r = 0; r < dataRows; r++) {
    const k = keyColsData.map((arr) => _norm_(arr[r])).join("||");
    if (k) index.set(k, r); // r is 0-based within data rows
  }

  // Apply updates
  const toAppend = [];
  objs.forEach((obj) => {
    const k = keys.map((c) => _norm_(obj[c])).join("||");
    const rowArr = headers.map((h) => (h ? (obj[h] ?? "") : ""));

    if (index.has(k)) {
      const r0 = index.get(k); // 0-based in data rows
      sh.getRange(r0 + 2, 1, 1, headers.length).setValues([rowArr]);
    } else {
      toAppend.push(rowArr);
    }
  });

  // Append new rows as one batch
  if (toAppend.length) {
    sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, headers.length).setValues(toAppend);
  }
}

// ============================================================================
// Config helpers (supports both key/value AND setting_key/setting_value)
// ============================================================================
function getConfig_(key, fallback = "") {
  const k = _norm_(key);
  if (!k) return fallback;

  const rows = readAll_(SHEETS_.CONFIG);
  const hit = rows.find((r) => _norm_(r.key) === k || _norm_(r.setting_key) === k);

  if (!hit) return fallback;

  const v =
    hit.value !== undefined && hit.value !== null && hit.value !== ""
      ? hit.value
      : hit.setting_value;

  return v === undefined || v === null || v === "" ? fallback : v;
}

function setConfig_(key, value) {
  const k = _norm_(key);
  if (!k) return;

  const { map } = headerMap_(SHEETS_.CONFIG);
  const hasKey = map["key"] !== undefined;
  const keyCol = hasKey ? ["key"] : ["setting_key"];

  upsertByKey_(SHEETS_.CONFIG, keyCol, {
    // write both styles for compatibility
    key: k,
    value: String(value),
    setting_key: k,
    setting_value: String(value),
  });
}

// ============================================================================
// Student key helper (kept exactly like your current signature)
// ============================================================================
function studentKey_(last, first, cls) {
  return `${String(last || "").trim().toLowerCase()}|${String(first || "").trim().toLowerCase()}|${String(
    cls || ""
  )
    .trim()
    .toLowerCase()}`;
}
