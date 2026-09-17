export function parseDeclinedDriverIds(value: string | null | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

export function stringifyDeclinedDriverIds(ids: string[]): string {
  return JSON.stringify([...new Set(ids)]);
}
