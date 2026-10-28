"use client";

import { useState } from "react";
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
import { ActionMenu } from "@/components/ui/action-menu";
import { usePendingAction } from "@/hooks/use-pending-action";
import { cn } from "@/lib/utils";

export function AppointmentActions({
  appointmentId,
  opportunityId,
  className,
  showFicheLink = true,
}: {
  appointmentId: string;
  opportunityId: string;
  className?: string;
  showFicheLink?: boolean;
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
      className={cn("flex flex-nowrap items-center justify-end gap-2", className)}
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

      <ActionMenu
        label="Autres actions sur le RDV"
        items={[
          {
            id: "no-show",
            label: "Marquer absent",
            icon: <UserX className="h-3.5 w-3.5" aria-hidden />,
            disabled: pending,
            onSelect: () => {
              setMode("NO_SHOW");
              setError(null);
            },
          },
          {
            id: "cancel",
            label: "Annuler le RDV",
            icon: <XCircle className="h-3.5 w-3.5" aria-hidden />,
            tone: "danger",
            disabled: pending,
            onSelect: () => {
              setMode("CANCELLED");
              setError(null);
            },
          },
          ...(showFicheLink
            ? [
                {
                  id: "fiche",
                  label: "Ouvrir la fiche",
                  icon: <ExternalLink className="h-3.5 w-3.5" aria-hidden />,
                  disabled: pending,
                  onSelect: () => {
                    router.push(`/crm/prospects/${opportunityId}`);
                  },
                },
              ]
            : []),
        ]}
      />

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
