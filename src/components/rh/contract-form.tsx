"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createContractAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";
import { CONTRACT_TYPE_LABEL } from "@/lib/rh/labels";

type EmployeeOption = { id: string; name: string };

/** Création d'un contrat lié à un collaborateur — redirige vers la fiche créée. */
export function ContractCreateForm({
  employees,
  defaultEmployeeId,
}: {
  employees: EmployeeOption[];
  defaultEmployeeId?: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [activate, setActivate] = useState(true);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("activate", activate ? "true" : "false");

    void run(async () => {
      const res = await createContractAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      router.push(
        res.contractId ? `/rh/contrats/${res.contractId}` : "/rh/contrats",
      );
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      aria-busy={pending || undefined}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="employeeId">Collaborateur *</Label>
          <select
            id="employeeId"
            name="employeeId"
            required
            disabled={pending}
            defaultValue={defaultEmployeeId ?? ""}
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            <option value="" disabled>
              — sélectionner —
            </option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="type">Type de contrat *</Label>
          <select
            id="type"
            name="type"
            required
            disabled={pending}
            defaultValue="CDI"
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            {Object.entries(CONTRACT_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="title">Intitulé *</Label>
          <Input
            id="title"
            name="title"
            required
            maxLength={200}
            placeholder="Ex. Contrat CDI — Comptable"
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="startDate">Date de début *</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="endDate">Date de fin</Label>
          <Input id="endDate" name="endDate" type="date" disabled={pending} />
        </div>
        <div>
          <Label htmlFor="salaryXof">Salaire (XOF)</Label>
          <Input
            id="salaryXof"
            name="salaryXof"
            type="number"
            min={0}
            disabled={pending}
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-msk-ink/70">
            <input
              type="checkbox"
              checked={activate}
              disabled={pending}
              onChange={(e) => setActivate(e.target.checked)}
              className="rounded border-msk-ink/20"
            />
            Activer immédiatement
          </label>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer le contrat"}
      </Button>
    </form>
  );
}
