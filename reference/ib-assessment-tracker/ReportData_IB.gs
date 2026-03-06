/**
 * ReportData_IB.gs - Data compilation for IB Chemistry student reports
 * Contains AISC holistic language and functions to gather report data
 */

// ============================================================================
// AISC HOLISTIC LANGUAGE BY STRAND AND BAND
// ============================================================================

const AISC_LANGUAGE = {
  KU: {
    name: "Knowledge and Understanding",
    description: "The student recalls facts, terms and definitions while also explaining concepts, ideas, processes, themes and the like. The student learns and performs skills related to their studies.",
    bands: {
      "7": "The student demonstrates exemplary knowledge and understanding of factual information in the IB Chemistry syllabus, including scientific theories, concepts, processes, and vocabulary relevant to the course. The student answers almost all quantitative and/or qualitative knowledge-based questions correctly. The student displays exemplary knowledge of safe laboratory practice and a wide range of investigative techniques.",
      "8": "The student demonstrates exemplary knowledge and understanding of factual information in the IB Chemistry syllabus, including scientific theories, concepts, processes, and vocabulary relevant to the course. The student answers almost all quantitative and/or qualitative knowledge-based questions correctly. The student displays exemplary knowledge of safe laboratory practice and a wide range of investigative techniques.",
      "5": "The student demonstrates proficient knowledge and understanding of factual information, including scientific theories, concepts, processes, and vocabulary relevant to the course. The student answers most quantitative and/or qualitative knowledge-based questions correctly. The student displays proficient knowledge of safe laboratory practice and common investigative techniques.",
      "6": "The student demonstrates proficient knowledge and understanding of factual information, including scientific theories, concepts, processes, and vocabulary relevant to the course. The student answers most quantitative and/or qualitative knowledge-based questions correctly. The student displays proficient knowledge of safe laboratory practice and common investigative techniques.",
      "3": "The student demonstrates some knowledge and understanding of factual information, including scientific theories, concepts, processes, and vocabulary relevant to the course. The student answers some quantitative and/or qualitative knowledge-based questions correctly, but solutions contain errors, some of which may be conceptual. The student displays some knowledge of safe laboratory practice and common investigative techniques.",
      "4": "The student demonstrates some knowledge and understanding of factual information, including scientific theories, concepts, processes, and vocabulary relevant to the course. The student answers some quantitative and/or qualitative knowledge-based questions correctly, but solutions contain errors, some of which may be conceptual. The student displays some knowledge of safe laboratory practice and common investigative techniques.",
      "1": "The student demonstrates little knowledge and understanding of factual information, including scientific theories, concepts, processes, and vocabulary relevant to the course. The student answers few quantitative and/or qualitative knowledge-based questions correctly. The student displays little knowledge of laboratory safety and investigative techniques.",
      "2": "The student demonstrates little knowledge and understanding of factual information, including scientific theories, concepts, processes, and vocabulary relevant to the course. The student answers few quantitative and/or qualitative knowledge-based questions correctly. The student displays little knowledge of laboratory safety and investigative techniques."
    }
  },
  TT: {
    name: "Thinking and Transfer",
    description: "The student plans for learning by formulating questions, generating ideas and researching. The student thinks about learning critically by analyzing, interpreting, evaluating and using other metacognitive skills. The student applies knowledge and skills to unfamiliar or new contexts.",
    bands: {
      "7": "The student consistently applies knowledge and understanding in a highly effective way to solve almost all quantitative and/or qualitative higher-order thinking questions correctly. The student demonstrates highly effective ability to conduct background research, design experiments, and collect sufficient and reliable data. The student analyzes and evaluates quantitative and/or qualitative data in a highly effective way to construct detailed, accurate explanations of scientific phenomena. The student consistently evaluates the impact of any measurement uncertainty or flaws in the design of an experiment, including both procedural issues as well as underlying theoretical assumptions in a highly effective way.",
      "8": "The student consistently applies knowledge and understanding in a highly effective way to solve almost all quantitative and/or qualitative higher-order thinking questions correctly. The student demonstrates highly effective ability to conduct background research, design experiments, and collect sufficient and reliable data. The student analyzes and evaluates quantitative and/or qualitative data in a highly effective way to construct detailed, accurate explanations of scientific phenomena. The student consistently evaluates the impact of any measurement uncertainty or flaws in the design of an experiment, including both procedural issues as well as underlying theoretical assumptions in a highly effective way.",
      "5": "The student applies knowledge and understanding in a proficient way to solve most quantitative and/or qualitative higher-order thinking questions correctly, with only minor, non-conceptual errors. The student demonstrates proficiency in conducting background research, designing experiments, and collecting data. The student analyzes and evaluates quantitative and/or qualitative data proficiently to construct clear explanations of scientific phenomena. The student usually evaluates the impact of any measurement uncertainty or flaws in the design of an experiment, including both procedural issues as well as underlying theoretical assumptions in a proficient way.",
      "6": "The student applies knowledge and understanding in a proficient way to solve most quantitative and/or qualitative higher-order thinking questions correctly, with only minor, non-conceptual errors. The student demonstrates proficiency in conducting background research, designing experiments, and collecting data. The student analyzes and evaluates quantitative and/or qualitative data proficiently to construct clear explanations of scientific phenomena. The student usually evaluates the impact of any measurement uncertainty or flaws in the design of an experiment, including both procedural issues as well as underlying theoretical assumptions in a proficient way.",
      "3": "The student applies knowledge and understanding in an underdeveloped way when solving quantitative and/or qualitative higher-order thinking questions. Answers may contain significant errors, demonstrating an underdeveloped ability to apply the learning to new or complex situations. The student demonstrates underdeveloped skills in conducting background research, designing experiments, and collecting data. The student analyzes and evaluates quantitative and/or qualitative data to construct partial/broad explanations of scientific phenomena. The student sometimes evaluates the impact of any measurement uncertainty or flaws in the design of an experiment, but the evaluation is typically limited to procedural issues without addressing any underlying theoretical assumptions.",
      "4": "The student applies knowledge and understanding in an underdeveloped way when solving quantitative and/or qualitative higher-order thinking questions. Answers may contain significant errors, demonstrating an underdeveloped ability to apply the learning to new or complex situations. The student demonstrates underdeveloped skills in conducting background research, designing experiments, and collecting data. The student analyzes and evaluates quantitative and/or qualitative data to construct partial/broad explanations of scientific phenomena. The student sometimes evaluates the impact of any measurement uncertainty or flaws in the design of an experiment, but the evaluation is typically limited to procedural issues without addressing any underlying theoretical assumptions.",
      "1": "The student applies knowledge and understanding in a superficial way when solving quantitative and/or qualitative higher-order thinking questions. Answers contain significant conceptual errors, demonstrating an insufficient ability to apply the learning to new or complex situations. The student demonstrates superficial skills in conducting background research, designing experiments, and collecting data. The student attempts to analyse and evaluate quantitative and/or qualitative data to construct superficial explanations of scientific phenomena. The student rarely evaluates the impact of any measurement uncertainty or flaws in the design of an experiment; evaluation is typically limited to procedural issues without addressing any underlying theoretical assumptions.",
      "2": "The student applies knowledge and understanding in a superficial way when solving quantitative and/or qualitative higher-order thinking questions. Answers contain significant conceptual errors, demonstrating an insufficient ability to apply the learning to new or complex situations. The student demonstrates superficial skills in conducting background research, designing experiments, and collecting data. The student attempts to analyse and evaluate quantitative and/or qualitative data to construct superficial explanations of scientific phenomena. The student rarely evaluates the impact of any measurement uncertainty or flaws in the design of an experiment; evaluation is typically limited to procedural issues without addressing any underlying theoretical assumptions."
    }
  },
  C: {
    name: "Communication",
    description: "The student expresses and organizes ideas in multiple forms. The student adapts communication appropriately to different audiences and forms. The student uses conventions, terminology and vocabulary relevant to the discipline.",
    bands: {
      "7": "The student demonstrates highly effective communication skills across a variety of contexts (written tests, discussions, presentations, lab reports, posters, etc.). Oral and written responses are highly focused. They are logically structured, detailed, accurate, clear and concise, and demonstrate highly effective use of scientific terminology, vocabulary, and writing conventions. In multi-step problems, all work is shown clearly and the solution is very easy to follow.",
      "8": "The student demonstrates highly effective communication skills across a variety of contexts (written tests, discussions, presentations, lab reports, posters, etc.). Oral and written responses are highly focused. They are logically structured, detailed, accurate, clear and concise, and demonstrate highly effective use of scientific terminology, vocabulary, and writing conventions. In multi-step problems, all work is shown clearly and the solution is very easy to follow.",
      "5": "The student demonstrates mainly effective communication skills across a variety of contexts (written tests, discussions, presentations, lab reports, posters, etc.). Oral and written responses are mainly effective. They are logically structured, detailed, clear and accurate, and demonstrate mainly effective use of scientific terminology, vocabulary, and writing conventions. In multi-step problems, most work is shown, but some steps may be unclear or are missing.",
      "6": "The student demonstrates mainly effective communication skills across a variety of contexts (written tests, discussions, presentations, lab reports, posters, etc.). Oral and written responses are mainly effective. They are logically structured, detailed, clear and accurate, and demonstrate mainly effective use of scientific terminology, vocabulary, and writing conventions. In multi-step problems, most work is shown, but some steps may be unclear or are missing.",
      "3": "The student demonstrates generally effective communication skills across a variety of contexts (written tests, discussions, presentations, lab reports, posters, etc.). Oral and written responses demonstrate generally effective use of scientific terminology, vocabulary, and writing conventions, but may lack clarity or include repetitive or irrelevant information. In multi-step problems, some work is shown but key steps may be missing or the solution may be difficult to follow.",
      "4": "The student demonstrates generally effective communication skills across a variety of contexts (written tests, discussions, presentations, lab reports, posters, etc.). Oral and written responses demonstrate generally effective use of scientific terminology, vocabulary, and writing conventions, but may lack clarity or include repetitive or irrelevant information. In multi-step problems, some work is shown but key steps may be missing or the solution may be difficult to follow.",
      "1": "The student demonstrates inaccurate communication skills across a variety of contexts (written tests, discussions, presentations, lab reports, posters, etc.). Oral and written responses are unclear, demonstrating inaccurate use of scientific terminology, vocabulary, and writing conventions. In multi-step problems, little or no work is shown, and the solution is very difficult to follow.",
      "2": "The student demonstrates inaccurate communication skills across a variety of contexts (written tests, discussions, presentations, lab reports, posters, etc.). Oral and written responses are unclear, demonstrating inaccurate use of scientific terminology, vocabulary, and writing conventions. In multi-step problems, little or no work is shown, and the solution is very difficult to follow."
    }
  }
};

