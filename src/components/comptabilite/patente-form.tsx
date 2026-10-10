"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updatePatenteAction } from "@/actions/comptabilite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

type Patente = {
  id: string;
  label: string;
  dueDate: Date;
  amount: number;
  status: "PENDING" | "PAID" | "OVERDUE";
  note: string | null;
};

/** Mise à jour montant / statut patente — édition inline. */
export function PatenteForm({ patente }: { patente: Patente }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("id", patente.id);

    void run(async () => {
      const res = await updatePatenteAction(fd);
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
      <p className="text-sm font-medium text-msk-ink">
        {patente.label} — échéance{" "}
        {patente.dueDate.toLocaleDateString("fr-FR")}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor={`amount-${patente.id}`}>Montant (XOF)</Label>
          <Input
            id={`amount-${patente.id}`}
            name="amount"
            type="number"
            min={0}
            defaultValue={patente.amount}
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor={`status-${patente.id}`}>Statut</Label>
          <select
            id={`status-${patente.id}`}
            name="status"
            disabled={pending}
            defaultValue={patente.status}
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            <option value="PENDING">En attente</option>
            <option value="PAID">Payée</option>
            <option value="OVERDUE">En retard</option>
          </select>
        </div>
        <div>
          <Label htmlFor={`note-${patente.id}`}>Note</Label>
          <Input
            id={`note-${patente.id}`}
            name="note"
            defaultValue={patente.note ?? ""}
            disabled={pending}
          />
        </div>
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
