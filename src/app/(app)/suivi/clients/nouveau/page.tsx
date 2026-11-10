import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvClientForm } from "@/components/suivi/client-form";

export const metadata: Metadata = { title: "Nouveau client · Suivi" };

export default async function SuiviClientNouveauPage() {
  const user = await requireUser();
  requireSvPermission(user, "sv.clients.manage");

  return (
    <PageShell>
      <PageHeader
        title="Nouveau client"
        description="Identité et contact — tampon Suivi."
        backHref="/suivi/clients"
      />
      <SvClientForm mode="create" />
    </PageShell>
  );
}
