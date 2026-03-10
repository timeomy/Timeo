"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTimeoWebAuthContext, useTimeoWebTenantContext, isRoleAtLeast } from "@timeo/auth/web";
import type { TimeoRole } from "@timeo/auth/web";
import { getInitials } from "@timeo/shared";
import { useEnsureUser } from "@/hooks/use-ensure-user";
import { useUserProfile } from "@timeo/api-client";
import { FeatureFlagsProvider, useFeatureFlags } from "@/hooks/use-feature-flags";
import { AnnouncementBanner } from "@/announcement-banner";
import { MaintenanceGate } from "@/maintenance-gate";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Separator,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import { NotificationsBell } from "@/notifications-bell";
import { TimeoLogo } from "@/timeo-logo";
import {
  LayoutDashboard,
  Calendar,
  ShoppingBag,
  ClipboardList,
  Package,
  Users,
  Users2,
  Settings,
  Clock,
  Menu,
  LogOut,
  ChevronDown,
  ChevronRight,
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
  BarChart3,
  Shield,
  Dumbbell,
  Activity,
  Cpu,
} from "lucide-react";

type SidebarLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  minRole?: TimeoRole;
  flagKey?: string;
  children?: SidebarLink[];
};

const sidebarLinks: SidebarLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/services", label: "Services", icon: Calendar, minRole: "admin", flagKey: "appointments_enabled" },
  { href: "/dashboard/products", label: "Products", icon: ShoppingBag, minRole: "admin" },
  { href: "/dashboard/bookings", label: "Bookings", icon: ClipboardList, minRole: "staff", flagKey: "appointments_enabled" },
  { href: "/dashboard/orders", label: "Orders", icon: Package, minRole: "admin" },
  { href: "/dashboard/team", label: "Team", icon: Users, minRole: "admin" },
  { href: "/dashboard/scheduling", label: "Scheduling", icon: Clock, minRole: "staff", flagKey: "appointments_enabled" },
  { href: "/dashboard/check-ins", label: "Check-ins", icon: ScanLine, minRole: "staff", flagKey: "pos_enabled" },
  {
    href: "/dashboard/gym", label: "Gym", icon: Dumbbell, minRole: "staff",
    children: [
      { href: "/dashboard/gym", label: "Overview", icon: Dumbbell },
      { href: "/dashboard/gym/members", label: "Members", icon: UserCheck },
      { href: "/dashboard/gym/checkins", label: "Check-ins", icon: Activity },
      { href: "/dashboard/gym/scanner", label: "Scanner", icon: ScanLine },
      { href: "/dashboard/gym/turnstile", label: "Turnstile", icon: Cpu },
    ],
  },
  { href: "/dashboard/session-logs", label: "Session Logs", icon: NotebookPen, minRole: "staff" },
  { href: "/dashboard/packages", label: "Packages", icon: CreditCard, minRole: "admin" },
  { href: "/dashboard/vouchers", label: "Gift Cards & Vouchers", icon: Ticket, minRole: "admin" },
  { href: "/dashboard/members", label: "Members", icon: UserCheck, minRole: "staff" },
  { href: "/dashboard/customers", label: "Customers", icon: Users2, minRole: "admin" },
  { href: "/dashboard/pos", label: "POS", icon: Store, minRole: "staff", flagKey: "pos_enabled" },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, minRole: "admin" },
  { href: "/dashboard/e-invoice", label: "e-Invoice", icon: FileText, minRole: "admin" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, minRole: "admin" },
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
  const router = useRouter();
  const { user, signOut, activeRole, isPlatformAdmin, setViewMode } = useTimeoWebAuthContext();
  const flags = useFeatureFlags();

  const displayName = user?.name || user?.email || "User";

  function getVisibleLinks(role: TimeoRole) {
    return sidebarLinks.filter(
      (link) =>
        (!link.minRole || isRoleAtLeast(role, link.minRole)) &&
        (!link.flagKey || flags[link.flagKey] !== false),
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="p-4">
        <Link href="/" className="flex items-center gap-2" onClick={onNavigate}>
          <TimeoLogo size="md" />
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
          const isInSection = link.children && pathname.startsWith(link.href);
          const isActive =
            !link.children && (
              pathname === link.href ||
              (link.href !== "/dashboard" && pathname.startsWith(link.href + "/"))
            );

          if (link.children) {
            return (
              <div key={link.href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative"
                >
                  {isInSection && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-lg bg-primary/10"
                      transition={{ type: "spring", duration: 0.2, bounce: 0.1 }}
                    />
                  )}
                  <Link
                    href={link.href}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isInSection
                        ? "text-primary"
                        : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                    )}
                  >
                    <link.icon className={cn("h-4 w-4", isInSection && "text-primary")} />
                    {link.label}
                    <ChevronRight className={cn(
                      "ml-auto h-3.5 w-3.5 transition-transform",
                      isInSection && "rotate-90"
                    )} />
                  </Link>
                </motion.div>
                {isInSection && (
                  <div className="mt-1 ml-4 space-y-0.5 border-l border-white/[0.06] pl-3">
                    {link.children.map((child) => {
                      const isChildActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                            isChildActive
                              ? "text-primary font-medium"
                              : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                          )}
                        >
                          <child.icon className={cn("h-3.5 w-3.5", isChildActive && "text-primary")} />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <motion.div
              key={link.href}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className="relative"
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  transition={{ type: "spring", duration: 0.2, bounce: 0.1 }}
                />
              )}
              <Link
                href={link.href}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                )}
              >
                <link.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                {link.label}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <Separator className="bg-white/[0.06]" />

      {/* Platform C2 Link (platform_admin only — visible in tenant mode too) */}
      {isPlatformAdmin && (
        <div className="p-3">
          <button
            onClick={() => {
              setViewMode("platform");
              router.push("/admin");
              onNavigate?.();
            }}
            className="flex w-full items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary/10"
          >
            <Shield className="h-4 w-4" />
            C2 Control Center
          </button>
        </div>
      )}

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
  const { isLoaded, isSignedIn, activeRole } = useTimeoWebAuthContext();
  const { tenants, isLoading: tenantsLoading } = useTimeoWebTenantContext();
  useEnsureUser(!!isSignedIn);
  const { data: userProfile } = useUserProfile();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoaded || tenantsLoading) return;
    if (!isSignedIn) { router.replace("/sign-in"); return; }
    if (activeRole === "platform_admin") { router.replace("/admin"); return; }
    if (tenants.length === 0) { router.replace("/portal"); return; }
    if (activeRole === "customer") { router.replace("/portal"); return; }
    if (userProfile?.force_password_reset) { router.replace("/change-password"); return; }
  }, [isLoaded, tenantsLoading, isSignedIn, tenants, activeRole, userProfile, router]);

  if (!isLoaded || tenantsLoading) {
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

  if (!isSignedIn || tenants.length === 0 || activeRole === "customer") {
    return null;
  }

  return (
    <MaintenanceGate>
      <FeatureFlagsProvider>
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
              <div className="flex flex-1 items-center gap-2">
                <TimeoLogo size="sm" />
              </div>
              <NotificationsBell />
            </header>

            {/* Desktop Top Bar */}
            <header className="hidden h-12 items-center justify-end border-b border-white/[0.06] px-6 lg:flex">
              <NotificationsBell />
            </header>

            {/* Announcements */}
            <AnnouncementBanner />

            {/* Page Content */}
            <main className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    {children}
                  </div>
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </FeatureFlagsProvider>
    </MaintenanceGate>
  );
}
