import type { ReactNode } from "react";

import { VendorOrdersBoard } from "@/components/stores/vendor-orders-board";
import { loadVendorOrders } from "@/lib/stores/vendor-access";
import {
  parseVendorOrderPage,
  parseVendorOrderSource,
  parseVendorOrderStatus,
} from "@/lib/stores/vendor-order-query";

export const dynamic = "force-dynamic";

export default async function VendorOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; orderSource?: string }>;
}): Promise<ReactNode> {
  const query = await searchParams;
  const { store, products, page } = await loadVendorOrders("/login", {
    page: parseVendorOrderPage(query.page),
    status: parseVendorOrderStatus(query.status),
    orderSource: parseVendorOrderSource(query.orderSource),
  });
  return (
    <VendorOrdersBoard
      store={store}
      products={products}
      orders={page?.orders ?? []}
      quotes={page?.quotes ?? []}
      prepAlerts={page?.prepAlerts ?? []}
      total={page?.total ?? 0}
      page={page?.page ?? 1}
      pageSize={page?.pageSize ?? 30}
      counts={page?.counts}
      channelCounts={page?.channelCounts}
      status={parseVendorOrderStatus(query.status)}
      orderSource={parseVendorOrderSource(query.orderSource)}
    />
  );
}
