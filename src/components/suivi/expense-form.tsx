"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createSvExpenseInvoice,
  type SvExpenseActionState,
} from "@/actions/suivi/expenses";
import { FormShell } from "@/components/ui/form-shell";
import { FieldLabel } from "@/components/ui/field-label";
import { Button } from "@/components/ui/button";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { SV_EXPENSE_CATEGORY_OPTIONS } from "@/lib/suivi/labels";

export function SvExpenseForm() {
  const [category, setCategory] = useState<string>("ORANGE_INTERNET");
  const [state, formAction, pending] = useActionState<
    SvExpenseActionState,
    FormData
  >(createSvExpenseInvoice, null);
  useActionStateToast(state);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} encType="multipart/form-data">
      <FormShell
        footer={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/suivi/charges"
              className="inline-flex h-11 items-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
            >
              Annuler
            </Link>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer la charge"}
            </Button>
          </div>
        }
      >
        {state && !state.ok ? (
          <p className="mb-4 rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral">
            {state.error}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <OptionPickerSingle
              label="Type"
              required
              value={category}
              onChange={(v) => setCategory(v ?? "ORANGE_INTERNET")}
              options={SV_EXPENSE_CATEGORY_OPTIONS}
              placeholder="Choisir…"
              modalTitle="Type de charge"
              disabled={pending}
            />
            <input type="hidden" name="category" value={category} />
          </div>
          <div>
            <FieldLabel htmlFor="vendorName" required>
              Fournisseur
            </FieldLabel>
            <input
              id="vendorName"
              name="vendorName"
              required
              placeholder="Ex. Orange Mali"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
            />
          </div>
          <div>
            <FieldLabel htmlFor="number">N° facture</FieldLabel>
            <input
              id="number"
              name="number"
              placeholder="Ex. CB503620261001"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
            />
          </div>
          <div>
            <FieldLabel htmlFor="vendorRef">Réf. fournisseur</FieldLabel>
            <input
              id="vendorRef"
              name="vendorRef"
              placeholder="Compte, NIF, client…"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
            />
          </div>
          <div>
            <FieldLabel htmlFor="issuedAt" required>
              Date d’émission
            </FieldLabel>
            <input
              id="issuedAt"
              name="issuedAt"
              type="date"
              required
              defaultValue={today}
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
            />
          </div>
          <div>
            <FieldLabel htmlFor="dueAt">Échéance</FieldLabel>
            <input
              id="dueAt"
              name="dueAt"
              type="date"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
            />
          </div>
          <div>
            <FieldLabel htmlFor="periodStart">Début période</FieldLabel>
            <input
              id="periodStart"
              name="periodStart"
              type="date"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
            />
          </div>
          <div>
            <FieldLabel htmlFor="periodEnd">Fin période</FieldLabel>
            <input
              id="periodEnd"
              name="periodEnd"
              type="date"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
            />
          </div>
          <div>
            <FieldLabel htmlFor="periodLabel">Libellé période</FieldLabel>
            <input
              id="periodLabel"
              name="periodLabel"
              placeholder="Ex. Octobre 2026"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
            />
          </div>
          <div>
            <FieldLabel htmlFor="totalHt">HT</FieldLabel>
            <input
              id="totalHt"
              name="totalHt"
              type="number"
              min={0}
              defaultValue={0}
              placeholder="0"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
            />
          </div>
          <div>
            <FieldLabel htmlFor="totalVat">TVA</FieldLabel>
            <input
              id="totalVat"
              name="totalVat"
              type="number"
              min={0}
              defaultValue={0}
              placeholder="0"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
            />
          </div>
          <div>
            <FieldLabel htmlFor="totalTtc" required>
              TTC (montant dû)
            </FieldLabel>
            <input
              id="totalTtc"
              name="totalTtc"
              type="number"
              min={1}
              required
              placeholder="Ex. 85149"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="object">Objet</FieldLabel>
            <input
              id="object"
              name="object"
              placeholder="Ex. Orange Internet — octobre 2026"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Détail utile…"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="file">Justificatif (PDF ou image)</FieldLabel>
            <input
              id="file"
              name="file"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-msk-blue/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-msk-blue"
              disabled={pending}
            />
            <p className="mt-1 text-xs text-msk-ink/45">
              Déposé dans la GED Suivi · Charges (max 12 Mo).
            </p>
          </div>
        </div>
      </FormShell>
    </form>
  );
}
