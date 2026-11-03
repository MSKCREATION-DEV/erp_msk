"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adjustLeaveBalanceAction } from "@/actions/rh-leave-ledger";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { usePendingAction } from "@/hooks/use-pending-action";

export function LeaveAdjustForm({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    const fd = new FormData(e.currentTarget);
    fd.set("employeeId", employeeId);
    void run(async () => {
      const res = await adjustLeaveBalanceAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setOkMsg(res.message ?? "Solde régularisé");
      e.currentTarget.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
      <div className="sm:col-span-1 lg:col-span-3">
        <FieldLabel htmlFor="days" required>
          Écart (jours)
        </FieldLabel>
        <input
          id="days"
          name="days"
          type="number"
          step="0.5"
          required
          disabled={pending}
          placeholder="Ex. 2.5 ou -1"
          className="mt-1.5 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm focus:border-msk-blue focus:outline-none focus:ring-2 focus:ring-msk-blue/20 disabled:opacity-50"
        />
      </div>
      <div className="sm:col-span-1 lg:col-span-3">
        <FieldLabel htmlFor="effectiveDate">Date d’effet</FieldLabel>
        <input
          id="effectiveDate"
          name="effectiveDate"
          type="date"
          disabled={pending}
          className="mt-1.5 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm focus:border-msk-blue focus:outline-none focus:ring-2 focus:ring-msk-blue/20 disabled:opacity-50"
        />
      </div>
      <div className="sm:col-span-2 lg:col-span-6">
        <FieldLabel htmlFor="note" required>
          Motif
        </FieldLabel>
        <input
          id="note"
          name="note"
          type="text"
          required
          minLength={3}
          disabled={pending}
          placeholder="Ex. Correction solde après reprise"
          className="mt-1.5 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm focus:border-msk-blue focus:outline-none focus:ring-2 focus:ring-msk-blue/20 disabled:opacity-50"
        />
      </div>
      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-12">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enregistrement…" : "Régulariser le solde"}
        </Button>
        {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
        {okMsg ? <p className="text-sm text-msk-blue">{okMsg}</p> : null}
      </div>
    </form>
  );
}
