"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { resolveHomePath, useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";
import { useEnsureUser } from "@/hooks/use-ensure-user";
import { useEnsureMembership } from "@/hooks/use-ensure-membership";
import { useTenantId } from "@/hooks/use-tenant-id";
import { TimeoLogo } from "@/timeo-logo";
import { BottomTabs } from "@/member/bottom-tabs";
import { ThemeToggle } from "@/theme-toggle";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
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
  const { tenantId } = useTenantId();
  useEnsureMembership(tenantId);

  const homePath = resolveHomePath({
    platformRole: isPlatformAdmin ? "platform_admin" : "user",
    tenants,
    viewMode,
    activeTenantId,
    viewAsRole,
  });

  // Redirect logic in useEffect to avoid infinite re-render loops
  useEffect(() => {
    if (!isLoaded || tenantsLoading) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    if (!homePath.startsWith("/portal")) {
      router.replace(homePath);
    }
  }, [isLoaded, tenantsLoading, isSignedIn, homePath, router]);

  // Loading state
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

  // Show loading while redirecting users with non-portal home paths.
  if (!isSignedIn || !homePath.startsWith("/portal")) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_46%)]" />
      <div className="fixed right-4 top-4 z-20 md:right-6 md:top-6">
        <ThemeToggle />
      </div>

      <main className="relative mx-auto min-h-screen w-full max-w-md px-4 pb-28 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomTabs />
    </div>
  );
}
