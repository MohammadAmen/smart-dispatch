import { NextResponse } from "next/server";

import { DEMO_PASSWORD, SESSION_COOKIE } from "@/lib/auth/constants";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { encodeSession } from "@/lib/auth/session-cookie";
import { bootstrapDispatchData } from "@/lib/dispatch/bootstrap";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

export async function POST(request: Request): Promise<Response> {
  let email = "";
  let password = "";

  try {
    const body = asRecord(await request.json());
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email and password are required." }, { status: 400 });
  }

  try {
    await bootstrapDispatchData();
  } catch {
    // Login can still succeed against existing users.
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true, passwordHash: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 });
  }

  const passwordOk = user.passwordHash
    ? verifyPassword(password, user.passwordHash)
    : password === DEMO_PASSWORD;

  if (!passwordOk) {
    return NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 });
  }

  if (!user.passwordHash) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password) },
    });
  }

  const token = await encodeSession({
    sub: user.id,
    role: user.role,
    name: user.name,
  });

  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, role: user.role },
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
