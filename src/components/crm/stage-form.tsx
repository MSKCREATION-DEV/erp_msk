"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateOpportunityStageAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";
import { STAGE_LABELS, STAGE_ORDER, LOSS_LABELS } from "@/lib/crm/labels";
import type { CrmPipelineStage } from "@prisma/client";

export function StageForm({
  opportunityId,
  stage,
}: {
  opportunityId: string;
  stage: CrmPipelineStage;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [current, setCurrent] = useState(stage);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    void run(async () => {
      const res = await updateOpportunityStageAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3"
      aria-busy={pending || undefined}
    >
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <div>
        <Label htmlFor="stage">Étape pipeline</Label>
        <select
          id="stage"
          name="stage"
          value={current}
          disabled={pending}
          onChange={(e) => setCurrent(e.target.value as CrmPipelineStage)}
          className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
        >
          {STAGE_ORDER.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      {current === "PERDU" ? (
        <>
          <div>
            <Label htmlFor="lossReason">Motif de perte *</Label>
            <select
              id="lossReason"
              name="lossReason"
              required
              disabled={pending}
              className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
              defaultValue="BUDGET"
            >
              {Object.entries(LOSS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="lossNote">Précision</Label>
            <input
              id="lossNote"
              name="lossNote"
              disabled={pending}
              className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
            />
          </div>
        </>
      ) : null}
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Mise à jour…" : "Mettre à jour"}
      </Button>
    </form>
  );
}
