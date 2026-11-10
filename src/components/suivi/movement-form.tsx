"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createSvCashMovement,
  type SvMovementActionState,
} from "@/actions/suivi/movements";
import { FormShell } from "@/components/ui/form-shell";
import { FieldLabel } from "@/components/ui/field-label";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  "Transport / carburant",
  "Transport",
  "Prospection / RDV",
  "Banque / transfert",
  "Repas / eau",
  "Fournitures",
  "Téléphone / Internet",
  "Salaires",
  "Encaissement client",
  "Autre",
];

export function SvMovementForm() {
  const [state, formAction, pending] = useActionState<
    SvMovementActionState,
    FormData
  >(createSvCashMovement, null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction}>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <FieldLabel htmlFor="direction" required>
              Sens
            </FieldLabel>
            <select
              id="direction"
              name="direction"
              required
              defaultValue="OUT"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            >
              <option value="OUT">Sortie (OUT)</option>
              <option value="IN">Entrée (IN)</option>
            </select>
          </div>
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
            />
          </div>
          <div>
            <FieldLabel htmlFor="category" required>
              Catégorie
            </FieldLabel>
            <select
              id="category"
              name="category"
              required
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="paymentMethod">Mode</FieldLabel>
            <input
              id="paymentMethod"
              name="paymentMethod"
              placeholder="Espèces, OM, Wave…"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <FieldLabel htmlFor="paidBy">Payé par</FieldLabel>
            <input
              id="paidBy"
              name="paidBy"
              placeholder="Ex. Guiro"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <input
              id="description"
              name="description"
              placeholder="Motif"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <FieldLabel htmlFor="clientProject">Client / projet</FieldLabel>
            <input
              id="clientProject"
              name="clientProject"
              placeholder="Texte libre"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <FieldLabel htmlFor="beneficiary">Bénéficiaire</FieldLabel>
            <input
              id="beneficiary"
              name="beneficiary"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <FieldLabel htmlFor="reference">Référence</FieldLabel>
            <input
              id="reference"
              name="reference"
              placeholder="MSK-…"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </FormShell>
    </form>
  );
}
