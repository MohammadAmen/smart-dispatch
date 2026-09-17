import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminStoriesBoard } from "@/components/stores/admin-stories-board";
import { isSuperAdminRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import { listAdminStories } from "@/lib/stores/story-service";

export const dynamic = "force-dynamic";

export default async function AdminStoriesPage(): Promise<ReactNode> {
  const session = await readSession();
  if (!session || !isSuperAdminRole(session.role)) {
    redirect("/login");
  }

  const stories = await listAdminStories();
  return <AdminStoriesBoard stories={stories} />;
}
