"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRoundPen } from "lucide-react";
import { reassignProspectAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field-label";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { FormSteps } from "@/components/ui/form-steps";
import { usePendingAction } from "@/hooks/use-pending-action";

type OwnerOpt = { id: string; firstName: string; lastName: string };
type ProspectOpt = {
  id: string;
  label: string;
  ownerId: string;
  ownerLabel: string;
};

const STEPS_FULL = [
  { id: "prospect", label: "Prospect", hint: "Qui est concerné ?" },
  { id: "suivi", label: "Nouveau suivi", hint: "Qui prend le dossier ?" },
  { id: "confirm", label: "Confirmation", hint: "Vérifier puis valider" },
] as const;

const STEPS_FIXED = [
  { id: "suivi", label: "Nouveau suivi", hint: "Qui prend le dossier ?" },
  { id: "confirm", label: "Confirmation", hint: "Vérifier puis valider" },
] as const;

/**
 * Affectation proactive — Direction / Admin CRM (`crm.reassign`).
 * Parcours par étapes (prospect → suivi → confirmation).
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
  const [step, setStep] = useState(0);
  const [oppId, setOppId] = useState<string | null>(fixedOpportunityId ?? null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = fixedOpportunityId ? STEPS_FIXED : STEPS_FULL;
  const lastIndex = steps.length - 1;

  const selectedProspect = prospects?.find((p) => p.id === oppId);
  const effectiveCurrentOwner =
    currentOwnerId ?? selectedProspect?.ownerId ?? null;
  const selectedOwner = commercials.find((c) => c.id === ownerId);
  const currentOwner = commercials.find((c) => c.id === effectiveCurrentOwner);

  const prospectLabel =
    selectedProspect?.label ??
    (fixedOpportunityId ? "Prospect sélectionné" : "—");

  const summary = useMemo(
    () => ({
      prospect: prospectLabel,
      from: currentOwner
        ? `${currentOwner.firstName} ${currentOwner.lastName}`
        : (selectedProspect?.ownerLabel ?? "—"),
      to: selectedOwner
        ? `${selectedOwner.firstName} ${selectedOwner.lastName}`
        : "—",
    }),
    [prospectLabel, currentOwner, selectedOwner, selectedProspect],
  );

  if (commercials.length === 0) return null;

  const commercialOptions = commercials.map((c) => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName}`,
    description: c.id === effectiveCurrentOwner ? "Suivi actuel" : undefined,
  }));

  const prospectOptions =
    prospects?.map((p) => ({
      value: p.id,
      label: p.label,
      description: `Suivi actuel : ${p.ownerLabel}`,
    })) ?? [];

  function resetForm() {
    setStep(0);
    setOwnerId(null);
    setError(null);
    if (!fixedOpportunityId) setOppId(null);
  }

  function validateStep(index: number): string | null {
    const opportunityId = fixedOpportunityId ?? oppId;
    if (!fixedOpportunityId && index === 0 && !opportunityId) {
      return "Choisissez un prospect";
    }
    const suiviIndex = fixedOpportunityId ? 0 : 1;
    if (index === suiviIndex && !ownerId) {
      return "Choisissez le collaborateur qui suivra ce prospect";
    }
    if (index === suiviIndex && ownerId === effectiveCurrentOwner) {
      return "Ce collaborateur suit déjà ce prospect";
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, lastIndex));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function onConfirm() {
    setError(null);
    const opportunityId = fixedOpportunityId ?? oppId;
    if (!opportunityId || !ownerId) {
      setError("Informations incomplètes");
      return;
    }
    if (ownerId === effectiveCurrentOwner) {
      setError("Ce collaborateur suit déjà ce prospect");
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
      resetForm();
      router.refresh();
    });
  }

  const stepId = steps[step]?.id;

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          resetForm();
          if (fixedOpportunityId) setOppId(fixedOpportunityId);
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
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
        title="Affecter un prospect"
        description="Le suivi passe au collaborateur choisi. Les autres gardent la lecture."
        size="md"
      >
        <div className="space-y-4 p-5">
          <FormSteps
            steps={steps}
            currentIndex={step}
            onGoTo={(i) => {
              if (i < step) {
                setError(null);
                setStep(i);
              }
            }}
          />

          {stepId === "prospect" ? (
            <OptionPickerSingle
              label="Prospect"
              required
              options={prospectOptions}
              value={oppId}
              onChange={(id) => {
                setOppId(id);
                setOwnerId(null);
                setError(null);
              }}
              disabled={pending}
              placeholder="Choisir un prospect"
              modalTitle="Prospect à affecter"
            />
          ) : null}

          {stepId === "suivi" ? (
            <div className="space-y-4">
              {fixedOpportunityId || selectedProspect ? (
                <div>
                  <FieldLabel>Prospect</FieldLabel>
                  <p className="mt-1 text-sm font-medium text-msk-ink">
                    {prospectLabel}
                  </p>
                  {summary.from !== "—" ? (
                    <FieldHint>Suivi actuel : {summary.from}</FieldHint>
                  ) : null}
                </div>
              ) : null}
              <OptionPickerSingle
                label="Collaborateur (nouveau suivi)"
                required
                options={commercialOptions}
                value={ownerId}
                onChange={(id) => {
                  setOwnerId(id);
                  setError(null);
                }}
                disabled={pending}
                placeholder="Choisir le collaborateur"
                modalTitle="Affecter à"
              />
            </div>
          ) : null}

          {stepId === "confirm" ? (
            <div className="space-y-3 rounded-xl border border-msk-ink/8 bg-msk-chalk/40 p-4 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/40">
                Récapitulatif
              </p>
              <dl className="space-y-2">
                <div className="flex justify-between gap-3">
                  <dt className="text-msk-ink/55">Prospect</dt>
                  <dd className="font-medium text-msk-ink text-right">
                    {summary.prospect}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-msk-ink/55">Suivi actuel</dt>
                  <dd className="text-msk-ink text-right">{summary.from}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-msk-ink/55">Nouveau suivi</dt>
                  <dd className="font-semibold text-msk-blue text-right">
                    {summary.to}
                  </dd>
                </div>
              </dl>
              <p className="text-xs leading-relaxed text-msk-ink/50">
                Après confirmation, seul ce collaborateur pourra journaliser et
                modifier le dossier. L’équipe conserve l’accès en lecture.
              </p>
            </div>
          ) : null}

          <FieldError>{error}</FieldError>

          <div className="flex flex-wrap justify-between gap-2 border-t border-msk-ink/8 pt-4">
            <div>
              {step > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={goBack}
                >
                  Précédent
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                >
                  Annuler
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {step < lastIndex ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={goNext}
                >
                  Continuer
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={onConfirm}
                >
                  {pending ? "Affectation…" : "Confirmer l’affectation"}
                </Button>
              )}
            </div>
          </div>
          <p className="text-center text-[11px] text-msk-ink/35">
            Étape {step + 1} / {steps.length}
          </p>
        </div>
      </Modal>
    </>
  );
}
