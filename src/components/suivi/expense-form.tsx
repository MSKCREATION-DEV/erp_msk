"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { FileText, Loader2, Upload, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

type FormValues = ExpenseOcrFields;

const ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp";
const ACCEPT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_BYTES = 12 * 1024 * 1024;

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm text-msk-ink placeholder:text-msk-ink/35 focus-visible:border-msk-blue/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/20 disabled:cursor-not-allowed disabled:opacity-60";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

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
  const [ocrOk, setOcrOk] = useState(false);
  const [ocrHint, setOcrHint] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
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

  function applyOcr(fields: ExpenseOcrFields, warnings: string[]) {
    setValues({ ...fields });
    setOcrOk(true);
    setOcrHint(warnings[0] ?? null);
    setOcrError(null);
  }

  function clearFile() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSelectedFile(null);
    setOcrOk(false);
    setOcrHint(null);
    setOcrError(null);
  }

  function assignFile(file: File, { autoRead }: { autoRead: boolean }) {
    if (!ACCEPT_TYPES.has(file.type)) {
      setOcrError("Format non pris en charge. Utilisez un PDF, JPEG, PNG ou WebP.");
      setOcrOk(false);
      return;
    }
    if (file.size > MAX_BYTES) {
      setOcrError("Fichier trop volumineux (max 12 Mo).");
      setOcrOk(false);
      return;
    }

    const input = fileInputRef.current;
    if (input) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
    }

    setSelectedFile({ name: file.name, size: file.size });
    setOcrError(null);
    setOcrOk(false);
    setOcrHint(null);

    if (autoRead) void runDocumentRead(file);
  }

  async function runDocumentRead(fileArg?: File) {
    const file = fileArg ?? fileInputRef.current?.files?.[0];
    if (!file) {
      setOcrError("Déposez d’abord un PDF ou une photo.");
      return;
    }

    setOcrError(null);
    setOcrOk(false);
    setOcrHint(null);

    await runOcr(async () => {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("categoryHint", values.category);
      const result = await parseSvExpenseDocumentAction(fd);
      if (!result.ok) {
        setOcrError(result.error);
        setOcrOk(false);
        return;
      }
      applyOcr(result.fields, result.warnings);
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
          <p
            className="mb-4 rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}

        <section className="mb-6 rounded-xl border border-msk-ink/8 bg-white p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-msk-ink">
              Lecture automatique
            </h2>
            <p className="mt-1 text-sm text-msk-ink/55">
              Déposez la facture (Orange, EDM, loyer…) — les champs se
              remplissent. Corrigez seulement ce qui est faux.
            </p>
          </div>

          <input
            ref={fileInputRef}
            id="file"
            name="file"
            type="file"
            accept={ACCEPT}
            className="sr-only"
            tabIndex={-1}
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) assignFile(f, { autoRead: true });
            }}
          />

          {!selectedFile ? (
            <div
              role="button"
              tabIndex={0}
              aria-controls="file"
              aria-label="Déposer le justificatif ou parcourir"
              onKeyDown={(e) => {
                if (busy) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onClick={() => {
                if (!busy) fileInputRef.current?.click();
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!busy) setDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!busy) setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(false);
                if (busy) return;
                const f = e.dataTransfer.files?.[0];
                if (f) assignFile(f, { autoRead: true });
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition sm:py-10",
                dragOver
                  ? "border-msk-blue bg-msk-blue/5"
                  : "border-msk-ink/15 bg-msk-chalk/50 hover:border-msk-blue/40 hover:bg-msk-blue/4",
                busy && "pointer-events-none opacity-60",
              )}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-msk-blue/10 text-msk-blue">
                <Upload className="h-5 w-5" aria-hidden />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium text-msk-ink">
                  Déposer le PDF ou la photo
                </p>
                <p className="text-xs text-msk-ink/45">
                  PDF, JPEG, PNG ou WebP — max 12 Mo · classé en GED à
                  l’enregistrement
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Parcourir
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                "rounded-xl border px-4 py-3 transition",
                ocrPending
                  ? "border-msk-blue/25 bg-msk-blue/5"
                  : ocrError
                    ? "border-msk-coral/25 bg-msk-coral/5"
                    : ocrOk
                      ? "border-msk-ink/8 bg-msk-chalk/40"
                      : "border-msk-ink/10 bg-msk-chalk/30",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    ocrError
                      ? "bg-msk-coral/10 text-msk-coral"
                      : "bg-msk-blue/10 text-msk-blue",
                  )}
                >
                  {ocrPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  ) : (
                    <FileText className="h-5 w-5" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-msk-ink">
                    {selectedFile.name}
                  </p>
                  <p className="mt-0.5 text-xs text-msk-ink/45">
                    {formatFileSize(selectedFile.size)}
                    {ocrPending ? " · Lecture du document…" : null}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!ocrPending && !ocrOk ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => void runDocumentRead()}
                    >
                      {ocrError ? "Relire" : "Lire"}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    aria-label="Retirer le fichier"
                    className="px-2 text-msk-ink/50 hover:text-msk-coral"
                    onClick={clearFile}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {ocrOk ? (
            <div
              className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-msk-blue/20 bg-msk-blue/5 px-3 py-2.5"
              role="status"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-msk-ink">
                  Infos remplies — vérifiez avant d’enregistrer
                </p>
                {ocrHint ? (
                  <p className="mt-0.5 text-xs text-msk-ink/50">{ocrHint}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void runDocumentRead()}
              >
                {ocrPending ? "Lecture…" : "Relire"}
              </Button>
            </div>
          ) : null}

          {ocrError ? (
            <p
              className="mt-3 rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral"
              role="alert"
            >
              {ocrError} — vous pouvez remplir le formulaire à la main.
            </p>
          ) : null}
        </section>

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
              className={fieldClass}
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
              className={fieldClass}
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
              className={fieldClass}
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
              className={fieldClass}
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
              className={fieldClass}
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
              className={fieldClass}
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
              className={fieldClass}
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
              className={fieldClass}
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
              className={fieldClass}
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
              className={fieldClass}
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
              className={fieldClass}
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
              className={fieldClass}
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
              className={fieldClass}
              disabled={busy}
            />
          </div>
        </div>
      </FormShell>
    </form>
  );
}
