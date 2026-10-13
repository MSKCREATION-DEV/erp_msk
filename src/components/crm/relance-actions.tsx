"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, ExternalLink } from "lucide-react";
import { rescheduleTaskAction } from "@/actions/crm";
import { ActivityForm } from "@/components/crm/activity-form";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { usePendingAction } from "@/hooks/use-pending-action";
import { cn } from "@/lib/utils";

const RESCHEDULE_OPTIONS = [
  { days: 1, label: "+1 jour" },
  { days: 3, label: "+3 jours" },
  { days: 7, label: "+7 jours" },
] as const;

/**
 * Actions file Relances — Traiter (journal + clôture) · Reporter · Ouvrir fiche.
 */
export function RelanceActions({
  taskId,
  opportunityId,
  requireFollowUp,
  orgName,
  className,
}: {
  taskId: string;
  opportunityId: string | null;
  requireFollowUp: boolean;
  orgName?: string;
  className?: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [treatOpen, setTreatOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setRescheduleOpen(true);
        }}
      >
        <CalendarClock className="h-3.5 w-3.5" aria-hidden />
        Reporter
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
    </div>
  );
}
