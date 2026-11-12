"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, X } from "lucide-react";
import { ListSearchForm } from "@/components/ui/list-search-form";
import {
  SV_CATEGORY_FAMILIES,
  SV_CATEGORY_FAMILY_LABEL,
} from "@/lib/suivi/categories";
import { cn } from "@/lib/utils";

type FilterOption = { value: string | null; label: string };

const DIRECTION_OPTIONS: FilterOption[] = [
  { value: null, label: "Tous les sens" },
  { value: "IN", label: "Entrées" },
  { value: "OUT", label: "Sorties" },
];

const COMPTE_OPTIONS: FilterOption[] = [
  { value: null, label: "Tous les comptes" },
  { value: "PHYSICAL", label: "Physique" },
  { value: "BANK", label: "Banque" },
];

const CATEGORIE_OPTIONS: FilterOption[] = [
  { value: null, label: "Toutes les catégories" },
  ...SV_CATEGORY_FAMILIES.map((f) => ({
    value: f,
    label: SV_CATEGORY_FAMILY_LABEL[f],
  })),
];

function FilterMenu({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string | null;
  options: FilterOption[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];
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
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-9 max-w-52 items-center gap-1.5 rounded-lg border px-2.5 text-left text-sm transition",
          isFiltered
            ? "border-msk-blue/25 bg-msk-blue/6 text-msk-ink"
            : "border-msk-ink/12 bg-white text-msk-ink/70 hover:border-msk-ink/20 hover:bg-msk-chalk/50",
          disabled && "opacity-60",
        )}
      >
        <span className="truncate">{selected?.label ?? label}</span>
        <ChevronDown className="size-3.5 shrink-0 opacity-50" aria-hidden />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-56 overflow-auto rounded-xl border border-msk-ink/10 bg-white py-1 shadow-lg"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value ?? "__all"} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                    active
                      ? "bg-msk-blue/8 text-msk-blue"
                      : "text-msk-ink hover:bg-msk-chalk",
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-3.5 shrink-0",
                      active ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function patchParams(
  current: URLSearchParams,
  patch: Record<string, string | null | undefined>,
): string {
  const params = new URLSearchParams(current.toString());
  params.delete("page");
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === "") params.delete(k);
    else params.set(k, v);
  }
  return params.toString();
}

export function SvMouvementsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();

  const direction = searchParams.get("direction");
  const compte = searchParams.get("compte");
  const categorie = searchParams.get("categorie");
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const hasFilters = Boolean(
    direction || compte || categorie || from || to,
  );

  function apply(patch: Record<string, string | null | undefined>) {
    const qs = patchParams(searchParams, patch);
    start(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function clearAll() {
    start(() => {
      const q = searchParams.get("q");
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <ListSearchForm
          placeholder="Description, catégorie, projet, réf…"
          className="sm:max-w-md"
        />
        {hasFilters ? (
          <button
            type="button"
            disabled={pending}
            onClick={clearAll}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium text-msk-ink/70 transition hover:bg-msk-chalk disabled:opacity-60"
          >
            <X className="size-3.5" aria-hidden />
            Réinitialiser filtres
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FilterMenu
          label="Sens"
          value={direction}
          options={DIRECTION_OPTIONS}
          disabled={pending}
          onChange={(v) => apply({ direction: v })}
        />
        <FilterMenu
          label="Compte"
          value={compte}
          options={COMPTE_OPTIONS}
          disabled={pending}
          onChange={(v) => apply({ compte: v })}
        />
        <FilterMenu
          label="Catégorie"
          value={categorie}
          options={CATEGORIE_OPTIONS}
          disabled={pending}
          onChange={(v) => apply({ categorie: v })}
        />
        <label className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-msk-ink/12 bg-white px-2.5 text-sm text-msk-ink/70">
          <span className="sr-only">Du</span>
          <input
            type="date"
            value={from}
            disabled={pending}
            onChange={(e) => apply({ from: e.target.value || null })}
            className="bg-transparent text-sm outline-none"
          />
        </label>
        <span className="text-xs text-msk-ink/35" aria-hidden>
          →
        </span>
        <label className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-msk-ink/12 bg-white px-2.5 text-sm text-msk-ink/70">
          <span className="sr-only">Au</span>
          <input
            type="date"
            value={to}
            disabled={pending}
            onChange={(e) => apply({ to: e.target.value || null })}
            className="bg-transparent text-sm outline-none"
          />
        </label>
      </div>
    </div>
  );
}
