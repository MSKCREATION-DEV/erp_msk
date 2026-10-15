"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import type { WeekOption } from "@/lib/crm/week";
import { cn } from "@/lib/utils";

function weekNumber(label: string): string {
  return label.match(/Sem\.\s*(\d+)/)?.[1] ?? "";
}

function weekRange(label: string): string {
  return label.replace(/^Sem\.\s*\d+\s*·\s*/, "");
}

/**
 * Sélecteur de semaine moderne : ← → + libellé + panneau par mois.
 */
export function GoalsWeekPicker({
  value,
  weeks,
  onChange,
  id,
  disabled,
}: {
  value: string;
  weeks: WeekOption[];
  onChange: (isoMonday: string) => void;
  id?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

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
    <div className="relative w-full max-w-lg">
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
          className="inline-flex w-11 shrink-0 items-center justify-center border-r border-msk-ink/10 text-msk-ink/55 transition hover:bg-msk-chalk hover:text-msk-ink disabled:opacity-30"
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
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2 text-left transition hover:bg-msk-chalk/60"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-msk-ink/40">
            <CalendarDays className="size-3.5" aria-hidden />
            {current?.isCurrent ? "Cette semaine" : `Semaine ${wn}`}
            {current?.isCurrent ? (
              <span className="rounded-full bg-msk-blue/10 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-msk-blue">
                En cours
              </span>
            ) : null}
          </span>
          <span className="w-full truncate text-sm font-medium text-msk-ink">
            {range}
          </span>
        </button>

        <button
          type="button"
          disabled={disabled || !canNext}
          onClick={() => go(1)}
          className="inline-flex w-11 shrink-0 items-center justify-center border-l border-msk-ink/10 text-msk-ink/55 transition hover:bg-msk-chalk hover:text-msk-ink disabled:opacity-30"
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
            className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-msk-ink/12 bg-white py-2 shadow-lg shadow-msk-ink/10"
          >
            {byMonth.map(([monthKey, group]) => (
              <div key={monthKey} className="px-1">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
                  {group[0]?.monthLabel ?? monthKey}
                </p>
                {group.map((w) => {
                  const selected = w.value === value;
                  return (
                    <button
                      key={w.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                        selected
                          ? "bg-msk-blue/10 font-medium text-msk-blue"
                          : "text-msk-ink/80 hover:bg-msk-chalk",
                      )}
                      onClick={() => {
                        onChange(w.value);
                        setOpen(false);
                      }}
                    >
                      <span>
                        Sem. {weekNumber(w.label)} · {weekRange(w.label)}
                      </span>
                      {w.isCurrent ? (
                        <span className="shrink-0 text-[10px] font-medium text-msk-blue">
                          Actuelle
                        </span>
                      ) : null}
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
