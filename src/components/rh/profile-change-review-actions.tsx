"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { reviewProfileChangeAction } from "@/actions/rh-profile";
import { usePendingAction } from "@/hooks/use-pending-action";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/components/ui/field-label";

export function ProfileChangeReviewActions({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [mode, setMode] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!mode) return;
    setError(null);
    void run(async () => {
      const fd = new FormData();
      fd.set("requestId", requestId);
      fd.set("decision", mode);
      if (reviewNote.trim()) fd.set("reviewNote", reviewNote.trim());
      const res = await reviewProfileChangeAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setMode(null);
      setReviewNote("");
      router.refresh();
    });
  }

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-2 border-t border-msk-ink/6 pt-3"
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
            setReviewNote("");
            setError(null);
          }
        }}
        title={
          mode === "APPROVED"
            ? "Approuver la modification"
            : "Refuser la modification"
        }
        description="Commentaire optionnel pour le collaborateur."
        size="md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setMode(null);
                setReviewNote("");
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
            <FieldLabel htmlFor={`profile-rev-${requestId}`}>
              Commentaire RH (optionnel)
            </FieldLabel>
            <Textarea
              id={`profile-rev-${requestId}`}
              rows={3}
              value={reviewNote}
              disabled={pending}
              placeholder="Motif du refus ou précision"
              onChange={(e) => setReviewNote(e.target.value)}
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
