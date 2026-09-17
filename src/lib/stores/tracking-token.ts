export const TRACKING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export function isTrackingToken(value: unknown): value is string {
  return typeof value === "string" && TRACKING_TOKEN_PATTERN.test(value);
}

export function uniqueTrackingTokens(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!isTrackingToken(value) || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}
