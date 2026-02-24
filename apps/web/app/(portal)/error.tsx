"use client";

import { RouteError } from "@/route-error";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError error={error} reset={reset} homeHref="/portal" homeLabel="Portal Home" />
  );
}
