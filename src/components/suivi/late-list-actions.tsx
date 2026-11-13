"use client";

import { useRouter } from "next/navigation";
import { Eye, Pencil, XCircle } from "lucide-react";
import { cancelSvLate } from "@/actions/suivi/hr";
import { ActionMenu } from "@/components/ui/action-menu";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePendingAction } from "@/hooks/use-pending-action";

/**
 * Actions ligne liste Retards Suivi — pattern Commercial (menu + confirm await).
 */
export function SvLateListActions({
  lateId,
  canManage,
  cancelled,
}: {
  lateId: string;
  canManage: boolean;
  cancelled: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = usePendingAction();

  const items = [
    {
      id: "view",
      label: "Voir",
      icon: <Eye className="size-3.5" aria-hidden />,
      onSelect: () => router.push(`/suivi/retards/${lateId}`),
    },
    ...(canManage && !cancelled
      ? [
          {
            id: "edit",
            label: "Modifier",
            icon: <Pencil className="size-3.5" aria-hidden />,
            onSelect: () => router.push(`/suivi/retards/${lateId}/edit`),
          },
          {
            id: "cancel",
            label: "Annuler",
            icon: <XCircle className="size-3.5" aria-hidden />,
            tone: "danger" as const,
            disabled: pending,
            onSelect: () => {
              void confirm({
                title: "Annuler ce retard ?",
                description:
                  "Le retard restera visible avec le statut Annulé.",
                confirmLabel: "Confirmer l’annulation",
                tone: "danger",
                loadingLabel: "Annulation…",
                action: () =>
                  run(async () => {
                    const res = await cancelSvLate(lateId);
                    if (res && !res.ok) throw new Error(res.error);
                  }),
              });
            },
          },
        ]
      : []),
  ];

  return (
    <div
      className="flex justify-end"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <ActionMenu items={items} label="Actions retard" />
    </div>
  );
}
