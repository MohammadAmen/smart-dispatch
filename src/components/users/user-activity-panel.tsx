"use client";

import { Phone, Store } from "lucide-react";
import { useEffect, useState, type ReactElement } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import { fetchUserActivity } from "@/lib/users/client";
import type { Locale } from "@/lib/localized";
import type { ManagedUser, UserActivity, UserOperationLink } from "@/lib/users/types";

const tone: Record<string, BadgeTone> = {
  PENDING: "info",
  PENDING_QUOTE: "warning",
  QUOTE_ACCEPTED: "info",
  PREPARING: "warning",
  READY_FOR_PICKUP: "info",
  ASSIGNED: "info",
  IN_TRANSIT: "success",
  DELIVERED: "muted",
  CANCELED: "destructive",
};

const actionLabels: Record<Locale, Record<string, string>> = {
  ar: {
    ORDER_CREATED: "أُنشئ الطلب",
    DRIVER_ASSIGNED: "تم إسناد مندوب",
    DRIVER_OFFER_ACCEPTED: "المندوب قبل الطلب",
    DRIVER_OFFER_REJECTED: "المندوب رفض الطلب",
    DRIVER_OFFER_TIMEOUT: "انتهت مهلة العرض",
    ORDER_CANCELED: "أُلغي الطلب",
    ORDER_PREPARING: "بدأ التحضير",
    ORDER_READY_FOR_PICKUP: "الطلب جاهز",
    CASH_SETTLED: "تمت تسوية النقد",
    CUSTOM_ORDER_CREATED: "طلب خاص",
    CUSTOM_QUOTE_SENT: "أُرسل السعر",
    CUSTOM_QUOTE_CONFIRMED: "العميل أكد السعر",
  },
  en: {
    ORDER_CREATED: "Order created",
    DRIVER_ASSIGNED: "Driver assigned",
    DRIVER_OFFER_ACCEPTED: "Driver accepted",
    DRIVER_OFFER_REJECTED: "Driver rejected",
    DRIVER_OFFER_TIMEOUT: "Offer timed out",
    ORDER_CANCELED: "Order canceled",
    ORDER_PREPARING: "Preparation started",
    ORDER_READY_FOR_PICKUP: "Order ready",
    CASH_SETTLED: "Cash settled",
    CUSTOM_ORDER_CREATED: "Custom order",
    CUSTOM_QUOTE_SENT: "Quote sent",
    CUSTOM_QUOTE_CONFIRMED: "Quote confirmed",
  },
};

function linkLabel(link: UserOperationLink, t: (path: string) => string): string {
  if (link === "customer") return t("users.asCustomer");
  if (link === "driver") return t("users.asDriver");
  if (link === "store") return t("users.asStore");
  return t("users.asRecorded");
}

export function UserActivityPanel({ user }: { user: ManagedUser }): ReactElement {
  const { locale, t } = useLocale();
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setActivity(null);
    setError(null);
    void fetchUserActivity(user.id).then((result) => {
      if (!active) {
        return;
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setActivity(result.activity);
    });
    return () => {
      active = false;
    };
  }, [user.id]);

  const formatWhen = (iso: string): string =>
    new Date(iso).toLocaleString(locale === "ar" ? "ar" : "en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const actionText = (action: string, status: string | null): string => {
    if (status && action === status) {
      return t(`status.order.${status}`);
    }
    return actionLabels[locale][action] ?? action;
  };

  return (
    <div className="space-y-4 bg-muted/40 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          {t("users.joined")}: {formatWhen(user.createdAt)}
        </span>
        {user.driver ? (
          <span>
            {t("users.lastActive")}: {formatWhen(user.driver.lastActive)}
          </span>
        ) : null}
        <a
          href={`tel:${user.phone}`}
          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 font-semibold text-primary"
        >
          <Phone className="size-3.5" aria-hidden />
          {t("users.call")}
        </a>
      </div>

      {activity && activity.stores.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activity.stores.map((store) =>
            store.phone ? (
              <a
                key={store.id}
                href={`tel:${store.phone}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-xs font-semibold"
              >
                <Store className="size-3.5" aria-hidden />
                {store.name}
              </a>
            ) : (
              <span
                key={store.id}
                className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-xs font-semibold"
              >
                <Store className="size-3.5" aria-hidden />
                {store.name}
              </span>
            ),
          )}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{t("users.activityError")}</p> : null}
      {!error && !activity ? <p className="text-sm text-muted-foreground">{t("users.loading")}</p> : null}
      {activity && activity.operations.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("users.activityEmpty")}</p>
      ) : null}
      {activity && activity.operations.length > 0 ? (
        <ul className="space-y-2">
          {activity.operations.map((operation) => (
            <li
              key={operation.id}
              className="flex flex-col gap-1 rounded-xl bg-card px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{linkLabel(operation.link, t)}</span>
                  {operation.orderNumber ? (
                    <span className="font-mono">{operation.orderNumber}</span>
                  ) : null}
                  {operation.orderStatus ? (
                    <StatusBadge
                      label={actionText(operation.action, operation.orderStatus)}
                      tone={tone[operation.orderStatus] ?? "muted"}
                    />
                  ) : (
                    <span>{actionText(operation.action, null)}</span>
                  )}
                </div>
                <p className="mt-1 text-muted-foreground">
                  {[operation.storeName, operation.counterparty, operation.note].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <span className="shrink-0 text-muted-foreground">{formatWhen(operation.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
