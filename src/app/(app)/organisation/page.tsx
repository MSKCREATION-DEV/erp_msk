import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { resolveOrgPhotoSrcs } from "@/lib/rh/avatar-url";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { OrgChart } from "@/components/org/org-chart";

export const metadata: Metadata = { title: "Organisation" };

export default async function OrganisationPage() {
  const user = await requireUser();
  if (!hasPermission(user, "orgchart.view")) redirect("/accueil");

  const raw = await prisma.orgNode.findMany({
    orderBy: [{ sortOrder: "asc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      title: true,
      email: true,
      photoPath: true,
      parentId: true,
      sortOrder: true,
      userId: true,
      user: {
        select: {
          rhEmployee: { select: { avatarDocumentId: true } },
        },
      },
    },
  });

  const photoSrcs = await resolveOrgPhotoSrcs(
    raw.map((n) => ({
      userId: n.userId,
      photoPath: n.photoPath,
      avatarDocumentId: n.user?.rhEmployee?.avatarDocumentId ?? null,
    })),
  );

  const nodes = raw.map((n, i) => ({
    id: n.id,
    fullName: n.fullName,
    title: n.title,
    email: n.email,
    photoPath: photoSrcs[i] || n.photoPath,
    parentId: n.parentId,
    sortOrder: n.sortOrder,
  }));

  return (
    <PageShell>
      <PageHeader
        title="Organigramme"
        description="Équipe MSK CREATION — hiérarchie, photos et rôles."
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Organisation" },
        ]}
      />

      {nodes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-msk-ink/45">
            Aucun nœud — lancez le seed Phase 1.
          </CardContent>
        </Card>
      ) : (
        <OrgChart nodes={nodes} />
      )}
    </PageShell>
  );
}
