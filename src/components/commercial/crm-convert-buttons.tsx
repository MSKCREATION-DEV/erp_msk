"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { convertOpportunityToClientAction } from "@/actions/commercial";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";
import Link from "next/link";

export function CrmConvertButtons({
  opportunityId,
  existingClientId,
  canManage,
}: {
  opportunityId: string;
  existingClientId?: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  if (!canManage && !existingClientId) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {existingClientId ? (
        <>
          <Link
            href={`/commercial/clients/${existingClientId}`}
            className="inline-flex h-9 items-center rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium hover:bg-msk-chalk"
          >
            Voir le client
          </Link>
          <Link
            href={`/commercial/devis/nouveau?clientId=${existingClientId}&opportunityId=${opportunityId}`}
            className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
          >
            Créer un devis
          </Link>
        </>
      ) : (
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
                router.push(`/commercial/clients/${res.clientId}`);
              } else router.refresh();
            });
          }}
        >
          {pending ? "Conversion…" : "Créer client Commercial"}
        </Button>
      )}
      {error ? <p className="w-full text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
