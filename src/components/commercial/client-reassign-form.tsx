"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRoundPen } from "lucide-react";
import { reassignClientOwnerAction } from "@/actions/commercial";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field-label";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { FormSteps } from "@/components/ui/form-steps";
import { usePendingAction } from "@/hooks/use-pending-action";

type AssignOption = { value: string; label: string };

const STEPS = [
  { id: "suivi", label: "Nouveau suivi", hint: "Qui prend le dossier ?" },
  { id: "confirm", label: "Confirmation", hint: "Vérifier puis valider" },
] as const;

/**
 * Attribution du suivi client — modal + picker collaborateur (pattern
 * `AssignProspectForm`), au lieu d'un `<select>` natif. Historique
 * `ComClientEvent` + `writeAudit` inchangés côté serveur
 * (`reassignClientOwnerAction`).
 */
export function ClientReassignForm({
  clientId,
  currentOwnerId,
  assignOptions,
}: {
  clientId: string;
  currentOwnerId: string;
  assignOptions: AssignOption[];
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choices = assignOptions.filter((o) => o.value !== currentOwnerId);
  const currentLabel =
    assignOptions.find((o) => o.value === currentOwnerId)?.label ?? null;

  const selectedLabel = useMemo(
    () => choices.find((o) => o.value === ownerId)?.label ?? "—",
    [choices, ownerId],
  );

  if (choices.length === 0) {
    return (
      <p className="text-sm text-msk-ink/45">
        Aucun autre collaborateur opérationnel disponible pour le suivi.
      </p>
    );
  }

  const lastIndex = STEPS.length - 1;

  function resetForm() {
    setStep(0);
    setOwnerId(null);
    setError(null);
  }

  function goNext() {
    if (!ownerId) {
      setError("Choisissez le collaborateur qui prendra le suivi");
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
    if (!ownerId) {
      setError("Informations incomplètes");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("clientId", clientId);
    fd.set("ownerId", ownerId);
    void run(async () => {
      const res = await reassignClientOwnerAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec de l’attribution");
        return;
      }
      setOpen(false);
      resetForm();
      router.refresh();
    });
  }

  const stepId = STEPS[step]?.id;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
      >
        <UserRoundPen className="h-3.5 w-3.5" aria-hidden />
        Nouveau suivi
      </Button>

      <Modal
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
        title="Attribuer le suivi"
        description="Le suivi de ce client passe au collaborateur choisi."
        size="md"
      >
        <div className="space-y-4 p-5">
          <FormSteps
            steps={STEPS}
            currentIndex={step}
            onGoTo={(i) => {
              if (i < step) {
                setError(null);
                setStep(i);
              }
            }}
          />

          {stepId === "suivi" ? (
            <div className="space-y-4">
              {currentLabel ? (
                <div>
                  <FieldLabel>Suivi actuel</FieldLabel>
                  <p className="mt-1 text-sm font-medium text-msk-ink">
                    {currentLabel}
                  </p>
                </div>
              ) : null}
              <OptionPickerSingle
                label="Collaborateur (nouveau suivi)"
                required
                options={choices}
                value={ownerId}
                onChange={(id) => {
                  setOwnerId(id);
                  setError(null);
                }}
                disabled={pending}
                placeholder="Choisir le collaborateur"
                modalTitle="Attribuer à"
              />
              <FieldHint>
                Le changement est enregistré dans l’historique de la fiche et
                l’audit sécurité.
              </FieldHint>
            </div>
          ) : null}

          {stepId === "confirm" ? (
            <div className="space-y-3 rounded-xl border border-msk-ink/8 bg-msk-chalk/40 p-4 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/40">
                Récapitulatif
              </p>
              <dl className="space-y-2">
                <div className="flex justify-between gap-3">
                  <dt className="text-msk-ink/55">Suivi actuel</dt>
                  <dd className="text-msk-ink text-right">
                    {currentLabel ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-msk-ink/55">Nouveau suivi</dt>
                  <dd className="font-semibold text-msk-blue text-right">
                    {selectedLabel}
                  </dd>
                </div>
              </dl>
              <p className="text-xs leading-relaxed text-msk-ink/50">
                Après confirmation, l’historique de la fiche et l’audit
                sécurité enregistrent ce changement de suivi.
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
                <Button type="button" size="sm" disabled={pending} onClick={goNext}>
                  Continuer
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={onConfirm}
                >
                  {pending ? "Attribution…" : "Attribuer le suivi"}
                </Button>
              )}
            </div>
          </div>
          <p className="text-center text-[11px] text-msk-ink/35">
            Étape {step + 1} / {STEPS.length}
          </p>
        </div>
      </Modal>
    </>
  );
}
