"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, PauseCircle, PlayCircle, XCircle } from "lucide-react";
import type { ComContractStatus } from "@/generated/prisma/client";
import { setContractStatusAction } from "@/actions/contracts";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/ui/action-menu";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePendingAction } from "@/hooks/use-pending-action";

/**
 * P3.3 — statut & signature honnêtes. La 1ʳᵉ activation (BROUILLON → ACTIF)
 * est présentée comme l’acte de signature explicite (jamais automatique à la
 * création). Les transitions suivantes (suspendre/résilier/reprendre) passent
 * toutes par confirmation — jamais de changement silencieux.
 */
export function ContractStatusActions({
  contractId,
  status,
  alreadySigned,
}: {
  contractId: string;
  status: ComContractStatus;
  alreadySigned: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function setStatus(next: ComContractStatus, opts: Parameters<typeof confirm>[0]) {
    setError(null);
    void confirm({
      ...opts,
      action: () =>
        run(async () => {
          const fd = new FormData();
          fd.set("contractId", contractId);
          fd.set("status", next);
          const res = await setContractStatusAction(fd);
          if (!res.ok) {
            throw new Error(res.error ?? "Échec");
          }
          router.refresh();
        }),
    }).catch((e) => {
      setError(e instanceof Error ? e.message : "Échec");
    });
  }

  if (status === "BROUILLON") {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={pending}
          onClick={() =>
            setStatus("ACTIF", {
              title: "Signer et activer ce contrat ?",
              description:
                "Acte explicite : la date de signature est enregistrée maintenant. Le contrat devient facturable.",
              confirmLabel: "Signer et activer",
              cancelLabel: "Annuler",
              tone: "primary",
              icon: "info",
              loadingLabel: "Activation…",
            })
          }
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Signer et activer le contrat
        </Button>
        {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      </div>
    );
  }

  if (status === "RESILIE" || status === "TERMINE") {
    return null;
  }

  const items = [
    status === "ACTIF"
      ? {
          id: "suspend",
          label: "Suspendre",
          icon: <PauseCircle className="h-3.5 w-3.5" aria-hidden />,
          tone: "danger" as const,
          disabled: pending,
          onSelect: () =>
            setStatus("SUSPENDU", {
              title: "Suspendre ce contrat ?",
              description: "Aucune facture ne sera générée tant qu’il reste suspendu.",
              confirmLabel: "Suspendre",
              tone: "danger",
              icon: "warning",
              loadingLabel: "Suspension…",
            }),
        }
      : {
          id: "resume",
          label: "Reprendre",
          icon: <PlayCircle className="h-3.5 w-3.5" aria-hidden />,
          tone: "default" as const,
          disabled: pending,
          onSelect: () =>
            setStatus("ACTIF", {
              title: "Reprendre ce contrat ?",
              description: "Le contrat redevient actif et facturable.",
              confirmLabel: "Reprendre",
              tone: "primary",
              icon: "info",
              loadingLabel: "Reprise…",
            }),
        },
    {
      id: "terminate",
      label: "Résilier",
      icon: <XCircle className="h-3.5 w-3.5" aria-hidden />,
      tone: "danger" as const,
      disabled: pending,
      onSelect: () =>
        setStatus("RESILIE", {
          title: "Résilier ce contrat ?",
          description: "Action définitive — le contrat ne pourra plus être réactivé.",
          confirmLabel: "Confirmer la résiliation",
          tone: "danger",
          icon: "warning",
          loadingLabel: "Résiliation…",
        }),
    },
  ];

  return (
    <div className="space-y-2 border-t border-msk-ink/6 pt-4">
      <ActionMenu label="Statut du contrat" items={items} />
      {alreadySigned ? (
        <p className="text-xs text-msk-ink/40">Signé — statut modifiable sans retour en brouillon.</p>
      ) : null}
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
