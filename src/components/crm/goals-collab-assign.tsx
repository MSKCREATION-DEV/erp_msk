"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

export type CollabOption = {
  id: string;
  firstName: string;
  lastName: string;
};

function ChipPendingLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return <>{pending ? "…" : label}</>;
}

/**
 * Navigation collab pour l’assignation d’objectifs (URL `?collab=`).
 * Chips de navigation avec feedback pending — pas de select brut.
 */
export function GoalsCollabNav({
  members,
  selectedId,
  /** Conserve la semaine sélectionnée (ex. `semaine=2026-10-06`). */
  semaine,
}: {
  members: CollabOption[];
  selectedId: string;
  semaine?: string;
}) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-msk-ink/45">Aucun collaborateur commercial.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m) => {
        const active = m.id === selectedId;
        const label = `${m.firstName} ${m.lastName}`;
        const p = new URLSearchParams();
        p.set("collab", m.id);
        if (semaine) p.set("semaine", semaine);
        return (
          <Link
            key={m.id}
            prefetch={false}
            href={`/crm/objectifs?${p.toString()}`}
            className={cn(
              "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition",
              active
                ? "bg-msk-blue text-white"
                : "border border-msk-ink/12 bg-white text-msk-ink/70 hover:border-msk-blue/30 hover:text-msk-ink",
            )}
            aria-current={active ? "page" : undefined}
          >
            <ChipPendingLabel label={label} />
          </Link>
        );
      })}
    </div>
  );
}
