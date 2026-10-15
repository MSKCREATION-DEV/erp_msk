"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import type { WeekOption } from "@/lib/crm/week";
import type { CrmScopeLens, PeriodMode } from "@/lib/crm/scope-period";
import { CrmWeekPicker } from "@/components/crm/crm-week-picker";
import { cn } from "@/lib/utils";

const MODE_OPTIONS: { value: PeriodMode; label: string }[] = [
  { value: "semaine", label: "Semaine" },
  { value: "mois", label: "Mois" },
  { value: "jour", label: "Jour" },
  { value: "plage", label: "Plage" },
];

/**
 * Barre de filtres CRM — navigation via `router.push` (même pattern que
 * Prospects / ancien RapportFilters).
 *
 * Interdit : `replace` + `refresh` dans le même tick — refresh relit l’URL
 * encore ancienne et réinjecte un payload RSC périmé.
 */
export function CrmScopeBar({
  mode,
  semaine,
  mois,
  on,
  from,
  to,
  weeks,
  ownerId,
  owners,
  canFilterOwners,
  periodLabel,
  keepParams,
  ownerParamKey = "owner",
  periodModes = MODE_OPTIONS.map((m) => m.value),
  lens,
  className,
}: {
  mode: PeriodMode;
  semaine: string;
  mois: string;
  on: string;
  from: string;
  to: string;
  weeks: WeekOption[];
  ownerId: string | null;
  owners: { value: string; label: string }[];
  canFilterOwners: boolean;
  periodLabel?: string;
  keepParams?: Record<string, string | undefined>;
  ownerParamKey?: "owner" | "collab";
  periodModes?: PeriodMode[];
  lens?: CrmScopeLens;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  function push(next: {
    periode?: PeriodMode;
    semaine?: string;
    mois?: string;
    on?: string;
    from?: string;
    to?: string;
    owner?: string | null;
  }) {
    const p = new URLSearchParams();
    const periode = next.periode ?? mode;

    if (periode !== "semaine") p.set("periode", periode);

    if (periode === "semaine") {
      const week = next.semaine ?? semaine;
      const current = weeks.find((w) => w.isCurrent)?.value;
      if (week && week !== current) p.set("semaine", week);
    } else if (periode === "mois") {
      p.set("mois", next.mois ?? mois);
    } else if (periode === "jour") {
      p.set("on", next.on ?? on);
    } else {
      p.set("from", next.from ?? from);
      p.set("to", next.to ?? to);
    }

    if (canFilterOwners) {
      const own = next.owner !== undefined ? next.owner : ownerId;
      if (own && own !== "all") p.set(ownerParamKey, own);
    }

    if (keepParams) {
      for (const [k, v] of Object.entries(keepParams)) {
        if (!v || p.has(k)) continue;
        if (k === "owner" || k === "collab") continue;
        p.set(k, v);
      }
    }

    const qs = p.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    start(() => {
      router.push(href, { scroll: false });
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-msk-ink/[0.08] bg-white px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        pending && "opacity-70",
        className,
      )}
      aria-busy={pending || undefined}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {periodModes.length > 1 ? (
          <div className="flex flex-wrap gap-1 rounded-lg bg-msk-chalk/80 p-1">
            {MODE_OPTIONS.filter((m) => periodModes.includes(m.value)).map(
              (m) => (
                <button
                  key={m.value}
                  type="button"
                  disabled={pending}
                  onClick={() => push({ periode: m.value })}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                    mode === m.value
                      ? "bg-white text-msk-ink shadow-sm"
                      : "text-msk-ink/55 hover:text-msk-ink",
                  )}
                >
                  {m.label}
                </button>
              ),
            )}
          </div>
        ) : null}

        {mode === "semaine" ? (
          <>
            <label className="sr-only" htmlFor="crm-scope-semaine">
              Semaine
            </label>
            <CrmWeekPicker
              id="crm-scope-semaine"
              value={semaine}
              weeks={weeks}
              onChange={(v) => push({ semaine: v })}
              disabled={pending}
              size="compact"
            />
          </>
        ) : null}

        {mode === "mois" ? (
          <>
            <label className="sr-only" htmlFor="crm-scope-mois">
              Mois
            </label>
            <input
              id="crm-scope-mois"
              type="month"
              className="h-9 rounded-lg border border-msk-ink/15 bg-white px-2 text-sm"
              disabled={pending}
              value={mois}
              onChange={(e) => push({ mois: e.target.value })}
            />
          </>
        ) : null}

        {mode === "jour" ? (
          <>
            <label className="sr-only" htmlFor="crm-scope-on">
              Jour
            </label>
            <input
              id="crm-scope-on"
              type="date"
              className="h-9 rounded-lg border border-msk-ink/15 bg-white px-2 text-sm"
              disabled={pending}
              value={on}
              onChange={(e) => push({ on: e.target.value })}
            />
          </>
        ) : null}

        {mode === "plage" ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="crm-scope-from">
              Du
            </label>
            <input
              id="crm-scope-from"
              type="date"
              className="h-9 rounded-lg border border-msk-ink/15 bg-white px-2 text-sm"
              disabled={pending}
              value={from}
              onChange={(e) => push({ from: e.target.value })}
            />
            <span className="text-xs text-msk-ink/40">→</span>
            <label className="sr-only" htmlFor="crm-scope-to">
              Au
            </label>
            <input
              id="crm-scope-to"
              type="date"
              className="h-9 rounded-lg border border-msk-ink/15 bg-white px-2 text-sm"
              disabled={pending}
              value={to}
              onChange={(e) => push({ to: e.target.value })}
            />
          </div>
        ) : null}

        {/* Semaine : libellé + « En cours » déjà dans CrmWeekPicker — pas de doublon. */}
        {periodLabel && mode !== "semaine" ? (
          <p className="text-xs text-msk-ink/45">{periodLabel}</p>
        ) : null}
        {lens === "period" ? (
          <span className="rounded-md bg-msk-coral/10 px-2 py-0.5 text-[11px] font-medium text-msk-coral">
            Historique
          </span>
        ) : lens === "live" && mode !== "semaine" ? (
          <span className="rounded-md bg-msk-blue/10 px-2 py-0.5 text-[11px] font-medium text-msk-blue">
            En cours
          </span>
        ) : null}
        {pending ? (
          <span className="text-xs font-medium text-msk-blue">Chargement…</span>
        ) : null}
      </div>

      {canFilterOwners && owners.length > 0 ? (
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="crm-scope-owner">
            Collaborateur
          </label>
          <select
            id="crm-scope-owner"
            className="h-9 max-w-55 rounded-lg border border-msk-ink/15 bg-white px-2 text-sm"
            disabled={pending}
            value={ownerId ?? "all"}
            onChange={(e) =>
              push({
                owner: e.target.value === "all" ? "all" : e.target.value,
              })
            }
          >
            <option value="all">Toute l’équipe</option>
            {owners.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
