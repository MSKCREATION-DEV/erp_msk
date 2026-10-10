"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { recordPaymentAction } from "@/actions/commercial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      className="space-y-3"
      aria-busy={pending || undefined}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="amount">Montant *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min={1}
            max={remaining > 0 ? remaining : undefined}
            defaultValue={remaining > 0 ? remaining : undefined}
            required
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="method">Mode</Label>
          <select
            id="method"
            name="method"
            disabled={pending}
            defaultValue="VIREMENT"
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            <option value="VIREMENT">Virement</option>
            <option value="ESPECES">Espèces</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="AUTRE">Autre</option>
          </select>
        </div>
        <div>
          <Label htmlFor="paidAt">Date</Label>
          <Input
            id="paidAt"
            name="paidAt"
            type="date"
            disabled={pending}
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="note">Note</Label>
        <Input id="note" name="note" disabled={pending} />
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" disabled={pending || remaining <= 0}>
        {pending ? "Enregistrement…" : "Enregistrer le paiement"}
      </Button>
    </form>
  );
}
