"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  SV_CATEGORY_FAMILIES,
  SV_CATEGORY_FAMILY_LABEL,
  type SvCategoryFamily,
} from "@/lib/suivi/categories";
import {
  SV_PERIOD_MODES,
  type SvPeriodMode,
} from "@/lib/suivi/dashboard-period";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { cn } from "@/lib/utils";

const PERIOD_LABEL: Record<SvPeriodMode, string> = {
  jour: "Jour",
  semaine: "Semaine",
  mois: "Mois",
  annee: "Année",
};

const COMPTE_OPTIONS = [
  { value: "", label: "Tous les comptes" },
  { value: "PHYSICAL", label: "Physique" },
  { value: "BANK", label: "Banque" },
] as const;

export function SvDashboardFilters({
  mode,
  on,
  semaine,
  mois,
  annee,
  compte,
  categorie,
  periodLabel,
}: {
  mode: SvPeriodMode;
  on: string;
  semaine: string;
  mois: string;
  annee: string;
  compte: "PHYSICAL" | "BANK" | null;
  categorie: SvCategoryFamily | null;
  periodLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  function push(next: {
    periode?: SvPeriodMode;
    on?: string;
    semaine?: string;
    mois?: string;
    annee?: string;
    compte?: string | null;
    categorie?: string | null;
  }) {
    const p = new URLSearchParams();
    const periode = next.periode ?? mode;
    if (periode !== "mois") p.set("periode", periode);

    if (periode === "jour") p.set("on", next.on ?? on);
    else if (periode === "semaine") p.set("semaine", next.semaine ?? semaine);
    else if (periode === "mois") {
      const m = next.mois ?? mois;
      const now = new Date();
      const cur = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
      if (m !== cur) p.set("mois", m);
    } else {
      const y = next.annee ?? annee;
      if (y !== String(new Date().getUTCFullYear())) p.set("annee", y);
    }

    const c = next.compte === undefined ? compte : next.compte;
    if (c) p.set("compte", c);

    const cat = next.categorie === undefined ? categorie : next.categorie;
    if (cat) p.set("categorie", cat);

    const q = p.toString();
    start(() => {
      router.push(q ? `${pathname}?${q}` : pathname);
    });
  }

  const catOptions = [
    { value: "", label: "Toutes catégories" },
    ...SV_CATEGORY_FAMILIES.filter((f) => f !== "ouverture").map((f) => ({
      value: f,
      label: SV_CATEGORY_FAMILY_LABEL[f],
    })),
  ];

  return (
    <div
      className={cn(
        "rounded-xl border border-msk-ink/8 bg-white p-3 sm:p-4",
        pending && "opacity-70",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
          Filtres
        </p>
        <p className="text-sm text-msk-ink/60">{periodLabel}</p>
      </div>

      <div
        role="group"
        aria-label="Période"
        className="mt-3 flex flex-wrap gap-1.5"
      >
        {SV_PERIOD_MODES.map((m) => (
          <button
            key={m}
            type="button"
            disabled={pending}
            onClick={() => push({ periode: m })}
            className={cn(
              "h-9 rounded-lg px-3 text-sm font-medium transition",
              mode === m
                ? "bg-msk-blue text-white"
                : "border border-msk-ink/12 bg-msk-chalk/40 text-msk-ink hover:bg-msk-chalk",
            )}
          >
            {PERIOD_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {mode === "jour" ? (
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-msk-ink/50">
              Date
            </span>
            <input
              type="date"
              value={on}
              disabled={pending}
              onChange={(e) => push({ on: e.target.value })}
              className="h-10 w-full rounded-lg border border-msk-ink/12 bg-white px-3 text-sm outline-none focus:border-msk-blue focus:ring-2 focus:ring-msk-blue/20"
            />
          </label>
        ) : null}
        {mode === "semaine" ? (
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-msk-ink/50">
              Semaine (lundi)
            </span>
            <input
              type="date"
              value={semaine}
              disabled={pending}
              onChange={(e) => push({ semaine: e.target.value })}
              className="h-10 w-full rounded-lg border border-msk-ink/12 bg-white px-3 text-sm outline-none focus:border-msk-blue focus:ring-2 focus:ring-msk-blue/20"
            />
          </label>
        ) : null}
        {mode === "mois" ? (
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-msk-ink/50">
              Mois
            </span>
            <input
              type="month"
              value={mois}
              disabled={pending}
              onChange={(e) => push({ mois: e.target.value })}
              className="h-10 w-full rounded-lg border border-msk-ink/12 bg-white px-3 text-sm outline-none focus:border-msk-blue focus:ring-2 focus:ring-msk-blue/20"
            />
          </label>
        ) : null}
        {mode === "annee" ? (
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-msk-ink/50">
              Année
            </span>
            <input
              type="number"
              min={2020}
              max={2100}
              value={annee}
              disabled={pending}
              onChange={(e) => push({ annee: e.target.value })}
              className="h-10 w-full rounded-lg border border-msk-ink/12 bg-white px-3 text-sm outline-none focus:border-msk-blue focus:ring-2 focus:ring-msk-blue/20"
            />
          </label>
        ) : null}

        <OptionPickerSingle
          label="Compte"
          value={compte ?? "__all__"}
          onChange={(v) =>
            push({
              compte:
                v === "PHYSICAL" || v === "BANK" ? v : null,
            })
          }
          options={COMPTE_OPTIONS.map((o) => ({
            value: o.value || "__all__",
            label: o.label,
          }))}
          placeholder="Tous"
          disabled={pending}
        />

        <OptionPickerSingle
          label="Catégorie"
          value={categorie ?? "__all__"}
          onChange={(v) =>
            push({
              categorie:
                v && v !== "__all__"
                  ? (v as SvCategoryFamily)
                  : null,
            })
          }
          options={catOptions.map((o) => ({
            value: o.value || "__all__",
            label: o.label,
          }))}
          placeholder="Toutes"
          disabled={pending}
        />
      </div>
    </div>
  );
}
