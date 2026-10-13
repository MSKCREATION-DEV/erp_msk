"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CrmLossReason, CrmPipelineStage } from "@prisma/client";
import { updateOpportunityStageAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field-label";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { usePendingAction } from "@/hooks/use-pending-action";
import { LOSS_LABELS, STAGE_LABELS, STAGE_ORDER } from "@/lib/crm/labels";

function toUiStage(stage: CrmPipelineStage): CrmPipelineStage {
  return stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : stage;
}

export function StageForm({
  opportunityId,
  stage,
  activityCount = 0,
  hasFollowUp = false,
  onSuccess,
}: {
  opportunityId: string;
  stage: CrmPipelineStage;
  activityCount?: number;
  hasFollowUp?: boolean;
  onSuccess?: () => void;
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
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      aria-busy={pending || undefined}
      noValidate
    >
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <OptionPickerSingle
        label="Nouveau statut"
        required
        options={STAGE_ORDER.map((s) => ({
          value: s,
          label: STAGE_LABELS[s],
        }))}
        value={current}
        onChange={(v) => v && setCurrent(v as CrmPipelineStage)}
        disabled={pending}
        placeholder="Choisir le statut"
        modalTitle="Statut du prospect"
      />
      {!hasFollowUp &&
      current !== "GAGNE" &&
      current !== "PERDU" &&
      current !== "NOUVEAU" ? (
        <p className="rounded-xl border border-msk-coral/20 bg-msk-coral/5 px-3 py-2 text-xs text-msk-coral">
          GUIDE : journalisez une activité avec date de relance avant de changer
          d’étape.
        </p>
      ) : null}
      {current === "PERDU" ? (
        <div className="space-y-3 rounded-xl border border-msk-ink/[0.08] bg-msk-chalk/40 p-3.5">
          {activityCount < 3 ? (
            <p className="text-xs text-msk-coral">
              GUIDE : {activityCount}/3 actions — minimum 3 avant Perdu.
            </p>
          ) : null}
          <OptionPickerSingle
            label="Motif de perte"
            required
            options={Object.entries(LOSS_LABELS).map(([k, v]) => ({
              value: k,
              label: v,
            }))}
            value={lossReason}
            onChange={(v) => setLossReason((v as CrmLossReason) ?? "BUDGET")}
            disabled={pending}
            modalTitle="Motif de perte"
          />
          <div>
            <FieldLabel htmlFor="lossNote">Précision</FieldLabel>
            <Input
              id="lossNote"
              name="lossNote"
              disabled={pending}
              placeholder="Ex. budget insuffisant, concurrent choisi…"
            />
            <FieldHint>Optionnel — utile pour le rapport équipe.</FieldHint>
          </div>
        </div>
      ) : null}
      <FieldError>{error}</FieldError>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? "Mise à jour…" : "Enregistrer le statut"}
        </Button>
      </div>
    </form>
  );
}
