"use client";

import type { ReactNode } from "react";
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

export type HubMiniRadialProps = {
  value: number;
  max: number;
  color: string;
  /** KPI court (chiffre) dans le creux du demi-cercle. */
  centerLabel: ReactNode;
  caption?: string;
  trackColor?: string;
  className?: string;
};

/**
 * Mini radial empilé (shadcn radial-stacked) — réutilisable sur cartes métriques.
 * @see https://ui.shadcn.com/charts/radial
 */
export function HubMiniRadial({
  value,
  max,
  color,
  centerLabel,
  caption,
  trackColor = "rgba(13, 19, 48, 0.08)",
  className,
}: HubMiniRadialProps) {
  const ceiling = Math.max(1, max);
  const done = Math.min(Math.max(0, value), ceiling);
  const rest = Math.max(0, ceiling - done);
  const data = [{ name: "kpi", done, rest }];

  return (
    <div className={cn("flex w-[96px] flex-col items-center", className)}>
      <div className="relative h-[64px] w-full">
        <ChartContainer
          config={config}
          className="aspect-auto! h-full w-full"
        >
          <RadialBarChart
            data={data}
            endAngle={180}
            innerRadius={28}
            outerRadius={42}
            cx="50%"
            cy="100%"
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0.5 flex justify-center">
          <span className="text-center text-xl font-semibold tabular-nums leading-none tracking-tight text-msk-ink">
            {centerLabel}
          </span>
        </div>
      </div>
      {caption ? (
        <p className="mt-1 max-w-[104px] text-center text-[11px] leading-tight text-msk-ink/45">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
