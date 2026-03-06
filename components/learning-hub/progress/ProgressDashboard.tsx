"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LearningHubData } from "@/lib/learning-hub-types";
import OverviewTab from "./OverviewTab";
import MapProgressTab from "./MapProgressTab";
import StudentProgressTab from "./StudentProgressTab";
import SBARPerformanceTab from "./SBARPerformanceTab";
import EngagementTab from "./EngagementTab";
import AssessmentsTab from "./AssessmentsTab";
import GroupsTab from "./GroupsTab";
import ReportsTab from "./ReportsTab";

const SUB_TABS = [
  { id: "overview", label: "Overview" },
  { id: "map-progress", label: "Map Progress" },
  { id: "student-progress", label: "Student Progress" },
  { id: "sbar", label: "KU/TT/C Performance" },
  { id: "engagement", label: "Engagement" },
  { id: "assessments", label: "Assessments" },
  { id: "groups", label: "Groups" },
  { id: "reports", label: "Reports" },
];

export interface ProgressDashboardProps {
  data: LearningHubData;
}

export default function ProgressDashboard({ data }: ProgressDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState("overview");

  const handleSubTabChange = useCallback((tabId: string) => {
    setActiveSubTab(tabId);
  }, []);

  const pd = data.progressDashboard;

  const renderSubTab = () => {
    switch (activeSubTab) {
      case "overview":
        return (
          <OverviewTab
            overview={pd.overview}
            mapProgress={pd.mapProgress}
            studentProgress={pd.studentProgress}
          />
        );
      case "map-progress":
        return <MapProgressTab mapProgress={pd.mapProgress} />;
      case "student-progress":
        return <StudentProgressTab studentProgress={pd.studentProgress} />;
      case "sbar":
        return <SBARPerformanceTab sbarData={pd.sbarData} />;
      case "engagement":
        return <EngagementTab engagement={pd.engagement} />;
      case "assessments":
        return <AssessmentsTab assessments={pd.assessments} />;
      case "groups":
        return <GroupsTab groups={pd.groups} />;
      case "reports":
        return <ReportsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab navigation */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-dark-border bg-dark-surface p-1.5">
        {SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSubTabChange(tab.id)}
              className={`rounded-md px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.1em] transition-colors ${
                isActive
                  ? "bg-[#00f0ff]/15 text-[#00f0ff]"
                  : "text-text-muted hover:text-text-secondary hover:bg-dark-elevated"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {renderSubTab()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
