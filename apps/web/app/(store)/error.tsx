"use client";

import { RouteError } from "@/route-error";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError error={error} reset={reset} homeHref="/services" homeLabel="Browse Services" />
  );
}
