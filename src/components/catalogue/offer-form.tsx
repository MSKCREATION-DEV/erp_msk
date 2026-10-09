"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { upsertCatalogOfferAction } from "@/actions/catalogue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PILLAR_LABELS } from "@/lib/crm/labels";

export function CatalogueOfferForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function onSubmit(fd: FormData) {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const res = await upsertCatalogOfferAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else {
        setOk(res.message ?? "OK");
        router.refresh();
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" name="sku" required placeholder="WEB-VITRINE" />
      </div>
      <div>
        <Label htmlFor="name">Libellé</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="pillar">Pilier</Label>
        <select
          id="pillar"
          name="pillar"
          className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          defaultValue="PRESENCE_DIGITALE"
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
          className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          defaultValue="ONE_SHOT"
        >
          <option value="ONE_SHOT">One-shot</option>
          <option value="MONTHLY">Mensuel</option>
          <option value="PACKAGE">Package</option>
        </select>
      </div>
      <div>
        <Label htmlFor="priceXof">Prix FCFA</Label>
        <Input id="priceXof" name="priceXof" inputMode="numeric" />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={2}
          className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm"
        />
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      {ok ? <p className="text-sm text-msk-blue">{ok}</p> : null}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "…" : "Enregistrer"}
      </Button>
    </form>
  );
}
