// ============================================
// Unified Learning Map — Mock Data Generator
// Seed: 77 (deterministic output)
// Produces data for all 13 teacher + 5 student tabs
// ============================================

import { faker } from "@faker-js/faker";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
faker.seed(77);

// --- Helpers ---
const pick = (arr) => arr[faker.number.int({ min: 0, max: arr.length - 1 })];
const pickN = (arr, n) => faker.helpers.shuffle([...arr]).slice(0, n);
const dateInPast = (days) => faker.date.recent({ days }).toISOString();
const dateInFuture = (days) => faker.date.soon({ days }).toISOString();

// --- Constants ---
const avatarColors = [
  "#ef4444", "#f97316", "#f59e0b", "#22c55e", "#14b8a6",
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#06b6d4",
  "#a855f7", "#10b981",
];

const HEX_TYPES = ["lesson", "activity", "assessment", "resource", "checkpoint"];
const HEX_TYPE_COLORS = {
  lesson: "#3b82f6",
  activity: "#22c55e",
  assessment: "#f59e0b",
  resource: "#8b5cf6",
  checkpoint: "#ef4444",
};

const SBAR_STRANDS = ["KU", "TT", "C"];
const AISC_COMPETENCIES = [
  "criticalThinkers", "resilientLearners", "skillfulCommunicators",
  "effectiveCollaborators", "digitalNavigators", "changeMakers",
];
const AISC_VALUES = ["discovery", "belonging", "wellbeing", "responsibility", "purpose"];
const UBD_STAGES = ["stage1", "stage2", "stage3", "unassigned"];

// UDL strategy presets (from real ULM Config.gs)
const UDL_REPRESENTATION = [
  "Visual diagrams", "Graphic organizers", "Vocabulary glossary", "Multimedia examples",
  "Bilingual resources", "Text-to-speech", "Color-coded notes", "Manipulatives",
];
const UDL_ACTION = [
  "Choice boards", "Verbal responses", "Digital submissions", "Collaborative work",
  "Physical models", "Drawing/sketching", "Step-by-step guides", "Peer teaching",
];
const UDL_ENGAGEMENT = [
  "Real-world connections", "Student choice", "Self-assessment", "Gamification",
  "Goal setting", "Peer collaboration", "Culturally responsive", "Flexible grouping",
];
const HEX_ICONS = ["🔬", "📖", "🧪", "✏️", "🔍", "💡", "📊", "🎯", "🧬", "⚗️", "📐", "🌡️"];

// Hex grid dimensions (used for reference only — positions are now explicit per map)
const HEX_WIDTH = 80;
const HEX_HEIGHT = 92;

