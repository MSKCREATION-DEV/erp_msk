"use client";

import { failAction, reportActionSuccess } from "@/lib/toast/report";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { reviewAbsenceAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/components/ui/field-label";
import { usePendingAction } from "@/hooks/use-pending-action";

/** Justifiée / injustifiée — pattern Commercial (boutons + modal note). */
export function AbsenceReviewButtons({ absenceId }: { absenceId: string }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [mode, setMode] = useState<"JUSTIFIED" | "UNJUSTIFIED" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!mode) return;
    setError(null);
    const fd = new FormData();
    fd.set("absenceId", absenceId);
    fd.set("status", mode);
    if (note.trim()) fd.set("justificationNote", note.trim());
    void run(async () => {
      const res = await reviewAbsenceAction(fd);
      if (failAction(res, setError, "Échec")) return;
      reportActionSuccess("Décision enregistrée.");
      setMode(null);
      setNote("");
      router.refresh();
    });
  }

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          setMode("JUSTIFIED");
          setError(null);
        }}
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Justifiée
      </Button>
      <Button
        type="button"
        size="sm"
        variant="danger"
        disabled={pending}
        onClick={() => {
          setMode("UNJUSTIFIED");
          setError(null);
        }}
      >
        <XCircle className="h-3.5 w-3.5" aria-hidden />
        Injustifiée
      </Button>

      <Modal
        open={mode != null}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setMode(null);
            setNote("");
            setError(null);
          }
        }}
        title={
          mode === "JUSTIFIED"
            ? "Marquer justifiée"
            : "Marquer injustifiée"
        }
        description="Note optionnelle pour le dossier."
        size="md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setMode(null);
                setNote("");
                setError(null);
              }}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant={mode === "UNJUSTIFIED" ? "danger" : "primary"}
              disabled={pending}
              onClick={confirm}
            >
              {pending ? "Traitement…" : "Confirmer"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 p-5">
          <div>
            <FieldLabel htmlFor={`abs-note-${absenceId}`}>
              Note (optionnel)
            </FieldLabel>
            <Textarea
              id={`abs-note-${absenceId}`}
              rows={3}
              value={note}
              disabled={pending}
              placeholder="Motif / précision RH"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-msk-coral" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
