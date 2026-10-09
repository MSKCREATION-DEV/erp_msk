"use client";

import { useActionState } from "react";
import {
  removeOverrideAction,
  setOverrideAction,
  setUserStatusAction,
  updateUserAccessAction,
} from "@/actions/users";
import { adminResetPasswordAction, type ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GroupPicker, type GroupOption } from "@/components/admin/group-picker";
import { PackPicker, type PackOption } from "@/components/admin/pack-picker";
import {
  PermissionDomainPicker,
  type PermissionOption,
} from "@/components/admin/permission-domains";
import { Surface } from "@/components/ui/surface";

type OverrideRow = {
  id: string;
  effect: string;
  permissionCode: string;
  reason: string | null;
};

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

  return (
    <div className="space-y-6">
      {canManageAccess ? (
        <form action={accessAction} className="space-y-6">
          <input type="hidden" name="userId" value={userId} />
          <Surface className="p-6">
            <h3 className="font-semibold text-msk-ink">Packs</h3>
            <p className="mt-1 mb-4 text-sm text-msk-ink/50">
              Capacités directes. Direction ≠ Admin plateforme.
            </p>
            <PackPicker packs={packs} defaultSelected={selectedPackIds} />
          </Surface>
          <Surface className="p-6">
            <h3 className="font-semibold text-msk-ink">Groupes</h3>
            <p className="mt-1 mb-4 text-sm text-msk-ink/50">
              Appartenances organisationnelles (pack défaut possible).
            </p>
            <GroupPicker groups={groups} defaultSelected={selectedGroupIds} />
          </Surface>
          {accessState?.message ? (
            <p className="text-sm text-msk-blue">{accessState.message}</p>
          ) : null}
          {accessState?.error ? (
            <p className="text-sm text-msk-coral">{accessState.error}</p>
          ) : null}
          <Button type="submit" disabled={accessPending}>
            Enregistrer les accès
          </Button>
        </form>
      ) : null}

      {canOverride ? (
        <Surface className="space-y-4 p-6">
          <div>
            <h3 className="font-semibold text-msk-ink">Overrides</h3>
            <p className="mt-1 text-sm text-msk-ink/50">
              GRANT / DENY individuels — prioritaire sur packs & groupes.
            </p>
          </div>
          <ul className="space-y-2 text-sm">
            {overrides.length === 0 ? (
              <li className="text-msk-ink/40">Aucun override</li>
            ) : (
              overrides.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-msk-ink/10 px-3 py-2"
                >
                  <span>
                    <strong
                      className={
                        o.effect === "GRANT" ? "text-emerald-700" : "text-msk-coral"
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
          <form action={ovAction} className="space-y-4 border-t border-msk-ink/[0.06] pt-4">
            <input type="hidden" name="userId" value={userId} />
            <PermissionDomainPicker permissions={permissions} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="effect">Effet</Label>
                <select
                  id="effect"
                  name="effect"
                  className="h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
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
              Ajouter override
            </Button>
          </form>
        </Surface>
      ) : null}

      {!isSuperAdminTarget && canSuspend ? (
        <Surface className="p-6">
          <h3 className="mb-3 font-semibold text-msk-ink">Statut du compte</h3>
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
        </Surface>
      ) : null}

      {canReset ? (
        <Surface className="space-y-3 p-6">
          <h3 className="font-semibold text-msk-ink">Reset mot de passe</h3>
          <form action={resetAction} className="space-y-3">
            <input type="hidden" name="userId" value={userId} />
            <div>
              <Label htmlFor="tempPassword">MDP temporaire (optionnel)</Label>
              <Input id="tempPassword" name="tempPassword" autoComplete="off" />
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
        </Surface>
      ) : null}
    </div>
  );
}
