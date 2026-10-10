"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createExpenseAction } from "@/actions/projets";
import { EXPENSE_JUSTIFICATIF_THRESHOLD } from "@/lib/projets/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

export function ExpenseForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const submitFlag = useRef(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("submit", submitFlag.current ? "true" : "false");
    void run(async () => {
      const res = await createExpenseAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={pending || undefined}>
      <input type="hidden" name="projectId" value={projectId} />
      {error ? (
        <p className="rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="expenseDate">Date *</Label>
          <Input
            id="expenseDate"
            name="expenseDate"
            type="date"
            required
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="nature">Nature *</Label>
          <Input id="nature" name="nature" required disabled={pending} />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" disabled={pending} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="plannedXof">Prévu XOF</Label>
          <Input
            id="plannedXof"
            name="plannedXof"
            type="number"
            min="0"
            disabled={pending}
            defaultValue={0}
          />
        </div>
        <div>
          <Label htmlFor="spentXof">Dépensé XOF *</Label>
          <Input
            id="spentXof"
            name="spentXof"
            type="number"
            min="0"
            required
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="paymentMode">Mode paiement</Label>
          <Input id="paymentMode" name="paymentMode" disabled={pending} />
        </div>
      </div>

      <div>
        <Label htmlFor="justificatifNote">
          Justificatif (réf. GED ou note)
        </Label>
        <Input
          id="justificatifNote"
          name="justificatifNote"
          disabled={pending}
          placeholder={`Obligatoire dès ${EXPENSE_JUSTIFICATIF_THRESHOLD.toLocaleString("fr-FR")} XOF`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            submitFlag.current = false;
          }}
        >
          {pending ? "…" : "Brouillon"}
        </Button>
        <Button
          type="submit"
          disabled={pending}
          className="bg-msk-blue"
          onClick={() => {
            submitFlag.current = true;
          }}
        >
          {pending ? "…" : "Soumettre"}
        </Button>
      </div>
    </form>
  );
}
