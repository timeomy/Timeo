"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@timeo/ui/web";

type ActionTone = "emerald" | "sky" | "violet" | "amber" | "rose" | "indigo";

const toneStyles: Record<
  ActionTone,
  {
    tile: string;
    iconWrap: string;
    icon: string;
  }
> = {
  emerald: {
    tile: "hover:border-emerald-500/30 hover:bg-emerald-500/10",
    iconWrap: "bg-emerald-500/20",
    icon: "text-emerald-300",
  },
  sky: {
    tile: "hover:border-sky-500/30 hover:bg-sky-500/10",
    iconWrap: "bg-sky-500/20",
    icon: "text-sky-300",
  },
  violet: {
    tile: "hover:border-violet-500/30 hover:bg-violet-500/10",
    iconWrap: "bg-violet-500/20",
    icon: "text-violet-300",
  },
  amber: {
    tile: "hover:border-amber-500/30 hover:bg-amber-500/10",
    iconWrap: "bg-amber-500/20",
    icon: "text-amber-300",
  },
  rose: {
    tile: "hover:border-rose-500/30 hover:bg-rose-500/10",
    iconWrap: "bg-rose-500/20",
    icon: "text-rose-300",
  },
  indigo: {
    tile: "hover:border-indigo-500/30 hover:bg-indigo-500/10",
    iconWrap: "bg-indigo-500/20",
    icon: "text-indigo-300",
  },
};

export interface QuickActionItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  tone?: ActionTone;
  badge?: string;
  disabled?: boolean;
}

function ActionTile({ action }: { action: QuickActionItem }) {
  const tone = toneStyles[action.tone ?? "emerald"];

  const content = (
    <>
      {action.badge ? (
        <span className="absolute right-2.5 top-2 rounded-full bg-white/[0.14] px-2 py-0.5 text-[10px] font-semibold text-white/80">
          {action.badge}
        </span>
      ) : null}

      <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tone.iconWrap)}>
        <action.icon className={cn("h-5 w-5", tone.icon)} />
      </span>

      <div className="mt-3">
        <p className="text-sm font-semibold text-white">{action.label}</p>
        {action.subtitle ? <p className="mt-0.5 text-xs text-white/45">{action.subtitle}</p> : null}
      </div>
    </>
  );

  const className = cn(
    "relative flex min-h-[92px] flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-left transition-all active:scale-[0.98]",
    action.disabled ? "cursor-not-allowed opacity-45" : tone.tile
  );

  if (action.href && !action.disabled) {
    return (
      <Link href={action.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      className={className}
    >
      {content}
    </button>
  );
}

export function QuickActions({ actions }: { actions: QuickActionItem[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map((action) => (
        <ActionTile key={action.id} action={action} />
      ))}
    </div>
  );
}