// ============================================
// STUDENTS (12)
// ============================================
const STUDENT_COUNT = 12;
const students = Array.from({ length: STUDENT_COUNT }, (_, i) => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const hasSupport = i < 3;
  return {
    id: `stu_${String(i + 1).padStart(3, "0")}`,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@school.edu`,
    gradeLevel: pick([9, 9, 10, 10, 11]),
    avatarColor: avatarColors[i % avatarColors.length],
    role: "student",
    classIds: i < 8 ? ["cls_001", "cls_002"] : ["cls_003", "cls_004"],
    ...(hasSupport && {
      supportProfile: {
        profileType: pick(["WIDA", "EAL", "IEP", "504"]),
        ...(i < 2 && { widaLevel: faker.number.int({ min: 2, max: 4 }) }),
        accommodations: pickN(
          ["Extended time", "Word-to-word dictionary", "Visual supports", "Reduced workload", "Preferential seating", "Graphic organizers", "Sentence starters"],
          faker.number.int({ min: 1, max: 3 })
        ),
      },
    }),
  };
});

// Add teacher + admin
const teacher = {
  id: "tch_001",
  firstName: "Dr. Sarah",
  lastName: "Mitchell",
  email: "sarah.mitchell@school.edu",
  gradeLevel: 0,
  avatarColor: "#6366f1",
  role: "teacher",
  classIds: ["cls_001", "cls_002", "cls_003", "cls_004"],
};

const admin = {
  id: "adm_001",
  firstName: "James",
  lastName: "Chen",
  email: "james.chen@school.edu",
  gradeLevel: 0,
  avatarColor: "#f97316",
  role: "admin",
  classIds: [],
};

const allUsers = [...students, teacher, admin];

// ============================================
// COURSES (3)
// ============================================
const courses = [
  {
    id: "crs_001",
    title: "IB Chemistry SL",
    subject: "Chemistry",
    gradeLevel: 11,
    gradingSystem: "SBAR_8",
    teacherId: teacher.id,
    studentCount: 8,
    unitCount: 2,
    color: "#3b82f6",
    mapIds: ["map_001"],
  },
  {
    id: "crs_002",
    title: "IB Biology HL",
    subject: "Biology",
    gradeLevel: 11,
    gradingSystem: "IB_DP_7",
    teacherId: teacher.id,
    studentCount: 8,
    unitCount: 2,
    color: "#22c55e",
    mapIds: ["map_002"],
  },
  {
    id: "crs_003",
    title: "Year 9 Science",
    subject: "General Science",
    gradeLevel: 9,
    gradingSystem: "Custom",
    teacherId: teacher.id,
    studentCount: 4,
    unitCount: 2,
    color: "#f59e0b",
    mapIds: ["map_003"],
  },
];

// ============================================
// CLASSES (4)
// ============================================
const classes = [
  { id: "cls_001", name: "IB Chem SL — Period 2", courseId: "crs_001", period: "2", studentIds: students.slice(0, 8).map((s) => s.id), activeMapIds: ["map_001"] },
  { id: "cls_002", name: "IB Bio HL — Period 3", courseId: "crs_002", period: "3", studentIds: students.slice(0, 8).map((s) => s.id), activeMapIds: ["map_002"] },
  { id: "cls_003", name: "Year 9 Sci — Period 5", courseId: "crs_003", period: "5", studentIds: students.slice(8, 12).map((s) => s.id), activeMapIds: ["map_003"] },
  { id: "cls_004", name: "Year 9 Sci — Period 6", courseId: "crs_003", period: "6", studentIds: students.slice(8, 12).map((s) => s.id), activeMapIds: ["map_003"] },
];

// ============================================
// LEARNING MAPS (3) + HEXES + CONNECTIONS
// ============================================

// ============================================
// MAP DEFINITIONS — Explicit branching topologies
// Each map has hand-crafted hex positions and DAG connections
// ============================================

const mapDefinitions = [
  // ---- Map 1: Atomic Structure (10 hexes, 12 connections) ----
  // Diamond branch + scaffolded entry + enrichment extension
  {
    id: "map_001",
    courseId: "crs_001",
    title: "Atomic Structure",
    description: "Explore the nuclear atom, electron configurations, and counting particles through hands-on labs and simulations.",
    hexes: [
      // 0: Introduction to Matter (standard entry point)
      { label: "Introduction to Matter",       x: 280, y: 60,  type: "lesson",     icon: "🔬", diffPathway: "standard" },
      // 1: Nuclear Atom
      { label: "The Nuclear Atom",             x: 280, y: 170, type: "lesson",     icon: "📖", diffPathway: "standard" },
      // 2: Electron Configs (left branch)
      { label: "Electron Configurations",      x: 130, y: 290, type: "activity",   icon: "🧪", diffPathway: "standard" },
      // 3: Flame Test Lab (right branch)
      { label: "Lab: Flame Test",              x: 430, y: 290, type: "activity",   icon: "🔍", diffPathway: "standard" },
      // 4: Counting Particles (convergence)
      { label: "Counting Particles by Mass",   x: 280, y: 410, type: "lesson",     icon: "📊", diffPathway: "standard" },
      // 5: Isotopes
      { label: "Isotopes & Mass Spectrometry", x: 280, y: 520, type: "resource",   icon: "⚗️", diffPathway: "standard" },
      // 6: Quiz
      { label: "Quiz: Atomic Structure",       x: 280, y: 630, type: "assessment", icon: "📐", diffPathway: "standard" },
      // 7: Checkpoint
      { label: "Unit Checkpoint",              x: 280, y: 740, type: "checkpoint", icon: "🎯", diffPathway: "standard" },
      // 8: NEW — Scaffolded entry (left of Intro, feeds into Nuclear Atom)
      {
        label: "Visual Intro to Atoms",
        x: 130, y: 60,
        type: "lesson", icon: "💡",
        diffPathway: "scaffolded", mtssTier: 2,
        wida: {
          supportedLevels: [1, 2, 3],
          simplifiedDescription: "Learn about atoms using pictures and simple words. See what atoms look like and name their parts.",
          keyVocabulary: ["atom", "proton", "neutron", "electron", "nucleus", "element"],
          sentenceFrames: [
            "An atom is made of ___.",
            "The ___ is found in the center of the atom.",
            "Electrons move around the ___.",
          ],
          scaffoldingIntensity: "intensive",
        },
      },
      // 9: NEW — Enrichment extension (right of Isotopes)
      {
        label: "Quantum Numbers Deep Dive",
        x: 430, y: 520,
        type: "resource", icon: "🧬",
        diffPathway: "enrichment",
      },
    ],
    // Connections: [fromIndex, toIndex, pathway?]
    connections: [
      [0, 1, "standard"],     // Intro → Nuclear Atom
      [1, 2, "standard"],     // Nuclear Atom → Electron Configs (branch left)
      [1, 3, "standard"],     // Nuclear Atom → Flame Test Lab (branch right)
      [2, 4, "standard"],     // Electron Configs → Counting Particles (converge)
      [3, 4, "standard"],     // Flame Test Lab → Counting Particles (converge)
      [4, 5, "standard"],     // Counting Particles → Isotopes
      [5, 6, "standard"],     // Isotopes → Quiz
      [6, 7, "standard"],     // Quiz → Checkpoint
      [2, 5, "standard"],     // Electron Configs → Isotopes (shortcut for advanced)
      [8, 1, "scaffolded"],   // Visual Intro → Nuclear Atom (scaffolded entry)
      [5, 9, "enrichment"],   // Isotopes → Quantum Numbers (enrichment extension)
      [9, 6, "enrichment"],   // Quantum Numbers → Quiz (enrichment reconnects)
    ],
  },

  // ---- Map 2: Chemical Reactions (18 hexes, 24 connections) ----
  // Triple-branch with pathway tagging + scaffolded/enrichment additions
  {
    id: "map_002",
    courseId: "crs_002",
    title: "Chemical Reactions",
    description: "Investigate reaction types, rates, and equilibrium through experiments, data analysis, and collaborative problem-solving.",
    hexes: [
      // 0: Overview
      { label: "Reaction Types Overview",        x: 300, y: 60,   type: "lesson",     icon: "📖", diffPathway: "standard" },
      // 1: Synthesis (left branch — scaffolded path)
      { label: "Synthesis Reactions",             x: 110, y: 180,  type: "lesson",     icon: "🧪", diffPathway: "scaffolded", mtssTier: 2 },
      // 2: Single Replacement (center — standard path)
      { label: "Single Replacement Lab",          x: 300, y: 180,  type: "activity",   icon: "🔬", diffPathway: "standard" },
      // 3: Combustion (right branch — enrichment path)
      { label: "Combustion Analysis",             x: 490, y: 180,  type: "lesson",     icon: "🌡️", diffPathway: "enrichment" },
      // 4: Decomposition (scaffolded continuation)
      { label: "Decomposition Reactions",         x: 110, y: 300,  type: "activity",   icon: "⚗️", diffPathway: "scaffolded", mtssTier: 2 },
      // 5: Double Replacement (standard continuation)
      { label: "Double Replacement Activity",     x: 300, y: 300,  type: "activity",   icon: "🔍", diffPathway: "standard" },
      // 6: Balancing (convergence — standard)
      { label: "Balancing Equations Practice",    x: 300, y: 420,  type: "activity",   icon: "📐", diffPathway: "standard" },
      // 7: Stoichiometry
      { label: "Stoichiometry Introduction",      x: 300, y: 540,  type: "lesson",     icon: "📊", diffPathway: "standard" },
      // 8: Mole Calcs (left branch)
      { label: "Mole Calculations",               x: 150, y: 660,  type: "activity",   icon: "🧪", diffPathway: "standard" },
      // 9: Limiting Reagent (right branch)
      { label: "Limiting Reagent Lab",            x: 450, y: 660,  type: "activity",   icon: "🔬", diffPathway: "standard" },
      // 10: Percent Yield
      { label: "Percent Yield Activity",          x: 300, y: 780,  type: "assessment", icon: "📝", diffPathway: "standard" },
      // 11: Gas Laws
      { label: "Gas Laws Connection",             x: 300, y: 890,  type: "resource",   icon: "💡", diffPathway: "standard" },
      // 12: Reaction Rates
      { label: "Reaction Rates Investigation",    x: 300, y: 1000, type: "activity",   icon: "🧬", diffPathway: "standard" },
      // 13: Equilibrium
      { label: "Equilibrium Concepts",            x: 300, y: 1110, type: "lesson",     icon: "📖", diffPathway: "standard" },
      // 14: Unit Assessment
      { label: "Unit Assessment",                 x: 300, y: 1220, type: "checkpoint", icon: "🎯", diffPathway: "standard" },
      // 15: NEW — Scaffolded alternative to Balancing
      {
        label: "Guided Equation Practice",
        x: 110, y: 420,
        type: "activity", icon: "✏️",
        diffPathway: "scaffolded", mtssTier: 2,
        wida: {
          supportedLevels: [1, 2, 3],
          simplifiedDescription: "Practice balancing chemical equations step by step with visual guides and sentence frames.",
          keyVocabulary: ["reactant", "product", "coefficient", "balanced", "equation", "yield"],
          sentenceFrames: [
            "The reactants are ___ and ___.",
            "To balance the equation, I need to add a coefficient of ___ to ___.",
            "The equation is balanced because ___.",
          ],
          scaffoldingIntensity: "intensive",
        },
      },
      // 16: NEW — Enrichment extension from Stoichiometry
      {
        label: "Advanced Stoichiometry",
        x: 490, y: 540,
        type: "resource", icon: "📊",
        diffPathway: "enrichment",
      },
      // 17: NEW — Enrichment extension from Reaction Rates
      {
        label: "Reaction Rates Deep Dive",
        x: 490, y: 1000,
        type: "resource", icon: "🔬",
        diffPathway: "enrichment",
      },
    ],
    connections: [
      [0, 1, "scaffolded"],   // Overview → Synthesis (scaffolded left branch)
      [0, 2, "standard"],     // Overview → Single Replace (standard center branch)
      [0, 3, "enrichment"],   // Overview → Combustion (enrichment right branch)
      [1, 4, "scaffolded"],   // Synthesis → Decomposition
      [2, 5, "standard"],     // Single Replace → Double Replace
      [4, 15, "scaffolded"],  // Decomposition → Guided Equation Practice (scaffolded path)
      [15, 6, "scaffolded"],  // Guided Practice → Balancing (scaffolded reconnects)
      [5, 6, "standard"],     // Double Replace → Balancing (standard converge)
      [3, 6, "enrichment"],   // Combustion → Balancing (enrichment converge)
      [6, 7, "standard"],     // Balancing → Stoichiometry
      [7, 8],                 // Stoichiometry → Mole Calcs (branch left)
      [7, 9],                 // Stoichiometry → Limiting Reagent (branch right)
      [8, 10],                // Mole Calcs → Percent Yield (converge)
      [9, 10],                // Limiting Reagent → Percent Yield (converge)
      [10, 11],               // Percent Yield → Gas Laws
      [11, 12],               // Gas Laws → Reaction Rates
      [12, 13],               // Reaction Rates → Equilibrium
      [13, 14],               // Equilibrium → Unit Assessment
      [1, 6, "scaffolded"],   // Synthesis → Balancing (shortcut, still scaffolded)
      [8, 11],                // Mole Calcs → Gas Laws (shortcut)
      [7, 16, "enrichment"],  // Stoichiometry → Advanced Stoich (enrichment)
      [16, 10, "enrichment"], // Advanced Stoich → Percent Yield (enrichment reconnects)
      [12, 17, "enrichment"], // Reaction Rates → Deep Dive (enrichment)
      [17, 13, "enrichment"], // Deep Dive → Equilibrium (enrichment reconnects)
    ],
  },

  // ---- Map 3: Organic Chemistry (25 hexes, 33 connections) ----
  // Three major branches with scaffolded entry/exit + enrichment lab
  {
    id: "map_003",
    courseId: "crs_003",
    title: "Organic Chemistry",
    description: "Discover carbon compounds, functional groups, polymers, and biochemistry through model building and real-world applications.",
    hexes: [
      // 0: Carbon & Bonding (entry)
      { label: "Carbon & Bonding Basics",        x: 310, y: 60,   type: "lesson",     icon: "📖", diffPathway: "standard" },
      // Left branch: Hydrocarbons (standard)
      // 1
      { label: "Alkanes & Naming",               x: 90,  y: 190,  type: "lesson",     icon: "🧬", diffPathway: "standard" },
      // Center branch: Functional Groups (standard + some enrichment)
      // 2
      { label: "Functional Groups Overview",     x: 310, y: 190,  type: "lesson",     icon: "🔬", diffPathway: "standard" },
      // Right branch: Polymers & Biochemistry (standard)
      // 3
      { label: "Polymers Introduction",          x: 530, y: 190,  type: "lesson",     icon: "🧪", diffPathway: "standard" },
      // 4
      { label: "Alkenes & Addition Reactions",   x: 90,  y: 310,  type: "activity",   icon: "⚗️", diffPathway: "standard" },
      // 5
      { label: "Alcohols & Ethers",              x: 310, y: 310,  type: "lesson",     icon: "🔍", diffPathway: "standard" },
      // 6
      { label: "Condensation Polymers",          x: 530, y: 310,  type: "activity",   icon: "🧪", diffPathway: "standard" },
      // 7
      { label: "Alkynes Introduction",           x: 90,  y: 430,  type: "lesson",     icon: "📖", diffPathway: "standard" },
      // 8
      { label: "Aldehydes & Ketones",            x: 310, y: 430,  type: "activity",   icon: "💡", diffPathway: "standard" },
      // 9
      { label: "Addition Polymers Lab",          x: 530, y: 430,  type: "activity",   icon: "🔬", diffPathway: "standard" },
      // 10
      { label: "Isomers Activity",               x: 90,  y: 550,  type: "activity",   icon: "📐", diffPathway: "standard" },
      // 11
      { label: "Carboxylic Acids",               x: 310, y: 550,  type: "activity",   icon: "⚗️", diffPathway: "standard" },
      // 12
      { label: "Biochemistry: Carbohydrates",    x: 530, y: 550,  type: "lesson",     icon: "🧬", diffPathway: "standard" },
      // 13
      { label: "Molecular Model Lab",            x: 90,  y: 670,  type: "activity",   icon: "🔬", diffPathway: "standard" },
      // 14
      { label: "Esters & Fragrances Lab",        x: 310, y: 670,  type: "activity",   icon: "🧪", diffPathway: "standard" },
      // 15
      { label: "Biochemistry: Lipids",           x: 530, y: 670,  type: "lesson",     icon: "📖", diffPathway: "standard" },
      // 16
      { label: "Amines & Amino Acids",           x: 310, y: 790,  type: "lesson",     icon: "🧬", diffPathway: "standard" },
      // 17
      { label: "Biochemistry: Proteins",         x: 530, y: 790,  type: "lesson",     icon: "📊", diffPathway: "standard" },
      // 18
      { label: "DNA Structure Activity",         x: 530, y: 910,  type: "activity",   icon: "🧬", diffPathway: "standard" },
      // 19
      { label: "Organic Synthesis Challenge",    x: 310, y: 1030, type: "assessment", icon: "🎯", diffPathway: "standard" },
      // 20
      { label: "Review & Connections",           x: 310, y: 1150, type: "resource",   icon: "📖", diffPathway: "standard" },
      // 21
      { label: "Unit Final Assessment",          x: 310, y: 1260, type: "checkpoint", icon: "🎯", diffPathway: "standard" },
      // 22: NEW — Scaffolded entry to left branch
      {
        label: "Carbon Bonding Visual Guide",
        x: 90, y: 60,
        type: "resource", icon: "🖼️",
        diffPathway: "scaffolded", mtssTier: 2,
        wida: {
          supportedLevels: [1, 2, 3],
          simplifiedDescription: "Use pictures and diagrams to learn how carbon atoms connect. Match vocabulary to diagrams.",
          keyVocabulary: ["carbon", "bond", "single bond", "double bond", "hydrocarbon", "organic"],
          sentenceFrames: [
            "Carbon can form ___ bonds.",
            "A hydrocarbon contains ___ and ___.",
            "An organic compound always has ___.",
          ],
          scaffoldingIntensity: "intensive",
        },
      },
      // 23: NEW — Enrichment lab (below Molecular Model)
      {
        label: "Advanced Synthesis Lab",
        x: 90, y: 910,
        type: "activity", icon: "⚗️",
        diffPathway: "enrichment",
      },
      // 24: NEW — Scaffolded review (left of Review & Connections)
      {
        label: "Organic Review Scaffold",
        x: 90, y: 1150,
        type: "resource", icon: "📋",
        diffPathway: "scaffolded", mtssTier: 2,
        wida: {
          supportedLevels: [2, 3, 4],
          simplifiedDescription: "Review key organic chemistry ideas with graphic organizers and vocabulary practice before the final test.",
          keyVocabulary: ["functional group", "polymer", "monomer", "isomer", "reaction", "synthesis", "organic", "biochemistry"],
          sentenceFrames: [
            "A functional group is ___.",
            "Polymers are made from ___ called ___.",
            "The difference between ___ and ___ is ___.",
          ],
          scaffoldingIntensity: "moderate",
        },
      },
    ],
    connections: [
      // Branch splits from Carbon & Bonding
      [0, 1, "standard"],    // Carbon → Alkanes (left)
      [0, 2, "standard"],    // Carbon → Functional Groups (center)
      [0, 3, "standard"],    // Carbon → Polymers (right)
      // Left chain: Hydrocarbons
      [1, 4, "standard"],    // Alkanes → Alkenes
      [4, 7, "standard"],    // Alkenes → Alkynes
      [7, 10, "standard"],   // Alkynes → Isomers
      [10, 13, "standard"],  // Isomers → Molecular Model Lab
      // Center chain: Functional Groups
      [2, 5, "standard"],    // Functional Groups → Alcohols
      [5, 8, "standard"],    // Alcohols → Aldehydes
      [8, 11, "standard"],   // Aldehydes → Carboxylic Acids
      [11, 14, "standard"],  // Carboxylic Acids → Esters
      [14, 16, "standard"],  // Esters → Amines
      // Right chain: Polymers & Biochemistry
      [3, 6, "standard"],    // Polymers → Condensation
      [6, 9, "standard"],    // Condensation → Addition Poly Lab
      [9, 12, "standard"],   // Addition Poly → Biochem: Carbs
      [12, 15, "standard"],  // Carbs → Lipids
      [15, 17, "standard"],  // Lipids → Proteins
      [17, 18, "standard"],  // Proteins → DNA Structure
      // Convergence at Synthesis Challenge
      [13, 19, "standard"],  // Molecular Model → Synthesis (left converges)
      [16, 19, "standard"],  // Amines → Synthesis (center converges)
      [18, 19, "standard"],  // DNA Structure → Synthesis (right converges)
      // Linear ending
      [19, 20],              // Synthesis → Review
      [20, 21],              // Review → Final Assessment
      // Cross-branch connections
      [1, 2],                // Alkanes ↔ Functional Groups (related concepts)
      [10, 5],               // Isomers → Alcohols (isomer concept applies)
      [11, 6],               // Carboxylic Acids → Condensation Poly (form polymers)
      [13, 16],              // Molecular Model → Amines (models apply to all)
      [14, 17],              // Esters → Proteins (biochem connection)
      // NEW — Scaffolded entry
      [22, 1, "scaffolded"],   // Visual Guide → Alkanes (scaffolded entry to left branch)
      // NEW — Enrichment extension
      [13, 23, "enrichment"],  // Molecular Model → Advanced Synthesis
      [23, 19, "enrichment"],  // Advanced Synthesis → Organic Synthesis Challenge
      // NEW — Scaffolded exit
      [19, 24, "scaffolded"],  // Synthesis Challenge → Organic Review Scaffold
      [24, 21, "scaffolded"],  // Review Scaffold → Final Assessment
    ],
  },
];

// ============================================
// BUILD HEXES + CONNECTIONS FROM MAP DEFINITIONS
// ============================================

const allHexes = [];
const allConnections = [];

for (const mapDef of mapDefinitions) {
  const hexes = mapDef.hexes.map((hexDef, i) => ({
    id: `${mapDef.id}_hex_${String(i + 1).padStart(3, "0")}`,
    mapId: mapDef.id,
    label: hexDef.label,
    description: hexDef.wida?.simplifiedDescription ?? faker.lorem.sentence(),
    type: hexDef.type,
    status: i < mapDef.hexes.length - 1 ? "published" : "draft",
    icon: hexDef.icon,
    x: hexDef.x,
    y: hexDef.y,
    // SBAR Grading strands — multi-select KU/TT/C
    sbarDomains: pickN(SBAR_STRANDS, faker.number.int({ min: 1, max: 3 })),
    ...(faker.datatype.boolean({ probability: 0.3 }) && {
      slidesUrl: `https://docs.google.com/presentation/d/${faker.string.alphanumeric(44)}/edit`,
    }),
    estimatedMinutes: pick([15, 20, 25, 30, 45, 60]),
    maxScore:
      hexDef.type === "assessment" || hexDef.type === "checkpoint"
        ? pick([50, 100])
        : hexDef.type === "activity"
          ? pick([20, 30])
          : 0,
    standardIds: pickN(
      Array.from({ length: 20 }, (_, j) => `std_${String(j + 1).padStart(3, "0")}`),
      faker.number.int({ min: 0, max: 2 })
    ),
    // Curriculum metadata
    competencies: pickN(AISC_COMPETENCIES, faker.number.int({ min: 1, max: 3 })),
    valuesAlignment: pickN(AISC_VALUES, faker.number.int({ min: 1, max: 2 })),
    ubdStage: pick(UBD_STAGES),
    ...(faker.datatype.boolean({ probability: 0.5 }) && {
      udl: {
        representation: pickN(UDL_REPRESENTATION, faker.number.int({ min: 1, max: 3 })),
        actionExpression: pickN(UDL_ACTION, faker.number.int({ min: 1, max: 3 })),
        engagement: pickN(UDL_ENGAGEMENT, faker.number.int({ min: 1, max: 3 })),
      },
    }),
    // Differentiation fields
    ...(hexDef.diffPathway && { diffPathway: hexDef.diffPathway }),
    ...(hexDef.mtssTier && { mtssTier: hexDef.mtssTier }),
    ...(hexDef.wida && { wida: hexDef.wida }),
  }));

  allHexes.push(...hexes);

  // Build connections from explicit topology
  // Connection format: [fromIdx, toIdx] or [fromIdx, toIdx, pathway]
  mapDef.connections.forEach((conn, i) => {
    const [fromIdx, toIdx, pathway] = conn;
    allConnections.push({
      id: `${mapDef.id}_conn_${String(i + 1).padStart(3, "0")}`,
      mapId: mapDef.id,
      fromHexId: hexes[fromIdx].id,
      toHexId: hexes[toIdx].id,
      ...(pathway && { pathway }),
    });
  });
}

