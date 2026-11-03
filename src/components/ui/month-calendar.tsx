"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarDayMark = {
  dateKey: string; // YYYY-MM-DD
  tone: "blue" | "coral" | "ink" | "muted" | "success";
  label?: string;
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfMonthUtc(year: number, month0: number): Date {
  return new Date(Date.UTC(year, month0, 1));
}

export function MonthCalendar({
  marks,
  className,
  initialYear,
  initialMonth0,
}: {
  marks: CalendarDayMark[];
  className?: string;
  initialYear?: number;
  initialMonth0?: number;
}) {
  const now = new Date();
  const [year, setYear] = useState(initialYear ?? now.getUTCFullYear());
  const [month0, setMonth0] = useState(initialMonth0 ?? now.getUTCMonth());

  const markMap = useMemo(() => {
    const m = new Map<string, CalendarDayMark>();
    for (const x of marks) m.set(x.dateKey, x);
    return m;
  }, [marks]);

  const cells = useMemo(() => {
    const first = startOfMonthUtc(year, month0);
    const dim = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
    let startDow = first.getUTCDay(); // 0=dim
    startDow = startDow === 0 ? 6 : startDow - 1; // lun=0
    const out: Array<{ key: string; day: number | null; mark?: CalendarDayMark }> =
      [];
    for (let i = 0; i < startDow; i++) {
      out.push({ key: `pad-${i}`, day: null });
    }
    for (let d = 1; d <= dim; d++) {
      const date = new Date(Date.UTC(year, month0, d));
      const key = toKey(date);
      out.push({ key, day: d, mark: markMap.get(key) });
    }
    return out;
  }, [year, month0, markMap]);

  const title = new Date(Date.UTC(year, month0, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  function prev() {
    if (month0 === 0) {
      setYear((y) => y - 1);
      setMonth0(11);
    } else setMonth0((m) => m - 1);
  }
  function next() {
    if (month0 === 11) {
      setYear((y) => y + 1);
      setMonth0(0);
    } else setMonth0((m) => m + 1);
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={prev}
          className="rounded-lg p-2 text-msk-ink/50 hover:bg-msk-ink/5 hover:text-msk-ink"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold capitalize text-msk-ink">{title}</p>
        <button
          type="button"
          onClick={next}
          className="rounded-lg p-2 text-msk-ink/50 hover:bg-msk-ink/5 hover:text-msk-ink"
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-caps text-msk-ink/35">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c) => (
          <div
            key={c.key}
            className={cn(
              "aspect-square rounded-lg p-1 text-sm",
              c.day == null && "opacity-0",
              c.mark?.tone === "blue" && "bg-msk-blue/15 text-msk-blue",
              c.mark?.tone === "coral" && "bg-msk-coral/15 text-msk-coral",
              c.mark?.tone === "success" && "bg-emerald-500/15 text-emerald-800",
              c.mark?.tone === "ink" && "bg-msk-ink/8 text-msk-ink",
              c.mark?.tone === "muted" && "bg-msk-chalk text-msk-ink/50",
              !c.mark && c.day != null && "bg-white text-msk-ink/70",
            )}
            title={c.mark?.label}
          >
            <span className="text-xs font-medium tabular-nums">{c.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
