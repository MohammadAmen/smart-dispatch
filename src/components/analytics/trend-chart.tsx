"use client";

import type { ReactNode } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartColors } from "@/hooks/use-chart-colors";
import { formatCount, formatJod } from "@/lib/analytics/format";
import type { TrendPoint } from "@/lib/analytics/types";
import type { Locale } from "@/lib/localized";

interface TrendChartProps {
  data: TrendPoint[];
  locale: Locale;
  dir: "rtl" | "ltr";
  revenueLabel: string;
  ordersLabel: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  locale,
  revenueLabel,
  ordersLabel,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: string | number; value?: number }>;
  label?: string;
  locale: Locale;
  revenueLabel: string;
  ordersLabel: string;
}): ReactNode {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const revenue = payload.find((item) => item.dataKey === "revenue")?.value ?? 0;
  const orders = payload.find((item) => item.dataKey === "orders")?.value ?? 0;

  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-primary">
        {revenueLabel}: {formatJod(revenue, locale)}
      </p>
      <p className="text-info">
        {ordersLabel}: {formatCount(orders, locale)}
      </p>
    </div>
  );
}

export function TrendChart({
  data,
  locale,
  dir,
  revenueLabel,
  ordersLabel,
}: TrendChartProps): ReactNode {
  const colors = useChartColors();
  const rtl = dir === "rtl";

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="sd-revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.primary} stopOpacity={0.38} />
              <stop offset="100%" stopColor={colors.primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            reversed={rtl}
            tick={{ fill: colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="revenue"
            orientation={rtl ? "right" : "left"}
            tick={{ fill: colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <YAxis
            yAxisId="orders"
            orientation={rtl ? "left" : "right"}
            tick={{ fill: colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            content={
              <ChartTooltip
                locale={locale}
                revenueLabel={revenueLabel}
                ordersLabel={ordersLabel}
              />
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: colors.muted }}
            formatter={(value) =>
              value === "revenue" ? revenueLabel : ordersLabel
            }
          />
          <Area
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            name="revenue"
            stroke={colors.primary}
            fill="url(#sd-revenue-fill)"
            strokeWidth={2.4}
          />
          <Bar
            yAxisId="orders"
            dataKey="orders"
            name="orders"
            fill={colors.info}
            radius={[8, 8, 0, 0]}
            maxBarSize={18}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
