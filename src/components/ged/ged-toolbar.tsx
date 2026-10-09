"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  ChevronDown,
  LayoutGrid,
  LayoutList,
  Rows3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GED_GROUP_LABELS,
  GED_SORT_LABELS,
  GED_VIEW_LABELS,
  type GedGroupBy,
  type GedSortDir,
  type GedSortKey,
  type GedViewMode,
} from "@/lib/ged/view-prefs";

type Props = {
  view: GedViewMode;
  sortKey: GedSortKey;
  sortDir: GedSortDir;
  groupBy: GedGroupBy;
  onView: (v: GedViewMode) => void;
  onSort: (key: GedSortKey, dir?: GedSortDir) => void;
  onGroup: (g: GedGroupBy) => void;
};

export function GedToolbar({
  view,
  sortKey,
  sortDir,
  groupBy,
  onView,
  onSort,
  onGroup,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-msk-ink/[0.08] bg-white px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-caps text-msk-ink/40">
          Affichage
        </span>
        <div
          role="group"
          aria-label="Mode d’affichage"
          className="inline-flex rounded-lg border border-msk-ink/[0.1] bg-msk-chalk/50 p-0.5"
        >
          {(
            [
              ["list", LayoutList],
              ["compact", Rows3],
              ["tiles", LayoutGrid],
            ] as const
          ).map(([mode, Icon]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onView(mode)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition sm:px-3 sm:text-sm",
                view === mode
                  ? "bg-msk-blue text-white shadow-sm"
                  : "text-msk-ink/60 hover:bg-white hover:text-msk-ink",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden xs:inline sm:inline">
                {GED_VIEW_LABELS[mode]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ToolbarMenu
          label={`Trier · ${GED_SORT_LABELS[sortKey]}`}
          icon={
            sortDir === "asc" ? (
              <ArrowUpAZ className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownAZ className="h-3.5 w-3.5" />
            )
          }
        >
          {(close) => (
            <>
              <MenuHeading>Critère</MenuHeading>
              {(Object.keys(GED_SORT_LABELS) as GedSortKey[]).map((key) => (
                <MenuRow
                  key={key}
                  active={sortKey === key}
                  onClick={() => {
                    onSort(
                      key,
                      key === sortKey
                        ? sortDir === "asc"
                          ? "desc"
                          : "asc"
                        : key === "date" || key === "size"
                          ? "desc"
                          : "asc",
                    );
                    close();
                  }}
                >
                  {GED_SORT_LABELS[key]}
                </MenuRow>
              ))}
              <div className="my-1 h-px bg-msk-ink/[0.06]" />
              <MenuHeading>Ordre</MenuHeading>
              <MenuRow
                active={sortDir === "asc"}
                onClick={() => {
                  onSort(sortKey, "asc");
                  close();
                }}
              >
                Croissant
              </MenuRow>
              <MenuRow
                active={sortDir === "desc"}
                onClick={() => {
                  onSort(sortKey, "desc");
                  close();
                }}
              >
                Décroissant
              </MenuRow>
            </>
          )}
        </ToolbarMenu>

        <ToolbarMenu label={`Regrouper · ${GED_GROUP_LABELS[groupBy]}`}>
          {(close) => (
            <>
              {(Object.keys(GED_GROUP_LABELS) as GedGroupBy[]).map((g) => (
                <MenuRow
                  key={g}
                  active={groupBy === g}
                  onClick={() => {
                    onGroup(g);
                    close();
                  }}
                >
                  {GED_GROUP_LABELS[g]}
                </MenuRow>
              ))}
            </>
          )}
        </ToolbarMenu>
      </div>
    </div>
  );
}

function ToolbarMenu({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 max-w-[14rem] items-center gap-1.5 rounded-lg border border-msk-ink/[0.12] bg-white px-2.5 text-xs font-medium text-msk-ink transition hover:border-msk-blue/30 hover:bg-msk-chalk/60 sm:text-sm",
          open && "border-msk-blue/40 bg-msk-blue/[0.04] text-msk-blue",
        )}
      >
        {icon}
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 opacity-50", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1.5 w-52 overflow-hidden rounded-xl border border-msk-ink/[0.08] bg-white py-1 shadow-lg"
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

function MenuHeading({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-caps text-msk-ink/35">
      {children}
    </p>
  );
}

function MenuRow({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition",
        active
          ? "bg-msk-blue/[0.06] font-medium text-msk-blue"
          : "text-msk-ink/80 hover:bg-msk-chalk",
      )}
    >
      <span>{children}</span>
      {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
    </button>
  );
}
