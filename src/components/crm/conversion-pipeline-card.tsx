"use client";

import { HubMiniRadial } from "@/components/commercial/hub-mini-radial";
import { Surface } from "@/components/ui/surface";
import { formatXof } from "@/lib/crm/labels";
import { METRIC_NAV_TONE_CHART } from "@/components/ui/metric-nav-card";

/**
 * Conversion = part des dossiers devenus Client dans le périmètre visible.
 * Montants = somme des budgets (`budgetXof`) renseignés :
 * - Signé → statut Client
 * - En cours → dossiers encore ouverts (hors Client / Perdu)
 */
export function ConversionPipelineCard({
  ratePercent,
  signedAmount,
  signedCount,
  pipelineAmount,
  pipelineCount,
  totalDeals,
}: {
  ratePercent: number;
  signedAmount: number;
  signedCount: number;
  pipelineAmount: number;
  pipelineCount: number;
  totalDeals: number;
}) {
  const pct = Math.max(0, Math.min(100, ratePercent));
  const amountCeiling = Math.max(signedAmount + pipelineAmount, 1);

  return (
    <Surface className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
        Conversion prospects → clients
      </p>
      <p className="mt-1 text-sm text-msk-ink/50">
        Taux = clients ÷ tous les dossiers visibles
        {totalDeals > 0 ? ` (${signedCount}/${totalDeals})` : ""}.
        Montants = budgets renseignés sur les fiches.
      </p>

      <div className="mt-5 grid gap-6 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-msk-ink/[0.08]">
        <div className="flex flex-col items-center sm:px-4">
          <p className="self-start text-xs font-semibold uppercase tracking-wide text-msk-ink/45">
            Signé
          </p>
          <div className="mt-3 flex w-full flex-col items-center">
            <HubMiniRadial
              size="lg"
              value={pct}
              max={100}
              color={METRIC_NAV_TONE_CHART.blue}
              centerLabel={`${pct.toFixed(0)}%`}
              caption="devenus clients"
            />
            <p className="mt-4 text-center text-xl font-semibold tabular-nums tracking-tight text-msk-ink sm:text-2xl">
              {formatXof(signedAmount)}
            </p>
            <p className="mt-1.5 text-center text-xs text-msk-ink/45">
              montant signé · {signedCount} client
              {signedCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center sm:px-4">
          <p className="self-start text-xs font-semibold uppercase tracking-wide text-msk-ink/45">
            En cours
          </p>
          <div className="mt-3 flex w-full flex-col items-center">
            <HubMiniRadial
              size="lg"
              value={pipelineAmount}
              max={amountCeiling}
              color={METRIC_NAV_TONE_CHART.ink}
              centerLabel={pipelineCount}
              caption="dossiers ouverts"
            />
            <p className="mt-4 text-center text-xl font-semibold tabular-nums tracking-tight text-msk-ink sm:text-2xl">
              {formatXof(pipelineAmount)}
            </p>
            <p className="mt-1.5 text-center text-xs text-msk-ink/45">
              montant encore en pipeline
            </p>
          </div>
        </div>
      </div>
    </Surface>
  );
}
