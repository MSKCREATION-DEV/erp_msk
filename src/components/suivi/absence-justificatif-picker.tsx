"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { cn } from "@/lib/utils";

export const SV_ABSENCE_JUSTIF_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const SV_ABSENCE_JUSTIF_MAX_BYTES = 8 * 1024 * 1024;

export function formatJustificatifSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function justificatifTypeLabel(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime === "image/jpeg") return "JPEG";
  if (mime === "image/png") return "PNG";
  if (mime === "image/webp") return "WebP";
  return mime || "Fichier";
}

export function validateJustificatifFile(file: File): string | null {
  if (file.size <= 0) return "Fichier vide.";
  if (file.size > SV_ABSENCE_JUSTIF_MAX_BYTES) {
    return "Fichier trop volumineux (max 8 Mo).";
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return "Type non autorisé (PDF, JPEG, PNG ou WebP).";
  }
  return null;
}

type Phase = "empty" | "reading" | "ready" | "confirmed";

/**
 * Dropzone justificatif absence — choisir ≠ valider.
 * Aperçu + confirmation explicite avant que le fichier soit « accepté ».
 *
 * DOM absolu : rien n’est démonté selon `phase` (input file, dropzone,
 * preview, barres d’actions). Unmount conditionnel + extensions autofill
 * → NotFoundError removeChild. Réf. 4995270 / 3c2933d.
 */
