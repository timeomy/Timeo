"use client";

import { RouteError } from "@/route-error";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError error={error} reset={reset} homeHref="/dashboard" homeLabel="Dashboard" />
  );
}
