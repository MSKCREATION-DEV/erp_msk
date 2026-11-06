"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export type ClientsFilterRosterEntry = {
  id: string;
  label: string;
};

/**
 * Filtre multi « Suivi par » sur la liste clients (`owners` CSV).
 * Le focus `owner=` reste prioritaire (géré côté serveur).
 */
export function ClientsFilterModal({
  roster,
  readTeam,
}: {
  roster: ClientsFilterRosterEntry[];
  readTeam: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);

  const initialSelected = useMemo(() => {
    const raw = sp.get("owners")?.trim();
    if (!raw) return new Set<string>();
    return new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }, [sp]);

  const [selected, setSelected] = useState<Set<string>>(initialSelected);

  if (!readTeam) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function apply() {
    const p = new URLSearchParams(sp.toString());
    p.delete("page");
    if (selected.size === 0) {
      p.delete("owners");
    } else {
      p.set("owners", [...selected].join(","));
    }
    setOpen(false);
    router.push(`/commercial/clients?${p.toString()}`);
  }

  function clear() {
    const p = new URLSearchParams(sp.toString());
    p.delete("owners");
    p.delete("page");
    setSelected(new Set());
    setOpen(false);
    router.push(`/commercial/clients?${p.toString()}`);
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          setSelected(initialSelected);
          setOpen(true);
        }}
      >
        <Filter className="h-4 w-4" aria-hidden />
        Filtrer
        {initialSelected.size > 0 ? (
          <span className="ml-1 rounded-full bg-msk-blue/10 px-2 py-0.5 text-xs font-semibold text-msk-blue">
            {initialSelected.size}
          </span>
        ) : null}
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Filtres liste clients"
        description="Restreindre par collaborateur en charge du suivi (multi-sélection)."
        size="lg"
      >
        <div className="space-y-4 p-5">
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-msk-ink/8 bg-msk-chalk/30 p-3">
            {roster.map((u) => (
              <label
                key={u.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/80"
              >
                <input
                  type="checkbox"
                  className="size-4 rounded border-msk-ink/20 text-msk-blue focus:ring-msk-blue"
                  checked={selected.has(u.id)}
                  onChange={() => toggle(u.id)}
                />
                <span className="text-sm text-msk-ink">{u.label}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-msk-ink/6 pt-4">
            <Button type="button" onClick={apply}>
              Appliquer
            </Button>
            <Button type="button" variant="secondary" onClick={clear}>
              Effacer le filtre
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
