import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { dealOwnerScopeWhere } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/crm/labels";
import { resolveGoals } from "@/lib/crm/goals";
import { weekStartMonday, weekEndSunday } from "@/lib/crm/week";
import { computeWeekStats } from "@/lib/crm/week-stats";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { StageDonutChart } from "@/components/crm/stage-donut-chart";
import { StageBarChart } from "@/components/crm/stage-bar-chart";
import { KpiRadial } from "@/components/crm/kpi-radial";
import { RapportFilters } from "@/components/crm/rapport-filters";

export const metadata: Metadata = { title: "Rapport commercial" };

function monthsBack(n: number): { key: string; label: string; from: Date; to: Date }[] {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      from: d,
      to,
    });
  }
  return out;
}

export default async function CrmRapportPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; owner?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const sp = await searchParams;
  const periode = sp.periode === "annee" ? "annee" : "semaine";
  const teamIds = await commercialTeamUserIds();
  const canGlobal =
    user.isSuperAdmin || hasPermission(user, "crm.reports.global");
  const ownerFilter =
    canGlobal && sp.owner ? sp.owner : user.id;

  const scope = {
    ...dealOwnerScopeWhere(user, teamIds),
    ...(canGlobal && sp.owner ? { ownerId: sp.owner } : { ownerId: ownerFilter }),
  };

  const weekStart = weekStartMonday();
  const weekEnd = weekEndSunday(weekStart);
  const goals = await resolveGoals(ownerFilter);
  const weekStats = await computeWeekStats(ownerFilter, weekStart);

  const deals = await prisma.crmOpportunity.findMany({
    where: scope,
    select: { stage: true, createdAt: true, wonAt: true },
  });

  const byStage = STAGE_ORDER.map((stage) => ({
    stage,
    key: stage.toLowerCase(),
    statut: STAGE_LABELS[stage],
    count: deals.filter((d) =>
      stage === "DEVIS_ENVOYE"
        ? d.stage === "DEVIS_ENVOYE" || d.stage === "NEGOCIATION"
        : d.stage === stage,
    ).length,
  }));

  const months = monthsBack(12);
  const barYear = await Promise.all(
    months.map(async (m) => ({
      statut: m.label,
      count: await prisma.crmOpportunity.count({
        where: {
          ownerId: ownerFilter,
          createdAt: { gte: m.from, lte: m.to },
        },
      }),
    })),
  );

  // Semaine : 4 dernières semaines nouveaux prospects
  const weekBars = [];
  for (let i = 3; i >= 0; i--) {
    const start = new Date(weekStart);
    start.setUTCDate(start.getUTCDate() - i * 7);
    const end = weekEndSunday(start);
    const count = await prisma.crmOpportunity.count({
      where: {
        ownerId: ownerFilter,
        createdAt: { gte: start, lte: end },
      },
    });
    weekBars.push({
      statut: `S${4 - i}`,
      count,
    });
  }

  const owners = canGlobal
    ? (
        await prisma.user.findMany({
          where: {
            id: { in: Array.from(new Set([user.id, ...teamIds])) },
            status: "ACTIVE",
          },
          select: { id: true, firstName: true, lastName: true },
        })
      ).map((u) => ({
        value: u.id,
        label: `${u.firstName} ${u.lastName}`,
      }))
    : [];

  const qualifiedOpen = byStage
    .filter((s) => s.stage === "INTERESSE" || s.stage === "DEVIS_ENVOYE")
    .reduce((a, b) => a + b.count, 0);
  const inExchange = byStage
    .filter((s) => s.stage === "CONTACTE" || s.stage === "QUALIFICATION")
    .reduce((a, b) => a + b.count, 0);

  return (
    <PageShell>
      <PageHeader
        title="Rapport"
        description={`Lecture seule — calculé depuis l’activité CRM. Semaine du ${weekStart.toLocaleDateString("fr-FR")}.`}
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
        ]}
        actions={
          <RapportFilters
            periode={periode}
            ownerId={sp.owner ?? null}
            owners={owners}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiRadial
          label="Nouveaux (semaine)"
          value={weekStats.newProspects}
          target={goals.NEW_PROSPECTS}
        />
        <KpiRadial
          label="Premiers contacts"
          value={weekStats.firstContacts}
          target={goals.FIRST_CONTACTS}
        />
        <KpiRadial
          label="En échange"
          value={inExchange}
          hint="Contacté + En cours"
        />
        <KpiRadial
          label="Prêts à convertir"
          value={qualifiedOpen}
          hint="Intéressé + Devis envoyé"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StageBarChart
          data={periode === "annee" ? barYear : weekBars}
          title={
            periode === "annee"
              ? "Nouveaux prospects — 12 mois"
              : "Nouveaux prospects — 4 semaines"
          }
          subtitle="Automatique depuis le CRM"
        />
        <StageDonutChart data={byStage} />
      </div>

      <Surface className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
          Semaine en cours — vs objectifs
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          {(
            [
              ["Nouveaux prospects", weekStats.newProspects, goals.NEW_PROSPECTS],
              ["Premiers contacts", weekStats.firstContacts, goals.FIRST_CONTACTS],
              ["RDV", weekStats.meetings, goals.MEETINGS],
              ["Relances faites", weekStats.followUpsDone, goals.FOLLOW_UPS],
            ] as const
          ).map(([label, cur, tgt]) => (
            <div key={label} className="rounded-lg bg-msk-chalk/50 px-3 py-2">
              <dt className="text-msk-ink/45">{label}</dt>
              <dd className="mt-1 font-semibold tabular-nums text-msk-ink">
                {cur}{" "}
                <span className="text-xs font-normal text-msk-ink/40">
                  / {tgt}
                </span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-msk-ink/40">
          Fin de semaine : {weekEnd.toLocaleDateString("fr-FR")} ·{" "}
          <Link href="/crm/objectifs" className="text-msk-blue hover:underline">
            Objectifs
          </Link>
        </p>
      </Surface>
    </PageShell>
  );
}
