"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Integration } from "@/lib/learning-hub-types";

export interface IntegrationsTabProps {
  integrations: Integration[];
}

export default function IntegrationsTab({
  integrations,
}: IntegrationsTabProps) {
  const [showToast, setShowToast] = useState(false);

  const handleConfigure = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
        Integrations
      </h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integ, i) => (
          <motion.div
            key={integ.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className="rounded-xl border border-dark-border bg-dark-surface p-5"
          >
            {/* Icon + name */}
            <div className="mb-3 flex items-center gap-3">
              <span className="text-2xl">{integ.icon}</span>
              <div>
                <h4 className="text-sm font-semibold text-text-primary">
                  {integ.name}
                </h4>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider ${
                    integ.status === "connected"
                      ? "bg-[#22c55e]/15 text-[#22c55e]"
                      : "bg-dark-elevated text-text-muted"
                  }`}
                >
                  {integ.status}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="mb-3 text-xs leading-relaxed text-text-secondary">
              {integ.description}
            </p>

            {/* Last synced */}
            {integ.lastSynced && (
              <div className="mb-3 text-[10px] text-text-muted">
                Last synced:{" "}
                {new Date(integ.lastSynced).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            )}

            {/* Configure button */}
            <button
              onClick={handleConfigure}
              className={`w-full rounded-md py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                integ.status === "connected"
                  ? "bg-dark-elevated text-text-muted hover:text-text-secondary"
                  : "bg-[#00f0ff]/10 text-[#00f0ff] hover:bg-[#00f0ff]/20"
              }`}
            >
              {integ.status === "connected" ? "Configure" : "Connect"}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-md bg-dark-surface border border-dark-border px-4 py-2 text-xs text-text-muted shadow-xl z-50"
          >
            Demo mode — integration configuration disabled
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
