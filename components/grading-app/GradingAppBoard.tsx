"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GradingAppData } from "@/lib/grading-types";
import GradingViewToggle, { type GradingView } from "./GradingViewToggle";
import TeacherDashboard from "./TeacherDashboard";
import GradingPanel from "./GradingPanel";
import StudentResults from "./StudentResults";

interface GradingAppBoardProps {
  data: GradingAppData;
}

export default function GradingAppBoard({ data }: GradingAppBoardProps) {
  const [view, setView] = useState<GradingView>("dashboard");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <GradingViewToggle view={view} onToggle={setView} />
        <span className="text-xs text-text-muted">
          {data.teacherDashboard.exam.name}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {view === "dashboard" && (
            <TeacherDashboard data={data.teacherDashboard} />
          )}
          {view === "grading" && (
            <GradingPanel data={data.gradingPanel} />
          )}
          {view === "student" && (
            <StudentResults data={data.studentView} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
