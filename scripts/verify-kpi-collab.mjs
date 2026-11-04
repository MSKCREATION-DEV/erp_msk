import { CrmTaskStatus, prisma } from "./lib/prisma.mjs";
/** Per-collab bucket exclusivity + outreach (owners présents dans CRM). */

const OUTREACH = [
  "APPEL",
  "WHATSAPP",
  "INSTAGRAM",
  "LINKEDIN",
  "EMAIL",
  "RDV",
  "AUTRE",
];

function sod(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function eod(d) {
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
function weekEnd(now) {
  const s = sod(now);
  return eod(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7));
}

const now = new Date();
let fail = 0;

const ownerGroups = await prisma.crmOpportunity.groupBy({
  by: ["ownerId"],
  _count: { _all: true },
  orderBy: { _count: { ownerId: "desc" } },
  take: 10,
});
const owners = await prisma.user.findMany({
  where: { id: { in: ownerGroups.map((g) => g.ownerId) } },
  select: { id: true, firstName: true, lastName: true },
});

console.log("Owners CRM:", owners.length);
for (const o of owners) {
  const label = `${o.firstName} ${o.lastName}`;
  const overdue = await prisma.crmTask.count({
    where: {
      status: CrmTaskStatus.OPEN,
      assigneeId: o.id,
      dueAt: { lt: sod(now) },
    },
  });
  const today = await prisma.crmTask.count({
    where: {
      status: CrmTaskStatus.OPEN,
      assigneeId: o.id,
      dueAt: { gte: sod(now), lte: eod(now) },
    },
  });
  const week = await prisma.crmTask.count({
    where: {
      status: CrmTaskStatus.OPEN,
      assigneeId: o.id,
      dueAt: { gt: eod(now), lte: weekEnd(now) },
    },
  });
  const later = await prisma.crmTask.count({
    where: {
      status: CrmTaskStatus.OPEN,
      assigneeId: o.id,
      dueAt: { gt: weekEnd(now) },
    },
  });
  const open = overdue + today + week + later;
  const total = await prisma.crmTask.count({
    where: { status: CrmTaskStatus.OPEN, assigneeId: o.id },
  });
  const outreach = await prisma.crmActivity.count({
    where: {
      type: { in: OUTREACH },
      opportunity: {
        ownerId: o.id,
        stage: { notIn: ["GAGNE", "PERDU"] },
        comClients: { none: {} },
      },
    },
  });
  const ok = open === total;
  if (!ok) fail += 1;
  console.log(
    ok ? "✅" : "❌",
    label.padEnd(22),
    { overdue, today, week, later, open, total },
    "outreach",
    outreach,
  );
}

await prisma.$disconnect();
process.exit(fail ? 1 : 0);
