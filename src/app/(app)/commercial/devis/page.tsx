import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { comQuoteOwnerScopeWhere } from "@/lib/commercial/scope";
import {
  formatComMoney,
  QUOTE_STATUS_LABELS,
} from "@/lib/commercial/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Devis" };

const linkPrimary =
  "inline-flex h-9 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90";

export default async function CommercialDevisPage() {
  const user = await requireUser();
  if (
    !hasPermission(user, "com.devis.create") &&
    !hasPermission(user, "com.devis.edit_own") &&
    !hasPermission(user, "com.access")
  ) {
    redirect("/accueil");
  }

  const quotes = await prisma.comQuote.findMany({
    where: comQuoteOwnerScopeWhere(user),
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      client: { select: { name: true } },
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Devis"
        description="Documents commerciaux — brouillon à accepté."
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Devis" },
        ]}
        actions={
          hasPermission(user, "com.devis.create") ? (
            <Link href="/commercial/devis/nouveau" className={linkPrimary}>
              Nouveau devis
            </Link>
          ) : null
        }
      />

      {quotes.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          Aucun devis.{" "}
          {hasPermission(user, "com.devis.create") ? (
            <Link
              href="/commercial/devis/nouveau"
              className="font-medium text-msk-blue hover:underline"
            >
              Créer le premier
            </Link>
          ) : null}
        </Surface>
      ) : (
        <Surface className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">N°</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">TTC</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-msk-ink/5 hover:bg-msk-chalk/60"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/commercial/devis/${q.id}`}
                      className="font-medium text-msk-blue hover:underline"
                    >
                      {q.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{q.client.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone="muted">{QUOTE_STATUS_LABELS[q.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {formatComMoney(q.totalTtc, q.currency)}
                  </td>
                  <td className="px-4 py-3 text-msk-ink/55">
                    {q.createdAt.toLocaleDateString("fr-FR")}
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
