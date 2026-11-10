"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createSvStockMovement,
  type SvStockActionState,
} from "@/actions/suivi/stock";
import { FormShell } from "@/components/ui/form-shell";
import { FieldLabel } from "@/components/ui/field-label";
import { Button } from "@/components/ui/button";

type ItemOpt = { id: string; code: string; label: string; quantity: number };

export function SvStockMoveForm({ items }: { items: ItemOpt[] }) {
  const [state, formAction, pending] = useActionState<
    SvStockActionState,
    FormData
  >(createSvStockMovement, null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction}>
      <FormShell
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/suivi/stocks"
              className="inline-flex h-11 items-center rounded-lg border border-msk-ink/15 px-4 text-sm font-medium hover:bg-msk-chalk"
            >
              Annuler
            </Link>
            <Button type="submit" disabled={pending}>
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
            <FieldLabel htmlFor="itemId" required>
              Article
            </FieldLabel>
            <select
              id="itemId"
              name="itemId"
              required
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            >
              <option value="">Choisir…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} — {i.label} (stock {i.quantity})
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="kind" required>
              Type
            </FieldLabel>
            <select
              id="kind"
              name="kind"
              required
              defaultValue="OUT"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            >
              <option value="IN">Entrée</option>
              <option value="OUT">Sortie</option>
              <option value="ADJUST">Ajustement (qty absolue)</option>
            </select>
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
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="note">Note</FieldLabel>
            <input
              id="note"
              name="note"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </FormShell>
    </form>
  );
}
