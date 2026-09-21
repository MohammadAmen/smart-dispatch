import "server-only";

export function queueAutoAssign(orderId?: string): void {
  void import("@/lib/dispatch/auto-assign")
    .then((mod) => mod.runAutoAssign(orderId ? { orderId } : {}))
    .catch(() => undefined);
}
