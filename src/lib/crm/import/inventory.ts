import type { PrismaClient } from "@prisma/client";
import { keepEmails } from "@/lib/crm/import/keep";
import { loadUsersMap } from "@/lib/crm/import/users-map";
import type { MappedImportRow } from "@/lib/crm/import/map-row";
import { resolveAliasKey } from "@/lib/crm/import/users-map";

export type InventoryReport = {
  users: {
    keep: { id: string; email: string; status: string }[];
    toArchive: { id: string; email: string; status: string }[];
  };
  crm: {
    organizations: number;
    opportunities: number;
    activities: number;
    tasks: number;
    periodGoals: number;
    weeklyReports: number;
    assignmentRequests: number;
    testOrgs: number;
  };
  commercial: {
    clientsLinkedCrm: number;
    clientsTest: number;
    quotesOnLinked: number;
    invoicesOnLinked: number;
  };
  excel?: {
    rows: number;
    owners: Record<string, number>;
    creators: Record<string, number>;
    unresolvedOwners: string[];
    unresolvedCreators: string[];
  };
};

export async function buildInventory(
  prisma: PrismaClient,
  excelRows?: MappedImportRow[],
): Promise<InventoryReport> {
  const keep = keepEmails();
  const map = loadUsersMap();
  // Après ensure, les alias du map sont aussi « keep » (ne pas les archiver)
  for (const def of Object.values(map.aliases)) {
    keep.add(def.email.toLowerCase());
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, status: true, isSuperAdmin: true },
    orderBy: { email: "asc" },
  });

  const keepList: InventoryReport["users"]["keep"] = [];
  const toArchive: InventoryReport["users"]["toArchive"] = [];
  for (const u of users) {
    const email = u.email.toLowerCase();
    const row = { id: u.id, email: u.email, status: u.status };
    if (u.isSuperAdmin || keep.has(email)) keepList.push(row);
    else toArchive.push(row);
  }

  const [
    organizations,
    opportunities,
    activities,
    tasks,
    periodGoals,
    weeklyReports,
    assignmentRequests,
    testOrgs,
  ] = await Promise.all([
    prisma.crmOrganization.count(),
    prisma.crmOpportunity.count(),
    prisma.crmActivity.count(),
    prisma.crmTask.count(),
    prisma.crmPeriodGoal.count(),
    prisma.crmWeeklyReport.count(),
    prisma.crmAssignmentRequest.count(),
    prisma.crmOrganization.count({
      where: { name: { startsWith: "[TEST]" } },
    }),
  ]);

  const linkedClients = await prisma.comClient.findMany({
    where: {
      OR: [
        { sourceOpportunityId: { not: null } },
        { crmOrganizationId: { not: null } },
        { name: { startsWith: "[TEST]" } },
      ],
    },
    select: { id: true, name: true },
  });
  const linkedIds = linkedClients.map((c) => c.id);
  const [quotesOnLinked, invoicesOnLinked] = linkedIds.length
    ? await Promise.all([
        prisma.comQuote.count({ where: { clientId: { in: linkedIds } } }),
        prisma.comInvoice.count({ where: { clientId: { in: linkedIds } } }),
      ])
    : [0, 0];

  const report: InventoryReport = {
    users: { keep: keepList, toArchive },
    crm: {
      organizations,
      opportunities,
      activities,
      tasks,
      periodGoals,
      weeklyReports,
      assignmentRequests,
      testOrgs,
    },
    commercial: {
      clientsLinkedCrm: linkedClients.filter(
        (c) => !c.name.startsWith("[TEST]"),
      ).length,
      clientsTest: linkedClients.filter((c) => c.name.startsWith("[TEST]"))
        .length,
      quotesOnLinked,
      invoicesOnLinked,
    },
  };

  if (excelRows) {
    const owners: Record<string, number> = {};
    const creators: Record<string, number> = {};
    const unresolvedOwners = new Set<string>();
    const unresolvedCreators = new Set<string>();
    for (const r of excelRows) {
      const ok = r.ownerHint ?? "(vide)";
      owners[ok] = (owners[ok] ?? 0) + 1;
      const ck = r.createdByHint ?? "(vide)";
      creators[ck] = (creators[ck] ?? 0) + 1;
      if (r.ownerHint && !resolveAliasKey(r.ownerHint, map)) {
        unresolvedOwners.add(r.ownerHint);
      }
      if (r.createdByHint && !resolveAliasKey(r.createdByHint, map)) {
        unresolvedCreators.add(r.createdByHint);
      }
    }
    report.excel = {
      rows: excelRows.length,
      owners,
      creators,
      unresolvedOwners: [...unresolvedOwners],
      unresolvedCreators: [...unresolvedCreators],
    };
  }

  return report;
}

export function formatInventory(report: InventoryReport): string {
  const lines: string[] = [];
  lines.push("=== INVENTAIRE CRM / USERS ===");
  lines.push(`KEEP (${report.users.keep.length}):`);
  for (const u of report.users.keep) {
    lines.push(`  + ${u.email} [${u.status}]`);
  }
  lines.push(`TO_ARCHIVE (${report.users.toArchive.length}):`);
  for (const u of report.users.toArchive) {
    lines.push(`  - ${u.email} [${u.status}]`);
  }
  lines.push("CRM:");
  lines.push(`  orgs=${report.crm.organizations} deals=${report.crm.opportunities}`);
  lines.push(
    `  activities=${report.crm.activities} tasks=${report.crm.tasks} goals=${report.crm.periodGoals} reports=${report.crm.weeklyReports} assignReq=${report.crm.assignmentRequests}`,
  );
  lines.push(`  [TEST] orgs=${report.crm.testOrgs}`);
  lines.push("COM lié:");
  lines.push(
    `  clients CRM=${report.commercial.clientsLinkedCrm} test=${report.commercial.clientsTest} devis=${report.commercial.quotesOnLinked} factures=${report.commercial.invoicesOnLinked}`,
  );
  if (report.excel) {
    lines.push("EXCEL:");
    lines.push(`  rows=${report.excel.rows}`);
    lines.push(`  owners=${JSON.stringify(report.excel.owners)}`);
    lines.push(`  creators=${JSON.stringify(report.excel.creators)}`);
    if (report.excel.unresolvedOwners.length) {
      lines.push(
        `  ⚠ owners inconnus: ${report.excel.unresolvedOwners.join(", ")}`,
      );
    }
    if (report.excel.unresolvedCreators.length) {
      lines.push(
        `  ⚠ creators inconnus: ${report.excel.unresolvedCreators.join(", ")}`,
      );
    }
  }
  return lines.join("\n");
}
