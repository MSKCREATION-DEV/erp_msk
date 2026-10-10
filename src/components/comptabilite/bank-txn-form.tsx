"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBankTxnAction } from "@/actions/comptabilite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

/** Mouvement bancaire manuel — montant positif (crédit) ou négatif (débit). */
export function BankTxnForm({ bankAccountId }: { bankAccountId: string }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [sign, setSign] = useState<"credit" | "debit">("credit");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("bankAccountId", bankAccountId);
    const raw = Math.abs(Number(fd.get("amount")) || 0);
    fd.set("amount", String(sign === "debit" ? -raw : raw));

    void run(async () => {
      const res = await createBankTxnAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      router.push(`/comptabilite/banques/${bankAccountId}`);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      aria-busy={pending || undefined}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="txnDate">Date *</Label>
          <Input
            id="txnDate"
            name="txnDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="amount">Montant (XOF) *</Label>
          <div className="flex gap-2">
            <select
              value={sign}
              disabled={pending}
              onChange={(e) => setSign(e.target.value as "credit" | "debit")}
              className="h-11 w-28 rounded-lg border border-msk-ink/15 bg-white px-2 text-sm"
            >
              <option value="credit">Crédit +</option>
              <option value="debit">Débit −</option>
            </select>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={0}
              required
              disabled={pending}
              className="flex-1"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="label">Libellé *</Label>
          <Input
            id="label"
            name="label"
            required
            maxLength={500}
            disabled={pending}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="note">Note</Label>
          <Input id="note" name="note" disabled={pending} />
        </div>
      </div>

      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le mouvement"}
      </Button>
    </form>
  );
}
