"use client";

import { useActionState, useState } from "react";
import {
  recordSvPayment,
  type SvInvoiceActionState,
} from "@/actions/suivi/invoices";
import { FieldLabel } from "@/components/ui/field-label";
import { Button } from "@/components/ui/button";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { formatSvXof } from "@/lib/suivi/labels";

export function SvPaymentForm({
  invoiceId,
  reste,
  forceOpen = false,
  onClose,
}: {
  invoiceId: string;
  reste: number;
  /** Contrôlé par la barre d’actions fiche (pas de bouton interne). */
  forceOpen?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(forceOpen);
  const [state, formAction, pending] = useActionState<
    SvInvoiceActionState,
    FormData
  >(recordSvPayment, null);
  useActionStateToast(state);

  if (reste <= 0) return null;

  const visible = forceOpen || open;

  if (!visible) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Enregistrer un paiement
      </Button>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  function close() {
    if (onClose) onClose();
    else setOpen(false);
  }

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-msk-ink/8 bg-msk-chalk/40 p-4"
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="mirrorMovement" value="1" />
      {state && !state.ok ? (
        <p className="text-sm text-msk-coral">{state.error}</p>
      ) : null}
      <p className="text-xs text-msk-ink/55">
        Reste à encaisser : {formatSvXof(reste)}. Une entrée de trésorerie liée
        peut être créée (suivi).
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <FieldLabel htmlFor="amount" required>
            Montant
          </FieldLabel>
          <input
            id="amount"
            name="amount"
            type="number"
            min={1}
            max={reste}
            required
            defaultValue={reste}
            className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            disabled={pending}
          />
        </div>
        <div>
          <FieldLabel htmlFor="paidAt" required>
            Date
          </FieldLabel>
          <input
            id="paidAt"
            name="paidAt"
            type="date"
            required
            defaultValue={today}
            className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            disabled={pending}
          />
        </div>
        <div>
          <FieldLabel htmlFor="method">Mode</FieldLabel>
          <input
            id="method"
            name="method"
            placeholder="Espèce, Chèque…"
            className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            disabled={pending}
          />
        </div>
        <div>
          <FieldLabel htmlFor="reference">Référence</FieldLabel>
          <input
            id="reference"
            name="reference"
            placeholder="N° chèque…"
            className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            disabled={pending}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Confirmer le paiement"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={close}
        >
          Fermer
        </Button>
      </div>
    </form>
  );
}
