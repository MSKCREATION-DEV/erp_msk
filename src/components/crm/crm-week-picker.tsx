"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import type { WeekOption } from "@/lib/crm/week";
import { cn } from "@/lib/utils";

function weekNumber(label: string): string {
  return label.match(/Sem\.\s*(\d+)/)?.[1] ?? "";
}

function weekRange(label: string): string {
  return label.replace(/^Sem\.\s*\d+\s*·\s*/, "");
}

/**
 * Sélecteur de semaine MSK — ← → + panneau groupé par mois.
 * Utilisé barre CRM, assignation objectifs, etc.
 */
export function CrmWeekPicker({
  value,
  weeks,
  onChange,
  id,
  disabled,
  /** `compact` = barre de filtres ; `default` = formulaires. */
  size = "default",
  className,
}: {
  value: string;
  weeks: WeekOption[];
  onChange: (isoMonday: string) => void;
  id?: string;
  disabled?: boolean;
  size?: "default" | "compact";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const compact = size === "compact";

  const sortedAsc = useMemo(
    () => [...weeks].sort((a, b) => a.value.localeCompare(b.value)),
    [weeks],
  );
  const index = sortedAsc.findIndex((w) => w.value === value);
  const current =
    index >= 0 ? sortedAsc[index]! : sortedAsc[sortedAsc.length - 1];
  const canPrev = index > 0;
  const canNext = index >= 0 && index < sortedAsc.length - 1;

  const byMonth = useMemo(() => {
    const acc: Record<string, WeekOption[]> = {};
    for (const w of [...weeks].reverse()) {
      (acc[w.monthKey] ??= []).push(w);
    }
    return Object.entries(acc).sort(([a], [b]) => b.localeCompare(a));
  }, [weeks]);

  function go(delta: -1 | 1) {
    const next = sortedAsc[index + delta];
    if (next) onChange(next.value);
  }

  const wn = current ? weekNumber(current.label) : "";
  const range = current ? weekRange(current.label) : value;

  return (
    <div className={cn("relative", compact ? "min-w-0 max-w-78" : "w-full max-w-lg", className)}>
      <div
        className={cn(
          "flex items-stretch overflow-hidden rounded-xl border border-msk-ink/12 bg-white",
          disabled && "opacity-60",
        )}
      >
        <button
          type="button"
          disabled={disabled || !canPrev}
          onClick={() => go(-1)}
          className={cn(
            "inline-flex shrink-0 items-center justify-center border-r border-msk-ink/10 text-msk-ink/55 transition hover:bg-msk-chalk hover:text-msk-ink disabled:opacity-30",
            compact ? "w-9" : "w-11",
          )}
          aria-label="Semaine précédente"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>

        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            "flex min-w-0 flex-1 flex-col items-start text-left transition hover:bg-msk-chalk/60",
            compact ? "gap-0 px-2.5 py-1.5" : "gap-0.5 px-3 py-2",
          )}
        >
          <span
            className={cn(
              "flex items-center gap-1.5 font-semibold uppercase tracking-[0.1em] text-msk-ink/40",
              compact ? "text-[10px]" : "text-[11px]",
            )}
          >
            <CalendarDays
              className={cn(compact ? "size-3" : "size-3.5")}
              aria-hidden
            />
            {current?.isCurrent ? "Cette semaine" : `Semaine ${wn}`}
            {current?.isCurrent ? (
              <span className="rounded-full bg-msk-blue/10 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-msk-blue">
                En cours
              </span>
            ) : null}
          </span>
          <span
            className={cn(
              "w-full truncate font-medium text-msk-ink",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {range}
          </span>
        </button>

        <button
          type="button"
          disabled={disabled || !canNext}
          onClick={() => go(1)}
          className={cn(
            "inline-flex shrink-0 items-center justify-center border-l border-msk-ink/10 text-msk-ink/55 transition hover:bg-msk-chalk hover:text-msk-ink disabled:opacity-30",
            compact ? "w-9" : "w-11",
          )}
          aria-label="Semaine suivante"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            aria-label="Choisir une semaine"
            className={cn(
              "absolute z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-msk-ink/20 bg-msk-ink py-2 shadow-xl shadow-msk-ink/25",
              compact ? "left-0 min-w-72" : "left-0 right-0",
            )}
          >
            {byMonth.map(([monthKey, group]) => (
              <div key={monthKey} className="px-1.5">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/35">
                  {group[0]?.monthLabel ?? monthKey}
                </p>
                {group.map((w) => {
                  const selected = w.value === value;
                  const wnItem = weekNumber(w.label);
                  const rangeItem = weekRange(w.label);
                  return (
                    <button
                      key={w.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
                        selected
                          ? "bg-msk-blue text-white"
                          : "text-white/85 hover:bg-white/10",
                      )}
                      onClick={() => {
                        onChange(w.value);
                        setOpen(false);
                      }}
                    >
                      <span
                        className={cn(
                          "inline-flex size-4 shrink-0 items-center justify-center",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                        aria-hidden
                      >
                        <Check className="size-3.5" strokeWidth={2.5} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        Sem. {wnItem} · {rangeItem}
                        {w.isCurrent ? " · actuelle" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
