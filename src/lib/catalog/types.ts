export const CATALOG_ICONS = [
  "truck",
  "bike",
  "car",
  "snowflake",
  "package",
  "bus",
] as const;

export type CatalogIcon = (typeof CATALOG_ICONS)[number];

export function isCatalogIcon(value: string): value is CatalogIcon {
  return (CATALOG_ICONS as readonly string[]).includes(value);
}

export interface DeliveryZone {
  id: string;
  name: string;
  code: string;
  city: string;
  active: boolean;
  vehicleCount: number;
}

export interface CatalogVehicleType {
  id: string;
  name: string;
  maxWeightKg: number;
  icon: string;
  active: boolean;
  vehicleCount: number;
}

export interface ZoneWriteInput {
  name: string;
  city: string;
  code?: string;
  active?: boolean;
}

export interface VehicleTypeWriteInput {
  name: string;
  maxWeightKg: number;
  icon: string;
  active?: boolean;
}

export interface CatalogListsResponse {
  ok: true;
  zones: DeliveryZone[];
  vehicleTypes: CatalogVehicleType[];
}
