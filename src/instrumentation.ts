export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const { startWhatsAppBaileys } = await import("./lib/whatsapp/baileys-service");
  void startWhatsAppBaileys();

  const globalTimer = globalThis as typeof globalThis & {
    __sdScheduledDispatch?: ReturnType<typeof setInterval>;
    __sdAutoAssign?: ReturnType<typeof setInterval>;
  };
  if (!globalTimer.__sdScheduledDispatch) {
    const tick = (): void => {
      void import("./lib/dispatch/scheduled-dispatch")
        .then((mod) => mod.runScheduledDispatch())
        .catch(() => undefined);
    };
    globalTimer.__sdScheduledDispatch = setInterval(tick, 60_000);
    tick();
  }
  if (!globalTimer.__sdAutoAssign) {
    const assignTick = (): void => {
      void import("./lib/dispatch/auto-assign")
        .then((mod) => mod.runAutoAssign())
        .catch(() => undefined);
    };
    globalTimer.__sdAutoAssign = setInterval(assignTick, 12_000);
    assignTick();
  }
}
