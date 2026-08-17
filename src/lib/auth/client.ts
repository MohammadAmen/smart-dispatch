import type { SessionRole } from "@/lib/auth/constants";

export interface SessionUser {
  id: string;
  name: string;
  role: SessionRole;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = (await readJson(response)) as
      | { ok: true; user: SessionUser }
      | { ok: false; error?: string }
      | null;

    if (!body || body.ok !== true) {
      return {
        ok: false,
        error: body && "error" in body && body.error ? body.error : "Invalid credentials.",
      };
    }

    return body;
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}

export async function logoutRequest(): Promise<void> {
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } catch {
    // Cookie clear is best-effort; the login screen still works.
  }
}

export async function fetchSession(): Promise<SessionUser | null> {
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const body = (await readJson(response)) as { ok?: boolean; user?: SessionUser } | null;
    if (!body?.ok || !body.user) {
      return null;
    }

    return body.user;
  } catch {
    return null;
  }
}
