import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import type { RhTimesheetStatus } from "@prisma/client";
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
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "rh.timesheet.validate")) redirect("/accueil");

  const { status } = await searchParams;
  const statusFilter = STATUS_FILTERS.includes(status as RhTimesheetStatus)
    ? (status as RhTimesheetStatus)
    : "SUBMITTED";

  const sheets = await prisma.rhTimesheet.findMany({
    where: { status: statusFilter },
    orderBy: { weekStart: "desc" },
    take: 200,
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Heures"
        description="Feuilles hebdomadaires et validation."
        backHref="/rh"
        backLabel="Retour RH"
        breadcrumbs={[{ label: "RH", href: "/rh" }, { label: "Heures" }]}
      />

      <div className="flex flex-wrap gap-2 text-sm">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={`/rh/heures?status=${s}`}
            className={`rounded-lg px-3 py-1.5 ${statusFilter === s ? "bg-msk-blue text-white" : "bg-white text-msk-ink/60 border border-msk-ink/15"}`}
          >
            {TIMESHEET_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {sheets.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          Aucune feuille pour ce filtre.
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
        </div>
      )}
    </PageShell>
  );
}
