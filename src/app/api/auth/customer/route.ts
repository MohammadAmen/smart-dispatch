import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import { readPhoneSessionUser, upsertCustomerByPhone } from "@/lib/auth/customer-profile";
import { encodeSession } from "@/lib/auth/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function GET(): Promise<Response> {
  const user = await readPhoneSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
  });
}

export async function POST(request: Request): Promise<Response> {
  let name = "";
  let phone = "";
  try {
    const body = (await request.json()) as { name?: unknown; phone?: unknown };
    name = typeof body.name === "string" ? body.name : "";
    phone = typeof body.phone === "string" ? body.phone : "";
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  try {
    const result = await upsertCustomerByPhone(name, phone);
    if (!result.ok) {
      const status = result.error === "staff-phone" ? 409 : 400;
      return NextResponse.json({ ok: false, error: result.error }, { status });
    }

    const token = await encodeSession({
      sub: result.user.id,
      role: result.user.role,
      name: result.user.name,
    });

    return sessionCookie(
      NextResponse.json({
        ok: true,
        user: {
          id: result.user.id,
          name: result.user.name,
          phone: result.user.phone,
          role: result.user.role,
        },
      }),
      token,
    );
  } catch {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
}
