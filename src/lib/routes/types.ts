import type { Prisma } from "@/generated/prisma/client";
import type { RouteStatus } from "@/generated/prisma/enums";

export interface RouteWaypoint {
  lat: number;
  lng: number;
  kind: "start" | "stop";
  orderId?: string;
  orderNumber?: string;
}

export interface SerializedRoute {
  id: string;
  status: RouteStatus;
  zone: string | null;
  zoneName: string | null;
  totalDistanceKm: number;
  estimatedMinutes: number;
  stopCount: number;
  waypoints: RouteWaypoint[];
  createdAt: string;
  driver: {
    id: string;
    name: string;
    plateNumber: string | null;
  };
}

export interface RouteListResponse {
  ok: true;
  routes: SerializedRoute[];
}

export interface RouteOptimizeResult {
  ok: true;
  routesCreated: number;
  assignedCount: number;
  unmatchedCount: number;
  routes: SerializedRoute[];
  unmatched: Array<{
    orderId: string;
    orderNumber: string;
    reason: string;
  }>;
}

export const ROUTE_STATUSES: RouteStatus[] = ["OPTIMIZED", "IN_PROGRESS", "COMPLETED"];

export function isRouteWaypoint(value: unknown): value is RouteWaypoint {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const row = value as Record<string, unknown>;
  return (
    typeof row.lat === "number" &&
    Number.isFinite(row.lat) &&
    typeof row.lng === "number" &&
    Number.isFinite(row.lng) &&
    (row.kind === "start" || row.kind === "stop")
  );
}

export function parseWaypoints(value: Prisma.JsonValue | null): RouteWaypoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => (isRouteWaypoint(item) ? [item] : []));
}
