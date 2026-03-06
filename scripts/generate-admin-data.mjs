/**
 * Generate mock data for the Administrator Dashboard (school-wide Kanban)
 * Run: node scripts/generate-admin-data.mjs
 */
import { faker } from "@faker-js/faker";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
faker.seed(99); // deterministic, different seed from team data

// ============================================
// STAFF — 25 members across roles
// ============================================
const departmentPool = [
  "Science", "Mathematics", "English", "Humanities", "Arts",
  "Languages", "PE & Health", "Technology", "Student Services", "Administration",
];

const staff = [
  // 3 admins
  ...["Sarah", "James", "Priya"].map((first, i) => ({
    id: `staff-a-${String(i + 1).padStart(3, "0")}`,
    email: `${first.toLowerCase()}.${faker.person.lastName().toLowerCase()}@school.edu`,
    firstName: first,
    lastName: faker.person.lastName(),
    role: "admin",
    department: "Administration",
    isActive: true,
  })),
  // 18 teachers
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `staff-a-${String(i + 4).padStart(3, "0")}`,
    email: faker.internet.email({ provider: "school.edu" }).toLowerCase(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: "teacher",
    department: faker.helpers.arrayElement(departmentPool),
    isActive: true,
  })),
  // 2 support staff
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `staff-a-${String(i + 22).padStart(3, "0")}`,
    email: faker.internet.email({ provider: "school.edu" }).toLowerCase(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: "support",
    department: faker.helpers.arrayElement(["Student Services", "Administration"]),
    isActive: true,
  })),
  // 2 specialists
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `staff-a-${String(i + 24).padStart(3, "0")}`,
    email: faker.internet.email({ provider: "school.edu" }).toLowerCase(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: "specialist",
    department: faker.helpers.arrayElement(["Student Services", "Technology"]),
    isActive: true,
  })),
];

const admins = staff.filter((s) => s.role === "admin");
const teachers = staff.filter((s) => s.role === "teacher");

// ============================================
// BOARDS — 3 boards with different purposes
// ============================================
const boards = [
  {
    id: "board-a-001",
    title: "Strategic Plan 2026",
    description: "School-wide strategic initiatives and improvement goals for the 2026 academic year",
    createdBy: admins[0].id,
    createdAt: faker.date.past({ years: 0.5 }).toISOString(),
    isArchived: false,
  },
  {
    id: "board-a-002",
    title: "Operations & Compliance",
    description: "Day-to-day operational tasks, policy updates, and regulatory compliance tracking",
    createdBy: admins[1].id,
    createdAt: faker.date.past({ years: 0.3 }).toISOString(),
    isArchived: false,
  },
  {
    id: "board-a-003",
    title: "Accreditation Preparation",
    description: "Tasks and evidence gathering for the upcoming NEASC accreditation visit",
    createdBy: admins[0].id,
    createdAt: faker.date.past({ years: 0.4 }).toISOString(),
    isArchived: false,
  },
];

// ============================================
// COLUMNS — per board
// ============================================
const columnDefs = {
  "board-a-001": [
    { title: "Backlog", color: "#94a3b8", wipLimit: 12 },
    { title: "This Quarter", color: "#8b5cf6", wipLimit: 8 },
    { title: "In Progress", color: "#3b82f6", wipLimit: 5 },
    { title: "Under Review", color: "#f59e0b", wipLimit: 4 },
    { title: "Completed", color: "#22c55e", wipLimit: 0 },
  ],
  "board-a-002": [
    { title: "To Do", color: "#94a3b8", wipLimit: 10 },
    { title: "In Progress", color: "#3b82f6", wipLimit: 6 },
    { title: "Awaiting Approval", color: "#f59e0b", wipLimit: 4 },
    { title: "Done", color: "#22c55e", wipLimit: 0 },
  ],
  "board-a-003": [
    { title: "Evidence Needed", color: "#ef4444", wipLimit: 15 },
    { title: "Gathering", color: "#f59e0b", wipLimit: 8 },
    { title: "Drafting Narrative", color: "#3b82f6", wipLimit: 5 },
    { title: "Submitted", color: "#22c55e", wipLimit: 0 },
  ],
};

