"use client";

import { create } from "zustand";

import {
  createQueuedAction,
  flushOutbox,
  isBrowserOnline,
  persistAction,
} from "@/lib/offline/sync";
import { getAllActions } from "@/lib/offline/idb";
import { registerOutboxSync } from "@/lib/offline/register-sync";
import type { NewDriverAction, QueuedAction } from "@/lib/offline/types";
import { useToastStore } from "@/stores/toast-store";

interface SyncState {
  queue: QueuedAction[];
  isHydrated: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  hydrate: () => Promise<void>;
  enqueue: (input: NewDriverAction) => Promise<QueuedAction>;
  flush: (announce?: boolean) => Promise<void>;
}

function pendingCount(queue: QueuedAction[]): number {
  return queue.filter(
    (action) =>
      action.queueStatus === "pending" ||
      action.queueStatus === "failed" ||
      action.queueStatus === "syncing",
  ).length;
}

export const useSyncStore = create<SyncState>()((set, get) => ({
  queue: [],
  isHydrated: false,
  isSyncing: false,
  lastSyncedAt: null,

  hydrate: async () => {
    const queue = await getAllActions();
    set({ queue, isHydrated: true });
  },

  enqueue: async (input) => {
    const action = createQueuedAction(input);
    await persistAction(action);
    set((state) => ({ queue: [...state.queue, action] }));

    if (navigator.onLine === false) {
      useToastStore.getState().push({
        kind: "queued",
        entityId: action.entityId,
        actionType: action.type,
      });
      await registerOutboxSync();
      return action;
    }

    await get().flush(false);
    return action;
  },

  flush: async (announce = true) => {
    if (!isBrowserOnline() || get().isSyncing) {
      return;
    }

    set({ isSyncing: true });
    let drainAgain = false;

    try {
      const snapshot = await getAllActions();
      const open = pendingCount(snapshot);
      if (open === 0) {
        set({ queue: snapshot, isHydrated: true });
        return;
      }

      set({ queue: snapshot });
      if (announce) {
        useToastStore.getState().push({ kind: "syncing" });
      }

      const result = await flushOutbox();
      const queue = await getAllActions();
      set({
        queue,
        isHydrated: true,
        lastSyncedAt: Date.now(),
      });

      if (result.synced > 0) {
        useToastStore.getState().push({
          kind: "synced",
          count: result.synced,
        });
      }

      if (result.failed > 0) {
        useToastStore.getState().push({ kind: "error" });
      }

      drainAgain = result.synced > 0 && pendingCount(queue) > 0;
    } catch {
      const queue = await getAllActions();
      set({ queue, isHydrated: true });
      useToastStore.getState().push({ kind: "error" });
      await registerOutboxSync();
    } finally {
      set({ isSyncing: false });
    }

    if (drainAgain) {
      await get().flush(false);
    }
  },
}));

export function selectPendingCount(state: SyncState): number {
  return pendingCount(state.queue);
}

export function latestQueuedStatus(
  queue: QueuedAction[],
  entityId: string,
): QueuedAction | undefined {
  return [...queue]
    .filter((action) => action.entityId === entityId)
    .sort((left, right) => right.createdAt - left.createdAt)[0];
}
