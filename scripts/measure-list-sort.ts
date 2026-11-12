/**
 * Chronométrage temporaire findMany + count (séquentiel — pool max=1).
 * Usage: npx tsx --env-file=.env.local scripts/measure-list-sort.ts
 */
import { createPrisma } from "../src/lib/create-prisma";

const prisma = createPrisma({ max: 1 });

async function time(label: string, fn: () => Promise<unknown>) {
  await fn();
  const runs: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    await fn();
    runs.push(Math.round(performance.now() - t0));
  }
  runs.sort((a, b) => a - b);
  console.log(`${label}: runs=${runs.join(",")} median=${runs[1]}ms`);
}

async function main() {
  await time("commercial/clients", async () => {
    const where = {};
    const rows = await prisma.comClient.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: 0,
      take: 20,
      select: {
        id: true,
        name: true,
        updatedAt: true,
        status: true,
        ownerId: true,
      },
    });
    const count = await prisma.comClient.count({ where });
    return { n: rows.length, count };
  });

  await time("crm/prospects", async () => {
    const where = {};
    const rows = await prisma.crmOpportunity.findMany({
      where,
      orderBy: [{ followUpAt: "asc" }, { id: "asc" }],
      skip: 0,
      take: 20,
      select: {
        id: true,
        stage: true,
        followUpAt: true,
        ownerId: true,
        organizationId: true,
      },
    });
    const count = await prisma.crmOpportunity.count({ where });
    return { n: rows.length, count };
  });

  await time("commercial/devis", async () => {
    const where = {};
    const rows = await prisma.comQuote.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: 0,
      take: 20,
      select: {
        id: true,
        number: true,
        status: true,
        totalTtc: true,
        createdAt: true,
        clientId: true,
      },
    });
    const count = await prisma.comQuote.count({ where });
    return { n: rows.length, count };
  });

  await time("suivi/mouvements", async () => {
    const where = {};
    const rows = await prisma.svCashMovement.findMany({
      where,
      orderBy: [{ movedAt: "desc" }, { id: "asc" }],
      skip: 0,
      take: 20,
      select: {
        id: true,
        amount: true,
        movedAt: true,
        direction: true,
        accountId: true,
      },
    });
    const count = await prisma.svCashMovement.count({ where });
    return { n: rows.length, count };
  });

  await time("stocks/articles", async () => {
    const where = {};
    const rows = await prisma.stkArticle.findMany({
      where,
      orderBy: [{ code: "asc" }, { id: "asc" }],
      skip: 0,
      take: 20,
      select: {
        id: true,
        code: true,
        designation: true,
        qtyOnHand: true,
      },
    });
    const count = await prisma.stkArticle.count({ where });
    return { n: rows.length, count };
  });

  const vols = {
    clients: await prisma.comClient.count(),
    opportunities: await prisma.crmOpportunity.count(),
    quotes: await prisma.comQuote.count(),
    svMovements: await prisma.svCashMovement.count(),
    articles: await prisma.stkArticle.count(),
  };
  console.log("volumes", JSON.stringify(vols));
}

main()
  .catch((e) => {
    console.error("MEASURE_FAIL", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
