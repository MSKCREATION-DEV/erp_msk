"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CrmActivityType, CrmLossReason, CrmPipelineStage } from "@prisma/client";
import { updateOpportunityStageAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field-label";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { usePendingAction } from "@/hooks/use-pending-action";
import {
  CONTACT_COMMENT_MIN_LEN,
  CONTACT_STAGE_CHANNELS,
  LOSS_NOTE_MIN_LEN,
  normalizeUiStage,
} from "@/lib/crm/guide-rules";
import { RELANCE_GUIDE_THRESHOLD } from "@/lib/crm/follow-up-count";
import {
  linkedEntitiesLabels,
  type ProspectLinkedSummary,
} from "@/lib/crm/prospect-linked-entities";
import {
  ACTIVITY_LABELS,
  LOSS_LABELS,
  STAGE_HINTS,
  STAGE_LABELS,
  STAGE_ORDER,
} from "@/lib/crm/labels";

export function StageForm({
  opportunityId,
  stage,
  activityCount = 0,
  hasFollowUp = false,
  linked,
  onSuccess,
}: {
  opportunityId: string;
  stage: CrmPipelineStage;
  activityCount?: number;
  hasFollowUp?: boolean;
  linked?: ProspectLinkedSummary;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [current, setCurrent] = useState<CrmPipelineStage>(
    normalizeUiStage(stage),
  );
  const [lossReason, setLossReason] = useState<CrmLossReason | null>("BUDGET");
  const [lossNote, setLossNote] = useState("");
  const [confirmLinked, setConfirmLinked] = useState(false);
  const [contactChannel, setContactChannel] = useState<CrmActivityType | null>(
    null,
  );
  const [contactComment, setContactComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const enteringContacte =
    current === "CONTACTE" && normalizeUiStage(stage) !== "CONTACTE";

  const linkedLines = linked ? linkedEntitiesLabels(linked) : [];
  const hasLinked = linkedLines.length > 0;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (enteringContacte) {
      if (!contactChannel) {
        setError("Choisissez le canal de contact.");
        return;
      }
      if (contactComment.trim().length < CONTACT_COMMENT_MIN_LEN) {
        setError(
          `Commentaire obligatoire (min. ${CONTACT_COMMENT_MIN_LEN} caractères) : comment vous avez contacté et ce qui a été dit, ou « pas de réponse ».`,
        );
        return;
      }
    }

    if (current === "PERDU") {
      if (!lossReason) {
        setError("Motif de perte obligatoire.");
        return;
      }
      if (lossNote.trim().length < LOSS_NOTE_MIN_LEN) {
        setError(
          `Commentaire obligatoire (min. ${LOSS_NOTE_MIN_LEN} caractères) pour expliquer la perte.`,
        );
        return;
      }
      if (hasLinked && !confirmLinked) {
        setError(
          "Cochez la confirmation après avoir lu les éléments liés au prospect.",
        );
        return;
      }
    }

    const fd = new FormData(e.currentTarget);
    fd.set("stage", current);
    if (current === "PERDU" && lossReason) fd.set("lossReason", lossReason);
    if (current === "PERDU") {
      fd.set("lossNote", lossNote.trim());
      if (hasLinked && confirmLinked) fd.set("confirmLinked", "1");
    }
    if (enteringContacte && contactChannel) {
      fd.set("contactChannel", contactChannel);
      fd.set("contactComment", contactComment.trim());
    }
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
          description: STAGE_HINTS[s],
        }))}
        value={current}
        onChange={(v) => {
          if (!v) return;
          setCurrent(v as CrmPipelineStage);
          setError(null);
          setConfirmLinked(false);
        }}
        disabled={pending}
        placeholder="Choisir le statut"
        modalTitle="Statut du prospect"
      />
      {STAGE_HINTS[current] ? (
        <p className="rounded-xl border border-msk-blue/15 bg-msk-blue/4 px-3 py-2 text-xs text-msk-ink/65">
          {STAGE_HINTS[current]}
        </p>
      ) : null}
      {!hasFollowUp &&
      current !== "GAGNE" &&
      current !== "PERDU" &&
      current !== "NOUVEAU" ? (
        <p className="rounded-xl border border-msk-coral/20 bg-msk-coral/5 px-3 py-2 text-xs text-msk-coral">
          GUIDE : journalisez une activité avec date de relance avant de changer
          d’étape.
        </p>
      ) : null}

      {enteringContacte ? (
        <div className="space-y-3 rounded-xl border border-msk-coral/25 bg-msk-coral/4 p-3.5">
          <p className="text-xs font-medium text-msk-ink/70">
            Direction : expliquer le contact (canal + échange). Obligatoire.
          </p>
          <OptionPickerSingle
            label="Canal de contact"
            required
            options={CONTACT_STAGE_CHANNELS.map((c) => ({
              value: c,
              label: ACTIVITY_LABELS[c],
            }))}
            value={contactChannel}
            onChange={(v) =>
              setContactChannel((v as CrmActivityType | null) ?? null)
            }
            disabled={pending}
            placeholder="Appel, WhatsApp…"
            modalTitle="Canal de contact"
          />
          <div>
            <FieldLabel htmlFor="contactComment" required>
              Ce qui a été dit / fait
            </FieldLabel>
            <Textarea
              id="contactComment"
              name="contactComment"
              value={contactComment}
              onChange={(e) => setContactComment(e.target.value)}
              disabled={pending}
              rows={4}
              placeholder="Ex. Appelée ce matin, intéressée par le pack RS, rappeler vendredi — ou : pas de réponse"
              className="min-h-24"
            />
            <FieldHint>
              Min. {CONTACT_COMMENT_MIN_LEN} caractères — visible dans le
              journal d’activités.
            </FieldHint>
          </div>
        </div>
      ) : null}

      {current === "PERDU" ? (
        <div className="space-y-3 rounded-xl border border-msk-ink/8 bg-msk-chalk/40 p-3.5">
          {activityCount > 0 ? (
            <p className="text-xs text-msk-ink/55">
              Relances journalisées : {activityCount}
              {activityCount < RELANCE_GUIDE_THRESHOLD
                ? ` (indicatif : souvent ≥ ${RELANCE_GUIDE_THRESHOLD} avant abandon)`
                : ""}
              .
            </p>
          ) : (
            <p className="text-xs text-msk-ink/55">
              Aucune relance journalisée — vous pouvez tout de même marquer
              Perdu avec un motif et un commentaire.
            </p>
          )}

          {hasLinked ? (
            <div className="rounded-lg border border-msk-coral/25 bg-msk-coral/5 px-3 py-2.5">
              <p className="text-xs font-semibold text-msk-coral">
                Éléments encore liés à ce prospect
              </p>
              <ul className="mt-1.5 list-inside list-disc text-xs text-msk-ink/70">
                {linkedLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-msk-ink/80">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-msk-ink/20 text-msk-blue focus:ring-msk-blue/40"
                  checked={confirmLinked}
                  disabled={pending}
                  onChange={(e) => setConfirmLinked(e.target.checked)}
                />
                <span>
                  J’ai pris connaissance de ces éléments et je confirme le
                  passage en Perdu (les relances ouvertes seront annulées).
                </span>
              </label>
            </div>
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
            <FieldLabel htmlFor="lossNote" required>
              Commentaire
            </FieldLabel>
            <Textarea
              id="lossNote"
              name="lossNote"
              value={lossNote}
              onChange={(e) => setLossNote(e.target.value)}
              disabled={pending}
              rows={3}
              placeholder="Ex. Client a choisi un concurrent / plus de budget / pas de réponse après plusieurs tentatives…"
              className="min-h-20"
            />
            <FieldHint>
              Min. {LOSS_NOTE_MIN_LEN} caractères — visible dans le journal.
            </FieldHint>
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
