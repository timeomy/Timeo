"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { resolveHomePath, useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";
import { useTenant } from "@timeo/api-client";
import { getInitials, type Capability } from "@timeo/shared";
import { useEnsureUser } from "@/hooks/use-ensure-user";
import { useUserProfile } from "@timeo/api-client";
import { FeatureFlagsProvider, useFeatureFlags } from "@/hooks/use-feature-flags";
import { useCapabilities, useHasCapability } from "@/hooks/use-capabilities";
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
  Menu,
  LogOut,
  ChevronDown,
  Building2,
  Check,
  ScanLine,
  NotebookPen,
  CreditCard,
  Ticket,
  UserCheck,
  Store,
  FileText,
  BarChart3,
  Shield,
  Activity,
  Cpu,
} from "lucide-react";

type SidebarLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  flagKey?: string;
  capability?: Capability;
};

type SidebarSection = {
  label?: string;
  links: SidebarLink[];
};

// ─── Coach-specific sidebar sections ──────────────────────────────────────────
const coachSidebarSections: SidebarSection[] = [
  {
    label: "COACHING",
    links: [
      {
        href: "/dashboard/my-clients",
        label: "My Clients",
        icon: Users2,
        capability: "coach_view_clients",
      },
      {
        href: "/dashboard/session-logs",
        label: "Session Logs",
        icon: NotebookPen,
        capability: "coach_session_log",
      },
      {
        href: "/dashboard/my-schedule",
        label: "Schedule",
        icon: Calendar,
        capability: "coach_session_log",
      },
    ],
  },
];

// ─── Staff / Front Desk sidebar ───────────────────────────────────────────────
const frontDeskSidebarSections: SidebarSection[] = [
  {
    label: "MISSION CONTROL",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/gym/checkins", label: "Check-ins", icon: Activity },
      { href: "/dashboard/gym/scanner", label: "QR Scanner", icon: ScanLine },
      {
        href: "/dashboard/pos",
        label: "POS",
        icon: Store,
        flagKey: "pos_enabled",
        capability: "pos_access",
      },
      {
        href: "/dashboard/bookings",
        label: "Bookings",
        icon: ClipboardList,
        flagKey: "appointments_enabled",
      },
      {
        href: "/dashboard/gym/members",
        label: "Members",
        icon: UserCheck,
        capability: "edit_customer",
      },
      {
        href: "/dashboard/billing",
        label: "Billing",
        icon: CreditCard,
        capability: "billing_transactional",
      },
      {
        href: "/dashboard/invoices",
        label: "Invoices",
        icon: FileText,
        capability: "billing_transactional",
      },
      {
        href: "/dashboard/session-logs",
        label: "Session Logs",
        icon: NotebookPen,
        capability: "coach_session_log",
      },
    ],
  },
];

const adminSidebarSections: SidebarSection[] = [
  ...frontDeskSidebarSections,
  {
    label: "OPERATIONS",
    links: [
      {
        href: "/dashboard/mission-control",
        label: "Mission Control",
        icon: Cpu,
        capability: "view_analytics",
      },
      { href: "/dashboard/products", label: "Products", icon: ShoppingBag },
      { href: "/dashboard/orders", label: "Orders", icon: Package },
      {
        href: "/dashboard/services",
        label: "Services",
        icon: Calendar,
        flagKey: "appointments_enabled",
      },
      { href: "/dashboard/packages", label: "Packages", icon: CreditCard },
      { href: "/dashboard/vouchers", label: "Gift Cards & Vouchers", icon: Ticket },
      {
        href: "/dashboard/e-invoice",
        label: "e-Invoice",
        icon: FileText,
        capability: "billing_transactional",
      },
    ],
  },
  {
    label: "MANAGEMENT",
    links: [
      {
        href: "/dashboard/analytics",
        label: "Analytics",
        icon: BarChart3,
        capability: "view_analytics",
      },
      {
        href: "/dashboard/team",
        label: "Team Management",
        icon: Users,
        capability: "manage_staff",
      },
      {
        href: "/dashboard/settings",
        label: "System Settings",
        icon: Settings,
        capability: "billing_strategic",
      },
      {
        href: "/admin",
        label: "Tenant Management",
        icon: Shield,
        capability: "manage_tenant",
      },
    ],
  },
];

