"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { reviewTimesheetAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { usePendingAction } from "@/hooks/use-pending-action";

/** Validation feuille d’heures — pattern Commercial (confirm modal). */
export function TimesheetReviewButtons({
  timesheetId,
}: {
  timesheetId: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [mode, setMode] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!mode) return;
    setError(null);
    const fd = new FormData();
    fd.set("timesheetId", timesheetId);
    fd.set("decision", mode);
    void run(async () => {
      const res = await reviewTimesheetAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setMode(null);
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
            setError(null);
          }
        }}
        title={
          mode === "APPROVED"
            ? "Approuver la feuille"
            : "Refuser la feuille"
        }
        description="Confirmez la décision pour cette semaine."
        size="md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setMode(null);
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
              {pending ? "Traitement…" : "Confirmer"}
            </Button>
          </div>
        }
      >
        <div className="space-y-2 p-5 text-sm text-msk-ink/65">
          <p>
            {mode === "APPROVED"
              ? "Les heures saisies seront marquées comme validées."
              : "Le collaborateur devra ressaisir ou corriger sa semaine."}
          </p>
          {error ? (
            <p className="text-msk-coral" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
