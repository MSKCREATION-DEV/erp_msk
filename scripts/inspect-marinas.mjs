#!/usr/bin/env node
/**
 * Lecture seule — inventaire « Marinas » (org / opp / ComClient / activités / audit).
 * Usage : node --env-file=.env.local scripts/inspect-marinas.mjs
 * N’écrit rien en base.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const NEEDLE = "marinas";

function hit(s) {
  return (s ?? "").toLowerCase().includes(NEEDLE);
}

async function main() {
  console.log("=== Inspect Marinas (READ-ONLY) ===\n");

  const orgs = await prisma.crmOrganization.findMany({
    where: {
      OR: [
        { name: { contains: "Marinas", mode: "insensitive" } },
        { normalizedName: { contains: "marinas" } },
      ],
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: { select: { firstName: true, lastName: true, email: true } },
      opportunities: {
        select: {
          id: true,
          title: true,
          stage: true,
          wonAt: true,
          ownerId: true,
          owner: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  console.log(`Organisations (${orgs.length})`);
  for (const o of orgs) {
    console.log(
      `  - ${o.name} [${o.id}] owner=${o.owner.firstName} ${o.owner.lastName} <${o.owner.email}>`,
    );
    for (const d of o.opportunities) {
      console.log(
        `      opp ${d.id} stage=${d.stage} wonAt=${d.wonAt?.toISOString() ?? "—"} suivi=${d.owner.firstName} ${d.owner.lastName}`,
      );
    }
  }

  const clients = await prisma.comClient.findMany({
    where: {
      OR: [
        { name: { contains: "Marinas", mode: "insensitive" } },
        { normalizedName: { contains: "marinas" } },
      ],
    },
    select: {
      id: true,
      name: true,
      sourceOpportunityId: true,
      crmOrganizationId: true,
      ownerId: true,
      createdAt: true,
      owner: { select: { firstName: true, lastName: true, email: true } },
      createdBy: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  console.log(`\nClients COM (${clients.length})`);
  for (const c of clients) {
    console.log(
      `  - ${c.name} [${c.id}] opp=${c.sourceOpportunityId ?? "—"} org=${c.crmOrganizationId ?? "—"}`,
    );
    console.log(
      `    owner=${c.owner.firstName} ${c.owner.lastName} créé par=${c.createdBy.firstName} ${c.createdBy.lastName} le ${c.createdAt.toISOString()}`,
    );
  }

  const orgIds = orgs.map((o) => o.id);
  const oppIds = orgs.flatMap((o) => o.opportunities.map((d) => d.id));

  const activities =
    oppIds.length || orgIds.length
      ? await prisma.crmActivity.findMany({
          where: {
            OR: [
              ...(oppIds.length ? [{ opportunityId: { in: oppIds } }] : []),
              ...(orgIds.length ? [{ organizationId: { in: orgIds } }] : []),
              { summary: { contains: "Marinas", mode: "insensitive" } },
            ],
          },
          orderBy: { occurredAt: "desc" },
          take: 40,
          select: {
            id: true,
            type: true,
            summary: true,
            occurredAt: true,
            actor: { select: { firstName: true, lastName: true } },
          },
        })
      : [];

  console.log(`\nActivités récentes liées (${activities.length})`);
  for (const a of activities) {
    console.log(
      `  - ${a.occurredAt.toISOString()} [${a.type}] ${a.summary.slice(0, 80)} — ${a.actor.firstName} ${a.actor.lastName}`,
    );
  }

  const audits = await prisma.auditLog.findMany({
    where: {
      OR: [
        { action: { contains: "client" } },
        { entityType: "com_client" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      metadata: true,
    },
  });

  const relatedAudits = audits.filter((a) => {
    const meta = JSON.stringify(a.metadata ?? {});
    return (
      hit(meta) ||
      clients.some((c) => c.id === a.entityId) ||
      oppIds.includes(a.entityId ?? "")
    );
  });

  console.log(`\nAudits liés (${relatedAudits.length})`);
  for (const a of relatedAudits) {
    console.log(
      `  - ${a.createdAt.toISOString()} ${a.action} ${a.entityType}:${a.entityId}`,
    );
  }

  console.log("\n=== Fin (aucune écriture) ===");
  console.log(
    "Prochaine étape : valider avec un humain avant toute correction (unlink ComClient / stage).",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
