"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveWeeklyGoalsAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";
import {
  GOAL_LABELS,
  GOAL_METRICS,
  type GoalMetric,
} from "@/lib/crm/goals";
import { cn } from "@/lib/utils";

export function GoalsForm({
  scope,
  initial,
  targetUserId,
  submitLabel = "Enregistrer",
}: {
  scope: "USER" | "TEAM";
  initial: Record<GoalMetric, number>;
  /** Si différent de soi — réservé aux leads (assignation collab). */
  targetUserId?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const busy = pending || refreshing;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const fd = new FormData(e.currentTarget);
    fd.set("scope", scope);
    if (targetUserId) fd.set("targetUserId", targetUserId);
    void run(async () => {
      const res = await saveWeeklyGoalsAction(fd);
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
      className={cn("relative space-y-3", busy && "pointer-events-none")}
      onSubmit={onSubmit}
      aria-busy={busy || undefined}
    >
      <fieldset
        disabled={busy}
        className={cn("space-y-3 border-0 p-0", busy && "opacity-60")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {GOAL_METRICS.map((m) => (
            <div key={m}>
              <Label htmlFor={`${scope}-${targetUserId ?? "self"}-${m}`}>
                {GOAL_LABELS[m]}
              </Label>
              <Input
                id={`${scope}-${targetUserId ?? "self"}-${m}`}
                name={m}
                type="number"
                min={0}
                max={9999}
                defaultValue={initial[m]}
                className="mt-1"
              />
            </div>
          ))}
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
