"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  createSvStockItem,
  updateSvStockItem,
  type SvStockActionState,
} from "@/actions/suivi/stock";
import { FormShell } from "@/components/ui/form-shell";
import { FormSteps } from "@/components/ui/form-steps";
import { FieldLabel } from "@/components/ui/field-label";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import {
  SV_STOCK_FAMILIES,
  SV_STOCK_UNITS,
  type SvStockUnit,
} from "@/lib/suivi/stock";
import { useActionStateToast } from "@/hooks/use-action-state-toast";

type Initial = {
  code?: string;
  family?: string;
  subFamily?: string | null;
  label?: string;
  unit?: string;
  location?: string | null;
  observations?: string | null;
};

const STEPS = [
  { id: "identite", label: "Identité" },
  { id: "stock", label: "Stock" },
  { id: "recap", label: "Confirmation" },
] as const;

export function SvStockItemForm({
  mode,
  itemId,
  initial,
}: {
  mode: "create" | "edit";
  itemId?: string;
  initial?: Initial;
}) {
  const action =
    mode === "create"
      ? createSvStockItem
      : updateSvStockItem.bind(null, itemId!);

  const [state, formAction, pending] = useActionState<
    SvStockActionState,
    FormData
  >(action, null);
  useActionStateToast(state);

  const [step, setStep] = useState(0);
  const [code, setCode] = useState(initial?.code ?? "");
  const [family, setFamily] = useState(initial?.family ?? "Papeterie");
  const [subFamily, setSubFamily] = useState(initial?.subFamily ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [unit, setUnit] = useState<SvStockUnit>(
    (initial?.unit as SvStockUnit) || "pièce",
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [observations, setObservations] = useState(
    initial?.observations ?? "",
  );
  const [initialQuantity, setInitialQuantity] = useState("0");
  const [stepError, setStepError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function validateStep(index: number): boolean {
    if (index === 0) {
      if (!code.trim() || !label.trim() || !family.trim()) {
        setStepError("Code, famille et libellé sont obligatoires.");
        return false;
      }
      if (!/^[A-Za-z0-9\-]+$/.test(code.trim())) {
        setStepError("Code : lettres, chiffres et tirets uniquement.");
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

  function submitForm() {
    if (step < STEPS.length - 1) return;
    const form = formRef.current;
    if (!form) return;
    formAction(new FormData(form));
  }

  /** Bloque tout submit natif (Enter / type-flip Continuer→submit). */
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit}>
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="family" value={family} />
      <input type="hidden" name="subFamily" value={subFamily} />
      <input type="hidden" name="label" value={label} />
      <input type="hidden" name="unit" value={unit} />
      <input type="hidden" name="location" value={location} />
      <input type="hidden" name="observations" value={observations} />
      {mode === "create" ? (
        <input type="hidden" name="initialQuantity" value={initialQuantity} />
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
                  href={
                    itemId ? `/suivi/stocks/${itemId}` : "/suivi/stocks"
                  }
                  className="inline-flex h-11 items-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
                >
                  Annuler
                </Link>
              )}
            </div>
            <div>
              {step < STEPS.length - 1 ? (
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
                      ? "Créer l’article"
                      : "Enregistrer"}
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
            if (i < step) setStep(i);
            else if (validateStep(step)) setStep(i);
          }}
        />

        {state && !state.ok ? (
          <p className="mb-4 rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral">
            {state.error}
          </p>
        ) : null}
        {stepError ? (
          <p className="mb-4 text-sm text-msk-coral">{stepError}</p>
        ) : null}

        {step === 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <FieldLabel htmlFor="code-vis" required>
                Code
              </FieldLabel>
              <input
                id="code-vis"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex. PAP-020"
                disabled={pending}
                className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm uppercase"
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="label-vis" required>
                Libellé
              </FieldLabel>
              <input
                id="label-vis"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex. Stylo bleu"
                disabled={pending}
                className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldLabel required>Famille</FieldLabel>
              <div className="mt-2">
                <ChoiceCards
                  name="family-vis"
                  value={family}
                  onChange={setFamily}
                  disabled={pending}
                  columns={4}
                  options={SV_STOCK_FAMILIES.map((f) => ({
                    value: f,
                    label: f,
                  }))}
                />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="subFamily-vis">Sous-famille</FieldLabel>
              <input
                id="subFamily-vis"
                value={subFamily}
                onChange={(e) => setSubFamily(e.target.value)}
                placeholder="Optionnel"
                disabled={pending}
                className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldLabel required>Unité</FieldLabel>
              <div className="mt-2">
                <ChoiceCards
                  name="unit-vis"
                  value={unit}
                  onChange={setUnit}
                  disabled={pending}
                  columns={3}
                  options={SV_STOCK_UNITS.map((u) => ({
                    value: u,
                    label: u,
                  }))}
                />
              </div>
            </div>
            {mode === "create" ? (
              <div>
                <FieldLabel htmlFor="qty-vis">Quantité initiale</FieldLabel>
                <input
                  id="qty-vis"
                  type="number"
                  min={0}
                  value={initialQuantity}
                  onChange={(e) => setInitialQuantity(e.target.value)}
                  disabled={pending}
                  className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-msk-ink/45">
                  Trace un mouvement d’ouverture si &gt; 0.
                </p>
              </div>
            ) : null}
            <div>
              <FieldLabel htmlFor="loc-vis">Emplacement</FieldLabel>
              <input
                id="loc-vis"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex. Armoire 1"
                disabled={pending}
                className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldLabel htmlFor="obs-vis">Observations</FieldLabel>
              <textarea
                id="obs-vis"
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Précisions packing, marque…"
                disabled={pending}
                className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-6 rounded-xl border border-msk-ink/8 bg-msk-chalk/40 p-4 text-sm">
            <p className="text-xs uppercase tracking-caps text-msk-ink/45">
              Récapitulatif
            </p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-msk-ink/45">Code</dt>
                <dd className="font-medium">{code || "—"}</dd>
              </div>
              <div>
                <dt className="text-msk-ink/45">Libellé</dt>
                <dd className="font-medium">{label || "—"}</dd>
              </div>
              <div>
                <dt className="text-msk-ink/45">Famille</dt>
                <dd>
                  {family}
                  {subFamily ? ` · ${subFamily}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-msk-ink/45">Unité</dt>
                <dd>{unit}</dd>
              </div>
              {mode === "create" ? (
                <div>
                  <dt className="text-msk-ink/45">Quantité initiale</dt>
                  <dd className="tabular-nums">{initialQuantity}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-msk-ink/45">Emplacement</dt>
                <dd>{location || "—"}</dd>
              </div>
              {observations ? (
                <div className="sm:col-span-2">
                  <dt className="text-msk-ink/45">Observations</dt>
                  <dd>{observations}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}
      </FormShell>
    </form>
  );
}
