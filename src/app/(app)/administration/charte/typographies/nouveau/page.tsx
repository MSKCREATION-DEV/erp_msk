import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { TypographyCreateForm } from "@/components/admin/charte/typography-forms";

export const metadata: Metadata = { title: "Nouvelle typographie" };

export default async function NouvelleTypoPage() {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.brand")) redirect("/accueil");

  return (
    <PageShell>
      <PageHeader
        title="Nouvelle typographie"
        description="Définir une famille et éventuellement importer une graisse."
        backHref="/administration/charte/typographies"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Charte", href: "/administration/charte" },
          { label: "Typographies", href: "/administration/charte/typographies" },
          { label: "Nouveau" },
        ]}
      />
      <TypographyCreateForm />
    </PageShell>
  );
}
