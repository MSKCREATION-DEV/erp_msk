"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Surface } from "@/components/ui/surface";

const chartConfig = {
  count: {
    label: "Prospects",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

export function StageBarChart({
  data,
  title = "Volume",
  subtitle = "Données calculées automatiquement",
}: {
  data: { statut: string; count: number }[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <Surface className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
        {title}
      </p>
      <p className="mt-1 text-sm text-msk-ink/50">{subtitle}</p>
      <ChartContainer config={chartConfig} className="mt-4 min-h-55 w-full">
        <BarChart accessibilityLayer data={data} margin={{ left: 0, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="statut"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </Surface>
  );
}
