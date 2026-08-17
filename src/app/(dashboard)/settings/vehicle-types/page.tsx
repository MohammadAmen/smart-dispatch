import { VehicleTypesBoard } from "@/components/catalog/vehicle-types-board";
import { listVehicleTypes } from "@/lib/catalog/vehicle-types";

export const dynamic = "force-dynamic";

export default async function VehicleTypesPage() {
  try {
    const types = await listVehicleTypes();
    return <VehicleTypesBoard initialTypes={types} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load vehicle types.";
    return <VehicleTypesBoard initialTypes={[]} error={message} />;
  }
}
