import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { formatXof } from "@/lib/comptabilite/money";
import { BankMatchForm } from "@/components/comptabilite/bank-match-form";

export const metadata: Metadata = { title: "Compte bancaire" };

export default async function ComptabiliteBanqueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.access")) redirect("/accueil");
  const { id } = await params;

  const bank = await prisma.cptBankAccount.findUnique({
    where: { id },
    include: {
      txns: {
        orderBy: { txnDate: "desc" },
        take: 200,
        include: { matchedEntry: { select: { number: true, label: true } } },
      },
    },
  });
  if (!bank) notFound();

  const canManage = hasPermission(user, "cpt.banques.manage");
  const canMatch = hasPermission(user, "cpt.rapprochement");

  const validatedEntries = canMatch
    ? await prisma.cptEntry.findMany({
        where: { status: "VALIDATED" },
        orderBy: { entryDate: "desc" },
        take: 150,
        select: { id: true, number: true, label: true },
      })
    : [];

  const solde = bank.txns.reduce((s, t) => s + t.amount, 0);

  return (
    <PageShell>
      <PageHeader
        title={bank.label}
        description={`${bank.bankName} · ${bank.accountRef ?? "Réf. à renseigner"}`}
        backHref="/comptabilite/banques"
        backLabel="Retour aux banques"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Banques", href: "/comptabilite/banques" },
          { label: bank.label },
        ]}
        actions={
          canManage ? (
            <Link prefetch={false}
              href={`/comptabilite/banques/${bank.id}/mouvements/nouveau`}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
            >
              Nouveau mouvement
            </Link>
          ) : null
        }
      />

      <Surface className="p-5">
        <p className="text-sm text-msk-ink/50">Solde (mouvements saisis)</p>
        <p className="mt-1 text-3xl font-semibold text-msk-ink">
          {formatXof(solde)}
        </p>
      </Surface>

      {bank.txns.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          Aucun mouvement enregistré.
        </Surface>
      ) : (
        <Surface className="overflow-x-auto">
          <table className="w-full min-w-205 text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Libellé</th>
                <th className="px-4 py-3 font-medium">Montant</th>
                <th className="px-4 py-3 font-medium">Rapprochement</th>
              </tr>
            </thead>
            <tbody>
              {bank.txns.map((t) => (
                <tr key={t.id} className="border-b border-msk-ink/5">
                  <td className="px-4 py-3 text-msk-ink/70">
                    {t.txnDate.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    {t.label}
                    {t.note ? (
                      <span className="ml-2 text-xs text-msk-ink/40">
                        {t.note}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        t.amount >= 0 ? "text-emerald-700" : "text-msk-coral"
                      }
                    >
                      {formatXof(t.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canMatch ? (
                      <BankMatchForm
                        txnId={t.id}
                        entries={validatedEntries}
                        matchedEntryId={t.matchedEntryId}
                      />
                    ) : t.matchedEntry ? (
                      <Badge tone="success">{t.matchedEntry.number}</Badge>
                    ) : (
                      <Badge tone="muted">Non rapproché</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      )}
    </PageShell>
  );
}
