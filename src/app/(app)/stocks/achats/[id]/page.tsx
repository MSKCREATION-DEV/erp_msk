import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { PurchaseStatusButtons } from "@/components/stocks/purchase-status-buttons";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Fiche achat" };

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  ORDERED: "Commandé",
  RECEIVED: "Réceptionné",
  CANCELLED: "Annulé",
};

function qtyStr(d: Prisma.Decimal | number) {
  return Number(d).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
}

function xof(n: number) {
  return n.toLocaleString("fr-FR") + " XOF";
}

export default async function StocksAchatDetailPage({ params }: Props) {
  const user = await requireUser();
  if (!hasAnyPermission(user, ["stk.achats.manage", "stk.access"])) {
    redirect("/accueil");
  }
  const { id } = await params;
  const canManage = hasPermission(user, "stk.achats.manage");

  const purchase = await prisma.stkPurchase.findUnique({
    where: { id },
    include: {
      lines: { orderBy: { sortOrder: "asc" }, include: { article: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });
  if (!purchase) notFound();

  const total = purchase.lines.reduce(
    (sum, l) => sum + Math.round(Number(l.quantity) * l.unitPriceXof),
    0,
  );

  return (
    <PageShell>
      <PageHeader
        title={purchase.number}
        description={`${purchase.supplierName} · ${STATUS_LABEL[purchase.status] ?? purchase.status}`}
        backHref="/stocks/achats"
        backLabel="Retour achats"
        breadcrumbs={[
          { label: "Stocks", href: "/stocks" },
          { label: "Achats", href: "/stocks/achats" },
          { label: purchase.number },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="p-5">
          <p className="text-xs font-semibold tracking-caps uppercase text-msk-ink/45">
            Fournisseur
          </p>
          <p className="mt-2 font-semibold text-msk-ink">{purchase.supplierName}</p>
          {purchase.supplierContact ? (
            <p className="mt-1 text-sm text-msk-ink/55">{purchase.supplierContact}</p>
          ) : null}
          {purchase.notes ? (
            <p className="mt-3 text-sm text-msk-ink/70">{purchase.notes}</p>
          ) : null}
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-msk-ink/45">Créé par</dt>
              <dd>
                {purchase.createdBy.firstName} {purchase.createdBy.lastName}
              </dd>
            </div>
            {purchase.orderedAt ? (
              <div className="flex justify-between gap-2">
                <dt className="text-msk-ink/45">Commandé le</dt>
                <dd>{purchase.orderedAt.toLocaleDateString("fr-FR")}</dd>
              </div>
            ) : null}
            {purchase.receivedAt ? (
              <div className="flex justify-between gap-2">
                <dt className="text-msk-ink/45">Réceptionné le</dt>
                <dd>{purchase.receivedAt.toLocaleDateString("fr-FR")}</dd>
              </div>
            ) : null}
            {purchase.cptEntryId ? (
              <div className="flex justify-between gap-2">
                <dt className="text-msk-ink/45">Écriture AC</dt>
                <dd>
                  <Link
                    href={`/comptabilite/ecritures/${purchase.cptEntryId}`}
                    className="text-msk-blue hover:underline"
                  >
                    Voir l’écriture
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>
        </Surface>

        {canManage && purchase.status !== "RECEIVED" && purchase.status !== "CANCELLED" ? (
          <Surface className="p-5">
            <p className="mb-3 text-xs font-semibold tracking-caps uppercase text-msk-ink/45">
              Workflow
            </p>
            <PurchaseStatusButtons purchaseId={purchase.id} status={purchase.status} />
          </Surface>
        ) : null}
      </div>

      <Surface className="overflow-x-auto p-0">
        <div className="border-b border-msk-paper px-4 py-3">
          <h2 className="text-sm font-semibold text-msk-ink">Lignes</h2>
        </div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-msk-paper bg-msk-chalk/60 text-xs tracking-caps uppercase text-msk-ink/45">
            <tr>
              <th className="px-4 py-3 font-semibold">Libellé</th>
              <th className="px-4 py-3 font-semibold">Article</th>
              <th className="px-4 py-3 font-semibold text-right">Qté</th>
              <th className="px-4 py-3 font-semibold text-right">PU</th>
              <th className="px-4 py-3 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-msk-paper">
            {purchase.lines.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3">{l.label}</td>
                <td className="px-4 py-3 text-msk-ink/55">
                  {l.article ? (
                    <Link
                      href={`/stocks/articles/${l.article.id}`}
                      className="text-msk-blue hover:underline"
                    >
                      {l.article.code}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{qtyStr(l.quantity)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{xof(l.unitPriceXof)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {xof(Math.round(Number(l.quantity) * l.unitPriceXof))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-msk-paper bg-msk-chalk/40">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-right font-semibold text-msk-ink/55">
                Total HT
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-msk-ink">
                {xof(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Surface>
    </PageShell>
  );
}
