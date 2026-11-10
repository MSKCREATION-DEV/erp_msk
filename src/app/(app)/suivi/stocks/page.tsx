import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ListTableScroll } from "@/components/ui/list-table-scroll";
import { ClickableRowLink } from "@/components/ui/clickable-row-link";

export const metadata: Metadata = { title: "Stocks · Suivi" };

export default async function SuiviStocksPage() {
  const user = await requireUser();
  requireSvPermission(user, "sv.stock.view");
  const canManage =
    hasPermission(user, "sv.stock.manage") || user.isSuperAdmin;

  const items = await prisma.svStockItem.findMany({
    orderBy: [{ family: "asc" }, { code: "asc" }],
  });

  return (
    <PageShell>
      <PageHeader
        title="Stocks"
        description="Snapshot articles tampon (inventaire fichier)."
        backHref="/suivi"
        actions={
          canManage ? (
            <Link
              href="/suivi/stocks/mouvements/nouveau"
              className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
            >
              Mouvement stock
            </Link>
          ) : null
        }
      />
      <Surface className="overflow-hidden p-0">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/55">Aucun article.</p>
        ) : (
          <ListTableScroll>
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-msk-ink/6 bg-msk-chalk/60 text-xs uppercase tracking-caps text-msk-ink/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Famille</th>
                  <th className="px-4 py-3 font-medium">Désignation</th>
                  <th className="px-4 py-3 font-medium text-right">Qty</th>
                  <th className="px-4 py-3 font-medium">Unité</th>
                  <th className="px-4 py-3 font-medium">Emplacement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-msk-ink/6">
                {items.map((item) => (
                  <ClickableRowLink
                    key={item.id}
                    href={`/suivi/stocks/${item.id}`}
                    className={item.quantity === 0 ? "bg-msk-coral/4" : undefined}
                  >
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {item.code}
                    </td>
                    <td className="px-4 py-3 text-msk-ink/65">{item.family}</td>
                    <td className="px-4 py-3">{item.label}</td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${
                        item.quantity === 0
                          ? "font-semibold text-msk-coral"
                          : ""
                      }`}
                    >
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-msk-ink/60">{item.unit}</td>
                    <td className="px-4 py-3 text-msk-ink/60">
                      {item.location ?? "—"}
                    </td>
                  </ClickableRowLink>
                ))}
              </tbody>
            </table>
          </ListTableScroll>
        )}
      </Surface>
    </PageShell>
  );
}
