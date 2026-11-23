import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { requireSvResourceCountry } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { SV_ACCOUNT_KIND_LABEL } from "@/lib/suivi/accounts";
import {
  svCountryDisplayLabel,
  withSvCountryQuery,
} from "@/lib/suivi/country";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvAccountEntryForm } from "@/components/suivi/account-entry-form";

export const metadata: Metadata = { title: "Opération compte · Suivi" };

export default async function SuiviCompteMouvementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const rawSp = await searchParams;

  const account = await prisma.svAccount.findUnique({ where: { id } });
  if (!account) notFound();

  const country = requireSvResourceCountry(
    user,
    "sv.accounts.manage",
    rawSp,
    account.country,
  );

  return (
    <PageShell>
      <PageHeader
        title={`Opération — ${SV_ACCOUNT_KIND_LABEL[account.kind]}`}
        description={`Crédit, débit ou virement banque ↔ caisse · ${svCountryDisplayLabel(country)}. Une seule source : registre Mouvements.`}
        backHref={withSvCountryQuery(`/suivi/comptes/${account.id}`, country)}
      />
      <SvAccountEntryForm
        accountId={account.id}
        accountKind={account.kind}
        country={country}
      />
    </PageShell>
  );
}
