"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { HubMiniRadial } from "@/components/commercial/hub-mini-radial";
import { Surface } from "@/components/ui/surface";
import { formatXof } from "@/lib/crm/labels";
import { METRIC_NAV_TONE_CHART } from "@/components/ui/metric-nav-card";
import { cn } from "@/lib/utils";

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
  signedHref,
  openHref,
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
  /** Clients gagnés (période + owner). */
  signedHref?: string;
  /** Prospects ouverts à date (owner). */
  openHref?: string;
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
            : "mt-5 grid gap-6 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-msk-ink/8"
        }
      >
        <ConversionColumn
          href={signedHref}
          label="Signé"
          radial={
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
          }
          amount={signedAmount}
          hint={
            <>
              montant signé
              {periodLabel ? ` · ${periodLabel.toLowerCase()}` : ""} ·{" "}
              {signedCount} client{signedCount > 1 ? "s" : ""}
            </>
          }
        />

        {!signedOnly ? (
          <ConversionColumn
            href={openHref}
            label="En cours"
            radial={
              <HubMiniRadial
                size="lg"
                value={openAmount}
                max={amountCeiling}
                color={METRIC_NAV_TONE_CHART.ink}
                centerLabel={openCount}
                caption="dossiers ouverts"
              />
            }
            amount={openAmount}
            hint="montant encore en cours"
          />
        ) : null}
      </div>
    </Surface>
  );
}

function ConversionColumn({
  href,
  label,
  radial,
  amount,
  hint,
}: {
  href?: string;
  label: string;
  radial: ReactNode;
  amount: number;
  hint: ReactNode;
}) {
  const body = (
    <>
      <p className="self-start text-xs font-semibold uppercase tracking-wide text-msk-ink/45">
        {label}
      </p>
      <div className="mt-3 flex w-full flex-col items-center">
        {radial}
        <p className="mt-4 text-center text-xl font-semibold tabular-nums tracking-tight text-msk-ink sm:text-2xl">
          {formatXof(amount)}
        </p>
        <p className="mt-1.5 text-center text-xs text-msk-ink/45">{hint}</p>
      </div>
    </>
  );

  if (!href) {
    return (
      <div className="flex flex-col items-center sm:px-4">{body}</div>
    );
  }

  return (
    <Link
      prefetch={false}
      href={href}
      className={cn(
        "flex flex-col items-center rounded-xl sm:px-4",
        "transition hover:bg-msk-chalk/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40",
      )}
    >
      {body}
    </Link>
  );
}
