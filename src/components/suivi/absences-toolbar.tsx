"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListFilterChip } from "@/components/suivi/list-filter-chip";
import { SV_ABSENCE_REASON_OPTIONS } from "@/lib/suivi/labels";
import { cn } from "@/lib/utils";

export function SvAbsencesToolbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeReason = searchParams.get("motif") ?? "";
  const activeStatus = searchParams.get("statut") ?? "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <ListSearchForm
          placeholder="Collaborateur, motif, note…"
          className="sm:max-w-md"
        />
        <ListFilterChip
          param="statut"
          value="ENREGISTREE"
          label="Enregistrées"
          clearLabel="Tous"
        />
        <ListFilterChip
          param="statut"
          value="JUSTIFIEE"
          label="Justifiées"
          clearLabel="Tous"
        />
        <ListFilterChip
          param="statut"
          value="NON_JUSTIFIEE"
          label="Non justifiées"
          clearLabel="Tous"
        />
        <ListFilterChip
          param="aujourdhui"
          value="1"
          label="Aujourd’hui"
          clearLabel="Toutes dates"
        />
        <ListFilterChip
          param="conges"
          value="1"
          label="Déduire congés"
          clearLabel="Tous"
        />
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Motif d’absence"
      >
        <ReasonChip
          pathname={pathname}
          searchParams={searchParams}
          value=""
          label="Tous motifs"
          active={!activeReason}
        />
        {SV_ABSENCE_REASON_OPTIONS.map((o) => (
          <ReasonChip
            key={o.value}
            pathname={pathname}
            searchParams={searchParams}
            value={o.value}
            label={o.label}
            active={activeReason === o.value}
          />
        ))}
      </div>
      {activeStatus ? (
        <p className="sr-only">Filtre statut actif : {activeStatus}</p>
      ) : null}
    </div>
  );
}

function ReasonChip({
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
  if (!value) params.delete("motif");
  else params.set("motif", value);
  const qs = params.toString();
  const href = qs ? `${pathname}?${qs}` : pathname;

  return (
    <Link
      prefetch={false}
      href={href}
      scroll={false}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition",
        active
          ? "bg-msk-blue text-white"
          : "bg-msk-chalk text-msk-ink/60 hover:bg-msk-ink/8 hover:text-msk-ink",
      )}
    >
      {label}
    </Link>
  );
}
