import { FleetBoard } from "@/components/fleet/fleet-board";
import { listFleetVehicles } from "@/lib/fleet/service";

export const dynamic = "force-dynamic";

export default async function FleetPage() {
  try {
    const vehicles = await listFleetVehicles();
    return <FleetBoard initialVehicles={vehicles} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load fleet.";
    return <FleetBoard initialVehicles={[]} error={message} />;
  }
}
