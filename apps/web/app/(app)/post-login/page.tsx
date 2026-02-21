"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";
import { getRoleHomePath } from "@/hooks/use-role-redirect";
import { useEnsureUser } from "@/hooks/use-ensure-user";
import { Zap } from "lucide-react";

export default function PostLoginPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, activeRole } = useTimeoWebAuthContext();
  const { tenants, isLoading } = useTimeoWebTenantContext();
  useEnsureUser(!!isSignedIn);

  // Fallback: check Convex memberships for legacy users without Clerk orgs
  const myTenants = useQuery(api.tenants.getMyTenants);

  useEffect(() => {
    if (!isLoaded || isLoading) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    // No Clerk org memberships — check Convex memberships
    if (tenants.length === 0) {
      if (myTenants === undefined) return; // still loading

      if (myTenants.length > 0) {
        // Legacy user with Convex membership — route by role
        const role = myTenants[0]!.role;
        if (role === "customer") {
          router.replace("/portal");
        } else {
          router.replace("/dashboard");
        }
        return;
      }

      // No memberships at all — go to join page
      router.replace("/join");
      return;
    }

    // Route based on role
    const homePath = getRoleHomePath(activeRole, tenants.length > 0);
    router.replace(homePath);
  }, [isLoaded, isLoading, isSignedIn, activeRole, tenants, myTenants, router]);

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
