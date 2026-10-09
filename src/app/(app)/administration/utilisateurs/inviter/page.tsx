import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { InviteUserForm } from "@/components/admin/invite-user-form";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "Inviter un collaborateur",
};

export default async function InviteUserPage() {
  await requireUser({ permission: "users.create" });

  const [groups, packs] = await Promise.all([
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
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Inviter un collaborateur"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Utilisateurs", href: "/administration/utilisateurs" },
          { label: "Inviter" },
        ]}
        description="Création de compte Auth + profil ERP, e-mail Resend, changement de mot de passe obligatoire à la 1ʳᵉ connexion."
      />
      <InviteUserForm
        groups={groups}
        packs={packs.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          description: p.description,
          permissionCount: p._count.permissions,
        }))}
      />
    </PageShell>
  );
}
