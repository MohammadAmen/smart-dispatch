import { SYNC_API_PATH } from "@/lib/offline/constants";
import {
  deleteActions,
  getFlushableActions,
  markActions,
  putAction,
} from "@/lib/offline/idb";
import type {
  NewDriverAction,
  QueuedAction,
  SyncResponseBody,
} from "@/lib/offline/types";
import { isQueuedAction } from "@/lib/offline/types";

export function isBrowserOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === true;
}

export function createQueuedAction(input: NewDriverAction): QueuedAction {
  return {
    id: crypto.randomUUID(),
    type: input.type,
    entityId: input.entityId,
    payload: input.payload ?? {},
    createdAt: Date.now(),
    attempts: 0,
    queueStatus: "pending",
    lastError: null,
  };
}

export async function persistAction(action: QueuedAction): Promise<void> {
  await putAction(action);
}

export async function postActions(
  actions: QueuedAction[],
): Promise<SyncResponseBody> {
  const response = await fetch(SYNC_API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actions }),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error(`Sync failed (${response.status})`);
  }

  const body: unknown = await response.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("ok" in body) ||
    !Array.isArray((body as SyncResponseBody).syncedIds)
  ) {
    throw new Error("Invalid sync response");
  }

  return body as SyncResponseBody;
}

export async function flushOutbox(): Promise<{
  synced: number;
  failed: number;
}> {
  const pending = await getFlushableActions();
  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const ids = pending.map((action) => action.id);
  await markActions(ids, { queueStatus: "syncing" });

  try {
    const result = await postActions(pending);
    await deleteActions(result.syncedIds);

    const failedIds =
      result.failedIds.length > 0
        ? result.failedIds
        : ids.filter((id) => !result.syncedIds.includes(id));

    await markActions(failedIds, {
      queueStatus: "failed",
      lastError: "Server rejected action",
    });

    return { synced: result.syncedIds.length, failed: failedIds.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    await markActions(ids, {
      queueStatus: "failed",
      attempts: pending[0].attempts + 1,
      lastError: message,
    });
    throw error;
  }
}

export function parseQueuedList(value: unknown): QueuedAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isQueuedAction);
}