const maps = mapDefinitions.map((def) => ({
  id: def.id,
  courseId: def.courseId,
  title: def.title,
  description: def.description,
  hexCount: def.hexes.length,
  connectionCount: allConnections.filter((c) => c.mapId === def.id).length,
  createdAt: dateInPast(60),
  updatedAt: dateInPast(3),
}));

// ============================================
// STANDARDS (20)
// ============================================
const standards = [
  { id: "std_001", framework: "NGSS", code: "MS-PS1-1", description: "Develop models to describe the atomic composition of simple molecules and extended structures.", subject: "Physical Science", gradeLevel: "6-8", tags: ["atoms", "molecules", "models"] },
  { id: "std_002", framework: "NGSS", code: "MS-PS1-2", description: "Analyze and interpret data on the properties of substances before and after interaction.", subject: "Physical Science", gradeLevel: "6-8", tags: ["chemical reactions", "properties"] },
  { id: "std_003", framework: "NGSS", code: "MS-PS1-4", description: "Develop a model that predicts and describes changes in particle motion, temperature, and state.", subject: "Physical Science", gradeLevel: "6-8", tags: ["states of matter", "temperature"] },
  { id: "std_004", framework: "NGSS", code: "MS-LS1-1", description: "Conduct an investigation to provide evidence that living things are made of cells.", subject: "Life Science", gradeLevel: "6-8", tags: ["cells", "organisms"] },
  { id: "std_005", framework: "NGSS", code: "MS-LS1-2", description: "Develop and use a model to describe the function of a cell as a whole.", subject: "Life Science", gradeLevel: "6-8", tags: ["cells", "organelles", "models"] },
  { id: "std_006", framework: "NGSS", code: "HS-PS1-1", description: "Use the periodic table to predict the relative properties of elements.", subject: "Chemistry", gradeLevel: "9-12", tags: ["periodic table", "elements"] },
  { id: "std_007", framework: "NGSS", code: "HS-PS1-2", description: "Construct and revise an explanation for the outcome of a simple chemical reaction.", subject: "Chemistry", gradeLevel: "9-12", tags: ["reactions", "stoichiometry"] },
  { id: "std_008", framework: "NGSS", code: "HS-PS1-5", description: "Apply scientific principles and evidence to provide an explanation about the effects of changing conditions.", subject: "Chemistry", gradeLevel: "9-12", tags: ["equilibrium", "Le Chatelier"] },
  { id: "std_009", framework: "NGSS", code: "HS-LS1-6", description: "Construct and revise an explanation based on evidence for how carbon, hydrogen, and oxygen form sugars.", subject: "Biology", gradeLevel: "9-12", tags: ["photosynthesis", "carbon cycle"] },
  { id: "std_010", framework: "NGSS", code: "HS-LS1-7", description: "Use a model to illustrate that cellular respiration is a chemical process.", subject: "Biology", gradeLevel: "9-12", tags: ["respiration", "energy"] },
  { id: "std_011", framework: "CCSS", code: "RST.9-10.3", description: "Follow precisely a complex multistep procedure when carrying out experiments.", subject: "Literacy in Science", gradeLevel: "9-10", tags: ["lab procedures", "scientific method"] },
  { id: "std_012", framework: "CCSS", code: "RST.9-10.7", description: "Translate quantitative or technical information expressed in words into visual form.", subject: "Literacy in Science", gradeLevel: "9-10", tags: ["data visualization", "graphs"] },
  { id: "std_013", framework: "CCSS", code: "RST.11-12.1", description: "Cite specific textual evidence to support analysis of science and technical subjects.", subject: "Literacy in Science", gradeLevel: "11-12", tags: ["evidence", "analysis"] },
  { id: "std_014", framework: "CCSS", code: "WHST.9-10.2", description: "Write informative/explanatory texts, including scientific procedures and experiments.", subject: "Writing in Science", gradeLevel: "9-10", tags: ["lab reports", "writing"] },
  { id: "std_015", framework: "IB", code: "IB-Chem-S1", description: "Models of particulate nature of matter: Structure 1", subject: "IB Chemistry", gradeLevel: "11-12", tags: ["particulate model", "IB"] },
  { id: "std_016", framework: "IB", code: "IB-Chem-S2", description: "Models of bonding and structure: Structure 2", subject: "IB Chemistry", gradeLevel: "11-12", tags: ["bonding", "IB"] },
  { id: "std_017", framework: "IB", code: "IB-Chem-R1", description: "What drives chemical reactions: Reactivity 1", subject: "IB Chemistry", gradeLevel: "11-12", tags: ["enthalpy", "IB"] },
  { id: "std_018", framework: "IB", code: "IB-Bio-A1", description: "Unity and diversity: Biology A1", subject: "IB Biology", gradeLevel: "11-12", tags: ["evolution", "diversity", "IB"] },
  { id: "std_019", framework: "Custom", code: "SCI-9-001", description: "Demonstrate understanding of the scientific method through hands-on investigation.", subject: "General Science", gradeLevel: "9", tags: ["scientific method", "investigation"] },
  { id: "std_020", framework: "Custom", code: "SCI-9-002", description: "Communicate scientific findings using appropriate terminology and visual representations.", subject: "General Science", gradeLevel: "9", tags: ["communication", "data presentation"] },
];

