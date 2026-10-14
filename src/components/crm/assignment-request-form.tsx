"use client";

import { useState } from "react";
import { requestAssignmentAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field-label";
import { usePendingAction } from "@/hooks/use-pending-action";
import { useRouter } from "next/navigation";

/** Demande d’affectation — commercial en lecture seule. */
export function AssignmentRequestForm({
  opportunityId,
  alreadyPending,
}: {
  opportunityId: string;
  alreadyPending?: boolean;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyPending ?? false);

  if (done) {
    return (
      <p className="mt-2 text-xs font-medium text-msk-blue">
        Demande d’affectation en attente — visible pour la Direction / Admin CRM
        dans Affectations.
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        className="mt-2"
        onClick={() => setOpen(true)}
      >
        Demander le suivi
      </Button>
    );
  }

  return (
    <form
      className="mt-3 space-y-3 rounded-xl border border-msk-ink/10 bg-white p-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData();
        fd.set("opportunityId", opportunityId);
        fd.set("message", message.trim());
        void run(async () => {
          const res = await requestAssignmentAction(fd);
          if (!res.ok) {
            setError(res.error ?? "Échec");
            return;
          }
          setDone(true);
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <div>
        <FieldLabel htmlFor="assign-msg">Message (optionnel)</FieldLabel>
        <Textarea
          id="assign-msg"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={pending}
          placeholder="Ex. Client de mon secteur, je souhaite reprendre le suivi…"
        />
        <FieldHint>
          La Direction / Admin CRM verra la demande dans Commercial →
          Affectations.
        </FieldHint>
      </div>
      <FieldError>{error}</FieldError>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer la demande"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
