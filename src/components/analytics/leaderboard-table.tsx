"use client";

import { Star } from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { formatCount, formatJod, formatMinutes } from "@/lib/analytics/format";
import type { DriverLeaderboardRow } from "@/lib/analytics/types";

interface LeaderboardTableProps {
  rows: DriverLeaderboardRow[];
}

export function LeaderboardTable({ rows }: LeaderboardTableProps): ReactNode {
  const { t, locale } = useLocale();

  if (rows.length === 0) {
    return (
      <p className="py-8 text-sm text-muted-foreground">
        {t("analytics.leaderboard.empty")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-start text-sm">
        <thead className="text-[11px] tracking-wide text-muted-foreground uppercase">
          <tr className="border-b border-border/80">
            <th className="pb-3 font-medium">{t("analytics.leaderboard.driver")}</th>
            <th className="pb-3 font-medium">{t("analytics.leaderboard.completed")}</th>
            <th className="pb-3 font-medium">{t("analytics.leaderboard.cash")}</th>
            <th className="pb-3 font-medium">{t("analytics.leaderboard.avgTime")}</th>
            <th className="pb-3 font-medium">{t("analytics.leaderboard.rating")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.driverId}
              className="border-b border-border/50 last:border-0"
            >
              <td className="py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/12 font-mono text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{row.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {row.vehicleType}
                    </p>
                  </div>
                </div>
              </td>
              <td className="py-3.5 font-medium">
                {formatCount(row.completed, locale)}
              </td>
              <td className="py-3.5 font-medium">
                {formatJod(row.cashCollected, locale)}
              </td>
              <td className="py-3.5 font-mono text-xs">
                {t("analytics.minutes", {
                  count: formatMinutes(row.avgMinutes, locale),
                })}
              </td>
              <td className="py-3.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2 py-1 text-xs font-semibold text-warning-foreground dark:text-warning">
                  <Star className="size-3.5 fill-current" />
                  {row.rating.toFixed(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
