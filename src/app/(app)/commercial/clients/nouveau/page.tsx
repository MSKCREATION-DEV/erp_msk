import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { ClientCreateForm } from "@/components/commercial/client-form";

export const metadata: Metadata = { title: "Nouveau client" };

export default async function CommercialClientNouveauPage() {
  const user = await requireUser();
  if (!hasPermission(user, "com.clients.manage")) {
    redirect("/commercial/clients");
  }

  return (
    <PageShell>
      <PageHeader
        title="Nouveau client"
        description="Fiche client Commercial — séparée du listing."
        backHref="/commercial/clients"
        backLabel="Retour aux clients"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Clients", href: "/commercial/clients" },
          { label: "Nouveau" },
        ]}
      />
      <ClientCreateForm />
    </PageShell>
  );
}
