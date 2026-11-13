"use client";

import { useState } from "react";
import Link from "next/link";
import { FilePlus2, FileText, Pencil } from "lucide-react";
import { cancelSvAbsence } from "@/actions/suivi/hr";
import { AbsenceJustificatifModal } from "@/components/suivi/absence-justificatif-modal";
import { Button } from "@/components/ui/button";
import { SvGedDocActions } from "@/components/suivi/ged-doc-actions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePendingAction } from "@/hooks/use-pending-action";

type GedDoc = {
  id: string;
  originalName: string;
  mime: string;
  size: number;
};

export function SvAbsenceDetailActions({
  absenceId,
  canManage,
  cancelled,
  ged,
}: {
  absenceId: string;
  canManage: boolean;
  cancelled: boolean;
  ged: GedDoc | null;
}) {
  const confirm = useConfirm();
  const { run, pending } = usePendingAction();
  const [justifOpen, setJustifOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canManage && !cancelled ? (
        <Link
          prefetch={false}
          href={`/suivi/absences/${absenceId}/edit`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
        >
          <Pencil className="size-4" aria-hidden />
          Modifier
        </Link>
      ) : null}
      {ged ? (
        <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-msk-ink/10 bg-white px-2 py-1">
          <FileText className="size-4 shrink-0 text-msk-blue" aria-hidden />
          <span className="max-w-48 truncate text-xs text-msk-ink/60">
            {ged.originalName}
          </span>
          <SvGedDocActions
            documentId={ged.id}
            originalName={ged.originalName}
            mime={ged.mime}
            size={ged.size}
            compact
          />
        </div>
      ) : canManage && !cancelled ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => setJustifOpen(true)}
          >
            <FilePlus2 className="size-4" aria-hidden />
            Ajouter un justificatif
          </Button>
          <AbsenceJustificatifModal
            open={justifOpen}
            onOpenChange={setJustifOpen}
            absenceId={absenceId}
          />
        </>
      ) : (
        <span className="inline-flex h-9 items-center rounded-lg border border-dashed border-msk-ink/15 px-3 text-xs text-msk-ink/45">
          Pas de justificatif
        </span>
      )}
      {canManage && !cancelled ? (
        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => {
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
          }}
        >
          {pending ? "Annulation…" : "Annuler l’absence"}
        </Button>
      ) : null}
    </div>
  );
}
