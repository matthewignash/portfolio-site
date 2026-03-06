/**
 * Assessment Grading App — Mock Data Generator
 * Faker.js seed: 55 (deterministic)
 *
 * Generates realistic IB Chemistry exam data:
 * - 8 students (4 SL, 4 HL)
 * - 1 exam with Papers 1A, 1B, 2
 * - 30 MCQ questions (Paper 1A), 6 checklist questions (Paper 1B), 8 questions (Paper 2)
 * - Full responses, scores, band lookups, topic analysis
 */

import { faker } from "@faker-js/faker";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

faker.seed(55);

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================
// IB Chemistry Curriculum Topics
// ============================================

const TOPIC_GROUPS = [
  { code: "S1", name: "Models of particulate nature of matter", category: "Structure", hlOnly: false },
  { code: "S2", name: "Models of bonding and structure", category: "Structure", hlOnly: false },
  { code: "S3", name: "Classification of matter", category: "Structure", hlOnly: false },
  { code: "R1", name: "What drives chemical reactions?", category: "Reactivity", hlOnly: false },
  { code: "R2", name: "How much, how fast, and how far?", category: "Reactivity", hlOnly: false },
  { code: "R3", name: "Mechanisms of chemical change", category: "Reactivity", hlOnly: false },
];

const TOPICS = [
  { code: "S1.1", name: "Introduction to the particulate nature of matter", group: "S1", hlOnly: false },
  { code: "S1.2", name: "The nuclear atom", group: "S1", hlOnly: false },
  { code: "S1.3", name: "Electron configurations", group: "S1", hlOnly: false },
  { code: "S1.4", name: "Counting particles by mass", group: "S1", hlOnly: false },
  { code: "S1.5", name: "Ideal gases", group: "S1", hlOnly: false },
  { code: "S2.1", name: "The ionic model", group: "S2", hlOnly: false },
  { code: "S2.2", name: "The covalent model", group: "S2", hlOnly: false },
  { code: "S2.3", name: "The metallic model", group: "S2", hlOnly: false },
  { code: "S2.4", name: "From models to materials", group: "S2", hlOnly: false },
  { code: "S3.1", name: "The periodic table", group: "S3", hlOnly: false },
  { code: "S3.2", name: "Functional groups", group: "S3", hlOnly: false },
  { code: "R1.1", name: "Measuring enthalpy changes", group: "R1", hlOnly: false },
  { code: "R1.2", name: "Energy cycles in reactions", group: "R1", hlOnly: false },
  { code: "R1.3", name: "Energy from fuels", group: "R1", hlOnly: false },
  { code: "R1.4", name: "Entropy and spontaneity", group: "R1", hlOnly: true },
  { code: "R2.1", name: "Amounts in chemical reactions", group: "R2", hlOnly: false },
  { code: "R2.2", name: "How fast? rates of reaction", group: "R2", hlOnly: false },
  { code: "R2.3", name: "How far? Equilibrium", group: "R2", hlOnly: false },
  { code: "R3.1", name: "Proton transfer reactions", group: "R3", hlOnly: false },
  { code: "R3.2", name: "Electron transfer reactions", group: "R3", hlOnly: false },
  { code: "R3.3", name: "Electron sharing reactions", group: "R3", hlOnly: false },
  { code: "R3.4", name: "Electron-pair sharing reactions", group: "R3", hlOnly: true },
];

// ============================================
// Students
// ============================================

const STUDENTS = [];
const FIRST_NAMES_SL = ["Aarav", "Priya", "Liam", "Sakura"];
const FIRST_NAMES_HL = ["Emeka", "Clara", "Jin", "Anika"];
const LAST_NAMES = ["Patel", "Sharma", "O'Brien", "Tanaka", "Okafor", "Bauer", "Chen", "Johansson"];

