"use client";

import { useActionState, useEffect, useState } from "react";
import {
  ChevronRight,
  KeyRound,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  removeOverrideAction,
  setOverrideAction,
  setUserStatusAction,
  updateUserAccessAction,
} from "@/actions/users";
import { adminResetPasswordAction, type ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  PermissionDomainPicker,
  type PermissionOption,
} from "@/components/admin/permission-domains";

type OverrideRow = {
  id: string;
  effect: string;
  permissionCode: string;
  reason: string | null;
};

type DrawerId = "access" | "overrides" | "security" | null;

export function UserAccessForm({
  userId,
  groups,
  packs,
  selectedGroupIds,
  selectedPackIds,
  overrides,
  permissions,
  canManageAccess,
  canSuspend,
  canReset,
  canOverride,
  isSuperAdminTarget,
}: {
  userId: string;
  groups: GroupOption[];
  packs: PackOption[];
  selectedGroupIds: string[];
  selectedPackIds: string[];
  overrides: OverrideRow[];
  permissions: PermissionOption[];
  canManageAccess: boolean;
  canSuspend: boolean;
  canReset: boolean;
  canOverride: boolean;
  isSuperAdminTarget: boolean;
}) {
  const [drawer, setDrawer] = useState<DrawerId>(null);

  const [accessState, accessAction, accessPending] = useActionState<
    ActionResult | null,
    FormData
  >(updateUserAccessAction, null);
  const [statusState, statusAction, statusPending] = useActionState<
    ActionResult | null,
    FormData
  >(setUserStatusAction, null);
  const [resetState, resetAction, resetPending] = useActionState<
    ActionResult | null,
    FormData
  >(adminResetPasswordAction, null);
  const [ovState, ovAction, ovPending] = useActionState<
    ActionResult | null,
    FormData
  >(setOverrideAction, null);
  const [rmState, rmAction] = useActionState<ActionResult | null, FormData>(
    removeOverrideAction,
    null,
  );

  useEffect(() => {
    if (accessState?.ok) setDrawer(null);
  }, [accessState]);

  const selectedPacks = packs.filter((p) => selectedPackIds.includes(p.id));
  const selectedGroups = groups.filter((g) => selectedGroupIds.includes(g.id));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {canManageAccess ? (
          <ActionCard
            icon={Shield}
            title="Packs & groupes"
            subtitle={
              selectedPacks.length || selectedGroups.length
                ? `${selectedPacks.length} pack(s) · ${selectedGroups.length} groupe(s)`
                : "Aucun accès direct"
            }
            onClick={() => setDrawer("access")}
          >
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedPacks.slice(0, 4).map((p) => (
                <Badge key={p.id} tone="blue">
                  {p.name}
                </Badge>
              ))}
              {selectedGroups.slice(0, 3).map((g) => (
                <Badge key={g.id} tone="ink">
                  {g.name}
                </Badge>
              ))}
              {selectedPacks.length === 0 && selectedGroups.length === 0 ? (
                <span className="text-xs text-msk-ink/40">Configurer →</span>
              ) : null}
            </div>
            <p className="mt-2 text-[11px] text-msk-ink/40">
              Les groupes apportent leur pack défaut.
            </p>
          </ActionCard>
        ) : null}

        {canOverride ? (
          <ActionCard
            icon={ShieldAlert}
            title="Overrides"
            subtitle={
              overrides.length
                ? `${overrides.length} exception(s)`
                : "Aucune exception"
            }
            onClick={() => setDrawer("overrides")}
          >
            <ul className="mt-3 space-y-1 text-xs text-msk-ink/55">
              {overrides.slice(0, 3).map((o) => (
                <li key={o.id}>
                  <span
                    className={
                      o.effect === "GRANT" ? "text-emerald-700" : "text-msk-coral"
                    }
                  >
                    {o.effect}
                  </span>{" "}
                  {o.permissionCode}
                </li>
              ))}
              {overrides.length === 0 ? (
                <li className="text-msk-ink/35">Exceptions rares (GRANT / DENY)</li>
              ) : null}
            </ul>
          </ActionCard>
        ) : null}

        {(canSuspend && !isSuperAdminTarget) || canReset ? (
          <ActionCard
            icon={KeyRound}
            title="Sécurité compte"
            subtitle="Statut · reset MDP"
            onClick={() => setDrawer("security")}
          >
            <p className="mt-3 text-xs text-msk-ink/45">
              Suspendre, archiver ou réinitialiser le mot de passe.
            </p>
          </ActionCard>
        ) : null}
      </div>

      <SideDrawer
        open={drawer === "access"}
        onOpenChange={(open) => !open && setDrawer(null)}
        title="Modifier les accès"
        description="Cochez plusieurs packs et groupes. Chaque groupe apporte son pack défaut."
        wide
      >
        <form action={accessAction} className="space-y-6">
          <input type="hidden" name="userId" value={userId} />
          <section>
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-msk-ink">
              <Shield className="h-4 w-4 text-msk-blue" />
              Packs directs
            </h3>
            <p className="mb-3 text-xs text-msk-ink/45">
              Multi-sélection. Chaque pack regroupe des permissions.
            </p>
            <PackPicker
              packs={packs}
              defaultSelected={selectedPackIds}
              compact
            />
          </section>
          <section>
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-msk-ink">
              <Users className="h-4 w-4 text-msk-blue" />
              Groupes
            </h3>
            <p className="mb-3 text-xs text-msk-ink/45">
              Multi-sélection. Le pack défaut du groupe s’ajoute aux droits.
            </p>
            <GroupPicker groups={groups} defaultSelected={selectedGroupIds} />
          </section>
          {accessState?.error ? (
            <p className="text-sm text-msk-coral">{accessState.error}</p>
          ) : null}
          {accessState?.message ? (
            <p className="text-sm text-msk-blue">{accessState.message}</p>
          ) : null}
          <div className="sticky bottom-0 flex gap-2 border-t border-msk-ink/[0.06] bg-white pt-4">
            <Button type="submit" disabled={accessPending} className="flex-1">
              {accessPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDrawer(null)}
            >
              Annuler
            </Button>
          </div>
        </form>
      </SideDrawer>

      <SideDrawer
        open={drawer === "overrides"}
        onOpenChange={(open) => !open && setDrawer(null)}
        title="Overrides"
        description="Exceptions individuelles prioritaires sur packs & groupes. Multi-sélection possible."
        wide
      >
        <div className="space-y-5">
          <ul className="space-y-2 text-sm">
            {overrides.length === 0 ? (
              <li className="rounded-lg border border-dashed border-msk-ink/15 px-3 py-4 text-center text-msk-ink/40">
                Aucun override
              </li>
            ) : (
              overrides.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-msk-ink/10 px-3 py-2"
                >
                  <span>
                    <strong
                      className={
                        o.effect === "GRANT"
                          ? "text-emerald-700"
                          : "text-msk-coral"
                      }
                    >
                      {o.effect}
                    </strong>{" "}
                    {o.permissionCode}
                    {o.reason ? ` — ${o.reason}` : ""}
                  </span>
                  <form action={rmAction}>
                    <input type="hidden" name="overrideId" value={o.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Retirer
                    </Button>
                  </form>
                </li>
              ))
            )}
          </ul>

          <form
            action={ovAction}
            className="space-y-4 border-t border-msk-ink/[0.06] pt-4"
          >
            <input type="hidden" name="userId" value={userId} />
            <h3 className="text-sm font-semibold text-msk-ink">
              Ajouter des overrides
            </h3>
            <p className="text-xs text-msk-ink/45">
              Cochez une ou plusieurs permissions, puis choisissez GRANT ou DENY.
            </p>
            <PermissionDomainPicker
              permissions={permissions}
              name="permissionCodes"
              mode="multi"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="effect">Effet</Label>
                <select
                  id="effect"
                  name="effect"
                  className="h-11 w-full cursor-pointer rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
                >
                  <option value="GRANT">GRANT</option>
                  <option value="DENY">DENY</option>
                </select>
              </div>
              <div>
                <Label htmlFor="reason">Motif</Label>
                <Input id="reason" name="reason" />
              </div>
            </div>
            {ovState?.error ? (
              <p className="text-sm text-msk-coral">{ovState.error}</p>
            ) : null}
            {ovState?.message || rmState?.message ? (
              <p className="text-sm text-msk-blue">
                {ovState?.message ?? rmState?.message}
              </p>
            ) : null}
            <Button type="submit" disabled={ovPending}>
              {ovPending ? "Enregistrement…" : "Ajouter"}
            </Button>
          </form>
        </div>
      </SideDrawer>

      <SideDrawer
        open={drawer === "security"}
        onOpenChange={(open) => !open && setDrawer(null)}
        title="Sécurité du compte"
        description="Statut et réinitialisation du mot de passe."
      >
        <div className="space-y-6">
          {!isSuperAdminTarget && canSuspend ? (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-msk-ink">Statut</h3>
              <form action={statusAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="userId" value={userId} />
                <Button
                  type="submit"
                  name="status"
                  value="SUSPENDED"
                  variant="danger"
                  disabled={statusPending}
                >
                  Suspendre
                </Button>
                <Button
                  type="submit"
                  name="status"
                  value="ACTIVE"
                  variant="secondary"
                  disabled={statusPending}
                >
                  Réactiver
                </Button>
                <Button
                  type="submit"
                  name="status"
                  value="ARCHIVED"
                  variant="ghost"
                  disabled={statusPending}
                >
                  Archiver
                </Button>
              </form>
              {statusState?.message ? (
                <p className="mt-2 text-sm text-msk-blue">{statusState.message}</p>
              ) : null}
              {statusState?.error ? (
                <p className="mt-2 text-sm text-msk-coral">{statusState.error}</p>
              ) : null}
            </section>
          ) : null}

          {canReset ? (
            <section className="border-t border-msk-ink/[0.06] pt-4">
              <h3 className="mb-3 text-sm font-semibold text-msk-ink">
                Reset mot de passe
              </h3>
              <form action={resetAction} className="space-y-3">
                <input type="hidden" name="userId" value={userId} />
                <div>
                  <Label htmlFor="tempPassword">MDP temporaire (optionnel)</Label>
                  <Input
                    id="tempPassword"
                    name="tempPassword"
                    autoComplete="off"
                  />
                </div>
                <Button type="submit" variant="secondary" disabled={resetPending}>
                  Réinitialiser
                </Button>
                {resetState?.message ? (
                  <p className="rounded-lg bg-msk-blue/5 px-3 py-2 text-sm text-msk-ink">
                    {resetState.message}
                  </p>
                ) : null}
                {resetState?.error ? (
                  <p className="text-sm text-msk-coral">{resetState.error}</p>
                ) : null}
              </form>
            </section>
          ) : null}
        </div>
      </SideDrawer>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  subtitle,
  onClick,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="group w-full text-left">
      <Card className="h-full cursor-pointer transition hover:border-msk-blue/30 hover:shadow-md hover:shadow-msk-blue/5">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-msk-blue/10 text-msk-blue">
              <Icon className="h-5 w-5" />
            </span>
            <ChevronRight className="h-4 w-4 text-msk-ink/25 transition group-hover:text-msk-blue" />
          </div>
          <CardTitle className="mt-3">{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">{children}</CardContent>
      </Card>
    </button>
  );
}
