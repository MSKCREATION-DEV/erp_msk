"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reassignClientOwnerAction } from "@/actions/commercial";
import { Button } from "@/components/ui/button";
import { FieldHint, FieldLabel } from "@/components/ui/field-label";
import { usePendingAction } from "@/hooks/use-pending-action";

type AssignOption = { value: string; label: string };

export function ClientReassignForm({
  clientId,
  currentOwnerId,
  assignOptions,
}: {
  clientId: string;
  currentOwnerId: string;
  assignOptions: AssignOption[];
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const choices = assignOptions.filter((o) => o.value !== currentOwnerId);

  if (choices.length === 0) {
    return (
      <p className="text-sm text-msk-ink/45">
        Aucun autre collaborateur opérationnel disponible pour le suivi.
      </p>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        void run(async () => {
          const res = await reassignClientOwnerAction(fd);
          if (!res.ok) {
            setError(res.error ?? "Échec");
            return;
          }
          router.refresh();
        });
      }}
      aria-busy={pending || undefined}
    >
      <input type="hidden" name="clientId" value={clientId} />
      <div>
        <FieldLabel htmlFor="ownerId">Nouveau suivi</FieldLabel>
        <select
          id="ownerId"
          name="ownerId"
          required
          disabled={pending}
          className="mt-1.5 w-full rounded-xl border border-msk-ink/10 bg-white px-3 py-2.5 text-sm text-msk-ink outline-none focus:border-msk-blue focus:ring-2 focus:ring-msk-blue/15"
          defaultValue=""
        >
          <option value="" disabled>
            Choisir un collaborateur…
          </option>
          {choices.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <FieldHint>
          Le changement est enregistré dans l’historique de la fiche et l’audit
          sécurité.
        </FieldHint>
      </div>
      {error ? (
        <p className="text-sm text-msk-coral" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Attribuer le suivi"}
      </Button>
    </form>
  );
}
