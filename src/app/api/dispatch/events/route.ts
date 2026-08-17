import { subscribeDispatchEvents } from "@/lib/dispatch/events";
import type { DispatchRealtimeEvent } from "@/lib/dispatch/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

function encodeEvent(event: DispatchRealtimeEvent | { type: "connected" }): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function GET(): Promise<Response> {
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encodeEvent({ type: "connected" }));

      unsubscribe = subscribeDispatchEvents((event) => {
        try {
          controller.enqueue(encodeEvent(event));
        } catch {
          unsubscribe?.();
        }
      });

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          if (heartbeat) {
            clearInterval(heartbeat);
          }
        }
      }, 20_000);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) {
        clearInterval(heartbeat);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
