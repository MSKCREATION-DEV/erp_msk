"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createTicketAction } from "@/actions/ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

type UserOpt = { id: string; firstName: string; lastName: string };

export function TicketForm({ users }: { users: UserOpt[] }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    void run(async () => {
      const res = await createTicketAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else router.push(res.id ? `/ops/anomalies/${res.id}` : "/ops/anomalies");
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
        <Label htmlFor="equipment">Équipement / zone *</Label>
        <Input id="equipment" name="equipment" required disabled={pending} />
      </div>

      <div>
        <Label htmlFor="problem">Problème *</Label>
        <textarea
          id="problem"
          name="problem"
          required
          disabled={pending}
          rows={4}
          className="w-full rounded-lg border border-msk-paper bg-white px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="priority">Priorité</Label>
          <select
            id="priority"
            name="priority"
            disabled={pending}
            defaultValue="MEDIUM"
            className="w-full rounded-lg border border-msk-paper bg-white px-3 py-2 text-sm"
          >
            <option value="LOW">Basse</option>
            <option value="MEDIUM">Moyenne</option>
            <option value="HIGH">Haute</option>
            <option value="CRITICAL">Critique</option>
          </select>
        </div>
        <div>
          <Label htmlFor="assignedToId">Assigné à</Label>
          <select
            id="assignedToId"
            name="assignedToId"
            disabled={pending}
            defaultValue=""
            className="w-full rounded-lg border border-msk-paper bg-white px-3 py-2 text-sm"
          >
            <option value="">— Non assigné —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="actionPlan">Plan d’action</Label>
        <Input id="actionPlan" name="actionPlan" disabled={pending} />
      </div>

      <div>
        <Label htmlFor="observations">Observations</Label>
        <Input id="observations" name="observations" disabled={pending} />
      </div>

      <Button type="submit" disabled={pending} className="bg-msk-blue">
        {pending ? "Enregistrement…" : "Créer l’anomalie"}
      </Button>
    </form>
  );
}
