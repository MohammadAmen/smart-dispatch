"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartColors } from "@/hooks/use-chart-colors";
import type { HourDemandPoint } from "@/lib/stores/vendor-intel-types";

function HourTooltip({
  active,
  payload,
  ordersLabel,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: HourDemandPoint }>;
  ordersLabel: (count: number) => string;
}): ReactNode {
  if (!active || !payload?.[0]?.payload) {
    return null;
  }
  const row = payload[0].payload;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{row.label}</p>
      <p className="mt-1 text-muted-foreground">{ordersLabel(row.orders)}</p>
    </div>
  );
}

export function VendorPeakHoursChart({
  data,
  dir,
  ordersLabel,
}: {
  data: HourDemandPoint[];
  dir: "rtl" | "ltr";
  ordersLabel: (count: number) => string;
}): ReactNode {
  const colors = useChartColors();
  const rtl = dir === "rtl";

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="peakFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.info} stopOpacity={0.28} />
              <stop offset="100%" stopColor={colors.info} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            reversed={rtl}
            interval={2}
            tick={{ fill: colors.muted, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            orientation={rtl ? "right" : "left"}
            width={36}
            tick={{ fill: colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<HourTooltip ordersLabel={ordersLabel} />} />
          <Area
            type="monotone"
            dataKey="orders"
            stroke={colors.info}
            strokeWidth={2}
            fill="url(#peakFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
