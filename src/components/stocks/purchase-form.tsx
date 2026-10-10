"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPurchaseAction } from "@/actions/purchases";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

type ArticleOpt = { id: string; code: string; designation: string };

type Line = {
  articleId: string;
  label: string;
  quantity: string;
  unitPriceXof: string;
};

export function PurchaseForm({ articles }: { articles: ArticleOpt[] }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([
    { articleId: "", label: "", quantity: "1", unitPriceXof: "0" },
  ]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = lines
      .filter((l) => l.label.trim() && Number(l.quantity) > 0)
      .map((l) => ({
        articleId: l.articleId || undefined,
        label: l.label.trim(),
        quantity: Number(l.quantity),
        unitPriceXof: Math.round(Number(l.unitPriceXof) || 0),
      }));
    fd.set("linesJson", JSON.stringify(payload));
    void run(async () => {
      const res = await createPurchaseAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else router.push(res.id ? `/stocks/achats/${res.id}` : "/stocks/achats");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={pending || undefined}>
      {error ? (
        <p className="rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral">
          {error}
        </p>
      ) : null}
      <div>
        <Label htmlFor="supplierName">Fournisseur *</Label>
        <Input id="supplierName" name="supplierName" required disabled={pending} />
      </div>
      <div>
        <Label htmlFor="supplierContact">Contact</Label>
        <Input id="supplierContact" name="supplierContact" disabled={pending} />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" disabled={pending} />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-msk-ink">Lignes</p>
        {lines.map((line, idx) => (
          <div
            key={idx}
            className="grid gap-2 rounded-lg border border-msk-paper p-3 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <Label>Article stock (optionnel)</Label>
              <select
                disabled={pending}
                value={line.articleId}
                onChange={(e) => {
                  const art = articles.find((a) => a.id === e.target.value);
                  setLines((prev) =>
                    prev.map((l, i) =>
                      i === idx
                        ? {
                            ...l,
                            articleId: e.target.value,
                            label: art
                              ? `${art.code} — ${art.designation}`
                              : l.label,
                          }
                        : l,
                    ),
                  );
                }}
                className="w-full rounded-lg border border-msk-paper bg-white px-3 py-2 text-sm"
              >
                <option value="">— Hors catalogue —</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.designation}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label>Libellé *</Label>
              <Input
                required
                disabled={pending}
                value={line.label}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) =>
                      i === idx ? { ...l, label: e.target.value } : l,
                    ),
                  )
                }
              />
            </div>
            <div>
              <Label>Qté *</Label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                required
                disabled={pending}
                value={line.quantity}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) =>
                      i === idx ? { ...l, quantity: e.target.value } : l,
                    ),
                  )
                }
              />
            </div>
            <div>
              <Label>PU XOF *</Label>
              <Input
                type="number"
                min="0"
                required
                disabled={pending}
                value={line.unitPriceXof}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) =>
                      i === idx ? { ...l, unitPriceXof: e.target.value } : l,
                    ),
                  )
                }
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            setLines((prev) => [
              ...prev,
              { articleId: "", label: "", quantity: "1", unitPriceXof: "0" },
            ])
          }
        >
          + Ligne
        </Button>
      </div>

      <Button type="submit" disabled={pending} className="bg-msk-blue">
        {pending ? "Création…" : "Créer l’achat"}
      </Button>
    </form>
  );
}
