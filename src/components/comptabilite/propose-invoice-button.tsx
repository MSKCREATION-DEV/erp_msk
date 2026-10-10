"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { proposeInvoiceEntryAction } from "@/actions/comptabilite";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

/** Propose l'écriture comptable VE depuis une facture émise/payée. */
export function ProposeInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setError(null);
          const fd = new FormData();
          fd.set("invoiceId", invoiceId);
          void run(async () => {
            const res = await proposeInvoiceEntryAction(fd);
            if (!res.ok) {
              setError(res.error ?? "Échec");
              return;
            }
            if (res.entryId) router.push(`/comptabilite/ecritures/${res.entryId}`);
            else router.refresh();
          });
        }}
      >
        {pending ? "Génération…" : "Proposer l’écriture comptable"}
      </Button>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
