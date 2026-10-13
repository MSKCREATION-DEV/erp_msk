"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileCheck2 } from "lucide-react";
import {
  createInvoiceFromQuoteAction,
  generateQuotePdfAction,
  updateQuoteStatusAction,
} from "@/actions/commercial";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";
import type { ComQuoteStatus } from "@prisma/client";

export function QuoteActions({
  quoteId,
  status,
  canSend,
  canAccept,
  canInvoice,
  canPdf,
  gedDocumentId,
}: {
  quoteId: string;
  status: ComQuoteStatus;
  canSend: boolean;
  canAccept: boolean;
  canInvoice: boolean;
  canPdf: boolean;
  gedDocumentId?: string | null;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(gedDocumentId ?? null);

  useEffect(() => {
    setDocId(gedDocumentId ?? null);
  }, [gedDocumentId]);

  function act(
    label: string,
    fn: () => Promise<{
      ok: boolean;
      error?: string;
      invoiceId?: string;
      documentId?: string;
    }>,
  ) {
    setMsg(null);
    setError(null);
    void run(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setMsg(label);
      if (res.documentId) setDocId(res.documentId);
      if (res.invoiceId) {
        router.push(`/commercial/factures/${res.invoiceId}`);
        return;
      }
      router.refresh();
    });
  }

  function generatePdf() {
    act("PDF généré — miniature ci-dessous", async () => {
      const fd = new FormData();
      fd.set("quoteId", quoteId);
      return generateQuotePdfAction(fd);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canPdf ? (
          docId ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled
              title="Le PDF est déjà généré — consultez la miniature"
            >
              <FileCheck2 className="h-4 w-4" aria-hidden />
              PDF déjà généré
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={generatePdf}
            >
              {pending ? "Génération…" : "Générer PDF"}
            </Button>
          )
        ) : null}
        {canSend && status === "BROUILLON" ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              act("Devis envoyé", async () => {
                const fd = new FormData();
                fd.set("quoteId", quoteId);
                fd.set("status", "ENVOYE");
                return updateQuoteStatusAction(fd);
              })
            }
          >
            Marquer envoyé
          </Button>
        ) : null}
        {canAccept && status === "ENVOYE" ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                act("Devis accepté", async () => {
                  const fd = new FormData();
                  fd.set("quoteId", quoteId);
                  fd.set("status", "ACCEPTE");
                  return updateQuoteStatusAction(fd);
                })
              }
            >
              Accepter
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() =>
                act("Devis refusé", async () => {
                  const fd = new FormData();
                  fd.set("quoteId", quoteId);
                  fd.set("status", "REFUSE");
                  return updateQuoteStatusAction(fd);
                })
              }
            >
              Refuser
            </Button>
          </>
        ) : null}
        {canInvoice && (status === "ACCEPTE" || status === "ENVOYE") ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              act("Facture créée", async () => {
                const fd = new FormData();
                fd.set("quoteId", quoteId);
                return createInvoiceFromQuoteAction(fd);
              })
            }
          >
            Créer facture
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
