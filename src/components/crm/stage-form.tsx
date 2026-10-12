"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateOpportunityStageAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { usePendingAction } from "@/hooks/use-pending-action";
import { STAGE_LABELS, STAGE_ORDER, LOSS_LABELS } from "@/lib/crm/labels";
import type { CrmPipelineStage, CrmLossReason } from "@prisma/client";

function toUiStage(stage: CrmPipelineStage): CrmPipelineStage {
  return stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : stage;
}

export function StageForm({
  opportunityId,
  stage,
  activityCount = 0,
  hasFollowUp = false,
}: {
  opportunityId: string;
  stage: CrmPipelineStage;
  activityCount?: number;
  hasFollowUp?: boolean;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [current, setCurrent] = useState<CrmPipelineStage>(toUiStage(stage));
  const [lossReason, setLossReason] = useState<CrmLossReason | null>("BUDGET");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("stage", current);
    if (current === "PERDU" && lossReason) fd.set("lossReason", lossReason);
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
      <OptionPickerSingle
        label="Statut"
        options={STAGE_ORDER.map((s) => ({
          value: s,
          label: STAGE_LABELS[s],
        }))}
        value={current}
        onChange={(v) => v && setCurrent(v as CrmPipelineStage)}
        disabled={pending}
        placeholder="Choisir le statut"
      />
      {!hasFollowUp &&
      current !== "GAGNE" &&
      current !== "PERDU" &&
      current !== "NOUVEAU" ? (
        <p className="text-xs text-msk-coral">
          GUIDE : journalisez une activité avec date de relance avant de changer
          d’étape.
        </p>
      ) : null}
      {current === "PERDU" ? (
        <>
          {activityCount < 3 ? (
            <p className="text-xs text-msk-coral">
              GUIDE : {activityCount}/3 actions — minimum 3 avant Perdu.
            </p>
          ) : null}
          <OptionPickerSingle
            label="Motif de perte"
            options={Object.entries(LOSS_LABELS).map(([k, v]) => ({
              value: k,
              label: v,
            }))}
            value={lossReason}
            onChange={(v) => setLossReason((v as CrmLossReason) ?? "BUDGET")}
            disabled={pending}
          />
          <input
            name="lossNote"
            disabled={pending}
            placeholder="Précision (optionnel)"
            className="flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          />
        </>
      ) : null}
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Mise à jour…" : "Mettre à jour"}
      </Button>
    </form>
  );
}
