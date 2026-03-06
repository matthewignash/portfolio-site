"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LearningHubData } from "@/lib/learning-hub-types";
import TabNavigation from "./TabNavigation";
// Phase A: Hex Engine + Map Builder
import MapBuilderView from "./map-builder/MapBuilderView";
// Phase B: Student Map + My Maps
import StudentMapView from "./student-map/StudentMapView";
import MyMapsGrid from "./my-maps/MyMapsGrid";
// Phase C: Data Management
import CoursesTab from "./data-management/CoursesTab";
import ClassesTab from "./data-management/ClassesTab";
import UsersTab from "./data-management/UsersTab";
// Phase D: Curriculum
import StandardsLibrary from "./curriculum/StandardsLibrary";
import UBDPlanner from "./curriculum/UBDPlanner";
// Phase E: Progress Dashboard
import ProgressDashboard from "./progress/ProgressDashboard";
// Phase F: Support tabs
import SettingsTab from "./support/SettingsTab";
import IntegrationsTab from "./support/IntegrationsTab";
import CollabTab from "./support/CollabTab";
import TeachingMethodsTab from "./support/TeachingMethodsTab";
import EALStrategiesTab from "./support/EALStrategiesTab";
// Phase F: Student tabs
import MyPlannerTab from "./student/MyPlannerTab";
import StudyTab from "./student/StudyTab";

interface LearningHubBoardProps {
  data: LearningHubData;
}

export default function LearningHubBoard({ data }: LearningHubBoardProps) {
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [activeTab, setActiveTab] = useState("map-builder");
  const [selectedMapId, setSelectedMapId] = useState(data.mapBuilder.selectedMapId);

  const handleRoleToggle = useCallback(() => {
    setRole((prev) => {
      const next = prev === "teacher" ? "student" : "teacher";
      setActiveTab("my-maps");
      return next;
    });
  }, []);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  // Navigate to Map Builder with a specific map
  const handleOpenMapInBuilder = useCallback((mapId: string) => {
    setSelectedMapId(mapId);
    setActiveTab("map-builder");
  }, []);

  // Navigate to Student Map View with a specific map
  const handleOpenStudentMap = useCallback((mapId: string) => {
    setSelectedMapId(mapId);
    setActiveTab("map-view");
  }, []);

  // Get hexes and connections for the selected map
  const selectedMapHexes = useMemo(
    () => data.hexes.filter((h) => h.mapId === selectedMapId),
    [data.hexes, selectedMapId]
  );
  const selectedMapConnections = useMemo(
    () => data.connections.filter((c) => c.mapId === selectedMapId),
    [data.connections, selectedMapId]
  );
  const selectedMap = useMemo(
    () => data.maps.find((m) => m.id === selectedMapId),
    [data.maps, selectedMapId]
  );

  // Get progress records for the selected map
  const selectedMapProgress = useMemo(
    () => data.progress.filter((p) => p.mapId === selectedMapId),
    [data.progress, selectedMapId]
  );

  const renderTab = () => {
    // ===== TEACHER TABS (13) =====
    if (role === "teacher") {
      switch (activeTab) {
        case "my-maps":
          return (
            <MyMapsGrid
              maps={data.myMaps}
              courses={data.courses}
              role="teacher"
              onOpenMap={handleOpenMapInBuilder}
            />
          );
        case "map-builder":
          return selectedMap ? (
            <MapBuilderView
              key={selectedMapId}
              map={selectedMap}
              hexes={selectedMapHexes}
              connections={selectedMapConnections}
            />
          ) : null;
        case "courses":
          return (
            <CoursesTab
              courses={data.courses}
              maps={data.maps}
              ubdUnits={data.ubdUnits}
            />
          );
        case "classes":
          return (
            <ClassesTab
              classes={data.classes}
              courses={data.courses}
              students={data.students}
              maps={data.maps}
            />
          );
        case "users":
          return (
            <UsersTab
              students={data.students}
              classes={data.classes}
            />
          );
        case "standards":
          return <StandardsLibrary standards={data.standards} />;
        case "ubd-planner":
          return (
            <UBDPlanner
              ubdUnits={data.ubdUnits}
              courses={data.courses}
            />
          );
        case "progress":
          return <ProgressDashboard data={data} />;
        case "settings":
          return <SettingsTab />;
        case "integrations":
          return <IntegrationsTab integrations={data.integrations} />;
        case "collab":
          return (
            <CollabTab
              sharedMaps={data.sharedMaps}
              activityFeed={data.activityFeed}
            />
          );
        case "teaching-methods":
          return <TeachingMethodsTab methods={data.teachingMethods} />;
        case "eal-strategies":
          return <EALStrategiesTab strategies={data.ealStrategies} />;
        default:
          return null;
      }
    }

    // ===== STUDENT TABS (5) =====
    switch (activeTab) {
      case "my-maps":
        return (
          <MyMapsGrid
            maps={data.myMaps}
            courses={data.courses}
            role="student"
            studentProgress={data.studentView.mapProgress}
            onOpenMap={handleOpenStudentMap}
          />
        );
      case "map-view":
        return selectedMap ? (
          <StudentMapView
            key={selectedMapId}
            map={selectedMap}
            hexes={selectedMapHexes}
            connections={selectedMapConnections}
            progress={selectedMapProgress}
            studentId={data.studentView.studentId}
          />
        ) : null;
      case "progress":
        return <ProgressDashboard data={data} />;
      case "my-planner":
        return <MyPlannerTab tasks={data.studentView.plannerTasks} />;
      case "study":
        return <StudyTab flashcards={data.studentView.flashcards} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <TabNavigation
        role={role}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onRoleToggle={handleRoleToggle}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={`${role}-${activeTab}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {renderTab()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
