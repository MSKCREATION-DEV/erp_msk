"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Check,
  FileText,
  MessageCircle,
  Phone,
  Search,
  ThumbsUp,
  UserPlus,
  XCircle,
} from "lucide-react";
import type { CrmSource, CrmPipelineStage } from "@/generated/prisma/client";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STAGE_LABELS, STAGE_ORDER, SOURCE_LABELS } from "@/lib/crm/labels";
import {
  copyCrmScopeParams,
  hasCrmScopePeriodParams,
} from "@/lib/crm/scope-period";
import { appendSortParams } from "@/lib/list/sort";
import { parseProspectFilterSources } from "@/lib/crm/prospect-list-filters";
import type { CommercialOwnerOption } from "@/lib/crm/team";
import { USER_STATUS_LABEL, USER_STATUS_TONE } from "@/lib/users/status";
import { SourceChannelIcon } from "@/components/brand/channel-icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DateMode = "none" | "exact" | "range";

/** Statuts filtrables — Client exclu (fiche côté Clients). */
const FILTER_STAGES = STAGE_ORDER.filter((s) => s !== "GAGNE");

const STAGE_ICONS: Record<
  CrmPipelineStage,
  typeof UserPlus
> = {
  NOUVEAU: UserPlus,
  CONTACTE: Phone,
  QUALIFICATION: MessageCircle,
  INTERESSE: ThumbsUp,
  DEVIS_ENVOYE: FileText,
  NEGOCIATION: FileText,
  GAGNE: UserPlus,
  PERDU: XCircle,
};

function spRecord(sp: URLSearchParams): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of sp.entries()) out[k] = v;
  return out;
}

/** Dates du modal Filtrer — ignore la lentille CRM (`periode` / `semaine` / `mois`). */
function dateModeFromParams(sp: URLSearchParams): DateMode {
  if (hasCrmScopePeriodParams(spRecord(sp))) return "none";
  if (sp.get("on")) return "exact";
  if (sp.get("from") || sp.get("to")) return "range";
  return "none";
}

/**
 * Compteur Filtrer — source de vérité = URL.
 * `owner` (focus collaborateur) est exclu : géré par le bandeau Focus.
 * Filtre modal « Suivi par » multi (`owners`) compte pour 1 lorsqu’il est actif.
 * Période CRM (barre dashboard) exclue — ce n’est pas un filtre modal.
 */
function countActiveFilters(sp: URLSearchParams): number {
  const stages =
    sp
      .get("stages")
      ?.split(",")
      .filter((s) => s && s !== "GAGNE") ?? [];
  const mode = dateModeFromParams(sp);
  const crmPeriod = hasCrmScopePeriodParams(spRecord(sp));
  const sources = parseProspectFilterSources(spRecord(sp));
  const ownerModalActive =
    Boolean(sp.get("owners")?.trim()) && !sp.get("owner")?.trim();
  return [
    stages.length > 0,
    sources.length > 0,
    ownerModalActive,
    !crmPeriod &&
      (mode === "exact"
        ? Boolean(sp.get("on"))
        : mode === "range" &&
          (Boolean(sp.get("from")) || Boolean(sp.get("to")))),
    sp.get("late") === "1",
    sp.get("event") === "nouveaux",
    sp.get("devisRetard") === "1",
  ].filter(Boolean).length;
}

function stateFromSearchParams(sp: URLSearchParams) {
  const crmPeriod = hasCrmScopePeriodParams(spRecord(sp));
  const sources = parseProspectFilterSources(spRecord(sp));
  const focusOwner = sp.get("owner")?.trim() ?? null;
  const ownerIds =
    focusOwner || !sp.get("owners")?.trim()
      ? []
      : sp
          .get("owners")!
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean);
  return {
    stages:
      sp
        .get("stages")
        ?.split(",")
        .filter((s) => s && s !== "GAGNE") ?? [],
    sources,
    ownerIds,
    dateMode: dateModeFromParams(sp),
    on: crmPeriod ? "" : (sp.get("on") ?? ""),
    from: crmPeriod ? "" : (sp.get("from") ?? ""),
    to: crmPeriod ? "" : (sp.get("to") ?? ""),
    late: sp.get("late") === "1",
    eventNouveaux: sp.get("event") === "nouveaux",
    devisRetard: sp.get("devisRetard") === "1",
  };
}

