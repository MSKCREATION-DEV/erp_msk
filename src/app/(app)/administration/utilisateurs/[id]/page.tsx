import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  hasPermission,
  resolvePermissionProvenance,
  resolveUserPermissions,
} from "@/lib/rbac/resolve";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AccessCompositionCard } from "@/components/admin/access-composition-card";
import { EffectiveAccessCard } from "@/components/admin/effective-access-card";
import { UserAccessForm } from "@/components/admin/user-access-form";
import { UserProfileCard } from "@/components/admin/user-profile-card";

export const metadata: Metadata = {
  title: "Fiche utilisateur",
};

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireUser({ permission: "users.view" });
  const { id } = await params;

  const [target, groups, packs, permissions, audits, provenance] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id },
        include: {
          groupMembers: { include: { group: true } },
          userPacks: { include: { pack: true } },
          overrides: { include: { permission: true } },
        },
      }),
      prisma.group.findMany({
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          defaultPack: { select: { name: true, code: true } },
        },
      }),
      prisma.permissionPack.findMany({
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          permissions: {
            select: { permission: { select: { code: true } } },
            take: 40,
          },
          _count: { select: { permissions: true } },
        },
      }),
      prisma.permission.findMany({
        orderBy: [{ domain: "asc" }, { code: "asc" }],
        select: { id: true, code: true, domain: true, description: true },
      }),
      hasPermission(actor, "audit.view")
        ? prisma.auditLog.findMany({
            where: { entityType: "user", entityId: id },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: { id: true, action: true, createdAt: true },
          })
        : Promise.resolve([]),
      resolvePermissionProvenance(id),
    ]);

  if (!target) notFound();

  const resolved = await resolveUserPermissions(target.id);
  const permissionCount = target.isSuperAdmin
    ? await prisma.permission.count()
    : (resolved?.permissions.size ?? 0);

  const effectivePermissionCodes = target.isSuperAdmin
    ? permissions.map((p) => p.code)
    : (provenance?.entries.filter((e) => e.effective).map((e) => e.code) ??
      [...(resolved?.permissions ?? [])]);

  const permissionMarks: Record<
    string,
    { label: string; tone?: "success" | "coral" | "blue" | "muted" | "ink" }
  > = {};
  if (provenance && !provenance.isSuperAdmin) {
    for (const entry of provenance.entries) {
      const hasDeny = entry.sources.some((s) => s.kind === "override_deny");
      const hasGrant = entry.sources.some((s) => s.kind === "override_grant");
      const hasGroup = entry.sources.some((s) => s.kind === "group_pack");
      const hasDirect = entry.sources.some((s) => s.kind === "direct_pack");
      if (hasDeny) {
        permissionMarks[entry.code] = { label: "DENY", tone: "coral" };
      } else if (hasGrant) {
        permissionMarks[entry.code] = { label: "GRANT", tone: "success" };
      } else if (hasGroup) {
        permissionMarks[entry.code] = { label: "Groupe", tone: "ink" };
      } else if (hasDirect) {
        permissionMarks[entry.code] = { label: "Pack", tone: "blue" };
      }
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Fiche utilisateur"
        backHref="/administration/utilisateurs"
        backLabel="Retour aux utilisateurs"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Utilisateurs", href: "/administration/utilisateurs" },
          { label: target.lastName },
        ]}
        description="Profil, accès (groupes → packs → permissions) et sécurité du compte."
      />

      <UserProfileCard
        userId={target.id}
        firstName={target.firstName}
        lastName={target.lastName}
        email={target.email}
        phone={target.phone}
        status={target.status}
        isSuperAdmin={target.isSuperAdmin}
        permissionCount={permissionCount}
        groupCodes={resolved?.groupCodes ?? []}
        packCodes={resolved?.packCodes ?? []}
        canEdit={hasPermission(actor, "users.edit_profile_any")}
      />

      <AccessCompositionCard
        groups={target.groupMembers.map((m) => ({
          code: m.group.code,
          defaultPackCode:
            groups.find((g) => g.id === m.groupId)?.defaultPack?.code ?? null,
        }))}
        directPackCodes={target.userPacks.map((p) => p.pack.code)}
        overrideCount={target.overrides.length}
      />

      <UserAccessForm
        userId={target.id}
        groups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          code: g.code,
          description: g.description,
          defaultPackName: g.defaultPack?.name ?? null,
          defaultPackCode: g.defaultPack?.code ?? null,
        }))}
        packs={packs.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          description: p.description,
          permissionCount: p._count.permissions,
          permissionCodes: p.permissions.map((pp) => pp.permission.code),
        }))}
        selectedGroupIds={target.groupMembers.map((m) => m.groupId)}
        selectedPackIds={target.userPacks.map((p) => p.packId)}
        overrides={target.overrides.map((o) => ({
          id: o.id,
          effect: o.effect,
          permissionCode: o.permission.code,
          reason: o.reason,
        }))}
        permissions={permissions}
        effectivePermissionCodes={effectivePermissionCodes}
        permissionMarks={permissionMarks}
        canManageAccess={hasPermission(actor, "users.manage_access")}
        canSuspend={hasPermission(actor, "users.suspend")}
        canReset={hasPermission(actor, "users.reset_password")}
        canOverride={hasPermission(actor, "overrides.manage")}
        isSuperAdminTarget={target.isSuperAdmin}
      />

      {provenance ? (
        <EffectiveAccessCard
          isSuperAdmin={provenance.isSuperAdmin}
          entries={provenance.entries}
        />
      ) : null}

      {hasPermission(actor, "audit.view") ? (
        <Card>
          <CardHeader>
            <CardTitle>Audit récent</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-msk-ink/70">
              {audits.length === 0 ? (
                <li className="text-msk-ink/40">Aucun événement</li>
              ) : (
                audits.map((a) => (
                  <li
                    key={a.id}
                    className="flex justify-between gap-4 border-b border-msk-ink/5 pb-2 last:border-0"
                  >
                    <span>{a.action}</span>
                    <time className="shrink-0 text-xs text-msk-ink/40">
                      {a.createdAt.toLocaleString("fr-FR")}
                    </time>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </PageShell>
  );
}
