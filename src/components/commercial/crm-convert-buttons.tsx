"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { convertOpportunityToClientAction } from "@/actions/commercial";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

export function CrmConvertButtons({
  opportunityId,
  existingClientId,
  canManage,
  canViewClient = false,
  canCreateQuote = false,
  /** Après création client → aller au devis (chaîne Intéressé). */
  preferQuoteAfterConvert = false,
}: {
  opportunityId: string;
  existingClientId?: string | null;
  canManage: boolean;
  canViewClient?: boolean;
  canCreateQuote?: boolean;
  preferQuoteAfterConvert?: boolean;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  const showLinked =
    Boolean(existingClientId) && (canViewClient || canCreateQuote);
  const showConvert = !existingClientId && canManage;

  if (!showLinked && !showConvert) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showLinked && existingClientId ? (
        <>
          {canViewClient ? (
            <Link
              prefetch={false}
              href={`/commercial/clients/${existingClientId}`}
              className="inline-flex h-9 items-center rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium hover:bg-msk-chalk"
            >
              Voir le client
            </Link>
          ) : null}
          {canCreateQuote ? (
            <Link
              prefetch={false}
              href={`/commercial/devis/nouveau?clientId=${existingClientId}&opportunityId=${opportunityId}`}
              className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
            >
              Créer un devis
            </Link>
          ) : null}
        </>
      ) : null}
      {showConvert ? (
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            void run(async () => {
              const fd = new FormData();
              fd.set("opportunityId", opportunityId);
              const res = await convertOpportunityToClientAction(fd);
              if (!res.ok) {
                setError(res.error ?? "Échec");
                return;
              }
              if (res.clientId) {
                if (preferQuoteAfterConvert && canCreateQuote) {
                  router.push(
                    `/commercial/devis/nouveau?clientId=${res.clientId}&opportunityId=${opportunityId}`,
                  );
                } else {
                  router.push(`/commercial/clients/${res.clientId}`);
                }
              } else router.refresh();
            });
          }}
        >
          {pending
            ? "Création…"
            : preferQuoteAfterConvert && canCreateQuote
              ? "Client + devis"
              : "Créer le client"}
        </Button>
      ) : null}
      {error ? <p className="w-full text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
