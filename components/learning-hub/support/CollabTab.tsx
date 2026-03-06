"use client";

import type { SharedMap, ActivityFeedItem } from "@/lib/learning-hub-types";

const PERMISSION_COLORS: Record<string, { bg: string; text: string }> = {
  view: { bg: "#3b82f6", text: "#93c5fd" },
  edit: { bg: "#22c55e", text: "#86efac" },
  admin: { bg: "#a855f7", text: "#d8b4fe" },
};

export interface CollabTabProps {
  sharedMaps: SharedMap[];
  activityFeed: ActivityFeedItem[];
}

export default function CollabTab({
  sharedMaps,
  activityFeed,
}: CollabTabProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Shared Maps */}
      <div>
        <h4 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
          Shared Maps
        </h4>
        <div className="space-y-3">
          {sharedMaps.map((sm) => (
            <div
              key={sm.mapId}
              className="rounded-xl border border-dark-border bg-dark-surface p-4"
            >
              <h5 className="mb-2 text-sm font-semibold text-text-primary">
                {sm.mapTitle}
              </h5>

              {/* Shared with */}
              <div className="mb-2 flex flex-wrap gap-1.5">
                {sm.sharedWith.map((sw) => {
                  const pc =
                    PERMISSION_COLORS[sw.permission] ??
                    PERMISSION_COLORS.view;
                  return (
                    <span
                      key={sw.userId}
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono"
                      style={{
                        backgroundColor: pc.bg + "15",
                        color: pc.text,
                      }}
                    >
                      {sw.name}
                      <span className="opacity-60">
                        ({sw.permission})
                      </span>
                    </span>
                  );
                })}
              </div>

              <div className="text-[10px] text-text-muted">
                Last edited by {sm.lastEditedBy} ·{" "}
                {new Date(sm.lastEditedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div>
        <h4 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
          Recent Activity
        </h4>
        <div className="space-y-1">
          {activityFeed.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-dark-border bg-dark-surface px-4 py-3"
            >
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#00f0ff]" />
              <div className="flex-1">
                <p className="text-xs text-text-secondary">
                  <span className="font-medium text-text-primary">
                    {item.userName}
                  </span>{" "}
                  {item.action}{" "}
                  <span className="text-[#00f0ff]">{item.mapTitle}</span>
                </p>
                <span className="text-[10px] text-text-muted">
                  {formatTimeAgo(item.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}