// ============================================
// UBD UNITS (6 — 2 per course)
// ============================================
const ubdUnits = [
  {
    id: "ubd_001", courseId: "crs_001", unitNumber: 1, title: "Atomic Structure & the Periodic Table",
    stage1: {
      understandings: ["Atoms are the fundamental building blocks of matter with specific subatomic structures.", "The periodic table organizes elements by properties that emerge from electron configuration."],
      essentialQuestions: ["How does the structure of an atom determine its chemical behavior?", "Why is the periodic table organized the way it is?"],
    },
    stage2: { assessments: ["Atomic structure concept map", "Flame test lab report", "Electron configuration quiz"] },
    stage3: { activities: ["Build atomic models", "Flame test experiment", "Periodic trend graphing", "Electron configuration practice"] },
    completionPercentage: 85,
  },
  {
    id: "ubd_002", courseId: "crs_001", unitNumber: 2, title: "Chemical Bonding & Molecular Structure",
    stage1: {
      understandings: ["Chemical bonds form to achieve more stable electron configurations.", "The type of bonding determines the physical properties of a substance."],
      essentialQuestions: ["Why do atoms bond with each other?", "How does bonding type affect macroscopic properties?"],
    },
    stage2: { assessments: ["Lewis structure drawing assessment", "Bonding types comparison essay", "Molecular geometry lab"] },
    stage3: { activities: ["Lewis dot structure practice", "VSEPR model building", "Properties of ionic vs covalent compounds lab"] },
    completionPercentage: 60,
  },
  {
    id: "ubd_003", courseId: "crs_002", unitNumber: 1, title: "Cell Biology & Membrane Transport",
    stage1: {
      understandings: ["Cells are the basic unit of life with specialized organelles.", "Membrane transport maintains cellular homeostasis."],
      essentialQuestions: ["How do cell structures support life functions?", "How do cells regulate what enters and exits?"],
    },
    stage2: { assessments: ["Cell organelle identification test", "Osmosis lab report", "Transport mechanism diagram"] },
    stage3: { activities: ["Microscope cell observation", "Cell model construction", "Osmosis potato experiment", "Membrane simulation"] },
    completionPercentage: 92,
  },
  {
    id: "ubd_004", courseId: "crs_002", unitNumber: 2, title: "Molecular Biology & Genetics",
    stage1: {
      understandings: ["DNA structure determines protein synthesis and inheritance patterns.", "Gene expression is regulated by environmental and cellular factors."],
      essentialQuestions: ["How does DNA encode information for life?", "What factors influence gene expression?"],
    },
    stage2: { assessments: ["DNA replication model", "Genetics problem set", "Gene expression case study"] },
    stage3: { activities: ["DNA extraction lab", "Protein synthesis simulation", "Punnett square practice", "Epigenetics research project"] },
    completionPercentage: 45,
  },
  {
    id: "ubd_005", courseId: "crs_003", unitNumber: 1, title: "Introduction to Scientific Method",
    stage1: {
      understandings: ["Scientific inquiry follows systematic processes of observation, hypothesis, and experimentation.", "Variables must be controlled to draw valid conclusions."],
      essentialQuestions: ["How do scientists design reliable experiments?", "What makes evidence valid and trustworthy?"],
    },
    stage2: { assessments: ["Design an experiment project", "Variable identification quiz", "Lab report writing assessment"] },
    stage3: { activities: ["Observation scavenger hunt", "Hypothesis writing practice", "Paper airplane experiment", "Data collection activity"] },
    completionPercentage: 100,
  },
  {
    id: "ubd_006", courseId: "crs_003", unitNumber: 2, title: "Matter & Energy Transformations",
    stage1: {
      understandings: ["Matter can change form but is conserved in chemical and physical changes.", "Energy flows and transforms but is conserved in closed systems."],
      essentialQuestions: ["How can we tell if a chemical change has occurred?", "Where does energy go during a transformation?"],
    },
    stage2: { assessments: ["Physical vs chemical changes lab practical", "Energy transformation poster", "Conservation of mass demonstration"] },
    stage3: { activities: ["States of matter simulation", "Chemical change stations", "Calorimetry experiment", "Energy flow diagram creation"] },
    completionPercentage: 70,
  },
];

