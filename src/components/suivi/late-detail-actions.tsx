"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { cancelSvLate } from "@/actions/suivi/hr";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePendingAction } from "@/hooks/use-pending-action";

export function SvLateDetailActions({
  lateId,
  canManage,
  cancelled,
}: {
  lateId: string;
  canManage: boolean;
  cancelled: boolean;
}) {
  const confirm = useConfirm();
  const { run, pending } = usePendingAction();

  if (!canManage) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!cancelled ? (
        <Link
          prefetch={false}
          href={`/suivi/retards/${lateId}/edit`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
        >
          <Pencil className="size-4" aria-hidden />
          Modifier
        </Link>
      ) : null}
      {!cancelled ? (
        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => {
            void confirm({
              title: "Annuler ce retard ?",
              description: "Le retard restera visible avec le statut Annulé.",
              confirmLabel: "Confirmer l’annulation",
              tone: "danger",
              loadingLabel: "Annulation…",
              action: () =>
                run(async () => {
                  const res = await cancelSvLate(lateId);
                  if (res && !res.ok) throw new Error(res.error);
                }),
            });
          }}
        >
          {pending ? "Annulation…" : "Annuler le retard"}
        </Button>
      ) : null}
    </div>
  );
}
