import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProspectCreateForm } from "@/components/crm/prospect-create-form";

export const metadata: Metadata = { title: "Nouveau prospect" };

export default async function CrmProspectNouveauPage() {
  const user = await requireUser();
  if (!hasPermission(user, "crm.prospect.create")) redirect("/crm/prospects");

  const offers = await prisma.catalogOffer.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, sku: true },
  });

  return (
    <PageShell>
      <PageHeader
        title="Nouveau prospect"
        description="Organisation + contact principal + opportunité pipeline."
        backHref="/crm/prospects"
        backLabel="Retour aux prospects"
        breadcrumbs={[
          { label: "CRM", href: "/crm" },
          { label: "Prospects", href: "/crm/prospects" },
          { label: "Nouveau" },
        ]}
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Créer un prospect</CardTitle>
          <CardDescription>
            Une fiche dédiée — pas de formulaire sur le listing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProspectCreateForm offers={offers} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
