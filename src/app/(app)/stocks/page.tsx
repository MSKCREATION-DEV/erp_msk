import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeftRight, Package, ShoppingCart } from "lucide-react";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { KpiGrid } from "@/components/ui/kpi-card";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Stocks" };

function qtyStr(d: Prisma.Decimal | number) {
  return Number(d).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
}

export default async function StocksHubPage() {
  const user = await requireUser();
  if (!hasPermission(user, "stk.access")) redirect("/accueil");

  const [articleCount, activeCount, recentMoves, alertArticles] =
    await Promise.all([
      prisma.stkArticle.count(),
      prisma.stkArticle.count({ where: { active: true } }),
      prisma.stkMovement.findMany({
        take: 8,
        orderBy: { movedAt: "desc" },
        include: { article: true },
      }),
      hasPermission(user, "stk.alerts.view")
        ? prisma.stkArticle.findMany({
            where: {
              active: true,
              stockMin: { gt: 0 },
            },
            orderBy: { code: "asc" },
          })
        : Promise.resolve([]),
    ]);

  const alerts = alertArticles.filter((a) =>
    new Prisma.Decimal(a.qtyOnHand).lte(a.stockMin),
  );

  const canManage = hasPermission(user, "stk.articles.manage");
  const canMove = hasPermission(user, "stk.moves.create");
  const canAchats = hasPermission(user, "stk.achats.manage");

  const tiles = [
    {
      href: "/stocks/articles",
      label: "Articles",
      icon: Package,
      desc: "Catalogue, familles, emplacements",
    },
    {
      href: "/stocks/mouvements",
      label: "Mouvements",
      icon: ArrowLeftRight,
      desc: "Entrées, sorties, ajustements",
    },
    ...(canAchats
      ? [
          {
            href: "/stocks/achats",
            label: "Achats",
            icon: ShoppingCart,
            desc: "Commandes fournisseurs et réception",
          },
        ]
      : []),
  ];

  return (
    <PageShell>
      <PageHeader
        title="Stocks"
        description="Catalogue articles, mouvements et alertes stock minimum."
        breadcrumbs={[{ label: "Stocks" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Link
                href="/stocks/articles/nouveau"
                className="inline-flex items-center rounded-lg bg-msk-blue px-3 py-2 text-sm font-semibold text-white"
              >
                Nouvel article
              </Link>
            ) : null}
            {canMove ? (
              <Link
                href="/stocks/mouvements/nouveau"
                className="inline-flex items-center rounded-lg border border-msk-paper bg-white px-3 py-2 text-sm font-semibold text-msk-ink"
              >
                Nouveau mouvement
              </Link>
            ) : null}
          </div>
        }
      />

      <KpiGrid
        items={[
          { label: "Articles", value: String(articleCount), hint: `${activeCount} actifs` },
          {
            label: "Alertes stock min",
            value: String(alerts.length),
            hint: hasPermission(user, "stk.alerts.view") ? "qty ≤ min" : "—",
          },
          {
            label: "Derniers mvts",
            value: String(recentMoves.length),
            hint: "historique récent",
          },
        ]}
      />

      {alerts.length > 0 ? (
        <Surface className="border-msk-coral/25 bg-msk-coral/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-msk-coral">
            <AlertTriangle className="h-4 w-4" />
            Stock sous le minimum ({alerts.length})
          </div>
          <ul className="space-y-1 text-sm text-msk-ink/80">
            {alerts.slice(0, 8).map((a) => (
              <li key={a.id}>
                <Link
                  href={`/stocks/articles/${a.id}`}
                  className="text-msk-blue hover:underline"
                >
                  {a.code}
                </Link>{" "}
                — {a.designation} : {qtyStr(a.qtyOnHand)} / min {qtyStr(a.stockMin)}{" "}
                {a.unit}
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map((item) => (
          <Link key={item.href} href={item.href}>
            <Surface className="h-full p-5 transition hover:border-msk-blue/30">
              <item.icon className="mb-3 h-5 w-5 text-msk-blue" />
              <p className="font-semibold text-msk-ink">{item.label}</p>
              <p className="mt-1 text-sm text-msk-ink/50">{item.desc}</p>
            </Surface>
          </Link>
        ))}
      </div>

      <Surface className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-caps text-msk-ink/60 uppercase">
            Derniers mouvements
          </h2>
          {hasAnyPermission(user, ["stk.access", "stk.moves.create"]) ? (
            <Link
              href="/stocks/mouvements"
              className="text-sm font-medium text-msk-blue hover:underline"
            >
              Tout voir
            </Link>
          ) : null}
        </div>
        {recentMoves.length === 0 ? (
          <p className="text-sm text-msk-ink/45">Aucun mouvement pour l’instant.</p>
        ) : (
          <ul className="divide-y divide-msk-paper text-sm">
            {recentMoves.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-2"
              >
                <span>
                  <span className="font-medium text-msk-ink">{m.type}</span>{" "}
                  <Link
                    href={`/stocks/articles/${m.articleId}`}
                    className="text-msk-blue hover:underline"
                  >
                    {m.article.code}
                  </Link>{" "}
                  <span className="text-msk-ink/50">{m.article.designation}</span>
                </span>
                <span className="tabular-nums text-msk-ink/70">
                  {qtyStr(m.quantity)} → {qtyStr(m.qtyAfter)} {m.article.unit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </PageShell>
  );
}
