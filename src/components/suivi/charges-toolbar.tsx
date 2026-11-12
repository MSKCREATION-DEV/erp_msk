"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListFilterChip } from "@/components/suivi/list-filter-chip";
import { SV_EXPENSE_CATEGORY_OPTIONS } from "@/lib/suivi/labels";
import { cn } from "@/lib/utils";

export function SvChargesToolbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("type") ?? "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <ListSearchForm
          placeholder="N°, fournisseur, objet…"
          className="sm:max-w-md"
        />
        <ListFilterChip
          param="impaye"
          value="1"
          label="Non payées"
          clearLabel="Toutes"
        />
        <ListFilterChip
          param="paye"
          value="1"
          label="Payées"
          clearLabel="Toutes"
        />
        <ListFilterChip
          param="echeance"
          value="retard"
          label="En retard"
          clearLabel="Toutes"
        />
        <ListFilterChip
          param="echeance"
          value="bientot"
          label="Bientôt dues"
          clearLabel="Toutes"
        />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Type de charge">
        <CategoryChip
          pathname={pathname}
          searchParams={searchParams}
          value=""
          label="Tous types"
          active={!activeCategory}
        />
        {SV_EXPENSE_CATEGORY_OPTIONS.filter((o) => o.value !== "AUTRE").map(
          (o) => (
            <CategoryChip
              key={o.value}
              pathname={pathname}
              searchParams={searchParams}
              value={o.value}
              label={o.label}
              active={activeCategory === o.value}
            />
          ),
        )}
        <CategoryChip
          pathname={pathname}
          searchParams={searchParams}
          value="AUTRE"
          label="Autre"
          active={activeCategory === "AUTRE"}
        />
      </div>
    </div>
  );
}

function CategoryChip({
  pathname,
  searchParams,
  value,
  label,
  active,
}: {
  pathname: string;
  searchParams: URLSearchParams;
  value: string;
  label: string;
  active: boolean;
}) {
  const params = new URLSearchParams(searchParams.toString());
  params.delete("page");
  if (!value) params.delete("type");
  else params.set("type", value);
  const qs = params.toString();
  const href = qs ? `${pathname}?${qs}` : pathname;

  return (
    <Link
      prefetch={false}
      href={href}
      className={cn(
        "inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-medium transition",
        active
          ? "border-msk-blue/25 bg-msk-blue/8 text-msk-blue"
          : "border-msk-ink/15 bg-white text-msk-ink/65 hover:bg-msk-chalk",
      )}
      aria-pressed={active}
    >
      {label}
    </Link>
  );
}
