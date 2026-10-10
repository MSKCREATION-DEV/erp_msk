"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ChevronRight, Shield, Users } from "lucide-react";
import { inviteUserAction } from "@/actions/users";
import type { ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SideDrawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GroupPicker, type GroupOption } from "@/components/admin/group-picker";
import { PackPicker, type PackOption } from "@/components/admin/pack-picker";

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
  const [accessOpen, setAccessOpen] = useState(false);
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const selectedPacks = packs.filter((p) => selectedPackIds.includes(p.id));
  const selectedGroups = groups.filter((g) => selectedGroupIds.includes(g.id));

  return (
    <form action={action} className="space-y-6">
      {selectedPackIds.map((id) => (
        <input key={`p-${id}`} type="hidden" name="packIds" value={id} />
      ))}
      {selectedGroupIds.map((id) => (
        <input key={`g-${id}`} type="hidden" name="groupIds" value={id} />
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
          <CardDescription>
            Coordonnées professionnelles du collaborateur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                name="firstName"
                required
                autoComplete="given-name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                name="lastName"
                required
                autoComplete="family-name"
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail professionnel</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" type="tel" autoComplete="tel" />
            </div>
          </div>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={() => setAccessOpen(true)}
        className="group w-full text-left"
      >
        <Card className="cursor-pointer transition hover:border-msk-blue/30 hover:shadow-md hover:shadow-msk-blue/5">
          <CardHeader className="pb-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-msk-blue/10 text-msk-blue">
                  <Shield className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle>Packs & groupes</CardTitle>
                  <CardDescription>
                    {selectedPacks.length || selectedGroups.length
                      ? `${selectedPacks.length} pack(s) · ${selectedGroups.length} groupe(s)`
                      : "Configurer les accès de l’invitation"}
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-msk-ink/25 transition group-hover:text-msk-blue" />
            </div>
          </CardHeader>
          {(selectedPacks.length > 0 || selectedGroups.length > 0) && (
            <CardContent className="pt-3">
              <div className="flex flex-wrap gap-1.5">
                {selectedPacks.map((p) => (
                  <span
                    key={p.id}
                    className="rounded-md bg-msk-blue/10 px-2 py-0.5 text-xs font-medium text-msk-blue"
                  >
                    {p.name}
                  </span>
                ))}
                {selectedGroups.map((g) => (
                  <span
                    key={g.id}
                    className="rounded-md bg-msk-ink/5 px-2 py-0.5 text-xs font-medium text-msk-ink/70"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </button>

      <SideDrawer
        open={accessOpen}
        onOpenChange={setAccessOpen}
        title="Accès de l’invitation"
        description="Multi-sélection. Chaque groupe apporte son pack défaut. Direction ≠ Admin plateforme."
        wide
        footer={
          <Button type="button" className="w-full" onClick={() => setAccessOpen(false)}>
            Valider la sélection
          </Button>
        }
      >
        <div className="space-y-6">
          <section>
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-msk-ink">
              <Shield className="h-4 w-4 text-msk-blue" />
              Packs directs
            </h3>
            <p className="mb-3 text-xs text-msk-ink/45">
              Cochez un ou plusieurs packs (chaque pack = bundle de permissions).
            </p>
            <PackPicker
              packs={packs}
              defaultSelected={selectedPackIds}
              compact
              onChange={setSelectedPackIds}
            />
          </section>
          <section>
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-msk-ink">
              <Users className="h-4 w-4 text-msk-blue" />
              Groupes
            </h3>
            <p className="mb-3 text-xs text-msk-ink/45">
              Cochez un ou plusieurs groupes — le pack défaut s’ajoute aux droits.
            </p>
            <GroupPicker
              groups={groups}
              defaultSelected={selectedGroupIds}
              onChange={setSelectedGroupIds}
            />
          </section>
        </div>
      </SideDrawer>

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
          <Link prefetch={false}
            href="/administration/utilisateurs"
            className="cursor-pointer font-medium text-msk-blue hover:underline"
          >
            Voir la liste
          </Link>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Envoi de l’invitation…" : "Envoyer l’invitation"}
        </Button>
        <Link prefetch={false} href="/administration/utilisateurs">
          <Button type="button" variant="secondary" size="lg">
            Annuler
          </Button>
        </Link>
      </div>
    </form>
  );
}
