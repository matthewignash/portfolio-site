// ============================================
// Unified Learning Map — Type Definitions
// Full ULM rebuild: 13 teacher tabs + 5 student tabs
// ============================================

// === CORE ENTITIES ===

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  gradeLevel: number;
  avatarColor: string;
  role: "student" | "teacher" | "admin";
  classIds: string[];
  supportProfile?: SupportProfile;
}

export interface SupportProfile {
  profileType: "IEP" | "504" | "WIDA" | "EAL";
  widaLevel?: number;
  accommodations: string[];
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  gradeLevel: number;
  gradingSystem: "SBAR_8" | "IB_DP_7" | "Custom";
  teacherId: string;
  studentCount: number;
  unitCount: number;
  color: string;
  mapIds: string[];
}

export interface ClassSection {
  id: string;
  name: string;
  courseId: string;
  period: string;
  studentIds: string[];
  activeMapIds: string[];
}

// === HEX MAP ENTITIES ===

export type HexType =
  | "lesson"
  | "activity"
  | "assessment"
  | "resource"
  | "checkpoint";

export type HexStatus = "draft" | "published" | "archived";

// Differentiation & MTSS
export type DiffPathway = "scaffolded" | "standard" | "enrichment";
export type MTSSTier = 1 | 2 | 3;

export interface WIDAAdaptation {
  supportedLevels: number[]; // WIDA levels 1-6 this hex supports
  simplifiedDescription?: string; // Simplified version for lower levels
  keyVocabulary: string[]; // Key terms
  sentenceFrames: string[]; // Sentence starters for responses
  scaffoldingIntensity: "minimal" | "moderate" | "intensive";
}

// SBAR Grading Strands (8-point scale)
export type SBARStrand = "KU" | "TT" | "C";

// AISC Institutional Competencies
export type AISCCompetency =
  | "criticalThinkers"
  | "resilientLearners"
  | "skillfulCommunicators"
  | "effectiveCollaborators"
  | "digitalNavigators"
  | "changeMakers";

// AISC Institutional Values
export type AISCValue =
  | "discovery"
  | "belonging"
  | "wellbeing"
  | "responsibility"
  | "purpose";

// UBD (Understanding by Design) Stage
export type UBDStage = "stage1" | "stage2" | "stage3" | "unassigned";

// UDL (Universal Design for Learning) Strategies
export interface UDLStrategies {
  representation: string[];
  actionExpression: string[];
  engagement: string[];
}

export interface Hex {
  id: string;
  mapId: string;
  label: string;
  description: string;
  type: HexType;
  status: HexStatus;
  icon: string;
  x: number;
  y: number;
  sbarDomains: SBARStrand[]; // KU, TT, C strands this hex targets
  slidesUrl?: string;
  estimatedMinutes: number;
  maxScore: number;
  standardIds: string[];
  // Curriculum metadata
  competencies?: AISCCompetency[];
  valuesAlignment?: AISCValue[];
  ubdStage?: UBDStage;
  udl?: UDLStrategies;
  atlSkills?: string; // Comma-separated IB ATL tags
  // Differentiation
  diffPathway?: DiffPathway;
  mtssTier?: MTSSTier;
  wida?: WIDAAdaptation;
}

export interface HexConnection {
  id: string;
  mapId: string;
  fromHexId: string;
  toHexId: string;
  pathway?: DiffPathway;
}

export interface LearningMap {
  id: string;
  courseId: string;
  title: string;
  description: string;
  hexCount: number;
  connectionCount: number;
  createdAt: string;
  updatedAt: string;
}

// === PROGRESS ===

export type ProgressStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "mastered";

export interface ProgressRecord {
  studentId: string;
  mapId: string;
  hexId: string;
  status: ProgressStatus;
  score: number | null;
  maxScore: number;
  completedAt: string | null;
  teacherApproved: boolean;
}

export interface StudentMapProgress {
  studentId: string;
  mapId: string;
  mapTitle: string;
  courseTitle: string;
  totalHexes: number;
  completedHexes: number;
  inProgressHexes: number;
  averageScore: number;
  lastAccessedAt: string;
}

// === STANDARDS & CURRICULUM ===

export interface Standard {
  id: string;
  framework: "NGSS" | "CCSS" | "IB" | "Custom";
  code: string;
  description: string;
  subject: string;
  gradeLevel: string;
  tags: string[];
}

