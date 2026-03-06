"use client";

import { motion } from "framer-motion";
import type {
  LearningMap,
  StudentMapProgress,
  Course,
} from "@/lib/learning-hub-types";

export interface MyMapsGridProps {
  maps: LearningMap[];
  courses: Course[];
  role: "teacher" | "student";
  studentProgress?: StudentMapProgress[];
  onOpenMap: (mapId: string) => void;
}

function getCourseColor(courseId: string, courses: Course[]): string {
  const course = courses.find((c) => c.id === courseId);
  return course?.color ?? "#5a5a7a";
}

function getCourseTitle(courseId: string, courses: Course[]): string {
  const course = courses.find((c) => c.id === courseId);
  return course?.title ?? "Unknown Course";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function MyMapsGrid({
  maps,
  courses,
  role,
  studentProgress,
  onOpenMap,
}: MyMapsGridProps) {
  // Build a progress lookup by mapId
  const progressByMap = new Map<string, StudentMapProgress>();
  if (studentProgress) {
    for (const sp of studentProgress) {
      progressByMap.set(sp.mapId, sp);
    }
  }

  if (maps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-dark-border bg-dark-void p-12 text-center">
        <div className="mb-2 text-2xl opacity-40">🗺️</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          No Maps Yet
        </div>
        <div className="mt-1 text-xs text-text-muted/60">
          {role === "teacher"
            ? "Create your first learning map to get started"
            : "No maps have been assigned yet"}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {maps.map((map, i) => {
        const courseColor = getCourseColor(map.courseId, courses);
        const courseTitle = getCourseTitle(map.courseId, courses);
        const sp = progressByMap.get(map.id);

        return (
          <motion.div
            key={map.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            className="group cursor-pointer rounded-xl border border-dark-border bg-dark-surface p-5 transition-colors hover:border-[#00f0ff]/30"
            onClick={() => onOpenMap(map.id)}
          >
            {/* Course badge */}
            <div className="mb-3 flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: courseColor }}
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted">
                {courseTitle}
              </span>
            </div>

            {/* Map title */}
            <h3 className="mb-1.5 text-sm font-semibold text-text-primary group-hover:text-[#00f0ff] transition-colors">
              {map.title}
            </h3>

            {/* Description */}
            <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-text-secondary">
              {map.description}
            </p>

            {/* Stats row */}
            <div className="mb-3 flex items-center gap-3 text-[10px] font-mono text-text-muted">
              <span>
                {map.hexCount} hexes
              </span>
              <span className="text-dark-border">•</span>
              <span>
                {map.connectionCount} connections
              </span>
            </div>

            {/* Role-specific content */}
            {role === "teacher" ? (
              <TeacherMapFooter map={map} />
            ) : (
              <StudentMapFooter sp={sp} />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function TeacherMapFooter({ map }: { map: LearningMap }) {
  return (
    <div className="space-y-2 border-t border-dark-border pt-3">
      <div className="flex items-center justify-between text-[10px] text-text-muted">
        <span>Created {formatDate(map.createdAt)}</span>
        <span>Updated {formatDate(map.updatedAt)}</span>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 rounded-md bg-[#00f0ff]/10 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#00f0ff] hover:bg-[#00f0ff]/20 transition-colors">
          Open in Builder
        </button>
        <button className="rounded-md bg-dark-elevated px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text-muted hover:text-text-secondary transition-colors">
          Edit
        </button>
      </div>
    </div>
  );
}

function StudentMapFooter({ sp }: { sp?: StudentMapProgress }) {
  if (!sp) {
    return (
      <div className="border-t border-dark-border pt-3">
        <span className="text-[10px] text-text-muted">Not started</span>
      </div>
    );
  }

  const completionPct =
    sp.totalHexes > 0
      ? Math.round((sp.completedHexes / sp.totalHexes) * 100)
      : 0;

  return (
    <div className="space-y-2 border-t border-dark-border pt-3">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-dark-elevated">
          <div
            className="h-full rounded-full bg-[#22c55e] transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <span className="font-mono text-[10px] text-text-muted">
          {completionPct}%
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-[10px] text-text-muted">
        <span>
          {sp.completedHexes}/{sp.totalHexes} complete
        </span>
        <span>
          Last: {formatDate(sp.lastAccessedAt)}
        </span>
      </div>

      {/* Continue button */}
      <button className="w-full rounded-md bg-[#22c55e]/10 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#22c55e] hover:bg-[#22c55e]/20 transition-colors">
        Continue Learning
      </button>
    </div>
  );
}
