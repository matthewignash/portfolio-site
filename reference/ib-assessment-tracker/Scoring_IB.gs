/**
 * Scoring_IB.gs - Scoring Engine for IB Chemistry (SL/HL)
 *
 * Handles three paper types:
 *   - Paper 1A: Auto-scored MCQ (scoring_mode = "auto")
 *   - Paper 1B: Checklist/Manual scored (scoring_mode = "checklist" or "manual")
 *   - Paper 2: Checklist/Manual scored (scoring_mode = "checklist" or "manual")
 *
 * Supports:
 *   - SL (Standard Level) and HL (Higher Level) with different grade boundaries
 *   - checklist_mode column: "AND", "OR", or auto-detect
 */

/**
 * Compute exam totals by strand and paper
 */
function computeExamTotals_(exam_id) {
  const qs = readAll_(SHEETS_.QUESTIONS)
    .filter(q => String(q.exam_id) === exam_id && String(q.active).toUpperCase() !== "FALSE");

  let overall = 0, ku = 0, tt = 0, c = 0;
  let paper_1a = 0, paper_1b = 0, paper_2 = 0;

  qs.forEach(q => {
    const pts = Number(q.max_points || q.points_possible || 0);
    if (pts <= 0) return;

    overall += pts;

    // Strand totals
    const strand = String(q.strand || "").trim().toUpperCase();
    if (strand === "KU") ku += pts;
    else if (strand === "TT") tt += pts;
    else if (strand === "C") c += pts;

    // Paper totals
    const paper = getPaperType_(q);
    if (paper === "1A") paper_1a += pts;
    else if (paper === "1B") paper_1b += pts;
    else if (paper === "2") paper_2 += pts;
  });

  return {
    overall_possible: overall,
    ku_possible: ku,
    tt_possible: tt,
    c_possible: c,
    paper_1a_possible: paper_1a,
    paper_1b_possible: paper_1b,
    paper_2_possible: paper_2
  };
}

/**
 * Get paper type from question (1A, 1B, or 2)
 */
function getPaperType_(q) {
  const paper = String(q.paper || "").toUpperCase().replace("PAPER", "").replace(" ", "").trim();
  if (paper === "1A" || paper === "1B" || paper === "2") return paper;

  // Fallback: try to detect from qtype/section
  const qtype = String(q.qtype || q.section || "").toUpperCase();
  if (qtype === "MCQ" || qtype === "1A") return "1A";
  if (qtype === "1B") return "1B";
  if (qtype === "FRQ" || qtype === "FRQ_PART" || qtype === "2") return "2";

  return "";
}

/**
 * Get scoring mode from question
 */
function getScoringMode_(q) {
  return String(q.scoring_mode || "").toLowerCase().trim();
}

/**
 * Get max points from question (handles both column names)
 */
function getMaxPoints_(q) {
  return Number(q.max_points || q.points_possible || 0);
}

/**
 * Find band from boundaries - now supports level (SL/HL)
 * @param {Array} bands - All grade bands
 * @param {string} scale - Scale type (IB_1_7 or AISC_1_8)
 * @param {string} strand - Strand (OVERALL, KU, TT, C)
 * @param {number} points - Points earned
 * @param {string} level - Level (SL or HL)
 */
function findBand_(bands, scale, strand, points, level) {
  const p = Number(points || 0);
  const lvl = String(level || "").toUpperCase().trim();

  // First try to find level-specific bands
  let rows = bands.filter(b =>
    String(b.scale) === scale &&
    String(b.strand) === strand &&
    String(b.level || "").toUpperCase().trim() === lvl
  );

  // If no level-specific bands, fall back to bands without level specified
  if (rows.length === 0) {
    rows = bands.filter(b =>
      String(b.scale) === scale &&
      String(b.strand) === strand &&
      (!b.level || String(b.level).trim() === "")
    );
  }

  for (const r of rows) {
    const min = Number(r.min_points);
    const max = Number(r.max_points);
    if (p >= min && p <= max) return String(r.band);
  }
  return "";
}

