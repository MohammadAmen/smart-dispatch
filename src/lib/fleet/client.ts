import type {
  FleetListResponse,
  FleetVehicle,
  VehicleCreateInput,
  VehicleDeleteResult,
  VehiclePatchInput,
  VehicleStatus,
} from "@/lib/fleet/types";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function fleetErrorMessage(error: string): string {
  if (error.includes("already registered")) {
    return "fleet.plateTaken";
  }
  if (error.includes("Invalid or inactive zone")) {
    return "fleet.invalidZone";
  }
  if (error.includes("Invalid or inactive vehicle type")) {
    return "fleet.invalidType";
  }
  if (error.includes("Capacity must be greater")) {
    return "fleet.invalidCapacity";
  }
  if (error.includes("Model is required")) {
    return "fleet.invalidModel";
  }
  if (error.includes("not found")) {
    return "fleet.notFound";
  }
  return error;
}

export async function fetchFleetVehicles(): Promise<FleetVehicle[] | null> {
  try {
    const response = await fetch("/api/fleet", { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const body = (await readJson(response)) as FleetListResponse | null;
    if (!body?.ok || !Array.isArray(body.vehicles)) {
      return null;
    }

    return body.vehicles;
  } catch {
    return null;
  }
}

export async function createFleetVehicleRequest(
  input: VehicleCreateInput,
): Promise<{ ok: true; vehicle: FleetVehicle } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/fleet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = (await readJson(response)) as
      | { ok: true; vehicle: FleetVehicle }
      | { ok: false; error?: string }
      | null;

    if (!body || body.ok !== true) {
      return {
        ok: false,
        error: body && "error" in body && body.error ? body.error : "Could not create vehicle.",
      };
    }

    return body;
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}

export async function updateFleetVehicleRequest(
  id: string,
  patch: VehiclePatchInput,
): Promise<{ ok: true; vehicle: FleetVehicle } | { ok: false; error: string }> {
  try {
    const response = await fetch(`/api/fleet/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = (await readJson(response)) as
      | { ok: true; vehicle: FleetVehicle }
      | { ok: false; error?: string }
      | null;

    if (!body || body.ok !== true) {
      return {
        ok: false,
        error: body && "error" in body && body.error ? body.error : "Could not update vehicle.",
      };
    }

    return body;
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}

export async function patchFleetVehicle(
  id: string,
  patch: { status?: VehicleStatus; zone?: string; zoneId?: string; driverId?: string | null },
): Promise<FleetVehicle | null> {
  const result = await updateFleetVehicleRequest(id, patch);
  return result.ok ? result.vehicle : null;
}

export async function deleteFleetVehicleRequest(
  id: string,
): Promise<{ ok: true; result: VehicleDeleteResult; message: string } | { ok: false; error: string }> {
  try {
    const response = await fetch(`/api/fleet/${id}`, { method: "DELETE" });
    const body = (await readJson(response)) as
      | (VehicleDeleteResult & { ok: true; message?: string })
      | { ok: false; error?: string }
      | null;

    if (!body || body.ok !== true) {
      return {
        ok: false,
        error: body && "error" in body && body.error ? body.error : "Could not delete vehicle.",
      };
    }

    return {
      ok: true,
      message: body.message ?? "Vehicle deleted.",
      result: {
        id: body.id,
        deleted: body.deleted,
        deactivated: body.deactivated,
        unassignedDriver: body.unassignedDriver,
        driverName: body.driverName,
        plateNumber: body.plateNumber,
        vehicle: body.vehicle,
      },
    };
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}
