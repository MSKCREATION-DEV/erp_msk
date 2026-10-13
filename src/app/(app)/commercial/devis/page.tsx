import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FilePlus2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { comQuoteOwnerScopeWhere } from "@/lib/commercial/scope";
import {
  formatComMoney,
  quoteStatusTone,
  QUOTE_STATUS_LABELS,
} from "@/lib/commercial/labels";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import { firstParam } from "@/lib/list/search-params";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ActionLink } from "@/components/ui/action-link";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListPagination } from "@/components/ui/list-pagination";

export const metadata: Metadata = { title: "Devis" };

export default async function CommercialDevisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (
    !hasPermission(user, "com.devis.create") &&
    !hasPermission(user, "com.devis.edit_own") &&
    !hasPermission(user, "com.access")
  ) {
    redirect("/accueil");
  }

  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const requestedPage = parsePage(firstParam(raw.page));
  const pageSize = DEFAULT_PAGE_SIZE;

  const where = {
    AND: [
      comQuoteOwnerScopeWhere(user),
      ...(q
        ? [
            {
              OR: [
                { number: { contains: q, mode: "insensitive" as const } },
                { object: { contains: q, mode: "insensitive" as const } },
                {
                  client: {
                    name: { contains: q, mode: "insensitive" as const },
                  },
                },
              ],
            },
          ]
        : []),
    ],
  };

  const total = await prisma.comQuote.count({ where });
  const page = clampPage(requestedPage, total, pageSize);
  const quotes = await prisma.comQuote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      client: { select: { name: true } },
    },
  });

  const pages = totalPages(total, pageSize);
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
  };

  return (
    <PageShell>
      <PageHeader
        title="Devis"
        description="Propositions commerciales — brouillon à accepté."
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Devis" },
        ]}
        actions={
          hasPermission(user, "com.devis.create") ? (
            <ActionLink href="/commercial/devis/nouveau" icon={FilePlus2}>
              Nouveau devis
            </ActionLink>
          ) : null
        }
      />

      <div className="mb-4">
        <Suspense fallback={null}>
          <ListSearchForm
            placeholder="N°, client, objet…"
            className="sm:max-w-md"
          />
        </Suspense>
      </div>

      {quotes.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          {q ? (
            <>Aucun devis pour « {q} ».</>
          ) : (
            <>
              Aucun devis.{" "}
              {hasPermission(user, "com.devis.create") ? (
                <Link
                  prefetch={false}
                  href="/commercial/devis/nouveau"
                  className="font-medium text-msk-blue hover:underline"
                >
                  Créer le premier
                </Link>
              ) : null}
            </>
          )}
        </Surface>
      ) : (
        <Surface className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-left text-sm">
              <thead className="border-b border-msk-ink/10 bg-msk-chalk/40 text-msk-ink/45">
                <tr>
                  <th className="px-4 py-3 font-medium">N°</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Objet</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">TTC</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-msk-ink/5 hover:bg-msk-chalk/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        prefetch={false}
                        href={`/commercial/devis/${row.id}`}
                        className="font-medium text-msk-blue hover:underline"
                      >
                        {row.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.client.name}</td>
                    <td className="max-w-[14rem] truncate px-4 py-3 text-msk-ink/70">
                      {row.object ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={quoteStatusTone(row.status)}>
                        {QUOTE_STATUS_LABELS[row.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatComMoney(row.totalTtc, row.currency)}
                    </td>
                    <td className="px-4 py-3 text-msk-ink/55">
                      {row.createdAt.toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPagination
            pathname="/commercial/devis"
            searchParams={listParams}
            page={page}
            totalPages={pages}
            total={total}
            pageSize={pageSize}
          />
        </Surface>
      )}
    </PageShell>
  );
}
