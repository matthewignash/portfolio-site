"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";

import type {
  TeamKanbanData,
  AdminKanbanData,
  KanbanColumn as ColumnType,
  TeamCard,
  AdminCard,
  StaffMember,
} from "@/lib/kanban-types";

import ScopeToggle from "./ScopeToggle";
import KanbanColumn from "./KanbanColumn";
import KanbanToolbar, { type FilterState, defaultFilters } from "./KanbanToolbar";
import KanbanCardModal from "./KanbanCardModal";
import KanbanAnalytics from "./KanbanAnalytics";
import { TeamKanbanCard, AdminKanbanCard } from "./KanbanCard";

interface KanbanBoardProps {
  teamData: TeamKanbanData;
  adminData: AdminKanbanData;
}

type AnyCard = TeamCard | AdminCard;

export default function KanbanBoard({ teamData, adminData }: KanbanBoardProps) {
  const [scope, setScope] = useState<"team" | "admin">("team");
  const [activeTab, setActiveTab] = useState<"board" | "analytics">("board");
  const [currentBoardId, setCurrentBoardId] = useState(adminData.boards[0]?.id ?? "");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

  // Card state (mutable for drag-and-drop)
  const [teamCards, setTeamCards] = useState<TeamCard[]>(teamData.cards);
  const [adminCards, setAdminCards] = useState<AdminCard[]>(adminData.cards);

  // Current data based on scope
  const staff: StaffMember[] = scope === "team" ? teamData.staff : adminData.staff;
  const columns: ColumnType[] = useMemo(() => {
    if (scope === "team") return teamData.columns;
    return adminData.columns.filter((c) => c.boardId === currentBoardId);
  }, [scope, teamData.columns, adminData.columns, currentBoardId]);

  const allCards: AnyCard[] = useMemo(() => {
    if (scope === "team") return teamCards;
    return adminCards.filter((c) => c.boardId === currentBoardId);
  }, [scope, teamCards, adminCards, currentBoardId]);

  // Filtered cards
  const filteredCards: AnyCard[] = useMemo(() => {
    return allCards.filter((card) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!card.title.toLowerCase().includes(q) && !card.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filters.priority && card.priority !== filters.priority) return false;
      if (scope === "admin" && filters.category) {
        if ((card as AdminCard).category !== filters.category) return false;
      }
      return true;
    });
  }, [allCards, filters, scope]);

  // Cards grouped by column
  const cardsByColumn = useMemo(() => {
    const map = new Map<string, AnyCard[]>();
    for (const col of columns) {
      map.set(
        col.id,
        filteredCards
          .filter((c) => c.columnId === col.id)
          .sort((a, b) => a.position - b.position)
      );
    }
    return map;
  }, [columns, filteredCards]);

  // Drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDragActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Determine target column
      let targetColumnId: string;
      if (columns.some((c) => c.id === overId)) {
        targetColumnId = overId;
      } else {
        // Dropped on another card — find its column
        const overCard = allCards.find((c) => c.id === overId);
        if (!overCard) return;
        targetColumnId = overCard.columnId;
      }

      if (scope === "team") {
        setTeamCards((prev) => {
          const updated = prev.map((c) =>
            c.id === activeId ? { ...c, columnId: targetColumnId } : c
          );
          return updated;
        });
      } else {
        setAdminCards((prev) => {
          const updated = prev.map((c) =>
            c.id === activeId ? { ...c, columnId: targetColumnId } : c
          );
          return updated;
        });
      }
    },
    [scope, columns, allCards]
  );

  // Selected card for modal
  const selectedCard = useMemo(() => {
    if (!selectedCardId || scope !== "admin") return null;
    return adminCards.find((c) => c.id === selectedCardId) ?? null;
  }, [selectedCardId, scope, adminCards]);

  const selectedCardColumn = useMemo(() => {
    if (!selectedCard) return "";
    return columns.find((c) => c.id === selectedCard.columnId)?.title ?? "";
  }, [selectedCard, columns]);

  // Drag overlay card
  const dragCard = useMemo(() => {
    if (!dragActiveId) return null;
    return allCards.find((c) => c.id === dragActiveId) ?? null;
  }, [dragActiveId, allCards]);

  // Analytics
  const currentAnalytics = scope === "admin" ? adminData.analytics[currentBoardId] : null;

  return (
    <div className="space-y-5">
      {/* Header row: scope toggle + tab switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ScopeToggle scope={scope} onToggle={setScope} />

        {scope === "admin" && (
          <div className="flex rounded-lg border border-dark-border bg-dark-void p-0.5">
            <button
              onClick={() => setActiveTab("board")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === "board"
                  ? "bg-dark-surface text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === "analytics"
                  ? "bg-dark-surface text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Analytics
            </button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <KanbanToolbar
        scope={scope}
        boards={scope === "admin" ? adminData.boards : undefined}
        currentBoardId={scope === "admin" ? currentBoardId : undefined}
        onBoardChange={setCurrentBoardId}
        staff={staff}
        filters={filters}
        onFilterChange={setFilters}
        totalCards={allCards.length}
        filteredCards={filteredCards.length}
      />

      {/* Board or Analytics view */}
      <AnimatePresence mode="wait">
        {activeTab === "board" || scope === "team" ? (
          <motion.div
            key={`board-${scope}-${currentBoardId}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 overflow-x-auto pb-4">
                {columns.map((col) => (
                  <KanbanColumn
                    key={col.id}
                    column={col}
                    cards={cardsByColumn.get(col.id) ?? []}
                    staff={staff}
                    scope={scope}
                    onCardClick={scope === "admin" ? setSelectedCardId : undefined}
                  />
                ))}
              </div>

              <DragOverlay>
                {dragCard && (
                  <div className="rotate-2 opacity-90">
                    {scope === "team" ? (
                      <TeamKanbanCard card={dragCard as TeamCard} staff={staff} />
                    ) : (
                      <AdminKanbanCard card={dragCard as AdminCard} staff={staff} />
                    )}
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </motion.div>
        ) : (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {currentAnalytics && <KanbanAnalytics analytics={currentAnalytics} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card detail modal (admin only) */}
      {selectedCard && (
        <KanbanCardModal
          card={selectedCard}
          staff={adminData.staff}
          columnTitle={selectedCardColumn}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </div>
  );
}
