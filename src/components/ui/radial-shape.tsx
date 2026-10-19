"use client";

import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const config = {
  progress: { label: "Progression" },
} satisfies ChartConfig;

/**
 * Radial plein (shadcn chart-radial-shape) — objectifs / ratios current÷target.
 * @see https://ui.shadcn.com/charts/radial
 */
export function RadialShape({
  current,
  target,
  label,
  color = "#1D73BC",
  className,
}: {
  current: number;
  target: number;
  label: string;
  color?: string;
  className?: string;
}) {
  const ceiling = Math.max(1, target);
  const pct = Math.min(100, Math.round((Math.max(0, current) / ceiling) * 100));
  const data = [{ name: "goal", progress: pct, fill: color }];

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <ChartContainer
        config={config}
        className="aspect-square! mx-auto h-30 w-30"
      >
        <RadialBarChart
          data={data}
          startAngle={90}
          endAngle={90 - (pct / 100) * 360}
          innerRadius={42}
          outerRadius={58}
        >
          <PolarGrid
            gridType="circle"
            radialLines={false}
            stroke="none"
            className="first:fill-msk-ink/6 last:fill-white"
            polarRadius={[46, 38]}
          />
          <RadialBar dataKey="progress" background cornerRadius={10} />
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                  return null;
                }
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) - 4}
                      className="fill-msk-ink text-lg font-semibold tabular-nums"
                    >
                      {current}/{target}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) + 14}
                      className="fill-msk-ink/40 text-[10px]"
                    >
                      {pct}%
                    </tspan>
                  </text>
                );
              }}
            />
          </PolarRadiusAxis>
        </RadialBarChart>
      </ChartContainer>
      <p className="mt-1 max-w-36 text-xs font-medium leading-snug text-msk-ink/65">
        {label}
      </p>
    </div>
  );
}
