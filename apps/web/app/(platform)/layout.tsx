"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";
import { getInitials } from "@timeo/shared";
import { useEnsureUser } from "@/hooks/use-ensure-user";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Separator,
  cn,
} from "@timeo/ui/web";
import { TimeoLogo } from "@/timeo-logo";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  ToggleRight,
  Settings,
  BarChart3,
  ScrollText,
  Activity,
  Megaphone,
  Key,
  Database,
  Menu,
  LogOut,
  Shield,
  ChevronDown,
  Check,
} from "lucide-react";

type SidebarLink = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const sidebarLinks: SidebarLink[] = [
  { href: "/admin", label: "Command", icon: LayoutDashboard },
  { href: "/admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/features", label: "Feature Flags", icon: ToggleRight },
  { href: "/admin/config", label: "Config", icon: Settings },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/activity", label: "Activity", icon: ScrollText },
  { href: "/admin/health", label: "Health", icon: Activity },
  { href: "/admin/communications", label: "Comms", icon: Megaphone },
  { href: "/admin/integrations", label: "API Keys", icon: Key },
  { href: "/admin/data", label: "Data", icon: Database },
];

function ViewModeSwitcher() {
  const router = useRouter();
  const { viewMode, setViewMode } = useTimeoWebAuthContext();
  const { tenants, activeTenant, switchTenant } = useTimeoWebTenantContext();
  const [open, setOpen] = useState(false);

  const label = viewMode === "platform"
    ? "Platform Admin"
    : (activeTenant?.name ?? "Business View");

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm font-medium transition-colors hover:bg-white/[0.06]"
      >
        <span className="truncate max-w-[180px]">{label}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-[360px] rounded-xl border border-primary/20 bg-[#10182b] p-3 shadow-2xl">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">View Mode</p>

            <button
              onClick={() => {
                setViewMode("platform");
                router.push("/admin");
                setOpen(false);
              }}
              className={cn(
                "mb-3 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                viewMode === "platform"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-white/[0.08] bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"
              )}
            >
              <span>Back to Platform Admin</span>
              {viewMode === "platform" && <Check className="h-4 w-4" />}
            </button>

            <div className="space-y-3">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="rounded-lg border border-white/[0.06] p-3">
                  <p className="text-sm font-medium text-white">{tenant.name}</p>
                  {tenant.slug && <p className="mb-2 text-xs text-white/40">@{tenant.slug}</p>}
                  <div className="grid grid-cols-4 gap-2">
                    {(["Admin", "Staff", "Coach", "Member"] as const).map((roleLabel) => {
                      const isActive = viewMode === "tenant" && activeTenant?.id === tenant.id && roleLabel === "Admin";
                      return (
                        <button
                          key={roleLabel}
                          onClick={() => {
                            switchTenant(tenant.id);
                            setViewMode("tenant");
                            router.push("/dashboard");
                            setOpen(false);
                          }}
                          className={cn(
                            "rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                            isActive
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
                          )}
                        >
                          {roleLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, setViewMode } = useTimeoWebAuthContext();
  const { tenants } = useTimeoWebTenantContext();

  const displayName = user?.name || user?.email || "User";

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="p-4">
        <Link href="/admin" className="flex items-center gap-2" onClick={onNavigate}>
          <TimeoLogo size="md" />
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            C2
          </p>
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
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
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

      {/* Back to Dashboard — only if user has tenant memberships */}
      {tenants.length > 0 && (
        <div className="p-3">
          <button
            onClick={() => {
              setViewMode("tenant");
              router.push("/dashboard");
              onNavigate?.();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-white/[0.06] hover:text-foreground"
          >
            <LayoutDashboard className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      )}

      <Separator className="bg-white/[0.06]" />

      {/* User Section */}
      <div className="p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {(user?.imageUrl) && <AvatarImage src={user?.imageUrl} alt={displayName} />}
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
  const { isLoaded, isSignedIn, isPlatformAdmin, setViewMode } = useTimeoWebAuthContext();
  useEnsureUser(!!isSignedIn);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Ensure viewMode is "platform" when on C2 pages
  useEffect(() => {
    if (isPlatformAdmin) setViewMode("platform");
  }, [isPlatformAdmin, setViewMode]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.replace("/sign-in"); return; }
    if (!isPlatformAdmin) { router.replace("/dashboard"); }
  }, [isLoaded, isSignedIn, isPlatformAdmin, router]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <TimeoLogo size="xl" />
          <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!isSignedIn || !isPlatformAdmin) {
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
            <TimeoLogo size="sm" />
            <span className="text-xs text-muted-foreground">C2</span>
          </div>
        </header>

        <header className="hidden h-12 items-center justify-end border-b border-white/[0.06] px-6 lg:flex">
          <ViewModeSwitcher />
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
