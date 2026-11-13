"use client";

import { useState } from "react";
import { Banknote, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SvExpensePaymentForm } from "@/components/suivi/expense-payment-form";
import { SvGedDocActions } from "@/components/suivi/ged-doc-actions";
import { formatSvXof } from "@/lib/suivi/labels";

type GedDoc = {
  id: string;
  originalName: string;
  mime: string;
  size: number;
};

/**
 * Actions fiche charge — pattern Commercial / list-actions :
 * CTA compacts ; paiement en panneau (pas de formulaire toujours ouvert).
 */
export function SvExpenseDetailActions({
  invoiceId,
  reste,
  canPay,
  ged,
}: {
  invoiceId: string;
  reste: number;
  canPay: boolean;
  ged: GedDoc | null;
}) {
  const [payOpen, setPayOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {canPay && reste > 0 ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setPayOpen((o) => !o)}
            aria-expanded={payOpen}
          >
            <Banknote className="size-4" aria-hidden />
            {payOpen ? "Fermer le paiement" : "Enregistrer un paiement"}
          </Button>
        ) : null}
        {ged ? (
          <div className="inline-flex items-center gap-2 rounded-lg border border-msk-ink/10 bg-white px-2 py-1">
            <FileText className="size-4 text-msk-blue" aria-hidden />
            <span className="max-w-48 truncate text-xs text-msk-ink/60">
              {ged.originalName}
            </span>
            <SvGedDocActions
              documentId={ged.id}
              originalName={ged.originalName}
              mime={ged.mime}
              size={ged.size}
            />
          </div>
        ) : (
          <span className="inline-flex h-9 items-center rounded-lg border border-dashed border-msk-ink/15 px-3 text-xs text-msk-ink/45">
            Pas de justificatif GED
          </span>
        )}
        {reste <= 0 && canPay ? (
          <span className="text-xs font-medium text-emerald-700">
            Soldée · {formatSvXof(0)} restant
          </span>
        ) : null}
      </div>
      {payOpen && canPay && reste > 0 ? (
        <SvExpensePaymentForm
          invoiceId={invoiceId}
          reste={reste}
          forceOpen
          onClose={() => setPayOpen(false)}
        />
      ) : null}
    </div>
  );
}
