"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createSvStockMovement,
  type SvStockActionState,
} from "@/actions/suivi/stock";
import { FormShell } from "@/components/ui/form-shell";
import { FieldLabel } from "@/components/ui/field-label";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { useActionStateToast } from "@/hooks/use-action-state-toast";

type ItemOpt = {
  id: string;
  code: string;
  label: string;
  quantity: number;
  unit: string;
};

export function SvStockMoveForm({
  items,
  defaultItemId,
}: {
  items: ItemOpt[];
  defaultItemId?: string;
}) {
  const [state, formAction, pending] = useActionState<
    SvStockActionState,
    FormData
  >(createSvStockMovement, null);
  useActionStateToast(state);

  const today = new Date().toISOString().slice(0, 10);
  const [itemId, setItemId] = useState<string | null>(defaultItemId ?? null);
  const [kind, setKind] = useState<"IN" | "OUT" | "ADJUST">("OUT");
  const selected = items.find((i) => i.id === itemId);

  const qtyLabel =
    kind === "ADJUST" ? "Nouvelle quantité (absolue)" : "Quantité";
  const qtyPlaceholder =
    kind === "ADJUST"
      ? selected
        ? `Actuel : ${selected.quantity} ${selected.unit}`
        : "Niveau cible"
      : "Ex. 2";

  const cancelHref = itemId
    ? `/suivi/stocks/${itemId}`
    : "/suivi/stocks";

  return (
    <form action={formAction}>
      <input type="hidden" name="itemId" value={itemId ?? ""} />
      <FormShell
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href={cancelHref}
              className="inline-flex h-11 items-center rounded-lg border border-msk-ink/15 px-4 text-sm font-medium hover:bg-msk-chalk"
            >
              Annuler
            </Link>
            <Button type="submit" disabled={pending || !itemId}>
              {pending ? "Enregistrement…" : "Enregistrer le mouvement"}
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
          <div className="sm:col-span-2">
            <OptionPickerSingle
              label="Article"
              required
              value={itemId}
              onChange={setItemId}
              options={items.map((i) => ({
                value: i.id,
                label: `${i.code} — ${i.label}`,
                description: `Stock ${i.quantity} ${i.unit}`,
              }))}
              placeholder="Choisir un article…"
              modalTitle="Article stock"
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel required>Type</FieldLabel>
            <div className="mt-2">
              <ChoiceCards
                name="kind"
                value={kind}
                onChange={setKind}
                disabled={pending}
                columns={3}
                options={[
                  {
                    value: "IN",
                    label: "Entrée",
                    description: "Ajoute au stock.",
                  },
                  {
                    value: "OUT",
                    label: "Sortie",
                    description: "Retire du stock.",
                  },
                  {
                    value: "ADJUST",
                    label: "Ajustement",
                    description: "Quantité absolue cible.",
                  },
                ]}
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="quantity" required>
              {qtyLabel}
            </FieldLabel>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min={kind === "ADJUST" ? 0 : 1}
              required
              placeholder={qtyPlaceholder}
              defaultValue={
                kind === "ADJUST" && selected
                  ? String(selected.quantity)
                  : undefined
              }
              key={`${kind}-${itemId ?? "none"}`}
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
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
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="note">Note</FieldLabel>
            <input
              id="note"
              name="note"
              placeholder="Motif, destinataire…"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
            />
          </div>
        </div>
      </FormShell>
    </form>
  );
}
