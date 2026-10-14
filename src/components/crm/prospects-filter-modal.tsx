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
import { cn } from "@/lib/utils";

type OwnerOpt = { value: string; label: string };
type DateMode = "none" | "exact" | "range";

/** Statuts filtrables — Client exclu (dossier côté Clients). */
const FILTER_STAGES = STAGE_ORDER.filter((s) => s !== "GAGNE");

/** Filtres structurés — la recherche texte reste dans `ListSearchForm` (`?q=`). */
export function ProspectsFilterButton({
  owners,
}: {
  owners: OwnerOpt[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const initialOn = sp.get("on") ?? "";
  const initialFrom = sp.get("from") ?? "";
  const initialTo = sp.get("to") ?? "";
  const initialMode: DateMode = initialOn
    ? "exact"
    : initialFrom || initialTo
      ? "range"
      : "none";

  const [stages, setStages] = useState<string[]>(
    () =>
      sp
        .get("stages")
        ?.split(",")
        .filter((s) => s && s !== "GAGNE") ?? [],
  );
  const [source, setSource] = useState<string | null>(
    () => sp.get("source") || null,
  );
  const [ownerId, setOwnerId] = useState<string | null>(
    () => sp.get("owner") || null,
  );
  const [dateMode, setDateMode] = useState<DateMode>(initialMode);
  const [on, setOn] = useState(initialOn);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [late, setLate] = useState(() => sp.get("late") === "1");

  const activeCount = [
    stages.length > 0,
    Boolean(source),
    Boolean(ownerId),
    dateMode === "exact" ? Boolean(on) : dateMode === "range" && (Boolean(from) || Boolean(to)),
    late,
  ].filter(Boolean).length;

  function apply() {
    const params = new URLSearchParams();
    const keepQ = sp.get("q")?.trim();
    if (keepQ) params.set("q", keepQ);
    if (stages.length) params.set("stages", stages.join(","));
    if (source) params.set("source", source);
    if (ownerId) params.set("owner", ownerId);
    if (dateMode === "exact" && on) {
      params.set("on", on);
    } else if (dateMode === "range") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    if (late) params.set("late", "1");
    const qs = params.toString();
    start(() => {
      router.push(qs ? `/crm/prospects?${qs}` : "/crm/prospects");
      setOpen(false);
    });
  }

  function reset() {
    setStages([]);
    setSource(null);
    setOwnerId(null);
    setDateMode("none");
    setOn("");
    setFrom("");
    setTo("");
    setLate(false);
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
        description="Statut, origine, date de création, collaborateur…"
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
          <OptionPickerMulti
            label="Statuts"
            options={FILTER_STAGES.map((s) => ({
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

          <div className="space-y-2">
            <Label>Date de création</Label>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["none", "Toutes"],
                  ["exact", "Date précise"],
                  ["range", "Plage"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDateMode(mode)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                    dateMode === mode
                      ? "bg-msk-blue text-white"
                      : "bg-msk-chalk text-msk-ink/60 hover:bg-msk-ink/5",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {dateMode === "exact" ? (
              <div>
                <Label htmlFor="on" className="sr-only">
                  Créé le
                </Label>
                <Input
                  id="on"
                  type="date"
                  value={on}
                  onChange={(e) => setOn(e.target.value)}
                  className="mt-1"
                />
              </div>
            ) : null}
            {dateMode === "range" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="from">Depuis</Label>
                  <Input
                    id="from"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="to">Jusqu’au</Label>
                  <Input
                    id="to"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            ) : null}
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
