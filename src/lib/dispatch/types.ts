import type { DispatchStatus, LiveOrder } from "@/lib/live-map";

export interface AssignmentMatch {
  orderId: string;
  orderNumber: string;
  driverId: string;
  driverName: string;
  vehicleType: string;
  distanceKm: number;
}

export type UnmatchedReason =
  | "NO_AVAILABLE_DRIVERS"
  | "MISSING_COORDINATES"
  | "CONCURRENT_UPDATE";

export interface UnmatchedOrder {
  orderId: string;
  orderNumber: string;
  reason: UnmatchedReason;
}

export interface AutoAssignResult {
  ok: true;
  assignedCount: number;
  unmatchedCount: number;
  pendingRemaining: number;
  availableDriversRemaining: number;
  matches: AssignmentMatch[];
  unmatched: UnmatchedOrder[];
}

export interface DispatchOrdersResponse {
  ok: true;
  orders: LiveOrder[];
  counts: Record<DispatchStatus, number>;
}

export type DispatchRealtimeEvent =
  | {
      type: "order.created";
      orderId: string;
      orderNumber: string;
      source: "whatsapp" | "system";
    }
  | {
      type: "orders.assigned";
      assignedCount: number;
      matches: Array<{
        driverId: string;
        orderId: string;
        orderNumber: string;
      }>;
    }
  | {
      type: "order.delivered";
      orderId: string;
      orderNumber: string;
      driverId: string | null;
    }
  | {
      type: "orders.changed";
    };

export type DispatchStreamEvent = DispatchRealtimeEvent | { type: "connected" };

export interface AutoAssignRequestBody {
  orderId?: string;
}