// ============================================================================
// CURRICULUM ALIGNMENT DATA
// ============================================================================

/**
 * Read curriculum alignment data from the sheet
 */
function getCurriculumAlignment_() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("Curriculum");
  if (!sheet) return {};

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return {};

  const headers = data[0].map(h => String(h || "").toLowerCase().trim());
  const topicCol = headers.indexOf("ib_topic_code");
  const descCol = headers.indexOf("description");
  const groupCol = headers.indexOf("group");
  const groupDescCol = headers.indexOf("groupdescription");

  const alignment = {};
  let currentGroup = "";
  let currentGroupDesc = "";

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const topic = String(row[topicCol] || "").trim();
    const desc = String(row[descCol] || "").trim();
    const group = String(row[groupCol] || "").trim() || currentGroup;
    const groupDesc = String(row[groupDescCol] || "").trim() || currentGroupDesc;

    if (row[groupCol]) currentGroup = group;
    if (row[groupDescCol]) currentGroupDesc = groupDesc;

    if (topic) {
      alignment[topic] = {
        topic: topic,
        description: desc,
        group: group,
        groupDescription: groupDesc
      };
    }
  }

  return alignment;
}

// ============================================================================
// REPORT DATA COMPILATION
// ============================================================================

/**
 * Get all data needed to generate a student report
 * @param {string} examId - Exam ID
 * @param {string} studentKey - Student key
 * @returns {Object} Complete report data
 */
