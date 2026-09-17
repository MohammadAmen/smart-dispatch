import { NextRequest, NextResponse } from "next/server";

import { readSession } from "@/lib/auth/server";
import { toggleStoryLike } from "@/lib/stores/story-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const guestKey =
      request.headers.get("x-story-guest")?.trim() ||
      request.nextUrl.searchParams.get("guest")?.trim() ||
      "";
    const session = await readSession();
    const result = await toggleStoryLike(id, guestKey, session?.sub ?? null);
    if (!result) {
      return NextResponse.json({ ok: false, error: "Story expired." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed." },
      { status: 400 },
    );
  }
}
