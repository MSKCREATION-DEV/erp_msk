"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

const chartConfig = {
  count: {
    label: "Prospects",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

export function StageBarChart({
  data,
  title = "Volume",
  subtitle,
  compact = false,
  totalLabel,
}: {
  data: { statut: string; count: number }[];
  title?: string;
  subtitle?: string;
  /**
   * Hauteur maîtrisée — rapport historique / bandeau secondaire.
   * Évite aspect-video + min-h-55 qui déséquilibrent la page.
   */
  compact?: boolean;
  /** Chiffre synthèse affiché à droite du titre (ex. total 4 semaines). */
  totalLabel?: string | number;
}) {
  const empty = data.every((d) => d.count === 0);

  return (
    <Surface className={cn("p-4", compact && "p-3.5")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-msk-ink/50">{subtitle}</p>
          ) : null}
        </div>
        {totalLabel != null ? (
          <p className="shrink-0 text-right">
            <span className="text-lg font-semibold tabular-nums text-msk-ink">
              {totalLabel}
            </span>
            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-msk-ink/40">
              total
            </span>
          </p>
        ) : null}
      </div>

      {empty ? (
        <p className="mt-3 rounded-lg bg-msk-chalk/60 px-3 py-4 text-center text-sm text-msk-ink/45">
          Aucun nouveau prospect sur ces semaines.
        </p>
      ) : (
        <ChartContainer
          config={chartConfig}
          className={cn(
            "mt-3 w-full",
            compact
              ? "aspect-auto! h-28 sm:h-32"
              : "aspect-auto! h-40 sm:h-44",
          )}
        >
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ top: 4, left: 0, right: 4, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="statut"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              interval={0}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={24}
              tick={{ fontSize: 10 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[3, 3, 0, 0]}
              maxBarSize={compact ? 28 : 36}
            />
          </BarChart>
        </ChartContainer>
      )}
    </Surface>
  );
}