export interface UBDUnit {
  id: string;
  courseId: string;
  unitNumber: number;
  title: string;
  stage1: { understandings: string[]; essentialQuestions: string[] };
  stage2: { assessments: string[] };
  stage3: { activities: string[] };
  completionPercentage: number;
}

// === PROGRESS DASHBOARD ===

export interface ProgressOverview {
  totalStudents: number;
  averageCompletion: number;
  activeMaps: number;
  totalLessonsCompleted: number;
}

export interface MapProgressData {
  mapId: string;
  mapTitle: string;
  completionRate: number;
  hexBreakdown: {
    hexId: string;
    hexLabel: string;
    completedCount: number;
    totalStudents: number;
  }[];
}

export interface StudentProgressDetail {
  studentId: string;
  studentName: string;
  avatarColor: string;
  overallCompletion: number;
  averageScore: number;
  isAtRisk: boolean;
  atRiskReason?: string;
  supportProfile?: SupportProfile;
  mapProgress: { mapId: string; mapTitle: string; completion: number }[];
  weeklyActivity: { week: string; lessonsCompleted: number }[];
}

export interface SBARData {
  strand: SBARStrand;
  strandName: string;
  classAverage: number;
  maxScore: number;
  studentScores: {
    studentId: string;
    studentName: string;
    score: number;
  }[];
}

export interface EngagementData {
  weeklyLogins: { week: string; count: number }[];
  avgTimeOnTask: number;
  lessonsPerWeek: { week: string; count: number }[];
}

export interface AssessmentData {
  mapId: string;
  mapTitle: string;
  averageScore: number;
  maxScore: number;
  passRate: number;
  scores: {
    studentId: string;
    studentName: string;
    score: number;
    maxScore: number;
    passed: boolean;
  }[];
}

export interface GroupData {
  groupId: string;
  groupName: string;
  studentIds: string[];
  averageCompletion: number;
  averageScore: number;
}

// === SUPPORT TABS ===

export interface Integration {
  id: string;
  name: string;
  icon: string;
  status: "connected" | "disconnected";
  description: string;
  lastSynced?: string;
}

export interface SharedMap {
  mapId: string;
  mapTitle: string;
  sharedWith: {
    userId: string;
    name: string;
    permission: "view" | "edit" | "admin";
  }[];
  lastEditedBy: string;
  lastEditedAt: string;
}

export interface ActivityFeedItem {
  id: string;
  userId: string;
  userName: string;
  action: string;
  mapTitle: string;
  timestamp: string;
}

export interface TeachingMethodContent {
  id: string;
  title: string;
  category:
    | "getting_started"
    | "key_concepts"
    | "demo"
    | "setup"
    | "templates";
  content: string;
  order: number;
}

export interface EALStrategy {
  id: string;
  title: string;
  category:
    | "vocabulary"
    | "scaffolding"
    | "visual"
    | "collaborative"
    | "assessment";
  widaLevels: number[];
  description: string;
  steps: string[];
}

// === STUDENT-SPECIFIC ===

export interface PlannerTask {
  id: string;
  hexLabel: string;
  mapTitle: string;
  dueDate: string;
  urgency: "overdue" | "due_today" | "due_this_week" | "upcoming";
  estimatedMinutes: number;
  hexType: HexType;
}

export interface Flashcard {
  id: string;
  hexLabel: string;
  question: string;
  answer: string;
  mastered: boolean;
}

// === TOP-LEVEL DATA SHAPE ===

export interface LearningHubData {
  // Shared entities
  maps: LearningMap[];
  hexes: Hex[];
  connections: HexConnection[];
  students: Student[];
  courses: Course[];
  classes: ClassSection[];
  progress: ProgressRecord[];

  // Teacher tabs
  myMaps: LearningMap[];
  mapBuilder: { selectedMapId: string };
  standards: Standard[];
  ubdUnits: UBDUnit[];
  progressDashboard: {
    overview: ProgressOverview;
    mapProgress: MapProgressData[];
    studentProgress: StudentProgressDetail[];
    sbarData: SBARData[];
    engagement: EngagementData;
    assessments: AssessmentData[];
    groups: GroupData[];
  };
  integrations: Integration[];
  sharedMaps: SharedMap[];
  activityFeed: ActivityFeedItem[];
  teachingMethods: TeachingMethodContent[];
  ealStrategies: EALStrategy[];

  // Student tabs
  studentView: {
    studentId: string;
    mapProgress: StudentMapProgress[];
    plannerTasks: PlannerTask[];
    flashcards: Flashcard[];
  };
}
