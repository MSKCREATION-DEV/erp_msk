import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Prisma, RhAbsenceStatus } from "@/generated/prisma/client";
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
import { ABSENCE_STATUS_LABEL, absenceStatusTone } from "@/lib/rh/labels";
import { AbsenceReviewButtons } from "@/components/rh/absence-review-buttons";

export const metadata: Metadata = { title: "Absences" };

const STATUS_FILTERS: RhAbsenceStatus[] = [
  "DECLARED",
  "JUSTIFIED",
  "UNJUSTIFIED",
];

export default async function RhAbsencesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "rh.absence.manage")) redirect("/accueil");

  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const status = firstParam(raw.status);
  const statusFilter = STATUS_FILTERS.includes(status as RhAbsenceStatus)
    ? (status as RhAbsenceStatus)
    : "DECLARED";

  const where: Prisma.RhAbsenceWhereInput = {
    status: statusFilter,
    ...(q
      ? {
          OR: [
            { employee: { firstName: { contains: q, mode: "insensitive" } } },
            { employee: { lastName: { contains: q, mode: "insensitive" } } },
            { reason: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const pageSize = DEFAULT_PAGE_SIZE;
  const total = await prisma.rhAbsence.count({ where });
  const page = clampPage(parsePage(firstParam(raw.page)), total, pageSize);
  const absences = await prisma.rhAbsence.findMany({
    where,
    orderBy: { createdAt: "desc" },
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

  function statusHref(next: RhAbsenceStatus) {
    const p = new URLSearchParams();
    p.set("status", next);
    if (q) p.set("q", q);
    return `/rh/absences?${p.toString()}`;
  }

  return (
    <PageShell>
      <PageHeader
        title="Absences"
        description="Absences déclarées — marquer justifiée ou injustifiée."
        backHref="/rh"
        backLabel="Retour RH"
        breadcrumbs={[{ label: "RH", href: "/rh" }, { label: "Absences" }]}
      />

      <div className="pb-1">
        <Suspense
          fallback={
            <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
          }
        >
          <ListSearchForm
            placeholder="Collaborateur, motif…"
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
            {ABSENCE_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {absences.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          {q
            ? `Aucune absence pour « ${q} ».`
            : "Aucune absence pour ce filtre."}
        </Surface>
      ) : (
        <div className="space-y-3">
          {absences.map((a) => (
            <Surface key={a.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-msk-ink">
                    {a.employee.firstName} {a.employee.lastName}
                  </p>
                  <p className="mt-1 text-sm text-msk-ink/60">
                    {a.startDate.toLocaleDateString("fr-FR")} →{" "}
                    {a.endDate.toLocaleDateString("fr-FR")}
                  </p>
                  <p className="mt-1 text-sm text-msk-ink/50">{a.reason}</p>
                </div>
                <Badge tone={absenceStatusTone(a.status)}>
                  {ABSENCE_STATUS_LABEL[a.status]}
                </Badge>
              </div>
              {a.status === "DECLARED" ? (
                <div className="mt-3 flex justify-end border-t border-msk-ink/6 pt-3">
                  <AbsenceReviewButtons absenceId={a.id} />
                </div>
              ) : a.justificationNote ? (
                <p className="mt-3 text-sm text-msk-ink/50">
                  Note : {a.justificationNote}
                </p>
              ) : null}
            </Surface>
          ))}
          <ListPagination
            pathname="/rh/absences"
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
