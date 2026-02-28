/** Convert snake_case string to camelCase */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

/** Recursively convert all object keys from snake_case to camelCase */
export function toCamel<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => toCamel(item)) as unknown as T;
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[snakeToCamel(key)] = toCamel(val);
    }
    return result as T;
  }
  return value;
}

export function success<T>(data: T) {
  return { success: true as const, data: toCamel(data) };
}

export function error(code: string, message: string) {
  return { success: false as const, error: { code, message } };
}
