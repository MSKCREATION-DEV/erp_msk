"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { recordPaymentAction } from "@/actions/commercial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, FieldLabel } from "@/components/ui/field-label";
import { usePendingAction } from "@/hooks/use-pending-action";

export function PaymentForm({
  invoiceId,
  remaining,
}: {
  invoiceId: string;
  remaining: number;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("invoiceId", invoiceId);
    void run(async () => {
      const res = await recordPaymentAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      noValidate
      aria-busy={pending || undefined}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <FieldLabel htmlFor="amount" required>
            Montant
          </FieldLabel>
          <Input
            id="amount"
            name="amount"
            type="number"
            min={1}
            max={remaining > 0 ? remaining : undefined}
            defaultValue={remaining > 0 ? remaining : undefined}
            required
            disabled={pending}
            placeholder="Ex. 150000"
          />
        </div>
        <div>
          <FieldLabel htmlFor="method">Mode</FieldLabel>
          <select
            id="method"
            name="method"
            disabled={pending}
            defaultValue="VIREMENT"
            className="flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3.5 text-sm shadow-sm focus:border-msk-blue focus:outline-none focus:ring-2 focus:ring-msk-blue/20 disabled:opacity-50"
          >
            <option value="VIREMENT">Virement</option>
            <option value="ESPECES">Espèces</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="AUTRE">Autre</option>
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="paidAt">Date</FieldLabel>
          <Input
            id="paidAt"
            name="paidAt"
            type="date"
            disabled={pending}
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>
      <FieldError>{error}</FieldError>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le paiement"}
      </Button>
    </form>
  );
}
