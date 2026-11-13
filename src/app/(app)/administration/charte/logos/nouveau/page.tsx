import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { LogoCreateForm } from "@/components/admin/charte/logo-create-form";

export const metadata: Metadata = { title: "Nouveau logo" };

export default async function NouveauLogoPage() {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.brand")) redirect("/accueil");

  return (
    <PageShell>
      <PageHeader
        title="Nouveau logo"
        description="Upload SVG/PNG/WebP/JPEG — sanitisation SVG et PNG optimisé pour les PDF."
        backHref="/administration/charte/logos"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Charte", href: "/administration/charte" },
          { label: "Logos", href: "/administration/charte/logos" },
          { label: "Nouveau" },
        ]}
      />
      <LogoCreateForm />
    </PageShell>
  );
}
