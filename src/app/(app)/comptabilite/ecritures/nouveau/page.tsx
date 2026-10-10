import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
import { EntryForm } from "@/components/comptabilite/entry-form";

export const metadata: Metadata = { title: "Nouvelle écriture" };

export default async function ComptabiliteEcritureNouveauPage({
  searchParams,
}: {
  searchParams: Promise<{ journalId?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.ecritures.manage")) {
    redirect("/comptabilite/ecritures");
  }
  const { journalId } = await searchParams;

  const [journals, accounts] = await Promise.all([
    prisma.cptJournal.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, code: true, label: true },
    }),
    prisma.cptAccount.findMany({
      where: { active: true, isPostable: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, label: true },
    }),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Nouvelle écriture"
        description="Grille de saisie — débit / crédit équilibrés."
        backHref="/comptabilite/ecritures"
        backLabel="Retour aux écritures"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Écritures", href: "/comptabilite/ecritures" },
          { label: "Nouvelle" },
        ]}
      />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Saisir une écriture</CardTitle>
          <CardDescription>
            Enregistrée en brouillon — validation séparée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {journals.length === 0 || accounts.length === 0 ? (
            <p className="text-sm text-msk-ink/55">
              Journaux ou plan de comptes manquants — contactez un
              administrateur.
            </p>
          ) : (
            <EntryForm
              journals={journals}
              accounts={accounts}
              defaultJournalId={journalId}
            />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