// ============================================
// PROGRESS RECORDS (~540)
// ============================================
const allProgress = [];

// Student ability profiles (0.0 to 1.0)
const abilities = [0.92, 0.85, 0.78, 0.72, 0.68, 0.65, 0.58, 0.52, 0.75, 0.88, 0.45, 0.35];

for (const student of students) {
  const ability = abilities[students.indexOf(student)];

  for (const mapDef of mapDefinitions) {
    // Only students in the right class see the right maps
    const courseClasses = classes.filter((c) => c.courseId === mapDef.courseId);
    const enrolled = courseClasses.some((c) => c.studentIds.includes(student.id));
    if (!enrolled) continue;

    const mapHexes = allHexes.filter((h) => h.mapId === mapDef.id);
    const progressLevel = ability * faker.number.float({ min: 0.6, max: 1.0 });
    const completedCount = Math.floor(mapHexes.length * progressLevel);

    for (let i = 0; i < mapHexes.length; i++) {
      const hex = mapHexes[i];
      let status, score, completedAt, teacherApproved;

      if (i < completedCount - 1) {
        status = faker.datatype.boolean({ probability: 0.2 }) ? "mastered" : "completed";
        score = hex.maxScore > 0
          ? Math.round(hex.maxScore * faker.number.float({ min: ability * 0.6, max: Math.min(1, ability * 1.2) }))
          : null;
        completedAt = dateInPast(faker.number.int({ min: 1, max: 30 }));
        teacherApproved = faker.datatype.boolean({ probability: 0.8 });
      } else if (i === completedCount - 1 || i === completedCount) {
        status = "in_progress";
        score = null;
        completedAt = null;
        teacherApproved = false;
      } else {
        status = "not_started";
        score = null;
        completedAt = null;
        teacherApproved = false;
      }

      allProgress.push({
        studentId: student.id,
        mapId: mapDef.id,
        hexId: hex.id,
        status,
        score,
        maxScore: hex.maxScore,
        completedAt,
        teacherApproved,
      });
    }
  }
}

