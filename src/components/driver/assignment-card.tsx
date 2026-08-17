"use client";

import { m } from "framer-motion";
import { MapPin, Package, Phone, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { toTelHref } from "@/lib/driver/storage";
import type { DriverAssignment } from "@/lib/driver/types";
import { pickLocalized } from "@/lib/localized";
import { cn } from "@/lib/utils";

interface AssignmentCardProps {
  assignment: DriverAssignment;
}

export function AssignmentCard({ assignment }: AssignmentCardProps): ReactNode {
  const { t, locale } = useLocale();

  return (
    <m.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-3xl p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {t("driver.assignment")}
          </p>
          <p className="mt-1 font-mono text-lg font-bold">{assignment.orderNumber}</p>
        </div>
        <StatusBadge
          label={t(`status.order.${assignment.status}`)}
          tone={assignment.status === "IN_TRANSIT" ? "success" : "warning"}
        />
      </div>

      <dl className="mt-4 space-y-3 text-base">
        <div className="flex items-start gap-3">
          <UserRound className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <dt className="text-xs font-semibold text-muted-foreground uppercase">
              {t("driver.customer")}
            </dt>
            <dd className="font-semibold">
              {pickLocalized(assignment.customerName, locale)}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Phone className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <dt className="text-xs font-semibold text-muted-foreground uppercase">
              {t("driver.phone")}
            </dt>
            <dd className="font-mono text-sm font-semibold">
              {assignment.customerPhone}
            </dd>
          </div>
          <a
            href={toTelHref(assignment.customerPhone)}
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "h-12 min-w-12 touch-manipulation px-4 text-sm font-bold",
            )}
          >
            <Phone data-icon="inline-start" className="size-5" />
            {t("driver.call")}
          </a>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <dt className="text-xs font-semibold text-muted-foreground uppercase">
              {t("driver.address")}
            </dt>
            <dd className="text-base font-medium leading-snug">
              {assignment.addressText}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Package className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="flex-1">
            <dt className="text-xs font-semibold text-muted-foreground uppercase">
              {t("driver.items")}
            </dt>
            <dd>
              <ul className="mt-1 space-y-1">
                {assignment.items.map((item) => (
                  <li
                    key={`${item.name.en}-${item.qty}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2 text-sm font-semibold"
                  >
                    <span>{pickLocalized(item.name, locale)}</span>
                    <span className="font-mono text-muted-foreground">
                      {t("driver.itemQty", { qty: item.qty })}
                    </span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </div>
      </dl>
    </m.section>
  );
}
