import { asFiniteNumber } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const latitude = asFiniteNumber(url.searchParams.get("lat"));
  const longitude = asFiniteNumber(url.searchParams.get("lng"));

  if (
    latitude == null ||
    longitude == null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return Response.json({ ok: false, error: "Invalid coordinates." }, { status: 400 });
  }

  try {
    const nominatim = new URL("https://nominatim.openstreetmap.org/reverse");
    nominatim.searchParams.set("lat", String(latitude));
    nominatim.searchParams.set("lon", String(longitude));
    nominatim.searchParams.set("format", "jsonv2");
    nominatim.searchParams.set("zoom", "18");
    nominatim.searchParams.set("addressdetails", "1");

    const response = await fetch(nominatim.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "ar,en",
        "User-Agent": "SmartDispatch/1.0 (menu-geocode)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json({ ok: true, label: null });
    }

    const body = (await response.json()) as { display_name?: unknown };
    const label = typeof body.display_name === "string" ? body.display_name : null;
    return Response.json({ ok: true, label });
  } catch {
    return Response.json({ ok: true, label: null });
  }
}
