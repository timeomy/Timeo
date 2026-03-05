function getApiUrl(): string {
  if (typeof (globalThis as Record<string, unknown>)["window"] !== "undefined") {
    return (
      (globalThis as Record<string, unknown>).NEXT_PUBLIC_API_URL as string ??
      (globalThis as Record<string, unknown>).EXPO_PUBLIC_API_URL as string ??
      process.env.NEXT_PUBLIC_API_URL ??
      process.env.EXPO_PUBLIC_API_URL ??
      "http://localhost:4000"
    );
  }
  return (
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.EXPO_PUBLIC_API_URL ??
    "http://localhost:4000"
  );
}

function openUrl(url: string): void {
  const g = globalThis as Record<string, unknown>;
  if (typeof g["window"] !== "undefined") {
    const w = g["window"] as { open?: (url: string, target: string) => void };
    w.open?.(url, "_blank");
  }
}

export function useDownloadReport(tenantId: string) {
  const apiUrl = getApiUrl();

  return {
    downloadRevenue: (from: string, to: string) =>
      openUrl(
        `${apiUrl}/api/tenants/${tenantId}/exports/revenue?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
    downloadBookings: (from: string, to: string) =>
      openUrl(
        `${apiUrl}/api/tenants/${tenantId}/exports/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
    downloadProducts: (from: string, to: string) =>
      openUrl(
        `${apiUrl}/api/tenants/${tenantId}/exports/products?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
  };
}
