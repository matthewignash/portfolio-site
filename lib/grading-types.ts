// ============================================
// Assessment Grading App — Type Definitions
// ============================================

// --- Core Entities ---

export interface Student {
  id: string;
  name: string;
  email: string;
  classSection: string;
  level: "SL" | "HL";
}

export interface Exam {
  id: string;
  name: string;
  level: "SL" | "HL";
  term: string;
  date: string;
  status: "visible" | "hidden";
  papersIncluded: ("1A" | "1B" | "2")[];
}

export interface Question {
  qid: string;
  examId: string;
  paper: "1A" | "1B" | "2";
  scoringMode: "auto" | "checklist" | "manual";
  strand: "KU" | "TT" | "C";
  maxPoints: number;
  ibTopicCode: string;
  correctAnswer?: string; // for MCQ (Paper 1A)
  rubricItems?: RubricItem[];
}

export interface RubricItem {
  itemId: string;
  criteriaText: string;
  points: number;
}

// --- Responses & Scoring ---

export interface Response {
  responseId: string;
  studentId: string;
  examId: string;
  qid: string;
  pointsAwarded: number;
  mcqChoice?: string; // for Paper 1A
  checkedItems?: string[]; // item_ids for checklist
}

export interface GradeBand {
  examId: string;
  level: "SL" | "HL";
  scale: "IB_1_7" | "AISC_1_8";
  strand: "OVERALL" | "KU" | "TT" | "C";
  minPoints: number;
  maxPoints: number;
  band: number;
}

// --- Computed Scores ---

export interface StudentScore {
  studentId: string;
  studentName: string;
  level: "SL" | "HL";
  examId: string;
  totalPoints: number;
  maxPoints: number;
  kuPoints: number;
  kuMax: number;
  ttPoints: number;
  ttMax: number;
  cPoints: number;
  cMax: number;
  paper1aEarned: number;
  paper1aMax: number;
  paper1bEarned: number;
  paper1bMax: number;
  paper2Earned: number;
  paper2Max: number;
  ibGrade: number; // 1-7
  overallBand: number; // AISC 1-8
  kuBand: number;
  ttBand: number;
  cBand: number;
}

// --- Topic Analysis ---

export interface TopicGroup {
  code: string; // "S1", "R2", etc.
  name: string;
  category: "Structure" | "Reactivity";
  hlOnly: boolean;
}

export interface TopicBreakdown {
  topicCode: string;
  topicName: string;
  pointsEarned: number;
  pointsPossible: number;
  percentage: number;
  questionCount: number;
}

export interface StudentTopicAnalysis {
  studentId: string;
  topics: TopicBreakdown[];
  strongTopics: TopicBreakdown[]; // >= 70%
  weakTopics: TopicBreakdown[]; // < 50%
}

// --- Dashboard Data ---

export interface BandDistribution {
  band: number;
  label: string;
  slCount: number;
  hlCount: number;
  totalCount: number;
}

export interface StrandSummary {
  strand: "KU" | "TT" | "C";
  strandName: string;
  classAverage: number;
  maxPossible: number;
  averagePercentage: number;
}

export interface PaperSummary {
  paper: "1A" | "1B" | "2";
  paperName: string;
  classAverage: number;
  maxPossible: number;
  averagePercentage: number;
}

// --- Grading Interface Data ---

export interface Paper1AQuestion {
  qid: string;
  questionNumber: number;
  correctAnswer: string;
  strand: "KU" | "TT" | "C";
  ibTopicCode: string;
  maxPoints: number;
}

export interface Paper1AResponse {
  qid: string;
  studentChoice: string;
  isCorrect: boolean;
  pointsAwarded: number;
}

export interface ChecklistQuestion {
  qid: string;
  questionNumber: number;
  paper: "1B" | "2";
  strand: "KU" | "TT" | "C";
  ibTopicCode: string;
  maxPoints: number;
  rubricItems: RubricItem[];
  checklistMode: "AND" | "OR";
}

export interface ChecklistResponse {
  qid: string;
  checkedItems: string[];
  pointsAwarded: number;
  maxPoints: number;
}

// --- Report Data ---

export interface AISCDescriptor {
  strand: "KU" | "TT" | "C";
  strandName: string;
  band: number;
  descriptor: string;
}

export interface StudentReport {
  student: Student;
  exam: Exam;
  score: StudentScore;
  strandDescriptors: AISCDescriptor[];
  topicAnalysis: StudentTopicAnalysis;
  paper1aResults?: Paper1AResponse[];
  checklistResults?: ChecklistResponse[];
}

// --- Top-Level Data Shapes ---

export interface TeacherDashboardData {
  exam: Exam;
  students: Student[];
  scores: StudentScore[];
  ibBandDistribution: BandDistribution[];
  aiscBandDistribution: {
    KU: BandDistribution[];
    TT: BandDistribution[];
    C: BandDistribution[];
  };
  strandSummary: StrandSummary[];
  paperSummary: PaperSummary[];
  topicGroups: TopicGroup[];
  classTopicAnalysis: TopicBreakdown[];
}

export interface GradingPanelData {
  exam: Exam;
  students: Student[];
  paper1aQuestions: Paper1AQuestion[];
  checklistQuestions: ChecklistQuestion[];
  responses: Record<string, Response>; // keyed by `${studentId}||${qid}`
}

export interface StudentDashboardData {
  student: Student;
  exam: Exam;
  score: StudentScore;
  topicAnalysis: StudentTopicAnalysis;
  paper1aResults: Paper1AResponse[];
  checklistResults: ChecklistResponse[];
  strandDescriptors: AISCDescriptor[];
}

export interface GradingAppData {
  teacherDashboard: TeacherDashboardData;
  gradingPanel: GradingPanelData;
  studentView: StudentDashboardData;
}
