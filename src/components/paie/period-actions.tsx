"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  approvePayrollAction,
  calculatePayrollAction,
} from "@/actions/paie";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

export function PeriodActions({
  periodId,
  canRun,
  canApprove,
  status,
}: {
  periodId: string;
  canRun: boolean;
  canApprove: boolean;
  status: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function act(
    fn: () => Promise<{ ok: boolean; error?: string; message?: string }>,
  ) {
    setMsg(null);
    setError(null);
    void run(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setMsg(res.message ?? "OK");
      router.refresh();
    });
  }

  const locked = status === "APPROVED" || status === "CLOSED";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {canRun && !locked ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              act(async () => {
                const fd = new FormData();
                fd.set("periodId", periodId);
                return calculatePayrollAction(fd);
              })
            }
          >
            {pending ? "Calcul…" : "Calculer les bulletins"}
          </Button>
        ) : null}
        {canApprove && !locked ? (
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              act(async () => {
                const fd = new FormData();
                fd.set("periodId", periodId);
                return approvePayrollAction(fd);
              })
            }
          >
            {pending ? "Approbation…" : "Approuver (PDF + écritures PA)"}
          </Button>
        ) : null}
      </div>
      {msg ? <p className="text-sm text-msk-blue">{msg}</p> : null}
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
