import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Prisma, RhLeaveStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
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
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_LABEL,
  leaveStatusTone,
} from "@/lib/rh/labels";
import { LeaveReviewButtons } from "@/components/rh/leave-review-buttons";

export const metadata: Metadata = { title: "Congés" };

const STATUS_FILTERS: RhLeaveStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

export default async function RhCongesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasAnyPermission(user, ["rh.leave.validate", "rh.leave.view_team"])) {
    redirect("/accueil");
  }

  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const status = firstParam(raw.status);
  const statusFilter = STATUS_FILTERS.includes(status as RhLeaveStatus)
    ? (status as RhLeaveStatus)
    : "PENDING";

  const where: Prisma.RhLeaveRequestWhereInput = {
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
  const total = await prisma.rhLeaveRequest.count({ where });
  const page = clampPage(parsePage(firstParam(raw.page)), total, pageSize);
  const leaves = await prisma.rhLeaveRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  const canValidate = hasPermission(user, "rh.leave.validate");
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    status: statusFilter,
  };

  function statusHref(next: RhLeaveStatus) {
    const p = new URLSearchParams();
    p.set("status", next);
    if (q) p.set("q", q);
    return `/rh/conges?${p.toString()}`;
  }

  return (
    <PageShell>
      <PageHeader
        title="Congés"
        description="Demandes à traiter — approuver ou refuser."
        backHref="/rh"
        backLabel="Retour RH"
        breadcrumbs={[{ label: "RH", href: "/rh" }, { label: "Congés" }]}
        actions={
          canValidate ? (
            <Link
              prefetch={false}
              href="/rh/conges/types"
              className="text-sm font-medium text-msk-blue hover:underline"
            >
              Catalogue des types
            </Link>
          ) : null
        }
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
            {LEAVE_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {leaves.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          {q
            ? `Aucune demande pour « ${q} ».`
            : "Aucune demande pour ce filtre."}
        </Surface>
      ) : (
        <div className="space-y-3">
          {leaves.map((l) => (
            <Surface key={l.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-msk-ink">
                    {l.employee.firstName} {l.employee.lastName}
                  </p>
                  <p className="mt-1 text-sm text-msk-ink/60">
                    {LEAVE_TYPE_LABEL[l.type]} ·{" "}
                    {l.startDate.toLocaleDateString("fr-FR")} →{" "}
                    {l.endDate.toLocaleDateString("fr-FR")} · {Number(l.days)} j
                  </p>
                  {l.reason ? (
                    <p className="mt-1 text-sm text-msk-ink/50">{l.reason}</p>
                  ) : null}
                </div>
                <Badge tone={leaveStatusTone(l.status)}>
                  {LEAVE_STATUS_LABEL[l.status]}
                </Badge>
              </div>
              {l.status === "PENDING" && canValidate ? (
                <div className="mt-3 flex justify-end border-t border-msk-ink/6 pt-3">
                  <LeaveReviewButtons leaveId={l.id} />
                </div>
              ) : l.reviewNote ? (
                <p className="mt-3 text-sm text-msk-ink/50">
                  Note : {l.reviewNote}
                </p>
              ) : null}
            </Surface>
          ))}
          <ListPagination
            pathname="/rh/conges"
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
