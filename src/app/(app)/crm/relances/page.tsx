import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CrmTaskStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { CompleteTaskButton } from "@/components/crm/complete-task-button";

export const metadata: Metadata = { title: "Relances CRM" };

export default async function CrmRelancesPage() {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const global =
    user.isSuperAdmin || hasPermission(user, "crm.reports.global");

  const tasks = await prisma.crmTask.findMany({
    where: {
      status: CrmTaskStatus.OPEN,
      ...(global ? {} : { assigneeId: user.id }),
    },
    include: {
      opportunity: {
        select: {
          id: true,
          title: true,
          organization: { select: { name: true } },
        },
      },
      assignee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { dueAt: "asc" },
    take: 100,
  });

  const now = Date.now();

  return (
    <PageShell>
      <PageHeader
        title="Relances"
        description="Tâches à échéance — à traiter aujourd’hui ou en retard."
        backHref="/crm"
        backLabel="Retour au CRM"
        breadcrumbs={[
          { label: "CRM", href: "/crm" },
          { label: "Relances" },
        ]}
      />

      <Surface className="divide-y divide-msk-ink/[0.06] overflow-hidden p-0">
        {tasks.length === 0 ? (
          <p className="p-8 text-center text-sm text-msk-ink/40">
            Aucune relance ouverte.
          </p>
        ) : (
          tasks.map((t) => {
            const late = t.dueAt.getTime() < now;
            return (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-msk-ink">{t.title}</p>
                  <p className="text-xs text-msk-ink/45">
                    {t.opportunity ? (
                      <Link
                        href={`/crm/prospects/${t.opportunity.id}`}
                        className="text-msk-blue hover:underline"
                      >
                        {t.opportunity.organization.name}
                      </Link>
                    ) : (
                      "—"
                    )}{" "}
                    · {t.assignee.firstName} ·{" "}
                    {t.dueAt.toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={late ? "coral" : "muted"}>
                    {late ? "En retard" : "À faire"}
                  </Badge>
                  <CompleteTaskButton taskId={t.id} />
                </div>
              </div>
            );
          })
        )}
      </Surface>
    </PageShell>
  );
}
