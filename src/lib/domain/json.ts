export function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function stringifyJsonArray<T>(value: T[]): string {
  return JSON.stringify(value);
}
