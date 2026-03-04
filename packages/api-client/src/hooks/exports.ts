function getApiUrl(): string {
  if (typeof window !== "undefined") {
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

export function useDownloadReport(tenantId: string) {
  const apiUrl = getApiUrl();

  return {
    downloadRevenue: (from: string, to: string) =>
      window.open(
        `${apiUrl}/api/tenants/${tenantId}/exports/revenue?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        "_blank",
      ),
    downloadBookings: (from: string, to: string) =>
      window.open(
        `${apiUrl}/api/tenants/${tenantId}/exports/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        "_blank",
      ),
    downloadProducts: (from: string, to: string) =>
      window.open(
        `${apiUrl}/api/tenants/${tenantId}/exports/products?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        "_blank",
      ),
  };
}
