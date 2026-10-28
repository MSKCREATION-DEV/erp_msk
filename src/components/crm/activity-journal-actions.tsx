"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CrmActivityType } from "@prisma/client";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import {
  deleteActivityAction,
  updateActivityAction,
} from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field-label";
import { Modal } from "@/components/ui/modal";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { usePendingAction } from "@/hooks/use-pending-action";
import { ACTIVITY_LABELS } from "@/lib/crm/labels";
import { OUTREACH_ACTIVITY_TYPES } from "@/lib/crm/follow-up-count";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = [...OUTREACH_ACTIVITY_TYPES, "NOTE" as const].map(
  (t) => ({
    value: t,
    label: ACTIVITY_LABELS[t],
  }),
);

function toDateTimeLocal(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Actions sur une relance déjà journalisée — menu ⋯ + lien fiche.
 */
export function ActivityJournalActions({
  activityId,
  opportunityId,
  type: initialType,
  summary: initialSummary,
  occurredAt,
  className,
  /** Masquer « Fiche » (déjà sur la fiche prospect). */
  showFicheLink = true,
}: {
  activityId: string;
  opportunityId: string | null;
  type: CrmActivityType;
  summary: string;
  occurredAt: Date | string;
  className?: string;
  showFicheLink?: boolean;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<CrmActivityType>(initialType);
  const [summary, setSummary] = useState(initialSummary);
  const [occurred, setOccurred] = useState(toDateTimeLocal(occurredAt));

  function saveEdit() {
    setError(null);
    const fd = new FormData();
    fd.set("activityId", activityId);
    fd.set("type", type);
    fd.set("summary", summary.trim());
    fd.set("occurredAt", occurred);
    void run(async () => {
      const res = await updateActivityAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setEditOpen(false);
      router.refresh();
    });
  }

  function confirmDelete() {
    setError(null);
    const fd = new FormData();
    fd.set("activityId", activityId);
    void run(async () => {
      const res = await deleteActivityAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setDeleteOpen(false);
      router.refresh();
    });
  }

  const menuItems = useMemo((): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [
      {
        id: "edit",
        label: "Modifier",
        icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
        disabled: pending,
        onSelect: () => {
          setError(null);
          setType(initialType);
          setSummary(initialSummary);
          setOccurred(toDateTimeLocal(occurredAt));
          setEditOpen(true);
        },
      },
      {
        id: "delete",
        label: "Supprimer",
        icon: <Trash2 className="h-3.5 w-3.5" aria-hidden />,
        tone: "danger",
        disabled: pending,
        onSelect: () => {
          setError(null);
          setDeleteOpen(true);
        },
      },
    ];
    if (opportunityId && showFicheLink) {
      items.push({
        id: "fiche",
        label: "Ouvrir la fiche",
        icon: <ExternalLink className="h-3.5 w-3.5" aria-hidden />,
        disabled: pending,
        onSelect: () => {
          router.push(`/crm/prospects/${opportunityId}`);
        },
      });
    }
    return items;
  }, [
    pending,
    initialType,
    initialSummary,
    occurredAt,
    opportunityId,
    showFicheLink,
    router,
  ]);

  return (
    <div
      className={cn("inline-flex justify-end", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <ActionMenu label="Actions sur l’activité" items={menuItems} />

      <Modal
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Modifier l’activité"
        description="Corrigez une erreur de saisie sur le journal."
        size="md"
      >
        <div className="space-y-4 p-5">
          <OptionPickerSingle
            label="Canal"
            required
            options={TYPE_OPTIONS}
            value={type}
            onChange={(v) => setType((v as CrmActivityType) ?? "APPEL")}
            disabled={pending}
            modalTitle="Canal"
          />
          <div>
            <FieldLabel htmlFor={`act-sum-${activityId}`} required>
              Résumé
            </FieldLabel>
            <Input
              id={`act-sum-${activityId}`}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={pending}
              placeholder="Ex. Appel — intéressé par le devis"
            />
          </div>
          <div>
            <FieldLabel htmlFor={`act-at-${activityId}`} required>
              Date et heure
            </FieldLabel>
            <Input
              id={`act-at-${activityId}`}
              type="datetime-local"
              value={occurred}
              onChange={(e) => setOccurred(e.target.value)}
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
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer l’activité"
        description="Suppression définitive — utile uniquement pour une erreur de saisie."
        size="md"
      >
        <div className="space-y-4 p-5">
          <p className="text-sm text-msk-ink/70">
            « {initialSummary.trim() || "Sans résumé"} »
          </p>
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
              onClick={() => setDeleteOpen(false)}
            >
              Fermer
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={confirmDelete}
            >
              {pending ? "Suppression…" : "Confirmer la suppression"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
