"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { resolveHomePath, useTimeoWebAuthContext, useTimeoWebTenantContext, isRoleAtLeast } from "@timeo/auth/web";
import { useTenant } from "@timeo/api-client";
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
import { ViewModeSwitcher } from "@/view-mode-switcher";
import { ThemeToggle } from "@/theme-toggle";
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
  Megaphone,
  Monitor,
  MonitorOff,
} from "lucide-react";

type SidebarLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  flagKey?: string;
};

type SidebarSection = {
  label?: string;
  minRole?: TimeoRole;
  maxRole?: TimeoRole;
  links: SidebarLink[];
};

// ─── Coach-specific sidebar sections ──────────────────────────────────────────
const coachSidebarSections: SidebarSection[] = [
  {
    label: "COACHING",
    links: [
      { href: "/dashboard/my-clients", label: "My Clients", icon: Users2 },
      { href: "/dashboard/session-logs", label: "Session Logs", icon: NotebookPen },
      { href: "/dashboard/training-logs", label: "Training Logs", icon: Dumbbell },
    ],
  },
  {
    label: "ACCOUNT",
    links: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    label: "CONFIGURATION",
    minRole: "admin",
    links: [
      { href: "/dashboard/settings/customize", label: "Customize UI", icon: Monitor },
      {
        href: "/dashboard/settings/features",
        label: "Feature Flags",
        icon: MonitorOff,
      },
    ],
  },
];


// ─── Front Desk sidebar (limited view) ────────────────────────────────────────
const frontDeskSections: SidebarSection[] = [
  {
    label: "FRONT DESK",
    links: [
      { href: "/dashboard/gym/checkins", label: "Check-in Feed", icon: Activity },
      { href: "/dashboard/gym/scanner", label: "QR Scanner", icon: ScanLine },
      { href: "/dashboard/gym/members", label: "Members", icon: UserCheck },
    ],
  },
];

