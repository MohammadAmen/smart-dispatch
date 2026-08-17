import { ZonesBoard } from "@/components/catalog/zones-board";
import { listZones } from "@/lib/catalog/zones";

export const dynamic = "force-dynamic";

export default async function ZonesPage() {
  try {
    const zones = await listZones();
    return <ZonesBoard initialZones={zones} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load zones.";
    return <ZonesBoard initialZones={[]} error={message} />;
  }
}
