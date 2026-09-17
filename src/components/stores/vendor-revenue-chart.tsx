"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartColors } from "@/hooks/use-chart-colors";
import { formatMoney, PRICE_CURRENCY } from "@/lib/stores/pricing";
import type { RevenuePoint } from "@/lib/stores/vendor-intel-types";

function ChartTooltip({
  active,
  payload,
  label,
  gainedLabel,
  lostLabel,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: string | number; value?: number }>;
  label?: string;
  gainedLabel: string;
  lostLabel: string;
}): ReactNode {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const gained = payload.find((item) => item.dataKey === "gained")?.value ?? 0;
  const lost = payload.find((item) => item.dataKey === "lost")?.value ?? 0;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-emerald-600 dark:text-emerald-300">
        {gainedLabel}: {formatMoney(gained)} {PRICE_CURRENCY}
      </p>
      <p className="text-amber-600 dark:text-amber-300">
        {lostLabel}: {formatMoney(lost)} {PRICE_CURRENCY}
      </p>
    </div>
  );
}

export function VendorRevenueChart({
  data,
  dir,
  gainedLabel,
  lostLabel,
}: {
  data: RevenuePoint[];
  dir: "rtl" | "ltr";
  gainedLabel: string;
  lostLabel: string;
}): ReactNode {
  const colors = useChartColors();
  const rtl = dir === "rtl";

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            reversed={rtl}
            tick={{ fill: colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            orientation={rtl ? "right" : "left"}
            tick={{ fill: colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            content={<ChartTooltip gainedLabel={gainedLabel} lostLabel={lostLabel} />}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: colors.muted }}
            formatter={(value) => (value === "gained" ? gainedLabel : lostLabel)}
          />
          <Bar dataKey="gained" name="gained" fill={colors.success} radius={[8, 8, 0, 0]} maxBarSize={18} />
          <Bar dataKey="lost" name="lost" fill={colors.warning} radius={[8, 8, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