const sidebarSections: SidebarSection[] = [
  // ── OVERVIEW (all staff) ─────────────────────────────────────────────
  {
    label: "OVERVIEW",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  // ── CLIENTS (staff+) ────────────────────────────────────────────────
  {
    label: "CLIENTS",
    links: [
      { href: "/dashboard/clients", label: "My Clients", icon: Users2 },
      { href: "/dashboard/session-logs", label: "Session Logs", icon: NotebookPen },
      { href: "/dashboard/bookings", label: "Bookings", icon: ClipboardList, flagKey: "appointments_enabled" },
    ],
  },
  // ── GYM FLOOR (staff+) ──────────────────────────────────────────────
  {
    label: "GYM FLOOR",
    links: [
      { href: "/dashboard/gym/checkins", label: "Check-in Feed", icon: Activity },
      { href: "/dashboard/gym/scanner", label: "QR Scanner", icon: ScanLine },
      { href: "/dashboard/scheduling", label: "Scheduling", icon: Clock, flagKey: "appointments_enabled" },
    ],
  },
  // ── ACCOUNT (staff+) ────────────────────────────────────────────────
  {
    label: "ACCOUNT",
    links: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
  // ── MARKETING (admin only) ──────────────────────────────────────────
  {
    label: "MARKETING",
    minRole: "admin",
    links: [
      { href: "/dashboard/broadcasts", label: "Broadcasts", icon: Megaphone },
    ],
  },
  // ── OPERATIONS (admin only) ─────────────────────────────────────────
  {
    label: "OPERATIONS",
    minRole: "admin",
    links: [
      { href: "/dashboard/mission-control", label: "Mission Control", icon: Cpu },
      { href: "/dashboard/gym/members", label: "Members", icon: UserCheck },
      { href: "/dashboard/team", label: "Team", icon: Users },
      { href: "/dashboard/gym/payments", label: "Payments", icon: CreditCard },
      { href: "/dashboard/billing", label: "Billing", icon: FileText },
      { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
];

// Legacy flat list for any admin pages not in sections above
const adminOnlyExtras: SidebarLink[] = [
  { href: "/dashboard/customers", label: "Customers", icon: Users2 },
  { href: "/dashboard/packages", label: "Packages", icon: CreditCard },
  { href: "/dashboard/services", label: "Services", icon: Calendar, flagKey: "appointments_enabled" },
  { href: "/dashboard/products", label: "Products", icon: ShoppingBag },
  { href: "/dashboard/orders", label: "Orders", icon: Package },
  { href: "/dashboard/vouchers", label: "Gift Cards & Vouchers", icon: Ticket },
  { href: "/dashboard/pos", label: "POS", icon: Store, flagKey: "pos_enabled" },
  { href: "/dashboard/e-invoice", label: "e-Invoice", icon: FileText },
];

function TenantSwitcher() {
  const { tenants, activeTenant, switchTenant, isLoading } =
    useTimeoWebTenantContext();
  const { data: switcherTenantData } = useTenant(activeTenant?.id);
  const switcherLogoUrl: string | null = (switcherTenantData as any)?.branding?.logoUrl ?? null;

  const [open, setOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-10 w-full rounded-lg" />;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 overflow-hidden">
          {switcherLogoUrl ? (
            <img src={switcherLogoUrl} alt={activeTenant?.name || ""} className="h-8 w-8 object-cover rounded-md" />
          ) : (
            <Building2 className="h-4 w-4 text-primary" />
          )}
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
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#1a1a2e] p-1.5 shadow-xl">
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

          </div>
        </>
      )}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, activeRole, isPlatformAdmin, setViewMode, setViewAsRole } = useTimeoWebAuthContext();
  const { activeTenant } = useTimeoWebTenantContext();
  const { data: tenantDetail } = useTenant(activeTenant?.id);
  const tenantLogoUrl: string | null = (tenantDetail as any)?.branding?.logoUrl ?? null;
  const flags = useFeatureFlags();

  const displayName = user?.name || user?.email || "User";

  const isAdminUser = isRoleAtLeast(activeRole, "admin");
  const [frontDeskMode, setFrontDeskMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("timeo-front-desk-mode") === "true";
  });

  function toggleFrontDeskMode() {
    const next = !frontDeskMode;
    setFrontDeskMode(next);
    localStorage.setItem("timeo-front-desk-mode", String(next));
  }

  function isLinkActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  function isLinkVisible(link: SidebarLink) {
    if (link.flagKey && flags[link.flagKey] === false) return false;
    return true;
  }

  function isSectionVisible(section: SidebarSection) {
    if (section.minRole && !isRoleAtLeast(activeRole, section.minRole)) return false;
    return true;
  }

  const isCoach = activeRole === "coach";
  const activeSections = isCoach
    ? coachSidebarSections
    : (isAdminUser && frontDeskMode)
      ? frontDeskSections
      : sidebarSections;

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="p-4">
        <Link href="/" prefetch className="flex items-center gap-2" onClick={onNavigate}>
          <TimeoLogo size="md" />
        </Link>
      </div>

      {/* Tenant Switcher */}
      <div className="px-3 pb-4">
        <TenantSwitcher />
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        {activeSections.map((section, sectionIndex) => {
          if (!isSectionVisible(section)) return null;
          const visibleLinks = section.links.filter(isLinkVisible);
          if (visibleLinks.length === 0) return null;

          return (
            <div key={sectionIndex} className={sectionIndex > 0 ? "mt-4" : ""}>
              {section.label && (
                <div className="mb-1 px-3 py-1">
                  <span className="text-xs font-semibold tracking-wider text-white/40 uppercase">
                    {section.label}
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                {visibleLinks.map((link) => {
                  const isActive = isLinkActive(link.href);
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
                      {isActive && (
                        <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary" />
                      )}
                      <Link
                        href={link.href}
                        prefetch
                        onClick={onNavigate}
                        className={cn(
                          "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
                          isActive
                            ? "text-primary pl-4"
                            : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                        )}
                      >
                        <link.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Admin extras (hidden in sidebar but accessible via URL) */}
        {!isCoach && isRoleAtLeast(activeRole, "admin") && (
          <div className="mt-4">
            <div className="mb-1 px-3 py-1">
              <span className="text-xs font-semibold tracking-wider text-white/40 uppercase">
                STORE
              </span>
            </div>
            <div className="space-y-0.5">
              {adminOnlyExtras.filter(isLinkVisible).map((link) => {
                const isActive = isLinkActive(link.href);
                return (
                  <motion.div
                    key={link.href}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNavStore"
                        className="absolute inset-0 rounded-lg bg-primary/10"
                        transition={{ type: "spring", duration: 0.2, bounce: 0.1 }}
                      />
                    )}
                    {isActive && (
                      <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary" />
                    )}
                    <Link
                      href={link.href}
                      prefetch
                      onClick={onNavigate}
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
                        isActive
                          ? "text-primary pl-4"
                          : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                      )}
                    >
                      <link.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <Separator className="bg-white/[0.06]" />

      {/* Platform C2 Link (platform_admin only) */}
      {isPlatformAdmin && (
        <div className="p-3">
          <button
            onClick={() => {
              setViewAsRole(null);
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

      {/* Front Desk Mode Toggle */}
      {isAdminUser && (
        <>
          <Separator className="bg-white/[0.06]" />
          <div className="p-3">
            <button
              onClick={toggleFrontDeskMode}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                frontDeskMode
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              )}
            >
              {frontDeskMode ? (
                <MonitorOff className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
              <span className="flex-1 text-left">
                {frontDeskMode ? "Exit Front Desk" : "Front Desk Mode"}
              </span>
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                frontDeskMode ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white/40"
              )}>
                {frontDeskMode ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        </>
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
            {user?.imageUrl && <AvatarImage src={user.imageUrl} alt={displayName} />}
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
  const {
    isLoaded,
    isSignedIn,
    isPlatformAdmin,
    viewMode,
    activeTenantId,
    viewAsRole,
  } = useTimeoWebAuthContext();
  const { tenants, isLoading: tenantsLoading } = useTimeoWebTenantContext();
  useEnsureUser(!!isSignedIn);
  const { data: userProfile } = useUserProfile();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const homePath = resolveHomePath({
    platformRole: isPlatformAdmin ? "platform_admin" : "user",
    tenants,
    viewMode,
    activeTenantId,
    viewAsRole,
  });

  useEffect(() => {
    if (!isLoaded || tenantsLoading) return;
    if (!isSignedIn) { router.replace("/sign-in"); return; }
    if (!homePath.startsWith("/dashboard")) { router.replace(homePath); return; }
    if (userProfile?.force_password_reset) { router.replace("/change-password"); return; }
  }, [
    isLoaded,
    tenantsLoading,
    isSignedIn,
    homePath,
    userProfile,
    router,
  ]);

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

  if (!isSignedIn || !homePath.startsWith("/dashboard")) {
    return null;
  }

  return (
    <MaintenanceGate>
      <FeatureFlagsProvider>
        <div className="flex h-screen bg-background">
          {/* Desktop Sidebar */}
          <aside className="hidden w-64 flex-shrink-0 border-r border-border/70 bg-card/50 lg:block">
            <SidebarContent />
          </aside>

          {/* Mobile Sidebar Overlay */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
              />
              <aside className="absolute left-0 top-0 h-full w-72 border-r border-border/70 bg-card shadow-2xl">
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
              <div className="flex items-center gap-2">
                <ViewModeSwitcher />
                <ThemeToggle />
                <NotificationsBell />
              </div>
            </header>

            {/* Desktop Top Bar */}
            <header className="hidden h-12 items-center justify-end border-b border-border/70 px-6 lg:flex">
              <div className="flex items-center gap-2">
                <ViewModeSwitcher />
                <ThemeToggle />
                <NotificationsBell />
              </div>
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
