"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { upsertCatalogOfferAction } from "@/actions/catalogue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";
import { PILLAR_LABELS } from "@/lib/crm/labels";
import type { CatalogBilling, CatalogPillar } from "@prisma/client";

type Initial = {
  id?: string;
  sku?: string;
  name?: string;
  description?: string;
  pillar?: CatalogPillar;
  billing?: CatalogBilling;
  priceXof?: string;
  floorPriceXof?: string;
};

export function CatalogueOfferForm({
  initial,
  redirectTo = "/catalogue",
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
      const res = await upsertCatalogOfferAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else router.push(redirectTo);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3"
      aria-busy={pending || undefined}
    >
      {initial?.id ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}
      <div>
        <Label htmlFor="sku">SKU</Label>
        <Input
          id="sku"
          name="sku"
          required
          defaultValue={initial?.sku}
          placeholder="WEB-VITRINE"
          disabled={pending}
        />
      </div>
      <div>
        <Label htmlFor="name">Libellé</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={initial?.name}
          disabled={pending}
        />
      </div>
      <div>
        <Label htmlFor="pillar">Pilier</Label>
        <select
          id="pillar"
          name="pillar"
          disabled={pending}
          className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          defaultValue={initial?.pillar ?? "PRESENCE_DIGITALE"}
        >
          {Object.entries(PILLAR_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="billing">Facturation</Label>
        <select
          id="billing"
          name="billing"
          disabled={pending}
          className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          defaultValue={initial?.billing ?? "ONE_SHOT"}
        >
          <option value="ONE_SHOT">One-shot</option>
          <option value="MONTHLY">Mensuel</option>
          <option value="PACKAGE">Package</option>
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="priceXof">Prix catalogue FCFA</Label>
          <Input
            id="priceXof"
            name="priceXof"
            inputMode="numeric"
            defaultValue={initial?.priceXof}
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="floorPriceXof">Plancher FCFA</Label>
          <Input
            id="floorPriceXof"
            name="floorPriceXof"
            inputMode="numeric"
            defaultValue={initial?.floorPriceXof}
            disabled={pending}
            placeholder="Min. devis"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description}
          disabled={pending}
          className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm"
        />
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
