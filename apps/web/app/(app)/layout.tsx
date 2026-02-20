"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";
import { getInitials } from "@timeo/shared";
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
  Calendar,
  ShoppingBag,
  ClipboardList,
  Package,
  Users,
  Settings,
  Clock,
  Zap,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Building2,
  Check,
  Plus,
  ScanLine,
  NotebookPen,
  CreditCard,
  Ticket,
  UserCheck,
  Store,
} from "lucide-react";

const sidebarLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/services", label: "Services", icon: Calendar },
  { href: "/dashboard/products", label: "Products", icon: ShoppingBag },
  { href: "/dashboard/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/dashboard/orders", label: "Orders", icon: Package },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/scheduling", label: "Scheduling", icon: Clock },
  { href: "/dashboard/check-ins", label: "Check-ins", icon: ScanLine },
  { href: "/dashboard/session-logs", label: "Session Logs", icon: NotebookPen },
  { href: "/dashboard/packages", label: "Packages", icon: CreditCard },
  { href: "/dashboard/vouchers", label: "Vouchers", icon: Ticket },
  { href: "/dashboard/members", label: "Members", icon: UserCheck },
  { href: "/dashboard/pos", label: "POS", icon: Store },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function TenantSwitcher() {
  const { tenants, activeTenant, switchTenant, isLoading } =
    useTimeoWebTenantContext();
  const [open, setOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-10 w-full rounded-lg" />;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {activeTenant?.name ?? "Select Business"}
          </p>
          {activeTenant?.slug && (
            <p className="truncate text-xs text-muted-foreground">
              @{activeTenant.slug}
            </p>
          )}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="glass absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto p-1.5">
            {tenants.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  switchTenant(t.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]",
                  activeTenant?.id === t.id && "bg-primary/10"
                )}
              >
                <span className="flex-1 truncate">{t.name}</span>
                {activeTenant?.id === t.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
            <Separator className="my-1.5 bg-white/[0.06]" />
            <Link
              href="/onboarding"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Add Business
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, signOut, activeRole } = useTimeoWebAuthContext();

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email ||
      "User"
    : "";

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="p-4">
        <Link href="/" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">Timeo</span>
        </Link>
      </div>

      {/* Tenant Switcher */}
      <div className="px-3 pb-4">
        <TenantSwitcher />
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {sidebarLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/dashboard" && pathname.startsWith(link.href + "/"));
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

      {/* User Section */}
      <div className="p-3">
        {activeRole && activeRole !== "customer" && (
          <div className="mb-3 rounded-lg bg-primary/5 px-3 py-2 text-center">
            <span className="text-xs font-medium text-primary">
              {activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}
            </span>
          </div>
        )}
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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, isSignedIn, activeTenantId } = useTimeoWebAuthContext();
  const { tenants, activeTenant, isLoading: tenantsLoading } = useTimeoWebTenantContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-sync: if Clerk org exists but no Convex tenant, create one
  const existingTenant = useQuery(
    api.tenants.getByClerkOrgId,
    activeTenantId ? { clerkOrgId: activeTenantId } : "skip"
  );
  const createTenant = useMutation(api.tenants.createFromClerk);
  const syncingRef = useRef<string | null>(null);

  useEffect(() => {
    // Only sync when query has resolved (null = not found, undefined = still loading)
    if (
      activeTenantId &&
      existingTenant === null &&
      existingTenant !== undefined &&
      activeTenant &&
      syncingRef.current !== activeTenantId
    ) {
      syncingRef.current = activeTenantId;
      createTenant({
        clerkOrgId: activeTenantId,
        name: activeTenant.name,
        slug: activeTenant.slug ?? activeTenant.name.toLowerCase().replace(/\s+/g, "-"),
      })
        .catch(() => {})
        .finally(() => { syncingRef.current = null; });
    }
  }, [activeTenantId, existingTenant, activeTenant, createTenant]);

  // Loading state
  if (!isLoaded || tenantsLoading) {
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

  // No businesses — redirect to onboarding
  if (tenants.length === 0) {
    router.push("/onboarding");
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
