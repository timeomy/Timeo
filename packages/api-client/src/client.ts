// eslint-disable-next-line no-var
declare var window: unknown;

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

type RuntimeGlobals = {
  EXPO_PUBLIC_API_URL?: string;
  __timeoGetAuthCookie?: () => string | null;
  localStorage?: { getItem: (key: string) => string | null };
};

function getBaseUrl(): string {
  const runtimeGlobal = globalThis as RuntimeGlobals;

  if (typeof window !== "undefined") {
    // Mobile (Expo) — use the explicit API URL so requests go directly
    // to the Hono server (no browser-cookie concerns on native).
    const expoUrl = runtimeGlobal.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_API_URL;
    if (expoUrl) return expoUrl;

    // Web (Next.js) — use same origin so session cookies are sent.
    // Next.js rewrites forward /api/* to the Hono API server.
    return "";
  }
  // Server-side (SSR / API routes)
  return (
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.EXPO_PUBLIC_API_URL ??
    "http://localhost:4000"
  );
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  const runtimeGlobal = globalThis as RuntimeGlobals;

  const contextHeaders: Record<string, string> = {};
  if (typeof window !== "undefined") {
    try {
      const localStorageLike = runtimeGlobal.localStorage;

      const activeTenantId = localStorageLike?.getItem("timeo.activeTenantId");
      const viewMode = localStorageLike?.getItem("timeo.viewMode");
      const viewAsRole = localStorageLike?.getItem("timeo.viewAsRole");

      if (activeTenantId) contextHeaders["x-timeo-view-tenant"] = activeTenantId;
      if (viewMode) contextHeaders["x-timeo-view-mode"] = viewMode;
      if (viewAsRole) contextHeaders["x-timeo-view-role"] = viewAsRole;
    } catch {
      // localStorage may be unavailable in private mode; ignore safely.
    }
  }

  try {
    const authCookie = runtimeGlobal.__timeoGetAuthCookie?.();
    if (authCookie) {
      contextHeaders.Cookie = authCookie;
    }
  } catch {
    // Cookie bridge may not exist in non-mobile runtimes.
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...contextHeaders,
      ...options?.headers,
    },
  });

  const json = (await response.json()) as ApiResponse<T>;

  if (json.success === false) {
    throw new ApiError(json.error.code, json.error.message);
  }

  return json.data;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    apiFetch<T>(path, { method: "GET", ...options }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    apiFetch<T>(path, { method: "DELETE", ...options }),
};
