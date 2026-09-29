import { NextResponse } from "next/server";

import { readPhoneSessionUser } from "@/lib/auth/customer-profile";
import { prisma } from "@/lib/db";
import type { PushAudience } from "@/lib/notifications/channels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asAudience(value: unknown, role: string): PushAudience {
  if (value === "driver" && role === "DRIVER") {
    return "driver";
  }
  return "customer";
}

export async function POST(request: Request): Promise<Response> {
  const user = await readPhoneSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let token = "";
  let audience: unknown;
  try {
    const body = (await request.json()) as { token?: unknown; audience?: unknown };
    token = typeof body.token === "string" ? body.token.trim() : "";
    audience = body.audience;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  if (token.length < 20 || token.length > 4096) {
    return NextResponse.json({ ok: false, error: "Invalid token." }, { status: 400 });
  }

  await prisma.user.updateMany({
    where: { fcmToken: token, NOT: { id: user.id } },
    data: { fcmToken: null },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { fcmToken: token },
  });

  return NextResponse.json({
    ok: true,
    audience: asAudience(audience, user.role),
  });
}
