"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createAccountAction } from "@/actions/comptabilite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

const NATURES = [
  { value: "ASSET", label: "Actif" },
  { value: "LIABILITY", label: "Passif" },
  { value: "EQUITY", label: "Capitaux propres" },
  { value: "EXPENSE", label: "Charge" },
  { value: "INCOME", label: "Produit" },
] as const;

/** Création compte du plan — redirige vers le plan de comptes. */
export function AccountCreateForm() {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [isPostable, setIsPostable] = useState(true);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("isPostable", isPostable ? "true" : "false");

    void run(async () => {
      const res = await createAccountAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      router.push("/comptabilite/plan");
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
          <Label htmlFor="code">Code *</Label>
          <Input
            id="code"
            name="code"
            required
            maxLength={16}
            placeholder="Ex. 6281"
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="classNum">Classe (1–8) *</Label>
          <Input
            id="classNum"
            name="classNum"
            type="number"
            min={1}
            max={8}
            required
            disabled={pending}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="label">Libellé *</Label>
          <Input
            id="label"
            name="label"
            required
            maxLength={200}
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="nature">Nature *</Label>
          <select
            id="nature"
            name="nature"
            required
            disabled={pending}
            defaultValue="EXPENSE"
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            {NATURES.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-msk-ink/70">
            <input
              type="checkbox"
              checked={isPostable}
              disabled={pending}
              onChange={(e) => setIsPostable(e.target.checked)}
              className="rounded border-msk-ink/20"
            />
            Ventilable (compte de mouvement)
          </label>
        </div>
      </div>

      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer le compte"}
      </Button>
    </form>
  );
}
