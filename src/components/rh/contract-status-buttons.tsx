"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RhContractStatus } from "@prisma/client";
import { setContractStatusAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";
import { CONTRACT_STATUS_LABEL } from "@/lib/rh/labels";

const ORDER: RhContractStatus[] = ["DRAFT", "ACTIVE", "ENDED", "CANCELLED"];

/** Changement de statut d'un contrat (admin RH). */
export function ContractStatusButtons({
  contractId,
  status,
}: {
  contractId: string;
  status: RhContractStatus;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function setStatus(next: RhContractStatus) {
    setError(null);
    const fd = new FormData();
    fd.set("contractId", contractId);
    fd.set("status", next);
    void run(async () => {
      const res = await setContractStatusAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {ORDER.filter((s) => s !== status).map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={s === "CANCELLED" ? "danger" : "secondary"}
            disabled={pending}
            onClick={() => setStatus(s)}
          >
            {pending ? "…" : `Passer « ${CONTRACT_STATUS_LABEL[s]} »`}
          </Button>
        ))}
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
