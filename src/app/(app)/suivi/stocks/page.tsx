import type { Metadata } from "next";
import { PackagePlus, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ListTableScroll } from "@/components/ui/list-table-scroll";
import { ClickableRowLink } from "@/components/ui/clickable-row-link";
import { ActionLink } from "@/components/ui/action-link";
import { SvStockListActions } from "@/components/suivi/stock-list-actions";

export const metadata: Metadata = { title: "Stocks · Suivi" };

export default async function SuiviStocksPage() {
  const user = await requireUser();
  requireSvPermission(user, "sv.stock.view");
  const canManage = hasPermission(user, "sv.stock.manage");

  const items = await prisma.svStockItem.findMany({
    where: { archivedAt: null },
    orderBy: [{ family: "asc" }, { code: "asc" }],
  });

  return (
    <PageShell>
      <PageHeader
        title="Stocks"
        description="Inventaire courant — articles tampon Suivi."
        backHref="/suivi"
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <ActionLink
                href="/suivi/stocks/mouvements/nouveau"
                icon={PackagePlus}
                variant="secondary"
              >
                Mouvement
              </ActionLink>
              <ActionLink href="/suivi/stocks/nouveau" icon={Plus}>
                Nouvel article
              </ActionLink>
            </div>
          ) : null
        }
      />
      <Surface className="overflow-hidden p-0">
        {items.length === 0 ? (
          <div className="px-6 py-12 text-center" role="status">
            <p className="text-sm font-medium text-msk-ink">Aucun article</p>
            <p className="mt-1 text-sm text-msk-ink/55">
              Créez un article ou lancez le seed inventaire Direction.
            </p>
            {canManage ? (
              <div className="mt-4 flex justify-center">
                <ActionLink href="/suivi/stocks/nouveau" icon={Plus}>
                  Nouvel article
                </ActionLink>
              </div>
            ) : null}
          </div>
        ) : (
          <ListTableScroll>
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-msk-ink/6 bg-msk-chalk/60 text-xs uppercase tracking-caps text-msk-ink/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Famille</th>
                  <th className="px-4 py-3 font-medium">Désignation</th>
                  <th className="px-4 py-3 font-medium text-right">Qté</th>
                  <th className="px-4 py-3 font-medium">Unité</th>
                  <th className="px-4 py-3 font-medium">Emplacement</th>
                  <th className="px-2 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-msk-ink/6">
                {items.map((item) => (
                  <ClickableRowLink
                    key={item.id}
                    href={`/suivi/stocks/${item.id}`}
                    className={
                      item.quantity === 0 ? "bg-msk-coral/4" : undefined
                    }
                  >
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {item.code}
                    </td>
                    <td className="px-4 py-3 text-msk-ink/65">{item.family}</td>
                    <td className="px-4 py-3">
                      <p>{item.label}</p>
                      {item.observations ? (
                        <p className="text-xs text-msk-ink/40 line-clamp-1">
                          {item.observations}
                        </p>
                      ) : null}
                    </td>
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
                    <td className="px-2 py-3">
                      <SvStockListActions
                        itemId={item.id}
                        canManage={canManage}
                      />
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
