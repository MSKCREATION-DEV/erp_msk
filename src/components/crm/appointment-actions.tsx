"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  UserX,
  XCircle,
} from "lucide-react";
import { setAppointmentStatusAction } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/components/ui/field-label";
import { usePendingAction } from "@/hooks/use-pending-action";
import { cn } from "@/lib/utils";

export function AppointmentActions({
  appointmentId,
  opportunityId,
  className,
}: {
  appointmentId: string;
  opportunityId: string;
  className?: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [mode, setMode] = useState<"DONE" | "NO_SHOW" | "CANCELLED" | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!mode) return;
    setError(null);
    const fd = new FormData();
    fd.set("appointmentId", appointmentId);
    fd.set("status", mode);
    if (note.trim()) fd.set("note", note.trim());
    void run(async () => {
      const res = await setAppointmentStatusAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setMode(null);
      setNote("");
      router.refresh();
    });
  }

  return (
    <div
      className={cn("flex flex-wrap justify-end gap-1.5", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          setMode("DONE");
          setError(null);
        }}
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Tenu
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setMode("NO_SHOW");
          setError(null);
        }}
      >
        <UserX className="h-3.5 w-3.5" aria-hidden />
        Absent
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setMode("CANCELLED");
          setError(null);
        }}
      >
        <XCircle className="h-3.5 w-3.5" aria-hidden />
        Annuler
      </Button>
      <Link
        prefetch={false}
        href={`/crm/prospects/${opportunityId}`}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-msk-blue hover:bg-msk-blue/5"
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only sm:not-sr-only">Fiche</span>
      </Link>

      <Modal
        open={mode != null}
        onOpenChange={(o) => {
          if (!o) setMode(null);
        }}
        title={
          mode === "DONE"
            ? "Marquer le RDV comme tenu"
            : mode === "NO_SHOW"
              ? "Marquer comme absent"
              : "Annuler le RDV"
        }
        size="md"
      >
        <div className="space-y-4 p-5">
          <div>
            <FieldLabel htmlFor={`appt-note-${appointmentId}`}>
              Note (optionnel)
            </FieldLabel>
            <Textarea
              id={`appt-note-${appointmentId}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={pending}
              rows={3}
              placeholder="Compte rendu court…"
            />
          </div>
          {error ? (
            <p className="text-sm text-msk-coral" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setMode(null)}
            >
              Fermer
            </Button>
            <Button
              type="button"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={confirm}
            >
              {pending ? "…" : "Confirmer"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
