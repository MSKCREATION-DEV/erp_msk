import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvMovementForm } from "@/components/suivi/movement-form";

export const metadata: Metadata = { title: "Nouveau mouvement · Suivi" };

export default async function SuiviMouvementNouveauPage() {
  const user = await requireUser();
  requireSvPermission(user, "sv.movements.manage");

  return (
    <PageShell>
      <PageHeader
        title="Nouveau mouvement"
        description="Entrée ou sortie — registre trésorerie tampon."
        backHref="/suivi/mouvements"
      />
      <SvMovementForm />
    </PageShell>
  );
}
