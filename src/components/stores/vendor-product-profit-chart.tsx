"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartColors } from "@/hooks/use-chart-colors";
import { formatMoney, PRICE_CURRENCY } from "@/lib/stores/pricing";
import type { ProductProfitRow } from "@/lib/stores/vendor-intel-types";

function ProfitTooltip({
  active,
  payload,
  shareLabel,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ProductProfitRow }>;
  shareLabel: (percent: number) => string;
}): ReactNode {
  if (!active || !payload?.[0]?.payload) {
    return null;
  }
  const row = payload[0].payload;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{row.name}</p>
      <p className="mt-1 text-foreground">
        {formatMoney(row.revenue)} {PRICE_CURRENCY}
      </p>
      <p className="text-muted-foreground">{shareLabel(Math.round(row.share))}</p>
    </div>
  );
}

export function VendorProductProfitChart({
  data,
  dir,
  shareLabel,
}: {
  data: ProductProfitRow[];
  dir: "rtl" | "ltr";
  shareLabel: (percent: number) => string;
}): ReactNode {
  const colors = useChartColors();
  const rtl = dir === "rtl";
  const chartData = data.map((row) => ({
    ...row,
    shortName: row.name.length > 18 ? `${row.name.slice(0, 17)}…` : row.name,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: rtl ? 8 : 16, left: rtl ? 16 : 8, bottom: 0 }}
        >
          <CartesianGrid stroke={colors.grid} horizontal={false} />
          <XAxis
            type="number"
            reversed={rtl}
            tick={{ fill: colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            orientation={rtl ? "right" : "left"}
            width={118}
            tick={{ fill: colors.foreground, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ProfitTooltip shareLabel={shareLabel} />} />
          <Bar dataKey="revenue" fill={colors.primary} radius={[0, 8, 8, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
