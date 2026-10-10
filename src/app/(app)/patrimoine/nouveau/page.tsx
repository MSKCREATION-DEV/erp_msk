import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { AssetForm } from "@/components/patrimoine/asset-form";

export const metadata: Metadata = { title: "Nouveau bien patrimoine" };

async function loadUsers() {
  return prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: "asc" },
    take: 100,
  });
}

export default async function PatrimoineNouveauPage() {
  const user = await requireUser();
  if (!hasPermission(user, "pat.manage")) redirect("/patrimoine");

  const users = await loadUsers();

  return (
    <PageShell>
      <PageHeader
        title="Nouveau bien"
        description="Immobilisation — code unique, valeur et assignation optionnelle."
        backHref="/patrimoine"
        backLabel="Retour patrimoine"
        breadcrumbs={[
          { label: "Patrimoine", href: "/patrimoine" },
          { label: "Nouveau" },
        ]}
      />
      <Surface className="max-w-lg p-5">
        <AssetForm users={users} />
      </Surface>
    </PageShell>
  );
}