export function AbsenceJustificatifPicker({
  confirmedFile,
  onConfirmedChange,
  disabled = false,
  required = false,
  label = "Justificatif",
  hint = "PDF ou image — max 8 Mo. Classé en GED seulement après confirmation.",
  /**
   * Si true : pas de bouton confirm interne — le parent confirme
   * (ex. footer modal « Confirmer l’ajout »).
   */
  deferConfirm = false,
  onDraftReadyChange,
}: {
  confirmedFile: File | null;
  onConfirmedChange: (file: File | null) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  hint?: string;
  deferConfirm?: boolean;
  /** Notifie le parent quand un brouillon est prêt à confirmer. */
  onDraftReadyChange?: (file: File | null) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draft, setDraft] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>(
    confirmedFile ? "confirmed" : "empty",
  );
  const [error, setError] = useState<string | null>(null);
  const readToken = useRef(0);
  /** Ref miroir de `disabled` — le file input n’est jamais disabled (évite
   * remaniement DOM / extensions autour d’un input file disabled). */
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    if (confirmedFile) {
      setPhase("confirmed");
      setDraft(null);
      setError(null);
      onDraftReadyChange?.(null);
    } else if (phase === "confirmed") {
      setPhase("empty");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync externe confirmedFile
  }, [confirmedFile]);

  function clearInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  function resetDraft() {
    readToken.current += 1;
    setDraft(null);
    setPhase(confirmedFile ? "confirmed" : "empty");
    setError(null);
    clearInput();
    onDraftReadyChange?.(null);
  }

  function pickFile(file: File | null) {
    if (!file || disabledRef.current) return;
    const err = validateJustificatifFile(file);
    if (err) {
      setError(err);
      setDraft(null);
      setPhase(confirmedFile ? "confirmed" : "empty");
      clearInput();
      onDraftReadyChange?.(null);
      return;
    }

    const token = ++readToken.current;
    setError(null);
    setDraft(file);
    setPhase("reading");
    onDraftReadyChange?.(null);

    // Vérification locale (pas d’OCR) — feedback « lecture » court.
    window.setTimeout(() => {
      if (token !== readToken.current) return;
      setPhase("ready");
      if (deferConfirm) {
        onDraftReadyChange?.(file);
      }
    }, 350);
  }

  function confirmDraft() {
    if (!draft || phase !== "ready" || disabledRef.current) return;
    onConfirmedChange(draft);
    setDraft(null);
    setPhase("confirmed");
    clearInput();
    onDraftReadyChange?.(null);
  }

  function clearConfirmed() {
    onConfirmedChange(null);
    resetDraft();
    setPhase("empty");
  }

  const showDropzone =
    phase === "empty" || (phase === "confirmed" && !confirmedFile);
  const previewFile =
    phase === "confirmed" && confirmedFile
      ? confirmedFile
      : draft;
  const showPreview = Boolean(previewFile && phase !== "empty");
  const busy = disabled || phase === "reading";
  const showRemove = phase === "ready" || phase === "confirmed";
  const showConfirmActions = phase === "ready" && !deferConfirm;
  const showDeferActions = phase === "ready" && deferConfirm;
  const showConfirmedActions = phase === "confirmed";
  const isReading = phase === "reading";

  return (
    <div className="space-y-3">
      <FieldLabel htmlFor={inputId} required={required}>
        {label}
      </FieldLabel>

      {/*
        Input file TOUJOURS monté, JAMAIS disabled, clé stable, hors
        du dropzone. Monter/démonter / disabled toggle + extensions
        → NotFoundError removeChild.
      */}
      <input
        key="sv-absence-justif-file"
        ref={inputRef}
        id={inputId}
        type="file"
        accept={SV_ABSENCE_JUSTIF_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          pickFile(f);
        }}
      />

      {/* Dropzone : cacher, ne pas démonter. */}
      <div
        key="sv-absence-justif-dropzone"
        role="button"
        tabIndex={showDropzone && !busy ? 0 : -1}
        hidden={!showDropzone}
        aria-hidden={!showDropzone}
        aria-controls={inputId}
        aria-label="Déposer le justificatif ou parcourir"
        onKeyDown={(e) => {
          if (!showDropzone || busy) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (showDropzone && !busy) inputRef.current?.click();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (showDropzone && !busy) setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (showDropzone && !busy) setDragOver(true);
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
          if (!showDropzone || busy) return;
          pickFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition sm:py-10",
          !showDropzone && "hidden",
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
            Déposer le justificatif
          </p>
          <p className="text-xs text-msk-ink/45">{hint}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy || !showDropzone}
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Parcourir
        </Button>
      </div>

      {/* Aperçu + actions : TOUT toujours monté, visible via hidden. */}
      <div
        key="sv-absence-justif-preview"
        hidden={!showPreview}
        aria-hidden={!showPreview}
        className={cn(
          "rounded-xl border px-4 py-3 transition",
          !showPreview && "hidden",
          isReading
            ? "border-msk-blue/25 bg-msk-blue/5"
            : phase === "confirmed"
              ? "border-msk-blue/20 bg-msk-blue/5"
              : "border-msk-ink/10 bg-msk-chalk/30",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              "bg-msk-blue/10 text-msk-blue",
            )}
          >
            <Loader2
              key="justif-icon-reading"
              className={cn(
                "h-5 w-5 animate-spin",
                !isReading && "hidden",
              )}
              aria-hidden={!isReading}
            />
            <FileText
              key="justif-icon-file"
              className={cn("h-5 w-5", isReading && "hidden")}
              aria-hidden={isReading}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-msk-ink">
              {previewFile?.name ?? "—"}
            </p>
            <p className="mt-0.5 text-xs text-msk-ink/45">
              {previewFile
                ? `${formatJustificatifSize(previewFile.size)} · ${justificatifTypeLabel(previewFile.type)}`
                : null}
              <span
                key="justif-status-reading"
                hidden={!isReading}
                className={cn(!isReading && "hidden")}
              >
                {" "}
                · Vérification du fichier…
              </span>
              <span
                key="justif-status-confirmed"
                hidden={phase !== "confirmed"}
                className={cn(phase !== "confirmed" && "hidden")}
              >
                {" "}
                · Prêt à enregistrer
              </span>
            </p>
          </div>
          <div
            key="justif-remove-wrap"
            hidden={!showRemove}
            aria-hidden={!showRemove}
            className={cn(
              "flex shrink-0 items-center gap-2",
              !showRemove && "hidden",
            )}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || !showRemove}
              aria-label="Retirer le fichier"
              className="px-2 text-msk-ink/50 hover:text-msk-coral"
              onClick={() => {
                if (phase === "confirmed") clearConfirmed();
                else resetDraft();
              }}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div
          key="justif-actions-confirm"
          hidden={!showConfirmActions}
          aria-hidden={!showConfirmActions}
          className={cn(
            "mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-msk-ink/6 pt-3",
            !showConfirmActions && "hidden",
          )}
        >
          <p className="text-xs text-msk-ink/50">
            Vérifiez le fichier, puis confirmez avant enregistrement.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled || !showConfirmActions}
              onClick={resetDraft}
            >
              Changer
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={disabled || !showConfirmActions}
              onClick={confirmDraft}
            >
              Confirmer l’ajout du justificatif
            </Button>
          </div>
        </div>

        <div
          key="justif-actions-defer"
          hidden={!showDeferActions}
          aria-hidden={!showDeferActions}
          className={cn(
            "mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-msk-ink/6 pt-3",
            !showDeferActions && "hidden",
          )}
        >
          <p className="text-xs text-msk-ink/50">
            Vérifiez le fichier, puis confirmez ci-dessous.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || !showDeferActions}
            onClick={resetDraft}
          >
            Changer
          </Button>
        </div>

        <div
          key="justif-actions-confirmed"
          hidden={!showConfirmedActions}
          aria-hidden={!showConfirmedActions}
          className={cn(
            "mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-msk-ink/6 pt-3",
            !showConfirmedActions && "hidden",
          )}
        >
          <p className="text-xs font-medium text-msk-blue">
            Justificatif confirmé — il sera lié à l’enregistrement.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || !showConfirmedActions}
            onClick={() => {
              clearConfirmed();
              inputRef.current?.click();
            }}
          >
            Changer de fichier
          </Button>
        </div>
      </div>

      <p
        key="justif-error"
        hidden={!error}
        aria-hidden={!error}
        className={cn(
          "rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral",
          !error && "hidden",
        )}
        role={error ? "alert" : undefined}
      >
        {error ?? ""}
      </p>
    </div>
  );
}
