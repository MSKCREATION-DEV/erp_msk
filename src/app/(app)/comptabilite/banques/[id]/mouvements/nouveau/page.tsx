import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BankTxnForm } from "@/components/comptabilite/bank-txn-form";

export const metadata: Metadata = { title: "Nouveau mouvement" };

export default async function ComptabiliteBanqueMouvementNouveauPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.banques.manage")) {
    redirect("/comptabilite/banques");
  }
  const { id } = await params;

  const bank = await prisma.cptBankAccount.findUnique({
    where: { id },
    select: { id: true, label: true },
  });
  if (!bank) notFound();

  return (
    <PageShell>
      <PageHeader
        title="Nouveau mouvement"
        description={bank.label}
        backHref={`/comptabilite/banques/${bank.id}`}
        backLabel="Retour au compte"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Banques", href: "/comptabilite/banques" },
          { label: bank.label, href: `/comptabilite/banques/${bank.id}` },
          { label: "Nouveau mouvement" },
        ]}
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Saisir un mouvement</CardTitle>
          <CardDescription>
            Montant positif = crédit (encaissement), négatif = débit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BankTxnForm bankAccountId={bank.id} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
