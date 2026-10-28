import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/list/search-params";
import { parseListSort, type SortColumnMap, type SortDir } from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { SortableTh } from "@/components/ui/sortable-th";

export const metadata: Metadata = { title: "Achats stock" };

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  ORDERED: "Commandé",
  RECEIVED: "Réceptionné",
  CANCELLED: "Annulé",
};

const PURCHASE_SORT_COLUMNS = {
  number: (dir: SortDir) => ({ number: dir }),
  supplier: (dir: SortDir) => ({ supplierName: dir }),
  status: (dir: SortDir) => ({ status: dir }),
  lines: (dir: SortDir) => ({ lines: { _count: dir } }),
  createdAt: (dir: SortDir) => ({ createdAt: dir }),
  by: (dir: SortDir) => ({ createdBy: { lastName: dir } }),
} satisfies SortColumnMap<
  "number" | "supplier" | "status" | "lines" | "createdAt" | "by"
>;

export default async function StocksAchatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasAnyPermission(user, ["stk.achats.manage", "stk.access"])) {
    redirect("/accueil");
  }
  const canManage = hasPermission(user, "stk.achats.manage");

  const raw = await searchParams;
  const sp: Record<string, string | undefined> = {
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, PURCHASE_SORT_COLUMNS, {
    key: "createdAt",
    dir: "desc",
  });
  const listParams: Record<string, string | undefined> = {
    sort: sort.key,
    dir: sort.dir,
  };

  const purchases = await prisma.stkPurchase.findMany({
    take: 100,
    orderBy: sort.orderBy as Prisma.StkPurchaseOrderByWithRelationInput,
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      _count: { select: { lines: true } },
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Achats"
        description="Commandes fournisseurs, réception stock et proposition écriture AC."
        backHref="/stocks"
        backLabel="Retour stocks"
        breadcrumbs={[
          { label: "Stocks", href: "/stocks" },
          { label: "Achats" },
        ]}
        actions={
          canManage ? (
            <Link
              prefetch={false}
              href="/stocks/achats/nouveau"
              className="inline-flex rounded-lg bg-msk-blue px-3 py-2 text-sm font-semibold text-white"
            >
              Nouvel achat
            </Link>
          ) : null
        }
      />

      <Surface className="overflow-x-auto p-0">
        {purchases.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/45">
            Aucun achat.{" "}
            {canManage ? (
              <Link
                prefetch={false}
                href="/stocks/achats/nouveau"
                className="text-msk-blue"
              >
                Créer le premier
              </Link>
            ) : null}
          </p>
        ) : (
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="border-b border-msk-paper bg-msk-chalk/60 text-xs tracking-caps uppercase text-msk-ink/45">
              <tr>
                <SortableTh
                  label="N°"
                  column="number"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/achats"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Fournisseur"
                  column="supplier"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/achats"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Statut"
                  column="status"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/achats"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Lignes"
                  column="lines"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/achats"
                  searchParams={listParams}
                  defaultDir="desc"
                  align="right"
                />
                <SortableTh
                  label="Créé le"
                  column="createdAt"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/achats"
                  searchParams={listParams}
                  defaultDir="desc"
                />
                <SortableTh
                  label="Par"
                  column="by"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/achats"
                  searchParams={listParams}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-paper">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-msk-chalk/40">
                  <td className="px-4 py-3">
                    <Link
                      prefetch={false}
                      href={`/stocks/achats/${p.id}`}
                      className="font-medium text-msk-blue hover:underline"
                    >
                      {p.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-msk-ink">{p.supplierName}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-msk-ink/5 px-2 py-0.5 text-xs font-medium">
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p._count.lines}
                  </td>
                  <td className="px-4 py-3 text-msk-ink/55">
                    {p.createdAt.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-msk-ink/55">
                    {p.createdBy.firstName} {p.createdBy.lastName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Surface>
    </PageShell>
  );
}
