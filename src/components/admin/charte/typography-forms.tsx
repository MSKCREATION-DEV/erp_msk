"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  createBrandTypographyAction,
  updateBrandTypographyAction,
  addBrandFontFileAction,
} from "@/actions/brand";
import type { ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { FieldLabel } from "@/components/ui/field-label";
import { FormShell } from "@/components/ui/form-shell";
import { FileDropzone } from "@/components/admin/charte/file-dropzone";
import {
  BRAND_STATUS_LABELS,
  BRAND_TYPO_ROLE_LABELS,
} from "@/lib/brand/labels";
import type {
  BrandItemStatus,
  BrandTypographyRole,
} from "@/generated/prisma/client";
import { reportActionSuccess } from "@/lib/toast/report";

const initial: ActionResult | null = null;

const ROLE_OPTIONS = Object.entries(BRAND_TYPO_ROLE_LABELS).map(
  ([value, label]) => ({ value: value as BrandTypographyRole, label }),
);

const STATUS_OPTIONS = Object.entries(BRAND_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as BrandItemStatus, label }),
);

const STYLE_OPTIONS: { value: "normal" | "italic"; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "italic", label: "Italique" },
];

export function TypographyCreateForm() {
  const [state, action, pending] = useActionState(
    createBrandTypographyAction,
    initial,
  );
  const [role, setRole] = useState<BrandTypographyRole>("UI");
  const [style, setStyle] = useState<"normal" | "italic">("normal");

  return (
    <FormShell
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Link
            prefetch={false}
            href="/administration/charte/typographies"
            className="inline-flex h-11 items-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium"
          >
            Annuler
          </Link>
          <Button type="submit" form="typo-create" disabled={pending}>
            {pending ? "…" : "Créer"}
          </Button>
        </div>
      }
    >
      <form id="typo-create" action={action} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <FieldLabel htmlFor="familyName" required>
              Famille
            </FieldLabel>
            <Input
              id="familyName"
              name="familyName"
              required
              disabled={pending}
              placeholder="Ex. Jost"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <FieldLabel required>Rôle</FieldLabel>
            <ChoiceCards
              name="role"
              className="mt-2"
              columns={3}
              disabled={pending}
              value={role}
              onChange={setRole}
              options={ROLE_OPTIONS}
            />
          </div>
          <div>
            <FieldLabel htmlFor="cssStack">Stack CSS</FieldLabel>
            <Input
              id="cssStack"
              name="cssStack"
              disabled={pending}
              placeholder="Famille, fallback…"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <Input id="notes" name="notes" disabled={pending} />
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isDefaultErp" disabled={pending} />
            Défaut ERP
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isDefaultPdf" disabled={pending} />
            Défaut PDF
          </label>
        </div>
        <FileDropzone
          accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
          disabled={pending}
          label="Fichier police (optionnel)"
          hint="WOFF2 / WOFF / TTF / OTF — max 4 Mo"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="weight">Graisse</FieldLabel>
            <Input
              id="weight"
              name="weight"
              type="number"
              defaultValue={400}
              disabled={pending}
            />
          </div>
          <div>
            <FieldLabel required>Style</FieldLabel>
            <ChoiceCards
              name="style"
              className="mt-2"
              columns={2}
              disabled={pending}
              value={style}
              onChange={setStyle}
              options={STYLE_OPTIONS}
            />
          </div>
        </div>
        {state && !state.ok ? (
          <p className="text-sm text-msk-coral">{state.error}</p>
        ) : null}
      </form>
    </FormShell>
  );
}

export function TypographyEditForm({
  id,
  familyName,
  role,
  notes,
  cssStack,
  status,
  isDefaultErp,
  isDefaultPdf,
}: {
  id: string;
  familyName: string;
  role: BrandTypographyRole;
  notes: string | null;
  cssStack: string | null;
  status: BrandItemStatus;
  isDefaultErp: boolean;
  isDefaultPdf: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateBrandTypographyAction,
    initial,
  );
  const [roleValue, setRoleValue] = useState<BrandTypographyRole>(role);
  const [statusValue, setStatusValue] = useState<BrandItemStatus>(status);
  useEffect(() => {
    if (state?.ok) reportActionSuccess(state.message ?? "OK");
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <FieldLabel htmlFor="familyName" required>
            Famille
          </FieldLabel>
          <Input
            id="familyName"
            name="familyName"
            defaultValue={familyName}
            required
            disabled={pending}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <FieldLabel required>Rôle</FieldLabel>
          <ChoiceCards
            name="role"
            className="mt-2"
            columns={3}
            disabled={pending}
            value={roleValue}
            onChange={setRoleValue}
            options={ROLE_OPTIONS}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <FieldLabel required>Statut</FieldLabel>
          <ChoiceCards
            name="status"
            className="mt-2"
            columns={3}
            disabled={pending}
            value={statusValue}
            onChange={setStatusValue}
            options={STATUS_OPTIONS}
          />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="cssStack">Stack CSS</FieldLabel>
          <Input
            id="cssStack"
            name="cssStack"
            defaultValue={cssStack ?? ""}
            disabled={pending}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Input
            id="notes"
            name="notes"
            defaultValue={notes ?? ""}
            disabled={pending}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isDefaultErp"
            defaultChecked={isDefaultErp}
            disabled={pending}
          />
          Défaut ERP
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isDefaultPdf"
            defaultChecked={isDefaultPdf}
            disabled={pending}
          />
          Défaut PDF
        </label>
      </div>
      {state && !state.ok ? (
        <p className="text-sm text-msk-coral">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Enregistrer"}
      </Button>
    </form>
  );
}

export function FontFileUploadForm({ typographyId }: { typographyId: string }) {
  const [state, action, pending] = useActionState(
    addBrandFontFileAction,
    initial,
  );
  const [style, setStyle] = useState<"normal" | "italic">("normal");
  useEffect(() => {
    if (state?.ok) reportActionSuccess(state.message ?? "OK");
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="typographyId" value={typographyId} />
      <FileDropzone
        accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff"
        required
        disabled={pending}
        label="Ajouter une graisse"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="weight">Graisse</FieldLabel>
          <Input
            id="weight"
            name="weight"
            type="number"
            defaultValue={400}
            disabled={pending}
          />
        </div>
        <div>
          <FieldLabel required>Style</FieldLabel>
          <ChoiceCards
            name="style"
            className="mt-2"
            columns={2}
            disabled={pending}
            value={style}
            onChange={setStyle}
            options={STYLE_OPTIONS}
          />
        </div>
      </div>
      {state && !state.ok ? (
        <p className="text-sm text-msk-coral">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Uploader"}
      </Button>
    </form>
  );
}
