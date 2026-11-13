"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createBrandColorAction,
  updateBrandColorAction,
  duplicateBrandColorAction,
  deleteBrandColorAction,
} from "@/actions/brand";
import type { ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { FieldLabel } from "@/components/ui/field-label";
import { FormShell } from "@/components/ui/form-shell";
import {
  BRAND_COLOR_CATEGORY_LABELS,
  BRAND_STATUS_LABELS,
} from "@/lib/brand/labels";
import {
  contrastRatio,
  parseColorInput,
  wcagLevel,
} from "@/lib/brand/colors";
import type {
  BrandColorCategory,
  BrandItemStatus,
} from "@/generated/prisma/client";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { reportActionSuccess } from "@/lib/toast/report";

const initial: ActionResult | null = null;

const CATEGORY_OPTIONS = Object.entries(BRAND_COLOR_CATEGORY_LABELS).map(
  ([value, label]) => ({ value: value as BrandColorCategory, label }),
);

const STATUS_OPTIONS = Object.entries(BRAND_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as BrandItemStatus, label }),
);

export function ColorCreateForm() {
  const [state, action, pending] = useActionState(
    createBrandColorAction,
    initial,
  );
  const [color, setColor] = useState("#1D73BC");
  const [category, setCategory] = useState<BrandColorCategory>("MARQUE");
  const parsed = useMemo(() => parseColorInput(color), [color]);

  return (
    <FormShell
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Link
            prefetch={false}
            href="/administration/charte/couleurs"
            className="inline-flex h-11 items-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium"
          >
            Annuler
          </Link>
          <Button type="submit" form="color-create" disabled={pending}>
            {pending ? "…" : "Créer la couleur"}
          </Button>
        </div>
      }
    >
      <form id="color-create" action={action} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <FieldLabel htmlFor="label" required>
              Libellé
            </FieldLabel>
            <Input id="label" name="label" required disabled={pending} />
          </div>
          <div>
            <FieldLabel htmlFor="tokenKey">Clé token</FieldLabel>
            <Input
              id="tokenKey"
              name="tokenKey"
              disabled={pending}
              placeholder="ex. accent-promo"
            />
          </div>
          <div>
            <FieldLabel htmlFor="color" required>
              Couleur
            </FieldLabel>
            <div className="flex gap-2">
              <input
                type="color"
                value={parsed?.hex ?? "#1D73BC"}
                onChange={(e) => setColor(e.target.value)}
                disabled={pending}
                className="h-11 w-14 cursor-pointer rounded-lg border border-msk-ink/15 bg-white p-1"
                aria-label="Sélecteur"
              />
              <Input
                id="color"
                name="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={pending}
                placeholder="#1D73BC ou rgb(…)"
                required
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="usageNotes">Usages</FieldLabel>
            <Input id="usageNotes" name="usageNotes" disabled={pending} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel required>Catégorie</FieldLabel>
            <ChoiceCards
              name="category"
              className="mt-2"
              columns={4}
              disabled={pending}
              value={category}
              onChange={setCategory}
              options={CATEGORY_OPTIONS}
            />
          </div>
        </div>
        {parsed ? (
          <ColorPreview hex={parsed.hex} />
        ) : (
          <p className="text-sm text-msk-coral">Format couleur non reconnu</p>
        )}
        {state && !state.ok ? (
          <p className="text-sm text-msk-coral">{state.error}</p>
        ) : null}
      </form>
    </FormShell>
  );
}

function ColorPreview({ hex }: { hex: string }) {
  const onChalk = contrastRatio(hex, "#F5F3EF");
  const onInk = contrastRatio(hex, "#0D1330");
  const onWhite = contrastRatio(hex, "#FFFFFF");
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <PreviewSwatch
        label="Sur craie"
        fg={hex}
        bg="#F5F3EF"
        ratio={onChalk}
      />
      <PreviewSwatch label="Sur encre" fg={hex} bg="#0D1330" ratio={onInk} />
      <PreviewSwatch label="Sur blanc" fg={hex} bg="#FFFFFF" ratio={onWhite} />
    </div>
  );
}

function PreviewSwatch({
  label,
  fg,
  bg,
  ratio,
}: {
  label: string;
  fg: string;
  bg: string;
  ratio: number | null;
}) {
  const level = ratio != null ? wcagLevel(ratio) : "fail";
  return (
    <div
      className="rounded-xl border border-msk-ink/8 p-3"
      style={{ backgroundColor: bg, color: fg }}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs opacity-80">
        Contraste {ratio ?? "—"} · {level}
      </p>
    </div>
  );
}

export function ColorEditForm({
  id,
  label,
  hex,
  category,
  usageNotes,
  status,
  isReference,
}: {
  id: string;
  label: string;
  hex: string;
  category: BrandColorCategory;
  usageNotes: string | null;
  status: BrandItemStatus;
  isReference: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateBrandColorAction,
    initial,
  );
  const [color, setColor] = useState(hex);
  const [categoryValue, setCategoryValue] = useState<BrandColorCategory>(
    category,
  );
  const [statusValue, setStatusValue] = useState<BrandItemStatus>(status);
  const parsed = useMemo(() => parseColorInput(color), [color]);
  const confirm = useConfirm();

  useEffect(() => {
    if (state?.ok) reportActionSuccess(state.message ?? "OK");
  }, [state]);

  return (
    <div className="space-y-8">
      <form action={action} className="space-y-5" aria-busy={pending || undefined}>
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
            <FieldLabel htmlFor="color" required>
              Couleur
            </FieldLabel>
            <div className="flex gap-2">
              <input
                type="color"
                value={parsed?.hex ?? hex}
                onChange={(e) => setColor(e.target.value)}
                disabled={pending}
                className="h-11 w-14 cursor-pointer rounded-lg border border-msk-ink/15 bg-white p-1"
                aria-label="Sélecteur"
              />
              <Input
                id="color"
                name="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={pending}
                required
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="usageNotes">Usages</FieldLabel>
            <Input
              id="usageNotes"
              name="usageNotes"
              defaultValue={usageNotes ?? ""}
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel required>Catégorie</FieldLabel>
            <ChoiceCards
              name="category"
              className="mt-2"
              columns={4}
              disabled={pending}
              value={categoryValue}
              onChange={setCategoryValue}
              options={CATEGORY_OPTIONS}
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
        </div>
        {isReference ? (
          <label className="flex items-start gap-2 text-sm text-msk-ink/75">
            <input
              type="checkbox"
              name="confirmReferenceChange"
              className="mt-1 size-4 rounded border-msk-ink/20 text-msk-blue"
              disabled={pending}
            />
            Confirmer la modification d’une couleur de référence MSK (impact
            design system / PDF).
          </label>
        ) : null}
        {parsed ? <ColorPreview hex={parsed.hex} /> : null}
        {state && !state.ok ? (
          <p className="text-sm text-msk-coral">{state.error}</p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </Button>
      </form>

      <div className="flex flex-wrap gap-3 border-t border-msk-ink/6 pt-6">
        <form
          action={async (fd) => {
            await duplicateBrandColorAction(null, fd);
          }}
        >
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="secondary">
            Dupliquer
          </Button>
        </form>
        {!isReference ? (
          <form
            action={async (fd) => {
              const ok = await confirm({
                title: "Archiver cette couleur ?",
                description: "Elle ne sera plus proposée ni injectée en CSS.",
                confirmLabel: "Confirmer l’archivage",
                tone: "danger",
              });
              if (!ok) return;
              await deleteBrandColorAction(null, fd);
            }}
          >
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="danger">
              Archiver
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
