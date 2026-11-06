"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { generateContractPdfAction } from "@/actions/contracts";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

/**
 * P4 — déclencheur génération PDF contrat (charte MSK, familles A/B).
 * Idempotent côté action : si `gedDocumentId` déjà posé, le parent n’affiche
 * pas ce bouton (voir page détail) mais la miniature `DocPdfThumb`.
 */
export function ContractPdfAction({ contractId }: { contractId: string }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function generatePdf() {
    setError(null);
    void run(async () => {
      const fd = new FormData();
      fd.set("contractId", contractId);
      const res = await generateContractPdfAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec génération PDF");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={generatePdf}
      >
        {pending ? "Génération…" : "Générer PDF"}
      </Button>
      {error ? <p className="text-xs text-msk-coral">{error}</p> : null}
    </div>
  );
}
