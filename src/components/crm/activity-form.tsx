"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { CrmActivityType } from "@prisma/client";
import { logActivityAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field-label";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { usePendingAction } from "@/hooks/use-pending-action";
import { ACTIVITY_LABELS } from "@/lib/crm/labels";
import {
  isOutreachActivityType,
  OUTREACH_ACTIVITY_TYPES,
} from "@/lib/crm/follow-up-count";

/** Types proposés : canaux de suivi d’abord, Note en dernier. */
const ACTIVITY_TYPE_ORDER: CrmActivityType[] = [
  ...OUTREACH_ACTIVITY_TYPES,
  "NOTE",
];

export function ActivityForm({
  opportunityId,
  requireFollowUp = false,
  /** Si fourni, clôture cette relance OPEN après journalisation. */
  completeTaskId,
  onSuccess,
}: {
  opportunityId: string;
  requireFollowUp?: boolean;
  completeTaskId?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const formId = useId();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  /** Défaut Appel — une Note ne compte pas comme relance historique. */
  const [type, setType] = useState<CrmActivityType | null>("APPEL");

  const isClosingRelance = Boolean(completeTaskId);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!type) {
      setError("Choisissez comment vous avez contacté le prospect");
      return;
    }
    if (isClosingRelance && !isOutreachActivityType(type)) {
      setError(
        "Pour clôturer une relance, choisissez un canal de suivi (appel, WhatsApp…) — pas une note seule.",
      );
      return;
    }
    const form = e.currentTarget;
    const fd = new FormData(form);
    const summary = String(fd.get("summary") ?? "").trim();
    if (summary.length < 3) {
      setError("Indiquez un court résumé de l’échange");
      return;
    }
    fd.set("opportunityId", opportunityId);
    fd.set("type", type);
    if (completeTaskId) fd.set("completeTaskId", completeTaskId);
    void run(async () => {
      const res = await logActivityAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      form.reset();
      setType("APPEL");
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <form
      id={formId}
      className="space-y-4"
      onSubmit={onSubmit}
      aria-busy={pending || undefined}
      noValidate
    >
      <input type="hidden" name="opportunityId" value={opportunityId} />
      {completeTaskId ? (
        <input type="hidden" name="completeTaskId" value={completeTaskId} />
      ) : null}

      <p className="rounded-xl border border-msk-blue/15 bg-msk-blue/[0.04] px-3.5 py-2.5 text-xs leading-relaxed text-msk-ink/70">
        {isClosingRelance
          ? "Journalisez le canal utilisé et ce qui a été dit — cela incrémente le compteur Relances et clôture la tâche."
          : "Chaque action de suivi (hors note) compte dans l’historique Relancé N× du dossier."}
      </p>

      <OptionPickerSingle
        label="Canal / type d’action"
        required
        options={ACTIVITY_TYPE_ORDER.map((k) => ({
          value: k,
          label:
            k === "NOTE"
              ? `${ACTIVITY_LABELS[k]} (ne compte pas comme relance)`
              : ACTIVITY_LABELS[k],
        }))}
        value={type}
        onChange={(v) => setType((v as CrmActivityType) ?? "APPEL")}
        disabled={pending}
        placeholder="Comment avez-vous contacté ?"
        modalTitle="Type d’action"
      />
      <div>
        <FieldLabel htmlFor={`${formId}-summary`} required>
          Résumé de l’échange
        </FieldLabel>
        <Input
          id={`${formId}-summary`}
          name="summary"
          required
          disabled={pending}
          placeholder="Ex. Appel — intéressée par le site vitrine, rappelle vendredi"
        />
        <FieldHint>
          Visible dans le journal — précisez le résultat (répondu, pas de
          réponse, RDV pris…).
        </FieldHint>
      </div>
      <div>
        <FieldLabel htmlFor={`${formId}-body`}>Commentaire détaillé</FieldLabel>
        <Textarea
          id={`${formId}-body`}
          name="body"
          rows={3}
          disabled={pending}
          placeholder="Objections, budget évoqué, prochaine étape convenue…"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor={`${formId}-followUp`} required={requireFollowUp}>
            Prochaine relance
          </FieldLabel>
          <Input
            id={`${formId}-followUp`}
            name="followUpAt"
            type="date"
            required={requireFollowUp}
            disabled={pending}
          />
          {requireFollowUp ? (
            <FieldHint>
              Obligatoire — aucune date de relance sur ce dossier.
            </FieldHint>
          ) : (
            <FieldHint>Planifie la prochaine date dans la file Relances.</FieldHint>
          )}
        </div>
        <div>
          <FieldLabel htmlFor={`${formId}-next`}>Prochaine action</FieldLabel>
          <Input
            id={`${formId}-next`}
            name="nextAction"
            disabled={pending}
            placeholder="Ex. Envoyer proposition PDF"
          />
        </div>
      </div>
      <FieldError>{error}</FieldError>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Enregistrement…"
            : completeTaskId
              ? "Clôturer la relance"
              : "Enregistrer l’action"}
        </Button>
      </div>
    </form>
  );
}