const SOURCE_KEYS = Object.keys(SOURCE_LABELS) as CrmSource[];

function toggleInList<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((x) => x !== value)
    : [...list, value];
}

/** Filtres structurés — la recherche texte reste dans `ListSearchForm` (`?q=`). */
export function ProspectsFilterButton({
  owners,
}: {
  owners: CommercialOwnerOption[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [ownersPickerOpen, setOwnersPickerOpen] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [pending, start] = useTransition();

  const initial = stateFromSearchParams(sp);
  const [stages, setStages] = useState<string[]>(initial.stages);
  const [sources, setSources] = useState<CrmSource[]>(initial.sources);
  const [ownerIds, setOwnerIds] = useState<string[]>(initial.ownerIds);
  const [dateMode, setDateMode] = useState<DateMode>(initial.dateMode);
  const [on, setOn] = useState(initial.on);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [late, setLate] = useState(initial.late);
  const [eventNouveaux, setEventNouveaux] = useState(initial.eventNouveaux);
  const [devisRetard, setDevisRetard] = useState(initial.devisRetard);

  const qsKey = sp.toString();

  /** Sync état local ↔ URL (croix focus, Effacer, navigation arrière). */
  useEffect(() => {
    const next = stateFromSearchParams(sp);
    setStages(next.stages);
    setSources(next.sources);
    setOwnerIds(next.ownerIds);
    setDateMode(next.dateMode);
    setOn(next.on);
    setFrom(next.from);
    setTo(next.to);
    setLate(next.late);
    setEventNouveaux(next.eventNouveaux);
    setDevisRetard(next.devisRetard);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- qsKey = snapshot URL
  }, [qsKey]);

  const activeCount = countActiveFilters(sp);

  const selectedOwnersDisplay = useMemo(() => {
    return ownerIds
      .map((id) => owners.find((o) => o.value === id))
      .filter((o): o is CommercialOwnerOption => Boolean(o));
  }, [ownerIds, owners]);

  const filteredOwnersRows = useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();
    if (!q) return owners;
    return owners.filter((o) => o.label.toLowerCase().includes(q));
  }, [owners, ownerSearch]);

  function apply() {
    const params = new URLSearchParams();
    const keepQ = sp.get("q")?.trim();
    if (keepQ) params.set("q", keepQ);
    if (stages.length) params.set("stages", stages.join(","));
    if (sources.length) params.set("sources", sources.join(","));
    const urlFocus = sp.get("owner")?.trim();
    if (ownerIds.length > 0) {
      params.set("owners", [...new Set(ownerIds)].join(","));
    } else if (urlFocus) {
      params.set("owner", urlFocus);
    }
    if (dateMode === "exact" && on) {
      params.set("on", on);
    } else if (dateMode === "range") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    } else {
      /** Pas de date modal → conserver la période CRM (pas l’event — géré plus bas). */
      copyCrmScopeParams(sp, params, { includeOwner: false });
    }
    if (late) params.set("late", "1");
    if (devisRetard) params.set("devisRetard", "1");
    if (eventNouveaux) params.set("event", "nouveaux");
    /**
     * Portefeuille à date : garder `view=stock` si on n’a pas basculé en flux
     * (nouveaux) ni en dates de création modal.
     */
    const keepStock =
      !eventNouveaux &&
      dateMode === "none" &&
      (devisRetard ||
        late ||
        stages.length > 0 ||
        sp.get("view") === "stock");
    if (keepStock) params.set("view", "stock");
    // Conserver le tri courant (ne pas le perdre au apply filtre).
    appendSortParams(params, sp);

    const qs = params.toString();
    start(() => {
      router.push(qs ? `/crm/prospects?${qs}` : "/crm/prospects");
      setOpen(false);
    });
  }

  function reset() {
    setStages([]);
    setSources([]);
    setOwnerIds([]);
    setDateMode("none");
    setOn("");
    setFrom("");
    setTo("");
    setLate(false);
    setEventNouveaux(false);
    setDevisRetard(false);
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
        description="Statuts, origines, Suivi par, date de création…"
        size="lg"
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
        <div className="space-y-8 p-5 sm:p-6">
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-msk-ink">Statuts</h3>
              <p className="mt-0.5 text-xs text-msk-ink/50">
                Un ou plusieurs statuts — multi-sélection
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTER_STAGES.map((stage) => {
                const Icon = STAGE_ICONS[stage];
                const onStage = stages.includes(stage);
                return (
                  <button
                    key={stage}
                    type="button"
                    aria-pressed={onStage}
                    onClick={() =>
                      setStages((prev) =>
                        toggleInList([...prev] as string[], stage) as string[],
                      )
                    }
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition",
                      onStage
                        ? "border-msk-blue bg-msk-blue/8 text-msk-blue ring-1 ring-msk-blue/25"
                        : "border-msk-ink/10 bg-white text-msk-ink/80 hover:border-msk-ink/15 hover:bg-msk-chalk",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        onStage ? "text-msk-blue" : "text-msk-ink/45",
                      )}
                      aria-hidden
                    />
                    <span>{STAGE_LABELS[stage]}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-msk-ink">Origines</h3>
              <p className="mt-0.5 text-xs text-msk-ink/50">
                Canaux — multi-sélection
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SOURCE_KEYS.map(                    (src) => {
                const onSrc = sources.includes(src);
                return (
                  <button
                    key={src}
                    type="button"
                    aria-pressed={onSrc}
                    aria-label={SOURCE_LABELS[src]}
                    onClick={() =>
                      setSources((prev) => toggleInList(prev, src))
                    }
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition",
                      onSrc
                        ? "border-msk-blue bg-msk-blue/8 text-msk-blue ring-1 ring-msk-blue/25"
                        : "border-msk-ink/10 bg-white text-msk-ink/80 hover:border-msk-ink/15 hover:bg-msk-chalk",
                    )}
                  >
                    <SourceChannelIcon
                      source={src}
                      className={cn(
                        "h-4 w-4 shrink-0",
                        onSrc ? "text-msk-blue" : "text-msk-ink/45",
                      )}
                    />
                    <span className="min-w-0 truncate">{SOURCE_LABELS[src]}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {owners.length > 0 ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-msk-ink">
                    Suivi par
                  </h3>
                  <p className="mt-0.5 text-xs text-msk-ink/50">
                    Plusieurs collaborateurs — ignoré si un focus est actif (paramètre{" "}
                    <span className="font-mono text-[11px]">owner</span> dans l’URL).
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={Boolean(sp.get("owner")?.trim())}
                  title={
                    sp.get("owner")?.trim()
                      ? "Retirez le focus collaborateur pour filtrer plusieurs Suivi par"
                      : undefined
                  }
                  onClick={() => {
                    setOwnerSearch("");
                    setOwnersPickerOpen(true);
                  }}
                >
                  {ownerIds.length > 0
                    ? `Modifier (${ownerIds.length})`
                    : "Choisir…"}
                </Button>
              </div>
              {sp.get("owner")?.trim() ? (
                <p className="text-xs text-msk-coral/90">
                  Un focus collaborateur est actif — utilisez la croix du bandeau
                  pour revenir au filtre multi.
                </p>
              ) : selectedOwnersDisplay.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Suivi par sélectionné">
                  {selectedOwnersDisplay.map((o) => {
                    const shortName = o.label.replace(/\s*\([^)]*\)\s*$/, "");
                    return (
                      <li key={o.value}>
                        <Badge tone="blue" className="font-normal">
                          {shortName}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-msk-ink/45">Toute l’équipe (portée)</p>
              )}
            </section>
          ) : null}

          <Modal
            open={ownersPickerOpen}
            onOpenChange={(v) => {
              setOwnersPickerOpen(v);
              if (!v) setOwnerSearch("");
            }}
            title="Suivi par — sélection"
            description="Recherche, colonnes Collaborateur et statut — multi-sélection"
            size="xl"
            className="z-[60]"
            footer={
              <div className="flex w-full justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setOwnersPickerOpen(false)}
                >
                  Fermer
                </Button>
              </div>
            }
          >
            <div className="space-y-3 p-4 sm:p-5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-msk-ink/35"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                  placeholder="Rechercher un collaborateur…"
                  className="pl-9"
                  aria-label="Rechercher un collaborateur"
                />
              </div>
              <div className="overflow-auto rounded-xl border border-msk-ink/8 bg-white">
                <table className="w-full min-w-72 text-sm">
                  <thead className="sticky top-0 z-[1] border-b border-msk-ink/8 bg-msk-chalk/80 text-[11px] uppercase tracking-wide text-msk-ink/45 backdrop-blur-sm">
                    <tr>
                      <th className="w-10 px-2 py-2 text-left" scope="col">
                        <span className="sr-only">Sélection</span>
                      </th>
                      <th className="px-3 py-2 text-left font-semibold" scope="col">
                        Collaborateur
                      </th>
                      <th className="px-3 py-2 text-left font-semibold" scope="col">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-msk-ink/6">
                    {filteredOwnersRows.map((o) => {
                      const selected = ownerIds.includes(o.value);
                      const statusLabel = USER_STATUS_LABEL[o.status] ?? o.status;
                      const tone = USER_STATUS_TONE[o.status] ?? "muted";
                      const nameOnly = o.label.replace(/\s*\([^)]*\)\s*$/, "").trim();
                      return (
                        <tr
                          key={o.value}
                          className={cn(
                            "transition hover:bg-msk-chalk/50",
                            selected ? "bg-msk-blue/5" : "",
                          )}
                        >
                          <td className="px-2 py-2.5 align-middle">
                            <button
                              type="button"
                              aria-pressed={selected}
                              onClick={() =>
                                setOwnerIds((prev) =>
                                  toggleInList(prev, o.value),
                                )
                              }
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-lg border transition",
                                selected
                                  ? "border-msk-blue bg-msk-blue text-white"
                                  : "border-msk-ink/15 bg-white text-msk-ink/30 hover:border-msk-blue/40",
                              )}
                              aria-label={
                                selected ? "Désélectionner" : "Sélectionner"
                              }
                            >
                              {selected ? (
                                <Check className="h-4 w-4" aria-hidden />
                              ) : null}
                            </button>
                          </td>
                          <td className="px-3 py-2.5 font-medium text-msk-ink">
                            {nameOnly}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge tone={tone} className="font-normal">
                              {statusLabel}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredOwnersRows.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-msk-ink/45">
                    Aucun collaborateur pour cette recherche.
                  </p>
                ) : null}
              </div>
            </div>
          </Modal>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-msk-ink">
              Date de création
            </h3>
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
                  className="mt-1 max-w-xs"
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
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-msk-ink">Options</h3>
            <label className="flex items-center gap-2 text-sm text-msk-ink">
              <input
                type="checkbox"
                checked={late}
                onChange={(e) => setLate(e.target.checked)}
              />
              Relance en retard uniquement
            </label>
            <label className="flex items-center gap-2 text-sm text-msk-ink">
              <input
                type="checkbox"
                checked={devisRetard}
                onChange={(e) => setDevisRetard(e.target.checked)}
              />
              Sans devis depuis 24 h — statut Intéressé
            </label>
            <label className="flex items-center gap-2 text-sm text-msk-ink">
              <input
                type="checkbox"
                checked={eventNouveaux}
                onChange={(e) => setEventNouveaux(e.target.checked)}
              />
              Nouveaux de la période CRM uniquement
            </label>
          </section>
        </div>
      </Modal>
    </>
  );
}
