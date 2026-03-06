/**
 * Generate mock data for the Science Team Dashboard (department-level Kanban)
 * Run: node scripts/generate-team-data.mjs
 */
import { faker } from "@faker-js/faker";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
faker.seed(42); // deterministic output

// --- Staff: 10 science teachers + 1 department head ---
const departments = ["Biology", "Chemistry", "Physics", "Earth Science", "General Science"];

const staff = [
  {
    id: "staff-001",
    email: "m.chen@school.edu",
    firstName: "Maria",
    lastName: "Chen",
    role: "admin",
    department: "Science Department",
    isActive: true,
  },
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `staff-${String(i + 2).padStart(3, "0")}`,
    email: faker.internet.email({ provider: "school.edu" }).toLowerCase(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: "teacher",
    department: faker.helpers.arrayElement(departments),
    isActive: true,
  })),
];

// --- Single board, 4 columns ---
const boardId = "board-team-001";

const columns = [
  { id: "col-t-01", boardId, title: "To Do", position: 0, color: "#94a3b8", wipLimit: 8 },
  { id: "col-t-02", boardId, title: "In Progress", position: 1, color: "#3b82f6", wipLimit: 5 },
  { id: "col-t-03", boardId, title: "Review", position: 2, color: "#f59e0b", wipLimit: 4 },
  { id: "col-t-04", boardId, title: "Done", position: 3, color: "#22c55e", wipLimit: 0 },
];

// --- Realistic science department task titles ---
const taskPool = [
  // Curriculum
  { title: "Update Year 10 Chemistry unit plan", type: "task", labels: ["curriculum", "chemistry"] },
  { title: "Align Biology assessments to new standards", type: "task", labels: ["curriculum", "biology", "assessment"] },
  { title: "Review IB Physics IA moderation samples", type: "task", labels: ["curriculum", "physics", "IB"] },
  { title: "Draft semester 2 practical schedule", type: "project", labels: ["planning", "labs"] },
  { title: "Create shared resource folder for Earth Science", type: "task", labels: ["resources", "earth-science"] },
  // Lab & Safety
  { title: "Complete chemical inventory audit", type: "deadline", labels: ["safety", "compliance"] },
  { title: "Order replacement microscope lenses", type: "task", labels: ["equipment", "biology"] },
  { title: "Update lab safety signage for Building C", type: "task", labels: ["safety"] },
  { title: "Book external lab tech for Year 12 practicals", type: "task", labels: ["labs", "booking"] },
  // Meetings & PD
  { title: "Prepare agenda for next department meeting", type: "action-item", labels: ["meetings"] },
  { title: "Share notes from Science PD conference", type: "action-item", labels: ["pd", "meetings"] },
  { title: "Organise peer observation schedule (Term 2)", type: "project", labels: ["pd", "observations"] },
  // Student Programs
  { title: "Plan Science Week activities", type: "project", labels: ["events", "student-engagement"] },
  { title: "Recruit mentors for STEM club", type: "task", labels: ["student-engagement", "stem"] },
  { title: "Submit field trip risk assessment — Botanic Gardens", type: "deadline", labels: ["excursions", "compliance"] },
  { title: "Coordinate guest speaker for Career Day", type: "task", labels: ["events"] },
  // Data & Reporting
  { title: "Compile semester 1 grade analysis report", type: "deadline", labels: ["data", "reporting"] },
  { title: "Review Year 9 standardised test results", type: "task", labels: ["data", "assessment"] },
];

// --- Generate cards distributed across columns ---
const columnWeights = [
  { colId: "col-t-01", count: 6 },
  { colId: "col-t-02", count: 4 },
  { colId: "col-t-03", count: 3 },
  { colId: "col-t-04", count: 5 },
];

const cards = [];
let cardIndex = 0;

for (const { colId, count } of columnWeights) {
  for (let i = 0; i < count; i++) {
    const task = taskPool[cardIndex % taskPool.length];
    const creator = faker.helpers.arrayElement(staff);
    const assignee = faker.helpers.arrayElement(staff.filter((s) => s.role === "teacher"));
    const createdAt = faker.date.recent({ days: 30 }).toISOString();
    const isDone = colId === "col-t-04";
    const dueDate = isDone
      ? faker.date.recent({ days: 5 }).toISOString().split("T")[0]
      : faker.helpers.maybe(() => faker.date.soon({ days: 21 }).toISOString().split("T")[0], {
          probability: 0.7,
        }) ?? null;

    cards.push({
      id: `card-t-${String(cardIndex + 1).padStart(3, "0")}`,
      columnId: colId,
      title: task.title,
      description: faker.lorem.sentence({ min: 8, max: 20 }),
      priority: faker.helpers.weightedArrayElement([
        { value: "low", weight: 3 },
        { value: "medium", weight: 5 },
        { value: "high", weight: 2 },
        { value: "critical", weight: 0.5 },
      ]),
      dueDate,
      createdBy: creator.id,
      createdAt,
      updatedAt: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
      position: i,
      assignee: assignee.id,
      cardType: task.type,
      labels: task.labels,
    });

    cardIndex++;
  }
}

// --- Output ---
const data = { staff, columns, cards };

const outPath = join(__dirname, "..", "data", "mock", "kanban-team.json");
writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`Wrote ${staff.length} staff, ${columns.length} columns, ${cards.length} cards to ${outPath}`);
