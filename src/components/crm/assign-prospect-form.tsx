"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRoundPen } from "lucide-react";
import { reassignProspectAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field-label";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { usePendingAction } from "@/hooks/use-pending-action";

type OwnerOpt = { id: string; firstName: string; lastName: string };
type ProspectOpt = {
  id: string;
  label: string;
  ownerId: string;
  ownerLabel: string;
};

/**
 * Affectation proactive — Direction / Admin CRM (`crm.reassign`).
 * Peut cibler un prospect déjà choisi (fiche / ligne) ou en choisir un.
 */
export function AssignProspectForm({
  commercials,
  prospects,
  opportunityId: fixedOpportunityId,
  currentOwnerId,
  triggerLabel = "Affecter",
  triggerVariant = "secondary" as const,
  triggerSize = "sm" as const,
  iconOnly = false,
}: {
  commercials: OwnerOpt[];
  /** Requis si pas de opportunityId fixe. */
  prospects?: ProspectOpt[];
  opportunityId?: string;
  currentOwnerId?: string;
  triggerLabel?: string;
  triggerVariant?: "primary" | "secondary" | "ghost";
  triggerSize?: "sm" | "md" | "lg";
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [open, setOpen] = useState(false);
  const [oppId, setOppId] = useState<string | null>(fixedOpportunityId ?? null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (commercials.length === 0) return null;

  const selectedProspect = prospects?.find((p) => p.id === oppId);
  const effectiveCurrentOwner =
    currentOwnerId ?? selectedProspect?.ownerId ?? null;

  const commercialOptions = commercials.map((c) => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName}`,
    description:
      c.id === effectiveCurrentOwner ? "Suivi actuel" : undefined,
  }));

  const prospectOptions =
    prospects?.map((p) => ({
      value: p.id,
      label: p.label,
      description: `Suivi : ${p.ownerLabel}`,
    })) ?? [];

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const opportunityId = fixedOpportunityId ?? oppId;
    if (!opportunityId) {
      setError("Choisissez un prospect");
      return;
    }
    if (!ownerId) {
      setError("Choisissez le commercial qui suivra le dossier");
      return;
    }
    if (ownerId === effectiveCurrentOwner) {
      setError("Ce commercial suit déjà ce dossier");
      return;
    }
    const fd = new FormData();
    fd.set("opportunityId", opportunityId);
    fd.set("newOwnerId", ownerId);
    void run(async () => {
      const res = await reassignProspectAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec de l’affectation");
        return;
      }
      setOpen(false);
      setOwnerId(null);
      if (!fixedOpportunityId) setOppId(null);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        title={triggerLabel}
        aria-label={triggerLabel}
      >
        <UserRoundPen className="h-4 w-4" aria-hidden />
        {iconOnly ? null : triggerLabel}
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Affecter un prospect"
        description="Confie le suivi à un commercial. L’équipe reste en lecture ; seul l’affecté peut journaliser et modifier."
        size="md"
      >
        <form onSubmit={onSubmit} className="space-y-4 p-5">
          {!fixedOpportunityId ? (
            <OptionPickerSingle
              label="Prospect"
              required
              options={prospectOptions}
              value={oppId}
              onChange={setOppId}
              disabled={pending}
              placeholder="Choisir un dossier"
              modalTitle="Prospect à affecter"
            />
          ) : (
            <div>
              <FieldLabel>Prospect</FieldLabel>
              <p className="mt-1 text-sm font-medium text-msk-ink">
                {selectedProspect?.label ?? "Dossier courant"}
              </p>
              {(() => {
                const cur = commercials.find(
                  (c) => c.id === effectiveCurrentOwner,
                );
                return cur ? (
                  <FieldHint>
                    Suivi actuel : {cur.firstName} {cur.lastName}
                  </FieldHint>
                ) : null;
              })()}
            </div>
          )}

          <OptionPickerSingle
            label="Commercial (nouveau suivi)"
            required
            options={commercialOptions}
            value={ownerId}
            onChange={setOwnerId}
            disabled={pending}
            placeholder="Choisir le collaborateur"
            modalTitle="Affecter à"
          />

          <FieldError>{error}</FieldError>
          <div className="flex flex-wrap justify-end gap-2 border-t border-msk-ink/8 pt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Affectation…" : "Confirmer l’affectation"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
