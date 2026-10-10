"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClientAction } from "@/actions/commercial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

export function ClientCreateForm() {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    void run(async () => {
      const res = await createClientAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      if (res.clientId) router.push(`/commercial/clients/${res.clientId}`);
      else router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3"
      aria-busy={pending || undefined}
    >
      <div>
        <Label htmlFor="name">Nom / entreprise *</Label>
        <Input id="name" name="name" required disabled={pending} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="contactName">Contact</Label>
          <Input id="contactName" name="contactName" disabled={pending} />
        </div>
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" name="phone" disabled={pending} />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" disabled={pending} />
        </div>
        <div>
          <Label htmlFor="city">Ville</Label>
          <Input id="city" name="city" disabled={pending} />
        </div>
        <div>
          <Label htmlFor="country">Pays</Label>
          <Input id="country" name="country" defaultValue="ML" disabled={pending} />
        </div>
        <div>
          <Label htmlFor="address">Adresse</Label>
          <Input id="address" name="address" disabled={pending} />
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          disabled={pending}
          className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-msk-ink/70">
        <input
          type="checkbox"
          name="includeTravelDefault"
          disabled={pending}
          className="rounded border-msk-ink/20"
        />
        Inclure frais de déplacement par défaut
      </label>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer le client"}
      </Button>
    </form>
  );
}
