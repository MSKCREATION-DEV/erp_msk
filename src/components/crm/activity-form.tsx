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
  const [type, setType] = useState<CrmActivityType | null>("NOTE");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!type) {
      setError("Choisissez un type d’action");
      return;
    }
    const form = e.currentTarget;
    const fd = new FormData(form);
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
      setType("NOTE");
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
      <OptionPickerSingle
        label="Type d’action"
        required
        options={Object.entries(ACTIVITY_LABELS).map(([k, v]) => ({
          value: k,
          label: v,
        }))}
        value={type}
        onChange={(v) => setType((v as CrmActivityType) ?? "NOTE")}
        disabled={pending}
        placeholder="Choisir le type"
        modalTitle="Type d’action"
      />
      <div>
        <FieldLabel htmlFor={`${formId}-summary`} required>
          Résumé
        </FieldLabel>
        <Input
          id={`${formId}-summary`}
          name="summary"
          required
          disabled={pending}
          placeholder="Ex. Appel — intéressée par le site vitrine"
        />
      </div>
      <div>
        <FieldLabel htmlFor={`${formId}-body`}>Détail</FieldLabel>
        <Textarea
          id={`${formId}-body`}
          name="body"
          rows={3}
          disabled={pending}
          placeholder="Notes de l’échange, objections, prochaine étape évoquée…"
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
            <FieldHint>Obligatoire — aucune date de relance sur ce dossier.</FieldHint>
          ) : null}
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
