"use client";

import { useState, useRef, useEffect } from "react";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@timeo/api-client";
import { Button } from "@timeo/ui/web";
import { Bell, Check, CheckCheck } from "lucide-react";

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
  });
}

export function NotificationsBell() {
  const { tenantId } = useTenantId();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: notifications } = useNotifications(tenantId);
  const { mutate: markRead } = useMarkNotificationRead(tenantId ?? "");
  const { mutate: markAllRead } = useMarkAllNotificationsRead(tenantId ?? "");

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
  const displayItems = notifications?.slice(0, 10) ?? [];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!tenantId) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-white/[0.08] bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-white/50 hover:text-white"
                onClick={() => markAllRead()}
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Bell className="mb-2 h-6 w-6 text-white/20" />
                <p className="text-sm text-white/40">No notifications</p>
              </div>
            ) : (
              displayItems.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markRead(n.id);
                  }}
                  className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <div className="mt-1 flex-shrink-0">
                    {n.isRead ? (
                      <div className="h-2 w-2" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-white/50">{n.body}</p>
                    <p className="mt-1 text-[10px] text-white/30">{formatTimeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <Check className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-white/20" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