/**
 * Get exam level (SL or HL)
 */
function getExamLevel_(exam_id) {
  const exams = readAll_(SHEETS_.EXAMS);
  const exam = exams.find(e => String(e.exam_id) === exam_id);
  return String(exam?.level || "HL").toUpperCase().trim(); // Default to HL if not specified
}

/**
 * Main recompute function for IB Chemistry
 */
function recomputeExam_(exam_id, classSection) {
  if (!exam_id) return;

  // Get exam level
  const level = getExamLevel_(exam_id);
  console.log(`Recompute IB ${level}: exam=${exam_id}`);

  const bands = readAll_(SHEETS_.GRADE_BANDS).filter(b =>
    String(b.exam_id) === exam_id || String(b.exam_id) === "DEFAULT"
  );

  const questions = readAll_(SHEETS_.QUESTIONS).filter(q =>
    String(q.exam_id) === exam_id && String(q.active).toUpperCase() !== "FALSE"
  );

  // Separate questions by paper
  const paper1A = questions.filter(q => getPaperType_(q) === "1A" && getMaxPoints_(q) > 0);
  const paper1B = questions.filter(q => getPaperType_(q) === "1B" && getMaxPoints_(q) > 0);
  const paper2 = questions.filter(q => getPaperType_(q) === "2" && getMaxPoints_(q) > 0);

  console.log(`Paper1A=${paper1A.length}, Paper1B=${paper1B.length}, Paper2=${paper2.length}`);

  // Load rubrics
  const rubric = readAll_(SHEETS_.RUBRICS).filter(r => String(r.exam_id) === exam_id);
  const rubricByQ = new Map();
  rubric.forEach(r => {
    const k = String(r.qid);
    if (!rubricByQ.has(k)) rubricByQ.set(k, []);
    rubricByQ.get(k).push({ item_id: String(r.item_id || ""), points: Number(r.points || 0) });
  });

  // Student list: prefer roster; fallback to responses
  let students = readAll_(SHEETS_.ROSTER)
    .filter(r => !classSection || String(r.class_section) === classSection)
    .map(r => ({
      student_key: String(r.student_key || studentKey_(r.last_name, r.first_name, r.class_section)),
      last_name: String(r.last_name || ""),
      first_name: String(r.first_name || ""),
      class_section: String(r.class_section || ""),
    }));

  if (!students.length) {
    const resp = readAll_(SHEETS_.RESPONSES).filter(r => String(r.exam_id) === exam_id);
    const keys = [...new Set(resp.map(r => String(r.student_key || "")).filter(Boolean))];
    students = keys.map(k => ({ student_key: k, last_name: "", first_name: "", class_section: "" }));
  }

  console.log(`Students to score: ${students.length}`);

  // Load responses
  const respRows = readAll_(SHEETS_.RESPONSES).filter(r => String(r.exam_id) === exam_id);
  const respMap = new Map();
  respRows.forEach(r => {
    const k = `${r.exam_id}||${r.student_key}||${r.qid}`;
    respMap.set(k, r);
  });

  console.log(`Responses loaded: ${respRows.length}`);

  const now = new Date().toISOString();
  const scoreUpserts = [];
  const allScoreUpserts = [];
  const topicSkillRows = [];

  for (const s of students) {
    let total = 0, ku = 0, tt = 0, cc = 0;
    let p1a_earned = 0, p1b_earned = 0, p2_earned = 0;

    // ---------- Paper 1A scoring (auto-scored MCQ) ----------
    let p1a_matched = 0, p1a_missed = 0;
    for (const q of paper1A) {
      const key = `${exam_id}||${s.student_key}||${q.qid}`;
      const r = respMap.get(key);
      const pts = getMaxPoints_(q);
      let earned = 0;

      if (!r) {
        p1a_missed++;
        // No response found for this question — skip
      } else {
        p1a_matched++;
        const scoringMode = getScoringMode_(q);

        if (scoringMode === "auto" || scoringMode === "") {
          // Standard MCQ auto-scoring
          const choice = String(r.mcq_choice || r.response_text || "").toUpperCase().trim();
          const correct = String(q.correct_answer || "").toUpperCase().trim();
          const isCorrect = choice && correct && choice === correct;
          earned = isCorrect ? pts : 0;

          // Fallback: if auto-scoring couldn't determine (e.g. missing mcq_choice column),
          // use stored points_awarded (now populated at save time)
          if (!isCorrect && r.points_awarded !== "" && r.points_awarded !== undefined && r.points_awarded !== null) {
            const stored = Number(r.points_awarded);
            if (!isNaN(stored) && stored > 0) earned = Math.min(stored, pts);
          }
        } else {
          // Checklist or manual scoring for Paper 1A (if needed)
          earned = scoreChecklistOrManual_(q, r, rubricByQ, pts);
        }
      }

      total += earned;
      p1a_earned += earned;

      const strand = String(q.strand || "").toUpperCase();
      if (strand === "KU") ku += earned;
      else if (strand === "TT") tt += earned;
      else if (strand === "C") cc += earned;

      // Topic breakdown
      const scoringMode = getScoringMode_(q);
      addTopicBreakdown_(topicSkillRows, exam_id, s, q, "1A", earned, pts,
        scoringMode === "auto" || scoringMode === "" ? (earned > 0 ? 1 : 0) : "");
    }
    console.log(`Paper 1A: student=${s.student_key}, matched=${p1a_matched}, missed=${p1a_missed}, earned=${p1a_earned}`);

    // ---------- Paper 1B scoring (checklist/manual) ----------
    for (const q of paper1B) {
      const key = `${exam_id}||${s.student_key}||${q.qid}`;
      const r = respMap.get(key);
      const pts = getMaxPoints_(q);

      const earned = scoreChecklistOrManual_(q, r, rubricByQ, pts);

      total += earned;
      p1b_earned += earned;

      const strand = String(q.strand || "").toUpperCase();
      if (strand === "KU") ku += earned;
      else if (strand === "TT") tt += earned;
      else if (strand === "C") cc += earned;

      addTopicBreakdown_(topicSkillRows, exam_id, s, q, "1B", earned, pts, "");
    }

    // ---------- Paper 2 scoring (checklist/manual) ----------
    for (const q of paper2) {
      const key = `${exam_id}||${s.student_key}||${q.qid}`;
      const r = respMap.get(key);
      const pts = getMaxPoints_(q);

      const earned = scoreChecklistOrManual_(q, r, rubricByQ, pts);

      total += earned;
      p2_earned += earned;

      const strand = String(q.strand || "").toUpperCase();
      if (strand === "KU") ku += earned;
      else if (strand === "TT") tt += earned;
      else if (strand === "C") cc += earned;

      addTopicBreakdown_(topicSkillRows, exam_id, s, q, "2", earned, pts, "");
    }

    // Calculate bands - now using level
    const ib_grade = findBand_(bands, "IB_1_7", "OVERALL", total, level);
    const ku_band = findBand_(bands, "AISC_1_8", "KU", ku, level);
    const tt_band = findBand_(bands, "AISC_1_8", "TT", tt, level);
    const c_band = findBand_(bands, "AISC_1_8", "C", cc, level);

    const scoreRow = {
      exam_id,
      level,
      class_section: s.class_section,
      student_key: s.student_key,
      last_name: s.last_name,
      first_name: s.first_name,
      total_points: total,
      ku_points: ku,
      tt_points: tt,
      c_points: cc,
      paper_1a_earned: p1a_earned,
      paper_1b_earned: p1b_earned,
      paper_2_earned: p2_earned,
      ib_grade,
      overall_band: ib_grade,  // Alias for compatibility
      ku_band,
      tt_band,
      c_band,
      last_updated: now
    };

    scoreUpserts.push(scoreRow);

    allScoreUpserts.push({
      student_key: s.student_key,
      last_name: s.last_name,
      first_name: s.first_name,
      class_section: s.class_section,
      exam_id,
      level,
      total_points: total,
      ku_points: ku,
      tt_points: tt,
      c_points: cc,
      paper_1a_earned: p1a_earned,
      paper_1b_earned: p1b_earned,
      paper_2_earned: p2_earned,
      ib_grade,
      overall_band: ib_grade,
      ku_band,
      tt_band,
      c_band,
      last_updated: now
    });
  }

  console.log(`Writing ${scoreUpserts.length} score rows...`);

  upsertManyByKey_(SHEETS_.SCORES_CURRENT, ["exam_id", "student_key"], scoreUpserts);
  upsertManyByKey_(SHEETS_.SCORES_ALL, ["exam_id", "student_key"], allScoreUpserts);

  // Replace breakdown rows for this exam
  const existing = readAll_(SHEETS_.TOPIC_SKILL);
  const kept = existing.filter(r => {
    if (String(r.exam_id) !== exam_id) return true;
    if (!classSection) return false;
    return String(r.class_section) !== classSection;
  });
  writeAll_(SHEETS_.TOPIC_SKILL, kept.concat(topicSkillRows));

  console.log(`IB ${level} Recompute complete!`);
}

