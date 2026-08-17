export const DRIVER_ACTION_TYPES = [
  "ORDER_DELIVERED",
  "ORDER_IN_TRANSIT",
  "ORDER_ASSIGNED",
  "ORDER_CANCELED",
  "DRIVER_AVAILABLE",
  "DRIVER_BUSY",
  "DRIVER_OFFLINE",
] as const;

export type DriverActionType = (typeof DRIVER_ACTION_TYPES)[number];

export type OutboxStatus = "pending" | "syncing" | "failed";

export type ActionPayload = Record<string, string | number | boolean | null>;

export interface QueuedAction {
  id: string;
  type: DriverActionType;
  entityId: string;
  payload: ActionPayload;
  createdAt: number;
  attempts: number;
  queueStatus: OutboxStatus;
  lastError: string | null;
}

export interface NewDriverAction {
  type: DriverActionType;
  entityId: string;
  payload?: ActionPayload;
}

export interface SyncRequestBody {
  actions: QueuedAction[];
}

export interface SyncResponseBody {
  ok: boolean;
  syncedIds: string[];
  failedIds: string[];
  persisted: boolean;
}

export function isDriverActionType(value: unknown): value is DriverActionType {
  return (
    typeof value === "string" &&
    (DRIVER_ACTION_TYPES as readonly string[]).includes(value)
  );
}

export function isQueuedAction(value: unknown): value is QueuedAction {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === "string" &&
    isDriverActionType(record.type) &&
    typeof record.entityId === "string" &&
    typeof record.payload === "object" &&
    record.payload !== null &&
    typeof record.createdAt === "number" &&
    typeof record.attempts === "number" &&
    (record.queueStatus === "pending" ||
      record.queueStatus === "syncing" ||
      record.queueStatus === "failed")
  );
}
