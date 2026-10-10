"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMovementAction } from "@/actions/stocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

type ArticleOption = {
  id: string;
  code: string;
  designation: string;
  qtyOnHand: string;
  unit: string;
};

export function MovementForm({
  articles,
  defaultArticleId,
}: {
  articles: ArticleOption[];
  defaultArticleId?: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"ENTREE" | "SORTIE" | "AJUSTEMENT">("ENTREE");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    void run(async () => {
      const res = await createMovementAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else router.push("/stocks/mouvements");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      aria-busy={pending || undefined}
    >
      {error ? (
        <p className="rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral">
          {error}
        </p>
      ) : null}

      <div>
        <Label htmlFor="articleId">Article *</Label>
        <select
          id="articleId"
          name="articleId"
          required
          disabled={pending}
          defaultValue={defaultArticleId ?? ""}
          className="w-full rounded-lg border border-msk-paper bg-white px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Choisir…
          </option>
          {articles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} — {a.designation} ({a.qtyOnHand} {a.unit})
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="type">Type *</Label>
        <select
          id="type"
          name="type"
          required
          disabled={pending}
          value={type}
          onChange={(e) =>
            setType(e.target.value as "ENTREE" | "SORTIE" | "AJUSTEMENT")
          }
          className="w-full rounded-lg border border-msk-paper bg-white px-3 py-2 text-sm"
        >
          <option value="ENTREE">Entrée</option>
          <option value="SORTIE">Sortie</option>
          <option value="AJUSTEMENT">Ajustement (qty cible)</option>
        </select>
      </div>

      {type === "AJUSTEMENT" ? (
        <div>
          <Label htmlFor="targetQty">Quantité cible *</Label>
          <Input
            id="targetQty"
            name="targetQty"
            type="number"
            step="0.001"
            min="0"
            required
            disabled={pending}
          />
        </div>
      ) : (
        <div>
          <Label htmlFor="quantity">Quantité *</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            step="0.001"
            min="0.001"
            required
            disabled={pending}
          />
        </div>
      )}

      <div>
        <Label htmlFor="reason">Motif</Label>
        <Input id="reason" name="reason" disabled={pending} />
      </div>

      <Button type="submit" disabled={pending} className="bg-msk-blue">
        {pending ? "Enregistrement…" : "Enregistrer le mouvement"}
      </Button>
    </form>
  );
}
