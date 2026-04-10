"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Activity, UserRound, WalletCards, Receipt } from "lucide-react";
import { cn } from "@timeo/ui/web";

type PortalTab = {
  href: string;
  label: string;
  icon: React.ElementType;
  match: string[];
};

const tabs: PortalTab[] = [
  {
    href: "/portal",
    label: "Home",
    icon: House,
    match: ["/portal", "/portal/directory", "/portal/vouchers"],
  },
  {
    href: "/portal/packages",
    label: "Packages",
    icon: WalletCards,
    match: ["/portal/plan", "/portal/packages"],
  },
  {
    href: "/portal/billing",
    label: "Billing",
    icon: Receipt,
    match: ["/portal/billing", "/portal/transactions"],
  },
  {
    href: "/portal/activity",
    label: "Activity",
    icon: Activity,
    match: ["/portal/activity", "/portal/bookings"],
  },
  {
    href: "/portal/profile",
    label: "Profile",
    icon: UserRound,
    match: ["/portal/profile", "/portal/qr-code"],
  },
];

function isActive(pathname: string, tab: PortalTab) {
  return tab.match.some((segment) => {
    if (segment === "/portal") {
      return pathname === "/portal";
    }

    return pathname === segment || pathname.startsWith(`${segment}/`);
  });
}

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <div className="grid grid-cols-5 gap-2 rounded-2xl border border-border/80 bg-card/80 p-2">
          {tabs.map((tab) => {
            const active = isActive(pathname, tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-all active:scale-[0.97]",
                  active
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="h-4.5 w-4.5" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
