"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveWeeklyGoalsAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";
import {
  GOAL_LABELS,
  type GoalMetric,
} from "@/lib/crm/goals";

const METRICS = Object.keys(GOAL_LABELS) as GoalMetric[];

export function GoalsForm({
  scope,
  initial,
}: {
  scope: "USER" | "TEAM";
  initial: Record<GoalMetric, number>;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const fd = new FormData(e.currentTarget);
    fd.set("scope", scope);
    void run(async () => {
      const res = await saveWeeklyGoalsAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else {
        setOk(res.message ?? "OK");
        router.refresh();
      }
    });
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit} aria-busy={pending || undefined}>
      <div className="grid gap-3 sm:grid-cols-2">
        {METRICS.map((m) => (
          <div key={m}>
            <Label htmlFor={`${scope}-${m}`}>{GOAL_LABELS[m]}</Label>
            <Input
              id={`${scope}-${m}`}
              name={m}
              type="number"
              min={0}
              max={9999}
              defaultValue={initial[m]}
              disabled={pending}
              className="mt-1"
            />
          </div>
        ))}
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      {ok ? <p className="text-sm text-msk-blue">{ok}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