// ============================================
// PROGRESS DASHBOARD DATA
// ============================================

// Overview
const completedProgress = allProgress.filter((p) => p.status === "completed" || p.status === "mastered");
const progressOverview = {
  totalStudents: STUDENT_COUNT,
  averageCompletion: Math.round(
    (completedProgress.length / allProgress.filter((p) => p.status !== undefined).length) * 100
  ),
  activeMaps: maps.length,
  totalLessonsCompleted: completedProgress.length,
};

// Map progress
const mapProgress = maps.map((map) => {
  const mapRecords = allProgress.filter((p) => p.mapId === map.id);
  const mapHexes = allHexes.filter((h) => h.mapId === map.id);
  const studentsOnMap = [...new Set(mapRecords.map((p) => p.studentId))];
  const totalPossible = studentsOnMap.length * mapHexes.length;
  const completed = mapRecords.filter((p) => p.status === "completed" || p.status === "mastered").length;

  return {
    mapId: map.id,
    mapTitle: map.title,
    completionRate: totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0,
    hexBreakdown: mapHexes.map((hex) => {
      const hexRecords = mapRecords.filter((p) => p.hexId === hex.id);
      const completedCount = hexRecords.filter((p) => p.status === "completed" || p.status === "mastered").length;
      return {
        hexId: hex.id,
        hexLabel: hex.label,
        completedCount,
        totalStudents: studentsOnMap.length,
      };
    }),
  };
});

// Student progress details
const weeks = Array.from({ length: 8 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (7 - i) * 7);
  return `W${i + 1}`;
});

const studentProgress = students.map((student) => {
  const studentRecords = allProgress.filter((p) => p.studentId === student.id);
  const completed = studentRecords.filter((p) => p.status === "completed" || p.status === "mastered");
  const total = studentRecords.length;
  const scores = studentRecords.filter((p) => p.score !== null).map((p) => p.score);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const completion = total > 0 ? Math.round((completed.length / total) * 100) : 0;
  const isAtRisk = avgScore < 50 || completion < 30;

  return {
    studentId: student.id,
    studentName: `${student.firstName} ${student.lastName}`,
    avatarColor: student.avatarColor,
    overallCompletion: completion,
    averageScore: avgScore,
    isAtRisk,
    ...(isAtRisk && { atRiskReason: avgScore < 50 ? "Low average score" : "Minimal progress" }),
    ...(student.supportProfile && { supportProfile: student.supportProfile }),
    mapProgress: maps.map((map) => {
      const mr = allProgress.filter((p) => p.studentId === student.id && p.mapId === map.id);
      const mc = mr.filter((p) => p.status === "completed" || p.status === "mastered").length;
      return { mapId: map.id, mapTitle: map.title, completion: mr.length > 0 ? Math.round((mc / mr.length) * 100) : 0 };
    }).filter((mp) => mp.completion >= 0),
    weeklyActivity: weeks.map((week) => ({
      week,
      lessonsCompleted: faker.number.int({ min: 0, max: 5 }),
    })),
  };
});

// SBAR performance (KU / TT / C strands)
const sbarData = SBAR_STRANDS.map((strand) => {
  const strandNames = { KU: "Knowledge & Understanding", TT: "Thinking & Transferring", C: "Communication" };
  const strandHexes = allHexes.filter((h) => h.sbarDomains?.includes(strand));
  const strandHexIds = new Set(strandHexes.map((h) => h.id));
  const strandRecords = allProgress.filter((p) => strandHexIds.has(p.hexId) && p.score !== null);

  return {
    strand,
    strandName: strandNames[strand],
    classAverage: strandRecords.length > 0
      ? Math.round(strandRecords.reduce((sum, p) => sum + (p.score / p.maxScore) * 100, 0) / strandRecords.length)
      : 0,
    maxScore: 100,
    studentScores: students.map((s) => {
      const sr = strandRecords.filter((p) => p.studentId === s.id);
      return {
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        score: sr.length > 0 ? Math.round(sr.reduce((sum, p) => sum + (p.score / p.maxScore) * 100, 0) / sr.length) : 0,
      };
    }),
  };
});

// Engagement
const engagement = {
  weeklyLogins: weeks.map((week) => ({ week, count: faker.number.int({ min: 8, max: 12 }) })),
  avgTimeOnTask: faker.number.int({ min: 18, max: 32 }),
  lessonsPerWeek: weeks.map((week) => ({ week, count: faker.number.int({ min: 15, max: 40 }) })),
};

// Assessments
const assessments = maps.map((map) => {
  const mapHexes = allHexes.filter((h) => h.mapId === map.id && (h.type === "assessment" || h.type === "checkpoint"));
  const mapRecords = allProgress.filter((p) => p.mapId === map.id && mapHexes.some((h) => h.id === p.hexId) && p.score !== null);
  const totalMax = mapRecords.length > 0 ? mapRecords[0].maxScore : 100;
  const avgScore = mapRecords.length > 0 ? Math.round(mapRecords.reduce((s, p) => s + p.score, 0) / mapRecords.length) : 0;
  const passRate = mapRecords.length > 0 ? Math.round((mapRecords.filter((p) => p.score >= p.maxScore * 0.5).length / mapRecords.length) * 100) : 0;

  return {
    mapId: map.id,
    mapTitle: map.title,
    averageScore: avgScore,
    maxScore: totalMax,
    passRate,
    scores: students.map((s) => {
      const sr = mapRecords.filter((p) => p.studentId === s.id);
      const totalScore = sr.reduce((sum, p) => sum + p.score, 0);
      const totalMax = sr.reduce((sum, p) => sum + p.maxScore, 0);
      return {
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        score: totalScore,
        maxScore: totalMax || 100,
        passed: totalMax > 0 ? totalScore >= totalMax * 0.5 : false,
      };
    }),
  };
});

// Groups
const groups = [
  { groupId: "grp_001", groupName: "Alpha Team", studentIds: students.slice(0, 3).map((s) => s.id), averageCompletion: 0, averageScore: 0 },
  { groupId: "grp_002", groupName: "Beta Team", studentIds: students.slice(3, 6).map((s) => s.id), averageCompletion: 0, averageScore: 0 },
  { groupId: "grp_003", groupName: "Gamma Team", studentIds: students.slice(6, 9).map((s) => s.id), averageCompletion: 0, averageScore: 0 },
  { groupId: "grp_004", groupName: "Delta Team", studentIds: students.slice(9, 12).map((s) => s.id), averageCompletion: 0, averageScore: 0 },
];

// Calculate group averages
for (const group of groups) {
  const groupStudentDetails = studentProgress.filter((sp) => group.studentIds.includes(sp.studentId));
  group.averageCompletion = groupStudentDetails.length > 0
    ? Math.round(groupStudentDetails.reduce((s, sp) => s + sp.overallCompletion, 0) / groupStudentDetails.length)
    : 0;
  group.averageScore = groupStudentDetails.length > 0
    ? Math.round(groupStudentDetails.reduce((s, sp) => s + sp.averageScore, 0) / groupStudentDetails.length)
    : 0;
}