let colIdx = 0;
const columns = [];
for (const [boardId, defs] of Object.entries(columnDefs)) {
  defs.forEach((def, pos) => {
    columns.push({
      id: `col-a-${String(++colIdx).padStart(3, "0")}`,
      boardId,
      title: def.title,
      position: pos,
      color: def.color,
      wipLimit: def.wipLimit,
    });
  });
}

// ============================================
// CARD CONTENT POOLS — realistic admin tasks
// ============================================

const strategicTasks = [
  { title: "Define Year 7-9 literacy improvement benchmarks", category: "project", labels: ["literacy", "data", "strategic"] },
  { title: "Launch staff wellbeing pulse survey", category: "area", labels: ["wellbeing", "staff", "survey"] },
  { title: "Develop STEM pathways proposal for Board", category: "project", labels: ["stem", "curriculum", "board"] },
  { title: "Coordinate Indigenous perspectives audit across departments", category: "project", labels: ["inclusion", "curriculum", "audit"] },
  { title: "Implement new parent communication platform", category: "project", labels: ["communication", "technology", "parents"] },
  { title: "Review and update behaviour management policy", category: "area", labels: ["policy", "student-welfare"] },
  { title: "Establish peer coaching triads for semester 2", category: "area", labels: ["pd", "coaching", "staff"] },
  { title: "Create data dashboard for academic performance tracking", category: "resource", labels: ["data", "technology", "reporting"] },
  { title: "Plan leadership retreat — Term 2 Week 5", category: "project", labels: ["leadership", "planning"] },
  { title: "Develop graduate profile aligned to school vision", category: "project", labels: ["strategic", "curriculum", "vision"] },
  { title: "Pilot flexible learning spaces in Building D", category: "project", labels: ["facilities", "innovation"] },
  { title: "Draft community engagement strategy", category: "area", labels: ["community", "strategic", "engagement"] },
];

const operationsTasks = [
  { title: "Update emergency evacuation procedures", category: "area", labels: ["safety", "compliance"] },
  { title: "Process teacher registration renewals (Term 2)", category: "area", labels: ["compliance", "hr"] },
  { title: "Coordinate bus route changes for field trip season", category: "resource", labels: ["logistics", "transport"] },
  { title: "Submit OHS audit report to regional office", category: "archive", labels: ["compliance", "safety", "reporting"] },
  { title: "Review contractor access policies", category: "area", labels: ["security", "policy"] },
  { title: "Schedule building maintenance — Easter break", category: "resource", labels: ["facilities", "maintenance"] },
  { title: "Update staff handbook for 2026 changes", category: "resource", labels: ["hr", "documentation"] },
  { title: "Renew software licenses (Adobe, Microsoft)", category: "resource", labels: ["technology", "budget"] },
  { title: "Plan Year 12 formal logistics", category: "project", labels: ["events", "student-engagement"] },
  { title: "Finalise budget allocation for Term 3", category: "area", labels: ["budget", "finance"] },
];

const accreditationTasks = [
  { title: "Collect student survey data on learning environment", category: "project", labels: ["evidence", "students", "survey"] },
  { title: "Document curriculum mapping across Standards 1-3", category: "project", labels: ["evidence", "curriculum", "standards"] },
  { title: "Compile professional development records (3 years)", category: "resource", labels: ["evidence", "pd"] },
  { title: "Write self-study narrative: Teaching & Learning", category: "project", labels: ["narrative", "teaching"] },
  { title: "Gather parent satisfaction survey results", category: "resource", labels: ["evidence", "parents", "survey"] },
  { title: "Photograph learning spaces for evidence portfolio", category: "resource", labels: ["evidence", "facilities"] },
  { title: "Write self-study narrative: Governance & Leadership", category: "project", labels: ["narrative", "leadership"] },
  { title: "Organise visiting committee schedule", category: "area", labels: ["logistics", "committee"] },
  { title: "Prepare student work samples per standard", category: "resource", labels: ["evidence", "students"] },
  { title: "Finalize self-study document for submission", category: "project", labels: ["narrative", "submission"] },
];

const taskPools = {
  "board-a-001": strategicTasks,
  "board-a-002": operationsTasks,
  "board-a-003": accreditationTasks,
};

// Card distribution per board per column
const distributions = {
  "board-a-001": [3, 3, 2, 2, 2], // 12 cards
  "board-a-002": [3, 3, 2, 2],     // 10 cards
  "board-a-003": [3, 2, 2, 3],     // 10 cards
};

