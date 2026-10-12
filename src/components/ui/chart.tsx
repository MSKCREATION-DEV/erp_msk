"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  };
};

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used within <ChartContainer />");
  return ctx;
}

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-msk-ink/45 [&_.recharts-cartesian-grid_line]:stroke-msk-ink/10 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-msk-ink/20 [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-msk-ink/5",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, c]) => c.color);
  if (!colorConfig.length) return null;
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart=${id}]{\n${colorConfig
          .map(([key, item]) => `  --color-${key}:${item.color};`)
          .join("\n")}\n}`,
      }}
    />
  );
}

export function ChartTooltip(
  props: React.ComponentProps<typeof RechartsPrimitive.Tooltip>,
) {
  return <RechartsPrimitive.Tooltip {...props} />;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel,
  className,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; dataKey?: string; color?: string }>;
  label?: string;
  hideLabel?: boolean;
  className?: string;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-msk-ink/10 bg-white px-3 py-2 text-xs shadow-md",
        className,
      )}
    >
      {!hideLabel && label ? (
        <div className="mb-1.5 font-medium text-msk-ink">{label}</div>
      ) : null}
      <div className="grid gap-1">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name ?? "value");
          const itemConfig = config[key];
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-msk-ink/55">
                {itemConfig?.label ?? item.name}
              </span>
              <span className="font-mono font-medium tabular-nums text-msk-ink">
                {item.value?.toLocaleString("fr-FR")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