/**
 * Score a checklist or manual question
 */
function scoreChecklistOrManual_(q, r, rubricByQ, maxPts) {
  let earned = 0;

  const items = rubricByQ.get(String(q.qid)) || [];
  if (items.length > 0) {
    let picked = [];
    try { picked = JSON.parse(String(r?.detail_json || "[]")); } catch(e) { picked = []; }
    const itemMap = new Map(items.map(it => [String(it.item_id), Number(it.points || 0)]));

    // Determine checklist mode: AND, OR, or auto-detect
    const checklistMode = String(q.checklist_mode || "").toUpperCase().trim();
    const rubricTotalPoints = items.reduce((sum, it) => sum + Number(it.points || 0), 0);

    let isOrRubric = false;
    if (checklistMode === "OR") {
      isOrRubric = true;
    } else if (checklistMode === "AND") {
      isOrRubric = false;
    } else {
      // Auto-detect: if rubric_sum > max_points, treat as OR
      isOrRubric = rubricTotalPoints > maxPts;
    }

    if (isOrRubric) {
      // OR rubric: any checked item = full points
      const validPicks = picked.filter(id => itemMap.has(String(id)));
      earned = validPicks.length > 0 ? maxPts : 0;
    } else {
      // AND rubric: sum the points for each checked item
      earned = picked.reduce((sum, id) => sum + (itemMap.get(String(id)) || 0), 0);
      earned = Math.min(earned, maxPts);
    }
  } else {
    // Manual scoring: use points_awarded directly
    const raw = r?.points_awarded;
    earned = raw === "" || raw === null || raw === undefined ? 0 : Number(raw);
    earned = Math.max(0, Math.min(earned, maxPts));
  }

  return earned;
}

/**
 * Add topic breakdown row
 */
function addTopicBreakdown_(rows, exam_id, student, q, paper, earned, possible, isCorrectMcq) {
  const topicsRaw = String(q.ib_topic_code || q.ib_topics_csv || q.ap_topics_csv || q.ap_topic_code || "");
  const topics = topicsRaw.split(",").map(x => x.trim()).filter(Boolean);

  (topics.length ? topics : [""]).forEach(t => {
    rows.push({
      exam_id,
      class_section: student.class_section,
      student_key: student.student_key,
      last_name: student.last_name,
      first_name: student.first_name,
      paper: paper,
      section: `Paper ${paper}`,
      qid: q.qid,
      strand: String(q.strand || ""),
      ib_topic_code: t,
      ap_topic: t,  // Alias for compatibility with report generator
      ap_skill: String(q.ib_skill_code || q.ap_skill_code || ""),
      points_possible: possible,
      points_earned: earned,
      is_correct_mcq: isCorrectMcq
    });
  });
}
