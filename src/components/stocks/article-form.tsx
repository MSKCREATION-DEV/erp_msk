"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { upsertArticleAction } from "@/actions/stocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

type Initial = {
  id?: string;
  code?: string;
  family?: string;
  subFamily?: string | null;
  designation?: string;
  unit?: string;
  stockMin?: string;
  location?: string | null;
  unitCostXof?: number | null;
  observations?: string | null;
  active?: boolean;
};

export function ArticleForm({
  initial,
  redirectTo = "/stocks/articles",
}: {
  initial?: Initial;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    void run(async () => {
      const res = await upsertArticleAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else router.push(res.id ? `/stocks/articles/${res.id}` : redirectTo);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      aria-busy={pending || undefined}
    >
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {error ? (
        <p className="rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">Code *</Label>
          <Input
            id="code"
            name="code"
            required
            defaultValue={initial?.code}
            placeholder="PAP-A4"
            disabled={pending}
            className="uppercase"
          />
        </div>
        <div>
          <Label htmlFor="unit">Unité *</Label>
          <Input
            id="unit"
            name="unit"
            required
            defaultValue={initial?.unit ?? "U"}
            disabled={pending}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="designation">Désignation *</Label>
        <Input
          id="designation"
          name="designation"
          required
          defaultValue={initial?.designation}
          disabled={pending}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="family">Famille *</Label>
          <Input
            id="family"
            name="family"
            required
            defaultValue={initial?.family}
            placeholder="Papeterie"
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="subFamily">Sous-famille</Label>
          <Input
            id="subFamily"
            name="subFamily"
            defaultValue={initial?.subFamily ?? ""}
            disabled={pending}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="stockMin">Stock min *</Label>
          <Input
            id="stockMin"
            name="stockMin"
            type="number"
            step="0.001"
            min="0"
            required
            defaultValue={initial?.stockMin ?? "0"}
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="location">Emplacement</Label>
          <Input
            id="location"
            name="location"
            defaultValue={initial?.location ?? ""}
            placeholder="Armoire 1"
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="unitCostXof">PU (XOF)</Label>
          <Input
            id="unitCostXof"
            name="unitCostXof"
            type="number"
            min="0"
            defaultValue={initial?.unitCostXof ?? ""}
            disabled={pending}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="observations">Observations</Label>
        <textarea
          id="observations"
          name="observations"
          rows={3}
          defaultValue={initial?.observations ?? ""}
          disabled={pending}
          className="w-full rounded-lg border border-msk-paper bg-white px-3 py-2 text-sm text-msk-ink outline-none focus:border-msk-blue"
        />
      </div>

      {initial?.id ? (
        <div>
          <Label htmlFor="active">Statut</Label>
          <select
            id="active"
            name="active"
            disabled={pending}
            defaultValue={initial.active === false ? "false" : "true"}
            className="w-full rounded-lg border border-msk-paper bg-white px-3 py-2 text-sm"
          >
            <option value="true">Actif</option>
            <option value="false">Inactif</option>
          </select>
        </div>
      ) : null}

      <p className="text-xs text-msk-ink/45">
        Le stock disponible se met à jour uniquement via les mouvements (Entrée /
        Sortie / Ajustement).
      </p>

      <Button type="submit" disabled={pending} className="bg-msk-blue">
        {pending ? "Enregistrement…" : initial?.id ? "Enregistrer" : "Créer l’article"}
      </Button>
    </form>
  );
}
