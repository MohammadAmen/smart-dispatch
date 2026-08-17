"use client";

import { PackageCheck } from "lucide-react";
import { useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import { pickLocalized } from "@/lib/localized";
import { shipments, type OrderStatus, type Shipment } from "@/lib/mock-data";
import type { QueuedAction } from "@/lib/offline/types";
import { latestQueuedStatus, useSyncStore } from "@/stores/sync-store";

const orderTone: Record<OrderStatus, BadgeTone> = {
  queued: "info",
  "in-transit": "success",
  delivered: "muted",
  delayed: "warning",
};

function overlayStatus(shipment: Shipment, queued?: QueuedAction): OrderStatus {
  if (!queued) {
    return shipment.status;
  }

  if (queued.type === "ORDER_DELIVERED") {
    return "delivered";
  }

  if (queued.type === "ORDER_IN_TRANSIT") {
    return "in-transit";
  }

  return shipment.status;
}

function hasOpenDelivery(queued?: QueuedAction): boolean {
  return queued?.type === "ORDER_DELIVERED";
}

export default function OrdersPage() {
  const { t, locale } = useLocale();
  const queue = useSyncStore((state) => state.queue);
  const enqueue = useSyncStore((state) => state.enqueue);
  const [busyId, setBusyId] = useState<string | null>(null);

  const markDelivered = async (orderId: string): Promise<void> => {
    setBusyId(orderId);
    try {
      await enqueue({ type: "ORDER_DELIVERED", entityId: orderId });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title={t("orders.title")}
          description={t("orders.description")}
        />
      </FadeIn>
      <GlassCard hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-start text-sm">
            <thead className="text-[11px] tracking-wide text-muted-foreground uppercase">
              <tr className="border-b border-border/80">
                <th className="pb-3 font-medium">{t("overview.table.order")}</th>
                <th className="pb-3 font-medium">
                  {t("overview.table.destination")}
                </th>
                <th className="pb-3 font-medium">{t("overview.table.courier")}</th>
                <th className="pb-3 font-medium">{t("orders.weight")}</th>
                <th className="pb-3 font-medium">{t("overview.table.eta")}</th>
                <th className="pb-3 font-medium">{t("overview.table.status")}</th>
                <th className="pb-3 text-end font-medium">{t("orders.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => {
                const queued = latestQueuedStatus(queue, shipment.id);
                const status = overlayStatus(shipment, queued);
                const pending = Boolean(queued);
                const canDeliver =
                  shipment.status !== "delivered" && !hasOpenDelivery(queued);

                return (
                  <tr
                    key={shipment.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-3.5 font-mono text-xs font-medium">
                      {shipment.id}
                    </td>
                    <td className="py-3.5">
                      {pickLocalized(shipment.destination, locale)}
                    </td>
                    <td className="py-3.5 text-muted-foreground">
                      {shipment.courier}
                    </td>
                    <td className="py-3.5 font-mono text-xs">{shipment.weight}</td>
                    <td className="py-3.5 font-mono text-xs">{shipment.eta}</td>
                    <td className="py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge
                          label={t(`status.order.${status}`)}
                          tone={orderTone[status]}
                        />
                        {pending ? (
                          <StatusBadge
                            label={t("orders.pendingSync")}
                            tone="warning"
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3.5 text-end">
                      {canDeliver ? (
                        <Button
                          variant="outline"
                          size="xs"
                          isDisabled={busyId === shipment.id}
                          onPress={() => {
                            void markDelivered(shipment.id);
                          }}
                        >
                          <PackageCheck data-icon="inline-start" />
                          {t("orders.markDelivered")}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
