import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { hasPermission, resolveUserPermissions } from "@/lib/rbac/resolve";
import { USER_STATUS_LABEL, USER_STATUS_TONE } from "@/lib/users/status";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UserAccessForm } from "@/components/admin/user-access-form";

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

  const [target, groups, packs, permissions, audits] = await Promise.all([
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
      select: { id: true, name: true, code: true, description: true },
    }),
    prisma.permissionPack.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
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
  ]);

  if (!target) notFound();

  const resolved = await resolveUserPermissions(target.id);

  return (
    <PageShell>
      <PageHeader
        title={`${target.firstName} ${target.lastName}`}
        breadcrumbs={[
          { label: "Administration" },
          { label: "Utilisateurs", href: "/administration/utilisateurs" },
          { label: target.lastName },
        ]}
        description={target.email}
        actions={
          <UserAvatar
            firstName={target.firstName}
            lastName={target.lastName}
            size="lg"
          />
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge tone={USER_STATUS_TONE[target.status] ?? "ink"}>
          {USER_STATUS_LABEL[target.status] ?? target.status}
        </Badge>
        {target.isSuperAdmin ? <Badge tone="blue">Super Admin</Badge> : null}
      </div>

      <Surface className="p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-msk-ink/40">
          Permissions effectives
        </h2>
        <p className="mt-2 text-sm text-msk-ink/60">
          <strong className="text-msk-ink">
            {resolved?.permissions.size ?? 0}
          </strong>{" "}
          permissions · groupes : {resolved?.groupCodes.join(", ") || "—"} ·
          packs : {resolved?.packCodes.join(", ") || "—"}
        </p>
      </Surface>

      <UserAccessForm
        userId={target.id}
        groups={groups}
        packs={packs.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          description: p.description,
          permissionCount: p._count.permissions,
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
        canManageAccess={hasPermission(actor, "users.manage_access")}
        canSuspend={hasPermission(actor, "users.suspend")}
        canReset={hasPermission(actor, "users.reset_password")}
        canOverride={hasPermission(actor, "overrides.manage")}
        isSuperAdminTarget={target.isSuperAdmin}
      />

      {hasPermission(actor, "audit.view") ? (
        <Surface className="p-6">
          <h2 className="mb-4 font-semibold text-msk-ink">Audit récent</h2>
          <ul className="space-y-2 text-sm text-msk-ink/70">
            {audits.length === 0 ? (
              <li className="text-msk-ink/40">Aucun événement</li>
            ) : (
              audits.map((a) => (
                <li
                  key={a.id}
                  className="flex justify-between gap-4 border-b border-msk-ink/5 pb-2"
                >
                  <span>{a.action}</span>
                  <time className="shrink-0 text-xs text-msk-ink/40">
                    {a.createdAt.toLocaleString("fr-FR")}
                  </time>
                </li>
              ))
            )}
          </ul>
        </Surface>
      ) : null}
    </PageShell>
  );
}
