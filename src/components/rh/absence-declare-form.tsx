"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { declareAbsenceAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

/** Déclaration d'absence — page dédiée `/espace/absences/nouveau`. */
export function AbsenceDeclareForm() {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    void run(async () => {
      const res = await declareAbsenceAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      router.push("/espace/absences");
      router.refresh();
    });
  }

  return (
    <form
      id="absence-declare-form"
      onSubmit={onSubmit}
      className="space-y-4"
      encType="multipart/form-data"
      aria-busy={pending || undefined}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="startDate">Du *</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="endDate">Au *</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            required
            disabled={pending}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="reason">Motif *</Label>
          <textarea
            id="reason"
            name="reason"
            rows={2}
            required
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="justificatif">Justificatif (optionnel)</Label>
          <Input
            id="justificatif"
            name="justificatif"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            disabled={pending}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-msk-ink/45">
            PDF ou image — max 5 Mo. Classé en GED collaborateur.
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Envoi…" : "Déclarer l'absence"}
      </Button>
    </form>
  );
}
