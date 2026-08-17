import { getAnalyticsPayload } from "@/lib/analytics/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const locale = new URL(request.url).searchParams.get("locale") ?? "ar";
  const safeLocale = locale === "en" ? "en" : "ar";

  try {
    const payload = await getAnalyticsPayload(safeLocale);
    return Response.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load analytics.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
