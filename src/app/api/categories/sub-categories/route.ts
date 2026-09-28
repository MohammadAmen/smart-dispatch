import { listNearbySubCategories } from "@/lib/stores/global-categories-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCoord(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const mainCategoryId =
      searchParams.get("mainCategoryId") ??
      searchParams.get("categoryType") ??
      searchParams.get("typeId") ??
      "ALL";
    const lat = parseCoord(searchParams.get("lat"));
    const lng = parseCoord(searchParams.get("lng"));
    const radiusRaw = searchParams.get("radiusKm");
    const radiusKm = radiusRaw ? Number.parseFloat(radiusRaw) : undefined;

    const feed = await listNearbySubCategories({
      mainCategoryId,
      lat,
      lng,
      radiusKm: Number.isFinite(radiusKm) ? radiusKm : undefined,
    });

    return Response.json(
      { ok: true, ...feed },
      {
        headers: {
          "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40",
        },
      },
    );
  } catch (error) {
    console.error("[categories/sub-categories]", error);
    return Response.json({ ok: false, items: [] }, { status: 500 });
  }
}
