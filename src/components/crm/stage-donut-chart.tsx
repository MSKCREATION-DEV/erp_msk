"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Surface } from "@/components/ui/surface";

const COLORS = [
  "#1D73BC",
  "#2A3D8E",
  "#00ACEE",
  "#1384CB",
  "#284393",
  "#0D1330",
  "#FF5A3C",
];

export function StageDonutChart({
  data,
}: {
  data: { statut: string; count: number; key: string }[];
}) {
  const rows = data.filter((d) => d.count > 0);
  const total = rows.reduce((s, d) => s + d.count, 0);

  const config = Object.fromEntries(
    data.map((d, i) => [
      d.key,
      { label: d.statut, color: COLORS[i % COLORS.length] },
    ]),
  ) satisfies ChartConfig;

  return (
    <Surface className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
        Répartition
      </p>
      <p className="mt-1 text-sm text-msk-ink/50">
        {total} dossier{total > 1 ? "s" : ""} actifs / visibles
      </p>
      {rows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-msk-ink/40">Aucune donnée</p>
      ) : (
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <ChartContainer
            config={config}
            className="aspect-square min-h-[180px] w-full max-w-[200px]"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={rows}
                dataKey="count"
                nameKey="statut"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                strokeWidth={0}
              >
                {rows.map((d) => (
                  <Cell
                    key={d.key}
                    fill={`var(--color-${d.key})`}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="w-full space-y-1.5 text-sm">
            {rows.map((d, i) => (
              <li
                key={d.key}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2 text-msk-ink/70">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  {d.statut}
                </span>
                <span className="tabular-nums font-semibold text-msk-ink">
                  {d.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Surface>
  );
}
