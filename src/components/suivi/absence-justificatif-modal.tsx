"use client";

import { useState } from "react";
import { attachSvAbsenceJustificatif } from "@/actions/suivi/hr";
import { AbsenceJustificatifPicker } from "@/components/suivi/absence-justificatif-picker";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { usePendingAction } from "@/hooks/use-pending-action";

/**
 * Modal « Ajouter un justificatif » — choisir un fichier ≠ envoi GED.
 * Confirm explicite → upload + statut Justifiée (optionnel).
 */
export function AbsenceJustificatifModal({
  open,
  onOpenChange,
  absenceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  absenceId: string;
}) {
  const { run, pending } = usePendingAction();
  const [draft, setDraft] = useState<File | null>(null);
  const [markJustified, setMarkJustified] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setDraft(null);
    setMarkJustified(true);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (pending) return;
    if (!next) reset();
    onOpenChange(next);
  }

  function confirmAttach() {
    if (!draft || pending) return;
    setError(null);
    void run(async () => {
      const fd = new FormData();
      fd.set("file", draft);
      fd.set("markJustified", markJustified ? "1" : "0");
      const res = await attachSvAbsenceJustificatif(absenceId, fd);
      if (res && !res.ok) {
        setError(res.error);
        throw new Error(res.error);
      }
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Ajouter un justificatif"
      description="Vérifiez le fichier avant de l’enregistrer en GED."
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            disabled={pending || !draft}
            onClick={confirmAttach}
          >
            {pending
              ? "Enregistrement…"
              : "Confirmer l’ajout du justificatif"}
          </Button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        <AbsenceJustificatifPicker
          confirmedFile={null}
          onConfirmedChange={() => {}}
          deferConfirm
          disabled={pending}
          onDraftReadyChange={setDraft}
          hint="PDF ou image — max 8 Mo. Rien n’est envoyé tant que vous n’avez pas confirmé."
        />

        {draft ? (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-msk-ink/8 bg-white px-3 py-2.5">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-msk-ink/20 text-msk-blue focus:ring-msk-blue/30"
              checked={markJustified}
              disabled={pending}
              onChange={(e) => setMarkJustified(e.target.checked)}
            />
            <span className="text-sm text-msk-ink">
              <span className="font-medium">Marquer l’absence Justifiée</span>
              <span className="mt-0.5 block text-xs text-msk-ink/50">
                Recommandé dès qu’un justificatif est lié.
              </span>
            </span>
          </label>
        ) : null}

        {error ? (
          <p className="text-sm text-msk-coral" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