function getStudentReportData_(examId, studentKey) {
  const exam_id = String(examId || "").trim();
  const sk = String(studentKey || "").trim();

  // Get exam info
  const exams = readAll_(SHEETS_.EXAMS);
  const exam = exams.find(e => String(e.exam_id) === exam_id) || {};
  const level = String(exam.level || "HL").toUpperCase().trim();

  // Get student info from roster
  const roster = readAll_(SHEETS_.ROSTER);
  const student = roster.find(r => String(r.student_key) === sk) || {};

  // Get student scores
  const scores = readAll_(SHEETS_.SCORES_CURRENT);
  const studentScore = scores.find(s =>
    String(s.exam_id) === exam_id && String(s.student_key) === sk
  ) || {};

  // Get exam totals
  const totals = computeExamTotals_(exam_id);

  // Get questions
  const questions = readAll_(SHEETS_.QUESTIONS).filter(q =>
    String(q.exam_id) === exam_id && String(q.active).toUpperCase() !== "FALSE"
  );

  // Get responses
  const responses = readAll_(SHEETS_.RESPONSES).filter(r =>
    String(r.exam_id) === exam_id && String(r.student_key) === sk
  );
  const respMap = new Map(responses.map(r => [String(r.qid), r]));

  // Get rubrics
  const rubrics = readAll_(SHEETS_.RUBRICS).filter(r => String(r.exam_id) === exam_id);
  const rubricsByQ = new Map();
  rubrics.forEach(r => {
    const qid = String(r.qid);
    if (!rubricsByQ.has(qid)) rubricsByQ.set(qid, []);
    rubricsByQ.get(qid).push({
      item_id: String(r.item_id || ""),
      points: Number(r.points || 0),
      criteria_text: String(r.criteria_text || "")
    });
  });

  // Get topic/skill breakdown for this student
  const breakdown = readAll_(SHEETS_.TOPIC_SKILL).filter(r =>
    String(r.exam_id) === exam_id && String(r.student_key) === sk
  );

  // Get curriculum alignment
  const curriculum = getCurriculumAlignment_();

  // Helper functions
  const getPaper = (q) => String(q.paper || "").toUpperCase().replace("PAPER", "").replace(" ", "").trim();
  const getScoringMode = (q) => String(q.scoring_mode || "").toLowerCase().trim();
  const getMaxPoints = (q) => Number(q.max_points || q.points_possible || 0);

  // Build Paper 1A details (auto-scored MCQ)
  const paper1AQuestions = questions.filter(q => getPaper(q) === "1A" && getMaxPoints(q) > 0);
  paper1AQuestions.sort((a, b) => Number(a.number || 0) - Number(b.number || 0));

  const paper1ADetails = paper1AQuestions.map(q => {
    const resp = respMap.get(String(q.qid));
    const studentAnswer = String(resp?.response_text || resp?.mcq_choice || "").toUpperCase().trim();
    const correctAnswer = String(q.correct_answer || "").toUpperCase().trim();
    const isCorrect = studentAnswer && correctAnswer && studentAnswer === correctAnswer;
    const topic = String(q.ib_topic_code || q.ib_topics_csv || "").split(",")[0].trim();

    return {
      qid: q.qid,
      number: q.number,
      studentAnswer: studentAnswer || "-",
      correctAnswer: correctAnswer || "-",
      isCorrect: isCorrect,
      topic: topic,
      topicDescription: curriculum[topic]?.description || "",
      strand: q.strand || "KU"
    };
  });

  // Build Paper 1B details (checklist/manual)
  const paper1BQuestions = questions.filter(q => getPaper(q) === "1B" && getMaxPoints(q) > 0);
  paper1BQuestions.sort((a, b) => String(a.qid).localeCompare(String(b.qid)));

  const paper1BDetails = buildPaperDetails_(paper1BQuestions, respMap, rubricsByQ, curriculum);

  // Build Paper 2 details (checklist/manual)
  const paper2Questions = questions.filter(q => getPaper(q) === "2" && getMaxPoints(q) > 0);
  paper2Questions.sort((a, b) => String(a.qid).localeCompare(String(b.qid)));

  const paper2Details = buildPaperDetails_(paper2Questions, respMap, rubricsByQ, curriculum);

  // Build topic analysis (grouped and detailed)
  const topicAnalysis = buildTopicAnalysis_(breakdown, curriculum);

  // Get AISC language for bands
  const kuBand = String(studentScore.ku_band || "");
  const ttBand = String(studentScore.tt_band || "");
  const cBand = String(studentScore.c_band || "");

  return {
    // Exam info
    exam: {
      exam_id: exam_id,
      exam_name: exam.exam_name || exam_id,
      course: exam.course || "IB Chemistry",
      level: level,
      term: exam.term || ""
    },

    // Student info
    student: {
      student_key: sk,
      first_name: student.first_name || "",
      last_name: student.last_name || "",
      class_section: student.class_section || ""
    },

    // Overall scores
    scores: {
      total_points: Number(studentScore.total_points || 0),
      total_possible: totals.overall_possible,
      ib_grade: String(studentScore.ib_grade || studentScore.overall_band || ""),

      ku_points: Number(studentScore.ku_points || 0),
      ku_possible: totals.ku_possible,
      ku_band: kuBand,
      ku_language: AISC_LANGUAGE.KU.bands[kuBand] || "",

      tt_points: Number(studentScore.tt_points || 0),
      tt_possible: totals.tt_possible,
      tt_band: ttBand,
      tt_language: AISC_LANGUAGE.TT.bands[ttBand] || "",

      c_points: Number(studentScore.c_points || 0),
      c_possible: totals.c_possible,
      c_band: cBand,
      c_language: AISC_LANGUAGE.C.bands[cBand] || "",

      // Paper-level scores
      paper_1a_earned: Number(studentScore.paper_1a_earned || 0),
      paper_1a_possible: totals.paper_1a_possible || 0,
      paper_1b_earned: Number(studentScore.paper_1b_earned || 0),
      paper_1b_possible: totals.paper_1b_possible || 0,
      paper_2_earned: Number(studentScore.paper_2_earned || 0),
      paper_2_possible: totals.paper_2_possible || 0
    },

    // Strand descriptions
    strandDescriptions: {
      KU: AISC_LANGUAGE.KU.name,
      TT: AISC_LANGUAGE.TT.name,
      C: AISC_LANGUAGE.C.name
    },

    // Question details by paper
    paper1ADetails: paper1ADetails,
    paper1BDetails: paper1BDetails,
    paper2Details: paper2Details,

    // Topic analysis
    topicAnalysis: topicAnalysis,

    // Summary stats
    paper1ASummary: {
      correct: paper1ADetails.filter(m => m.isCorrect).length,
      total: paper1ADetails.length,
      byStrand: {
        KU: { correct: paper1ADetails.filter(m => m.isCorrect && m.strand === "KU").length, total: paper1ADetails.filter(m => m.strand === "KU").length },
        TT: { correct: paper1ADetails.filter(m => m.isCorrect && m.strand === "TT").length, total: paper1ADetails.filter(m => m.strand === "TT").length },
        C: { correct: paper1ADetails.filter(m => m.isCorrect && m.strand === "C").length, total: paper1ADetails.filter(m => m.strand === "C").length }
      }
    },

    paper1BSummary: {
      earned: paper1BDetails.reduce((sum, q) => sum + q.earnedPoints, 0),
      total: paper1BDetails.reduce((sum, q) => sum + q.maxPoints, 0)
    },

    paper2Summary: {
      earned: paper2Details.reduce((sum, q) => sum + q.earnedPoints, 0),
      total: paper2Details.reduce((sum, q) => sum + q.maxPoints, 0)
    },

    // Generation timestamp
    generatedAt: new Date().toISOString()
  };
}

