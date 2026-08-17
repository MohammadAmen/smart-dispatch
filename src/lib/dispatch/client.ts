import type { LiveOrder } from "@/lib/live-map";
import type {
  AutoAssignResult,
  DispatchOrdersResponse,
  DispatchStreamEvent,
} from "@/lib/dispatch/types";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchDispatchOrders(): Promise<LiveOrder[] | null> {
  try {
    const response = await fetch("/api/dispatch/orders", {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const body = (await readJson(response)) as DispatchOrdersResponse | null;
    if (!body || !body.ok || !Array.isArray(body.orders)) {
      return null;
    }

    return body.orders;
  } catch {
    return null;
  }
}

export async function postAutoAssign(orderId?: string): Promise<AutoAssignResult | null> {
  try {
    const response = await fetch("/api/dispatch/auto-assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderId ? { orderId } : {}),
    });

    if (!response.ok) {
      return null;
    }

    const body = (await readJson(response)) as AutoAssignResult | null;
    if (!body || body.ok !== true) {
      return null;
    }

    return body;
  } catch {
    return null;
  }
}

export function isDispatchStreamEvent(value: unknown): value is DispatchStreamEvent {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  const type = (value as { type: unknown }).type;
  return (
    type === "connected" ||
    type === "order.created" ||
    type === "orders.assigned" ||
    type === "order.delivered" ||
    type === "orders.changed"
  );
}

export function subscribeDispatchStream(
  onEvent: (event: DispatchStreamEvent) => void,
): () => void {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return () => undefined;
  }

  const source = new EventSource("/api/dispatch/events");
  source.onmessage = (message: MessageEvent<string>) => {
    try {
      const parsed: unknown = JSON.parse(message.data);
      if (isDispatchStreamEvent(parsed)) {
        if (parsed.type === "orders.assigned") {
          onEvent({
            ...parsed,
            matches: Array.isArray(parsed.matches) ? parsed.matches : [],
          });
          return;
        }

        onEvent(parsed);
      }
    } catch {
      // Ignore malformed frames; heartbeats are comments and never reach here.
    }
  };

  return () => {
    source.close();
  };
}
