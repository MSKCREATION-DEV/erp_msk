"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, FilePlus2, Pencil, XCircle } from "lucide-react";
import {
  attachSvAbsenceJustificatif,
  cancelSvAbsence,
} from "@/actions/suivi/hr";
import { ActionMenu } from "@/components/ui/action-menu";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePendingAction } from "@/hooks/use-pending-action";

const ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp";

/**
 * Actions ligne liste Absences Suivi — pattern Commercial (menu + confirm await).
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
  const fileRef = useRef<HTMLInputElement>(null);

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
                  onSelect: () => fileRef.current?.click(),
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
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            void run(async () => {
              const fd = new FormData();
              fd.set("file", file);
              const res = await attachSvAbsenceJustificatif(absenceId, fd);
              if (res && !res.ok) throw new Error(res.error);
            });
          }}
        />
      ) : null}
      <ActionMenu items={items} label="Actions absence" />
    </div>
  );
}