/**
 * Build details for Paper 1B or Paper 2 questions (checklist/manual scored)
 */
function buildPaperDetails_(questions, respMap, rubricsByQ, curriculum) {
  return questions.map(q => {
    const resp = respMap.get(String(q.qid));
    const maxPts = Number(q.max_points || q.points_possible || 0);
    const rubricItems = rubricsByQ.get(String(q.qid)) || [];
    const scoringMode = String(q.scoring_mode || "").toLowerCase();
    const topic = String(q.ib_topic_code || q.ib_topics_csv || "").split(",")[0].trim();

    let earnedPts = 0;
    let criteriaResults = [];

    if (rubricItems.length > 0) {
      let picked = [];
      try { picked = JSON.parse(String(resp?.detail_json || "[]")); } catch(e) { picked = []; }
      const pickedSet = new Set(picked.map(p => String(p)));

      // Determine OR vs AND rubric
      const rubricTotal = rubricItems.reduce((sum, it) => sum + Number(it.points || 0), 0);
      const isOrRubric = rubricTotal > maxPts;

      if (isOrRubric) {
        // OR rubric: any checked item = full points
        const hasAny = rubricItems.some(it => pickedSet.has(String(it.item_id)));
        earnedPts = hasAny ? maxPts : 0;
      } else {
        // AND rubric: sum checked items
        earnedPts = rubricItems.reduce((sum, it) => {
          return sum + (pickedSet.has(String(it.item_id)) ? Number(it.points || 0) : 0);
        }, 0);
        earnedPts = Math.min(earnedPts, maxPts);
      }

      criteriaResults = rubricItems.map(it => ({
        item_id: it.item_id,
        criteria_text: it.criteria_text,
        points: it.points,
        earned: pickedSet.has(String(it.item_id))
      }));
    } else {
      // Manual scoring
      const raw = resp?.points_awarded;
      earnedPts = (raw === "" || raw === null || raw === undefined) ? 0 : Number(raw);
      earnedPts = Math.max(0, Math.min(earnedPts, maxPts));
    }

    return {
      qid: q.qid,
      label: q.label || q.qid,
      maxPoints: maxPts,
      earnedPoints: earnedPts,
      strand: q.strand || "TT",
      topic: topic,
      topicDescription: curriculum[topic]?.description || "",
      scoringMode: scoringMode,
      criteriaResults: criteriaResults
    };
  });
}

