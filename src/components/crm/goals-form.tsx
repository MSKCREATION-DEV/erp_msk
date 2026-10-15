"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePeriodGoalsAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field-label";
import { usePendingAction } from "@/hooks/use-pending-action";
import {
  GOAL_LABELS,
  GOAL_METRICS,
  type GoalMetric,
} from "@/lib/crm/goals";
import {
  type GoalPeriodGrain,
  GOAL_GRAIN_LABELS,
  scaleGoalTarget,
} from "@/lib/crm/goal-scale";
import type { WeekOption } from "@/lib/crm/week";
import { GoalsWeekPicker } from "@/components/crm/goals-week-picker";
import { cn } from "@/lib/utils";

const GRAINS: { value: GoalPeriodGrain; label: string }[] = [
  { value: "DAY", label: "Jour" },
  { value: "WEEK", label: "Semaine" },
  { value: "MONTH", label: "Mois" },
];

function otherGrains(g: GoalPeriodGrain): GoalPeriodGrain[] {
  return GRAINS.map((x) => x.value).filter((x) => x !== g);
}

export function GoalsForm({
  scope,
  initial,
  targetUserId,
  submitLabel = "Enregistrer",
  periodType: initialPeriodType = "WEEK",
  periodStart: initialPeriodStart,
  weeks,
  cancelHref,
}: {
  scope: "USER" | "TEAM";
  initial: Record<GoalMetric, number>;
  targetUserId?: string;
  submitLabel?: string;
  periodType?: GoalPeriodGrain;
  /** Ancre ISO : YYYY-MM-DD (jour/semaine) ou YYYY-MM (mois). */
  periodStart: string;
  weeks?: WeekOption[];
  cancelHref?: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [grain, setGrain] = useState<GoalPeriodGrain>(initialPeriodType);
  const [anchor, setAnchor] = useState(initialPeriodStart);
  const [values, setValues] = useState<Record<GoalMetric, number>>(() => ({
    ...initial,
  }));
  const busy = pending || refreshing;
  const formId = `${scope}-${targetUserId ?? "self"}`;

  const periodStartValue = useMemo(() => {
    if (grain === "MONTH") {
      if (/^\d{4}-\d{2}$/.test(anchor)) return anchor;
      return anchor.slice(0, 7);
    }
    return anchor.slice(0, 10);
  }, [anchor, grain]);

  function onGrainChange(next: GoalPeriodGrain) {
    if (next === grain) return;
    setValues((prev) => {
      const out = {} as Record<GoalMetric, number>;
      for (const m of GOAL_METRICS) {
        out[m] = scaleGoalTarget(prev[m], grain, next);
      }
      return out;
    });
    setGrain(next);
    if (next === "MONTH" && /^\d{4}-\d{2}-\d{2}$/.test(anchor)) {
      setAnchor(anchor.slice(0, 7));
    } else if (next !== "MONTH" && /^\d{4}-\d{2}$/.test(anchor)) {
      setAnchor(`${anchor}-01`);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const fd = new FormData(e.currentTarget);
    fd.set("scope", scope);
    fd.set("periodType", grain);
    fd.set("periodStart", periodStartValue);
    if (targetUserId) fd.set("targetUserId", targetUserId);
    for (const m of GOAL_METRICS) {
      fd.set(m, String(values[m]));
    }
    void run(async () => {
      const res = await savePeriodGoalsAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setOk(res.message ?? "Objectifs enregistrés");
      startRefresh(() => {
        router.refresh();
      });
    });
  }

  return (
    <form
      className={cn("relative w-full space-y-6", busy && "pointer-events-none")}
      onSubmit={onSubmit}
      aria-busy={busy || undefined}
    >
      <fieldset
        disabled={busy}
        className={cn("space-y-6 border-0 p-0", busy && "opacity-60")}
      >
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-msk-ink">
              Période d’ancrage
            </h3>
            <p className="mt-0.5 text-xs text-msk-ink/45">
              Saisissez les cibles dans l’unité choisie — les équivalents se
              calculent automatiquement (jours ouvrés : 5 j / sem., 22 j /
              mois).
            </p>
          </div>

          <div>
            <FieldLabel htmlFor={`${formId}-grain`}>Assigner par</FieldLabel>
            <div
              id={`${formId}-grain`}
              className="mt-1.5 inline-flex rounded-xl border border-msk-ink/12 bg-msk-chalk/50 p-1"
              role="group"
              aria-label="Granularité"
            >
              {GRAINS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => onGrainChange(g.value)}
                  className={cn(
                    "rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
                    grain === g.value
                      ? "bg-white text-msk-blue shadow-sm"
                      : "text-msk-ink/55 hover:text-msk-ink",
                  )}
                  aria-pressed={grain === g.value}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-lg">
            <FieldLabel htmlFor={`${formId}-anchor`} required>
              {grain === "DAY"
                ? "Jour"
                : grain === "WEEK"
                  ? "Semaine"
                  : "Mois"}
            </FieldLabel>
            {grain === "WEEK" && weeks && weeks.length > 0 ? (
              <div className="mt-1.5">
                <GoalsWeekPicker
                  id={`${formId}-anchor`}
                  value={periodStartValue}
                  weeks={weeks}
                  onChange={setAnchor}
                  disabled={busy}
                />
              </div>
            ) : (
              <Input
                id={`${formId}-anchor`}
                type={grain === "MONTH" ? "month" : "date"}
                className="mt-1.5"
                value={periodStartValue}
                onChange={(e) => setAnchor(e.target.value)}
                required
              />
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-msk-ink">
              Cibles
              <span className="ml-1.5 font-normal text-msk-ink/40">
                / {GOAL_GRAIN_LABELS[grain]}
              </span>
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {GOAL_METRICS.map((m) => {
              const others = otherGrains(grain);
              return (
                <div
                  key={m}
                  className="rounded-xl border border-msk-ink/[0.08] bg-white p-4"
                >
                  <FieldLabel htmlFor={`${formId}-${m}`}>
                    {GOAL_LABELS[m]}
                  </FieldLabel>
                  <Input
                    id={`${formId}-${m}`}
                    name={m}
                    type="number"
                    min={0}
                    max={9999}
                    value={values[m]}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      setValues((prev) => ({
                        ...prev,
                        [m]: Number.isFinite(n) ? n : 0,
                      }));
                    }}
                    className="mt-1.5"
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-msk-ink/45">
                    {others
                      .map(
                        (g) =>
                          `≈ ${scaleGoalTarget(values[m], grain, g)} / ${GOAL_GRAIN_LABELS[g]}`,
                      )
                      .join(" · ")}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
        {ok ? <p className="text-sm text-msk-blue">{ok}</p> : null}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-msk-ink/[0.08] pt-4">
          {cancelHref ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => router.push(cancelHref)}
            >
              Annuler
            </Button>
          ) : null}
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Enregistrement…" : submitLabel}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
