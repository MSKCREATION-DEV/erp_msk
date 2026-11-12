"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import type { SvAccountKind } from "@/generated/prisma/client";
import {
  createSvAccountEntry,
  type SvAccountActionState,
} from "@/actions/suivi/accounts";
import { FormShell } from "@/components/ui/form-shell";
import { FieldLabel } from "@/components/ui/field-label";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { useActionStateToast } from "@/hooks/use-action-state-toast";

import { SV_ACCOUNT_BASELINE_CATEGORY } from "@/lib/suivi/accounts";
import { SV_MOVEMENT_CATEGORY_OPTIONS } from "@/lib/suivi/categories";

const CATEGORIES = [
  "Banque / transfert",
  "Versement banque",
  "Achats",
  SV_ACCOUNT_BASELINE_CATEGORY,
  ...SV_MOVEMENT_CATEGORY_OPTIONS.filter(
    (c) =>
      c !== "Banque / transfert" &&
      c !== "Autre" &&
      c !== SV_ACCOUNT_BASELINE_CATEGORY &&
      c !== "Ouverture / bascule",
  ),
  "Autre",
];

type Op =
  | "CREDIT"
  | "DEBIT"
  | "TRANSFER_TO_PHYSICAL"
  | "TRANSFER_TO_BANK";

export function SvAccountEntryForm({
  accountId,
  accountKind,
}: {
  accountId: string;
  accountKind: SvAccountKind;
}) {
  const [state, formAction, pending] = useActionState<
    SvAccountActionState,
    FormData
  >(createSvAccountEntry, null);
  useActionStateToast(state);

  const today = new Date().toISOString().slice(0, 10);
  const [op, setOp] = useState<Op>("CREDIT");
  const [category, setCategory] = useState(CATEGORIES[0]!);

  const opOptions = useMemo(() => {
    const base: { value: Op; label: string; description: string }[] = [
      {
        value: "CREDIT",
        label: "Créditer",
        description: "Augmenter le solde (entrée).",
      },
      {
        value: "DEBIT",
        label: "Débiter",
        description: "Diminuer le solde (sortie).",
      },
    ];
    if (accountKind === "BANK") {
      base.push({
        value: "TRANSFER_TO_PHYSICAL",
        label: "Retrait → physique",
        description: "Débite banque et crédite caisse.",
      });
    } else {
      base.push({
        value: "TRANSFER_TO_BANK",
        label: "Versement → banque",
        description: "Débite caisse et crédite banque.",
      });
    }
    return base;
  }, [accountKind]);

  return (
    <form action={formAction}>
      <input type="hidden" name="accountId" value={accountId} />
      <FormShell
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href={`/suivi/comptes/${accountId}`}
              className="inline-flex h-11 items-center rounded-lg border border-msk-ink/15 px-4 text-sm font-medium hover:bg-msk-chalk"
            >
              Annuler
            </Link>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        }
      >
        {state && !state.ok ? (
          <p className="mb-4 text-sm text-msk-coral">{state.error}</p>
        ) : null}

        <div className="space-y-5">
          <div>
            <FieldLabel required>Type d’opération</FieldLabel>
            <div className="mt-2">
              <ChoiceCards
                name="op"
                value={op}
                onChange={setOp}
                options={opOptions}
                columns={2}
                disabled={pending}
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
                placeholder="Ex. 50000"
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
            </div>
            <div>
              <FieldLabel htmlFor="paymentMethod">Mode</FieldLabel>
              <input
                id="paymentMethod"
                name="paymentMethod"
                placeholder="Espèces, virement, chèque…"
                className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
                disabled={pending}
              />
            </div>
            <div>
              <FieldLabel htmlFor="reference">Référence</FieldLabel>
              <input
                id="reference"
                name="reference"
                placeholder="N° bordereau…"
                className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
                disabled={pending}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldLabel htmlFor="description">Motif</FieldLabel>
              <input
                id="description"
                name="description"
                placeholder="Ex. Retrait pour achats terrain"
                className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
                disabled={pending}
              />
            </div>
          </div>
        </div>
      </FormShell>
    </form>
  );
}
