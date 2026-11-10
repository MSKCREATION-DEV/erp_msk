import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { SV_ACCOUNT_KIND_LABEL } from "@/lib/suivi/accounts";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvAccountEntryForm } from "@/components/suivi/account-entry-form";

export const metadata: Metadata = { title: "Opération compte · Suivi" };

export default async function SuiviCompteMouvementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.accounts.manage");
  const { id } = await params;

  const account = await prisma.svAccount.findUnique({ where: { id } });
  if (!account) notFound();

  return (
    <PageShell>
      <PageHeader
        title={`Opération — ${SV_ACCOUNT_KIND_LABEL[account.kind]}`}
        description="Crédit, débit ou transfert banque ↔ physique. Une seule source : registre Mouvements."
        backHref={`/suivi/comptes/${account.id}`}
      />
      <SvAccountEntryForm accountId={account.id} accountKind={account.kind} />
    </PageShell>
  );
}
