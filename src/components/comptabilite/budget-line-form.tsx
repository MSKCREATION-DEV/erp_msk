"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBudLineAction } from "@/actions/comptabilite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";
import { MONTH_LABELS } from "@/lib/comptabilite/labels";

/** Création d'une ligne budgétaire (CAPEX/OPEX) pour l'année courante. */
export function BudgetLineForm({ year }: { year: number }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("year", String(year));

    void run(async () => {
      const res = await createBudLineAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      router.push("/comptabilite/budget");
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
          <Label htmlFor="nature">Nature *</Label>
          <select
            id="nature"
            name="nature"
            required
            disabled={pending}
            defaultValue="OPEX"
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            <option value="OPEX">OPEX — Fonctionnement</option>
            <option value="CAPEX">CAPEX — Investissement</option>
          </select>
        </div>
        <div>
          <Label htmlFor="month">Mois *</Label>
          <select
            id="month"
            name="month"
            required
            disabled={pending}
            defaultValue={String(new Date().getMonth() + 1)}
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            {MONTH_LABELS.slice(1).map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="category">Catégorie *</Label>
          <Input
            id="category"
            name="category"
            required
            maxLength={120}
            placeholder="Ex. Marketing digital"
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="planned">Prévu (XOF) *</Label>
          <Input
            id="planned"
            name="planned"
            type="number"
            min={0}
            required
            defaultValue={0}
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="actual">Réalisé (XOF)</Label>
          <Input
            id="actual"
            name="actual"
            type="number"
            min={0}
            defaultValue={0}
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
        {pending ? "Création…" : "Créer la ligne"}
      </Button>
    </form>
  );
}
