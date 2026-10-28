"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createAppointmentAction } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field-label";
import { Surface } from "@/components/ui/surface";
import { usePendingAction } from "@/hooks/use-pending-action";

export function AppointmentForm({
  opportunityId,
  opportunityLabel,
  cancelHref = "/crm/rdv",
}: {
  opportunityId?: string;
  opportunityLabel?: string;
  cancelHref?: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [oppId, setOppId] = useState(opportunityId ?? "");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (oppId) fd.set("opportunityId", oppId);
    void run(async () => {
      const res = await createAppointmentAction(fd);
      if (res && !res.ok) {
        setError(res.error ?? "Échec");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full space-y-6"
      aria-busy={pending || undefined}
      noValidate
    >
      <Surface className="w-full space-y-5 p-5 sm:p-6">
        {opportunityLabel ? (
          <p className="text-sm text-msk-ink/65">
            Prospect :{" "}
            <span className="font-medium text-msk-ink">{opportunityLabel}</span>
          </p>
        ) : (
          <div>
            <FieldLabel htmlFor="opportunityId" required>
              ID prospect
            </FieldLabel>
            <Input
              id="opportunityId"
              name="opportunityId"
              value={oppId}
              onChange={(e) => setOppId(e.target.value)}
              disabled={pending}
              placeholder="Coller l’id depuis la fiche prospect"
            />
            <FieldHint>
              Préférez créer depuis la fiche prospect (CTA RDV).
            </FieldHint>
          </div>
        )}
        <input type="hidden" name="opportunityId" value={oppId} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="title" required>
              Intitulé
            </FieldLabel>
            <Input
              id="title"
              name="title"
              required
              disabled={pending}
              placeholder="Ex. Démo pack réseaux sociaux"
            />
          </div>
          <div>
            <FieldLabel htmlFor="startsAt" required>
              Début
            </FieldLabel>
            <Input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              required
              disabled={pending}
            />
          </div>
          <div>
            <FieldLabel htmlFor="endsAt">Fin</FieldLabel>
            <Input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              disabled={pending}
            />
          </div>
          <div>
            <FieldLabel htmlFor="location">Lieu / visio</FieldLabel>
            <Input
              id="location"
              name="location"
              disabled={pending}
              placeholder="Ex. Bureau MSK / Google Meet"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              disabled={pending}
              placeholder="Objectif du RDV, participants…"
            />
          </div>
        </div>
        <FieldError>{error}</FieldError>
      </Surface>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => router.push(cancelHref)}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          {pending ? "Création…" : "Planifier le RDV"}
        </Button>
      </div>
    </form>
  );
}
