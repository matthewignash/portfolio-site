"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SettingsTab() {
  const [showToast, setShowToast] = useState(false);

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const labelStyle =
    "block font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary mb-1.5";
  const inputStyle =
    "w-full rounded-md border border-dark-border bg-dark-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-[#00f0ff]/50 transition-colors";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Profile section */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
        <h4 className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
          Profile
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelStyle}>Full Name</label>
            <input
              type="text"
              defaultValue="Matthew Ignash"
              className={inputStyle}
              readOnly
            />
          </div>
          <div>
            <label className={labelStyle}>Email</label>
            <input
              type="text"
              defaultValue="m.ignash@school.edu"
              className={inputStyle}
              readOnly
            />
          </div>
          <div>
            <label className={labelStyle}>School</label>
            <input
              type="text"
              defaultValue="International School of Geneva"
              className={inputStyle}
              readOnly
            />
          </div>
          <div>
            <label className={labelStyle}>Department</label>
            <input
              type="text"
              defaultValue="Science"
              className={inputStyle}
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Preferences section */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
        <h4 className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
          Preferences
        </h4>
        <div className="space-y-4">
          <div>
            <label className={labelStyle}>Default View</label>
            <select className={inputStyle}>
              <option>Map Builder</option>
              <option>My Maps</option>
              <option>Progress Dashboard</option>
            </select>
          </div>

          <div>
            <label className={labelStyle}>Default Grading System</label>
            <select className={inputStyle}>
              <option>SBAR 1-8</option>
              <option>IB DP 1-7</option>
              <option>Custom</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className={labelStyle}>Notifications</label>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-dark-border"
              />
              Student progress milestones
            </label>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-dark-border"
              />
              At-risk student alerts
            </label>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-dark-border"
              />
              Collaboration activity
            </label>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-dark-border"
              />
              Weekly digest email
            </label>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="rounded-md bg-[#00f0ff]/15 px-6 py-2 text-xs font-mono uppercase tracking-wider text-[#00f0ff] hover:bg-[#00f0ff]/25 transition-colors"
        >
          Save Settings
        </button>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-md bg-[#22c55e]/20 px-4 py-2 text-xs text-[#22c55e] shadow-xl z-50"
          >
            Settings saved!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
