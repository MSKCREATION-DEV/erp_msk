"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePeriodGoalsAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

const GRAINS: GoalPeriodGrain[] = ["DAY", "WEEK", "MONTH"];

function otherGrains(g: GoalPeriodGrain): GoalPeriodGrain[] {
  return GRAINS.filter((x) => x !== g);
}

export function GoalsForm({
  scope,
  initial,
  targetUserId,
  submitLabel = "Enregistrer",
  periodType: initialPeriodType = "WEEK",
  periodStart: initialPeriodStart,
  semaineOptions,
}: {
  scope: "USER" | "TEAM";
  initial: Record<GoalMetric, number>;
  targetUserId?: string;
  submitLabel?: string;
  /** Grain d’assignation initial (aligné barre CRM). */
  periodType?: GoalPeriodGrain;
  /** Ancre ISO : YYYY-MM-DD (jour/semaine) ou YYYY-MM (mois). */
  periodStart: string;
  /** Options semaine pour le sélecteur. */
  semaineOptions?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [grain, setGrain] = useState<GoalPeriodGrain>(initialPeriodType);
  const [anchor, setAnchor] = useState(initialPeriodStart);
  const [values, setValues] = useState<Record<GoalMetric, number>>(() => {
    // initial est déjà au grain de la page ; si l’utilisateur change de grain, on rescale
    return { ...initial };
  });
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
      className={cn("relative w-full space-y-4", busy && "pointer-events-none")}
      onSubmit={onSubmit}
      aria-busy={busy || undefined}
    >
      <fieldset
        disabled={busy}
        className={cn("space-y-4 border-0 p-0", busy && "opacity-60")}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor={`${formId}-grain`}>Assigner par</Label>
            <select
              id={`${formId}-grain`}
              className="mt-1 flex h-10 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm text-msk-ink"
              value={grain}
              onChange={(e) =>
                onGrainChange(e.target.value as GoalPeriodGrain)
              }
            >
              <option value="DAY">Jour</option>
              <option value="WEEK">Semaine</option>
              <option value="MONTH">Mois</option>
            </select>
          </div>
          <div className="sm:col-span-1 lg:col-span-2">
            <Label htmlFor={`${formId}-anchor`}>
              Période ({GOAL_GRAIN_LABELS[grain]})
            </Label>
            {grain === "WEEK" && semaineOptions && semaineOptions.length > 0 ? (
              <select
                id={`${formId}-anchor`}
                className="mt-1 flex h-10 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm text-msk-ink"
                value={periodStartValue}
                onChange={(e) => setAnchor(e.target.value)}
              >
                {semaineOptions.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={`${formId}-anchor`}
                type={grain === "MONTH" ? "month" : "date"}
                className="mt-1"
                value={periodStartValue}
                onChange={(e) => setAnchor(e.target.value)}
              />
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {GOAL_METRICS.map((m) => {
            const others = otherGrains(grain);
            return (
              <div key={m}>
                <Label htmlFor={`${formId}-${m}`}>
                  {GOAL_LABELS[m]}
                  <span className="ml-1 font-normal text-msk-ink/40">
                    / {GOAL_GRAIN_LABELS[grain]}
                  </span>
                </Label>
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
                  className="mt-1"
                />
                <p className="mt-1 text-[11px] text-msk-ink/45">
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
        {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
        {ok ? <p className="text-sm text-msk-blue">{ok}</p> : null}
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Enregistrement…" : submitLabel}
        </Button>
      </fieldset>
    </form>
  );
}
