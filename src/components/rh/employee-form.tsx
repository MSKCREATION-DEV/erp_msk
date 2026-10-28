"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createEmployeeAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";
import { EMPLOYEE_TYPE_LABEL } from "@/lib/rh/labels";

type LinkableUser = { id: string; label: string };

/** Création d'une fiche collaborateur — redirige vers la fiche créée. */
export function EmployeeCreateForm({ users }: { users: LinkableUser[] }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    void run(async () => {
      const res = await createEmployeeAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      router.push(
        res.employeeId
          ? `/rh/collaborateurs/${res.employeeId}`
          : "/rh/collaborateurs",
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
        <div>
          <Label htmlFor="firstName">Prénom *</Label>
          <Input
            id="firstName"
            name="firstName"
            required
            maxLength={100}
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Nom *</Label>
          <Input
            id="lastName"
            name="lastName"
            required
            maxLength={100}
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" disabled={pending} />
        </div>
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" name="phone" maxLength={40} disabled={pending} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="jobTitle">Poste</Label>
          <Input
            id="jobTitle"
            name="jobTitle"
            maxLength={120}
            placeholder="Ex. Comptable, Commercial…"
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="employeeType">Type *</Label>
          <select
            id="employeeType"
            name="employeeType"
            required
            disabled={pending}
            defaultValue="SALARIE"
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            {Object.entries(EMPLOYEE_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="hireDate">Date d&apos;embauche</Label>
          <Input id="hireDate" name="hireDate" type="date" disabled={pending} />
        </div>
        <div>
          <Label htmlFor="leaveBalanceDays">Solde congés (jours) *</Label>
          <Input
            id="leaveBalanceDays"
            name="leaveBalanceDays"
            type="number"
            min={0}
            max={365}
            step="0.5"
            required
            defaultValue={25}
            disabled={pending}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="userId">Compte utilisateur lié</Label>
          <select
            id="userId"
            name="userId"
            disabled={pending}
            defaultValue=""
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            <option value="">— aucun compte lié —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-msk-ink/45">
            Permet au collaborateur d&apos;accéder à « Mon espace ».
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer le collaborateur"}
      </Button>
    </form>
  );
}
