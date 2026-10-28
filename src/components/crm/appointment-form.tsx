"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createAppointmentAction } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FieldLabel } from "@/components/ui/field-label";
import { FormShell } from "@/components/ui/form-shell";
import { FormSteps } from "@/components/ui/form-steps";
import {
  ProspectSelectTable,
  type ProspectSelectRow,
} from "@/components/crm/prospect-select-table";
import { usePendingAction } from "@/hooks/use-pending-action";

const STEPS_FULL = [
  { id: "prospect", label: "Prospect", hint: "Qui est concerné ?" },
  { id: "details", label: "Détails", hint: "Quand et où" },
  { id: "confirm", label: "Confirmation", hint: "Vérifier puis planifier" },
] as const;

const STEPS_FIXED = [
  { id: "details", label: "Détails", hint: "Quand et où" },
  { id: "confirm", label: "Confirmation", hint: "Vérifier puis planifier" },
] as const;

export function AppointmentForm({
  opportunityId: fixedOpportunityId,
  opportunityLabel,
  prospects = [],
  cancelHref = "/crm/rdv",
}: {
  opportunityId?: string;
  opportunityLabel?: string;
  /** Liste pour sélection (requis si pas d’opportunityId fixe). */
  prospects?: ProspectSelectRow[];
  cancelHref?: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const fixed = Boolean(fixedOpportunityId);
  const steps = fixed ? STEPS_FIXED : STEPS_FULL;
  const lastIndex = steps.length - 1;

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [oppId, setOppId] = useState<string | null>(fixedOpportunityId ?? null);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const selected = useMemo(() => {
    if (fixed && opportunityLabel) {
      return {
        id: fixedOpportunityId!,
        orgName: opportunityLabel,
        stageLabel: "",
        ownerLabel: "",
      } satisfies ProspectSelectRow;
    }
    return prospects.find((p) => p.id === oppId) ?? null;
  }, [fixed, fixedOpportunityId, opportunityLabel, prospects, oppId]);

  function validateStep(index: number): string | null {
    const prospectStep = fixed ? -1 : 0;
    const detailsStep = fixed ? 0 : 1;
    if (index === prospectStep && !oppId) {
      return "Choisissez un prospect dans le tableau";
    }
    if (index === detailsStep) {
      if (!title.trim()) return "Indiquez un intitulé";
      if (!startsAt) return "Indiquez la date et l’heure de début";
      if (endsAt && new Date(endsAt) < new Date(startsAt)) {
        return "La fin doit être après le début";
      }
    }
    return null;
  }

  function goTo(index: number) {
    if (index < step) {
      setError(null);
      setStep(index);
      return;
    }
    for (let i = step; i < index; i++) {
      const err = validateStep(i);
      if (err) {
        setError(err);
        return;
      }
    }
    setError(null);
    setStep(index);
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (step < lastIndex) setStep(step + 1);
  }

  function submit() {
    const err = validateStep(fixed ? 0 : 1);
    if (err) {
      setError(err);
      setStep(fixed ? 0 : 1);
      return;
    }
    if (!oppId) {
      setError("Choisissez un prospect");
      setStep(0);
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("opportunityId", oppId);
    fd.set("title", title.trim());
    fd.set("startsAt", startsAt);
    if (endsAt) fd.set("endsAt", endsAt);
    if (location.trim()) fd.set("location", location.trim());
    if (notes.trim()) fd.set("notes", notes.trim());
    void run(async () => {
      const res = await createAppointmentAction(fd);
      if (res && !res.ok) {
        setError(res.error ?? "Échec");
      }
    });
  }

  const formatWhen = (raw: string) => {
    if (!raw) return "—";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const showProspectStep = !fixed && step === 0;
  const showDetailsStep = fixed ? step === 0 : step === 1;
  const showConfirmStep = step === lastIndex;

  return (
    <FormShell
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              if (step === 0) router.push(cancelHref);
              else {
                setError(null);
                setStep(step - 1);
              }
            }}
          >
            {step === 0 ? "Annuler" : "Retour"}
          </Button>
          <div className="flex flex-wrap gap-2">
            {step < lastIndex ? (
              <Button
                type="button"
                disabled={pending}
                onClick={next}
              >
                Continuer
              </Button>
            ) : (
              <Button
                type="button"
                disabled={pending}
                aria-busy={pending || undefined}
                onClick={submit}
              >
                {pending ? "Planification…" : "Planifier le RDV"}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6" aria-busy={pending || undefined}>
        <FormSteps
          steps={steps}
          currentIndex={step}
          onGoTo={goTo}
        />

        {showProspectStep ? (
          <section aria-labelledby="rdv-step-prospect" className="space-y-3">
            <div>
              <h2
                id="rdv-step-prospect"
                className="text-lg font-semibold text-msk-ink"
              >
                Choisir le prospect
              </h2>
              <p className="mt-1 text-sm text-msk-ink/50">
                Recherchez puis sélectionnez la ligne — pas besoin d’identifiant
                technique.
              </p>
            </div>
            <ProspectSelectTable
              rows={prospects}
              value={oppId}
              onChange={(id) => {
                setOppId(id);
                setError(null);
              }}
              disabled={pending}
              required
              emptyMessage="Aucun prospect sur lequel vous pouvez planifier un RDV."
            />
          </section>
        ) : null}

        {showDetailsStep ? (
          <section aria-labelledby="rdv-step-details" className="space-y-4">
            <div>
              <h2
                id="rdv-step-details"
                className="text-lg font-semibold text-msk-ink"
              >
                Détails du rendez-vous
              </h2>
              <p className="mt-1 text-sm text-msk-ink/50">
                Prospect :{" "}
                <span className="font-medium text-msk-ink">
                  {selected?.orgName ?? "—"}
                </span>
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <FieldLabel htmlFor="title" required>
                  Intitulé
                </FieldLabel>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={pending}
                  placeholder="Ex. Démo pack réseaux sociaux"
                />
              </div>
              <div>
                <FieldLabel htmlFor="startsAt" required>
                  Début
                </FieldLabel>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div>
                <FieldLabel htmlFor="endsAt">Fin</FieldLabel>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div>
                <FieldLabel htmlFor="location">Lieu / visio</FieldLabel>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={pending}
                  placeholder="Ex. Bureau MSK / Google Meet"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <FieldLabel htmlFor="notes">Notes</FieldLabel>
                <Textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={pending}
                  placeholder="Objectif du RDV, participants…"
                />
              </div>
            </div>
          </section>
        ) : null}

        {showConfirmStep ? (
          <section aria-labelledby="rdv-step-confirm" className="space-y-4">
            <div>
              <h2
                id="rdv-step-confirm"
                className="text-lg font-semibold text-msk-ink"
              >
                Confirmer le RDV
              </h2>
              <p className="mt-1 text-sm text-msk-ink/50">
                Vérifiez les informations avant de planifier.
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl bg-msk-chalk/60 px-4 py-3 sm:col-span-2 lg:col-span-3">
                <dt className="text-xs font-semibold tracking-caps uppercase text-msk-ink/40">
                  Prospect
                </dt>
                <dd className="mt-1 text-sm font-medium text-msk-ink">
                  {selected?.orgName ?? "—"}
                </dd>
              </div>
              <div className="rounded-xl bg-msk-chalk/60 px-4 py-3 sm:col-span-2 lg:col-span-3">
                <dt className="text-xs font-semibold tracking-caps uppercase text-msk-ink/40">
                  Intitulé
                </dt>
                <dd className="mt-1 text-sm font-medium text-msk-ink">
                  {title.trim() || "—"}
                </dd>
              </div>
              <div className="rounded-xl bg-msk-chalk/60 px-4 py-3">
                <dt className="text-xs font-semibold tracking-caps uppercase text-msk-ink/40">
                  Début
                </dt>
                <dd className="mt-1 text-sm tabular-nums text-msk-ink">
                  {formatWhen(startsAt)}
                </dd>
              </div>
              <div className="rounded-xl bg-msk-chalk/60 px-4 py-3">
                <dt className="text-xs font-semibold tracking-caps uppercase text-msk-ink/40">
                  Fin
                </dt>
                <dd className="mt-1 text-sm tabular-nums text-msk-ink">
                  {endsAt ? formatWhen(endsAt) : "—"}
                </dd>
              </div>
              <div className="rounded-xl bg-msk-chalk/60 px-4 py-3">
                <dt className="text-xs font-semibold tracking-caps uppercase text-msk-ink/40">
                  Lieu / visio
                </dt>
                <dd className="mt-1 text-sm text-msk-ink">
                  {location.trim() || "—"}
                </dd>
              </div>
              {notes.trim() ? (
                <div className="rounded-xl bg-msk-chalk/60 px-4 py-3 sm:col-span-2 lg:col-span-3">
                  <dt className="text-xs font-semibold tracking-caps uppercase text-msk-ink/40">
                    Notes
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-msk-ink/80">
                    {notes.trim()}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        <FieldError>{error}</FieldError>
      </div>
    </FormShell>
  );
}
