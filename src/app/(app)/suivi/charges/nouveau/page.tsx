import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvExpenseForm } from "@/components/suivi/expense-form";

export const metadata: Metadata = { title: "Nouvelle charge · Suivi" };

export default async function SuiviChargeNouveauPage() {
  const user = await requireUser();
  requireSvPermission(user, "sv.expenses.manage");

  return (
    <PageShell>
      <PageHeader
        title="Nouvelle charge"
        description="Enregistrer une facture fournisseur à réception (avec justificatif)."
        backHref="/suivi/charges"
      />
      <SvExpenseForm />
    </PageShell>
  );
}
