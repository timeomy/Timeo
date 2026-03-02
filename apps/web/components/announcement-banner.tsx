"use client";

import { usePlatformAnnouncements } from "@timeo/api-client";
import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "@timeo/ui/web";

export function AnnouncementBanner() {
  const { data: announcements } = usePlatformAnnouncements();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const now = new Date();
  const active = (announcements ?? []).filter(
    (a) =>
      a.active &&
      a.target === "all" &&
      (!a.expiresAt || new Date(a.expiresAt) > now) &&
      !dismissed.includes(a.id),
  );

  if (active.length === 0) return null;

  const typeStyles: Record<string, string> = {
    info: "bg-blue-500/10 border-blue-500/20 text-blue-300",
    warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-300",
    critical: "bg-red-500/10 border-red-500/20 text-red-300",
  };

  return (
    <div className="space-y-1">
      {active.map((a) => (
        <div
          key={a.id}
          className={cn(
            "flex items-start gap-3 border-b px-6 py-3 text-sm",
            typeStyles[a.type] ?? typeStyles.info,
          )}
        >
          <p className="flex-1">
            <strong>{a.title}</strong>
            {a.body ? ` \u2014 ${a.body}` : ""}
          </p>
          <button
            onClick={() => setDismissed((d) => [...d, a.id])}
            className="mt-0.5 opacity-60 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
