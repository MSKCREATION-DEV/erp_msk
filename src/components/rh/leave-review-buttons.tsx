"use client";

import { failAction, reportActionSuccess } from "@/lib/toast/report";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { reviewLeaveAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/components/ui/field-label";
import { usePendingAction } from "@/hooks/use-pending-action";

/** Validation / refus — pattern Commercial (boutons + modal note). */
export function LeaveReviewButtons({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [mode, setMode] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!mode) return;
    setError(null);
    const fd = new FormData();
    fd.set("leaveId", leaveId);
    fd.set("decision", mode);
    if (note.trim()) fd.set("reviewNote", note.trim());
    void run(async () => {
      const res = await reviewLeaveAction(fd);
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
          setMode("APPROVED");
          setError(null);
        }}
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Approuver
      </Button>
      <Button
        type="button"
        size="sm"
        variant="danger"
        disabled={pending}
        onClick={() => {
          setMode("REJECTED");
          setError(null);
        }}
      >
        <XCircle className="h-3.5 w-3.5" aria-hidden />
        Refuser
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
        title={mode === "APPROVED" ? "Approuver le congé" : "Refuser le congé"}
        description="Note optionnelle pour le collaborateur."
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
              variant={mode === "REJECTED" ? "danger" : "primary"}
              disabled={pending}
              onClick={confirm}
            >
              {pending
                ? "Traitement…"
                : mode === "APPROVED"
                  ? "Confirmer l’approbation"
                  : "Confirmer le refus"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 p-5">
          <div>
            <FieldLabel htmlFor={`leave-note-${leaveId}`}>
              Note (optionnel)
            </FieldLabel>
            <Textarea
              id={`leave-note-${leaveId}`}
              rows={3}
              value={note}
              disabled={pending}
              placeholder="Précision pour le collaborateur"
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
