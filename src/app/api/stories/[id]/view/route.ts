import { NextResponse } from "next/server";

import { incrementStoryView } from "@/lib/stores/story-service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const viewsCount = await incrementStoryView(id);
    if (viewsCount == null) {
      return NextResponse.json({ ok: false, error: "Story expired." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, viewsCount });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed." },
      { status: 500 },
    );
  }
}
