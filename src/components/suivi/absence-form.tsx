"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  createSvAbsence,
  updateSvAbsence,
  type SvHrActionState,
} from "@/actions/suivi/hr";
import { FormShell } from "@/components/ui/form-shell";
import { FormSteps } from "@/components/ui/form-steps";
import { FieldLabel } from "@/components/ui/field-label";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import type { OptionPickerItem } from "@/components/ui/option-picker-modal";
import {
  SV_ABSENCE_REASON_LABEL,
  SV_ABSENCE_REASON_OPTIONS,
  SV_ABSENCE_STATUS_LABEL,
} from "@/lib/suivi/labels";
import {
  assertJustifiedRequiresGed,
  SV_ABSENCE_JUSTIFIED_REQUIRES_GED,
} from "@/lib/suivi/hr";
import type { SvAbsenceReason, SvAbsenceStatus } from "@/generated/prisma/client";
import { useActionStateToast } from "@/hooks/use-action-state-toast";

type Initial = {
  employeeId?: string;
  reason?: SvAbsenceReason;
  reasonNote?: string | null;
  startDate?: string;
  endDate?: string;
  deductLeave?: boolean;
  deductLeaveNote?: string | null;
  status?: SvAbsenceStatus;
  hasGed?: boolean;
};

const CREATE_STEPS = [
  { id: "collab", label: "Collaborateur" },
  { id: "details", label: "Absence" },
  { id: "recap", label: "Confirmation" },
] as const;

const EDIT_STEPS = [
  { id: "details", label: "Absence" },
  { id: "justif", label: "Justificatif" },
  { id: "recap", label: "Confirmation" },
] as const;

