"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  generateInvoicePdfAction,
  issueInvoiceAction,
} from "@/actions/commercial";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";
import { DocDownloadButton } from "@/components/rh/doc-download-button";
import type { ComInvoiceStatus } from "@prisma/client";

export function InvoiceActions({
  invoiceId,
  status,
  canIssue,
  canPdf,
  gedDocumentId,
}: {
  invoiceId: string;
  status: ComInvoiceStatus;
  canIssue: boolean;
  canPdf: boolean;
  gedDocumentId?: string | null;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(gedDocumentId ?? null);

  useEffect(() => {
    setDocId(gedDocumentId ?? null);
  }, [gedDocumentId]);

  function generatePdf() {
    setError(null);
    void run(async () => {
      const fd = new FormData();
      fd.set("invoiceId", invoiceId);
      const res = await generateInvoicePdfAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      if (res.documentId) setDocId(res.documentId);
      setMsg("PDF généré — utilisez Voir / Télécharger");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
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
          docId ? (
            <DocDownloadButton
              documentId={docId}
              label="Voir / Télécharger la facture"
              variant="primary"
              size="sm"
            />
          ) : (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={generatePdf}
            >
              {pending ? "Génération…" : "Générer PDF"}
            </Button>
          )
        ) : docId ? (
          <DocDownloadButton
            documentId={docId}
            label="Voir / Télécharger la facture"
            variant="primary"
            size="sm"
          />
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
