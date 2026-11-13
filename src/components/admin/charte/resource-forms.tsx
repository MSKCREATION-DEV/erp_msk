"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  createBrandResourceAction,
  updateBrandResourceAction,
  deleteBrandResourceAction,
} from "@/actions/brand";
import type { ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { FieldLabel } from "@/components/ui/field-label";
import { FormShell } from "@/components/ui/form-shell";
import { FileDropzone } from "@/components/admin/charte/file-dropzone";
import {
  BRAND_RESOURCE_KIND_LABELS,
  BRAND_STATUS_LABELS,
} from "@/lib/brand/labels";
import type {
  BrandItemStatus,
  BrandResourceKind,
} from "@/generated/prisma/client";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { reportActionSuccess } from "@/lib/toast/report";

const initial: ActionResult | null = null;

const KIND_OPTIONS = Object.entries(BRAND_RESOURCE_KIND_LABELS).map(
  ([value, label]) => ({ value: value as BrandResourceKind, label }),
);

const STATUS_OPTIONS = Object.entries(BRAND_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as BrandItemStatus, label }),
);

export function ResourceCreateForm() {
  const [state, action, pending] = useActionState(
    createBrandResourceAction,
    initial,
  );
  const [kind, setKind] = useState<BrandResourceKind>("ICONE");

  return (
    <FormShell
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Link
            prefetch={false}
            href="/administration/charte/ressources"
            className="inline-flex h-11 items-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium"
          >
            Annuler
          </Link>
          <Button type="submit" form="res-create" disabled={pending}>
            {pending ? "…" : "Enregistrer"}
          </Button>
        </div>
      }
    >
      <form id="res-create" action={action} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="label" required>
              Libellé
            </FieldLabel>
            <Input id="label" name="label" required disabled={pending} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel required>Catégorie</FieldLabel>
            <ChoiceCards
              name="kind"
              className="mt-2"
              columns={4}
              disabled={pending}
              value={kind}
              onChange={setKind}
              options={KIND_OPTIONS}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Input id="description" name="description" disabled={pending} />
          </div>
        </div>
        <FileDropzone
          accept="image/svg+xml,image/png,image/jpeg,image/webp,image/gif"
          required
          disabled={pending}
          hint="SVG, PNG, JPEG, WebP, GIF — max 12 Mo"
        />
        {state && !state.ok ? (
          <p className="text-sm text-msk-coral">{state.error}</p>
        ) : null}
      </form>
    </FormShell>
  );
}

export function ResourceEditForm({
  id,
  label,
  kind,
  description,
  status,
}: {
  id: string;
  label: string;
  kind: BrandResourceKind;
  description: string | null;
  status: BrandItemStatus;
}) {
  const [state, action, pending] = useActionState(
    updateBrandResourceAction,
    initial,
  );
  const [kindValue, setKindValue] = useState<BrandResourceKind>(kind);
  const [statusValue, setStatusValue] = useState<BrandItemStatus>(status);
  const confirm = useConfirm();
  useEffect(() => {
    if (state?.ok) reportActionSuccess(state.message ?? "OK");
  }, [state]);

  return (
    <div className="space-y-8">
      <form action={action} className="space-y-5">
        <input type="hidden" name="id" value={id} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="label" required>
              Libellé
            </FieldLabel>
            <Input
              id="label"
              name="label"
              defaultValue={label}
              required
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel required>Catégorie</FieldLabel>
            <ChoiceCards
              name="kind"
              className="mt-2"
              columns={4}
              disabled={pending}
              value={kindValue}
              onChange={setKindValue}
              options={KIND_OPTIONS}
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
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Input
              id="description"
              name="description"
              defaultValue={description ?? ""}
              disabled={pending}
            />
          </div>
        </div>
        {state && !state.ok ? (
          <p className="text-sm text-msk-coral">{state.error}</p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </Button>
      </form>
      <form
        action={async (fd) => {
          const ok = await confirm({
            title: "Archiver cette ressource ?",
            confirmLabel: "Confirmer l’archivage",
            tone: "danger",
          });
          if (!ok) return;
          await deleteBrandResourceAction(null, fd);
        }}
      >
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="danger">
          Archiver
        </Button>
      </form>
    </div>
  );
}
