import { NextResponse } from "next/server";

import { loadUpload } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null {
  if (!header || size <= 0) {
    return null;
  }
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match) {
    return null;
  }
  const startRaw = match[1];
  const endRaw = match[2];
  if (!startRaw && !endRaw) {
    return null;
  }

  let start = startRaw ? Number.parseInt(startRaw, 10) : 0;
  let end = endRaw ? Number.parseInt(endRaw, 10) : size - 1;

  if (!startRaw && endRaw) {
    // suffix: last N bytes
    const suffix = Number.parseInt(endRaw, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) {
      return null;
    }
    start = Math.max(0, size - suffix);
    end = size - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) {
    return null;
  }

  end = Math.min(end, size - 1);
  if (start >= size) {
    return null;
  }

  return { start, end };
}

export async function HEAD(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const file = await loadUpload(id);
  if (!file) {
    return new NextResponse(null, { status: 404 });
  }

  const size = file.bytes.byteLength;
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Content-Length": String(size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const file = await loadUpload(id);
  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  const size = file.bytes.byteLength;
  const baseHeaders: Record<string, string> = {
    "Content-Type": file.mimeType || "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };

  const range = parseRange(request.headers.get("range"), size);
  if (!range) {
    return new NextResponse(Buffer.from(file.bytes), {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Length": String(size),
      },
    });
  }

  if (range.start >= size) {
    return new NextResponse(null, {
      status: 416,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes */${size}`,
      },
    });
  }

  const length = range.end - range.start + 1;
  const slice = file.bytes.subarray(range.start, range.end + 1);

  return new NextResponse(Buffer.from(slice), {
    status: 206,
    headers: {
      ...baseHeaders,
      "Content-Length": String(length),
      "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
    },
  });
}
