"use client";

import { useState } from "react";
import type { KanbanBoard, StaffMember } from "@/lib/kanban-types";

interface KanbanToolbarProps {
  scope: "team" | "admin";
  boards?: KanbanBoard[];
  currentBoardId?: string;
  onBoardChange?: (boardId: string) => void;
  staff: StaffMember[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  totalCards: number;
  filteredCards: number;
}

export interface FilterState {
  search: string;
  priority: string;
  assignee: string;
  category: string;
}

export const defaultFilters: FilterState = {
  search: "",
  priority: "",
  assignee: "",
  category: "",
};

export default function KanbanToolbar({
  scope,
  boards,
  currentBoardId,
  onBoardChange,
  staff,
  filters,
  onFilterChange,
  totalCards,
  filteredCards,
}: KanbanToolbarProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const hasActiveFilters = filters.search || filters.priority || filters.assignee || filters.category;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Board selector (admin only) */}
      {scope === "admin" && boards && boards.length > 1 && (
        <select
          value={currentBoardId}
          onChange={(e) => onBoardChange?.(e.target.value)}
          className="rounded-lg border border-dark-border bg-dark-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-[#8b5cf680]"
        >
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.title}
            </option>
          ))}
        </select>
      )}

      {/* Search */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
        >
          <circle cx="7" cy="7" r="5" stroke="#5a5a7a" strokeWidth="1.3" />
          <path d="M11 11l3.5 3.5" stroke="#5a5a7a" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search cards..."
          className={`w-44 rounded-lg border bg-dark-surface py-1.5 pl-8 pr-3 text-sm text-text-primary outline-none transition-all placeholder:text-text-muted ${
            searchFocused ? "border-[var(--color-accent-dim)] w-56" : "border-dark-border"
          }`}
        />
        {filters.search && (
          <button
            onClick={() => onFilterChange({ ...filters, search: "" })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 3l6 6M9 3L3 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Priority filter */}
      <select
        value={filters.priority}
        onChange={(e) => onFilterChange({ ...filters, priority: e.target.value })}
        className="rounded-lg border border-dark-border bg-dark-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-[var(--color-accent-dim)]"
      >
        <option value="">All Priorities</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      {/* Category filter (admin only) */}
      {scope === "admin" && (
        <select
          value={filters.category}
          onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
          className="rounded-lg border border-dark-border bg-dark-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-[var(--color-accent-dim)]"
        >
          <option value="">All Categories</option>
          <option value="project">Project</option>
          <option value="area">Area</option>
          <option value="resource">Resource</option>
          <option value="archive">Archive</option>
        </select>
      )}

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={() => onFilterChange(defaultFilters)}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-dark-surface hover:text-text-secondary"
        >
          Clear filters
        </button>
      )}

      {/* Card count */}
      <span className="ml-auto text-[11px] text-text-muted">
        {filteredCards === totalCards
          ? `${totalCards} cards`
          : `${filteredCards} of ${totalCards} cards`}
      </span>
    </div>
  );
}
