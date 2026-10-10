"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestLeaveAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";
import { LEAVE_TYPE_LABEL } from "@/lib/rh/labels";

/** Demande de congé (collaborateur) — reste sur la page, liste rafraîchie. */
export function LeaveRequestForm() {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);

    void run(async () => {
      const res = await requestLeaveAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setSuccess(res.message ?? "Demande envoyée");
      (
        document.getElementById("leave-request-form") as HTMLFormElement | null
      )?.reset();
      router.refresh();
    });
  }

  return (
    <form
      id="leave-request-form"
      onSubmit={onSubmit}
      className="space-y-4"
      aria-busy={pending || undefined}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="type">Type de congé *</Label>
          <select
            id="type"
            name="type"
            required
            disabled={pending}
            defaultValue="CONGES_PAYES"
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            {Object.entries(LEAVE_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div />
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
          <Label htmlFor="reason">Motif</Label>
          <textarea
            id="reason"
            name="reason"
            rows={2}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer la demande"}
      </Button>
    </form>
  );
}
