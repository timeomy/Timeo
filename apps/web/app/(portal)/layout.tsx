"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";
import { getInitials } from "@timeo/shared";
import { useEnsureUser } from "@/hooks/use-ensure-user";
import { useEnsureMembership } from "@/hooks/use-ensure-membership";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Separator,
  cn,
} from "@timeo/ui/web";
import {
  Home,
  Calendar,
  Package,
  Ticket,
  QrCode,
  Receipt,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Zap,
} from "lucide-react";

type NavLink = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const navLinks: NavLink[] = [
  { href: "/portal", label: "Home", icon: Home },
  { href: "/portal/bookings", label: "Bookings", icon: Calendar },
  { href: "/portal/packages", label: "Packages", icon: Package },
  { href: "/portal/vouchers", label: "Vouchers", icon: Ticket },
  { href: "/portal/transactions", label: "Transactions", icon: Receipt },
  { href: "/portal/qr-code", label: "QR Code", icon: QrCode },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn, user, signOut, activeRole } =
    useTimeoWebAuthContext();
  const { tenants, isLoading: tenantsLoading } = useTimeoWebTenantContext();
  useEnsureUser(!!isSignedIn);
  const { tenantId } = useTenantId();
  useEnsureMembership(tenantId);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Fallback: check Convex memberships for legacy users without Clerk orgs
  const myTenants = useQuery(api.tenants.getMyTenants);

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email ||
      "User"
    : "";

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
    if (myTenants && myTenants.length > 0) {
      // Legacy user with Convex membership — check role before allowing portal access
      const convexRole = myTenants[0]!.role;
      if (convexRole !== "customer") {
        // Staff/admin should use the dashboard, not the portal
        router.push("/dashboard");
        return null;
      }
      // Customer — stay on portal (useTenantId resolves via Convex)
    } else if (myTenants !== undefined) {
      // No Convex memberships either — go to join page
      router.push("/join");
      return null;
    } else {
      // Still loading myTenants — show loading spinner
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

  // Role guard: non-customers should go to dashboard
  if (activeRole !== "customer") {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="glass-nav sticky top-0 z-50 border-b border-white/[0.06]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Logo */}
          <div className="flex items-center gap-6">
            <Link href="/portal" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">Timeo</span>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/portal" &&
                    pathname.startsWith(link.href + "/"));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: User Avatar Dropdown + Mobile Hamburger */}
          <div className="flex items-center gap-2">
            {/* User Dropdown (Desktop) */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.06]"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage
                    src={user?.imageUrl ?? undefined}
                    alt={displayName}
                  />
                  <AvatarFallback className="text-xs">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[120px] truncate text-sm font-medium">
                  {displayName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="glass absolute right-0 top-full z-50 mt-1.5 w-48 p-1.5">
                    <Link
                      href="/portal/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Separator className="my-1.5 bg-white/[0.06]" />
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-white/[0.06] md:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-white/[0.06] md:hidden">
            <div className="mx-auto max-w-7xl space-y-1 px-4 py-3">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/portal" &&
                    pathname.startsWith(link.href + "/"));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}

              <Separator className="my-2 bg-white/[0.06]" />

              {/* Mobile User Section */}
              <div className="flex items-center gap-3 px-3 py-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.imageUrl ?? undefined}
                    alt={displayName}
                  />
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
              </div>

              <Link
                href="/portal/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-white/[0.06] hover:text-foreground"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-white/[0.06] hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
