"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { getInitials } from "@timeo/shared";
import { useEnsureUser } from "@/hooks/use-ensure-user";
import {
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Separator,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  LayoutDashboard,
  Building2,
  ScrollText,
  Zap,
  Menu,
  LogOut,
  Shield,
} from "lucide-react";

type SidebarLink = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const sidebarLinks: SidebarLink[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useTimeoWebAuthContext();

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email ||
      "User"
    : "";

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="p-4">
        <Link href="/admin" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span className="text-xl font-bold">Timeo</span>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Platform Admin
            </p>
          </div>
        </Link>
      </div>

      {/* Platform Admin Badge */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-primary">
              Super Admin
            </p>
            <p className="truncate text-xs text-muted-foreground">
              System-wide access
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {sidebarLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/admin" && pathname.startsWith(link.href + "/"));
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              )}
            >
              <link.icon className={cn("h-4 w-4", isActive && "text-primary")} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-white/[0.06]" />

      {/* Back to Dashboard Link */}
      <div className="p-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-white/[0.06] hover:text-foreground"
        >
          <LayoutDashboard className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* User Section */}
      <div className="p-3">
        <div className="mb-3 rounded-lg bg-primary/5 px-3 py-2 text-center">
          <span className="text-xs font-medium text-primary">
            Platform Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.imageUrl ?? undefined} alt={displayName} />
            <AvatarFallback className="text-xs">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            {user?.email && (
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
          <button
            onClick={() => signOut()}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, isSignedIn, activeRole } = useTimeoWebAuthContext();
  useEnsureUser(!!isSignedIn);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    router.push("/sign-in");
    return null;
  }

  // Not a platform admin — redirect to dashboard
  if (activeRole !== "platform_admin") {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-white/[0.06] bg-card/50 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-white/[0.06] bg-card shadow-2xl">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="glass-nav flex h-14 items-center gap-3 px-4 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-white/[0.06]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Timeo</span>
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
