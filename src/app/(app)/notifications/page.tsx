import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/list/search-params";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListPagination } from "@/components/ui/list-pagination";
import { NotificationsPageClient } from "@/components/app/notifications-page-client";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "self.notifications.view") && !user.isSuperAdmin) {
    redirect("/accueil");
  }

  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const where: Prisma.AppNotificationWhereInput = {
    userId: user.id,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { body: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const pageSize = DEFAULT_PAGE_SIZE;
  const total = await prisma.appNotification.count({ where });
  const page = clampPage(parsePage(firstParam(raw.page)), total, pageSize);
  const items = await prisma.appNotification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: pageSkip(page, pageSize),
    take: pageSize,
  });
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
  };

  return (
    <PageShell>
      <PageHeader
        title="Mes notifications"
        description="Alertes in-app — demandes, affectations, relances."
        backHref="/accueil"
        breadcrumbs={[{ label: "Notifications" }]}
      />
      <div className="pb-3">
        <Suspense
          fallback={
            <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
          }
        >
          <ListSearchForm
            placeholder="Titre, contenu…"
            className="sm:max-w-md"
          />
        </Suspense>
      </div>
      <Surface className="p-0">
        <NotificationsPageClient
          userId={user.id}
          initialItems={items.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            href: n.href,
            kind: n.kind,
            readAt: n.readAt?.toISOString() ?? null,
            createdAt: n.createdAt.toISOString(),
          }))}
        />
        <ListPagination
          pathname="/notifications"
          searchParams={listParams}
          page={page}
          totalPages={totalPages(total, pageSize)}
          total={total}
          pageSize={pageSize}
        />
      </Surface>
      <p className="mt-3 text-xs text-msk-ink/40">
        Astuce : la cloche en haut à droite se met à jour en direct.{" "}
        <Link href="/crm/affectations" className="text-msk-blue hover:underline">
          File affectations
        </Link>
      </p>
    </PageShell>
  );
}
