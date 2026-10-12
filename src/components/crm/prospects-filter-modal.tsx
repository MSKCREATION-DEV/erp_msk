"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  OptionPickerMulti,
  OptionPickerSingle,
} from "@/components/ui/option-picker-modal";
import { STAGE_LABELS, STAGE_ORDER, SOURCE_LABELS } from "@/lib/crm/labels";

type OwnerOpt = { value: string; label: string };

export function ProspectsFilterButton({
  owners,
}: {
  owners: OwnerOpt[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [stages, setStages] = useState<string[]>(
    () => sp.get("stages")?.split(",").filter(Boolean) ?? [],
  );
  const [source, setSource] = useState<string | null>(
    () => sp.get("source") || null,
  );
  const [ownerId, setOwnerId] = useState<string | null>(
    () => sp.get("owner") || null,
  );
  const [from, setFrom] = useState(() => sp.get("from") ?? "");
  const [to, setTo] = useState(() => sp.get("to") ?? "");
  const [late, setLate] = useState(() => sp.get("late") === "1");
  const [q, setQ] = useState(() => sp.get("q") ?? "");

  const activeCount = [
    stages.length > 0,
    Boolean(source),
    Boolean(ownerId),
    Boolean(from),
    Boolean(to),
    late,
    Boolean(q.trim()),
  ].filter(Boolean).length;

  function apply() {
    const params = new URLSearchParams(sp.toString());
    const keepVue = params.get("vue");
    params.delete("stages");
    params.delete("source");
    params.delete("owner");
    params.delete("from");
    params.delete("to");
    params.delete("late");
    params.delete("q");
    if (keepVue) params.set("vue", keepVue);
    if (stages.length) params.set("stages", stages.join(","));
    if (source) params.set("source", source);
    if (ownerId) params.set("owner", ownerId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (late) params.set("late", "1");
    if (q.trim()) params.set("q", q.trim());
    start(() => {
      router.push(`/crm/prospects?${params.toString()}`);
      setOpen(false);
    });
  }

  function reset() {
    setStages([]);
    setSource(null);
    setOwnerId(null);
    setFrom("");
    setTo("");
    setLate(false);
    setQ("");
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Filtrer{activeCount > 0 ? ` (${activeCount})` : ""}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Filtres prospects"
        description="Affinez la liste — statut, origine, dates, collab…"
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
        <div className="space-y-4 p-4">
          <div>
            <Label htmlFor="fq">Recherche</Label>
            <Input
              id="fq"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Entreprise, contact…"
              className="mt-1"
            />
          </div>
          <OptionPickerMulti
            label="Statuts"
            options={STAGE_ORDER.map((s) => ({
              value: s,
              label: STAGE_LABELS[s],
            }))}
            value={stages}
            onChange={setStages}
          />
          <OptionPickerSingle
            label="Origine"
            options={Object.entries(SOURCE_LABELS).map(([k, v]) => ({
              value: k,
              label: v,
            }))}
            value={source}
            onChange={setSource}
            placeholder="Toutes"
          />
          {owners.length > 0 ? (
            <OptionPickerSingle
              label="Suivi par"
              options={owners}
              value={ownerId}
              onChange={setOwnerId}
              placeholder="Toute l’équipe"
            />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="from">Créé depuis</Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="to">Créé jusqu’au</Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-msk-ink">
            <input
              type="checkbox"
              checked={late}
              onChange={(e) => setLate(e.target.checked)}
            />
            Relance en retard uniquement
          </label>
        </div>
      </Modal>
    </>
  );
}
