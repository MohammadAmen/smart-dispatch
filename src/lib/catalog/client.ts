import type {
  CatalogListsResponse,
  CatalogVehicleType,
  DeliveryZone,
  VehicleTypeWriteInput,
  ZoneWriteInput,
} from "@/lib/catalog/types";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchCatalogLists(
  activeOnly = false,
): Promise<{ zones: DeliveryZone[]; vehicleTypes: CatalogVehicleType[] } | null> {
  try {
    const query = activeOnly ? "?active=1" : "";
    const response = await fetch(`/api/catalog${query}`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const body = (await readJson(response)) as CatalogListsResponse | null;
    if (!body?.ok) {
      return null;
    }

    return { zones: body.zones, vehicleTypes: body.vehicleTypes };
  } catch {
    return null;
  }
}

async function mutate<T>(
  url: string,
  method: string,
  body?: unknown,
): Promise<{ ok: true; item: T } | { ok: false; error: string }> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await readJson(response)) as
      | { ok: true; zone?: T; vehicleType?: T }
      | { ok: false; error?: string }
      | null;

    if (!payload || payload.ok !== true) {
      return {
        ok: false,
        error: payload && "error" in payload && payload.error ? payload.error : "Request failed.",
      };
    }

    const success = payload as { ok: true; zone?: T; vehicleType?: T };
    const item = success.zone ?? success.vehicleType;
    if (!item) {
      return { ok: false, error: "Request failed." };
    }

    return { ok: true, item };
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}

export async function createZoneRequest(input: ZoneWriteInput) {
  return mutate<DeliveryZone>("/api/zones", "POST", input);
}

export async function updateZoneRequest(id: string, input: Partial<ZoneWriteInput>) {
  return mutate<DeliveryZone>(`/api/zones/${id}`, "PATCH", input);
}

export async function deleteZoneRequest(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(`/api/zones/${id}`, { method: "DELETE" });
    const body = (await readJson(response)) as { ok?: boolean; error?: string } | null;
    if (!response.ok || !body?.ok) {
      return { ok: false, error: body?.error ?? "Delete failed." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}

export async function createVehicleTypeRequest(input: VehicleTypeWriteInput) {
  return mutate<CatalogVehicleType>("/api/vehicle-types", "POST", input);
}

export async function updateVehicleTypeRequest(
  id: string,
  input: Partial<VehicleTypeWriteInput>,
) {
  return mutate<CatalogVehicleType>(`/api/vehicle-types/${id}`, "PATCH", input);
}

export async function deleteVehicleTypeRequest(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(`/api/vehicle-types/${id}`, { method: "DELETE" });
    const body = (await readJson(response)) as { ok?: boolean; error?: string } | null;
    if (!response.ok || !body?.ok) {
      return { ok: false, error: body?.error ?? "Delete failed." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}
