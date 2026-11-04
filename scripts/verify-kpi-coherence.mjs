import { CrmTaskStatus, prisma } from "./lib/prisma.mjs";
/**
 * Vérif runtime : KPI relances buckets + outreach prospects
 * (ancienne logique take:2000 vs agrégats).
 *
 * Usage : node --env-file=.env.local scripts/verify-kpi-coherence.mjs
 */


function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfLocalDay(d) {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    23,
    59,
    59,
    999,
  );
}
function endOfLocalWeekAhead(now, days = 7) {
  const sod = startOfLocalDay(now);
  return endOfLocalDay(
    new Date(sod.getFullYear(), sod.getMonth(), sod.getDate() + days),
  );
}

function classify(dueAt, now) {
  const sod = startOfLocalDay(now);
  const eod = endOfLocalDay(now);
  const weekEnd = endOfLocalWeekAhead(now);
  if (dueAt < sod) return "overdue";
  if (dueAt <= eod) return "today";
  if (dueAt <= weekEnd) return "week";
  return "later";
}

const OUTREACH = [
  "APPEL",
  "WHATSAPP",
  "INSTAGRAM",
  "LINKEDIN",
  "EMAIL",
  "RDV",
  "AUTRE",
];

async function main() {
  const now = new Date();
  const sod = startOfLocalDay(now);
  const eod = endOfLocalDay(now);
  const weekEnd = endOfLocalWeekAhead(now);

  // ── Relances : partition mémoire vs count SQL ──
  const dueAts = await prisma.crmTask.findMany({
    where: { status: CrmTaskStatus.OPEN },
    select: { dueAt: true },
  });
  const mem = { overdue: 0, today: 0, week: 0, later: 0 };
  for (const t of dueAts) mem[classify(t.dueAt, now)] += 1;

  const [overdue, today, week, later] = await Promise.all([
    prisma.crmTask.count({
      where: { status: CrmTaskStatus.OPEN, dueAt: { lt: sod } },
    }),
    prisma.crmTask.count({
      where: {
        status: CrmTaskStatus.OPEN,
        dueAt: { gte: sod, lte: eod },
      },
    }),
    prisma.crmTask.count({
      where: {
        status: CrmTaskStatus.OPEN,
        dueAt: { gt: eod, lte: weekEnd },
      },
    }),
    prisma.crmTask.count({
      where: { status: CrmTaskStatus.OPEN, dueAt: { gt: weekEnd } },
    }),
  ]);

  const sql = { overdue, today, week, later };
  const bucketsOk =
    mem.overdue === sql.overdue &&
    mem.today === sql.today &&
    mem.week === sql.week &&
    mem.later === sql.later;

  console.log("Relances OPEN (tous assignees)");
  console.log("  mémoire :", mem, "total", dueAts.length);
  console.log("  SQL     :", sql, "total", overdue + today + week + later);
  console.log(bucketsOk ? "  ✅ buckets cohérents" : "  ❌ ÉCART buckets");

  // ── Prospects : outreach open deals (cap 2000 vs count) ──
  const openOwnWhere = {
    stage: { notIn: ["GAGNE", "PERDU"] },
    comClients: { none: {} },
  };
  const idsCap = (
    await prisma.crmOpportunity.findMany({
      where: openOwnWhere,
      select: { id: true },
      take: 2000,
    })
  ).map((d) => d.id);

  const grouped = await prisma.crmActivity.groupBy({
    by: ["opportunityId"],
    where: {
      type: { in: OUTREACH },
      opportunityId: { in: idsCap },
    },
    _count: { _all: true },
  });
  const sumCap = grouped.reduce((s, r) => s + r._count._all, 0);

  const countAgg = await prisma.crmActivity.count({
    where: {
      type: { in: OUTREACH },
      opportunity: openOwnWhere,
    },
  });

  const openTotal = await prisma.crmOpportunity.count({ where: openOwnWhere });
  console.log("\nOutreach sur deals ouverts (hors clients)");
  console.log("  deals ouverts :", openTotal);
  console.log("  somme via take:2000 ids :", sumCap);
  console.log("  count agrégé (nouveau)  :", countAgg);
  if (openTotal <= 2000) {
    console.log(
      sumCap === countAgg
        ? "  ✅ KPI outreach identique (≤2000 deals)"
        : "  ❌ ÉCART outreach inattendu",
    );
  } else {
    console.log(
      countAgg >= sumCap
        ? "  ✅ agrégat ≥ cap (corrigé sous-comptage take:2000)"
        : "  ❌ agrégat < cap — anormal",
    );
  }

  // ── Filtre relancesMin ≥ 3 via having ──
  const min = 3;
  const havingRows = await prisma.crmActivity.groupBy({
    by: ["opportunityId"],
    where: {
      type: { in: OUTREACH },
      opportunityId: { not: null },
      opportunity: openOwnWhere,
    },
    _count: { _all: true },
    having: { opportunityId: { _count: { gte: min } } },
  });
  const manual = grouped.filter((r) => r._count._all >= min);
  // manual capped to idsCap — compare only within cap when ≤2000
  console.log("\nFiltre relancesMin ≥", min);
  console.log("  having groupBy :", havingRows.length, "deals");
  if (openTotal <= 2000) {
    console.log("  manuel (cap)   :", manual.length, "deals");
    console.log(
      havingRows.length === manual.length
        ? "  ✅ filtre having cohérent"
        : "  ❌ ÉCART filtre having",
    );
  } else {
    console.log("  (skip égalité stricte : >2000 deals, having = source de vérité)");
  }

  // ── Période semaine / mois : counts non nuls attendus si data ──
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  const weekEndSun = new Date(weekStart);
  weekEndSun.setDate(weekEndSun.getDate() + 6);
  weekEndSun.setHours(23, 59, 59, 999);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  const weekOutreach = await prisma.crmActivity.count({
    where: {
      type: { in: OUTREACH },
      occurredAt: { gte: weekStart, lte: weekEndSun },
    },
  });
  const monthOutreach = await prisma.crmActivity.count({
    where: {
      type: { in: OUTREACH },
      occurredAt: { gte: monthStart, lte: monthEnd },
    },
  });
  console.log("\nPériodes (tous owners)");
  console.log("  relances semaine courante :", weekOutreach);
  console.log("  relances mois courant     :", monthOutreach);

  process.exitCode = bucketsOk ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
