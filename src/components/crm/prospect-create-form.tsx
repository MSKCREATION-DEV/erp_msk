"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProspectAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SOURCES = [
  "INSTAGRAM",
  "LINKEDIN",
  "WHATSAPP",
  "TERRAIN",
  "RECOMMANDATION",
  "EMAIL",
  "TELEPHONE",
  "AUTRE",
] as const;

export function ProspectCreateForm({
  offers,
}: {
  offers: { id: string; name: string; sku: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createProspectAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      if (res.opportunityId) router.push(`/crm/prospects/${res.opportunityId}`);
      else router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="orgName">Entreprise *</Label>
          <Input id="orgName" name="orgName" required />
        </div>
        <div>
          <Label htmlFor="contactFirst">Prénom contact</Label>
          <Input id="contactFirst" name="contactFirst" />
        </div>
        <div>
          <Label htmlFor="contactLast">Nom contact</Label>
          <Input id="contactLast" name="contactLast" />
        </div>
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" name="phone" />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <div>
          <Label htmlFor="source">Source</Label>
          <select
            id="source"
            name="source"
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
            defaultValue="INSTAGRAM"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="catalogOfferId">Offre catalogue</Label>
          <select
            id="catalogOfferId"
            name="catalogOfferId"
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
            defaultValue=""
          >
            <option value="">— libre —</option>
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.sku} · {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="budgetXof">Budget (FCFA)</Label>
          <Input id="budgetXof" name="budgetXof" inputMode="numeric" />
        </div>
        <div>
          <Label htmlFor="followUpAt">Date relance</Label>
          <Input id="followUpAt" name="followUpAt" type="date" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="nextAction">Prochaine action</Label>
          <Input id="nextAction" name="nextAction" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer le prospect"}
      </Button>
    </form>
  );
}
