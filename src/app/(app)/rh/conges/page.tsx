import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import type { RhLeaveStatus } from "@prisma/client";
import { LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL, leaveStatusTone } from "@/lib/rh/labels";
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
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  if (!hasAnyPermission(user, ["rh.leave.validate", "rh.leave.view_team"])) {
    redirect("/accueil");
  }

  const { status } = await searchParams;
  const statusFilter = STATUS_FILTERS.includes(status as RhLeaveStatus)
    ? (status as RhLeaveStatus)
    : "PENDING";

  const leaves = await prisma.rhLeaveRequest.findMany({
    where: { status: statusFilter },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  const canValidate = hasPermission(user, "rh.leave.validate");

  return (
    <PageShell>
      <PageHeader
        title="Congés"
        description="Demandes de congés et validation."
        backHref="/rh"
        backLabel="Retour RH"
        breadcrumbs={[{ label: "RH", href: "/rh" }, { label: "Congés" }]}
      />

      <div className="flex flex-wrap gap-2 text-sm">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={`/rh/conges?status=${s}`}
            className={`rounded-lg px-3 py-1.5 ${statusFilter === s ? "bg-msk-blue text-white" : "bg-white text-msk-ink/60 border border-msk-ink/15"}`}
          >
            {LEAVE_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {leaves.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          Aucune demande pour ce filtre.
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
                    {LEAVE_TYPE_LABEL[l.type]} · {l.startDate.toLocaleDateString("fr-FR")} →{" "}
                    {l.endDate.toLocaleDateString("fr-FR")} ·{" "}
                    {Number(l.days)} j
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
                <div className="mt-4 border-t border-msk-ink/10 pt-4">
                  <LeaveReviewButtons leaveId={l.id} />
                </div>
              ) : l.reviewNote ? (
                <p className="mt-3 text-sm text-msk-ink/50">
                  Note : {l.reviewNote}
                </p>
              ) : null}
            </Surface>
          ))}
        </div>
      )}
    </PageShell>
  );
}
