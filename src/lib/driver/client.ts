import type {
  DriverPatchBody,
  DriverSessionResponse,
} from "@/lib/driver/types";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchDriverSession(
  driverId?: string | null,
): Promise<DriverSessionResponse | null> {
  try {
    const query = driverId ? `?driverId=${encodeURIComponent(driverId)}` : "";
    const response = await fetch(`/api/driver${query}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const body = (await readJson(response)) as DriverSessionResponse | null;
    if (!body || body.ok !== true) {
      return null;
    }

    return body;
  } catch {
    return null;
  }
}

export async function patchDriver(body: DriverPatchBody): Promise<boolean> {
  try {
    const response = await fetch("/api/driver", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });

    return response.ok;
  } catch {
    return false;
  }
}
