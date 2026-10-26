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
  /** KPI sous l’arc (jamais collé au trait). */
  centerLabel: ReactNode;
  caption?: string;
  trackColor?: string;
  /** `lg` = conversion / montants plus lisibles. */
  size?: "sm" | "lg";
  className?: string;
};

/**
 * Mini radial empilé (shadcn radial-stacked) — arc puis KPI + légende avec air.
 * @see https://ui.shadcn.com/charts/radial
 */
export function HubMiniRadial({
  value,
  max,
  color,
  centerLabel,
  caption,
  trackColor = "rgba(13, 19, 48, 0.08)",
  size = "sm",
  className,
}: HubMiniRadialProps) {
  const ceiling = Math.max(1, max);
  const done = Math.min(Math.max(0, value), ceiling);
  const rest = Math.max(0, ceiling - done);
  const data = [{ name: "kpi", done, rest }];
  const large = size === "lg";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center",
        large ? "w-28" : "w-18",
        className,
      )}
    >
      <div className={cn("w-full", large ? "h-14" : "h-11")}>
        <ChartContainer
          config={config}
          className="aspect-auto! h-full w-full"
        >
          <RadialBarChart
            data={data}
            endAngle={180}
            innerRadius={large ? 34 : 28}
            outerRadius={large ? 50 : 40}
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
      </div>
      <p
        className={cn(
          "mt-0 text-center font-semibold tabular-nums leading-none tracking-tight text-msk-ink",
          large ? "text-2xl" : "text-xl",
        )}
      >
        {centerLabel}
      </p>
      {caption ? (
        <p
          className={cn(
            "mt-1 w-full truncate text-center leading-tight text-msk-ink/45",
            large ? "text-xs" : "text-[10px] sm:text-[11px]",
          )}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}
