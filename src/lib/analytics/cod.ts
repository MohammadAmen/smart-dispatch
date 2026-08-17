export function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function codAmountFor(orderNumber: string): number {
  const hashed = hashString(orderNumber);
  const dinars = 4 + (hashed % 2450) / 100;
  return Math.round(dinars * 100) / 100;
}

export function ratingFor(completed: number, avgMinutes: number): number {
  const volumeBoost = Math.min(completed, 24) * 0.018;
  const speedBoost =
    avgMinutes > 0 ? Math.max(0, (48 - avgMinutes) / 120) : 0.08;
  const score = 4.35 + volumeBoost + speedBoost;
  return Math.min(5, Math.round(score * 10) / 10);
}
