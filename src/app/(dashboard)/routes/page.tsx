import { RoutesBoard } from "@/components/routes/routes-board";
import { listRoutes } from "@/lib/routes/optimize";

export const dynamic = "force-dynamic";

export default async function RoutesPage() {
  try {
    const routes = await listRoutes();
    return <RoutesBoard initialRoutes={routes} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load routes.";
    return <RoutesBoard initialRoutes={[]} error={message} />;
  }
}
