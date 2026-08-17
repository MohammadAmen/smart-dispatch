import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  type SessionPayload,
  type SessionRole,
} from "@/lib/auth/constants";
import { decodeSession } from "@/lib/auth/session-cookie";

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

export async function requireRoles(
  roles: SessionRole[],
): Promise<SessionPayload | NextResponse> {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  if (!roles.includes(session.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  return session;
}

export function isSession(
  value: SessionPayload | NextResponse,
): value is SessionPayload {
  return "sub" in value && "role" in value;
}
