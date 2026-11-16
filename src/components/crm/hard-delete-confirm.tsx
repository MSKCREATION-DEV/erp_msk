"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { usePendingAction } from "@/hooks/use-pending-action";
import { failAction, reportActionSuccess } from "@/lib/toast/report";
import {
  hardDeleteInventoryLines,
  hardDeleteInventoryTotal,
  type HardDeleteInventory,
} from "@/lib/crm/hard-delete-meta";
import { cn } from "@/lib/utils";

type PreviewResult =
  | { ok: true; inventory: HardDeleteInventory }
  | { ok: false; error: string };

/**
 * Contrôle hard-delete générique — inventaire + confirmation danger.
 */
export function HardDeleteConfirmControl({
  entityLabel,
  preview,
  onConfirm,
  compact = false,
  triggerLabel = "Supprimer",
  className,
}: {
  entityLabel: string;
  preview: () => Promise<PreviewResult>;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
  compact?: boolean;
  triggerLabel?: string;
  className?: string;
}) {
  const { pending, run } = usePendingAction();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<HardDeleteInventory | null>(null);
  const [loadingInv, setLoadingInv] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingInv(true);
    setError(null);
    setInventory(null);
    void preview().then((res) => {
      if (cancelled) return;
      setLoadingInv(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setInventory(res.inventory);
    });
    return () => {
      cancelled = true;
    };
  }, [open, preview]);

  function openModal() {
    setError(null);
    setOpen(true);
  }

  function confirm() {
    if (!inventory || inventory.blocked) return;
    setError(null);
    void run(async () => {
      const res = await onConfirm();
      if (failAction(res, setError, "Échec de la suppression")) return;
      reportActionSuccess("Suppression effectuée.");
      setOpen(false);
    });
  }

  const menuItems: ActionMenuItem[] = [
    {
      id: "delete",
      label: triggerLabel,
      icon: <Trash2 className="h-3.5 w-3.5" aria-hidden />,
      tone: "danger",
      disabled: pending,
      onSelect: openModal,
    },
  ];

  const lines = inventory ? hardDeleteInventoryLines(inventory) : [];
  const total = inventory ? hardDeleteInventoryTotal(inventory) : 0;

  return (
    <div className={cn(className)}>
      {compact ? (
        <ActionMenu items={menuItems} label={`Actions — ${entityLabel}`} />
      ) : (
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={openModal}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {triggerLabel}
        </Button>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Suppression définitive"
        description={`Vous allez supprimer « ${entityLabel} » et tous les éléments liés. Cette action est irréversible.`}
        size="md"
      >
        <div className="space-y-4 p-5">
          {loadingInv ? (
            <p className="text-sm text-msk-ink/50">Chargement de l’inventaire…</p>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-msk-coral/25 bg-msk-coral/5 px-3.5 py-2.5 text-sm text-msk-coral">
              {error}
            </p>
          ) : null}

          {inventory?.blocked ? (
            <div className="space-y-3">
              <p className="text-sm text-msk-ink/80">{inventory.blockReason}</p>
              {inventory.relatedClientId ? (
                <Link
                  href={`/commercial/clients/${inventory.relatedClientId}`}
                  className="inline-flex text-sm font-medium text-msk-blue hover:underline"
                  onClick={() => setOpen(false)}
                >
                  Ouvrir la fiche client
                </Link>
              ) : null}
            </div>
          ) : null}

          {inventory && !inventory.blocked ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-msk-ink">
                Éléments qui seront effacés
                {total > 0 ? (
                  <span className="ml-1 font-normal text-msk-ink/50">
                    ({total})
                  </span>
                ) : null}
              </p>
              {lines.length === 0 ? (
                <p className="text-sm text-msk-ink/55">
                  Aucun sous-élément lié — seule la fiche sera supprimée.
                </p>
              ) : (
                <ul className="divide-y divide-msk-ink/6 rounded-xl border border-msk-ink/8 bg-msk-chalk/40 px-3.5">
                  {lines.map((line) => (
                    <li
                      key={line}
                      className="py-2.5 text-sm text-msk-ink/80 first:pt-3 last:pb-3"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs leading-relaxed text-msk-ink/45">
                Les documents GED associés seront mis à la corbeille (récupérables
                un temps par l’admin GED). Les données métier listées ci-dessus
                seront définitivement effacées.
              </p>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-msk-ink/6 pt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            {inventory && !inventory.blocked ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={pending || loadingInv}
                onClick={confirm}
              >
                {pending ? "Suppression…" : "Confirmer la suppression"}
              </Button>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  );
}
