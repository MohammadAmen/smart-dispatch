import { NextResponse } from "next/server";

import { loadUpload } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const file = await loadUpload(id);
  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