/**
 * Build topic analysis with proper group hierarchy and question references
 * IB format: S1.1, S1.2, R2.1, R2.3, etc.
 */
function buildTopicAnalysis_(breakdown, curriculum) {
  // First, aggregate by subtopic (e.g., S1.1, R2.3)
  const bySubtopic = new Map();

  breakdown.forEach(row => {
    const topic = String(row.ib_topic_code || row.ap_topic || "").trim();
    if (!topic) return;

    if (!bySubtopic.has(topic)) {
      bySubtopic.set(topic, {
        topic: topic,
        earned: 0,
        possible: 0,
        questions: []
      });
    }

    const entry = bySubtopic.get(topic);
    entry.earned += Number(row.points_earned || 0);
    entry.possible += Number(row.points_possible || 0);

    // Track unique questions for this topic
    const qid = String(row.qid || "");
    if (qid && !entry.questions.includes(qid)) {
      entry.questions.push(qid);
    }
  });

  // Build detailed subtopics with proper grouping
  const detailedTopics = Array.from(bySubtopic.values())
    .map(t => {
      // Parse topic code: "S1.1" -> group="S1", or "R2.3" -> group="R2"
      const parts = t.topic.split(".");
      const group = parts[0] || t.topic; // S1, S2, R1, R2, etc.

      return {
        ...t,
        group: group,
        description: curriculum[t.topic]?.description || "",
        groupDescription: curriculum[t.topic]?.groupDescription || getTopicGroupName_(group)
      };
    })
    .sort((a, b) => {
      // Sort by topic code: S before R, then numerically
      return a.topic.localeCompare(b.topic, undefined, { numeric: true });
    });

  // Group by topic group (S1, S2, R1, R2, etc.)
  const byGroup = new Map();

  detailedTopics.forEach(t => {
    const groupKey = t.group;
    if (!byGroup.has(groupKey)) {
      byGroup.set(groupKey, {
        group: groupKey,
        groupDescription: t.groupDescription,
        earned: 0,
        possible: 0,
        subtopics: [],
        questions: []
      });
    }

    const entry = byGroup.get(groupKey);
    entry.earned += t.earned;
    entry.possible += t.possible;
    entry.subtopics.push(t);

    // Aggregate questions at group level too
    t.questions.forEach(q => {
      if (!entry.questions.includes(q)) {
        entry.questions.push(q);
      }
    });
  });

  // Sort subtopics within each group
  const groupedTopics = Array.from(byGroup.values())
    .map(g => ({
      ...g,
      subtopics: g.subtopics.sort((a, b) =>
        a.topic.localeCompare(b.topic, undefined, { numeric: true })
      )
    }))
    .sort((a, b) => a.group.localeCompare(b.group, undefined, { numeric: true }));

  // Group by category (Structure vs Reactivity)
  const byCategory = new Map();

  groupedTopics.forEach(g => {
    const category = g.group.startsWith("S") ? "Structure" : "Reactivity";
    if (!byCategory.has(category)) {
      byCategory.set(category, {
        category: category,
        earned: 0,
        possible: 0,
        topicGroups: []
      });
    }

    const entry = byCategory.get(category);
    entry.earned += g.earned;
    entry.possible += g.possible;
    entry.topicGroups.push(g);
  });

  const categoryTopics = Array.from(byCategory.values())
    .sort((a, b) => a.category.localeCompare(b.category)); // Structure before Reactivity

  return {
    byCategory: categoryTopics,
    grouped: groupedTopics,
    detailed: detailedTopics
  };
}

