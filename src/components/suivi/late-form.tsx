"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createSvLate,
  updateSvLate,
  type SvHrActionState,
} from "@/actions/suivi/hr";
import { FormShell } from "@/components/ui/form-shell";
import { FormSteps } from "@/components/ui/form-steps";
import { FieldLabel } from "@/components/ui/field-label";
import { Button } from "@/components/ui/button";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import type { OptionPickerItem } from "@/components/ui/option-picker-modal";
import { useActionStateToast } from "@/hooks/use-action-state-toast";

type Initial = {
  employeeId?: string;
  lateDate?: string;
  expectedTime?: string;
  arrivedTime?: string;
  note?: string | null;
};

const STEPS = [
  { id: "collab", label: "Collaborateur" },
  { id: "horaire", label: "Horaire" },
  { id: "recap", label: "Confirmation" },
] as const;

export function SvLateForm({
  mode,
  lateId,
  employeeOptions,
  initial,
}: {
  mode: "create" | "edit";
  lateId?: string;
  employeeOptions: OptionPickerItem[];
  initial?: Initial;
}) {
  const action =
    mode === "create" ? createSvLate : updateSvLate.bind(null, lateId!);

  const [state, formAction, pending] = useActionState<
    SvHrActionState,
    FormData
  >(action, null);
  useActionStateToast(state);

  const [step, setStep] = useState(mode === "edit" ? 1 : 0);
  const [employeeId, setEmployeeId] = useState<string | null>(
    initial?.employeeId ?? null,
  );
  const [lateDate, setLateDate] = useState(initial?.lateDate ?? "");
  const [expectedTime, setExpectedTime] = useState(
    initial?.expectedTime ?? "08:00",
  );
  const [arrivedTime, setArrivedTime] = useState(initial?.arrivedTime ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [stepError, setStepError] = useState<string | null>(null);

  const employeeLabel =
    employeeOptions.find((o) => o.value === employeeId)?.label ?? "—";

  function validateStep(index: number): boolean {
    const stepId = STEPS[index]?.id;
    if (stepId === "collab" && !employeeId) {
      setStepError("Choisissez un collaborateur.");
      return false;
    }
    if (stepId === "horaire") {
      if (!employeeId) {
        setStepError("Choisissez un collaborateur.");
        return false;
      }
      if (!lateDate || !arrivedTime) {
        setStepError("Date et heure d’arrivée obligatoires.");
        return false;
      }
    }
    setStepError(null);
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="employeeId" value={employeeId ?? ""} />
      <input type="hidden" name="lateDate" value={lateDate} />
      <input type="hidden" name="expectedTime" value={expectedTime} />
      <input type="hidden" name="arrivedTime" value={arrivedTime} />
      <input type="hidden" name="note" value={note} />

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
                  href="/suivi/retards"
                  className="inline-flex h-10 items-center rounded-lg border border-msk-ink/10 bg-white px-4 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
                >
                  Annuler
                </Link>
              )}
            </div>
            <div className="flex gap-2">
              {step < STEPS.length - 1 ? (
                <Button type="button" disabled={pending} onClick={goNext}>
                  Continuer
                </Button>
              ) : (
                <Button type="submit" disabled={pending}>
                  {pending
                    ? "Enregistrement…"
                    : mode === "create"
                      ? "Enregistrer le retard"
                      : "Enregistrer les modifications"}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <FormSteps
          steps={[...STEPS]}
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
          {STEPS[step]?.id === "collab" ||
          (STEPS[step]?.id === "horaire" && mode === "edit") ? (
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

          {STEPS[step]?.id === "horaire" ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <FieldLabel htmlFor="lateDate" required>
                    Date
                  </FieldLabel>
                  <input
                    id="lateDate"
                    type="date"
                    className="mt-1.5 w-full rounded-lg border border-msk-ink/10 bg-white px-3 py-2 text-sm"
                    value={lateDate}
                    onChange={(e) => setLateDate(e.target.value)}
                    disabled={pending}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="expectedTime">Heure prévue</FieldLabel>
                  <input
                    id="expectedTime"
                    type="time"
                    className="mt-1.5 w-full rounded-lg border border-msk-ink/10 bg-white px-3 py-2 text-sm"
                    value={expectedTime}
                    onChange={(e) => setExpectedTime(e.target.value)}
                    disabled={pending}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="arrivedTime" required>
                    Heure d’arrivée
                  </FieldLabel>
                  <input
                    id="arrivedTime"
                    type="time"
                    className="mt-1.5 w-full rounded-lg border border-msk-ink/10 bg-white px-3 py-2 text-sm"
                    value={arrivedTime}
                    onChange={(e) => setArrivedTime(e.target.value)}
                    disabled={pending}
                  />
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="note">Note</FieldLabel>
                <textarea
                  id="note"
                  rows={3}
                  className="mt-1.5 w-full rounded-lg border border-msk-ink/10 bg-white px-3 py-2 text-sm"
                  placeholder="Ex. embouteillage, rendez-vous médical…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={pending}
                />
              </div>
            </div>
          ) : null}

          {STEPS[step]?.id === "recap" ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                  Collaborateur
                </dt>
                <dd className="mt-0.5 font-medium">{employeeLabel}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                  Date
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {lateDate || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                  Prévu
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {expectedTime || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                  Arrivée
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {arrivedTime || "—"}
                </dd>
              </div>
              {note ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                    Note
                  </dt>
                  <dd className="mt-0.5">{note}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </FormShell>
    </form>
  );
}
