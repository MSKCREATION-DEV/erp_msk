import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { ColorCreateForm } from "@/components/admin/charte/color-forms";

export const metadata: Metadata = { title: "Nouvelle couleur" };

export default async function NouvelleCouleurPage() {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.brand")) redirect("/accueil");

  return (
    <PageShell>
      <PageHeader
        title="Nouvelle couleur"
        description="HEX / RGB / HSL — aperçu contraste WCAG."
        backHref="/administration/charte/couleurs"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Charte", href: "/administration/charte" },
          { label: "Couleurs", href: "/administration/charte/couleurs" },
          { label: "Nouveau" },
        ]}
      />
      <ColorCreateForm />
    </PageShell>
  );
}
