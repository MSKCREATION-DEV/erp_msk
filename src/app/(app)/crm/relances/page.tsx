import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CrmTaskStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { crmVisibility } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { CompleteTaskButton } from "@/components/crm/complete-task-button";

export const metadata: Metadata = { title: "Relances" };

type TaskRow = Awaited<ReturnType<typeof loadTasks>>[number];

async function loadTasks(userId: string, assigneeFilter: string[] | null) {
  return prisma.crmTask.findMany({
    where: {
      status: CrmTaskStatus.OPEN,
      ...(assigneeFilter ? { assigneeId: { in: assigneeFilter } } : {}),
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
    take: 200,
  });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function TaskList({
  tasks,
  empty,
}: {
  tasks: TaskRow[];
  empty: string;
}) {
  if (tasks.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-msk-ink/40">{empty}</p>
    );
  }
  return (
    <div className="divide-y divide-msk-ink/[0.06]">
      {tasks.map((t) => (
        <div
          key={t.id}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="font-medium text-msk-ink">{t.title}</p>
            <p className="text-xs text-msk-ink/45">
              {t.opportunity ? (
                <Link
                  prefetch={false}
                  href={`/crm/prospects/${t.opportunity.id}`}
                  className="text-msk-blue hover:underline"
                >
                  {t.opportunity.organization.name}
                </Link>
              ) : (
                "—"
              )}{" "}
              · Suivi par {t.assignee.firstName} {t.assignee.lastName} ·{" "}
              {t.dueAt.toLocaleDateString("fr-FR")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CompleteTaskButton taskId={t.id} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function CrmRelancesPage() {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const vis = crmVisibility(user);
  const teamIds = vis === "team" ? await commercialTeamUserIds() : [];
  const assigneeFilter =
    vis === "global"
      ? null
      : vis === "team"
        ? Array.from(new Set([user.id, ...teamIds]))
        : [user.id];

  const tasks = await loadTasks(user.id, assigneeFilter);

  const now = new Date();
  const sod = startOfDay(now);
  const eod = endOfDay(now);
  const weekEnd = endOfDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
  );

  const overdue = tasks.filter((t) => t.dueAt < sod);
  const today = tasks.filter((t) => t.dueAt >= sod && t.dueAt <= eod);
  const thisWeek = tasks.filter((t) => t.dueAt > eod && t.dueAt <= weekEnd);
  const later = tasks.filter((t) => t.dueAt > weekEnd);

  const sections = [
    {
      key: "overdue",
      title: "En retard",
      tone: "coral" as const,
      count: overdue.length,
      tasks: overdue,
      empty: "Aucune relance en retard.",
    },
    {
      key: "today",
      title: "Aujourd’hui",
      tone: "blue" as const,
      count: today.length,
      tasks: today,
      empty: "Rien à faire aujourd’hui.",
    },
    {
      key: "week",
      title: "Cette semaine",
      tone: "muted" as const,
      count: thisWeek.length,
      tasks: thisWeek,
      empty: "Pas de relance prévue sous 7 jours.",
    },
    {
      key: "later",
      title: "Plus tard",
      tone: "muted" as const,
      count: later.length,
      tasks: later,
      empty: "Aucune relance plus lointaine.",
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Relances"
        description={
          vis === "own"
            ? "Vos tâches à échéance — en retard, aujourd’hui, cette semaine."
            : "File d’équipe — en retard, aujourd’hui, cette semaine."
        }
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Relances" },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {sections.slice(0, 3).map((s) => (
          <Badge key={s.key} tone={s.tone}>
            {s.title} · {s.count}
          </Badge>
        ))}
      </div>

      <div className="space-y-4">
        {sections.map((s) => (
          <Surface key={s.key} className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-msk-ink/[0.06] bg-msk-chalk/40 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-msk-ink">{s.title}</h2>
              <Badge tone={s.tone}>{s.count}</Badge>
            </div>
            <TaskList tasks={s.tasks} empty={s.empty} />
          </Surface>
        ))}
      </div>
    </PageShell>
  );
}
