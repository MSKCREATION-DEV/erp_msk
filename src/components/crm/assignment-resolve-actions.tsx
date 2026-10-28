"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { resolveAssignmentRequestAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, FieldLabel } from "@/components/ui/field-label";
import { Modal } from "@/components/ui/modal";
import { ActionMenu } from "@/components/ui/action-menu";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePendingAction } from "@/hooks/use-pending-action";
import { cn } from "@/lib/utils";

/**
 * Traiter une demande — CTA Approuver + ⋯ Refuser.
 * Confirmation avant mutation ; état local dès succès (pas de double traitement).
 */
export function AssignmentResolveActions({
  requestId,
  prospectLabel,
  className,
}: {
  requestId: string;
  prospectLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { pending, run } = usePendingAction();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"APPROVED" | "REJECTED" | null>(null);

  async function mutate(
    decision: "APPROVE" | "REJECT",
    resolveNote?: string,
  ) {
    const fd = new FormData();
    fd.set("requestId", requestId);
    fd.set("decision", decision);
    if (resolveNote?.trim()) fd.set("resolveNote", resolveNote.trim());
    const res = await resolveAssignmentRequestAction(fd);
    if (!res.ok) {
      throw new Error(res.error ?? "Échec");
    }
    setDone(decision === "APPROVE" ? "APPROVED" : "REJECTED");
    setRejectOpen(false);
    router.refresh();
  }

  function onApprove() {
    setError(null);
    void confirm({
      title: "Approuver cette demande ?",
      description: prospectLabel
        ? `Le suivi de « ${prospectLabel} » passera au demandeur.`
        : "Le suivi du prospect passera au demandeur.",
      confirmLabel: "Approuver",
      cancelLabel: "Fermer",
      tone: "primary",
      icon: "info",
      loadingLabel: "Approbation…",
      action: () => mutate("APPROVE"),
    }).then((ok) => {
      if (!ok) return;
    });
  }

  function onRejectConfirm() {
    setError(null);
    void run(async () => {
      try {
        await mutate("REJECT", note);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Échec");
      }
    });
  }

  if (done) {
    return (
      <p
        className={cn(
          "text-sm font-medium",
          done === "APPROVED" ? "text-msk-blue" : "text-msk-coral",
          className,
        )}
        role="status"
      >
        {done === "APPROVED" ? "Demande approuvée" : "Demande refusée"}
      </p>
    );
  }

  return (
    <div
      className={cn("flex flex-wrap items-center justify-end gap-2", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Button type="button" size="sm" disabled={pending} onClick={onApprove}>
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Approuver
      </Button>

      <ActionMenu
        label="Autres actions sur la demande"
        items={[
          {
            id: "reject",
            label: "Refuser",
            icon: <XCircle className="h-3.5 w-3.5" aria-hidden />,
            tone: "danger",
            disabled: pending,
            onSelect: () => {
              setError(null);
              setNote("");
              setRejectOpen(true);
            },
          },
        ]}
      />

      <FieldError>{error}</FieldError>

      <Modal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Refuser la demande"
        description={
          prospectLabel
            ? `Refuser la reprise de « ${prospectLabel} ».`
            : "Le demandeur sera notifié."
        }
        size="md"
      >
        <div className="space-y-4 p-5">
          <div>
            <FieldLabel htmlFor={`reject-note-${requestId}`}>
              Note (optionnel)
            </FieldLabel>
            <Input
              id={`reject-note-${requestId}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={pending}
              placeholder="Motif visible pour le demandeur…"
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
              onClick={() => setRejectOpen(false)}
            >
              Fermer
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={onRejectConfirm}
            >
              {pending ? "Refus…" : "Confirmer le refus"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
