"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@timeo/ui/web";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
  homeLabel?: string;
}

export function RouteError({
  error,
  reset,
  homeHref = "/",
  homeLabel = "Go Home",
}: RouteErrorProps) {
  useEffect(() => {
    console.error("[RouteError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>

        {/* Message */}
        <h2 className="text-xl font-bold tracking-tight text-white">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-white/50">
          An unexpected error occurred. Please try again or return to the home
          page.
        </p>

        {/* Error digest (production) */}
        {error.digest && (
          <p className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 font-mono text-xs text-white/30">
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            className="gap-2 border-white/[0.08] hover:bg-white/[0.06]"
            onClick={reset}
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <a
            href={homeHref}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Home className="h-4 w-4" />
            {homeLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
