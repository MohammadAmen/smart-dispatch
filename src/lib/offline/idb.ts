import {
  OFFLINE_DB_NAME,
  OFFLINE_DB_VERSION,
  OUTBOX_STORE,
} from "@/lib/offline/constants";
import type { QueuedAction } from "@/lib/offline/types";
import { isQueuedAction } from "@/lib/offline/types";

function openOutbox(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const store = db.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
        store.createIndex("queueStatus", "queueStatus");
        store.createIndex("createdAt", "createdAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () =>
      reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export async function putAction(action: QueuedAction): Promise<void> {
  const db = await openOutbox();
  const tx = db.transaction(OUTBOX_STORE, "readwrite");
  tx.objectStore(OUTBOX_STORE).put(action);
  await transactionDone(tx);
  db.close();
}

export async function getAllActions(): Promise<QueuedAction[]> {
  const db = await openOutbox();
  const tx = db.transaction(OUTBOX_STORE, "readonly");
  const rows = await requestToPromise(tx.objectStore(OUTBOX_STORE).getAll());
  db.close();

  return rows.filter(isQueuedAction);
}

export async function getFlushableActions(): Promise<QueuedAction[]> {
  const actions = await getAllActions();
  return actions
    .filter(
      (action) =>
        action.queueStatus === "pending" || action.queueStatus === "failed",
    )
    .sort((left, right) => left.createdAt - right.createdAt);
}

export async function deleteActions(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const db = await openOutbox();
  const tx = db.transaction(OUTBOX_STORE, "readwrite");
  const store = tx.objectStore(OUTBOX_STORE);
  for (const id of ids) {
    store.delete(id);
  }
  await transactionDone(tx);
  db.close();
}

export async function markActions(
  ids: string[],
  patch: Partial<Pick<QueuedAction, "queueStatus" | "attempts" | "lastError">>,
): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const wanted = new Set(ids);
  const current = await getAllActions();
  const db = await openOutbox();
  const tx = db.transaction(OUTBOX_STORE, "readwrite");
  const store = tx.objectStore(OUTBOX_STORE);

  for (const action of current) {
    if (!wanted.has(action.id)) {
      continue;
    }

    store.put({
      ...action,
      queueStatus: patch.queueStatus ?? action.queueStatus,
      attempts: patch.attempts ?? action.attempts,
      lastError:
        patch.lastError === undefined ? action.lastError : patch.lastError,
    });
  }

  await transactionDone(tx);
  db.close();
}
