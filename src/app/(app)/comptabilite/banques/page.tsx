import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { formatXof } from "@/lib/comptabilite/money";

export const metadata: Metadata = { title: "Banques" };

export default async function ComptabiliteBanquesPage() {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.access")) redirect("/accueil");

  const banks = await prisma.cptBankAccount.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { txns: true } },
      txns: { select: { amount: true } },
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Banques"
        description="Comptes bancaires, mouvements et rapprochement."
        backHref="/comptabilite"
        backLabel="Retour Comptabilité"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Banques" },
        ]}
      />

      {banks.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          Aucun compte bancaire configuré.
        </Surface>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {banks.map((b) => {
            const solde = b.txns.reduce((s, t) => s + t.amount, 0);
            return (
              <Link prefetch={false} key={b.id} href={`/comptabilite/banques/${b.id}`}>
                <Surface className="h-full p-5 transition hover:border-msk-blue/30 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-msk-ink">{b.label}</p>
                    {b.active ? (
                      <Badge tone="success">Actif</Badge>
                    ) : (
                      <Badge tone="muted">Inactif</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-msk-ink/50">
                    {b.bankName} · {b.accountRef ?? "Réf. à renseigner"}
                  </p>
                  <p className="mt-4 text-2xl font-semibold text-msk-ink">
                    {formatXof(solde)}
                  </p>
                  <p className="mt-1 text-xs text-msk-ink/40">
                    {b._count.txns} mouvement(s)
                  </p>
                </Surface>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
