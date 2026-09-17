import type { DriverStatus } from "@/generated/prisma/enums";
import type { LocalizedText } from "@/lib/localized";
import type { LatLngTuple } from "@/lib/live-map";

export type DriverDutyStatus = "AVAILABLE" | "OFFLINE";

export type DriverJobStatus = "ASSIGNED" | "IN_TRANSIT";

export interface DriverProfile {
  id: string;
  name: string;
  vehicleType: string;
  status: DriverStatus;
}

export interface DriverOrderItem {
  name: LocalizedText;
  qty: number;
}

export interface DriverStop {
  kind: "pickup" | "dropoff";
  title: LocalizedText;
  detail: string;
  point: LatLngTuple | null;
}

export interface DriverAssignment {
  orderId: string;
  orderNumber: string;
  customerName: LocalizedText;
  customerPhone: string;
  addressText: string;
  items: DriverOrderItem[];
  status: DriverJobStatus;
  pickup: LatLngTuple | null;
  destination: LatLngTuple;
  stops: DriverStop[];
  storeName: string | null;
  distanceKm: number | null;
  expectedEarnings: number;
  offeredAt: string | null;
  acceptedAt: string | null;
}

export interface DriverSessionResponse {
  ok: true;
  drivers: DriverProfile[];
  driver: DriverProfile | null;
  assignment: DriverAssignment | null;
  dailyEarnings: number;
}

export interface DriverPatchBody {
  driverId: string;
  status?: DriverDutyStatus;
  latitude?: number;
  longitude?: number;
}

export type DriverAccess =
  | { kind: "self"; driverId: string }
  | { kind: "unassigned" }
  | { kind: "staff" };
