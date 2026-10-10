"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateTicketAction } from "@/actions/ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

type UserOpt = { id: string; firstName: string; lastName: string };

type Initial = {
  ticketId: string;
  status: string;
  priority: string;
  assignedToId: string | null;
  actionPlan: string | null;
  observations: string | null;
};

export function TicketUpdateForm({
  users,
  initial,
}: {
  users: UserOpt[];
  initial: Initial;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    void run(async () => {
      const res = await updateTicketAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={pending || undefined}>
      <input type="hidden" name="ticketId" value={initial.ticketId} />
      {error ? (
        <p className="rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="status">Statut</Label>
          <select
            id="status"
            name="status"
            disabled={pending}
            defaultValue={initial.status}
            className="w-full rounded-lg border border-msk-paper bg-white px-3 py-2 text-sm"
          >
            <option value="TODO">À faire</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="DONE">Fait</option>
            <option value="DEFERRED">Reporté</option>
          </select>
        </div>
        <div>
          <Label htmlFor="priority">Priorité</Label>
          <select
            id="priority"
            name="priority"
            disabled={pending}
            defaultValue={initial.priority}
            className="w-full rounded-lg border border-msk-paper bg-white px-3 py-2 text-sm"
          >
            <option value="LOW">Basse</option>
            <option value="MEDIUM">Moyenne</option>
            <option value="HIGH">Haute</option>
            <option value="CRITICAL">Critique</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="assignedToId">Assigné à</Label>
        <select
          id="assignedToId"
          name="assignedToId"
          disabled={pending}
          defaultValue={initial.assignedToId ?? ""}
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

      <div>
        <Label htmlFor="actionPlan">Plan d’action</Label>
        <Input
          id="actionPlan"
          name="actionPlan"
          disabled={pending}
          defaultValue={initial.actionPlan ?? ""}
        />
      </div>

      <div>
        <Label htmlFor="observations">Observations</Label>
        <Input
          id="observations"
          name="observations"
          disabled={pending}
          defaultValue={initial.observations ?? ""}
        />
      </div>

      <Button type="submit" disabled={pending} className="bg-msk-blue">
        {pending ? "Mise à jour…" : "Enregistrer"}
      </Button>
    </form>
  );
}
