import type { RouteListResponse, RouteOptimizeResult, SerializedRoute } from "@/lib/routes/types";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchRoutes(): Promise<SerializedRoute[] | null> {
  try {
    const response = await fetch("/api/routes", { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const body = (await readJson(response)) as RouteListResponse | null;
    if (!body?.ok || !Array.isArray(body.routes)) {
      return null;
    }

    return body.routes;
  } catch {
    return null;
  }
}

export async function postOptimizeRoutes(): Promise<RouteOptimizeResult | null> {
  try {
    const response = await fetch("/api/routes/optimize", { method: "POST" });
    if (!response.ok) {
      return null;
    }

    const body = (await readJson(response)) as RouteOptimizeResult | null;
    if (!body || body.ok !== true) {
      return null;
    }

    return body;
  } catch {
    return null;
  }
}