/**
 * Get IB Chemistry topic group name
 */
function getTopicGroupName_(groupCode) {
  const groupNames = {
    "S1": "Structure 1: Models of the particulate nature of matter",
    "S2": "Structure 2: Models of bonding and structure",
    "S3": "Structure 3: Classification of matter",
    "R1": "Reactivity 1: What drives chemical reactions?",
    "R2": "Reactivity 2: How much, how fast, and how far?",
    "R3": "Reactivity 3: What are the mechanisms of chemical change?"
  };
  return groupNames[String(groupCode)] || groupCode;
}

/**
 * API function to get report data (called from sidebar)
 */
function api_getStudentReportData(examId, studentKey) {
  return getStudentReportData_(examId, studentKey);
}

// ============================================================================
// TOPIC DRILL-DOWN DATA
// ============================================================================

/**
 * Get per-question topic drill-down for a single student.
 * Returns questions tagged with topicCode, with aggregate stats.
 * @param {string} topicCode - IB topic code (e.g. "S1.1")
 * @param {string} studentKey - Student key
 * @param {string} examId - Current exam ID (used when allExams=false)
 * @param {boolean} allExams - If true, include all exams; if false, only current
 */
function api_getTopicDrillDown(topicCode, studentKey, examId, allExams, isTeacher) {
  const tc = String(topicCode || "").trim();
  const sk = String(studentKey || "").trim();
  const eid = String(examId || "").trim();
  if (!tc || !sk) throw new Error("topicCode and studentKey are required");

  // Get curriculum info
  const curriculum = getCurriculumAlignment_();
  const topicInfo = curriculum[tc] || { topic: tc, description: "", group: "", groupDescription: "" };

  // Read TOPIC_SKILL rows matching this student + topic
  const rows = readAll_(SHEETS_.TOPIC_SKILL).filter(function(r) {
    if (String(r.ap_topic || "").trim() !== tc) return false;
    if (String(r.student_key || "").trim() !== sk) return false;
    if (!allExams && String(r.exam_id || "").trim() !== eid) return false;
    return true;
  });

  // Build exam name lookup
  const exams = readAll_(SHEETS_.EXAMS);
  const examMap = {};
  exams.forEach(function(e) { examMap[String(e.exam_id)] = e; });

  // Build question label lookup
  const allQuestions = readAll_(SHEETS_.QUESTIONS);
  const questionMap = {};
  allQuestions.forEach(function(q) {
    questionMap[String(q.exam_id) + "||" + String(q.qid)] = q;
  });

  // Build per-question results
  const questions = rows.map(function(r) {
    const qKey = String(r.exam_id) + "||" + String(r.qid);
    const q = questionMap[qKey] || {};
    const ex = examMap[String(r.exam_id)] || {};
    return {
      examId: String(r.exam_id || ""),
      examName: String(ex.exam_name || r.exam_id || ""),
      qid: String(r.qid || ""),
      label: String(q.label || q.number || r.qid || ""),
      paper: String(r.section || q.paper || ""),
      strand: String(r.strand || ""),
      pointsEarned: Number(r.points_earned || 0),
      pointsPossible: Number(r.points_possible || 0),
      isCorrectMcq: String(r.is_correct_mcq || ""),
      questionText: String(q.question_text || ""),
      showQuestions: !!isTeacher || String((ex.show_questions || "")).toLowerCase() === "true"
    };
  });

  // Aggregate stats
  let totalEarned = 0, totalPossible = 0;
  questions.forEach(function(q) {
    totalEarned += q.pointsEarned;
    totalPossible += q.pointsPossible;
  });

  // Load question content blocks for exams where content is visible
  var contentExamIds = {};
  questions.forEach(function(q) {
    if (q.showQuestions) contentExamIds[q.examId] = true;
  });
  var questionContent = {};
  if (Object.keys(contentExamIds).length) {
    var allContent = readAll_(SHEETS_.QUESTION_CONTENT);
    allContent.forEach(function(r) {
      var ceid = String(r.exam_id || "");
      if (!contentExamIds[ceid]) return;
      var cqid = String(r.qid || "");
      if (!cqid) return;
      if (!questionContent[ceid]) questionContent[ceid] = {};
      if (!questionContent[ceid][cqid]) questionContent[ceid][cqid] = [];
      questionContent[ceid][cqid].push({
        block_order: Number(r.block_order || 0),
        block_type: String(r.block_type || "text"),
        content: String(r.content || "")
      });
    });
    Object.keys(questionContent).forEach(function(ceid) {
      Object.keys(questionContent[ceid]).forEach(function(cqid) {
        questionContent[ceid][cqid].sort(function(a, b) { return a.block_order - b.block_order; });
      });
    });
  }

  return {
    topicCode: tc,
    description: topicInfo.description || "",
    group: topicInfo.group || "",
    groupDescription: topicInfo.groupDescription || "",
    questions: questions,
    questionContent: questionContent,
    isTeacher: !!isTeacher,
    aggregate: {
      earned: totalEarned,
      possible: totalPossible,
      pct: totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0,
      questionCount: questions.length
    }
  };
}

