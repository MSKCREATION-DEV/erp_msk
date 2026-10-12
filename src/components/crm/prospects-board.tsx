"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CrmPipelineStage } from "@prisma/client";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/crm/labels";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type BoardCard = {
  id: string;
  orgName: string;
  ownerLabel: string;
  nextAction: string | null;
  followUpLabel: string | null;
  late: boolean;
  stage: CrmPipelineStage;
};

export function ProspectsBoard({ cards }: { cards: BoardCard[] }) {
  const [q, setQ] = useState("");
  const columns = STAGE_ORDER.filter((s) => s !== "GAGNE" && s !== "PERDU");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter(
      (c) =>
        c.orgName.toLowerCase().includes(needle) ||
        c.ownerLabel.toLowerCase().includes(needle) ||
        (c.nextAction?.toLowerCase().includes(needle) ?? false),
    );
  }, [cards, q]);

  const byStage = useMemo(() => {
    const map = new Map<CrmPipelineStage, BoardCard[]>();
    for (const s of columns) map.set(s, []);
    for (const c of filtered) {
      const st = c.stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : c.stage;
      if (!map.has(st)) continue;
      map.get(st)!.push(c);
    }
    return map;
  }, [filtered, columns]);

  return (
    <div className="space-y-3">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher une carte (entreprise, collab, action…)"
        className="max-w-md bg-white"
      />
      <div className="-mx-1 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3 px-1">
          {columns.map((stage) => {
            const list = byStage.get(stage) ?? [];
            return (
              <section
                key={stage}
                className="flex w-[260px] shrink-0 flex-col rounded-xl border border-msk-ink/[0.08] bg-white"
              >
                <header className="flex items-center justify-between border-b border-msk-ink/[0.06] px-3 py-2.5">
                  <h2 className="text-sm font-semibold text-msk-ink">
                    {STAGE_LABELS[stage]}
                  </h2>
                  <span className="rounded-md bg-msk-chalk px-2 py-0.5 text-xs font-medium text-msk-ink/55">
                    {list.length}
                  </span>
                </header>
                <ul className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
                  {list.length === 0 ? (
                    <li className="px-2 py-6 text-center text-xs text-msk-ink/35">
                      Vide
                    </li>
                  ) : (
                    list.map((d) => (
                      <li key={d.id}>
                        <Link
                          prefetch={false}
                          href={`/crm/prospects/${d.id}`}
                          className={cn(
                            "block rounded-lg border border-msk-ink/[0.06] bg-msk-chalk/40 px-3 py-2.5 transition hover:border-msk-blue/30 hover:bg-white",
                            d.late && "border-msk-coral/40",
                          )}
                        >
                          <p className="truncate text-sm font-medium text-msk-ink">
                            {d.orgName}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-msk-ink/45">
                            {d.ownerLabel}
                            {d.followUpLabel
                              ? ` · ${d.followUpLabel}`
                              : " · Sans relance"}
                            {d.late ? " · Retard" : ""}
                          </p>
                          {d.nextAction ? (
                            <p className="mt-1 line-clamp-2 text-[11px] text-msk-ink/60">
                              {d.nextAction}
                            </p>
                          ) : null}
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
