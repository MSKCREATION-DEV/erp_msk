import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { ensureSvAccounts, getSvAccountByKind } from "@/lib/suivi/accounts";
import {
  normalizeSvCategoryFamily,
  SV_CATEGORY_FAMILIES,
  SV_CATEGORY_FAMILY_LABEL,
} from "@/lib/suivi/categories";
import { formatSvXof } from "@/lib/suivi/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ListTableScroll } from "@/components/ui/list-table-scroll";
import { Badge } from "@/components/ui/badge";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Mouvements · Suivi" };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const filterSchema = z.object({
  direction: z.enum(["IN", "OUT"]).optional(),
  from: z.string().regex(ISO_DATE).optional(),
  to: z.string().regex(ISO_DATE).optional(),
  compte: z.enum(["PHYSICAL", "BANK"]).optional(),
  categorie: z.enum(SV_CATEGORY_FAMILIES).optional(),
  category: z.string().max(80).optional(),
});

function first(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function SuiviMouvementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.movements.view");
  const canManage =
    hasPermission(user, "sv.movements.manage") || user.isSuperAdmin;

  const raw = await searchParams;
  const parsed = filterSchema.safeParse({
    direction: first(raw, "direction"),
    from: first(raw, "from"),
    to: first(raw, "to"),
    compte: first(raw, "compte"),
    categorie: first(raw, "categorie"),
    category: first(raw, "category"),
  });
  const filters = parsed.success ? parsed.data : {};

  const where: Prisma.SvCashMovementWhereInput = {};
  if (filters.direction) where.direction = filters.direction;
  if (filters.from || filters.to) {
    where.movedAt = {};
    if (filters.from) {
      where.movedAt.gte = new Date(`${filters.from}T00:00:00.000Z`);
    }
    if (filters.to) {
      where.movedAt.lte = new Date(`${filters.to}T23:59:59.999Z`);
    }
  }
  if (filters.compte) {
    await ensureSvAccounts(prisma);
    const acc = await getSvAccountByKind(filters.compte, prisma);
    where.accountId = acc.id;
  }
  if (filters.category) {
    where.category = filters.category;
  }

  const movements = await prisma.svCashMovement.findMany({
    where,
    orderBy: [{ movedAt: "desc" }, { createdAt: "desc" }],
    take: filters.from || filters.categorie ? 800 : 200,
    include: {
      account: { select: { kind: true, label: true } },
    },
  });

  const rows =
    filters.categorie && !filters.category
      ? movements.filter(
          (m) => normalizeSvCategoryFamily(m.category) === filters.categorie,
        )
      : movements;

  const inSum = rows
    .filter((m) => m.direction === "IN")
    .reduce((s, m) => s + m.amount, 0);
  const outSum = rows
    .filter((m) => m.direction === "OUT")
    .reduce((s, m) => s + m.amount, 0);
  const solde = inSum - outSum;
  const hasFilters = Boolean(
    filters.direction ||
      filters.from ||
      filters.to ||
      filters.compte ||
      filters.categorie ||
      filters.category,
  );

  const filterChips: string[] = [];
  if (filters.direction) filterChips.push(filters.direction);
  if (filters.from || filters.to) {
    filterChips.push(
      `${filters.from ?? "…"} → ${filters.to ?? "…"}`,
    );
  }
  if (filters.compte) filterChips.push(filters.compte);
  if (filters.categorie) {
    filterChips.push(SV_CATEGORY_FAMILY_LABEL[filters.categorie]);
  }
  if (filters.category) filterChips.push(filters.category);

  return (
    <PageShell>
      <PageHeader
        title="Mouvements"
        description="Registre entrées / sorties — trésorerie tampon (pas de caisse métier)."
        backHref="/suivi"
        actions={
          <div className="flex flex-wrap gap-2">
            {hasFilters ? (
              <Link
                href="/suivi/mouvements"
                className="inline-flex h-9 items-center rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium hover:bg-msk-chalk"
              >
                Réinitialiser filtres
              </Link>
            ) : null}
            <Link
              href="/suivi/tableau-de-bord"
              className="inline-flex h-9 items-center rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium hover:bg-msk-chalk"
            >
              Tableau de bord
            </Link>
            {canManage ? (
              <Link
                href="/suivi/mouvements/nouveau"
                className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
              >
                Nouveau mouvement
              </Link>
            ) : null}
          </div>
        }
      />

      {hasFilters ? (
        <p className="mb-3 text-sm text-msk-ink/55">
          Filtres : {filterChips.join(" · ")}
        </p>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
          <p className="text-xs uppercase tracking-caps text-msk-ink/45">
            Entrées
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatSvXof(inSum)}
          </p>
        </div>
        <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
          <p className="text-xs uppercase tracking-caps text-msk-ink/45">
            Sorties
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatSvXof(outSum)}
          </p>
        </div>
        <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
          <p className="text-xs uppercase tracking-caps text-msk-ink/45">
            Solde
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatSvXof(solde)}
          </p>
        </div>
      </div>

      <Surface className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/55">
            Aucun mouvement
            {hasFilters ? " pour ces filtres" : ""}.
          </p>
        ) : (
          <ListTableScroll>
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-msk-ink/6 bg-msk-chalk/60 text-xs uppercase tracking-caps text-msk-ink/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Sens</th>
                  <th className="px-4 py-3 font-medium">Catégorie</th>
                  <th className="px-4 py-3 font-medium">Compte</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Projet</th>
                  <th className="px-4 py-3 font-medium text-right">Montant</th>
                  <th className="px-4 py-3 font-medium">Réf.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-msk-ink/6">
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.movedAt.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={m.direction === "IN" ? "success" : "coral"}>
                        {m.direction === "IN" ? "Entrée" : "Sortie"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{m.category}</td>
                    <td className="px-4 py-3 text-msk-ink/60">
                      {m.account?.label ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-msk-ink/70">
                      {m.description ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-msk-ink/60">
                      {m.clientProject ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatSvXof(m.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-msk-ink/45">
                      {m.reference ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ListTableScroll>
        )}
      </Surface>
    </PageShell>
  );
}
