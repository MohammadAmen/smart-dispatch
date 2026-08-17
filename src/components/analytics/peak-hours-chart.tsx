"use client";

import type { ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartColors } from "@/hooks/use-chart-colors";
import { formatCount } from "@/lib/analytics/format";
import type { PeakHourPoint } from "@/lib/analytics/types";
import type { Locale } from "@/lib/localized";

interface PeakHoursChartProps {
  data: PeakHourPoint[];
  locale: Locale;
  dir: "rtl" | "ltr";
  ordersLabel: string;
}

export function PeakHoursChart({
  data,
  locale,
  dir,
  ordersLabel,
}: PeakHoursChartProps): ReactNode {
  const colors = useChartColors();
  const rtl = dir === "rtl";
  const hours = data.filter((point) => point.hour >= 7 && point.hour <= 21);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={hours} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            reversed={rtl}
            tick={{ fill: colors.muted, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={1}
          />
          <YAxis
            orientation={rtl ? "right" : "left"}
            tick={{ fill: colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in oklch, var(--muted) 55%, transparent)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.[0]) {
                return null;
              }

              const value = Number(payload[0].value ?? 0);
              return (
                <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold">{String(label ?? "")}</p>
                  <p className="mt-1 text-info">
                    {ordersLabel}: {formatCount(value, locale)}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="orders" fill={colors.success} radius={[8, 8, 0, 0]} maxBarSize={22} />
          <Line
            type="monotone"
            dataKey="orders"
            stroke={colors.primary}
            strokeWidth={2.2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
