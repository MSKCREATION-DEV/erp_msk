"use client";

import { addDays, format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submitTimesheetAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";
import { WEEKDAY_LABELS } from "@/lib/rh/labels";

function mondayOf(dateStr: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

/** Saisie hebdomadaire (lundi → dimanche) — soumet une feuille d'heures. */
export function TimesheetForm() {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [weekStart, setWeekStart] = useState(() => mondayOf(""));
  const [hours, setHours] = useState<number[]>(Array(7).fill(0));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const days = useMemo(() => {
    const monday = new Date(weekStart);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [weekStart]);

  const totalHours = hours.reduce((s, h) => s + h, 0);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const lines = days
      .map((d, i) => ({
        workDate: format(d, "yyyy-MM-dd"),
        minutes: Math.round((hours[i] ?? 0) * 60),
      }))
      .filter((l) => l.minutes > 0);

    if (lines.length === 0) {
      setError("Saisissez au moins une journée.");
      return;
    }

    const fd = new FormData();
    fd.set("weekStart", weekStart);
    fd.set("lines", JSON.stringify(lines));

    void run(async () => {
      const res = await submitTimesheetAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setSuccess(res.message ?? "Feuille soumise");
      setHours(Array(7).fill(0));
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      aria-busy={pending || undefined}
    >
      <div>
        <Label htmlFor="weekStart">Semaine du (lundi) *</Label>
        <Input
          id="weekStart"
          type="date"
          value={weekStart}
          disabled={pending}
          onChange={(e) => setWeekStart(mondayOf(e.target.value))}
          className="max-w-50"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {days.map((d, i) => (
          <div key={i}>
            <Label htmlFor={`day-${i}`}>
              {WEEKDAY_LABELS[i]} ·{" "}
              {format(d, "d MMM", { locale: fr })}
            </Label>
            <Input
              id={`day-${i}`}
              type="number"
              min={0}
              max={24}
              step="0.25"
              value={hours[i]}
              disabled={pending}
              onChange={(e) => {
                const next = [...hours];
                next[i] = Number(e.target.value) || 0;
                setHours(next);
              }}
            />
          </div>
        ))}
      </div>

      <p className="text-sm text-msk-ink/55">
        Total semaine :{" "}
        <span className="font-medium text-msk-ink">{totalHours}h</span>
      </p>

      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Soumettre la semaine"}
      </Button>
    </form>
  );
}
