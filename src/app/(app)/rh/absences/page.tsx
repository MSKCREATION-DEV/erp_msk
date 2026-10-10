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
import type { RhAbsenceStatus } from "@prisma/client";
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
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "rh.absence.manage")) redirect("/accueil");

  const { status } = await searchParams;
  const statusFilter = STATUS_FILTERS.includes(status as RhAbsenceStatus)
    ? (status as RhAbsenceStatus)
    : "DECLARED";

  const absences = await prisma.rhAbsence.findMany({
    where: { status: statusFilter },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Absences"
        description="Déclarations et justification."
        backHref="/rh"
        backLabel="Retour RH"
        breadcrumbs={[{ label: "RH", href: "/rh" }, { label: "Absences" }]}
      />

      <div className="flex flex-wrap gap-2 text-sm">
        {STATUS_FILTERS.map((s) => (
          <Link prefetch={false}
            key={s}
            href={`/rh/absences?status=${s}`}
            className={`rounded-lg px-3 py-1.5 ${statusFilter === s ? "bg-msk-blue text-white" : "bg-white text-msk-ink/60 border border-msk-ink/15"}`}
          >
            {ABSENCE_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {absences.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          Aucune absence pour ce filtre.
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
                <div className="mt-4 border-t border-msk-ink/10 pt-4">
                  <AbsenceReviewButtons absenceId={a.id} />
                </div>
              ) : a.justificationNote ? (
                <p className="mt-3 text-sm text-msk-ink/50">
                  Note : {a.justificationNote}
                </p>
              ) : null}
            </Surface>
          ))}
        </div>
      )}
    </PageShell>
  );
}
