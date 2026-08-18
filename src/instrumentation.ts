export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const { startWhatsAppBaileys } = await import("./lib/whatsapp/baileys-service");
  void startWhatsAppBaileys();
}
