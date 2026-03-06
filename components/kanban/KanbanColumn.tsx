"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { KanbanColumn as ColumnType, StaffMember, TeamCard, AdminCard } from "@/lib/kanban-types";
import { TeamKanbanCard, AdminKanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  column: ColumnType;
  cards: (TeamCard | AdminCard)[];
  staff: StaffMember[];
  scope: "team" | "admin";
  onCardClick?: (cardId: string) => void;
}

export default function KanbanColumn({
  column,
  cards,
  staff,
  scope,
  onCardClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const isOverWip = column.wipLimit > 0 && cards.length >= column.wipLimit;

  return (
    <div className="flex w-[300px] shrink-0 flex-col rounded-xl bg-dark-void/50">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="text-sm font-semibold text-text-primary">{column.title}</h3>
        </div>

        <span
          className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${
            isOverWip
              ? "bg-red-500/15 text-red-400"
              : "bg-dark-elevated text-text-muted"
          }`}
        >
          {cards.length}
          {column.wipLimit > 0 && `/${column.wipLimit}`}
        </span>
      </div>

      {/* Cards container */}
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3 transition-colors ${
            isOver ? "bg-[var(--color-accent-glow)] rounded-lg" : ""
          }`}
        >
          {cards.map((card) =>
            scope === "team" ? (
              <TeamKanbanCard
                key={card.id}
                card={card as TeamCard}
                staff={staff}
                onClick={() => onCardClick?.(card.id)}
              />
            ) : (
              <AdminKanbanCard
                key={card.id}
                card={card as AdminCard}
                staff={staff}
                onClick={() => onCardClick?.(card.id)}
              />
            )
          )}

          {cards.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-dark-border py-8 text-[11px] text-text-muted">
              No cards
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