export function SvAbsenceForm({
  mode,
  absenceId,
  employeeOptions,
  initial,
}: {
  mode: "create" | "edit";
  absenceId?: string;
  employeeOptions: OptionPickerItem[];
  initial?: Initial;
}) {
  const action =
    mode === "create"
      ? createSvAbsence
      : updateSvAbsence.bind(null, absenceId!);

  const [state, formAction, pending] = useActionState<
    SvHrActionState,
    FormData
  >(action, null);
  useActionStateToast(state);

  const steps = mode === "create" ? CREATE_STEPS : EDIT_STEPS;
  const [step, setStep] = useState(0);
  const [employeeId, setEmployeeId] = useState<string | null>(
    initial?.employeeId ?? null,
  );
  const [reason, setReason] = useState<SvAbsenceReason>(
    initial?.reason ?? "MALADIE",
  );
  const [reasonNote, setReasonNote] = useState(initial?.reasonNote ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [deductLeave, setDeductLeave] = useState(
    initial?.deductLeave ? "1" : "0",
  );
  const [deductLeaveNote, setDeductLeaveNote] = useState(
    initial?.deductLeaveNote ?? "",
  );
  const [status, setStatus] = useState<SvAbsenceStatus>(
    initial?.status ?? "ENREGISTREE",
  );
  const [fileSelected, setFileSelected] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const hasGed = Boolean(initial?.hasGed);
  const hasJustificatif = hasGed || fileSelected;

  const employeeLabel =
    employeeOptions.find((o) => o.value === employeeId)?.label ?? "—";

  function onStatusChange(next: SvAbsenceStatus) {
    if (next === "JUSTIFIEE" && !hasJustificatif) {
      setStepError(SV_ABSENCE_JUSTIFIED_REQUIRES_GED);
      return;
    }
    setStatus(next);
    setStepError(null);
  }

  function validateStep(index: number): boolean {
    const stepId = steps[index]?.id;
    if (stepId === "collab") {
      if (!employeeId) {
        setStepError("Choisissez un collaborateur.");
        return false;
      }
    }
    if (stepId === "details") {
      if (mode === "edit" && !employeeId) {
        setStepError("Choisissez un collaborateur.");
        return false;
      }
      if (!startDate || !endDate) {
        setStepError("Indiquez les dates de début et de fin.");
        return false;
      }
      if (endDate < startDate) {
        setStepError("La fin doit être après ou égale au début.");
        return false;
      }
      if (deductLeave === "1" && !deductLeaveNote.trim()) {
        setStepError(
          "Note obligatoire si vous cochez « déduire des congés ».",
        );
        return false;
      }
      // Statut Justifiée sans doc : validé à l’étape justificatif / récap.
    }
    if (stepId === "justif") {
      const err = assertJustifiedRequiresGed(status, hasJustificatif);
      if (err) {
        setStepError(err);
        return false;
      }
    }
    if (stepId === "recap" && mode === "edit") {
      const err = assertJustifiedRequiresGed(status, hasJustificatif);
      if (err) {
        setStepError(err);
        return false;
      }
    }
    setStepError(null);
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function submitForm() {
    if (step < steps.length - 1) return;
    if (mode === "edit") {
      const err = assertJustifiedRequiresGed(status, hasJustificatif);
      if (err) {
        setStepError(err);
        return;
      }
    }
    const form = formRef.current;
    if (!form) return;
    formAction(new FormData(form));
  }

  /** Bloque tout submit natif (Enter / type-flip Continuer→submit). */
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      encType="multipart/form-data"
      onSubmit={onSubmit}
    >
      <input type="hidden" name="employeeId" value={employeeId ?? ""} />
      <input type="hidden" name="reason" value={reason} />
      <input type="hidden" name="reasonNote" value={reasonNote} />
      <input type="hidden" name="startDate" value={startDate} />
      <input type="hidden" name="endDate" value={endDate} />
      <input type="hidden" name="deductLeave" value={deductLeave} />
      <input type="hidden" name="deductLeaveNote" value={deductLeaveNote} />
      {mode === "edit" ? (
        <input type="hidden" name="status" value={status} />
      ) : null}

      <FormShell
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => setStep((s) => s - 1)}
                >
                  Retour
                </Button>
              ) : (
                <Link
                  href="/suivi/absences"
                  className="inline-flex h-10 items-center rounded-lg border border-msk-ink/10 bg-white px-4 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
                >
                  Annuler
                </Link>
              )}
            </div>
            <div className="flex gap-2">
              {step < steps.length - 1 ? (
                <Button
                  key="step-next"
                  type="button"
                  disabled={pending}
                  onClick={goNext}
                >
                  Continuer
                </Button>
              ) : (
                <Button
                  key="step-submit"
                  type="button"
                  disabled={pending}
                  onClick={submitForm}
                >
                  {pending
                    ? "Enregistrement…"
                    : mode === "create"
                      ? "Enregistrer l’absence"
                      : "Enregistrer les modifications"}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <FormSteps
          steps={[...steps]}
          currentIndex={step}
          onGoTo={(i) => {
            if (i < step) {
              setStepError(null);
              setStep(i);
            }
          }}
        />

        {stepError ? (
          <p className="mt-4 text-sm text-msk-coral" role="alert">
            {stepError}
          </p>
        ) : null}
        {state && !state.ok ? (
          <p className="mt-4 text-sm text-msk-coral" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="mt-6 space-y-5">
          {steps[step]?.id === "collab" ? (
            <OptionPickerSingle
              label="Collaborateur"
              required
              options={employeeOptions}
              value={employeeId}
              onChange={(id) => {
                setEmployeeId(id);
                setStepError(null);
              }}
              disabled={pending}
              placeholder="Choisir un collaborateur"
              modalTitle="Collaborateur concerné"
            />
          ) : null}

          {steps[step]?.id === "details" ? (
            <div className="space-y-5">
              {mode === "edit" ? (
                <OptionPickerSingle
                  label="Collaborateur"
                  required
                  options={employeeOptions}
                  value={employeeId}
                  onChange={setEmployeeId}
                  disabled={pending}
                  placeholder="Choisir un collaborateur"
                  modalTitle="Collaborateur concerné"
                />
              ) : null}

              <div>
                <FieldLabel required>Motif</FieldLabel>
                <ChoiceCards
                  name="reason_ui"
                  columns={3}
                  value={reason}
                  onChange={setReason}
                  disabled={pending}
                  options={SV_ABSENCE_REASON_OPTIONS}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="startDate" required>
                    Début
                  </FieldLabel>
                  <input
                    id="startDate"
                    type="date"
                    className="mt-1.5 w-full rounded-lg border border-msk-ink/10 bg-white px-3 py-2 text-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={pending}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="endDate" required>
                    Fin
                  </FieldLabel>
                  <input
                    id="endDate"
                    type="date"
                    className="mt-1.5 w-full rounded-lg border border-msk-ink/10 bg-white px-3 py-2 text-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={pending}
                  />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="reasonNote">Précision</FieldLabel>
                <textarea
                  id="reasonNote"
                  rows={3}
                  className="mt-1.5 w-full rounded-lg border border-msk-ink/10 bg-white px-3 py-2 text-sm"
                  placeholder="Ex. arrêt médical, rendez-vous…"
                  value={reasonNote}
                  onChange={(e) => setReasonNote(e.target.value)}
                  disabled={pending}
                />
              </div>

              <div>
                <FieldLabel>Déduire des congés ?</FieldLabel>
                <p className="mt-1 text-xs text-msk-ink/50">
                  Trace uniquement dans Suivi — ne modifie pas le solde congés
                  RH.
                </p>
                <div className="mt-2">
                  <ChoiceCards
                    name="deduct_ui"
                    columns={2}
                    value={deductLeave}
                    onChange={setDeductLeave}
                    disabled={pending}
                    options={[
                      { value: "0", label: "Non" },
                      { value: "1", label: "Oui — à tracer" },
                    ]}
                  />
                </div>
                {deductLeave === "1" ? (
                  <div className="mt-3">
                    <FieldLabel htmlFor="deductLeaveNote" required>
                      Note congés
                    </FieldLabel>
                    <textarea
                      id="deductLeaveNote"
                      rows={2}
                      className="mt-1.5 w-full rounded-lg border border-msk-ink/10 bg-white px-3 py-2 text-sm"
                      placeholder="Ex. 2 jours à déduire manuellement en RH"
                      value={deductLeaveNote}
                      onChange={(e) => setDeductLeaveNote(e.target.value)}
                      disabled={pending}
                    />
                  </div>
                ) : null}
              </div>

              {mode === "edit" ? (
                <div>
                  <FieldLabel>Statut</FieldLabel>
                  <p className="mt-1 text-xs text-msk-ink/50">
                    {SV_ABSENCE_JUSTIFIED_REQUIRES_GED}.
                  </p>
                  <div className="mt-2">
                    <ChoiceCards
                      name="status_ui"
                      columns={2}
                      value={status}
                      onChange={onStatusChange}
                      disabled={pending}
                      options={(
                        [
                          "ENREGISTREE",
                          "JUSTIFIEE",
                          "NON_JUSTIFIEE",
                        ] as SvAbsenceStatus[]
                      ).map((v) => ({
                        value: v,
                        label: SV_ABSENCE_STATUS_LABEL[v],
                        description:
                          v === "JUSTIFIEE" && !hasJustificatif
                            ? "Justificatif requis"
                            : undefined,
                      }))}
                    />
                  </div>
                  {!hasJustificatif ? (
                    <p className="mt-2 text-xs text-msk-ink/45">
                      Sans justificatif : Enregistrée ou Non justifiée. Pour
                      Justifiée, ajoutez un fichier à l’étape suivante puis
                      revenez sur ce choix.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {mode === "create" ? (
                <div>
                  <FieldLabel htmlFor="file">
                    Justificatif (optionnel)
                  </FieldLabel>
                  <input
                    id="file"
                    name="file"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="mt-1.5 block w-full text-sm text-msk-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-msk-blue/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-msk-blue"
                    disabled={pending}
                    onChange={(e) => {
                      const ok = Boolean(e.target.files?.[0]);
                      setFileSelected(ok);
                      setStepError(null);
                    }}
                  />
                  <p className="mt-1 text-xs text-msk-ink/45">
                    PDF ou image — max 8 Mo. Avec un fichier, l’absence sera
                    marquée <span className="font-medium">Justifiée</span>.
                    Sinon : Enregistrée (non justifiée tant qu’aucun
                    justificatif).
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {steps[step]?.id === "justif" ? (
            <div className="space-y-4">
              <p className="text-sm text-msk-ink/60">
                {hasGed
                  ? "Un justificatif est déjà lié. Vous pouvez en ajouter un nouveau."
                  : "Ajoutez un justificatif (PDF ou image) pour pouvoir marquer l’absence Justifiée."}
              </p>
              <div>
                <FieldLabel
                  htmlFor="file"
                  required={status === "JUSTIFIEE" && !hasGed}
                >
                  Justificatif
                </FieldLabel>
                <input
                  id="file"
                  name="file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="mt-1.5 block w-full text-sm text-msk-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-msk-blue/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-msk-blue"
                  disabled={pending}
                  onChange={(e) => {
                    const ok = Boolean(e.target.files?.[0]);
                    setFileSelected(ok);
                    if (ok) {
                      setStepError(null);
                      if (
                        status === "ENREGISTREE" ||
                        status === "NON_JUSTIFIEE"
                      ) {
                        setStatus("JUSTIFIEE");
                      }
                    }
                  }}
                />
                <p className="mt-1 text-xs text-msk-ink/45">
                  PDF ou image — max 8 Mo. Classé en GED Suivi.
                </p>
              </div>
              <div>
                <FieldLabel>Statut</FieldLabel>
                <p className="mt-1 text-xs text-msk-ink/50">
                  {SV_ABSENCE_JUSTIFIED_REQUIRES_GED}.
                </p>
                <div className="mt-2">
                  <ChoiceCards
                    name="status_justif_ui"
                    columns={2}
                    value={status}
                    onChange={onStatusChange}
                    disabled={pending}
                    options={(
                      [
                        "ENREGISTREE",
                        "JUSTIFIEE",
                        "NON_JUSTIFIEE",
                      ] as SvAbsenceStatus[]
                    ).map((v) => ({
                      value: v,
                      label: SV_ABSENCE_STATUS_LABEL[v],
                      description:
                        v === "JUSTIFIEE" && !hasJustificatif
                          ? "Justificatif requis"
                          : undefined,
                    }))}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {steps[step]?.id === "recap" ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                  Collaborateur
                </dt>
                <dd className="mt-0.5 font-medium">{employeeLabel}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                  Motif
                </dt>
                <dd className="mt-0.5 font-medium">
                  {SV_ABSENCE_REASON_LABEL[reason]}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                  Période
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {startDate || "—"} → {endDate || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                  Congés
                </dt>
                <dd className="mt-0.5 font-medium">
                  {deductLeave === "1"
                    ? `Oui — ${deductLeaveNote || "note à préciser"}`
                    : "Non"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                  Statut
                </dt>
                <dd className="mt-0.5 font-medium">
                  {mode === "create"
                    ? fileSelected
                      ? SV_ABSENCE_STATUS_LABEL.JUSTIFIEE
                      : SV_ABSENCE_STATUS_LABEL.ENREGISTREE
                    : SV_ABSENCE_STATUS_LABEL[status]}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                  Justificatif
                </dt>
                <dd className="mt-0.5 font-medium">
                  {hasJustificatif
                    ? hasGed && !fileSelected
                      ? "Déjà lié"
                      : "Fichier prêt à envoyer"
                    : "Aucun"}
                </dd>
              </div>
              {reasonNote ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                    Précision
                  </dt>
                  <dd className="mt-0.5">{reasonNote}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </FormShell>
    </form>
  );
}
