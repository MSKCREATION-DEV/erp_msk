import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
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
        description="Enregistrement complet — entreprise, contact, origine, offres."
        backHref="/crm/prospects"
        backLabel="Retour aux prospects"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Prospects", href: "/crm/prospects" },
          { label: "Nouveau" },
        ]}
      />
      <ProspectCreateForm offers={offers} />
    </PageShell>
  );
}
