"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  generateInvoicePdfAction,
  issueInvoiceAction,
} from "@/actions/commercial";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";
import type { ComInvoiceStatus } from "@prisma/client";

export function InvoiceActions({
  invoiceId,
  status,
  canIssue,
  canPdf,
}: {
  invoiceId: string;
  status: ComInvoiceStatus;
  canIssue: boolean;
  canPdf: boolean;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {canIssue && status === "BROUILLON" ? (
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              void run(async () => {
                const fd = new FormData();
                fd.set("invoiceId", invoiceId);
                const res = await issueInvoiceAction(fd);
                if (!res.ok) setError(res.error ?? "Échec");
                else {
                  setMsg("Facture émise");
                  router.refresh();
                }
              });
            }}
          >
            Émettre
          </Button>
        ) : null}
        {canPdf ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              setError(null);
              void run(async () => {
                const fd = new FormData();
                fd.set("invoiceId", invoiceId);
                const res = await generateInvoicePdfAction(fd);
                if (!res.ok) setError(res.error ?? "Échec");
                else {
                  setMsg("PDF généré");
                  router.refresh();
                }
              });
            }}
          >
            Générer PDF
          </Button>
        ) : null}
      </div>
      {pending ? (
        <p className="text-sm text-msk-ink/50">Traitement en cours…</p>
      ) : null}
      {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
