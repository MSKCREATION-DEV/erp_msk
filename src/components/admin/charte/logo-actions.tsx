"use client";

import { useActionState, useEffect } from "react";
import {
  deleteBrandLogoAction,
  setDefaultDocumentsLogoAction,
  updateBrandLogoMetaAction,
  replaceBrandLogoFileAction,
} from "@/actions/brand";
import type { ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field-label";
import { FileDropzone } from "@/components/admin/charte/file-dropzone";
import { BRAND_LOGO_KIND_LABELS, BRAND_STATUS_LABELS } from "@/lib/brand/labels";
import type { BrandItemStatus, BrandLogoKind } from "@/generated/prisma/client";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { reportActionSuccess } from "@/lib/toast/report";

const initial: ActionResult | null = null;

export function LogoMetaForm({
  id,
  label,
  kind,
  status,
  description,
  isDefaultDocuments,
}: {
  id: string;
  label: string;
  kind: BrandLogoKind;
  status: BrandItemStatus;
  description: string | null;
  isDefaultDocuments: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateBrandLogoMetaAction,
    initial,
  );

  useEffect(() => {
    if (state?.ok) reportActionSuccess(state.message ?? "Enregistré");
  }, [state]);

  return (
    <form action={action} className="space-y-4" aria-busy={pending || undefined}>
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
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
        <div>
          <FieldLabel htmlFor="kind" required>
            Type
          </FieldLabel>
          <select
            id="kind"
            name="kind"
            defaultValue={kind}
            disabled={pending}
            className="h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            {Object.entries(BRAND_LOGO_KIND_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="status" required>
            Statut
          </FieldLabel>
          <select
            id="status"
            name="status"
            defaultValue={status}
            disabled={pending || isDefaultDocuments}
            className="h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            {Object.entries(BRAND_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {isDefaultDocuments ? (
            <p className="mt-1 text-xs text-msk-ink/45">
              Défaut documents : reste actif tant qu’il n’est pas remplacé.
            </p>
          ) : null}
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Input
            id="description"
            name="description"
            defaultValue={description ?? ""}
            disabled={pending}
            placeholder="Usage, support, contraintes…"
          />
        </div>
      </div>
      {state && !state.ok ? (
        <p className="text-sm text-msk-coral">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}

export function LogoDefaultButton({
  id,
  disabled,
}: {
  id: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(
    setDefaultDocumentsLogoAction,
    initial,
  );
  useEffect(() => {
    if (state?.ok) reportActionSuccess(state.message ?? "OK");
  }, [state]);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="secondary" disabled={pending || disabled}>
        {pending ? "…" : "Définir comme défaut documents"}
      </Button>
      {state && !state.ok ? (
        <p className="mt-2 text-sm text-msk-coral">{state.error}</p>
      ) : null}
    </form>
  );
}

export function LogoReplaceFileForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    replaceBrandLogoFileAction,
    initial,
  );
  useEffect(() => {
    if (state?.ok) reportActionSuccess(state.message ?? "OK");
  }, [state]);

  return (
    <form action={action} className="space-y-4" aria-busy={pending || undefined}>
      <input type="hidden" name="id" value={id} />
      <FileDropzone
        accept="image/svg+xml,image/png,image/jpeg,image/webp"
        required
        disabled={pending}
        label="Remplacer le fichier"
        hint="SVG, PNG, JPEG, WebP — max 8 Mo. SVG sanitizé ; PNG optimisé généré pour les PDF."
      />
      {state && !state.ok ? (
        <p className="text-sm text-msk-coral">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Traitement…" : "Remplacer le fichier"}
      </Button>
    </form>
  );
}

export function LogoArchiveButton({
  id,
  isDefaultDocuments,
}: {
  id: string;
  isDefaultDocuments: boolean;
}) {
  const confirm = useConfirm();
  const [state, action, pending] = useActionState(deleteBrandLogoAction, initial);

  if (isDefaultDocuments) {
    return (
      <p className="text-sm text-msk-ink/50">
        Archivage impossible tant que ce logo est le défaut documents.
      </p>
    );
  }

  return (
    <form
      action={async (fd) => {
        const ok = await confirm({
          title: "Archiver ce logo ?",
          description:
            "Le fichier n’est pas effacé immédiatement — le logo passe en archivé et n’est plus proposé. Les PDF déjà générés ne sont pas modifiés.",
          confirmLabel: "Confirmer l’archivage",
          tone: "danger",
        });
        if (!ok) return;
        action(fd);
      }}
    >
      <input type="hidden" name="id" value={id} />
      {state && !state.ok ? (
        <p className="mb-2 text-sm text-msk-coral">{state.error}</p>
      ) : null}
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "…" : "Archiver"}
      </Button>
    </form>
  );
}
