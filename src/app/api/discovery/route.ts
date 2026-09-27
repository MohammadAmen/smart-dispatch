import { getDiscoveryFeed } from "@/lib/stores/discovery-service";

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
    const category = searchParams.get("category") ?? searchParams.get("typeId") ?? "ALL";
    const lat = parseCoord(searchParams.get("lat") ?? searchParams.get("userLat"));
    const lng = parseCoord(searchParams.get("lng") ?? searchParams.get("userLng"));

    const feed = await getDiscoveryFeed({ category, lat, lng });

    return Response.json({
      ok: true,
      category: category.trim() || "ALL",
      userLocation: lat != null && lng != null ? { lat, lng } : null,
      ...feed,
    });
  } catch (error) {
    console.error("[discovery]", error);
    return Response.json(
      {
        ok: false,
        trending: [],
        deals: [],
        newArrivals: [],
        curated: [],
      },
      { status: 500 },
    );
  }
}
