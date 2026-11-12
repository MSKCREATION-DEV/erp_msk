import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Prisma, RhTimesheetStatus } from "@/generated/prisma/client";
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
import { Badge } from "@/components/ui/badge";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  TIMESHEET_STATUS_LABEL,
  formatMinutes,
  timesheetStatusTone,
} from "@/lib/rh/labels";
import { TimesheetReviewButtons } from "@/components/rh/timesheet-review-buttons";

export const metadata: Metadata = { title: "Heures" };

const STATUS_FILTERS: RhTimesheetStatus[] = [
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "DRAFT",
];

export default async function RhHeuresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "rh.timesheet.validate")) redirect("/accueil");

  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const status = firstParam(raw.status);
  const statusFilter = STATUS_FILTERS.includes(status as RhTimesheetStatus)
    ? (status as RhTimesheetStatus)
    : "SUBMITTED";

  const where: Prisma.RhTimesheetWhereInput = {
    status: statusFilter,
    ...(q
      ? {
          OR: [
            { employee: { firstName: { contains: q, mode: "insensitive" } } },
            { employee: { lastName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const pageSize = DEFAULT_PAGE_SIZE;
  const total = await prisma.rhTimesheet.count({ where });
  const page = clampPage(parsePage(firstParam(raw.page)), total, pageSize);
  const sheets = await prisma.rhTimesheet.findMany({
    where,
    orderBy: { weekStart: "desc" },
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    status: statusFilter,
  };

  function statusHref(next: RhTimesheetStatus) {
    const p = new URLSearchParams();
    p.set("status", next);
    if (q) p.set("q", q);
    return `/rh/heures?${p.toString()}`;
  }

  return (
    <PageShell>
      <PageHeader
        title="Heures"
        description="Feuilles hebdomadaires et validation."
        backHref="/rh"
        backLabel="Retour RH"
        breadcrumbs={[{ label: "RH", href: "/rh" }, { label: "Heures" }]}
      />

      <div className="pb-1">
        <Suspense
          fallback={
            <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
          }
        >
          <ListSearchForm
            placeholder="Collaborateur…"
            className="sm:max-w-md"
          />
        </Suspense>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {STATUS_FILTERS.map((s) => (
          <Link
            prefetch={false}
            key={s}
            href={statusHref(s)}
            className={`rounded-lg px-3 py-1.5 ${statusFilter === s ? "bg-msk-blue text-white" : "bg-white text-msk-ink/60 border border-msk-ink/15"}`}
          >
            {TIMESHEET_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {sheets.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          {q
            ? `Aucune feuille pour « ${q} ».`
            : "Aucune feuille pour ce filtre."}
        </Surface>
      ) : (
        <div className="space-y-3">
          {sheets.map((s) => (
            <Surface key={s.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-msk-ink">
                    {s.employee.firstName} {s.employee.lastName}
                  </p>
                  <p className="mt-1 text-sm text-msk-ink/60">
                    Semaine du {s.weekStart.toLocaleDateString("fr-FR")} ·{" "}
                    {formatMinutes(s.totalMinutes)}
                  </p>
                </div>
                <Badge tone={timesheetStatusTone(s.status)}>
                  {TIMESHEET_STATUS_LABEL[s.status]}
                </Badge>
              </div>
              {s.status === "SUBMITTED" ? (
                <div className="mt-4 border-t border-msk-ink/10 pt-4">
                  <TimesheetReviewButtons timesheetId={s.id} />
                </div>
              ) : null}
            </Surface>
          ))}
          <ListPagination
            pathname="/rh/heures"
            searchParams={listParams}
            page={page}
            totalPages={totalPages(total, pageSize)}
            total={total}
            pageSize={pageSize}
          />
        </div>
      )}
    </PageShell>
  );
}
