"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { proposeInvoiceEntryAction } from "@/actions/comptabilite";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

/** Propose l'écriture comptable VE depuis une facture émise/payée. */
export function ProposeInvoiceButton({
  invoiceId,
  existingEntryId,
  existingEntryNumber,
  existingEntryStatus,
}: {
  invoiceId: string;
  existingEntryId?: string | null;
  existingEntryNumber?: string | null;
  existingEntryStatus?: string | null;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  if (existingEntryId) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link
          prefetch={false}
          href={`/comptabilite/ecritures/${existingEntryId}`}
          className="inline-flex h-9 items-center rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium text-msk-blue hover:bg-msk-chalk"
        >
          Ouvrir l’écriture
          {existingEntryNumber ? ` ${existingEntryNumber}` : ""}
        </Link>
        {existingEntryStatus ? (
          <span className="text-xs text-msk-ink/45">{existingEntryStatus}</span>
        ) : null}
      </div>
    );
  }

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
            if (res.entryId)
              router.push(`/comptabilite/ecritures/${res.entryId}`);
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
