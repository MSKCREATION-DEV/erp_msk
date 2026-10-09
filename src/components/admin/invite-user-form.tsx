"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inviteUserAction } from "@/actions/users";
import type { ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GroupPicker, type GroupOption } from "@/components/admin/group-picker";
import { PackPicker, type PackOption } from "@/components/admin/pack-picker";
import { Surface } from "@/components/ui/surface";

export function InviteUserForm({
  groups,
  packs,
}: {
  groups: GroupOption[];
  packs: PackOption[];
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    inviteUserAction,
    null,
  );

  return (
    <form action={action} className="space-y-6">
      <Surface className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-msk-ink/40">
          Identité
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName">Prénom</Label>
            <Input id="firstName" name="firstName" required autoComplete="given-name" />
          </div>
          <div>
            <Label htmlFor="lastName">Nom</Label>
            <Input id="lastName" name="lastName" required autoComplete="family-name" />
          </div>
          <div>
            <Label htmlFor="email">E-mail professionnel</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" />
          </div>
        </div>
      </Surface>

      <Surface className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-msk-ink/40">
          Packs de permissions
        </h2>
        <p className="mt-1 mb-4 text-sm text-msk-ink/50">
          Capacités métier assignées directement. Direction ≠ Admin plateforme.
        </p>
        <PackPicker packs={packs} />
      </Surface>

      <Surface className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-msk-ink/40">
          Groupes organisationnels
        </h2>
        <p className="mt-1 mb-4 text-sm text-msk-ink/50">
          Appartenances. Un pack défaut peut être hérité du groupe.
        </p>
        <GroupPicker groups={groups} />
      </Surface>

      {state?.error ? (
        <p
          className="rounded-xl border border-msk-coral/30 bg-msk-coral/5 px-4 py-3 text-sm text-msk-coral"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state?.ok && state.message ? (
        <p
          className="rounded-xl border border-msk-blue/20 bg-msk-blue/5 px-4 py-3 text-sm text-msk-ink"
          role="status"
        >
          {state.message}{" "}
          <Link
            href="/administration/utilisateurs"
            className="font-medium text-msk-blue hover:underline"
          >
            Voir la liste
          </Link>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Envoi de l’invitation…" : "Envoyer l’invitation"}
        </Button>
        <Link href="/administration/utilisateurs">
          <Button type="button" variant="secondary" size="lg">
            Annuler
          </Button>
        </Link>
      </div>
    </form>
  );
}
