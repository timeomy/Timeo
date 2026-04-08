"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolvePostLoginPath, useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";
import { useEnsureUser } from "@/hooks/use-ensure-user";
import { Zap } from "lucide-react";

export default function PostLoginPage() {
  const router = useRouter();
  const {
    isLoaded,
    isSignedIn,
    isPlatformAdmin,
  } = useTimeoWebAuthContext();
  const { tenants, isLoading } = useTimeoWebTenantContext();
  useEnsureUser(!!isSignedIn);

  useEffect(() => {
    if (!isLoaded || isLoading) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const homePath = resolvePostLoginPath({
      platformRole: isPlatformAdmin ? "platform_admin" : "user",
      tenants,
    });

    router.replace(homePath);
  }, [
    isLoaded,
    isLoading,
    isSignedIn,
    isPlatformAdmin,
    tenants,
    router,
  ]);

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
