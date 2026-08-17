import type { ManagedUser, UsersListResponse, UserWriteInput } from "@/lib/users/types";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchManagedUsers(): Promise<ManagedUser[] | null> {
  try {
    const response = await fetch("/api/users", { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const body = (await readJson(response)) as UsersListResponse | null;
    if (!body?.ok || !Array.isArray(body.users)) {
      return null;
    }

    return body.users;
  } catch {
    return null;
  }
}

export async function createManagedUserRequest(
  input: UserWriteInput,
): Promise<{ ok: true; user: ManagedUser } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = (await readJson(response)) as
      | { ok: true; user: ManagedUser }
      | { ok: false; error?: string }
      | null;

    if (!body || body.ok !== true) {
      return { ok: false, error: body && "error" in body && body.error ? body.error : "Save failed." };
    }

    return body;
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}

export async function updateManagedUserRequest(
  id: string,
  input: Partial<UserWriteInput>,
): Promise<{ ok: true; user: ManagedUser } | { ok: false; error: string }> {
  try {
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = (await readJson(response)) as
      | { ok: true; user: ManagedUser }
      | { ok: false; error?: string }
      | null;

    if (!body || body.ok !== true) {
      return { ok: false, error: body && "error" in body && body.error ? body.error : "Save failed." };
    }

    return body;
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}

export async function deleteManagedUserRequest(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const body = (await readJson(response)) as { ok?: boolean; error?: string } | null;
    if (!response.ok || !body?.ok) {
      return { ok: false, error: body?.error ?? "Delete failed." };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}
