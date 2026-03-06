"use client";

import { motion } from "framer-motion";

const TEACHER_TABS = [
  { id: "my-maps", label: "My Maps" },
  { id: "map-builder", label: "Map Builder" },
  { id: "courses", label: "Courses" },
  { id: "classes", label: "Classes" },
  { id: "users", label: "Users" },
  { id: "standards", label: "Standards" },
  { id: "ubd-planner", label: "UBD Planner" },
  { id: "progress", label: "Progress" },
  { id: "settings", label: "Settings" },
  { id: "integrations", label: "Integrations" },
  { id: "collab", label: "Collab" },
  { id: "teaching-methods", label: "Teaching Methods" },
  { id: "eal-strategies", label: "EAL Strategies" },
];

const STUDENT_TABS = [
  { id: "my-maps", label: "My Maps" },
  { id: "map-view", label: "Map View" },
  { id: "progress", label: "Progress" },
  { id: "my-planner", label: "My Planner" },
  { id: "study", label: "Study" },
];

export interface TabNavigationProps {
  role: "teacher" | "student";
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onRoleToggle: () => void;
}

export default function TabNavigation({
  role,
  activeTab,
  onTabChange,
  onRoleToggle,
}: TabNavigationProps) {
  const tabs = role === "teacher" ? TEACHER_TABS : STUDENT_TABS;

  return (
    <div className="flex items-center gap-2">
      {/* Scrollable tabs */}
      <div className="flex-1 overflow-x-auto scrollbar-hide">
        <div className="flex gap-0.5 pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-[10px] font-mono uppercase tracking-[0.15em] transition-colors ${
                  isActive
                    ? "text-[#00f0ff]"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full bg-[#00f0ff]"
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Role toggle */}
      <button
        onClick={onRoleToggle}
        className="shrink-0 rounded-md border border-dark-border bg-dark-surface px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider text-text-muted hover:border-[#00f0ff]/30 hover:text-text-secondary transition-colors"
      >
        {role === "teacher" ? "Student View" : "Teacher View"}
      </button>
    </div>
  );
}
