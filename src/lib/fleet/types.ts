import type { DriverStatus, VehicleStatus } from "@/generated/prisma/enums";

export type { DriverStatus, VehicleStatus };

export interface FleetDriverSummary {
  id: string;
  name: string;
  status: DriverStatus;
}

export interface FleetVehicle {
  id: string;
  plateNumber: string;
  model: string;
  type: string;
  vehicleTypeId: string | null;
  capacityKg: number;
  currentLoadPct: number;
  status: VehicleStatus;
  zone: string;
  zoneName: string;
  zoneId: string | null;
  driver: FleetDriverSummary | null;
}

export interface FleetListResponse {
  ok: true;
  vehicles: FleetVehicle[];
}

export interface VehiclePatchInput {
  plateNumber?: string;
  model?: string;
  status?: VehicleStatus;
  zone?: string;
  zoneId?: string | null;
  vehicleTypeId?: string | null;
  capacityKg?: number;
  driverId?: string | null;
  currentLoadPct?: number;
}

export interface VehicleDeleteResult {
  id: string;
  deleted: boolean;
  deactivated: boolean;
  unassignedDriver: boolean;
  driverName: string | null;
  plateNumber: string;
  vehicle: FleetVehicle | null;
}

export interface VehicleCreateInput {
  plateNumber: string;
  model: string;
  type?: string;
  vehicleTypeId?: string;
  capacityKg?: number;
  zone?: string;
  zoneId?: string;
}

export const VEHICLE_TYPES = ["Van", "Pickup", "Moped"] as const;

export const DEFAULT_CAPACITY_KG: Record<(typeof VEHICLE_TYPES)[number], number> = {
  Van: 900,
  Pickup: 650,
  Moped: 45,
};

export const VEHICLE_STATUSES: VehicleStatus[] = ["ACTIVE", "MAINTENANCE", "INACTIVE"];

export function isVehicleStatus(value: string): value is VehicleStatus {
  return (VEHICLE_STATUSES as string[]).includes(value);
}
