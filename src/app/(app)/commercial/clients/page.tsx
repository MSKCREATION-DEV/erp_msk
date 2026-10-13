import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { comOwnerScopeWhere } from "@/lib/commercial/scope";
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
import { ActionLink } from "@/components/ui/action-link";
import { ClickableRowLink } from "@/components/ui/clickable-row-link";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListPagination } from "@/components/ui/list-pagination";

export const metadata: Metadata = { title: "Clients" };

export default async function CommercialClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (
    !hasPermission(user, "com.clients.view_own") &&
    !hasPermission(user, "com.clients.manage")
  ) {
    redirect("/commercial");
  }

  const canCreate = hasPermission(user, "com.clients.manage");
  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const requestedPage = parsePage(firstParam(raw.page));
  const pageSize = DEFAULT_PAGE_SIZE;

  const where = {
    AND: [
      comOwnerScopeWhere(user),
      ...(q
        ? [
            {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { contactName: { contains: q, mode: "insensitive" as const } },
                { city: { contains: q, mode: "insensitive" as const } },
                { phone: { contains: q, mode: "insensitive" as const } },
                { email: { contains: q, mode: "insensitive" as const } },
              ],
            },
          ]
        : []),
    ],
  };

  const total = await prisma.comClient.count({ where });
  const page = clampPage(requestedPage, total, pageSize);
  const clients = await prisma.comClient.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      _count: { select: { quotes: true, invoices: true } },
      owner: { select: { firstName: true, lastName: true } },
    },
  });

  const pages = totalPages(total, pageSize);
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
  };

  return (
    <PageShell>
      <PageHeader
        title="Clients"
        description="Clients signés — Commercial."
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Clients" },
        ]}
        actions={
          canCreate ? (
            <ActionLink href="/commercial/clients/nouveau" icon={UserPlus}>
              Nouveau client
            </ActionLink>
          ) : null
        }
      />

      <Surface className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-msk-ink/[0.06] px-4 py-3">
          <Suspense
            fallback={
              <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
            }
          >
            <ListSearchForm
              placeholder="Rechercher entreprise, contact, ville, téléphone…"
              className="sm:max-w-md"
            />
          </Suspense>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-220 text-left text-sm">
            <thead className="border-b border-msk-ink/[0.08] bg-msk-chalk/50 text-[11px] uppercase tracking-wide text-msk-ink/40">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Tél.</th>
                <th className="px-4 py-3 font-semibold">Ville</th>
                <th className="px-4 py-3 font-semibold">Suivi par</th>
                <th className="px-4 py-3 font-semibold">Devis</th>
                <th className="px-4 py-3 font-semibold">Factures</th>
                <th className="px-4 py-3 font-semibold">Mis à jour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-ink/[0.06]">
              {clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-msk-ink/40"
                  >
                    {q ? (
                      <>Aucun client pour « {q} ».</>
                    ) : (
                      <>
                        Aucun client pour l’instant.
                        {canCreate ? (
                          <>
                            {" "}
                            <Link
                              prefetch={false}
                              href="/commercial/clients/nouveau"
                              className="font-medium text-msk-blue hover:underline"
                            >
                              Créer le premier
                            </Link>
                          </>
                        ) : null}
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <ClickableRowLink
                    key={c.id}
                    href={`/commercial/clients/${c.id}`}
                  >
                    <td className="px-4 py-3 font-medium text-msk-ink">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-msk-ink/75">
                      {c.contactName ?? "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-msk-ink/75">
                      {c.phone?.trim() ? c.phone : "—"}
                    </td>
                    <td className="px-4 py-3 text-msk-ink/75">
                      {c.city ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-msk-ink/60">
                      {c.owner.firstName} {c.owner.lastName}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{c._count.quotes}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {c._count.invoices}
                    </td>
                    <td className="px-4 py-3 text-xs text-msk-ink/55">
                      {c.updatedAt.toLocaleDateString("fr-FR")}
                    </td>
                  </ClickableRowLink>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ListPagination
          pathname="/commercial/clients"
          searchParams={listParams}
          page={page}
          totalPages={pages}
          total={total}
          pageSize={pageSize}
        />
      </Surface>
    </PageShell>
  );
}
