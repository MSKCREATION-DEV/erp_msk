"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { WeekOption } from "@/lib/crm/week";
import { cn } from "@/lib/utils";

export function RapportFilters({
  semaine,
  weeks,
  ownerId,
  owners,
  canFilterOwners,
}: {
  /** Lundi ISO `YYYY-MM-DD` de la semaine active. */
  semaine: string;
  weeks: WeekOption[];
  /** `all` = toute l’équipe · uuid = collab · null = pas de filtre (collab own). */
  ownerId: string | null;
  owners: { value: string; label: string }[];
  canFilterOwners: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function push(next: { semaine?: string; owner?: string | null }) {
    const p = new URLSearchParams();
    const week = next.semaine ?? semaine;
    const current = weeks.find((w) => w.isCurrent)?.value;
    if (week && week !== current) p.set("semaine", week);

    if (canFilterOwners) {
      const own = next.owner !== undefined ? next.owner : ownerId;
      if (own && own !== "all") p.set("owner", own);
      else if (own === "all" || own === null) {
        /* défaut Tous = pas de param owner */
      }
    }

    const qs = p.toString();
    start(() => {
      router.push(qs ? `/crm/rapport-semaine?${qs}` : "/crm/rapport-semaine");
    });
  }

  const byMonth = weeks.reduce<Record<string, WeekOption[]>>((acc, w) => {
    (acc[w.monthKey] ??= []).push(w);
    return acc;
  }, {});

  // Plus récents en premier dans le select
  const monthKeys = Object.keys(byMonth).sort().reverse();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        pending && "opacity-70",
      )}
      aria-busy={pending || undefined}
    >
      <label className="sr-only" htmlFor="rapport-semaine">
        Semaine
      </label>
      <select
        id="rapport-semaine"
        className="h-9 max-w-70 rounded-lg border border-msk-ink/15 bg-white px-2 text-sm"
        disabled={pending}
        value={semaine}
        onChange={(e) => push({ semaine: e.target.value })}
      >
        {monthKeys.map((mk) => {
          const group = byMonth[mk]!;
          const label = group[0]?.monthLabel ?? mk;
          return (
            <optgroup key={mk} label={label}>
              {[...group].reverse().map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                  {w.isCurrent ? " · actuelle" : ""}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>

      {canFilterOwners && owners.length > 0 ? (
        <>
          <label className="sr-only" htmlFor="rapport-owner">
            Collaborateur
          </label>
          <select
            id="rapport-owner"
            className="h-9 max-w-55 rounded-lg border border-msk-ink/15 bg-white px-2 text-sm"
            disabled={pending}
            value={ownerId ?? "all"}
            onChange={(e) =>
              push({ owner: e.target.value === "all" ? "all" : e.target.value })
            }
          >
            <option value="all">Toute l’équipe</option>
            {owners.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </>
      ) : null}

      {pending ? (
        <span className="text-xs font-medium text-msk-blue">Chargement…</span>
      ) : null}
    </div>
  );
}
