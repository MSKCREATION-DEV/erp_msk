"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createClientAction,
  updateClientAction,
} from "@/actions/commercial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldHint, FieldLabel } from "@/components/ui/field-label";
import { FormShell } from "@/components/ui/form-shell";
import { usePendingAction } from "@/hooks/use-pending-action";
import { cn } from "@/lib/utils";

export type ClientFormInitial = {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  country: string;
  address: string;
  notes: string;
  includeTravelDefault: boolean;
};

/**
 * Formulaire client — création (page) ou édition (modal fiche).
 * Création : `redirect()` dans `createClientAction`. Édition : retour JSON + callback.
 */
export function ClientForm({
  mode = "create",
  clientId,
  initial,
  onSuccess,
  onCancel,
  embedded = false,
}: {
  mode?: "create" | "edit";
  clientId?: string;
  initial?: Partial<ClientFormInitial>;
  onSuccess?: () => void;
  onCancel?: () => void;
  /** Modal : pas de FormShell sticky plein écran. */
  embedded?: boolean;
}) {
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const isEdit = mode === "edit";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (isEdit && clientId) fd.set("clientId", clientId);

    void run(async () => {
      if (isEdit) {
        const res = await updateClientAction(fd);
        if (!res.ok) {
          setError(res.error ?? "Échec de la mise à jour");
          return;
        }
        onSuccess?.();
        return;
      }
      // Succès : redirect() dans l’action. Erreur : return { ok: false }.
      const res = await createClientAction(fd);
      if (res && !res.ok) {
        setError(res.error ?? "Échec de la création");
      }
    });
  }

  const fields = (
    <form
      id={isEdit ? "client-edit-form" : "client-create-form"}
      onSubmit={onSubmit}
      className="space-y-8"
      noValidate
      aria-busy={pending || undefined}
    >
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-msk-ink">
            {isEdit ? "Modifier le client" : "Identité"}
          </h2>
          <p className="mt-1 text-sm text-msk-ink/50">
            {isEdit
              ? "Coordonnées utilisées sur devis et factures."
              : "Vous pourrez ensuite émettre devis et factures."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="name" required>
              Nom / entreprise
            </FieldLabel>
            <Input
              id="name"
              name="name"
              required
              disabled={pending}
              defaultValue={initial?.name ?? ""}
              placeholder="Ex. Marinas SARL"
            />
          </div>
          <div>
            <FieldLabel htmlFor="contactName">Contact</FieldLabel>
            <Input
              id="contactName"
              name="contactName"
              disabled={pending}
              defaultValue={initial?.contactName ?? ""}
              placeholder="Ex. Hassan Diallo"
            />
          </div>
          <div>
            <FieldLabel htmlFor="phone">Téléphone</FieldLabel>
            <Input
              id="phone"
              name="phone"
              disabled={pending}
              defaultValue={initial?.phone ?? ""}
              placeholder="Ex. 70 12 34 56"
            />
          </div>
          <div>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              disabled={pending}
              defaultValue={initial?.email ?? ""}
              placeholder="Ex. contact@entreprise.ml"
            />
          </div>
          <div>
            <FieldLabel htmlFor="city">Ville</FieldLabel>
            <Input
              id="city"
              name="city"
              disabled={pending}
              defaultValue={initial?.city ?? ""}
              placeholder="Ex. Bamako"
            />
          </div>
          <div>
            <FieldLabel htmlFor="country">Pays</FieldLabel>
            <Input
              id="country"
              name="country"
              disabled={pending}
              defaultValue={initial?.country ?? "ML"}
              placeholder="ML"
            />
            <FieldHint>Code pays (défaut ML).</FieldHint>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="address">Adresse</FieldLabel>
            <Input
              id="address"
              name="address"
              disabled={pending}
              defaultValue={initial?.address ?? ""}
              placeholder="Ex. ACI 2000, Bamako"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              disabled={pending}
              defaultValue={initial?.notes ?? ""}
              placeholder="Contexte commercial, préférences, infos utiles…"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-msk-ink/80">
          <input
            type="checkbox"
            name="includeTravelDefault"
            disabled={pending}
            defaultChecked={initial?.includeTravelDefault ?? false}
            className="h-4 w-4 rounded border-msk-ink/20 text-msk-blue focus:ring-msk-blue/30"
          />
          Inclure frais de déplacement par défaut
        </label>
      </section>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-msk-coral/25 bg-msk-coral/5 px-4 py-3 text-sm font-medium text-msk-coral"
        >
          {error}
        </p>
      ) : null}
    </form>
  );

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {embedded && onCancel ? (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={onCancel}
        >
          Annuler
        </Button>
      ) : (
        <Link
          prefetch={false}
          href="/commercial/clients"
          className={cn(
            "inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium text-msk-ink transition hover:bg-msk-ink/5",
            pending && "pointer-events-none opacity-50",
          )}
        >
          Annuler
        </Link>
      )}
      <Button
        type="submit"
        disabled={pending}
        form={isEdit ? "client-edit-form" : "client-create-form"}
      >
        {pending
          ? isEdit
            ? "Enregistrement…"
            : "Création…"
          : isEdit
            ? "Enregistrer"
            : "Créer le client"}
      </Button>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-6">
        {fields}
        <div className="border-t border-msk-ink/6 pt-4">{footer}</div>
      </div>
    );
  }

  return <FormShell footer={footer}>{fields}</FormShell>;
}

/** Alias rétro-compatible pour la page création. */
export function ClientCreateForm() {
  return <ClientForm mode="create" />;
}
