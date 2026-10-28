"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updatePurchaseStatusAction } from "@/actions/purchases";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

export function PurchaseStatusButtons({
  purchaseId,
  status,
}: {
  purchaseId: string;
  status: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function act(next: string) {
    setError(null);
    setMsg(null);
    const fd = new FormData();
    fd.set("purchaseId", purchaseId);
    fd.set("status", next);
    void run(async () => {
      const res = await updatePurchaseStatusAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else {
        setMsg(res.message ?? "OK");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      {msg ? <p className="text-sm text-msk-blue">{msg}</p> : null}
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" ? (
          <Button
            type="button"
            disabled={pending}
            className="bg-msk-blue"
            onClick={() => act("ORDERED")}
          >
            {pending ? "…" : "Passer commande"}
          </Button>
        ) : null}
        {status === "DRAFT" || status === "ORDERED" ? (
          <Button
            type="button"
            disabled={pending}
            className="bg-msk-blue"
            onClick={() => act("RECEIVED")}
          >
            {pending ? "…" : "Réceptionner"}
          </Button>
        ) : null}
        {status !== "RECEIVED" && status !== "CANCELLED" ? (
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() => act("CANCELLED")}
          >
            Annuler
          </Button>
        ) : null}
      </div>
    </div>
  );
}
