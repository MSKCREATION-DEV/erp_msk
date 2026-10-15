"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CrmPipelineStage } from "@prisma/client";
import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Surface } from "@/components/ui/surface";
import {
  STAGE_COLORS,
  prospectsStagesHref,
  stagesForFilter,
} from "@/lib/crm/labels";

export type StageDonutRow = {
  stage: CrmPipelineStage;
  statut: string;
  count: number;
  key: string;
};

function withOwner(href: string, ownerId: string | null | undefined): string {
  if (!ownerId) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}owner=${ownerId}`;
}

export function StageDonutChart({
  data,
  ownerId,
  subtitle = "par statut — clic = filtre liste",
}: {
  data: StageDonutRow[];
  /** Conserve le filtre collaborateur vers la liste Prospects. */
  ownerId?: string | null;
  subtitle?: string;
}) {
  const router = useRouter();
  const rows = data.filter((d) => d.count > 0);
  const total = rows.reduce((s, d) => s + d.count, 0);

  const config = Object.fromEntries(
    data.map((d) => [
      d.key,
      { label: d.statut, color: STAGE_COLORS[d.stage] },
    ]),
  ) satisfies ChartConfig;

  function stageHref(stage: CrmPipelineStage) {
    return withOwner(prospectsStagesHref(stagesForFilter(stage)), ownerId);
  }

  function goToStage(stage: CrmPipelineStage) {
    router.push(stageHref(stage));
  }

  return (
    <Surface className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
        Répartition des prospects
      </p>
      <p className="mt-1 text-sm text-msk-ink/50">
        {total} dossier{total > 1 ? "s" : ""} {subtitle}
      </p>
      {rows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-msk-ink/40">Aucune donnée</p>
      ) : (
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <ChartContainer
            config={config}
            className="aspect-square min-h-45 w-full max-w-50"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={rows}
                dataKey="count"
                nameKey="statut"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                strokeWidth={0}
                className="cursor-pointer outline-none"
                onClick={(_, index) => {
                  const row = rows[index];
                  if (row) goToStage(row.stage);
                }}
              >
                {rows.map((d) => (
                  <Cell
                    key={d.key}
                    fill={`var(--color-${d.key})`}
                    className="cursor-pointer outline-none transition-opacity hover:opacity-90"
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="w-full space-y-1 text-sm">
            {rows.map((d) => (
              <li key={d.key}>
                <Link
                  prefetch={false}
                  href={stageHref(d.stage)}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 transition hover:bg-msk-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40"
                >
                  <span className="flex min-w-0 items-center gap-2 text-msk-ink/75">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: STAGE_COLORS[d.stage] }}
                      aria-hidden
                    />
                    <span className="truncate">{d.statut}</span>
                  </span>
                  <span className="tabular-nums font-semibold text-msk-ink">
                    {d.count}
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
