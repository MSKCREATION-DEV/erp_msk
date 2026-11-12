"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  SV_CATEGORY_FAMILIES,
  SV_CATEGORY_FAMILY_LABEL,
  type SvCategoryFamily,
} from "@/lib/suivi/categories";
import {
  buildSvDashboardHref,
  SV_PERIOD_MODES,
  type SvPeriodMode,
} from "@/lib/suivi/dashboard-period";
import { cn } from "@/lib/utils";

const PERIOD_LABEL: Record<SvPeriodMode, string> = {
  jour: "Jour",
  semaine: "Semaine",
  mois: "Mois",
  annee: "Année",
};

const COMPTE_OPTIONS = [
  { value: null as string | null, label: "Tous les comptes" },
  { value: "PHYSICAL", label: "Physique" },
  { value: "BANK", label: "Banque" },
] as const;

type FilterOption = { value: string | null; label: string };

function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function shiftMonth(mois: string, delta: number): string {
  const [y, m] = mois.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftYear(annee: string, delta: number): string {
  const y = Number(annee) + delta;
  if (!Number.isFinite(y) || y < 2020 || y > 2100) return annee;
  return String(y);
}

function FilterMenu({
  label,
  value,
  options,
  onChange,
  allLabel,
  disabled,
}: {
  label: string;
  value: string | null;
  options: FilterOption[];
  onChange: (value: string | null) => void;
  allLabel: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? null;
  const isFiltered = value != null;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "inline-flex h-9 max-w-52 items-center gap-1.5 rounded-lg border px-2.5 text-left text-sm transition",
            isFiltered
              ? "border-msk-blue/25 bg-msk-blue/6 text-msk-ink"
              : "border-msk-ink/12 bg-white text-msk-ink/70 hover:border-msk-ink/20 hover:bg-msk-chalk/50",
            disabled && "opacity-60",
          )}
        >
          <span className="min-w-0 truncate">
            <span className="text-msk-ink/40">{label} · </span>
            {isFiltered ? selected?.label : allLabel}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-msk-ink/35 transition",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {isFiltered && !disabled ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-msk-ink/35 transition hover:bg-msk-chalk hover:text-msk-coral"
            aria-label={`Réinitialiser ${label}`}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute right-0 z-50 mt-1.5 min-w-52 max-w-72 overflow-hidden rounded-xl border border-msk-ink/12 bg-white py-1 shadow-lg shadow-msk-ink/10"
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <li key={o.value ?? "__all__"} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition",
                    active
                      ? "bg-msk-blue/8 font-medium text-msk-ink"
                      : "text-msk-ink/80 hover:bg-msk-chalk/70",
                  )}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <span
                    className={cn(
                      "inline-flex size-4 shrink-0 items-center justify-center",
                      active ? "text-msk-blue" : "opacity-0",
                    )}
                    aria-hidden
                  >
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                  <span className="min-w-0 truncate">{o.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function PeriodStepper({
  label,
  onPrev,
  onNext,
  children,
  disabled,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-stretch overflow-hidden rounded-lg border border-msk-ink/12 bg-white",
        disabled && "opacity-60",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onPrev}
        className="inline-flex w-8 shrink-0 items-center justify-center border-r border-msk-ink/10 text-msk-ink/50 transition hover:bg-msk-chalk hover:text-msk-ink disabled:opacity-30"
        aria-label={`${label} précédente`}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
      <button
        type="button"
        disabled={disabled}
        onClick={onNext}
        className="inline-flex w-8 shrink-0 items-center justify-center border-l border-msk-ink/10 text-msk-ink/50 transition hover:bg-msk-chalk hover:text-msk-ink disabled:opacity-30"
        aria-label={`${label} suivante`}
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}

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
  const dateInputRef = useRef<HTMLInputElement>(null);

  function push(next: {
    periode?: SvPeriodMode;
    on?: string;
    semaine?: string;
    mois?: string;
    annee?: string;
    compte?: "PHYSICAL" | "BANK" | null;
    categorie?: SvCategoryFamily | null;
  }) {
    const href = buildSvDashboardHref(pathname, {
      mode: next.periode ?? mode,
      on: next.on ?? on,
      semaine: next.semaine ?? semaine,
      mois: next.mois ?? mois,
      annee: next.annee ?? annee,
      compte: next.compte === undefined ? compte : next.compte,
      categorie: next.categorie === undefined ? categorie : next.categorie,
    });
    start(() => {
      router.push(href, { scroll: false });
    });
  }

  function stepPeriod(delta: -1 | 1) {
    if (mode === "jour") push({ on: shiftIsoDate(on, delta) });
    else if (mode === "semaine") push({ semaine: shiftIsoDate(semaine, delta * 7) });
    else if (mode === "mois") push({ mois: shiftMonth(mois, delta) });
    else push({ annee: shiftYear(annee, delta) });
  }

  const catOptions: FilterOption[] = [
    { value: null, label: "Toutes catégories" },
    ...SV_CATEGORY_FAMILIES.filter((f) => f !== "ouverture").map((f) => ({
      value: f,
      label: SV_CATEGORY_FAMILY_LABEL[f],
    })),
  ];

  const dateInputType =
    mode === "jour" || mode === "semaine"
      ? "date"
      : mode === "mois"
        ? "month"
        : null;
  const dateInputValue =
    mode === "jour" ? on : mode === "semaine" ? semaine : mode === "mois" ? mois : "";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-msk-ink/8 bg-white px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4",
        pending && "opacity-70",
      )}
      aria-busy={pending || undefined}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Période"
          className="flex flex-wrap gap-0.5 rounded-lg bg-msk-chalk/80 p-1"
        >
          {SV_PERIOD_MODES.map((m) => (
            <button
              key={m}
              type="button"
              disabled={pending}
              onClick={() => push({ periode: m })}
              aria-pressed={mode === m}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                mode === m
                  ? "bg-white text-msk-ink shadow-sm"
                  : "text-msk-ink/55 hover:text-msk-ink",
              )}
            >
              {PERIOD_LABEL[m]}
            </button>
          ))}
        </div>

        <PeriodStepper
          label={PERIOD_LABEL[mode]}
          onPrev={() => stepPeriod(-1)}
          onNext={() => stepPeriod(1)}
          disabled={pending}
        >
          {dateInputType ? (
            <>
              <label className="sr-only" htmlFor="sv-dash-period-value">
                {mode === "semaine" ? "Semaine (lundi)" : PERIOD_LABEL[mode]}
              </label>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const el = dateInputRef.current;
                  if (!el) return;
                  if (typeof el.showPicker === "function") {
                    try {
                      el.showPicker();
                      return;
                    } catch {
                      /* fallback click */
                    }
                  }
                  el.click();
                }}
                className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-left transition hover:bg-msk-chalk/50"
              >
                <CalendarDays
                  className="size-3.5 shrink-0 text-msk-ink/35"
                  aria-hidden
                />
                <span className="min-w-0 truncate text-sm font-medium text-msk-ink">
                  {periodLabel}
                </span>
              </button>
              <input
                ref={dateInputRef}
                id="sv-dash-period-value"
                type={dateInputType}
                value={dateInputValue}
                disabled={pending}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  if (mode === "jour") push({ on: v });
                  else if (mode === "semaine") push({ semaine: v });
                  else push({ mois: v });
                }}
                className="sr-only"
                tabIndex={-1}
              />
            </>
          ) : (
            <>
              <label className="sr-only" htmlFor="sv-dash-annee">
                Année
              </label>
              <input
                id="sv-dash-annee"
                type="number"
                min={2020}
                max={2100}
                value={annee}
                disabled={pending}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^\d{4}$/.test(v)) push({ annee: v });
                }}
                className="h-9 w-full min-w-20 border-0 bg-transparent px-2.5 text-center text-sm font-medium tabular-nums text-msk-ink outline-none"
              />
            </>
          )}
        </PeriodStepper>

        {pending ? (
          <span className="text-xs font-medium text-msk-blue">Chargement…</span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterMenu
          label="Compte"
          value={compte}
          allLabel="Tous"
          disabled={pending}
          options={COMPTE_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
          onChange={(v) =>
            push({
              compte: v === "PHYSICAL" || v === "BANK" ? v : null,
            })
          }
        />
        <FilterMenu
          label="Catégorie"
          value={categorie}
          allLabel="Toutes"
          disabled={pending}
          options={catOptions}
          onChange={(v) =>
            push({
              categorie: v ? (v as SvCategoryFamily) : null,
            })
          }
        />
      </div>
    </div>
  );
}