// ============================================
// HELPERS
// ============================================

function pickStaff(count) {
  const shuffled = faker.helpers.shuffle([...staff]);
  return shuffled.slice(0, count).map((s) => s.id);
}

function generateChecklist(cardTitle) {
  const count = faker.number.int({ min: 2, max: 6 });
  return Array.from({ length: count }, (_, i) => ({
    id: faker.string.uuid().slice(0, 8),
    text: faker.helpers.arrayElement([
      `Draft initial ${faker.word.adjective()} outline`,
      `Consult with ${faker.person.firstName()} about requirements`,
      `Review existing documentation`,
      `Schedule meeting with stakeholders`,
      `Collect data from ${faker.helpers.arrayElement(departmentPool)}`,
      `Update spreadsheet with latest figures`,
      `Send progress update to leadership team`,
      `Get sign-off from department head`,
      `Prepare presentation slides`,
      `Submit final version for review`,
      `Follow up on outstanding items`,
      `Archive completed materials`,
    ]),
    isChecked: faker.datatype.boolean({ probability: 0.4 }),
    sortOrder: i,
  }));
}

function generateComments(cardId, cardCreatedAt) {
  const count = faker.number.int({ min: 0, max: 4 });
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid().slice(0, 8),
    authorId: faker.helpers.arrayElement(staff).id,
    content: faker.helpers.arrayElement([
      "Updated the timeline for this — should be feasible by end of term.",
      "Spoke with the department heads, they're on board with this approach.",
      "Can we get an update on progress here? Board meeting is next week.",
      "I've shared the relevant documents in the shared drive.",
      "This is blocked until we get the budget approval. Following up.",
      "Great progress on this. Let's review at our next leadership meeting.",
      "I've assigned two more staff to help with the data collection.",
      "The draft is ready for review — please check the shared folder.",
      "Pushed the deadline back by one week due to competing priorities.",
      "Completed my section. Ready for the next person to take over.",
    ]),
    createdAt: faker.date.between({ from: cardCreatedAt, to: new Date() }).toISOString(),
  }));
}

function generateActivity(cardId, cardCreatedAt, columnId, boardId) {
  const entries = [
    {
      id: faker.string.uuid().slice(0, 8),
      userId: faker.helpers.arrayElement(admins).id,
      actionType: "card_created",
      createdAt: cardCreatedAt,
    },
  ];

  // Maybe add a move
  if (faker.datatype.boolean({ probability: 0.6 })) {
    const boardCols = columns.filter((c) => c.boardId === boardId);
    const currentColIndex = boardCols.findIndex((c) => c.id === columnId);
    if (currentColIndex > 0) {
      entries.push({
        id: faker.string.uuid().slice(0, 8),
        userId: faker.helpers.arrayElement(admins).id,
        actionType: "card_moved",
        oldValue: boardCols[currentColIndex - 1].title,
        newValue: boardCols[currentColIndex].title,
        createdAt: faker.date.between({ from: cardCreatedAt, to: new Date() }).toISOString(),
      });
    }
  }

  // Maybe add an update
  if (faker.datatype.boolean({ probability: 0.4 })) {
    entries.push({
      id: faker.string.uuid().slice(0, 8),
      userId: faker.helpers.arrayElement(staff).id,
      actionType: "card_updated",
      fieldName: faker.helpers.arrayElement(["priority", "due_date", "description", "assignees"]),
      createdAt: faker.date.between({ from: cardCreatedAt, to: new Date() }).toISOString(),
    });
  }

  return entries;
}

// ============================================
// GENERATE CARDS
// ============================================
const cards = [];
let globalCardIdx = 0;

