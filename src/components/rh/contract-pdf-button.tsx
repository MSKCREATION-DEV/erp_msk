"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { generateContractPdfAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

/** Génère le PDF contrat (charte MSK) et le classe en GED collab. */
export function ContractPdfButton({ contractId }: { contractId: string }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          setError(null);
          void run(async () => {
            const fd = new FormData();
            fd.set("contractId", contractId);
            const res = await generateContractPdfAction(fd);
            if (!res.ok) {
              setError(res.error ?? "Échec");
              return;
            }
            setMsg(res.message ?? "PDF généré");
            router.refresh();
          });
        }}
      >
        {pending ? "Génération…" : "Générer PDF contrat"}
      </Button>
      {msg ? <p className="text-sm text-msk-blue">{msg}</p> : null}
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
