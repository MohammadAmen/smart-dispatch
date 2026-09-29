import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { StaffOrdersDesk } from "@/components/dispatch/staff-orders-desk";
import { isDispatchRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import { listStaffOrders, type StaffOrderRecord } from "@/lib/dispatch/staff-orders";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<ReactNode> {
  const session = await readSession();
  if (!session || !isDispatchRole(session.role)) {
    redirect("/login");
  }

  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  let orders: StaffOrderRecord[] = [];
  let failed = false;

  try {
    orders = await listStaffOrders(query);
  } catch {
    failed = true;
  }

  return <StaffOrdersDesk orders={orders} query={query} failed={failed} />;
}