// ============================================
// SUPPORT TAB DATA
// ============================================

const integrations = [
  { id: "int_001", name: "Google Classroom", icon: "🎓", status: "connected", description: "Sync roster and assignments with Google Classroom.", lastSynced: dateInPast(1) },
  { id: "int_002", name: "Google Slides", icon: "📊", status: "connected", description: "Embed slide presentations directly into learning map nodes.", lastSynced: dateInPast(2) },
  { id: "int_003", name: "Canvas LMS", icon: "🖥️", status: "disconnected", description: "Import grades and export progress data to Canvas." },
];

const sharedMaps = [
  {
    mapId: "map_001", mapTitle: "Atomic Structure",
    sharedWith: [
      { userId: "tch_002", name: "Mr. Rodriguez", permission: "edit" },
      { userId: "tch_003", name: "Ms. Patel", permission: "view" },
    ],
    lastEditedBy: "Dr. Sarah Mitchell",
    lastEditedAt: dateInPast(2),
  },
  {
    mapId: "map_002", mapTitle: "Chemical Reactions",
    sharedWith: [
      { userId: "tch_002", name: "Mr. Rodriguez", permission: "admin" },
    ],
    lastEditedBy: "Mr. Rodriguez",
    lastEditedAt: dateInPast(5),
  },
];

const activityFeed = [
  { id: "act_001", userId: "tch_001", userName: "Dr. Mitchell", action: "added 2 hexes to", mapTitle: "Atomic Structure", timestamp: dateInPast(1) },
  { id: "act_002", userId: "tch_002", userName: "Mr. Rodriguez", action: "updated connections in", mapTitle: "Chemical Reactions", timestamp: dateInPast(2) },
  { id: "act_003", userId: "tch_001", userName: "Dr. Mitchell", action: "published", mapTitle: "Organic Chemistry", timestamp: dateInPast(3) },
  { id: "act_004", userId: "tch_003", userName: "Ms. Patel", action: "commented on", mapTitle: "Atomic Structure", timestamp: dateInPast(4) },
  { id: "act_005", userId: "tch_001", userName: "Dr. Mitchell", action: "created new hex in", mapTitle: "Organic Chemistry", timestamp: dateInPast(5) },
];

const teachingMethods = [
  { id: "tm_001", title: "Welcome to Hex-Based Learning", category: "getting_started", content: "Hex-based learning maps transform traditional curriculum into visual, interactive pathways. Students navigate hexagonal nodes, each representing a lesson, activity, or assessment, building understanding as they progress.", order: 1 },
  { id: "tm_002", title: "Setting Up Your First Map", category: "getting_started", content: "Start by identifying the key concepts in your unit. Create hexes for each concept, then connect them to show prerequisite relationships. Use different hex types (lesson, activity, assessment) to vary the learning experience.", order: 2 },
  { id: "tm_003", title: "The Hex Learning Cycle", category: "key_concepts", content: "Each hex follows a cycle: Introduce (lesson) → Practice (activity) → Assess (checkpoint). This ensures students build, apply, and demonstrate knowledge at every stage.", order: 3 },
  { id: "tm_004", title: "Differentiation Through Pathways", category: "key_concepts", content: "Create multiple paths through the map to differentiate instruction. Advanced students can take shortcut paths while struggling students follow scaffolded routes with additional support hexes.", order: 4 },
  { id: "tm_005", title: "Interactive Map Builder Demo", category: "demo", content: "Try adding hexes, creating connections, and editing node properties. The map builder supports drag-and-drop positioning, connection drawing, and real-time collaboration.", order: 5 },
  { id: "tm_006", title: "Configuring Student Progress Tracking", category: "setup", content: "Set completion requirements for each hex: automatic (view-based), manual (student marks complete), or scored (must achieve minimum score). Configure approval requirements for teacher review.", order: 6 },
  { id: "tm_007", title: "Integrating with Google Classroom", category: "setup", content: "Connect your Google Classroom account to automatically import student rosters and sync assignment data. Map completions can be pushed as grades to Classroom.", order: 7 },
  { id: "tm_008", title: "Linear Progression Template", category: "templates", content: "A simple sequential path: Introduction → Guided Practice → Independent Practice → Assessment → Reflection. Best for topics with clear prerequisite chains.", order: 8 },
  { id: "tm_009", title: "Branching Exploration Template", category: "templates", content: "A central hub with branching paths students choose between. Converges at a final assessment. Ideal for units where multiple topics can be studied in any order.", order: 9 },
  { id: "tm_010", title: "Spiral Review Template", category: "templates", content: "Concepts revisit earlier material at increasing depth. Includes periodic review checkpoints that spiral back to reinforce prior learning.", order: 10 },
];

const ealStrategies = [
  { id: "eal_001", title: "Word Wall Integration", category: "vocabulary", widaLevels: [1, 2, 3], description: "Create visual word walls within hex maps that students can reference as they navigate lessons.", steps: ["Identify key vocabulary for each hex", "Add visual definitions and translations", "Link vocabulary hexes as prerequisites", "Review progress on vocabulary mastery"] },
  { id: "eal_002", title: "Sentence Frame Scaffolding", category: "scaffolding", widaLevels: [2, 3, 4], description: "Embed sentence frames in activity hexes to help EAL students structure their responses.", steps: ["Identify writing tasks in the map", "Create tiered sentence frames by WIDA level", "Add frames to hex descriptions", "Gradually reduce scaffolding in later hexes"] },
  { id: "eal_003", title: "Visual Anchor Charts", category: "visual", widaLevels: [1, 2, 3, 4], description: "Attach visual anchor charts to lesson hexes showing key concepts through images and diagrams.", steps: ["Create anchor charts for abstract concepts", "Upload as Google Slides attachments", "Link to relevant hex nodes", "Include bilingual labels where appropriate"] },
  { id: "eal_004", title: "Collaborative Discussion Protocols", category: "collaborative", widaLevels: [3, 4, 5], description: "Structure group discussion hexes with protocols that support language development.", steps: ["Design think-pair-share activities", "Provide discussion sentence starters", "Assign collaborative roles", "Include reflection on language use"] },
  { id: "eal_005", title: "Modified Assessment Strategies", category: "assessment", widaLevels: [1, 2, 3], description: "Create alternative assessment hexes that allow EAL students to demonstrate knowledge through multiple modalities.", steps: ["Offer visual/oral alternatives to written tests", "Allow extended time on assessment hexes", "Provide word-to-word dictionaries", "Use rubrics that separate content from language"] },
  { id: "eal_006", title: "Content-Language Objective Pairing", category: "scaffolding", widaLevels: [2, 3, 4, 5], description: "Each hex includes both a content objective and a language objective, making language development explicit.", steps: ["Write content objectives for each hex", "Add language objectives aligned to WIDA Can-Do descriptors", "Design activities that practice both objectives", "Assess both content and language growth"] },
  { id: "eal_007", title: "Graphic Organizer Library", category: "visual", widaLevels: [1, 2, 3, 4], description: "Provide graphic organizers as downloadable resources within resource hexes to support comprehension.", steps: ["Select appropriate organizers for each topic", "Create simplified versions for lower WIDA levels", "Embed in resource hexes", "Model usage in lesson hexes"] },
  { id: "eal_008", title: "Peer Translation Support", category: "collaborative", widaLevels: [1, 2, 3], description: "Enable collaborative hexes where multilingual students can support each other with translations and explanations.", steps: ["Identify bilingual students in each group", "Create paired activity hexes", "Provide translation tools and resources", "Celebrate multilingual contributions"] },
];

// ============================================
// STUDENT VIEW DATA
// ============================================
const featuredStudent = students[3]; // Mid-ability student

