// eslint-disable-next-line no-var
declare var window: unknown;

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

function getBaseUrl(): string {
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

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
