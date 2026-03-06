"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Student, ClassSection } from "@/lib/learning-hub-types";

const ROLE_BADGES: Record<string, { bg: string; text: string }> = {
  student: { bg: "#00f0ff", text: "#00f0ff" },
  teacher: { bg: "#a855f7", text: "#a855f7" },
  admin: { bg: "#f97316", text: "#f97316" },
};

export interface UsersTabProps {
  students: Student[];
  classes: ClassSection[];
}

export default function UsersTab({ students, classes }: UsersTabProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Build class lookup
  const classMap = useMemo(() => {
    const m = new Map<string, ClassSection>();
    for (const c of classes) m.set(c.id, c);
    return m;
  }, [classes]);

  // Filter users
  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q)
    );
  }, [students, search]);

  // Count by role
  const roleCounts = useMemo(() => {
    const counts = { student: 0, teacher: 0, admin: 0 };
    for (const s of students) {
      counts[s.role] = (counts[s.role] || 0) + 1;
    }
    return counts;
  }, [students]);

  const labelStyle =
    "font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
            Users ({students.length})
          </h3>
          <div className="flex gap-1.5">
            <span className="rounded-full bg-[#00f0ff]/10 px-2 py-0.5 text-[9px] font-mono text-[#00f0ff]">
              {roleCounts.student} students
            </span>
            <span className="rounded-full bg-[#a855f7]/10 px-2 py-0.5 text-[9px] font-mono text-[#a855f7]">
              {roleCounts.teacher} teacher
            </span>
            <span className="rounded-full bg-[#f97316]/10 px-2 py-0.5 text-[9px] font-mono text-[#f97316]">
              {roleCounts.admin} admin
            </span>
          </div>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-48 rounded-md border border-dark-border bg-dark-elevated px-3 py-1.5 text-xs text-text-primary outline-none placeholder:text-text-muted/50 focus:border-[#00f0ff]/50 transition-colors"
        />
      </div>

      {/* Table header */}
      <div className="hidden sm:grid sm:grid-cols-5 gap-3 px-4 py-2">
        <span className={labelStyle}>Name</span>
        <span className={labelStyle}>Email</span>
        <span className={labelStyle}>Role</span>
        <span className={labelStyle}>Classes</span>
        <span className={labelStyle}>Support</span>
      </div>

      {/* User rows */}
      <div className="space-y-1.5">
        {filtered.map((user, i) => {
          const isExpanded = expandedId === user.id;
          const roleBadge = ROLE_BADGES[user.role] ?? ROLE_BADGES.student;
          const userClasses = user.classIds
            .map((id) => classMap.get(id))
            .filter(Boolean) as ClassSection[];

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.12, delay: i * 0.02 }}
              className="rounded-lg border border-dark-border bg-dark-surface overflow-hidden"
            >
              {/* Row */}
              <button
                onClick={() =>
                  setExpandedId(isExpanded ? null : user.id)
                }
                className="w-full grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-3 px-4 py-2.5 text-left transition-colors hover:bg-dark-elevated/50"
              >
                {/* Name with avatar */}
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: user.avatarColor }}
                  >
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </div>
                  <span className="text-xs font-medium text-text-primary">
                    {user.firstName} {user.lastName}
                  </span>
                </div>

                {/* Email */}
                <span className="text-xs text-text-muted truncate">
                  {user.email}
                </span>

                {/* Role badge */}
                <div>
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider"
                    style={{
                      backgroundColor: roleBadge.bg + "15",
                      color: roleBadge.text,
                    }}
                  >
                    {user.role}
                  </span>
                </div>

                {/* Classes count */}
                <span className="text-xs text-text-secondary">
                  {user.classIds.length} class
                  {user.classIds.length !== 1 ? "es" : ""}
                </span>

                {/* Support profile */}
                <div className="flex items-center justify-between">
                  {user.supportProfile ? (
                    <span className="rounded-full bg-[#f59e0b]/15 px-2 py-0.5 text-[9px] font-mono text-[#f59e0b]">
                      {user.supportProfile.profileType}
                      {user.supportProfile.widaLevel
                        ? ` L${user.supportProfile.widaLevel}`
                        : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                  <span
                    className={`text-[10px] text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    ▼
                  </span>
                </div>
              </button>

              {/* Expanded detail */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-dark-border px-4 py-3 space-y-3">
                      {/* Profile details */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1">
                            Grade Level
                          </label>
                          <span className="text-xs text-text-secondary">
                            Grade {user.gradeLevel}
                          </span>
                        </div>
                        <div>
                          <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1">
                            Email
                          </label>
                          <span className="text-xs text-text-secondary">
                            {user.email}
                          </span>
                        </div>
                      </div>

                      {/* Enrolled classes */}
                      {userClasses.length > 0 && (
                        <div>
                          <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1.5">
                            Enrolled Classes
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {userClasses.map((cls) => (
                              <span
                                key={cls.id}
                                className="rounded-md bg-dark-elevated px-2.5 py-1 text-[10px] text-text-secondary"
                              >
                                {cls.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Support profile details */}
                      {user.supportProfile && (
                        <div>
                          <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1.5">
                            Support Profile
                          </label>
                          <div className="rounded-md border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-[#f59e0b]/15 px-2 py-0.5 text-[9px] font-bold text-[#f59e0b]">
                                {user.supportProfile.profileType}
                              </span>
                              {user.supportProfile.widaLevel && (
                                <span className="text-[10px] text-text-muted">
                                  WIDA Level{" "}
                                  {user.supportProfile.widaLevel}
                                </span>
                              )}
                            </div>
                            {user.supportProfile.accommodations.length >
                              0 && (
                              <div>
                                <span className="text-[9px] font-mono text-text-muted">
                                  Accommodations:
                                </span>
                                <ul className="mt-1 space-y-0.5">
                                  {user.supportProfile.accommodations.map(
                                    (acc, idx) => (
                                      <li
                                        key={idx}
                                        className="text-[10px] text-text-secondary flex gap-1.5"
                                      >
                                        <span className="text-[#f59e0b]">
                                          •
                                        </span>
                                        {acc}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-dark-border p-8 text-center text-xs text-text-muted">
            No users match your search
          </div>
        )}
      </div>
    </div>
  );
}
