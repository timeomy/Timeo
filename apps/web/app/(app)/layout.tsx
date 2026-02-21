"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoWebAuthContext, useTimeoWebTenantContext, isRoleAtLeast } from "@timeo/auth/web";
import type { TimeoRole } from "@timeo/auth/web";
import { getInitials } from "@timeo/shared";
import { useEnsureUser } from "@/hooks/use-ensure-user";
import {
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Separator,
  Skeleton,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  FileText,
} from "lucide-react";

type SidebarLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  minRole?: TimeoRole;
};

const sidebarLinks: SidebarLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/services", label: "Services", icon: Calendar, minRole: "admin" },
  { href: "/dashboard/products", label: "Products", icon: ShoppingBag, minRole: "admin" },
  { href: "/dashboard/bookings", label: "Bookings", icon: ClipboardList, minRole: "staff" },
  { href: "/dashboard/orders", label: "Orders", icon: Package, minRole: "admin" },
  { href: "/dashboard/team", label: "Team", icon: Users, minRole: "admin" },
  { href: "/dashboard/scheduling", label: "Scheduling", icon: Clock, minRole: "staff" },
  { href: "/dashboard/check-ins", label: "Check-ins", icon: ScanLine, minRole: "staff" },
  { href: "/dashboard/session-logs", label: "Session Logs", icon: NotebookPen, minRole: "staff" },
  { href: "/dashboard/packages", label: "Packages", icon: CreditCard, minRole: "admin" },
  { href: "/dashboard/vouchers", label: "Gift Cards & Vouchers", icon: Ticket, minRole: "admin" },
  { href: "/dashboard/members", label: "Members", icon: UserCheck, minRole: "staff" },
  { href: "/dashboard/pos", label: "POS", icon: Store, minRole: "staff" },
  { href: "/dashboard/e-invoice", label: "e-Invoice", icon: FileText, minRole: "admin" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, minRole: "admin" },
];

function getVisibleLinks(role: TimeoRole) {
  return sidebarLinks.filter(
    (link) => !link.minRole || isRoleAtLeast(role, link.minRole)
  );
}

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
        {getVisibleLinks(activeRole).map((link) => {
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
  const { isLoaded, isSignedIn, activeTenantId, activeRole } = useTimeoWebAuthContext();
  const { tenants, activeTenant, isLoading: tenantsLoading } = useTimeoWebTenantContext();
  useEnsureUser(!!isSignedIn);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Check if current Clerk org has a matching Convex tenant
  const existingTenant = useQuery(
    api.tenants.getByClerkOrgId,
    activeTenantId ? { clerkOrgId: activeTenantId } : "skip"
  );
  const linkTenant = useMutation(api.tenants.linkToClerkOrg);
  const [linkSlug, setLinkSlug] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");

  // Check if user has any Convex tenant memberships (fallback for users without proper Clerk org)
  const myTenants = useQuery(api.tenants.getMyTenants);

  // When Clerk org has no matching Convex tenant, decide what to show
  useEffect(() => {
    if (
      activeTenantId &&
      existingTenant === null &&
      existingTenant !== undefined &&
      myTenants !== undefined
    ) {
      if (myTenants.length > 0) {
        // User has Convex memberships but Clerk org isn't linked — show link dialog for admins
        if (activeRole === "admin" || activeRole === "platform_admin") {
          setShowLinkDialog(true);
        } else {
          // Customer/staff with Convex membership — send to portal/dashboard
          router.push(activeRole === "customer" ? "/portal" : "/dashboard");
        }
      } else {
        // No Convex memberships at all — send to join page
        router.push("/join");
      }
    }
  }, [activeTenantId, existingTenant, myTenants, activeRole, router]);

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

  // No Clerk orgs — check Convex memberships before redirecting
  if (tenants.length === 0) {
    // If myTenants is still loading, show loading spinner (handled above)
    // If user has Convex memberships (legacy user), route by role
    if (myTenants && myTenants.length > 0) {
      const firstTenant = myTenants[0]!;
      if (firstTenant.role === "customer") {
        router.push("/portal");
        return null;
      }
      // Staff/admin with Convex membership but no Clerk org — stay on dashboard
      // useTenantId will resolve via Convex memberships
    } else if (myTenants !== undefined) {
      // No Convex memberships either — go to join page
      router.push("/join");
      return null;
    } else {
      // Still loading myTenants — show loading
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
  }

  // Customers should use the portal, not the admin dashboard
  if (activeRole === "customer") {
    router.push("/portal");
    return null;
  }

  async function handleLink() {
    if (!linkSlug.trim() || !activeTenantId) return;
    setLinking(true);
    setError("");
    try {
      await linkTenant({ tenantSlug: linkSlug.trim().toLowerCase(), clerkOrgId: activeTenantId });
      setShowLinkDialog(false);
      setLinkSlug("");
    } catch (err: any) {
      const msg = err?.message || "Failed to link business. Check the slug and try again.";
      setError(msg);
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Link/Create business dialog — shown when Clerk org has no Convex tenant */}
      <Dialog open={showLinkDialog && existingTenant === null} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Your Business</DialogTitle>
            <DialogDescription>
              Your organization{activeTenant ? ` "${activeTenant.name}"` : ""} isn&apos;t linked to a business on Timeo yet.
              Enter a business slug to link, or create a new business.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="e.g. ws-fitness"
              value={linkSlug}
              onChange={(e) => setLinkSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleLink()}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => { setShowLinkDialog(false); router.push("/onboarding"); }}
            >
              Create New Business
            </Button>
            <Button onClick={handleLink} disabled={linking || !linkSlug.trim()}>
              {linking ? "Linking..." : "Link Business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