const studentMapProgressData = maps
  .filter((map) => {
    const mapRecords = allProgress.filter((p) => p.studentId === featuredStudent.id && p.mapId === map.id);
    return mapRecords.length > 0;
  })
  .map((map) => {
    const mapRecords = allProgress.filter((p) => p.studentId === featuredStudent.id && p.mapId === map.id);
    const completed = mapRecords.filter((p) => p.status === "completed" || p.status === "mastered").length;
    const inProgress = mapRecords.filter((p) => p.status === "in_progress").length;
    const scores = mapRecords.filter((p) => p.score !== null).map((p) => p.score);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const course = courses.find((c) => c.id === map.courseId);

    return {
      studentId: featuredStudent.id,
      mapId: map.id,
      mapTitle: map.title,
      courseTitle: course?.title ?? "Unknown",
      totalHexes: mapRecords.length,
      completedHexes: completed,
      inProgressHexes: inProgress,
      averageScore: avgScore,
      lastAccessedAt: dateInPast(faker.number.int({ min: 1, max: 5 })),
    };
  });

const plannerTasks = [
  { id: "pt_001", hexLabel: "Stoichiometry Introduction", mapTitle: "Chemical Reactions", dueDate: dateInPast(1), urgency: "overdue", estimatedMinutes: 30, hexType: "lesson" },
  { id: "pt_002", hexLabel: "Mole Calculations", mapTitle: "Chemical Reactions", dueDate: new Date().toISOString(), urgency: "due_today", estimatedMinutes: 45, hexType: "activity" },
  { id: "pt_003", hexLabel: "Limiting Reagent Lab", mapTitle: "Chemical Reactions", dueDate: dateInFuture(2), urgency: "due_this_week", estimatedMinutes: 60, hexType: "activity" },
  { id: "pt_004", hexLabel: "Percent Yield Activity", mapTitle: "Chemical Reactions", dueDate: dateInFuture(5), urgency: "due_this_week", estimatedMinutes: 25, hexType: "activity" },
  { id: "pt_005", hexLabel: "Molecular Model Lab", mapTitle: "Organic Chemistry", dueDate: dateInFuture(3), urgency: "due_this_week", estimatedMinutes: 45, hexType: "activity" },
  { id: "pt_006", hexLabel: "Functional Groups Overview", mapTitle: "Organic Chemistry", dueDate: dateInFuture(7), urgency: "upcoming", estimatedMinutes: 20, hexType: "lesson" },
  { id: "pt_007", hexLabel: "Gas Laws Connection", mapTitle: "Chemical Reactions", dueDate: dateInFuture(10), urgency: "upcoming", estimatedMinutes: 30, hexType: "resource" },
  { id: "pt_008", hexLabel: "Unit Assessment", mapTitle: "Chemical Reactions", dueDate: dateInFuture(14), urgency: "upcoming", estimatedMinutes: 60, hexType: "checkpoint" },
];

const flashcards = [
  { id: "fc_001", hexLabel: "Introduction to Matter", question: "What are the three subatomic particles and their charges?", answer: "Protons (+), Neutrons (0), Electrons (-)", mastered: true },
  { id: "fc_002", hexLabel: "The Nuclear Atom", question: "What determines the identity of an element?", answer: "The number of protons (atomic number)", mastered: true },
  { id: "fc_003", hexLabel: "Electron Configurations", question: "What is the Aufbau principle?", answer: "Electrons fill orbitals from lowest to highest energy levels.", mastered: false },
  { id: "fc_004", hexLabel: "Counting Particles by Mass", question: "What is Avogadro's number?", answer: "6.022 x 10^23 particles per mole", mastered: true },
  { id: "fc_005", hexLabel: "Reaction Types Overview", question: "Name the 5 main types of chemical reactions.", answer: "Synthesis, Decomposition, Single Replacement, Double Replacement, Combustion", mastered: false },
  { id: "fc_006", hexLabel: "Synthesis Reactions", question: "What is the general form of a synthesis reaction?", answer: "A + B → AB", mastered: true },
  { id: "fc_007", hexLabel: "Decomposition Reactions", question: "What is the general form of a decomposition reaction?", answer: "AB → A + B", mastered: false },
  { id: "fc_008", hexLabel: "Balancing Equations Practice", question: "What must be conserved in a balanced chemical equation?", answer: "The number of atoms of each element on both sides (Law of Conservation of Mass)", mastered: true },
  { id: "fc_009", hexLabel: "Carbon & Bonding Basics", question: "Why can carbon form so many compounds?", answer: "Carbon has 4 valence electrons, allowing it to form 4 covalent bonds in many configurations.", mastered: false },
  { id: "fc_010", hexLabel: "Alkanes & Naming", question: "What is the general formula for alkanes?", answer: "CnH(2n+2)", mastered: false },
  { id: "fc_011", hexLabel: "Lab: Flame Test", question: "What causes the different colors in a flame test?", answer: "Excited electrons returning to ground state emit photons at specific wavelengths.", mastered: true },
  { id: "fc_012", hexLabel: "Isotopes & Mass Spectrometry", question: "What are isotopes?", answer: "Atoms of the same element with different numbers of neutrons.", mastered: true },
  { id: "fc_013", hexLabel: "Single Replacement Lab", question: "What determines if a single replacement reaction will occur?", answer: "The activity series — more reactive metals displace less reactive ones.", mastered: false },
  { id: "fc_014", hexLabel: "Combustion Analysis", question: "What are the products of complete combustion of a hydrocarbon?", answer: "CO2 (carbon dioxide) and H2O (water)", mastered: true },
  { id: "fc_015", hexLabel: "Alkenes & Addition Reactions", question: "What makes alkenes more reactive than alkanes?", answer: "The C=C double bond can undergo addition reactions, breaking the pi bond.", mastered: false },
];

// ============================================
// ASSEMBLE OUTPUT
// ============================================
const output = {
  // Shared entities
  maps,
  hexes: allHexes,
  connections: allConnections,
  students: allUsers,
  courses,
  classes,
  progress: allProgress,

  // Teacher tabs
  myMaps: maps,
  mapBuilder: { selectedMapId: "map_001" },
  standards,
  ubdUnits,
  progressDashboard: {
    overview: progressOverview,
    mapProgress,
    studentProgress,
    sbarData,
    engagement,
    assessments,
    groups,
  },
  integrations,
  sharedMaps,
  activityFeed,
  teachingMethods,
  ealStrategies,

  // Student tabs
  studentView: {
    studentId: featuredStudent.id,
    mapProgress: studentMapProgressData,
    plannerTasks,
    flashcards,
  },
};

// --- Write Output ---
const outDir = join(__dirname, "..", "data", "mock");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "learning-hub.json");
writeFileSync(outPath, JSON.stringify(output, null, 2));

const jsonSize = (JSON.stringify(output).length / 1024).toFixed(1);
console.log(`\n✅ Unified Learning Map data generated: ${outPath}`);
console.log(`   Students: ${students.length} (+${allUsers.length - students.length} staff)`);
console.log(`   Courses: ${courses.length}`);
console.log(`   Classes: ${classes.length}`);
console.log(`   Maps: ${maps.length} (${allHexes.length} hexes, ${allConnections.length} connections)`);
console.log(`   Standards: ${standards.length}`);
console.log(`   UBD Units: ${ubdUnits.length}`);
console.log(`   Progress records: ${allProgress.length}`);
console.log(`   Integrations: ${integrations.length}`);
console.log(`   Teaching methods: ${teachingMethods.length}`);
console.log(`   EAL strategies: ${ealStrategies.length}`);
console.log(`   Flashcards: ${flashcards.length}`);
console.log(`   Planner tasks: ${plannerTasks.length}`);
console.log(`   File size: ${jsonSize}KB\n`);
