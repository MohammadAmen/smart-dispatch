const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function isFiniteCoordinate(value: number): boolean {
  return Number.isFinite(value);
}

export function isValidLatitude(value: number): boolean {
  return isFiniteCoordinate(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return isFiniteCoordinate(value) && value >= -180 && value <= 180;
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (
    !isValidLatitude(lat1) ||
    !isValidLatitude(lat2) ||
    !isValidLongitude(lon1) ||
    !isValidLongitude(lon2)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const originLat = toRadians(lat1);
  const targetLat = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export function roundDistanceKm(distanceKm: number, digits = 3): number {
  if (!Number.isFinite(distanceKm)) {
    return distanceKm;
  }

  const factor = 10 ** digits;
  return Math.round(distanceKm * factor) / factor;
}
