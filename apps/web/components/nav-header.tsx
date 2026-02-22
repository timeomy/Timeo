"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import {
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Separator,
  NotificationBell,
  cn,
} from "@timeo/ui/web";
import { getInitials } from "@timeo/shared";
import {
  Zap,
  Menu,
  X,
  Calendar,
  ShoppingBag,
  ClipboardList,
  User,
  LogOut,
  ChevronDown,
  Package,
  Bell,
  LayoutDashboard,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";

const navLinks = [
  { href: "/services", label: "Services", icon: Calendar },
  { href: "/products", label: "Products", icon: ShoppingBag },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/orders", label: "Orders", icon: Package },
];

function NotificationBellWidget() {
  const unreadCount = useQuery(api.notifications.getUnreadCount) ?? 0;
  const result = useQuery(api.notifications.listByUser, { limit: 5 });
  const markAsRead = useMutation(api.notifications.markAsRead);

  const notifications = result?.notifications ?? [];

  return (
    <NotificationBell unreadCount={unreadCount}>
      <div className="max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          <Link
            href="/notifications"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Bell className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((n: any) => (
              <button
                key={n._id}
                onClick={() => {
                  if (!n.read) markAsRead({ notificationId: n._id });
                }}
                className={`flex w-full items-start gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                  !n.read ? "bg-accent/30" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${n.read ? "font-normal" : "font-semibold"}`}
                  >
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {n.body}
                  </p>
                </div>
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </NotificationBell>
  );
}

export function NavHeader() {
  const pathname = usePathname();
  const { user, isLoaded, isSignedIn, signOut } = useTimeoWebAuthContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const displayName = user?.name || user?.email || "User";

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">Timeo</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden items-center gap-3 md:flex">
          {!isLoaded ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
          ) : isSignedIn ? (
            <>
              <NotificationBellWidget />
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
                >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.imageUrl} alt={displayName} />
                  <AvatarFallback className="text-xs">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[120px] truncate text-sm font-medium">
                  {displayName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="glass absolute right-0 top-full z-50 mt-2 w-56 p-1 shadow-lg">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">{displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                    <Separator className="my-1" />
                    <Link
                      href="/post-login"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
            </>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-accent md:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/[0.06] bg-background/95 backdrop-blur md:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-3">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}

            <Separator className="my-2" />

            {!isLoaded ? (
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            ) : isSignedIn ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.imageUrl} alt={displayName} />
                    <AvatarFallback className="text-xs">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  {displayName}
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-1">
                <Link href="/sign-in" className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up" className="flex-1">
                  <Button
                    className="w-full"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
