"use client";

import { RouteError } from "@/route-error";

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError error={error} reset={reset} homeHref="/admin" homeLabel="Platform Admin" />
  );
}
