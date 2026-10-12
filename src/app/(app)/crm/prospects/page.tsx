import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { CrmPipelineStage, CrmSource, Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { crmVisibility, dealOwnerScopeWhere } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import {
  formatXof,
  SOURCE_LABELS,
  STAGE_LABELS,
} from "@/lib/crm/labels";
import { isTestOrgName } from "@/lib/crm/test-data";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ProspectsFilterButton } from "@/components/crm/prospects-filter-modal";
import { ProspectsBoard } from "@/components/crm/prospects-board";
import { KpiRadial } from "@/components/crm/kpi-radial";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Prospects" };

const linkBtn =
  "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition";
const linkPrimary = `${linkBtn} bg-msk-blue text-white hover:bg-msk-blue/90`;
const linkSecondary = `${linkBtn} border border-msk-ink/15 bg-white text-msk-ink hover:bg-msk-chalk`;

function stageTone(stage: string): "muted" | "success" | "coral" | "blue" {
  if (stage === "GAGNE") return "success";
  if (stage === "PERDU") return "coral";
  if (stage === "INTERESSE" || stage === "DEVIS_ENVOYE") return "blue";
  return "muted";
}

export default async function CrmProspectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const sp = await searchParams;
  const vue = sp.vue === "etapes" ? "etapes" : "liste";
  const teamIds = await commercialTeamUserIds();
  const now = new Date();

  const where: Prisma.CrmOpportunityWhereInput = {
    ...dealOwnerScopeWhere(user, teamIds),
  };

  if (sp.stages) {
    const stages = sp.stages
      .split(",")
      .filter(Boolean) as CrmPipelineStage[];
    if (stages.length) where.stage = { in: stages };
  }
  if (sp.source) where.source = sp.source as CrmSource;
  if (sp.owner) where.ownerId = sp.owner;
  if (sp.from || sp.to) {
    where.createdAt = {};
    if (sp.from) where.createdAt.gte = new Date(sp.from);
    if (sp.to) {
      const t = new Date(sp.to);
      t.setHours(23, 59, 59, 999);
      where.createdAt.lte = t;
    }
  }
  if (sp.late === "1") {
    where.followUpAt = { lt: now };
    where.stage = {
      ...(typeof where.stage === "object" ? where.stage : {}),
      notIn: ["GAGNE", "PERDU"],
    } as Prisma.EnumCrmPipelineStageFilter;
  }
  if (sp.devisRetard === "1") {
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    where.stage = "INTERESSE";
    where.comQuotes = { none: {} };
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { interestedAt: { lt: cutoff } },
          { interestedAt: null, updatedAt: { lt: cutoff } },
        ],
      },
    ];
  }
  if (sp.q?.trim()) {
    const q = sp.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { organization: { name: { contains: q, mode: "insensitive" } } },
      {
        organization: {
          contacts: {
            some: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      },
    ];
  }

  const ownScope = dealOwnerScopeWhere(user, teamIds);
  const vis = crmVisibility(user);
  const showOwnKpis = vis === "own";

  const [deals, ownPortfolio] = await Promise.all([
    prisma.crmOpportunity.findMany({
      where:
        vue === "etapes"
          ? {
              ...where,
              stage: {
                ...(typeof where.stage === "object" &&
                where.stage &&
                "in" in where.stage
                  ? where.stage
                  : {}),
                notIn: ["GAGNE", "PERDU"],
              },
            }
          : where,
      include: {
        organization: {
          select: {
            name: true,
            sector: true,
            contacts: { where: { isPrimary: true }, take: 1 },
          },
        },
        owner: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ followUpAt: "asc" }, { updatedAt: "desc" }],
      take: 400,
    }),
    showOwnKpis
      ? prisma.crmOpportunity.findMany({
          where: {
            ...ownScope,
            stage: { notIn: ["GAGNE", "PERDU"] },
          },
          select: { stage: true, followUpAt: true },
        })
      : Promise.resolve([] as { stage: string; followUpAt: Date | null }[]),
  ]);

  const canCreate = hasPermission(user, "crm.prospect.create");
  const canImport = hasPermission(user, "crm.import");

  const ownKpis = showOwnKpis
    ? {
        portefeuille: ownPortfolio.length,
        interesses: ownPortfolio.filter((d) => d.stage === "INTERESSE").length,
        retards: ownPortfolio.filter(
          (d) => d.followUpAt != null && d.followUpAt < now,
        ).length,
      }
    : null;

  const owners =
    vis === "own"
      ? []
      : (
          await prisma.user.findMany({
            where: {
              id: { in: Array.from(new Set([user.id, ...teamIds])) },
              status: "ACTIVE",
            },
            select: { id: true, firstName: true, lastName: true },
            orderBy: { firstName: "asc" },
          })
        ).map((u) => ({
          value: u.id,
          label: `${u.firstName} ${u.lastName}`,
        }));

  const boardCards = deals.map((d) => {
    const uiStage = d.stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : d.stage;
    const late =
      d.followUpAt != null &&
      d.followUpAt < now &&
      uiStage !== "GAGNE" &&
      uiStage !== "PERDU";
    return {
      id: d.id,
      orgName: d.organization.name,
      ownerLabel: d.owner.firstName,
      nextAction: d.nextAction,
      followUpLabel: d.followUpAt
        ? d.followUpAt.toLocaleDateString("fr-FR")
        : null,
      late,
      stage: uiStage as CrmPipelineStage,
    };
  });

  const listeHref = (() => {
    const p = new URLSearchParams(sp as Record<string, string>);
    p.delete("vue");
    const s = p.toString();
    return s ? `/crm/prospects?${s}` : "/crm/prospects";
  })();
  const etapesHref = (() => {
    const p = new URLSearchParams(sp as Record<string, string>);
    p.set("vue", "etapes");
    return `/crm/prospects?${p.toString()}`;
  })();

  return (
    <PageShell className={vue === "etapes" ? "max-w-none" : undefined}>
      <PageHeader
        title="Prospects"
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-msk-ink/10 bg-white p-0.5">
              <Link
                prefetch={false}
                href={listeHref}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  vue === "liste"
                    ? "bg-msk-blue text-white"
                    : "text-msk-ink/55 hover:text-msk-ink",
                )}
              >
                Liste
              </Link>
              <Link
                prefetch={false}
                href={etapesHref}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  vue === "etapes"
                    ? "bg-msk-blue text-white"
                    : "text-msk-ink/55 hover:text-msk-ink",
                )}
              >
                Par étapes
              </Link>
            </div>
            <Suspense fallback={null}>
              <ProspectsFilterButton owners={owners} />
            </Suspense>
            {canImport ? (
              <Link
                prefetch={false}
                href="/crm/prospects/import"
                className={linkSecondary}
              >
                Importer
              </Link>
            ) : null}
            {canCreate ? (
              <Link
                prefetch={false}
                href="/crm/prospects/nouveau"
                className={linkPrimary}
              >
                Nouveau
              </Link>
            ) : null}
          </div>
        }
      />

      {ownKpis ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiRadial
            label="Portefeuille"
            value={ownKpis.portefeuille}
            hint="dossiers suivis"
          />
          <KpiRadial
            label="Intéressés"
            value={ownKpis.interesses}
            hint="à convertir"
          />
          <KpiRadial
            label="Retards"
            value={ownKpis.retards}
            tone={ownKpis.retards > 0 ? "coral" : "blue"}
            hint="relances dues"
          />
        </div>
      ) : null}

      {vue === "etapes" ? (
        <ProspectsBoard cards={boardCards} />
      ) : (
        <Surface className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="border-b border-msk-ink/[0.08] bg-msk-chalk/50 text-[11px] uppercase tracking-wide text-msk-ink/40">
                <tr>
                  <th className="px-4 py-3 font-semibold">Entreprise</th>
                  <th className="px-4 py-3 font-semibold">Contact / poste</th>
                  <th className="px-4 py-3 font-semibold">Origine</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Prochaine action</th>
                  <th className="px-4 py-3 font-semibold">Relance</th>
                  <th className="px-4 py-3 font-semibold">Créé</th>
                  <th className="px-4 py-3 font-semibold">Suivi / créé par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-msk-ink/[0.06]">
                {deals.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-msk-ink/40"
                    >
                      Aucun prospect.
                    </td>
                  </tr>
                ) : (
                  deals.map((d) => {
                    const c = d.organization.contacts[0];
                    const overdue =
                      d.followUpAt != null &&
                      d.followUpAt < now &&
                      d.stage !== "GAGNE" &&
                      d.stage !== "PERDU";
                    const uiStage =
                      d.stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : d.stage;
                    return (
                      <tr key={d.id} className="hover:bg-msk-chalk/40">
                        <td className="px-4 py-3">
                          <Link
                            prefetch={false}
                            href={`/crm/prospects/${d.id}`}
                            className="font-medium text-msk-blue hover:underline"
                          >
                            {d.organization.name}
                          </Link>
                          {isTestOrgName(d.organization.name) ? (
                            <Badge tone="coral" className="ml-1.5 align-middle">
                              TEST
                            </Badge>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-msk-ink/75">
                          {c ? (
                            <>
                              <span className="font-medium text-msk-ink">
                                {c.firstName} {c.lastName}
                              </span>
                              {c.jobTitle ? (
                                <p className="text-xs font-medium text-msk-ink/55">
                                  {c.jobTitle}
                                </p>
                              ) : null}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {d.source ? (
                            <Badge tone="blue">
                              {SOURCE_LABELS[d.source]}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={stageTone(uiStage)}>
                            {STAGE_LABELS[uiStage]}
                          </Badge>
                        </td>
                        <td className="max-w-[180px] truncate px-4 py-3 text-msk-ink/70">
                          {d.nextAction || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {d.followUpAt
                            ? d.followUpAt.toLocaleDateString("fr-FR")
                            : "—"}
                          {overdue ? (
                            <span className="ml-1 text-xs text-msk-coral">
                              retard
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-xs text-msk-ink/55">
                          {d.createdAt.toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3 text-xs text-msk-ink/60">
                          <p>
                            <span className="text-msk-ink/40">Suivi </span>
                            {d.owner.firstName} {d.owner.lastName}
                          </p>
                          <p>
                            <span className="text-msk-ink/40">Créé </span>
                            {d.createdBy.firstName} {d.createdBy.lastName}
                          </p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Surface>
      )}
    </PageShell>
  );
}
