"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

export function RapportFilters({
  periode,
  ownerId,
  owners,
}: {
  periode: "semaine" | "annee";
  ownerId: string | null;
  owners: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function push(next: { periode?: string; owner?: string | null }) {
    const p = new URLSearchParams();
    const per = next.periode ?? periode;
    if (per === "annee") p.set("periode", "annee");
    const own = next.owner !== undefined ? next.owner : ownerId;
    if (own) p.set("owner", own);
    start(() => router.push(`/crm/rapport-semaine?${p.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border border-msk-ink/10 bg-white p-0.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => push({ periode: "semaine" })}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            periode === "semaine"
              ? "bg-msk-blue text-white"
              : "text-msk-ink/55",
          )}
        >
          Semaine
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => push({ periode: "annee" })}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            periode === "annee" ? "bg-msk-blue text-white" : "text-msk-ink/55",
          )}
        >
          Année
        </button>
      </div>
      {owners.length > 0 ? (
        <select
          className="h-9 rounded-lg border border-msk-ink/15 bg-white px-2 text-sm"
          disabled={pending}
          value={ownerId ?? ""}
          onChange={(e) => push({ owner: e.target.value || null })}
        >
          <option value="">Mon périmètre</option>
          {owners.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
