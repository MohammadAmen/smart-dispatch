export interface DeliveryTier {
  /** Inclusive lower bound in km. */
  fromKm: number;
  /** Exclusive upper bound in km. `null` = open-ended. */
  toKm: number | null;
  /** Flat delivery fee for distances in this band. */
  fee: number;
}

/** Default SYP bands (aligned with previous base ≈ 4000 + per-km). */
export const DEFAULT_DELIVERY_TIERS: DeliveryTier[] = [
  { fromKm: 0, toKm: 1, fee: 4000 },
  { fromKm: 1, toKm: 2, fee: 6000 },
  { fromKm: 2, toKm: 3, fee: 8000 },
  { fromKm: 3, toKm: 5, fee: 11000 },
  { fromKm: 5, toKm: null, fee: 15000 },
];

export function normalizeDeliveryTiers(value: unknown): DeliveryTier[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_DELIVERY_TIERS.map((tier) => ({ ...tier }));
  }

  const tiers: DeliveryTier[] = [];
  for (const row of value) {
    if (typeof row !== "object" || row === null) {
      continue;
    }
    const item = row as Record<string, unknown>;
    const fromKm = typeof item.fromKm === "number" ? item.fromKm : Number(item.fromKm);
    const fee = typeof item.fee === "number" ? item.fee : Number(item.fee);
    const toRaw = item.toKm;
    const toKm =
      toRaw === null || toRaw === undefined || toRaw === ""
        ? null
        : typeof toRaw === "number"
          ? toRaw
          : Number(toRaw);

    if (!Number.isFinite(fromKm) || fromKm < 0 || !Number.isFinite(fee) || fee < 0) {
      continue;
    }
    if (toKm != null && (!Number.isFinite(toKm) || toKm <= fromKm)) {
      continue;
    }
    tiers.push({ fromKm, toKm, fee: Math.round(fee) });
  }

  if (tiers.length === 0) {
    return DEFAULT_DELIVERY_TIERS.map((tier) => ({ ...tier }));
  }

  return tiers.sort((left, right) => left.fromKm - right.fromKm);
}

/**
 * Pick the admin tier fee for a Haversine distance (client + server safe).
 * Bands are [fromKm, toKm) with the last open band catching the remainder.
 */
export function feeFromDistanceKm(
  distanceKm: number,
  tiers: DeliveryTier[] = DEFAULT_DELIVERY_TIERS,
): number {
  const distance = Number.isFinite(distanceKm) ? Math.max(0, distanceKm) : 0;
  const bands = normalizeDeliveryTiers(tiers);

  for (const tier of bands) {
    if (distance >= tier.fromKm && (tier.toKm == null || distance < tier.toKm)) {
      return tier.fee;
    }
  }

  return bands[bands.length - 1]?.fee ?? DEFAULT_DELIVERY_TIERS[0].fee;
}

/** Rough ETA window from distance — keep lightweight for card rendering. */
export function estimateDeliveryMinutes(distanceKm: number): { min: number; max: number } {
  if (!Number.isFinite(distanceKm)) {
    return { min: 30, max: 45 };
  }
  const travel = Math.ceil(Math.max(0, distanceKm) * 6);
  const mid = 20 + travel;
  return {
    min: Math.max(15, mid - 5),
    max: Math.max(20, mid + 10),
  };
}
