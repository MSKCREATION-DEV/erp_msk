"use client";

import { failAction } from "@/lib/toast/report";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createInvoiceFromContractAction } from "@/actions/invoices-contract";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

export function ContractInvoiceActions({
  contractId,
}: {
  contractId: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    void run(async () => {
      const fd = new FormData();
      fd.set("contractId", contractId);
      const res = await createInvoiceFromContractAction(fd);
      if (failAction(res, setError, "Échec")) {
        return;
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 border-t border-msk-ink/6 pt-4">
      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={pending}
        onClick={generate}
      >
        {pending ? "Préparation…" : "Facturer la période en cours"}
      </Button>
      <p className="text-xs text-msk-ink/45">
        Prestations dues + arriérés présentés (sans double créance).
      </p>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
