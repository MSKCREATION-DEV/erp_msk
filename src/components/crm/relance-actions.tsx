"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Pencil,
  XCircle,
} from "lucide-react";
import {
  cancelTaskAction,
  rescheduleTaskAction,
  updateOpenTaskAction,
} from "@/actions/crm";
import { ActivityForm } from "@/components/crm/activity-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldHint, FieldLabel } from "@/components/ui/field-label";
import { Modal } from "@/components/ui/modal";
import { usePendingAction } from "@/hooks/use-pending-action";
import { cn } from "@/lib/utils";

const RESCHEDULE_OPTIONS = [
  { days: 1, label: "+1 jour" },
  { days: 3, label: "+3 jours" },
  { days: 7, label: "+7 jours" },
] as const;

function toDateInputValue(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Actions file Relances — Traiter · Modifier · Reporter · Annuler · Fiche.
 */
export function RelanceActions({
  taskId,
  opportunityId,
  requireFollowUp,
  orgName,
  title: initialTitle = "",
  dueAt,
  className,
}: {
  taskId: string;
  opportunityId: string | null;
  requireFollowUp: boolean;
  orgName?: string;
  title?: string;
  dueAt?: Date | string;
  className?: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [treatOpen, setTreatOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState(initialTitle);
  const [editDue, setEditDue] = useState(
    dueAt ? toDateInputValue(dueAt) : "",
  );
  const [cancelReason, setCancelReason] = useState("");

  function postpone(days: 1 | 3 | 7) {
    setError(null);
    const fd = new FormData();
    fd.set("taskId", taskId);
    fd.set("days", String(days));
    void run(async () => {
      const res = await rescheduleTaskAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec du report");
        return;
      }
      setRescheduleOpen(false);
      router.refresh();
    });
  }

  function saveEdit() {
    setError(null);
    const fd = new FormData();
    fd.set("taskId", taskId);
    fd.set("title", editTitle.trim());
    fd.set("dueAt", editDue);
    void run(async () => {
      const res = await updateOpenTaskAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec de la modification");
        return;
      }
      setEditOpen(false);
      router.refresh();
    });
  }

  function confirmCancel() {
    setError(null);
    const fd = new FormData();
    fd.set("taskId", taskId);
    fd.set("reason", cancelReason.trim());
    void run(async () => {
      const res = await cancelTaskAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec de l’annulation");
        return;
      }
      setCancelOpen(false);
      setCancelReason("");
      router.refresh();
    });
  }

  return (
    <div
      className={cn("flex flex-wrap items-center justify-end gap-1.5", className)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {opportunityId ? (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => setTreatOpen(true)}
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          Traiter
        </Button>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setError(null);
          setEditTitle(initialTitle);
          setEditDue(dueAt ? toDateInputValue(dueAt) : "");
          setEditOpen(true);
        }}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only sm:not-sr-only">Modifier</span>
      </Button>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setError(null);
          setRescheduleOpen(true);
        }}
      >
        <CalendarClock className="h-3.5 w-3.5" aria-hidden />
        Reporter
      </Button>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setError(null);
          setCancelReason("");
          setCancelOpen(true);
        }}
      >
        <XCircle className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only sm:not-sr-only">Annuler</span>
      </Button>

      {opportunityId ? (
        <Link
          prefetch={false}
          href={`/crm/prospects/${opportunityId}`}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-msk-blue hover:bg-msk-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40"
          title="Ouvrir la fiche"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only sm:not-sr-only">Fiche</span>
        </Link>
      ) : null}

      {opportunityId ? (
        <Modal
          open={treatOpen}
          onOpenChange={setTreatOpen}
          title="Traiter la relance"
          description={
            orgName
              ? `${orgName} — journalisez l’échange et planifiez la suite.`
              : "Journalisez l’échange et planifiez la prochaine relance."
          }
          size="md"
        >
          <div className="p-5">
            <ActivityForm
              opportunityId={opportunityId}
              completeTaskId={taskId}
              requireFollowUp={requireFollowUp}
              onSuccess={() => setTreatOpen(false)}
            />
          </div>
        </Modal>
      ) : null}

      <Modal
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Modifier la relance"
        description="Corrigez l’intitulé ou la date si une erreur de saisie."
        size="md"
      >
        <div className="space-y-4 p-5">
          <div>
            <FieldLabel htmlFor={`relance-title-${taskId}`} required>
              Intitulé
            </FieldLabel>
            <Input
              id={`relance-title-${taskId}`}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              disabled={pending}
              placeholder="Ex. Rappeler pour devis"
            />
          </div>
          <div>
            <FieldLabel htmlFor={`relance-due-${taskId}`} required>
              Échéance
            </FieldLabel>
            <Input
              id={`relance-due-${taskId}`}
              type="date"
              value={editDue}
              onChange={(e) => setEditDue(e.target.value)}
              disabled={pending}
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
              onClick={() => setEditOpen(false)}
            >
              Fermer
            </Button>
            <Button
              type="button"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={saveEdit}
            >
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        title="Reporter la relance"
        description="Décale l’échéance sans journaliser. Pour clôturer après un vrai échange, utilisez Traiter."
        size="md"
      >
        <div className="space-y-4 p-5">
          <div className="grid gap-2 sm:grid-cols-3">
            {RESCHEDULE_OPTIONS.map((opt) => (
              <Button
                key={opt.days}
                type="button"
                variant="secondary"
                disabled={pending}
                aria-busy={pending || undefined}
                onClick={() => postpone(opt.days)}
              >
                {pending ? "…" : opt.label}
              </Button>
            ))}
          </div>
          {error ? (
            <p className="text-sm text-msk-coral" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Annuler la relance"
        description="La relance sera retirée de la file. Le motif reste visible sur la fiche prospect."
        size="md"
      >
        <div className="space-y-4 p-5">
          <div>
            <FieldLabel htmlFor={`relance-cancel-${taskId}`} required>
              Motif
            </FieldLabel>
            <Textarea
              id={`relance-cancel-${taskId}`}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              disabled={pending}
              rows={3}
              placeholder="Ex. Erreur de saisie — mauvaise date"
            />
            <FieldHint>Min. 5 caractères — journalisé sur la fiche.</FieldHint>
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
              onClick={() => setCancelOpen(false)}
            >
              Fermer
            </Button>
            <Button
              type="button"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={confirmCancel}
            >
              {pending ? "Annulation…" : "Confirmer l’annulation"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
