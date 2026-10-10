import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/resolve";
import { USER_STATUS_LABEL, USER_STATUS_TONE } from "@/lib/users/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiGrid } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { UserAvatar } from "@/components/ui/user-avatar";

export const metadata: Metadata = {
  title: "Utilisateurs",
};

export default async function UsersAdminPage() {
  const user = await requireUser({ permission: "users.view" });
  const canInvite = hasPermission(user, "users.create");

  const [users, pendingResets, counts] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        isSuperAdmin: true,
        groupMembers: { select: { group: { select: { name: true } } } },
        userPacks: { select: { pack: { select: { name: true, code: true } } } },
      },
    }),
    prisma.passwordResetRequest.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        userId: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.user.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countBy = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all]),
  ) as Record<string, number>;

  const kpis = [
    { label: "Total", value: String(users.length), hint: "comptes" },
    {
      label: "Actifs",
      value: String(countBy.ACTIVE ?? 0),
      hint: "accès ouvert",
      trend: {
        value:
          users.length > 0
            ? `${Math.round(((countBy.ACTIVE ?? 0) / users.length) * 100)}%`
            : "0%",
        direction: "up" as const,
      },
    },
    {
      label: "Invitations",
      value: String(
        (countBy.INVITE_PENDING ?? 0) + (countBy.MUST_CHANGE_PASSWORD ?? 0),
      ),
      hint: "à finaliser",
    },
    {
      label: "Reset MDP",
      value: String(pendingResets.length),
      hint: "en attente",
      trend:
        pendingResets.length > 0
          ? { value: "à traiter", direction: "down" as const }
          : undefined,
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Utilisateurs"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Utilisateurs" },
        ]}
        description="Comptes, invitations et statuts. Groupes, packs et exceptions se gèrent sur chaque fiche."
        actions={
          canInvite ? (
            <Link prefetch={false}
              href="/administration/utilisateurs/inviter"
              className="cursor-pointer"
            >
              <Button>
                <Plus className="h-4 w-4" />
                Inviter
              </Button>
            </Link>
          ) : null
        }
      />

      <KpiGrid items={kpis} />

      {pendingResets.length > 0 ? (
        <Surface className="border-msk-coral/20 bg-msk-coral/[0.04] px-5 py-4">
          <h2 className="text-sm font-semibold text-msk-ink">
            Demandes reset MDP ({pendingResets.length})
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-msk-ink/70">
            {pendingResets.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/administration/utilisateurs/${r.userId}`}
                  prefetch={false}
                  className="cursor-pointer font-medium text-msk-blue hover:underline"
                >
                  {r.user.firstName} {r.user.lastName}
                </Link>{" "}
                — {r.user.email}
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}

      <Surface className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-msk-ink/[0.06] px-5 py-4">
          <h2 className="font-semibold text-msk-ink">Collaborateurs</h2>
          <p className="text-sm text-msk-ink/45">{users.length} compte(s)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-msk-ink/[0.06] bg-[#F8F9FB] text-[11px] font-semibold uppercase tracking-[0.1em] text-msk-ink/40">
              <tr>
                <th className="px-5 py-3.5">Collaborateur</th>
                <th className="px-5 py-3.5">Statut</th>
                <th className="hidden px-5 py-3.5 md:table-cell">Groupes</th>
                <th className="hidden px-5 py-3.5 lg:table-cell">Packs</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="relative border-b border-msk-ink/[0.04] last:border-0 hover:bg-msk-chalk/40"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/administration/utilisateurs/${u.id}`}
                      prefetch={false}
                      className="absolute inset-0 z-[1] cursor-pointer"
                      aria-label={`Ouvrir ${u.firstName} ${u.lastName}`}
                    />
                    <div className="relative z-0 flex items-center gap-3">
                      <UserAvatar
                        firstName={u.firstName}
                        lastName={u.lastName}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium text-msk-ink">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-msk-ink/45">{u.email}</p>
                        {u.isSuperAdmin ? (
                          <Badge tone="blue" className="mt-1">
                            Super Admin
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="relative z-0 px-5 py-3.5">
                    <Badge tone={USER_STATUS_TONE[u.status] ?? "ink"}>
                      {USER_STATUS_LABEL[u.status] ?? u.status}
                    </Badge>
                  </td>
                  <td className="relative z-0 hidden px-5 py-3.5 text-msk-ink/60 md:table-cell">
                    {u.groupMembers.map((m) => m.group.name).join(", ") || "—"}
                  </td>
                  <td className="relative z-0 hidden px-5 py-3.5 text-msk-ink/60 lg:table-cell">
                    {u.userPacks.map((p) => p.pack.name).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>
    </PageShell>
  );
}
