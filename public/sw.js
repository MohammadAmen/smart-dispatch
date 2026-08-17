/* Smart Dispatch outbox SW — keep IDB names in sync with src/lib/offline/constants.ts */
const DB_NAME = "sd-offline";
const DB_VERSION = 1;
const STORE = "outbox";
const SYNC_TAG = "sd-outbox";
const SYNC_API = "/api/sync";
const MSG_FLUSHED = "OUTBOX_FLUSHED";
const MSG_FLUSH = "FLUSH_OUTBOX";
const MSG_PLEASE_FLUSH = "PLEASE_FLUSH";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushOutboxFromWorker());
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === MSG_FLUSH) {
    event.waitUntil(flushOutboxFromWorker());
  }
});

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("queueStatus", "queueStatus");
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readFlushable(db) {
  const tx = db.transaction(STORE, "readonly");
  const rows = await idbRequest(tx.objectStore(STORE).getAll());
  return rows
    .filter((row) => row.queueStatus === "pending" || row.queueStatus === "failed")
    .sort((left, right) => left.createdAt - right.createdAt);
}

async function deleteIds(db, ids) {
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  await Promise.all(ids.map((id) => idbRequest(store.delete(id))));
}

async function notifyClients(payload) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of clients) {
    client.postMessage(payload);
  }
}

async function flushOutboxFromWorker() {
  const windowClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  if (windowClients.length > 0) {
    await notifyClients({ type: MSG_PLEASE_FLUSH });
    return;
  }

  const db = await openDb();
  const pending = await readFlushable(db);

  if (pending.length === 0) {
    db.close();
    return;
  }

  const response = await fetch(SYNC_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actions: pending }),
  });

  if (!response.ok) {
    db.close();
    throw new Error("Outbox sync failed");
  }

  const body = await response.json();
  const syncedIds = Array.isArray(body.syncedIds) ? body.syncedIds : [];
  await deleteIds(db, syncedIds);
  db.close();

  await notifyClients({
    type: MSG_FLUSHED,
    count: syncedIds.length,
  });
}
