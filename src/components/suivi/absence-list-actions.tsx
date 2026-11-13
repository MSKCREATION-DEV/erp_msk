"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FilePlus2, Pencil, XCircle } from "lucide-react";
import { cancelSvAbsence } from "@/actions/suivi/hr";
import { AbsenceJustificatifModal } from "@/components/suivi/absence-justificatif-modal";
import { ActionMenu } from "@/components/ui/action-menu";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePendingAction } from "@/hooks/use-pending-action";

/**
 * Actions ligne liste Absences Suivi — pattern Commercial (menu + confirm await).
 * Justificatif : modal (choisir ≠ envoyer).
 */
export function SvAbsenceListActions({
  absenceId,
  canManage,
  cancelled,
  hasJustificatif,
}: {
  absenceId: string;
  canManage: boolean;
  cancelled: boolean;
  hasJustificatif: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = usePendingAction();
  const [justifOpen, setJustifOpen] = useState(false);

  const items = [
    {
      id: "view",
      label: "Voir",
      icon: <Eye className="size-3.5" aria-hidden />,
      onSelect: () => router.push(`/suivi/absences/${absenceId}`),
    },
    ...(canManage && !cancelled
      ? [
          {
            id: "edit",
            label: "Modifier",
            icon: <Pencil className="size-3.5" aria-hidden />,
            onSelect: () =>
              router.push(`/suivi/absences/${absenceId}/edit`),
          },
          ...(!hasJustificatif
            ? [
                {
                  id: "justificatif",
                  label: "Ajouter justificatif",
                  icon: <FilePlus2 className="size-3.5" aria-hidden />,
                  disabled: pending,
                  onSelect: () => setJustifOpen(true),
                },
              ]
            : []),
          {
            id: "cancel",
            label: "Annuler",
            icon: <XCircle className="size-3.5" aria-hidden />,
            tone: "danger" as const,
            disabled: pending,
            onSelect: () => {
              void confirm({
                title: "Annuler cette absence ?",
                description:
                  "L’absence restera visible avec le statut Annulée.",
                confirmLabel: "Confirmer l’annulation",
                tone: "danger",
                loadingLabel: "Annulation…",
                action: () =>
                  run(async () => {
                    const res = await cancelSvAbsence(absenceId);
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
      {!hasJustificatif && canManage && !cancelled ? (
        <AbsenceJustificatifModal
          open={justifOpen}
          onOpenChange={setJustifOpen}
          absenceId={absenceId}
        />
      ) : null}
      <ActionMenu items={items} label="Actions absence" />
    </div>
  );
}
