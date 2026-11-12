"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import {
  createSvExpenseInvoice,
  parseSvExpenseDocumentAction,
  type SvExpenseActionState,
} from "@/actions/suivi/expenses";
import type { ExpenseOcrFields } from "@/lib/suivi/expense-ocr";
import { FormShell } from "@/components/ui/form-shell";
import { FieldLabel } from "@/components/ui/field-label";
import { Button } from "@/components/ui/button";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAction } from "@/hooks/use-pending-action";
import { SV_EXPENSE_CATEGORY_OPTIONS } from "@/lib/suivi/labels";

type FormValues = ExpenseOcrFields;

const emptyValues = (): FormValues => ({
  category: "ORANGE_INTERNET",
  vendorName: "",
  vendorRef: "",
  number: "",
  issuedAt: new Date().toISOString().slice(0, 10),
  dueAt: "",
  periodStart: "",
  periodEnd: "",
  periodLabel: "",
  totalHt: 0,
  totalVat: 0,
  totalTtc: 0,
  object: "",
  notes: "",
});

export function SvExpenseForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [ocrBanner, setOcrBanner] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrFileName, setOcrFileName] = useState<string | null>(null);
  const { pending: ocrPending, run: runOcr } = usePendingAction();

  const [state, formAction, pending] = useActionState<
    SvExpenseActionState,
    FormData
  >(createSvExpenseInvoice, null);
  useActionStateToast(state);

  const busy = pending || ocrPending;

  function patch<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function applyOcr(fields: ExpenseOcrFields, meta: {
    warnings: string[];
    source: string;
  }) {
    setValues({ ...fields });
    const bits = ["Vérifiez les infos extraites"];
    if (meta.source === "pdf-text") bits.push("PDF texte");
    if (meta.source === "ocr-image") bits.push("OCR image");
    if (meta.source === "ocr-pdf-scan") bits.push("OCR scan PDF");
    if (meta.warnings.length) bits.push(meta.warnings[0]!);
    setOcrBanner(bits.join(" · "));
    setOcrError(null);
  }

  async function runDocumentOcr() {
    const input = fileInputRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setOcrError("Choisissez d’abord un PDF ou une image.");
      return;
    }
    setOcrFileName(file.name);
    setOcrError(null);
    setOcrBanner(null);

    await runOcr(async () => {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("categoryHint", values.category);
      const result = await parseSvExpenseDocumentAction(fd);
      if (!result.ok) {
        setOcrError(result.error);
        setOcrBanner(null);
        return;
      }
      applyOcr(result.fields, {
        warnings: result.warnings,
        source: result.source,
      });
    });
  }

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
            <Button type="submit" disabled={busy}>
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

        <div className="mb-5 rounded-xl border border-msk-ink/8 bg-msk-chalk/40 p-4">
          <p className="text-sm font-semibold text-msk-ink">
            Lire le justificatif
          </p>
          <p className="mt-1 text-xs text-msk-ink/50">
            Uploadez une facture Orange (PDF), EDM ou loyer (PDF scanné / photo)
            — les champs se remplissent. Corrigez seulement ce qui est faux.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <FieldLabel htmlFor="file">Justificatif (PDF ou image)</FieldLabel>
              <input
                ref={fileInputRef}
                id="file"
                name="file"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="mt-1.5 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-msk-blue/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-msk-blue"
                disabled={busy}
                onChange={() => {
                  setOcrError(null);
                  const f = fileInputRef.current?.files?.[0];
                  setOcrFileName(f?.name ?? null);
                }}
              />
              <p className="mt-1 text-xs text-msk-ink/45">
                Déposé dans la GED à l’enregistrement (max 12 Mo).
                {ocrFileName ? ` · ${ocrFileName}` : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void runDocumentOcr()}
            >
              {ocrPending ? "Lecture du document…" : "Lire le document"}
            </Button>
          </div>
          {ocrBanner ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-msk-blue/20 bg-msk-blue/5 px-3 py-2 text-sm text-msk-ink">
              <p>{ocrBanner}</p>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void runDocumentOcr()}
              >
                {ocrPending ? "Lecture…" : "Réessayer OCR"}
              </Button>
            </div>
          ) : null}
          {ocrError ? (
            <p className="mt-3 rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral">
              {ocrError} — vous pouvez remplir le formulaire à la main.
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <OptionPickerSingle
              label="Type"
              required
              value={values.category}
              onChange={(v) =>
                patch("category", (v ?? "ORANGE_INTERNET") as FormValues["category"])
              }
              options={SV_EXPENSE_CATEGORY_OPTIONS}
              placeholder="Choisir…"
              modalTitle="Type de charge"
              disabled={busy}
            />
            <input type="hidden" name="category" value={values.category} />
          </div>
          <div>
            <FieldLabel htmlFor="vendorName" required>
              Fournisseur
            </FieldLabel>
            <input
              id="vendorName"
              name="vendorName"
              required
              value={values.vendorName}
              onChange={(e) => patch("vendorName", e.target.value)}
              placeholder="Ex. Orange Mali"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={busy}
            />
          </div>
          <div>
            <FieldLabel htmlFor="number">N° facture</FieldLabel>
            <input
              id="number"
              name="number"
              value={values.number}
              onChange={(e) => patch("number", e.target.value)}
              placeholder="Ex. CB503620261001"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={busy}
            />
          </div>
          <div>
            <FieldLabel htmlFor="vendorRef">Réf. fournisseur</FieldLabel>
            <input
              id="vendorRef"
              name="vendorRef"
              value={values.vendorRef}
              onChange={(e) => patch("vendorRef", e.target.value)}
              placeholder="Compte, NIF, client…"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={busy}
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
              value={values.issuedAt}
              onChange={(e) => patch("issuedAt", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={busy}
            />
          </div>
          <div>
            <FieldLabel htmlFor="dueAt">Échéance</FieldLabel>
            <input
              id="dueAt"
              name="dueAt"
              type="date"
              value={values.dueAt}
              onChange={(e) => patch("dueAt", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={busy}
            />
          </div>
          <div>
            <FieldLabel htmlFor="periodStart">Début période</FieldLabel>
            <input
              id="periodStart"
              name="periodStart"
              type="date"
              value={values.periodStart}
              onChange={(e) => patch("periodStart", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={busy}
            />
          </div>
          <div>
            <FieldLabel htmlFor="periodEnd">Fin période</FieldLabel>
            <input
              id="periodEnd"
              name="periodEnd"
              type="date"
              value={values.periodEnd}
              onChange={(e) => patch("periodEnd", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={busy}
            />
          </div>
          <div>
            <FieldLabel htmlFor="periodLabel">Libellé période</FieldLabel>
            <input
              id="periodLabel"
              name="periodLabel"
              value={values.periodLabel}
              onChange={(e) => patch("periodLabel", e.target.value)}
              placeholder="Ex. Octobre 2026"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={busy}
            />
          </div>
          <div>
            <FieldLabel htmlFor="totalHt">HT</FieldLabel>
            <input
              id="totalHt"
              name="totalHt"
              type="number"
              min={0}
              value={values.totalHt}
              onChange={(e) => patch("totalHt", Number(e.target.value) || 0)}
              placeholder="0"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={busy}
            />
          </div>
          <div>
            <FieldLabel htmlFor="totalVat">TVA</FieldLabel>
            <input
              id="totalVat"
              name="totalVat"
              type="number"
              min={0}
              value={values.totalVat}
              onChange={(e) => patch("totalVat", Number(e.target.value) || 0)}
              placeholder="0"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={busy}
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
              value={values.totalTtc || ""}
              onChange={(e) => patch("totalTtc", Number(e.target.value) || 0)}
              placeholder="Ex. 85149"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={busy}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="object">Objet</FieldLabel>
            <input
              id="object"
              name="object"
              value={values.object}
              onChange={(e) => patch("object", e.target.value)}
              placeholder="Ex. Orange Internet — octobre 2026"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={busy}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              value={values.notes}
              onChange={(e) => patch("notes", e.target.value)}
              placeholder="Détail utile…"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={busy}
            />
          </div>
        </div>
      </FormShell>
    </form>
  );
}
