"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";
import { getRoleHomePath } from "@/hooks/use-role-redirect";
import { useEnsureUser } from "@/hooks/use-ensure-user";
import { Zap } from "lucide-react";

export default function PostLoginPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, activeRole } = useTimeoWebAuthContext();
  const { tenants, isLoading } = useTimeoWebTenantContext();
  useEnsureUser(!!isSignedIn);

  useEffect(() => {
    if (!isLoaded || isLoading) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    // Platform admin always goes to C2 control center
    if (activeRole === "platform_admin") {
      router.replace("/admin");
      return;
    }

    // No tenant memberships — go to portal (onboarding)
    if (tenants.length === 0) {
      router.replace("/portal");
      return;
    }

    // Use the first tenant's role directly — activeRole may still be "customer"
    // at this point because activeTenantId hasn't been auto-selected yet (timing).
    const primaryRole = tenants[0]?.role ?? "customer";
    const homePath = getRoleHomePath(primaryRole, true);
    router.replace(homePath);
  }, [isLoaded, isLoading, isSignedIn, activeRole, tenants, router]);

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
