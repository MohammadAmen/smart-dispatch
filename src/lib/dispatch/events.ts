import "server-only";

import type { DispatchRealtimeEvent } from "@/lib/dispatch/types";

type Listener = (event: DispatchRealtimeEvent) => void;

const globalForDispatch = globalThis as typeof globalThis & {
  __dispatchListeners?: Set<Listener>;
};

function listeners(): Set<Listener> {
  if (!globalForDispatch.__dispatchListeners) {
    globalForDispatch.__dispatchListeners = new Set<Listener>();
  }

  return globalForDispatch.__dispatchListeners;
}

export function subscribeDispatchEvents(listener: Listener): () => void {
  const set = listeners();
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

export function publishDispatchEvent(event: DispatchRealtimeEvent): void {
  for (const listener of listeners()) {
    listener(event);
  }
}
