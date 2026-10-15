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
  openAmount,
  openCount,
  totalDeals,
  periodLabel,
  /** Vue historique : uniquement le signé (pas de stock « en cours »). */
  signedOnly = false,
}: {
  ratePercent: number;
  signedAmount: number;
  signedCount: number;
  /** Budget estimé des dossiers encore ouverts. */
  openAmount: number;
  openCount: number;
  totalDeals: number;
  /** Libellé période pour le montant signé (événements). */
  periodLabel?: string;
  signedOnly?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, ratePercent));
  const amountCeiling = Math.max(signedAmount + openAmount, 1);

  return (
    <Surface className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
        {signedOnly
          ? "Clients gagnés"
          : "Conversion prospects vers clients"}
      </p>
      <p className="mt-1 text-sm text-msk-ink/50">
        {signedOnly ? (
          <>
            Clients gagnés
            {periodLabel ? ` sur ${periodLabel.toLowerCase()}` : ""}
            {` (${signedCount} client${signedCount > 1 ? "s" : ""})`}. Montants =
            budgets renseignés.
          </>
        ) : (
          <>
            Signé = clients gagnés
            {periodLabel ? ` sur ${periodLabel.toLowerCase()}` : ""}
            {signedCount > 0 || totalDeals > 0
              ? ` (${signedCount} client${signedCount > 1 ? "s" : ""})`
              : ""}
            . En cours = dossiers ouverts à date. Montants = budgets renseignés.
          </>
        )}
      </p>

      <div
        className={
          signedOnly
            ? "mt-5 flex flex-col items-center"
            : "mt-5 grid gap-6 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-msk-ink/[0.08]"
        }
      >
        <div className="flex flex-col items-center sm:px-4">
          <p className="self-start text-xs font-semibold uppercase tracking-wide text-msk-ink/45">
            Signé
          </p>
          <div className="mt-3 flex w-full flex-col items-center">
            <HubMiniRadial
              size="lg"
              value={signedOnly ? signedCount : pct}
              max={signedOnly ? Math.max(5, signedCount) : 100}
              color={METRIC_NAV_TONE_CHART.blue}
              centerLabel={
                signedOnly ? signedCount : `${pct.toFixed(0)}%`
              }
              caption={signedOnly ? "clients" : "devenus clients"}
            />
            <p className="mt-4 text-center text-xl font-semibold tabular-nums tracking-tight text-msk-ink sm:text-2xl">
              {formatXof(signedAmount)}
            </p>
            <p className="mt-1.5 text-center text-xs text-msk-ink/45">
              montant signé
              {periodLabel ? ` · ${periodLabel.toLowerCase()}` : ""} ·{" "}
              {signedCount} client{signedCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {!signedOnly ? (
          <div className="flex flex-col items-center sm:px-4">
            <p className="self-start text-xs font-semibold uppercase tracking-wide text-msk-ink/45">
              En cours
            </p>
            <div className="mt-3 flex w-full flex-col items-center">
              <HubMiniRadial
                size="lg"
                value={openAmount}
                max={amountCeiling}
                color={METRIC_NAV_TONE_CHART.ink}
                centerLabel={openCount}
                caption="dossiers ouverts"
              />
              <p className="mt-4 text-center text-xl font-semibold tabular-nums tracking-tight text-msk-ink sm:text-2xl">
                {formatXof(openAmount)}
              </p>
              <p className="mt-1.5 text-center text-xs text-msk-ink/45">
                montant encore en cours
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </Surface>
  );
}