/**
 * Get class-wide topic stats for a teacher drill-down.
 * Groups by student and returns per-student + class aggregate.
 * @param {string} topicCode - IB topic code
 * @param {string} examId - Exam ID (used when allExams=false)
 * @param {string} classSection - Optional class filter
 * @param {boolean} allExams - If true, include all exams
 */
function api_getClassTopicStats(topicCode, examId, classSection, allExams) {
  const tc = String(topicCode || "").trim();
  const eid = String(examId || "").trim();
  const cls = String(classSection || "").trim();
  if (!tc) throw new Error("topicCode is required");

  const curriculum = getCurriculumAlignment_();
  const topicInfo = curriculum[tc] || { topic: tc, description: "", group: "", groupDescription: "" };

  // Filter TOPIC_SKILL rows
  const rows = readAll_(SHEETS_.TOPIC_SKILL).filter(function(r) {
    if (String(r.ap_topic || "").trim() !== tc) return false;
    if (!allExams && String(r.exam_id || "").trim() !== eid) return false;
    if (cls && String(r.class_section || "").trim() !== cls) return false;
    return true;
  });

  // Group by student
  const byStudent = {};
  rows.forEach(function(r) {
    const sk = String(r.student_key || "").trim();
    if (!byStudent[sk]) {
      byStudent[sk] = {
        studentKey: sk,
        lastName: String(r.last_name || ""),
        firstName: String(r.first_name || ""),
        classSection: String(r.class_section || ""),
        earned: 0,
        possible: 0,
        questions: 0
      };
    }
    byStudent[sk].earned += Number(r.points_earned || 0);
    byStudent[sk].possible += Number(r.points_possible || 0);
    byStudent[sk].questions++;
  });

  const students = Object.keys(byStudent).map(function(k) { return byStudent[k]; })
    .sort(function(a, b) {
      const c = a.classSection.localeCompare(b.classSection);
      if (c !== 0) return c;
      return a.lastName.localeCompare(b.lastName);
    });

  // Class aggregate
  let classEarned = 0, classPossible = 0;
  students.forEach(function(s) {
    classEarned += s.earned;
    classPossible += s.possible;
  });

  return {
    topicCode: tc,
    description: topicInfo.description || "",
    group: topicInfo.group || "",
    groupDescription: topicInfo.groupDescription || "",
    students: students,
    classAggregate: {
      earned: classEarned,
      possible: classPossible,
      pct: classPossible > 0 ? Math.round((classEarned / classPossible) * 100) : 0,
      studentCount: students.length
    }
  };
}

/**
 * API function to get all students for report generation
 */
function api_getStudentsForReports(examId, classSection) {
  const exam_id = String(examId || "").trim();
  const cls = String(classSection || "").trim();

  const scores = readAll_(SHEETS_.SCORES_CURRENT).filter(s => {
    if (String(s.exam_id) !== exam_id) return false;
    if (cls && String(s.class_section) !== cls) return false;
    return true;
  });

  return scores.map(s => ({
    student_key: String(s.student_key || ""),
    last_name: String(s.last_name || ""),
    first_name: String(s.first_name || ""),
    class_section: String(s.class_section || "")
  })).sort((a, b) => {
    // Sort by class, then last name, then first name
    const classCompare = a.class_section.localeCompare(b.class_section);
    if (classCompare !== 0) return classCompare;
    const lastCompare = a.last_name.localeCompare(b.last_name);
    if (lastCompare !== 0) return lastCompare;
    return a.first_name.localeCompare(b.first_name);
  });
}