function getTenantLogoUrl(tenant: unknown): string | null {
  if (!tenant || typeof tenant !== "object") return null;

  const record = tenant as Record<string, unknown>;
  const branding =
    typeof record.branding === "object" && record.branding
      ? (record.branding as Record<string, unknown>)
      : null;
  const nestedBranding =
    branding && typeof branding.branding === "object" && branding.branding
      ? (branding.branding as Record<string, unknown>)
      : null;

  return (
    (branding?.logoUrl as string | undefined) ??
    (nestedBranding?.logoUrl as string | undefined) ??
    (record.logoUrl as string | undefined) ??
    (record.logo as string | undefined) ??
    null
  );
}

function TenantSwitcher() {
  const { tenants, activeTenant, switchTenant, isLoading } =
    useTimeoWebTenantContext();
  const { data: switcherTenantData } = useTenant(activeTenant?.id);
  const switcherLogoUrl =
    getTenantLogoUrl(switcherTenantData) ?? getTenantLogoUrl(activeTenant);

  const [open, setOpen] = useState(false);
  const [activeLogoFailed, setActiveLogoFailed] = useState(false);
  const [tenantLogoFailures, setTenantLogoFailures] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setActiveLogoFailed(false);
  }, [switcherLogoUrl]);

  useEffect(() => {
    setTenantLogoFailures({});
  }, [tenants]);

  if (isLoading) return <Skeleton className="h-10 w-full rounded-lg" />;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 overflow-hidden">
          {switcherLogoUrl && !activeLogoFailed ? (
            <img
              src={switcherLogoUrl}
              alt={activeTenant?.name || ""}
              className="h-8 w-8 object-cover rounded-md"
              onError={() => setActiveLogoFailed(true)}
            />
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
            {tenants.map((t) => {
              const tenantLogoUrl = getTenantLogoUrl(t);
              const shouldShowLogo =
                !!tenantLogoUrl && !tenantLogoFailures[t.id];

              return (
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
                  <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-white/[0.06]">
                    {shouldShowLogo ? (
                      <img
                        src={tenantLogoUrl ?? ""}
                        alt={t.name}
                        className="h-7 w-7 object-cover"
                        onError={() =>
                          setTenantLogoFailures((prev) => ({
                            ...prev,
                            [t.id]: true,
                          }))
                        }
                      />
                    ) : (
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </span>
                  <span className="flex-1 truncate">{t.name}</span>
                  {activeTenant?.id === t.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              );
            })}

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
  const flags = useFeatureFlags();
  const capabilities = useCapabilities();
  const canManageStaff = useHasCapability("manage_staff");
  const canPosAccess = useHasCapability("pos_access");
  const canEditCustomer = useHasCapability("edit_customer");
  const canBillingTransactional = useHasCapability("billing_transactional");
  const canCoachSessionLog = useHasCapability("coach_session_log");
  const canCoachViewClients = useHasCapability("coach_view_clients");

  const displayName = user?.name || user?.email || "User";
  const capabilitySet = useMemo(() => new Set(capabilities), [capabilities]);

  function isLinkActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  function isLinkVisible(link: SidebarLink) {
    if (link.flagKey && flags[link.flagKey] === false) return false;
    if (link.capability && !capabilitySet.has(link.capability)) return false;
    return true;
  }

  const hasFrontDeskAccess =
    canPosAccess || canEditCustomer || canBillingTransactional;

  const isCoachMode =
    !canManageStaff &&
    !hasFrontDeskAccess &&
    (canCoachSessionLog || canCoachViewClients);

  const activeSections = canManageStaff
    ? adminSidebarSections
    : isCoachMode
      ? coachSidebarSections
      : hasFrontDeskAccess
        ? frontDeskSidebarSections
        : [];

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
