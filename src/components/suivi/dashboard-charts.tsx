"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Surface } from "@/components/ui/surface";
import { formatSvXof } from "@/lib/suivi/labels";
import type {
  SvCategorySlice,
  SvCompareBar,
  SvSeriesPoint,
} from "@/lib/suivi/dashboard-stats";
import { cn } from "@/lib/utils";

const flowConfig = {
  inOps: { label: "Entrées", color: "#1D73BC" },
  outOps: { label: "Sorties", color: "#FF5A3C" },
} satisfies ChartConfig;

const compareConfig = {
  current: { label: "Période", color: "#1D73BC" },
  previous: { label: "Précédente", color: "#00ACEE" },
} satisfies ChartConfig;

export function SvFlowAreaChart({
  data,
  title = "Entrées / sorties",
  subtitle,
}: {
  data: SvSeriesPoint[];
  title?: string;
  subtitle?: string;
}) {
  const empty = data.every((d) => d.inOps === 0 && d.outOps === 0);
  return (
    <Surface className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
        {title}
      </p>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-msk-ink/50">{subtitle}</p>
      ) : null}
      {empty ? (
        <p className="mt-6 rounded-lg bg-msk-chalk/60 px-3 py-8 text-center text-sm text-msk-ink/45">
          Aucun mouvement opérationnel sur la période.
        </p>
      ) : (
        <ChartContainer
          config={flowConfig}
          className="mt-3 aspect-auto! h-56 w-full sm:h-64"
        >
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ top: 8, left: 0, right: 8, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) =>
                v >= 1_000_000
                  ? `${Math.round(v / 1_000_000)}M`
                  : v >= 1000
                    ? `${Math.round(v / 1000)}k`
                    : String(v)
              }
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="inOps"
              stroke="var(--color-inOps)"
              fill="var(--color-inOps)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="outOps"
              stroke="var(--color-outOps)"
              fill="var(--color-outOps)"
              fillOpacity={0.12}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </Surface>
  );
}

export function SvExpenseDonut({
  data,
  hrefForFamily,
  title = "Dépenses par catégorie",
  subtitle = "clic = mouvements filtrés",
}: {
  data: SvCategorySlice[];
  hrefForFamily: (family: string) => string;
  title?: string;
  subtitle?: string;
}) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  const config = Object.fromEntries(
    data.map((d) => [d.key, { label: d.label, color: d.color }]),
  ) satisfies ChartConfig;

  return (
    <Surface className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
        {title}
      </p>
      <p className="mt-1 text-sm text-msk-ink/50">
        {total > 0 ? `${formatSvXof(total)} · ${subtitle}` : subtitle}
      </p>
      {data.length === 0 ? (
        <p className="mt-8 text-center text-sm text-msk-ink/40">
          Aucune dépense ops sur la période.
        </p>
      ) : (
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <ChartContainer
            config={config}
            className="aspect-square min-h-45 w-full max-w-50"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={data}
                dataKey="amount"
                nameKey="label"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((d) => (
                  <Cell key={d.key} fill={`var(--color-${d.key})`} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="w-full space-y-1.5 text-sm">
            {data.map((d) => (
              <li key={d.key}>
                <Link
                  href={hrefForFamily(d.family)}
                  prefetch={false}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition hover:bg-msk-chalk/70"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: d.color }}
                      aria-hidden
                    />
                    <span className="truncate text-msk-ink">{d.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-msk-ink/70">
                    {formatSvXof(d.amount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Surface>
  );
}

export function SvCompareBarChart({
  data,
  title = "Comparatif périodes",
  subtitle,
}: {
  data: SvCompareBar[];
  title?: string;
  subtitle?: string;
}) {
  const empty = data.every((d) => d.current === 0 && d.previous === 0);
  return (
    <Surface className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
        {title}
      </p>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-msk-ink/50">{subtitle}</p>
      ) : null}
      {empty ? (
        <p className="mt-6 rounded-lg bg-msk-chalk/60 px-3 py-8 text-center text-sm text-msk-ink/45">
          Pas assez de données pour comparer.
        </p>
      ) : (
        <ChartContainer
          config={compareConfig}
          className={cn("mt-3 aspect-auto! h-48 w-full")}
        >
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ top: 8, left: 0, right: 8, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) =>
                v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
              }
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar
              dataKey="current"
              fill="var(--color-current)"
              radius={[3, 3, 0, 0]}
              maxBarSize={36}
            />
            <Bar
              dataKey="previous"
              fill="var(--color-previous)"
              radius={[3, 3, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        </ChartContainer>
      )}
    </Surface>
  );
}
