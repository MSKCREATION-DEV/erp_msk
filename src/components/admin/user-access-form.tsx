"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  KeyRound,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  setUserStatusAction,
  syncOverridesAction,
  updateUserAccessAction,
} from "@/actions/users";
import type { ActionResult } from "@/actions/auth";
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
  type PermissionMark,
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
  /** Codes effectivement accordés (packs + GRANT − DENY). */
  effectivePermissionCodes,
  /** Badges Pack / Groupe / GRANT / DENY par code. */
  permissionMarks,
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
  effectivePermissionCodes: string[];
  permissionMarks: Record<string, PermissionMark>;
  canManageAccess: boolean;
  canSuspend: boolean;
  canReset: boolean;
  canOverride: boolean;
  isSuperAdminTarget: boolean;
}) {
  const [drawer, setDrawer] = useState<DrawerId>(null);
  /** Remount pickers à chaque ouverture pour recharger l’état serveur. */
  const [accessKey, setAccessKey] = useState(0);
  const [overridesKey, setOverridesKey] = useState(0);

  const [draftGroupIds, setDraftGroupIds] = useState(selectedGroupIds);
  const [draftPackIds, setDraftPackIds] = useState(selectedPackIds);
  const [draftDesiredCodes, setDraftDesiredCodes] = useState(
    () => effectivePermissionCodes,
  );

  const [accessState, accessAction, accessPending] = useActionState<
    ActionResult | null,
    FormData
  >(updateUserAccessAction, null);
  const [statusState, statusAction, statusPending] = useActionState<
    ActionResult | null,
    FormData
  >(setUserStatusAction, null);
  const [ovState, ovAction, ovPending] = useActionState<
    ActionResult | null,
    FormData
  >(syncOverridesAction, null);

  useEffect(() => {
    if (accessState?.ok) setDrawer(null);
  }, [accessState]);

  useEffect(() => {
    if (ovState?.ok) setDrawer(null);
  }, [ovState]);

  /** Sync props → draft quand la fiche se revalide (hors drawer ouvert). */
  useEffect(() => {
    if (drawer !== "access") {
      setDraftGroupIds(selectedGroupIds);
      setDraftPackIds(selectedPackIds);
    }
  }, [selectedGroupIds, selectedPackIds, drawer]);

  useEffect(() => {
    if (drawer !== "overrides") {
      setDraftDesiredCodes(effectivePermissionCodes);
    }
  }, [effectivePermissionCodes, drawer]);

  function openAccess() {
    setDraftGroupIds(selectedGroupIds);
    setDraftPackIds(selectedPackIds);
    setAccessKey((k) => k + 1);
    setDrawer("access");
  }

  function openOverrides() {
    setDraftDesiredCodes(effectivePermissionCodes);
    setOverridesKey((k) => k + 1);
    setDrawer("overrides");
  }

  const selectedPacks = packs.filter((p) => selectedPackIds.includes(p.id));
  const selectedGroups = groups.filter((g) => selectedGroupIds.includes(g.id));

  const inheritedPackIds = useMemo(() => {
    const codes = new Set(
      groups
        .filter((g) => draftGroupIds.includes(g.id))
        .map((g) => g.defaultPackCode)
        .filter(Boolean) as string[],
    );
    return packs.filter((p) => codes.has(p.code)).map((p) => p.id);
  }, [groups, draftGroupIds, packs]);

  return (
    <div className="space-y-4">
      <div className="grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
        {canManageAccess ? (
          <ActionCard
            icon={Shield}
            title="Groupes & packs"
            subtitle={
              selectedPacks.length || selectedGroups.length
                ? `${selectedGroups.length} groupe(s) · ${selectedPacks.length} pack(s) direct(s)`
                : "Aucun accès configuré"
            }
            onClick={openAccess}
          >
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {selectedGroups.slice(0, 4).map((g) => (
                  <Badge key={g.id} tone="ink">
                    {g.name}
                    {g.defaultPackCode ? ` → ${g.defaultPackName}` : ""}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedPacks.slice(0, 4).map((p) => (
                  <Badge key={p.id} tone="blue">
                    Pack {p.name}
                  </Badge>
                ))}
              </div>
              {selectedPacks.length === 0 && selectedGroups.length === 0 ? (
                <span className="text-xs text-msk-ink/40">Configurer →</span>
              ) : null}
            </div>
            <p className="mt-2 text-[11px] text-msk-ink/40">
              Préférer les groupes ; packs directs = exception / cumul.
            </p>
          </ActionCard>
        ) : null}

        {canOverride ? (
          <ActionCard
            icon={ShieldAlert}
            title="Droits & exceptions"
            subtitle={
              effectivePermissionCodes.length
                ? `${effectivePermissionCodes.length} droit(s) effectif(s)${
                    overrides.length ? ` · ${overrides.length} exception(s)` : ""
                  }`
                : "Aucun droit effectif"
            }
            onClick={openOverrides}
          >
            <ul className="mt-3 space-y-1 text-xs text-msk-ink/55">
              {overrides.slice(0, 3).map((o) => (
                <li key={o.id}>
                  <span
                    className={
                      o.effect === "GRANT"
                        ? "text-emerald-700"
                        : "text-msk-coral"
                    }
                  >
                    {o.effect}
                  </span>{" "}
                  {o.permissionCode}
                </li>
              ))}
              {overrides.length === 0 ? (
                <li className="text-msk-ink/35">
                  Ouvrir pour voir / ajuster tous les droits de ce compte
                </li>
              ) : null}
            </ul>
          </ActionCard>
        ) : null}

        {canSuspend && !isSuperAdminTarget ? (
          <ActionCard
            icon={KeyRound}
            title="Cycle de vie"
            subtitle="Actif · suspendu · archivé"
            onClick={() => setDrawer("security")}
          >
            <p className="mt-3 text-xs text-msk-ink/45">
              Suspendre, réactiver ou archiver le compte (hors mot de passe).
            </p>
          </ActionCard>
        ) : null}
      </div>

      <SideDrawer
        open={drawer === "access"}
        onOpenChange={(open) => !open && setDrawer(null)}
        title="Modifier les accès"
        description="À l’ouverture, les groupes et packs déjà assignés sont cochés. Décochez pour retirer, cochez pour ajouter."
        wide
      >
        <form action={accessAction} className="space-y-6" key={accessKey}>
          <input type="hidden" name="userId" value={userId} />
          <section>
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-msk-ink">
              <Users className="h-4 w-4 text-msk-blue" />
              1 · Groupes
            </h3>
            <p className="mb-3 text-xs text-msk-ink/45">
              Ex. « Commerciaux » → pack Commercial (dossiers suivis, sans Vue
              Équipe). Admin CRM = pack direct en plus.
            </p>
            <GroupPicker
              groups={groups}
              selected={draftGroupIds}
              onChange={setDraftGroupIds}
            />
          </section>
          <section>
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-msk-ink">
              <Shield className="h-4 w-4 text-msk-blue" />
              2 · Packs directs
            </h3>
            <p className="mb-3 text-xs text-msk-ink/45">
              Uniquement pour un cumul (ex. Admin CRM). Les packs marqués
              « Hérité groupe » sont déjà couverts — ne les cochez pas en
              double sauf besoin.
            </p>
            <PackPicker
              packs={packs}
              selected={draftPackIds}
              onChange={setDraftPackIds}
              inheritedPackIds={inheritedPackIds}
              compact
            />
          </section>
          <div className="rounded-lg border border-msk-blue/20 bg-msk-blue/4 px-3 py-2 text-xs text-msk-ink/60">
            <strong>Commercial</strong> : groupe Commerciaux suffit pour le
            terrain. Vue Équipe / import / scripts / objectifs → ajoutez le pack{" "}
            <strong>Admin CRM</strong> en direct.
          </div>
          {accessState?.error ? (
            <p className="text-sm text-msk-coral">{accessState.error}</p>
          ) : null}
          {accessState?.message ? (
            <p className="text-sm text-msk-blue">{accessState.message}</p>
          ) : null}
          <div className="sticky bottom-0 flex gap-2 border-t border-msk-ink/6 bg-white pt-4">
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
        title="Droits de ce compte"
        description="Tous les droits déjà accordés sont cochés. Décochez pour retirer (DENY), cochez pour ajouter (GRANT)."
        wide
      >
        <form action={ovAction} className="space-y-5" key={overridesKey}>
          <input type="hidden" name="userId" value={userId} />

          <div className="rounded-lg border border-msk-blue/20 bg-msk-blue/4 px-3 py-2 text-xs text-msk-ink/60">
            <strong>{draftDesiredCodes.length}</strong> droit(s) coché(s) pour
            ce compte (groupes, packs, exceptions). CRM / Commercial en tête.
            Enregistrer calcule automatiquement GRANT / DENY par rapport aux
            packs.
          </div>

          <PermissionDomainPicker
            permissions={permissions}
            name="permissionCodes"
            mode="multi"
            selectedCodes={draftDesiredCodes}
            onChange={setDraftDesiredCodes}
            marksByCode={permissionMarks}
            preferDomains={["crm", "com"]}
          />

          <div>
            <Label htmlFor="reason">Motif (si vous modifiez)</Label>
            <Input
              id="reason"
              name="reason"
              placeholder="Ex. Retirer l’accès factures temporairement"
            />
          </div>

          {ovState?.error ? (
            <p className="text-sm text-msk-coral">{ovState.error}</p>
          ) : null}
          {ovState?.message ? (
            <p className="text-sm text-msk-blue">{ovState.message}</p>
          ) : null}

          <div className="sticky bottom-0 flex gap-2 border-t border-msk-ink/6 bg-white pt-4">
            <Button type="submit" disabled={ovPending} className="flex-1">
              {ovPending ? "Enregistrement…" : "Enregistrer les droits"}
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
        open={drawer === "security"}
        onOpenChange={(open) => !open && setDrawer(null)}
        title="Cycle de vie du compte"
        description="Suspendre, réactiver ou archiver — sans toucher au mot de passe."
      >
        <div className="space-y-4">
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
                <p className="mt-2 text-sm text-msk-blue">
                  {statusState.message}
                </p>
              ) : null}
              {statusState?.error ? (
                <p className="mt-2 text-sm text-msk-coral">
                  {statusState.error}
                </p>
              ) : null}
              {canReset ? (
                <p className="mt-4 text-xs text-msk-ink/50">
                  Pour le mot de passe : utilisez la carte « Accès et mot de
                  passe » sur cette fiche (lien ou temporaire par e-mail
                  uniquement).
                </p>
              ) : null}
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
