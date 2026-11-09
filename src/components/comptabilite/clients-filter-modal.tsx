"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { appendSortParams } from "@/lib/list/sort";
import {
  CLIENT_ACCOUNT_STATUT_LABELS,
  CLIENT_ACCOUNT_STATUT_VALUES,
  parseClientAccountStatutFilter,
  type ClientAccountStatut,
} from "@/lib/comptabilite/client-accounts";
import { cn } from "@/lib/utils";

const STATUT_ICONS: Record<ClientAccountStatut, typeof Clock3> = {
  RETARD: AlertTriangle,
  OUVERT: Clock3,
  SOLDE: CheckCircle2,
};

function spRecord(sp: URLSearchParams): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of sp.entries()) out[k] = v;
  return out;
}

/** Filtre statut (Ouvert / En retard / Soldé) — recherche texte gérée par `ListSearchForm`. */
export function ClientsFilterButton() {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const initial = parseClientAccountStatutFilter(spRecord(sp));
  const [statut, setStatut] = useState<ClientAccountStatut[]>(initial);

  const qsKey = sp.toString();
  useEffect(() => {
    setStatut(parseClientAccountStatutFilter(spRecord(sp)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- qsKey = snapshot URL
  }, [qsKey]);

  const activeCount = initial.length > 0 ? 1 : 0;

  function toggle(value: ClientAccountStatut) {
    setStatut((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  }

  function apply() {
    const params = new URLSearchParams();
    const keepQ = sp.get("q")?.trim();
    if (keepQ) params.set("q", keepQ);
    if (statut.length > 0) params.set("statut", statut.join(","));
    appendSortParams(params, sp);
    const qs = params.toString();
    start(() => {
      router.push(qs ? `/comptabilite/clients?${qs}` : "/comptabilite/clients");
      setOpen(false);
    });
  }

  function reset() {
    setStatut([]);
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Filtrer{activeCount > 0 ? ` (${activeCount})` : ""}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Filtrer les clients"
        description="Statut du solde — une ou plusieurs valeurs"
        size="md"
        footer={
          <div className="flex w-full flex-wrap justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Réinitialiser
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button type="button" size="sm" disabled={pending} onClick={apply}>
                {pending ? "…" : "Appliquer"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3 p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-msk-ink">Statut du solde</h3>
          <div className="flex flex-wrap gap-2">
            {CLIENT_ACCOUNT_STATUT_VALUES.map((value) => {
              const Icon = STATUT_ICONS[value];
              const on = statut.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(value)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition",
                    on
                      ? "border-msk-blue bg-msk-blue/8 text-msk-blue ring-1 ring-msk-blue/25"
                      : "border-msk-ink/10 bg-white text-msk-ink/80 hover:border-msk-ink/15 hover:bg-msk-chalk",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      on ? "text-msk-blue" : "text-msk-ink/45",
                    )}
                    aria-hidden
                  />
                  <span>{CLIENT_ACCOUNT_STATUT_LABELS[value]}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-msk-ink/45">
            Sans sélection : tous les clients (hors archivés).
          </p>
        </div>
      </Modal>
    </>
  );
}
