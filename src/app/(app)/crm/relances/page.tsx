import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CrmPipelineStage } from "@prisma/client";
import { CrmTaskStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { crmVisibility } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { STAGE_LABELS } from "@/lib/crm/labels";
import { normalizeUiStage } from "@/lib/crm/guide-rules";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { KpiRadial } from "@/components/crm/kpi-radial";
import { RelanceActions } from "@/components/crm/relance-actions";
import { RelanceCountBadge } from "@/components/crm/relance-count-badge";
import { outreachCountByOpportunityIds } from "@/lib/crm/follow-up-count";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Relances" };

type VueFilter = "tous" | "retard" | "aujourdhui" | "semaine" | "plus-tard";

type TaskRow = Awaited<ReturnType<typeof loadTasks>>[number];

async function loadTasks(assigneeFilter: string[] | null) {
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
          stage: true,
          nextAction: true,
          followUpAt: true,
          organization: {
            select: {
              name: true,
              contacts: {
                orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
                take: 1,
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  jobTitle: true,
                },
              },
            },
          },
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

function stageTone(stage: string): "muted" | "success" | "coral" | "blue" {
  if (stage === "GAGNE") return "success";
  if (stage === "PERDU") return "coral";
  if (stage === "INTERESSE" || stage === "DEVIS_ENVOYE") return "blue";
  return "muted";
}

function formatDue(dueAt: Date, bucket: "overdue" | "today" | "week" | "later") {
  const label = dueAt.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
  if (bucket === "overdue") {
    const sod = startOfDay(new Date());
    const days = Math.max(
      1,
      Math.round((sod.getTime() - startOfDay(dueAt).getTime()) / 86_400_000),
    );
    return {
      label,
      hint: days === 1 ? "1 jour de retard" : `${days} jours de retard`,
      tone: "coral" as const,
    };
  }
  if (bucket === "today") {
    return { label, hint: "Aujourd’hui", tone: "blue" as const };
  }
  return { label, hint: null, tone: "muted" as const };
}

function RelanceTable({
  tasks,
  bucket,
  empty,
  outreachMap,
}: {
  tasks: TaskRow[];
  bucket: "overdue" | "today" | "week" | "later";
  empty: string;
  outreachMap: Map<string, number>;
}) {
  if (tasks.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-msk-ink/40">{empty}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-200 text-left text-sm">
        <thead className="border-b border-msk-ink/[0.08] bg-msk-chalk/50 text-[11px] uppercase tracking-wide text-msk-ink/40">
          <tr>
            <th className="px-4 py-3 font-semibold">Entreprise</th>
            <th className="px-4 py-3 font-semibold">Contact</th>
            <th className="px-4 py-3 font-semibold">Statut</th>
            <th className="px-4 py-3 font-semibold">Relances</th>
            <th className="px-4 py-3 font-semibold">À faire</th>
            <th className="px-4 py-3 font-semibold">Échéance</th>
            <th className="px-4 py-3 font-semibold">Suivi par</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-msk-ink/[0.06]">
          {tasks.map((t) => {
            const org = t.opportunity?.organization;
            const contact = org?.contacts[0];
            const rawStage = t.opportunity?.stage;
            const uiStage: CrmPipelineStage | null = rawStage
              ? normalizeUiStage(rawStage)
              : null;
            const due = formatDue(t.dueAt, bucket);
            const actionLabel =
              t.opportunity?.nextAction?.trim() ||
              t.title ||
              "Relance";
            return (
              <tr
                key={t.id}
                className="align-middle transition hover:bg-msk-chalk/40"
              >
                <td className="px-4 py-3">
                  {t.opportunity ? (
                    <Link
                      prefetch={false}
                      href={`/crm/prospects/${t.opportunity.id}`}
                      className="font-medium text-msk-ink hover:text-msk-blue"
                    >
                      {org?.name ?? "—"}
                    </Link>
                  ) : (
                    <span className="font-medium text-msk-ink">
                      {t.title || "—"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-msk-ink/75">
                  {contact ? (
                    <>
                      <span className="font-medium text-msk-ink">
                        {contact.firstName} {contact.lastName}
                      </span>
                      {contact.jobTitle ? (
                        <p className="text-xs text-msk-ink/50">
                          {contact.jobTitle}
                        </p>
                      ) : null}
                      {contact.phone?.trim() ? (
                        <p className="text-xs tabular-nums text-msk-ink/45">
                          {contact.phone}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  {uiStage ? (
                    <Badge tone={stageTone(uiStage)}>
                      {STAGE_LABELS[uiStage]}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  {t.opportunity ? (
                    <RelanceCountBadge
                      count={outreachMap.get(t.opportunity.id) ?? 0}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="max-w-48 px-4 py-3">
                  <p className="truncate font-medium text-msk-ink">
                    {actionLabel}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p
                    className={cn(
                      "font-medium tabular-nums",
                      due.tone === "coral"
                        ? "text-msk-coral"
                        : due.tone === "blue"
                          ? "text-msk-blue"
                          : "text-msk-ink",
                    )}
                  >
                    {due.label}
                  </p>
                  {due.hint ? (
                    <p
                      className={cn(
                        "text-xs",
                        due.tone === "coral"
                          ? "text-msk-coral/80"
                          : "text-msk-ink/45",
                      )}
                    >
                      {due.hint}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-msk-ink/65">
                  {t.assignee.firstName} {t.assignee.lastName}
                </td>
                <td className="px-4 py-3">
                  <RelanceActions
                    taskId={t.id}
                    opportunityId={t.opportunity?.id ?? null}
                    requireFollowUp
                    orgName={org?.name}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function CrmRelancesPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const { vue: vueRaw } = await searchParams;
  const vue: VueFilter =
    vueRaw === "retard" ||
    vueRaw === "aujourdhui" ||
    vueRaw === "semaine" ||
    vueRaw === "plus-tard"
      ? vueRaw
      : "tous";

  const vis = crmVisibility(user);
  const teamIds = vis === "team" ? await commercialTeamUserIds() : [];
  const assigneeFilter =
    vis === "global"
      ? null
      : vis === "team"
        ? Array.from(new Set([user.id, ...teamIds]))
        : [user.id];

  const tasks = await loadTasks(assigneeFilter);
  const outreachMap = await outreachCountByOpportunityIds(
    tasks
      .map((t) => t.opportunity?.id)
      .filter((id): id is string => Boolean(id)),
  );

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
      key: "overdue" as const,
      vue: "retard" as const,
      title: "En retard",
      tone: "coral" as const,
      count: overdue.length,
      tasks: overdue,
      empty: "Aucune relance en retard — bravo.",
    },
    {
      key: "today" as const,
      vue: "aujourdhui" as const,
      title: "Aujourd’hui",
      tone: "blue" as const,
      count: today.length,
      tasks: today,
      empty: "Rien à faire aujourd’hui.",
    },
    {
      key: "week" as const,
      vue: "semaine" as const,
      title: "Cette semaine",
      tone: "muted" as const,
      count: thisWeek.length,
      tasks: thisWeek,
      empty: "Pas de relance prévue sous 7 jours.",
    },
    {
      key: "later" as const,
      vue: "plus-tard" as const,
      title: "Plus tard",
      tone: "muted" as const,
      count: later.length,
      tasks: later,
      empty: "Aucune relance plus lointaine.",
    },
  ];

  const visibleSections =
    vue === "tous"
      ? sections.filter((s) => s.count > 0 || s.key === "overdue" || s.key === "today")
      : sections.filter((s) => s.vue === vue);

  const filters: { id: VueFilter; label: string; count: number }[] = [
    { id: "tous", label: "Toutes", count: tasks.length },
    { id: "retard", label: "En retard", count: overdue.length },
    { id: "aujourdhui", label: "Aujourd’hui", count: today.length },
    { id: "semaine", label: "Cette semaine", count: thisWeek.length },
    { id: "plus-tard", label: "Plus tard", count: later.length },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Relances"
            description={
          vis === "own"
            ? "File du jour — traitez, reportez ou ouvrez la fiche."
            : "File d’équipe — traitez, reportez ou ouvrez la fiche."
        }
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Relances" },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiRadial
          label="En retard"
          value={overdue.length}
          tone={overdue.length > 0 ? "coral" : "blue"}
          hint="à rattraper"
        />
        <KpiRadial
          label="Aujourd’hui"
          value={today.length}
          hint="priorité du jour"
        />
        <KpiRadial
          label="Cette semaine"
          value={thisWeek.length}
          hint="sous 7 jours"
        />
        <KpiRadial
          label="À faire"
          value={tasks.length}
          hint={tasks.length === 0 ? "à jour" : "ouvertes"}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => {
          const active = vue === f.id;
          const href =
            f.id === "tous" ? "/crm/relances" : `/crm/relances?vue=${f.id}`;
          return (
            <Link
              key={f.id}
              prefetch={false}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                active
                  ? f.id === "retard" && f.count > 0
                    ? "bg-msk-coral text-white"
                    : "bg-msk-blue text-white"
                  : "bg-white text-msk-ink/55 hover:bg-msk-chalk",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "tabular-nums",
                  active ? "text-white/80" : "text-msk-ink/35",
                )}
              >
                {f.count}
              </span>
            </Link>
          );
        })}
      </div>

      {tasks.length === 0 ? (
        <Surface className="p-10 text-center">
          <p className="text-sm font-medium text-msk-ink">
            Aucune relance ouverte
          </p>
          <p className="mt-1 text-sm text-msk-ink/45">
            Les relances apparaissent ici dès qu’une date est planifiée sur un
            prospect.
          </p>
          <Link
            prefetch={false}
            href="/crm/prospects"
            className="mt-4 inline-flex text-sm font-medium text-msk-blue hover:underline"
          >
            Voir les prospects
          </Link>
        </Surface>
      ) : (
        <div className="space-y-4">
          {visibleSections.map((s) => (
            <Surface key={s.key} className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-msk-ink/[0.06] bg-msk-chalk/40 px-4 py-2.5">
                <h2 className="text-sm font-semibold text-msk-ink">{s.title}</h2>
                <Badge tone={s.tone}>{s.count}</Badge>
              </div>
              <RelanceTable
                tasks={s.tasks}
                bucket={s.key}
                empty={s.empty}
                outreachMap={outreachMap}
              />
            </Surface>
          ))}
        </div>
      )}
    </PageShell>
  );
}