for (let i = 0; i < 8; i++) {
  const isSL = i < 4;
  const firstName = isSL ? FIRST_NAMES_SL[i] : FIRST_NAMES_HL[i - 4];
  const lastName = LAST_NAMES[i];
  STUDENTS.push({
    id: `stu_${String(i + 1).padStart(3, "0")}`,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@school.edu`,
    classSection: isSL ? "10A-SL" : "10B-HL",
    level: isSL ? "SL" : "HL",
  });
}

// ============================================
// Exam
// ============================================

const EXAM = {
  id: "exam_001",
  name: "Term 2 Assessment — Reactivity & Structure",
  level: "SL", // both SL and HL take it, level on student determines bands
  term: "Term 2",
  date: "2026-02-14",
  status: "visible",
  papersIncluded: ["1A", "1B", "2"],
};

// ============================================
// Questions
// ============================================

const MCQ_ANSWERS = "ABCD";
const STRANDS = ["KU", "TT", "C"];

function pickTopic(allowHL) {
  const pool = allowHL ? TOPICS : TOPICS.filter((t) => !t.hlOnly);
  return faker.helpers.arrayElement(pool);
}

// Paper 1A: 30 MCQ questions (1 point each)
const paper1aQuestions = [];
for (let i = 1; i <= 30; i++) {
  const topic = pickTopic(false);
  const strand = i <= 15 ? "KU" : i <= 24 ? "TT" : "C";
  paper1aQuestions.push({
    qid: `1A_${String(i).padStart(2, "0")}`,
    examId: EXAM.id,
    paper: "1A",
    scoringMode: "auto",
    strand,
    maxPoints: 1,
    ibTopicCode: topic.code,
    correctAnswer: MCQ_ANSWERS[faker.number.int({ min: 0, max: 3 })],
    questionNumber: i,
  });
}

// Paper 1B: 6 checklist questions (2-5 points each)
const paper1bQuestions = [];
for (let i = 1; i <= 6; i++) {
  const topic = pickTopic(false);
  const strand = i <= 3 ? "KU" : i <= 5 ? "TT" : "C";
  const maxPoints = faker.number.int({ min: 2, max: 5 });
  const isOR = faker.datatype.boolean(0.3);
  const rubricItems = [];
  const itemCount = isOR ? faker.number.int({ min: 3, max: 5 }) : maxPoints;

  for (let j = 1; j <= itemCount; j++) {
    rubricItems.push({
      itemId: `1B_${i}_${j}`,
      criteriaText: generateCriteriaText(strand, j),
      points: isOR ? maxPoints : 1,
    });
  }

  paper1bQuestions.push({
    qid: `1B_${String(i).padStart(2, "0")}`,
    examId: EXAM.id,
    paper: "1B",
    scoringMode: "checklist",
    strand,
    maxPoints,
    ibTopicCode: topic.code,
    questionNumber: i,
    rubricItems,
    checklistMode: isOR ? "OR" : "AND",
  });
}

// Paper 2: 8 questions (3-8 points each, mix of checklist and manual)
const paper2Questions = [];
for (let i = 1; i <= 8; i++) {
  const topic = pickTopic(false);
  const strand = i <= 3 ? "KU" : i <= 6 ? "TT" : "C";
  const maxPoints = faker.number.int({ min: 3, max: 8 });
  const isChecklist = faker.datatype.boolean(0.7);
  const rubricItems = [];

  if (isChecklist) {
    for (let j = 1; j <= maxPoints; j++) {
      rubricItems.push({
        itemId: `P2_${i}_${j}`,
        criteriaText: generateCriteriaText(strand, j),
        points: 1,
      });
    }
  }

  paper2Questions.push({
    qid: `P2_${String(i).padStart(2, "0")}`,
    examId: EXAM.id,
    paper: "2",
    scoringMode: isChecklist ? "checklist" : "manual",
    strand,
    maxPoints,
    ibTopicCode: topic.code,
    questionNumber: i,
    rubricItems: isChecklist ? rubricItems : [],
    checklistMode: "AND",
  });
}

function generateCriteriaText(strand, index) {
  const kuCriteria = [
    "Correctly identifies the reactant/product",
    "States the correct formula or equation",
    "Defines the key term accurately",
    "Lists the appropriate conditions",
    "Names the correct element or compound",
    "Recalls the relevant periodic trend",
    "States the correct electron configuration",
    "Identifies the bond type correctly",
  ];
  const ttCriteria = [
    "Explains the trend using atomic structure",
    "Applies the concept to a novel context",
    "Evaluates the experimental method",
    "Calculates the correct numerical answer",
    "Shows logical reasoning in the analysis",
    "Compares the two models effectively",
    "Predicts the outcome with justification",
    "Interprets the data from the graph",
  ];
  const cCriteria = [
    "Uses correct scientific terminology",
    "Presents a clear and logical argument",
    "Includes appropriate units and sig figs",
    "Shows working clearly and systematically",
    "Draws a correctly labeled diagram",
    "Organizes the response coherently",
    "Uses chemical equations to support points",
    "Communicates the conclusion clearly",
  ];

  const pool = strand === "KU" ? kuCriteria : strand === "TT" ? ttCriteria : cCriteria;
  return pool[(index - 1) % pool.length];
}

const allQuestions = [...paper1aQuestions, ...paper1bQuestions, ...paper2Questions];

// ============================================
// Grade Bands
// ============================================

const totalMaxPaper1A = 30;
const totalMaxPaper1B = paper1bQuestions.reduce((s, q) => s + q.maxPoints, 0);
const totalMaxPaper2 = paper2Questions.reduce((s, q) => s + q.maxPoints, 0);
const totalMax = totalMaxPaper1A + totalMaxPaper1B + totalMaxPaper2;

function generateBands(level, scale, strand, maxPts) {
  const bands = scale === "IB_1_7" ? 7 : 8;
  const bandSize = maxPts / bands;
  const result = [];
  for (let b = 1; b <= bands; b++) {
    result.push({
      examId: EXAM.id,
      level,
      scale,
      strand,
      minPoints: Math.round((b - 1) * bandSize),
      maxPoints: b === bands ? maxPts : Math.round(b * bandSize) - 1,
      band: b,
    });
  }
  return result;
}

// Compute strand maximums
const kuMax = allQuestions.filter((q) => q.strand === "KU").reduce((s, q) => s + q.maxPoints, 0);
const ttMax = allQuestions.filter((q) => q.strand === "TT").reduce((s, q) => s + q.maxPoints, 0);
const cMax = allQuestions.filter((q) => q.strand === "C").reduce((s, q) => s + q.maxPoints, 0);

const gradeBands = [
  ...generateBands("SL", "IB_1_7", "OVERALL", totalMax),
  ...generateBands("HL", "IB_1_7", "OVERALL", totalMax),
  ...generateBands("SL", "AISC_1_8", "KU", kuMax),
  ...generateBands("SL", "AISC_1_8", "TT", ttMax),
  ...generateBands("SL", "AISC_1_8", "C", cMax),
  ...generateBands("HL", "AISC_1_8", "KU", kuMax),
  ...generateBands("HL", "AISC_1_8", "TT", ttMax),
  ...generateBands("HL", "AISC_1_8", "C", cMax),
];

// ============================================
// Generate Responses & Scores
// ============================================

function findBand(bands, level, scale, strand, points) {
  const matching = bands.filter(
    (b) => b.level === level && b.scale === scale && b.strand === strand
  );
  const found = matching.find((b) => points >= b.minPoints && points <= b.maxPoints);
  return found ? found.band : 1;
}

// Student ability profiles (0 = weak, 1 = strong)
const ABILITY = {
  stu_001: 0.55, // Aarav - average SL
  stu_002: 0.78, // Priya - strong SL
  stu_003: 0.35, // Liam - struggling SL
  stu_004: 0.65, // Sakura - above avg SL
  stu_005: 0.82, // Emeka - strong HL
  stu_006: 0.92, // Clara - top HL
  stu_007: 0.48, // Jin - below avg HL
  stu_008: 0.7,  // Anika - solid HL
};

const allResponses = [];
const allScores = [];
const allTopicBreakdowns = [];

for (const student of STUDENTS) {
  const ability = ABILITY[student.id];
  let totalPoints = 0;
  let kuPoints = 0;
  let ttPoints = 0;
  let cPoints = 0;
  let p1aEarned = 0;
  let p1bEarned = 0;
  let p2Earned = 0;

  const studentPaper1aResults = [];
  const studentChecklistResults = [];
  const studentTopics = {};

  for (const q of allQuestions) {
    // Adjust ability per strand (TT is hardest, KU easiest)
    const strandMod = q.strand === "KU" ? 0.08 : q.strand === "TT" ? -0.08 : 0;
    const effectiveAbility = Math.min(1, Math.max(0, ability + strandMod + faker.number.float({ min: -0.15, max: 0.15 })));

    let pointsAwarded = 0;
    let mcqChoice = undefined;
    let checkedItems = undefined;

    if (q.paper === "1A") {
      // MCQ auto-scoring
      const isCorrect = faker.datatype.boolean(effectiveAbility);
      if (isCorrect) {
        mcqChoice = q.correctAnswer;
        pointsAwarded = q.maxPoints;
      } else {
        const wrongChoices = MCQ_ANSWERS.split("").filter((c) => c !== q.correctAnswer);
        mcqChoice = faker.helpers.arrayElement(wrongChoices);
        pointsAwarded = 0;
      }
      studentPaper1aResults.push({
        qid: q.qid,
        studentChoice: mcqChoice,
        isCorrect,
        pointsAwarded,
      });
    } else {
      // Checklist or manual
      if (q.rubricItems && q.rubricItems.length > 0) {
        checkedItems = [];
        if (q.checklistMode === "OR") {
          // OR mode: any one correct item = full marks
          if (faker.datatype.boolean(effectiveAbility)) {
            checkedItems = [faker.helpers.arrayElement(q.rubricItems).itemId];
            pointsAwarded = q.maxPoints;
          }
        } else {
          // AND mode: sum checked items
          for (const item of q.rubricItems) {
            if (faker.datatype.boolean(effectiveAbility)) {
              checkedItems.push(item.itemId);
              pointsAwarded += item.points;
            }
          }
          pointsAwarded = Math.min(pointsAwarded, q.maxPoints);
        }
        studentChecklistResults.push({
          qid: q.qid,
          checkedItems,
          pointsAwarded,
          maxPoints: q.maxPoints,
        });
      } else {
        // Manual scoring
        pointsAwarded = Math.round(q.maxPoints * effectiveAbility);
        studentChecklistResults.push({
          qid: q.qid,
          checkedItems: [],
          pointsAwarded,
          maxPoints: q.maxPoints,
        });
      }
    }

    allResponses.push({
      responseId: `${student.id}||${q.qid}`,
      studentId: student.id,
      examId: EXAM.id,
      qid: q.qid,
      pointsAwarded,
      mcqChoice,
      checkedItems,
    });

    totalPoints += pointsAwarded;
    if (q.strand === "KU") kuPoints += pointsAwarded;
    if (q.strand === "TT") ttPoints += pointsAwarded;
    if (q.strand === "C") cPoints += pointsAwarded;
    if (q.paper === "1A") p1aEarned += pointsAwarded;
    if (q.paper === "1B") p1bEarned += pointsAwarded;
    if (q.paper === "2") p2Earned += pointsAwarded;

    // Topic breakdown
    if (!studentTopics[q.ibTopicCode]) {
      studentTopics[q.ibTopicCode] = { earned: 0, possible: 0, count: 0 };
    }
    studentTopics[q.ibTopicCode].earned += pointsAwarded;
    studentTopics[q.ibTopicCode].possible += q.maxPoints;
    studentTopics[q.ibTopicCode].count += 1;
  }

  const ibGrade = findBand(gradeBands, student.level, "IB_1_7", "OVERALL", totalPoints);
  const overallBand = ibGrade; // simplified
  const kuBand = findBand(gradeBands, student.level, "AISC_1_8", "KU", kuPoints);
  const ttBand = findBand(gradeBands, student.level, "AISC_1_8", "TT", ttPoints);
  const cBand = findBand(gradeBands, student.level, "AISC_1_8", "C", cPoints);

  allScores.push({
    studentId: student.id,
    studentName: student.name,
    level: student.level,
    examId: EXAM.id,
    totalPoints,
    maxPoints: totalMax,
    kuPoints,
    kuMax,
    ttPoints,
    ttMax,
    cPoints,
    cMax,
    paper1aEarned: p1aEarned,
    paper1aMax: totalMaxPaper1A,
    paper1bEarned: p1bEarned,
    paper1bMax: totalMaxPaper1B,
    paper2Earned: p2Earned,
    paper2Max: totalMaxPaper2,
    ibGrade,
    overallBand,
    kuBand,
    ttBand,
    cBand,
  });

  // Build topic analysis
  const topicBreakdowns = Object.entries(studentTopics).map(([code, data]) => {
    const topicInfo = TOPICS.find((t) => t.code === code);
    return {
      topicCode: code,
      topicName: topicInfo ? topicInfo.name : code,
      pointsEarned: data.earned,
      pointsPossible: data.possible,
      percentage: data.possible > 0 ? Math.round((data.earned / data.possible) * 100) : 0,
      questionCount: data.count,
    };
  });

  allTopicBreakdowns.push({
    studentId: student.id,
    topics: topicBreakdowns,
    strongTopics: topicBreakdowns.filter((t) => t.percentage >= 70),
    weakTopics: topicBreakdowns.filter((t) => t.percentage < 50),
  });
}

// ============================================
// AISC Descriptors
// ============================================

const AISC_DESCRIPTORS = {
  KU: {
    name: "Knowledge & Understanding",
    bands: {
      1: "Superficial recall of factual knowledge with significant inaccuracies",
      2: "Limited recall of basic facts with frequent errors",
      3: "Underdeveloped recall with some gaps in understanding",
      4: "Generally effective recall of relevant knowledge",
      5: "Proficient understanding of key concepts and terminology",
      6: "Mainly effective demonstration of detailed knowledge",
      7: "Highly effective and accurate knowledge across topics",
      8: "Exemplary depth and breadth of knowledge with consistent accuracy",
    },
  },
  TT: {
    name: "Thinking & Transfer",
    bands: {
      1: "Superficial application with no evidence of analytical thinking",
      2: "Limited application to familiar contexts only",
      3: "Underdeveloped analysis with inconsistent reasoning",
      4: "Generally effective analysis in straightforward contexts",
      5: "Proficient analysis and evaluation with sound reasoning",
      6: "Mainly effective transfer of concepts to new situations",
      7: "Highly effective critical analysis with insightful evaluation",
      8: "Exemplary analytical skills with sophisticated transfer and evaluation",
    },
  },
  C: {
    name: "Communication",
    bands: {
      1: "Inaccurate or incoherent communication of scientific ideas",
      2: "Limited use of scientific terminology with unclear structure",
      3: "Underdeveloped communication with some appropriate terminology",
      4: "Generally effective communication with acceptable organization",
      5: "Proficient use of terminology with clear, logical structure",
      6: "Mainly effective scientific communication with good organization",
      7: "Highly effective communication with precise terminology throughout",
      8: "Exemplary clarity and precision in all scientific communication",
    },
  },
};

// ============================================
// Build Dashboard Data
// ============================================

// IB Band distribution (1-7)
const ibBandDistribution = [];
for (let b = 1; b <= 7; b++) {
  ibBandDistribution.push({
    band: b,
    label: `Band ${b}`,
    slCount: allScores.filter((s) => s.level === "SL" && s.ibGrade === b).length,
    hlCount: allScores.filter((s) => s.level === "HL" && s.ibGrade === b).length,
    totalCount: allScores.filter((s) => s.ibGrade === b).length,
  });
}

// AISC Band distribution per strand (1-8)
function buildAISCDistribution(strand, getBand) {
  const dist = [];
  for (let b = 1; b <= 8; b++) {
    dist.push({
      band: b,
      label: `Band ${b}`,
      slCount: allScores.filter((s) => s.level === "SL" && getBand(s) === b).length,
      hlCount: allScores.filter((s) => s.level === "HL" && getBand(s) === b).length,
      totalCount: allScores.filter((s) => getBand(s) === b).length,
    });
  }
  return dist;
}

const aiscBandDistribution = {
  KU: buildAISCDistribution("KU", (s) => s.kuBand),
  TT: buildAISCDistribution("TT", (s) => s.ttBand),
  C: buildAISCDistribution("C", (s) => s.cBand),
};

// Strand summary
const strandSummary = [
  {
    strand: "KU",
    strandName: "Knowledge & Understanding",
    classAverage: Math.round(allScores.reduce((s, sc) => s + sc.kuPoints, 0) / allScores.length * 10) / 10,
    maxPossible: kuMax,
    averagePercentage: Math.round(
      (allScores.reduce((s, sc) => s + sc.kuPoints, 0) / (allScores.length * kuMax)) * 100
    ),
  },
  {
    strand: "TT",
    strandName: "Thinking & Transfer",
    classAverage: Math.round(allScores.reduce((s, sc) => s + sc.ttPoints, 0) / allScores.length * 10) / 10,
    maxPossible: ttMax,
    averagePercentage: Math.round(
      (allScores.reduce((s, sc) => s + sc.ttPoints, 0) / (allScores.length * ttMax)) * 100
    ),
  },
  {
    strand: "C",
    strandName: "Communication",
    classAverage: Math.round(allScores.reduce((s, sc) => s + sc.cPoints, 0) / allScores.length * 10) / 10,
    maxPossible: cMax,
    averagePercentage: Math.round(
      (allScores.reduce((s, sc) => s + sc.cPoints, 0) / (allScores.length * cMax)) * 100
    ),
  },
];

// Paper summary
const paperSummary = [
  {
    paper: "1A",
    paperName: "Paper 1A (MCQ)",
    classAverage: Math.round(allScores.reduce((s, sc) => s + sc.paper1aEarned, 0) / allScores.length * 10) / 10,
    maxPossible: totalMaxPaper1A,
    averagePercentage: Math.round(
      (allScores.reduce((s, sc) => s + sc.paper1aEarned, 0) / (allScores.length * totalMaxPaper1A)) * 100
    ),
  },
  {
    paper: "1B",
    paperName: "Paper 1B (Short Answer)",
    classAverage: Math.round(allScores.reduce((s, sc) => s + sc.paper1bEarned, 0) / allScores.length * 10) / 10,
    maxPossible: totalMaxPaper1B,
    averagePercentage: Math.round(
      (allScores.reduce((s, sc) => s + sc.paper1bEarned, 0) / (allScores.length * totalMaxPaper1B)) * 100
    ),
  },
  {
    paper: "2",
    paperName: "Paper 2 (Extended Response)",
    classAverage: Math.round(allScores.reduce((s, sc) => s + sc.paper2Earned, 0) / allScores.length * 10) / 10,
    maxPossible: totalMaxPaper2,
    averagePercentage: Math.round(
      (allScores.reduce((s, sc) => s + sc.paper2Earned, 0) / (allScores.length * totalMaxPaper2)) * 100
    ),
  },
];

// Class-wide topic analysis
const classTopicMap = {};
for (const student of allTopicBreakdowns) {
  for (const t of student.topics) {
    if (!classTopicMap[t.topicCode]) {
      classTopicMap[t.topicCode] = { earned: 0, possible: 0, count: 0, name: t.topicName };
    }
    classTopicMap[t.topicCode].earned += t.pointsEarned;
    classTopicMap[t.topicCode].possible += t.pointsPossible;
    classTopicMap[t.topicCode].count += t.questionCount;
  }
}

const classTopicAnalysis = Object.entries(classTopicMap).map(([code, data]) => ({
  topicCode: code,
  topicName: data.name,
  pointsEarned: data.earned,
  pointsPossible: data.possible,
  percentage: data.possible > 0 ? Math.round((data.earned / data.possible) * 100) : 0,
  questionCount: data.count / STUDENTS.length, // avg questions per student
}));

// ============================================
// Build Student View (pick first HL student - Emeka)
// ============================================

const demoStudent = STUDENTS[4]; // Emeka
const demoScore = allScores.find((s) => s.studentId === demoStudent.id);
const demoTopicAnalysis = allTopicBreakdowns.find((t) => t.studentId === demoStudent.id);

const demoStrandDescriptors = ["KU", "TT", "C"].map((strand) => {
  const bandVal = strand === "KU" ? demoScore.kuBand : strand === "TT" ? demoScore.ttBand : demoScore.cBand;
  return {
    strand,
    strandName: AISC_DESCRIPTORS[strand].name,
    band: bandVal,
    descriptor: AISC_DESCRIPTORS[strand].bands[bandVal] || AISC_DESCRIPTORS[strand].bands[1],
  };
});

const demoPaper1aResults = allResponses
  .filter((r) => r.studentId === demoStudent.id && r.qid.startsWith("1A_"))
  .map((r) => {
    const q = paper1aQuestions.find((q) => q.qid === r.qid);
    return {
      qid: r.qid,
      studentChoice: r.mcqChoice || "",
      isCorrect: r.mcqChoice === q.correctAnswer,
      pointsAwarded: r.pointsAwarded,
    };
  });

const demoChecklistResults = allResponses
  .filter(
    (r) =>
      r.studentId === demoStudent.id &&
      (r.qid.startsWith("1B_") || r.qid.startsWith("P2_"))
  )
  .map((r) => ({
    qid: r.qid,
    checkedItems: r.checkedItems || [],
    pointsAwarded: r.pointsAwarded,
    maxPoints: allQuestions.find((q) => q.qid === r.qid)?.maxPoints || 0,
  }));

// ============================================
// Build Grading Panel Data
// ============================================

const responseMap = {};
for (const r of allResponses) {
  responseMap[`${r.studentId}||${r.qid}`] = r;
}

// ============================================
// Assemble Final Data
// ============================================

const data = {
  teacherDashboard: {
    exam: EXAM,
    students: STUDENTS,
    scores: allScores,
    ibBandDistribution,
    aiscBandDistribution,
    strandSummary,
    paperSummary,
    topicGroups: TOPIC_GROUPS,
    classTopicAnalysis,
  },
  gradingPanel: {
    exam: EXAM,
    students: STUDENTS,
    paper1aQuestions: paper1aQuestions.map((q) => ({
      qid: q.qid,
      questionNumber: q.questionNumber,
      correctAnswer: q.correctAnswer,
      strand: q.strand,
      ibTopicCode: q.ibTopicCode,
      maxPoints: q.maxPoints,
    })),
    checklistQuestions: [...paper1bQuestions, ...paper2Questions].map((q) => ({
      qid: q.qid,
      questionNumber: q.questionNumber,
      paper: q.paper,
      strand: q.strand,
      ibTopicCode: q.ibTopicCode,
      maxPoints: q.maxPoints,
      rubricItems: q.rubricItems,
      checklistMode: q.checklistMode,
    })),
    responses: responseMap,
  },
  studentView: {
    student: demoStudent,
    exam: EXAM,
    score: demoScore,
    topicAnalysis: demoTopicAnalysis,
    paper1aResults: demoPaper1aResults,
    checklistResults: demoChecklistResults,
    strandDescriptors: demoStrandDescriptors,
  },
};

// ============================================
// Write to file
// ============================================

const outPath = join(__dirname, "..", "data", "mock", "grading-app.json");
writeFileSync(outPath, JSON.stringify(data, null, 2));
const stats = {
  students: STUDENTS.length,
  questions: allQuestions.length,
  responses: allResponses.length,
  scores: allScores.length,
  topicBreakdowns: allTopicBreakdowns.length,
  gradeBands: gradeBands.length,
  fileSize: `${(Buffer.byteLength(JSON.stringify(data)) / 1024).toFixed(1)}KB`,
};
console.log("Generated grading-app.json:", stats);
