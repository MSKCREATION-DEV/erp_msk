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

type ItemOpt = { id: string; code: string; label: string; quantity: number };

export function SvStockMoveForm({ items }: { items: ItemOpt[] }) {
  const [state, formAction, pending] = useActionState<
    SvStockActionState,
    FormData
  >(createSvStockMovement, null);
  const today = new Date().toISOString().slice(0, 10);
  const [itemId, setItemId] = useState<string | null>(null);
  const [kind, setKind] = useState<"IN" | "OUT" | "ADJUST">("OUT");

  return (
    <form action={formAction}>
      <input type="hidden" name="itemId" value={itemId ?? ""} />
      <FormShell
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/suivi/stocks"
              className="inline-flex h-11 items-center rounded-lg border border-msk-ink/15 px-4 text-sm font-medium hover:bg-msk-chalk"
            >
              Annuler
            </Link>
            <Button type="submit" disabled={pending || !itemId}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        }
      >
        {state && !state.ok ? (
          <p className="mb-4 text-sm text-msk-coral">{state.error}</p>
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
                description: `Stock ${i.quantity}`,
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
                  { value: "IN", label: "Entrée", description: "Ajoute au stock." },
                  {
                    value: "OUT",
                    label: "Sortie",
                    description: "Retire du stock.",
                  },
                  {
                    value: "ADJUST",
                    label: "Ajustement",
                    description: "Quantité absolue.",
                  },
                ]}
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="quantity" required>
              Quantité
            </FieldLabel>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              required
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
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
              disabled={pending}
            />
          </div>
        </div>
      </FormShell>
    </form>
  );
}