for (const board of boards) {
  const boardColumns = columns.filter((c) => c.boardId === board.id);
  const dist = distributions[board.id];
  const pool = taskPools[board.id];
  let poolIdx = 0;

  boardColumns.forEach((col, colIndex) => {
    const count = dist[colIndex];
    for (let i = 0; i < count; i++) {
      const task = pool[poolIdx % pool.length];
      const createdAt = faker.date.recent({ days: 45 }).toISOString();
      const isCompleted = col.title === "Completed" || col.title === "Done" || col.title === "Submitted";
      const dueDate = isCompleted
        ? faker.date.recent({ days: 7 }).toISOString().split("T")[0]
        : faker.helpers.maybe(() => faker.date.soon({ days: 30 }).toISOString().split("T")[0], {
            probability: 0.75,
          }) ?? null;

      const cardId = `card-a-${String(++globalCardIdx).padStart(3, "0")}`;

      cards.push({
        id: cardId,
        boardId: board.id,
        columnId: col.id,
        title: task.title,
        description: faker.lorem.sentences({ min: 1, max: 3 }),
        priority: faker.helpers.weightedArrayElement([
          { value: "low", weight: 2 },
          { value: "medium", weight: 4 },
          { value: "high", weight: 3 },
          { value: "critical", weight: 1 },
        ]),
        dueDate,
        createdBy: faker.helpers.arrayElement(admins).id,
        createdAt,
        updatedAt: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
        position: i,
        assignedTo: pickStaff(faker.number.int({ min: 1, max: 3 })),
        labels: task.labels,
        category: task.category,
        keyTakeaway: faker.helpers.arrayElement([
          "Key priority for Board reporting this quarter",
          "Directly supports Strategic Goal #2: Student Outcomes",
          "Required for compliance — non-negotiable deadline",
          "Staff engagement initiative — high visibility",
          "Data-driven decision making in action",
          "Cross-departmental collaboration needed",
          "Quick win with high impact on school culture",
          "Links to accreditation Standard 4",
          "Budget implications need CFO sign-off",
          "Parent community will see this outcome directly",
        ]),
        checklists: generateChecklist(task.title),
        comments: generateComments(cardId, createdAt),
        activity: generateActivity(cardId, createdAt, col.id, board.id),
      });

      poolIdx++;
    }
  });
}

// ============================================
// COMPUTE ANALYTICS per board
// ============================================
const analytics = {};

for (const board of boards) {
  const boardCards = cards.filter((c) => c.boardId === board.id);
  const boardCols = columns.filter((c) => c.boardId === board.id);
  const lastCol = boardCols[boardCols.length - 1];
  const completedCards = boardCards.filter((c) => c.columnId === lastCol.id);
  const now = new Date();

  const overdueCards = boardCards.filter((c) => {
    if (!c.dueDate || c.columnId === lastCol.id) return false;
    return new Date(c.dueDate) < now;
  });

  // Avg cycle time: random realistic value per board
  const avgCycleTime = faker.number.float({ min: 5, max: 18, fractionDigits: 1 });

  analytics[board.id] = {
    totalCards: boardCards.length,
    completedCards: completedCards.length,
    overdueCount: overdueCards.length,
    avgCycleTimeDays: avgCycleTime,
    cardsByColumn: boardCols.map((col) => ({
      columnId: col.id,
      columnTitle: col.title,
      count: boardCards.filter((c) => c.columnId === col.id).length,
    })),
    cardsByPriority: ["low", "medium", "high", "critical"].map((p) => ({
      priority: p,
      count: boardCards.filter((c) => c.priority === p).length,
    })),
    cardsByCategory: ["project", "area", "resource", "archive"].map((cat) => ({
      category: cat,
      count: boardCards.filter((c) => c.category === cat).length,
    })),
    agingReport: boardCards
      .filter((c) => c.columnId !== lastCol.id)
      .map((c) => {
        const ageDays = Math.floor((now.getTime() - new Date(c.createdAt).getTime()) / 86400000);
        return {
          cardId: c.id,
          title: c.title,
          column: boardCols.find((col) => col.id === c.columnId)?.title ?? "",
          priority: c.priority,
          ageDays,
          dueDate: c.dueDate,
          isOverdue: c.dueDate ? new Date(c.dueDate) < now : false,
        };
      })
      .sort((a, b) => b.ageDays - a.ageDays),
  };
}

// ============================================
// OUTPUT
// ============================================
const data = { staff, boards, columns, cards, analytics };

const outPath = join(__dirname, "..", "data", "mock", "kanban-admin.json");
writeFileSync(outPath, JSON.stringify(data, null, 2));

console.log(`Admin data generated:`);
console.log(`  ${staff.length} staff members (${admins.length} admins, ${teachers.length} teachers, 4 support/specialist)`);
console.log(`  ${boards.length} boards`);
console.log(`  ${columns.length} columns`);
console.log(`  ${cards.length} cards`);
console.log(`  ${Object.keys(analytics).length} analytics summaries`);
console.log(`Written to ${outPath}`);
