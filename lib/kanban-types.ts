// ============================================
// Kanban Data Types — Shared across Team & Admin
// ============================================

// --- Staff ---
export interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "teacher" | "support" | "specialist";
  department: string;
  isActive: boolean;
}

// --- Board (Admin only — Team has a single implicit board) ---
export interface KanbanBoard {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  isArchived: boolean;
}

// --- Column ---
export interface KanbanColumn {
  id: string;
  boardId: string;
  title: string;
  position: number;
  color: string;
  wipLimit: number;
}

// --- Card (base fields shared by Team & Admin) ---
export interface KanbanCardBase {
  id: string;
  columnId: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  position: number;
}

// Team-level card (simpler)
export interface TeamCard extends KanbanCardBase {
  assignee: string; // single staff ID
  cardType: "project" | "task" | "action-item" | "deadline";
  labels: string[];
}

// Admin-level card (full features)
export interface AdminCard extends KanbanCardBase {
  boardId: string;
  assignedTo: string[]; // multiple staff IDs
  labels: string[];
  category: "project" | "area" | "resource" | "archive"; // PARA method
  keyTakeaway: string;
  checklists: ChecklistItem[];
  comments: CardComment[];
  activity: ActivityEntry[];
}

// --- Checklist (Admin only) ---
export interface ChecklistItem {
  id: string;
  text: string;
  isChecked: boolean;
  sortOrder: number;
}

// --- Comment (Admin only) ---
export interface CardComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

// --- Activity Log (Admin only) ---
export interface ActivityEntry {
  id: string;
  userId: string;
  actionType:
    | "card_created"
    | "card_moved"
    | "card_updated"
    | "comment_added"
    | "checklist_added"
    | "checklist_toggled";
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

// --- Analytics (Admin only) ---
export interface KanbanAnalytics {
  totalCards: number;
  completedCards: number;
  overdueCount: number;
  avgCycleTimeDays: number;
  cardsByColumn: { columnId: string; columnTitle: string; count: number }[];
  cardsByPriority: { priority: string; count: number }[];
  cardsByCategory: { category: string; count: number }[];
  agingReport: {
    cardId: string;
    title: string;
    column: string;
    priority: string;
    ageDays: number;
    dueDate: string | null;
    isOverdue: boolean;
  }[];
}

// --- Full data shapes for JSON files ---
export interface TeamKanbanData {
  staff: StaffMember[];
  columns: KanbanColumn[];
  cards: TeamCard[];
}

export interface AdminKanbanData {
  staff: StaffMember[];
  boards: KanbanBoard[];
  columns: KanbanColumn[];
  cards: AdminCard[];
  analytics: Record<string, KanbanAnalytics>;
}
