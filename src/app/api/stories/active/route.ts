import { NextRequest, NextResponse } from "next/server";

import { listActiveStoryStores } from "@/lib/stores/story-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const guestKey =
      request.headers.get("x-story-guest")?.trim() ||
      request.nextUrl.searchParams.get("guest")?.trim() ||
      "";
    const stores = await listActiveStoryStores(guestKey);
    return NextResponse.json({ ok: true, stores });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed." },
      { status: 500 },
    );
  }
}
