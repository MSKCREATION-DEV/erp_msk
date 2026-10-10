"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
}: {
  quoteId: string;
  status: ComQuoteStatus;
  canSend: boolean;
  canAccept: boolean;
  canInvoice: boolean;
  canPdf: boolean;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function act(
    label: string,
    fn: () => Promise<{ ok: boolean; error?: string; invoiceId?: string }>,
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
      if (res.invoiceId) {
        router.push(`/commercial/factures/${res.invoiceId}`);
        return;
      }
      router.refresh();
      // Laisser le RSC se rafraîchir avant la suite (smoke / double-clic)
      await new Promise((r) => setTimeout(r, 200));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {canPdf ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              act("PDF généré", async () => {
                const fd = new FormData();
                fd.set("quoteId", quoteId);
                return generateQuotePdfAction(fd);
              })
            }
          >
            Générer PDF
          </Button>
        ) : null}
        {canSend && status === "BROUILLON" ? (
          <Button
            type="button"
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
