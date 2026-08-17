import { UsersBoard } from "@/components/users/users-board";
import { listFleetVehicles } from "@/lib/fleet/service";
import { listManagedUsers } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  try {
    const [users, vehicles] = await Promise.all([
      listManagedUsers(),
      listFleetVehicles(),
    ]);
    return <UsersBoard initialUsers={users} initialVehicles={vehicles} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load users.";
    return <UsersBoard initialUsers={[]} initialVehicles={[]} error={message} />;
  }
}
