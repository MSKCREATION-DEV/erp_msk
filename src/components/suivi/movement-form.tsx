"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createSvCashMovement,
  type SvMovementActionState,
} from "@/actions/suivi/movements";
import { FormShell } from "@/components/ui/form-shell";
import { FieldLabel } from "@/components/ui/field-label";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import {
  OptionPickerSingle,
  type OptionPickerItem,
} from "@/components/ui/option-picker-modal";
import { SvPaymentModeField } from "@/components/suivi/payment-mode-field";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { SV_MOVEMENT_CATEGORY_OPTIONS } from "@/lib/suivi/categories";
import {
  SV_PAYMENT_MODE_OTHER,
  type SvPaymentMode,
} from "@/lib/suivi/payment-modes";

const CATEGORIES = [...SV_MOVEMENT_CATEGORY_OPTIONS];

export function SvMovementForm({
  employeeOptions,
}: {
  employeeOptions: OptionPickerItem[];
}) {
  const [state, formAction, pending] = useActionState<
    SvMovementActionState,
    FormData
  >(createSvCashMovement, null);
  useActionStateToast(state);

  const today = new Date().toISOString().slice(0, 10);
  const [direction, setDirection] = useState<"IN" | "OUT">("OUT");
  const [category, setCategory] = useState<string>(CATEGORIES[0]!);
  const [accountKind, setAccountKind] = useState<"PHYSICAL" | "BANK">(
    "PHYSICAL",
  );
  const [paidById, setPaidById] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<SvPaymentMode>("Espèces");
  const [paymentModeOther, setPaymentModeOther] = useState("");

  const paidByLabel =
    employeeOptions.find((o) => o.value === paidById)?.label ?? "";

  return (
    <form action={formAction}>
      <input type="hidden" name="paidBy" value={paidByLabel} />
      <FormShell
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/suivi/mouvements"
              className="inline-flex h-11 items-center rounded-lg border border-msk-ink/15 px-4 text-sm font-medium hover:bg-msk-chalk"
            >
              Annuler
            </Link>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer le mouvement"}
            </Button>
          </div>
        }
      >
        {state && !state.ok ? (
          <p className="mb-4 text-sm text-msk-coral">{state.error}</p>
        ) : null}
        <div className="space-y-5">
          <div>
            <FieldLabel required>Sens</FieldLabel>
            <div className="mt-2">
              <ChoiceCards
                name="direction"
                value={direction}
                onChange={setDirection}
                disabled={pending}
                options={[
                  {
                    value: "OUT",
                    label: "Sortie",
                    description: "Argent qui sort du compte choisi.",
                  },
                  {
                    value: "IN",
                    label: "Entrée",
                    description: "Argent qui entre sur le compte choisi.",
                  },
                ]}
              />
            </div>
          </div>
          <div>
            <FieldLabel required>Compte</FieldLabel>
            <div className="mt-2">
              <ChoiceCards
                name="accountKind"
                value={accountKind}
                onChange={setAccountKind}
                disabled={pending}
                options={[
                  {
                    value: "PHYSICAL",
                    label: "Compte physique",
                    description: "Caisse espèces.",
                  },
                  {
                    value: "BANK",
                    label: "Compte banque",
                    description: "Virements / chèques.",
                  },
                ]}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <FieldLabel htmlFor="amount" required>
                Montant
              </FieldLabel>
              <input
                id="amount"
                name="amount"
                type="number"
                min={1}
                required
                placeholder="Ex. 2000"
                className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
                disabled={pending}
              />
            </div>
            <div>
              <FieldLabel htmlFor="movedAt" required>
                Date
              </FieldLabel>
              <input
                id="movedAt"
                name="movedAt"
                type="date"
                required
                defaultValue={today}
                className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
                disabled={pending}
              />
            </div>
            <div>
              <OptionPickerSingle
                label="Catégorie"
                required
                value={category}
                onChange={(v) => setCategory(v ?? CATEGORIES[0]!)}
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                placeholder="Choisir…"
                modalTitle="Catégorie"
                disabled={pending}
              />
              <input type="hidden" name="category" value={category} />
              {category === "Autre" ? (
                <div className="mt-3">
                  <FieldLabel htmlFor="categoryOther" required>
                    Préciser la catégorie
                  </FieldLabel>
                  <input
                    id="categoryOther"
                    name="categoryOther"
                    placeholder="Ex. Frais divers terrain"
                    className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
                    disabled={pending}
                  />
                </div>
              ) : null}
            </div>
            <SvPaymentModeField
              value={paymentMode}
              onChange={(v) => {
                setPaymentMode(v);
                if (v !== SV_PAYMENT_MODE_OTHER) setPaymentModeOther("");
              }}
              otherDetail={paymentModeOther}
              onOtherDetailChange={setPaymentModeOther}
              disabled={pending}
            />
            <div className="sm:col-span-2">
              <OptionPickerSingle
                label="Payé par"
                value={paidById}
                onChange={setPaidById}
                options={employeeOptions}
                placeholder="Choisir un collaborateur…"
                modalTitle="Payé par"
                disabled={pending}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <input
                id="description"
                name="description"
                placeholder="Motif"
                className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
                disabled={pending}
              />
            </div>
            <div>
              <FieldLabel htmlFor="clientProject">Client / projet</FieldLabel>
              <input
                id="clientProject"
                name="clientProject"
                placeholder="Texte libre"
                className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
                disabled={pending}
              />
            </div>
            <div>
              <FieldLabel htmlFor="beneficiary">Bénéficiaire</FieldLabel>
              <input
                id="beneficiary"
                name="beneficiary"
                className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
                disabled={pending}
              />
            </div>
            <div>
              <FieldLabel htmlFor="reference-vis">Référence</FieldLabel>
              <input
                id="reference-vis"
                value="Générée à l’enregistrement (MV-…)"
                readOnly
                disabled
                className="mt-1.5 w-full rounded-lg border border-msk-ink/10 bg-msk-chalk/60 px-3 py-2 text-sm text-msk-ink/70"
              />
              <p className="mt-1 text-xs text-msk-ink/45">
                Format MV-AAAAMMJJ-NNN — unique pour le jour.
              </p>
            </div>
          </div>
        </div>
      </FormShell>
    </form>
  );
}
