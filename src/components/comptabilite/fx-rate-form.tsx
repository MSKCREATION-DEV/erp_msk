"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setFxRateAction } from "@/actions/comptabilite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

/** Ajout d'un nouveau taux EUR → XOF (historisé, applicable depuis validFrom). */
export function FxRateForm({ currentRate }: { currentRate: number }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    void run(async () => {
      const res = await setFxRateAction(fd);
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
      <p className="text-sm text-msk-ink/55">
        Taux courant : <span className="font-medium text-msk-ink">1 EUR = {currentRate.toLocaleString("fr-FR")} XOF</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="rate">Nouveau taux *</Label>
          <Input
            id="rate"
            name="rate"
            type="number"
            min={0}
            step="0.001"
            required
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="validFrom">Applicable dès *</Label>
          <Input
            id="validFrom"
            name="validFrom"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="note">Note</Label>
          <Input id="note" name="note" disabled={pending} />
        </div>
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le taux"}
      </Button>
    </form>
  );
}
