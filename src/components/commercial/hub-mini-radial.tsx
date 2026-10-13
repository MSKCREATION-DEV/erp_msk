"use client";

import { RadialBar, RadialBarChart } from "recharts";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const config = {
  done: { label: "Fait" },
  rest: { label: "Reste" },
} satisfies ChartConfig;

/**
 * Mini radial empilé (shadcn radial-stacked) — couleur uniquement sur l’arc.
 * @see https://ui.shadcn.com/charts/radial
 */
export function HubMiniRadial({
  value,
  max,
  color,
  trackColor = "rgba(13, 19, 48, 0.08)",
  className,
}: {
  value: number;
  max: number;
  color: string;
  trackColor?: string;
  className?: string;
}) {
  const ceiling = Math.max(1, max);
  const done = Math.min(Math.max(0, value), ceiling);
  const rest = Math.max(0, ceiling - done);
  const data = [{ name: "kpi", done, rest }];

  return (
    <ChartContainer
      config={config}
      className={cn("mx-0 aspect-square h-[68px] w-[68px]", className)}
    >
      <RadialBarChart
        data={data}
        endAngle={180}
        innerRadius={26}
        outerRadius={40}
        cx="50%"
        cy="72%"
      >
        <RadialBar
          dataKey="done"
          stackId="a"
          cornerRadius={5}
          fill={color}
          className="stroke-transparent stroke-2"
        />
        <RadialBar
          dataKey="rest"
          stackId="a"
          cornerRadius={5}
          fill={trackColor}
          className="stroke-transparent stroke-2"
        />
      </RadialBarChart>
    </ChartContainer>
  );
}
