"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createBrandLogoAction } from "@/actions/brand";
import type { ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field-label";
import { FormShell } from "@/components/ui/form-shell";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { FileDropzone } from "@/components/admin/charte/file-dropzone";
import { BRAND_LOGO_KIND_LABELS } from "@/lib/brand/labels";
import type { BrandLogoKind } from "@/generated/prisma/client";

const initial: ActionResult | null = null;

const KIND_OPTIONS = Object.entries(BRAND_LOGO_KIND_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export function LogoCreateForm() {
  const [state, action, pending] = useActionState(
    createBrandLogoAction,
    initial,
  );
  const [kind, setKind] = useState<BrandLogoKind>("DOCUMENTS");

  return (
    <FormShell
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            prefetch={false}
            href="/administration/charte/logos"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
          >
            Annuler
          </Link>
          <Button type="submit" form="logo-create" disabled={pending}>
            {pending ? "Traitement…" : "Enregistrer le logo"}
          </Button>
        </div>
      }
    >
      <form
        id="logo-create"
        action={action}
        className="space-y-6"
        aria-busy={pending || undefined}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="label" required>
              Libellé
            </FieldLabel>
            <Input
              id="label"
              name="label"
              required
              disabled={pending}
              placeholder="Ex. Lockup documents couleur"
            />
          </div>
          <div>
            <input type="hidden" name="kind" value={kind} />
            <OptionPickerSingle
              label="Type"
              required
              disabled={pending}
              options={KIND_OPTIONS}
              value={kind}
              onChange={(v) => setKind((v as BrandLogoKind) ?? "AUTRE")}
              placeholder="Choisir un type"
              modalTitle="Type de logo"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Input
              id="description"
              name="description"
              disabled={pending}
              placeholder="Usage prévu (PDF, e-mail, favicon…)"
            />
          </div>
        </div>

        <FileDropzone
          accept="image/svg+xml,image/png,image/jpeg,image/webp"
          required
          disabled={pending}
          hint="SVG, PNG, JPEG, WebP — max 8 Mo"
        />

        <label className="flex items-center gap-2 text-sm text-msk-ink/80">
          <input
            type="checkbox"
            name="isDefaultDocuments"
            disabled={pending}
            className="size-4 rounded border-msk-ink/20 text-msk-blue focus:ring-msk-blue/30"
          />
          Définir comme logo défaut pour les documents / PDF
        </label>

        {state && !state.ok ? (
          <p className="text-sm text-msk-coral">{state.error}</p>
        ) : null}
      </form>
    </FormShell>
  );
}
