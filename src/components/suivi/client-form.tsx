"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createSvClient,
  updateSvClient,
  type SvClientActionState,
} from "@/actions/suivi/clients";
import { FormShell } from "@/components/ui/form-shell";
import { FieldLabel } from "@/components/ui/field-label";
import { Button } from "@/components/ui/button";
import { useActionStateToast } from "@/hooks/use-action-state-toast";

type Initial = {
  name?: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  notes?: string | null;
};

export function SvClientForm({
  mode,
  clientId,
  initial,
}: {
  mode: "create" | "edit";
  clientId?: string;
  initial?: Initial;
}) {
  const action =
    mode === "create"
      ? createSvClient
      : updateSvClient.bind(null, clientId!);

  const [state, formAction, pending] = useActionState<
    SvClientActionState,
    FormData
  >(action, null);
  useActionStateToast(state);

  return (
    <form action={formAction}>
      <FormShell
        footer={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href={clientId ? `/suivi/clients/${clientId}` : "/suivi/clients"}
              className="inline-flex h-11 items-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
            >
              Annuler
            </Link>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Enregistrement…"
                : mode === "create"
                  ? "Créer le client"
                  : "Enregistrer"}
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
          <div className="sm:col-span-2 lg:col-span-1">
            <FieldLabel htmlFor="name" required>
              Nom
            </FieldLabel>
            <input
              id="name"
              name="name"
              required
              defaultValue={initial?.name ?? ""}
              placeholder="Ex. ECOSOL"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <FieldLabel htmlFor="contactName">Contact</FieldLabel>
            <input
              id="contactName"
              name="contactName"
              defaultValue={initial?.contactName ?? ""}
              placeholder="Ex. M. DOUCOURE"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={initial?.email ?? ""}
              placeholder="contact@exemple.ml"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <FieldLabel htmlFor="phone">Téléphone</FieldLabel>
            <input
              id="phone"
              name="phone"
              defaultValue={initial?.phone ?? ""}
              placeholder="+223 …"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <FieldLabel htmlFor="city">Ville</FieldLabel>
            <input
              id="city"
              name="city"
              defaultValue={initial?.city ?? ""}
              placeholder="Bamako"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <FieldLabel htmlFor="country">Pays</FieldLabel>
            <input
              id="country"
              name="country"
              defaultValue={initial?.country ?? ""}
              placeholder="Mali"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={initial?.notes ?? ""}
              placeholder="Contexte métier…"
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </FormShell>
    </form>
  );
}
